/**
 * Windows shared memory, for the live iRacing source.
 *
 * iRacing publishes its telemetry into a named file mapping, `Local\
 * IRSDKMemMapFileName`, and signals a new tick on `Local\IRSDKDataValidEvent`.
 * Node cannot open a named mapping through `fs`, so this reaches kernel32
 * through koffi -- an FFI with prebuilt binaries, chosen over a native addon
 * specifically to avoid making a working build depend on a working toolchain.
 *
 * Everything here is behind a dynamic import and a capability check. If koffi
 * is missing, or the platform is not Windows, or iRacing simply is not running,
 * the reader reports WHY in a sentence a user can act on and the rest of the
 * app carries on with file and synthetic sources. A telemetry feature that
 * takes the application down when the game is closed would be a poor trade.
 *
 * Two lessons are baked in, both learned the hard way against the real sim:
 *
 * 1. NEVER ask for a view of a fixed size. `MapViewOfFile` fails when the
 *    requested view is larger than the mapping, and iRacing's mapping is not a
 *    fixed size -- it depends on the session string, which depends on the car
 *    count. Passing 0 means "the whole thing" and is the only correct answer.
 * 2. ALWAYS read `GetLastError`. The failure above returns ACCESS_DENIED, which
 *    is indistinguishable from "not running" to code that does not ask. That
 *    one missing call cost a debugging session in which the sim was running
 *    perfectly and the app insisted it was not.
 */

import { readHeader, requiredBytes } from './layout.js'

/** Read-only access to a file mapping. */
const FILE_MAP_READ = 0x0004
/** Wait result meaning the event was signalled. */
const WAIT_OBJECT_0 = 0x00000000
const SYNCHRONIZE = 0x00100000

export const MEM_MAP_NAME = 'Local\\IRSDKMemMapFileName'
export const DATA_EVENT_NAME = 'Local\\IRSDKDataValidEvent'

/** The header is 112 bytes; enough to size the rest of the mapping from. */
const HEADER_BYTES = 112
/** Used only if VirtualQuery is unavailable and the header cannot be sized. */
const FALLBACK_BYTES = 1 << 20

export interface SharedMemoryStatus {
  available: boolean
  /** Why it is not available, in a sentence a user can act on. */
  detail: string
}

/**
 * The Windows error codes this code can actually provoke, in words that say
 * what to do rather than what went wrong.
 */
function describeError(call: string, code: number): string {
  switch (code) {
    case 2: // ERROR_FILE_NOT_FOUND
      return 'iRacing is not running, or has not opened its telemetry'
    case 5: // ERROR_ACCESS_DENIED
      return (
        `${call} was denied access (error 5). iRacing is running, but this app may not read ` +
        'its telemetry — most often because iRacing is running elevated and this app is not. ' +
        'Try starting both the same way.'
      )
    case 8: // ERROR_NOT_ENOUGH_MEMORY
      return `${call} could not map the telemetry region (error 8)`
    case 87: // ERROR_INVALID_PARAMETER
      return `${call} rejected its arguments (error 87)`
    default:
      return `${call} failed with Windows error ${code}`
  }
}

interface Kernel32 {
  OpenFileMappingW: (access: number, inherit: number, name: string) => unknown
  MapViewOfFile: (
    handle: unknown,
    access: number,
    offsetHigh: number,
    offsetLow: number,
    bytes: number
  ) => unknown
  UnmapViewOfFile: (address: unknown) => number
  CloseHandle: (handle: unknown) => number
  OpenEventW: (access: number, inherit: number, name: string) => unknown
  WaitForSingleObject: (handle: unknown, ms: number) => number
  GetLastError: () => number
  VirtualQuery: (address: unknown, info: Record<string, unknown>, size: number) => number
  mbiSize: number
}

/**
 * A reader for one named mapping.
 *
 * `read()` copies the mapped bytes into a Buffer rather than handing out a view
 * of live memory. That buys the guarantee that a parser can never see a record
 * change underneath it mid-read. The cost is a memcpy, which is why the tick
 * path uses `readRange` to copy only the header and the one active record --
 * a few kilobytes -- rather than the whole megabyte-plus region sixty times a
 * second.
 */
export class SharedMemoryReader {
  private k32: Kernel32 | null = null
  private koffi: typeof import('koffi') | null = null
  private mapHandle: unknown = null
  private view: unknown = null
  private eventHandle: unknown = null
  private mappedBytes = 0
  private failure: string | null = null
  private lastDetail: string | null = null

  /** Load koffi and bind the handful of calls needed. Safe to call repeatedly. */
  private async load(): Promise<boolean> {
    if (this.k32) return true
    if (this.failure) return false

    if (process.platform !== 'win32') {
      this.failure = `iRacing telemetry needs Windows; this is ${process.platform}`
      return false
    }
    try {
      const koffi = await import('koffi')
      const lib = koffi.load('kernel32.dll')

      // BOOL is a 4-byte int, not a C++ bool. Declaring it `int` rather than
      // `bool` keeps the register the callee reads well-defined.
      const mbi = koffi.struct('RCVD_MEMORY_BASIC_INFORMATION', {
        BaseAddress: 'void*',
        AllocationBase: 'void*',
        AllocationProtect: 'uint32_t',
        __alignment1: 'uint32_t',
        RegionSize: 'size_t',
        State: 'uint32_t',
        Protect: 'uint32_t',
        Type: 'uint32_t',
        __alignment2: 'uint32_t'
      })

      this.koffi = koffi
      this.k32 = {
        OpenFileMappingW: lib.func(
          'void* __stdcall OpenFileMappingW(uint32_t, int, const char16_t*)'
        ) as Kernel32['OpenFileMappingW'],
        MapViewOfFile: lib.func(
          'void* __stdcall MapViewOfFile(void*, uint32_t, uint32_t, uint32_t, size_t)'
        ) as Kernel32['MapViewOfFile'],
        UnmapViewOfFile: lib.func(
          'int __stdcall UnmapViewOfFile(void*)'
        ) as Kernel32['UnmapViewOfFile'],
        CloseHandle: lib.func('int __stdcall CloseHandle(void*)') as Kernel32['CloseHandle'],
        OpenEventW: lib.func(
          'void* __stdcall OpenEventW(uint32_t, int, const char16_t*)'
        ) as Kernel32['OpenEventW'],
        WaitForSingleObject: lib.func(
          'uint32_t __stdcall WaitForSingleObject(void*, uint32_t)'
        ) as Kernel32['WaitForSingleObject'],
        GetLastError: lib.func('uint32_t __stdcall GetLastError()') as Kernel32['GetLastError'],
        VirtualQuery: lib.func(
          'size_t __stdcall VirtualQuery(const void*, _Out_ RCVD_MEMORY_BASIC_INFORMATION*, size_t)'
        ) as Kernel32['VirtualQuery'],
        mbiSize: koffi.sizeof(mbi)
      }
      return true
    } catch (e) {
      this.failure =
        'the koffi FFI module could not be loaded, so live telemetry is unavailable ' +
        `(${e instanceof Error ? e.message : String(e)})`
      return false
    }
  }

  status(): SharedMemoryStatus {
    if (this.view) return { available: true, detail: 'connected to iRacing shared memory' }
    if (this.failure) return { available: false, detail: this.failure }
    if (process.platform !== 'win32') {
      return { available: false, detail: `iRacing telemetry needs Windows; this is ${process.platform}` }
    }
    return {
      available: false,
      detail: this.lastDetail ?? 'iRacing is not running, or has not opened its telemetry'
    }
  }

  /**
   * How big the mapped region is.
   *
   * VirtualQuery is the direct answer and is what the SDK samples do not
   * bother with because they are written in C and can just deref. If it is
   * unavailable, the header itself carries enough to derive a lower bound:
   * the session string and the variable headers both declare their extent, and
   * the buffers sit after them.
   */
  private regionSize(view: unknown): number {
    if (!this.k32 || !this.koffi) return FALLBACK_BYTES

    const info: Record<string, unknown> = {}
    if (this.k32.VirtualQuery(view, info, this.k32.mbiSize) !== 0) {
      const size = Number(info.RegionSize)
      if (Number.isFinite(size) && size >= HEADER_BYTES) return size
    }

    try {
      const head = Buffer.from(this.koffi.decode(view, 'uint8_t', HEADER_BYTES) as Uint8Array)
      const end = requiredBytes(readHeader(head))
      if (end > HEADER_BYTES) return end
    } catch {
      // Fall through to the default below.
    }
    return FALLBACK_BYTES
  }

  /**
   * Try to attach. Returns false when iRacing is not running, which is an
   * ordinary state rather than an error -- the caller is expected to keep
   * trying on a timer. `status().detail` says which it was.
   */
  async open(): Promise<boolean> {
    if (this.view) return true
    if (!(await this.load()) || !this.k32) return false

    const handle = this.k32.OpenFileMappingW(FILE_MAP_READ, 0, MEM_MAP_NAME)
    if (!handle) {
      this.lastDetail = describeError('OpenFileMapping', this.k32.GetLastError())
      return false
    }

    // 0 means "map the whole mapping". Asking for a specific size fails
    // outright when that size exceeds the mapping, and iRacing's is not fixed.
    const view = this.k32.MapViewOfFile(handle, FILE_MAP_READ, 0, 0, 0)
    if (!view) {
      this.lastDetail = describeError('MapViewOfFile', this.k32.GetLastError())
      this.k32.CloseHandle(handle)
      return false
    }

    this.mapHandle = handle
    this.view = view
    this.mappedBytes = this.regionSize(view)
    this.lastDetail = null
    // The data-ready event is optional: without it the caller polls, which
    // works but burns a little more CPU.
    this.eventHandle = this.k32.OpenEventW(SYNCHRONIZE, 0, DATA_EVENT_NAME) || null
    return true
  }

  /** Bytes currently mapped. */
  get size(): number {
    return this.mappedBytes
  }

  /** Copy the mapped region. Returns null when not attached. */
  read(): Buffer | null {
    return this.readRange(0, this.mappedBytes)
  }

  /**
   * Copy part of the mapped region.
   *
   * The tick path wants the 112-byte header and then one record, and copying
   * the whole region for that would move more than a megabyte sixty times a
   * second to use a few kilobytes of it.
   */
  readRange(offset: number, length: number): Buffer | null {
    if (!this.view || !this.koffi || length <= 0) return null
    if (offset < 0 || offset + length > this.mappedBytes) return null
    try {
      return Buffer.from(this.koffi.decode(this.view, offset, 'uint8_t', length) as Uint8Array)
    } catch {
      // The mapping went away underneath us -- iRacing closed.
      this.close()
      return null
    }
  }

  /**
   * Block until iRacing says a new tick is ready, or the timeout expires.
   *
   * Returns true if the event fired. Without the event handle it returns false
   * immediately and the caller should fall back to polling on a timer.
   */
  waitForData(timeoutMs = 32): boolean {
    if (!this.k32 || !this.eventHandle) return false
    return this.k32.WaitForSingleObject(this.eventHandle, timeoutMs) === WAIT_OBJECT_0
  }

  get hasDataEvent(): boolean {
    return this.eventHandle !== null
  }

  close(): void {
    if (!this.k32) return
    if (this.view) this.k32.UnmapViewOfFile(this.view)
    if (this.mapHandle) this.k32.CloseHandle(this.mapHandle)
    if (this.eventHandle) this.k32.CloseHandle(this.eventHandle)
    this.view = null
    this.mapHandle = null
    this.eventHandle = null
    this.mappedBytes = 0
  }
}

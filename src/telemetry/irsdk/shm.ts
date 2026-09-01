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
 */

/** Read-only access to a file mapping. */
const FILE_MAP_READ = 0x0004
/** Wait result meaning the event was signalled. */
const WAIT_OBJECT_0 = 0x00000000
const SYNCHRONIZE = 0x00100000

export const MEM_MAP_NAME = 'Local\\IRSDKMemMapFileName'
export const DATA_EVENT_NAME = 'Local\\IRSDKDataValidEvent'

export interface SharedMemoryStatus {
  available: boolean
  /** Why it is not available, in a sentence a user can act on. */
  detail: string
}

interface Kernel32 {
  OpenFileMappingW: (access: number, inherit: boolean, name: string) => unknown
  MapViewOfFile: (
    handle: unknown,
    access: number,
    offsetHigh: number,
    offsetLow: number,
    bytes: number
  ) => unknown
  UnmapViewOfFile: (address: unknown) => boolean
  CloseHandle: (handle: unknown) => boolean
  OpenEventW: (access: number, inherit: boolean, name: string) => unknown
  WaitForSingleObject: (handle: unknown, ms: number) => number
}

/**
 * A reader for one named mapping.
 *
 * `read()` copies the mapped bytes into a Buffer rather than handing out a view
 * of live memory. That costs a memcpy per tick -- a few hundred kilobytes at 60
 * Hz, which is nothing -- and buys the guarantee that a parser can never see a
 * record change underneath it mid-read.
 */
export class SharedMemoryReader {
  private k32: Kernel32 | null = null
  private koffi: typeof import('koffi') | null = null
  private mapHandle: unknown = null
  private view: unknown = null
  private eventHandle: unknown = null
  private mappedBytes = 0
  private failure: string | null = null

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
      this.koffi = koffi
      this.k32 = {
        OpenFileMappingW: lib.func(
          'void* __stdcall OpenFileMappingW(uint32_t, bool, const char16_t*)'
        ) as Kernel32['OpenFileMappingW'],
        MapViewOfFile: lib.func(
          'void* __stdcall MapViewOfFile(void*, uint32_t, uint32_t, uint32_t, size_t)'
        ) as Kernel32['MapViewOfFile'],
        UnmapViewOfFile: lib.func('bool __stdcall UnmapViewOfFile(void*)') as Kernel32['UnmapViewOfFile'],
        CloseHandle: lib.func('bool __stdcall CloseHandle(void*)') as Kernel32['CloseHandle'],
        OpenEventW: lib.func(
          'void* __stdcall OpenEventW(uint32_t, bool, const char16_t*)'
        ) as Kernel32['OpenEventW'],
        WaitForSingleObject: lib.func(
          'uint32_t __stdcall WaitForSingleObject(void*, uint32_t)'
        ) as Kernel32['WaitForSingleObject']
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
    return { available: false, detail: 'iRacing is not running, or has not opened its telemetry' }
  }

  /**
   * Try to attach. Returns false when iRacing is not running, which is an
   * ordinary state rather than an error -- the caller is expected to keep
   * trying on a timer.
   */
  async open(bytes = 1 << 21): Promise<boolean> {
    if (this.view) return true
    if (!(await this.load()) || !this.k32) return false

    const handle = this.k32.OpenFileMappingW(FILE_MAP_READ, false, MEM_MAP_NAME)
    if (!handle) return false

    const view = this.k32.MapViewOfFile(handle, FILE_MAP_READ, 0, 0, bytes)
    if (!view) {
      this.k32.CloseHandle(handle)
      return false
    }

    this.mapHandle = handle
    this.view = view
    this.mappedBytes = bytes
    // The data-ready event is optional: without it the caller polls, which
    // works but burns a little more CPU.
    this.eventHandle = this.k32.OpenEventW(SYNCHRONIZE, false, DATA_EVENT_NAME) || null
    return true
  }

  /** Copy the mapped region. Returns null when not attached. */
  read(): Buffer | null {
    if (!this.view || !this.koffi) return null
    try {
      return Buffer.from(this.koffi.decode(this.view, 'uint8_t', this.mappedBytes) as Uint8Array)
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
  }
}

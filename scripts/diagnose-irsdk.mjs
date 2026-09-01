/**
 * Diagnose the live iRacing shared-memory attach.
 *
 * The app can only say "iRacing is not running, or has not opened its
 * telemetry", because it never asks Windows WHY the call failed. This asks.
 * Run it with iRacing running and in a session:
 *
 *   npm run diagnose:irsdk
 */
import koffi from 'koffi'

const lib = koffi.load('kernel32.dll')

const OpenFileMappingW = lib.func('void* __stdcall OpenFileMappingW(uint32_t, int, const char16_t*)')
const MapViewOfFile = lib.func('void* __stdcall MapViewOfFile(void*, uint32_t, uint32_t, uint32_t, size_t)')
const UnmapViewOfFile = lib.func('int __stdcall UnmapViewOfFile(void*)')
const CloseHandle = lib.func('int __stdcall CloseHandle(void*)')
const OpenEventW = lib.func('void* __stdcall OpenEventW(uint32_t, int, const char16_t*)')
const GetLastError = lib.func('uint32_t __stdcall GetLastError()')

// VirtualQuery tells us how big the mapping actually is, which is the one
// number the SDK never publishes and the one this code has been guessing.
const MEMORY_BASIC_INFORMATION = koffi.struct('MEMORY_BASIC_INFORMATION', {
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
const VirtualQuery = lib.func(
  'size_t __stdcall VirtualQuery(const void*, _Out_ MEMORY_BASIC_INFORMATION*, size_t)'
)

const ERRORS = {
  0: 'ERROR_SUCCESS',
  2: 'ERROR_FILE_NOT_FOUND — the mapping does not exist: iRacing is not running, or telemetry is not open',
  5: 'ERROR_ACCESS_DENIED — the mapping exists but we may not open it that way',
  6: 'ERROR_INVALID_HANDLE',
  8: 'ERROR_NOT_ENOUGH_MEMORY',
  87: 'ERROR_INVALID_PARAMETER'
}
const explain = (e) => `${e} ${ERRORS[e] ?? '(see winerror.h)'}`

const FILE_MAP_READ = 0x0004
const SYNCHRONIZE = 0x00100000
const NAME = 'Local\\IRSDKMemMapFileName'
const EVENT = 'Local\\IRSDKDataValidEvent'

console.log(`node ${process.version}  ${process.arch}  elevated=${(() => {
  try { return String(process.getuid === undefined) } catch { return '?' }
})()}`)
console.log(`opening ${NAME}`)

const handle = OpenFileMappingW(FILE_MAP_READ, 0, NAME)
if (!handle) {
  console.log(`  FAIL OpenFileMappingW -> ${explain(GetLastError())}`)
  process.exit(1)
}
console.log('  ok, mapping opened')

// The bug hunt: the app asks for a FIXED 2 MB view. If the mapping is smaller
// than that, MapViewOfFile fails -- and it fails with ACCESS_DENIED, which
// looks exactly like "not running" to code that does not check.
for (const bytes of [1 << 21, 0]) {
  const view = MapViewOfFile(handle, FILE_MAP_READ, 0, 0, bytes)
  const label = bytes === 0 ? 'whole mapping (0)' : `${bytes} bytes`
  if (!view) {
    console.log(`  FAIL MapViewOfFile ${label} -> ${explain(GetLastError())}`)
    continue
  }
  const mbi = {}
  const got = VirtualQuery(view, mbi, koffi.sizeof(MEMORY_BASIC_INFORMATION))
  console.log(`  ok  MapViewOfFile ${label}; VirtualQuery=${got} RegionSize=${mbi.RegionSize}`)

  if (bytes === 0) {
    const size = Number(mbi.RegionSize)
    const buf = Buffer.from(koffi.decode(view, 'uint8_t', Math.min(size, 1 << 20)))
    const ver = buf.readInt32LE(0)
    const status = buf.readInt32LE(4)
    const tickRate = buf.readInt32LE(8)
    const numVars = buf.readInt32LE(20)
    const varOffset = buf.readInt32LE(24)
    const numBuf = buf.readInt32LE(28)
    const bufLen = buf.readInt32LE(32)
    const siLen = buf.readInt32LE(16)
    const siOffset = buf.readInt32LE(12)
    console.log(
      `  header: ver=${ver} status=0x${status.toString(16)} tickRate=${tickRate} ` +
        `numVars=${numVars} varOffset=${varOffset} numBuf=${numBuf} bufLen=${bufLen}`
    )
    console.log(`  session string: offset=${siOffset} len=${siLen}`)
    const needed = Math.max(siOffset + siLen, varOffset + numVars * 144)
    console.log(`  bytes actually needed >= ${needed}  (app maps a fixed ${1 << 21})`)
    console.log(`  session live (status bit 0): ${(status & 1) !== 0}`)
  }
  UnmapViewOfFile(view)
}

const ev = OpenEventW(SYNCHRONIZE, 0, EVENT)
console.log(ev ? '  ok, data-ready event opened' : `  no data event -> ${explain(GetLastError())}`)
CloseHandle(handle)

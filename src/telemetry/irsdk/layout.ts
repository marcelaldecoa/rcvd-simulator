/**
 * The iRacing SDK binary layout -- shared by the live source and .ibt files.
 *
 * This is worth isolating because of one economy: a session file and the live
 * shared memory use the SAME header and variable-header structures. A file is
 * essentially a header, a YAML session string, and then a run of fixed-size
 * records in exactly the format the shared memory hands out one at a time. So
 * everything here is written once and both sources consume it.
 *
 * Deliberately pure: it takes a Buffer and returns objects. No file handles, no
 * Windows calls, nothing that needs a simulator running. That is what makes the
 * riskiest part of the whole telemetry phase testable.
 *
 * Layout, from the public irsdk_defines.h:
 *
 *   irsdk_header            112 bytes at offset 0
 *   irsdk_diskSubHeader      32 bytes at offset 112   (.ibt files only)
 *   irsdk_varHeader         144 bytes each, at header.varHeaderOffset
 */

/** Value types a variable can have. */
export enum VarType {
  Char = 0,
  Bool = 1,
  Int = 2,
  BitField = 3,
  Float = 4,
  Double = 5
}

const TYPE_SIZE: Record<VarType, number> = {
  [VarType.Char]: 1,
  [VarType.Bool]: 1,
  [VarType.Int]: 4,
  [VarType.BitField]: 4,
  [VarType.Float]: 4,
  [VarType.Double]: 8
}

export const HEADER_SIZE = 112
export const DISK_SUB_HEADER_SIZE = 32
export const VAR_HEADER_SIZE = 144
export const MAX_BUFFERS = 4

export interface VarBuffer {
  tickCount: number
  bufOffset: number
}

export interface IrsdkHeader {
  version: number
  status: number
  tickRate: number
  sessionInfoUpdate: number
  sessionInfoLength: number
  sessionInfoOffset: number
  numVars: number
  varHeaderOffset: number
  numBuf: number
  bufLen: number
  buffers: VarBuffer[]
}

export interface VarHeader {
  type: VarType
  offset: number
  count: number
  countAsTime: boolean
  name: string
  description: string
  unit: string
}

/** Fixed-width C string, NUL-terminated, out of a buffer. */
function cstring(buf: Buffer, at: number, max: number): string {
  const end = buf.indexOf(0, at)
  const stop = end === -1 || end > at + max ? at + max : end
  return buf.toString('latin1', at, Math.min(stop, buf.length)).trim()
}

export function readHeader(buf: Buffer): IrsdkHeader {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`irsdk header truncated: ${buf.length} bytes, need ${HEADER_SIZE}`)
  }
  const buffers: VarBuffer[] = []
  for (let i = 0; i < MAX_BUFFERS; i++) {
    const at = 48 + i * 16
    buffers.push({ tickCount: buf.readInt32LE(at), bufOffset: buf.readInt32LE(at + 4) })
  }
  return {
    version: buf.readInt32LE(0),
    status: buf.readInt32LE(4),
    tickRate: buf.readInt32LE(8),
    sessionInfoUpdate: buf.readInt32LE(12),
    sessionInfoLength: buf.readInt32LE(16),
    sessionInfoOffset: buf.readInt32LE(20),
    numVars: buf.readInt32LE(24),
    varHeaderOffset: buf.readInt32LE(28),
    numBuf: buf.readInt32LE(32),
    bufLen: buf.readInt32LE(36),
    buffers
  }
}

export interface DiskSubHeader {
  sessionStartDate: bigint
  sessionStartTime: number
  sessionEndTime: number
  sessionLapCount: number
  sessionRecordCount: number
}

/** The extra header a .ibt file carries and the shared memory does not. */
export function readDiskSubHeader(buf: Buffer): DiskSubHeader {
  const at = HEADER_SIZE
  if (buf.length < at + DISK_SUB_HEADER_SIZE) {
    throw new Error('irsdk disk sub-header truncated')
  }
  return {
    sessionStartDate: buf.readBigInt64LE(at),
    sessionStartTime: buf.readDoubleLE(at + 8),
    sessionEndTime: buf.readDoubleLE(at + 16),
    sessionLapCount: buf.readInt32LE(at + 24),
    sessionRecordCount: buf.readInt32LE(at + 28)
  }
}

export function readVarHeaders(buf: Buffer, header: IrsdkHeader): VarHeader[] {
  const out: VarHeader[] = []
  for (let i = 0; i < header.numVars; i++) {
    const at = header.varHeaderOffset + i * VAR_HEADER_SIZE
    if (at + VAR_HEADER_SIZE > buf.length) break
    out.push({
      type: buf.readInt32LE(at) as VarType,
      offset: buf.readInt32LE(at + 4),
      count: buf.readInt32LE(at + 8),
      countAsTime: buf.readUInt8(at + 12) !== 0,
      name: cstring(buf, at + 16, 32),
      description: cstring(buf, at + 48, 64),
      unit: cstring(buf, at + 112, 32)
    })
  }
  return out
}

/** A name-keyed index, which is how every consumer wants to reach these. */
export function indexVars(vars: VarHeader[]): Map<string, VarHeader> {
  const m = new Map<string, VarHeader>()
  for (const v of vars) m.set(v.name, v)
  return m
}

/**
 * Read one variable out of a data record.
 *
 * `record` is the bytes of a single sample -- a buffer slice for a file, or the
 * live buffer for shared memory. Offsets in a VarHeader are relative to the
 * start of the record.
 */
export function readVar(record: Buffer, v: VarHeader, index = 0): number | boolean | string {
  const size = TYPE_SIZE[v.type]
  const at = v.offset + index * size
  if (at + size > record.length) return v.type === VarType.Bool ? false : 0

  switch (v.type) {
    case VarType.Char:
      return String.fromCharCode(record.readUInt8(at))
    case VarType.Bool:
      return record.readUInt8(at) !== 0
    case VarType.Int:
    case VarType.BitField:
      return record.readInt32LE(at)
    case VarType.Float:
      return record.readFloatLE(at)
    case VarType.Double:
      return record.readDoubleLE(at)
    default:
      return 0
  }
}

/** A numeric read that never returns undefined, for channels that must exist. */
export function readNumber(
  record: Buffer,
  vars: Map<string, VarHeader>,
  name: string,
  fallback = 0,
  index = 0
): number {
  const v = vars.get(name)
  if (!v) return fallback
  const raw = readVar(record, v, index)
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : fallback
  if (typeof raw === 'boolean') return raw ? 1 : 0
  return fallback
}

/** Four corners in the SDK's own order: LF, RF, LR, RR. */
export function readCorners(
  record: Buffer,
  vars: Map<string, VarHeader>,
  prefixes: [string, string, string, string],
  suffix: string | readonly string[]
): [number, number, number, number] | undefined {
  const found = resolveCorners(vars, prefixes, suffix)
  if (!found) return undefined
  return prefixes.map((p) => readNumber(record, vars, p + found)) as [
    number,
    number,
    number,
    number
  ]
}

/**
 * Which of several candidate suffixes this car actually publishes.
 *
 * iRacing does not use one name per measurement across the fleet. The same
 * shock deflection is `LFshockDefl` on one car and `LFSHshockDefl` on another,
 * and asking for only the first silently returns nothing on the second -- which
 * is exactly what happened here: a whole damper histogram drew empty against a
 * car that was publishing the data under a name this code did not ask for, and
 * nothing reported a problem because "channel absent" is an ordinary state.
 *
 * Candidates are tried in order, and all four corners must agree, so a car with
 * three of one name and one of another is treated as having neither rather than
 * mixing two different measurements into one set.
 */
export function resolveCorners(
  vars: Map<string, VarHeader>,
  prefixes: [string, string, string, string],
  suffix: string | readonly string[]
): string | null {
  for (const candidate of typeof suffix === 'string' ? [suffix] : suffix) {
    if (prefixes.every((p) => vars.has(p + candidate))) return candidate
  }
  return null
}

/**
 * The per-corner channels this app reads, with the names to try.
 *
 * Deliberately NOT including `coldPressure` as a fallback for `pressure`. Cold
 * pressure is a garage setting, not a measurement -- it does not change as the
 * tyre works -- so substituting it would turn "we could not measure this" into
 * a plausible constant, which is the worse failure.
 */
export const CORNER_CHANNELS = {
  rideHeight: ['rideHeight'],
  shockDefl: ['shockDefl', 'SHshockDefl'],
  shockVel: ['shockVel', 'SHshockVel'],
  // Tread middle where published, carcass middle otherwise. Different
  // measurements of the same tyre, and the second is the one most cars give.
  tempM: ['tempM', 'tempCM'],
  pressure: ['pressure']
} as const

export const CORNER_PREFIXES: [string, string, string, string] = ['LF', 'RF', 'LR', 'RR']

/** Total bytes one record occupies, from the variable table. */
export function recordLength(vars: VarHeader[]): number {
  let end = 0
  for (const v of vars) end = Math.max(end, v.offset + v.count * TYPE_SIZE[v.type])
  return end
}

/** Size in bytes of a value of this type. */
export function sizeOf(type: VarType): number {
  return TYPE_SIZE[type] ?? 0
}

/**
 * Build a synthetic irsdk buffer -- the only practical way to test any of this
 * without iRacing installed and running.
 *
 * Writes a valid header, variable table and record run in exactly the layout
 * the real thing uses, so the parsers above are exercised against bytes rather
 * than against a mock.
 */
export function buildTestBuffer(opts: {
  vars: { name: string; type: VarType; unit?: string; values: number[] }[]
  sessionInfo?: string
  tickRate?: number
  /** Include the disk sub-header, as a .ibt file does. */
  asFile?: boolean
}): Buffer {
  const yaml = opts.sessionInfo ?? ''
  const asFile = opts.asFile ?? false
  const recordCount = Math.max(...opts.vars.map((v) => v.values.length), 0)

  // Lay out the record.
  let offset = 0
  const headers = opts.vars.map((v) => {
    const h = { ...v, offset }
    offset += sizeOf(v.type)
    return h
  })
  const bufLen = offset

  const varHeaderOffset = HEADER_SIZE + (asFile ? DISK_SUB_HEADER_SIZE : 0)
  const sessionInfoOffset = varHeaderOffset + headers.length * VAR_HEADER_SIZE
  const dataOffset = sessionInfoOffset + Buffer.byteLength(yaml, 'latin1')

  const total = dataOffset + recordCount * bufLen
  const buf = Buffer.alloc(total)

  buf.writeInt32LE(2, 0) // version
  buf.writeInt32LE(1, 4) // status: connected
  buf.writeInt32LE(opts.tickRate ?? 60, 8)
  buf.writeInt32LE(1, 12)
  buf.writeInt32LE(Buffer.byteLength(yaml, 'latin1'), 16)
  buf.writeInt32LE(sessionInfoOffset, 20)
  buf.writeInt32LE(headers.length, 24)
  buf.writeInt32LE(varHeaderOffset, 28)
  buf.writeInt32LE(asFile ? 1 : 3, 32)
  buf.writeInt32LE(bufLen, 36)
  for (let i = 0; i < MAX_BUFFERS; i++) {
    buf.writeInt32LE(i === 0 ? recordCount : 0, 48 + i * 16)
    buf.writeInt32LE(i === 0 ? dataOffset : 0, 48 + i * 16 + 4)
  }

  if (asFile) {
    buf.writeBigInt64LE(0n, HEADER_SIZE)
    buf.writeDoubleLE(0, HEADER_SIZE + 8)
    buf.writeDoubleLE(recordCount / (opts.tickRate ?? 60), HEADER_SIZE + 16)
    buf.writeInt32LE(1, HEADER_SIZE + 24)
    buf.writeInt32LE(recordCount, HEADER_SIZE + 28)
  }

  headers.forEach((h, i) => {
    const at = varHeaderOffset + i * VAR_HEADER_SIZE
    buf.writeInt32LE(h.type, at)
    buf.writeInt32LE(h.offset, at + 4)
    buf.writeInt32LE(1, at + 8)
    buf.writeUInt8(0, at + 12)
    buf.write(h.name, at + 16, 32, 'latin1')
    buf.write(h.name, at + 48, 64, 'latin1')
    buf.write(h.unit ?? '', at + 112, 32, 'latin1')
  })

  buf.write(yaml, sessionInfoOffset, 'latin1')

  for (let r = 0; r < recordCount; r++) {
    const base = dataOffset + r * bufLen
    for (const h of headers) {
      const value = h.values[Math.min(r, h.values.length - 1)] ?? 0
      const at = base + h.offset
      switch (h.type) {
        case VarType.Double:
          buf.writeDoubleLE(value, at)
          break
        case VarType.Float:
          buf.writeFloatLE(value, at)
          break
        case VarType.Int:
        case VarType.BitField:
          buf.writeInt32LE(Math.round(value), at)
          break
        default:
          buf.writeUInt8(value ? 1 : 0, at)
      }
    }
  }

  return buf
}

/**
 * The smallest region that contains everything a header points at.
 *
 * Needed because the live source must not ask Windows for a view of a size it
 * invented. `MapViewOfFile` fails outright when the requested view exceeds the
 * mapping, and it fails with ACCESS_DENIED -- which reads exactly like "iRacing
 * is not running" to a caller that does not check the error code. Mapping the
 * whole region and then asking how big it turned out to be is the correct
 * order; this function is the fallback for when that answer is unavailable.
 *
 * Every offset in the header is a lower bound on the size, so the answer is
 * simply the furthest reach of any of them.
 */
export function requiredBytes(header: IrsdkHeader): number {
  let end = HEADER_SIZE
  end = Math.max(end, header.sessionInfoOffset + header.sessionInfoLength)
  end = Math.max(end, header.varHeaderOffset + header.numVars * VAR_HEADER_SIZE)
  for (let i = 0; i < Math.min(header.numBuf, header.buffers.length); i++) {
    end = Math.max(end, header.buffers[i].bufOffset + header.bufLen)
  }
  return end
}

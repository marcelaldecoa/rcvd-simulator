/**
 * The .ibt session-file source -- Phase 2's post-session half.
 *
 * A session file is the same header and variable table as the live shared
 * memory, followed by a run of fixed-size records instead of a rotating set of
 * four. So this file is short: almost everything it needs already exists in
 * `irsdk/layout.ts` and `irsdk/channels.ts`, which is the payoff for having
 * separated the binary layout from the transport.
 *
 * Unlike the live source this one is not real-time, so it does the work the
 * overlay cannot afford: it can scan the whole session, fit an understeer
 * gradient, and hand back a peak-slip-angle estimate that the next live session
 * can start from rather than having to learn again.
 */

import { readFile } from 'node:fs/promises'
import {
  DISK_SUB_HEADER_SIZE,
  HEADER_SIZE,
  indexVars,
  readDiskSubHeader,
  readHeader,
  readVarHeaders,
  type DiskSubHeader,
  type IrsdkHeader,
  type VarHeader
} from './irsdk/layout.js'
import { DEFAULT_SIGNS, inferSteeringRatio, mapSample, type SignConvention } from './irsdk/channels.js'
import type {
  SessionInfo,
  SetupSnapshot,
  SourceStatus,
  TelemetrySample,
  TelemetrySource
} from './types.js'

export interface IbtOptions {
  /** Handwheel degrees per road-wheel degree. Inferred if omitted. */
  steeringRatio?: number
  signs?: SignConvention
  /** Wheelbase, m -- only needed when the ratio has to be inferred. */
  wheelbase?: number
  /** Keep only every nth record. 1 keeps everything. */
  decimate?: number
}

export interface IbtFile {
  header: IrsdkHeader
  disk: DiskSubHeader
  vars: VarHeader[]
  sessionInfo: string
  samples: TelemetrySample[]
  /** The ratio used, and whether it was given or inferred. */
  steeringRatio: number
  steeringRatioInferred: boolean
}

/**
 * Parse a whole .ibt buffer.
 *
 * Separated from the file reading so it can be tested against bytes built in
 * memory -- which is the only way to test any of this without owning a real
 * session file.
 */
export function parseIbt(buf: Buffer, opts: IbtOptions = {}): IbtFile {
  const header = readHeader(buf)
  const disk = readDiskSubHeader(buf)
  const vars = readVarHeaders(buf, header)
  const index = indexVars(vars)

  const sessionInfo = buf.toString(
    'latin1',
    header.sessionInfoOffset,
    header.sessionInfoOffset + header.sessionInfoLength
  )

  const dataOffset = header.buffers[0].bufOffset
  const stride = header.bufLen
  if (stride <= 0) throw new Error('.ibt record length is zero')

  // Trust the file size over the declared record count: a session that ended in
  // a crash, or a file still being written, has a count that overstates what is
  // actually there.
  const available = Math.max(0, Math.floor((buf.length - dataOffset) / stride))
  const count = Math.min(available, disk.sessionRecordCount || available)
  const step = Math.max(1, Math.round(opts.decimate ?? 1))

  // The ratio has to be settled before mapping, because it divides the steer
  // channel. When it is not supplied, map once with a ratio of 1 to get raw
  // handwheel angles, infer from those, then map properly.
  let ratio = opts.steeringRatio ?? 0
  let inferred = false
  if (!(ratio > 0)) {
    const raw: TelemetrySample[] = []
    for (let i = 0; i < count; i += Math.max(step, 4)) {
      const at = dataOffset + i * stride
      raw.push(mapSample(buf.subarray(at, at + stride), index, { steeringRatio: 1 }))
    }
    const guess = opts.wheelbase ? inferSteeringRatio(raw, opts.wheelbase) : null
    ratio = guess ?? 12
    inferred = true
  }

  const samples: TelemetrySample[] = []
  let timeOrigin: number | null = null
  for (let i = 0; i < count; i += step) {
    const at = dataOffset + i * stride
    const s = mapSample(buf.subarray(at, at + stride), index, {
      steeringRatio: ratio,
      signs: opts.signs ?? DEFAULT_SIGNS,
      timeOrigin: timeOrigin ?? undefined
    })
    if (timeOrigin === null) {
      timeOrigin = s.t
      s.t = 0
    }
    samples.push(s)
  }

  return {
    header,
    disk,
    vars,
    sessionInfo,
    samples,
    steeringRatio: ratio,
    steeringRatioInferred: inferred
  }
}

/** A quick structural check, so a wrong file gives a sentence and not a crash. */
export function looksLikeIbt(buf: Buffer): boolean {
  if (buf.length < HEADER_SIZE + DISK_SUB_HEADER_SIZE) return false
  try {
    const h = readHeader(buf)
    return (
      h.version > 0 &&
      h.numVars > 0 &&
      h.numVars < 10000 &&
      h.bufLen > 0 &&
      h.varHeaderOffset >= HEADER_SIZE &&
      h.varHeaderOffset < buf.length
    )
  } catch {
    return false
  }
}

export class IbtSource implements TelemetrySource {
  readonly kind = 'file' as const
  private file: IbtFile | null = null
  private listeners = new Set<(s: TelemetrySample) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private cursor = 0
  private detail = 'no file loaded'

  constructor(
    private path: string,
    private opts: IbtOptions = {}
  ) {}

  status(): SourceStatus {
    return { kind: this.kind, connected: this.file !== null, detail: this.detail }
  }

  session(): SessionInfo {
    return {
      sampleRate: this.file?.header.tickRate ?? 60,
      trackName: this.yamlValue('TrackDisplayName'),
      carName: this.yamlValue('CarScreenName')
    }
  }

  private yamlValue(key: string): string | undefined {
    if (!this.file) return undefined
    const m = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm').exec(this.file.sessionInfo)
    return m ? m[1].trim() : undefined
  }

  setup(): SetupSnapshot | null {
    return null
  }

  all(): TelemetrySample[] {
    return this.file?.samples ?? []
  }

  parsed(): IbtFile | null {
    return this.file
  }

  subscribe(onSample: (s: TelemetrySample) => void): () => void {
    this.listeners.add(onSample)
    return () => this.listeners.delete(onSample)
  }

  async start(): Promise<void> {
    try {
      const buf = await readFile(this.path)
      if (!looksLikeIbt(buf)) {
        this.detail = 'that file is not an iRacing .ibt telemetry file'
        return
      }
      this.file = parseIbt(buf, this.opts)
      this.detail =
        `${this.file.samples.length} samples, ${this.file.vars.length} channels` +
        (this.file.steeringRatioInferred
          ? `, steering ratio inferred as ${this.file.steeringRatio.toFixed(1)}:1`
          : '')
      this.cursor = 0
    } catch (e) {
      this.detail = `could not read the file (${e instanceof Error ? e.message : String(e)})`
    }
  }

  /** Replay the loaded session to subscribers at a chosen speed. */
  replay(speed = 1): void {
    if (!this.file || this.timer) return
    const rate = (this.file.header.tickRate || 60) * speed
    this.timer = setInterval(() => {
      const s = this.file?.samples[this.cursor++]
      if (!s) return this.stop()
      for (const l of this.listeners) l(s)
    }, 1000 / rate)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}

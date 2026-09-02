/**
 * The live iRacing source.
 *
 * Attaches to the shared memory, waits on the data-ready event, and publishes
 * one TelemetrySample per tick in the app's own vocabulary. Everything specific
 * to iRacing -- the binary layout, the channel names, the handwheel-to-road-
 * wheel conversion -- is handled below this line so nothing downstream ever
 * learns which simulator it is talking to.
 *
 * Reconnection is the normal case, not an error path. A driver starts the app
 * before the sim, leaves a session, joins another. So `start()` returns
 * immediately whether or not iRacing is running and a retry timer keeps trying;
 * `status()` always has a sentence explaining the current state.
 */

import {
  HEADER_SIZE,
  indexVars,
  readHeader,
  readVarHeaders,
  type IrsdkHeader,
  type VarHeader
} from './irsdk/layout.js'
import { SharedMemoryReader } from './irsdk/shm.js'
import {
  CHANNELS,
  DEFAULT_SIGNS,
  mapSample,
  steeringRatioFromSession,
  type SignConvention
} from './irsdk/channels.js'
import type {
  SessionInfo,
  SetupSnapshot,
  SourceStatus,
  TelemetrySample,
  TelemetrySource
} from './types.js'

/** iRacing's status word: bit 0 set means a session is live. */
const STATUS_CONNECTED = 1

export interface LiveOptions {
  /** Handwheel degrees per road-wheel degree. */
  steeringRatio?: number
  signs?: SignConvention
  /** How often to retry attaching while iRacing is not running, ms. */
  retryMs?: number
  /** Polling interval when the data-ready event is unavailable, ms. */
  pollMs?: number
}

export class LiveIRacingSource implements TelemetrySource {
  readonly kind = 'live' as const

  private shm = new SharedMemoryReader()
  private listeners = new Set<(s: TelemetrySample) => void>()
  private header: IrsdkHeader | null = null
  private vars: Map<string, VarHeader> = new Map()
  private sessionYaml = ''
  private lastTick = -1
  private timeOrigin: number | null = null
  private loop: ReturnType<typeof setInterval> | null = null
  private retry: ReturnType<typeof setInterval> | null = null
  private running = false
  private detail = 'not started'
  private steeringRatio: number

  constructor(private opts: LiveOptions = {}) {
    this.steeringRatio = opts.steeringRatio ?? 12
  }

  status(): SourceStatus {
    return {
      kind: this.kind,
      connected: this.header !== null && (this.header.status & STATUS_CONNECTED) !== 0,
      detail: this.detail
    }
  }

  session(): SessionInfo {
    return {
      sampleRate: this.header?.tickRate ?? 60,
      trackName: this.yamlValue('TrackDisplayName'),
      carName: this.yamlValue('CarScreenName'),
      trackLength: undefined
    }
  }

  /**
   * A deliberately small YAML reach.
   *
   * The session string is a large document and parsing all of it would mean
   * carrying a YAML dependency into the main process for the sake of a handful
   * of fields. These are read by key because that is all that is wanted; if the
   * setup sheet is ever needed in full, that is the moment to add a parser.
   */
  private yamlValue(key: string): string | undefined {
    const m = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm').exec(this.sessionYaml)
    return m ? m[1].trim() : undefined
  }

  setup(): SetupSnapshot | null {
    return null
  }

  all(): TelemetrySample[] {
    return []
  }

  subscribe(onSample: (s: TelemetrySample) => void): () => void {
    this.listeners.add(onSample)
    return () => this.listeners.delete(onSample)
  }

  /**
   * Which of the channels this app reads the sim is NOT publishing.
   *
   * Worth asking directly. A missing channel reads downstream as a constant
   * zero, which is indistinguishable from a car that simply is not moving --
   * so inferring it from the data gives a false alarm on every stationary car
   * and stays silent on the one case that matters.
   */
  missingChannels(): string[] {
    if (!this.header) return []
    return Object.values(CHANNELS).filter((name) => !this.vars.has(name))
  }

  /** The steering ratio in use, so a caller can display or override it. */
  get ratio(): number {
    return this.steeringRatio
  }

  setSteeringRatio(r: number): void {
    if (r > 0) this.steeringRatio = r
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    await this.attach()
    // Keep trying: iRacing may not be running yet, and that is ordinary.
    this.retry = setInterval(() => {
      if (!this.header) void this.attach()
    }, this.opts.retryMs ?? 2000)
  }

  private async attach(): Promise<void> {
    const ok = await this.shm.open()
    if (!ok) {
      this.detail = this.shm.status().detail
      return
    }
    const buf = this.shm.read()
    if (!buf) {
      this.detail = 'attached, but the mapping could not be read'
      return
    }
    try {
      this.header = readHeader(buf)
      this.vars = indexVars(readVarHeaders(buf, this.header))
      this.sessionYaml = buf.toString(
        'latin1',
        this.header.sessionInfoOffset,
        this.header.sessionInfoOffset + this.header.sessionInfoLength
      )
      // A ratio published by the sim beats the one we guessed -- from either
      // place it can appear, because neither key is on every car.
      const published = steeringRatioFromSession(this.sessionYaml)
      if (published !== null) this.steeringRatio = published
      this.detail = `connected — ${this.vars.size} channels at ${this.header.tickRate} Hz`
      this.startLoop()
    } catch (e) {
      this.header = null
      this.detail = `shared memory present but not readable as irsdk (${
        e instanceof Error ? e.message : String(e)
      })`
    }
  }

  private startLoop(): void {
    if (this.loop) return
    // Poll at twice the tick rate and dedupe on tickCount, rather than blocking
    // on iRacing's data-ready event.
    //
    // The event is the obvious tool and it is the wrong one HERE: this runs in
    // Electron's main process, so a blocking wait stalls IPC and window
    // painting along with it. Measured against a live session, waiting cost a
    // quarter of the samples -- 45 Hz out of 60 -- while also making the UI
    // answer late. Polling costs a 112-byte read at 120 Hz, which is nothing.
    const period = this.opts.pollMs ?? 1000 / 120
    this.loop = setInterval(() => this.tick(), period)
  }

  /**
   * Read the newest complete buffer.
   *
   * iRacing rotates several buffers and stamps each with a tick count; the one
   * with the highest count is the most recent complete write. Taking that
   * rather than a fixed slot is what avoids reading a record while it is being
   * written.
   */
  private tick(): void {
    if (!this.header) return

    // Only the header, not the whole region: the mapping is over a megabyte,
    // almost all of it the session string, and none of that changes per tick.
    const head = this.shm.readRange(0, HEADER_SIZE)
    if (!head) {
      this.header = null
      this.detail = 'iRacing closed'
      this.stopLoop()
      return
    }

    const header = readHeader(head)
    this.header = header
    if ((header.status & STATUS_CONNECTED) === 0) {
      this.detail = 'iRacing running, but no session is live'
      return
    }

    let best = header.buffers[0]
    for (let i = 1; i < Math.min(header.numBuf, header.buffers.length); i++) {
      if (header.buffers[i].tickCount > best.tickCount) best = header.buffers[i]
    }
    if (best.tickCount === this.lastTick) return
    this.lastTick = best.tickCount

    const record = this.shm.readRange(best.bufOffset, header.bufLen)
    if (!record || record.length < header.bufLen) return

    const sample = mapSample(record, this.vars, {
      steeringRatio: this.steeringRatio,
      signs: this.opts.signs ?? DEFAULT_SIGNS,
      timeOrigin: this.timeOrigin ?? undefined
    })
    if (this.timeOrigin === null) {
      this.timeOrigin = sample.t
      sample.t = 0
    }
    for (const l of this.listeners) l(sample)
  }

  private stopLoop(): void {
    if (this.loop) clearInterval(this.loop)
    this.loop = null
  }

  stop(): void {
    this.running = false
    this.stopLoop()
    if (this.retry) clearInterval(this.retry)
    this.retry = null
    this.shm.close()
    this.header = null
    this.lastTick = -1
    this.timeOrigin = null
    this.detail = 'stopped'
  }
}

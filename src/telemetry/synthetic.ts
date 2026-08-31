/**
 * A synthetic telemetry source, generated from the app's own vehicle model.
 *
 * Its purpose is not to fake data for display. It is to make the analysis
 * pipeline testable end to end before any simulator plumbing exists: if
 * identifyUndersteerGradient cannot recover the K of a car we built ourselves,
 * it will not recover the K of a car we did not.
 */

import { G, toRad } from '../core/util/numeric.js'
import { derive, type BicycleVehicle } from '../core/vehicle/params.js'
import { trimFromSteer } from '../core/vehicle/steadyState.js'
import type {
  SessionInfo,
  SetupSnapshot,
  SourceStatus,
  TelemetrySample,
  TelemetrySource
} from './types.js'

export interface SyntheticOptions {
  vehicle: BicycleVehicle
  /** Sample rate, Hz. */
  rate?: number
  /** Seconds held at each steady trim point. */
  dwell?: number
  /** Gaussian noise on the measured channels, as a fraction of full scale. */
  noise?: number
  /** Deterministic seed, so a test run is reproducible. */
  seed?: number
}

/** A small deterministic PRNG -- Math.random would make tests flaky. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sweeps a grid of speeds and steer angles, holding each as a steady turn --
 * the constant-speed and constant-radius tests of Ch 11, run back to back.
 */
export function generateSamples(opts: SyntheticOptions): TelemetrySample[] {
  const { vehicle } = opts
  const rate = opts.rate ?? 60
  const dwell = opts.dwell ?? 1
  const noise = opts.noise ?? 0
  const rand = mulberry32(opts.seed ?? 1)
  const gauss = (): number =>
    Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand())

  const { L } = derive(vehicle)
  const out: TelemetrySample[] = []
  const perDwell = Math.max(1, Math.round(rate * dwell))
  let t = 0
  let lap = 1

  for (const speed of [15, 22, 30, 38, 45]) {
    for (const steerDeg of [-4, -3, -2, -1, 1, 2, 3, 4]) {
      const trim = trimFromSteer(vehicle, speed, toRad(steerDeg))
      for (let i = 0; i < perDwell; i++) {
        out.push({
          t,
          speed: speed * (1 + noise * gauss() * 0.02),
          ax: noise * gauss() * 0.05 * G,
          ay: trim.ay * G * (1 + noise * gauss() * 0.02),
          yawRate: trim.yawRate * (1 + noise * gauss() * 0.02),
          steer: trim.steer + noise * gauss() * toRad(0.05),
          throttle: 0.4,
          brake: 0,
          lapDistPct: (t / 90) % 1,
          lap
        })
        t += 1 / rate
      }
      lap = 1 + Math.floor(t / 90)
    }
  }
  void L
  return out
}

export class SyntheticSource implements TelemetrySource {
  readonly kind = 'synthetic' as const
  private samples: TelemetrySample[] = []
  private listeners = new Set<(s: TelemetrySample) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private cursor = 0

  constructor(private opts: SyntheticOptions) {}

  status(): SourceStatus {
    return {
      kind: this.kind,
      connected: this.samples.length > 0,
      detail: `Synthetic data from "${this.opts.vehicle.name}"`
    }
  }

  session(): SessionInfo {
    return { carName: this.opts.vehicle.name, sampleRate: this.opts.rate ?? 60 }
  }

  setup(): SetupSnapshot | null {
    return null
  }

  all(): TelemetrySample[] {
    return this.samples
  }

  subscribe(onSample: (s: TelemetrySample) => void): () => void {
    this.listeners.add(onSample)
    return () => this.listeners.delete(onSample)
  }

  async start(): Promise<void> {
    this.samples = generateSamples(this.opts)
    this.cursor = 0
    const rate = this.opts.rate ?? 60
    this.timer = setInterval(() => {
      const s = this.samples[this.cursor++]
      if (!s) return this.stop()
      for (const l of this.listeners) l(s)
    }, 1000 / rate)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}

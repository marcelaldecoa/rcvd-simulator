/**
 * The telemetry service: one source, one pipeline, two consumers.
 *
 * Lives in the main process for a specific reason. The overlay renderer's only
 * job is to paint, and at 60 Hz it cannot afford to also be estimating sideslip
 * and tracking limits. So the maths runs here, once, and both windows receive a
 * small finished object rather than raw samples.
 *
 * Sources are interchangeable by design: live iRacing, a replayed .ibt file, or
 * the synthetic generator. The pipeline downstream cannot tell which it is
 * attached to, which is what let the whole analysis be built and tested before
 * any simulator plumbing existed.
 */

import { LiveIRacingSource } from '../telemetry/live.js'
import { IbtSource } from '../telemetry/ibt.js'
import { SyntheticSource } from '../telemetry/synthetic.js'
import { OverlayPipeline, type OverlayReading, type VehicleGeometry } from '../telemetry/state.js'
import type { SourceStatus, TelemetrySample, TelemetrySource } from '../telemetry/types.js'
import { FORMULA_CAR, derive } from '../core/vehicle/params.js'

export type SourceChoice = 'live' | 'synthetic' | { file: string }

export interface ServiceConfig {
  geometry: VehicleGeometry
  /** Modelled peak slip angles, rad, used until the tracker learns better. */
  modelPeakFront: number
  modelPeakRear: number
  steeringRatio: number
}

export interface ServiceState {
  status: SourceStatus
  /** The most recent reading, or null before the first sample. */
  reading: OverlayReading | null
  /** How the two axle limits are currently being estimated. */
  limits: ReturnType<OverlayPipeline['limits']>
  /** True when sideslip is integrated rather than measured -- it will drift. */
  integratingSideslip: boolean
  samplesSeen: number
}

const defaults = (): ServiceConfig => {
  const d = derive(FORMULA_CAR)
  return {
    geometry: { a: FORMULA_CAR.a, b: FORMULA_CAR.b, frontWeightFraction: d.frontWeightFraction },
    modelPeakFront: (6 * Math.PI) / 180,
    modelPeakRear: (7 * Math.PI) / 180,
    steeringRatio: FORMULA_CAR.steeringRatio
  }
}

export class TelemetryService {
  private source: TelemetrySource | null = null
  private unsubscribe: (() => void) | null = null
  private pipeline: OverlayPipeline
  private config: ServiceConfig
  private listeners = new Set<(r: OverlayReading) => void>()
  private latest: OverlayReading | null = null
  private seen = 0
  /**
   * Readings are produced at 60 Hz but nothing needs telling that often except
   * the overlay. This throttles the slower consumers.
   */
  private lastBroadcast = 0

  constructor(config?: Partial<ServiceConfig>) {
    this.config = { ...defaults(), ...config }
    this.pipeline = this.buildPipeline()
  }

  private buildPipeline(): OverlayPipeline {
    return new OverlayPipeline(this.config.geometry, {
      modelPeakFront: this.config.modelPeakFront,
      modelPeakRear: this.config.modelPeakRear
    })
  }

  /** Reconfigure for a different car. Resets the learned limits, deliberately. */
  configure(patch: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...patch }
    // A limit learned on one car means nothing on another, so it goes.
    this.pipeline = this.buildPipeline()
    this.latest = null
    if (this.source instanceof LiveIRacingSource) {
      this.source.setSteeringRatio(this.config.steeringRatio)
    }
  }

  currentConfig(): ServiceConfig {
    return this.config
  }

  state(): ServiceState {
    return {
      status: this.source?.status() ?? {
        kind: 'none',
        connected: false,
        detail: 'no source selected'
      },
      reading: this.latest,
      limits: this.pipeline.limits(),
      integratingSideslip: this.pipeline.isIntegratingSideslip,
      samplesSeen: this.seen
    }
  }

  /** Subscribe to every reading. The overlay uses this; the UI throttles. */
  subscribe(fn: (r: OverlayReading) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** All samples, for a file source. Empty for live. */
  samples(): TelemetrySample[] {
    return this.source?.all() ?? []
  }

  async select(choice: SourceChoice): Promise<void> {
    await this.stop()
    this.pipeline = this.buildPipeline()
    this.latest = null
    this.seen = 0

    if (choice === 'live') {
      this.source = new LiveIRacingSource({ steeringRatio: this.config.steeringRatio })
    } else if (choice === 'synthetic') {
      this.source = new SyntheticSource({ vehicle: FORMULA_CAR, rate: 60, noise: 0.4, seed: 7 })
    } else {
      this.source = new IbtSource(choice.file, {
        steeringRatio: this.config.steeringRatio,
        wheelbase: this.config.geometry.a + this.config.geometry.b
      })
    }

    this.unsubscribe = this.source.subscribe((s) => this.onSample(s))
    await this.source.start()

    // A file source loads rather than streams, so replay it to get readings.
    if (this.source instanceof IbtSource) this.source.replay(1)
  }

  private onSample(s: TelemetrySample): void {
    this.seen++
    const reading = this.pipeline.push(s)
    this.latest = reading
    for (const l of this.listeners) l(reading)
  }

  /** True when enough time has passed to send a slower consumer an update. */
  shouldBroadcast(now: number, hz = 10): boolean {
    if (now - this.lastBroadcast < 1000 / hz) return false
    this.lastBroadcast = now
    return true
  }

  async stop(): Promise<void> {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.source?.stop()
    this.source = null
  }
}

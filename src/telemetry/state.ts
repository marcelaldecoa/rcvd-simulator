/**
 * Turning telemetry into the quantities RCVD actually talks about.
 *
 * No simulator publishes slip angles. iRacing gives forward and lateral
 * velocity, yaw rate, steer and the two accelerations -- and from those the
 * bicycle model of Ch 5 gives everything the overlay needs:
 *
 *     beta     = atan2(v_lateral, v_forward)
 *     alpha_f  = delta - beta - a r / V
 *     alpha_r  =       - beta + b r / V
 *
 * That is the same arithmetic the rest of the app is built on, which is the
 * point: the overlay is not a separate model bolted on the side, it is the
 * course's own model fed by live data.
 *
 * The second job here is harder and worth being careful about. A driving aid
 * that colours the car green, yellow or red needs to know where the LIMIT is,
 * and nothing in the telemetry says. Two estimates are offered and neither is
 * presented as truth:
 *
 *   - observed: watch where lateral acceleration stops rising with slip angle.
 *     Self-calibrating, needs no setup, and is only correct once the driver has
 *     actually been to the limit at least once.
 *   - modelled: the peak slip angle of the garage's tyre at this axle load.
 *     Available from the first sample, and only as good as the match between
 *     the garage car and the car being driven.
 *
 * The honest default is to start modelled and let the observed estimate take
 * over as evidence accumulates, which is what `LimitTracker` does.
 */

import { G } from '../core/util/numeric.js'
import type { TelemetrySample } from './types.js'

const R2D = 180 / Math.PI

export interface VehicleGeometry {
  /** Front axle to CG, m. */
  a: number
  /** CG to rear axle, m. */
  b: number
  /** Static front axle load fraction, 0-1. */
  frontWeightFraction: number
}

export interface VehicleState {
  t: number
  speed: number
  /** Sideslip at the CG, rad. Positive means the nose points left of the path. */
  beta: number
  /** Front and rear axle slip angles, rad. */
  alphaFront: number
  alphaRear: number
  /** Lateral and longitudinal acceleration, g. */
  ay: number
  ax: number
  yawRate: number
  steer: number
  /** Path radius implied by the yaw rate, m. Infinite when running straight. */
  radius: number
  /**
   * False when the car is too slow for any of this to mean anything.
   *
   * Not a detail: the slip-angle kinematics divide by speed, so at a standstill
   * they amplify sensor noise without limit. Consumers must check this rather
   * than re-deriving it from `speed`, because a zeroed angle and a genuinely
   * zero angle are the same number and only one of them is a measurement.
   */
  valid: boolean
}

/**
 * The speed below which the slip-angle construction stops meaning anything.
 *
 * Every angle here is built on `a*r/V` and `atan2(vy, vx)`, and both degenerate
 * as V goes to zero -- the first by dividing by it, the second because the
 * arctangent of two near-zero numbers is arbitrary. A parked car still reports
 * a few microradians per second of yaw noise, and dividing that by a speed of
 * 1e-6 turned it into hundreds of degrees of slip: the overlay showed vivid,
 * confident, entirely fictional readings while the car sat still.
 *
 * 3 m/s is about 11 km/h -- below any speed at which a driver is asking a
 * balance question, and above the noise floor.
 */
export const MIN_KINEMATIC_SPEED = 3

/**
 * Sideslip from the sample, preferring the measured lateral velocity.
 *
 * Falls back to integrating beta_dot = Ay/V - r, which is what you must do when
 * a source has no lateral velocity channel -- and which drifts, so the caller
 * gets told. Below a few m/s the whole construction is meaningless (dividing by
 * a speed near zero), so it reports zero rather than a large wrong number.
 */
export class SideslipEstimator {
  private beta = 0
  private lastT: number | null = null
  private drifting = false

  /** True when the estimate is coming from integration rather than measurement. */
  get isIntegrating(): boolean {
    return this.drifting
  }

  reset(): void {
    this.beta = 0
    this.lastT = null
    this.drifting = false
  }

  update(s: TelemetrySample, minSpeed = MIN_KINEMATIC_SPEED): number {
    if (s.speed < minSpeed) {
      this.beta = 0
      this.lastT = s.t
      return 0
    }
    if (s.lateralVelocity !== undefined) {
      this.drifting = false
      this.beta = Math.atan2(s.lateralVelocity, s.speed)
      this.lastT = s.t
      return this.beta
    }
    // No measured lateral velocity: integrate, and say so.
    this.drifting = true
    const dt = this.lastT === null ? 0 : Math.max(0, Math.min(s.t - this.lastT, 0.2))
    this.lastT = s.t
    this.beta += (s.ay / s.speed - s.yawRate) * dt
    // A slow leak toward zero, so an accumulated bias does not run away over a
    // stint. Crude, and the reason the measured channel is strongly preferred.
    this.beta *= 1 - 0.02 * dt * 60
    return this.beta
  }
}

/** One sample turned into vehicle state. */
export function toVehicleState(
  s: TelemetrySample,
  geometry: VehicleGeometry,
  beta: number
): VehicleState {
  // Below walking pace there is no honest answer, so do not manufacture one.
  // The old floor here was 1e-6, which did not prevent the division -- it made
  // it a million-fold amplifier on whatever noise the yaw channel held.
  if (s.speed < MIN_KINEMATIC_SPEED) {
    return {
      t: s.t,
      speed: s.speed,
      beta: 0,
      alphaFront: 0,
      alphaRear: 0,
      ay: s.ay / G,
      ax: s.ax / G,
      yawRate: s.yawRate,
      steer: s.steer,
      radius: Infinity,
      valid: false
    }
  }

  const v = s.speed
  const straight = Math.abs(s.yawRate) < 1e-4
  return {
    t: s.t,
    speed: s.speed,
    beta,
    alphaFront: s.steer - beta - (geometry.a * s.yawRate) / v,
    alphaRear: -beta + (geometry.b * s.yawRate) / v,
    ay: s.ay / G,
    ax: s.ax / G,
    yawRate: s.yawRate,
    steer: s.steer,
    radius: straight ? Infinity : v / s.yawRate,
    valid: true
  }
}

/**
 * A low-pass filter for the display.
 *
 * Sideslip is a small difference of two velocities and is correspondingly
 * noisy; at 60 Hz an unfiltered readout is unreadable and, worse, an unreadable
 * driving aid is a distraction rather than an aid. One pole, time constant in
 * seconds, applied to the derived angles rather than the raw channels so the
 * kinematic relations between them are preserved.
 */
export class StateFilter {
  private last: VehicleState | null = null

  constructor(private timeConstant = 0.12) {}

  reset(): void {
    this.last = null
  }

  update(next: VehicleState): VehicleState {
    // An invalid state is not a measurement to be blended with; it is the
    // absence of one. Dropping the history here means that when the car does
    // get going, the display starts from the first real reading rather than
    // easing out of a run of zeros -- which would otherwise show a slip angle
    // sweeping up from nothing over the filter's time constant.
    if (!next.valid) {
      this.last = null
      return next
    }
    if (!this.last) {
      this.last = next
      return next
    }
    const dt = Math.max(0, Math.min(next.t - this.last.t, 0.2))
    const k = this.timeConstant > 0 ? 1 - Math.exp(-dt / this.timeConstant) : 1
    const mix = (a: number, b: number): number =>
      Number.isFinite(a) && Number.isFinite(b) ? a + k * (b - a) : b
    const out: VehicleState = {
      ...next,
      beta: mix(this.last.beta, next.beta),
      alphaFront: mix(this.last.alphaFront, next.alphaFront),
      alphaRear: mix(this.last.alphaRear, next.alphaRear),
      ay: mix(this.last.ay, next.ay),
      ax: mix(this.last.ax, next.ax)
    }
    this.last = out
    return out
  }
}

// ---------------------------------------------------------------------------
// Where is the limit?
// ---------------------------------------------------------------------------

export interface AxleLimitEstimate {
  /** Slip angle at which this axle peaks, rad. */
  peakSlipAngle: number
  /** How that estimate was reached. */
  source: 'model' | 'observed'
  /** Evidence behind an observed estimate: samples in the peak bin. */
  confidence: number
}

export interface LimitTrackerOptions {
  /** Modelled peak slip angle at each axle, rad. Used until evidence arrives. */
  modelPeakFront: number
  modelPeakRear: number
  /** Bin width for the observed estimate, rad. */
  binWidth?: number
  /** Samples needed in a bin before it can claim the peak. */
  minSamples?: number
  /** Ignore samples below this lateral acceleration, g. */
  minAy?: number
}

/**
 * Learns where each axle peaks by watching the data.
 *
 * The observable is not force -- telemetry has no axle force channel -- but
 * lateral acceleration, and at a trimmed cornering state Ch 7's demand split
 * makes those proportional: Fyf = Wf*Ay and Fyr = Wr*Ay. So the slip angle at
 * which |Ay| stops rising IS the slip angle at which that axle peaked.
 *
 * Binning rather than curve fitting, deliberately: a driver does not sweep slip
 * angle smoothly, the data is a scatter of whatever the corners happened to
 * demand, and a fit through that scatter would look more confident than it is.
 * A bin either has evidence in it or it does not.
 */
export class LimitTracker {
  private frontBins = new Map<number, { count: number; maxAy: number }>()
  private rearBins = new Map<number, { count: number; maxAy: number }>()
  private readonly binWidth: number
  private readonly minSamples: number
  private readonly minAy: number

  constructor(private opts: LimitTrackerOptions) {
    this.binWidth = opts.binWidth ?? 0.25 / R2D
    this.minSamples = opts.minSamples ?? 25
    this.minAy = opts.minAy ?? 0.35
  }

  reset(): void {
    this.frontBins.clear()
    this.rearBins.clear()
  }

  observe(state: VehicleState): void {
    // Never learn from a state whose angles were not measured. This matters
    // more than it looks: below the speed floor the angles are reported as
    // zero, so a low-speed high-Ay event -- a spin in the pit lane, a kerb --
    // would otherwise fill the zero bin with real lateral acceleration and
    // teach the estimator that this axle peaks at no slip angle at all.
    if (!state.valid) return
    const ay = Math.abs(state.ay)
    if (ay < this.minAy) return
    // Only accept states that are roughly trimmed: under heavy braking or power
    // the axle forces are no longer in the static ratio and the proportionality
    // the estimator rests on stops holding.
    if (Math.abs(state.ax) > 0.35) return

    const add = (bins: Map<number, { count: number; maxAy: number }>, alpha: number): void => {
      const bin = Math.round(Math.abs(alpha) / this.binWidth)
      const cur = bins.get(bin) ?? { count: 0, maxAy: 0 }
      cur.count++
      cur.maxAy = Math.max(cur.maxAy, ay)
      bins.set(bin, cur)
    }
    add(this.frontBins, state.alphaFront)
    add(this.rearBins, state.alphaRear)
  }

  private estimate(
    bins: Map<number, { count: number; maxAy: number }>,
    modelPeak: number
  ): AxleLimitEstimate {
    let best: { bin: number; maxAy: number; count: number } | null = null
    for (const [bin, v] of bins) {
      if (v.count < this.minSamples) continue
      if (!best || v.maxAy > best.maxAy) best = { bin, maxAy: v.maxAy, count: v.count }
    }
    if (!best) return { peakSlipAngle: modelPeak, source: 'model', confidence: 0 }

    // Only believe the observed peak once there is evidence on BOTH sides of
    // it. A peak in the highest bin visited just means the driver never went
    // further, which is the commonest way this estimator could lie.
    const beyond = [...bins.entries()].some(
      ([bin, v]) => bin > best!.bin && v.count >= this.minSamples
    )
    if (!beyond) return { peakSlipAngle: modelPeak, source: 'model', confidence: 0 }

    return {
      peakSlipAngle: best.bin * this.binWidth,
      source: 'observed',
      confidence: best.count
    }
  }

  front(): AxleLimitEstimate {
    return this.estimate(this.frontBins, this.opts.modelPeakFront)
  }

  rear(): AxleLimitEstimate {
    return this.estimate(this.rearBins, this.opts.modelPeakRear)
  }
}

// ---------------------------------------------------------------------------
// What the overlay says
// ---------------------------------------------------------------------------

export type Balance = 'understeer' | 'neutral' | 'oversteer'
export type LimitZone = 'under' | 'at' | 'over'

export interface OverlayReading {
  state: VehicleState
  /** Fraction of each axle's peak slip angle currently in use. */
  usageFront: number
  usageRear: number
  /** The larger of the two -- how close the CAR is to its limit. */
  usage: number
  zone: LimitZone
  balance: Balance
  /** alpha_f - alpha_r, rad. Positive is understeer. */
  balanceAngle: number
  /** Which axle is nearer its own peak. */
  limitingAxle: 'front' | 'rear'
  /** True while either limit estimate is still the modelled one. */
  provisional: boolean
  /** Short text for the box. */
  text: string
  /**
   * False when the car is too slow to measure. The overlay must show that it
   * is not measuring rather than a verdict, because "NEUTRAL, 0.0 degrees" is
   * a claim about the car and this is the absence of one.
   */
  valid: boolean
}

export interface ReadingOptions {
  /** Below this usage the car is comfortably under the limit. */
  greenBelow?: number
  /** Above this usage the tyre is past its peak and sliding. */
  redAbove?: number
  /** Slip angle difference below which the car reads as neutral, rad. */
  neutralBand?: number
}

/**
 * Turn state plus limit estimates into what the driver sees.
 *
 * Two independent signals, and conflating them would be the easy mistake:
 *
 *   BALANCE (the word) says WHICH END is giving up first -- the difference
 *   between the two slip angles, which is the definition of understeer from
 *   Ch 5 and is meaningful at any speed.
 *
 *   ZONE (the colour) says HOW CLOSE to the edge the car is -- the larger of
 *   the two axle usages. A car can be strongly understeering at 40% of its
 *   grip, which is green and understeer at once.
 */
export function toReading(
  state: VehicleState,
  front: AxleLimitEstimate,
  rear: AxleLimitEstimate,
  opts: ReadingOptions = {}
): OverlayReading {
  const green = opts.greenBelow ?? 0.85
  const red = opts.redAbove ?? 1.0
  const band = opts.neutralBand ?? 0.35 / R2D

  // Too slow to say anything. Report that, rather than a confident neutral --
  // a green box reading NEUTRAL at a standstill is not a harmless default, it
  // is the overlay asserting the car is balanced when it has no idea.
  if (!state.valid) {
    return {
      state,
      usageFront: 0,
      usageRear: 0,
      usage: 0,
      zone: 'under',
      balance: 'neutral',
      balanceAngle: 0,
      limitingAxle: 'front',
      provisional: front.source === 'model' || rear.source === 'model',
      text: '—',
      valid: false
    }
  }

  const usageFront =
    front.peakSlipAngle > 0 ? Math.abs(state.alphaFront) / front.peakSlipAngle : 0
  const usageRear = rear.peakSlipAngle > 0 ? Math.abs(state.alphaRear) / rear.peakSlipAngle : 0
  const usage = Math.max(usageFront, usageRear)

  const zone: LimitZone = usage > red ? 'over' : usage >= green ? 'at' : 'under'

  // Balance is judged on the magnitudes, so a right-hand corner reads the same
  // as a left-hand one.
  const balanceAngle = Math.abs(state.alphaFront) - Math.abs(state.alphaRear)
  const balance: Balance =
    Math.abs(balanceAngle) < band ? 'neutral' : balanceAngle > 0 ? 'understeer' : 'oversteer'

  const limitingAxle = usageFront >= usageRear ? 'front' : 'rear'
  const provisional = front.source === 'model' || rear.source === 'model'

  return {
    state,
    usageFront,
    usageRear,
    usage,
    zone,
    balance,
    balanceAngle,
    limitingAxle,
    provisional,
    text: balance === 'neutral' ? 'NEUTRAL' : balance.toUpperCase(),
    valid: true
  }
}

/** The three colours, one place, so the overlay and any chart agree. */
export const ZONE_COLOUR: Record<LimitZone, string> = {
  under: '#6ee787',
  at: '#ffcc55',
  over: '#ff6b6b'
}

/**
 * A continuous colour, so the box does not jump between three states.
 *
 * Green through yellow to red as usage runs from comfortably under to past the
 * peak. Discrete zones are still reported for the text; this is for the fill,
 * because a driver's peripheral vision reads a colour ramp far better than it
 * reads three steps.
 */
export function usageColour(usage: number, opts: ReadingOptions = {}): string {
  const green = opts.greenBelow ?? 0.85
  const red = opts.redAbove ?? 1.0
  const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t)
  const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

  if (usage <= green) {
    // deep green to yellow-green over the whole under-limit range
    const t = clamp01(usage / green)
    return `rgb(${lerp(80, 190, t)}, ${lerp(231, 226, t)}, ${lerp(135, 90, t)})`
  }
  const t = clamp01((usage - green) / Math.max(red - green, 1e-6))
  return `rgb(${lerp(190, 255, t)}, ${lerp(226, 107, t)}, ${lerp(90, 107, t)})`
}

/**
 * The whole pipeline, ready to be driven by a source.
 *
 * Holds the filter, the sideslip estimator and the limit tracker together so a
 * caller subscribes once and gets a reading per sample.
 */
export class OverlayPipeline {
  private sideslip = new SideslipEstimator()
  private filter: StateFilter
  private tracker: LimitTracker

  constructor(
    private geometry: VehicleGeometry,
    limits: LimitTrackerOptions,
    private reading: ReadingOptions = {},
    filterTimeConstant = 0.12
  ) {
    this.filter = new StateFilter(filterTimeConstant)
    this.tracker = new LimitTracker(limits)
  }

  reset(): void {
    this.sideslip.reset()
    this.filter.reset()
    this.tracker.reset()
  }

  /** Peak estimates as they stand, for display. */
  limits(): { front: AxleLimitEstimate; rear: AxleLimitEstimate } {
    return { front: this.tracker.front(), rear: this.tracker.rear() }
  }

  /** True when sideslip is being integrated rather than measured. */
  get isIntegratingSideslip(): boolean {
    return this.sideslip.isIntegrating
  }

  push(sample: TelemetrySample): OverlayReading {
    const beta = this.sideslip.update(sample)
    const raw = toVehicleState(sample, this.geometry, beta)
    const smoothed = this.filter.update(raw)
    this.tracker.observe(smoothed)
    const { front, rear } = this.limits()
    return toReading(smoothed, front, rear, this.reading)
  }
}

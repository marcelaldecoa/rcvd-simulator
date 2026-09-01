/**
 * The g-g diagram -- Ch 9.
 *
 * The complete performance envelope: every combination of longitudinal and
 * lateral acceleration the car can hold. Ch 9's central practical point is the
 * distinction between the CAPABILITY envelope (what the car could do) and the
 * USAGE plot (what the driver did), and that overlaying one on the other is the
 * most-used diagnostic in race data analysis.
 *
 * The envelope here is not a fitted ellipse. Each point on the boundary is
 * solved from the actual models: lateral capability comes from Ch 7 pair
 * analysis at the wheel loads Ch 18 produces, with Ch 3 downforce added, and
 * the longitudinal budget is shared with it through the Ch 2 friction ellipse.
 * That is slower than drawing an ellipse, and it is the point -- the departures
 * from a circle that Ch 9 §2 lists all fall out rather than being drawn in.
 */

import { G, bisect } from '../util/numeric.js'
import { derive, type BicycleVehicle } from '../vehicle/params.js'
import type { ChassisParams } from '../vehicle/chassis.js'
import { pairLimit } from '../vehicle/pairAnalysis.js'
import type { TireModel } from '../tire/types.js'
import { aeroLoads, drag, type AeroParams } from '../aero/index.js'

export interface PowertrainParams {
  /** Power at the wheels, W. */
  power: number
  /** Driveline efficiency already included in `power`; kept for clarity. */
  efficiency: number
  /** Fraction of weight on the driven axle usable for traction, 0-1. */
  drivenAxleShare: number
  /** Longitudinal friction coefficient available for braking. */
  brakingMu: number
}

export const DEFAULT_POWERTRAIN: PowertrainParams = {
  power: 400_000,
  efficiency: 1,
  drivenAxleShare: 0.52,
  brakingMu: 1.7
}

export interface GGPoint {
  /** Lateral acceleration, g. */
  ay: number
  /** Longitudinal acceleration, g. Positive accelerating, negative braking. */
  ax: number
}

export interface GGEnvelope {
  speed: number
  /** Boundary points, ordered from full braking round to full acceleration. */
  boundary: GGPoint[]
  /** Peak lateral acceleration at this speed, g. */
  peakAy: number
  /** Peak braking, g (negative). */
  peakBraking: number
  /** Peak acceleration, g (positive). */
  peakAcceleration: number
  /** True when acceleration is limited by power rather than traction. */
  powerLimited: boolean
  /** Downforce at this speed, N. */
  downforce: number
}

export interface GGOptions {
  vehicle: BicycleVehicle
  chassis: ChassisParams
  tireFront: TireModel
  tireRear: TireModel
  aero: AeroParams
  powertrain: PowertrainParams
  /** Points per quadrant of the boundary. */
  resolution?: number
}

/**
 * Maximum acceleration at a speed -- Ch 9 §2, item 2.
 *
 *   Ax = P/(mV) - drag/m - f_r g       (power-limited)
 *
 * capped by what the driven axle can put down. At low speed the traction cap
 * binds; at high speed the power term, falling as 1/V, does.
 */
export function maxAcceleration(
  o: GGOptions,
  speed: number
): { ax: number; powerLimited: boolean } {
  const { vehicle: v, aero, powertrain: p } = o
  const { w } = derive(v)
  const load = aeroLoads(aero, speed)

  // Traction limit: the driven axle's share of total vertical load, times the
  // longitudinal friction available. Downforce helps here too.
  const drivenLoad = (w + load.total) * p.drivenAxleShare
  const tractionAx = (drivenLoad * p.brakingMu) / w

  // Power limit, less drag and rolling resistance.
  const powerAx =
    speed > 0.1
      ? (p.power * p.efficiency) / (v.mass * speed) / G -
        drag(aero, speed) / (v.mass * G) -
        aero.rollingResistance
      : tractionAx

  const ax = Math.max(Math.min(tractionAx, powerAx), 0)
  return { ax, powerLimited: powerAx < tractionAx }
}

/**
 * Maximum braking at a speed, g (returned negative).
 *
 * All four tyres brake, so the whole vertical load is available -- which is why
 * Ch 9 §2 item 3 notes braking exceeds acceleration on nearly every car. Drag
 * helps too, and on a high-downforce car it helps a great deal.
 */
export function maxBraking(o: GGOptions, speed: number): number {
  const { vehicle: v, aero, powertrain: p } = o
  const { w } = derive(v)
  const load = aeroLoads(aero, speed)
  const tyre = ((w + load.total) * p.brakingMu) / w
  const aeroDrag = drag(aero, speed) / (v.mass * G)
  return -(tyre + aeroDrag + aero.rollingResistance)
}

/**
 * Fraction of each axle's lateral capacity left after longitudinal use.
 *
 * Ch 9 §3: the accelerating quadrants are systematically smaller than the
 * braking ones. Two reasons, and both are here — under power only the driven
 * axle spends friction on traction, so it pays the whole ellipse penalty
 * alone; under braking every wheel contributes, so the cost is shared.
 */
export function lateralFactors(
  o: GGOptions,
  speed: number,
  ax: number
): { front: number; rear: number } {
  const ellipse = (used: number): number =>
    Math.sqrt(Math.max(1 - Math.min(Math.abs(used), 1) ** 2, 0))

  if (ax > 0) {
    const span = maxAcceleration(o, speed).ax
    if (span <= 0) return { front: 1, rear: 1 }
    // Rear-driven: the rear alone pays for traction.
    return { front: 1, rear: ellipse(ax / span) }
  }
  if (ax < 0) {
    const span = -maxBraking(o, speed)
    if (span <= 0) return { front: 1, rear: 1 }
    const f = ellipse(ax / span)
    return { front: f, rear: f }
  }
  return { front: 1, rear: 1 }
}

/** Peak lateral acceleration at a speed, from pair analysis with downforce. */
export function peakLateral(o: GGOptions, speed: number, ax = 0): number {
  return pairLimit(
    o.vehicle,
    o.chassis,
    o.tireFront,
    o.tireRear,
    ax,
    aeroLoads(o.aero, speed),
    lateralFactors(o, speed, ax)
  ).limitAy
}

/**
 * The envelope at one speed.
 *
 * Each boundary point is found by asking, for a given longitudinal
 * acceleration, how much lateral acceleration remains -- solving the pair
 * analysis at that longitudinal state rather than assuming an ellipse. The
 * shape that comes out is asymmetric top to bottom, exactly as Ch 9 §3
 * describes, because braking loads the front while power unloads it.
 */
export function ggEnvelope(o: GGOptions, speed: number): GGEnvelope {
  const res = o.resolution ?? 22
  const accel = maxAcceleration(o, speed)
  const braking = maxBraking(o, speed)
  const load = aeroLoads(o.aero, speed)

  // peakLateral already applies the friction ellipse per axle, so there is no
  // second global penalty to add here.
  const lateralAt = (ax: number): number => peakLateral(o, speed, ax)

  const boundary: GGPoint[] = []
  // Sweep from full braking up to full acceleration, both sides.
  for (let i = 0; i <= res; i++) {
    const ax = braking + ((0 - braking) * i) / res
    boundary.push({ ax, ay: lateralAt(ax) })
  }
  for (let i = 1; i <= res; i++) {
    const ax = (accel.ax * i) / res
    boundary.push({ ax, ay: lateralAt(ax) })
  }

  return {
    speed,
    boundary,
    peakAy: peakLateral(o, speed, 0),
    peakBraking: braking,
    peakAcceleration: accel.ax,
    powerLimited: accel.powerLimited,
    downforce: load.total
  }
}

/** Mirror a half-envelope into the full symmetric diagram. */
export function mirrorEnvelope(boundary: GGPoint[]): GGPoint[] {
  const right = boundary.map((p) => ({ ...p }))
  const left = [...boundary].reverse().map((p) => ({ ax: p.ax, ay: -p.ay }))
  return [...left, ...right]
}

/**
 * The g-g-V surface: a stack of envelopes indexed by speed (Ch 9 §2, item 4).
 *
 * On a car with downforce this is the honest picture — a single g-g diagram is
 * only a slice of it, and quoting one number for "peak lateral g" hides the
 * speed it was measured at.
 */
export function ggSurface(o: GGOptions, speeds: number[]): GGEnvelope[] {
  return speeds.map((s) => ggEnvelope(o, s))
}

/**
 * Peak lateral acceleration against speed -- the clearest single view of what
 * aerodynamics does to a car.
 */
export function lateralVsSpeed(
  o: GGOptions,
  vMax = 90,
  n = 30
): { speed: number; ay: number; downforce: number }[] {
  const out: { speed: number; ay: number; downforce: number }[] = []
  for (let i = 0; i <= n; i++) {
    const speed = (vMax * i) / n
    out.push({
      speed,
      ay: peakLateral(o, speed, 0),
      downforce: aeroLoads(o.aero, speed).total
    })
  }
  return out
}

/**
 * The speed at which a car can hold a given corner radius, accounting for the
 * fact that downforce depends on the very speed being solved for.
 *
 * Ch 3's closed form assumes one constant mu; this solves the same balance
 * against the real tyre models, so it also sees load sensitivity.
 */
export function corneringSpeedForRadius(o: GGOptions, radius: number, vMax = 200): number {
  // Demand grows as V^2/R; capability grows with downforce, but not without
  // limit -- load sensitivity means each extra newton of download buys less
  // grip than the last. So this margin is NOT monotonic, and a blind bisection
  // over the whole range can land beyond the peak and return a speed the car
  // sailed past long ago. Scan for the FIRST sign change, then bisect inside it.
  const margin = (speed: number): number =>
    peakLateral(o, speed, 0) - (speed * speed) / (G * radius)

  const steps = 200
  let prev = 1
  let prevMargin = margin(prev)
  if (prevMargin <= 0) return prev

  for (let i = 1; i <= steps; i++) {
    const speed = 1 + ((vMax - 1) * i) / steps
    const m = margin(speed)
    if (m <= 0) return bisect(margin, prev, speed, 1e-6) ?? speed
    prev = speed
    prevMargin = m
  }
  void prevMargin
  // Capability outran demand across the whole range: the Ch 3 singularity.
  return Infinity
}

/**
 * Fraction of the envelope the driver actually used -- Ch 9 §4.
 *
 * Each sample is compared against the boundary at its own lateral acceleration,
 * so a point is "at the limit" when it reaches the envelope, not when it
 * reaches some fixed circle.
 */
export function envelopeUsage(
  envelope: GGEnvelope,
  samples: GGPoint[],
  threshold = 0.95
): { used: number; fraction: number } {
  if (!samples.length) return { used: 0, fraction: 0 }
  let used = 0
  for (const s of samples) {
    if (reachOf(envelope, s) >= threshold) used++
  }
  return { used, fraction: used / samples.length }
}

/**
 * How far out toward the boundary a sample sits, 1.0 being exactly on it.
 *
 * Measured RADIALLY — the magnitude of the sample compared with the boundary
 * in the same direction. Comparing lateral values alone would score a driver at
 * full braking in a straight line as using none of the envelope, when in fact
 * they are on its edge.
 *
 * The stored boundary is the ay >= 0 half, and the envelope is symmetric, so
 * samples are folded onto that half.
 */
export function reachOf(envelope: GGEnvelope, sample: GGPoint): number {
  const ay = Math.abs(sample.ay)
  const magnitude = Math.hypot(sample.ax, ay)
  if (magnitude < 1e-9) return 0

  const angle = Math.atan2(sample.ax, ay)
  let best = envelope.boundary[0]
  let bestDiff = Infinity
  for (const b of envelope.boundary) {
    const diff = Math.abs(Math.atan2(b.ax, Math.abs(b.ay)) - angle)
    if (diff < bestDiff) {
      bestDiff = diff
      best = b
    }
  }
  const edge = Math.hypot(best.ax, best.ay)
  return edge > 1e-9 ? magnitude / edge : 0
}

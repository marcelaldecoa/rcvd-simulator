/**
 * Steady-state pair analysis -- Ch 7.
 *
 * The bridge from linear theory to the nonlinear limit. Instead of one lumped
 * tyre per axle at a fixed load, each wheel gets its own load from Ch 18, and
 * the axle characteristic is the SUM of two tyres working at different loads.
 *
 * That single change brings in the mechanism the bicycle model cannot express:
 * because tyre force is concave in load (Ch 2 §3), splitting an axle's load
 * unevenly costs capacity, and the loss grows with the SQUARE of the transfer.
 * Since total transfer is fixed by m, Ay, h and t, the engineer's lever is its
 * DISTRIBUTION -- TLLTD -- which is why Ch 7 §4 calls it the master balance
 * parameter and why every anti-roll bar exists.
 *
 * The procedure follows Ch 7 §2 directly. Note step 7: the notes iterate
 * because sweeping slip angle means Ay is unknown until the forces are summed.
 * Parameterising by Ay instead removes the iteration entirely -- load transfer
 * is an explicit function of Ay -- which is exact, not an approximation.
 */

import { G, bisect, goldenMax, toRad } from '../util/numeric.js'
import { derive, type BicycleVehicle } from './params.js'
import { wheelLoads, type ChassisParams, type WheelLoads } from './chassis.js'

/** Extra vertical load per axle, e.g. aerodynamic download. */
export interface ExtraLoads {
  front: number
  rear: number
}

const NO_EXTRA: ExtraLoads = { front: 0, rear: 0 }
import type { TireModel } from '../tire/types.js'

const MAX_ALPHA = toRad(25)

export interface AxleCharacteristic {
  /** Slip angle, rad. */
  alpha: number
  /** Total axle lateral force, N. */
  fy: number
  /** Force normalised by the weight this axle carries, g. */
  fyPerWeight: number
  /** Outer tyre contribution, N. */
  outer: number
  /** Inner tyre contribution, N. */
  inner: number
}

/**
 * One axle's force against slip angle at a fixed pair of wheel loads.
 *
 * The normalised form is the "characteristic race-engineering diagram" of
 * Ch 7 §3: both axles plotted as force over the weight they carry, in g, so
 * they can be compared directly and the one that peaks lower is the limiting
 * axle.
 */
export function axleCharacteristic(
  tire: TireModel,
  loadOuter: number,
  loadInner: number,
  axleWeight: number,
  n = 80,
  maxAlpha = toRad(14)
): AxleCharacteristic[] {
  const out: AxleCharacteristic[] = []
  for (let i = 0; i <= n; i++) {
    const alpha = (maxAlpha * i) / n
    const outer = tire.fy(alpha, loadOuter)
    const inner = tire.fy(alpha, loadInner)
    const fy = outer + inner
    out.push({ alpha, fy, fyPerWeight: axleWeight > 0 ? fy / axleWeight : 0, outer, inner })
  }
  return out
}

/** Peak force an axle can make at a given pair of wheel loads, N. */
export function axlePeakForce(
  tire: TireModel,
  loadOuter: number,
  loadInner: number
): number {
  return goldenMax((a) => tire.fy(a, loadOuter) + tire.fy(a, loadInner), 0, MAX_ALPHA).value
}

export interface PairState {
  /** Lateral acceleration, g. */
  ay: number
  loads: WheelLoads
  /** Front slip angle required, rad. */
  alphaF: number
  alphaR: number
  /** Road-wheel steer angle for the given radius, rad. */
  steer: number
  /** Sideslip at the CG, rad. */
  beta: number
  /** Fraction of each axle's capacity in use. */
  usageFront: number
  usageRear: number
  /** Peak force each axle could make at these loads, N. */
  capacityFront: number
  capacityRear: number
  /** True once an axle cannot make the force demanded of it. */
  saturated: boolean
}

/**
 * The car's state at a given lateral acceleration, with real wheel loads.
 *
 * @param radius path radius, m -- only affects the steer angle and sideslip
 * @param ax longitudinal acceleration in g, for corner-phase work
 */
export function pairState(
  v: BicycleVehicle,
  c: ChassisParams,
  tireFront: TireModel,
  tireRear: TireModel,
  ay: number,
  radius = Infinity,
  ax = 0,
  aero: ExtraLoads = NO_EXTRA
): PairState {
  const { L, wf, wr } = derive(v)
  const loads = wheelLoads(v, c, ay, ax, aero)

  // Moment balance still demands each axle carry its share of the lateral
  // force in proportion to the STATIC axle loads.
  const needF = wf * ay
  const needR = wr * ay

  const capacityFront = axlePeakForce(tireFront, loads.fo, loads.fi)
  const capacityRear = axlePeakForce(tireRear, loads.ro, loads.ri)

  const peakAlphaF = goldenMax(
    (a) => tireFront.fy(a, loads.fo) + tireFront.fy(a, loads.fi),
    0,
    MAX_ALPHA
  ).at
  const peakAlphaR = goldenMax(
    (a) => tireRear.fy(a, loads.ro) + tireRear.fy(a, loads.ri),
    0,
    MAX_ALPHA
  ).at

  // Solve only on the rising branch: past the peak the state is not one the
  // car can hold.
  const aF = bisect(
    (a) => tireFront.fy(a, loads.fo) + tireFront.fy(a, loads.fi) - needF,
    0,
    peakAlphaF
  )
  const aR = bisect(
    (a) => tireRear.fy(a, loads.ro) + tireRear.fy(a, loads.ri) - needR,
    0,
    peakAlphaR
  )

  const alphaF = aF ?? peakAlphaF
  const alphaR = aR ?? peakAlphaR
  const ackermann = isFinite(radius) ? L / radius : 0

  return {
    ay,
    loads,
    alphaF,
    alphaR,
    steer: ackermann + (alphaF - alphaR),
    beta: (isFinite(radius) ? v.b / radius : 0) - alphaR,
    usageFront: capacityFront > 0 ? needF / capacityFront : 0,
    usageRear: capacityRear > 0 ? needR / capacityRear : 0,
    capacityFront,
    capacityRear,
    saturated: aF === null || aR === null
  }
}

export interface PairLimit {
  /** Highest lateral acceleration the car can hold, g. */
  limitAy: number
  /** Which axle runs out first. */
  limitingAxle: 'front' | 'rear'
  /** Lateral acceleration each axle alone could sustain, g. */
  limitAyFront: number
  limitAyRear: number
  /** Rear minus front: positive means the front gives up first (understeer). */
  limitBalance: number
}

/**
 * Find the limit, accounting for the fact that load transfer -- and therefore
 * axle capacity -- depends on the very lateral acceleration being solved for.
 *
 * Each axle's own limit is the Ay at which its capacity equals its demand.
 * That is a root, not a maximum, because raising Ay raises the demand AND
 * lowers the capacity: the two curves close on each other from both sides.
 */
export function pairLimit(
  v: BicycleVehicle,
  c: ChassisParams,
  tireFront: TireModel,
  tireRear: TireModel,
  ax = 0,
  aero: ExtraLoads = NO_EXTRA,
  /**
   * Fraction of each axle's lateral capacity still available after that axle
   * has spent part of its friction budget longitudinally (Ch 2 §6).
   *
   * Per-axle rather than global, because the two directions load the axles
   * differently: under power only the DRIVEN axle pays for traction, while
   * under braking all four wheels contribute. That asymmetry is what makes the
   * accelerating quadrants of the g-g diagram smaller than the braking ones.
   */
  lateralFactor: ExtraLoads = { front: 1, rear: 1 }
): PairLimit {
  const { wf, wr } = derive(v)

  // Demand is set by the car's WEIGHT; capacity is set by the vertical LOAD,
  // which downforce raises without adding any mass to accelerate. That
  // asymmetry is the whole reason a wing works.
  const marginFront = (ay: number): number => {
    const l = wheelLoads(v, c, ay, ax, aero)
    return (axlePeakForce(tireFront, l.fo, l.fi) * lateralFactor.front) / wf - ay
  }
  const marginRear = (ay: number): number => {
    const l = wheelLoads(v, c, ay, ax, aero)
    return (axlePeakForce(tireRear, l.ro, l.ri) * lateralFactor.rear) / wr - ay
  }

  /**
   * Each margin is positive at Ay = 0 and falls monotonically, so there is a
   * single root -- but the bracket has to CONTAIN it.
   *
   * A fixed ceiling is a trap here. A high-downforce car at speed genuinely
   * exceeds 6 g, and with a fixed bracket the root falls outside it, the
   * bisection reports failure, and a `?? 0` fallback turns "could not solve"
   * into "no grip at all" -- a wrong answer that looks entirely plausible on a
   * chart. So the bracket grows until it actually straddles the root, and the
   * fallback is the ceiling reached rather than zero.
   */
  const solve = (f: (ay: number) => number): number => {
    let hi = 4
    while (f(hi) > 0 && hi < 64) hi *= 2
    return bisect(f, 0, hi, 1e-9) ?? hi
  }

  const limitAyFront = solve(marginFront)
  const limitAyRear = solve(marginRear)
  const frontFirst = limitAyFront <= limitAyRear

  return {
    limitAy: Math.min(limitAyFront, limitAyRear),
    limitingAxle: frontFirst ? 'front' : 'rear',
    limitAyFront,
    limitAyRear,
    limitBalance: limitAyRear - limitAyFront
  }
}

export interface PairSweepPoint extends PairState {
  /** Local understeer gradient, rad/g. */
  localK: number
}

/**
 * Sweep lateral acceleration on a fixed radius, with load transfer active.
 *
 * This is the Ch 7 version of the Ch 5 skid pad, and the difference between
 * the two curves is exactly what load transfer contributes.
 */
export function pairSweep(
  v: BicycleVehicle,
  c: ChassisParams,
  tireFront: TireModel,
  tireRear: TireModel,
  radius: number,
  n = 50,
  ax = 0,
  aero: ExtraLoads = NO_EXTRA
): PairSweepPoint[] {
  const limit = pairLimit(v, c, tireFront, tireRear, ax, aero)
  const out: PairSweepPoint[] = []
  for (let i = 0; i <= n; i++) {
    const ay = (limit.limitAy * 0.999 * i) / n
    out.push({ ...pairState(v, c, tireFront, tireRear, ay, radius, ax, aero), localK: 0 })
  }
  for (let i = 0; i < out.length; i++) {
    const lo = out[Math.max(i - 1, 0)]
    const hi = out[Math.min(i + 1, out.length - 1)]
    out[i].localK = hi.ay > lo.ay ? (hi.steer - lo.steer) / (hi.ay - lo.ay) : 0
  }
  return out
}

/**
 * How the limit and its balance move as TLLTD is swept front to rear.
 *
 * The single most useful plot in setup work: it shows that moving transfer
 * forward costs the front and gains the rear, that total grip barely changes
 * (bars redistribute, they do not reduce -- to first order), and where the
 * balance crosses over.
 *
 * TLLTD is varied by moving roll stiffness between the bars while holding the
 * total constant, which is exactly what swapping bars does on a real car.
 */
export function tlltdSweep(
  v: BicycleVehicle,
  c: ChassisParams,
  tireFront: TireModel,
  tireRear: TireModel,
  n = 30,
  aero: ExtraLoads = NO_EXTRA
): { tlltd: number; limit: PairLimit; barFront: number }[] {
  const totalBar = c.barRollStiffnessFront + c.barRollStiffnessRear
  const out: { tlltd: number; limit: PairLimit; barFront: number }[] = []
  for (let i = 0; i <= n; i++) {
    const barFront = (totalBar * i) / n
    const trial: ChassisParams = {
      ...c,
      barRollStiffnessFront: barFront,
      barRollStiffnessRear: totalBar - barFront
    }
    const loads = wheelLoads(v, trial, 1)
    const share = loads.transfer.front + loads.transfer.rear
    out.push({
      tlltd: share > 0 ? loads.transfer.front / share : 0.5,
      limit: pairLimit(v, trial, tireFront, tireRear, 0, aero),
      barFront
    })
  }
  return out
}

/** Convenience: lateral acceleration in g from speed and radius. */
export function ayFor(speed: number, radius: number): number {
  return (speed * speed) / (G * radius)
}

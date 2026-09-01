/**
 * Steady-state stability and control -- Ch 5.
 *
 * "The intellectual centre of Part I." Everything here comes out of the
 * two-degree-of-freedom bicycle model with linear tires, and every result is
 * traceable to one of:
 *
 *   delta = L/R + K*Ay          the steady-state cornering equation
 *   K     = Wf/Cf - Wr/Cr       the understeer gradient
 *   SF    = 1 + K*V^2/(g*L)     the stability factor, which is the fingerprint
 *                               of K in every response gain
 *
 * K is returned in rad/g. Multiply by 180/pi for the deg/g figures the book
 * mostly quotes.
 */

import { G, bisect, goldenMax, toRad } from '../util/numeric.js'
import { derive, type BicycleVehicle } from './params.js'
import type { TireModel } from '../tire/types.js'

export type Balance = 'understeer' | 'neutral' | 'oversteer'

export interface StabilityDerivatives {
  /** Damping in sideslip, N/rad. Always negative. */
  yBeta: number
  /** Lateral force due to yaw rate, N per (rad/s). */
  yR: number
  /** Control force derivative, N/rad. */
  yDelta: number
  /** Static directional stability ("weathercock"), N.m/rad. The master parameter. */
  nBeta: number
  /** Yaw damping, N.m per (rad/s). Always negative. */
  nR: number
  /** Control moment derivative, N.m/rad. */
  nDelta: number
}

export interface SteadyStateSummary {
  /** Understeer gradient, rad/g. Positive = understeer. */
  K: number
  /** Understeer gradient, deg/g. */
  KDeg: number
  /** Front cornering compliance Wf/Cf, rad/g (Bundorf). */
  Df: number
  /** Rear cornering compliance Wr/Cr, rad/g. */
  Dr: number
  balance: Balance
  /** Characteristic speed, m/s. Only defined for K > 0. */
  characteristicSpeed: number | null
  /** Critical speed, m/s. Only defined for K < 0. */
  criticalSpeed: number | null
  /** Tangent speed, m/s -- where sideslip changes sign. */
  tangentSpeed: number
  /** Neutral steer point, m aft of the FRONT axle. */
  neutralSteerPoint: number
  /** Static margin, as a fraction of wheelbase. Positive = stable. */
  staticMargin: number
}

export interface SpeedResponse {
  speed: number
  /** 1 + K*V^2/(g*L). */
  stabilityFactor: number
  /** Yaw rate per road-wheel steer angle, (rad/s) per rad. */
  yawGain: number
  /** Lateral acceleration per road-wheel steer angle, g per rad. */
  lateralAccelGain: number
  /** Path curvature per road-wheel steer angle, (1/m) per rad. */
  curvatureGain: number
  /** Sideslip angle per road-wheel steer angle, rad per rad. */
  sideslipGain: number
  derivatives: StabilityDerivatives
}

export interface TrimPoint {
  speed: number
  /** Road-wheel steer angle, rad. */
  steer: number
  /** Handwheel angle, rad. */
  handwheel: number
  /** Yaw rate, rad/s. */
  yawRate: number
  /** Lateral acceleration, g. */
  ay: number
  /** Sideslip angle at the CG, rad. */
  beta: number
  /** Path radius, m. */
  radius: number
  /** Front slip angle, rad. */
  alphaF: number
  /** Rear slip angle, rad. */
  alphaR: number
  /** Ackermann steer angle L/R, rad. */
  ackermann: number
}

export function stabilityDerivatives(v: BicycleVehicle, speed: number): StabilityDerivatives {
  const { a, b, cf, cr } = v
  return {
    yBeta: -(cf + cr),
    yR: -(a * cf - b * cr) / speed,
    yDelta: cf,
    nBeta: -(a * cf - b * cr),
    nR: -(a * a * cf + b * b * cr) / speed,
    nDelta: a * cf
  }
}

export function summarise(v: BicycleVehicle): SteadyStateSummary {
  const { L, wf, wr } = derive(v)
  const Df = wf / v.cf
  const Dr = wr / v.cr
  const K = Df - Dr
  const balance: Balance = Math.abs(K) < 1e-9 ? 'neutral' : K > 0 ? 'understeer' : 'oversteer'
  const xNsp = (v.cr * L) / (v.cf + v.cr)
  return {
    K,
    KDeg: K * (180 / Math.PI),
    Df,
    Dr,
    balance,
    characteristicSpeed: K > 1e-9 ? Math.sqrt((G * L) / K) : null,
    criticalSpeed: K < -1e-9 ? Math.sqrt((G * L) / -K) : null,
    tangentSpeed: Math.sqrt((v.b * L * v.cr) / (v.a * v.mass)),
    neutralSteerPoint: xNsp,
    staticMargin: (xNsp - v.a) / L
  }
}

export function stabilityFactor(v: BicycleVehicle, speed: number): number {
  const { L } = derive(v)
  const { K } = summarise(v)
  return 1 + (K * speed * speed) / (G * L)
}

export function responseAtSpeed(v: BicycleVehicle, speed: number): SpeedResponse {
  const { L } = derive(v)
  const sf = stabilityFactor(v, speed)
  const numeratorBeta = v.b / L - (v.a * v.mass * speed * speed) / (v.cr * L * L)
  return {
    speed,
    stabilityFactor: sf,
    yawGain: speed / L / sf,
    lateralAccelGain: (speed * speed) / (G * L) / sf,
    curvatureGain: 1 / L / sf,
    sideslipGain: numeratorBeta / sf,
    derivatives: stabilityDerivatives(v, speed)
  }
}

/** Steady turn produced by a given road-wheel steer angle at a given speed. */
export function trimFromSteer(v: BicycleVehicle, speed: number, steer: number): TrimPoint {
  const { L, wf, wr } = derive(v)
  const r = responseAtSpeed(v, speed)
  const yawRate = r.yawGain * steer
  const ay = r.lateralAccelGain * steer
  const beta = r.sideslipGain * steer
  const radius = Math.abs(yawRate) > 1e-12 ? speed / yawRate : Infinity
  return {
    speed,
    steer,
    handwheel: steer * v.steeringRatio,
    yawRate,
    ay,
    beta,
    radius,
    alphaF: (wf * ay) / v.cf,
    alphaR: (wr * ay) / v.cr,
    ackermann: L / radius
  }
}

/** Steer angle required to hold a given lateral acceleration on a given radius. */
export function steerRequired(v: BicycleVehicle, radius: number, ay: number): number {
  const { L } = derive(v)
  const { K } = summarise(v)
  return L / radius + K * ay
}

export interface SweepPoint {
  ay: number
  steer: number
  speed: number
  ackermann: number
}

/**
 * The constant-radius skid-pad test of Ch 11 -- sweep speed on a fixed radius
 * and plot steer angle against lateral acceleration. The slope IS the
 * understeer gradient, which is why this is the highest information-per-effort
 * test in the field.
 */
export function constantRadiusSweep(
  v: BicycleVehicle,
  radius: number,
  maxAy: number,
  n = 60
): SweepPoint[] {
  const { L } = derive(v)
  const { K } = summarise(v)
  const out: SweepPoint[] = []
  for (let i = 0; i < n; i++) {
    const ay = (maxAy * i) / (n - 1)
    out.push({
      ay,
      steer: L / radius + K * ay,
      speed: Math.sqrt(ay * G * radius),
      ackermann: L / radius
    })
  }
  return out
}

/** Gain curves against speed, for the classic Ch 5 response plots. */
export function speedSweep(v: BicycleVehicle, vMax: number, n = 120): SpeedResponse[] {
  const out: SpeedResponse[] = []
  for (let i = 1; i <= n; i++) out.push(responseAtSpeed(v, (vMax * i) / n))
  return out
}

/** Speed at which yaw gain peaks -- equals the characteristic speed for K > 0. */
export function peakYawGainSpeed(v: BicycleVehicle, vMax: number): number {
  return goldenMax((s) => responseAtSpeed(v, s).yawGain, 1, vMax).at
}

// ---------------------------------------------------------------------------
// Nonlinear extension -- Ch 5, closing section: K is not a constant.
// ---------------------------------------------------------------------------

export interface NonlinearTrim {
  ay: number
  /** Steer angle required, rad. */
  steer: number
  alphaF: number
  alphaR: number
  /** Local understeer gradient d(delta)/d(Ay), rad/g. */
  localK: number
  /** True once either axle can no longer produce the demanded force. */
  saturated: boolean
}

/**
 * Steer angle versus lateral acceleration with the linear tires replaced by
 * real nonlinear characteristics. Load transfer is deliberately NOT included --
 * that is Ch 7's pair analysis. What this isolates is the effect of tire
 * nonlinearity alone, which is enough to show K moving away from its
 * linear-range value as the car approaches the limit.
 *
 * Front and rear take separate tire models. That is not a nicety: Ch 5 §4 makes
 * the point that a rear-heavy car with larger rear tires can be neutral or
 * understeering, so forcing one tire onto both axles would misrepresent every
 * staggered-tire race car.
 */
export function nonlinearConstantRadiusSweep(
  v: BicycleVehicle,
  tireFront: TireModel,
  tireRear: TireModel,
  radius: number,
  n = 60
): NonlinearTrim[] {
  const { L, wf, wr } = derive(v)
  // Per-tire static loads; the bicycle model lumps two tires per axle.
  const fzF = wf / 2
  const fzR = wr / 2
  const maxAlpha = toRad(25)

  // Peak of each axle's characteristic. The bracket for the slip-angle solve
  // MUST stop at the peak: the Fy-alpha curve is non-monotonic, so searching
  // past it would either find the root on the falling branch -- a slip angle
  // the car cannot hold -- or fail to bracket at all.
  const peakFAt = goldenMax((al) => tireFront.fy(al, fzF), 0, maxAlpha)
  const peakRAt = goldenMax((al) => tireRear.fy(al, fzR), 0, maxAlpha)
  const ayMax = Math.min((2 * peakFAt.value) / wf, (2 * peakRAt.value) / wr)

  const solveAlpha = (
    t: TireModel,
    fzPerTire: number,
    forcePerTire: number,
    upper: number
  ): number | null => bisect((al) => t.fy(al, fzPerTire) - forcePerTire, 0, upper)

  const out: NonlinearTrim[] = []
  for (let i = 0; i <= n; i++) {
    const ay = (ayMax * 0.999 * i) / n
    const aF = solveAlpha(tireFront, fzF, (wf * ay) / 2, peakFAt.at)
    const aR = solveAlpha(tireRear, fzR, (wr * ay) / 2, peakRAt.at)
    const saturated = aF === null || aR === null
    const alphaF = aF ?? peakFAt.at
    const alphaR = aR ?? peakRAt.at
    out.push({
      ay,
      steer: L / radius + (alphaF - alphaR),
      alphaF,
      alphaR,
      localK: 0,
      saturated
    })
  }

  // Local gradient by central difference, so the curve is not biased by half a
  // step and does not inherit a one-sided spike at the ends.
  for (let i = 0; i < out.length; i++) {
    const lo = out[Math.max(i - 1, 0)]
    const hi = out[Math.min(i + 1, out.length - 1)]
    out[i].localK = hi.ay > lo.ay ? (hi.steer - lo.steer) / (hi.ay - lo.ay) : 0
  }
  return out
}

// ---------------------------------------------------------------------------
// The understeer budget -- Ch 5 §4.1
// ---------------------------------------------------------------------------

export interface BudgetLine {
  mechanism: string
  /** Front contribution to cornering compliance, deg/g. */
  front: number
  /** Rear contribution, deg/g. */
  rear: number
  /** Which chapter develops this term. */
  chapter?: string
}

export interface UndersteerBudget {
  lines: BudgetLine[]
  /** Summed front cornering compliance, deg/g. */
  Df: number
  /** Summed rear cornering compliance, deg/g. */
  Dr: number
  /** Df - Dr, deg/g. */
  K: number
}

/**
 * Sum an understeer budget. The whole point of the construction (Ch 5 §4.1) is
 * that the contributions are additive, so this really is just a column sum --
 * but having it as a first-class object is what lets the app answer "which
 * mechanism is responsible?" rather than only "does it understeer?".
 */
export function sumBudget(lines: BudgetLine[]): UndersteerBudget {
  const Df = lines.reduce((s, l) => s + l.front, 0)
  const Dr = lines.reduce((s, l) => s + l.rear, 0)
  return { lines, Df, Dr, K: Df - Dr }
}

/** The basic weight/stiffness line, which usually supplies most of the total. */
export function basicBudgetLine(v: BicycleVehicle): BudgetLine {
  const { wf, wr } = derive(v)
  const r2d = 180 / Math.PI
  return {
    mechanism: 'Weight distribution / tire cornering stiffness',
    front: (wf / v.cf) * r2d,
    rear: (wr / v.cr) * r2d,
    chapter: 'Ch 5'
  }
}

export function defaultBudget(v: BicycleVehicle): BudgetLine[] {
  return [
    basicBudgetLine(v),
    { mechanism: 'Aligning torque on the rigid body', front: 0, rear: 0, chapter: 'Ch 2' },
    { mechanism: 'Roll camber', front: 0, rear: 0, chapter: 'Ch 17' },
    { mechanism: 'Roll steer', front: 0, rear: 0, chapter: 'Ch 19' },
    { mechanism: 'Lateral force compliance steer', front: 0, rear: 0, chapter: 'Ch 23' },
    { mechanism: 'Aligning torque compliance steer', front: 0, rear: 0, chapter: 'Ch 23' }
  ]
}

// ---------------------------------------------------------------------------
// A single trim state with real tires -- what the cornering diagram draws.
// ---------------------------------------------------------------------------

export interface AxleLimits {
  /** Peak lateral force the front axle can make, N. */
  capacityFront: number
  capacityRear: number
  /** Lateral acceleration at which the front axle saturates, g. */
  limitAyFront: number
  limitAyRear: number
  /** The lower of the two -- the car's limit, g. */
  limitAy: number
  /** Which axle gives up first. */
  limitingAxle: 'front' | 'rear'
}

/**
 * Which axle runs out of grip first, and at what lateral acceleration.
 *
 * Ch 7 §3: "the axle whose curve peaks lower is the limiting axle" -- and
 * whether that is the front or the rear is whether the car pushes or spins at
 * the limit. With no load transfer in the bicycle model, each tire simply
 * carries half its axle's static load.
 */
export function axleLimits(
  v: BicycleVehicle,
  tireFront: TireModel,
  tireRear: TireModel
): AxleLimits {
  const { wf, wr } = derive(v)
  const maxAlpha = toRad(25)
  const capacityFront = 2 * goldenMax((al) => tireFront.fy(al, wf / 2), 0, maxAlpha).value
  const capacityRear = 2 * goldenMax((al) => tireRear.fy(al, wr / 2), 0, maxAlpha).value
  const limitAyFront = capacityFront / wf
  const limitAyRear = capacityRear / wr
  const front = limitAyFront <= limitAyRear
  return {
    capacityFront,
    capacityRear,
    limitAyFront,
    limitAyRear,
    limitAy: Math.min(limitAyFront, limitAyRear),
    limitingAxle: front ? 'front' : 'rear'
  }
}

export interface NonlinearState {
  /** Lateral acceleration, g. */
  ay: number
  speed: number
  /** Path radius, m. */
  radius: number
  /** Road-wheel steer angle, rad. */
  steer: number
  /** Sideslip angle at the CG, rad. */
  beta: number
  alphaF: number
  alphaR: number
  /** Lateral force demanded of each axle, N. */
  fyFront: number
  fyRear: number
  /** Fraction of each axle's grip in use, 0-1. */
  usageFront: number
  usageRear: number
  /** True once an axle cannot make the demanded force. */
  saturated: boolean
  limits: AxleLimits
}

/**
 * The car's state in a steady turn at a given speed and lateral acceleration,
 * computed with the real nonlinear tire characteristics.
 *
 * Sideslip comes out of the geometry rather than a gain, which keeps it exact
 * for any tire law: the rear axle's velocity direction is -alpha_r, and it sits
 * b behind the CG on a path of radius R, so
 *
 *   beta = b/R - alpha_r
 */
export function nonlinearTrim(
  v: BicycleVehicle,
  tireFront: TireModel,
  tireRear: TireModel,
  speed: number,
  ay: number
): NonlinearState {
  const { L, wf, wr } = derive(v)
  const limits = axleLimits(v, tireFront, tireRear)

  const fyFront = wf * ay
  const fyRear = wr * ay
  const radius = ay > 1e-6 ? (speed * speed) / (G * ay) : Infinity

  const solve = (t: TireModel, fz: number, need: number, peakAt: number): number | null =>
    bisect((al) => t.fy(al, fz) - need, 0, peakAt)

  const peakFAt = goldenMax((al) => tireFront.fy(al, wf / 2), 0, toRad(25)).at
  const peakRAt = goldenMax((al) => tireRear.fy(al, wr / 2), 0, toRad(25)).at

  const aF = solve(tireFront, wf / 2, fyFront / 2, peakFAt)
  const aR = solve(tireRear, wr / 2, fyRear / 2, peakRAt)
  const alphaF = aF ?? peakFAt
  const alphaR = aR ?? peakRAt

  return {
    ay,
    speed,
    radius,
    steer: (radius === Infinity ? 0 : L / radius) + (alphaF - alphaR),
    beta: (radius === Infinity ? 0 : v.b / radius) - alphaR,
    alphaF,
    alphaR,
    fyFront,
    fyRear,
    usageFront: limits.capacityFront > 0 ? fyFront / limits.capacityFront : 0,
    usageRear: limits.capacityRear > 0 ? fyRear / limits.capacityRear : 0,
    saturated: aF === null || aR === null,
    limits
  }
}

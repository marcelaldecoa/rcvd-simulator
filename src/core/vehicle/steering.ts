/**
 * Steering systems -- Ch 19.
 *
 * The chapter's throughline is that the steering wheel is an INSTRUMENT before
 * it is a control. What reaches the driver's hands is
 *
 *     M = F_y (t_p + t_m)  +  F_z (KPI and caster jacking)  +  F_x (scrub)  +  friction
 *
 * and only the first term carries information about what the front tyres are
 * doing. Every design decision in the chapter is about making that term
 * dominate -- which is why more caster, which is good for camber, is bad for
 * feel, and why the chapter refuses to give a universal answer.
 *
 * The three quantitative threads:
 *   - Ackermann: how the two front wheels' steer angles differ, and why race
 *     cars usually want the opposite of the textbook answer (§3, Ex 19.6).
 *   - Trail: mechanical from caster, pneumatic from the tyre, and the ratio
 *     between them decides whether the limit is announced (Ex 19.2, 19.3).
 *   - Compliance: steer angle lost between the wheel and the road (Ex 19.4).
 */

const R2D = 180 / Math.PI

// ---------------------------------------------------------------------------
// Ackermann -- Ch 19 §3
// ---------------------------------------------------------------------------

/**
 * The inside wheel angle for 100% Ackermann -- Ex 19.1.
 *
 *     cot(delta_o) - cot(delta_i) = t / L
 *
 * Note how little difference it makes at racing steer angles and how much at
 * parking ones: 0.39 deg at 6 deg of outside steer, 4.8 deg at 20 deg. That
 * asymmetry is itself the argument for choosing the geometry to suit the fast
 * corners.
 */
export function ackermannInnerAngle(outerDeg: number, track: number, wheelbase: number): number {
  if (outerDeg <= 0) return outerDeg
  const cotOuter = 1 / Math.tan(outerDeg / R2D)
  const cotInner = cotOuter - track / wheelbase
  if (cotInner <= 0) return 90
  return Math.atan(1 / cotInner) * R2D
}

/**
 * Ackermann percentage of an actual pair of steer angles.
 *
 * 100% is the geometric ideal, 0% is parallel steer, negative is
 * anti-Ackermann -- the outside wheel steered MORE than the inside, which is
 * what a high-downforce car wants (Ex 19.6).
 */
export function ackermannPercent(
  outerDeg: number,
  innerDeg: number,
  track: number,
  wheelbase: number
): number {
  const ideal = ackermannInnerAngle(outerDeg, track, wheelbase)
  const idealDifference = ideal - outerDeg
  if (Math.abs(idealDifference) < 1e-12) return 0
  return ((innerDeg - outerDeg) / idealDifference) * 100
}

/** The inside-wheel angle a chosen Ackermann percentage produces. */
export function innerAngleAtAckermann(
  outerDeg: number,
  percent: number,
  track: number,
  wheelbase: number
): number {
  const ideal = ackermannInnerAngle(outerDeg, track, wheelbase)
  return outerDeg + (percent / 100) * (ideal - outerDeg)
}

export interface AckermannPoint {
  outer: number
  /** 100% Ackermann inside angle. */
  ideal: number
  /** Inside angle at the chosen percentage. */
  actual: number
  /** Difference from parallel steer, deg. */
  difference: number
}

export function ackermannSweep(
  percent: number,
  track: number,
  wheelbase: number,
  maxOuter = 24,
  samples = 41
): AckermannPoint[] {
  return Array.from({ length: samples }, (_, i) => {
    const outer = (maxOuter * i) / (samples - 1)
    const ideal = ackermannInnerAngle(outer, track, wheelbase)
    const actual = innerAngleAtAckermann(outer, percent, track, wheelbase)
    return { outer, ideal, actual, difference: actual - outer }
  })
}

// ---------------------------------------------------------------------------
// Trail and steering torque -- Ch 19 §2 and §7
// ---------------------------------------------------------------------------

/** Mechanical trail from caster -- Ex 19.2. t_m = r tan(tau). */
export function mechanicalTrail(rollingRadius: number, casterDeg: number): number {
  return rollingRadius * Math.tan(casterDeg / R2D)
}

/** The caster angle a wanted mechanical trail implies. */
export function casterForTrail(rollingRadius: number, trail: number): number {
  if (rollingRadius <= 0) return 0
  return Math.atan(trail / rollingRadius) * R2D
}

export interface FeedbackQuality {
  mechanicalTrail: number
  /** Total trail at a moderate slip angle, m. */
  trailLinear: number
  /** Total trail at the lateral force peak, m. */
  trailAtPeak: number
  /** How much of the total trail survives to the peak. */
  trailRetained: number
  /** Steering torque at the moderate condition and at the peak, N.m. */
  torqueLinear: number
  torqueAtPeak: number
  /** Torque rise between them, as a fraction. */
  torqueRise: number
  /** Force rise over the same range, for comparison. */
  forceRise: number
  /**
   * The fraction of total trail that is the COLLAPSING part.
   *
   * Mechanical trail is a constant, so the absolute drop in total trail between
   * moderate slip and the peak is exactly the pneumatic drop -- caster changes
   * nothing about it. What caster changes is the drop RELATIVE to the total,
   * which is what the driver perceives. That ratio works out to t_p/(t_p + t_m)
   * regardless of the shape of the trail curve, and it stays well defined even
   * where pneumatic trail goes negative past its zero crossing, which real
   * tyres and this model both do.
   *
   * 1 means the tyre's signal arrives undiluted; 0 means caster has buried it.
   */
  signalClarity: number
}

/**
 * The Ex 19.2 / 19.3 analysis: does the driver get told the front is at the limit?
 *
 * Pneumatic trail collapses as the contact patch slides, and that collapse is
 * the front-limit warning. Mechanical trail from caster does not collapse, so
 * it DILUTES the signal. The chapter's design rule falls straight out of the
 * arithmetic: keep t_m comparable to or smaller than t_p at moderate slip.
 */
export function feedbackQuality(opts: {
  rollingRadius: number
  casterDeg: number
  /** Pneumatic trail at a moderate slip angle, m. */
  pneumaticTrailLinear: number
  /** Pneumatic trail at the lateral force peak, m. */
  pneumaticTrailAtPeak: number
  /** Lateral force at the moderate condition, as a fraction of peak. */
  forceFractionLinear?: number
  /** Peak lateral force, N. */
  peakForce?: number
}): FeedbackQuality {
  const tm = mechanicalTrail(opts.rollingRadius, opts.casterDeg)
  const fLin = opts.forceFractionLinear ?? 0.55
  const peak = opts.peakForce ?? 1

  const trailLinear = opts.pneumaticTrailLinear + tm
  const trailAtPeak = opts.pneumaticTrailAtPeak + tm
  const torqueLinear = fLin * peak * trailLinear
  const torqueAtPeak = peak * trailAtPeak

  return {
    mechanicalTrail: tm,
    trailLinear,
    trailAtPeak,
    trailRetained: trailLinear !== 0 ? trailAtPeak / trailLinear : 0,
    torqueLinear,
    torqueAtPeak,
    torqueRise: torqueLinear !== 0 ? torqueAtPeak / torqueLinear - 1 : 0,
    forceRise: 1 / fLin - 1,
    signalClarity: trailLinear !== 0 ? opts.pneumaticTrailLinear / trailLinear : 0
  }
}

/** Steering torque at the road wheel, N.m -- the informative term only. */
export function steeringTorque(lateralForce: number, totalTrail: number): number {
  return lateralForce * totalTrail
}

/** The same at the steering wheel, through the ratio and the gear's efficiency. */
export function handwheelTorque(roadWheelTorque: number, ratio: number, efficiency = 1): number {
  return ratio > 0 ? (roadWheelTorque / ratio) * efficiency : 0
}

// ---------------------------------------------------------------------------
// Compliance -- Ch 19 §4 and Ex 19.4
// ---------------------------------------------------------------------------

export interface LostSteer {
  /** Aligning moment about the steering axes, N.m. */
  moment: number
  /** Steering wheel rotation absorbed by compliance, deg. */
  handwheelLost: number
  /** Road wheel steer lost, deg. */
  roadWheelLost: number
  /** Apparent understeer gradient this adds, deg/g. */
  apparentUndersteer: number
}

/**
 * Steer angle lost to steering system compliance -- Ex 19.4.
 *
 * The measurement trap the chapter and Ch 11 both warn about: an understeer
 * gradient computed from handwheel angle without correcting for this is
 * systematically too high, and worse, the error GROWS with lateral acceleration
 * -- so it corrupts the shape of K(Ay), not just its value.
 */
export function lostSteerFromCompliance(opts: {
  /** Axle lateral force, N. */
  axleLateralForce: number
  /** Total trail, m. */
  totalTrail: number
  /** Handwheel degrees per 100 N.m of rack-referred torque. */
  degPer100Nm: number
  /** Steering ratio, handwheel per road wheel. */
  ratio: number
  /** Lateral acceleration this condition represents, g. */
  ay: number
}): LostSteer {
  const moment = opts.axleLateralForce * opts.totalTrail
  const handwheelLost = opts.degPer100Nm * (moment / 100)
  const roadWheelLost = opts.ratio > 0 ? handwheelLost / opts.ratio : 0
  return {
    moment,
    handwheelLost,
    roadWheelLost,
    apparentUndersteer: opts.ay > 0 ? roadWheelLost / opts.ay : 0
  }
}

/**
 * The compliance coefficient the understeer budget wants, deg per kN.m.
 *
 * The bridge from Ch 19's measurement into Ch 5 §4.1's table, and the reason
 * `AxleCompliance.aligningComplianceSteer` is in those units at all.
 */
export function aligningComplianceCoefficient(degPer100Nm: number, ratio: number): number {
  return ratio > 0 ? (degPer100Nm / 100 / ratio) * 1000 : 0
}

// ---------------------------------------------------------------------------
// Bump steer -- Ch 19 §5 and Ex 19.5
// ---------------------------------------------------------------------------

export interface BumpSteerResult {
  /** Toe change per wheel, deg. */
  perWheel: number
  /** Total front toe change, deg. */
  total: number
}

/**
 * Toe change from a ride height change -- Ex 19.5.
 *
 * The chapter's real point is in the framing rather than the arithmetic: on a
 * low-downforce car bump steer is an occasional transient over kerbs, but on a
 * downforce car ride height is a function of SPEED, so the same curve becomes a
 * continuous speed-dependent alignment change. The car steers itself down the
 * straight.
 */
export function bumpSteerToe(bumpMm: number, degPer10mm: number): BumpSteerResult {
  const perWheel = (bumpMm / 10) * degPer10mm
  return { perWheel, total: 2 * perWheel }
}

/** Ride height change from downforce between two speeds, mm. */
export function rideHeightChange(
  clA: number,
  rho: number,
  speedLow: number,
  speedHigh: number,
  wheelRateNmmPerAxle: number
): number {
  if (wheelRateNmmPerAxle <= 0) return 0
  const q = (v: number): number => 0.5 * rho * v * v * clA
  return (q(speedHigh) - q(speedLow)) / wheelRateNmmPerAxle
}

// ---------------------------------------------------------------------------
// Scrub radius -- Ch 19 §2 and Ex 19.7
// ---------------------------------------------------------------------------

export interface SplitFrictionPull {
  /** Moment about each steering axis, N.m. */
  momentHigh: number
  momentLow: number
  /** Net disturbance at the road wheels, N.m. */
  net: number
  /** The same felt at the steering wheel, N.m. */
  atHandwheel: number
}

/**
 * The steering disturbance from asymmetric braking -- Ex 19.7.
 *
 * With positive scrub radius each wheel's braking force tries to toe that wheel
 * OUT, so the two moments oppose and only the difference reaches the driver.
 * This is the scenario that motivates negative scrub radius on road cars, where
 * the geometry self-corrects a split-friction stop; race cars keep small
 * positive scrub instead, because negative scrub also removes the driver's cue
 * for the onset of front lockup.
 */
export function splitFrictionPull(
  forceHigh: number,
  forceLow: number,
  scrubRadius: number,
  ratio: number
): SplitFrictionPull {
  const momentHigh = forceHigh * scrubRadius
  const momentLow = forceLow * scrubRadius
  const net = momentHigh - momentLow
  return { momentHigh, momentLow, net, atHandwheel: ratio > 0 ? net / ratio : 0 }
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface SteeringParams {
  /** Overall ratio, handwheel deg per road wheel deg. */
  ratio: number
  /** Caster angle, deg. */
  caster: number
  /** Kingpin inclination, deg. */
  kpi: number
  /** Scrub radius, m. Positive = steering axis inboard of the tyre centreline. */
  scrubRadius: number
  /** Rolling radius, m. */
  rollingRadius: number
  /** Ackermann percentage. Negative is anti-Ackermann. */
  ackermann: number
  /** Handwheel degrees per 100 N.m of rack-referred torque. */
  compliancePer100Nm: number
  /** Bump steer, deg of toe per 10 mm of wheel travel. Positive = toe-out. */
  bumpSteerPer10mm: number
}

/** A formula car: quick rack, moderate caster, near-parallel steer. */
export const FORMULA_STEERING: SteeringParams = {
  ratio: 11,
  caster: 6,
  kpi: 7,
  scrubRadius: 0.012,
  rollingRadius: 0.33,
  ackermann: -15,
  compliancePer100Nm: 0.35,
  bumpSteerPer10mm: 0.015
}

/** A road car: slower rack, more KPI, softer everything. */
export const ROAD_STEERING: SteeringParams = {
  ratio: 16,
  caster: 4.5,
  kpi: 12,
  scrubRadius: -0.008,
  rollingRadius: 0.31,
  ackermann: 85,
  compliancePer100Nm: 0.9,
  bumpSteerPer10mm: 0.04
}

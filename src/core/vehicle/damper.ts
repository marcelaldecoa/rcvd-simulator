/**
 * Dampers -- Ch 22.
 *
 * The least understood and most over-adjusted component on a race car, and the
 * chapter is honest about why: springs and bars have effects computable in
 * closed form, while a damper's effect depends on VELOCITY, which depends on
 * the road, the driver and the car's own motion. So a damper change alters
 * behaviour in some conditions and not others.
 *
 * The chapter's own position, stated plainly and worth repeating here because
 * this module could easily be mistaken for more than it is: damper settings are
 * found EMPIRICALLY, guided by theory, not derived from it. What theory
 * supplies is four things, and this module supplies those four:
 *
 *   1. Damping as a modal property -- what zeta does to body motion.
 *   2. The separation of low-speed (body) from high-speed (wheel) damping,
 *      which exists because the two masses have modes an octave-and-a-half
 *      apart.
 *   3. Dampers as the TRANSIENT balance tool. At steady state a damper makes
 *      no force at all, so it cannot move steady-state balance -- and using one
 *      to try is the chapter's nominated most common setup error.
 *   4. Contact patch load variation as the real objective function, which
 *      follows from tyre load sensitivity by exactly the Jensen argument that
 *      made lateral load transfer costly in Ch 2 -- applied in time rather than
 *      across a track.
 */

import { seriesRate } from './rates.js'

const R2D = 180 / Math.PI

// ---------------------------------------------------------------------------
// The single-degree-of-freedom baseline -- Ch 22 §3.1
// ---------------------------------------------------------------------------

/** Critical damping at the wheel, N.s/m. c_crit = 2*sqrt(k m). */
export function criticalDamping(rideRateNm: number, sprungCornerMass: number): number {
  if (rideRateNm <= 0 || sprungCornerMass <= 0) return 0
  return 2 * Math.sqrt(rideRateNm * sprungCornerMass)
}

/** Damping ratio from a wheel-referred coefficient. */
export function dampingRatio(
  wheelDamping: number,
  rideRateNm: number,
  sprungCornerMass: number
): number {
  const crit = criticalDamping(rideRateNm, sprungCornerMass)
  return crit > 0 ? wheelDamping / crit : 0
}

/** The wheel-referred coefficient a target damping ratio needs. */
export function wheelDampingForZeta(
  zeta: number,
  rideRateNm: number,
  sprungCornerMass: number
): number {
  return zeta * criticalDamping(rideRateNm, sprungCornerMass)
}

/** Ch 22 §3.1's own description of what a damping ratio feels like. */
export function describeZeta(zeta: number): string {
  if (zeta < 0.3) return 'oscillatory — the car floats and wallows'
  if (zeta < 0.5) return 'good ride isolation, some overshoot'
  if (zeta < 0.6) return 'between ride and control'
  if (zeta <= 0.8) return 'the typical race compromise — quick settling, little overshoot'
  if (zeta <= 1.05) return 'critically damped — no overshoot, slowest non-oscillatory settling'
  return 'overdamped — the suspension cannot follow the road; the car rides on its tyres'
}

// ---------------------------------------------------------------------------
// Referring a damper to the wheel -- Ch 22 §3.2
// ---------------------------------------------------------------------------

/**
 * Damper rate to wheel rate: SQUARED, exactly as with a spring.
 *
 * But the velocity transforms LINEARLY, which is the trap. A dyno plot is in
 * damper velocity; the car experiences wheel velocity. With IR = 0.6, 100 mm/s
 * at the wheel is only 60 mm/s at the damper -- so the part of the damper curve
 * that matters for body control on this car is not the part that matters on a
 * car with IR = 0.9. Ch 22 §3.2 is emphatic: convert to wheel-referred force
 * against wheel velocity before comparing anything with anything.
 */
export function wheelFromDamperRate(damperRate: number, installationRatio: number): number {
  return damperRate * installationRatio * installationRatio
}

export function damperFromWheelRate(wheelRate: number, installationRatio: number): number {
  const ir2 = installationRatio * installationRatio
  return ir2 > 0 ? wheelRate / ir2 : 0
}

/** Wheel velocity to damper velocity -- linear, not squared. */
export function damperVelocity(wheelVelocity: number, installationRatio: number): number {
  return wheelVelocity * installationRatio
}

export function wheelVelocityFromDamper(
  damperVel: number,
  installationRatio: number
): number {
  return installationRatio > 0 ? damperVel / installationRatio : 0
}

export interface DynoPoint {
  /** As the dyno sheet reads it. */
  damperForce: number
  damperVelocity: number
  /** As the car experiences it. */
  wheelForce: number
  wheelVelocity: number
  /** Equivalent wheel-referred coefficient, N.s/m. */
  wheelDamping: number
}

/**
 * Translate one point off a dyno sheet -- Ex 22.4.
 *
 * The exercise's practical point: "900 N at 50 mm/s" tells you almost nothing
 * until you know the installation ratio. On a car with IR = 0.62 it means 558 N
 * at 80.6 mm/s of wheel velocity; on one with IR = 0.85 the same damper gives
 * 765 N at 58.8 mm/s -- a completely different point on the car's operating map.
 */
export function readDyno(
  damperForce: number,
  damperVel: number,
  installationRatio: number
): DynoPoint {
  const wheelForce = damperForce * installationRatio
  const wheelVel = wheelVelocityFromDamper(damperVel, installationRatio)
  return {
    damperForce,
    damperVelocity: damperVel,
    wheelForce,
    wheelVelocity: wheelVel,
    wheelDamping: wheelVel !== 0 ? wheelForce / wheelVel : 0
  }
}

// ---------------------------------------------------------------------------
// The two masses -- Ch 22 §3.3
// ---------------------------------------------------------------------------

/** Body mode frequency, Hz -- the same ride frequency Ch 16 computes. */
export function bodyFrequency(rideRateNm: number, sprungCornerMass: number): number {
  if (sprungCornerMass <= 0) return 0
  return Math.sqrt(rideRateNm / sprungCornerMass) / (2 * Math.PI)
}

/**
 * Wheel hop frequency, Hz -- the wheel bouncing on the tyre spring.
 *
 *     f_hop = sqrt((K_T + K_w) / m_u) / 2pi
 *
 * Note it is the SUM, not the series combination: in wheel hop the tyre and the
 * suspension both push on the unsprung mass, so their rates add.
 */
export function wheelHopFrequency(
  tireRateNm: number,
  wheelRateNm: number,
  unsprungMass: number
): number {
  if (unsprungMass <= 0) return 0
  return Math.sqrt((tireRateNm + wheelRateNm) / unsprungMass) / (2 * Math.PI)
}

export interface ModeSeparation {
  bodyHz: number
  hopHz: number
  ratio: number
  /** True while the two modes are far enough apart to tune independently. */
  separable: boolean
}

/**
 * How far apart the two modes sit -- the fact that makes low-speed and
 * high-speed damper tuning separate adjustments at all.
 *
 * Ex 22.3's car has 2.91 Hz against 15.6 Hz, a ratio of 5.4. A high-downforce
 * car at 6 Hz body frequency with the same wheel has a ratio of only 2.6, the
 * modes begin to interact, and damper tuning gets correspondingly harder.
 */
export function modeSeparation(
  rideRateNm: number,
  sprungCornerMass: number,
  tireRateNm: number,
  wheelRateNm: number,
  unsprungMass: number
): ModeSeparation {
  const bodyHz = bodyFrequency(rideRateNm, sprungCornerMass)
  const hopHz = wheelHopFrequency(tireRateNm, wheelRateNm, unsprungMass)
  const ratio = bodyHz > 0 ? hopHz / bodyHz : 0
  return { bodyHz, hopHz, ratio, separable: ratio >= 3.5 }
}

// ---------------------------------------------------------------------------
// The force-velocity curve -- Ch 22 §3.4
// ---------------------------------------------------------------------------

export type CurveShape = 'linear' | 'digressive' | 'progressive'

export interface DamperCurve {
  /** Low-speed coefficient, N.s/m, wheel-referred. */
  lowSpeedBump: number
  lowSpeedRebound: number
  /** High-speed coefficient above the knee, N.s/m. */
  highSpeedBump: number
  highSpeedRebound: number
  /** Wheel velocity at which the curve changes slope, m/s. */
  kneeVelocity: number
  /** Force above which a blow-off valve caps the curve, N. 0 = none. */
  blowOffForce?: number
}

/**
 * Damper force at a wheel velocity, wheel-referred, N.
 *
 * Positive velocity is bump (compression). The bilinear form is the common
 * DIGRESSIVE race shape: steep below the knee for body control, flatter above
 * it so a kerb does not spike the contact patch. A blow-off caps it entirely,
 * which is what protects the tyre from the sharpest inputs.
 */
export function damperForce(curve: DamperCurve, wheelVelocity: number): number {
  const bump = wheelVelocity >= 0
  const v = Math.abs(wheelVelocity)
  const low = bump ? curve.lowSpeedBump : curve.lowSpeedRebound
  const high = bump ? curve.highSpeedBump : curve.highSpeedRebound
  const knee = curve.kneeVelocity

  let f = v <= knee ? low * v : low * knee + high * (v - knee)
  if (curve.blowOffForce && curve.blowOffForce > 0) f = Math.min(f, curve.blowOffForce)
  return bump ? f : -f
}

/** The force-velocity curve, for plotting. */
export function forceVelocityCurve(
  curve: DamperCurve,
  maxVelocity = 0.5,
  samples = 81
): { velocity: number; force: number }[] {
  return Array.from({ length: samples }, (_, i) => {
    const velocity = -maxVelocity + (2 * maxVelocity * i) / (samples - 1)
    return { velocity, force: damperForce(curve, velocity) }
  })
}

/**
 * Rebound-to-bump ratio at a given velocity.
 *
 * Ch 22 §3.4: almost all dampers run 2:1 to 4:1 more rebound than bump, because
 * bump force lifts the sprung mass and adds to the load the tyre sees, while
 * rebound force controls the release of stored spring energy. Too much and you
 * get jacking down.
 */
export function reboundRatio(curve: DamperCurve, wheelVelocity = 0.05): number {
  const bump = damperForce(curve, Math.abs(wheelVelocity))
  const rebound = Math.abs(damperForce(curve, -Math.abs(wheelVelocity)))
  return bump > 0 ? rebound / bump : 0
}

/** Which curve shape a set of coefficients describes. */
export function curveShape(curve: DamperCurve): CurveShape {
  const r = curve.lowSpeedBump > 0 ? curve.highSpeedBump / curve.lowSpeedBump : 1
  if (r < 0.85) return 'digressive'
  if (r > 1.15) return 'progressive'
  return 'linear'
}

// ---------------------------------------------------------------------------
// Transient balance -- Ch 22 §4.1
// ---------------------------------------------------------------------------

export interface TransientBalance {
  /** TLLTD with the dampers doing nothing -- springs and bars alone. */
  steadyState: number
  /** TLLTD during the roll transient. */
  transient: number
  /** Bias points the dampers move it by. */
  shift: number
  /** Roll velocity used, rad/s. */
  rollVelocity: number
  frontMoment: number
  rearMoment: number
}

/**
 * Transient TLLTD -- Ch 22 §4.1 and Ex 22.5.
 *
 * At steady state a damper makes zero force, so it cannot move steady-state
 * balance. During roll ONSET the roll velocity is non-zero and the dampers add
 * to each axle's roll resistance, so the transient distribution is
 *
 *     TLLTD_transient = (K_f phi + c_f phidot) / ((K_f + K_r) phi + (c_f + c_r) phidot)
 *
 * Stiffer front low-speed damping therefore moves transient TLLTD forward and
 * produces understeer ON TURN-IN ONLY.
 *
 * The diagnostic rule that follows is the chapter's most useful single
 * sentence: if a complaint exists only during the transient and disappears once
 * the car is settled, it is a damper problem. If it persists at steady state it
 * is a spring, bar, geometry or aero problem -- and using dampers to fix one of
 * those is the most common setup error there is.
 */
export function transientTlltd(opts: {
  rollStiffnessFront: number
  rollStiffnessRear: number
  /** Roll damping at each axle, N.m.s/rad. */
  rollDampingFront: number
  rollDampingRear: number
  /** Roll angle reached, deg. */
  rollAngle: number
  /** Time taken to reach it, s. */
  rollTime: number
  /**
   * Where in the transient to evaluate, as a fraction of the final roll angle.
   * The exercise takes the peak-velocity point at roughly mid-transient.
   */
  atFraction?: number
}): TransientBalance {
  const fraction = opts.atFraction ?? 0.5
  const rollVelocity = opts.rollTime > 0 ? opts.rollAngle / opts.rollTime / R2D : 0
  const phi = (opts.rollAngle * fraction) / R2D

  const frontMoment = opts.rollStiffnessFront * phi + opts.rollDampingFront * rollVelocity
  const rearMoment = opts.rollStiffnessRear * phi + opts.rollDampingRear * rollVelocity
  const total = frontMoment + rearMoment

  const steadyState =
    opts.rollStiffnessFront + opts.rollStiffnessRear > 0
      ? opts.rollStiffnessFront / (opts.rollStiffnessFront + opts.rollStiffnessRear)
      : 0.5
  const transient = total > 0 ? frontMoment / total : steadyState

  return {
    steadyState,
    transient,
    shift: transient - steadyState,
    rollVelocity,
    frontMoment,
    rearMoment
  }
}

/** Roll damping at an axle from its wheel-referred damper rate and track. */
export function axleRollDamping(wheelDamping: number, track: number): number {
  return (wheelDamping * track * track) / 2
}

// ---------------------------------------------------------------------------
// Contact patch load variation -- Ch 22 §3.5 and Ex 22.7
// ---------------------------------------------------------------------------

export interface LoadVariationLoss {
  steadyForce: number
  meanOscillatingForce: number
  /** Newtons of lateral force lost to the oscillation. */
  loss: number
  lossFraction: number
}

/**
 * What load variation costs, for a concave Fy(Fz) -- Ex 22.7.
 *
 * With Fy = a*Fz - b*Fz^2, a load swinging +/-D about a mean produces an
 * average lateral force lower than the steady value by EXACTLY b*D^2. The same
 * quadratic relation as lateral load transfer in Ch 2 Ex 2.6, now applied in
 * TIME rather than across a track -- and it is the analytical justification for
 * treating RMS contact patch load variation as the damper's objective function.
 *
 * Two consequences the exercise draws out. The penalty scales with the SQUARE
 * of the fluctuation, so suppressing the worst excursions matters far more than
 * trimming the rest. And it applies to every source of load variation, not just
 * road bumps: wheel hop, body oscillation, aerodynamic fluctuation, driveline
 * torque.
 */
export function loadVariationLoss(
  a: number,
  b: number,
  meanFz: number,
  amplitude: number
): LoadVariationLoss {
  const fy = (fz: number): number => a * fz - b * fz * fz
  const steadyForce = fy(meanFz)
  const meanOscillatingForce = (fy(meanFz - amplitude) + fy(meanFz + amplitude)) / 2
  const loss = steadyForce - meanOscillatingForce
  return {
    steadyForce,
    meanOscillatingForce,
    loss,
    lossFraction: steadyForce > 0 ? loss / steadyForce : 0
  }
}

/** The closed form the exercise notes: the loss is exactly b times the amplitude squared. */
export function loadVariationLossClosedForm(b: number, amplitude: number): number {
  return b * amplitude * amplitude
}

// ---------------------------------------------------------------------------
// Jacking down -- Ch 22 §3.4 and Ex 22.6
// ---------------------------------------------------------------------------

export interface JackingRisk {
  /** Rebound time constant, s. */
  timeConstant: number
  /** Time between bumps at this frequency, s. */
  bumpInterval: number
  ratio: number
  atRisk: boolean
}

/**
 * Whether rebound damping is slow enough to ratchet the car down -- Ex 22.6.
 *
 * A wheel hits a bump, compresses, and the spring pushes it back down against
 * the rebound damper. If the next bump arrives before the wheel has fully
 * re-extended, the next compression starts from a partially compressed
 * position. Over a series of bumps the average position migrates toward bump
 * and the body sits progressively lower.
 *
 *     c_rebound / K_R  >~  1 / f_bump
 *
 * On a road car this costs travel and rides harshly, and is bounded. On a
 * high-downforce car it is the most dangerous failure mode in the book: the
 * aero map is steep near the ground, the loss is front-biased and therefore a
 * balance event, and there is no travel in reserve to absorb the migration.
 */
export function jackingRisk(
  reboundDamping: number,
  rideRateNm: number,
  bumpFrequency: number
): JackingRisk {
  const timeConstant = rideRateNm > 0 ? reboundDamping / rideRateNm : Infinity
  const bumpInterval = bumpFrequency > 0 ? 1 / bumpFrequency : Infinity
  const ratio = bumpInterval > 0 ? timeConstant / bumpInterval : Infinity
  return { timeConstant, bumpInterval, ratio, atRisk: ratio >= 1 }
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * A digressive race damper: firm below the knee, flatter above it.
 *
 * The blow-off is set to engage inside the velocity range a wheel actually
 * sees. At these coefficients the curve reaches 700 N at about 0.41 m/s of
 * wheel velocity, which is a kerb strike; a cap set at, say, 3000 N would need
 * 2 m/s to engage and would therefore never do anything, which is a good way to
 * ship a damper model with a decorative parameter in it.
 */
export const RACE_DAMPER: DamperCurve = {
  lowSpeedBump: 4000,
  lowSpeedRebound: 9000,
  highSpeedBump: 1400,
  highSpeedRebound: 2600,
  kneeVelocity: 0.05,
  blowOffForce: 700
}

/** Linear valving, for comparison -- simple and rarely optimal. */
export const LINEAR_DAMPER: DamperCurve = {
  lowSpeedBump: 3000,
  lowSpeedRebound: 6000,
  highSpeedBump: 3000,
  highSpeedRebound: 6000,
  kneeVelocity: 0.05
}

/** Too much rebound: good body control, and it will jack the car down. */
export const OVER_REBOUND_DAMPER: DamperCurve = {
  lowSpeedBump: 4000,
  lowSpeedRebound: 22000,
  highSpeedBump: 1400,
  highSpeedRebound: 14000,
  kneeVelocity: 0.05
}

/** Series rate, re-exported so a damper module can build a ride rate. */
export { seriesRate }

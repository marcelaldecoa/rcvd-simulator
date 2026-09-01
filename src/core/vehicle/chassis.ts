/**
 * Wheel loads -- Ch 18.
 *
 * "The pivotal chapter of Part II." Total lateral load transfer is fixed by
 * statics; what the engineer controls is its DISTRIBUTION between the axles,
 * and that distribution is the master balance parameter of Ch 7.
 *
 * The three-mass decomposition of Ch 18 §5, at the front axle:
 *
 *   dFzf = (Ay/tf) * [ Wsf*hRCf                    geometric, through the links
 *                    + Kf/(Kf+Kr) * Ws*H           elastic, through springs and bars
 *                    + Wuf*huf ]                   unsprung, at the wheel centre
 *
 * and similarly at the rear. Ch 18 §5 recommends checking that the parts sum
 * to the static total. The exact form of that check is on MOMENTS, not forces:
 * each axle's transfer acts across its own track, so
 *
 *   dFzf*tf + dFzr*tr = W*Ay*h
 *
 * holds for any pair of tracks, while the book's dFzf + dFzr = W*Ay*h/t is the
 * equal-track special case (which Exercise 18.3 sets up). Both are provided.
 *
 * Two simplifications are inherited from the notes and flagged there:
 *   - H is taken as the VERTICAL distance from the sprung CG to the neutral
 *     roll axis, not the strictly correct perpendicular distance. The two
 *     coincide for a level roll axis; the approximation is slightly
 *     conservative otherwise.
 *   - The gravity term Ms = -Ws*h2*(Ay - phi) is neglected in the transfer
 *     expressions, as the book does for small roll angles. It IS carried in
 *     the roll gradient below, so the difference stays visible rather than
 *     buried.
 *
 * Roll stiffness is split into springs and anti-roll bar because the bar is
 * the thing a race engineer actually turns, and Ch 7 §4 makes it the canonical
 * orthogonal balance tool.
 */

import { G } from '../util/numeric.js'
import { derive, type BicycleVehicle } from './params.js'

export interface ChassisParams {
  /** Front track width, m. */
  trackFront: number
  /** Rear track width, m. */
  trackRear: number
  /** Total vehicle CG height, m. */
  cgHeight: number
  /** Front axle unsprung mass (both wheels), kg. */
  unsprungMassFront: number
  /** Rear axle unsprung mass (both wheels), kg. */
  unsprungMassRear: number
  /** Front unsprung CG height, m -- approximately the wheel centre. */
  unsprungCgHeightFront: number
  /** Rear unsprung CG height, m. */
  unsprungCgHeightRear: number
  /** Front roll centre height above ground, m. */
  rollCentreHeightFront: number
  /** Rear roll centre height, m. */
  rollCentreHeightRear: number
  /** Front roll stiffness from the springs alone, N.m/rad. */
  springRollStiffnessFront: number
  springRollStiffnessRear: number
  /** Front anti-roll bar contribution to roll stiffness, N.m/rad. */
  barRollStiffnessFront: number
  barRollStiffnessRear: number
}

export interface DerivedChassis {
  sprungMass: number
  /** Sprung weight, N. */
  sprungWeight: number
  /** Sprung CG height, m. */
  sprungCgHeight: number
  /** Static sprung weight on the front axle, N. */
  sprungWeightFront: number
  sprungWeightRear: number
  /** Neutral roll axis height at the sprung CG station, m. */
  rollAxisHeightAtCg: number
  /** Roll moment arm H, m (vertical approximation). */
  rollMomentArm: number
  /** Total front roll stiffness, springs plus bar, N.m/rad. */
  rollStiffnessFront: number
  rollStiffnessRear: number
  rollStiffnessTotal: number
  /** Fraction of roll stiffness at the front. */
  rollStiffnessFractionFront: number
  /** Roll gradient, rad/g, including the destabilising -Ws*H term. */
  rollGradient: number
  /** Roll gradient, deg/g -- the number a race engineer quotes. */
  rollGradientDeg: number
  /** Average track, m. */
  trackAverage: number
}

export function deriveChassis(v: BicycleVehicle, c: ChassisParams): DerivedChassis {
  const { wf, wr } = derive(v)
  const sprungMass = v.mass - c.unsprungMassFront - c.unsprungMassRear
  const sprungWeight = sprungMass * G
  const wuf = c.unsprungMassFront * G
  const wur = c.unsprungMassRear * G

  // The unsprung masses sit at the axles, so the sprung share of each axle
  // load is simply what is left after removing them.
  const sprungWeightFront = wf - wuf
  const sprungWeightRear = wr - wur

  // m*h = ms*hs + muf*huf + mur*hur
  const sprungCgHeight =
    (v.mass * c.cgHeight -
      c.unsprungMassFront * c.unsprungCgHeightFront -
      c.unsprungMassRear * c.unsprungCgHeightRear) /
    sprungMass

  // Longitudinal station of the sprung CG as a fraction of wheelbase aft of
  // the front axle, then the roll axis height there.
  const xs = sprungWeight > 0 ? sprungWeightRear / sprungWeight : 0.5
  const rollAxisHeightAtCg =
    c.rollCentreHeightFront + (c.rollCentreHeightRear - c.rollCentreHeightFront) * xs
  const rollMomentArm = sprungCgHeight - rollAxisHeightAtCg

  const rollStiffnessFront = c.springRollStiffnessFront + c.barRollStiffnessFront
  const rollStiffnessRear = c.springRollStiffnessRear + c.barRollStiffnessRear
  const rollStiffnessTotal = rollStiffnessFront + rollStiffnessRear

  const denom = rollStiffnessTotal - sprungWeight * rollMomentArm
  const rollGradient = denom > 0 ? (sprungWeight * rollMomentArm) / denom : Infinity

  return {
    sprungMass,
    sprungWeight,
    sprungCgHeight,
    sprungWeightFront,
    sprungWeightRear,
    rollAxisHeightAtCg,
    rollMomentArm,
    rollStiffnessFront,
    rollStiffnessRear,
    rollStiffnessTotal,
    rollStiffnessFractionFront:
      rollStiffnessTotal > 0 ? rollStiffnessFront / rollStiffnessTotal : 0.5,
    rollGradient,
    rollGradientDeg: rollGradient * (180 / Math.PI),
    trackAverage: (c.trackFront + c.trackRear) / 2
  }
}

export interface LateralTransfer {
  /** Front axle lateral load transfer, N. */
  front: number
  rear: number
  frontGeometric: number
  frontElastic: number
  frontUnsprung: number
  rearGeometric: number
  rearElastic: number
  rearUnsprung: number
  /** Total lateral load transfer distribution, front fraction. */
  tlltd: number
  /** Body roll angle, rad. */
  rollAngle: number
}

/**
 * Lateral load transfer at a given lateral acceleration.
 * @param ay lateral acceleration in g
 */
export function lateralTransfer(
  v: BicycleVehicle,
  c: ChassisParams,
  ay: number
): LateralTransfer {
  const d = deriveChassis(v, c)
  const wuf = c.unsprungMassFront * G
  const wur = c.unsprungMassRear * G
  const kf = d.rollStiffnessFractionFront
  const elastic = d.sprungWeight * d.rollMomentArm

  const frontGeometric = (ay * d.sprungWeightFront * c.rollCentreHeightFront) / c.trackFront
  const frontElastic = (ay * kf * elastic) / c.trackFront
  const frontUnsprung = (ay * wuf * c.unsprungCgHeightFront) / c.trackFront

  const rearGeometric = (ay * d.sprungWeightRear * c.rollCentreHeightRear) / c.trackRear
  const rearElastic = (ay * (1 - kf) * elastic) / c.trackRear
  const rearUnsprung = (ay * wur * c.unsprungCgHeightRear) / c.trackRear

  const front = frontGeometric + frontElastic + frontUnsprung
  const rear = rearGeometric + rearElastic + rearUnsprung
  const total = front + rear

  return {
    front,
    rear,
    frontGeometric,
    frontElastic,
    frontUnsprung,
    rearGeometric,
    rearElastic,
    rearUnsprung,
    tlltd: Math.abs(total) > 1e-12 ? front / total : 0.5,
    rollAngle: d.rollGradient * ay
  }
}

/**
 * The exact invariant behind Ch 18 §5's arithmetic check: total roll moment
 * about the ground, N.m.
 *
 * Each axle's transfer times ITS OWN track is that axle's share of the moment,
 * and the two shares must add to W*Ay*h. This holds for any pair of tracks:
 *
 *   dFzf*tf + dFzr*tr = Ay*[Ws*hs + Wuf*huf + Wur*hur] = W*Ay*h
 *
 * which is why it, rather than the force sum, is what `chassis.test.ts`
 * checks on a car with staggered tracks.
 */
export function totalRollMoment(v: BicycleVehicle, c: ChassisParams, ay: number): number {
  const { w } = derive(v)
  return w * ay * c.cgHeight
}

/**
 * Total lateral load transfer as a FORCE: W*Ay*h/t.
 *
 * This is the form Ch 18 §5 and Exercise 18.3 use, and it is exact only when
 * the front and rear tracks are equal -- the case the exercise sets up. With
 * staggered tracks the two axle transfers are each a moment over a different
 * track, so their sum is not W*Ay*h over any single t; use `totalRollMoment`
 * for the check instead. The average track is used here so the number stays
 * meaningful as a scale, not as an identity.
 */
export function totalLateralTransfer(
  v: BicycleVehicle,
  c: ChassisParams,
  ay: number
): number {
  return totalRollMoment(v, c, ay) / ((c.trackFront + c.trackRear) / 2)
}

/**
 * TLLTD is independent of lateral acceleration -- it is set by geometry and
 * roll stiffness alone, which is exactly why it works as a tuning parameter.
 */
export function tlltd(v: BicycleVehicle, c: ChassisParams): number {
  return lateralTransfer(v, c, 1).tlltd
}

/**
 * Longitudinal weight transfer, N. Ch 18 §6.
 *
 * Note it has no distribution parameter to tune, because there is only one
 * axle pair in the longitudinal direction. Anti-dive and anti-squat change how
 * it is REACTED, not how much of it there is.
 *
 * @param ax longitudinal acceleration in g, positive for acceleration
 */
export function longitudinalTransfer(
  v: BicycleVehicle,
  c: ChassisParams,
  ax: number
): number {
  const { w, L } = derive(v)
  return (w * ax * c.cgHeight) / L
}

export interface WheelLoads {
  /** Front outer, N. */
  fo: number
  /** Front inner, N. */
  fi: number
  /** Rear outer, N. */
  ro: number
  /** Rear inner, N. */
  ri: number
  /** Front axle total, N. */
  front: number
  rear: number
  /** True if any wheel has lifted. */
  anyLifted: boolean
  transfer: LateralTransfer
  /** Longitudinal transfer applied, N. */
  longitudinal: number
}

/**
 * The four wheel loads at an operating point -- step 3 of the Ch 7 procedure.
 *
 * Loads are clamped at zero: a lifted wheel carries nothing and cannot carry
 * negative load, and letting it go negative would silently conjure tyre forces
 * that do not exist.
 */
export function wheelLoads(
  v: BicycleVehicle,
  c: ChassisParams,
  ay: number,
  ax = 0
): WheelLoads {
  const { wf, wr } = derive(v)
  const t = lateralTransfer(v, c, ay)
  const dLong = longitudinalTransfer(v, c, ax)

  const axleFront = Math.max(wf - dLong, 0)
  const axleRear = Math.max(wr + dLong, 0)

  const fo = Math.max(axleFront / 2 + t.front, 0)
  const fi = Math.max(axleFront / 2 - t.front, 0)
  const ro = Math.max(axleRear / 2 + t.rear, 0)
  const ri = Math.max(axleRear / 2 - t.rear, 0)

  return {
    fo,
    fi,
    ro,
    ri,
    front: fo + fi,
    rear: ro + ri,
    anyLifted: fi <= 0 || ri <= 0,
    transfer: t,
    longitudinal: dLong
  }
}

// ---------------------------------------------------------------------------
// Presets, matched to the vehicles in params.ts
// ---------------------------------------------------------------------------

export const FORMULA_CHASSIS: ChassisParams = {
  trackFront: 1.6,
  trackRear: 1.55,
  cgHeight: 0.3,
  unsprungMassFront: 35,
  unsprungMassRear: 40,
  unsprungCgHeightFront: 0.31,
  unsprungCgHeightRear: 0.31,
  rollCentreHeightFront: 0.03,
  rollCentreHeightRear: 0.06,
  springRollStiffnessFront: 48000,
  springRollStiffnessRear: 42000,
  barRollStiffnessFront: 27000,
  barRollStiffnessRear: 12000
}

export const GT_CHASSIS: ChassisParams = {
  trackFront: 1.6,
  trackRear: 1.6,
  cgHeight: 0.45,
  unsprungMassFront: 60,
  unsprungMassRear: 55,
  unsprungCgHeightFront: 0.32,
  unsprungCgHeightRear: 0.32,
  rollCentreHeightFront: 0.05,
  rollCentreHeightRear: 0.09,
  springRollStiffnessFront: 78000,
  springRollStiffnessRear: 76000,
  barRollStiffnessFront: 44500,
  barRollStiffnessRear: 24200
}

/** The car from Exercise 18.2 -- a known-answer reference. */
export const EXERCISE_18_2_CHASSIS: ChassisParams = {
  trackFront: 1.58,
  trackRear: 1.58,
  // Chosen so the derived sprung CG height is exactly the 0.315 m given:
  //   W*h = Ws*hs + Wu*hu = 6900(0.315) + 900(0.32) = 2461.5
  cgHeight: 2461.5 / 7800,
  unsprungMassFront: 450 / G,
  unsprungMassRear: 450 / G,
  unsprungCgHeightFront: 0.32,
  unsprungCgHeightRear: 0.32,
  rollCentreHeightFront: 0.04,
  rollCentreHeightRear: 0.07,
  springRollStiffnessFront: 44000,
  springRollStiffnessRear: 38000,
  barRollStiffnessFront: 0,
  barRollStiffnessRear: 0
}

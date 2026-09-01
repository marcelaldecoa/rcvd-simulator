/**
 * Ride and roll rates -- Ch 16.
 *
 * This is the module the rest of the app was quietly missing. `ChassisParams`
 * takes roll stiffness as a given number, so every lab downstream of it -- wheel
 * loads, pair analysis, the Moment Method -- asks you to dial in a roll
 * stiffness with no way to reach it from a spring rate. That is not how a setup
 * sheet is written. Ch 16 is the arithmetic that turns springs, bars, tyres and
 * geometry into the numbers those chapters consume:
 *
 *     spring rate --(IR^2)--> wheel rate --(tyre in series)--> ride rate
 *          --> ride frequency
 *          --> axle roll rate --(+ bar)--> roll gradient and elastic TLLTD
 *
 * Two things the chapter is emphatic about, both of which are easy to get wrong
 * and expensive to get wrong:
 *
 *   - The installation ratio enters SQUARED, and half the literature defines it
 *     the other way up. Using the wrong one is an error of IR^4.
 *   - The tyre is in series with the spring, and for a stiff car it is not a
 *     small correction. At 150 N/mm wheel rate against a 280 N/mm tyre, a third
 *     of the total compliance is in the carcass.
 */

/** Newtons per metre from newtons per millimetre. */
export const NMM_TO_NM = 1000

export interface CornerRates {
  /** Spring rate along the spring axis, N/mm. */
  springRate: number
  /**
   * Installation ratio, spring travel per unit wheel travel.
   *
   * Ch 16 §3's convention, and the one to verify physically: if the spring
   * moves LESS than the wheel then IR < 1 and the wheel rate is softer than the
   * spring. The other convention is equally common in the literature and gives
   * an answer wrong by IR^4.
   */
  installationRatio: number
  /** Tyre vertical rate, N/mm. Pressure and construction move this a lot. */
  tireRate: number
  /** Sprung mass carried at this corner, kg. */
  sprungCornerMass: number
}

/** Two rates in series -- the relation behind ride rate, and behind all of Ch 23. */
export function seriesRate(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0
  return (a * b) / (a + b)
}

/**
 * Wheel rate from spring rate -- Ch 16 §3.
 *
 * The square is the whole point: a 10% error in installation ratio is a 21%
 * error in wheel rate (Ex 16.6).
 */
export function wheelRate(springRate: number, installationRatio: number): number {
  return springRate * installationRatio * installationRatio
}

/** Ride rate: wheel rate with the tyre in series -- Ch 16 §2. */
export function rideRate(wheelRateNmm: number, tireRate: number): number {
  return seriesRate(wheelRateNmm, tireRate)
}

/**
 * Ride frequency, Hz -- Ch 16 §4.
 *
 * Ride rate, not wheel rate; sprung corner mass, not corner mass. Ch 16 names
 * both substitutions as the common errors, and both inflate the answer.
 */
export function rideFrequency(rideRateNmm: number, sprungCornerMass: number): number {
  if (sprungCornerMass <= 0) return 0
  return Math.sqrt((rideRateNmm * NMM_TO_NM) / sprungCornerMass) / (2 * Math.PI)
}

/**
 * The spring a ride-frequency target needs -- Ex 16.4, worked backwards.
 *
 * Ride rate from the frequency, wheel rate by removing the tyre from the series
 * relation, spring rate by dividing out IR^2. Returns 0 if the target is
 * unreachable: past a certain frequency the tyre alone is too soft, and no
 * spring however stiff will get there.
 */
export function springRateForFrequency(
  targetHz: number,
  sprungCornerMass: number,
  tireRate: number,
  installationRatio: number
): number {
  if (installationRatio <= 0) return 0
  const requiredRide = (sprungCornerMass * Math.pow(2 * Math.PI * targetHz, 2)) / NMM_TO_NM
  const inverseWheel = 1 / requiredRide - 1 / tireRate
  if (inverseWheel <= 0) return 0
  return 1 / inverseWheel / (installationRatio * installationRatio)
}

/**
 * The ride frequency the tyre alone would allow -- the ceiling the function
 * above runs into.
 *
 * Worth having as a number rather than as a failed solve: it is the honest
 * statement of Ch 16 Ex 16.7's endpoint, where "the tyre IS the suspension".
 */
export function maxRideFrequency(tireRate: number, sprungCornerMass: number): number {
  return rideFrequency(tireRate, sprungCornerMass)
}

/**
 * Axle roll rate from the springs -- Ch 16 §5.
 *
 * In a roll of phi each wheel deflects +/-(t/2)phi, so the pair produces
 * 2 * K(t/2)phi * (t/2) = K t^2 phi / 2.
 */
export function axleRollRate(rideRateNmm: number, track: number): number {
  return (rideRateNmm * NMM_TO_NM * track * track) / 2
}

/**
 * An anti-roll bar's contribution to axle roll rate -- Ex 16.3.
 *
 * Two stages, and the bar's own installation ratio is squared just as the
 * spring's is:
 *   1. torsional rate at the bar -> linear rate at the drop link, /armLength^2
 *   2. link rate -> wheel rate, * IR^2
 * then the same t^2/2 as the springs.
 */
export function barRollRate(
  barTorsionalRate: number,
  armLength: number,
  installationRatio: number,
  track: number
): number {
  if (armLength <= 0) return 0
  const atLink = barTorsionalRate / (armLength * armLength)
  const atWheel = atLink * installationRatio * installationRatio
  return (atWheel * track * track) / 2
}

/** Roll gradient, rad/g -- Ch 16 §6. H is the sprung CG to roll axis distance. */
export function rollGradientFromRates(
  sprungWeight: number,
  rollMomentArm: number,
  totalRollRate: number
): number {
  if (totalRollRate <= 0) return Infinity
  return (sprungWeight * rollMomentArm) / totalRollRate
}

/** Elastic TLLTD -- Ch 16 §7. Geometric and unsprung terms are Ch 18's job. */
export function elasticTlltd(rollRateFront: number, rollRateRear: number): number {
  const total = rollRateFront + rollRateRear
  return total > 0 ? rollRateFront / total : 0.5
}

/**
 * How much of the wheel rate the tyre takes away -- Ex 16.7.
 *
 * Depends only on the RATIO Kw/Kt, which is why the same tyre is a 7%
 * correction on a road car and a 35% one on a high-downforce car.
 */
export function tireComplianceLoss(wheelRateNmm: number, tireRate: number): number {
  if (wheelRateNmm <= 0 || tireRate <= 0) return 0
  return 1 - rideRate(wheelRateNmm, tireRate) / wheelRateNmm
}

export interface DerivedCorner {
  wheelRate: number
  rideRate: number
  rideFrequency: number
  /** Fraction of the wheel rate lost to the tyre being in series. */
  tireLoss: number
  /** Ride frequency if the tyre were rigid -- the common error, for comparison. */
  frequencyIgnoringTire: number
}

export function deriveCorner(c: CornerRates): DerivedCorner {
  const kw = wheelRate(c.springRate, c.installationRatio)
  const kr = rideRate(kw, c.tireRate)
  return {
    wheelRate: kw,
    rideRate: kr,
    rideFrequency: rideFrequency(kr, c.sprungCornerMass),
    tireLoss: tireComplianceLoss(kw, c.tireRate),
    frequencyIgnoringTire: rideFrequency(kw, c.sprungCornerMass)
  }
}

// ---------------------------------------------------------------------------
// The whole car
// ---------------------------------------------------------------------------

export interface SuspensionRates {
  front: CornerRates
  rear: CornerRates
  /** Bar torsional rate at the bar itself, N.m/rad. */
  barRateFront: number
  barRateRear: number
  /** Drop-link arm length from the bar centreline, m. */
  barArmFront: number
  barArmRear: number
  /** Bar installation ratio, wheel to drop link. */
  barInstallationRatioFront: number
  barInstallationRatioRear: number
  trackFront: number
  trackRear: number
}

export interface DerivedRates {
  front: DerivedCorner
  rear: DerivedCorner
  /** Axle roll rate from springs alone, N.m/rad. */
  springRollRateFront: number
  springRollRateRear: number
  /** Anti-roll bar contribution, N.m/rad. */
  barRollRateFront: number
  barRollRateRear: number
  /** Springs plus bar, N.m/rad. */
  rollRateFront: number
  rollRateRear: number
  rollRateTotal: number
  /** Elastic TLLTD -- the springs-and-bars part of Ch 18's answer. */
  elasticTlltd: number
  /** What fraction of each axle's roll rate the bar supplies. */
  barShareFront: number
  barShareRear: number
  /**
   * Front ride frequency relative to rear. Olley's flat-ride criterion wants
   * the rear 10-20% HIGHER than the front so pitch decays after a bump; race
   * cars routinely break it for aero platform reasons (Ch 16 §4).
   */
  frequencyRatioRearToFront: number
}

export function deriveRates(r: SuspensionRates): DerivedRates {
  const front = deriveCorner(r.front)
  const rear = deriveCorner(r.rear)

  const springF = axleRollRate(front.rideRate, r.trackFront)
  const springR = axleRollRate(rear.rideRate, r.trackRear)
  const barF = barRollRate(
    r.barRateFront,
    r.barArmFront,
    r.barInstallationRatioFront,
    r.trackFront
  )
  const barR = barRollRate(r.barRateRear, r.barArmRear, r.barInstallationRatioRear, r.trackRear)

  const rollF = springF + barF
  const rollR = springR + barR

  return {
    front,
    rear,
    springRollRateFront: springF,
    springRollRateRear: springR,
    barRollRateFront: barF,
    barRollRateRear: barR,
    rollRateFront: rollF,
    rollRateRear: rollR,
    rollRateTotal: rollF + rollR,
    elasticTlltd: elasticTlltd(rollF, rollR),
    barShareFront: rollF > 0 ? barF / rollF : 0,
    barShareRear: rollR > 0 ? barR / rollR : 0,
    frequencyRatioRearToFront:
      front.rideFrequency > 0 ? rear.rideFrequency / front.rideFrequency : 0
  }
}

/**
 * The bridge into `ChassisParams`.
 *
 * This is the point of the module. Everything downstream -- Ch 18 wheel loads,
 * Ch 7 pair analysis, Ch 8's map -- consumes four roll-stiffness numbers that
 * used to be typed in by hand. Now they are consequences of springs, bars,
 * tyres and installation ratios, which is the direction the causality actually
 * runs.
 */
export function rollStiffnessForChassis(r: SuspensionRates): {
  springRollStiffnessFront: number
  springRollStiffnessRear: number
  barRollStiffnessFront: number
  barRollStiffnessRear: number
} {
  const d = deriveRates(r)
  return {
    springRollStiffnessFront: d.springRollRateFront,
    springRollStiffnessRear: d.springRollRateRear,
    barRollStiffnessFront: d.barRollRateFront,
    barRollStiffnessRear: d.barRollRateRear
  }
}

/**
 * A formula car's rates, chosen so `rollStiffnessForChassis` lands close to the
 * hand-entered numbers `FORMULA_CHASSIS` has always used. The point of a
 * default is that switching a lab from typed-in roll stiffness to derived roll
 * stiffness should not silently change every other chapter's answers.
 */
export const FORMULA_RATES: SuspensionRates = {
  front: {
    springRate: 120,
    installationRatio: 0.62,
    tireRate: 320,
    sprungCornerMass: 155
  },
  rear: {
    springRate: 110,
    installationRatio: 0.68,
    tireRate: 340,
    sprungCornerMass: 165
  },
  barRateFront: 2200,
  barRateRear: 1100,
  barArmFront: 0.28,
  barArmRear: 0.28,
  barInstallationRatioFront: 0.85,
  barInstallationRatioRear: 0.85,
  trackFront: 1.6,
  trackRear: 1.55
}

/** A softly sprung road car, for the frequency and tyre-loss comparisons. */
export const SEDAN_RATES: SuspensionRates = {
  front: {
    springRate: 30,
    installationRatio: 0.85,
    tireRate: 220,
    sprungCornerMass: 340
  },
  rear: {
    springRate: 26,
    installationRatio: 0.9,
    tireRate: 220,
    sprungCornerMass: 300
  },
  barRateFront: 900,
  barRateRear: 400,
  barArmFront: 0.3,
  barArmRear: 0.3,
  barInstallationRatioFront: 0.7,
  barInstallationRatioRear: 0.7,
  trackFront: 1.55,
  trackRear: 1.54
}

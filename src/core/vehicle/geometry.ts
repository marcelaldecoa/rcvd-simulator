/**
 * Suspension geometry -- Ch 17.
 *
 * The chapter is about one object: the instant centre. Where it sits decides
 * the camber curve AND the roll centre AND the geometric share of load
 * transfer, and they cannot be chosen independently. That coupling is the
 * chapter's real content, and it is what this module makes visible -- move the
 * IC and watch three numbers move together, two of which you wanted and one of
 * which you did not.
 *
 * Frames, stated once because the arithmetic is unforgiving:
 *
 *   - Front elevation, one corner at a time, taken as the left one. y = 0 at the
 *     ground, positive up; the contact patch sits at half a track from the
 *     vehicle centreline.
 *   - Arm intersections are solved in a frame local to the wheel centreline
 *     with x measured INBOARD, which is why the companion notes' Exercise 17.1
 *     goes wrong: it solves the instant centre in that local frame and then
 *     reads the roll centre as though the answer were a vehicle coordinate.
 *   - FVSA is SIGNED: positive when the instant centre lies INBOARD of the
 *     contact patch (the normal case), negative when it lies outboard. The sign
 *     matters, because an outboard IC puts the roll centre BELOW ground.
 */

const R2D = 180 / Math.PI

export interface WishboneGeometry {
  /** Upper ball joint height above ground, m. */
  upperJointHeight: number
  /** Lower ball joint height above ground, m. */
  lowerJointHeight: number
  /**
   * Upper arm inclination, deg, positive when the arm rises going INBOARD
   * (toward the chassis).
   */
  upperArmAngle: number
  /** Lower arm inclination, deg, positive when the arm FALLS going inboard. */
  lowerArmAngle: number
  /** Track width, m. */
  track: number
}

export interface InstantCentre {
  /** Distance inboard of the contact patch, m. Negative = outboard. */
  offset: number
  /** Height above ground, m. */
  height: number
  /** Front-view swing arm length, m. Signed: negative means an outboard IC. */
  fvsa: number
  /** Camber change per metre of bump, rad/m -- approximately 1/FVSA. */
  camberGainPerMetre: number
  /** The same, in the units a setup sheet uses. */
  camberGainDegPerMm: number
  /** Roll centre height above ground, m. Can be negative. */
  rollCentreHeight: number
}

/**
 * Where the two control arms intersect, and everything that follows from it.
 *
 * Solving in a frame local to the wheel centreline, with x measured inboard:
 *   upper:  y = yU + tan(upper) * x
 *   lower:  y = yL - tan(lower) * x
 * so they meet at x = (yL - yU) / (tan(upper) + tan(lower)).
 */
export function instantCentre(g: WishboneGeometry): InstantCentre {
  const tanU = Math.tan(g.upperArmAngle / R2D)
  const tanL = Math.tan(g.lowerArmAngle / R2D)
  const denom = tanU + tanL
  if (Math.abs(denom) < 1e-12) {
    // Parallel arms: the IC is at infinity, the wheel translates, no camber
    // change relative to the body, and the roll centre sits at ground level.
    return {
      offset: Infinity,
      height: g.lowerJointHeight,
      fvsa: Infinity,
      camberGainPerMetre: 0,
      camberGainDegPerMm: 0,
      rollCentreHeight: 0
    }
  }
  const offset = (g.lowerJointHeight - g.upperJointHeight) / denom
  const height = g.upperJointHeight + tanU * offset

  return {
    offset,
    height,
    fvsa: offset,
    camberGainPerMetre: offset !== 0 ? 1 / offset : 0,
    camberGainDegPerMm: offset !== 0 ? R2D / offset / 1000 : 0,
    rollCentreHeight: rollCentreFromIc(offset, height, g.track)
  }
}

/**
 * Roll centre from an instant centre -- Ch 17 §4.
 *
 * Draw the line from the IC through the contact patch and read its height at
 * the vehicle centreline. With the contact patch at x = t/2 and the IC a signed
 * FVSA inboard of it, that is
 *
 *     h_RC = h_IC * (t/2) / FVSA
 *
 * The sign is not a detail. An IC that is OUTBOARD and above ground makes the
 * line descend as it runs inboard, so the roll centre lands BELOW ground --
 * which is exactly the case the companion notes' Exercise 17.1 geometry
 * produces, and exactly what makes that geometry unusable.
 */
export function rollCentreFromIc(fvsa: number, icHeight: number, track: number): number {
  if (!isFinite(fvsa) || fvsa === 0) return 0
  return (icHeight * (track / 2)) / fvsa
}

/** Camber gain from a swing-arm length -- Ch 17 §3, the design shorthand. */
export function camberGainFromFvsa(fvsa: number): number {
  return fvsa !== 0 ? R2D / fvsa / 1000 : 0
}

/** The FVSA a wanted camber gain implies -- the same relation, inverted. */
export function fvsaForCamberGain(degPerMm: number): number {
  return degPerMm !== 0 ? R2D / (degPerMm * 1000) : Infinity
}

/**
 * Roll axis height under the CG -- Ex 17.2.
 *
 * The roll axis joins the two roll centres; its height at the CG's station is a
 * straight interpolation. `aFromFront` is the CG's distance behind the front
 * axle.
 */
export function rollAxisHeightAtCg(
  rollCentreFront: number,
  rollCentreRear: number,
  aFromFront: number,
  wheelbase: number
): number {
  if (wheelbase <= 0) return rollCentreFront
  return rollCentreFront + (rollCentreRear - rollCentreFront) * (aFromFront / wheelbase)
}

/**
 * Roll moment arm H -- Ex 17.2, and the number Ch 16's roll gradient consumes.
 *
 * Note how leveraged it is: on the exercise's car, raising both roll centres by
 * 50 mm cuts H by 22% and body roll with it. That is why roll centre height is
 * such a tempting lever, and Ex 17.6 is about why pulling it has a cost.
 */
export function rollMomentArm(sprungCgHeight: number, rollAxisHeight: number): number {
  return sprungCgHeight - rollAxisHeight
}

/**
 * Geometric load transfer at one axle -- Ch 17 §4 and Ex 17.3.
 *
 * The part of the lateral force reacted through the LINKS rather than the
 * springs. It is instantaneous, because it travels through rigid members; the
 * elastic part has to wait for the body to roll. In a transient that
 * distinction is the whole story.
 */
export function geometricTransfer(
  axleLateralForce: number,
  rollCentreHeight: number,
  track: number
): number {
  if (track <= 0) return 0
  return (axleLateralForce * rollCentreHeight) / track
}

export interface GeometricSplit {
  front: number
  rear: number
  total: number
  /** Geometric transfer as a fraction of the sprung mass's total transfer. */
  fractionOfTotal: number
  /** Front share of the geometric transfer alone. */
  frontShare: number
}

/**
 * The geometric transfer at both axles, and how much of the job it is doing.
 *
 * Ex 17.3's lesson is in the last two fields: on that car the geometric part is
 * 23% of the total but is split 31/69 front/rear, because the rear roll centre
 * is nearly twice as high. That is a significant oversteer contribution baked
 * into the geometry, which the elastic distribution then has to compensate --
 * so roll centre heights are a BALANCE tool, not only a roll-control tool.
 */
export function geometricSplit(opts: {
  sprungWeight: number
  frontWeightFraction: number
  rollCentreFront: number
  rollCentreRear: number
  trackFront: number
  trackRear: number
  sprungCgHeight: number
  ay: number
}): GeometricSplit {
  const fy = opts.sprungWeight * opts.ay
  const front = geometricTransfer(fy * opts.frontWeightFraction, opts.rollCentreFront, opts.trackFront)
  const rear = geometricTransfer(
    fy * (1 - opts.frontWeightFraction),
    opts.rollCentreRear,
    opts.trackRear
  )
  const total = front + rear
  const meanTrack = (opts.trackFront + opts.trackRear) / 2
  const overall = (opts.sprungWeight * opts.sprungCgHeight * opts.ay) / meanTrack
  return {
    front,
    rear,
    total,
    fractionOfTotal: overall > 0 ? total / overall : 0,
    frontShare: total !== 0 ? front / total : 0.5
  }
}

/**
 * The static camber a dynamic camber target implies -- Ex 17.4.
 *
 * Sign convention: negative camber is the useful kind. Roll adds POSITIVE
 * camber to the outside wheel (it leans out with the body); suspension camber
 * gain in bump takes some of that back.
 *
 *     gamma_dynamic = gamma_static + roll - gain
 */
export function staticCamberRequired(opts: {
  /** Wanted camber at the loaded outside wheel, deg. Negative is normal. */
  targetCamber: number
  /** Roll gradient, deg/g. */
  rollGradient: number
  /** Lateral acceleration the target applies at, g. */
  ay: number
  /** Front-view swing arm length, m. */
  fvsa: number
  /** Bump travel at that condition, mm. */
  bumpTravel: number
}): { staticCamber: number; roll: number; camberGain: number; recovered: number } {
  const roll = opts.rollGradient * opts.ay
  const camberGain = camberGainFromFvsa(opts.fvsa) * opts.bumpTravel
  return {
    staticCamber: opts.targetCamber - roll + camberGain,
    roll,
    camberGain,
    /** Fraction of the roll-induced camber loss the geometry takes back. */
    recovered: roll > 0 ? camberGain / roll : 0
  }
}

/**
 * The roll camber coefficient the understeer budget wants -- the bridge from
 * Ch 17 into Ch 5 §4.1.
 *
 * `rollCamber` in `AxleCompliance` is "camber gained relative to the ROAD per
 * degree of body roll": 1.0 when the wheel is bolted to the body, 0 with
 * perfect compensation. That is exactly 1 minus what the geometry recovers.
 */
export function rollCamberCoefficient(opts: {
  rollGradient: number
  ay: number
  fvsa: number
  bumpTravel: number
}): number {
  const { recovered } = staticCamberRequired({ ...opts, targetCamber: 0 })
  return Math.max(0, 1 - recovered)
}

/**
 * Percent anti-dive -- Ch 17 §6 and Ex 17.5.
 *
 *     %anti = tan(theta_SVSA) / (h/L) * 100
 *
 * where tan(theta) is the side-view IC's height over its distance behind the
 * contact patch. Over 100% means the nose RISES under braking, which Ex 17.5
 * is blunt about being a design error: the suspension goes rigid in the braking
 * phase, so a bump unloads the tyre exactly when it is needed most.
 */
export function antiDivePercent(
  svsaHeight: number,
  svsaLength: number,
  cgHeight: number,
  wheelbase: number
): number {
  if (svsaLength <= 0 || wheelbase <= 0 || cgHeight <= 0) return 0
  return ((svsaHeight / svsaLength) / (cgHeight / wheelbase)) * 100
}

/** The side-view geometry a wanted anti-dive implies, at a given SVSA length. */
export function svsaHeightForAntiDive(
  percent: number,
  svsaLength: number,
  cgHeight: number,
  wheelbase: number
): number {
  return ((percent / 100) * (cgHeight / wheelbase)) * svsaLength
}

/**
 * Camber through travel, for the camber-curve plot.
 *
 * Deliberately the linear 1/FVSA approximation rather than a full kinematic
 * solve: Ch 17 §3 presents it as the design shorthand, and the shorthand is
 * what an engineer actually reasons with. A real camber curve bends because the
 * IC migrates, which is Ch 17's other warning and needs the full linkage.
 */
export function camberCurve(
  fvsa: number,
  staticCamber: number,
  travelRange = 40,
  samples = 41
): { travel: number; camber: number }[] {
  const gain = camberGainFromFvsa(fvsa)
  return Array.from({ length: samples }, (_, i) => {
    const travel = -travelRange + (2 * travelRange * i) / (samples - 1)
    return { travel, camber: staticCamber - gain * travel }
  })
}

/**
 * Camber at the two outside/inside wheels in a corner -- what the camber curve
 * is actually for.
 */
export function corneringCamber(opts: {
  staticCamber: number
  fvsa: number
  rollGradient: number
  ay: number
  /** Wheel travel per degree of roll, mm/deg -- roughly track/2 in mm per rad. */
  travelPerDegreeRoll: number
}): { roll: number; outside: number; inside: number } {
  const roll = opts.rollGradient * opts.ay
  const travel = roll * opts.travelPerDegreeRoll
  const gain = camberGainFromFvsa(opts.fvsa)
  return {
    roll,
    outside: opts.staticCamber + roll - gain * travel,
    inside: opts.staticCamber - roll + gain * travel
  }
}

/** Wheel travel per degree of body roll, mm/deg, for a given track. */
export function travelPerDegreeRoll(track: number): number {
  return ((track / 2) * 1000) / R2D
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * A sane race car front corner: a 2.5 m FVSA with the instant centre well
 * inboard and 265 mm up, giving an 85 mm roll centre and a gentle 0.023 deg/mm
 * camber curve. Both arms fall going inboard, which is what puts the IC on the
 * far side of the car rather than outboard of the wheel.
 */
export const RACE_WISHBONE: WishboneGeometry = {
  upperJointHeight: 0.44,
  lowerJointHeight: 0.2,
  upperArmAngle: -4,
  lowerArmAngle: -1.5,
  track: 1.6
}

/** The companion notes' Exercise 17.1 geometry -- the cautionary one. */
export const EXERCISE_17_1: WishboneGeometry = {
  upperJointHeight: 0.44,
  lowerJointHeight: 0.2,
  upperArmAngle: 8,
  lowerArmAngle: 3,
  track: 1.55
}

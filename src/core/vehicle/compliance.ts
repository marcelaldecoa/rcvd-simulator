/**
 * Compliances -- Ch 23.
 *
 * The chapter that removes the rigid-link assumption every other chapter made,
 * and its position at the end of the book is deliberate: you cannot see what
 * compliance does to a car until you know what the car was supposed to do.
 *
 * One relation does most of the work. A compliant element in the load path is a
 * spring IN SERIES with the stiffness it was meant to transmit,
 *
 *     1/K_eff = 1/K_intended + 1/K_compliance
 *
 * from which everything else follows: the softest element dominates, effective
 * stiffness is always less than intended, and -- the one that catches people --
 * adding stiffness to the stiff element buys almost nothing. That is the whole
 * explanation of "the bar change didn't do anything".
 *
 * The chapter's own summary of its role: compliance does not require a new
 * theory, it modifies the parameters of the theory already built. So this
 * module's job is to produce the corrections that Ch 5's budget, Ch 16's rates
 * and Ch 18's TLLTD consume, rather than to model anything new.
 */

import { seriesRate } from './rates.js'

const R2D = 180 / Math.PI

export { seriesRate }

// ---------------------------------------------------------------------------
// Springs in series -- Ch 23 §3 and Ex 23.1
// ---------------------------------------------------------------------------

export interface SeriesUpgrade {
  /** Effective rate before, after, and the ceiling the mount imposes. */
  before: number
  after: number
  ceiling: number
  /** Fraction of the nominal rate lost to the compliance, before the change. */
  lossBefore: number
  lossAfter: number
  /** Intended and realized increases. */
  intended: number
  realized: number
  /** What fraction of the intended change actually arrives. */
  realizedFraction: number
}

/**
 * What a stiffness upgrade actually delivers through a compliant mount -- Ex 23.1.
 *
 * The exercise's numbers are worth remembering: a 28 kN.m/rad bar on 45
 * kN.m/rad mounts is really 17.3, and replacing it with a 40 gets you 21.2 --
 * a third of the intended increase. The remedy is stiffer mounts, not a bigger
 * bar, because the mount rate is a hard CEILING no bar can pass.
 */
export function seriesUpgrade(
  nominalBefore: number,
  nominalAfter: number,
  complianceRate: number
): SeriesUpgrade {
  const before = seriesRate(nominalBefore, complianceRate)
  const after = seriesRate(nominalAfter, complianceRate)
  const intended = nominalAfter - nominalBefore
  const realized = after - before
  return {
    before,
    after,
    ceiling: complianceRate,
    lossBefore: nominalBefore > 0 ? 1 - before / nominalBefore : 0,
    lossAfter: nominalAfter > 0 ? 1 - after / nominalAfter : 0,
    intended,
    realized,
    realizedFraction: intended !== 0 ? realized / intended : 0
  }
}

/** The nominal rate needed to reach an effective target -- 0 if the ceiling forbids it. */
export function nominalForEffective(target: number, complianceRate: number): number {
  if (target >= complianceRate) return 0
  const inv = 1 / target - 1 / complianceRate
  return inv > 0 ? 1 / inv : 0
}

// ---------------------------------------------------------------------------
// Compliance steer -- Ch 23 §4 and Ex 23.2, 23.3
// ---------------------------------------------------------------------------

export interface ComplianceSteerResult {
  /** Steer produced at this axle, deg. */
  steer: number
  /** Contribution to the understeer gradient, deg/g. */
  deltaK: number
}

/**
 * Compliance steer at one axle and what it does to K -- Ex 23.2 and 23.3.
 *
 * The sign convention is the one the whole understeer budget uses: `coefficient`
 * positive means the axle steers INTO the turn under its own lateral force.
 * Ch 23 §4 spells out the two consequences, which are opposite at the two ends
 * for the same physical sign:
 *
 *   - front, steering into the turn: less driver steer needed -> OVERSTEER
 *   - rear, steering into the turn: acts like rear steer in phase with the
 *     front, so the driver adds lock -> UNDERSTEER
 */
export function complianceSteer(opts: {
  /** deg per kN, positive = steers into the turn. */
  coefficient: number
  /** Axle lateral force, N. */
  axleLateralForce: number
  /** Lateral acceleration this represents, g. */
  ay: number
  axle: 'front' | 'rear'
}): ComplianceSteerResult {
  const steer = opts.coefficient * (opts.axleLateralForce / 1000)
  const perG = opts.ay > 0 ? steer / opts.ay : 0
  return { steer, deltaK: opts.axle === 'front' ? -perG : perG }
}

/**
 * Front and rear together -- and Ex 23.3's warning about reading the net.
 *
 * A road car deliberately balances front compliance oversteer against rear
 * compliance understeer, and the net can be nearly zero while each term is
 * large. That is not the same as having no compliance: the cancellation holds
 * only at one lateral acceleration and one load split, the two coefficients
 * drift independently with wear and temperature, and neither the phase lag nor
 * the load sensitivity cancels at all.
 */
export function complianceSteerBudget(opts: {
  frontCoefficient: number
  rearCoefficient: number
  frontForce: number
  rearForce: number
  ay: number
}): {
  front: ComplianceSteerResult
  rear: ComplianceSteerResult
  net: number
  /** Sum of the magnitudes -- how much compliance there actually is. */
  gross: number
  /** How completely the two hide each other, 0 to 1. */
  cancellation: number
} {
  const front = complianceSteer({
    coefficient: opts.frontCoefficient,
    axleLateralForce: opts.frontForce,
    ay: opts.ay,
    axle: 'front'
  })
  const rear = complianceSteer({
    coefficient: opts.rearCoefficient,
    axleLateralForce: opts.rearForce,
    ay: opts.ay,
    axle: 'rear'
  })
  const net = front.deltaK + rear.deltaK
  const gross = Math.abs(front.deltaK) + Math.abs(rear.deltaK)
  return {
    front,
    rear,
    net,
    gross,
    cancellation: gross > 0 ? 1 - Math.abs(net) / gross : 0
  }
}

// ---------------------------------------------------------------------------
// Compliance camber -- Ch 23 §5 and Ex 23.4
// ---------------------------------------------------------------------------

/**
 * The moment lateral force applies to the upright -- Ch 23 §5.
 *
 * Fy acts at ground level, a rolling radius below the wheel centre, so it tries
 * to camber the wheel positively. 5000 N on a 0.33 m radius is 1650 N.m into
 * the upright, bearings and arms, and it always acts the unfavourable way.
 */
export function camberMoment(lateralForce: number, rollingRadius: number): number {
  return lateralForce * rollingRadius
}

export interface CamberBudget {
  /** Camber lost to body roll, deg (positive = lost). */
  roll: number
  /** Camber recovered by suspension geometry, deg. */
  geometry: number
  /** Camber lost to structural deflection, deg. */
  compliance: number
  /** The static setting the target implies, deg. */
  staticCamber: number
  /** Share of the static setting that exists purely to cover deflection. */
  complianceShare: number
}

/**
 * The static camber a dynamic target implies, with compliance in the sum -- Ex 23.4.
 *
 *     gamma_dynamic = gamma_static + roll - geometry + compliance
 *
 * The exercise's lesson is the last field: 0.55 deg of the 2.95 deg answer, 19%
 * of it, exists only to cancel structural deflection. Left unmeasured, the
 * engineer sets -2.4 and spends the session chasing a front grip deficit with
 * bars and pressures.
 */
export function camberBudget(opts: {
  targetCamber: number
  rollLoss: number
  geometryGain: number
  complianceLoss: number
}): CamberBudget {
  const staticCamber =
    opts.targetCamber - opts.rollLoss + opts.geometryGain - opts.complianceLoss
  return {
    roll: opts.rollLoss,
    geometry: opts.geometryGain,
    compliance: opts.complianceLoss,
    staticCamber,
    complianceShare: staticCamber !== 0 ? opts.complianceLoss / Math.abs(staticCamber) : 0
  }
}

/**
 * Compliance camber at a given lateral force, deg.
 *
 * Load-dependent, which Ch 23 §5 flags as the reason it is worse than a fixed
 * offset: a static camber correct at one lateral acceleration is wrong at every
 * other, and that contributes a nonlinearity to K(Ay) that no kinematic model
 * predicts.
 */
export function complianceCamber(
  lateralForce: number,
  degPerKn: number
): number {
  return (lateralForce / 1000) * degPerKn
}

// ---------------------------------------------------------------------------
// Tyre carcass -- Ch 23 §2 and Ex 23.5
// ---------------------------------------------------------------------------

/**
 * Contact patch lateral deflection and the slip angle it looks like -- Ex 23.5.
 *
 * The exercise deliberately overestimates, and then explains why the
 * overestimate is the point: a measured cornering stiffness ALREADY contains
 * the carcass, because the tyre is tread stiffness and carcass stiffness in
 * series. The carcass is not a correction to the tyre model, it is one of the
 * two springs that constitute it -- which is why the brush model's 2*c*a^2
 * underpredicts real tyres, and why tyre pressure is such a high-leverage
 * adjustment.
 */
export function carcassDeflection(
  lateralForce: number,
  carcassRateNmm: number,
  contactPatchLengthMm: number
): { deflectionMm: number; apparentSlipDeg: number } {
  if (carcassRateNmm <= 0) return { deflectionMm: 0, apparentSlipDeg: 0 }
  const deflectionMm = lateralForce / carcassRateNmm
  return {
    deflectionMm,
    apparentSlipDeg:
      contactPatchLengthMm > 0 ? (deflectionMm / contactPatchLengthMm) * R2D : 0
  }
}

// ---------------------------------------------------------------------------
// Chassis torsion -- Ch 23 §7 and Ex 23.6
// ---------------------------------------------------------------------------

export interface ChassisDilution {
  /** Chassis torsional rate, N.m/rad. */
  chassisRate: number
  /** Total axle roll rate, N.m/rad. */
  axleTotal: number
  chassisToAxleRatio: number
  /** Fraction of an intended TLLTD change that actually arrives. */
  effectiveness: number
  /** The book's own criterion: chassis against the front/rear DIFFERENCE. */
  differenceRatio: number
}

/**
 * How much of a setup change survives chassis twist -- Ex 23.6.
 *
 * A soft chassis is a torsional spring between the two axles' roll rates, so it
 * dilutes every TLLTD change made with bars. The estimate below is a heuristic
 * rather than a book result -- the exercise says so explicitly -- but the
 * conclusion it supports is not: on a car that only partly obeys the model,
 * every setup change is attenuated by an unknown factor, correlation with
 * simulation degrades, and the engineer slowly loses trust in the whole
 * apparatus of Chapters 7, 16 and 18.
 */
export function chassisDilution(
  chassisRateNmPerDeg: number,
  rollRateFront: number,
  rollRateRear: number
): ChassisDilution {
  const chassisRate = chassisRateNmPerDeg * R2D
  const axleTotal = rollRateFront + rollRateRear
  const difference = Math.abs(rollRateFront - rollRateRear)
  return {
    chassisRate,
    axleTotal,
    chassisToAxleRatio: axleTotal > 0 ? chassisRate / axleTotal : Infinity,
    effectiveness: chassisRate + axleTotal > 0 ? chassisRate / (chassisRate + axleTotal) : 1,
    differenceRatio: difference > 0 ? chassisRate / difference : Infinity
  }
}

// ---------------------------------------------------------------------------
// Presets -- Ch 23 §7's K&C rig targets
// ---------------------------------------------------------------------------

export interface ComplianceTargets {
  /** Lateral compliance steer, deg/kN. */
  lateralSteer: number
  /** Compliance camber, deg/kN. */
  camber: number
  /** Chassis torsional stiffness, N.m/deg. */
  chassisStiffness: number
  /** Anti-roll bar mounting and drop-link rate, N.m/rad. */
  barMountRate: number
}

/** Ch 23 §7: race cars target under 0.05 deg/kN of lateral compliance steer. */
export const RACE_COMPLIANCE_TARGETS: ComplianceTargets = {
  lateralSteer: 0.03,
  camber: 0.08,
  chassisStiffness: 8000,
  barMountRate: 120000
}

/** Road cars run 0.2-0.5 deg/kN by design, not by accident. */
export const ROAD_COMPLIANCE_TARGETS: ComplianceTargets = {
  lateralSteer: 0.3,
  camber: 0.22,
  chassisStiffness: 2600,
  barMountRate: 45000
}

/**
 * The understeer budget -- Ch 5 §4.1, drawing on Ch 2, 17, 19 and 23.
 *
 * Ch 5 gives the construction: because each axle's cornering compliance is a
 * sum of linear, independent contributions, D_f and D_r can be decomposed
 * mechanism by mechanism and added up. K = D_f - D_r then says not just THAT
 * the car understeers but WHICH mechanism is responsible. The book calls it the
 * automotive analogue of an aircraft's static-stability budget, and it is the
 * single most useful diagnostic table in the subject.
 *
 * Ch 5 only names the six rows. The physics of five of them lives in later
 * chapters, which is why this module exists and why it imports a suspension and
 * a pair of tyres rather than just a bicycle model.
 *
 * ---------------------------------------------------------------------------
 * SIGN CONVENTION, once, so no row has to re-derive it
 * ---------------------------------------------------------------------------
 *
 * D is "degrees of driver steer per g, attributable to this axle". K = D_f - D_r,
 * positive is understeer. From the steady-state bicycle model with a steered
 * rear axle,
 *
 *     delta_driver = L/R + K*Ay + delta_rear
 *
 * so an axle that steers ITSELF by delta_self degrees, in the same direction as
 * the driver's steer (call that "into the turn"), contributes
 *
 *     Delta D = -delta_self / Ay
 *
 * to THAT axle's column -- the same expression at both ends. K = D_f - D_r then
 * produces the opposite consequences automatically, and matches Ch 23 §4:
 * front steering into the turn is an oversteer contribution, rear steering into
 * the turn is an understeer contribution.
 *
 * A mechanism that instead changes how much FORCE an axle makes at a given slip
 * angle (roll camber) is expressed as the extra slip angle needed to make up
 * the shortfall, which lands in the same column with the same meaning.
 */

import { derive, type BicycleVehicle } from './params.js'
import { deriveChassis, type ChassisParams } from './chassis.js'
import { basicBudgetLine, sumBudget, type BudgetLine, type UndersteerBudget } from './steadyState.js'
import type { TireModel } from '../tire/types.js'

const R2D = 180 / Math.PI

export interface AxleCompliance {
  /**
   * Camber gained relative to the ROAD per degree of body roll, deg/deg.
   *
   * 1.0 is a wheel bolted to the body -- it leans out with it and loses all of
   * the roll as camber. 0 is perfect camber compensation. Ch 17 Exercise 17.4's
   * sedan geometry recovers 22% of the roll, so 0.78. A race car with a short
   * FVSA does better, but mostly it wins by rolling less in the first place.
   */
  rollCamber: number
  /**
   * Axle steer per degree of body roll, deg/deg. Positive = the axle steers
   * INTO the turn. Ch 19 §5: rear "roll understeer" is this term positive at
   * the rear, and it is stabilising.
   */
  rollSteer: number
  /**
   * Axle steer per kN of axle lateral force, deg/kN -- Ch 23 §4. Positive =
   * INTO the turn. On a race car this is small and unwanted; on a road car it
   * is a designed property of the bushings.
   */
  lateralComplianceSteer: number
  /**
   * Axle steer per kN.m of aligning torque about the steering axis, deg/(kN.m)
   * -- Ch 23 §4, and the effect measured in Ch 19 Exercise 19.4. The tyre's own
   * Mz is restoring, so this always steers the wheel OUT of the turn and always
   * adds apparent understeer.
   *
   * On a well-built race car this and the tyre carcass are the two largest
   * compliances in the whole vehicle, and neither is a suspension bushing.
   */
  aligningComplianceSteer: number
  /**
   * Mechanical trail from caster, m. Adds to the pneumatic trail for the moment
   * about the STEERING axis; it does not enter the moment about the vehicle's
   * own yaw axis, which is why the two aligning-torque rows use different trails.
   */
  mechanicalTrail: number
}

export interface SuspensionCompliance {
  front: AxleCompliance
  rear: AxleCompliance
}

/** A stiff, rod-ended, low-roll race car. */
export const FORMULA_COMPLIANCE: SuspensionCompliance = {
  front: {
    rollCamber: 0.45,
    rollSteer: 0,
    lateralComplianceSteer: 0.008,
    aligningComplianceSteer: 0.3,
    mechanicalTrail: 0.02
  },
  rear: {
    rollCamber: 0.55,
    rollSteer: 0.04,
    lateralComplianceSteer: 0.006,
    aligningComplianceSteer: 0.05,
    mechanicalTrail: 0
  }
}

/**
 * A bushed passenger car: the configuration Ch 5 §4.1 has in mind when it says
 * the basic term supplies most of the total but the compliance and roll-steer
 * terms together change the character of the car.
 */
export const SEDAN_COMPLIANCE: SuspensionCompliance = {
  front: {
    rollCamber: 0.78,
    rollSteer: -0.03,
    lateralComplianceSteer: 0.05,
    aligningComplianceSteer: 0.82,
    mechanicalTrail: 0.025
  },
  rear: {
    rollCamber: 0.85,
    rollSteer: 0.12,
    lateralComplianceSteer: 0.04,
    aligningComplianceSteer: 0.06,
    mechanicalTrail: 0
  }
}

/** Everything rigid and kinematically perfect -- only the basic row survives. */
export const NO_COMPLIANCE: SuspensionCompliance = {
  front: {
    rollCamber: 0,
    rollSteer: 0,
    lateralComplianceSteer: 0,
    aligningComplianceSteer: 0,
    mechanicalTrail: 0
  },
  rear: {
    rollCamber: 0,
    rollSteer: 0,
    lateralComplianceSteer: 0,
    aligningComplianceSteer: 0,
    mechanicalTrail: 0
  }
}

export interface BudgetOptions {
  vehicle: BicycleVehicle
  chassis: ChassisParams
  tireFront: TireModel
  tireRear: TireModel
  compliance: SuspensionCompliance
  /**
   * Lateral acceleration at which the load-dependent rows are evaluated, g.
   *
   * The budget is a linear construction but two of its rows are not: pneumatic
   * trail collapses as the tyre saturates, so both aligning-torque rows shrink
   * toward the limit. Ch 23 §4 flags this as a contributor to the SHAPE of
   * K(Ay). A budget quoted without the Ay it was evaluated at is incomplete.
   */
  ay?: number
  /**
   * Treat the tyres as having no pneumatic trail.
   *
   * Isolates the other rows, and lets a quoted TOTAL trail (Ch 19 Exercise 19.4
   * gives 45 mm) be supplied through `mechanicalTrail` alone without the tyre
   * model adding its own on top.
   */
  ignorePneumaticTrail?: boolean
}

/** Pneumatic trail and slip angle an axle is running at a given Ay. */
function axleState(
  tire: TireModel,
  axleWeight: number,
  axleStiffness: number,
  ay: number
): { alpha: number; trail: number } {
  const alpha = axleStiffness > 0 ? (axleWeight * ay) / axleStiffness : 0
  return { alpha, trail: tire.pneumaticTrail(alpha, axleWeight / 2) }
}

/**
 * The full six-row budget.
 *
 * Row by row, with the chapter that supplies the physics:
 *
 * 1. Weight / cornering stiffness (Ch 5) -- W/C at each axle. Usually most of it.
 * 2. Aligning torque on the rigid body (Ch 2) -- the tyre's Mz is an extra yaw
 *    moment on the CAR, which is the same as saying each axle's resultant acts
 *    a pneumatic trail behind its centre. That moves the demand split away from
 *    the static one, and always toward the front: stabilising.
 * 3. Roll camber (Ch 17) -- roll leans the wheels out of the turn, camber thrust
 *    opposes the turn, and the axle needs extra slip angle to make up for it.
 * 4. Roll steer (Ch 19) -- the axle toes itself in roll.
 * 5. Lateral force compliance steer (Ch 23) -- Fy at the patch steers the wheel.
 * 6. Aligning torque compliance steer (Ch 23, measured in Ch 19 Ex 19.4) -- Mz
 *    steers the wheel back out of the turn through the steering system.
 */
export function understeerBudget(o: BudgetOptions): UndersteerBudget {
  const { vehicle: v, chassis: c, compliance } = o
  const ay = o.ay ?? 0.5
  const { a, b, cf, cr } = v
  const { w, wf, wr, L } = derive(v)
  const rollGradientDeg = deriveChassis(v, c).rollGradientDeg

  const basic = basicBudgetLine(v)
  const front = axleState(o.tireFront, wf, cf, ay)
  const rear = axleState(o.tireRear, wr, cr, ay)
  const tf = o.ignorePneumaticTrail ? 0 : front.trail
  const tr = o.ignorePneumaticTrail ? 0 : rear.trail

  // --- 2. Aligning torque on the rigid body -------------------------------
  // Each axle's resultant lateral force acts a pneumatic trail BEHIND the
  // wheel centre, so the front force's moment arm shrinks to (a - t_f) and the
  // rear's grows to (b + t_r). Moment balance then demands
  //     Fyf / Fyr = (b + t_r) / (a - t_f)
  // which is a larger front share than the static b/a. The front therefore
  // needs more slip angle than the basic row says, and the rear less: the
  // tyre's own self-aligning torque is an understeer contribution, which is
  // the analytical form of "pneumatic trail is stabilising".
  const lPrime = L - tf + tr
  const wfTrail = (w * (b + tr)) / lPrime
  const wrTrail = (w * (a - tf)) / lPrime
  const aligningRigid: BudgetLine = {
    mechanism: 'Aligning torque on the rigid body',
    front: ((wfTrail - wf) / cf) * R2D,
    rear: ((wrTrail - wr) / cr) * R2D,
    chapter: 'Ch 2'
  }

  // --- 3. Roll camber -----------------------------------------------------
  // Camber gained in roll leans the wheels out of the turn, and camber thrust
  // follows the lean -- so it fights the corner. The axle makes up the missing
  // force with extra slip angle:
  //     Delta alpha = (C_gamma / C_alpha) * gamma
  // and gamma per g is just the roll gradient times the camber coefficient.
  // Note the whole row is proportional to the ROLL GRADIENT, which is why a
  // formula car with 0.3 deg/g of roll can tolerate mediocre camber curves and
  // a 4 deg/g sedan cannot (Ch 17).
  const camberRatio = (tire: TireModel, axleWeight: number): number =>
    tire.corneringStiffness(axleWeight / 2) > 0
      ? tire.camberStiffness(axleWeight / 2) / tire.corneringStiffness(axleWeight / 2)
      : 0
  const rollCamber: BudgetLine = {
    mechanism: 'Roll camber',
    front: camberRatio(o.tireFront, wf) * compliance.front.rollCamber * rollGradientDeg,
    rear: camberRatio(o.tireRear, wr) * compliance.rear.rollCamber * rollGradientDeg,
    chapter: 'Ch 17'
  }

  // --- 4. Roll steer ------------------------------------------------------
  const rollSteer: BudgetLine = {
    mechanism: 'Roll steer',
    front: -compliance.front.rollSteer * rollGradientDeg,
    rear: -compliance.rear.rollSteer * rollGradientDeg,
    chapter: 'Ch 19'
  }

  // --- 5. Lateral force compliance steer ----------------------------------
  // Force per g at an axle is just its static weight, so deg/kN times kN/g is
  // deg/g directly.
  const lateralCompliance: BudgetLine = {
    mechanism: 'Lateral force compliance steer',
    front: -compliance.front.lateralComplianceSteer * (wf / 1000),
    rear: -compliance.rear.lateralComplianceSteer * (wr / 1000),
    chapter: 'Ch 23'
  }

  // --- 6. Aligning torque compliance steer --------------------------------
  // Mz about the STEERING axis, so total trail: pneumatic plus mechanical.
  // (The rigid-body row above used pneumatic trail alone -- caster moves the
  // steering axis, not the point on the ground where the force acts.) The
  // torque is restoring, so the compliance always gives up steer and the row is
  // always an understeer contribution at both ends.
  const mzFront = (wf * (tf + compliance.front.mechanicalTrail)) / 1000
  const mzRear = (wr * (tr + compliance.rear.mechanicalTrail)) / 1000
  const aligningCompliance: BudgetLine = {
    mechanism: 'Aligning torque compliance steer',
    front: compliance.front.aligningComplianceSteer * mzFront,
    rear: compliance.rear.aligningComplianceSteer * mzRear,
    chapter: 'Ch 23'
  }

  return sumBudget([
    basic,
    aligningRigid,
    rollCamber,
    rollSteer,
    lateralCompliance,
    aligningCompliance
  ])
}

/**
 * How much of the total each row is responsible for, as a share of |K|.
 *
 * The reason the budget exists: "the car understeers" is a complaint, "62% of
 * the understeer is the basic weight-over-stiffness term and 18% is steering
 * compliance you could design out" is a plan.
 */
export function budgetShares(
  budget: UndersteerBudget
): { mechanism: string; k: number; share: number }[] {
  const contributions = budget.lines.map((l) => ({ mechanism: l.mechanism, k: l.front - l.rear }))
  const total = contributions.reduce((s, c) => s + Math.abs(c.k), 0)
  return contributions.map((c) => ({ ...c, share: total > 0 ? Math.abs(c.k) / total : 0 }))
}

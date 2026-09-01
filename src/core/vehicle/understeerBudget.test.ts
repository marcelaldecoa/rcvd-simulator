/**
 * The understeer budget -- Ch 5 §4.1 with the physics from Ch 2, 17, 19 and 23.
 *
 * The budget's whole claim is that the rows are independent and additive, so
 * the tests are mostly of the form "turn one row on, check the sign and size of
 * what it does to K, check nothing else moved". Where a chapter quotes a
 * number -- Ch 19 Exercise 19.4 measures 0.18 deg/g of apparent understeer from
 * steering compliance alone -- that number is the assertion.
 */

import { describe, expect, it } from 'vitest'
import { FORMULA_CAR, derive, type BicycleVehicle } from './params.js'
import { FORMULA_CHASSIS, deriveChassis, type ChassisParams } from './chassis.js'
import { summarise } from './steadyState.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire } from '../tire/scale.js'
import {
  FORMULA_COMPLIANCE,
  NO_COMPLIANCE,
  SEDAN_COMPLIANCE,
  budgetShares,
  understeerBudget,
  type BudgetOptions,
  type SuspensionCompliance
} from './understeerBudget.js'

const tireF = new MagicFormulaTire(DEFAULT_MF)
const tireR = new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3))

const base: BudgetOptions = {
  vehicle: FORMULA_CAR,
  chassis: FORMULA_CHASSIS,
  tireFront: tireF,
  tireRear: tireR,
  compliance: NO_COMPLIANCE,
  ignorePneumaticTrail: true
}

/** Only the named axle's named coefficient is non-zero. */
function only(
  axle: 'front' | 'rear',
  key: keyof SuspensionCompliance['front'],
  value: number
): SuspensionCompliance {
  return {
    ...NO_COMPLIANCE,
    [axle]: { ...NO_COMPLIANCE[axle], [key]: value }
  } as SuspensionCompliance
}

describe('the construction itself -- Ch 5 §4.1', () => {
  it('has six rows, each naming the chapter that supplies it', () => {
    const b = understeerBudget({ ...base, compliance: SEDAN_COMPLIANCE })
    expect(b.lines).toHaveLength(6)
    expect(b.lines.map((l) => l.chapter)).toEqual([
      'Ch 5',
      'Ch 2',
      'Ch 17',
      'Ch 19',
      'Ch 23',
      'Ch 23'
    ])
  })

  it('collapses to the Ch 5 answer when everything is rigid and perfect', () => {
    // A rigid, kinematically ideal car with no pneumatic trail has nothing in
    // rows 2-6, so the budget must reproduce the elementary K exactly.
    const b = understeerBudget(base)
    for (const l of b.lines.slice(1)) {
      expect(l.front).toBeCloseTo(0, 12)
      expect(l.rear).toBeCloseTo(0, 12)
    }
    expect(b.K).toBeCloseTo(summarise(FORMULA_CAR).KDeg, 12)
  })

  it('sums the columns and differences them -- nothing more', () => {
    const b = understeerBudget({ ...base, compliance: SEDAN_COMPLIANCE, ignorePneumaticTrail: false })
    expect(b.Df).toBeCloseTo(
      b.lines.reduce((s, l) => s + l.front, 0),
      12
    )
    expect(b.Dr).toBeCloseTo(
      b.lines.reduce((s, l) => s + l.rear, 0),
      12
    )
    expect(b.K).toBeCloseTo(b.Df - b.Dr, 12)
  })

  it('is additive: rows applied together equal rows applied apart', () => {
    // The claim that justifies the whole table. Two mechanisms at once must
    // move K by exactly what each moves it alone.
    const k = (c: SuspensionCompliance): number =>
      understeerBudget({ ...base, compliance: c }).K
    const rollSteerOnly = only('rear', 'rollSteer', 0.12)
    const complianceOnly = only('front', 'lateralComplianceSteer', 0.05)
    const both: SuspensionCompliance = {
      front: complianceOnly.front,
      rear: rollSteerOnly.rear
    }
    const k0 = k(NO_COMPLIANCE)
    expect(k(both) - k0).toBeCloseTo(k(rollSteerOnly) - k0 + (k(complianceOnly) - k0), 12)
  })
})

describe('Ch 2 -- aligning torque on the rigid body', () => {
  const withTrail = understeerBudget({ ...base, ignorePneumaticTrail: false })
  const row = withTrail.lines[1]

  it('is stabilising: pneumatic trail always adds understeer', () => {
    // The resultant acts a trail BEHIND each wheel centre, shortening the
    // front moment arm and lengthening the rear, so moment balance hands the
    // front a larger share of the demand than the static split would.
    expect(row.front).toBeGreaterThan(0)
    expect(row.rear).toBeLessThan(0)
    expect(withTrail.K).toBeGreaterThan(understeerBudget(base).K)
  })

  it('moves the demand split exactly as the shifted moment arms require', () => {
    const { a, b, cf, cr } = FORMULA_CAR
    const { w, wf, wr, L } = derive(FORMULA_CAR)
    const tf = tireF.pneumaticTrail((wf * 0.5) / cf, wf / 2)
    const tr = tireR.pneumaticTrail((wr * 0.5) / cr, wr / 2)
    const lPrime = L - tf + tr
    expect(row.front).toBeCloseTo((((w * (b + tr)) / lPrime - wf) / cf) * (180 / Math.PI), 9)
    expect(row.rear).toBeCloseTo((((w * (a - tf)) / lPrime - wr) / cr) * (180 / Math.PI), 9)
  })

  it('fades toward the limit, because pneumatic trail does', () => {
    // Ch 2: trail collapses as the contact patch slides. Ch 23 §4 points out
    // the consequence -- the aligning-torque rows shrink with Ay, so they
    // shape K(Ay) rather than merely offsetting it.
    const low = understeerBudget({ ...base, ignorePneumaticTrail: false, ay: 0.2 })
    const high = understeerBudget({ ...base, ignorePneumaticTrail: false, ay: 1.4 })
    expect(high.lines[1].front).toBeLessThan(low.lines[1].front)
    expect(high.K).toBeLessThan(low.K)
  })
})

describe('Ch 17 -- roll camber', () => {
  it('costs an axle slip angle, because camber thrust fights the corner', () => {
    const b = understeerBudget({ ...base, compliance: only('front', 'rollCamber', 0.78) })
    expect(b.lines[2].front).toBeGreaterThan(0)
    expect(b.lines[2].rear).toBe(0)
    expect(b.K).toBeGreaterThan(understeerBudget(base).K)
  })

  it('scales with the roll gradient, not with the camber curve alone', () => {
    // Ch 17's design argument in one assertion: a formula car with almost no
    // roll can tolerate a mediocre camber curve, because the row is the PRODUCT
    // of the two and one of the factors is nearly zero.
    const compliance = only('front', 'rollCamber', 0.78)
    const soft: ChassisParams = {
      ...FORMULA_CHASSIS,
      springRollStiffnessFront: FORMULA_CHASSIS.springRollStiffnessFront * 0.2,
      springRollStiffnessRear: FORMULA_CHASSIS.springRollStiffnessRear * 0.2,
      barRollStiffnessFront: FORMULA_CHASSIS.barRollStiffnessFront * 0.2,
      barRollStiffnessRear: FORMULA_CHASSIS.barRollStiffnessRear * 0.2
    }
    const stiffRow = understeerBudget({ ...base, compliance }).lines[2].front
    const softRow = understeerBudget({ ...base, chassis: soft, compliance }).lines[2].front
    const ratio =
      deriveChassis(FORMULA_CAR, soft).rollGradientDeg /
      deriveChassis(FORMULA_CAR, FORMULA_CHASSIS).rollGradientDeg
    expect(ratio).toBeGreaterThan(3)
    expect(softRow / stiffRow).toBeCloseTo(ratio, 9)
  })
})

describe('Ch 19 -- roll steer', () => {
  it('makes rear roll understeer stabilising', () => {
    // Ch 19 §5. A rear axle that steers into the turn in roll acts like a
    // little rear-wheel steering in phase with the front, so the driver has to
    // add lock: understeer.
    const b = understeerBudget({ ...base, compliance: only('rear', 'rollSteer', 0.12) })
    expect(b.K).toBeGreaterThan(understeerBudget(base).K)
  })

  it('makes rear roll oversteer destabilising, by the same magnitude', () => {
    const k0 = understeerBudget(base).K
    const under = understeerBudget({ ...base, compliance: only('rear', 'rollSteer', 0.12) }).K
    const over = understeerBudget({ ...base, compliance: only('rear', 'rollSteer', -0.12) }).K
    expect(over).toBeLessThan(k0)
    expect(under - k0).toBeCloseTo(k0 - over, 12)
  })

  it('reverses sign at the front', () => {
    const k0 = understeerBudget(base).K
    const front = understeerBudget({ ...base, compliance: only('front', 'rollSteer', 0.12) }).K
    const rear = understeerBudget({ ...base, compliance: only('rear', 'rollSteer', 0.12) }).K
    expect(front).toBeLessThan(k0)
    expect(rear).toBeGreaterThan(k0)
  })
})

describe('Ch 23 -- compliance steer', () => {
  it('agrees with Ch 23 §4 on which end wants which direction', () => {
    // "Toe-out under lateral load at the front -> more front force ->
    //  oversteer. Toe-in at the rear -> more rear force -> understeer."
    // Both are the axle steering INTO the turn under its own lateral force;
    // the opposite outcomes come from the minus sign in K = Df - Dr.
    const k0 = understeerBudget(base).K
    const front = understeerBudget({
      ...base,
      compliance: only('front', 'lateralComplianceSteer', 0.05)
    }).K
    const rear = understeerBudget({
      ...base,
      compliance: only('rear', 'lateralComplianceSteer', 0.05)
    }).K
    expect(front).toBeLessThan(k0)
    expect(rear).toBeGreaterThan(k0)
  })

  it('reproduces Ch 19 Exercise 19.4: 0.18 deg/g of apparent understeer', () => {
    // The exercise's own car and numbers: a front axle making 6800 N at 1.4 g
    // over 45 mm of total trail is 306 N.m, and a steering system giving 0.9
    // deg of handwheel per 100 N.m through an 11:1 ratio loses 0.25 deg of
    // road-wheel steer -- which reads as 0.18 deg/g of understeer that the car
    // does not actually have.
    const mass = 6800 / (1.4 * 9.80665) // a car whose front axle carries 6800 N at 1.4 g
    const exercise: BicycleVehicle = {
      ...FORMULA_CAR,
      mass: mass * 2,
      a: 1.5,
      b: 1.5
    }
    const perNm = 0.9 / 100 / 11 // deg of road wheel per N.m
    const compliance: SuspensionCompliance = {
      ...NO_COMPLIANCE,
      front: {
        ...NO_COMPLIANCE.front,
        aligningComplianceSteer: perNm * 1000, // deg per kN.m
        mechanicalTrail: 0.045
      }
    }
    const b = understeerBudget({
      ...base,
      vehicle: exercise,
      compliance,
      // The exercise quotes 45 mm as the TOTAL trail, so the pneumatic part is
      // already inside it; leave the tyre's own out to avoid counting it twice.
      ignorePneumaticTrail: true
    })
    const { wf } = derive(exercise)
    expect(wf).toBeCloseTo(6800 / 1.4, 6)
    expect(b.lines[5].front).toBeCloseTo(0.18, 2)
    expect(b.K - understeerBudget({ ...base, vehicle: exercise }).K).toBeCloseTo(0.18, 2)
  })

  it('always adds understeer, at either end, because Mz is restoring', () => {
    const k0 = understeerBudget(base).K
    const front = understeerBudget({
      ...base,
      compliance: only('front', 'aligningComplianceSteer', 0.8),
      ignorePneumaticTrail: false
    })
    expect(front.lines[5].front).toBeGreaterThan(0)
    expect(front.K).toBeGreaterThan(k0)
  })
})

describe('the table as a diagnostic', () => {
  it('leaves the basic term dominant but lets the rest change the character', () => {
    // Ch 5 §4.1's exact claim about the book's passenger-car example.
    const b = understeerBudget({
      ...base,
      compliance: SEDAN_COMPLIANCE,
      ignorePneumaticTrail: false
    })
    const shares = budgetShares(b)
    expect(shares[0].share).toBeGreaterThan(0.4)
    const rest = shares.slice(1).reduce((s, r) => s + Math.abs(r.k), 0)
    const bare = understeerBudget(base).K
    expect(rest).toBeGreaterThan(0.1)
    expect(Math.abs(b.K - bare)).toBeGreaterThan(0.1)
  })

  it('names a mechanism to blame, which is the point of building it', () => {
    const b = understeerBudget({
      ...base,
      compliance: SEDAN_COMPLIANCE,
      ignorePneumaticTrail: false
    })
    const shares = budgetShares(b)
    expect(shares.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 9)
    // Every row is attributed; none is silently dropped.
    expect(shares).toHaveLength(6)
    expect(shares.map((s) => s.mechanism)).toEqual(b.lines.map((l) => l.mechanism))
  })

  it('makes a race car a much shorter story than a road car', () => {
    const race = understeerBudget({
      ...base,
      compliance: FORMULA_COMPLIANCE,
      ignorePneumaticTrail: false
    })
    const road = understeerBudget({
      ...base,
      compliance: SEDAN_COMPLIANCE,
      ignorePneumaticTrail: false
    })
    const nonBasic = (b: typeof race): number =>
      b.lines.slice(1).reduce((s, l) => s + Math.abs(l.front - l.rear), 0)
    expect(nonBasic(race)).toBeLessThan(nonBasic(road))
  })
})

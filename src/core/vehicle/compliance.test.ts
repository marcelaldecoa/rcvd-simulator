/**
 * Compliances -- Ch 23.
 *
 * Every exercise here quotes a number, and several of them are the numbers that
 * explain common paddock experiences: why a bigger bar did nothing, why a car
 * measured on a rig disagrees with the same car computed on paper, why a static
 * camber that was right at one lateral acceleration is wrong at another.
 */

import { describe, expect, it } from 'vitest'
import {
  RACE_COMPLIANCE_TARGETS,
  ROAD_COMPLIANCE_TARGETS,
  camberBudget,
  camberMoment,
  carcassDeflection,
  chassisDilution,
  complianceCamber,
  complianceSteer,
  complianceSteerBudget,
  nominalForEffective,
  seriesRate,
  seriesUpgrade
} from './compliance.js'
import { understeerBudget, NO_COMPLIANCE } from './understeerBudget.js'
import { FORMULA_CAR } from './params.js'
import { FORMULA_CHASSIS } from './chassis.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire } from '../tire/scale.js'

describe('Ch 23 Exercise 23.1 -- why the bigger bar did nothing', () => {
  const u = seriesUpgrade(28, 40, 45)

  it('makes a 28 kN.m/rad bar behave like 17.3', () => {
    expect(u.before).toBeCloseTo(17.26, 2)
    expect(u.lossBefore).toBeCloseTo(0.384, 3)
  })

  it('makes the 40 behave like 21.2', () => {
    expect(u.after).toBeCloseTo(21.18, 2)
  })

  it('delivers only a third of the intended increase', () => {
    expect(u.intended).toBe(12)
    expect(u.realized).toBeCloseTo(3.92, 2)
    // 0.3263 exactly; the notes' 0.327 comes from dividing their own rounded
    // 3.92 by 12.
    expect(u.realizedFraction).toBeCloseTo(0.326, 3)
  })

  it('shows the mount rate is a ceiling no bar can pass', () => {
    // The remedy is stiffer mounts, not a bigger bar: even an infinite bar
    // asymptotes to the mount's own 45.
    expect(seriesUpgrade(28, 1e9, 45).after).toBeCloseTo(45, 4)
    expect(u.ceiling).toBe(45)
    expect(nominalForEffective(50, 45)).toBe(0)
  })

  it('inverts to the bar a wanted effective rate needs', () => {
    // Round-tripped through the unrounded effective rate, since the series
    // relation is steep enough here that the notes' 21.18 is 40.01 back.
    const nominal = nominalForEffective(u.after, 45)
    expect(nominal).toBeCloseTo(40, 9)
    expect(seriesRate(nominal, 45)).toBeCloseTo(u.after, 9)
  })

  it('gets worse the stiffer the intended element already is', () => {
    // Diminishing returns are the signature of a series relation. Going 28->40
    // realizes 33%; going 60->72 realizes much less.
    expect(seriesUpgrade(60, 72, 45).realizedFraction).toBeLessThan(u.realizedFraction)
  })
})

describe('Ch 23 Exercises 23.2 and 23.3 -- compliance steer at both ends', () => {
  const front = complianceSteer({
    coefficient: 0.12,
    axleLateralForce: 6200,
    ay: 1.5,
    axle: 'front'
  })
  const rear = complianceSteer({
    coefficient: 0.09,
    axleLateralForce: 6900,
    ay: 1.5,
    axle: 'rear'
  })

  it('gets 0.744 deg at the front and -0.496 deg/g of oversteer', () => {
    expect(front.steer).toBeCloseTo(0.744, 3)
    expect(front.deltaK).toBeCloseTo(-0.496, 3)
  })

  it('gets 0.621 deg at the rear and +0.414 deg/g of understeer', () => {
    expect(rear.steer).toBeCloseTo(0.621, 3)
    expect(rear.deltaK).toBeCloseTo(0.414, 3)
  })

  it('nets to a small -0.082 deg/g while each term is large', () => {
    const b = complianceSteerBudget({
      frontCoefficient: 0.12,
      rearCoefficient: 0.09,
      frontForce: 6200,
      rearForce: 6900,
      ay: 1.5
    })
    expect(b.net).toBeCloseTo(-0.082, 3)
    expect(b.gross).toBeCloseTo(0.91, 2)
    expect(b.cancellation).toBeGreaterThan(0.9)
  })

  it('shows why a small net is not the same as small compliance', () => {
    // Ch 23's caution: the cancellation holds at ONE lateral acceleration and
    // one load split. Move the load split and it stops holding, while a car
    // with genuinely small coefficients stays small everywhere.
    const balanced = complianceSteerBudget({
      frontCoefficient: 0.12,
      rearCoefficient: 0.09,
      frontForce: 6200,
      rearForce: 3000,
      ay: 1.5
    })
    const stiff = complianceSteerBudget({
      frontCoefficient: 0.02,
      rearCoefficient: 0.015,
      frontForce: 6200,
      rearForce: 3000,
      ay: 1.5
    })
    expect(Math.abs(balanced.net)).toBeGreaterThan(Math.abs(stiff.net) * 3)
  })

  it('agrees with the sign convention the understeer budget uses', () => {
    // The budget's rows and this module must not disagree about which way a
    // positive coefficient pushes the car, or the two chapters contradict.
    const opts = {
      vehicle: FORMULA_CAR,
      chassis: FORMULA_CHASSIS,
      tireFront: new MagicFormulaTire(DEFAULT_MF),
      tireRear: new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3)),
      ignorePneumaticTrail: true
    }
    const base = understeerBudget({ ...opts, compliance: NO_COMPLIANCE })
    const frontOnly = understeerBudget({
      ...opts,
      compliance: {
        ...NO_COMPLIANCE,
        front: { ...NO_COMPLIANCE.front, lateralComplianceSteer: 0.12 }
      }
    })
    const rearOnly = understeerBudget({
      ...opts,
      compliance: {
        ...NO_COMPLIANCE,
        rear: { ...NO_COMPLIANCE.rear, lateralComplianceSteer: 0.09 }
      }
    })
    expect(frontOnly.K).toBeLessThan(base.K)
    expect(rearOnly.K).toBeGreaterThan(base.K)
  })

  it('meets the race target and misses it by an order of magnitude on a road car', () => {
    expect(RACE_COMPLIANCE_TARGETS.lateralSteer).toBeLessThan(0.05)
    expect(ROAD_COMPLIANCE_TARGETS.lateralSteer).toBeGreaterThan(0.2)
  })
})

describe('Ch 23 Exercises 23.4 and 23.5 -- camber and the carcass', () => {
  it('applies 1650 N.m to the upright at 5000 N', () => {
    expect(camberMoment(5000, 0.33)).toBeCloseTo(1650, 6)
  })

  it('gets -2.95 deg of static camber, 19% of it just covering deflection', () => {
    const b = camberBudget({
      targetCamber: -2.0,
      rollLoss: 1.2,
      geometryGain: 0.8,
      complianceLoss: 0.55
    })
    expect(b.staticCamber).toBeCloseTo(-2.95, 2)
    expect(b.complianceShare).toBeCloseTo(0.186, 3)
  })

  it('makes compliance camber load-dependent, not a fixed offset', () => {
    // Which is why a static camber correct at one Ay is wrong at another, and
    // why this shows up as a nonlinearity in K(Ay) no kinematic model predicts.
    const at08 = complianceCamber(5000 * (0.8 / 1.5), 0.11)
    const at20 = complianceCamber(5000 * (2.0 / 1.5), 0.11)
    expect(at20 / at08).toBeCloseTo(2.5, 2)
  })

  it('gets 14.5 mm of carcass deflection and an apparent 4.6 deg', () => {
    const c = carcassDeflection(5500, 380, 180)
    expect(c.deflectionMm).toBeCloseTo(14.47, 2)
    expect(c.apparentSlipDeg).toBeCloseTo(4.6, 1)
  })

  it('makes the carcass comparable to the entire tread mechanism', () => {
    // The exercise's real point: this is an overestimate of the ADDITIONAL
    // slip angle precisely because a measured cornering stiffness already
    // contains the carcass. It is one of the two springs, not a correction.
    const c = carcassDeflection(5500, 380, 180)
    expect(c.apparentSlipDeg).toBeGreaterThan(3)
  })

  it('stiffens away with a stiffer carcass, which is what pressure does', () => {
    const soft = carcassDeflection(5500, 380, 180)
    const hard = carcassDeflection(5500, 460, 180)
    expect(hard.deflectionMm).toBeLessThan(soft.deflectionMm)
  })
})

describe('Ch 23 Exercise 23.6 -- chassis torsion dilutes every setup change', () => {
  const d = chassisDilution(3800, 46000, 40000)

  it('converts 3800 N.m/deg to 217.7 kN.m/rad', () => {
    expect(d.chassisRate / 1000).toBeCloseTo(217.7, 1)
  })

  it('realizes only about 72% of an intended TLLTD change', () => {
    expect(d.effectiveness).toBeCloseTo(0.717, 3)
  })

  it('passes the book criterion while failing the heuristic one', () => {
    // Against the front/rear DIFFERENCE the chassis is 36 times stiffer -- the
    // book's own test, comfortably met. Against 5-10x the TOTAL roll stiffness
    // it falls short. Both readings are in the notes, and the honest conclusion
    // is that the chassis transmits the differential torque adequately while
    // still diluting setup changes enough to be worth measuring.
    expect(d.differenceRatio).toBeCloseTo(36.3, 1)
    expect(d.chassisToAxleRatio).toBeCloseTo(2.53, 2)
    expect(d.chassisToAxleRatio).toBeLessThan(5)
  })

  it('approaches full effectiveness as the chassis stiffens', () => {
    expect(chassisDilution(40000, 46000, 40000).effectiveness).toBeGreaterThan(0.94)
    expect(chassisDilution(1e9, 46000, 40000).effectiveness).toBeCloseTo(1, 4)
  })

  it('collapses on a genuinely soft chassis', () => {
    expect(chassisDilution(800, 46000, 40000).effectiveness).toBeLessThan(0.4)
  })
})

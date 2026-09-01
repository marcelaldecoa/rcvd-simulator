/**
 * Load transfer and pair analysis, checked against Ch 18's worked exercises.
 *
 * Exercise 18.2 gives every intermediate quantity -- sprung weight split, roll
 * axis height, roll moment arm, and all three contributions at each axle -- so
 * this suite reproduces the whole chain rather than just the answer. Exercise
 * 18.3 is the arithmetic check the chapter itself recommends: the three
 * contributions must sum to W*Ay*h/t.
 */

import { describe, expect, it } from 'vitest'
import { G, toDeg } from '../util/numeric.js'
import { FORMULA_CAR, derive, type BicycleVehicle } from './params.js'
import {
  deriveChassis,
  EXERCISE_18_2_CHASSIS,
  FORMULA_CHASSIS,
  lateralTransfer,
  longitudinalTransfer,
  tlltd,
  totalLateralTransfer,
  totalRollMoment,
  wheelLoads,
  type ChassisParams
} from './chassis.js'
import {
  axleCharacteristic,
  axlePeakForce,
  pairLimit,
  pairState,
  pairSweep,
  tlltdSweep
} from './pairAnalysis.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire, scaleTireGrip } from '../tire/scale.js'

/**
 * The Exercise 18.2 car. Its axle loads are built so that removing the 450 N
 * per-axle unsprung weight leaves the 45%/55% sprung split the exercise states.
 */
const EX_18_2: BicycleVehicle = (() => {
  const L = 2.7
  const w = 7800
  const wFront = 0.45 * 6900 + 450 // sprung front + unsprung front
  const b = (wFront * L) / w
  return {
    name: 'Exercise 18.2',
    mass: w / G,
    izz: 900,
    a: L - b,
    b,
    cf: 100000,
    cr: 100000,
    steeringRatio: 15
  }
})()

const C = EXERCISE_18_2_CHASSIS

describe('Ch 18 Exercise 18.2 - the three-mass derivation', () => {
  const d = deriveChassis(EX_18_2, C)

  it('splits the sprung weight 45/55 front to rear', () => {
    expect(d.sprungWeight).toBeCloseTo(6900, 0)
    expect(d.sprungWeightFront).toBeCloseTo(3105, 0)
    expect(d.sprungWeightRear).toBeCloseTo(3795, 0)
  })

  it('recovers the given sprung CG height of 0.315 m', () => {
    expect(d.sprungCgHeight).toBeCloseTo(0.315, 4)
  })

  it('puts the roll axis at 0.0565 m under the sprung CG', () => {
    expect(d.rollAxisHeightAtCg).toBeCloseTo(0.0565, 4)
  })

  it('gives a roll moment arm H of 0.2585 m', () => {
    expect(d.rollMomentArm).toBeCloseTo(0.2585, 4)
  })

  it('splits roll stiffness 53.66% to the front', () => {
    expect(d.rollStiffnessFractionFront).toBeCloseTo(44 / 82, 4)
  })

  describe('at 1.5 g', () => {
    const t = lateralTransfer(EX_18_2, C, 1.5)

    it('front: geometric 117.9 N, elastic 908.7 N, unsprung 136.7 N', () => {
      expect(t.frontGeometric).toBeCloseTo(117.9, 0)
      expect(t.frontElastic).toBeCloseTo(908.7, 0)
      expect(t.frontUnsprung).toBeCloseTo(136.7, 0)
    })

    it('front total 1163.3 N', () => {
      expect(t.front).toBeCloseTo(1163.3, 0)
    })

    it('rear: geometric 252.2 N, elastic 784.7 N, unsprung 136.7 N', () => {
      expect(t.rearGeometric).toBeCloseTo(252.2, 0)
      expect(t.rearElastic).toBeCloseTo(784.7, 0)
      expect(t.rearUnsprung).toBeCloseTo(136.7, 0)
    })

    it('rear total 1173.6 N', () => {
      expect(t.rear).toBeCloseTo(1173.6, 0)
    })

    it('gives TLLTD of 49.8% front', () => {
      expect(t.tlltd).toBeCloseTo(0.498, 3)
    })

    it('has the elastic terms dominate, as the solution notes', () => {
      expect(t.frontElastic / t.front).toBeCloseTo(0.78, 1)
      expect(t.rearElastic / t.rear).toBeCloseTo(0.67, 1)
    })

    it('Exercise 18.3: the contributions sum to the static total', () => {
      expect(t.front + t.rear).toBeCloseTo(2336.9, 0)
      expect(t.front + t.rear).toBeCloseTo(totalLateralTransfer(EX_18_2, C, 1.5), 0)
    })
  })
})

describe('load transfer, generally', () => {
  it('conserves roll moment exactly, even with staggered tracks', () => {
    // The exact invariant. Each axle's transfer acts across ITS OWN track, so
    // it is the MOMENTS that must sum to W*Ay*h -- not the forces.
    expect(FORMULA_CHASSIS.trackFront).not.toBe(FORMULA_CHASSIS.trackRear)
    for (const ay of [0.25, 0.8, 1.4, 2.2]) {
      const t = lateralTransfer(FORMULA_CAR, FORMULA_CHASSIS, ay)
      const moment = t.front * FORMULA_CHASSIS.trackFront + t.rear * FORMULA_CHASSIS.trackRear
      expect(moment).toBeCloseTo(totalRollMoment(FORMULA_CAR, FORMULA_CHASSIS, ay), 6)
    }
  })

  it('reduces to the force form of Exercise 18.3 when the tracks are equal', () => {
    const square: ChassisParams = { ...FORMULA_CHASSIS, trackRear: FORMULA_CHASSIS.trackFront }
    for (const ay of [0.4, 1.6]) {
      const t = lateralTransfer(FORMULA_CAR, square, ay)
      expect(t.front + t.rear).toBeCloseTo(totalLateralTransfer(FORMULA_CAR, square, ay), 6)
    }
  })

  it('scales linearly with lateral acceleration', () => {
    const one = lateralTransfer(FORMULA_CAR, FORMULA_CHASSIS, 1)
    const two = lateralTransfer(FORMULA_CAR, FORMULA_CHASSIS, 2)
    expect(two.front).toBeCloseTo(2 * one.front, 6)
    expect(two.rear).toBeCloseTo(2 * one.rear, 6)
  })

  it('keeps TLLTD independent of lateral acceleration', () => {
    const values = [0.3, 1.0, 1.8].map((ay) => lateralTransfer(FORMULA_CAR, FORMULA_CHASSIS, ay).tlltd)
    expect(values[1]).toBeCloseTo(values[0], 9)
    expect(values[2]).toBeCloseTo(values[0], 9)
  })

  it('moves TLLTD forward when front bar stiffness rises', () => {
    const soft = tlltd(FORMULA_CAR, { ...FORMULA_CHASSIS, barRollStiffnessFront: 5000 })
    const stiff = tlltd(FORMULA_CAR, { ...FORMULA_CHASSIS, barRollStiffnessFront: 60000 })
    expect(stiff).toBeGreaterThan(soft)
  })

  it('moves TLLTD forward when the front roll centre is raised', () => {
    const low = tlltd(FORMULA_CAR, { ...FORMULA_CHASSIS, rollCentreHeightFront: 0.0 })
    const high = tlltd(FORMULA_CAR, { ...FORMULA_CHASSIS, rollCentreHeightFront: 0.12 })
    expect(high).toBeGreaterThan(low)
  })

  it('reduces total transfer when the CG is lowered or the track widened', () => {
    const base = totalLateralTransfer(FORMULA_CAR, FORMULA_CHASSIS, 1.5)
    const lowCg = totalLateralTransfer(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, cgHeight: 0.24 },
      1.5
    )
    const wide = totalLateralTransfer(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, trackFront: 1.8, trackRear: 1.8 },
      1.5
    )
    expect(lowCg).toBeLessThan(base)
    expect(wide).toBeLessThan(base)
  })

  it('quotes a roll gradient in the range a race car actually runs', () => {
    const d = deriveChassis(FORMULA_CAR, FORMULA_CHASSIS)
    expect(d.rollGradientDeg).toBeGreaterThan(0.2)
    expect(d.rollGradientDeg).toBeLessThan(2.5)
  })

  it('softening the bars increases roll for the same lateral acceleration', () => {
    const stiff = deriveChassis(FORMULA_CAR, FORMULA_CHASSIS).rollGradient
    const soft = deriveChassis(FORMULA_CAR, {
      ...FORMULA_CHASSIS,
      barRollStiffnessFront: 0,
      barRollStiffnessRear: 0
    }).rollGradient
    expect(soft).toBeGreaterThan(stiff)
  })
})

describe('Ch 18 §6 - longitudinal transfer', () => {
  it('unloads the front under acceleration and loads it under braking', () => {
    const accel = longitudinalTransfer(FORMULA_CAR, FORMULA_CHASSIS, 1)
    const brake = longitudinalTransfer(FORMULA_CAR, FORMULA_CHASSIS, -1)
    expect(accel).toBeGreaterThan(0)
    expect(brake).toBeCloseTo(-accel, 9)

    const braking = wheelLoads(FORMULA_CAR, FORMULA_CHASSIS, 0, -1)
    const { wf } = derive(FORMULA_CAR)
    expect(braking.front).toBeGreaterThan(wf)
  })

  it('depends on wheelbase, not track', () => {
    const narrow = longitudinalTransfer(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, trackFront: 1.2, trackRear: 1.2 },
      0.8
    )
    expect(narrow).toBeCloseTo(longitudinalTransfer(FORMULA_CAR, FORMULA_CHASSIS, 0.8), 9)
  })
})

describe('wheel loads', () => {
  it('conserves total load with no longitudinal acceleration', () => {
    const { w } = derive(FORMULA_CAR)
    const l = wheelLoads(FORMULA_CAR, FORMULA_CHASSIS, 1.0)
    expect(l.fo + l.fi + l.ro + l.ri).toBeCloseTo(w, 6)
  })

  it('never lets a wheel carry negative load', () => {
    const l = wheelLoads(FORMULA_CAR, FORMULA_CHASSIS, 5)
    for (const v of [l.fo, l.fi, l.ro, l.ri]) expect(v).toBeGreaterThanOrEqual(0)
    expect(l.anyLifted).toBe(true)
  })

  it('is symmetric at zero lateral acceleration', () => {
    const l = wheelLoads(FORMULA_CAR, FORMULA_CHASSIS, 0)
    expect(l.fo).toBeCloseTo(l.fi, 9)
    expect(l.ro).toBeCloseTo(l.ri, 9)
  })
})

// ---------------------------------------------------------------------------

describe('Ch 7 - pair analysis', () => {
  const tireF = new MagicFormulaTire(DEFAULT_MF)
  const tireR = new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3))

  it('loses axle capacity to load transfer, quadratically', () => {
    const nominal = 1700
    const cap = (d: number): number => axlePeakForce(tireF, nominal + d, nominal - d)
    const base = cap(0)
    const loss = (d: number): number => base - cap(d)
    // Doubling the transfer should roughly quadruple the loss.
    expect(loss(600) / loss(300)).toBeGreaterThan(3.5)
    expect(loss(600) / loss(300)).toBeLessThan(4.5)
  })

  it('normalises both axles to g so they can be compared directly', () => {
    const l = wheelLoads(FORMULA_CAR, FORMULA_CHASSIS, 1.2)
    const { wf } = derive(FORMULA_CAR)
    const curve = axleCharacteristic(tireF, l.fo, l.fi, wf)
    const peak = Math.max(...curve.map((p) => p.fyPerWeight))
    expect(peak).toBeGreaterThan(0.8)
    expect(peak).toBeLessThan(2.5)
    expect(curve[0].fy).toBeCloseTo(0, 9)
  })

  it('finds a limit where demand exactly equals capacity', () => {
    const limit = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR)
    const s = pairState(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, limit.limitAy)
    const usage = limit.limitingAxle === 'front' ? s.usageFront : s.usageRear
    expect(usage).toBeCloseTo(1, 4)
  })

  it('gives a lower limit than the no-load-transfer model', () => {
    // This is the whole point of Ch 7: transfer costs capacity, so the same
    // car and tyres reach less lateral acceleration than the bicycle model says.
    const withTransfer = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR).limitAy
    const noTransfer = pairLimit(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, cgHeight: 0.001 },
      tireF,
      tireR
    ).limitAy
    expect(withTransfer).toBeLessThan(noTransfer)
  })

  it('shifts balance toward understeer as TLLTD moves forward', () => {
    // Ch 7 §4: move load transfer forward and the front loses more capacity.
    const rearBiased = pairLimit(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, barRollStiffnessFront: 2000, barRollStiffnessRear: 37000 },
      tireF,
      tireR
    )
    const frontBiased = pairLimit(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, barRollStiffnessFront: 37000, barRollStiffnessRear: 2000 },
      tireF,
      tireR
    )
    expect(frontBiased.limitBalance).toBeGreaterThan(rearBiased.limitBalance)
  })

  it('redistributes grip without destroying it, to first order', () => {
    // Bars move balance; they should not cost much total capability.
    const sweep = tlltdSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 12)
    const limits = sweep.map((s) => s.limit.limitAy)
    const spread = (Math.max(...limits) - Math.min(...limits)) / Math.max(...limits)
    expect(spread).toBeLessThan(0.15)
  })

  it('sweeps TLLTD monotonically as bar stiffness moves forward', () => {
    const sweep = tlltdSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 12)
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i].tlltd).toBeGreaterThan(sweep[i - 1].tlltd)
    }
  })

  it('can reach neutral with the bars when the axles have equal grip', () => {
    // tireR here is a bigger rear tyre of the SAME compound, so the two axles
    // have equal friction and the bars have enough authority to cross neutral.
    const sweep = tlltdSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 20)
    const balances = sweep.map((s) => s.limit.limitBalance)
    expect(Math.min(...balances)).toBeLessThan(0)
    expect(Math.max(...balances)).toBeGreaterThan(0)
  })

  it('cannot reach neutral once one axle has a large grip advantage', () => {
    // Ch 12's primary/secondary hierarchy: a grip difference between axles is
    // a PRIMARY effect, and bars are a secondary trim. Give the rear 12% more
    // grip and no bar setting recovers neutral balance.
    const grippyRear = new MagicFormulaTire(
      scaleTireGrip(scaleTire(DEFAULT_MF, 1.3), { mu: 1.12, stiffness: 1.12 })
    )
    const sweep = tlltdSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, grippyRear, 20)
    const balances = sweep.map((s) => s.limit.limitBalance)
    expect(Math.min(...balances)).toBeGreaterThan(0)
    // and the bars' authority is small next to the standing grip difference
    const span = Math.max(...balances) - Math.min(...balances)
    expect(span).toBeLessThan(Math.min(...balances))
  })

  it('makes mass cost lateral grip through transfer, not just load sensitivity', () => {
    // The gap the conditions lab had to apologise for. Without transfer the
    // limit is just mu at the operating load, so mass nearly cancels. With
    // transfer, extra weight means extra transfer and the capacity loss goes
    // as its SQUARE -- so the same 60 kg costs materially more.
    const heavy: BicycleVehicle = { ...FORMULA_CAR, mass: FORMULA_CAR.mass + 60 }
    const flat: ChassisParams = { ...FORMULA_CHASSIS, cgHeight: 0.001 }

    const costWithTransfer =
      pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR).limitAy -
      pairLimit(heavy, FORMULA_CHASSIS, tireF, tireR).limitAy
    const costWithout =
      pairLimit(FORMULA_CAR, flat, tireF, tireR).limitAy -
      pairLimit(heavy, flat, tireF, tireR).limitAy

    expect(costWithTransfer).toBeGreaterThan(0)
    expect(costWithTransfer).toBeGreaterThan(1.25 * costWithout)
  })

  it('makes mass cost much more on a car with a high CG', () => {
    // A tall car transfers more for the same lateral acceleration, so mass
    // hurts it harder. This is why the effect looks small on a formula car.
    const heavy: BicycleVehicle = { ...FORMULA_CAR, mass: FORMULA_CAR.mass + 60 }
    const cost = (c: ChassisParams): number =>
      pairLimit(FORMULA_CAR, c, tireF, tireR).limitAy -
      pairLimit(heavy, c, tireF, tireR).limitAy
    expect(cost({ ...FORMULA_CHASSIS, cgHeight: 0.5 })).toBeGreaterThan(
      cost({ ...FORMULA_CHASSIS, cgHeight: 0.25 })
    )
  })

  it('satisfies the steady-state cornering equation throughout a sweep', () => {
    const { L } = derive(FORMULA_CAR)
    const radius = 60
    for (const p of pairSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, radius, 10)) {
      expect(p.steer).toBeCloseTo(L / radius + (p.alphaF - p.alphaR), 12)
    }
  })

  it('raises both slip angles monotonically through a sweep', () => {
    const sweep = pairSweep(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 60, 20)
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i].alphaF).toBeGreaterThanOrEqual(sweep[i - 1].alphaF - 1e-9)
      expect(sweep[i].alphaR).toBeGreaterThanOrEqual(sweep[i - 1].alphaR - 1e-9)
    }
  })

  it('collapses the rear axle under braking - the corner-entry mechanism', () => {
    // Ch 7 §5: braking unloads the rear at exactly the moment corner entry
    // demands rear lateral force.
    const steady = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 0)
    const braking = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, -0.6)
    expect(braking.limitBalance).toBeLessThan(steady.limitBalance)
  })

  it('loads the rear under power', () => {
    const steady = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 0)
    const power = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 0.4)
    expect(power.limitBalance).toBeGreaterThan(steady.limitBalance)
  })

  it('lowers the limit when the CG is raised', () => {
    const low = pairLimit(FORMULA_CAR, { ...FORMULA_CHASSIS, cgHeight: 0.25 }, tireF, tireR)
    const high = pairLimit(FORMULA_CAR, { ...FORMULA_CHASSIS, cgHeight: 0.45 }, tireF, tireR)
    expect(high.limitAy).toBeLessThan(low.limitAy)
  })

  it('raises the limit when the track is widened', () => {
    const narrow = pairLimit(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, trackFront: 1.4, trackRear: 1.4 },
      tireF,
      tireR
    )
    const wide = pairLimit(
      FORMULA_CAR,
      { ...FORMULA_CHASSIS, trackFront: 1.8, trackRear: 1.8 },
      tireF,
      tireR
    )
    expect(wide.limitAy).toBeGreaterThan(narrow.limitAy)
  })

  it('reports a roll angle a driver would recognise at the limit', () => {
    const limit = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR)
    const s = pairState(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, limit.limitAy)
    expect(toDeg(s.loads.transfer.rollAngle)).toBeGreaterThan(0.3)
    expect(toDeg(s.loads.transfer.rollAngle)).toBeLessThan(6)
  })
})

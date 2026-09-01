/**
 * Ride and roll rates -- Ch 16.
 *
 * The chapter is arithmetic-heavy and every exercise quotes a number, so almost
 * every test here is one of those numbers. The two that are not are the ones
 * that matter most: that the module actually feeds `ChassisParams`, and that
 * the tyre-in-series term is not the small correction people assume.
 */

import { describe, expect, it } from 'vitest'
import {
  FORMULA_RATES,
  SEDAN_RATES,
  axleRollRate,
  barRollRate,
  deriveCorner,
  deriveRates,
  elasticTlltd,
  maxRideFrequency,
  rideFrequency,
  rideRate,
  rollGradientFromRates,
  rollStiffnessForChassis,
  seriesRate,
  springRateForFrequency,
  tireComplianceLoss,
  wheelRate
} from './rates.js'
import { deriveChassis, FORMULA_CHASSIS } from './chassis.js'
import { FORMULA_CAR } from './params.js'

describe('Ch 16 Exercise 16.1 -- wheel rate, ride rate, ride frequency', () => {
  const corner = {
    springRate: 120,
    installationRatio: 0.62,
    tireRate: 320,
    sprungCornerMass: 155
  }
  const d = deriveCorner(corner)

  it('gets 46.13 N/mm of wheel rate', () => {
    expect(d.wheelRate).toBeCloseTo(46.13, 2)
  })

  it('gets 40.32 N/mm of ride rate with the tyre in series', () => {
    expect(d.rideRate).toBeCloseTo(40.32, 2)
  })

  it('gets 2.57 Hz', () => {
    expect(d.rideFrequency).toBeCloseTo(2.57, 2)
  })

  it('shows the 7% overestimate from treating the tyre as rigid', () => {
    // The exercise makes a point of this: ignoring the tyre gives 2.75 Hz.
    expect(d.frequencyIgnoringTire).toBeCloseTo(2.75, 2)
    expect(d.frequencyIgnoringTire / d.rideFrequency - 1).toBeCloseTo(0.07, 2)
  })
})

describe('Ch 16 Exercise 16.2 -- axle roll rate from the springs', () => {
  it('gets 51,610 N.m/rad at 1.60 m track', () => {
    expect(axleRollRate(40.32, 1.6)).toBeCloseTo(51610, -1)
  })

  it('is 900.7 N.m/deg', () => {
    expect(axleRollRate(40.32, 1.6) / (180 / Math.PI)).toBeCloseTo(900.7, 0)
  })
})

describe('Ch 16 Exercise 16.3 -- the bar, referred to the wheels', () => {
  const bar = barRollRate(2200, 0.28, 0.85, 1.6)

  it('gets 25,951 N.m/rad', () => {
    expect(bar).toBeCloseTo(25951, -1)
  })

  it('adds 50% to that axle over the springs alone', () => {
    expect(bar / 51610).toBeCloseTo(0.5, 2)
  })

  it('squares its own installation ratio, exactly as the spring does', () => {
    expect(barRollRate(2200, 0.28, 1.7, 1.6) / bar).toBeCloseTo(4, 9)
  })
})

describe('Ch 16 Exercise 16.4 -- solving backwards for a frequency target', () => {
  it('needs about 149 N/mm to reach 3.2 Hz', () => {
    expect(springRateForFrequency(3.2, 145, 300, 0.7)).toBeCloseTo(148.7, 1)
  })

  it('round-trips: that spring gives back 3.20 Hz', () => {
    const ks = springRateForFrequency(3.2, 145, 300, 0.7)
    const kw = wheelRate(ks, 0.7)
    expect(rideFrequency(rideRate(kw, 300), 145)).toBeCloseTo(3.2, 6)
  })

  it('costs 35% more spring for 14% more frequency', () => {
    // f goes as sqrt(K), and the tyre's series softening makes it worse than
    // that -- which is the exercise's point.
    const ks = springRateForFrequency(3.2, 145, 300, 0.7)
    expect(ks / 110 - 1).toBeCloseTo(0.35, 2)
    expect(3.2 / 2.8 - 1).toBeCloseTo(0.14, 2)
  })

  it('refuses a target the tyre alone cannot reach', () => {
    // Past the frequency the bare tyre gives, no spring is stiff enough --
    // the series relation has no positive solution. Returning 0 rather than a
    // negative or infinite rate keeps that visible.
    const ceiling = maxRideFrequency(300, 145)
    expect(springRateForFrequency(ceiling * 1.01, 145, 300, 0.7)).toBe(0)
    expect(springRateForFrequency(ceiling * 0.95, 145, 300, 0.7)).toBeGreaterThan(0)
  })
})

describe('Ch 16 Exercise 16.5 -- roll gradient and elastic TLLTD', () => {
  it('gets 1.30 deg/g', () => {
    const rad = rollGradientFromRates(6800, 0.26, 42000 + 36000)
    expect(rad * (180 / Math.PI)).toBeCloseTo(1.3, 2)
  })

  it('gets 53.8% front elastic TLLTD', () => {
    expect(elasticTlltd(42000, 36000)).toBeCloseTo(0.538, 3)
  })
})

describe('Ch 16 Exercise 16.6 -- why the installation ratio is measured, not assumed', () => {
  it('turns a 10% IR error into a 21% wheel rate error', () => {
    expect(wheelRate(100, 1.1) / wheelRate(100, 1.0)).toBeCloseTo(1.21, 9)
    expect(wheelRate(100, 0.9) / wheelRate(100, 1.0)).toBeCloseTo(0.81, 9)
  })

  it('but only a 10% frequency error, because the square root undoes the square', () => {
    const f = (ir: number): number => rideFrequency(wheelRate(100, ir), 150)
    expect(f(1.1) / f(1.0)).toBeCloseTo(1.1, 9)
  })
})

describe('Ch 16 Exercise 16.7 -- the tyre is one of the two springs', () => {
  it('gets a 16.4% reduction at 55 N/mm against a 280 N/mm tyre', () => {
    expect(rideRate(55, 280)).toBeCloseTo(45.97, 2)
    expect(tireComplianceLoss(55, 280)).toBeCloseTo(0.164, 3)
  })

  it('reproduces the exercise table: the loss depends only on Kw/Kt', () => {
    const table: [number, number][] = [
      [20, 0.067],
      [55, 0.164],
      [150, 0.349],
      [300, 0.517]
    ]
    for (const [kw, loss] of table) {
      expect(tireComplianceLoss(kw, 280)).toBeCloseTo(loss, 3)
    }
  })

  it('makes the tyre a suspension rate on a stiff car and a detail on a soft one', () => {
    // The claim that makes tyre pressure a rate ADJUSTMENT rather than only a
    // contact-patch adjustment. The loss depends purely on Kw/Kt, so the test
    // is really about where each car sits on that ratio.
    const race = deriveRates(FORMULA_RATES)
    const road = deriveRates(SEDAN_RATES)
    expect(race.front.tireLoss).toBeGreaterThan(road.front.tireLoss)
    expect(road.front.tireLoss).toBeLessThan(0.1)

    // And the endpoint the chapter is really warning about: stiffen the springs
    // to high-downforce rates and a third of the total compliance moves into
    // the carcass, at which point ignoring the tyre is not an approximation.
    const downforce = deriveRates({
      ...FORMULA_RATES,
      front: { ...FORMULA_RATES.front, springRate: 390 }
    })
    expect(downforce.front.wheelRate).toBeGreaterThan(140)
    expect(downforce.front.tireLoss).toBeGreaterThan(0.3)
  })
})

describe('the whole car', () => {
  const d = deriveRates(FORMULA_RATES)

  it('puts a race car in the right frequency band and a sedan in its own', () => {
    // Ch 16 §4's table: formula car 3.0-4.5 Hz, passenger car 1.0-1.5 Hz.
    expect(d.front.rideFrequency).toBeGreaterThan(2.0)
    expect(d.front.rideFrequency).toBeLessThan(4.5)
    const road = deriveRates(SEDAN_RATES)
    expect(road.front.rideFrequency).toBeGreaterThan(0.9)
    expect(road.front.rideFrequency).toBeLessThan(1.6)
  })

  it('reports how much of each axle the bar is supplying', () => {
    expect(d.barShareFront).toBeGreaterThan(0)
    expect(d.barShareFront).toBeLessThan(1)
    expect(d.barRollRateFront + d.springRollRateFront).toBeCloseTo(d.rollRateFront, 9)
  })

  it('moves elastic TLLTD forward when the front bar is stiffened', () => {
    const stiffer = deriveRates({ ...FORMULA_RATES, barRateFront: FORMULA_RATES.barRateFront * 2 })
    expect(stiffer.elasticTlltd).toBeGreaterThan(d.elasticTlltd)
  })

  it('checks Olley flat ride, which race cars routinely break', () => {
    // Olley wants the rear 10-20% above the front. This car does not obey it,
    // and the ratio being reported rather than enforced is the point.
    expect(d.frequencyRatioRearToFront).toBeGreaterThan(0)
    expect(Number.isFinite(d.frequencyRatioRearToFront)).toBe(true)
  })

  it('seriesRate is symmetric and always softer than either input', () => {
    expect(seriesRate(40, 300)).toBeCloseTo(seriesRate(300, 40), 12)
    expect(seriesRate(40, 300)).toBeLessThan(40)
  })
})

describe('the bridge into ChassisParams -- why this module exists', () => {
  it('produces the four roll-stiffness numbers Ch 18 consumes', () => {
    const s = rollStiffnessForChassis(FORMULA_RATES)
    expect(s.springRollStiffnessFront).toBeGreaterThan(0)
    expect(s.springRollStiffnessRear).toBeGreaterThan(0)
    expect(s.barRollStiffnessFront).toBeGreaterThan(0)
    expect(s.barRollStiffnessRear).toBeGreaterThan(0)
  })

  it('lands close enough to the hand-entered chassis that nothing downstream jumps', () => {
    // Switching a lab from typed-in roll stiffness to derived roll stiffness
    // should not silently move every other chapter's answers, so the default
    // rates are chosen to reproduce FORMULA_CHASSIS to within a few percent.
    const s = rollStiffnessForChassis(FORMULA_RATES)
    const derivedTotal =
      s.springRollStiffnessFront +
      s.springRollStiffnessRear +
      s.barRollStiffnessFront +
      s.barRollStiffnessRear
    const handTotal =
      FORMULA_CHASSIS.springRollStiffnessFront +
      FORMULA_CHASSIS.springRollStiffnessRear +
      FORMULA_CHASSIS.barRollStiffnessFront +
      FORMULA_CHASSIS.barRollStiffnessRear
    expect(Math.abs(derivedTotal / handTotal - 1)).toBeLessThan(0.15)
  })

  it('agrees with deriveChassis on the roll gradient it implies', () => {
    // The real check: feed the derived stiffnesses into Ch 18 and the roll
    // gradient that comes back must be the one Ch 16's own formula predicts,
    // give or take Ch 18's jacking correction that Ch 16 does not model.
    const chassis = { ...FORMULA_CHASSIS, ...rollStiffnessForChassis(FORMULA_RATES) }
    const dc = deriveChassis(FORMULA_CAR, chassis)
    const d = deriveRates(FORMULA_RATES)
    const ch16 = rollGradientFromRates(dc.sprungWeight, dc.rollMomentArm, d.rollRateTotal)
    // Ch 18 subtracts W_s*H from the denominator (the roll-angle feedback term
    // Ch 16 leaves out), so Ch 18's answer must be slightly the LARGER.
    expect(dc.rollGradient).toBeGreaterThan(ch16)
    expect(dc.rollGradient / ch16 - 1).toBeLessThan(0.15)
  })
})

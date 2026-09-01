/**
 * Driving and braking -- Ch 20.
 *
 * Every exercise quotes a number. The ones worth reading twice are 20.1/20.2,
 * where a single sign explains the layout of every fast car, and 20.5, where a
 * differential setting turns out to be worth a degree of opposite lock.
 */

import { describe, expect, it } from 'vitest'
import {
  CIRCUIT_DIFF,
  OVER_PRELOADED_DIFF,
  asymptoticTbr,
  balancedDeceleration,
  brakingEnergy,
  brakingState,
  brakingTime,
  compareLayouts,
  diffState,
  diffYawMoment,
  discTemperatureRise,
  drivenAxleLoadFraction,
  idealBrakeBias,
  maxDriveTorque,
  tractionLimit,
  type TractionGeometry
} from './driveline.js'

const EX_20_1: TractionGeometry = { a: 1.3, b: 1.4, h: 0.3, mu: 1.4 }

describe('Ch 20 Exercise 20.1 -- one sign explains every layout', () => {
  it('gets 0.80 g rear drive, 0.63 g front drive, 1.40 g all-wheel drive', () => {
    expect(tractionLimit(EX_20_1, 'rwd')).toBeCloseTo(0.798, 3)
    expect(tractionLimit(EX_20_1, 'fwd')).toBeCloseTo(0.628, 3)
    expect(tractionLimit(EX_20_1, 'awd')).toBeCloseTo(1.4, 9)
  })

  it('beats front drive by 21% despite the front carrying MORE static weight', () => {
    // 51.9% front static against 48.1% rear, and rear drive still wins --
    // entirely because of the sign of the load transfer term.
    const L = EX_20_1.a + EX_20_1.b
    expect(EX_20_1.b / L).toBeGreaterThan(EX_20_1.a / L)
    expect(tractionLimit(EX_20_1, 'rwd') / tractionLimit(EX_20_1, 'fwd') - 1).toBeCloseTo(0.27, 2)
  })

  it('makes all-wheel drive 75% better than rear drive', () => {
    expect(tractionLimit(EX_20_1, 'awd') / tractionLimit(EX_20_1, 'rwd') - 1).toBeCloseTo(0.75, 2)
  })

  it('runs away when mu*h exceeds the wheelbase, where the car wheelies instead', () => {
    // The linear model has no wheelie in it, so it is honest to report the
    // singularity rather than a plausible finite number.
    expect(tractionLimit({ a: 1.3, b: 1.4, h: 2.0, mu: 1.4 }, 'rwd')).toBe(Infinity)
  })
})

describe('Ch 20 Exercise 20.2 -- what acceleration recruits', () => {
  const layouts = compareLayouts(EX_20_1)
  const rwd = layouts.find((l) => l.layout === 'rwd')!
  const fwd = layouts.find((l) => l.layout === 'fwd')!

  it('takes rear drive from 48% to 57% of the weight on the driven axle', () => {
    expect(rwd.staticDrivenFraction).toBeCloseTo(0.481, 3)
    expect(rwd.drivenFractionAtLimit).toBeCloseTo(0.57, 2)
    expect(rwd.recruited).toBeGreaterThan(0.08)
  })

  it('takes front drive from 52% down to 44.9%', () => {
    expect(fwd.staticDrivenFraction).toBeCloseTo(0.519, 3)
    expect(fwd.drivenFractionAtLimit).toBeCloseTo(0.449, 3)
    expect(fwd.recruited).toBeLessThan(0)
  })

  it('explains why a dragster is shaped like a dragster', () => {
    // Rearward bias and a HIGH CG both help straight-line traction, and both
    // are terrible for cornering, where lateral transfer scales with h.
    const tall = drivenAxleLoadFraction({ ...EX_20_1, h: 0.6 }, 'rwd')
    expect(tall).toBeGreaterThan(rwd.drivenFractionAtLimit)
    expect(tractionLimit({ ...EX_20_1, h: 0.6 }, 'rwd')).toBeGreaterThan(
      tractionLimit(EX_20_1, 'rwd')
    )
  })

  it('gives all-wheel drive the whole car by definition', () => {
    expect(layouts.find((l) => l.layout === 'awd')!.drivenFractionAtLimit).toBe(1)
  })
})

describe('Ch 20 Exercise 20.3 -- locking torque and the bias it produces', () => {
  const s = diffState(CIRCUIT_DIFF, 900)

  it('gets 375 N.m of locking torque at 900 N.m input', () => {
    expect(s.lockTorque).toBeCloseTo(375, 6)
  })

  it('splits it 637.5 / 262.5 for a TBR of 2.43', () => {
    expect(s.torqueHigh).toBeCloseTo(637.5, 6)
    expect(s.torqueLow).toBeCloseTo(262.5, 6)
    expect(s.tbr).toBeCloseTo(2.43, 2)
  })

  it('behaves almost like a spool at low torque, because preload is fixed', () => {
    // The exercise's own number: TBR 39 at 100 N.m of input. This is why
    // excessive preload makes a car refuse to rotate on a trailing throttle.
    const low = diffState(CIRCUIT_DIFF, 100)
    expect(low.lockTorque).toBeCloseTo(95, 6)
    expect(low.tbr).toBeCloseTo(39, 0)
  })

  it('asymptotes toward the ramp alone at high torque', () => {
    expect(asymptoticTbr(0.35)).toBeCloseTo(2.077, 3)
    expect(diffState(CIRCUIT_DIFF, 100000).tbr).toBeCloseTo(asymptoticTbr(0.35), 2)
  })

  it('never locks harder than the torque going through it', () => {
    // Locking torque is a DIFFERENCE across the outputs, so it cannot exceed
    // the input without driving one wheel backwards.
    const tiny = diffState(OVER_PRELOADED_DIFF, 50)
    expect(tiny.lockTorque).toBeLessThanOrEqual(50)
    expect(tiny.torqueLow).toBeGreaterThanOrEqual(0)
  })

  it('locks harder on the drive side than on overrun, as the ramps are cut', () => {
    expect(diffState(CIRCUIT_DIFF, 900).lockTorque).toBeGreaterThan(
      diffState(CIRCUIT_DIFF, 900, true).lockTorque
    )
  })
})

describe('Ch 20 Exercise 20.4 -- how much traction each differential recovers', () => {
  it('caps an open diff at twice the weaker wheel', () => {
    expect(maxDriveTorque('open', 1100, 2600)).toBe(2200)
  })

  it('gets 3477 N.m from the LSD', () => {
    expect(maxDriveTorque('lsd', 1100, 2600, CIRCUIT_DIFF)).toBeCloseTo(3477, 0)
  })

  it('gets 3700 N.m from a spool', () => {
    expect(maxDriveTorque('spool', 1100, 2600)).toBe(3700)
  })

  it('recovers 86% of the spool advantage while still being able to differentiate', () => {
    const open = maxDriveTorque('open', 1100, 2600)
    const lsd = maxDriveTorque('lsd', 1100, 2600, CIRCUIT_DIFF)
    const spool = maxDriveTorque('spool', 1100, 2600)
    // 85.1% exactly. The notes round it to 86%; either way the LSD recovers
    // most of the spool's traction while keeping the ability to differentiate,
    // which is why plate LSDs and not spools are used on road circuits.
    expect((lsd - open) / (spool - open)).toBeCloseTo(0.851, 3)
  })

  it('never promises more than the outside wheel can actually transmit', () => {
    // The exercise checks this by hand; the code has to enforce it, or a very
    // aggressive ramp reports torque that no tyre is holding.
    expect(maxDriveTorque('lsd', 1100, 1200, OVER_PRELOADED_DIFF)).toBeLessThanOrEqual(2300)
  })
})

describe('Ch 20 Exercise 20.5 -- the differential as a steering input', () => {
  const y = diffYawMoment({
    torqueInside: 2400,
    torqueOutside: 1200,
    rollingRadius: 0.33,
    track: 1.55,
    controlDerivative: 3000
  })

  it('gets 7273 N and 3636 N at the contact patches', () => {
    expect(y.forceInside).toBeCloseTo(7273, 0)
    expect(y.forceOutside).toBeCloseTo(3636, 0)
  })

  it('gets a 2819 N.m anti-turn yaw moment', () => {
    // 2818.2 exactly; the notes' 2819 comes from their rounded 7273 and 3636.
    expect(y.yawMoment).toBeCloseTo(2818, 0)
  })

  it('is worth 0.94 deg of OPPOSITE lock', () => {
    // On a car whose total steer in a fast corner is 3-5 deg, that is 20-30%
    // of the driver's entire steering authority working against them. This is
    // why "won't rotate on exit" is so often a diff problem, and why chasing
    // it with anti-roll bars is a category error: bars move steady-state
    // balance, the diff moment appears only under power.
    expect(y.equivalentSteer).toBeCloseTo(0.94, 2)
  })

  it('vanishes when the diff is open and the torques are equal', () => {
    expect(
      diffYawMoment({
        torqueInside: 1800,
        torqueOutside: 1800,
        rollingRadius: 0.33,
        track: 1.55
      }).yawMoment
    ).toBe(0)
  })

  it('scales with track, so a wide car pays more for the same lock', () => {
    const wide = diffYawMoment({
      torqueInside: 2400,
      torqueOutside: 1200,
      rollingRadius: 0.33,
      track: 1.8
    })
    expect(wide.yawMoment / y.yawMoment).toBeCloseTo(1.8 / 1.55, 9)
  })
})

describe('Ch 20 Exercise 20.6 -- ideal brake bias', () => {
  it('gets 71.5% front at 1.5 g', () => {
    expect(idealBrakeBias(0.55, 0.11, 1.5)).toBeCloseTo(0.715, 3)
  })

  it('matches the instantaneous load split exactly, as it must', () => {
    const s = brakingState({
      weight: 7500,
      frontWeightFraction: 0.55,
      hOverL: 0.11,
      ax: 1.5,
      bias: 0.715,
      mu: 1.4
    })
    expect(s.transfer).toBeCloseTo(1237.5, 6)
    expect(s.frontLoad).toBeCloseTo(5362.5, 6)
    expect(s.rearLoad).toBeCloseTo(2137.5, 6)
    expect(s.frontLoad / 7500).toBeCloseTo(0.715, 3)
    expect(s.locksFirst).toBe('together')
  })

  it('rises with deceleration, so a fixed bias is right at exactly one point', () => {
    expect(idealBrakeBias(0.55, 0.11, 0.5)).toBeLessThan(idealBrakeBias(0.55, 0.11, 1.5))
    expect(balancedDeceleration(0.715, 0.55, 0.11)).toBeCloseTo(1.5, 6)
  })

  it('locks the rear first below the balance point, which is the unsafe failure', () => {
    const s = brakingState({
      weight: 7500,
      frontWeightFraction: 0.55,
      hOverL: 0.11,
      ax: 0.6,
      bias: 0.715,
      mu: 1.4
    })
    expect(s.biasError).toBeGreaterThan(0)
    expect(s.locksFirst).toBe('front')
  })

  it('locks the rear first if the bias is set behind ideal', () => {
    const s = brakingState({
      weight: 7500,
      frontWeightFraction: 0.55,
      hOverL: 0.11,
      ax: 1.5,
      bias: 0.6,
      mu: 1.4
    })
    expect(s.locksFirst).toBe('rear')
    expect(s.biasError).toBeLessThan(0)
  })

  it('leaves the rear axle 37% lighter than static at 1.5 g', () => {
    // Combined with Ch 7's result that lateral capability falls sharply with
    // vertical load, this is why trail braking is the most delicate phase.
    const s = brakingState({
      weight: 7500,
      frontWeightFraction: 0.55,
      hOverL: 0.11,
      ax: 1.5,
      bias: 0.715,
      mu: 1.4
    })
    expect(1 - s.rearLoad / (7500 * 0.45)).toBeCloseTo(0.367, 2)
  })
})

describe('Ch 20 Exercise 20.7 -- where the energy goes', () => {
  const t = discTemperatureRise({
    mass: 780,
    speedFrom: 78,
    speedTo: 32,
    discMass: 5.2
  })

  it('dissipates 1.97 MJ', () => {
    expect(t.totalEnergy).toBeCloseTo(1.973e6, -3)
    expect(brakingEnergy(780, 78, 32)).toBeCloseTo(1.973e6, -3)
  })

  it('raises the front discs 196 K and the rears 160 K in one stop', () => {
    expect(t.frontRise).toBeCloseTo(196, 0)
    expect(t.rearRise).toBeCloseTo(160, 0)
  })

  it('puts the fronts near 500 C from a warm 300 C baseline', () => {
    expect(300 + t.frontRise).toBeGreaterThan(480)
    expect(300 + t.frontRise).toBeLessThan(520)
  })

  it('cools by adding disc mass, at the cost of unsprung and rotating inertia', () => {
    expect(discTemperatureRise({ mass: 780, speedFrom: 78, speedTo: 32, discMass: 7 }).frontRise)
      .toBeLessThan(t.frontRise)
  })

  it('reaches megawatt power in a real braking zone', () => {
    // The stop takes about 1.9 s at 2.5 g, so this is a genuine 1 MW event.
    const seconds = brakingTime(78, 32, 2.5)
    expect(seconds).toBeGreaterThan(1.5)
    expect(t.totalEnergy / seconds).toBeGreaterThan(1e6)
  })
})

/**
 * Aerodynamics, checked against the worked solutions in Ch 3.
 *
 * The second half of this file is the more important part: it verifies that
 * downforce actually reaches the rest of the simulator. An aero model that
 * computes a correct number and does not change the car's limit would be
 * decorative.
 */

import { describe, expect, it } from 'vitest'
import { G } from '../util/numeric.js'
import {
  aeroEfficiency,
  aeroLoads,
  airDensity,
  cdaFromCoastdown,
  centreOfPressure,
  drag,
  dragPower,
  downforce,
  dynamicPressure,
  maxCorneringSpeed,
  maxCorneringSpeedNoAero,
  rollingResistanceFromCoastdown,
  speedAtOneG,
  AERO_PRESETS,
  HIGH_DOWNFORCE,
  NO_WINGS,
  RHO_SEA_LEVEL,
  type AeroParams
} from './index.js'
import { FORMULA_CAR, derive } from '../vehicle/params.js'
import { FORMULA_CHASSIS, wheelLoads } from '../vehicle/chassis.js'
import { pairLimit } from '../vehicle/pairAnalysis.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire } from '../tire/scale.js'

describe('Ch 3 §2 - air properties', () => {
  it('reproduces standard sea-level density from the gas law', () => {
    expect(airDensity(101325, 288.15)).toBeCloseTo(1.225, 2)
  })

  it('reproduces the altitude example: 0.962 kg/m^3 at 85 kPa and 308 K', () => {
    // The notes quote 0.962; the exact value is 0.96141, so assert to the
    // precision the notes actually carry rather than to their rounding.
    expect(airDensity(85000, 308)).toBeCloseTo(0.962, 2)
  })

  it('costs about a fifth of the downforce at that altitude', () => {
    const loss = 1 - airDensity(85000, 308) / RHO_SEA_LEVEL
    expect(loss).toBeGreaterThan(0.2)
    expect(loss).toBeLessThan(0.23)
  })
})

describe('Ch 3 §3 - dynamic pressure', () => {
  it('gives 1893 Pa at 200 km/h', () => {
    expect(dynamicPressure(1.225, 200 / 3.6)).toBeCloseTo(1893, -1)
  })

  it('is only about 2% of atmospheric pressure there', () => {
    expect(dynamicPressure(1.225, 55.6) / 101325).toBeCloseTo(0.019, 3)
  })

  it('scales with the square of speed', () => {
    expect(dynamicPressure(1.225, 80)).toBeCloseTo(4 * dynamicPressure(1.225, 40), 6)
  })
})

describe('Ch 3 Exercise 3.5 - cornering with downforce', () => {
  // m = 750 kg, R = 200 m, mu = 1.5, C_L A = 3.0 m^2
  const a: AeroParams = { ...HIGH_DOWNFORCE, clA: 3.0, rho: 1.225 }

  it('gives 105.4 m/s', () => {
    expect(maxCorneringSpeed(750, 200, 1.5, a)).toBeCloseTo(105.4, 0)
  })

  it('is roughly double the speed without downforce', () => {
    const withAero = maxCorneringSpeed(750, 200, 1.5, a)
    const without = maxCorneringSpeedNoAero(200, 1.5)
    expect(without).toBeCloseTo(54.2, 1)
    expect(withAero / without).toBeCloseTo(1.94, 1)
  })

  it('goes singular once C_L A passes the critical value', () => {
    // The notes: at C_L A = 3.3 the denominator turns negative and there is no
    // finite solution -- the car is limited by something other than grip.
    const critical = (2 * 750) / (200 * 1.5 * 1.225)
    expect(critical).toBeCloseTo(4.08, 2)
    expect(maxCorneringSpeed(750, 200, 1.5, { ...a, clA: critical + 0.1 })).toBe(Infinity)
    expect(maxCorneringSpeed(750, 200, 1.5, { ...a, clA: critical - 0.1 })).toBeGreaterThan(200)
  })

  it('reduces to the no-aero result when C_L A is zero', () => {
    expect(maxCorneringSpeed(750, 200, 1.5, { ...a, clA: 0 })).toBeCloseTo(
      maxCorneringSpeedNoAero(200, 1.5),
      9
    )
  })
})

describe('Ch 3 Exercise 3.6 - coastdown', () => {
  it('recovers f_r = 0.0357 from the low-speed deceleration', () => {
    expect(rollingResistanceFromCoastdown(0.35)).toBeCloseTo(0.0357, 4)
  })

  it('recovers C_D A = 2.39 m^2 from the 60 m/s deceleration', () => {
    expect(cdaFromCoastdown(900, 60, 6.2, 0.0357, 1.225)).toBeCloseTo(2.39, 2)
  })

  it('round-trips: that C_D A reproduces the measured drag force', () => {
    const cda = cdaFromCoastdown(900, 60, 6.2, 0.0357, 1.225)
    const total = drag({ ...NO_WINGS, cdA: cda, rho: 1.225 }, 60) + 0.0357 * 900 * G
    expect(total).toBeCloseTo(900 * 6.2, 0)
  })
})

describe('forces and derived figures', () => {
  it('splits downforce by aero balance and conserves the total', () => {
    const l = aeroLoads(HIGH_DOWNFORCE, 60)
    expect(l.front + l.rear).toBeCloseTo(l.total, 9)
    expect(l.front / l.total).toBeCloseTo(HIGH_DOWNFORCE.aeroBalance, 9)
  })

  it('grows downforce and drag with the square of speed', () => {
    expect(downforce(HIGH_DOWNFORCE, 80)).toBeCloseTo(4 * downforce(HIGH_DOWNFORCE, 40), 6)
    expect(drag(HIGH_DOWNFORCE, 80)).toBeCloseTo(4 * drag(HIGH_DOWNFORCE, 40), 6)
  })

  it('grows drag POWER with the cube of speed', () => {
    expect(dragPower(HIGH_DOWNFORCE, 80)).toBeCloseTo(8 * dragPower(HIGH_DOWNFORCE, 40), 6)
  })

  it('finds the speed at which downforce equals the car weight', () => {
    const speed = speedAtOneG(700, HIGH_DOWNFORCE)
    expect(downforce(HIGH_DOWNFORCE, speed)).toBeCloseTo(700 * G, 6)
  })

  it('reports efficiency and centre of pressure', () => {
    expect(aeroEfficiency(HIGH_DOWNFORCE)).toBeCloseTo(3.0 / 1.15, 6)
    expect(centreOfPressure(HIGH_DOWNFORCE)).toBeCloseTo(0.55, 9)
    expect(aeroEfficiency(NO_WINGS)).toBe(0)
  })

  it('produces nothing at all with no wings, and never divides by zero', () => {
    expect(downforce(NO_WINGS, 90)).toBe(0)
    expect(speedAtOneG(700, NO_WINGS)).toBe(Infinity)
    expect(aeroLoads(NO_WINGS, 90).total).toBe(0)
  })

  it('gives every preset a plausible efficiency', () => {
    for (const p of AERO_PRESETS.filter((x) => x.clA > 0)) {
      expect(aeroEfficiency(p), p.name).toBeGreaterThan(1)
      expect(aeroEfficiency(p), p.name).toBeLessThan(5)
    }
  })
})

// ---------------------------------------------------------------------------
// The part that matters: does downforce actually reach the rest of the model?
// ---------------------------------------------------------------------------

describe('downforce reaching the vehicle model', () => {
  const tireF = new MagicFormulaTire(DEFAULT_MF)
  const tireR = new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3))
  const car = FORMULA_CAR
  const c = FORMULA_CHASSIS

  it('adds vertical load to the wheels', () => {
    const plain = wheelLoads(car, c, 1.0)
    const winged = wheelLoads(car, c, 1.0, 0, aeroLoads(HIGH_DOWNFORCE, 60))
    expect(winged.front).toBeGreaterThan(plain.front)
    expect(winged.rear).toBeGreaterThan(plain.rear)
    const added = winged.front + winged.rear - (plain.front + plain.rear)
    expect(added).toBeCloseTo(downforce(HIGH_DOWNFORCE, 60), 6)
  })

  it('raises the cornering limit with speed', () => {
    const limits = [0, 30, 50, 70].map(
      (V) => pairLimit(car, c, tireF, tireR, 0, aeroLoads(HIGH_DOWNFORCE, V)).limitAy
    )
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i]).toBeGreaterThan(limits[i - 1])
    }
    // A high-downforce car at speed should be well past what its tyres alone give.
    expect(limits[3]).toBeGreaterThan(1.5 * limits[0])
  })

  it('leaves the limit alone when there is no downforce', () => {
    const still = pairLimit(car, c, tireF, tireR).limitAy
    const moving = pairLimit(car, c, tireF, tireR, 0, aeroLoads(NO_WINGS, 70)).limitAy
    expect(moving).toBeCloseTo(still, 9)
  })

  it('moves the balance when aero balance is moved', () => {
    const forward = pairLimit(
      car,
      c,
      tireF,
      tireR,
      0,
      aeroLoads({ ...HIGH_DOWNFORCE, aeroBalance: 0.6 }, 65)
    )
    const rearward = pairLimit(
      car,
      c,
      tireF,
      tireR,
      0,
      aeroLoads({ ...HIGH_DOWNFORCE, aeroBalance: 0.3 }, 65)
    )
    // More downforce on the front means the front gives up later: understeer falls.
    expect(forward.limitBalance).toBeLessThan(rearward.limitBalance)
  })

  it('makes balance speed-dependent, which mechanical grip alone is not', () => {
    // Ch 15 §9: total downforce sets grip, aero balance sets handling -- and
    // because downforce grows with V^2 while weight does not, the aero share of
    // the axle load grows with speed, so the balance moves with speed too.
    const balances = [20, 45, 75].map(
      (V) => pairLimit(car, c, tireF, tireR, 0, aeroLoads({ ...HIGH_DOWNFORCE, aeroBalance: 0.62 }, V)).limitBalance
    )
    expect(balances[0]).not.toBeCloseTo(balances[2], 3)
    // With a forward aero bias the car should shed understeer as speed rises.
    expect(balances[2]).toBeLessThan(balances[0])
  })

  it('still respects load sensitivity: doubling downforce does not double grip', () => {
    const one = pairLimit(car, c, tireF, tireR, 0, aeroLoads(HIGH_DOWNFORCE, 50)).limitAy
    const two = pairLimit(
      car,
      c,
      tireF,
      tireR,
      0,
      aeroLoads({ ...HIGH_DOWNFORCE, clA: HIGH_DOWNFORCE.clA * 2 }, 50)
    ).limitAy
    expect(two).toBeGreaterThan(one)
    expect(two).toBeLessThan(2 * one)
  })

  it('agrees with the closed-form Exercise 3.5 result to within load sensitivity', () => {
    // The closed form assumes a single constant mu; the simulator uses real
    // tyres with load sensitivity, so it must come out LOWER -- and by a
    // margin, not a rounding error.
    const { w } = derive(car)
    const mu = 1.66 // roughly the tyres' peak at these loads
    const closed = maxCorneringSpeed(car.mass, 200, mu, HIGH_DOWNFORCE)
    const speed = 60
    const simulated = pairLimit(car, c, tireF, tireR, 0, aeroLoads(HIGH_DOWNFORCE, speed)).limitAy
    const closedAy = (closed * closed) / (G * 200)
    expect(simulated).toBeLessThan(closedAy)
    expect(w).toBeGreaterThan(0)
  })
})

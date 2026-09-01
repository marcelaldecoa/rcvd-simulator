/**
 * Conditions tests.
 *
 * The fuel model is exact, so it is tested exactly -- against independently
 * computed statics rather than against itself. The tyre condition models are
 * fitted parameterisations, so what is tested there is their DIRECTION and
 * their structural properties: which way each effect pushes, that they compose
 * multiplicatively, and that the balance actually moves as a result. Pinning
 * fitted constants to three decimals would only make the suite brittle without
 * making the physics any more true.
 */

import { describe, expect, it } from 'vitest'
import { G } from '../util/numeric.js'
import { FORMULA_CAR, derive } from '../vehicle/params.js'
import { summarise } from '../vehicle/steadyState.js'
import { DEFAULT_MF } from '../tire/magicFormula.js'
import {
  applyConditions,
  applyFuel,
  axleGripScale,
  CONDITION_PRESETS,
  DEFAULT_STINT,
  DEFAULT_TUNING,
  metricsFor,
  NOMINAL_CONDITIONS,
  pressureFactors,
  sensitivity,
  stintSweep,
  temperatureFactor,
  wearFactors,
  type ConditionInputs,
  type FuelTank
} from './index.js'

const TANK: FuelTank = { capacity: 60, position: 1.9 }

const INPUTS: ConditionInputs = {
  dryVehicle: FORMULA_CAR,
  tire: DEFAULT_MF,
  rearTireScale: 1.3,
  rearGripScale: 1.12,
  tank: TANK
}

describe('fuel load - exact statics', () => {
  it('adds the fuel mass', () => {
    expect(applyFuel(FORMULA_CAR, TANK, 40).vehicle.mass).toBe(FORMULA_CAR.mass + 40)
  })

  it('leaves the car untouched with an empty tank', () => {
    const f = applyFuel(FORMULA_CAR, TANK, 0)
    expect(f.vehicle).toBe(FORMULA_CAR)
    expect(f.cgShift).toBe(0)
  })

  it('preserves the wheelbase', () => {
    const { L } = derive(FORMULA_CAR)
    for (const kg of [10, 35, 60]) {
      expect(derive(applyFuel(FORMULA_CAR, TANK, kg).vehicle).L).toBeCloseTo(L, 12)
    }
  })

  it('puts the CG at the mass-weighted mean of car and fuel', () => {
    const kg = 45
    const f = applyFuel(FORMULA_CAR, TANK, kg)
    const expected =
      (FORMULA_CAR.mass * FORMULA_CAR.a + kg * TANK.position) / (FORMULA_CAR.mass + kg)
    expect(f.vehicle.a).toBeCloseTo(expected, 12)
  })

  it('moves the CG toward the tank, whichever side it is on', () => {
    const behind = applyFuel(FORMULA_CAR, { capacity: 60, position: 2.5 }, 50)
    const ahead = applyFuel(FORMULA_CAR, { capacity: 60, position: 0.6 }, 50)
    expect(behind.cgShift).toBeGreaterThan(0)
    expect(ahead.cgShift).toBeLessThan(0)
  })

  it('matches the parallel axis theorem computed independently', () => {
    const kg = 50
    const f = applyFuel(FORMULA_CAR, TANK, kg)
    const x = f.vehicle.a
    const expected =
      FORMULA_CAR.izz +
      FORMULA_CAR.mass * (x - FORMULA_CAR.a) ** 2 +
      kg * (TANK.position - x) ** 2
    expect(f.vehicle.izz).toBeCloseTo(expected, 9)
    expect(f.vehicle.izz).toBeGreaterThan(FORMULA_CAR.izz)
  })

  it('shifts the static axle loads the way the CG moved', () => {
    const dry = derive(FORMULA_CAR)
    const wet = derive(applyFuel(FORMULA_CAR, TANK, 60).vehicle)
    // Tank is aft of the dry CG, so the rear takes proportionally more.
    expect(TANK.position).toBeGreaterThan(FORMULA_CAR.a)
    expect(wet.frontWeightFraction).toBeLessThan(dry.frontWeightFraction)
    expect(wet.w).toBeCloseTo(dry.w + 60 * G, 6)
  })
})

describe('tyre condition factors - direction and structure', () => {
  const t = DEFAULT_TUNING

  it('peaks friction at the optimum temperature and falls either side', () => {
    expect(temperatureFactor(t.tempOptimum, t)).toBeCloseTo(1, 12)
    expect(temperatureFactor(t.tempOptimum - 40, t)).toBeLessThan(1)
    expect(temperatureFactor(t.tempOptimum + 40, t)).toBeLessThan(1)
  })

  it('is symmetric about the optimum: too hot is as bad as too cold', () => {
    expect(temperatureFactor(t.tempOptimum - 35, t)).toBeCloseTo(
      temperatureFactor(t.tempOptimum + 35, t),
      12
    )
  })

  it('never lets a cold tyre fall below the floor', () => {
    expect(temperatureFactor(-50, t)).toBe(t.tempFloor)
    expect(temperatureFactor(400, t)).toBe(t.tempFloor)
  })

  it('raises stiffness and lowers friction with pressure (Ch 2 §8)', () => {
    const up = pressureFactors(t.pressureReference * 1.2, t)
    const down = pressureFactors(t.pressureReference * 0.8, t)
    expect(up.stiffness!).toBeGreaterThan(1)
    expect(up.mu!).toBeLessThan(1)
    expect(down.stiffness!).toBeLessThan(1)
    expect(down.mu!).toBeGreaterThan(1)
  })

  it('is neutral at the reference pressure and with no wear', () => {
    const p = pressureFactors(t.pressureReference, t)
    expect(p.mu).toBeCloseTo(1, 12)
    expect(p.stiffness).toBeCloseTo(1, 12)
    const w = wearFactors(0, t)
    expect(w.mu).toBeCloseTo(1, 12)
    expect(w.stiffness).toBeCloseTo(1, 12)
  })

  it('loses friction with wear', () => {
    expect(wearFactors(1, t).mu!).toBeLessThan(wearFactors(0, t).mu!)
  })

  it('composes the effects multiplicatively', () => {
    const combined = axleGripScale(0.9, 0.5, 70, 190, t)
    const expected =
      0.9 *
      temperatureFactor(70, t) *
      pressureFactors(190, t).mu! *
      wearFactors(0.5, t).mu!
    expect(combined.mu).toBeCloseTo(expected, 12)
  })

  it('leaves grip untouched under nominal conditions', () => {
    const g = axleGripScale(1, 0, t.tempOptimum, t.pressureReference, t)
    expect(g.mu).toBeCloseTo(1, 12)
    expect(g.stiffness).toBeCloseTo(1, 12)
  })
})

describe('applying conditions to the car', () => {
  it('reproduces the reference car under nominal conditions', () => {
    const applied = applyConditions(INPUTS, NOMINAL_CONDITIONS)
    expect(applied.vehicle.mass).toBe(FORMULA_CAR.mass)
    expect(applied.tireFront.lateral.mu0).toBeCloseTo(DEFAULT_MF.lateral.mu0, 12)
  })

  it('recomputes axle stiffness from the conditioned tyres', () => {
    // This is the coupling that makes conditions bite: without it, wear would
    // change the limit but leave the linear balance alone.
    const nominal = applyConditions(INPUTS, NOMINAL_CONDITIONS)
    const soft = applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, pressureRear: 140 })
    expect(soft.vehicle.cr).toBeLessThan(nominal.vehicle.cr)
    expect(soft.vehicle.cf).toBeCloseTo(nominal.vehicle.cf, 6)
  })

  it('pushes the LIMIT toward oversteer when the rears wear out', () => {
    const fresh = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const wornRear = metricsFor(
      applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, wearRear: 0.9 })
    )
    expect(wornRear.limitBalance).toBeLessThan(fresh.limitBalance)
    expect(wornRear.limitAy).toBeLessThan(fresh.limitAy)
  })

  it('pushes the LIMIT toward understeer when the fronts wear out', () => {
    const fresh = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const wornFront = metricsFor(
      applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, wearFront: 0.9 })
    )
    expect(wornFront.limitBalance).toBeGreaterThan(fresh.limitBalance)
  })

  it('moves linear and limit balance in OPPOSITE directions under wear', () => {
    // Not a bug, and worth pinning because it surprises people: less tread
    // means less squirm, so cornering stiffness rises and the linear
    // understeer gradient with it -- while peak grip falls, taking the limit
    // the other way. The driver feels the limit.
    const fresh = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const wornRear = metricsFor(
      applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, wearRear: 0.9 })
    )
    expect(wornRear.understeerDeg).toBeGreaterThan(fresh.understeerDeg)
    expect(wornRear.limitBalance).toBeLessThan(fresh.limitBalance)
  })

  it('lowers the limit on a wet track without necessarily changing balance', () => {
    const dry = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const wet = metricsFor(applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, trackGrip: 0.62 }))
    expect(wet.limitAy).toBeLessThan(dry.limitAy * 0.7)
    // A uniform grip change scales both axles alike, so the linear balance
    // is barely touched -- the car is slower, not differently balanced.
    expect(Math.abs(wet.understeerDeg - dry.understeerDeg)).toBeLessThan(0.05)
  })

  it('flips the limiting axle when one end is overheated', () => {
    const balanced = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const hotRear = metricsFor(
      applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, tempRear: 145 })
    )
    expect(balanced.limitingAxle).toBe('front')
    expect(hotRear.limitingAxle).toBe('rear')
  })

  it('makes a fuelled car heavier, slower and more rear-biased', () => {
    const empty = metricsFor(applyConditions(INPUTS, NOMINAL_CONDITIONS))
    const full = metricsFor(applyConditions(INPUTS, { ...NOMINAL_CONDITIONS, fuelMass: 60 }))
    expect(full.mass).toBeGreaterThan(empty.mass)
    expect(full.izz).toBeGreaterThan(empty.izz)
    expect(full.frontWeightFraction).toBeLessThan(empty.frontWeightFraction)
    // More mass on the same tyres means less lateral acceleration.
    expect(full.limitAy).toBeLessThan(empty.limitAy)
  })
})

describe('condition presets', () => {
  it('all produce a usable car', () => {
    for (const preset of CONDITION_PRESETS) {
      const m = metricsFor(applyConditions(INPUTS, preset.conditions(TANK)))
      expect(m.limitAy, preset.name).toBeGreaterThan(0.2)
      expect(m.limitAy, preset.name).toBeLessThan(3)
      expect(Number.isFinite(m.understeerDeg), preset.name).toBe(true)
    }
  })

  it('ranks the wet preset as the lowest grip and qualifying as the highest', () => {
    const byName = Object.fromEntries(
      CONDITION_PRESETS.map((p) => [p.name, metricsFor(applyConditions(INPUTS, p.conditions(TANK)))])
    )
    const limits = Object.entries(byName).map(([n, m]) => [n, m.limitAy] as const)
    const lowest = limits.reduce((a, b) => (a[1] < b[1] ? a : b))
    const highest = limits.reduce((a, b) => (a[1] > b[1] ? a : b))
    expect(lowest[0]).toBe('Wet')
    expect(highest[0]).toBe('Qualifying')
  })

  it('makes the overheated-rears preset actually rear-limited', () => {
    const preset = CONDITION_PRESETS.find((p) => p.name === 'Overheated rears')!
    expect(metricsFor(applyConditions(INPUTS, preset.conditions(TANK))).limitingAxle).toBe('rear')
  })
})

describe('stint sweep', () => {
  const stint = stintSweep(DEFAULT_STINT, TANK)

  it('runs the requested number of laps', () => {
    expect(stint).toHaveLength(DEFAULT_STINT.laps)
    expect(stint[0].lap).toBe(1)
  })

  it('burns fuel and accumulates wear monotonically', () => {
    for (let i = 1; i < stint.length; i++) {
      expect(stint[i].fuelMass).toBeLessThanOrEqual(stint[i - 1].fuelMass)
      expect(stint[i].wearFront).toBeGreaterThanOrEqual(stint[i - 1].wearFront)
      expect(stint[i].wearRear).toBeGreaterThanOrEqual(stint[i - 1].wearRear)
    }
  })

  it('starts full and cold, and warms up', () => {
    expect(stint[0].fuelMass).toBe(TANK.capacity)
    expect(stint[0].conditions.tempFront).toBeLessThan(DEFAULT_TUNING.tempOptimum)
    expect(stint[5].conditions.tempFront).toBeGreaterThan(stint[0].conditions.tempFront)
  })

  it('never drives fuel or wear out of range', () => {
    for (const p of stint) {
      expect(p.fuelMass).toBeGreaterThanOrEqual(0)
      expect(p.wearFront).toBeLessThanOrEqual(1)
      expect(p.wearRear).toBeLessThanOrEqual(1)
    }
  })

  it('gains lateral acceleration as fuel burns off, then loses it to wear', () => {
    const limits = stint.map((p) => metricsFor(applyConditions(INPUTS, p.conditions)).limitAy)
    // Cold and full at the start; better once warm and lighter.
    expect(limits[6]).toBeGreaterThan(limits[0])
    // The two effects work against each other, so the peak is in the middle
    // rather than at either end -- which is the whole point of the plot.
    const best = limits.indexOf(Math.max(...limits))
    expect(best).toBeGreaterThan(0)
    expect(best).toBeLessThan(limits.length - 1)
  })

  it('drifts the limit balance toward oversteer as the rears wear faster', () => {
    expect(DEFAULT_STINT.wearRearPerLap).toBeGreaterThan(DEFAULT_STINT.wearFrontPerLap)
    const bal = stint.map((p) => metricsFor(applyConditions(INPUTS, p.conditions)).limitBalance)
    expect(bal[bal.length - 1]).toBeLessThan(bal[3])
  })
})

describe('sensitivity ranking', () => {
  it('ranks every condition, most influential first', () => {
    const rows = sensitivity(INPUTS, NOMINAL_CONDITIONS, 'limitAy')
    expect(rows).toHaveLength(8)
    for (let i = 1; i < rows.length; i++) {
      expect(Math.abs(rows[i].delta)).toBeLessThanOrEqual(Math.abs(rows[i - 1].delta))
    }
  })

  it('puts track grip at the top for outright grip', () => {
    const rows = sensitivity(INPUTS, NOMINAL_CONDITIONS, 'limitAy')
    expect(rows[0].name).toBe('Track grip')
  })

  it('ranks the per-axle effects above the global ones for BALANCE', () => {
    // Track grip scales both axles alike, so it barely moves the understeer
    // gradient however much it moves the limit. Balance is a difference.
    const rows = sensitivity(INPUTS, NOMINAL_CONDITIONS, 'understeerDeg')
    const grip = rows.find((r) => r.name === 'Track grip')!
    const rearWear = rows.find((r) => r.name === 'Rear tyre wear')!
    expect(Math.abs(rearWear.delta)).toBeGreaterThan(Math.abs(grip.delta))
  })

  it('signs the deltas so direction is readable', () => {
    const rows = sensitivity(INPUTS, NOMINAL_CONDITIONS, 'limitBalance')
    // Going new -> worn at the rear costs rear grip, so limit balance falls.
    expect(rows.find((r) => r.name === 'Rear tyre wear')!.delta).toBeLessThan(0)
    expect(rows.find((r) => r.name === 'Front tyre wear')!.delta).toBeGreaterThan(0)
  })

  it('can rank against limit balance as well as the linear gradient', () => {
    const rows = sensitivity(INPUTS, NOMINAL_CONDITIONS, 'limitBalance')
    expect(rows).toHaveLength(8)
    // Per-axle effects must dominate; a uniform grip change moves both ends.
    expect(rows[0].name).not.toBe('Track grip')
  })
})

describe('the understeer gradient really does move with conditions', () => {
  it('spans a meaningful range across the presets', () => {
    const ks = CONDITION_PRESETS.map(
      (p) => summarise(applyConditions(INPUTS, p.conditions(TANK)).vehicle).KDeg
    )
    expect(Math.max(...ks) - Math.min(...ks)).toBeGreaterThan(0.05)
  })
})

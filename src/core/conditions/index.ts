/**
 * Changing conditions -- what actually happens to a car over a stint.
 *
 * The chapters give you a car at a moment. Real driving gives you a car whose
 * fuel is burning off, whose tyres are wearing and heating, on a surface whose
 * grip is changing. This module applies those as a transform on the reference
 * car and tyres, so every model already built reports the conditioned car
 * rather than the showroom one.
 *
 * PROVENANCE, because it matters here. Two very different kinds of model live
 * in this file:
 *
 *   - Fuel load is EXACT. Mass, CG position and yaw inertia follow from
 *     statics and the parallel axis theorem, with no fitted constants.
 *
 *   - Tyre temperature, pressure and wear are ENGINEERING PARAMETERISATIONS.
 *     Ch 2 §8 states their direction and importance but gives no curves:
 *     "peak mu is a strong function of tread temperature, with a well-defined
 *     optimum window", and "raising pressure typically raises C_alpha and
 *     lowers peak mu". The shapes here are chosen to honour those statements
 *     and to be adjustable; they are not from the book, and the app says so
 *     wherever it shows them.
 *
 * Everything funnels into one grip scale per axle, which is the same primitive
 * the Ch 2 balance control uses. That is deliberate: a wet track and a worn
 * rear tyre act on the car through exactly the same channel.
 */

import { MagicFormulaTire, type MagicFormulaParams } from '../tire/magicFormula.js'
import { scaleTire, scaleTireGrip, type GripScale } from '../tire/scale.js'
import { derive, type BicycleVehicle } from '../vehicle/params.js'
import { axleStiffnessFromTires } from '../vehicle/axle.js'
import { axleLimits, summarise } from '../vehicle/steadyState.js'
import { pairLimit } from '../vehicle/pairAnalysis.js'
import type { ChassisParams } from '../vehicle/chassis.js'

export interface Conditions {
  /** Fuel aboard, kg. */
  fuelMass: number
  /** Surface grip multiplier on peak friction. 1.0 = reference dry. */
  trackGrip: number
  /** Front tyre wear, 0 = new, 1 = fully worn. */
  wearFront: number
  wearRear: number
  /** Front tyre bulk temperature, degC. */
  tempFront: number
  tempRear: number
  /** Front hot pressure, kPa. */
  pressureFront: number
  pressureRear: number
}

export interface FuelTank {
  /** Full fuel load, kg. */
  capacity: number
  /** Tank centroid, m aft of the FRONT axle. */
  position: number
}

/**
 * The fitted constants behind the tyre condition models. Exposed rather than
 * buried so they can be argued with -- which is the honest way to ship a model
 * the source text does not supply.
 */
export interface ConditionTuning {
  /** Tyre temperature at which peak friction is highest, degC. */
  tempOptimum: number
  /** Friction lost per (100 degC)^2 away from the optimum. */
  tempSensitivity: number
  /** Floor on the temperature multiplier, so a cold tyre still grips somewhat. */
  tempFloor: number
  /** Reference hot pressure, kPa. */
  pressureReference: number
  /** Fractional friction lost per unit fractional pressure rise. */
  pressureMuSensitivity: number
  /** Fractional stiffness gained per unit fractional pressure rise. */
  pressureStiffnessSensitivity: number
  /** Friction lost at full wear. */
  wearMuLoss: number
  /** Stiffness change at full wear (positive: less tread squirm). */
  wearStiffnessGain: number
}

export const DEFAULT_TUNING: ConditionTuning = {
  tempOptimum: 90,
  tempSensitivity: 1.2,
  tempFloor: 0.5,
  pressureReference: 170,
  pressureMuSensitivity: 0.25,
  pressureStiffnessSensitivity: 0.35,
  wearMuLoss: 0.2,
  wearStiffnessGain: 0.05
}

export const NOMINAL_CONDITIONS: Conditions = {
  fuelMass: 0,
  trackGrip: 1,
  wearFront: 0,
  wearRear: 0,
  tempFront: DEFAULT_TUNING.tempOptimum,
  tempRear: DEFAULT_TUNING.tempOptimum,
  pressureFront: DEFAULT_TUNING.pressureReference,
  pressureRear: DEFAULT_TUNING.pressureReference
}

// ---------------------------------------------------------------------------
// Fuel -- exact
// ---------------------------------------------------------------------------

export interface FuelEffect {
  vehicle: BicycleVehicle
  /** Shift of the CG, m. Positive = rearward. */
  cgShift: number
  /** Change in yaw inertia, kg.m^2. */
  inertiaChange: number
}

/**
 * Add a fuel load to a dry car.
 *
 * Mass adds, the CG moves toward the tank, and yaw inertia grows by the
 * parallel-axis contributions of both masses about the NEW centre of gravity.
 * No fitted constants: this is statics.
 */
export function applyFuel(
  dry: BicycleVehicle,
  tank: FuelTank,
  fuelMass: number
): FuelEffect {
  if (fuelMass <= 0) return { vehicle: dry, cgShift: 0, inertiaChange: 0 }

  const { L } = derive(dry)
  const massTotal = dry.mass + fuelMass
  // Longitudinal stations measured aft of the front axle.
  const xDry = dry.a
  const xNew = (dry.mass * xDry + fuelMass * tank.position) / massTotal

  const izz =
    dry.izz +
    dry.mass * (xNew - xDry) ** 2 +
    fuelMass * (tank.position - xNew) ** 2

  return {
    vehicle: { ...dry, mass: massTotal, izz, a: xNew, b: L - xNew },
    cgShift: xNew - xDry,
    inertiaChange: izz - dry.izz
  }
}

// ---------------------------------------------------------------------------
// Tyre condition -- engineering parameterisations
// ---------------------------------------------------------------------------

/** Friction multiplier from tread temperature: a window about the optimum. */
export function temperatureFactor(temp: number, t: ConditionTuning): number {
  const off = (temp - t.tempOptimum) / 100
  return Math.max(1 - t.tempSensitivity * off * off, t.tempFloor)
}

/** Ch 2 §8: higher pressure raises cornering stiffness and lowers peak mu. */
export function pressureFactors(pressure: number, t: ConditionTuning): GripScale {
  const rel = (pressure - t.pressureReference) / t.pressureReference
  return {
    mu: Math.max(1 - t.pressureMuSensitivity * rel, 0.3),
    stiffness: Math.max(1 + t.pressureStiffnessSensitivity * rel, 0.3)
  }
}

export function wearFactors(wear: number, t: ConditionTuning): GripScale {
  const w = Math.min(Math.max(wear, 0), 1)
  return { mu: 1 - t.wearMuLoss * w, stiffness: 1 + t.wearStiffnessGain * w }
}

/** Everything acting on one axle's tyres, combined into a single grip scale. */
export function axleGripScale(
  trackGrip: number,
  wear: number,
  temp: number,
  pressure: number,
  t: ConditionTuning
): GripScale {
  const p = pressureFactors(pressure, t)
  const w = wearFactors(wear, t)
  return {
    mu: trackGrip * temperatureFactor(temp, t) * (p.mu ?? 1) * (w.mu ?? 1),
    stiffness: (p.stiffness ?? 1) * (w.stiffness ?? 1)
  }
}

// ---------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------

export interface ConditionInputs {
  /** The reference car, with no fuel aboard. */
  dryVehicle: BicycleVehicle
  /** The reference front tyre. */
  tire: MagicFormulaParams
  /** Rear tyre size relative to front. */
  rearTireScale: number
  /** Rear grip relative to front, before conditions. */
  rearGripScale: number
  tank: FuelTank
  tuning?: ConditionTuning
  /**
   * Suspension and mass geometry. When supplied, limits are computed by Ch 7
   * pair analysis with real wheel loads instead of the bicycle model.
   *
   * This matters more than it sounds. Without load transfer, an axle's limit
   * is just mu at its operating load, so mass very nearly cancels and fuel
   * appears almost free. With it, extra weight means extra transfer and the
   * capacity loss goes as its square -- which is the effect a driver actually
   * feels over a stint.
   */
  chassis?: ChassisParams
}

export interface AppliedConditions {
  /** The car as it now is: fuelled, with axle stiffnesses from the real tyres. */
  vehicle: BicycleVehicle
  tireFront: MagicFormulaParams
  tireRear: MagicFormulaParams
  gripFront: GripScale
  gripRear: GripScale
  fuel: FuelEffect
}

/**
 * Apply a set of conditions to the reference car and tyres.
 *
 * The step that makes conditions bite is the last one: axle cornering
 * stiffnesses are recomputed from the CONDITIONED tyres at the CONDITIONED
 * static loads. Without it, a wet track or a worn rear would change the limit
 * but leave the linear balance untouched, which is not what a driver feels.
 */
export function applyConditions(
  inp: ConditionInputs,
  c: Conditions
): AppliedConditions {
  const tuning = inp.tuning ?? DEFAULT_TUNING

  const fuel = applyFuel(inp.dryVehicle, inp.tank, c.fuelMass)

  const gripFront = axleGripScale(
    c.trackGrip,
    c.wearFront,
    c.tempFront,
    c.pressureFront,
    tuning
  )
  const rearBase = axleGripScale(
    c.trackGrip,
    c.wearRear,
    c.tempRear,
    c.pressureRear,
    tuning
  )
  // The rear's own baseline offset multiplies on top of its conditions.
  const gripRear: GripScale = {
    mu: (rearBase.mu ?? 1) * inp.rearGripScale,
    stiffness: (rearBase.stiffness ?? 1) * inp.rearGripScale
  }

  const tireFront = scaleTireGrip(inp.tire, gripFront)
  const tireRear = scaleTireGrip(scaleTire(inp.tire, inp.rearTireScale), gripRear)

  const stiffness = axleStiffnessFromTires(
    fuel.vehicle,
    new MagicFormulaTire(tireFront),
    new MagicFormulaTire(tireRear)
  )

  return {
    vehicle: { ...fuel.vehicle, ...stiffness },
    tireFront,
    tireRear,
    gripFront,
    gripRear,
    fuel
  }
}

// ---------------------------------------------------------------------------
// Named scenarios
// ---------------------------------------------------------------------------

export interface ConditionPreset {
  name: string
  /** One line on what this represents. */
  detail: string
  conditions: (tank: FuelTank) => Conditions
}

const T = DEFAULT_TUNING

export const CONDITION_PRESETS: ConditionPreset[] = [
  {
    name: 'Optimum',
    detail: 'Half fuel, tyres in their window, dry rubbered-in surface.',
    conditions: (tank) => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: tank.capacity * 0.5
    })
  },
  {
    name: 'Out-lap, cold tyres',
    detail: 'Full fuel, tyres far below their window, green track.',
    conditions: (tank) => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: tank.capacity,
      trackGrip: 0.94,
      tempFront: 45,
      tempRear: 42,
      pressureFront: T.pressureReference - 18,
      pressureRear: T.pressureReference - 18
    })
  },
  {
    name: 'Qualifying',
    detail: 'Low fuel, fresh tyres at temperature, best surface.',
    conditions: (tank) => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: tank.capacity * 0.15,
      trackGrip: 1.05
    })
  },
  {
    name: 'End of a long stint',
    detail: 'Nearly empty, tyres worn and hot, rears worse than fronts.',
    conditions: () => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: 3,
      wearFront: 0.55,
      wearRear: 0.8,
      tempFront: 104,
      tempRear: 112,
      pressureFront: T.pressureReference + 14,
      pressureRear: T.pressureReference + 18
    })
  },
  {
    name: 'Overheated rears',
    detail: 'The classic traction complaint: one end pushed past its window.',
    conditions: (tank) => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: tank.capacity * 0.4,
      wearRear: 0.4,
      tempFront: 95,
      tempRear: 135,
      pressureRear: T.pressureReference + 22
    })
  },
  {
    name: 'Wet',
    detail: 'Standing water: much less grip, and it arrives at a lower slip angle.',
    conditions: (tank) => ({
      ...NOMINAL_CONDITIONS,
      fuelMass: tank.capacity * 0.6,
      trackGrip: 0.62,
      tempFront: 62,
      tempRear: 60
    })
  }
]

// ---------------------------------------------------------------------------
// Sweeping a stint
// ---------------------------------------------------------------------------

export interface StintPoint {
  /** Lap number, 1-based. */
  lap: number
  fuelMass: number
  wearFront: number
  wearRear: number
  conditions: Conditions
}

export interface StintPlan {
  laps: number
  /** Fuel burned per lap, kg. */
  fuelPerLap: number
  /** Front tyre wear accumulated per lap, as a fraction of full wear. */
  wearFrontPerLap: number
  wearRearPerLap: number
  /** Temperature rise from lap 1 to fully up to temperature, degC. */
  warmupRise: number
  /** Laps taken to come up to temperature. */
  warmupLaps: number
  /** Pressure rise from cold to hot, kPa. */
  pressureRise: number
}

export const DEFAULT_STINT: StintPlan = {
  laps: 25,
  fuelPerLap: 2.2,
  wearFrontPerLap: 0.022,
  wearRearPerLap: 0.032,
  warmupRise: 40,
  warmupLaps: 3,
  pressureRise: 18
}

/**
 * The condition state lap by lap through a stint.
 *
 * Fuel burns linearly, wear accumulates linearly, and temperature and pressure
 * rise asymptotically toward their working values over the first few laps.
 * The point is not the fidelity of any one of those; it is that they move
 * TOGETHER and in opposite directions, which is why a car's balance rarely
 * drifts monotonically over a run.
 */
export function stintSweep(
  plan: StintPlan,
  tank: FuelTank,
  tuning: ConditionTuning = DEFAULT_TUNING
): StintPoint[] {
  const out: StintPoint[] = []
  for (let lap = 1; lap <= plan.laps; lap++) {
    const warm = 1 - Math.exp(-(lap - 1) / Math.max(plan.warmupLaps, 0.1))
    const wearFront = Math.min(plan.wearFrontPerLap * (lap - 1), 1)
    const wearRear = Math.min(plan.wearRearPerLap * (lap - 1), 1)
    const fuelMass = Math.max(tank.capacity - plan.fuelPerLap * (lap - 1), 0)

    const conditions: Conditions = {
      fuelMass,
      trackGrip: 1,
      wearFront,
      wearRear,
      // Rears run hotter and keep climbing as they wear.
      tempFront: tuning.tempOptimum - plan.warmupRise * (1 - warm) + 10 * wearFront,
      tempRear: tuning.tempOptimum - plan.warmupRise * (1 - warm) + 18 * wearRear,
      pressureFront: tuning.pressureReference - plan.pressureRise * (1 - warm),
      pressureRear: tuning.pressureReference - plan.pressureRise * (1 - warm) + 4 * wearRear
    }
    out.push({ lap, fuelMass, wearFront, wearRear, conditions })
  }
  return out
}

// ---------------------------------------------------------------------------
// Sensitivity -- which condition actually matters?
// ---------------------------------------------------------------------------


export interface ConditionMetrics {
  /**
   * Understeer gradient, deg/g -- balance in the LINEAR range, set by the
   * ratio of axle load to cornering stiffness.
   */
  understeerDeg: number
  /**
   * Balance AT THE LIMIT, g: how much lateral acceleration the rear axle has
   * in hand over the front. Positive means the front gives up first, so the
   * car pushes; negative means it spins.
   *
   * This is a genuinely different quantity from the understeer gradient, and
   * the two can move in OPPOSITE directions. Worn tyres are the standard case:
   * less tread means less squirm and so more cornering stiffness (raising the
   * linear gradient), while degraded rubber means less peak grip (lowering the
   * limit). A driver feels the second one.
   */
  limitBalance: number
  /** Limit lateral acceleration, g. */
  limitAy: number
  /** Which axle gives up first. */
  limitingAxle: 'front' | 'rear'
  /** Front axle limit, g -- the two together show HOW balanced the limit is. */
  limitAyFront: number
  limitAyRear: number
  /** Total mass, kg. */
  mass: number
  /** Front weight fraction. */
  frontWeightFraction: number
  /** Yaw inertia, kg.m^2. */
  izz: number
}

export function metricsFor(
  applied: AppliedConditions,
  chassis?: ChassisParams
): ConditionMetrics {
  const front = new MagicFormulaTire(applied.tireFront)
  const rear = new MagicFormulaTire(applied.tireRear)
  const limits = chassis
    ? pairLimit(applied.vehicle, chassis, front, rear)
    : axleLimits(applied.vehicle, front, rear)
  const s = summarise(applied.vehicle)
  const d = derive(applied.vehicle)
  return {
    understeerDeg: s.KDeg,
    limitBalance: limits.limitAyRear - limits.limitAyFront,
    limitAy: limits.limitAy,
    limitingAxle: limits.limitingAxle,
    limitAyFront: limits.limitAyFront,
    limitAyRear: limits.limitAyRear,
    mass: applied.vehicle.mass,
    frontWeightFraction: d.frontWeightFraction,
    izz: applied.vehicle.izz
  }
}

export type MetricKey = 'understeerDeg' | 'limitBalance' | 'limitAy'

export interface SensitivityRow {
  /** Human label for the condition that was varied. */
  name: string
  /** What it was varied between, for the caption. */
  range: string
  /** Metric value at the low end of the range. */
  low: number
  /** Metric value at the high end. */
  high: number
  /** Signed change across the range. */
  delta: number
}

/**
 * How much each condition moves a chosen metric, over a realistic range of
 * that condition.
 *
 * This answers a different question from a slider. A slider asks "what happens
 * if I change this?"; the ranking asks "of everything that changes on its own
 * during a stint, which one should I actually care about?" -- which is the
 * question Ch 9 §6 puts at the centre of development work.
 */
export function sensitivity(
  inp: ConditionInputs,
  base: Conditions,
  metric: MetricKey
): SensitivityRow[] {
  const evaluate = (c: Conditions): number =>
    metricsFor(applyConditions(inp, c), inp.chassis)[metric]

  const cases: { name: string; range: string; lo: Partial<Conditions>; hi: Partial<Conditions> }[] =
    [
      {
        name: 'Fuel load',
        range: `empty → ${inp.tank.capacity.toFixed(0)} kg`,
        lo: { fuelMass: 0 },
        hi: { fuelMass: inp.tank.capacity }
      },
      {
        name: 'Track grip',
        range: 'damp 0.80 → dry 1.05',
        lo: { trackGrip: 0.8 },
        hi: { trackGrip: 1.05 }
      },
      {
        name: 'Front tyre wear',
        range: 'new → worn out',
        lo: { wearFront: 0 },
        hi: { wearFront: 1 }
      },
      {
        name: 'Rear tyre wear',
        range: 'new → worn out',
        lo: { wearRear: 0 },
        hi: { wearRear: 1 }
      },
      {
        name: 'Front tyre temperature',
        range: '50 → 120 °C',
        lo: { tempFront: 50 },
        hi: { tempFront: 120 }
      },
      {
        name: 'Rear tyre temperature',
        range: '50 → 120 °C',
        lo: { tempRear: 50 },
        hi: { tempRear: 120 }
      },
      {
        name: 'Front pressure',
        range: '−25 → +25 kPa',
        lo: { pressureFront: base.pressureFront - 25 },
        hi: { pressureFront: base.pressureFront + 25 }
      },
      {
        name: 'Rear pressure',
        range: '−25 → +25 kPa',
        lo: { pressureRear: base.pressureRear - 25 },
        hi: { pressureRear: base.pressureRear + 25 }
      }
    ]

  return cases
    .map(({ name, range, lo, hi }) => {
      const low = evaluate({ ...base, ...lo })
      const high = evaluate({ ...base, ...hi })
      return { name, range, low, high, delta: high - low }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/**
 * The garage -- one car and one tire set, carried through every chapter.
 *
 * This is the app's central organising idea, taken straight from the course
 * overview §10: "carry a specific car and a specific problem through it ... at
 * each chapter compute that car's numbers." Every lab reads from this store
 * rather than owning its own parameters, so a change made in the tire lab is
 * immediately visible in the understeer gradient two chapters later.
 */

import { create } from 'zustand'
import {
  DEFAULT_MF,
  MagicFormulaTire,
  type MagicFormulaParams
} from '@core/tire/magicFormula.js'
import { scaleTire, scaleTireGrip } from '@core/tire/scale.js'
import { FORMULA_CAR, derive, type BicycleVehicle } from '@core/vehicle/params.js'
import type { FuelTank } from '@core/conditions/index.js'
import { FORMULA_CHASSIS, type ChassisParams } from '@core/vehicle/chassis.js'
import { HIGH_DOWNFORCE, type AeroParams } from '@core/aero/index.js'
import {
  FORMULA_COMPLIANCE,
  type AxleCompliance,
  type SuspensionCompliance
} from '@core/vehicle/understeerBudget.js'
import { DEFAULT_POWERTRAIN, type PowertrainParams } from '@core/performance/gg.js'

export type UnitSystem = 'SI' | 'Imperial'

/**
 * Axle cornering stiffnesses implied by a tire set at a car's static loads.
 * Two tires per axle, each carrying half the axle load.
 */
/** The rear tire spec: the front tire, resized and grip-scaled. */
export function rearTireParams(
  tire: MagicFormulaParams,
  rearScale: number,
  rearGrip: number
): MagicFormulaParams {
  return scaleTireGrip(scaleTire(tire, rearScale), { mu: rearGrip, stiffness: rearGrip })
}

export function stiffnessFromTires(
  vehicle: BicycleVehicle,
  tire: MagicFormulaParams,
  rearScale: number,
  rearGrip = 1
): { cf: number; cr: number } {
  const { wf, wr } = derive(vehicle)
  const front = new MagicFormulaTire(tire)
  const rear = new MagicFormulaTire(rearTireParams(tire, rearScale, rearGrip))
  return {
    cf: 2 * front.corneringStiffness(wf / 2),
    cr: 2 * rear.corneringStiffness(wr / 2)
  }
}

const DEFAULT_REAR_SCALE = 1.3
/**
 * The app opens on a mildly understeering car rather than a neutral one.
 * A neutral car draws two identical slip angles, which is the least
 * informative first impression the cornering diagram could give.
 */
const DEFAULT_REAR_GRIP = 1.12

/**
 * Start self-consistent: the linear model's Cf and Cr are the ones this tire
 * set actually produces at this car's static loads. Otherwise the Ch 5 lab
 * opens with its linear and nonlinear curves disagreeing for no reason the
 * user can see.
 */
const INITIAL_VEHICLE: BicycleVehicle = {
  ...FORMULA_CAR,
  ...stiffnessFromTires(FORMULA_CAR, DEFAULT_MF, DEFAULT_REAR_SCALE, DEFAULT_REAR_GRIP)
}

interface GarageState {
  vehicle: BicycleVehicle
  /** Front tire specification. */
  tire: MagicFormulaParams
  /** Rear tire size relative to the front. 1.0 = square, >1 = staggered. */
  rearTireScale: number
  /** Rear grip relative to the front -- compound, temperature, wear, surface. */
  rearGripScale: number
  /** Reference speed used by the labs that need one, m/s. */
  speed: number
  /** Fuel tank, for the conditions lab. */
  tank: FuelTank
  /** Suspension and mass geometry -- Ch 18. */
  chassis: ChassisParams
  /** Aerodynamics -- Ch 3 and 15. */
  aero: AeroParams
  /**
   * Suspension compliance and roll geometry -- Ch 17, 19 and 23.
   *
   * Lives in the garage rather than in the Ch 5 lab because it is a property of
   * the car, and because the understeer budget's whole point is that Chapter 5
   * cannot fill in its own table: the rows come from four other chapters.
   */
  compliance: SuspensionCompliance
  /** Engine and braking, for the g-g envelope -- Ch 9. */
  powertrain: PowertrainParams
  units: UnitSystem

  setVehicle: (patch: Partial<BicycleVehicle>) => void
  replaceVehicle: (v: BicycleVehicle) => void
  setTire: (patch: Partial<MagicFormulaParams>) => void
  setRearTireScale: (s: number) => void
  setRearGripScale: (s: number) => void
  setSpeed: (v: number) => void
  setTank: (t: Partial<FuelTank>) => void
  setChassis: (c: Partial<ChassisParams>) => void
  setAero: (a: Partial<AeroParams>) => void
  setCompliance: (axle: 'front' | 'rear', patch: Partial<AxleCompliance>) => void
  setPowertrain: (p: Partial<PowertrainParams>) => void
  setUnits: (u: UnitSystem) => void
  /**
   * Overwrite the axle cornering stiffnesses with the values the current tire
   * set actually produces at the current static axle loads. This is the bridge
   * from Ch 2 to Ch 5 -- and doing it explicitly, rather than silently, is the
   * point: Cf and Cr are *consequences* of the tires and the loads, not
   * independent parameters.
   */
  syncStiffnessFromTire: () => void
}

export const useGarage = create<GarageState>((set, get) => ({
  vehicle: INITIAL_VEHICLE,
  tire: { ...DEFAULT_MF },
  rearTireScale: DEFAULT_REAR_SCALE,
  rearGripScale: DEFAULT_REAR_GRIP,
  speed: 40,
  // A formula car's tank sits behind the driver, just ahead of the engine --
  // aft of the CG, so burning fuel moves the balance forward.
  tank: { capacity: 60, position: 1.9 },
  chassis: { ...FORMULA_CHASSIS },
  aero: { ...HIGH_DOWNFORCE },
  compliance: {
    front: { ...FORMULA_COMPLIANCE.front },
    rear: { ...FORMULA_COMPLIANCE.rear }
  },
  powertrain: { ...DEFAULT_POWERTRAIN },
  units: 'SI',

  setVehicle: (patch) => set((s) => ({ vehicle: { ...s.vehicle, ...patch } })),
  replaceVehicle: (v) => set({ vehicle: { ...v } }),
  setTire: (patch) => set((s) => ({ tire: { ...s.tire, ...patch } })),
  setRearTireScale: (rearTireScale) => set({ rearTireScale }),
  setRearGripScale: (rearGripScale) => set({ rearGripScale }),
  setSpeed: (speed) => set({ speed }),
  setTank: (t) => set((s) => ({ tank: { ...s.tank, ...t } })),
  setChassis: (c) => set((s) => ({ chassis: { ...s.chassis, ...c } })),
  setAero: (a) => set((s) => ({ aero: { ...s.aero, ...a } })),
  setCompliance: (axle, patch) =>
    set((s) => ({
      compliance: { ...s.compliance, [axle]: { ...s.compliance[axle], ...patch } }
    })),
  setPowertrain: (p) => set((s) => ({ powertrain: { ...s.powertrain, ...p } })),
  setUnits: (units) => set({ units }),

  syncStiffnessFromTire: () => {
    const { vehicle, tire, rearTireScale, rearGripScale } = get()
    set({
      vehicle: {
        ...vehicle,
        ...stiffnessFromTires(vehicle, tire, rearTireScale, rearGripScale)
      }
    })
  }
}))

/** Front and rear tire models built from the current garage state. */
export function useTireModels(): { front: MagicFormulaTire; rear: MagicFormulaTire } {
  const tire = useGarage((s) => s.tire)
  const rearScale = useGarage((s) => s.rearTireScale)
  const rearGrip = useGarage((s) => s.rearGripScale)
  return {
    front: new MagicFormulaTire(tire),
    rear: new MagicFormulaTire(rearTireParams(tire, rearScale, rearGrip))
  }
}

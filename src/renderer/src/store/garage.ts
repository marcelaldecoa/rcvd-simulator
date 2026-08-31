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
import { scaleTire } from '@core/tire/scale.js'
import { FORMULA_CAR, derive, type BicycleVehicle } from '@core/vehicle/params.js'

export type UnitSystem = 'SI' | 'Imperial'

/**
 * Axle cornering stiffnesses implied by a tire set at a car's static loads.
 * Two tires per axle, each carrying half the axle load.
 */
export function stiffnessFromTires(
  vehicle: BicycleVehicle,
  tire: MagicFormulaParams,
  rearScale: number
): { cf: number; cr: number } {
  const { wf, wr } = derive(vehicle)
  const front = new MagicFormulaTire(tire)
  const rear = new MagicFormulaTire(scaleTire(tire, rearScale))
  return {
    cf: 2 * front.corneringStiffness(wf / 2),
    cr: 2 * rear.corneringStiffness(wr / 2)
  }
}

const DEFAULT_REAR_SCALE = 1.3

/**
 * Start self-consistent: the linear model's Cf and Cr are the ones this tire
 * set actually produces at this car's static loads. Otherwise the Ch 5 lab
 * opens with its linear and nonlinear curves disagreeing for no reason the
 * user can see.
 */
const INITIAL_VEHICLE: BicycleVehicle = {
  ...FORMULA_CAR,
  ...stiffnessFromTires(FORMULA_CAR, DEFAULT_MF, DEFAULT_REAR_SCALE)
}

interface GarageState {
  vehicle: BicycleVehicle
  /** Front tire specification. */
  tire: MagicFormulaParams
  /** Rear tire size relative to the front. 1.0 = square, >1 = staggered. */
  rearTireScale: number
  /** Reference speed used by the labs that need one, m/s. */
  speed: number
  units: UnitSystem

  setVehicle: (patch: Partial<BicycleVehicle>) => void
  replaceVehicle: (v: BicycleVehicle) => void
  setTire: (patch: Partial<MagicFormulaParams>) => void
  setRearTireScale: (s: number) => void
  setSpeed: (v: number) => void
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
  speed: 40,
  units: 'SI',

  setVehicle: (patch) => set((s) => ({ vehicle: { ...s.vehicle, ...patch } })),
  replaceVehicle: (v) => set({ vehicle: { ...v } }),
  setTire: (patch) => set((s) => ({ tire: { ...s.tire, ...patch } })),
  setRearTireScale: (rearTireScale) => set({ rearTireScale }),
  setSpeed: (speed) => set({ speed }),
  setUnits: (units) => set({ units }),

  syncStiffnessFromTire: () => {
    const { vehicle, tire, rearTireScale } = get()
    set({ vehicle: { ...vehicle, ...stiffnessFromTires(vehicle, tire, rearTireScale) } })
  }
}))

/** Front and rear tire models built from the current garage state. */
export function useTireModels(): { front: MagicFormulaTire; rear: MagicFormulaTire } {
  const tire = useGarage((s) => s.tire)
  const rearScale = useGarage((s) => s.rearTireScale)
  return {
    front: new MagicFormulaTire(tire),
    rear: new MagicFormulaTire(scaleTire(tire, rearScale))
  }
}

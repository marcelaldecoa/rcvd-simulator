/**
 * The bridge from tyres to the bicycle model.
 *
 * Ch 5's Cf and Cr are not independent parameters -- they are what the tyres
 * actually produce at the loads the car actually puts on them. Keeping that as
 * a named function rather than an inline calculation is the point: anything
 * that changes the tyres or the loads must be able to ask for the new values.
 */

import type { TireModel } from '../tire/types.js'
import { derive, type BicycleVehicle } from './params.js'

/** Axle cornering stiffnesses, N/rad, with two tyres per axle. */
export function axleStiffnessFromTires(
  v: BicycleVehicle,
  tireFront: TireModel,
  tireRear: TireModel
): { cf: number; cr: number } {
  const { wf, wr } = derive(v)
  return {
    cf: 2 * tireFront.corneringStiffness(wf / 2),
    cr: 2 * tireRear.corneringStiffness(wr / 2)
  }
}

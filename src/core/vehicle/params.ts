/**
 * The parameter set of the "elementary automobile" -- Ch 5 §2.
 *
 * Six parameters reproduce an astonishing fraction of real handling behaviour.
 * That is the argument for studying it, and the argument for this being the
 * root object every Part I lab in the app hangs off.
 */

import { G } from '../util/numeric.js'

export interface BicycleVehicle {
  name: string
  /** Total mass, kg. */
  mass: number
  /** Yaw moment of inertia about the CG, kg.m^2. */
  izz: number
  /** CG to front axle, m. */
  a: number
  /** CG to rear axle, m. */
  b: number
  /** Front AXLE cornering stiffness (both tires), N/rad. */
  cf: number
  /** Rear AXLE cornering stiffness (both tires), N/rad. */
  cr: number
  /** Steering ratio, handwheel degrees per road wheel degree. */
  steeringRatio: number
}

export interface DerivedVehicle {
  /** Wheelbase, m. */
  L: number
  /** Static front axle load, N. */
  wf: number
  /** Static rear axle load, N. */
  wr: number
  /** Total weight, N. */
  w: number
  /** Fraction of weight on the front axle. */
  frontWeightFraction: number
  /** Dynamic index Izz/(m*a*b) -- Ch 4. Unity means front and rear respond independently. */
  dynamicIndex: number
  /** Radius of gyration in yaw, m. */
  yawRadiusOfGyration: number
}

export function derive(v: BicycleVehicle): DerivedVehicle {
  const L = v.a + v.b
  const w = v.mass * G
  const wf = (w * v.b) / L
  const wr = (w * v.a) / L
  const k = Math.sqrt(v.izz / v.mass)
  return {
    L,
    w,
    wf,
    wr,
    frontWeightFraction: v.b / L,
    dynamicIndex: v.izz / (v.mass * v.a * v.b),
    yawRadiusOfGyration: k
  }
}

/**
 * Rebuild a vehicle from the quantities an engineer actually measures:
 * wheelbase, front weight fraction, mass, and radius of gyration.
 */
export function fromMeasurements(opts: {
  name: string
  mass: number
  wheelbase: number
  frontWeightFraction: number
  yawRadiusOfGyration: number
  cf: number
  cr: number
  steeringRatio: number
}): BicycleVehicle {
  const b = opts.wheelbase * opts.frontWeightFraction
  return {
    name: opts.name,
    mass: opts.mass,
    izz: opts.mass * opts.yawRadiusOfGyration ** 2,
    a: opts.wheelbase - b,
    b,
    cf: opts.cf,
    cr: opts.cr,
    steeringRatio: opts.steeringRatio
  }
}

/** The car from Exercise 6.1 -- a useful known-answer reference. */
export const EXERCISE_6_1: BicycleVehicle = {
  name: 'Exercise 6.1 reference car',
  mass: 1000,
  izz: 1400,
  a: 1.25,
  b: 1.35,
  cf: 80000,
  cr: 90000,
  steeringRatio: 15
}

/**
 * A representative downforce-free formula car.
 * Izz gives a radius of gyration of 1.25 m and a dynamic index of 0.70 --
 * mass-centralised, but not implausibly so.
 */
export const FORMULA_CAR: BicycleVehicle = {
  name: 'Formula car (no aero)',
  mass: 700,
  izz: 1100,
  a: 1.55,
  b: 1.45,
  cf: 105000,
  cr: 135000,
  steeringRatio: 10
}

/** A representative GT / touring car. */
export const GT_CAR: BicycleVehicle = {
  name: 'GT car',
  mass: 1300,
  izz: 1900,
  a: 1.30,
  b: 1.35,
  cf: 145000,
  cr: 160000,
  steeringRatio: 14
}

export const VEHICLE_PRESETS: BicycleVehicle[] = [FORMULA_CAR, GT_CAR, EXERCISE_6_1]

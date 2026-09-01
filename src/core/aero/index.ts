/**
 * Aerodynamics -- Ch 3 (fundamentals) and Ch 15 (applied).
 *
 * The change aerodynamics makes to everything else is that grip stops being a
 * property of the car and becomes a property of the car AT A SPEED. Downforce
 * adds vertical load, load adds capacity, so the limit rises with V^2 -- until
 * load sensitivity and, eventually, the tyres' own limits take over.
 *
 * The integration point is deliberately narrow: this module turns speed into
 * an extra vertical load per axle, and `wheelLoads` accepts it. Everything
 * downstream -- pair analysis, limits, balance, the conditions model -- then
 * becomes speed-dependent without knowing anything about aerodynamics.
 *
 * Sign convention, because Ch 3 §6 warns about it explicitly: `clA` here is
 * DOWNFORCE-positive. Aeronautical practice has positive C_L pointing up; race
 * car practice usually reports downforce as positive. Stated here so nobody has
 * to guess.
 */

import { G } from '../util/numeric.js'

/** Specific gas constant for dry air, J/(kg.K). */
export const R_AIR = 287.05
/** Standard sea-level density, kg/m^3. */
export const RHO_SEA_LEVEL = 1.225

export interface AeroParams {
  name?: string
  /** Air density, kg/m^3. */
  rho: number
  /** Downforce coefficient times reference area, m^2. Downforce-positive. */
  clA: number
  /** Drag coefficient times reference area, m^2. */
  cdA: number
  /** Fraction of total downforce carried by the front axle. */
  aeroBalance: number
  /** Rolling resistance coefficient (Ch 2 §8). */
  rollingResistance: number
}

/** Air density from the ideal gas law -- Ch 3 §2. */
export function airDensity(pressurePa: number, temperatureK: number): number {
  return pressurePa / (R_AIR * temperatureK)
}

/** Dynamic pressure q = rho*V^2/2, Pa. Ch 3 §3. */
export function dynamicPressure(rho: number, speed: number): number {
  return 0.5 * rho * speed * speed
}

/** Total downforce at a speed, N. */
export function downforce(a: AeroParams, speed: number): number {
  return dynamicPressure(a.rho, speed) * a.clA
}

/** Aerodynamic drag at a speed, N. */
export function drag(a: AeroParams, speed: number): number {
  return dynamicPressure(a.rho, speed) * a.cdA
}

/** Power required to overcome drag alone, W. */
export function dragPower(a: AeroParams, speed: number): number {
  return drag(a, speed) * speed
}

export interface AeroLoads {
  /** Extra vertical load on the front axle, N. */
  front: number
  /** Extra vertical load on the rear axle, N. */
  rear: number
  /** Total downforce, N. */
  total: number
  /** Drag at this speed, N. */
  drag: number
}

/**
 * Downforce split between the axles at a given speed.
 *
 * This is the object `wheelLoads` consumes. Aero balance is treated as a
 * constant here; Ch 15 §9 is emphatic that on a real car it is not — it moves
 * with ride height, rake, pitch, roll, yaw and the wake of the car ahead, and
 * that variation matters more than the peak figure. Modelling it properly needs
 * an aero map, which is beyond what the course notes supply.
 */
export function aeroLoads(a: AeroParams, speed: number): AeroLoads {
  const total = downforce(a, speed)
  return {
    front: total * a.aeroBalance,
    rear: total * (1 - a.aeroBalance),
    total,
    drag: drag(a, speed)
  }
}

/** Zero aero, for cars and comparisons without it. */
export const NO_AERO: AeroLoads = { front: 0, rear: 0, total: 0, drag: 0 }

/**
 * Maximum steady cornering speed on a given radius, m/s -- Ch 3, Exercise 3.5.
 *
 *   m V^2 / R = mu (m g + q C_L A)
 *   =>  V^2 ( m/R - mu rho C_L A / 2 ) = mu m g
 *
 * Returns Infinity when the denominator goes non-positive. That is not a
 * failure: it is the statement that downforce grows faster than the demand,
 * so grip never runs out and the car is limited by something else entirely --
 * power, tyre temperature, structure, or the driver's neck. Ch 3 calls this
 * near-singularity the mathematical signature of the ground-effect era.
 */
export function maxCorneringSpeed(
  mass: number,
  radius: number,
  mu: number,
  a: AeroParams
): number {
  const denom = mass / radius - (mu * a.rho * a.clA) / 2
  if (denom <= 0) return Infinity
  return Math.sqrt((mu * mass * G) / denom)
}

/** The same corner without any downforce, for comparison: V = sqrt(mu g R). */
export function maxCorneringSpeedNoAero(radius: number, mu: number): number {
  return Math.sqrt(mu * G * radius)
}

/**
 * Fit C_D A from a coastdown deceleration -- Ch 3, Exercise 3.6.
 *
 *   m a = q C_D A + f_r m g
 */
export function cdaFromCoastdown(
  mass: number,
  speed: number,
  deceleration: number,
  rollingResistance: number,
  rho = RHO_SEA_LEVEL
): number {
  const total = mass * deceleration
  const rolling = rollingResistance * mass * G
  return (total - rolling) / dynamicPressure(rho, speed)
}

/** Rolling resistance coefficient from a low-speed coastdown, where drag is negligible. */
export function rollingResistanceFromCoastdown(deceleration: number): number {
  return deceleration / G
}

/**
 * Speed at which downforce equals the car's weight -- the figure everyone
 * quotes, and a useful single number for how much aerodynamic grip a car has.
 */
export function speedAtOneG(mass: number, a: AeroParams): number {
  if (a.clA <= 0) return Infinity
  return Math.sqrt((2 * mass * G) / (a.rho * a.clA))
}

/**
 * Efficiency, L/D. Ch 15 §6 notes induced drag is typically 80%+ of a race
 * wing's drag, so this is the number that decides whether more wing is worth it.
 */
export function aeroEfficiency(a: AeroParams): number {
  return a.cdA > 0 ? a.clA / a.cdA : 0
}

/**
 * Aerodynamic balance expressed the way a race engineer reads it: the
 * longitudinal position of the centre of pressure, as a fraction of wheelbase
 * aft of the front axle.
 */
export function centreOfPressure(a: AeroParams): number {
  return 1 - a.aeroBalance
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** A modern high-downforce single-seater. */
export const HIGH_DOWNFORCE: AeroParams = {
  name: 'High downforce',
  rho: RHO_SEA_LEVEL,
  clA: 3.0,
  cdA: 1.15,
  aeroBalance: 0.45,
  rollingResistance: 0.015
}

/** A GT or sports prototype: real downforce, but far less of it. */
export const GT_AERO: AeroParams = {
  name: 'GT / sports car',
  rho: RHO_SEA_LEVEL,
  clA: 1.1,
  cdA: 0.85,
  aeroBalance: 0.42,
  rollingResistance: 0.015
}

/** A low-drag configuration: superspeedway or Le Mans trim. */
export const LOW_DRAG: AeroParams = {
  name: 'Low drag trim',
  rho: RHO_SEA_LEVEL,
  clA: 1.4,
  cdA: 0.62,
  aeroBalance: 0.44,
  rollingResistance: 0.015
}

/** No aerodynamic assistance at all. */
export const NO_WINGS: AeroParams = {
  name: 'No aero',
  rho: RHO_SEA_LEVEL,
  clA: 0,
  cdA: 0.9,
  aeroBalance: 0.5,
  rollingResistance: 0.015
}

export const AERO_PRESETS: AeroParams[] = [HIGH_DOWNFORCE, GT_AERO, LOW_DRAG, NO_WINGS]

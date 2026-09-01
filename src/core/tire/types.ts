/**
 * Tire model interfaces.
 *
 * SIGN CONVENTION (stated at the top, per Ch 2 §9):
 * This library uses the *practitioner* convention throughout:
 *   - Vertical load Fz is POSITIVE in compression (a loaded tire has Fz > 0).
 *   - A POSITIVE slip angle produces a POSITIVE lateral force.
 *   - Aligning torque Mz is POSITIVE when it acts to restore the wheel toward
 *     zero slip angle, i.e. Mz = Fy * t_p with t_p the pneumatic trail.
 *
 * Strict SAE has Z downward (Fz negative up) and positive alpha producing
 * negative Fy. Ch 2 §2.2 notes that most practitioners quietly flip both, and
 * that the important thing is to write the convention down. This is that.
 *
 * All units are SI: angles in radians, forces in newtons, lengths in metres,
 * stiffnesses in N/rad.
 */

export interface TireState {
  /** Slip angle, rad. */
  alpha: number
  /** Vertical load, N, positive in compression. */
  fz: number
  /** Inclination angle (camber), rad. Positive = top of wheel outboard (SAE). */
  gamma?: number
  /** Longitudinal slip ratio, SAE definition (Omega*Re - Vx)/Vx. */
  kappa?: number
}

export interface TireForces {
  /** Lateral force, N. */
  fy: number
  /** Longitudinal force, N. */
  fx: number
  /** Aligning torque, N.m. */
  mz: number
  /** Pneumatic trail, m. */
  pneumaticTrail: number
}

export interface TireModel {
  readonly name: string
  /** Lateral force at pure slip, N. */
  fy(alpha: number, fz: number, gamma?: number): number
  /** Aligning torque at pure slip, N.m. */
  mz(alpha: number, fz: number, gamma?: number): number
  /** Pneumatic trail at pure slip, m. */
  pneumaticTrail(alpha: number, fz: number): number
  /** Longitudinal force at pure longitudinal slip, N. */
  fx(kappa: number, fz: number): number
  /** Combined-slip forces. */
  combined(state: TireState): TireForces
  /** Slope of the Fy-alpha curve at the origin, N/rad. */
  corneringStiffness(fz: number): number
  /** Camber thrust per radian of inclination angle, N/rad. */
  camberStiffness(fz: number): number
  /** Effective lateral friction coefficient at this load (peak Fy / Fz). */
  muY(fz: number): number
  /** Effective longitudinal friction coefficient at this load. */
  muX(fz: number): number
}

/** Peak of a force curve, found numerically. */
export interface CurvePeak {
  /** Slip angle (rad) or slip ratio at which the peak occurs. */
  at: number
  /** Force at the peak, N. */
  value: number
}

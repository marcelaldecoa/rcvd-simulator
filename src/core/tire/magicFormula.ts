/**
 * Magic Formula (Pacejka) tire model -- Ch 2 §2.3 and Ch 14 §8.
 *
 *   Fy = D * sin( C * arctan[ B*alpha - E*(B*alpha - arctan(B*alpha)) ] )
 *
 * where D is the peak, BCD is the slope at the origin (the cornering
 * stiffness), C the shape factor and E the curvature factor. It has no
 * physical derivation but is superbly well-behaved for interpolation, which is
 * why it is the industry standard.
 *
 * Load sensitivity enters through D = mu_y(Fz)*Fz and through the standard
 * saturating stiffness form BCD = caMax*sin(2*atan(Fz/fzAtPeakStiffness)).
 *
 * Pneumatic trail uses Pacejka's cosine form, parameterised here by the ratio
 * of the slip angle at which trail reaches zero to the slip angle at which Fy
 * peaks. Ch 2 §4: "Near the lateral force peak, t_p -> 0" -- so the default
 * ratio is 1.0, and moving it is a direct experiment on the driver's
 * front-limit warning.
 */

import { clamp, goldenMax, toRad } from '../util/numeric.js'
import { muAtLoad, type LoadSensitivity } from './loadSensitivity.js'
import type { CurvePeak, TireForces, TireModel, TireState } from './types.js'

export interface MagicFormulaParams {
  name?: string
  lateral: LoadSensitivity
  longitudinal: LoadSensitivity
  /** Peak cornering stiffness, N/rad. */
  caMax: number
  /** Load at which cornering stiffness peaks, N. */
  fzAtPeakStiffness: number
  /** Lateral shape factor C. ~1.3 for a passenger tire, 1.4-1.6 for a slick. */
  shapeC: number
  /**
   * Slip angle at which lateral force peaks AT THE REFERENCE LOAD, degrees.
   * Ch 2 §2.2: 4-8 deg for a slick, 8-14 deg for a road tire.
   *
   * This replaces the curvature factor E as the user-facing knob, because a
   * peak slip angle is something you can measure and reason about while E is
   * not. E is solved from it in closed form (see curvatureE below) and then
   * held FIXED across load -- which makes the peak slip angle rise with load
   * on its own, the behaviour that motivates anti-Ackermann in Ch 19.
   */
  peakSlipAngleDeg: number
  /** Longitudinal slip stiffness, N per unit slip ratio. */
  slipStiffness: number
  /** Longitudinal shape factor. */
  shapeCx: number
  /** Slip ratio at which longitudinal force peaks at the reference load. */
  peakSlipRatio: number
  /** Camber stiffness as a fraction of cornering stiffness. */
  camberStiffnessRatio: number
  /** Full contact patch length, m -- sets the small-slip pneumatic trail. */
  contactLength: number
  /** (slip angle where trail = 0) / (slip angle where Fy peaks). */
  trailZeroRatio: number
}

export const DEFAULT_MF: MagicFormulaParams = {
  name: 'Magic Formula (slick)',
  lateral: { mu0: 1.55, fz0: 4000, kMu: 0.12 },
  longitudinal: { mu0: 1.7, fz0: 4000, kMu: 0.12 },
  caMax: 130000,
  fzAtPeakStiffness: 5500,
  shapeC: 1.45,
  peakSlipAngleDeg: 6,
  slipStiffness: 220000,
  shapeCx: 1.6,
  peakSlipRatio: 0.11,
  camberStiffnessRatio: 0.12,
  contactLength: 0.16,
  trailZeroRatio: 1.0
}

/** The Magic Formula kernel, normalised so the caller supplies B, C, D, E. */
export function magic(x: number, B: number, C: number, D: number, E: number): number {
  const bx = B * x
  return D * Math.sin(C * Math.atan(bx - E * (bx - Math.atan(bx))))
}

export class MagicFormulaTire implements TireModel {
  readonly name: string
  private eLat: number | undefined
  private eLong: number | undefined

  constructor(readonly p: MagicFormulaParams) {
    this.name = p.name ?? 'Magic Formula'
  }

  muY(fz: number): number {
    return muAtLoad(this.p.lateral, fz)
  }

  muX(fz: number): number {
    return muAtLoad(this.p.longitudinal, fz)
  }

  corneringStiffness(fz: number): number {
    if (fz <= 0) return 0
    return this.p.caMax * Math.sin(2 * Math.atan(fz / this.p.fzAtPeakStiffness))
  }

  camberStiffness(fz: number): number {
    return this.corneringStiffness(fz) * this.p.camberStiffnessRatio
  }

  get trailAtZeroSlip(): number {
    return this.p.contactLength / 6
  }

  /**
   * Curvature factor E solved from a desired peak location.
   *
   * The Magic Formula peaks where C*atan(x - E*(x - atan x)) = pi/2, i.e. where
   *   x - E*(x - atan x) = tan(pi/(2C))
   * with x = B * (slip at the peak). Solving for E is exact:
   *   E = (x - tan(pi/(2C))) / (x - atan x)
   *
   * E must stay below 1 for a well-behaved curve; the clamp catches parameter
   * combinations that ask for a peak the stiffness and friction cannot produce
   * (e.g. a peak slip angle so low that the curve would have to bend back).
   */
  private static solveE(B: number, C: number, slipAtPeak: number): number {
    const x = B * slipAtPeak
    const denom = x - Math.atan(x)
    if (denom < 1e-9) return 0
    const e = (x - Math.tan(Math.PI / (2 * C))) / denom
    return clamp(e, -20, 0.98)
  }

  /** Lateral curvature factor, evaluated once at the reference load. */
  get curvatureE(): number {
    if (this.eLat === undefined) {
      const fz0 = this.p.lateral.fz0
      const C = this.p.shapeC
      const D = this.muY(fz0) * fz0
      const B = D > 0 ? this.corneringStiffness(fz0) / (C * D) : 0
      this.eLat = MagicFormulaTire.solveE(B, C, toRad(this.p.peakSlipAngleDeg))
    }
    return this.eLat
  }

  /** Longitudinal curvature factor, evaluated once at the reference load. */
  get curvatureEx(): number {
    if (this.eLong === undefined) {
      const fz0 = this.p.longitudinal.fz0
      const C = this.p.shapeCx
      const D = this.muX(fz0) * fz0
      const B = D > 0 ? this.p.slipStiffness / (C * D) : 0
      this.eLong = MagicFormulaTire.solveE(B, C, this.p.peakSlipRatio)
    }
    return this.eLong
  }

  /** Lateral B, C, D, E for a given load. */
  coefficients(fz: number): { B: number; C: number; D: number; E: number } {
    const C = this.p.shapeC
    const D = this.muY(fz) * fz
    const BCD = this.corneringStiffness(fz)
    const B = D > 0 ? BCD / (C * D) : 0
    return { B, C, D, E: this.curvatureE }
  }

  fy(alpha: number, fz: number, gamma = 0): number {
    if (fz <= 0) return 0
    const { B, C, D, E } = this.coefficients(fz)
    const total = magic(alpha, B, C, D, E) + this.camberStiffness(fz) * gamma
    const cap = this.muY(fz) * fz
    return Math.sign(total) * Math.min(Math.abs(total), cap)
  }

  fx(kappa: number, fz: number): number {
    if (fz <= 0) return 0
    const C = this.p.shapeCx
    const D = this.muX(fz) * fz
    const B = D > 0 ? this.p.slipStiffness / (C * D) : 0
    return magic(kappa, B, C, D, this.curvatureEx)
  }

  peakFy(fz: number): CurvePeak {
    return goldenMax((a) => this.fy(a, fz), 0, toRad(30))
  }

  peakFx(fz: number): CurvePeak {
    return goldenMax((k) => this.fx(k, fz), 0, 0.6)
  }

  /**
   * Pneumatic trail by Pacejka's cosine form. Ch 2 §4: trail starts near
   * L_contact/6, decays as the rear of the patch slides, and reaches zero near
   * the lateral force peak -- which is why steering torque warns of the front
   * limit before grip actually goes.
   */
  pneumaticTrail(alpha: number, fz: number): number {
    if (fz <= 0) return 0
    const Ct = 1.2
    const alphaZero = Math.max(this.peakFy(fz).at * this.p.trailZeroRatio, 1e-4)
    const Bt = Math.tan(Math.PI / (2 * Ct)) / alphaZero
    return this.trailAtZeroSlip * Math.cos(Ct * Math.atan(Bt * Math.abs(alpha)))
  }

  mz(alpha: number, fz: number, gamma = 0): number {
    return this.pneumaticTrail(alpha, fz) * this.fy(alpha, fz, gamma)
  }

  combined(state: TireState): TireForces {
    const { alpha, fz, gamma = 0, kappa = 0 } = state
    if (fz <= 0) return { fy: 0, fx: 0, mz: 0, pneumaticTrail: 0 }

    const aPeak = this.peakFy(fz).at || 1e-6
    const kPeak = this.peakFx(fz).at || 1e-6
    const sy = Math.tan(alpha) / Math.tan(aPeak)
    const sx = kappa / kPeak
    const s = Math.hypot(sx, sy)

    if (s < 1e-12) {
      return {
        fy: this.camberStiffness(fz) * gamma,
        fx: 0,
        mz: 0,
        pneumaticTrail: this.trailAtZeroSlip
      }
    }

    const alphaEq = Math.atan(s * Math.tan(aPeak))
    const kappaEq = s * kPeak
    const fyMag = Math.abs(this.fy(alphaEq, fz))
    const fxMag = Math.abs(this.fx(kappaEq, fz))

    const fy = (sy / s) * fyMag + this.camberStiffness(fz) * gamma
    const fx = (sx / s) * fxMag
    const tp = this.pneumaticTrail(alphaEq, fz)
    return { fy, fx, mz: tp * fy, pneumaticTrail: tp }
  }
}

/** Convenience: build the two default tire models. */
export function defaultTireModels(): { mf: MagicFormulaTire; label: string }[] {
  return [{ mf: new MagicFormulaTire(DEFAULT_MF), label: DEFAULT_MF.name! }]
}

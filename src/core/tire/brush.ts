/**
 * Brush / Fiala tire model -- Ch 2 §2.3.
 *
 * The cheapest model that reproduces the correct shape: linear at the origin,
 * smooth rollover, saturation at mu*Fz. Its value here is that it *explains*
 * the shape rather than fitting it, and it gives the pneumatic trail collapse
 * of Ch 2 §4 as a derived result rather than an assumption.
 *
 *   theta = Ca * tan(alpha) / (3 * mu * Fz)
 *   Fy    = 3*mu*Fz*(theta - theta^2 + theta^3/3)   for theta < 1
 *         = mu*Fz                                    for theta >= 1
 *   Mz    = tp0 * Ca * tan(alpha) * (1 - theta)^3
 *
 * with full-slide angle tan(alpha_sl) = 3*mu*Fz/Ca and tp0 = L_contact/6
 * (equivalently a/3 with a the contact patch HALF length -- Ch 2 §4 and the
 * note in Exercise 2.4 about which definition is in play).
 */

import { goldenMax, toRad } from '../util/numeric.js'
import { muAtLoad, type LoadSensitivity } from './loadSensitivity.js'
import type { CurvePeak, TireForces, TireModel, TireState } from './types.js'

// ---------------------------------------------------------------------------
// Pure brush-model primitives.
//
// Kept free of the parameter object so they can be exercised directly against
// the worked solutions in Ch 2, where cornering stiffness and mu are simply
// given as numbers.
// ---------------------------------------------------------------------------

/** theta -- the normalised slip that reaches 1 when the patch fully slides. */
export function brushTheta(alpha: number, ca: number, mu: number, fz: number): number {
  const denom = 3 * mu * fz
  if (denom <= 0) return 1
  return (ca * Math.abs(Math.tan(alpha))) / denom
}

/** Slip angle at which the contact patch is fully sliding, rad. */
export function brushSlideAngle(ca: number, mu: number, fz: number): number {
  if (ca <= 0) return 0
  return Math.atan((3 * mu * fz) / ca)
}

/** Brush-model lateral force at pure slip, N. Ch 2 §2.3. */
export function brushFy(alpha: number, ca: number, mu: number, fz: number): number {
  const th = brushTheta(alpha, ca, mu, fz)
  const s = Math.sign(alpha) || 1
  if (th >= 1) return s * mu * fz
  return s * 3 * mu * fz * (th - th * th + (th * th * th) / 3)
}

/**
 * Brush-model aligning torque, N.m, with tp0 the small-slip pneumatic trail.
 * Mz = tp0 * Ca * tan(alpha) * (1 - theta)^3, which collapses to zero at full
 * slide -- the trail behaviour of Ch 2 §4.
 */
export function brushMz(
  alpha: number,
  ca: number,
  mu: number,
  fz: number,
  tp0: number
): number {
  const th = brushTheta(alpha, ca, mu, fz)
  if (th >= 1) return 0
  const s = Math.sign(alpha) || 1
  return s * tp0 * ca * Math.abs(Math.tan(alpha)) * Math.pow(1 - th, 3)
}

export interface BrushTireParams {
  name?: string
  /** Load sensitivity of the lateral friction coefficient. */
  lateral: LoadSensitivity
  /** Load sensitivity of the longitudinal friction coefficient. */
  longitudinal: LoadSensitivity
  /**
   * Peak cornering stiffness, N/rad. The stiffness saturates with load as
   * Ca(Fz) = caMax * sin(2*atan(Fz/fzAtPeakStiffness)), the standard Magic
   * Formula BCD form, so that Ca rises and then falls with load.
   */
  caMax: number
  /** Load at which cornering stiffness peaks, N. */
  fzAtPeakStiffness: number
  /** Longitudinal slip stiffness at the reference load, N per unit slip ratio. */
  slipStiffness: number
  /** Camber stiffness as a fraction of cornering stiffness (Ch 2 §7: 1/10 to 1/5). */
  camberStiffnessRatio: number
  /** Full contact patch length, m. */
  contactLength: number
}

export const DEFAULT_BRUSH: BrushTireParams = {
  name: 'Brush / Fiala (slick)',
  lateral: { mu0: 1.55, fz0: 4000, kMu: 0.12 },
  longitudinal: { mu0: 1.7, fz0: 4000, kMu: 0.12 },
  caMax: 130000,
  fzAtPeakStiffness: 5500,
  slipStiffness: 220000,
  camberStiffnessRatio: 0.12,
  contactLength: 0.16
}

export class BrushTire implements TireModel {
  readonly name: string
  constructor(readonly p: BrushTireParams) {
    this.name = p.name ?? 'Brush / Fiala'
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

  /** Small-slip pneumatic trail, m. Ch 2 §4. */
  get trailAtZeroSlip(): number {
    return this.p.contactLength / 6
  }

  /** Slip angle at which the contact patch is fully sliding, rad. */
  slideAngle(fz: number): number {
    if (fz <= 0) return 0
    return brushSlideAngle(this.corneringStiffness(fz), this.muY(fz), fz)
  }

  /** theta, the fraction of the contact patch that is sliding-limited. */
  private theta(alpha: number, fz: number): number {
    return brushTheta(alpha, this.corneringStiffness(fz), this.muY(fz), fz)
  }

  fy(alpha: number, fz: number, gamma = 0): number {
    if (fz <= 0) return 0
    const mu = this.muY(fz)
    const slip = brushFy(alpha, this.corneringStiffness(fz), mu, fz)
    const camber = this.camberStiffness(fz) * gamma
    // Camber thrust adds to the slip force but the total is still bounded by
    // the friction circle (Ch 2 §7 gives the superposition; the clamp keeps it
    // physical at the limit).
    const total = slip + camber
    return Math.sign(total) * Math.min(Math.abs(total), mu * fz)
  }

  camberStiffness(fz: number): number {
    return this.corneringStiffness(fz) * this.p.camberStiffnessRatio
  }

  pneumaticTrail(alpha: number, fz: number): number {
    if (fz <= 0) return 0
    const th = this.theta(alpha, fz)
    if (th >= 1) return 0
    const fy = Math.abs(this.fy(alpha, fz))
    if (fy < 1e-9) return this.trailAtZeroSlip
    const mz = Math.abs(
      brushMz(alpha, this.corneringStiffness(fz), this.muY(fz), fz, this.trailAtZeroSlip)
    )
    return mz / fy
  }

  mz(alpha: number, fz: number, gamma = 0): number {
    const s = Math.sign(alpha) || 1
    return s * this.pneumaticTrail(alpha, fz) * Math.abs(this.fy(alpha, fz, gamma))
  }

  fx(kappa: number, fz: number): number {
    if (fz <= 0) return 0
    // Identical brush algebra, with slip ratio in place of tan(alpha).
    return brushFy(Math.atan(kappa), this.p.slipStiffness, this.muX(fz), fz)
  }

  /** Slip angle at which lateral force peaks, rad. */
  peakFy(fz: number): CurvePeak {
    const hi = Math.max(this.slideAngle(fz) * 1.2, toRad(1))
    return goldenMax((a) => this.fy(a, fz), 0, hi)
  }

  /** Slip ratio at which longitudinal force peaks. */
  peakFx(fz: number): CurvePeak {
    return goldenMax((k) => this.fx(k, fz), 0, 0.6)
  }

  combined(state: TireState): TireForces {
    return combinedByNormalisedSlip(this, state)
  }
}

/**
 * Combined slip by the normalised-slip method (Ch 2 §6).
 *
 * Normalise each slip by the slip at which its own pure-slip curve peaks, form
 * the resultant, evaluate the pure-slip curves at the resultant magnitude, and
 * project back onto each axis. This reproduces the friction ellipse exactly at
 * the limit while reducing to the correct pure-slip curves on each axis.
 */
export function combinedByNormalisedSlip(
  tire: BrushTire,
  state: TireState
): TireForces {
  const { alpha, fz, gamma = 0, kappa = 0 } = state
  if (fz <= 0) return { fy: 0, fx: 0, mz: 0, pneumaticTrail: 0 }

  const aPeak = tire.peakFy(fz).at || 1e-6
  const kPeak = tire.peakFx(fz).at || 1e-6

  const sy = Math.tan(alpha) / Math.tan(aPeak)
  const sx = kappa / kPeak
  const s = Math.hypot(sx, sy)

  if (s < 1e-12) {
    return {
      fy: tire.camberStiffness(fz) * gamma,
      fx: 0,
      mz: 0,
      pneumaticTrail: tire.trailAtZeroSlip
    }
  }

  const alphaEq = Math.atan(s * Math.tan(aPeak))
  const kappaEq = s * kPeak
  const fyMag = Math.abs(tire.fy(alphaEq, fz))
  const fxMag = Math.abs(tire.fx(kappaEq, fz))

  const fy = (sy / s) * fyMag + tire.camberStiffness(fz) * gamma
  const fx = (sx / s) * fxMag
  const tp = tire.pneumaticTrail(alphaEq, fz)

  return { fy, fx, mz: tp * fy, pneumaticTrail: tp }
}

/**
 * The friction ellipse of Ch 2 §6, as an explicit relation for teaching:
 * given a longitudinal force, what lateral force remains?
 */
export function ellipseRemainingFy(fx: number, fxMax: number, fyMax: number): number {
  const r = Math.min(Math.abs(fx) / fxMax, 1)
  return fyMax * Math.sqrt(1 - r * r)
}

export function ellipseRemainingFx(fy: number, fyMax: number, fxMax: number): number {
  const r = Math.min(Math.abs(fy) / fyMax, 1)
  return fxMax * Math.sqrt(1 - r * r)
}

/**
 * Relaxation length lag (Ch 2 §8): (sigma/V) * dFy/dt + Fy = Ca*alpha.
 * Returns the time constant and the time to reach a given fraction of steady
 * state after a step input.
 */
export function relaxationLag(
  relaxationLength: number,
  speed: number,
  fraction = 0.95
): { tau: number; time: number } {
  const tau = relaxationLength / speed
  return { tau, time: -tau * Math.log(1 - fraction) }
}

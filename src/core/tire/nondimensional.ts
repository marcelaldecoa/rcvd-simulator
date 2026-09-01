/**
 * Radt nondimensionalisation -- Ch 14.
 *
 * Tyre test data arrives as hundreds of curves: lateral force against slip
 * angle, at each of several loads, cambers, pressures and slip ratios. Two
 * questions follow at once -- how do you interpolate to a load nobody tested,
 * and how do you tell whether tyre A is genuinely better than tyre B or merely
 * tested somewhere more flattering?
 *
 * Radt's answer is to rescale both axes so the whole family collapses onto ONE
 * master curve:
 *
 *     Fbar = Fy / (mu_y Fz)                 force over the peak AT THAT LOAD
 *     abar = C_alpha tan(alpha) / (mu_y Fz) linear prediction over that peak
 *
 * The denominator absorbs load sensitivity; the numerator absorbs the initial
 * slope. What is left -- the SHAPE of the transition from linear to saturated
 * -- turns out to be nearly invariant with load, and that invariance is the
 * whole method.
 *
 * Read abar as "how hard is this tyre being asked to work, as a fraction of
 * what it has", and the rest of the chapter follows: interpolation becomes
 * evaluating one curve, comparison becomes comparing two functions instead of
 * two data tables, and the friction ellipse stops being an assumption and
 * becomes a theorem (Ex 14.5).
 */

import type { TireModel } from './types.js'

const R2D = 180 / Math.PI

// ---------------------------------------------------------------------------
// The normalised variables -- Ch 14 §2
// ---------------------------------------------------------------------------

/** Normalised slip angle: the linear-extrapolated force over the peak available. */
export function normalisedSlip(
  corneringStiffness: number,
  alpha: number,
  muY: number,
  fz: number
): number {
  const peak = muY * fz
  return peak > 0 ? (corneringStiffness * Math.tan(alpha)) / peak : 0
}

/** The slip angle a given normalised slip corresponds to, rad. */
export function slipFromNormalised(
  corneringStiffness: number,
  normalised: number,
  muY: number,
  fz: number
): number {
  if (corneringStiffness <= 0) return 0
  return Math.atan((normalised * muY * fz) / corneringStiffness)
}

/**
 * The brush-model master curve -- Ch 14 §2's analytically tractable form.
 *
 *     Fbar = abar - abar^2/3 + abar^3/27,  |abar| <= 3
 *     Fbar = 1,                            |abar| >  3
 *
 * Ch 14 is careful about this: the peak at exactly abar = 3 is an artefact of
 * the brush model's parabolic pressure assumption, NOT a property of real
 * tyres, and it is not the fit RCVD actually uses. It is here because it is
 * closed form, because the chapter's own exercises use it, and because it shows
 * WHY the collapse works -- the brush model's shape depends only on the ratio
 * of linear-extrapolated force to peak force, which is exactly abar.
 */
export function brushMaster(normalised: number): number {
  const s = Math.sign(normalised)
  const a = Math.abs(normalised)
  if (a >= 3) return s
  return s * (a - (a * a) / 3 + (a * a * a) / 27)
}

/** Where the brush master curve peaks. Exactly 3, by construction. */
export const BRUSH_PEAK_NORMALISED = 3

export interface NormalisedMfFit {
  B: number
  C: number
  D: number
  E: number
}

/**
 * The book's own fit for the P195/70R-14, Ch 14 §2.
 *
 * Data at five loads from 200 to 1800 lb falls close to this one curve. D = 1
 * by construction: the normalised peak is unity.
 */
export const RCVD_MASTER_FIT: NormalisedMfFit = { B: 0.714, C: 1.4, D: 1.0, E: -0.2 }

/**
 * The normalised Magic Formula master curve -- what RCVD actually plots.
 *
 *     Fbar = D sin(C atan(B phi)),  phi = (1-E) abar + (E/B) atan(B abar)
 *
 * Ch 14 is explicit that the Magic Formula here is a CONVENIENCE, not a
 * necessity -- polynomials would serve. It is the shape that matters.
 */
export function mfMaster(normalised: number, fit: NormalisedMfFit = RCVD_MASTER_FIT): number {
  const { B, C, D, E } = fit
  const phi = (1 - E) * normalised + (E / B) * Math.atan(B * normalised)
  return D * Math.sin(C * Math.atan(B * phi))
}

/** Where a normalised Magic Formula fit peaks, found numerically. */
export function masterPeak(fit: NormalisedMfFit = RCVD_MASTER_FIT): {
  at: number
  value: number
} {
  let best = { at: 0, value: 0 }
  for (let i = 0; i <= 2000; i++) {
    const a = (6 * i) / 2000
    const v = mfMaster(a, fit)
    if (v > best.value) best = { at: a, value: v }
  }
  return best
}

/** Back to newtons. */
export function denormalise(normalisedForce: number, muY: number, fz: number): number {
  return normalisedForce * muY * fz
}

/**
 * The slip angle at which a tyre peaks -- Ch 14 Ex 14.2, and the chapter's
 * best sanity check on a dataset.
 *
 * Entirely determined by mu*Fz/C_alpha times the master curve's own peak. If
 * the number it returns looks wrong, one of the two inputs is wrong.
 */
export function peakSlipAngle(
  corneringStiffness: number,
  muY: number,
  fz: number,
  peakNormalised = BRUSH_PEAK_NORMALISED
): number {
  return slipFromNormalised(corneringStiffness, peakNormalised, muY, fz)
}

// ---------------------------------------------------------------------------
// The collapse -- what the chapter is for
// ---------------------------------------------------------------------------

export interface CollapsePoint {
  alpha: number
  fy: number
  normalisedSlip: number
  normalisedForce: number
}

export interface CollapsedCurve {
  fz: number
  muY: number
  corneringStiffness: number
  /** The slip angle this load peaks at, rad. */
  peakAlpha: number
  points: CollapsePoint[]
}

/**
 * Sweep a tyre at several loads and normalise each sweep.
 *
 * The raw curves fan out -- more load, more force, later peak. The normalised
 * ones should land on top of each other. How closely they do is the honest
 * measure of whether the two-parameter normalisation captures this tyre.
 */
export function collapseTire(
  tire: TireModel,
  loads: number[],
  maxAlpha = 0.35,
  samples = 61
): CollapsedCurve[] {
  return loads.map((fz) => {
    const muY = tire.muY(fz)
    const ca = tire.corneringStiffness(fz)
    const peak = muY * fz
    return {
      fz,
      muY,
      corneringStiffness: ca,
      peakAlpha: peakSlipAngle(ca, muY, fz),
      points: Array.from({ length: samples }, (_, i) => {
        const alpha = (maxAlpha * i) / (samples - 1)
        const fy = tire.fy(alpha, fz)
        return {
          alpha,
          fy,
          normalisedSlip: normalisedSlip(ca, alpha, muY, fz),
          normalisedForce: peak > 0 ? fy / peak : 0
        }
      })
    }
  })
}

/**
 * How tightly a family of curves actually collapsed.
 *
 * The spread in normalised force between the loads, at matched normalised
 * slip. Small means the two-parameter normalisation has captured this tyre;
 * large is itself a finding about construction, and Ch 14 §7 warns not to
 * assume invariance across radically different constructions.
 */
export function collapseSpread(curves: CollapsedCurve[], samples = 40): {
  meanSpread: number
  maxSpread: number
} {
  if (curves.length < 2) return { meanSpread: 0, maxSpread: 0 }
  const at = (c: CollapsedCurve, target: number): number | null => {
    for (let i = 1; i < c.points.length; i++) {
      const a = c.points[i - 1]
      const b = c.points[i]
      if (a.normalisedSlip <= target && target <= b.normalisedSlip) {
        const t =
          b.normalisedSlip === a.normalisedSlip
            ? 0
            : (target - a.normalisedSlip) / (b.normalisedSlip - a.normalisedSlip)
        return a.normalisedForce + t * (b.normalisedForce - a.normalisedForce)
      }
    }
    return null
  }
  let total = 0
  let count = 0
  let max = 0
  for (let i = 1; i <= samples; i++) {
    const target = (3 * i) / samples
    const values = curves.map((c) => at(c, target)).filter((v): v is number => v !== null)
    if (values.length < 2) continue
    const spread = Math.max(...values) - Math.min(...values)
    total += spread
    count++
    max = Math.max(max, spread)
  }
  return { meanSpread: count > 0 ? total / count : 0, maxSpread: max }
}

// ---------------------------------------------------------------------------
// Load-dependent scale functions -- Ch 14 §4
// ---------------------------------------------------------------------------

/**
 * Cornering stiffness against load, Ch 14 §4's fit form.
 *
 *     C_alpha(Fz) = c1 sin[2 atan(Fz/c2)]
 *
 * Captures the rise-then-fall: stiffness peaks at a moderate load (Fz = c2,
 * where the argument is 45 deg and the sine is at its maximum) and declines
 * above it. That saturation is why cornering stiffness rose only from 900 to
 * 1850 N/deg for a tripling of load in Ex 14.3.
 */
export function corneringStiffnessFit(c1: number, c2: number, fz: number): number {
  return c1 * Math.sin(2 * Math.atan(fz / c2))
}

/** The load at which that fit peaks -- simply c2. */
export function stiffnessPeakLoad(c2: number): number {
  return c2
}

export interface MuFit {
  mu0: number
  kMu: number
}

/** Least-squares linear fit of peak friction against load -- Ex 14.3. */
export function fitMuLinear(points: { fz: number; muY: number }[]): MuFit {
  const n = points.length
  if (n === 0) return { mu0: 0, kMu: 0 }
  if (n === 1) return { mu0: points[0].muY, kMu: 0 }
  const sx = points.reduce((s, p) => s + p.fz, 0)
  const sy = points.reduce((s, p) => s + p.muY, 0)
  const sxx = points.reduce((s, p) => s + p.fz * p.fz, 0)
  const sxy = points.reduce((s, p) => s + p.fz * p.muY, 0)
  const denom = n * sxx - sx * sx
  if (Math.abs(denom) < 1e-12) return { mu0: sy / n, kMu: 0 }
  const slope = (n * sxy - sx * sy) / denom
  return { mu0: (sy - slope * sx) / n, kMu: -slope }
}

/** Evaluate a linear mu fit. */
export function muAt(fit: MuFit, fz: number): number {
  return fit.mu0 - fit.kMu * fz
}

// ---------------------------------------------------------------------------
// Combined slip -- Ch 14 §5, where the friction ellipse becomes a theorem
// ---------------------------------------------------------------------------

export interface CombinedInputs {
  corneringStiffness: number
  slipStiffness: number
  muX: number
  muY: number
  fz: number
  /** Slip angle, rad. */
  alpha: number
  /** Slip ratio. */
  slipRatio: number
}

export interface CombinedResult {
  /** Theoretical slip quantities. */
  sigmaX: number
  sigmaY: number
  /** Normalised components and their resultant. */
  barX: number
  barY: number
  bar: number
  /** Master curve value at the resultant. */
  masterForce: number
  fx: number
  fy: number
  /** True once the resultant slip is past the master curve's peak. */
  sliding: boolean
}

/**
 * Combined slip through the same normalisation -- Ch 14 §5 and Ex 14.4.
 *
 * Normalise each direction by its own stiffness and its own peak, take the
 * resultant, evaluate ONE master curve, and project back along the slip vector.
 * Nothing else is assumed -- and the friction ellipse falls out (Ex 14.5).
 *
 * That is the elegance of the method: one scalar function plus two load-
 * dependent scale factors per direction reproduce the entire combined-slip
 * surface.
 */
export function combinedSlip(
  o: CombinedInputs,
  master: (s: number) => number = brushMaster
): CombinedResult {
  const denom = 1 + o.slipRatio
  const sigmaX = denom !== 0 ? o.slipRatio / denom : 0
  const sigmaY = denom !== 0 ? Math.tan(o.alpha) / denom : 0

  const peakX = o.muX * o.fz
  const peakY = o.muY * o.fz
  const barX = peakX > 0 ? (o.slipStiffness * sigmaX) / peakX : 0
  const barY = peakY > 0 ? (o.corneringStiffness * sigmaY) / peakY : 0
  const bar = Math.hypot(barX, barY)

  const masterForce = master(bar)
  return {
    sigmaX,
    sigmaY,
    barX,
    barY,
    bar,
    masterForce,
    fx: bar > 0 ? (barX / bar) * masterForce * peakX : 0,
    fy: bar > 0 ? (barY / bar) * masterForce * peakY : 0,
    sliding: bar >= BRUSH_PEAK_NORMALISED
  }
}

/**
 * How far a combined-slip state sits from the friction ellipse.
 *
 * Ex 14.5 proves this is exactly 1 at full slide, for any direction of the slip
 * vector -- the ellipse is a theorem, not an assumption. Inside the sliding
 * boundary the locus is still an ellipse, but a smaller one scaled by the
 * master curve, so the "friction ellipse" is really a nested family indexed by
 * total slip magnitude and the outermost is the limit.
 */
export function ellipseRadius(result: CombinedResult, muX: number, muY: number, fz: number): number {
  const px = muX * fz
  const py = muY * fz
  if (px <= 0 || py <= 0) return 0
  return Math.hypot(result.fx / px, result.fy / py)
}

/** The combined-slip locus at a fixed total normalised slip, for plotting. */
export function slipCircleLocus(
  o: Omit<CombinedInputs, 'alpha' | 'slipRatio'>,
  totalNormalised: number,
  samples = 73,
  master: (s: number) => number = brushMaster
): { fx: number; fy: number }[] {
  const scale = master(totalNormalised)
  const px = o.muX * o.fz
  const py = o.muY * o.fz
  return Array.from({ length: samples }, (_, i) => {
    const theta = (2 * Math.PI * i) / (samples - 1)
    return { fx: Math.cos(theta) * scale * px, fy: Math.sin(theta) * scale * py }
  })
}

// ---------------------------------------------------------------------------
// Comparison -- Ch 14 Ex 14.6
// ---------------------------------------------------------------------------

export interface TireCharacter {
  name: string
  muY: number
  /** Cornering stiffness, N/deg -- the unit tyre data usually arrives in. */
  corneringStiffnessPerDeg: number
  fz: number
  peakForce: number
  /** Slip angle at the peak, deg. */
  peakSlipAngleDeg: number
}

/**
 * Reduce a tyre to the pair that actually characterises it -- Ex 14.6.
 *
 * The chapter's closing lesson: peak mu alone is a poor comparison. The PAIR
 * (mu_y, C_alpha), and hence the peak slip angle, says how the tyre will
 * actually be used, and which is better depends entirely on the car it is
 * fitted to.
 */
export function characterise(
  name: string,
  muY: number,
  corneringStiffnessPerDeg: number,
  fz: number,
  peakNormalised = BRUSH_PEAK_NORMALISED
): TireCharacter {
  const ca = corneringStiffnessPerDeg * R2D
  return {
    name,
    muY,
    corneringStiffnessPerDeg,
    fz,
    peakForce: muY * fz,
    peakSlipAngleDeg: peakSlipAngle(ca, muY, fz, peakNormalised) * R2D
  }
}

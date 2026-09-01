/**
 * Identifying the axle characteristics themselves -- Ch 7, from telemetry.
 *
 * `identifyUndersteerGradient` fits K, and K alone is one equation in two
 * unknowns: K = Wf/Cf - Wr/Cr. Any number of (Cf, Cr) pairs produce it, so a
 * fitted K cannot tell you what the tyres are doing, only what their imbalance
 * amounts to.
 *
 * Measured SIDESLIP breaks the degeneracy, and this is the reason the state
 * estimator works so hard to get beta right. With beta known, each axle's slip
 * angle is known separately:
 *
 *     alpha_f = delta - beta - a r / V
 *     alpha_r =       - beta + b r / V
 *
 * and at a trimmed cornering state Ch 7's demand split says what force each
 * axle is making:
 *
 *     Fyf = Wf Ay,   Fyr = Wr Ay
 *
 * So regressing axle force on axle slip angle recovers Cf and Cr SEPARATELY --
 * which is the measured axle characteristic of Ch 7 §3, obtained from ordinary
 * laps rather than a rig.
 *
 * The fit is deliberately restricted to the linear range. Past the peak the
 * relationship is not a line and a straight-line fit through the whole range
 * would return something that is neither the initial slope nor the peak, and
 * would look confident doing it.
 */

import { G } from '../core/util/numeric.js'
import type { TelemetrySample } from './types.js'
import { SideslipEstimator, toVehicleState, type VehicleGeometry } from './state.js'

export interface AxleIdentification {
  /** Axle cornering stiffness, N/rad. */
  cf: number
  cr: number
  /** Coefficient of determination for each fit. Below ~0.8, do not trust it. */
  r2Front: number
  r2Rear: number
  /** Samples that survived filtering. */
  n: number
  /** Understeer gradient these stiffnesses imply, deg/g. */
  impliedKDeg: number
  /** Peak |Ay| reached in the fitted set, g. */
  maxAy: number
  /** Largest axle slip angle in the fitted set, rad. */
  maxAlphaFront: number
  maxAlphaRear: number
  /** Range of slip angle the fit actually saw, rad. */
  spreadFront: number
  spreadRear: number
  /**
   * Whether the data has enough spread for the fit to mean anything.
   *
   * The failure this exists to catch is subtle and dangerous: a driver who
   * takes the same corner at the same speed all session produces samples at ONE
   * slip angle, and a line through the origin and one point is exact. The slope
   * comes back looking perfect, r-squared is undefined, and nothing about it is
   * evidence that the relationship is linear at all.
   *
   * When this is false the stiffnesses may still be right -- they were in the
   * case that prompted this -- but they are not SUPPORTED, and nothing should
   * be written into a vehicle model on their say-so.
   */
  wellConditioned: boolean
}

export interface AxleIdentifyOptions {
  geometry: VehicleGeometry
  /** Total vehicle weight, N. */
  weight: number
  /** Ignore samples below this speed, m/s. */
  minSpeed?: number
  /** Ignore samples below this |Ay|, g -- near zero it is all noise. */
  minAy?: number
  /** Ignore samples above this |Ay|, g -- past here the tyre is not linear. */
  maxAy?: number
  /** Ignore samples with more longitudinal acceleration than this, g. */
  maxAx?: number
}

/**
 * Least squares through the origin: force is zero at zero slip, by definition.
 *
 * Returns r-squared as NaN rather than 0 when the response has no variance to
 * explain. Zero would read as "a terrible fit" when the truth is "there is
 * nothing here to fit", and those call for opposite reactions.
 */
function fitThroughOrigin(xs: number[], ys: number[]): { slope: number; r2: number } {
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < xs.length; i++) {
    sxy += xs[i] * ys[i]
    sxx += xs[i] * xs[i]
  }
  if (sxx < 1e-18) return { slope: 0, r2: 0 }
  const slope = sxy / sxx

  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < xs.length; i++) {
    ssRes += (ys[i] - slope * xs[i]) ** 2
    ssTot += (ys[i] - meanY) ** 2
  }
  return { slope, r2: ssTot > 1e-12 ? 1 - ssRes / ssTot : NaN }
}

/**
 * Is there enough range in the predictor to believe a slope?
 *
 * Both an absolute and a relative test. Absolute, because a spread of a
 * hundredth of a degree is noise however it compares to the mean; relative,
 * because a wide spread around a large angle is less informative than the same
 * spread around a small one.
 */
function wellSpread(values: number[], minAbsolute = 0.5 / R2D, minRelative = 0.25): boolean {
  if (values.length < 2) return false
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const spread = hi - lo
  return spread >= minAbsolute && spread >= minRelative * hi
}

const R2D = 180 / Math.PI

/**
 * Fit both axle cornering stiffnesses from a session.
 *
 * Returns null when there is not enough usable cornering, which is a common and
 * ordinary outcome -- a session of straight-line running has nothing to say
 * about cornering stiffness and should say so rather than returning a number.
 */
export function identifyAxleStiffness(
  samples: TelemetrySample[],
  opts: AxleIdentifyOptions
): AxleIdentification | null {
  const minSpeed = opts.minSpeed ?? 12
  const minAy = opts.minAy ?? 0.15
  const maxAy = opts.maxAy ?? 0.7
  const maxAx = opts.maxAx ?? 0.25

  const wf = opts.weight * opts.geometry.frontWeightFraction
  const wr = opts.weight * (1 - opts.geometry.frontWeightFraction)

  const sideslip = new SideslipEstimator()
  const alphaF: number[] = []
  const forceF: number[] = []
  const alphaR: number[] = []
  const forceR: number[] = []
  let peakAy = 0
  let peakAlphaF = 0
  let peakAlphaR = 0

  for (const s of samples) {
    // The estimator has to see every sample in order, because when it is
    // integrating rather than measuring, skipping samples corrupts it.
    const beta = sideslip.update(s)
    if (s.speed < minSpeed) continue
    if (Math.abs(s.ax) / G > maxAx) continue
    const ayG = s.ay / G
    const mag = Math.abs(ayG)
    if (mag < minAy || mag > maxAy) continue

    const state = toVehicleState(s, opts.geometry, beta)
    // Work in the turn's own sign, so left and right corners both contribute.
    const sign = Math.sign(ayG)
    const af = sign * state.alphaFront
    const ar = sign * state.alphaRear
    // A negative slip angle in the turn's own sign means the axle is being
    // dragged the wrong way -- a transient, not a steady state.
    if (af <= 1e-4 || ar <= 1e-4) continue

    alphaF.push(af)
    forceF.push(wf * mag)
    alphaR.push(ar)
    forceR.push(wr * mag)
    peakAy = Math.max(peakAy, mag)
    peakAlphaF = Math.max(peakAlphaF, af)
    peakAlphaR = Math.max(peakAlphaR, ar)
  }

  if (alphaF.length < 40) return null

  const front = fitThroughOrigin(alphaF, forceF)
  const rear = fitThroughOrigin(alphaR, forceR)
  if (front.slope <= 0 || rear.slope <= 0) return null

  const impliedK = wf / front.slope - wr / rear.slope
  const spreadF = Math.max(...alphaF) - Math.min(...alphaF)
  const spreadR = Math.max(...alphaR) - Math.min(...alphaR)

  return {
    cf: front.slope,
    cr: rear.slope,
    r2Front: front.r2,
    r2Rear: rear.r2,
    n: alphaF.length,
    impliedKDeg: impliedK * (180 / Math.PI),
    maxAy: peakAy,
    maxAlphaFront: peakAlphaF,
    maxAlphaRear: peakAlphaR,
    spreadFront: spreadF,
    spreadRear: spreadR,
    wellConditioned: wellSpread(alphaF) && wellSpread(alphaR)
  }
}

export interface AxleCheck {
  /** K from the direct steer-against-Ay regression, deg/g. */
  directKDeg: number
  /** K implied by the separately fitted stiffnesses, deg/g. */
  impliedKDeg: number
  difference: number
  agrees: boolean
  detail: string
}

/**
 * Two independent routes to the same number, compared.
 *
 * The direct fit regresses driver steer against lateral acceleration; the axle
 * fit regresses each axle's force against its own slip angle and then forms
 * Wf/Cf - Wr/Cr. They share no arithmetic beyond the samples, so agreement is
 * real evidence and disagreement is a signal that something -- most likely the
 * sideslip channel or the assumed weight distribution -- is wrong.
 */
export function crossCheckIdentification(
  directKDeg: number,
  axle: AxleIdentification,
  tolerance = 0.15
): AxleCheck {
  const difference = axle.impliedKDeg - directKDeg
  const scale = Math.max(Math.abs(directKDeg), 0.2)
  const agrees = Math.abs(difference) <= tolerance * scale

  return {
    directKDeg,
    impliedKDeg: axle.impliedKDeg,
    difference,
    agrees,
    detail: agrees
      ? `two independent fits agree: ${directKDeg.toFixed(3)} and ${axle.impliedKDeg.toFixed(3)} deg/g`
      : `the two fits DISAGREE (${directKDeg.toFixed(3)} vs ${axle.impliedKDeg.toFixed(3)} deg/g) — ` +
        'suspect the sideslip channel or the assumed weight distribution before trusting either'
  }
}

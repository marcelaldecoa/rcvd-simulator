/**
 * Identifying vehicle parameters from telemetry -- Ch 5 §4 and Ch 11.
 *
 * The constant-radius skid pad works because the slope of steer angle against
 * lateral acceleration IS the understeer gradient. Nothing in that argument
 * requires a constant radius: it requires only that the Ackermann term L/R be
 * accounted for. So the same fit can be run over ordinary lap data, which is
 * what makes "learn by doing in the simulator" more than a slogan --
 *
 *   delta = L/R + K*Ay,   and  1/R = r/V
 *   =>  delta - L*r/V = K*Ay
 *
 * Regress the left side on Ay and the slope is K. This is written and tested
 * now, against the app's own vehicle model, so that the analysis is known to be
 * correct before any simulator plumbing exists to feed it.
 */

import { G } from '../core/util/numeric.js'
import type { TelemetrySample } from './types.js'

export interface IdentificationOptions {
  /** Wheelbase, m. */
  wheelbase: number
  /** Ignore samples below this speed, m/s -- the fit is meaningless at a crawl. */
  minSpeed?: number
  /** Ignore samples below this |Ay|, g -- near zero the regression is all noise. */
  minAy?: number
  /** Ignore samples with significant longitudinal acceleration, in g. */
  maxAx?: number
}

export interface Identification {
  /** Understeer gradient, rad/g. */
  K: number
  /** Understeer gradient, deg/g. */
  KDeg: number
  /** Intercept of the fit, rad. Should be near zero; a large value means bias. */
  intercept: number
  /** Coefficient of determination. Below ~0.8, do not trust K. */
  r2: number
  /** Number of samples that survived filtering. */
  n: number
  /** Highest |Ay| in the fitted set, g -- how far toward the limit it reaches. */
  maxAy: number
}

/**
 * Least-squares fit of the steady-state cornering equation to telemetry.
 *
 * Samples under longitudinal acceleration are rejected: the derivation assumes
 * a steady turn, and trail braking or power-on violates it. Ch 11 makes the
 * same point about controlling confounders in an A-B-A test.
 */
export function identifyUndersteerGradient(
  samples: TelemetrySample[],
  opts: IdentificationOptions
): Identification | null {
  const minSpeed = opts.minSpeed ?? 10
  const minAy = opts.minAy ?? 0.15
  const maxAx = opts.maxAx ?? 0.2

  const xs: number[] = []
  const ys: number[] = []
  let maxAy = 0

  for (const s of samples) {
    if (s.speed < minSpeed) continue
    if (Math.abs(s.ax) / G > maxAx) continue
    const ayG = s.ay / G
    if (Math.abs(ayG) < minAy) continue

    // Work in the turn's own sign so left and right corners both contribute.
    const sign = Math.sign(ayG)
    const ackermann = (opts.wheelbase * s.yawRate) / s.speed
    xs.push(Math.abs(ayG))
    ys.push(sign * (s.steer - ackermann))
    maxAy = Math.max(maxAy, Math.abs(ayG))
  }

  const n = xs.length
  if (n < 20) return null

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY)
    sxx += (xs[i] - meanX) ** 2
  }
  if (sxx < 1e-12) return null

  const K = sxy / sxx
  const intercept = meanY - K * meanX

  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const pred = K * xs[i] + intercept
    ssRes += (ys[i] - pred) ** 2
    ssTot += (ys[i] - meanY) ** 2
  }

  return {
    K,
    KDeg: K * (180 / Math.PI),
    intercept,
    r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
    n,
    maxAy
  }
}

/**
 * Points for the g-g diagram (Ch 9): vehicle capability versus driver usage.
 * The scatter of what the driver actually used, against the envelope the car
 * could have delivered, is the standard data-analysis diagnostic.
 */
export function ggPoints(samples: TelemetrySample[]): { x: number; y: number }[] {
  return samples.map((s) => ({ x: s.ay / G, y: s.ax / G }))
}

/** Fraction of samples using at least `threshold` of a circular g envelope. */
export function envelopeUsage(
  samples: TelemetrySample[],
  limitG: number,
  threshold = 0.9
): number {
  if (!samples.length) return 0
  let used = 0
  for (const s of samples) {
    const mag = Math.hypot(s.ax, s.ay) / G
    if (mag >= threshold * limitG) used++
  }
  return used / samples.length
}

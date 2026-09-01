/**
 * Damper velocity histograms -- Ch 22 §4.3.
 *
 * The chapter calls this the essential damper diagnostic, and the reason is
 * blunt: a force-velocity curve has four adjustable regions, and only some of
 * them are being used on any given circuit. "A team adjusting the high-speed
 * knee on a smooth circuit where 90% of the time is below 50 mm/s is wasting
 * its session."
 *
 * So the histogram answers a question the curve alone cannot: which part of the
 * curve does this track actually exercise?
 *
 * One conversion matters more than anything else here, and it is the same trap
 * Ch 22 §3.2 warns about. Telemetry publishes SHOCK velocity -- what the damper
 * shaft does. The chapter's velocity bands, and every force-velocity curve
 * worth comparing, are in WHEEL velocity. Those differ by the installation
 * ratio, linearly, and reading a histogram in the wrong one puts every band in
 * the wrong place.
 */

import type { TelemetrySample } from './types.js'

export type Corner = 'LF' | 'RF' | 'LR' | 'RR'
export const CORNERS: Corner[] = ['LF', 'RF', 'LR', 'RR']

export interface HistogramBin {
  /** Bin centre, m/s of WHEEL velocity. Negative is rebound. */
  velocity: number
  count: number
  /** Share of all samples in this corner's histogram. */
  fraction: number
}

export interface CornerHistogram {
  corner: Corner
  bins: HistogramBin[]
  samples: number
  /** Wheel velocity below which a given fraction of the time is spent, m/s. */
  percentile(p: number): number
  /** Share of time in bump (positive) and rebound (negative). */
  bumpFraction: number
  /** Share of time below the low/high speed boundary. */
  lowSpeedFraction: number
  /** Largest |wheel velocity| seen, m/s. */
  peak: number
  /** RMS wheel velocity, m/s -- a single number for how rough the ride was. */
  rms: number
}

export interface HistogramOptions {
  /**
   * Installation ratio, shock travel per unit wheel travel.
   *
   * Required rather than defaulted, because there is no safe default: getting
   * it wrong shifts every band and the histogram still looks entirely
   * plausible. Ch 22 §3.2 is emphatic that a damper number means nothing
   * without it.
   */
  installationRatio: number
  /** Bin width in m/s of wheel velocity. */
  binWidth?: number
  /** Widest wheel velocity to bin; anything beyond lands in the end bins. */
  range?: number
  /**
   * The boundary between "body control" and "wheel control", m/s of wheel
   * velocity. Ch 22 §3.3 puts the body mode at 0-50 mm/s and the wheel at
   * 100-500+.
   */
  lowSpeedBoundary?: number
}

/** Index of the corner within a per-corner tuple, in the SDK's own order. */
const CORNER_INDEX: Record<Corner, number> = { LF: 0, RF: 1, LR: 2, RR: 3 }

/**
 * Build a histogram of wheel velocity for one corner.
 *
 * Returns null when the samples carry no shock velocity channel, which is an
 * ordinary state -- not every car publishes it -- rather than an error.
 */
export function cornerHistogram(
  samples: TelemetrySample[],
  corner: Corner,
  opts: HistogramOptions
): CornerHistogram | null {
  const ir = opts.installationRatio
  if (!(ir > 0)) return null

  const binWidth = opts.binWidth ?? 0.01
  const range = opts.range ?? 0.5
  const boundary = opts.lowSpeedBoundary ?? 0.05
  const index = CORNER_INDEX[corner]

  const nBins = Math.ceil((2 * range) / binWidth)
  const counts = new Array<number>(nBins).fill(0)
  const values: number[] = []

  for (const s of samples) {
    const shock = s.shockVelocity?.[index]
    if (shock === undefined || !Number.isFinite(shock)) continue
    // Shock velocity to wheel velocity: LINEAR, not squared. The squared
    // relation is for rates; this is a velocity.
    const wheel = shock / ir
    values.push(wheel)
    const clamped = Math.max(-range, Math.min(range, wheel))
    const bin = Math.min(nBins - 1, Math.max(0, Math.floor((clamped + range) / binWidth)))
    counts[bin]++
  }

  if (values.length === 0) return null

  const total = values.length
  const bins: HistogramBin[] = counts.map((count, i) => ({
    velocity: -range + (i + 0.5) * binWidth,
    count,
    fraction: count / total
  }))

  const sorted = [...values].sort((a, b) => a - b)
  const percentile = (p: number): number => {
    if (sorted.length === 0) return 0
    const at = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))
    return sorted[at]
  }

  let bump = 0
  let low = 0
  let sumSq = 0
  let peak = 0
  for (const v of values) {
    if (v > 0) bump++
    if (Math.abs(v) < boundary) low++
    sumSq += v * v
    peak = Math.max(peak, Math.abs(v))
  }

  return {
    corner,
    bins,
    samples: total,
    percentile,
    bumpFraction: bump / total,
    lowSpeedFraction: low / total,
    peak,
    rms: Math.sqrt(sumSq / total)
  }
}

export interface HistogramSet {
  corners: Partial<Record<Corner, CornerHistogram>>
  /** True when no corner had a shock velocity channel. */
  empty: boolean
}

export function allCorners(
  samples: TelemetrySample[],
  opts: HistogramOptions
): HistogramSet {
  const corners: Partial<Record<Corner, CornerHistogram>> = {}
  for (const c of CORNERS) {
    const h = cornerHistogram(samples, c, opts)
    if (h) corners[c] = h
  }
  return { corners, empty: Object.keys(corners).length === 0 }
}

export interface HistogramVerdict {
  /** Share of time below the low/high boundary, averaged over the corners. */
  lowSpeedFraction: number
  /** The 95th percentile of |wheel velocity|, m/s -- what "high speed" means here. */
  highSpeedVelocity: number
  headline: string
  detail: string
}

/**
 * What the histogram says about where to spend a session.
 *
 * Ch 22's own argument, made into a sentence. If almost all the time is below
 * the boundary, the high-speed valving is nearly irrelevant on this circuit and
 * adjusting it is wasted effort. If a substantial share is above, the
 * high-speed side matters and the knee position becomes a real decision.
 */
export function readHistogram(set: HistogramSet, boundary = 0.05): HistogramVerdict | null {
  const hs = Object.values(set.corners)
  if (hs.length === 0) return null

  const lowSpeedFraction = hs.reduce((s, h) => s + h.lowSpeedFraction, 0) / hs.length
  const highSpeedVelocity = hs.reduce((s, h) => s + Math.abs(h.percentile(0.95)), 0) / hs.length

  if (lowSpeedFraction > 0.9) {
    return {
      lowSpeedFraction,
      highSpeedVelocity,
      headline: 'This is a low-speed circuit for the dampers',
      detail:
        `${(lowSpeedFraction * 100).toFixed(0)}% of the time is below ` +
        `${(boundary * 1000).toFixed(0)} mm/s of wheel velocity, which is the body-control ` +
        'region. The high-speed valving is barely being exercised here, so adjusting the ' +
        'knee or the high-speed side is close to wasted effort — spend the session on ' +
        'low-speed bump and rebound instead.'
    }
  }
  if (lowSpeedFraction > 0.7) {
    return {
      lowSpeedFraction,
      highSpeedVelocity,
      headline: 'Mostly body control, with real high-speed content',
      detail:
        `${(lowSpeedFraction * 100).toFixed(0)}% below ${(boundary * 1000).toFixed(0)} mm/s, ` +
        `but the busiest 5% of the time reaches ${(highSpeedVelocity * 1000).toFixed(0)} mm/s. ` +
        'Both sides of the knee are doing work, so its position is a real decision rather ' +
        'than a detail.'
    }
  }
  return {
    lowSpeedFraction,
    highSpeedVelocity,
    headline: 'A rough circuit — the wheel is working hard',
    detail:
      `Only ${(lowSpeedFraction * 100).toFixed(0)}% of the time is in the body-control region, ` +
      `and the busiest 5% reaches ${(highSpeedVelocity * 1000).toFixed(0)} mm/s. High-speed ` +
      'damping and blow-off are what is protecting the contact patch here, and Ch 22 §3.5’s ' +
      'load-variation penalty is being paid continuously.'
  }
}

/**
 * Sample the histogram at the velocities a force-velocity curve is drawn at.
 *
 * The point of overlaying the two: the curve says what the damper WOULD do at
 * each velocity, and the histogram says how often it is actually asked. A knee
 * placed where the car never goes is a setting with no effect.
 */
export function histogramAtVelocities(
  h: CornerHistogram,
  velocities: number[]
): { velocity: number; fraction: number }[] {
  return velocities.map((v) => {
    const bin = h.bins.reduce((best, b) =>
      Math.abs(b.velocity - v) < Math.abs(best.velocity - v) ? b : best
    )
    return { velocity: v, fraction: bin.fraction }
  })
}

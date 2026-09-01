/**
 * A session reduced to the handful of numbers an engineer would actually look
 * at, and to the chapters that explain each of them.
 *
 * The organising idea is the one the whole app is built on: a measurement is
 * only useful if you know which piece of theory it belongs to. So everything
 * here is computed in the vocabulary of the book -- balance as the difference
 * of two slip angles (Ch 5), grip as a fraction of the friction envelope
 * (Ch 9), the limiting axle as a pair-analysis question (Ch 7) -- and the
 * display layer attaches the lab link.
 *
 * Everything is indexed by DISTANCE around the lap rather than by time. Two
 * laps take different times by definition, so a time index compares different
 * corners; a distance index compares the same corner.
 *
 * On "where am I losing time", there are two honest answers and this module
 * computes both, because they fail in different ways:
 *
 *   AGAINST ANOTHER LAP (see laps.ts) is precise and relative. It tells you
 *   where THIS lap lost to THAT one, and says nothing about whether either was
 *   any good.
 *
 *   AGAINST THE ENVELOPE (here) is absolute and approximate. It asks how much
 *   of the available friction was actually used, which is Ch 9's g-g diagram
 *   applied around a lap. A corner taken at 70% of the envelope is time thrown
 *   away no matter what your other laps did -- but the envelope is a model, so
 *   it is only as good as the car in the garage.
 *
 * What this deliberately does NOT do is claim an optimal line. That is a
 * minimum-time optimal-control problem and it needs the track boundaries, which
 * the simulator does not publish. Grip left on the table is the honest version
 * of the same question.
 */

import { ggEnvelope, reachOf, type GGEnvelope, type GGOptions } from '../core/performance/gg.js'
import {
  OverlayPipeline,
  type AxleLimitEstimate,
  type LimitTrackerOptions,
  type VehicleGeometry,
  type VehicleState
} from './state.js'
import { splitLaps, type Lap } from './laps.js'
import type { TelemetrySample } from './types.js'

const G = 9.80665

export interface DashboardOptions {
  geometry: VehicleGeometry
  limits: LimitTrackerOptions
  /**
   * The car's own friction envelope, for the grip-used metric. Built once at
   * a representative speed rather than per sample: rebuilding it for every
   * sample would be honest but costs far more than the extra fidelity is worth
   * over one session.
   */
  gg?: GGOptions
  /** How many stretches to divide the lap into. */
  sectors?: number
  /** Below this lateral acceleration the car is not cornering, g. */
  corneringAy?: number
}

/** How the car behaved, as a share of the cornering it did. */
export interface BalanceSplit {
  understeer: number
  neutral: number
  oversteer: number
  /** Cornering samples this was measured over. */
  samples: number
}

export interface SectorMetrics {
  index: number
  /** Lap distance at the start and end of the stretch, 0-1. */
  from: number
  to: number
  meanSpeed: number
  peakAy: number
  balance: BalanceSplit
  /**
   * Mean radial reach into the friction envelope over the cornering in this
   * stretch. 1.0 is exactly on the boundary; 0.7 means three tenths of the
   * available grip went unused.
   */
  gripUsed: number
  /** Seconds spent here, averaged over the laps that crossed it. */
  time: number
  /**
   * Seconds notionally available, from the shortfall in grip used.
   *
   * A rough conversion and labelled as such: cornering time scales roughly as
   * 1/sqrt(ay), so using a fraction f of the envelope costs about
   * (1/sqrt(f) - 1) of the time spent cornering there. It ranks stretches
   * honestly; it is not a lap-time prediction.
   */
  timeAvailable: number
}

export interface SessionSummary {
  laps: Lap[]
  completeLaps: number
  bestLapTime: number | null
  /** Over the whole session's cornering. */
  balance: BalanceSplit
  /** Mean reach into the envelope while cornering. */
  gripUsed: number
  /** Share of cornering samples within 5% of the envelope boundary. */
  atLimit: number
  /** Which axle was nearer its own peak, as a share of cornering samples. */
  frontLimited: number
  sectors: SectorMetrics[]
  /** Sectors with the most time notionally available, worst first. */
  worst: SectorMetrics[]
  envelope: GGEnvelope | null
  /** Samples that were fast enough to say anything about. */
  usable: number
  /**
   * Where this analysis concluded each axle's peak is.
   *
   * Reported so the page can show ITS OWN limits rather than the live
   * pipeline's. They are different trackers over different spans of data --
   * the live one has seen only what has streamed past, this one has seen the
   * whole buffer -- and showing one axle's peak from one while every other
   * number came from the other is how a page ends up quietly contradicting
   * itself.
   */
  limits: { front: AxleLimitEstimate; rear: AxleLimitEstimate }
  /**
   * True when the driving exceeded the modelled envelope, i.e. grip used came
   * out above 1. That is not a driver being superhuman; it means the garage car
   * is more conservative than the car actually driven, and the honest reading
   * is that the envelope needs calibrating before the number means anything.
   */
  exceededEnvelope: boolean
  /**
   * True when the envelope cannot be trusted as an absolute reference, so the
   * grip and time-available figures rank stretches but do not measure them.
   *
   * Set at BOTH ends. Above 1 the model is too small. Far below it the model is
   * too big -- and that is the failure that quietly produces nonsense, because
   * the time-available conversion divides by the square root of grip used. A
   * garage car with more grip than the one actually driven scores 20% used and
   * therefore claims sixteen seconds are available on a lap of eighty-four,
   * which is not a finding, it is a units error wearing a suit. Nobody drives
   * at a fifth of their car; if the number says they did, the car is wrong.
   */
  envelopeSuspect: boolean
}

/** Below this mean reach the envelope is describing a different car. */
const IMPLAUSIBLY_LOW_GRIP = 0.5

const emptySplit = (): BalanceSplit => ({
  understeer: 0,
  neutral: 0,
  oversteer: 0,
  samples: 0
})

/** Turn counts into shares, leaving an all-zero split alone. */
function normalise(counts: BalanceSplit): BalanceSplit {
  const n = counts.samples
  if (n === 0) return counts
  return {
    understeer: counts.understeer / n,
    neutral: counts.neutral / n,
    oversteer: counts.oversteer / n,
    samples: n
  }
}

/**
 * Run the whole session through the same pipeline the overlay uses -- with the
 * display filter switched off.
 *
 * Same pipeline deliberately: if the dashboard and the overlay disagreed about
 * what the car was doing, one of them would be wrong and there would be no way
 * to tell which. But the overlay's 0.12 s smoothing exists so a driver can read
 * a number at a glance, and it has no business in a statistic. It bleeds one
 * sector into the next: coming off a corner the smoothed lateral acceleration
 * decays over a couple of tenths, so the first stretch of the following
 * straight still counts as cornering and gets charged for grip it never needed.
 * Aggregating hundreds of samples does the averaging anyway.
 */
export function analyseSession(
  samples: TelemetrySample[],
  opts: DashboardOptions
): SessionSummary {
  const sectorCount = Math.max(1, opts.sectors ?? 12)
  const corneringAy = opts.corneringAy ?? 0.3
  const laps = splitLaps(samples)
  const complete = laps.filter((l) => l.complete && l.time !== null)

  const envelope = opts.gg
    ? ggEnvelope(
        opts.gg,
        // A representative speed: the mean of the cornering the driver actually
        // did, so the envelope is drawn where the car was being used.
        meanCorneringSpeed(samples, corneringAy)
      )
    : null

  const pipeline = new OverlayPipeline(opts.geometry, opts.limits, {}, 0)
  const overall = emptySplit()
  const sectors = Array.from({ length: sectorCount }, (_, i) => ({
    index: i,
    from: i / sectorCount,
    to: (i + 1) / sectorCount,
    speedSum: 0,
    peakAy: 0,
    balance: emptySplit(),
    reachSum: 0,
    reachN: 0,
    n: 0
  }))

  let usable = 0
  let atLimit = 0
  let cornering = 0
  let frontLimited = 0
  let reachSum = 0

  // Time per sector comes from sample count and rate rather than from
  // timestamps: a session file can contain a pause or a tow, and differencing
  // timestamps across one of those charges the sector for it.
  const rate = estimateRate(samples)

  for (const sample of samples) {
    const reading = pipeline.push(sample)
    if (!reading.valid) continue
    usable++

    const state: VehicleState = reading.state
    const bin = sectors[Math.min(sectorCount - 1, Math.floor(sample.lapDistPct * sectorCount))]
    if (!bin) continue
    bin.n++
    bin.speedSum += state.speed
    bin.peakAy = Math.max(bin.peakAy, Math.abs(state.ay))

    if (Math.abs(state.ay) < corneringAy) continue
    cornering++

    const which = reading.balance
    overall.samples++
    overall[which]++
    bin.balance.samples++
    bin.balance[which]++
    if (reading.limitingAxle === 'front') frontLimited++

    if (envelope) {
      const reach = reachOf(envelope, { ay: state.ay, ax: state.ax })
      reachSum += reach
      bin.reachSum += reach
      bin.reachN++
      if (reach >= 0.95) atLimit++
    }
  }

  const out: SectorMetrics[] = sectors.map((s) => {
    const time = s.n / rate / Math.max(1, complete.length || 1)
    const gripUsed = s.reachN > 0 ? s.reachSum / s.reachN : 0
    return {
      index: s.index,
      from: s.from,
      to: s.to,
      meanSpeed: s.n > 0 ? s.speedSum / s.n : 0,
      peakAy: s.peakAy,
      balance: normalise(s.balance),
      gripUsed,
      time,
      timeAvailable: timeAvailableFrom(gripUsed, time)
    }
  })

  const gripUsed = cornering > 0 && envelope ? reachSum / cornering : 0

  return {
    laps,
    completeLaps: complete.length,
    bestLapTime: complete.length
      ? Math.min(...complete.map((l) => l.time as number))
      : null,
    balance: normalise(overall),
    gripUsed,
    atLimit: cornering > 0 ? atLimit / cornering : 0,
    frontLimited: cornering > 0 ? frontLimited / cornering : 0,
    sectors: out,
    worst: [...out].sort((a, b) => b.timeAvailable - a.timeAvailable).filter((s) => s.time > 0),
    envelope,
    usable,
    limits: pipeline.limits(),
    exceededEnvelope: gripUsed > 1 || out.some((s) => s.gripUsed > 1),
    envelopeSuspect:
      envelope !== null &&
      cornering > 0 &&
      (gripUsed > 1 || gripUsed < IMPLAUSIBLY_LOW_GRIP)
  }
}

/**
 * Time notionally left on the table by not using all the grip.
 *
 * Cornering speed goes as sqrt(ay), and time as distance over speed, so using
 * a fraction f of the envelope stretches the time by 1/sqrt(f). Deliberately
 * conservative: only the cornering share of the stretch is charged, and a
 * sector with no cornering in it scores zero rather than a large number.
 */
function timeAvailableFrom(gripUsed: number, time: number): number {
  if (gripUsed <= 0.01 || gripUsed >= 1 || time <= 0) return 0
  return time * (1 / Math.sqrt(gripUsed) - 1)
}

/** Mean speed while actually cornering, for sizing the envelope. */
function meanCorneringSpeed(samples: TelemetrySample[], corneringAy: number): number {
  let sum = 0
  let n = 0
  for (const s of samples) {
    if (Math.abs(s.ay) / G < corneringAy) continue
    sum += s.speed
    n++
  }
  if (n === 0) {
    // No cornering at all: fall back to the fastest thing seen, so the
    // envelope is at least in the right part of the speed range.
    let fastest = 0
    for (const s of samples) fastest = Math.max(fastest, s.speed)
    return Math.max(fastest, 10)
  }
  return sum / n
}

/**
 * Sample rate from the timestamps, robustly.
 *
 * The median gap rather than the mean, because a session file can contain a
 * single enormous gap where the driver sat in the garage and a mean would be
 * dominated by it.
 */
export function estimateRate(samples: TelemetrySample[]): number {
  if (samples.length < 3) return 60
  const gaps: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t
    if (dt > 0) gaps.push(dt)
  }
  if (gaps.length === 0) return 60
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]
  return median > 0 ? 1 / median : 60
}

/**
 * The track's shape, reconstructed from the car's own motion.
 *
 * iRacing does not publish position for the player's car -- there is no Lat or
 * Lon in the channel list -- so the path has to be integrated. What makes that
 * work rather than spiral is `YawNorth`: an ABSOLUTE heading. Integrating a yaw
 * RATE would accumulate error in the heading and bend the whole map; taking the
 * heading directly means only position integrates, and a single closing
 * correction at the end handles that.
 *
 * The result is a shape, not a survey. It is good enough to recognise the
 * circuit and to paint a metric onto the right corner, which is all it is for.
 */
export interface TrackPoint {
  x: number
  y: number
  /** Distance around the lap, 0-1. */
  distance: number
}

export interface TrackPathOptions {
  /** Close the loop by distributing the end-to-start error along the path. */
  close?: boolean
  /**
   * How large the closing error may be, as a share of the path length, before
   * closing is refused. See `TrackShape.closed`.
   */
  maxClosure?: number
}

export interface TrackShape {
  points: TrackPoint[]
  /**
   * True when the path was closed onto itself.
   *
   * Closing distributes the end-to-start error along the lap, which is right
   * when that error is drift -- a few metres over a few kilometres. It is very
   * wrong when the path genuinely does not return to its start: forcing a lap
   * shut across a gap that is a third of its own length does not fix a map, it
   * invents one. So a large gap is left open and reported, and the caller can
   * say the data is not a closed lap instead of drawing a confident lie.
   */
  closed: boolean
  /** The end-to-start distance before any correction, m. */
  gap: number
  /** Distance travelled along the path, m. */
  length: number
}

/**
 * Returns an empty path when the source has no heading channel, rather than
 * integrating the yaw rate as a substitute. That substitute looks like it works
 * -- the first corners come out right -- and then bends the far side of the
 * circuit into somewhere it never went. A map that is quietly wrong is worse
 * than no map, because a metric painted on it points at the wrong corner.
 */
export function trackPath(lap: TelemetrySample[], opts: TrackPathOptions = {}): TrackShape {
  const empty: TrackShape = { points: [], closed: false, gap: 0, length: 0 }
  if (lap.length < 3) return empty
  if (lap.some((s) => s.heading === undefined)) return empty

  const pts: TrackPoint[] = []
  let x = 0
  let y = 0
  for (let i = 0; i < lap.length; i++) {
    if (i > 0) {
      const dt = lap[i].t - lap[i - 1].t
      if (dt > 0 && dt < 1) {
        // Trapezoidal, using the heading and speed at both ends. A corner taken
        // at 60 Hz turns a few degrees per sample, which the midpoint handles
        // far better than a left-hand rule.
        const h0 = lap[i - 1].heading as number
        const h1 = lap[i].heading as number
        const v0 = lap[i - 1].speed
        const v1 = lap[i].speed
        x += ((v0 * Math.sin(h0) + v1 * Math.sin(h1)) / 2) * dt
        y += ((v0 * Math.cos(h0) + v1 * Math.cos(h1)) / 2) * dt
      }
    }
    pts.push({ x, y, distance: lap[i].lapDistPct })
  }

  let length = 0
  for (let i = 1; i < pts.length; i++) {
    length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  const last = pts[pts.length - 1]
  const errX = last.x - pts[0].x
  const errY = last.y - pts[0].y
  const gap = Math.hypot(errX, errY)

  // Close only what is nearly closed already. A gap that is a large share of
  // the path is not drift, it is a path that does not return to where it
  // started -- an out-lap, a partial lap, a point-to-point stage -- and
  // dragging its ends together distorts every corner in it.
  const tolerance = (opts.maxClosure ?? 0.1) * length
  const closed = opts.close !== false && pts.length > 2 && gap <= tolerance

  if (closed) {
    // Spread the error along the lap in proportion to distance travelled. Drift
    // accumulates roughly with path length, so distributing it that way removes
    // most of it without bending one corner.
    for (let i = 0; i < pts.length; i++) {
      const f = i / (pts.length - 1)
      pts[i] = { x: pts[i].x - errX * f, y: pts[i].y - errY * f, distance: pts[i].distance }
    }
  }
  return { points: pts, closed, gap, length }
}

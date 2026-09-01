/**
 * Splitting a session into laps, and comparing two of them.
 *
 * This is where a race engineer actually spends their time: not "what is the
 * car's understeer gradient" but "why was that lap three tenths slower, and
 * where". The answer is always somewhere on the track, so everything here is
 * indexed by DISTANCE rather than time -- two laps take different times by
 * definition, and comparing them at the same clock reading compares different
 * corners.
 *
 * The delta is accumulated the way a live timing screen does it: at each point
 * around the lap, the difference in the time taken to reach it. That makes the
 * SLOPE of the delta trace the thing to read -- where it climbs is where time
 * is being lost, and a flat stretch is a place the two laps were equal, however
 * far apart they already were.
 */

import type { TelemetrySample } from './types.js'

export interface Lap {
  number: number
  samples: TelemetrySample[]
  /** Lap time, s. Null when the lap is incomplete at either end. */
  time: number | null
  complete: boolean
  /** Peak |Ay| reached, g. */
  maxAy: number
  meanSpeed: number
}

/**
 * Split a sample stream into laps.
 *
 * On the lap counter rather than on `lapDistPct` wrapping, because the counter
 * is what the sim itself considers a lap and it handles pit exits, resets and
 * partial laps without any guessing here. The first and last laps are marked
 * incomplete: they almost always are, and a lap time computed from a partial
 * lap is worse than no lap time.
 */
export function splitLaps(samples: TelemetrySample[]): Lap[] {
  if (samples.length === 0) return []

  const laps: Lap[] = []
  let current: TelemetrySample[] = []
  let currentNumber = samples[0].lap

  const finish = (complete: boolean): void => {
    if (current.length < 2) return
    const first = current[0]
    const last = current[current.length - 1]
    let maxAy = 0
    let sumSpeed = 0
    for (const s of current) {
      maxAy = Math.max(maxAy, Math.abs(s.ay) / 9.80665)
      sumSpeed += s.speed
    }
    laps.push({
      number: currentNumber,
      samples: current,
      time: complete ? last.t - first.t : null,
      complete,
      maxAy,
      meanSpeed: sumSpeed / current.length
    })
  }

  for (const s of samples) {
    if (s.lap !== currentNumber) {
      finish(laps.length > 0 || current.length > 0)
      current = []
      currentNumber = s.lap
    }
    current.push(s)
  }
  finish(false) // the last lap is still running

  // The first lap is an out-lap or a partial, whatever the counter says.
  if (laps.length > 0) laps[0] = { ...laps[0], complete: false, time: null }
  return laps
}

export interface ResampledLap {
  /** Distance around the lap, 0-1. */
  distance: number[]
  /** Elapsed time from the start of the lap at each distance, s. */
  elapsed: number[]
  speed: number[]
  ay: number[]
  ax: number[]
  steer: number[]
  yawRate: number[]
}

/**
 * Put a lap on a common distance grid, so two of them can be compared point
 * for point.
 *
 * Linear interpolation between samples: at 60 Hz the gaps are small enough that
 * anything cleverer would be pretending to a precision the data does not have.
 */
export function resampleLap(lap: Lap, points = 1000): ResampledLap | null {
  const s = lap.samples
  if (s.length < 10) return null

  // Lap distance can wrap within a lap's samples if the counter and the
  // percentage disagree by a sample or two at the line. Sorting by distance
  // rather than trusting the order removes that as a source of spikes.
  const sorted = [...s].sort((a, b) => a.lapDistPct - b.lapDistPct)
  const t0 = s[0].t

  const out: ResampledLap = {
    distance: [],
    elapsed: [],
    speed: [],
    ay: [],
    ax: [],
    steer: [],
    yawRate: []
  }

  let cursor = 0
  for (let i = 0; i < points; i++) {
    const d = i / (points - 1)
    while (cursor < sorted.length - 2 && sorted[cursor + 1].lapDistPct < d) cursor++
    const a = sorted[cursor]
    const b = sorted[Math.min(cursor + 1, sorted.length - 1)]
    const span = b.lapDistPct - a.lapDistPct
    const f = span > 1e-9 ? Math.max(0, Math.min(1, (d - a.lapDistPct) / span)) : 0
    const mix = (x: number, y: number): number => x + f * (y - x)

    out.distance.push(d)
    out.elapsed.push(mix(a.t, b.t) - t0)
    out.speed.push(mix(a.speed, b.speed))
    out.ay.push(mix(a.ay, b.ay) / 9.80665)
    out.ax.push(mix(a.ax, b.ax) / 9.80665)
    out.steer.push(mix(a.steer, b.steer))
    out.yawRate.push(mix(a.yawRate, b.yawRate))
  }
  return out
}

export interface LapComparison {
  reference: ResampledLap
  compared: ResampledLap
  /**
   * Cumulative time delta at each distance, s. Positive means the compared lap
   * is BEHIND. The slope is what to read: where it climbs, time is being lost.
   */
  delta: number[]
  distance: number[]
  /** Total delta at the line, s. */
  total: number
  /** The stretches where the most time changed hands. */
  segments: LapSegment[]
}

export interface LapSegment {
  from: number
  to: number
  /** Time gained (negative) or lost (positive) over this stretch, s. */
  delta: number
  /** Mean speed difference over the stretch, m/s. */
  speedDelta: number
  /** Mean |Ay| difference, g. */
  ayDelta: number
  /** Mean absolute steer difference, rad. */
  steerDelta: number
}

/**
 * Compare two laps, and say where the time went.
 *
 * The delta trace comes straight from the resampled elapsed times, which is the
 * honest construction: both laps reached the same POINT ON THE TRACK, and the
 * difference in how long that took is the gap at that point.
 */
export function compareLaps(
  reference: Lap,
  compared: Lap,
  points = 1000,
  segments = 12
): LapComparison | null {
  const a = resampleLap(reference, points)
  const b = resampleLap(compared, points)
  if (!a || !b) return null

  const delta = a.elapsed.map((t, i) => b.elapsed[i] - t)

  const out: LapSegment[] = []
  const per = Math.floor(points / segments)
  for (let seg = 0; seg < segments; seg++) {
    const lo = seg * per
    const hi = seg === segments - 1 ? points - 1 : (seg + 1) * per
    let speedSum = 0
    let aySum = 0
    let steerSum = 0
    let n = 0
    for (let i = lo; i <= hi; i++) {
      speedSum += b.speed[i] - a.speed[i]
      aySum += Math.abs(b.ay[i]) - Math.abs(a.ay[i])
      steerSum += Math.abs(b.steer[i]) - Math.abs(a.steer[i])
      n++
    }
    out.push({
      from: a.distance[lo],
      to: a.distance[hi],
      delta: delta[hi] - delta[lo],
      speedDelta: speedSum / n,
      ayDelta: aySum / n,
      steerDelta: steerSum / n
    })
  }

  return {
    reference: a,
    compared: b,
    delta,
    distance: a.distance,
    total: delta[delta.length - 1],
    segments: out
  }
}

/**
 * The segments that mattered, worst first.
 *
 * A lap delta is usually made of a few places where something real happened
 * plus a lot of noise. Ranking by magnitude puts the few first.
 */
export function biggestSegments(c: LapComparison, count = 3): LapSegment[] {
  return [...c.segments].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, count)
}

/**
 * A sentence about one segment.
 *
 * Deliberately cautious about causes. Telemetry can say a corner was slower and
 * that more steer was used through it; it cannot say the car understeered, only
 * that the driver had to add lock, and those are different claims. Ch 11's
 * discipline about confounders applies to reading data as much as to running a
 * test.
 */
export function describeSegment(seg: LapSegment): string {
  const where = `${(seg.from * 100).toFixed(0)}-${(seg.to * 100).toFixed(0)}%`
  const sign = seg.delta > 0 ? 'lost' : 'gained'
  const amount = Math.abs(seg.delta).toFixed(3)

  const clues: string[] = []
  if (Math.abs(seg.speedDelta) > 0.5) {
    clues.push(`${Math.abs(seg.speedDelta).toFixed(1)} m/s ${seg.speedDelta > 0 ? 'faster' : 'slower'}`)
  }
  if (Math.abs(seg.ayDelta) > 0.05) {
    clues.push(`${Math.abs(seg.ayDelta).toFixed(2)} g ${seg.ayDelta > 0 ? 'more' : 'less'} lateral`)
  }
  if (Math.abs(seg.steerDelta) > 0.01) {
    clues.push(
      `${((Math.abs(seg.steerDelta) * 180) / Math.PI).toFixed(1)}° ${seg.steerDelta > 0 ? 'more' : 'less'} steer`
    )
  }

  return `${where}: ${sign} ${amount} s${clues.length ? ` — ${clues.join(', ')}` : ''}`
}

/**
 * Post-session analysis: damper histograms, axle identification, lap comparison.
 *
 * The load-bearing test is the axle one. Fitting an understeer gradient is one
 * equation in two unknowns, so it cannot say what the tyres are doing; adding
 * measured sideslip separates them, and the check is whether a car whose
 * stiffnesses we chose comes back with those stiffnesses.
 */

import { describe, expect, it } from 'vitest'
import { CORNERS, allCorners, cornerHistogram, histogramAtVelocities, readHistogram } from './histogram.js'
import { crossCheckIdentification, identifyAxleStiffness } from './identifyAxle.js'
import { identifyUndersteerGradient } from './identify.js'
import { biggestSegments, compareLaps, describeSegment, resampleLap, splitLaps } from './laps.js'
import type { TelemetrySample } from './types.js'
import { FORMULA_CAR, derive, type BicycleVehicle } from '../core/vehicle/params.js'
import { trimFromSteer, summarise } from '../core/vehicle/steadyState.js'
import { G, toRad } from '../core/util/numeric.js'

const d = derive(FORMULA_CAR)
const geometry = {
  a: FORMULA_CAR.a,
  b: FORMULA_CAR.b,
  frontWeightFraction: d.frontWeightFraction
}

/** Steady trim states of a known car, as telemetry. */
function cornering(vehicle: BicycleVehicle, opts: { steers: number[]; speeds: number[]; per?: number }): TelemetrySample[] {
  const per = opts.per ?? 30
  const out: TelemetrySample[] = []
  let t = 0
  for (const speed of opts.speeds) {
    for (const steerDeg of opts.steers) {
      const trim = trimFromSteer(vehicle, speed, toRad(steerDeg))
      for (let i = 0; i < per; i++) {
        out.push({
          t,
          speed,
          ax: 0,
          ay: trim.ay * G,
          yawRate: trim.yawRate,
          steer: trim.steer,
          lateralVelocity: speed * Math.tan(trim.beta),
          throttle: 0.4,
          brake: 0,
          lapDistPct: (t / 60) % 1,
          lap: 1 + Math.floor(t / 60)
        })
        t += 1 / 60
      }
    }
  }
  return out
}

describe('identifying the axle characteristics, not just their imbalance', () => {
  const samples = cornering(FORMULA_CAR, {
    speeds: [25, 35, 45],
    steers: [-2.5, -1.8, -1.2, -0.6, 0.6, 1.2, 1.8, 2.5]
  })

  it('recovers the cornering stiffnesses of a car we already know', () => {
    // The round trip that justifies the whole approach. K alone could not do
    // this -- it is one equation in two unknowns.
    const id = identifyAxleStiffness(samples, { geometry, weight: d.w })
    expect(id).not.toBeNull()
    expect(id!.cf).toBeCloseTo(FORMULA_CAR.cf, -2)
    expect(id!.cr).toBeCloseTo(FORMULA_CAR.cr, -2)
    expect(id!.cf / FORMULA_CAR.cf).toBeCloseTo(1, 2)
    expect(id!.cr / FORMULA_CAR.cr).toBeCloseTo(1, 2)
  })

  it('fits both axles well, since the data really is linear here', () => {
    const id = identifyAxleStiffness(samples, { geometry, weight: d.w })!
    expect(id.r2Front).toBeGreaterThan(0.99)
    expect(id.r2Rear).toBeGreaterThan(0.99)
  })

  it('implies the same K the direct regression finds', () => {
    // Two independent fits -- steer against Ay, and axle force against axle
    // slip -- sharing no arithmetic beyond the samples. Agreement is evidence.
    const direct = identifyUndersteerGradient(samples, { wheelbase: d.L })!
    const axle = identifyAxleStiffness(samples, { geometry, weight: d.w })!
    const check = crossCheckIdentification(direct.KDeg, axle)
    expect(check.agrees).toBe(true)
    expect(axle.impliedKDeg).toBeCloseTo(direct.KDeg, 2)
    expect(axle.impliedKDeg).toBeCloseTo(summarise(FORMULA_CAR).KDeg, 2)
  })

  it('catches a disagreement rather than averaging it away', () => {
    const axle = identifyAxleStiffness(samples, { geometry, weight: d.w })!
    const check = crossCheckIdentification(axle.impliedKDeg + 1.5, axle)
    expect(check.agrees).toBe(false)
    expect(check.detail).toMatch(/DISAGREE/)
  })

  it('recovers a different car’s stiffnesses too, so it is not fitting one case', () => {
    const other: BicycleVehicle = { ...FORMULA_CAR, cf: 90000, cr: 150000 }
    const id = identifyAxleStiffness(
      cornering(other, { speeds: [30, 40], steers: [-2, -1, 1, 2] }),
      { geometry, weight: d.w }
    )!
    expect(id.cf / other.cf).toBeCloseTo(1, 2)
    expect(id.cr / other.cr).toBeCloseTo(1, 2)
  })

  it('declines when there is not enough cornering to say anything', () => {
    const straight: TelemetrySample[] = Array.from({ length: 600 }, (_, i) => ({
      t: i / 60,
      speed: 50,
      ax: 0,
      ay: 0,
      yawRate: 0,
      steer: 0,
      lateralVelocity: 0,
      throttle: 1,
      brake: 0,
      lapDistPct: 0,
      lap: 1
    }))
    expect(identifyAxleStiffness(straight, { geometry, weight: d.w })).toBeNull()
  })

  it('refuses to be confident about a fit through a single operating point', () => {
    // The dangerous case, and the reason `wellConditioned` exists. A driver who
    // takes the same corner at the same speed all session produces samples at
    // ONE slip angle. A line through the origin and one point is exact, so the
    // slope comes back looking perfect and means nothing.
    // 0.85 deg at 35 m/s is about 0.5 g on this car -- squarely inside the
    // linear-range window the fit accepts, so the samples are not rejected for
    // some other reason and the test is really about the spread.
    const oneCorner = cornering(FORMULA_CAR, { speeds: [35], steers: [0.85], per: 800 })
    const id = identifyAxleStiffness(oneCorner, { geometry, weight: d.w })!
    expect(id.n).toBeGreaterThan(100)
    expect(id.wellConditioned).toBe(false)
    expect(id.spreadFront).toBeLessThan(0.5 / (180 / Math.PI))
    // The slope may still be right -- it is here -- but it is not supported.
    expect(id.cf / FORMULA_CAR.cf).toBeCloseTo(1, 2)
  })

  it('reports r-squared as NaN, not zero, when there is no variance to explain', () => {
    // Zero would read as "a terrible fit" when the truth is "there is nothing
    // here to fit", and those call for opposite reactions.
    const oneCorner = cornering(FORMULA_CAR, { speeds: [35], steers: [0.85], per: 800 })
    const id = identifyAxleStiffness(oneCorner, { geometry, weight: d.w })!
    expect(Number.isNaN(id.r2Front)).toBe(true)
  })

  it('is well conditioned once the session actually varies', () => {
    const id = identifyAxleStiffness(samples, { geometry, weight: d.w })!
    expect(id.wellConditioned).toBe(true)
    expect(id.spreadFront).toBeGreaterThan(0.5 / (180 / Math.PI))
  })

  it('stays out of the nonlinear range, where a straight line means nothing', () => {
    // Past the peak the relationship is not a line, and a fit through the whole
    // range would return neither the initial slope nor the peak.
    const id = identifyAxleStiffness(samples, { geometry, weight: d.w, maxAy: 0.5 })!
    expect(id.maxAy).toBeLessThanOrEqual(0.5)
  })
})

describe('damper velocity histograms -- Ch 22 §4.3', () => {
  /** A session whose shock velocities are drawn from a known distribution. */
  const withShocks = (scale: number, n = 4000): TelemetrySample[] => {
    let seed = 7
    const rand = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    return Array.from({ length: n }, (_, i) => {
      const v = (rand() - 0.5) * 2 * scale
      return {
        t: i / 60,
        speed: 40,
        ax: 0,
        ay: 5,
        yawRate: 0.2,
        steer: 0.03,
        throttle: 0.5,
        brake: 0,
        lapDistPct: (i / n) % 1,
        lap: 1,
        shockVelocity: [v, v * 0.9, v * 1.1, v * 0.95] as [number, number, number, number]
      }
    })
  }

  it('converts shock velocity to wheel velocity, which is the whole trap', () => {
    // Ch 22 §3.2: rate transforms as IR^2 but VELOCITY transforms linearly.
    // Getting this wrong puts every band in the wrong place and the histogram
    // still looks entirely plausible.
    const samples = withShocks(0.03)
    const tight = cornerHistogram(samples, 'LF', { installationRatio: 0.5 })!
    const loose = cornerHistogram(samples, 'LF', { installationRatio: 1.0 })!
    expect(tight.peak).toBeCloseTo(loose.peak * 2, 3)
  })

  it('refuses to guess an installation ratio', () => {
    expect(cornerHistogram(withShocks(0.03), 'LF', { installationRatio: 0 })).toBeNull()
  })

  it('returns null when the car does not publish shock velocity', () => {
    const bare: TelemetrySample[] = [
      { t: 0, speed: 40, ax: 0, ay: 0, yawRate: 0, steer: 0, throttle: 0, brake: 0, lapDistPct: 0, lap: 1 }
    ]
    expect(cornerHistogram(bare, 'LF', { installationRatio: 0.6 })).toBeNull()
    expect(allCorners(bare, { installationRatio: 0.6 }).empty).toBe(true)
  })

  it('builds a histogram for every corner that has data', () => {
    const set = allCorners(withShocks(0.05), { installationRatio: 0.6 })
    expect(set.empty).toBe(false)
    for (const c of CORNERS) expect(set.corners[c]).toBeDefined()
  })

  it('splits its time about evenly between bump and rebound', () => {
    const h = cornerHistogram(withShocks(0.05), 'LF', { installationRatio: 0.6 })!
    expect(h.bumpFraction).toBeGreaterThan(0.4)
    expect(h.bumpFraction).toBeLessThan(0.6)
  })

  it('calls a smooth circuit low-speed, and says the knee barely matters', () => {
    // Ch 22's own argument: adjusting the high-speed side on a track that never
    // goes there is a wasted session.
    const smooth = allCorners(withShocks(0.012), { installationRatio: 0.6 })
    const verdict = readHistogram(smooth)!
    expect(verdict.lowSpeedFraction).toBeGreaterThan(0.9)
    expect(verdict.headline).toMatch(/low-speed/i)
    expect(verdict.detail).toMatch(/wasted effort/)
  })

  it('calls a rough circuit high-speed, where blow-off is doing the work', () => {
    const rough = allCorners(withShocks(0.35), { installationRatio: 0.6 })
    const verdict = readHistogram(rough)!
    expect(verdict.lowSpeedFraction).toBeLessThan(0.7)
    expect(verdict.headline).toMatch(/rough/i)
  })

  it('reports percentiles, so "high speed" is a number rather than a feeling', () => {
    const h = cornerHistogram(withShocks(0.1), 'LF', { installationRatio: 0.6 })!
    expect(h.percentile(0.5)).toBeGreaterThan(h.percentile(0.05))
    expect(h.percentile(0.95)).toBeGreaterThan(h.percentile(0.5))
    expect(Math.abs(h.percentile(0.95))).toBeLessThanOrEqual(h.peak + 1e-9)
  })

  it('samples onto the velocities a force-velocity curve is drawn at', () => {
    // The overlay of the two is the point: the curve says what the damper would
    // do, the histogram says how often it is asked.
    const h = cornerHistogram(withShocks(0.1), 'LF', { installationRatio: 0.6 })!
    const at = histogramAtVelocities(h, [-0.2, 0, 0.2])
    expect(at).toHaveLength(3)
    expect(at.every((p) => p.fraction >= 0 && p.fraction <= 1)).toBe(true)
  })
})

describe('splitting and comparing laps', () => {
  /**
   * A lap around a notional 3 km circuit, optionally slow through one stretch.
   *
   * Distance is INTEGRATED FROM SPEED rather than stepped uniformly, which is
   * the only way the fixture can produce a genuinely slower lap: covering the
   * same distance at a lower speed has to take more time. Stepping distance
   * uniformly makes every lap take the same time whatever the speed channel
   * says, and the comparison test would then pass against a broken comparison.
   */
  const TRACK_LENGTH = 3000
  const buildLap = (lapNumber: number, t0: number, slowFrom = -1, slowTo = -1): TelemetrySample[] => {
    const dt = 1 / 60
    const out: TelemetrySample[] = []
    let dist = 0
    let t = t0
    while (dist < 1 && out.length < 5000) {
      const inSlowPart = dist >= slowFrom && dist <= slowTo
      const speed = inSlowPart ? 30 : 45
      out.push({
        t,
        speed,
        ax: 0,
        ay: 6,
        yawRate: 0.15,
        steer: inSlowPart ? 0.06 : 0.03,
        throttle: 0.6,
        brake: 0,
        lapDistPct: Math.min(dist, 1),
        lap: lapNumber
      })
      dist += (speed * dt) / TRACK_LENGTH
      t += dt
    }
    return out
  }

  /** Chain laps so each starts where the previous one ended. */
  const session = (...specs: [number, number][]): TelemetrySample[] => {
    const out: TelemetrySample[] = []
    let t = 0
    let lap = 1
    for (const [from, to] of specs) {
      const l = buildLap(lap++, t, from, to)
      out.push(...l)
      t = l[l.length - 1].t + 1 / 60
    }
    return out
  }
  const NORMAL: [number, number] = [-1, -1]

  it('splits on the lap counter and marks the partials', () => {
    const samples = session(NORMAL, NORMAL, NORMAL)
    const laps = splitLaps(samples)
    expect(laps).toHaveLength(3)
    // First is an out-lap, last is still running -- neither gets a lap time.
    expect(laps[0].complete).toBe(false)
    expect(laps[0].time).toBeNull()
    expect(laps[1].complete).toBe(true)
    expect(laps[2].complete).toBe(false)
  })

  it('handles an empty session without throwing', () => {
    expect(splitLaps([])).toEqual([])
  })

  it('resamples onto a common distance grid', () => {
    const laps = splitLaps(session(NORMAL, NORMAL, NORMAL))
    const r = resampleLap(laps[1], 200)!
    expect(r.distance).toHaveLength(200)
    expect(r.distance[0]).toBeCloseTo(0, 6)
    expect(r.distance[199]).toBeCloseTo(1, 6)
    // Elapsed time must rise monotonically around the lap.
    for (let i = 1; i < r.elapsed.length; i++) {
      expect(r.elapsed[i]).toBeGreaterThanOrEqual(r.elapsed[i - 1] - 1e-9)
    }
  })

  it('finds where the time went, and it is where the car was slow', () => {
    // The whole point of comparing by DISTANCE rather than time: two laps take
    // different times by definition, so the same clock reading is a different
    // corner.
    const fast = splitLaps(session(NORMAL, NORMAL, NORMAL))[1]
    const slow = splitLaps(session(NORMAL, [0.4, 0.6], NORMAL))[1]

    const c = compareLaps(fast, slow)!
    expect(c.total).toBeGreaterThan(0)

    const worst = biggestSegments(c, 1)[0]
    expect(worst.from).toBeGreaterThanOrEqual(0.3)
    expect(worst.to).toBeLessThanOrEqual(0.75)
    expect(worst.speedDelta).toBeLessThan(0)
  })

  it('makes the delta trace flat where the two laps were equal', () => {
    // The property that makes the SLOPE the thing to read: a flat stretch means
    // the laps were equal there, however far apart they already were.
    const fast = splitLaps(session(NORMAL, NORMAL, NORMAL))[1]
    const slow = splitLaps(session(NORMAL, [0.4, 0.6], NORMAL))[1]
    const c = compareLaps(fast, slow)!

    const early = c.delta[Math.floor(c.delta.length * 0.3)] - c.delta[Math.floor(c.delta.length * 0.1)]
    const during = c.delta[Math.floor(c.delta.length * 0.6)] - c.delta[Math.floor(c.delta.length * 0.4)]
    expect(Math.abs(early)).toBeLessThan(Math.abs(during) / 4)
  })

  it('reports zero delta comparing a lap with itself', () => {
    const lap = splitLaps(session(NORMAL, NORMAL, NORMAL))[1]
    const c = compareLaps(lap, lap)!
    expect(Math.abs(c.total)).toBeLessThan(1e-9)
  })

  it('describes a segment without claiming more than telemetry knows', () => {
    // Data can say a corner was slower and more lock was used. It cannot say
    // the car understeered -- that is a different claim, and the wording keeps
    // the distinction.
    const text = describeSegment({
      from: 0.4,
      to: 0.5,
      delta: 0.25,
      speedDelta: -3,
      ayDelta: -0.2,
      steerDelta: 0.05
    })
    expect(text).toMatch(/40-50%/)
    expect(text).toMatch(/lost 0\.250 s/)
    expect(text).toMatch(/slower/)
    expect(text).toMatch(/more steer/)
    expect(text).not.toMatch(/understeer/)
  })

  it('declines to compare a lap too short to resample', () => {
    const stub = { number: 1, samples: [], time: null, complete: false, maxAy: 0, meanSpeed: 0 }
    expect(resampleLap(stub)).toBeNull()
    expect(compareLaps(stub, stub)).toBeNull()
  })
})

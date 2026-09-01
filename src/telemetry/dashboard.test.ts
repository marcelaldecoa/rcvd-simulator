/**
 * The session dashboard: sector metrics, grip left on the table, track shape.
 *
 * The load-bearing test is the track reconstruction. There is no position
 * channel, so the map is integrated from heading and speed, and an integration
 * that is subtly wrong still produces a plausible-looking squiggle -- which is
 * the worst failure mode available here, because a metric painted onto a wrong
 * map points at the wrong corner with full confidence. So it is tested against
 * a shape whose answer is known exactly: drive a circle, get a circle back.
 */

import { describe, expect, it } from 'vitest'
import { analyseSession, estimateRate, trackPath } from './dashboard.js'
import type { TelemetrySample } from './types.js'
import { FORMULA_CAR, derive } from '../core/vehicle/params.js'
import { FORMULA_CHASSIS } from '../core/vehicle/chassis.js'
import { DEFAULT_MF, MagicFormulaTire } from '../core/tire/magicFormula.js'
import { HIGH_DOWNFORCE } from '../core/aero/index.js'
import { DEFAULT_POWERTRAIN } from '../core/performance/gg.js'
import { trimFromSteer } from '../core/vehicle/steadyState.js'
import { G, toRad } from '../core/util/numeric.js'

const d = derive(FORMULA_CAR)
const geometry = { a: FORMULA_CAR.a, b: FORMULA_CAR.b, frontWeightFraction: d.frontWeightFraction }
const limits = { modelPeakFront: toRad(6), modelPeakRear: toRad(7) }

const ggOpts = {
  vehicle: FORMULA_CAR,
  chassis: FORMULA_CHASSIS,
  tireFront: new MagicFormulaTire(DEFAULT_MF),
  tireRear: new MagicFormulaTire(DEFAULT_MF),
  aero: HIGH_DOWNFORCE,
  powertrain: DEFAULT_POWERTRAIN
}

/**
 * A car driving a circle of known radius, as telemetry.
 *
 * Compass convention, matching the sim's YawNorth: heading 0 points along +y
 * and increases clockwise, so the reconstruction has to agree about that or the
 * circle comes back mirrored.
 */
function circle(radius: number, speed: number, rate = 60, turns = 1): TelemetrySample[] {
  const yawRate = speed / radius
  const duration = (turns * 2 * Math.PI) / yawRate
  const n = Math.round(duration * rate)
  const out: TelemetrySample[] = []
  for (let i = 0; i < n; i++) {
    const t = i / rate
    out.push({
      t,
      speed,
      ax: 0,
      ay: (speed * yawRate) / 1,
      yawRate,
      steer: toRad(2),
      heading: yawRate * t,
      throttle: 0.4,
      brake: 0,
      lapDistPct: (i / n) % 1,
      lap: 1
    })
  }
  return out
}

describe('reconstructing the track from the car', () => {
  it('turns a circle back into a circle of the right size', () => {
    const R = 120
    const path = trackPath(circle(R, 45), { close: false }).points
    expect(path.length).toBeGreaterThan(100)

    // The widest separation across a circle is its diameter.
    let widest = 0
    for (let i = 0; i < path.length; i += 3) {
      for (let j = i + 1; j < path.length; j += 3) {
        widest = Math.max(widest, Math.hypot(path[i].x - path[j].x, path[i].y - path[j].y))
      }
    }
    expect(widest).toBeGreaterThan(2 * R * 0.99)
    expect(widest).toBeLessThan(2 * R * 1.01)
  })

  it('keeps every point the same distance from the centre', () => {
    const R = 80
    const path = trackPath(circle(R, 30), { close: false }).points
    const cx = path.reduce((a, p) => a + p.x, 0) / path.length
    const cy = path.reduce((a, p) => a + p.y, 0) / path.length
    for (const p of path) {
      expect(Math.hypot(p.x - cx, p.y - cy)).toBeCloseTo(R, 0)
    }
  })

  it('closes the loop when asked', () => {
    const shape = trackPath(circle(100, 40), { close: true })
    expect(shape.closed).toBe(true)
    const first = shape.points[0]
    const last = shape.points[shape.points.length - 1]
    // Within a metre of where it started, on a 628 m circumference.
    expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeLessThan(1)
  })

  it('declines rather than guessing when there is no heading channel', () => {
    // Integrating the yaw rate instead would look like it worked and then bend
    // the far side of the circuit somewhere it never went.
    const noHeading = circle(100, 40).map(({ heading: _drop, ...rest }) => rest)
    expect(trackPath(noHeading).points).toEqual([])
  })
})

describe('reading the session', () => {
  /** A lap of steady corners at a chosen severity, as a share of the limit. */
  function lap(opts: { steerDeg: number; speed: number; lapNumber: number; per?: number }): TelemetrySample[] {
    const per = opts.per ?? 40
    const out: TelemetrySample[] = []
    const sectors = 12
    for (let s = 0; s < sectors; s++) {
      // Alternate corner and straight, so there is something to rank.
      const steer = s % 2 === 0 ? opts.steerDeg : 0.01
      const trim = trimFromSteer(FORMULA_CAR, opts.speed, toRad(steer))
      for (let i = 0; i < per; i++) {
        const k = s * per + i
        out.push({
          t: k / 60,
          speed: opts.speed,
          ax: 0,
          ay: trim.ay * G,
          yawRate: trim.yawRate,
          steer: trim.steer,
          lateralVelocity: opts.speed * Math.tan(trim.beta),
          heading: 0,
          throttle: 0.5,
          brake: 0,
          lapDistPct: k / (sectors * per),
          lap: opts.lapNumber
        })
      }
    }
    return out
  }

  const session = [
    ...lap({ steerDeg: 4, speed: 40, lapNumber: 1 }),
    ...lap({ steerDeg: 4, speed: 40, lapNumber: 2 }),
    ...lap({ steerDeg: 4, speed: 40, lapNumber: 3 })
  ].map((s, i) => ({ ...s, t: i / 60 }))

  it('puts each sample in the sector it was driven in', () => {
    const summary = analyseSession(session, { geometry, limits, sectors: 12 })
    expect(summary.sectors).toHaveLength(12)
    for (const s of summary.sectors) {
      expect(s.from).toBeCloseTo(s.index / 12, 9)
      expect(s.to).toBeCloseTo((s.index + 1) / 12, 9)
    }
    // The cornering sectors are the even ones, by construction.
    for (const s of summary.sectors) {
      if (s.index % 2 === 0) expect(s.balance.samples).toBeGreaterThan(0)
      else expect(s.balance.samples).toBe(0)
    }
  })

  it('reports the balance of a car whose balance we chose', () => {
    const summary = analyseSession(session, { geometry, limits })
    // FORMULA_CAR understeers; the shares must sum to one over the cornering.
    expect(summary.balance.samples).toBeGreaterThan(0)
    const total =
      summary.balance.understeer + summary.balance.neutral + summary.balance.oversteer
    expect(total).toBeCloseTo(1, 9)
    expect(summary.balance.understeer).toBeGreaterThan(0.5)
  })

  it('scores a harder-driven car as using more of the envelope', () => {
    const gentle = [...lap({ steerDeg: 2, speed: 40, lapNumber: 1 })]
    const hard = [...lap({ steerDeg: 6, speed: 40, lapNumber: 1 })]

    const a = analyseSession(gentle, { geometry, limits, gg: ggOpts })
    const b = analyseSession(hard, { geometry, limits, gg: ggOpts })

    expect(b.gripUsed).toBeGreaterThan(a.gripUsed)
    // And the gentler drive therefore has more time notionally available.
    const gentleAvailable = a.sectors.reduce((x, s) => x + s.timeAvailable, 0)
    const hardAvailable = b.sectors.reduce((x, s) => x + s.timeAvailable, 0)
    expect(gentleAvailable).toBeGreaterThan(hardAvailable)
  })

  it('ranks worst sectors by time available, not by being slow', () => {
    const summary = analyseSession(session, { geometry, limits, gg: ggOpts })
    for (let i = 1; i < summary.worst.length; i++) {
      expect(summary.worst[i - 1].timeAvailable).toBeGreaterThanOrEqual(
        summary.worst[i].timeAvailable
      )
    }
  })

  it('charges no time to a sector with no cornering in it', () => {
    const summary = analyseSession(session, { geometry, limits, gg: ggOpts })
    for (const s of summary.sectors) {
      if (s.balance.samples === 0) expect(s.timeAvailable).toBe(0)
    }
  })

  it('ignores a parked car entirely', () => {
    const parked: TelemetrySample[] = Array.from({ length: 300 }, (_, i) => ({
      t: i / 60,
      speed: 0,
      ax: -0.01,
      ay: -0.1,
      yawRate: 1e-5,
      steer: 0,
      heading: 0,
      throttle: 0,
      brake: 0,
      lapDistPct: 0,
      lap: 1
    }))
    const summary = analyseSession(parked, { geometry, limits, gg: ggOpts })
    expect(summary.usable).toBe(0)
    expect(summary.balance.samples).toBe(0)
    expect(summary.gripUsed).toBe(0)
  })
})

describe('sample rate', () => {
  const at = (times: number[]): TelemetrySample[] =>
    times.map((t) => ({
      t,
      speed: 40,
      ax: 0,
      ay: 0,
      yawRate: 0,
      steer: 0,
      throttle: 0,
      brake: 0,
      lapDistPct: 0,
      lap: 1
    }))

  it('reads a clean 60 Hz stream', () => {
    expect(estimateRate(at(Array.from({ length: 200 }, (_, i) => i / 60)))).toBeCloseTo(60, 6)
  })

  it('survives one enormous gap', () => {
    // The driver sat in the garage for ten minutes mid-session. A mean gap
    // would be dominated by that; the median is not.
    const times = Array.from({ length: 200 }, (_, i) => i / 60)
    for (let i = 100; i < times.length; i++) times[i] += 600
    expect(estimateRate(at(times))).toBeCloseTo(60, 6)
  })
})

describe('paths that do not come back', () => {
  /**
   * Half a circle: the car ends up a diameter away from where it started.
   *
   * This is the case that made the guard necessary. The synthetic session file
   * is a sequence of corners that never returns to its start, and closing it
   * dragged the two ends together across a gap of 2.6 km on a 4 km lap --
   * which does not fix a map, it invents one. An out-lap, a partial lap, and a
   * point-to-point stage all look like this.
   */
  function halfCircle(radius: number, speed: number): TelemetrySample[] {
    const yawRate = speed / radius
    const n = Math.round(((Math.PI / yawRate) * 60))
    return Array.from({ length: n }, (_, i) => ({
      t: i / 60,
      speed,
      ax: 0,
      ay: speed * yawRate,
      yawRate,
      steer: toRad(2),
      heading: (yawRate * i) / 60,
      throttle: 0.4,
      brake: 0,
      lapDistPct: i / n,
      lap: 1
    }))
  }

  it('refuses to close a path that never returned', () => {
    const R = 100
    const shape = trackPath(halfCircle(R, 40))
    expect(shape.closed).toBe(false)
    // The gap is the diameter, and it is reported rather than hidden.
    expect(shape.gap).toBeGreaterThan(2 * R * 0.98)
    expect(shape.length).toBeGreaterThan(Math.PI * R * 0.98)
  })

  it('leaves the shape untouched when it refuses', () => {
    const R = 100
    const forced = trackPath(halfCircle(R, 40), { maxClosure: 10 })
    const left = trackPath(halfCircle(R, 40))
    expect(forced.closed).toBe(true)
    expect(left.closed).toBe(false)

    // Measured against the arc's KNOWN centre, not the centroid of its points:
    // the centroid of a semicircular arc sits about 0.64R off the true centre,
    // so a centroid-based measure calls a perfect arc distorted.
    //
    // Starting at the origin heading north and turning right, the centre is at
    // (R, 0) by construction.
    const radiusError = (pts: { x: number; y: number }[]): number =>
      Math.max(...pts.map((p) => Math.abs(Math.hypot(p.x - R, p.y) - R)))

    // Left alone, it is still a true arc.
    expect(radiusError(left.points)).toBeLessThan(1)
    // Forced shut, every point has moved: that is the distortion being avoided.
    expect(radiusError(forced.points)).toBeGreaterThan(R * 0.2)
  })
})

describe('an envelope that does not match the car', () => {
  /**
   * The failure this guards is quiet and produces confident nonsense.
   *
   * Time available divides by the square root of grip used, so a garage car
   * with far more grip than the one actually driven scores about 20% used and
   * therefore claims sixteen seconds are available on a lap of eighty-four.
   * Nobody drives at a fifth of their car; when the number says they did, the
   * car is wrong, and the page has to say so rather than print the seconds.
   */
  const gentle = (): TelemetrySample[] => {
    const out: TelemetrySample[] = []
    for (let i = 0; i < 1200; i++) {
      const trim = trimFromSteer(FORMULA_CAR, 40, toRad(1))
      out.push({
        t: i / 60,
        speed: 40,
        ax: 0,
        ay: trim.ay * G,
        yawRate: trim.yawRate,
        steer: trim.steer,
        lateralVelocity: 40 * Math.tan(trim.beta),
        throttle: 0.5,
        brake: 0,
        lapDistPct: (i / 1200) % 1,
        lap: 1
      })
    }
    return out
  }

  it('flags a car driven far below the modelled envelope', () => {
    const summary = analyseSession(gentle(), { geometry, limits, gg: ggOpts })
    expect(summary.gripUsed).toBeLessThan(0.5)
    expect(summary.envelopeSuspect).toBe(true)
    expect(summary.exceededEnvelope).toBe(false)
  })

  it('says nothing about the envelope when there is no envelope', () => {
    // Without gg options there is no model to be wrong about.
    const summary = analyseSession(gentle(), { geometry, limits })
    expect(summary.envelopeSuspect).toBe(false)
  })

  it('reports the limits its own tracker reached, not someone else’s', () => {
    const summary = analyseSession(gentle(), { geometry, limits, gg: ggOpts })
    // Gentle driving never reaches a peak, so both ends must still be modelled
    // -- and must be the model this call was given.
    expect(summary.limits.front.source).toBe('model')
    expect(summary.limits.front.peakSlipAngle).toBeCloseTo(limits.modelPeakFront, 9)
    expect(summary.limits.rear.peakSlipAngle).toBeCloseTo(limits.modelPeakRear, 9)
  })
})

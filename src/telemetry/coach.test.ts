/**
 * What the coach is told.
 *
 * These tests exist for one reason above all the others: this is the only
 * feature in the app that sends anything off the machine, so what goes into
 * the payload is a promise to the user rather than an implementation detail.
 * "No raw samples" has to be enforced, not just intended.
 */

import { describe, expect, it } from 'vitest'
import { COACH_SYSTEM, briefSize, briefToPrompt, buildDebrief } from './coach.js'
import { analyseSession } from './dashboard.js'
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

/** A session with a distinctive, easily-searched-for value in the raw data. */
function session(): TelemetrySample[] {
  const out: TelemetrySample[] = []
  for (let lap = 1; lap <= 3; lap++) {
    for (let s = 0; s < 12; s++) {
      const trim = trimFromSteer(FORMULA_CAR, 40, toRad(s % 2 === 0 ? 4 : 0.01))
      for (let i = 0; i < 40; i++) {
        const k = s * 40 + i
        out.push({
          t: (lap - 1) * 8 + k / 60,
          speed: 40,
          ax: 0,
          ay: trim.ay * G,
          yawRate: trim.yawRate,
          steer: trim.steer,
          lateralVelocity: 40 * Math.tan(trim.beta),
          // A fingerprint: if any raw channel reaches the payload, this shows.
          heading: 1.2345678,
          throttle: 0.5,
          brake: 0,
          lapDistPct: k / 480,
          lap
        })
      }
    }
  }
  return out
}

const summary = analyseSession(session(), { geometry, limits, gg: ggOpts })

describe('the debrief brief', () => {
  it('never carries raw samples', () => {
    const brief = buildDebrief(summary, { carName: 'Test car', trackName: 'Test track' })
    const json = JSON.stringify(brief)

    // The fingerprint value appears in every one of 1440 raw samples.
    expect(json).not.toContain('1.2345678')
    // And no raw channel should appear as a KEY. Matched as `"name":` rather
    // than as a bare substring, because "steer" legitimately occurs inside
    // "understeerShare" and a naive search flags the brief's own vocabulary.
    for (const channel of [
      'yawRate',
      'lapDistPct',
      'throttle',
      'brake',
      'lateralVelocity',
      'steer',
      'speed',
      'heading',
      'ay',
      'ax'
    ]) {
      expect(json).not.toContain(`"${channel}":`)
    }
  })

  it('stays small enough for a person to read before sending it', () => {
    const brief = buildDebrief(summary)
    // Roughly a page. If this ever fails, something started shipping bulk data.
    expect(briefSize(brief)).toBeLessThan(4000)
  })

  it('carries the chapter each number belongs to', () => {
    const brief = buildDebrief(summary)
    expect(brief.balance.chapter).toContain('Ch 5')
    expect(brief.grip.chapter).toContain('Ch 9')
    expect(brief.limits.chapter).toContain('Ch 2')
  })

  it('reports the balance the session actually had', () => {
    const brief = buildDebrief(summary)
    const total =
      brief.balance.understeerShare + brief.balance.neutralShare + brief.balance.oversteerShare
    expect(total).toBeCloseTo(1, 2)
  })

  it('sends only the worst handful of sectors', () => {
    const brief = buildDebrief(summary)
    // All twelve would bury the three that matter.
    expect(brief.sectors.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < brief.sectors.length; i++) {
      expect(brief.sectors[i - 1].timeAvailable).toBeGreaterThanOrEqual(
        brief.sectors[i].timeAvailable
      )
    }
  })

  it('passes on that a fit was badly conditioned rather than hiding it', () => {
    const brief = buildDebrief(summary, {
      axle: {
        cf: 100000,
        cr: 120000,
        r2Front: 1,
        r2Rear: 1,
        n: 500,
        impliedKDeg: 0.2,
        maxAy: 1,
        maxAlphaFront: 0.05,
        maxAlphaRear: 0.04,
        spreadFront: 0.001,
        spreadRear: 0.001,
        wellConditioned: false
      }
    })
    // An r-squared of 1 from one operating point is exact and worthless, so the
    // flag has to travel with the numbers or they read as measurements.
    expect(brief.identified?.wellConditioned).toBe(false)
    expect(brief.identified?.frontCorneringStiffnessNPerRad).toBe(100000)
  })

  it('omits sections there is nothing to say about', () => {
    const brief = buildDebrief(summary)
    expect(brief.identified).toBeUndefined()
    expect(brief.garage).toBeUndefined()
  })
})

describe('the coach instructions', () => {
  it('forbids the claim telemetry cannot support', () => {
    // The whole discipline of Ch 11 in one rule: more lock was used is an
    // observation, the car understeered is an inference.
    expect(COACH_SYSTEM).toContain('CANNOT say the car understeered')
  })

  it('keeps the two balance numbers apart', () => {
    expect(COACH_SYSTEM).toContain('can move in opposite directions')
  })

  it('requires driving and setup changes to be labelled separately', () => {
    expect(COACH_SYSTEM).toMatch(/DRIVING change or a SETUP change/)
  })

  it('allows the answer to be "not enough data"', () => {
    expect(COACH_SYSTEM).toContain('too short or too gentle')
  })
})

describe('the prompt', () => {
  it('explains the units rather than leaving them to be guessed', () => {
    const prompt = briefToPrompt(buildDebrief(summary))
    expect(prompt).toContain('fractions of the cornering')
    expect(prompt).toContain('not a lap-time prediction')
  })

  it('says plainly that no raw samples are included', () => {
    expect(briefToPrompt(buildDebrief(summary))).toContain('no raw samples')
  })
})

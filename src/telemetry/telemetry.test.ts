/**
 * Proves the telemetry analysis pipeline end to end against a car whose
 * understeer gradient we already know exactly.
 *
 * This is the test that makes Phase 2 tractable: when real iRacing data
 * arrives, the question will be whether the *adapter* is right, because the
 * analysis behind it is already known to be.
 */

import { describe, expect, it } from 'vitest'
import { EXERCISE_6_1, FORMULA_CAR, GT_CAR, derive } from '../core/vehicle/params.js'
import { summarise } from '../core/vehicle/steadyState.js'
import { G } from '../core/util/numeric.js'
import { identifyUndersteerGradient, envelopeUsage, ggPoints } from './identify.js'
import { SyntheticSource, generateSamples } from './synthetic.js'

describe('identifying the understeer gradient from telemetry', () => {
  it('recovers K exactly from clean data', () => {
    for (const vehicle of [FORMULA_CAR, GT_CAR, EXERCISE_6_1]) {
      const samples = generateSamples({ vehicle, dwell: 0.5 })
      const id = identifyUndersteerGradient(samples, {
        wheelbase: derive(vehicle).L
      })!
      expect(id).not.toBeNull()
      expect(id.K).toBeCloseTo(summarise(vehicle).K, 6)
      expect(id.intercept).toBeCloseTo(0, 6)
      expect(id.r2).toBeGreaterThan(0.999)
    }
  })

  it('recovers K to within 5% from noisy data', () => {
    const vehicle = GT_CAR
    const samples = generateSamples({ vehicle, dwell: 1, noise: 1, seed: 42 })
    const id = identifyUndersteerGradient(samples, { wheelbase: derive(vehicle).L })!
    const truth = summarise(vehicle).K
    expect(Math.abs(id.K - truth) / Math.abs(truth)).toBeLessThan(0.05)
  })

  it('handles left and right corners together', () => {
    const vehicle = GT_CAR
    const all = generateSamples({ vehicle, dwell: 0.5 })
    const leftOnly = all.filter((s) => s.ay > 0)
    const rightOnly = all.filter((s) => s.ay < 0)
    expect(leftOnly.length).toBeGreaterThan(0)
    expect(rightOnly.length).toBeGreaterThan(0)
    const opts = { wheelbase: derive(vehicle).L }
    const kAll = identifyUndersteerGradient(all, opts)!.K
    const kLeft = identifyUndersteerGradient(leftOnly, opts)!.K
    const kRight = identifyUndersteerGradient(rightOnly, opts)!.K
    expect(kLeft).toBeCloseTo(kAll, 6)
    expect(kRight).toBeCloseTo(kAll, 6)
  })

  it('returns null rather than a bad answer when there is nothing to fit', () => {
    expect(identifyUndersteerGradient([], { wheelbase: 2.6 })).toBeNull()
    const straightLine = generateSamples({ vehicle: GT_CAR, dwell: 0.5 }).map((s) => ({
      ...s,
      ay: 0,
      yawRate: 0,
      steer: 0
    }))
    expect(identifyUndersteerGradient(straightLine, { wheelbase: 2.6 })).toBeNull()
  })

  it('rejects samples taken under longitudinal acceleration', () => {
    const vehicle = GT_CAR
    const clean = generateSamples({ vehicle, dwell: 0.5 })
    // Corrupt half the samples with a steer offset, but mark them as braking.
    const polluted = clean.map((s, i) =>
      i % 2 === 0 ? { ...s, ax: -0.5 * G, steer: s.steer + 0.2 } : s
    )
    const id = identifyUndersteerGradient(polluted, { wheelbase: derive(vehicle).L })!
    expect(id.K).toBeCloseTo(summarise(vehicle).K, 6)
  })

  it('reports how far toward the limit the data reaches', () => {
    const id = identifyUndersteerGradient(generateSamples({ vehicle: GT_CAR, dwell: 0.5 }), {
      wheelbase: derive(GT_CAR).L
    })!
    expect(id.maxAy).toBeGreaterThan(0.2)
    expect(id.n).toBeGreaterThan(100)
  })
})

describe('g-g usage', () => {
  it('maps samples to g units', () => {
    const pts = ggPoints([{ ax: G, ay: -2 * G } as never])
    expect(pts[0].y).toBeCloseTo(1, 9)
    expect(pts[0].x).toBeCloseTo(-2, 9)
  })

  it('measures how much of the envelope the driver used', () => {
    const samples = generateSamples({ vehicle: GT_CAR, dwell: 0.5 })
    const usage = envelopeUsage(samples, 1.5)
    expect(usage).toBeGreaterThanOrEqual(0)
    expect(usage).toBeLessThanOrEqual(1)
  })
})

describe('synthetic source', () => {
  it('reports its status and session without being started', () => {
    const src = new SyntheticSource({ vehicle: GT_CAR })
    expect(src.kind).toBe('synthetic')
    expect(src.status().connected).toBe(false)
    expect(src.session().carName).toBe(GT_CAR.name)
    expect(src.setup()).toBeNull()
  })

  it('produces samples with monotonically increasing time', () => {
    const samples = generateSamples({ vehicle: GT_CAR, dwell: 0.2 })
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].t).toBeGreaterThan(samples[i - 1].t)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generateSamples({ vehicle: GT_CAR, dwell: 0.2, noise: 1, seed: 7 })
    const b = generateSamples({ vehicle: GT_CAR, dwell: 0.2, noise: 1, seed: 7 })
    expect(a.map((s) => s.steer)).toEqual(b.map((s) => s.steer))
  })
})

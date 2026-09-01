/**
 * The g-g diagram -- Ch 9.
 *
 * The envelope is solved from the models rather than drawn as an ellipse, so
 * the tests check that the departures from a circle the chapter lists actually
 * appear: braking exceeds acceleration, the envelope grows with speed on a
 * downforce car, and acceleration crosses from traction-limited to
 * power-limited.
 */

import { describe, expect, it } from 'vitest'
import { G } from '../util/numeric.js'
import { FORMULA_CAR, derive } from '../vehicle/params.js'
import { FORMULA_CHASSIS } from '../vehicle/chassis.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire } from '../tire/scale.js'
import { HIGH_DOWNFORCE, NO_WINGS } from '../aero/index.js'
import { aeroLoads, maxCorneringSpeed } from '../aero/index.js'
import { pairLimit } from '../vehicle/pairAnalysis.js'
import {
  corneringSpeedForRadius,
  DEFAULT_POWERTRAIN,
  envelopeUsage,
  ggEnvelope,
  ggSurface,
  lateralVsSpeed,
  maxAcceleration,
  mirrorEnvelope,
  peakLateral,
  type GGOptions
} from './gg.js'

const base = {
  vehicle: FORMULA_CAR,
  chassis: FORMULA_CHASSIS,
  tireFront: new MagicFormulaTire(DEFAULT_MF),
  tireRear: new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3)),
  powertrain: DEFAULT_POWERTRAIN
}
const winged: GGOptions = { ...base, aero: HIGH_DOWNFORCE }
const plain: GGOptions = { ...base, aero: NO_WINGS }

describe('Ch 9 §2 - departures from a circle', () => {
  it('brakes harder than it accelerates', () => {
    const e = ggEnvelope(plain, 40)
    expect(Math.abs(e.peakBraking)).toBeGreaterThan(e.peakAcceleration)
  })

  it('crosses from traction-limited to power-limited as speed rises', () => {
    expect(maxAcceleration(plain, 12).powerLimited).toBe(false)
    expect(maxAcceleration(plain, 80).powerLimited).toBe(true)
  })

  it('falls in acceleration as speed rises, once power-limited', () => {
    const fast = maxAcceleration(plain, 80).ax
    const mid = maxAcceleration(plain, 50).ax
    expect(fast).toBeLessThan(mid)
  })

  it('grows the whole envelope with speed on a downforce car', () => {
    const slow = ggEnvelope(winged, 25)
    const fast = ggEnvelope(winged, 75)
    expect(fast.peakAy).toBeGreaterThan(slow.peakAy)
    expect(Math.abs(fast.peakBraking)).toBeGreaterThan(Math.abs(slow.peakBraking))
    expect(fast.downforce).toBeGreaterThan(slow.downforce)
  })

  it('leaves the lateral envelope flat with speed when there is no downforce', () => {
    const slow = ggEnvelope(plain, 25).peakAy
    const fast = ggEnvelope(plain, 75).peakAy
    expect(fast).toBeCloseTo(slow, 6)
  })
})

describe('envelope shape', () => {
  const e = ggEnvelope(winged, 50)

  it('peaks laterally under LIGHT BRAKING on a front-limited car', () => {
    // Not at zero, and that is the interesting part. This car is front-limited
    // at steady state, so a little braking transfers load onto the front axle
    // and buys lateral capability faster than the friction ellipse takes it
    // away. It is the analytical account of why trail braking works.
    const peak = e.boundary.reduce((a, b) => (b.ay > a.ay ? b : a))
    expect(peak.ax).toBeLessThan(0)
    expect(peak.ax).toBeGreaterThan(-0.6)
    expect(peak.ay).toBeGreaterThan(e.peakAy)
  })

  it('puts the peak on whichever side loads the limiting axle', () => {
    // The general principle behind trail braking, in both directions. Braking
    // loads the front, power loads the rear, so peak lateral capability sits
    // slightly on whichever side feeds the axle that gives up first. Note the
    // limiting axle must be read UNDER THE ENVELOPE'S OWN CONDITIONS -- aero
    // balance can flip it relative to the static, no-downforce answer.
    const shiftForward: GGOptions = {
      ...winged,
      aero: { ...HIGH_DOWNFORCE, aeroBalance: 0.62 },
      tireRear: new MagicFormulaTire(scaleTire(DEFAULT_MF, 0.8))
    }
    for (const o of [winged, shiftForward]) {
      const env = ggEnvelope(o, 50)
      const limiting = pairLimit(
        o.vehicle,
        o.chassis,
        o.tireFront,
        o.tireRear,
        0,
        aeroLoads(o.aero, 50)
      ).limitingAxle
      const peak = env.boundary.reduce((a, b) => (b.ay > a.ay ? b : a))
      if (limiting === 'front') expect(peak.ax).toBeLessThan(0)
      else expect(peak.ax).toBeGreaterThan(0)
    }
  })

  it('never reports zero grip just because the limit is large', () => {
    // Regression: the limit solver used a fixed [0, 6] g bracket, so a
    // high-downforce car that genuinely exceeds 6 g fell outside it, the
    // bisection failed, and the fallback reported NO grip -- a wrong answer
    // that looks entirely plausible on a chart.
    const huge: GGOptions = { ...base, aero: { ...HIGH_DOWNFORCE, clA: 12 } }
    const limits = [20, 55, 90].map((V) => peakLateral(huge, V, 0))
    for (const l of limits) expect(l).toBeGreaterThan(1)
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i]).toBeGreaterThan(limits[i - 1])
    }
    expect(limits[2]).toBeGreaterThan(6)
  })

  it('closes to zero lateral at both longitudinal extremes', () => {
    expect(e.boundary[0].ay).toBeCloseTo(0, 3)
    expect(e.boundary[e.boundary.length - 1].ay).toBeCloseTo(0, 3)
  })

  it('never produces a negative or non-finite lateral capability', () => {
    for (const p of e.boundary) {
      expect(Number.isFinite(p.ay)).toBe(true)
      expect(p.ay).toBeGreaterThanOrEqual(0)
    }
  })

  it('mirrors into a symmetric diagram', () => {
    const full = mirrorEnvelope(e.boundary)
    expect(full).toHaveLength(e.boundary.length * 2)
    expect(Math.min(...full.map((p) => p.ay))).toBeLessThan(0)
    expect(Math.max(...full.map((p) => p.ay))).toBeGreaterThan(0)
  })

  it('stacks into a g-g-V surface', () => {
    const surface = ggSurface(winged, [20, 40, 60, 80])
    expect(surface).toHaveLength(4)
    for (let i = 1; i < surface.length; i++) {
      expect(surface[i].peakAy).toBeGreaterThan(surface[i - 1].peakAy)
    }
  })
})

describe('lateral capability against speed', () => {
  it('rises with speed on a winged car and stays flat without wings', () => {
    const w = lateralVsSpeed(winged, 90, 9)
    const p = lateralVsSpeed(plain, 90, 9)
    expect(w[9].ay).toBeGreaterThan(w[0].ay * 1.5)
    expect(p[9].ay).toBeCloseTo(p[0].ay, 6)
  })

  it('starts both cars at the same mechanical grip', () => {
    expect(peakLateral(winged, 0)).toBeCloseTo(peakLateral(plain, 0), 9)
  })
})

describe('cornering speed for a radius', () => {
  it('is higher with downforce than without', () => {
    expect(corneringSpeedForRadius(winged, 200)).toBeGreaterThan(
      corneringSpeedForRadius(plain, 200)
    )
  })

  it('satisfies its own definition: demand equals capability there', () => {
    const speed = corneringSpeedForRadius(winged, 150)
    const demand = (speed * speed) / (G * 150)
    expect(demand).toBeCloseTo(peakLateral(winged, speed), 3)
  })

  it('does NOT go singular the way the constant-mu closed form does', () => {
    // Ch 3's closed form assumes one fixed mu, so past a critical C_L A its
    // denominator turns negative and the answer runs away to infinity. Real
    // tyres are load-sensitive: piling on downforce buys less and less grip,
    // so the simulator always returns a finite speed. The closed form's
    // singularity is an artefact of its own assumption, and worth seeing.
    const enormous: GGOptions = { ...base, aero: { ...HIGH_DOWNFORCE, clA: 12 } }
    const closedForm = maxCorneringSpeed(FORMULA_CAR.mass, 200, 1.66, enormous.aero)
    expect(closedForm).toBe(Infinity)

    const simulated = corneringSpeedForRadius(enormous, 200)
    expect(Number.isFinite(simulated)).toBe(true)
    // Still faster than the merely-winged car, just not infinitely so.
    expect(simulated).toBeGreaterThan(corneringSpeedForRadius(winged, 200))
  })
})

describe('Ch 9 §4 - capability versus usage', () => {
  const e = ggEnvelope(plain, 40)

  it('counts a driver sitting on the boundary as full usage', () => {
    const onLimit = e.boundary.map((p) => ({ ...p }))
    expect(envelopeUsage(e, onLimit).fraction).toBeCloseTo(1, 6)
  })

  it('counts a timid driver as low usage', () => {
    // Scale BOTH components: shrinking only the lateral one leaves a
    // straight-line braking point exactly where it was, still on the boundary.
    const timid = e.boundary.map((p) => ({ ax: p.ax * 0.5, ay: p.ay * 0.5 }))
    expect(envelopeUsage(e, timid).fraction).toBe(0)
  })

  it('finds the "notch" signature: limits reached, transitions not', () => {
    // Ch 9 §4's classic amateur pattern -- full braking straight, full lateral
    // with no braking, and nothing blended in between.
    const notch = [
      { ax: e.peakBraking, ay: 0 },
      { ax: 0, ay: e.peakAy },
      { ax: e.peakBraking * 0.5, ay: e.peakAy * 0.2 }
    ]
    const usage = envelopeUsage(e, notch)
    expect(usage.used).toBe(2)
    expect(usage.fraction).toBeCloseTo(2 / 3, 6)
  })

  it('handles an empty sample set', () => {
    expect(envelopeUsage(e, []).fraction).toBe(0)
  })
})

describe('sanity against the quoted ranges of Ch 9 §3', () => {
  it('puts a winged car in the ranges the chapter quotes', () => {
    const e = ggEnvelope(winged, 60)
    expect(e.peakAy).toBeGreaterThan(1.4)
    expect(e.peakAy).toBeLessThan(3.5)
    expect(Math.abs(e.peakBraking)).toBeGreaterThan(1.6)
    expect(e.peakAcceleration).toBeGreaterThan(0.5)
    expect(e.peakAcceleration).toBeLessThan(1.6)
  })

  it('keeps total weight consistent', () => {
    expect(derive(FORMULA_CAR).w).toBeGreaterThan(0)
  })
})

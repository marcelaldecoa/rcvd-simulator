/**
 * Telemetry to vehicle state, and vehicle state to what the driver sees.
 *
 * The load-bearing test is the round trip: generate telemetry from a car whose
 * slip angles we already know, push it through the estimator, and check the
 * angles that come back are the ones we put in. If the pipeline cannot recover
 * the state of a car we built ourselves, it will not recover the state of a car
 * we did not.
 */

import { describe, expect, it } from 'vitest'
import {
  LimitTracker,
  MIN_KINEMATIC_SPEED,
  OverlayPipeline,
  SideslipEstimator,
  StateFilter,
  ZONE_COLOUR,
  toReading,
  toVehicleState,
  usageColour,
  type VehicleGeometry,
  type VehicleState
} from './state.js'
import type { TelemetrySample } from './types.js'
import { FORMULA_CAR, derive } from '../core/vehicle/params.js'
import { trimFromSteer } from '../core/vehicle/steadyState.js'
import { G, toDeg, toRad } from '../core/util/numeric.js'

const d = derive(FORMULA_CAR)
const geometry: VehicleGeometry = {
  a: FORMULA_CAR.a,
  b: FORMULA_CAR.b,
  frontWeightFraction: d.frontWeightFraction
}

/** A steady trim state of the app's own car, expressed as a telemetry sample. */
function sampleFromTrim(speed: number, steerDeg: number, t = 0): {
  sample: TelemetrySample
  expected: { beta: number; alphaFront: number; alphaRear: number }
} {
  const trim = trimFromSteer(FORMULA_CAR, speed, toRad(steerDeg))
  return {
    sample: {
      t,
      speed,
      ax: 0,
      ay: trim.ay * G,
      yawRate: trim.yawRate,
      steer: trim.steer,
      lateralVelocity: speed * Math.tan(trim.beta),
      throttle: 0.4,
      brake: 0,
      lapDistPct: 0,
      lap: 1
    },
    expected: { beta: trim.beta, alphaFront: trim.alphaF, alphaRear: trim.alphaR }
  }
}

describe('recovering vehicle state from telemetry', () => {
  it('recovers the slip angles of a car we already know', () => {
    // The round trip. trimFromSteer knows the answer; the estimator is only
    // allowed the channels a simulator would actually publish.
    for (const speed of [20, 35, 50]) {
      for (const steerDeg of [-4, -1.5, 1.5, 4]) {
        const { sample, expected } = sampleFromTrim(speed, steerDeg)
        const est = new SideslipEstimator()
        const state = toVehicleState(sample, geometry, est.update(sample))
        expect(state.beta).toBeCloseTo(expected.beta, 9)
        expect(state.alphaFront).toBeCloseTo(expected.alphaFront, 9)
        expect(state.alphaRear).toBeCloseTo(expected.alphaRear, 9)
      }
    }
  })

  it('prefers the measured lateral velocity over integrating', () => {
    const { sample } = sampleFromTrim(35, 3)
    const est = new SideslipEstimator()
    est.update(sample)
    expect(est.isIntegrating).toBe(false)
  })

  it('falls back to integration when there is no lateral velocity, and says so', () => {
    const est = new SideslipEstimator()
    const { sample } = sampleFromTrim(35, 3)
    const withoutVy: TelemetrySample = { ...sample, lateralVelocity: undefined }
    est.update(withoutVy)
    expect(est.isIntegrating).toBe(true)
  })

  it('reports zero sideslip at a standstill rather than a large wrong number', () => {
    // beta = atan2(vy, V) is meaningless as V goes to zero, and a driving aid
    // that swings wildly in the pit lane is worse than useless.
    const est = new SideslipEstimator()
    const stopped: TelemetrySample = {
      t: 0,
      speed: 0.4,
      ax: 0,
      ay: 0.2,
      yawRate: 0.3,
      steer: toRad(20),
      lateralVelocity: 0.3,
      throttle: 0,
      brake: 0,
      lapDistPct: 0,
      lap: 1
    }
    expect(est.update(stopped)).toBe(0)
  })

  it('computes the path radius the yaw rate implies', () => {
    const { sample } = sampleFromTrim(40, 3)
    const est = new SideslipEstimator()
    const state = toVehicleState(sample, geometry, est.update(sample))
    expect(state.radius).toBeCloseTo(sample.speed / sample.yawRate, 6)
  })

  it('calls a straight line an infinite radius rather than dividing by zero', () => {
    const straight: TelemetrySample = {
      t: 0,
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
    }
    const est = new SideslipEstimator()
    expect(toVehicleState(straight, geometry, est.update(straight)).radius).toBe(Infinity)
  })
})

describe('the display filter', () => {
  it('passes the first sample through untouched', () => {
    const f = new StateFilter(0.12)
    const { sample } = sampleFromTrim(35, 3)
    const raw = toVehicleState(sample, geometry, Math.tan(0.02))
    expect(f.update(raw).beta).toBe(raw.beta)
  })

  it('converges on a held value', () => {
    const f = new StateFilter(0.05)
    const { sample } = sampleFromTrim(35, 3)
    let out = toVehicleState({ ...sample, t: 0 }, geometry, 0)
    f.update(out)
    for (let i = 1; i < 120; i++) {
      out = f.update(toVehicleState({ ...sample, t: i / 60 }, geometry, 0.05))
    }
    expect(out.beta).toBeCloseTo(0.05, 4)
  })

  it('cuts the step response, which is the whole point at 60 Hz', () => {
    // An unfiltered sideslip readout at 60 Hz is unreadable, and an unreadable
    // driving aid is a distraction rather than an aid.
    const f = new StateFilter(0.2)
    const base = toVehicleState(sampleFromTrim(35, 0).sample, geometry, 0)
    f.update({ ...base, t: 0 })
    const stepped = f.update({ ...base, t: 1 / 60, beta: 0.1 })
    expect(stepped.beta).toBeLessThan(0.05)
    expect(stepped.beta).toBeGreaterThan(0)
  })
})

describe('finding the limit without being told where it is', () => {
  const model = { modelPeakFront: toRad(6), modelPeakRear: toRad(7) }

  const stateAt = (alphaF: number, alphaR: number, ay: number): VehicleState => ({
    t: 0,
    speed: 40,
    beta: 0,
    alphaFront: alphaF,
    alphaRear: alphaR,
    ay,
    ax: 0,
    yawRate: 0.3,
    steer: 0.05,
    valid: true,
    radius: 100
  })

  it('reports the modelled peak until there is evidence', () => {
    const tracker = new LimitTracker(model)
    expect(tracker.front().source).toBe('model')
    expect(tracker.front().peakSlipAngle).toBeCloseTo(toRad(6), 9)
  })

  it('learns the peak from data that goes past it', () => {
    const tracker = new LimitTracker(model)
    // Ay rises with slip angle to 4.5 deg and falls after -- a tyre peaking there.
    for (let pass = 0; pass < 40; pass++) {
      for (const deg of [1, 2, 3, 4, 4.5, 5, 5.5, 6]) {
        const ay = deg <= 4.5 ? 0.3 * deg : 1.35 - 0.08 * (deg - 4.5)
        tracker.observe(stateAt(toRad(deg), toRad(deg * 0.8), ay))
      }
    }
    const front = tracker.front()
    expect(front.source).toBe('observed')
    expect(toDeg(front.peakSlipAngle)).toBeCloseTo(4.5, 0)
  })

  it('refuses to call the highest angle visited a peak', () => {
    // The commonest way this estimator could lie: a driver who never reaches
    // the limit produces a monotonically rising Ay, and the top bin is simply
    // where they stopped. Without evidence BEYOND the candidate peak, the
    // modelled value stands.
    const tracker = new LimitTracker(model)
    for (let pass = 0; pass < 40; pass++) {
      for (const deg of [1, 2, 3, 3.5]) {
        tracker.observe(stateAt(toRad(deg), toRad(deg), 0.3 * deg))
      }
    }
    expect(tracker.front().source).toBe('model')
  })

  it('ignores states that are not roughly trimmed', () => {
    // The estimator rests on Fyf = Wf*Ay, which is Ch 7's demand split and only
    // holds near trim. Under heavy braking or power it does not.
    const tracker = new LimitTracker(model)
    for (let pass = 0; pass < 60; pass++) {
      for (const deg of [1, 2, 3, 4, 5, 6]) {
        tracker.observe({ ...stateAt(toRad(deg), toRad(deg), 1.2), ax: -0.9 })
      }
    }
    expect(tracker.front().source).toBe('model')
  })

  it('ignores near-straight running, where slip angles are noise', () => {
    const tracker = new LimitTracker(model)
    for (let i = 0; i < 500; i++) tracker.observe(stateAt(toRad(0.2), toRad(0.1), 0.05))
    expect(tracker.front().source).toBe('model')
  })
})

describe('what the driver sees', () => {
  const front = { peakSlipAngle: toRad(6), source: 'observed' as const, confidence: 100 }
  const rear = { peakSlipAngle: toRad(7), source: 'observed' as const, confidence: 100 }
  const at = (fDeg: number, rDeg: number): VehicleState => ({
    t: 0,
    speed: 40,
    beta: 0,
    alphaFront: toRad(fDeg),
    alphaRear: toRad(rDeg),
    ay: 1,
    ax: 0,
    yawRate: 0.3,
    steer: 0.05,
    valid: true,
    radius: 100
  })

  it('separates BALANCE from ZONE, which is the whole design', () => {
    // A car can be strongly understeering while nowhere near its limit. The
    // word and the colour are answering different questions and must be free
    // to disagree.
    const r = toReading(at(3, 1), front, rear)
    expect(r.balance).toBe('understeer')
    expect(r.zone).toBe('under')
  })

  it('calls understeer when the front is running the bigger angle', () => {
    expect(toReading(at(4, 2), front, rear).balance).toBe('understeer')
  })

  it('calls oversteer when the rear is', () => {
    expect(toReading(at(2, 4), front, rear).balance).toBe('oversteer')
  })

  it('has a neutral band, so noise does not flicker the word', () => {
    expect(toReading(at(3, 3.1), front, rear).balance).toBe('neutral')
  })

  it('reads a right-hand corner the same as a left-hand one', () => {
    const left = toReading(at(4, 2), front, rear)
    const right = toReading({ ...at(4, 2), alphaFront: toRad(-4), alphaRear: toRad(-2) }, front, rear)
    expect(right.balance).toBe(left.balance)
    expect(right.usage).toBeCloseTo(left.usage, 12)
  })

  it('goes green, yellow, red as the limit approaches', () => {
    expect(toReading(at(2, 2), front, rear).zone).toBe('under')
    expect(toReading(at(5.4, 2), front, rear).zone).toBe('at')
    expect(toReading(at(7, 2), front, rear).zone).toBe('over')
  })

  it('takes the zone from whichever axle is nearer ITS own peak', () => {
    // 5 deg is 83% of the front's peak but only 71% of the rear's, so the
    // front sets the colour even though both are at the same angle.
    const r = toReading(at(5, 5), front, rear)
    expect(r.limitingAxle).toBe('front')
    expect(r.usage).toBeCloseTo(r.usageFront, 12)
  })

  it('flags itself provisional while a limit is still modelled', () => {
    const modelled = { peakSlipAngle: toRad(6), source: 'model' as const, confidence: 0 }
    expect(toReading(at(3, 2), modelled, rear).provisional).toBe(true)
    expect(toReading(at(3, 2), front, rear).provisional).toBe(false)
  })

  it('gives a continuous colour, not three steps', () => {
    // Peripheral vision reads a ramp far better than it reads a jump.
    const a = usageColour(0.4)
    const b = usageColour(0.6)
    const c = usageColour(0.95)
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect(usageColour(2)).toBe(usageColour(1.5))
    expect(ZONE_COLOUR.under).toMatch(/^#/)
  })
})

describe('the pipeline end to end', () => {
  it('drives from samples to a reading', () => {
    const p = new OverlayPipeline(geometry, {
      modelPeakFront: toRad(6),
      modelPeakRear: toRad(7)
    })
    let last = p.push(sampleFromTrim(35, 2, 0).sample)
    for (let i = 1; i < 60; i++) {
      last = p.push(sampleFromTrim(35, 2, i / 60).sample)
    }
    expect(Number.isFinite(last.usage)).toBe(true)
    expect(last.balance).toBeDefined()
    expect(last.state.alphaFront).toBeGreaterThan(0)
  })

  it('settles on the true slip angles once the filter has caught up', () => {
    const p = new OverlayPipeline(
      geometry,
      { modelPeakFront: toRad(6), modelPeakRear: toRad(7) },
      {},
      0.05
    )
    const { expected } = sampleFromTrim(35, 2)
    let last = p.push(sampleFromTrim(35, 2, 0).sample)
    for (let i = 1; i < 120; i++) last = p.push(sampleFromTrim(35, 2, i / 60).sample)
    expect(last.state.alphaFront).toBeCloseTo(expected.alphaFront, 4)
    expect(last.state.alphaRear).toBeCloseTo(expected.alphaRear, 4)
  })

  it('starts provisional and can be reset', () => {
    const p = new OverlayPipeline(geometry, {
      modelPeakFront: toRad(6),
      modelPeakRear: toRad(7)
    })
    expect(p.limits().front.source).toBe('model')
    p.reset()
    expect(p.limits().front.source).toBe('model')
  })
})

describe('a car that is not moving', () => {
  /**
   * The overlay went haywire in the pit box, and the reason is arithmetic
   * rather than a wiring mistake.
   *
   * Every slip angle here is built on `a*r/V`. The old code floored V at 1e-6
   * to avoid dividing by zero, which does avoid the exception and does nothing
   * about the real problem: at a standstill the yaw channel still carries a few
   * microradians per second of sensor noise, and dividing that by 1e-6 is a
   * million-fold amplifier. The box showed hundreds of degrees of slip,
   * flickering between understeer and oversteer, for a parked car.
   *
   * These tests are written against NOISE rather than against exact zeros,
   * because exact zeros would have passed on the broken code too.
   */
  const parked = (yawNoise: number, steerNoise = 0): TelemetrySample => ({
    t: 0,
    speed: 0,
    ax: -0.01,
    ay: -0.1,
    yawRate: yawNoise,
    steer: steerNoise,
    throttle: 0,
    brake: 0,
    lapDistPct: 0,
    lap: 1,
    lateralVelocity: 1e-5
  })

  it('does not amplify yaw noise into slip angle', () => {
    // A hundredth of a degree per second of noise -- less than a real sensor.
    const state = toVehicleState(parked(toRad(0.01)), geometry, 0)
    expect(state.valid).toBe(false)
    expect(Math.abs(toDeg(state.alphaFront))).toBeLessThan(0.001)
    expect(Math.abs(toDeg(state.alphaRear))).toBeLessThan(0.001)
  })

  it('stays quiet however the noise happens to fall', () => {
    // The old failure was not a constant offset, it was random: the sign and
    // size followed the noise. So sweep it.
    for (let i = -20; i <= 20; i++) {
      const state = toVehicleState(parked(i * 1e-5, i * 1e-4), geometry, 0)
      expect(state.valid).toBe(false)
      expect(Math.abs(toDeg(state.alphaFront))).toBeLessThan(0.001)
      expect(Math.abs(toDeg(state.alphaRear))).toBeLessThan(0.001)
    }
  })

  it('reports that it is not measuring, rather than a verdict', () => {
    const state = toVehicleState(parked(toRad(0.01)), geometry, 0)
    const limit = { peakSlipAngle: toRad(6), source: 'observed' as const, confidence: 100 }
    const reading = toReading(state, limit, limit)

    expect(reading.valid).toBe(false)
    expect(reading.usage).toBe(0)
    // Crucially NOT 'NEUTRAL'. A green box reading NEUTRAL at a standstill is
    // the overlay asserting the car is balanced when it has no idea.
    expect(reading.text).not.toBe('NEUTRAL')
  })

  it('will not let the limit tracker learn from it', () => {
    const tracker = new LimitTracker({ modelPeakFront: toRad(6), modelPeakRear: toRad(7) })
    // A spin in the pit lane: real lateral acceleration, no valid angles.
    for (let i = 0; i < 500; i++) {
      tracker.observe({
        t: i / 60,
        speed: 1,
        beta: 0,
        alphaFront: 0,
        alphaRear: 0,
        ay: 0.9,
        ax: 0,
        yawRate: 1.2,
        steer: 0.1,
        radius: Infinity,
        valid: false
      })
    }
    // If these had been recorded, the zero bin would hold 0.9 g and the
    // estimator would conclude the front axle peaks at no slip angle at all.
    expect(tracker.front().source).toBe('model')
    expect(tracker.rear().source).toBe('model')
  })

  it('picks up again cleanly once the car is moving', () => {
    const pipeline = new OverlayPipeline(geometry, {
      modelPeakFront: toRad(6),
      modelPeakRear: toRad(7)
    })
    // Sit still for a second, then drive.
    for (let i = 0; i < 60; i++) {
      const r = pipeline.push({ ...parked(toRad(0.02)), t: i / 60 })
      expect(r.valid).toBe(false)
    }
    const { sample, expected } = sampleFromTrim(35, 3)
    const after = pipeline.push({ ...sample, t: 2 })

    expect(after.valid).toBe(true)
    // The filter must not be easing out of the run of zeros: the first moving
    // reading should already be the real angle, not a fraction of it.
    expect(toDeg(after.state.alphaFront)).toBeCloseTo(toDeg(expected.alphaFront), 6)
  })

  it('agrees with the constant it is documented against', () => {
    expect(toVehicleState({ ...parked(0), speed: MIN_KINEMATIC_SPEED - 0.01 }, geometry, 0).valid)
      .toBe(false)
    expect(toVehicleState({ ...parked(0), speed: MIN_KINEMATIC_SPEED }, geometry, 0).valid).toBe(true)
  })
})

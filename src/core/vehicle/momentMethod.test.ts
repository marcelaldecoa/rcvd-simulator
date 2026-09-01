/**
 * The Moment Method -- Ch 8.
 *
 * The load-bearing test is the one that ties the map back to the rest of the
 * course. At N = 0 the moment balance forces Fyf = Wf*Ay and Fyr = Wr*Ay --
 * exactly the demand split of steady cornering -- so the highest trimmed Ay the
 * map admits MUST equal the Ch 7 pair-analysis limit. Ch 8 §3 puts it plainly:
 * the N = 0 crossings are everything Chapters 5 and 7 computed.
 */

import { describe, expect, it } from 'vitest'
import { toDeg, toRad } from '../util/numeric.js'
import { FORMULA_CAR, derive, type BicycleVehicle } from './params.js'
import { FORMULA_CHASSIS } from './chassis.js'
import { pairLimit } from './pairAnalysis.js'
import { summarise } from './steadyState.js'
import type { TireModel } from '../tire/types.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire, scaleTireGrip } from '../tire/scale.js'
import { aeroLoads, HIGH_DOWNFORCE } from '../aero/index.js'
import {
  mmmDiagram,
  mmmPoint,
  maxTrimmedAy,
  stabilityAndControl,
  type MMMOptions
} from './momentMethod.js'

const tireF = new MagicFormulaTire(DEFAULT_MF)
const tireR = new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3))

/**
 * A perfectly linear tyre: Fy = C*alpha, no load sensitivity, no peak. Only
 * `fy` is ever called when building the map, so the rest of the interface is
 * deliberately absent -- this exists to check the map against hand algebra,
 * not to be a usable tyre.
 */
function linearTire(cPerTire: number): TireModel {
  return {
    name: 'linear',
    fy: (alpha: number) => cPerTire * alpha,
    corneringStiffness: () => cPerTire
  } as unknown as TireModel
}

const base: MMMOptions = {
  vehicle: FORMULA_CAR,
  chassis: FORMULA_CHASSIS,
  tireFront: tireF,
  tireRear: tireR
}

describe('a single point of the map', () => {
  it('makes nothing at all when held straight', () => {
    const p = mmmPoint(base, 0, 0)
    expect(p.ay).toBeCloseTo(0, 9)
    expect(p.yawMoment).toBeCloseTo(0, 9)
  })

  it('uses the r = 0 slip angles of Ch 8 §8', () => {
    const beta = toRad(3)
    const steer = toRad(2)
    const p = mmmPoint(base, beta, steer)
    expect(p.alphaF).toBeCloseTo(steer - beta, 12)
    expect(p.alphaR).toBeCloseTo(-beta, 12)
  })

  it('is antisymmetric: mirroring the inputs mirrors the outputs', () => {
    const a = mmmPoint(base, toRad(4), toRad(3))
    const b = mmmPoint(base, toRad(-4), toRad(-3))
    expect(b.ay).toBeCloseTo(-a.ay, 6)
    expect(b.yawMoment).toBeCloseTo(-a.yawMoment, 3)
  })

  it('converges its lateral acceleration against the forces it produced', () => {
    const { w } = derive(FORMULA_CAR)
    for (const beta of [toRad(-6), toRad(2), toRad(9)]) {
      const p = mmmPoint(base, beta, toRad(3))
      expect(p.ay).toBeCloseTo((p.fyFront + p.fyRear) / w, 6)
    }
  })

  it('computes yaw moment as a*Fyf - b*Fyr', () => {
    const p = mmmPoint(base, toRad(5), toRad(2))
    expect(p.yawMoment).toBeCloseTo(
      FORMULA_CAR.a * p.fyFront - FORMULA_CAR.b * p.fyRear,
      6
    )
  })
})

describe('Ch 8 §3 - the N = 0 line reproduces Chapters 5 and 7', () => {
  it('splits the demand exactly as steady cornering does at a trim point', () => {
    const { wf, wr } = derive(FORMULA_CAR)
    const d = mmmDiagram({ ...base, lines: 11, samples: 161 })
    const trim = d.trimLine.find((t) => Math.abs(t.ay) > 0.3)!
    const p = mmmPoint(base, trim.beta, trim.steer)
    expect(Math.abs(p.yawMoment)).toBeLessThan(80)
    // Moment balance forces the axle forces into the static load ratio.
    expect(p.fyFront / p.ay).toBeCloseTo(wf, -2)
    expect(p.fyRear / p.ay).toBeCloseTo(wr, -2)
  })

  it('reaches the same trimmed limit as Ch 7 pair analysis', () => {
    const fromMMM = maxTrimmedAy(base)
    const fromPair = pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR).limitAy
    expect(fromMMM).toBeCloseTo(fromPair, 2)
  })

  it('still agrees once downforce is added', () => {
    const aero = aeroLoads(HIGH_DOWNFORCE, 60)
    expect(maxTrimmedAy({ ...base, aero })).toBeCloseTo(
      pairLimit(FORMULA_CAR, FORMULA_CHASSIS, tireF, tireR, 0, aero).limitAy,
      2
    )
  })

  it('trims at a steer angle that is purely the slip-angle difference', () => {
    // With r = 0 there is no Ackermann term, so delta_trim = alpha_f - alpha_r.
    const d = mmmDiagram({ ...base, lines: 11, samples: 121 })
    for (const t of d.trimLine) {
      const p = mmmPoint(base, t.beta, t.steer)
      expect(p.steer).toBeCloseTo(p.alphaF - p.alphaR, 12)
    }
  })
})

describe('Ch 8 §4 - stability, control, and understeer as their ratio', () => {
  const d = mmmDiagram(base)

  it('reports a stable car as negative dN/dAy', () => {
    expect(summarise(FORMULA_CAR).balance).toBe('understeer')
    expect(d.stability).toBeLessThan(0)
  })

  it('reports positive control: more steer, more yaw moment', () => {
    expect(d.control).toBeGreaterThan(0)
  })

  it('recovers the understeer gradient from the ratio of the two', () => {
    // Ch 8 §4: K is proportional to -stability/control, and in the linear
    // range that proportionality is exact. Compared against a vehicle whose
    // axle stiffnesses come from the SAME tyres the map is built on -- the
    // preset's hard-coded Cf and Cr describe a different car.
    //
    // Checked on a car with real understeer to spend, not on the near-neutral
    // preset where both sides are ~0 and any two numbers agree.
    const { wf, wr } = derive(FORMULA_CAR)
    const softFront = new MagicFormulaTire(scaleTireGrip(DEFAULT_MF, { stiffness: 0.6 }))
    const matched: BicycleVehicle = {
      ...FORMULA_CAR,
      cf: 2 * softFront.corneringStiffness(wf / 2),
      cr: 2 * tireR.corneringStiffness(wr / 2)
    }
    const map = mmmDiagram({ ...base, vehicle: matched, tireFront: softFront })
    expect(summarise(matched).KDeg).toBeGreaterThan(0.8)
    // Close, but a few percent apart, and the gap has a name: the map probes
    // the tyres over +/-0.5 deg and so measures a SECANT slope, while Ch 5's
    // corneringStiffness is the TANGENT at the origin. On a curved Fy(alpha)
    // those differ.
    expect(toDeg(map.understeerFromRatio)).toBeCloseTo(summarise(matched).KDeg, 1)

    // Rebuild the linear car from the secant slopes the map actually sees and
    // the remaining disagreement drops by an order of magnitude, which is the
    // proof that curvature is what the gap was. What is left over -- a few
    // tenths of a percent -- is the other thing the map has and the linear
    // model does not: even at these tiny probe angles the car makes a little
    // Ay, so the two tyres on an axle sit at different loads, and cornering
    // stiffness is concave in load.
    const h = toRad(0.5)
    const secant: BicycleVehicle = {
      ...matched,
      cf: (2 * softFront.fy(h, wf / 2)) / h,
      cr: (2 * tireR.fy(h, wr / 2)) / h
    }
    const tangentError = Math.abs(toDeg(map.understeerFromRatio) - summarise(matched).KDeg)
    const secantError = Math.abs(toDeg(map.understeerFromRatio) - summarise(secant).KDeg)
    expect(secantError).toBeLessThan(tangentError / 10)
    expect(secantError).toBeLessThan(0.005)
  })

  it('flips the sign of stability when the car is made oversteering', () => {
    const loose = new MagicFormulaTire(
      scaleTireGrip(scaleTire(DEFAULT_MF, 1.3), { mu: 0.7, stiffness: 0.7 })
    )
    const { wf, wr } = derive(FORMULA_CAR)
    const v: BicycleVehicle = {
      ...FORMULA_CAR,
      cf: 2 * tireF.corneringStiffness(wf / 2),
      cr: 2 * loose.corneringStiffness(wr / 2)
    }
    expect(summarise(v).balance).toBe('oversteer')
    expect(mmmDiagram({ ...base, vehicle: v, tireRear: loose }).stability).toBeGreaterThan(0)
  })

  it('agrees with the standalone derivative helper', () => {
    const sc = stabilityAndControl(base)
    expect(sc.stability).toBeCloseTo(d.stability, 9)
    expect(sc.control).toBeCloseTo(d.control, 9)
    expect(sc.understeerFromRatio).toBeCloseTo(d.understeerFromRatio, 9)
  })

  it('matches the closed-form derivatives of the linear bicycle model', () => {
    // Working the r = 0 map by hand with Fy = C*alpha gives
    //   stability = W (a*Cf - b*Cr) / (Cf + Cr)
    //   control   = L * Cf * Cr / (Cf + Cr)
    // and their ratio collapses to Wf/Cf - Wr/Cr, which IS the Ch 5 understeer
    // gradient. That collapse is the whole content of Ch 8 §4, so it is worth
    // pinning exactly rather than approximately.
    const cf = 2 * 900
    const cr = 2 * 1100
    const v: BicycleVehicle = { ...FORMULA_CAR, cf, cr }
    const o: MMMOptions = {
      ...base,
      vehicle: v,
      tireFront: linearTire(cf / 2),
      tireRear: linearTire(cr / 2)
    }
    const { w, wf, wr, L } = derive(v)
    const sc = stabilityAndControl(o)

    expect(sc.stability).toBeCloseTo((w * (v.a * cf - v.b * cr)) / (cf + cr), 4)
    expect(sc.control).toBeCloseTo((L * cf * cr) / (cf + cr), 4)
    expect(sc.understeerFromRatio).toBeCloseTo(wf / cf - wr / cr, 9)
    expect(toDeg(sc.understeerFromRatio)).toBeCloseTo(summarise(v).KDeg, 6)
  })

  it('shows that stiffer tyres buy control, not stability', () => {
    // A result I expected to go the other way. Stability here is dN/dAy -- per
    // g, not per degree of sideslip -- and stiffening both axles scales the
    // numerator and denominator of W(a*Cf - b*Cr)/(Cf + Cr) alike, so it barely
    // moves. Control, L*Cf*Cr/(Cf + Cr), scales almost in proportion.
    //
    // So "sharper" and "more resistant to leaving trim" are separate axes, and
    // tyre stiffness only buys the first. Since K is their ratio, the car also
    // gets LESS understeering -- which is the Ch 5 result Wf/Cf - Wr/Cr seen
    // from the other side.
    const scaled = (k: number): MMMOptions => ({
      ...base,
      tireFront: new MagicFormulaTire(scaleTireGrip(DEFAULT_MF, { stiffness: k })),
      tireRear: new MagicFormulaTire(
        scaleTireGrip(scaleTire(DEFAULT_MF, 1.3), { stiffness: k })
      )
    })
    const soft = stabilityAndControl(scaled(0.7))
    const stiff = stabilityAndControl(scaled(1.5))

    expect(stiff.control / soft.control).toBeGreaterThan(1.8)
    expect(Math.abs(stiff.stability / soft.stability)).toBeLessThan(1.3)
    expect(Math.abs(toDeg(stiff.understeerFromRatio))).toBeLessThan(
      Math.abs(toDeg(soft.understeerFromRatio))
    )
  })
})

describe('Ch 8 §5 - limit behaviour', () => {
  const d = mmmDiagram({ ...base, lines: 11, samples: 81 })

  it('closes: the map has a finite envelope', () => {
    expect(d.maxAy).toBeGreaterThan(1)
    expect(d.maxAy).toBeLessThan(4)
    expect(Number.isFinite(d.maxYawMoment)).toBe(true)
    expect(d.maxYawMoment).toBeGreaterThan(0)
  })

  it('cannot trim beyond what it can produce', () => {
    expect(d.maxTrimmedAy).toBeLessThanOrEqual(d.maxAy + 1e-9)
  })

  it('measures the performance the balance throws away', () => {
    // Ch 8 §5: the gap between max Ay anywhere and max trimmed Ay.
    expect(d.balanceLoss).toBeGreaterThanOrEqual(0)
    expect(d.balanceLoss).toBeCloseTo(d.maxAy - d.maxTrimmedAy, 12)
  })

  it('throws away more when the car is badly balanced', () => {
    const loose = new MagicFormulaTire(
      scaleTireGrip(scaleTire(DEFAULT_MF, 1.3), { mu: 0.72, stiffness: 0.72 })
    )
    expect(maxTrimmedAy({ ...base, tireRear: loose })).toBeLessThan(maxTrimmedAy(base))
  })
})

describe('the diagram as a whole', () => {
  const d = mmmDiagram(base)

  it('builds both families of contours', () => {
    expect(d.constantSteer).toHaveLength(9)
    expect(d.constantBeta).toHaveLength(9)
    expect(d.constantSteer[0].points.length).toBeGreaterThan(20)
  })

  it('resolves the trim line independently of the drawn contours', () => {
    // Deliberately not tied to `lines`: the trim line's peak sits within about
    // a degree of steer, so sampling it only where contours happen to fall
    // hides the very feature the line exists to show.
    expect(d.trimLine.length).toBeGreaterThan(d.constantSteer.length * 4)
    for (const t of d.trimLine) {
      // Solved to 1e-9 rad of sideslip; dN/dbeta is of order 1e5, so that is
      // a residual moment of well under a milli-newton-metre.
      expect(Math.abs(mmmPoint(base, t.beta, t.steer).yawMoment)).toBeLessThan(1e-3)
    }
  })

  it('closes the envelope, and encloses every point the map contains', () => {
    expect(d.envelope.length).toBeGreaterThan(20)
    for (const e of d.envelope) expect(e.nUpper).toBeGreaterThanOrEqual(e.nLower)

    // The point of an envelope: nothing the car can do lies outside it.
    const bins = d.envelope.length
    for (const c of [...d.constantSteer, ...d.constantBeta]) {
      for (const p of c.points) {
        const near = d.envelope.reduce((best, e) =>
          Math.abs(e.ay - p.ay) < Math.abs(best.ay - p.ay) ? e : best
        )
        const slack = (2 * d.maxAy) / bins
        expect(p.yawMoment).toBeLessThanOrEqual(near.nUpper + Math.abs(d.stability) * slack + 1)
        expect(p.yawMoment).toBeGreaterThanOrEqual(near.nLower - Math.abs(d.stability) * slack - 1)
      }
    }
  })

  it('finds its widest point inside the input rectangle, not on its edge', () => {
    // Why the envelope needs its own grid: both axles peak at a finite slip
    // angle, so the most Ay this car can make is alpha_f = alpha_r = peak --
    // which is a large sideslip with the steering STRAIGHT, an interior point.
    const widest = d.envelope.reduce((best, e) =>
      Math.abs(e.ay) > Math.abs(best.ay) ? e : best
    )
    expect(Math.abs(widest.ay)).toBeGreaterThan(0)
    const straight = d.constantSteer.find((c) => Math.abs(c.value) < 1e-9)!
    const bestOnStraight = Math.max(...straight.points.map((p) => Math.abs(p.ay)))
    const onEdge = Math.max(
      ...d.constantSteer[0].points.map((p) => Math.abs(p.ay)),
      ...d.constantSteer[d.constantSteer.length - 1].points.map((p) => Math.abs(p.ay))
    )
    expect(bestOnStraight).toBeGreaterThan(onEdge)
  })

  it('orders the trim line by steer angle', () => {
    for (let i = 1; i < d.trimLine.length; i++) {
      expect(d.trimLine[i].steer).toBeGreaterThan(d.trimLine[i - 1].steer)
    }
  })

  it('shows terminal understeer: the trim line rises, peaks, then curls back', () => {
    // Ch 8 §5. Past the front axle's peak, more steer means more front slip
    // angle on the FALLING side of the tyre curve, so trimmed Ay stops rising
    // and comes back down. The trim line terminates against the front-limited
    // boundary rather than running on forever.
    // With r = 0 the trim steer is only the slip-angle difference, so the whole
    // rise happens inside a couple of degrees -- which is why the trim line is
    // solved on its own grid rather than at the drawn contours.
    const fine = mmmDiagram({ ...base, steerRange: toRad(6), trimSamples: 81 })
    const positive = fine.trimLine.filter((t) => t.steer > 0)
    expect(positive.length).toBeGreaterThan(5)
    expect(positive[1].ay).toBeGreaterThan(positive[0].ay)

    const peakIndex = positive.reduce((best, t, i) => (t.ay > positive[best].ay ? i : best), 0)
    // The peak is strictly inside the range: it rises to it and comes back.
    expect(peakIndex).toBeGreaterThan(0)
    expect(peakIndex).toBeLessThan(positive.length - 1)
    expect(positive[peakIndex].ay).toBeCloseTo(
      Math.max(...positive.map((t) => t.ay)),
      12
    )
    // The peak of the trim line IS the trimmed limit -- to grid resolution.
    // The trim line is sampled on a discrete steer grid and its crossings are
    // interpolated, so its maximum sits a hair below the continuously solved
    // one rather than exactly on it.
    expect(positive[peakIndex].ay).toBeCloseTo(fine.maxTrimmedAy, 3)
    expect(positive[peakIndex].ay).toBeCloseTo(maxTrimmedAy(base), 2)
  })

  it('produces no NaNs anywhere on the map', () => {
    for (const c of [...d.constantSteer, ...d.constantBeta]) {
      for (const p of c.points) {
        expect(Number.isFinite(p.ay)).toBe(true)
        expect(Number.isFinite(p.yawMoment)).toBe(true)
      }
    }
  })
})

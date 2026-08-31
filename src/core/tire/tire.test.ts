/**
 * Tire model tests, checked against the worked solutions in Ch 2.
 *
 * Where the course notes quote a number, that number is the assertion. This is
 * what keeps the app honest: if a refactor changes the physics, the exercises
 * stop reproducing and the suite goes red.
 */

import { describe, expect, it } from 'vitest'
import { toRad, toDeg } from '../util/numeric.js'
import {
  brushFy,
  brushSlideAngle,
  ellipseRemainingFx,
  ellipseRemainingFy,
  relaxationLag,
  BrushTire,
  DEFAULT_BRUSH
} from './brush.js'
import {
  axleCapacity,
  fitFromTwoPoints,
  muAtLoad,
  quadraticCoefficients,
  quadraticLoss
} from './loadSensitivity.js'
import { MagicFormulaTire, DEFAULT_MF } from './magicFormula.js'

describe('Ch 2 Exercise 2.1 - brush model', () => {
  // Ca = 1600 N/deg, mu = 1.6, Fz = 4000 N
  const ca = 1600 * (180 / Math.PI) // 91,673 N/rad
  const mu = 1.6
  const fz = 4000

  it('converts cornering stiffness to N/rad as the solution does', () => {
    expect(ca).toBeCloseTo(91673, -1)
  })

  it('gives a full-slide angle of 11.8 deg', () => {
    expect(toDeg(brushSlideAngle(ca, mu, fz))).toBeCloseTo(11.83, 1)
  })

  it('gives 2698 N at 2 deg of slip', () => {
    expect(brushFy(toRad(2), ca, mu, fz)).toBeCloseTo(2698, -1)
  })

  it('is 16% below the linear estimate at 2 deg', () => {
    const linear = ca * toRad(2)
    expect(linear).toBeCloseTo(3200, 0)
    const shortfall = 1 - brushFy(toRad(2), ca, mu, fz) / linear
    expect(shortfall).toBeCloseTo(0.157, 2)
  })

  it('is odd in slip angle and saturates at mu*Fz', () => {
    expect(brushFy(toRad(-2), ca, mu, fz)).toBeCloseTo(-2698, -1)
    expect(brushFy(toRad(30), ca, mu, fz)).toBeCloseTo(mu * fz, 6)
  })
})

describe('Ch 2 Exercises 2.2 and 2.6 - load sensitivity', () => {
  // 4500 N at Fz = 3000 N, 8100 N at Fz = 6000 N
  const ls = fitFromTwoPoints(3000, 4500, 6000, 8100)

  it('recovers mu = 1.50 and 1.35 at the fitted points', () => {
    expect(muAtLoad(ls, 3000)).toBeCloseTo(1.5, 6)
    expect(muAtLoad(ls, 6000)).toBeCloseTo(1.35, 6)
  })

  it('recovers Fy = 1.65*Fz - 5e-5*Fz^2', () => {
    const { a, c } = quadraticCoefficients(ls)
    expect(a).toBeCloseTo(1.65, 6)
    expect(c).toBeCloseTo(5e-5, 10)
  })

  it('gives 12,825 N axle capacity with equal 4500 N loads', () => {
    expect(axleCapacity(ls, 4500, 0).fyAxle).toBeCloseTo(12825, 0)
  })

  it('gives 12,600 N with 1500 N of load transfer, a 225 N loss', () => {
    const cap = axleCapacity(ls, 4500, 1500)
    expect(cap.fyAxle).toBeCloseTo(12600, 0)
    expect(cap.loss).toBeCloseTo(225, 0)
    expect(cap.lossFraction).toBeCloseTo(0.0175, 4)
  })

  it('matches the closed-form loss 2*c*Delta^2 of Exercise 2.6', () => {
    expect(quadraticLoss(ls, 1500)).toBeCloseTo(225, 6)
    expect(quadraticLoss(ls, 1500)).toBeCloseTo(axleCapacity(ls, 4500, 1500).loss, 6)
  })

  it('makes the loss independent of nominal load, as Exercise 2.6 requires', () => {
    const atLow = axleCapacity(ls, 4000, 1200).loss
    const atHigh = axleCapacity(ls, 7000, 1200).loss
    expect(atLow).toBeCloseTo(atHigh, 6)
  })

  it('makes the loss quadratic in transfer - doubling it quadruples the loss', () => {
    const single = axleCapacity(ls, 6000, 1000).loss
    const double = axleCapacity(ls, 6000, 2000).loss
    expect(double / single).toBeCloseTo(4, 6)
  })
})

describe('Ch 2 Exercise 2.3 - friction ellipse', () => {
  it('leaves 3600 N of lateral while braking at 3000 of 5000 N', () => {
    expect(ellipseRemainingFy(3000, 5000, 4500)).toBeCloseTo(3600, 0)
  })

  it('leaves 2292 N of braking while cornering at 4000 of 4500 N', () => {
    expect(ellipseRemainingFx(4000, 4500, 5000)).toBeCloseTo(2292, -1)
  })

  it('keeps 87% of lateral at half of longitudinal capability', () => {
    expect(ellipseRemainingFy(2500, 5000, 1) ).toBeCloseTo(Math.sqrt(0.75), 4)
  })
})

describe('Ch 2 Exercise 2.4 - pneumatic trail', () => {
  const tire = new BrushTire({ ...DEFAULT_BRUSH, contactLength: 0.16 })

  it('gives a small-slip trail of 26.7 mm for a 0.16 m patch', () => {
    expect(tire.trailAtZeroSlip).toBeCloseTo(0.02667, 5)
  })

  it('collapses trail toward zero as the patch slides out', () => {
    const fz = 4000
    const nearZero = tire.pneumaticTrail(toRad(0.001), fz)
    const atPeak = tire.pneumaticTrail(tire.peakFy(fz).at, fz)
    expect(nearZero).toBeCloseTo(tire.trailAtZeroSlip, 3)
    expect(atPeak).toBeLessThan(0.35 * nearZero)
  })

  it('peaks aligning torque at a LOWER slip angle than lateral force', () => {
    const fz = 4000
    let mzPeakAlpha = 0
    let mzPeak = -Infinity
    for (let d = 0.1; d < 15; d += 0.05) {
      const m = tire.mz(toRad(d), fz)
      if (m > mzPeak) {
        mzPeak = m
        mzPeakAlpha = toRad(d)
      }
    }
    expect(mzPeakAlpha).toBeLessThan(tire.peakFy(fz).at)
  })
})

describe('Ch 2 Exercise 2.5 and 6.7 - relaxation length', () => {
  it('gives tau = 12.5 ms and t95 = 37.5 ms at 40 m/s', () => {
    const { tau, time } = relaxationLag(0.5, 40, 0.95)
    expect(tau).toBeCloseTo(0.0125, 6)
    expect(time).toBeCloseTo(0.0375, 3)
    expect(time / tau).toBeCloseTo(3, 1)
  })

  it('grows the lag at low speed', () => {
    expect(relaxationLag(0.5, 10, 0.95).tau).toBeCloseTo(0.05, 6)
    expect(relaxationLag(0.5, 10, 0.95).time).toBeCloseTo(0.15, 2)
  })

  it('Exercise 6.7: 30 ms at 15 m/s, 7.5 ms at 60 m/s', () => {
    expect(relaxationLag(0.45, 15).tau).toBeCloseTo(0.03, 6)
    expect(relaxationLag(0.45, 60).tau).toBeCloseTo(0.0075, 6)
  })
})

describe('Magic Formula', () => {
  const tire = new MagicFormulaTire(DEFAULT_MF)

  it('has slope BCD at the origin equal to the cornering stiffness', () => {
    const fz = 4000
    const h = 1e-6
    const slope = (tire.fy(h, fz) - tire.fy(-h, fz)) / (2 * h)
    expect(slope).toBeCloseTo(tire.corneringStiffness(fz), 0)
  })

  it('peaks at mu_y * Fz', () => {
    const fz = 4000
    expect(tire.peakFy(fz).value).toBeCloseTo(tire.muY(fz) * fz, 0)
  })

  it('peaks at the requested slip angle at the reference load', () => {
    expect(toDeg(tire.peakFy(DEFAULT_MF.lateral.fz0).at)).toBeCloseTo(
      DEFAULT_MF.peakSlipAngleDeg,
      2
    )
  })

  it('peaks at the requested slip ratio at the reference load', () => {
    expect(tire.peakFx(DEFAULT_MF.longitudinal.fz0).at).toBeCloseTo(
      DEFAULT_MF.peakSlipRatio,
      3
    )
  })

  it('raises the peak slip angle with load - the Ch 19 anti-Ackermann argument', () => {
    const light = toDeg(tire.peakFy(2500).at)
    const nominal = toDeg(tire.peakFy(4000).at)
    const heavy = toDeg(tire.peakFy(6000).at)
    expect(light).toBeLessThan(nominal)
    expect(nominal).toBeLessThan(heavy)
  })

  it('keeps the curvature factor E below 1 so the curve stays well behaved', () => {
    expect(tire.curvatureE).toBeLessThan(1)
    expect(tire.curvatureEx).toBeLessThan(1)
  })

  it('loses effective friction as load rises (load sensitivity)', () => {
    expect(tire.muY(6000)).toBeLessThan(tire.muY(3000))
  })

  it('shows the concave Fy-vs-Fz curve that makes load transfer costly', () => {
    const at3 = tire.peakFy(3000).value
    const at6 = tire.peakFy(6000).value
    const at45 = tire.peakFy(4500).value
    expect(at3 + at6).toBeLessThan(2 * at45)
  })

  it('reproduces the friction ellipse at the combined limit', () => {
    const fz = 4000
    const aPeak = tire.peakFy(fz).at
    const kPeak = tire.peakFx(fz).at
    const fyMax = tire.peakFy(fz).value
    const fxMax = tire.peakFx(fz).value
    // Walk the limit envelope: normalised slips on the unit circle.
    for (const phi of [0.2, 0.6, 1.0, 1.4]) {
      const c = tire.combined({
        alpha: Math.atan(Math.sin(phi) * Math.tan(aPeak)),
        kappa: Math.cos(phi) * kPeak,
        fz
      })
      const r = (c.fx / fxMax) ** 2 + (c.fy / fyMax) ** 2
      expect(r).toBeCloseTo(1, 1)
    }
  })

  it('collapses lateral force under simultaneous drive torque', () => {
    const fz = 4000
    const pure = tire.combined({ alpha: toRad(4), kappa: 0, fz }).fy
    const combined = tire.combined({ alpha: toRad(4), kappa: 0.15, fz }).fy
    expect(combined).toBeLessThan(pure)
  })
})

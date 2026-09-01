/**
 * The formula catalogue restates arithmetic that already lives in the models.
 * That duplication is deliberate — a formula you can hold and manipulate is a
 * different object from a function that returns a number — but it is only safe
 * if the two are pinned together.
 *
 * So the load-bearing tests here evaluate each formula and compare it against
 * the model function it mirrors. If a model changes and the playground does
 * not, this suite goes red rather than quietly teaching the wrong thing.
 */

import { describe, expect, it } from 'vitest'
import { G, toDeg, toRad } from '../util/numeric.js'
import { EXERCISE_6_1, derive, type BicycleVehicle } from '../vehicle/params.js'
import { responseAtSpeed, stabilityFactor, summarise } from '../vehicle/steadyState.js'
import { modal } from '../vehicle/transient.js'
import { lateralTransfer, longitudinalTransfer, totalLateralTransfer } from '../vehicle/chassis.js'
import { FORMULA_CHASSIS } from '../vehicle/chassis.js'
import { FORMULA_CAR } from '../vehicle/params.js'
import { quadraticLoss, fitFromTwoPoints, quadraticCoefficients } from '../tire/loadSensitivity.js'
import { ellipseRemainingFy, brushSlideAngle, relaxationLag } from '../tire/brush.js'
import {
  defaultValues,
  formulaById,
  FORMULAS,
  localSensitivity,
  sweepFormula
} from './index.js'

/** Evaluate a formula by id with overrides on top of its defaults. */
function evalWith(id: string, overrides: Record<string, number> = {}): number {
  const f = formulaById(id)!
  return f.evaluate({ ...defaultValues(f), ...overrides })
}

describe('catalogue integrity', () => {
  it('has a unique id for every formula', () => {
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(FORMULAS.length)
  })

  it('gives every formula variables, a sweep and an insight', () => {
    for (const f of FORMULAS) {
      expect(f.vars.length, f.id).toBeGreaterThan(0)
      expect(f.sweep.length, f.id).toBeGreaterThan(0)
      expect(f.insight.length, f.id).toBeGreaterThan(40)
    }
  })

  it('only nominates sweep variables that exist', () => {
    for (const f of FORMULAS) {
      for (const key of f.sweep) {
        expect(f.vars.some((v) => v.key === key), `${f.id}: ${key}`).toBe(true)
      }
    }
  })

  it('starts every variable inside its own slider range', () => {
    for (const f of FORMULAS) {
      for (const v of f.vars) {
        expect(v.value, `${f.id}.${v.key}`).toBeGreaterThanOrEqual(v.min)
        expect(v.value, `${f.id}.${v.key}`).toBeLessThanOrEqual(v.max)
      }
    }
  })

  it('evaluates to a finite number at its defaults', () => {
    for (const f of FORMULAS) {
      expect(Number.isFinite(f.evaluate(defaultValues(f))), f.id).toBe(true)
    }
  })

  it('stays finite across every sweep, at every variable', () => {
    for (const f of FORMULAS) {
      const values = defaultValues(f)
      for (const v of f.vars) {
        const pts = sweepFormula(f, values, v.key, 40)
        expect(pts.length, `${f.id}.${v.key}`).toBe(41)
        // NaN is allowed only where the maths genuinely has no value; nothing
        // here should produce one at its own slider limits.
        expect(pts.every((p) => Number.isFinite(p.y)), `${f.id}.${v.key}`).toBe(true)
      }
    }
  })

  it('substitutes numbers without leaving a symbol behind', () => {
    for (const f of FORMULAS) {
      const sub = f.substituted(defaultValues(f))
      expect(sub.length, f.id).toBeGreaterThan(0)
      // The substituted form must not still contain the variable symbols.
      for (const v of f.vars) {
        const bare = v.tex.replace(/\\/g, '')
        if (bare.length > 2) expect(sub.includes(v.tex), `${f.id}: ${v.tex}`).toBe(false)
      }
    }
  })

  it('makes term breakdowns add up to the result', () => {
    for (const f of FORMULAS.filter((x) => x.terms)) {
      const values = defaultValues(f)
      const sum = f.terms!(values).reduce(
        (acc, t, i) => (i === 0 ? t.value : acc - t.value),
        0
      )
      // Breakdowns here are either a sum or a leading-term-minus-rest.
      const total = f.evaluate(values)
      const plain = f.terms!(values).reduce((a, t) => a + t.value, 0)
      expect(Math.min(Math.abs(sum - total), Math.abs(plain - total)), f.id).toBeLessThan(1e-9)
    }
  })
})

// ---------------------------------------------------------------------------
// The important part: agreement with the models.
// ---------------------------------------------------------------------------

describe('agreement with the tyre models', () => {
  it('axle loss matches quadraticLoss', () => {
    const ls = fitFromTwoPoints(3000, 4500, 6000, 8100)
    const { c } = quadraticCoefficients(ls)
    expect(evalWith('load-sensitivity-loss', { c, d: 1500 })).toBeCloseTo(
      quadraticLoss(ls, 1500),
      9
    )
    // and reproduces Exercise 2.6's 225 N
    expect(evalWith('load-sensitivity-loss', { c, d: 1500 })).toBeCloseTo(225, 6)
  })

  it('friction ellipse matches ellipseRemainingFy, and Exercise 2.3', () => {
    expect(evalWith('friction-ellipse', { fx: 3000, fxmax: 5000, fymax: 4500 })).toBeCloseTo(
      ellipseRemainingFy(3000, 5000, 4500),
      9
    )
    expect(evalWith('friction-ellipse', { fx: 3000, fxmax: 5000, fymax: 4500 })).toBeCloseTo(
      3600,
      6
    )
  })

  it('full-slide angle matches brushSlideAngle, and Exercise 2.1', () => {
    const ca = 1600 * (180 / Math.PI)
    expect(evalWith('full-slide-angle', { mu: 1.6, fz: 4000, ca })).toBeCloseTo(
      toDeg(brushSlideAngle(ca, 1.6, 4000)),
      9
    )
    expect(evalWith('full-slide-angle', { mu: 1.6, fz: 4000, ca })).toBeCloseTo(11.83, 2)
  })

  it('relaxation lag matches relaxationLag, and Exercise 2.5', () => {
    expect(evalWith('relaxation-lag', { sigma: 0.5, speed: 40 })).toBeCloseTo(
      relaxationLag(0.5, 40).tau * 1000,
      9
    )
    expect(evalWith('relaxation-lag', { sigma: 0.5, speed: 40 })).toBeCloseTo(12.5, 6)
  })
})

describe('agreement with the vehicle models', () => {
  const car = EXERCISE_6_1
  const d = derive(car)

  it('understeer gradient matches summarise()', () => {
    const fromFormula = evalWith('understeer-gradient', {
      wf: d.wf,
      cf: car.cf,
      wr: d.wr,
      cr: car.cr
    })
    expect(fromFormula).toBeCloseTo(summarise(car).KDeg, 9)
  })

  it('stability factor matches stabilityFactor()', () => {
    for (const speed of [15, 30, 55]) {
      expect(
        evalWith('stability-factor', { K: summarise(car).K, speed, L: d.L })
      ).toBeCloseTo(stabilityFactor(car, speed), 9)
    }
  })

  it('yaw gain matches responseAtSpeed()', () => {
    for (const speed of [15, 30, 55]) {
      expect(evalWith('yaw-gain', { speed, L: d.L, K: summarise(car).K })).toBeCloseTo(
        responseAtSpeed(car, speed).yawGain,
        9
      )
    }
  })

  it('characteristic speed matches summarise()', () => {
    expect(evalWith('characteristic-speed', { K: summarise(car).K, L: d.L })).toBeCloseTo(
      summarise(car).characteristicSpeed!,
      6
    )
  })

  it('critical speed uses the same expression, and matches Exercise 6.5', () => {
    // K = -0.8 deg/g, L = 2.8 m gives 44.3 m/s
    expect(evalWith('characteristic-speed', { K: Math.abs(toRad(-0.8)), L: 2.8 })).toBeCloseTo(
      44.3,
      1
    )
  })

  it('neutral steer point matches summarise()', () => {
    expect(evalWith('neutral-steer-point', { cf: car.cf, cr: car.cr, L: d.L })).toBeCloseTo(
      summarise(car).neutralSteerPoint,
      9
    )
  })

  it('cornering equation matches the Ch 5 relation', () => {
    const K = summarise(car).KDeg
    const R = 60
    const ay = 0.7
    expect(evalWith('cornering-equation', { L: d.L, R, K, ay })).toBeCloseTo(
      toDeg(d.L / R) + K * ay,
      9
    )
  })

  it('yaw natural frequency matches modal()', () => {
    for (const speed of [20, 30, 45]) {
      const fromFormula = evalWith('yaw-natural-frequency', {
        cf: car.cf,
        cr: car.cr,
        L: d.L,
        m: car.mass,
        izz: car.izz,
        speed,
        K: summarise(car).K
      })
      expect(fromFormula).toBeCloseTo(modal(car, speed).omegaN, 6)
    }
  })

  it('lead time constant matches modal()', () => {
    for (const speed of [20, 45]) {
      expect(
        evalWith('lead-time-constant', {
          m: car.mass,
          a: car.a,
          speed,
          cr: car.cr,
          L: d.L
        })
      ).toBeCloseTo(modal(car, speed).tauR * 1000, 6)
    }
  })
})

describe('agreement with the load transfer model', () => {
  const car: BicycleVehicle = FORMULA_CAR
  const c = FORMULA_CHASSIS
  const d = derive(car)

  it('total lateral transfer matches totalLateralTransfer()', () => {
    for (const ay of [0.5, 1.5]) {
      expect(
        evalWith('lateral-load-transfer', {
          w: d.w,
          ay,
          h: c.cgHeight,
          t: (c.trackFront + c.trackRear) / 2
        })
      ).toBeCloseTo(totalLateralTransfer(car, c, ay), 6)
    }
  })

  it('and equals the three contributions summed, on a square-track car', () => {
    const square = { ...c, trackRear: c.trackFront }
    const t = lateralTransfer(car, square, 1.4)
    expect(
      evalWith('lateral-load-transfer', {
        w: d.w,
        ay: 1.4,
        h: square.cgHeight,
        t: square.trackFront
      })
    ).toBeCloseTo(t.front + t.rear, 6)
  })

  it('longitudinal transfer matches longitudinalTransfer()', () => {
    for (const ax of [-1.0, 0.5]) {
      expect(
        evalWith('longitudinal-load-transfer', { w: d.w, ax, h: c.cgHeight, L: d.L })
      ).toBeCloseTo(longitudinalTransfer(car, c, ax), 6)
    }
  })
})

// ---------------------------------------------------------------------------

describe('sweeping and sensitivity', () => {
  it('sweeps the requested variable and holds the rest', () => {
    const f = formulaById('cornering-equation')!
    const values = defaultValues(f)
    const pts = sweepFormula(f, values, 'ay', 10)
    // delta = L/R + K*Ay is linear in Ay, so the sweep must be a straight line.
    const slope = (pts[10].y - pts[0].y) / (pts[10].x - pts[0].x)
    expect(slope).toBeCloseTo(values.K, 9)
  })

  it('returns nothing for a variable the formula does not have', () => {
    const f = formulaById('cornering-equation')!
    expect(sweepFormula(f, defaultValues(f), 'nope')).toEqual([])
  })

  it('ranks sensitivity, largest effect first', () => {
    const f = formulaById('lateral-load-transfer')!
    const rows = localSensitivity(f, defaultValues(f))
    expect(rows).toHaveLength(f.vars.length)
    for (let i = 1; i < rows.length; i++) {
      expect(Math.abs(rows[i].delta)).toBeLessThanOrEqual(Math.abs(rows[i - 1].delta))
    }
  })

  it('signs sensitivity so direction is readable', () => {
    const f = formulaById('lateral-load-transfer')!
    const rows = localSensitivity(f, defaultValues(f))
    // Raising CG height raises transfer; widening the track lowers it.
    expect(rows.find((r) => r.key === 'h')!.delta).toBeGreaterThan(0)
    expect(rows.find((r) => r.key === 't')!.delta).toBeLessThan(0)
  })

  it('shows yaw gain peaking at the characteristic speed', () => {
    // The chart's whole reason for existing: sweep speed and the peak lands
    // exactly on V_char.
    const f = formulaById('yaw-gain')!
    const K = 0.0112
    const L = 2.6
    const values = { ...defaultValues(f), K, L }
    const pts = sweepFormula(f, values, 'speed', 400)
    const peak = pts.reduce((a, b) => (b.y > a.y ? b : a))
    expect(peak.x).toBeCloseTo(Math.sqrt((G * L) / K), 0)
  })
})

/**
 * Vehicle model tests, checked against the worked solutions in Ch 5 and Ch 6.
 *
 * The most valuable tests here are the cross-chapter consistency checks: the
 * Ch 6 step response settling to the Ch 5 steady-state gains, and the
 * closed-form modal parameters agreeing with the eigenvalues of A. Those are
 * the ones that catch a sign error, which Ch 4 warns is the most common failure
 * mode in the whole subject.
 */

import { describe, expect, it } from 'vitest'
import { G, toRad } from '../util/numeric.js'
import { EXERCISE_6_1, FORMULA_CAR, derive, type BicycleVehicle } from './params.js'
import {
  basicBudgetLine,
  constantRadiusSweep,
  nonlinearConstantRadiusSweep,
  responseAtSpeed,
  stabilityFactor,
  steerRequired,
  sumBudget,
  summarise,
  trimFromSteer
} from './steadyState.js'
import {
  frequencyResponse,
  modal,
  secondOrderOvershoot,
  secondOrderSettlingTime,
  stepSteer
} from './transient.js'
import { MagicFormulaTire, DEFAULT_MF } from '../tire/magicFormula.js'
import { scaleTire } from '../tire/scale.js'

/** An oversteering variant: soften the rear until K goes negative. */
const OVERSTEER: BicycleVehicle = { ...EXERCISE_6_1, cr: 55000 }
/** A neutral variant, tuned so Wf/Cf == Wr/Cr exactly. */
const NEUTRAL: BicycleVehicle = (() => {
  const v = { ...EXERCISE_6_1 }
  const { wf, wr } = derive(v)
  return { ...v, cr: (wr * v.cf) / wf }
})()

describe('Ch 5 - understeer gradient', () => {
  it('reproduces K = 0.01125 rad/g for the Exercise 6.1 car', () => {
    expect(summarise(EXERCISE_6_1).K).toBeCloseTo(0.01125, 4)
  })

  it('splits K into the Bundorf cornering compliances Df - Dr', () => {
    const s = summarise(EXERCISE_6_1)
    expect(s.Df - s.Dr).toBeCloseTo(s.K, 12)
    expect(s.Df).toBeCloseTo(0.06365, 4)
    expect(s.Dr).toBeCloseTo(0.05239, 4)
  })

  it('classifies balance by the sign of K', () => {
    expect(summarise(EXERCISE_6_1).balance).toBe('understeer')
    expect(summarise(OVERSTEER).balance).toBe('oversteer')
    expect(summarise(NEUTRAL).balance).toBe('neutral')
  })

  it('agrees with the understeer budget column sum (Ch 5 §4.1)', () => {
    const budget = sumBudget([basicBudgetLine(EXERCISE_6_1)])
    expect(budget.K).toBeCloseTo(summarise(EXERCISE_6_1).KDeg, 9)
  })

  it('gives the same sign as N_beta, since they are the same statement', () => {
    for (const v of [EXERCISE_6_1, OVERSTEER, FORMULA_CAR]) {
      const s = summarise(v)
      const nBeta = responseAtSpeed(v, 30).derivatives.nBeta
      expect(Math.sign(s.K)).toBe(Math.sign(nBeta))
    }
  })
})

describe('Ch 5 - significant speeds', () => {
  it('defines a characteristic speed only for an understeering car', () => {
    expect(summarise(EXERCISE_6_1).characteristicSpeed).toBeGreaterThan(0)
    expect(summarise(EXERCISE_6_1).criticalSpeed).toBeNull()
    expect(summarise(OVERSTEER).characteristicSpeed).toBeNull()
    expect(summarise(OVERSTEER).criticalSpeed).toBeGreaterThan(0)
    expect(summarise(NEUTRAL).characteristicSpeed).toBeNull()
    expect(summarise(NEUTRAL).criticalSpeed).toBeNull()
  })

  it('doubles the Ackermann steer angle at the characteristic speed', () => {
    const v = EXERCISE_6_1
    const vChar = summarise(v).characteristicSpeed!
    const radius = 100
    const ay = (vChar * vChar) / (G * radius)
    const { L } = derive(v)
    expect(steerRequired(v, radius, ay)).toBeCloseTo(2 * (L / radius), 6)
  })

  it('peaks yaw gain at the characteristic speed', () => {
    const v = EXERCISE_6_1
    const vChar = summarise(v).characteristicSpeed!
    const at = responseAtSpeed(v, vChar).yawGain
    expect(at).toBeGreaterThan(responseAtSpeed(v, vChar * 0.9).yawGain)
    expect(at).toBeGreaterThan(responseAtSpeed(v, vChar * 1.1).yawGain)
    // and equals half the neutral-steer value V/L
    expect(at).toBeCloseTo(vChar / derive(v).L / 2, 9)
  })

  it('zeroes the stability factor at the critical speed', () => {
    const vCrit = summarise(OVERSTEER).criticalSpeed!
    expect(stabilityFactor(OVERSTEER, vCrit)).toBeCloseTo(0, 9)
  })

  it('Exercise 6.5: K = -0.8 deg/g and L = 2.8 m gives V_crit = 44.3 m/s', () => {
    const K = toRad(-0.8)
    expect(Math.sqrt((G * 2.8) / -K)).toBeCloseTo(44.3, 1)
  })

  it('zeroes sideslip gain at the tangent speed', () => {
    const v = EXERCISE_6_1
    const vTan = summarise(v).tangentSpeed
    expect(responseAtSpeed(v, vTan).sideslipGain).toBeCloseTo(0, 9)
    // Below it the nose points out of the corner, above it into the corner.
    expect(responseAtSpeed(v, vTan * 0.5).sideslipGain).toBeGreaterThan(0)
    expect(responseAtSpeed(v, vTan * 1.5).sideslipGain).toBeLessThan(0)
  })
})

describe('Ch 5 - response gains', () => {
  const v = EXERCISE_6_1

  it('gives a neutral car a yaw gain of exactly V/L at every speed', () => {
    for (const speed of [10, 30, 60, 100]) {
      expect(responseAtSpeed(NEUTRAL, speed).yawGain).toBeCloseTo(
        speed / derive(NEUTRAL).L,
        9
      )
    }
  })

  it('shares one stability-factor denominator across all three gains', () => {
    const speed = 35
    const r = responseAtSpeed(v, speed)
    const { L } = derive(v)
    expect(r.yawGain).toBeCloseTo(speed / L / r.stabilityFactor, 9)
    expect(r.lateralAccelGain).toBeCloseTo((speed * speed) / (G * L) / r.stabilityFactor, 9)
    expect(r.curvatureGain).toBeCloseTo(1 / L / r.stabilityFactor, 9)
  })

  it('relates lateral acceleration to yaw rate by Ay = V*r', () => {
    const speed = 40
    const trim = trimFromSteer(v, speed, toRad(2))
    expect(trim.ay * G).toBeCloseTo(speed * trim.yawRate, 6)
  })

  it('round-trips trim through the steady-state cornering equation', () => {
    const trim = trimFromSteer(v, 35, toRad(3))
    expect(steerRequired(v, trim.radius, trim.ay)).toBeCloseTo(trim.steer, 9)
  })

  it('makes the constant-radius sweep slope equal the understeer gradient', () => {
    const sweep = constantRadiusSweep(v, 60, 0.9)
    const first = sweep[0]
    const last = sweep[sweep.length - 1]
    const slope = (last.steer - first.steer) / (last.ay - first.ay)
    expect(slope).toBeCloseTo(summarise(v).K, 9)
    // and the intercept is the Ackermann angle
    expect(first.steer).toBeCloseTo(derive(v).L / 60, 9)
  })
})

describe('Ch 5 - neutral steer point and static margin', () => {
  it('puts the NSP at mid-wheelbase when the axles are equally stiff', () => {
    const v: BicycleVehicle = { ...EXERCISE_6_1, cf: 90000, cr: 90000 }
    const { L } = derive(v)
    expect(summarise(v).neutralSteerPoint).toBeCloseTo(L / 2, 9)
  })

  it('gives positive static margin to an understeering car', () => {
    expect(summarise(EXERCISE_6_1).staticMargin).toBeGreaterThan(0)
    expect(summarise(OVERSTEER).staticMargin).toBeLessThan(0)
    expect(summarise(NEUTRAL).staticMargin).toBeCloseTo(0, 9)
  })
})

describe('Ch 6 - modal parameters', () => {
  it('agrees with the eigenvalues of the state matrix', () => {
    for (const speed of [10, 20, 30, 45, 60]) {
      const m = modal(EXERCISE_6_1, speed)
      const [e1] = m.eigenvalues
      // For a complex pair, omega_n = |lambda| and zeta = -Re(lambda)/|lambda|.
      const mag = Math.hypot(e1.re, e1.im)
      expect(m.omegaN).toBeCloseTo(mag, 6)
      expect(m.zeta).toBeCloseTo(-e1.re / mag, 6)
    }
  })

  it('gives omega_n = 7.35 rad/s and zeta = 0.85 at 30 m/s (Exercise 6.1)', () => {
    const m = modal(EXERCISE_6_1, 30)
    expect(m.omegaN).toBeCloseTo(7.35, 1)
    expect(m.frequencyHz).toBeCloseTo(1.17, 1)
    expect(m.zeta).toBeCloseTo(0.854, 2)
  })

  it('falls in natural frequency as speed rises (Exercise 6.2)', () => {
    const slow = modal(EXERCISE_6_1, 30)
    const fast = modal(EXERCISE_6_1, 60)
    expect(fast.omegaN).toBeLessThan(slow.omegaN)
    expect(fast.zeta).toBeLessThan(slow.zeta)
  })

  it('grows the numerator lead time constant with speed (Exercise 6.3)', () => {
    expect(modal(EXERCISE_6_1, 60).tauR).toBeCloseTo(2 * modal(EXERCISE_6_1, 30).tauR, 9)
  })

  it('drives omega_n to zero at the critical speed (Exercise 6.5)', () => {
    const vCrit = summarise(OVERSTEER).criticalSpeed!
    expect(modal(OVERSTEER, vCrit).omegaN).toBeCloseTo(0, 6)
    // and the car is unstable just above it
    expect(modal(OVERSTEER, vCrit * 1.05).stable).toBe(false)
    expect(modal(OVERSTEER, vCrit * 0.95).stable).toBe(true)
  })

  it('Exercise 6.6: 20% less yaw inertia raises omega_n by 1/sqrt(0.8)', () => {
    const base = modal(EXERCISE_6_1, 30)
    const lighter = modal({ ...EXERCISE_6_1, izz: EXERCISE_6_1.izz * 0.8 }, 30)
    expect(lighter.omegaN / base.omegaN).toBeCloseTo(1 / Math.sqrt(0.8), 6)
    expect(lighter.zeta).toBeGreaterThan(base.zeta)
  })
})

describe('Ch 6 - second-order vocabulary', () => {
  it('Exercise 6.4: omega_n = 1.2 Hz and zeta = 0.55 give 12.6% overshoot', () => {
    expect(secondOrderOvershoot(0.55)).toBeCloseTo(0.126, 3)
  })

  it('Exercise 6.4: 5% settling time of 0.72 s', () => {
    expect(secondOrderSettlingTime(2 * Math.PI * 1.2, 0.55)).toBeCloseTo(0.723, 2)
  })

  it('gives no overshoot at or above critical damping', () => {
    expect(secondOrderOvershoot(1)).toBe(0)
    expect(secondOrderOvershoot(1.5)).toBe(0)
  })
})

describe('Ch 6 - step steer response', () => {
  const v = EXERCISE_6_1
  const speed = 30
  const steer = toRad(2)

  it('settles to the Ch 5 steady-state gains', () => {
    const step = stepSteer(v, speed, steer, 6, 0.0005)
    const r = responseAtSpeed(v, speed)
    expect(step.yawSteady).toBeCloseTo(r.yawGain * steer, 6)
    expect(step.aySteady).toBeCloseTo(r.lateralAccelGain * steer, 6)
    const last = step.samples[step.samples.length - 1]
    expect(last.beta).toBeCloseTo(r.sideslipGain * steer, 6)
  })

  it('responds in the right direction', () => {
    const step = stepSteer(v, speed, steer)
    expect(step.yawSteady).toBeGreaterThan(0)
    expect(step.aySteady).toBeGreaterThan(0)
  })

  it('lags lateral acceleration behind yaw rate - the car "taking a set"', () => {
    const step = stepSteer(v, speed, steer, 4, 0.0005)
    expect(step.metrics.ayLagBehindYaw).toBeGreaterThan(0)
    expect(step.metrics.ayResponseTime90).toBeGreaterThan(step.metrics.yawResponseTime90)
  })

  it('produces response times in the range Ch 6 §5 quotes for a race car', () => {
    const step = stepSteer(FORMULA_CAR, 45, toRad(2), 4, 0.0005)
    expect(step.metrics.yawResponseTime90).toBeGreaterThan(0.03)
    expect(step.metrics.yawResponseTime90).toBeLessThan(0.5)
  })

  it('diverges above the critical speed of an oversteering car', () => {
    const vCrit = summarise(OVERSTEER).criticalSpeed!
    const step = stepSteer(OVERSTEER, vCrit * 1.2, toRad(1), 4, 0.0005)
    const last = step.samples[step.samples.length - 1]
    expect(Math.abs(last.yawRate)).toBeGreaterThan(10)
  })
})

describe('Ch 6 - frequency response', () => {
  it('matches the steady-state gains at low frequency', () => {
    const v = EXERCISE_6_1
    const speed = 30
    const bode = frequencyResponse(v, speed, 0.0005, 10, 60)
    const r = responseAtSpeed(v, speed)
    expect(bode[0].yawMag).toBeCloseTo(r.yawGain, 3)
    expect(bode[0].ayMag).toBeCloseTo(r.lateralAccelGain, 3)
    expect(bode[0].yawPhase).toBeCloseTo(0, 1)
  })

  it('rolls off and lags at high frequency', () => {
    const bode = frequencyResponse(EXERCISE_6_1, 30, 0.05, 20, 100)
    const last = bode[bode.length - 1]
    expect(last.yawMag).toBeLessThan(bode[0].yawMag)
    expect(last.yawPhase).toBeLessThan(-45)
  })
})

describe('Ch 5 closing section - K is not a constant', () => {
  const tire = new MagicFormulaTire(DEFAULT_MF)
  // A staggered set: 30% larger rear, as a rear-heavy car actually runs.
  const rearTire = new MagicFormulaTire(scaleTire(DEFAULT_MF, 1.3))

  it('moves the local understeer gradient away from its linear value at the limit', () => {
    const sweep = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 40)
    const early = sweep[3].localK
    const late = sweep[sweep.length - 2].localK
    // Linear theory holds K constant; the real car's gradient must not.
    expect(Math.abs(late - early)).toBeGreaterThan(1e-3)
  })

  it('understeers at the limit when the rear tires are larger', () => {
    // Ch 5 §4: a rear-heavy car with correspondingly larger rear tires can be
    // neutral or understeering. FORMULA_CAR is rear-heavy (a > b).
    const { wf, wr } = derive(FORMULA_CAR)
    expect(wr).toBeGreaterThan(wf)
    const staggered = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 40)
    const square = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, tire, 60, 40)
    const last = (a: typeof staggered): number => a[a.length - 2].localK
    // Larger rear tires shift the limit gradient toward understeer.
    expect(last(staggered)).toBeGreaterThan(last(square))
  })

  it('starts near the linear-theory gradient at low lateral acceleration', () => {
    // Build a linear vehicle whose axle stiffnesses match the tire's, so the
    // nonlinear sweep and the Ch 5 closed form must agree at small Ay.
    const base = FORMULA_CAR
    const { wf, wr } = derive(base)
    const v: BicycleVehicle = {
      ...base,
      cf: 2 * tire.corneringStiffness(wf / 2),
      cr: 2 * tire.corneringStiffness(wr / 2)
    }
    const sweep = nonlinearConstantRadiusSweep(v, tire, tire, 60, 60)
    expect(sweep[2].localK).toBeCloseTo(summarise(v).K, 2)
  })

  it('reaches a finite limit lateral acceleration', () => {
    const sweep = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 40)
    const maxAy = sweep[sweep.length - 1].ay
    expect(maxAy).toBeGreaterThan(1.0)
    expect(maxAy).toBeLessThan(2.5)
  })

  it('keeps every solved slip angle on the RISING branch of the tire curve', () => {
    // The Fy-alpha curve is non-monotonic. A solver that searched past the peak
    // would return slip angles on the falling branch -- states the car cannot
    // actually hold -- and the local gradient would spike.
    const sweep = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 60)
    const { wf, wr } = derive(FORMULA_CAR)
    const peakF = tire.peakFy(wf / 2).at
    const peakR = rearTire.peakFy(wr / 2).at
    for (const p of sweep) {
      expect(p.alphaF).toBeLessThanOrEqual(peakF + 1e-9)
      expect(p.alphaR).toBeLessThanOrEqual(peakR + 1e-9)
    }
  })

  it('raises both slip angles monotonically with lateral acceleration', () => {
    const sweep = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 60)
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i].alphaF).toBeGreaterThanOrEqual(sweep[i - 1].alphaF - 1e-9)
      expect(sweep[i].alphaR).toBeGreaterThanOrEqual(sweep[i - 1].alphaR - 1e-9)
    }
  })

  it('raises the local gradient monotonically, with no spike-and-drop', () => {
    // The original defect searched for slip angles past the peak of the tire
    // curve, which produced a gradient that spiked and then fell back. The
    // true gradient only ever climbs: as an axle saturates, d(delta)/d(Ay)
    // grows without bound. Monotonicity is therefore the sharp test.
    const sweep = nonlinearConstantRadiusSweep(FORMULA_CAR, tire, rearTire, 60, 60)
    const ks = sweep.map((p) => p.localK)
    for (let i = 1; i < ks.length; i++) {
      expect(ks[i]).toBeGreaterThanOrEqual(ks[i - 1] - 1e-9)
    }
    // and it really does diverge at the limit
    expect(ks[ks.length - 1]).toBeGreaterThan(5 * ks[0])
  })
})

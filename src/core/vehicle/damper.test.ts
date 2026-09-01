/**
 * Dampers -- Ch 22.
 *
 * The chapter is unusual in this course for saying openly that its own theory
 * does not determine the answer. So the tests pin what theory DOES fix -- the
 * modal arithmetic, the installation-ratio conversions, the transient balance
 * mechanism, and the load-variation penalty -- and stop there.
 */

import { describe, expect, it } from 'vitest'
import {
  LINEAR_DAMPER,
  OVER_REBOUND_DAMPER,
  RACE_DAMPER,
  axleRollDamping,
  bodyFrequency,
  criticalDamping,
  curveShape,
  damperForce,
  damperFromWheelRate,
  damperVelocity,
  dampingRatio,
  describeZeta,
  forceVelocityCurve,
  jackingRisk,
  loadVariationLoss,
  loadVariationLossClosedForm,
  modeSeparation,
  readDyno,
  reboundRatio,
  transientTlltd,
  wheelDampingForZeta,
  wheelFromDamperRate,
  wheelHopFrequency,
  wheelVelocityFromDamper
} from './damper.js'
import { rideRate } from './rates.js'

describe('Ch 22 Exercise 22.1 -- the modal baseline', () => {
  const kr = rideRate(65, 300) * 1000 // N/m

  it('gets a 53.42 N/mm ride rate', () => {
    expect(kr / 1000).toBeCloseTo(53.42, 2)
  })

  it('gets 2.91 Hz', () => {
    expect(bodyFrequency(kr, 160)).toBeCloseTo(2.91, 2)
  })

  it('gets 5847 N.s/m of critical damping at the wheel', () => {
    expect(criticalDamping(kr, 160)).toBeCloseTo(5847, 0)
  })
})

describe('Ch 22 Exercise 22.2 -- and what the damper has to be', () => {
  const kr = rideRate(65, 300) * 1000

  it('needs 4093 N.s/m at the wheel for zeta = 0.7', () => {
    expect(wheelDampingForZeta(0.7, kr, 160)).toBeCloseTo(4093, 0)
  })

  it('needs 11,369 N.s/m at the damper through IR = 0.6', () => {
    expect(damperFromWheelRate(wheelDampingForZeta(0.7, kr, 160), 0.6)).toBeCloseTo(11370, -1)
  })

  it('is 568 N at 50 mm/s of damper velocity, which is a plausible race number', () => {
    const cd = damperFromWheelRate(wheelDampingForZeta(0.7, kr, 160), 0.6)
    expect(cd * 0.05).toBeCloseTo(568, 0)
  })

  it('amplifies by 1/IR^2, which is the argument against low installation ratios', () => {
    // A low ratio demands a much stiffer damper AND makes it work at low
    // velocities, where valving is hardest to control precisely.
    const need = wheelDampingForZeta(0.7, kr, 160)
    expect(damperFromWheelRate(need, 0.4) / damperFromWheelRate(need, 0.8)).toBeCloseTo(4, 9)
  })

  it('round-trips zeta through the damping ratio', () => {
    expect(dampingRatio(wheelDampingForZeta(0.65, kr, 160), kr, 160)).toBeCloseTo(0.65, 12)
  })

  it('describes the race compromise band the chapter names', () => {
    expect(describeZeta(0.7)).toMatch(/race compromise/)
    expect(describeZeta(0.2)).toMatch(/wallow/)
    expect(describeZeta(1.4)).toMatch(/rides on its tyres/)
  })
})

describe('Ch 22 Exercise 22.3 -- the two modes, and why they can be tuned apart', () => {
  it('puts wheel hop at 15.6 Hz', () => {
    expect(wheelHopFrequency(300000, 65000, 38)).toBeCloseTo(15.6, 1)
  })

  it('separates the modes 5.4 to 1', () => {
    const kr = rideRate(65, 300) * 1000
    const m = modeSeparation(kr, 160, 300000, 65000, 38)
    expect(m.bodyHz).toBeCloseTo(2.91, 2)
    expect(m.hopHz).toBeCloseTo(15.6, 1)
    expect(m.ratio).toBeCloseTo(5.4, 1)
    expect(m.separable).toBe(true)
  })

  it('closes the gap on a stiff aero car, which is why its dampers are harder', () => {
    // The exercise's own follow-up: a 6 Hz body frequency against the same
    // wheel gives a ratio near 2.6, and the modes begin to interact.
    const stiff = modeSeparation(160 * (2 * Math.PI * 6) ** 2, 160, 300000, 250000, 38)
    expect(stiff.bodyHz).toBeCloseTo(6, 1)
    expect(stiff.ratio).toBeLessThan(3.5)
    expect(stiff.separable).toBe(false)
  })

  it('adds the tyre and suspension rates in hop, rather than putting them in series', () => {
    // In wheel hop both springs push on the unsprung mass, so the rates add.
    // Using the series ride rate here would understate the frequency badly.
    const added = wheelHopFrequency(300000, 65000, 38)
    const wrong = wheelHopFrequency(rideRate(65, 300) * 1000, 0, 38)
    expect(added).toBeGreaterThan(wrong * 2)
  })
})

describe('Ch 22 Exercise 22.4 -- a dyno sheet means nothing without the ratio', () => {
  const p = readDyno(900, 0.05, 0.62)

  it('gets 558 N at 80.6 mm/s of wheel velocity', () => {
    expect(p.wheelForce).toBeCloseTo(558, 0)
    expect(p.wheelVelocity * 1000).toBeCloseTo(80.6, 1)
  })

  it('gives 6919 N.s/m wheel-referred', () => {
    // The notes say 6923, having divided 558 N by their own rounded 80.6 mm/s.
    // 6919.2 is the exact answer, and it is also what the squared relation
    // gives -- the two routes agree only on the unrounded number.
    expect(p.wheelDamping).toBeCloseTo(6919.2, 1)
  })

  it('agrees with the squared relation', () => {
    // c_damper = 900/0.05 = 18,000; times IR^2 = 6919. The two routes must
    // agree, and they do to rounding.
    expect(wheelFromDamperRate(900 / 0.05, 0.62)).toBeCloseTo(p.wheelDamping, 6)
  })

  it('lands the same damper somewhere else entirely on a different car', () => {
    // The exercise's practical point: IR = 0.85 turns "900 N at 50 mm/s" into
    // 765 N at 58.8 mm/s, a completely different operating point.
    const other = readDyno(900, 0.05, 0.85)
    expect(other.wheelForce).toBeCloseTo(765, 0)
    expect(other.wheelVelocity * 1000).toBeCloseTo(58.8, 1)
  })

  it('transforms rate as the square and velocity linearly', () => {
    expect(wheelFromDamperRate(10000, 0.5)).toBeCloseTo(2500, 9)
    expect(damperVelocity(0.1, 0.5)).toBeCloseTo(0.05, 12)
    expect(wheelVelocityFromDamper(0.05, 0.5)).toBeCloseTo(0.1, 12)
  })
})

describe('Ch 22 Exercise 22.5 -- dampers move balance only while the car is moving', () => {
  const t = transientTlltd({
    rollStiffnessFront: 45000,
    rollStiffnessRear: 38000,
    rollDampingFront: 3500,
    rollDampingRear: 1800,
    rollAngle: 1.6,
    rollTime: 0.3
  })

  it('gets 54.2% front at steady state', () => {
    expect(t.steadyState).toBeCloseTo(0.542, 3)
  })

  it('gets 57.7% front during the transient', () => {
    expect(t.rollVelocity).toBeCloseTo(0.0931, 4)
    // The notes round the mid-transient roll angle to 0.01396 rad; exact is
    // 0.8/57.2958, which moves the moments by under a newton-metre.
    expect(t.frontMoment).toBeCloseTo(954, 0)
    expect(t.rearMoment).toBeCloseTo(698, 0)
    expect(t.transient).toBeCloseTo(0.577, 3)
  })

  it('moves the balance 3.5 points forward, and only on turn-in', () => {
    expect(t.shift * 100).toBeCloseTo(3.5, 1)
  })

  it('collapses to the steady-state value when the dampers are removed', () => {
    // The claim that makes dampers a transient-only tool: at zero velocity
    // they make no force, so they cannot move steady-state balance at all.
    const none = transientTlltd({
      rollStiffnessFront: 45000,
      rollStiffnessRear: 38000,
      rollDampingFront: 0,
      rollDampingRear: 0,
      rollAngle: 1.6,
      rollTime: 0.3
    })
    expect(none.transient).toBeCloseTo(none.steadyState, 12)
    expect(none.shift).toBeCloseTo(0, 12)
  })

  it('scales with roll velocity, so the driver changes it without touching the car', () => {
    // Larger for aggressive turn-in, smaller in a long sweeper. A driver who
    // changes their entry style changes the car's transient balance.
    const quick = transientTlltd({
      rollStiffnessFront: 45000,
      rollStiffnessRear: 38000,
      rollDampingFront: 3500,
      rollDampingRear: 1800,
      rollAngle: 1.6,
      rollTime: 0.12
    })
    expect(quick.shift).toBeGreaterThan(t.shift)
  })

  it('reverses when the rear is damped harder than the front', () => {
    const rearBiased = transientTlltd({
      rollStiffnessFront: 45000,
      rollStiffnessRear: 38000,
      rollDampingFront: 1800,
      rollDampingRear: 5200,
      rollAngle: 1.6,
      rollTime: 0.3
    })
    expect(rearBiased.shift).toBeLessThan(0)
  })

  it('refers a wheel damper to a roll rate the same way a spring is referred', () => {
    expect(axleRollDamping(4000, 1.6)).toBeCloseTo((4000 * 1.6 * 1.6) / 2, 9)
  })
})

describe('Ch 22 Exercise 22.7 -- why load variation is the objective function', () => {
  const r = loadVariationLoss(1.7, 6e-5, 3000, 1000)

  it('gets 4560 N steady and 4500 N mean when oscillating', () => {
    expect(r.steadyForce).toBeCloseTo(4560, 6)
    expect(r.meanOscillatingForce).toBeCloseTo(4500, 6)
  })

  it('loses 60 N, or 1.32%', () => {
    expect(r.loss).toBeCloseTo(60, 6)
    expect(r.lossFraction).toBeCloseTo(0.0132, 4)
  })

  it('loses exactly b times the amplitude squared', () => {
    // The same quadratic relation as lateral load transfer in Ch 2 Ex 2.6,
    // applied in time rather than across a track.
    expect(r.loss).toBeCloseTo(loadVariationLossClosedForm(6e-5, 1000), 9)
  })

  it('punishes large excursions disproportionately', () => {
    // Quadratic, so suppressing the worst of the variation matters far more
    // than trimming the rest.
    const small = loadVariationLoss(1.7, 6e-5, 3000, 500)
    expect(r.loss / small.loss).toBeCloseTo(4, 9)
  })

  it('costs several percent at realistic wheel-hop excursions', () => {
    // The exercise notes that real excursions on a bumpy circuit approach
    // +/-60-80% of static load momentarily, where the loss becomes 5-8%.
    const severe = loadVariationLoss(1.7, 6e-5, 3000, 2100)
    expect(severe.lossFraction).toBeGreaterThan(0.05)
  })

  it('vanishes for a linear tyre, which is the whole point', () => {
    // The penalty exists ONLY because Fy(Fz) is concave. With b = 0 the mean
    // of the forces equals the force at the mean and nothing is lost.
    expect(loadVariationLoss(1.7, 0, 3000, 1000).loss).toBeCloseTo(0, 12)
  })
})

describe('the force-velocity curve -- Ch 22 §3.4', () => {
  it('is digressive when the high-speed slope is shallower than the low', () => {
    expect(curveShape(RACE_DAMPER)).toBe('digressive')
    expect(curveShape(LINEAR_DAMPER)).toBe('linear')
    expect(
      curveShape({ ...LINEAR_DAMPER, highSpeedBump: LINEAR_DAMPER.lowSpeedBump * 1.6 })
    ).toBe('progressive')
  })

  it('runs more rebound than bump, in the 2:1 to 4:1 band the chapter names', () => {
    const r = reboundRatio(RACE_DAMPER)
    expect(r).toBeGreaterThan(1.8)
    expect(r).toBeLessThan(4.5)
  })

  it('is continuous through the knee', () => {
    const knee = RACE_DAMPER.kneeVelocity
    const below = damperForce(RACE_DAMPER, knee - 1e-9)
    const above = damperForce(RACE_DAMPER, knee + 1e-9)
    // Relative, not absolute: the two slopes differ, so probing either side of
    // the knee necessarily separates them by (slope difference) times the
    // probe offset. Here that is parts in ten billion.
    expect(Math.abs(above - below) / below).toBeLessThan(1e-7)
  })

  it('flattens above the knee, so a kerb does not spike the contact patch', () => {
    const slopeLow =
      damperForce(RACE_DAMPER, 0.04) / 0.04
    const slopeHigh =
      (damperForce(RACE_DAMPER, 0.3) - damperForce(RACE_DAMPER, 0.2)) / 0.1
    expect(slopeHigh).toBeLessThan(slopeLow)
  })

  it('caps at the blow-off, inside the velocity range a wheel actually sees', () => {
    // The cap has to engage where kerbs happen, not at some velocity no wheel
    // reaches. This one comes in at about 0.41 m/s.
    const engaged = damperForce(RACE_DAMPER, 0.45)
    expect(engaged).toBeCloseTo(RACE_DAMPER.blowOffForce!, 6)
    expect(damperForce({ ...RACE_DAMPER, blowOffForce: 0 }, 0.45)).toBeGreaterThan(engaged)
    // And it must NOT be engaged in the body-control region, or it would
    // flatten the low-speed damping the body needs.
    expect(damperForce(RACE_DAMPER, 0.05)).toBeLessThan(RACE_DAMPER.blowOffForce!)
  })

  it('is odd through the origin apart from the bump/rebound asymmetry', () => {
    expect(damperForce(RACE_DAMPER, 0)).toBe(0)
    expect(damperForce(RACE_DAMPER, -0.05)).toBeLessThan(0)
    expect(damperForce(RACE_DAMPER, 0.05)).toBeGreaterThan(0)
  })

  it('plots a curve that spans both directions', () => {
    const curve = forceVelocityCurve(RACE_DAMPER)
    expect(curve[0].velocity).toBeLessThan(0)
    expect(curve[curve.length - 1].velocity).toBeGreaterThan(0)
    expect(curve.every((p) => Number.isFinite(p.force))).toBe(true)
  })
})

describe('Ch 22 Exercise 22.6 -- jacking down', () => {
  const kr = rideRate(65, 300) * 1000

  it('flags a car whose rebound cannot re-extend between bumps', () => {
    const risk = jackingRisk(OVER_REBOUND_DAMPER.lowSpeedRebound, kr, 3)
    expect(risk.timeConstant).toBeGreaterThan(risk.bumpInterval)
    expect(risk.atRisk).toBe(true)
  })

  it('clears a sensibly damped car at the same bump frequency', () => {
    expect(jackingRisk(RACE_DAMPER.lowSpeedRebound, kr, 3).atRisk).toBe(false)
  })

  it('gets worse as the bumps come faster', () => {
    const slow = jackingRisk(RACE_DAMPER.lowSpeedRebound, kr, 1)
    const fast = jackingRisk(RACE_DAMPER.lowSpeedRebound, kr, 10)
    expect(fast.ratio).toBeGreaterThan(slow.ratio)
    expect(fast.atRisk).toBe(true)
  })

  it('is relieved by a stiffer ride rate as well as by less rebound', () => {
    // Both halves of c_rebound/K_R matter, which is why heave springs help:
    // they raise K_R without demanding proportionally more damping.
    const soft = jackingRisk(9000, kr, 4)
    const stiff = jackingRisk(9000, kr * 3, 4)
    expect(stiff.ratio).toBeLessThan(soft.ratio)
  })
})

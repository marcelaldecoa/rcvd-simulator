/**
 * Steering systems -- Ch 19.
 *
 * Every exercise in the chapter quotes a number, and the two that matter most
 * -- 19.2/19.3 on feedback quality and 19.4 on compliance -- are the ones that
 * connect this chapter to the rest of the course, so they get the most tests.
 */

import { describe, expect, it } from 'vitest'
import {
  FORMULA_STEERING,
  ROAD_STEERING,
  ackermannInnerAngle,
  ackermannPercent,
  ackermannSweep,
  aligningComplianceCoefficient,
  bumpSteerToe,
  casterForTrail,
  feedbackQuality,
  handwheelTorque,
  innerAngleAtAckermann,
  lostSteerFromCompliance,
  mechanicalTrail,
  rideHeightChange,
  splitFrictionPull,
  steeringTorque
} from './steering.js'

describe('Ch 19 Exercise 19.1 -- Ackermann geometry', () => {
  it('gives 6.39 deg inside for 6.0 deg outside', () => {
    expect(ackermannInnerAngle(6, 1.6, 2.75)).toBeCloseTo(6.39, 2)
  })

  it('grows to a 4.8 deg difference at 20 deg of outside steer', () => {
    // The chapter's point: Ackermann matters in hairpins and parking and is
    // nearly irrelevant in fast corners.
    expect(ackermannInnerAngle(20, 1.6, 2.75) - 20).toBeCloseTo(4.8, 1)
  })

  it('is only 0.39 deg at racing steer angles', () => {
    expect(ackermannInnerAngle(6, 1.6, 2.75) - 6).toBeCloseTo(0.39, 2)
  })

  it('round-trips through the percentage', () => {
    for (const pct of [-40, 0, 50, 100, 130]) {
      const inner = innerAngleAtAckermann(8, pct, 1.6, 2.75)
      expect(ackermannPercent(8, inner, 1.6, 2.75)).toBeCloseTo(pct, 6)
    }
  })

  it('calls parallel steer 0% and anti-Ackermann negative', () => {
    expect(ackermannPercent(8, 8, 1.6, 2.75)).toBeCloseTo(0, 9)
    expect(ackermannPercent(8, 7.5, 1.6, 2.75)).toBeLessThan(0)
  })

  it('steers the OUTSIDE wheel more under anti-Ackermann -- Ex 19.6', () => {
    // Which is what a high-downforce car wants: the heavily loaded outside
    // tyre peaks at a larger slip angle than the nearly unloaded inside one,
    // so giving the inside wheel extra steer is exactly backwards.
    const sweep = ackermannSweep(-15, 1.6, 2.75)
    const at10 = sweep.find((p) => Math.abs(p.outer - 10.2) < 0.4)!
    expect(at10.difference).toBeLessThan(0)
    expect(at10.actual).toBeLessThan(at10.outer)
  })
})

describe('Ch 19 Exercises 19.2 and 19.3 -- does the driver get told?', () => {
  const moderate = feedbackQuality({
    rollingRadius: 0.33,
    casterDeg: 6,
    pneumaticTrailLinear: 0.028,
    pneumaticTrailAtPeak: 0.006
  })
  const heavy = feedbackQuality({
    rollingRadius: 0.33,
    casterDeg: 12,
    pneumaticTrailLinear: 0.028,
    pneumaticTrailAtPeak: 0.006
  })

  it('gets 34.7 mm of mechanical trail at 6 deg of caster', () => {
    expect(mechanicalTrail(0.33, 6)).toBeCloseTo(0.0347, 4)
  })

  it('gets 70.1 mm at 12 deg', () => {
    // The notes say 70.2 mm, having rounded tan(12 deg) to 0.2126. The
    // difference is six hundredths of a millimetre.
    expect(mechanicalTrail(0.33, 12)).toBeCloseTo(0.0701, 4)
  })

  it('loses 35% of total trail to the peak at 6 deg, but only 22% at 12 deg', () => {
    expect(moderate.trailRetained).toBeCloseTo(0.649, 3)
    expect(heavy.trailRetained).toBeCloseTo(0.776, 3)
  })

  it('reproduces the torque comparison: +18% at 6 deg, +41% at 12 deg', () => {
    expect(moderate.torqueRise).toBeCloseTo(0.18, 2)
    expect(heavy.torqueRise).toBeCloseTo(0.41, 2)
  })

  it('shows torque rising far less than force, which IS the cue', () => {
    // Force rises 82% over the same range. The driver feels the steering "go
    // light relative to the cornering" -- usable, but not emphatic.
    expect(moderate.forceRise).toBeCloseTo(0.82, 2)
    expect(moderate.torqueRise).toBeLessThan(moderate.forceRise)
  })

  it('buries the cue as caster grows -- the chapter design trade, quantified', () => {
    // Doubling caster roughly doubles the camber benefit AND roughly halves
    // the visibility of the front-limit warning. There is no universal answer,
    // but the direction is not in doubt.
    expect(heavy.signalClarity).toBeLessThan(moderate.signalClarity * 0.7)
    expect(heavy.mechanicalTrail / moderate.mechanicalTrail).toBeGreaterThan(1.9)
  })

  it('reaches full clarity with no caster at all', () => {
    const none = feedbackQuality({
      rollingRadius: 0.33,
      casterDeg: 0,
      pneumaticTrailLinear: 0.028,
      pneumaticTrailAtPeak: 0.006
    })
    expect(none.signalClarity).toBeCloseTo(1, 9)
  })

  it('inverts caster from a wanted trail', () => {
    expect(casterForTrail(0.33, mechanicalTrail(0.33, 7.5))).toBeCloseTo(7.5, 9)
  })

  it('divides torque down by the steering ratio', () => {
    expect(handwheelTorque(steeringTorque(6800, 0.045), 11)).toBeCloseTo(306 / 11, 6)
  })
})

describe('Ch 19 Exercise 19.4 -- steer lost to compliance', () => {
  const lost = lostSteerFromCompliance({
    axleLateralForce: 6800,
    totalTrail: 0.045,
    degPer100Nm: 0.9,
    ratio: 11,
    ay: 1.4
  })

  it('gets 306 N.m of aligning moment', () => {
    expect(lost.moment).toBeCloseTo(306, 0)
  })

  it('loses 2.75 deg at the handwheel and 0.25 deg at the road wheel', () => {
    expect(lost.handwheelLost).toBeCloseTo(2.75, 2)
    expect(lost.roadWheelLost).toBeCloseTo(0.25, 2)
  })

  it('inflates a measured understeer gradient by 0.18 deg/g', () => {
    expect(lost.apparentUndersteer).toBeCloseTo(0.18, 2)
  })

  it('grows with lateral acceleration, so it corrupts the SHAPE of K(Ay)', () => {
    // Not a constant offset -- which is why it is worse than it looks. A car
    // measured this way appears to develop terminal understeer it does not have.
    const half = lostSteerFromCompliance({
      axleLateralForce: 3400,
      totalTrail: 0.045,
      degPer100Nm: 0.9,
      ratio: 11,
      ay: 0.7
    })
    expect(half.roadWheelLost).toBeCloseTo(lost.roadWheelLost / 2, 6)
    // The apparent gradient is the same only because force is linear in Ay
    // here; the real nonlinearity comes from trail, which Ch 23 handles.
    expect(half.apparentUndersteer).toBeCloseTo(lost.apparentUndersteer, 6)
  })

  it('hands the understeer budget its coefficient in the units it wants', () => {
    // The bridge into Ch 5 §4.1: deg per kN.m of aligning torque.
    const c = aligningComplianceCoefficient(0.9, 11)
    expect(c).toBeCloseTo(0.818, 3)
    // And it must reproduce the exercise when applied to the same moment.
    expect(c * (306 / 1000)).toBeCloseTo(lost.roadWheelLost, 6)
  })

  it('is far smaller on a stiff race system than a road one', () => {
    const race = aligningComplianceCoefficient(FORMULA_STEERING.compliancePer100Nm, FORMULA_STEERING.ratio)
    const road = aligningComplianceCoefficient(ROAD_STEERING.compliancePer100Nm, ROAD_STEERING.ratio)
    expect(race).toBeLessThan(road)
  })
})

describe('Ch 19 Exercise 19.5 -- bump steer becomes a speed-dependent alignment', () => {
  it('gets 0.108 deg per wheel and 0.216 deg total from 18 mm', () => {
    const t = bumpSteerToe(18, 0.06)
    expect(t.perWheel).toBeCloseTo(0.108, 3)
    expect(t.total).toBeCloseTo(0.216, 3)
  })

  it('is negligible at the modern race target of 0.02 deg/10 mm', () => {
    expect(bumpSteerToe(18, 0.02).total).toBeLessThan(0.08)
  })

  it('turns downforce into ride height into toe', () => {
    // The mechanism that makes this a continuous alignment change rather than
    // an occasional one: the suspension sits somewhere different at every speed.
    const drop = rideHeightChange(3.0, 1.225, 40, 80, 120)
    expect(drop).toBeGreaterThan(0)
    const toe = bumpSteerToe(drop, 0.06)
    expect(toe.total).toBeGreaterThan(0)
    // Faster still, and it grows as V^2.
    expect(rideHeightChange(3.0, 1.225, 40, 120, 120) / drop).toBeGreaterThan(2)
  })
})

describe('Ch 19 Exercise 19.7 -- split-friction braking through the scrub radius', () => {
  const pull = splitFrictionPull(4200, 1400, 0.025, 11)

  it('gets 105 and 35 N.m, netting 70 N.m at the road wheels', () => {
    expect(pull.momentHigh).toBeCloseTo(105, 6)
    expect(pull.momentLow).toBeCloseTo(35, 6)
    expect(pull.net).toBeCloseTo(70, 6)
  })

  it('is 6.4 N.m at the steering wheel -- a real effort to hold', () => {
    expect(pull.atHandwheel).toBeCloseTo(6.36, 2)
  })

  it('falls to 28 N.m if the scrub radius is cut to 10 mm', () => {
    expect(splitFrictionPull(4200, 1400, 0.01, 11).net).toBeCloseTo(28, 6)
  })

  it('reverses with negative scrub radius, which is the road car fix', () => {
    // Negative scrub makes the geometry steer back toward straight on its own.
    // Race cars decline it because it also removes the lockup cue.
    const road = splitFrictionPull(4200, 1400, ROAD_STEERING.scrubRadius, ROAD_STEERING.ratio)
    expect(road.net).toBeLessThan(0)
    expect(Math.sign(road.net)).toBe(-Math.sign(pull.net))
  })

  it('vanishes at centre point steering', () => {
    expect(splitFrictionPull(4200, 1400, 0, 11).net).toBe(0)
  })
})

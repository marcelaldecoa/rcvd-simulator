/**
 * Suspension geometry -- Ch 17.
 *
 * All five exercises are pinned to the numbers in the notes. Exercise 17.1's
 * roll centre gets the most attention because its sign is the whole conclusion,
 * and because getting it right requires holding one coordinate frame throughout
 * a construction that invites you to switch halfway.
 */

import { describe, expect, it } from 'vitest'
import {
  EXERCISE_17_1,
  RACE_WISHBONE,
  antiDivePercent,
  camberCurve,
  camberGainFromFvsa,
  corneringCamber,
  fvsaForCamberGain,
  geometricSplit,
  geometricTransfer,
  instantCentre,
  rollAxisHeightAtCg,
  rollCamberCoefficient,
  rollCentreFromIc,
  rollMomentArm,
  staticCamberRequired,
  svsaHeightForAntiDive,
  travelPerDegreeRoll
} from './geometry.js'
import { SEDAN_COMPLIANCE } from './understeerBudget.js'

describe('Ch 17 Exercise 17.1 -- the instant centre and what follows', () => {
  const ic = instantCentre(EXERCISE_17_1)

  it('puts the instant centre 1.244 m OUTBOARD, 265 mm up', () => {
    expect(ic.offset).toBeCloseTo(-1.244, 3)
    expect(ic.height).toBeCloseTo(0.2652, 4)
  })

  it('gives a 1.244 m swing arm and 0.046 deg/mm of camber gain', () => {
    expect(Math.abs(ic.fvsa)).toBeCloseTo(1.244, 3)
    expect(Math.abs(ic.camberGainDegPerMm)).toBeCloseTo(0.046, 3)
  })

  it('gives 1.38 deg of camber over 30 mm of bump', () => {
    expect(Math.abs(ic.camberGainDegPerMm) * 30).toBeCloseTo(1.38, 2)
  })

  it('puts the roll centre 165 mm BELOW ground', () => {
    // The IC is 1.244 m outboard of a contact patch that is itself 0.775 m out,
    // so the line from IC through patch DESCENDS going inboard and is under the
    // road by the time it reaches the centreline.
    expect(ic.rollCentreHeight).toBeCloseTo(-0.165, 3)
  })

  it('is off by a factor of three if the two frames are mixed', () => {
    // Guarding the specific trap in this construction. The arm intersection is
    // solved in coordinates measured from the WHEEL centreline, where it lands
    // 1.244 m out; reading that as a VEHICLE coordinate against a contact patch
    // at 0.775 m leaves a 0.469 m separation instead of 1.244 m, and the roll
    // centre comes out at 438 mm rather than 165. Same sign, wrong magnitude,
    // and nothing in the arithmetic complains.
    const mixedFrames = 1.244 - 1.55 / 2
    expect((ic.height * (1.55 / 2)) / mixedFrames).toBeCloseTo(0.438, 3)
    expect(Math.abs(ic.rollCentreHeight)).toBeCloseTo(0.165, 3)
  })

  it('is not a usable layout, for two independent reasons', () => {
    // An outboard instant centre buries the roll centre below ground, AND the
    // 1.24 m swing arm is a very aggressive camber curve. Either alone would
    // rule the geometry out.
    expect(ic.fvsa).toBeLessThan(0)
    expect(ic.rollCentreHeight).toBeLessThan(0)
    expect(Math.abs(ic.camberGainDegPerMm)).toBeGreaterThan(0.04)
  })
})

describe('a geometry that is actually usable', () => {
  const ic = instantCentre(RACE_WISHBONE)

  it('puts the instant centre inboard, giving a long arm and a low roll centre', () => {
    expect(ic.fvsa).toBeGreaterThan(2)
    expect(ic.rollCentreHeight).toBeGreaterThan(0)
    expect(ic.rollCentreHeight).toBeLessThan(0.12)
    expect(ic.camberGainDegPerMm).toBeLessThan(0.03)
  })

  it('shows the coupling the chapter is about: one point sets three numbers', () => {
    // Raise the instant centre and the roll centre rises with it. There is no
    // way to move one without the other, which is Ch 17 §4's whole point.
    const higher = instantCentre({ ...RACE_WISHBONE, upperArmAngle: -5 })
    expect(higher.rollCentreHeight).not.toBeCloseTo(ic.rollCentreHeight, 3)
    expect(Math.abs(higher.camberGainDegPerMm)).not.toBeCloseTo(
      Math.abs(ic.camberGainDegPerMm),
      4
    )
  })

  it('puts the roll centre below ground for any outboard instant centre', () => {
    // The general statement of what Ex 17.1 stumbled over: the sign of the
    // swing arm decides the sign of the roll centre.
    expect(rollCentreFromIc(2.5, 0.265, 1.6)).toBeGreaterThan(0)
    expect(rollCentreFromIc(-2.5, 0.265, 1.6)).toBeLessThan(0)
    expect(rollCentreFromIc(2.5, 0, 1.6)).toBe(0)
  })

  it('sends the instant centre to infinity when the arms are parallel', () => {
    const parallel = instantCentre({ ...RACE_WISHBONE, upperArmAngle: 3, lowerArmAngle: -3 })
    expect(parallel.fvsa).toBe(Infinity)
    expect(parallel.camberGainDegPerMm).toBe(0)
    expect(parallel.rollCentreHeight).toBe(0)
  })

  it('inverts camber gain back to the swing arm that produces it', () => {
    expect(fvsaForCamberGain(camberGainFromFvsa(2.4))).toBeCloseTo(2.4, 9)
  })
})

describe('Ch 17 Exercise 17.2 -- roll axis and roll moment arm', () => {
  it('interpolates the roll axis to 63.4 mm under the CG', () => {
    expect(rollAxisHeightAtCg(45, 85, 0.46 * 2.65, 2.65)).toBeCloseTo(63.4, 1)
  })

  it('gives a 226.6 mm roll moment arm', () => {
    expect(rollMomentArm(290, rollAxisHeightAtCg(45, 85, 0.46 * 2.65, 2.65))).toBeCloseTo(226.6, 1)
  })

  it('cuts H by 22% if both roll centres go up 50 mm', () => {
    const h0 = rollMomentArm(290, rollAxisHeightAtCg(45, 85, 1.219, 2.65))
    const h1 = rollMomentArm(290, rollAxisHeightAtCg(95, 135, 1.219, 2.65))
    expect(1 - h1 / h0).toBeCloseTo(0.22, 2)
  })
})

describe('Ch 17 Exercise 17.3 -- geometric load transfer', () => {
  const split = geometricSplit({
    sprungWeight: 6500,
    frontWeightFraction: 0.46,
    rollCentreFront: 0.045,
    rollCentreRear: 0.085,
    trackFront: 1.55,
    trackRear: 1.55,
    sprungCgHeight: 0.29,
    ay: 1.4
  })

  it('gets 121.5 N front and 269.5 N rear', () => {
    expect(split.front).toBeCloseTo(121.5, 1)
    expect(split.rear).toBeCloseTo(269.5, 1)
  })

  it('makes geometric transfer 23% of the sprung total', () => {
    expect(split.fractionOfTotal).toBeCloseTo(0.23, 2)
  })

  it('splits it 31/69 front/rear -- an oversteer contribution baked into the geometry', () => {
    // The lesson: the rear roll centre is nearly twice as high, so the
    // geometric part is heavily rear-biased even though the car is not. Roll
    // centre heights are a balance tool, not only a roll-control tool.
    expect(split.frontShare).toBeCloseTo(0.31, 2)
  })

  it('vanishes entirely with roll centres at ground level', () => {
    const flat = geometricSplit({
      sprungWeight: 6500,
      frontWeightFraction: 0.46,
      rollCentreFront: 0,
      rollCentreRear: 0,
      trackFront: 1.55,
      trackRear: 1.55,
      sprungCgHeight: 0.29,
      ay: 1.4
    })
    expect(flat.total).toBe(0)
    expect(geometricTransfer(4186, 0, 1.55)).toBe(0)
  })
})

describe('Ch 17 Exercise 17.4 -- the camber budget', () => {
  const r = staticCamberRequired({
    targetCamber: -2.5,
    rollGradient: 2.2,
    ay: 1.5,
    fvsa: 2.4,
    bumpTravel: 30
  })

  it('needs -5.1 deg of static camber, which is the signal something is wrong', () => {
    expect(r.roll).toBeCloseTo(3.3, 6)
    expect(r.camberGain).toBeCloseTo(0.716, 3)
    expect(r.staticCamber).toBeCloseTo(-5.08, 2)
  })

  it('recovers only 22% of the roll-induced camber loss', () => {
    expect(r.recovered).toBeCloseTo(0.217, 3)
  })

  it('becomes workable at a race car roll gradient, without touching the geometry', () => {
    // The exercise's own fix: at 1.0 deg/g the requirement falls to -3.28 deg.
    // The lever is the roll gradient, not more static camber.
    const race = staticCamberRequired({
      targetCamber: -2.5,
      rollGradient: 1.0,
      ay: 1.5,
      fvsa: 2.4,
      bumpTravel: 30
    })
    expect(race.staticCamber).toBeCloseTo(-3.28, 2)
  })

  it('hands the understeer budget its roll camber coefficient', () => {
    // The bridge into Ch 5 §4.1: "camber gained relative to the road per degree
    // of roll" is 1 minus what the geometry recovers. This geometry recovers
    // 22%, so the coefficient is 0.78 -- which is where SEDAN_COMPLIANCE's
    // hand-chosen 0.78 came from, now derived rather than asserted.
    const k = rollCamberCoefficient({ rollGradient: 2.2, ay: 1.5, fvsa: 2.4, bumpTravel: 30 })
    expect(k).toBeCloseTo(0.783, 3)
    expect(k).toBeCloseTo(SEDAN_COMPLIANCE.front.rollCamber, 2)
  })

  it('never reports a negative coefficient, however much camber gain there is', () => {
    // Over-recovery is possible on paper and meaningless in the budget: it
    // would say camber thrust HELPS the corner, which is not what the row
    // models.
    expect(rollCamberCoefficient({ rollGradient: 0.3, ay: 1.5, fvsa: 1.0, bumpTravel: 30 })).toBe(0)
  })
})

describe('Ch 17 Exercise 17.5 -- anti-dive', () => {
  it('gets 122%, which means the nose rises under braking', () => {
    expect(antiDivePercent(0.42, 3.1, 0.3, 2.7)).toBeCloseTo(122, 0)
  })

  it('falls to 25% if the side-view arm is stretched to 15 m', () => {
    expect(antiDivePercent(0.42, 15, 0.3, 2.7)).toBeCloseTo(25.2, 1)
  })

  it('inverts to the geometry a target implies', () => {
    const h = svsaHeightForAntiDive(25, 15, 0.3, 2.7)
    expect(antiDivePercent(h, 15, 0.3, 2.7)).toBeCloseTo(25, 9)
  })
})

describe('the camber curve, as a setup sheet reads it', () => {
  it('is linear in travel and passes through the static setting', () => {
    const curve = camberCurve(2.4, -3)
    const atZero = curve.find((p) => Math.abs(p.travel) < 1e-9)!
    expect(atZero.camber).toBeCloseTo(-3, 9)
    expect(curve[0].travel).toBeLessThan(0)
    expect(curve[curve.length - 1].travel).toBeGreaterThan(0)
  })

  it('gains negative camber in bump and loses it in droop', () => {
    const curve = camberCurve(2.4, -3)
    expect(curve[curve.length - 1].camber).toBeLessThan(-3)
    expect(curve[0].camber).toBeGreaterThan(-3)
  })

  it('puts the outside wheel where the tyre wants it and the inside wheel nowhere useful', () => {
    // Ex 17.4's practical complaint, made numeric: with a big roll gradient the
    // inside wheel ends up far past any useful camber.
    const c = corneringCamber({
      staticCamber: -5.08,
      fvsa: 2.4,
      rollGradient: 2.2,
      ay: 1.5,
      travelPerDegreeRoll: travelPerDegreeRoll(1.55)
    })
    expect(c.roll).toBeCloseTo(3.3, 6)
    expect(c.outside).toBeGreaterThan(-4)
    expect(c.inside).toBeLessThan(-6)
  })

  it('converts roll to wheel travel at half a track per radian', () => {
    expect(travelPerDegreeRoll(1.6)).toBeCloseTo((0.8 * 1000 * Math.PI) / 180, 9)
  })
})

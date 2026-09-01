/**
 * Radt nondimensionalisation -- Ch 14.
 *
 * Every exercise quotes a number, and the two that carry the chapter are 14.3
 * (peak slip angle rises with load, which is why an axle's two tyres cannot
 * both be at their optimum) and 14.5 (the friction ellipse is a theorem).
 */

import { describe, expect, it } from 'vitest'
import {
  BRUSH_PEAK_NORMALISED,
  RCVD_MASTER_FIT,
  brushMaster,
  characterise,
  collapseSpread,
  collapseTire,
  combinedSlip,
  corneringStiffnessFit,
  denormalise,
  ellipseRadius,
  fitMuLinear,
  masterPeak,
  mfMaster,
  muAt,
  normalisedSlip,
  peakSlipAngle,
  slipCircleLocus,
  slipFromNormalised,
  stiffnessPeakLoad
} from './nondimensional.js'
import { MagicFormulaTire, DEFAULT_MF } from './magicFormula.js'
import { toDeg, toRad } from '../util/numeric.js'

const R2D = 180 / Math.PI

describe('Ch 14 Exercise 14.1 -- normalise, read the master curve, denormalise', () => {
  const ca = 1500 * R2D // 1500 N/deg -> N/rad
  const muY = 1.55
  const fz = 4000

  it('gets abar = 0.7265 at 3 deg', () => {
    // The notes say 0.7266, having used 57.3 rather than 180/pi to convert
    // N/deg to N/rad. Three parts in ten thousand.
    expect(normalisedSlip(ca, toRad(3), muY, fz)).toBeCloseTo(0.7265, 4)
  })

  it('reads 0.5648 off the master curve', () => {
    // The cubic term is small enough to invite a dropped decimal and large
    // enough to matter: abar^3/27 = 0.01421, not 0.00142, and the difference is
    // about 80 N of lateral force in the answer below.
    expect(brushMaster(0.7266)).toBeCloseTo(0.564825, 6)

    // The curve itself is not in doubt: it is 1 at abar = 3 by construction,
    // its derivative (1 - abar/3)^2 is zero only there, and its initial slope
    // is exactly 1 -- which is what the normalisation was built to produce.
    expect(brushMaster(3)).toBeCloseTo(1, 12)
    expect(brushMaster(1e-7) / 1e-7).toBeCloseTo(1, 6)
  })

  it('gives 3502 N', () => {
    const bar = normalisedSlip(ca, toRad(3), muY, fz)
    expect(denormalise(brushMaster(bar), muY, fz)).toBeCloseTo(3501, 0)
  })

  it('is 22% below the linear estimate, having used 56% of the peak', () => {
    // The exercise's real point: at only three degrees the tyre is already well
    // short of what the linear model promises, and has spent over half its
    // capability.
    const bar = normalisedSlip(ca, toRad(3), muY, fz)
    const fy = denormalise(brushMaster(bar), muY, fz)
    expect(1 - fy / (ca * toRad(3))).toBeCloseTo(0.222, 3)
    expect(fy / (muY * fz)).toBeCloseTo(0.5648, 4)
  })

  it('round-trips the normalisation', () => {
    const bar = normalisedSlip(ca, toRad(4.5), muY, fz)
    expect(toDeg(slipFromNormalised(ca, bar, muY, fz))).toBeCloseTo(4.5, 9)
  })
})

describe('Ch 14 Exercise 14.2 -- the peak is set by one ratio', () => {
  it('puts the peak at 12.2 deg for the exercise tyre', () => {
    expect(toDeg(peakSlipAngle(1500 * R2D, 1.55, 4000))).toBeCloseTo(12.2, 1)
  })

  it('gives 10.6 deg with the book fit instead of the brush form', () => {
    // The exercise says so explicitly: the brush peak at abar = 3 is a
    // parabolic-pressure artefact, and RCVD's own fit peaks near 2.6.
    const peak = masterPeak(RCVD_MASTER_FIT)
    expect(peak.at).toBeCloseTo(2.68, 2)
    expect(toDeg(peakSlipAngle(1500 * R2D, 1.55, 4000, peak.at))).toBeCloseTo(10.9, 1)
  })

  it('depends only on mu*Fz over C_alpha', () => {
    // The chapter's sanity check: double the stiffness and the peak halves in
    // tangent, whatever the load or friction happen to be.
    const a = peakSlipAngle(1500 * R2D, 1.55, 4000)
    const b = peakSlipAngle(3000 * R2D, 1.55, 4000)
    expect(Math.tan(a) / Math.tan(b)).toBeCloseTo(2, 9)
    const c = peakSlipAngle(1500 * R2D, 1.55 * 2, 4000)
    expect(Math.tan(c) / Math.tan(a)).toBeCloseTo(2, 9)
  })

  it('flags the exercise tyre as implausible, which is the point of the check', () => {
    // 12.2 deg is high for a slick. The chapter says a real slick at this mu
    // and load has C_alpha nearer 2500-3000 N/deg, peaking at 6-7 deg.
    expect(toDeg(peakSlipAngle(2750 * R2D, 1.55, 4000))).toBeGreaterThan(6)
    expect(toDeg(peakSlipAngle(2750 * R2D, 1.55, 4000))).toBeLessThan(7.5)
  })
})

describe('Ch 14 Exercise 14.3 -- peak slip angle rises with load', () => {
  const data = [
    { fz: 2000, peak: 3300, caDeg: 900 },
    { fz: 4000, peak: 6200, caDeg: 1500 },
    { fz: 6000, peak: 8700, caDeg: 1850 }
  ].map((d) => ({ ...d, muY: d.peak / d.fz }))

  it('recovers mu = 1.75 - 5e-5 Fz exactly', () => {
    const fit = fitMuLinear(data.map((d) => ({ fz: d.fz, muY: d.muY })))
    expect(fit.mu0).toBeCloseTo(1.75, 6)
    expect(fit.kMu).toBeCloseTo(5e-5, 9)
    for (const d of data) expect(muAt(fit, d.fz)).toBeCloseTo(d.muY, 9)
  })

  it('gets 10.9, 12.2 and 13.8 deg', () => {
    const angles = data.map((d) => toDeg(peakSlipAngle(d.caDeg * R2D, d.muY, d.fz)))
    expect(angles[0]).toBeCloseTo(10.9, 1)
    expect(angles[1]).toBeCloseTo(12.2, 1)
    expect(angles[2]).toBeCloseTo(13.8, 1)
  })

  it('is the reason an axle cannot have both tyres at their optimum', () => {
    // Two tyres on an axle share approximately one slip angle, but the loaded
    // one wants a larger angle than the light one. So one is past its peak
    // while the other is short of it -- a loss on top of Ch 2's load
    // sensitivity, and the argument behind anti-Ackermann in Ch 19.
    const angles = data.map((d) => peakSlipAngle(d.caDeg * R2D, d.muY, d.fz))
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1])
  })

  it('shows cornering stiffness saturating with load', () => {
    // 900 -> 1850 N/deg for a tripling of load, which is what the
    // sin(2 atan(Fz/c2)) fit form exists to capture.
    expect(data[2].caDeg / data[0].caDeg).toBeLessThan(3)
  })
})

describe('the load-dependent scale functions -- Ch 14 §4', () => {
  it('peaks the cornering stiffness fit at Fz = c2', () => {
    const c1 = 200000
    const c2 = 5000
    expect(stiffnessPeakLoad(c2)).toBe(c2)
    expect(corneringStiffnessFit(c1, c2, c2)).toBeCloseTo(c1, 6)
    expect(corneringStiffnessFit(c1, c2, c2 * 0.4)).toBeLessThan(c1)
    expect(corneringStiffnessFit(c1, c2, c2 * 3)).toBeLessThan(c1)
  })

  it('rises then falls, which a straight line cannot do', () => {
    const c1 = 200000
    const c2 = 5000
    const at = (fz: number): number => corneringStiffnessFit(c1, c2, fz)
    expect(at(3000)).toBeLessThan(at(5000))
    expect(at(9000)).toBeLessThan(at(5000))
  })
})

describe('the master curves themselves', () => {
  it('puts the brush peak at exactly 3, with unit value', () => {
    expect(brushMaster(BRUSH_PEAK_NORMALISED)).toBeCloseTo(1, 12)
    for (const a of [3.5, 5, 100]) expect(brushMaster(a)).toBe(1)
  })

  it('is odd, so negative slip mirrors', () => {
    for (const a of [0.3, 1.2, 2.9, 4]) expect(brushMaster(-a)).toBeCloseTo(-brushMaster(a), 12)
  })

  it('starts with unit slope, which is what the normalisation was built for', () => {
    // At small abar the tyre is linear and Fbar = abar exactly, because both
    // axes were divided by the same peak.
    expect(brushMaster(1e-6) / 1e-6).toBeCloseTo(1, 6)
  })

  it('normalises the book fit to a unit peak near abar = 2.6', () => {
    const peak = masterPeak(RCVD_MASTER_FIT)
    expect(peak.value).toBeCloseTo(1, 2)
    expect(peak.at).toBeGreaterThan(2.3)
    expect(peak.at).toBeLessThan(2.9)
  })

  it('has the book fit fall away past its peak, unlike the brush form', () => {
    // The brush curve saturates at 1 and stays there; a real tyre, and the
    // book's fit of one, comes back down.
    const peak = masterPeak(RCVD_MASTER_FIT)
    expect(mfMaster(peak.at + 1.5, RCVD_MASTER_FIT)).toBeLessThan(peak.value)
    expect(brushMaster(peak.at + 1.5)).toBe(1)
  })
})

describe('the collapse -- what the chapter is for', () => {
  const tire = new MagicFormulaTire(DEFAULT_MF)
  const loads = [1500, 3000, 4500, 6000, 7500]
  const curves = collapseTire(tire, loads)

  it('sweeps every load and normalises each', () => {
    expect(curves).toHaveLength(loads.length)
    for (const c of curves) {
      expect(c.points.length).toBeGreaterThan(20)
      expect(c.muY).toBeGreaterThan(0)
      expect(c.corneringStiffness).toBeGreaterThan(0)
    }
  })

  it('fans the RAW curves out: more load, more force, later peak', () => {
    const peakForce = curves.map((c) => Math.max(...c.points.map((p) => p.fy)))
    for (let i = 1; i < peakForce.length; i++) expect(peakForce[i]).toBeGreaterThan(peakForce[i - 1])
    for (let i = 1; i < curves.length; i++) {
      expect(curves[i].peakAlpha).toBeGreaterThan(curves[i - 1].peakAlpha)
    }
  })

  it('collapses them onto one curve', () => {
    // The whole claim of the method. A 5:1 load range that spreads its raw
    // peak forces over a factor of four lands within a few percent of a single
    // normalised curve.
    const spread = collapseSpread(curves)
    expect(spread.meanSpread).toBeLessThan(0.06)
    expect(spread.maxSpread).toBeLessThan(0.12)
  })

  it('collapses EXACTLY for a Magic Formula with load-independent shape factors', () => {
    // Worth being honest about, because it makes the demonstration circular if
    // you do not say it. The Magic Formula is D sin(C atan(B alpha - E(...))),
    // so Fy/D is a function of B*alpha alone whenever C and E do not vary with
    // load. And abar = C_alpha alpha / D = B C alpha, since C_alpha = B C D.
    // Therefore Fy/D = f(abar / C): the collapse is an algebraic identity, and
    // it holds no matter what B does with load.
    //
    // So a perfect collapse here is confirming the algebra, not discovering
    // anything about the tyre. The spread is numerical noise.
    expect(collapseSpread(curves).meanSpread).toBeLessThan(2e-3)
  })

  it('degrades once the SHAPE varies with load, which is the real test', () => {
    // Give each load its own shape factor and the family stops landing on one
    // curve. This is what the method is actually claiming about measured data:
    // not that the algebra works, but that the shape is nearly invariant.
    // Ch 14 §7 says as much -- the normalisation PRESUMES shape invariance, and
    // for radically different constructions that should be checked.
    const drifted = loads.map((fz) => {
      const k = 1 + 0.25 * (fz / 4000 - 1)
      const t = new MagicFormulaTire({ ...DEFAULT_MF, shapeC: DEFAULT_MF.shapeC * k })
      return collapseTire(t, [fz])[0]
    })
    expect(collapseSpread(drifted).meanSpread).toBeGreaterThan(
      collapseSpread(curves).meanSpread * 10
    )
  })

  it('collapses far better than the raw curves agree', () => {
    const rawPeaks = curves.map((c) => Math.max(...c.points.map((p) => p.fy)))
    const rawSpread = (Math.max(...rawPeaks) - Math.min(...rawPeaks)) / Math.max(...rawPeaks)
    expect(collapseSpread(curves).meanSpread).toBeLessThan(rawSpread / 5)
  })

  it('starts every normalised curve at the origin with unit slope', () => {
    for (const c of curves) {
      const p = c.points[1]
      expect(p.normalisedForce / p.normalisedSlip).toBeGreaterThan(0.9)
      expect(p.normalisedForce / p.normalisedSlip).toBeLessThan(1.1)
    }
  })

  it('reaches unit normalised force at each load, by construction', () => {
    for (const c of curves) {
      expect(Math.max(...c.points.map((p) => p.normalisedForce))).toBeCloseTo(1, 1)
    }
  })
})

describe('Ch 14 Exercise 14.4 -- combined slip through one master curve', () => {
  const inputs = {
    corneringStiffness: 1500 * R2D,
    slipStiffness: 90000,
    muX: 1.7,
    muY: 1.55,
    fz: 4000,
    alpha: toRad(2),
    slipRatio: 0.05
  }
  const r = combinedSlip(inputs)

  it('gets the theoretical slips', () => {
    expect(r.sigmaX).toBeCloseTo(0.04762, 5)
    expect(r.sigmaY).toBeCloseTo(0.03326, 5)
  })

  it('normalises to 0.6303 and 0.4611, resultant 0.7810', () => {
    expect(r.barX).toBeCloseTo(0.6303, 4)
    expect(r.barY).toBeCloseTo(0.461, 3)
    expect(r.bar).toBeCloseTo(0.7809, 4)
  })

  it('reads 0.5953 off the master curve', () => {
    expect(r.masterForce).toBeCloseTo(0.5953, 4)
  })

  it('gets 3267 N longitudinal and 2179 N lateral', () => {
    expect(r.fx).toBeCloseTo(3267, 0)
    expect(r.fy).toBeCloseTo(2179, 0)
  })

  it('costs 14% of the lateral force to gain the longitudinal', () => {
    // The friction ellipse trade, computed from first principles rather than
    // assumed. Pure 2 deg gives 2543 N of lateral force.
    const pure = combinedSlip({ ...inputs, slipRatio: 0 })
    expect(pure.fy).toBeCloseTo(2543, 0)
    expect(1 - r.fy / pure.fy).toBeCloseTo(0.14, 2)
  })
})

describe('Ch 14 Exercise 14.5 -- the friction ellipse is a theorem', () => {
  const base = {
    corneringStiffness: 1500 * R2D,
    slipStiffness: 90000,
    muX: 1.7,
    muY: 1.55,
    fz: 4000
  }

  it('lands exactly on the ellipse at full slide, in every direction', () => {
    // Not approximately, and not by assumption: squaring and adding the two
    // normalised components gives (barX^2 + barY^2)/bar^2 = 1 identically.
    for (const alphaDeg of [1, 4, 8, 15, 25]) {
      for (const sr of [0.02, 0.1, 0.3, 0.8]) {
        const r = combinedSlip({ ...base, alpha: toRad(alphaDeg), slipRatio: sr })
        if (!r.sliding) continue
        expect(ellipseRadius(r, base.muX, base.muY, base.fz)).toBeCloseTo(1, 9)
      }
    }
  })

  it('sits INSIDE the ellipse before it slides, scaled by the master curve', () => {
    const r = combinedSlip({ ...base, alpha: toRad(1), slipRatio: 0.01 })
    expect(r.sliding).toBe(false)
    const radius = ellipseRadius(r, base.muX, base.muY, base.fz)
    expect(radius).toBeLessThan(1)
    expect(radius).toBeCloseTo(r.masterForce, 9)
  })

  it('makes the ellipse a nested family indexed by total slip', () => {
    // Which is the part the naive ellipse does not tell you: the outermost is
    // the limit, and every interior one is the same shape scaled down.
    const inner = slipCircleLocus(base, 1.0)
    const outer = slipCircleLocus(base, 3.0)
    const rad = (pts: { fx: number; fy: number }[]): number =>
      Math.hypot(pts[0].fx / (base.muX * base.fz), pts[0].fy / (base.muY * base.fz))
    expect(rad(outer)).toBeCloseTo(1, 9)
    expect(rad(inner)).toBeLessThan(1)
    expect(rad(inner)).toBeCloseTo(brushMaster(1.0), 9)
  })

  it('reduces to pure lateral and pure longitudinal at the axes', () => {
    const pureY = combinedSlip({ ...base, alpha: toRad(20), slipRatio: 0 })
    expect(pureY.fx).toBeCloseTo(0, 9)
    expect(pureY.fy).toBeCloseTo(base.muY * base.fz, 6)
    const pureX = combinedSlip({ ...base, alpha: 0, slipRatio: 0.5 })
    expect(pureX.fy).toBeCloseTo(0, 9)
    expect(pureX.fx).toBeCloseTo(base.muX * base.fz, 6)
  })
})

describe('Ch 14 Exercise 14.6 -- peak mu alone is a poor comparison', () => {
  const a = characterise('Tire A', 1.6, 1300, 4000)
  const b = characterise('Tire B', 1.52, 1800, 4000)

  it('gives A 5.3% more peak grip', () => {
    expect(a.peakForce).toBeCloseTo(6400, 0)
    expect(b.peakForce).toBeCloseTo(6080, 0)
    expect(a.peakForce / b.peakForce - 1).toBeCloseTo(0.053, 3)
  })

  it('gives B its peak at 10.0 deg against A at 14.5', () => {
    expect(a.peakSlipAngleDeg).toBeCloseTo(14.5, 1)
    expect(b.peakSlipAngleDeg).toBeCloseTo(10.0, 1)
  })

  it('gives B 38% more cornering stiffness', () => {
    expect(b.corneringStiffnessPerDeg / a.corneringStiffnessPerDeg - 1).toBeCloseTo(0.38, 2)
  })

  it('makes the choice a property of the CAR, not of the tyre', () => {
    // The chapter's closing lesson. A has more peak grip and needs large slip
    // angles to reach it; B peaks where an aero car can actually operate. Two
    // numbers, opposite verdicts, and neither tyre is better on its own.
    expect(a.peakForce).toBeGreaterThan(b.peakForce)
    expect(b.peakSlipAngleDeg).toBeLessThan(a.peakSlipAngleDeg)
  })
})

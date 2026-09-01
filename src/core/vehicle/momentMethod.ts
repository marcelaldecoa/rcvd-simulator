/**
 * The MRA Moment Method -- Ch 8.
 *
 * "The book's signature contribution." Every other analysis in the course
 * imposes yaw equilibrium, so each speed and steer angle admits exactly one
 * trimmed state. That describes steady cornering and discards everything else
 * -- and a race car spends most of its time out of yaw equilibrium, on purpose.
 *
 * The Moment Method drops the moment constraint and asks a different question:
 * held at sideslip beta and steer delta, what lateral acceleration AND what
 * yaw moment does the car make? Sweeping both inputs gives a map of N against
 * Ay, crossed by contours of constant beta and constant delta.
 *
 * Two things fall out that nothing else in the course provides:
 *
 *   - Understeer stops being primitive. It is the RATIO of stability
 *     (dN/dAy at fixed delta) to control (dN/ddelta at fixed Ay). Two cars can
 *     share an understeer gradient and feel nothing alike, and this says which
 *     of the two you are short of.
 *   - The gap between the highest Ay anywhere on the map and the highest Ay on
 *     the N = 0 line measures how much performance the car's balance is
 *     throwing away.
 *
 * The basic diagram takes zero path curvature (r = 0), as Ch 8 §8 notes:
 * physically odd -- a car sliding sideways down a straight -- but analytically
 * clean, and it is what makes the (beta, delta) grid orthogonal.
 */

import { bisect, toRad } from '../util/numeric.js'
import { derive, type BicycleVehicle } from './params.js'
import { wheelLoads, type ChassisParams } from './chassis.js'
import type { TireModel } from '../tire/types.js'
import type { ExtraLoads } from './pairAnalysis.js'

const NO_EXTRA: ExtraLoads = { front: 0, rear: 0 }

export interface MMMPoint {
  /** Sideslip angle, rad. */
  beta: number
  /** Road-wheel steer angle, rad. */
  steer: number
  /** Lateral acceleration, g. */
  ay: number
  /** Yaw moment about the CG, N.m. Positive tends to turn the car in. */
  yawMoment: number
  /** Normalised yaw moment, N / (W * L) -- dimensionless, the book's C_N. */
  cn: number
  alphaF: number
  alphaR: number
  /** Front and rear axle lateral forces, N. */
  fyFront: number
  fyRear: number
}

export interface MMMOptions {
  vehicle: BicycleVehicle
  chassis: ChassisParams
  tireFront: TireModel
  tireRear: TireModel
  /** Extra vertical load per axle, e.g. downforce at this speed. */
  aero?: ExtraLoads
  /** Half-range of the sideslip sweep, rad. */
  betaRange?: number
  /** Half-range of the steer sweep, rad. */
  steerRange?: number
  /** Contour count in each direction. */
  lines?: number
  /** Samples along each contour. */
  samples?: number
  /**
   * Steer angles at which the trim line is solved. Deliberately independent of
   * `lines`: how many contours are legible to draw and how finely the N = 0
   * crossing needs resolving are unrelated questions, and tying them together
   * hides the trim line's peak behind the contour spacing.
   */
  trimSamples?: number
}

/**
 * One point of the map: the car held at (beta, delta), free to make whatever
 * force and moment it makes.
 *
 * With r = 0 the slip angles are simply
 *   alpha_f = delta - beta,  alpha_r = -beta
 * and the only coupling left is that lateral load transfer depends on the very
 * Ay being solved for. That is resolved by a short damped fixed-point iteration
 * -- damped because an undamped one oscillates near the tyre peak, where the
 * force curve's slope changes sign.
 */
export function mmmPoint(
  o: MMMOptions,
  beta: number,
  steer: number
): MMMPoint {
  const { vehicle: v, chassis: c, tireFront, tireRear } = o
  const aero = o.aero ?? NO_EXTRA
  const { w, L } = derive(v)

  const alphaF = steer - beta
  const alphaR = -beta

  let ay = 0
  let fyFront = 0
  let fyRear = 0
  for (let i = 0; i < 40; i++) {
    // Load transfer follows the magnitude of Ay; which side is loaded is
    // handled by the outer/inner labelling, not by the sign.
    const loads = wheelLoads(v, c, Math.abs(ay), 0, aero)
    fyFront = tireFront.fy(alphaF, loads.fo) + tireFront.fy(alphaF, loads.fi)
    fyRear = tireRear.fy(alphaR, loads.ro) + tireRear.fy(alphaR, loads.ri)
    const next = (fyFront + fyRear) / w
    if (Math.abs(next - ay) < 1e-10) {
      ay = next
      break
    }
    ay = 0.5 * ay + 0.5 * next
  }

  const yawMoment = v.a * fyFront - v.b * fyRear
  return {
    beta,
    steer,
    ay,
    yawMoment,
    cn: yawMoment / (w * L),
    alphaF,
    alphaR,
    fyFront,
    fyRear
  }
}

export interface MMMContour {
  /** The held value: steer angle for a constant-delta line, beta otherwise. */
  value: number
  points: MMMPoint[]
}

export interface TrimPointMMM {
  /** Steer angle of this trimmed state, rad. */
  steer: number
  /** Sideslip that trims it, rad. */
  beta: number
  /** Trimmed lateral acceleration, g. */
  ay: number
}

export interface MMMDiagram extends StabilityControl {
  /** Lines of constant steer angle, each sweeping sideslip. */
  constantSteer: MMMContour[]
  /** Lines of constant sideslip, each sweeping steer. */
  constantBeta: MMMContour[]
  /** The N = 0 line: every state the free vehicle can actually hold. */
  trimLine: TrimPointMMM[]
  /**
   * The closed outer boundary of the map -- Ch 8 §5's "the envelope closes".
   *
   * Stated the way the chapter states it: for a given Ay, the range of yaw
   * moment any (beta, delta) can produce. Walked as a closed loop, upper
   * boundary left to right and lower boundary back again.
   *
   * The obvious shortcut -- the image of the (beta, delta) rectangle's own
   * boundary -- does NOT work, and the reason is worth knowing. Both axles peak
   * at a finite slip angle, so the largest Ay is made at alpha_f = alpha_r =
   * peak, which is beta = -alpha_peak with the steering STRAIGHT. That is an
   * interior point of the input rectangle. The map folds, and the fold, not the
   * edge of the swept range, is most of the envelope.
   */
  envelope: { ay: number; nUpper: number; nLower: number }[]
  /** Highest lateral acceleration anywhere on the map, g. */
  maxAy: number
  /** Highest lateral acceleration ON the trim line, g. */
  maxTrimmedAy: number
  /**
   * Ay available but not usable, g. Ch 8 §5: a direct measure of how much
   * performance the car's balance is throwing away.
   */
  balanceLoss: number
  /** Largest yaw moment the car can generate, N.m -- its ability to rotate. */
  maxYawMoment: number
}

export interface StabilityControl {
  /** dN/dAy at fixed steer, N.m per g. Negative is stable. */
  stability: number
  /** dN/ddelta at fixed Ay, N.m per rad. */
  control: number
  /**
   * Understeer as the ratio of the two (Ch 8 §4), rad/g. Understeer is not a
   * primitive quantity -- it is what stability and control produce together.
   */
  understeerFromRatio: number
}

/**
 * The two derivatives the map is really about -- Ch 8 §4.
 *
 * Measured about straight-ahead, where the map is still linear and the
 * derivatives are unambiguous.
 *
 * Both are taken along the axes the book names, and the second one is the
 * subtle one: control is dN/ddelta AT CONSTANT Ay, not at constant sideslip.
 * Turning the wheel while holding beta changes Ay too, so the naive partial
 * measures something else. Holding Ay fixed means letting beta move with the
 * steer, which the chain rule supplies from the four raw partials:
 *
 *   stability = N_beta / Ay_beta
 *   control   = N_delta - N_beta * (Ay_delta / Ay_beta)
 *
 * Getting this wrong is not academic. With the constant-beta partial the
 * linear car gives control = a*Cf; with the correct one it gives
 * L*Cf*Cr/(Cf + Cr), and only the second makes -stability/control collapse
 * exactly to Wf/Cf - Wr/Cr, the Ch 5 understeer gradient. The whole claim of
 * Ch 8 §4 -- that understeer IS the ratio -- rests on the constant-Ay
 * definition.
 */
export function stabilityAndControl(o: MMMOptions): StabilityControl {
  const h = toRad(0.5)
  const bMinus = mmmPoint(o, -h, 0)
  const bPlus = mmmPoint(o, h, 0)
  const dMinus = mmmPoint(o, 0, -h)
  const dPlus = mmmPoint(o, 0, h)

  const nBeta = (bPlus.yawMoment - bMinus.yawMoment) / (2 * h)
  const ayBeta = (bPlus.ay - bMinus.ay) / (2 * h)
  const nDelta = (dPlus.yawMoment - dMinus.yawMoment) / (2 * h)
  const ayDelta = (dPlus.ay - dMinus.ay) / (2 * h)

  const stability = Math.abs(ayBeta) > 1e-12 ? nBeta / ayBeta : 0
  const control =
    Math.abs(ayBeta) > 1e-12 ? nDelta - nBeta * (ayDelta / ayBeta) : nDelta

  return {
    stability,
    control,
    understeerFromRatio: control !== 0 ? -stability / control : 0
  }
}

/**
 * The sideslip that trims a given steer angle, solved rather than interpolated.
 *
 * Scans sideslip for sign changes in N and takes the bracket NEAREST β = 0,
 * because that is the trim state a driver actually arrives at coming from
 * straight-ahead. A car with terminal oversteer can have more than one
 * crossing, and the far ones are not states anybody reaches.
 */
export function trimAtSteer(o: MMMOptions, steer: number): TrimPointMMM | null {
  const betaRange = o.betaRange ?? toRad(12)
  const scan = 41
  let best: [number, number] | null = null
  let bestDist = Infinity

  let prevBeta = -betaRange
  let prevN = mmmPoint(o, prevBeta, steer).yawMoment
  for (let i = 1; i < scan; i++) {
    const beta = -betaRange + (2 * betaRange * i) / (scan - 1)
    const n = mmmPoint(o, beta, steer).yawMoment
    if (prevN === 0) {
      const dist = Math.abs(prevBeta)
      if (dist < bestDist) {
        bestDist = dist
        best = [prevBeta, prevBeta]
      }
    } else if (prevN * n < 0) {
      const dist = Math.abs((prevBeta + beta) / 2)
      if (dist < bestDist) {
        bestDist = dist
        best = [prevBeta, beta]
      }
    }
    prevBeta = beta
    prevN = n
  }
  if (!best) return null

  const [lo, hi] = best
  const beta =
    lo === hi ? lo : (bisect((b) => mmmPoint(o, b, steer).yawMoment, lo, hi, 1e-9) ?? (lo + hi) / 2)
  const p = mmmPoint(o, beta, steer)
  return { steer, beta, ay: p.ay }
}

/** Build the full map. */
export function mmmDiagram(o: MMMOptions): MMMDiagram {
  const betaRange = o.betaRange ?? toRad(12)
  const steerRange = o.steerRange ?? toRad(10)
  const lines = o.lines ?? 9
  const samples = o.samples ?? 41

  const steerValues: number[] = []
  for (let i = 0; i < lines; i++) {
    steerValues.push(-steerRange + (2 * steerRange * i) / (lines - 1))
  }
  const betaValues: number[] = []
  for (let i = 0; i < lines; i++) {
    betaValues.push(-betaRange + (2 * betaRange * i) / (lines - 1))
  }

  const constantSteer: MMMContour[] = steerValues.map((steer) => ({
    value: steer,
    points: Array.from({ length: samples }, (_, i) =>
      mmmPoint(o, -betaRange + (2 * betaRange * i) / (samples - 1), steer)
    )
  }))

  const constantBeta: MMMContour[] = betaValues.map((beta) => ({
    value: beta,
    points: Array.from({ length: samples }, (_, i) =>
      mmmPoint(o, beta, -steerRange + (2 * steerRange * i) / (samples - 1))
    )
  }))

  const trimSamples = o.trimSamples ?? 61
  const trimLine: TrimPointMMM[] = []
  for (let i = 0; i < trimSamples; i++) {
    const steer = -steerRange + (2 * steerRange * i) / (trimSamples - 1)
    const t = trimAtSteer(o, steer)
    if (t) trimLine.push(t)
  }

  const all = [...constantSteer, ...constantBeta].flatMap((c) => c.points)
  const maxAy = Math.max(...all.map((p) => Math.abs(p.ay)))
  const maxTrimmedAy = trimLine.length ? Math.max(...trimLine.map((t) => Math.abs(t.ay))) : 0
  const maxYawMoment = Math.max(...all.map((p) => Math.abs(p.yawMoment)))

  const envelope = envelopeOf(o, maxAy)

  return {
    constantSteer,
    constantBeta,
    trimLine,
    envelope,
    maxAy,
    maxTrimmedAy,
    balanceLoss: maxAy - maxTrimmedAy,
    maxYawMoment,
    ...stabilityAndControl(o)
  }
}

/**
 * The outer boundary of the map, binned in Ay -- Ch 8 §5.
 *
 * Needs its own grid over (beta, delta) rather than the drawn contours: the
 * contours are a cross-hatch and leave the interior, where the fold that sets
 * most of the boundary lives, thinly sampled.
 */
export function envelopeOf(
  o: MMMOptions,
  maxAy: number,
  bins = 49,
  grid = 41
): { ay: number; nUpper: number; nLower: number }[] {
  const betaRange = o.betaRange ?? toRad(12)
  const steerRange = o.steerRange ?? toRad(10)
  const upper = new Array<number>(bins).fill(-Infinity)
  const lower = new Array<number>(bins).fill(Infinity)
  const span = 2 * maxAy
  if (!(span > 0)) return []

  for (let i = 0; i < grid; i++) {
    const beta = -betaRange + (2 * betaRange * i) / (grid - 1)
    for (let j = 0; j < grid; j++) {
      const steer = -steerRange + (2 * steerRange * j) / (grid - 1)
      const p = mmmPoint(o, beta, steer)
      const bin = Math.min(bins - 1, Math.max(0, Math.floor(((p.ay + maxAy) / span) * bins)))
      if (p.yawMoment > upper[bin]) upper[bin] = p.yawMoment
      if (p.yawMoment < lower[bin]) lower[bin] = p.yawMoment
    }
  }

  const out: { ay: number; nUpper: number; nLower: number }[] = []
  for (let b = 0; b < bins; b++) {
    if (upper[b] === -Infinity) continue
    out.push({
      ay: -maxAy + (span * (b + 0.5)) / bins,
      nUpper: upper[b],
      nLower: lower[b]
    })
  }
  return out
}

/**
 * The trimmed limit, solved directly rather than read off the grid.
 *
 * At N = 0 the moment balance gives a*Fyf = b*Fyr, which with Fyf + Fyr = W*Ay
 * forces Fyf = Wf*Ay and Fyr = Wr*Ay -- exactly the demand split of steady
 * cornering. So the highest trimmed Ay the Moment Method admits must equal the
 * Ch 7 pair-analysis limit, and `momentMethod.test.ts` checks that it does.
 */
export function maxTrimmedAy(o: MMMOptions, ayCap = 6): number {
  const { vehicle: v, chassis: c, tireFront, tireRear } = o
  const aero = o.aero ?? NO_EXTRA
  const { wf, wr } = derive(v)

  // For a demanded Ay, can each axle make its share?
  const shortfall = (ay: number): number => {
    const loads = wheelLoads(v, c, ay, 0, aero)
    const maxAlpha = toRad(25)
    const peak = (t: TireModel, o1: number, i1: number): number => {
      let best = 0
      for (let k = 0; k <= 60; k++) {
        const a = (maxAlpha * k) / 60
        best = Math.max(best, t.fy(a, o1) + t.fy(a, i1))
      }
      return best
    }
    const f = peak(tireFront, loads.fo, loads.fi) / wf - ay
    const r = peak(tireRear, loads.ro, loads.ri) / wr - ay
    return Math.min(f, r)
  }

  if (shortfall(0.001) <= 0) return 0
  return bisect(shortfall, 0.001, ayCap, 1e-7) ?? 0
}

/** Lateral acceleration in g from a lateral force and a weight. */
export function ayFromForce(force: number, weight: number): number {
  return weight > 0 ? force / weight : 0
}

/** Yaw moment normalised the way the book plots it. */
export function normalise(yawMoment: number, v: BicycleVehicle): number {
  const { w, L } = derive(v)
  return yawMoment / (w * L)
}

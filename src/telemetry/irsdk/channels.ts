/**
 * iRacing channel names to the app's own sample shape.
 *
 * Two jobs, and the second is the awkward one.
 *
 * UNITS are easy: iRacing publishes SI throughout (m/s, m/s^2, rad, rad/s), so
 * most of this is renaming. The exception is steering, which is published as
 * HANDWHEEL angle -- the driver's input, not the road wheels'. Everything in
 * this course is written in road-wheel steer, so it has to be divided by the
 * steering ratio, and getting that wrong scales every slip angle the overlay
 * shows.
 *
 * SIGNS are the awkward part. The app's convention is "positive to the left"
 * for lateral acceleration, yaw rate, steer and sideslip alike. Whether that
 * matches iRacing's is something this file ASSUMES rather than knows, and the
 * assumption is worth being explicit about because it cannot be verified
 * without the simulator running.
 *
 * What saves it is that the physics is mirror-symmetric: flip ALL the lateral
 * channels together and nothing downstream changes, because every relation is
 * between them. What would genuinely break the overlay is flipping only SOME of
 * them. So rather than guess, this module ships a runtime consistency check --
 * in any steady turn Ay must equal V*r, so those two channels agreeing in sign
 * is checkable from data alone, and a disagreement is reported rather than
 * silently absorbed.
 */

import type { TelemetrySample } from '../types.js'
import { CORNER_PREFIXES, readCorners, readNumber, type VarHeader } from './layout.js'

/** Channel names read from the SDK. Absent ones degrade rather than throw. */
export const CHANNELS = {
  time: 'SessionTime',
  speed: 'Speed',
  velocityX: 'VelocityX',
  velocityY: 'VelocityY',
  yawRate: 'YawRate',
  steer: 'SteeringWheelAngle',
  latAccel: 'LatAccel',
  longAccel: 'LongAccel',
  throttle: 'Throttle',
  brake: 'Brake',
  lap: 'Lap',
  lapDistPct: 'LapDistPct',
  heading: 'YawNorth',
  gear: 'Gear',
  rpm: 'RPM'
} as const

/**
 * Per-channel sign multipliers.
 *
 * All +1 by default. If a future iRacing build, or a different simulator behind
 * the same adapter, turns out to publish a lateral channel the other way up,
 * this is the one place to say so -- and `checkConventions` below is how you
 * find out that you need to.
 */
export interface SignConvention {
  lateralVelocity: number
  yawRate: number
  steer: number
  latAccel: number
}

export const DEFAULT_SIGNS: SignConvention = {
  lateralVelocity: 1,
  yawRate: 1,
  steer: 1,
  latAccel: 1
}

export interface MapOptions {
  /** Handwheel degrees per road-wheel degree. */
  steeringRatio: number
  signs?: SignConvention
  /** Session time of the first sample, subtracted so t starts near zero. */
  timeOrigin?: number
}

/** One record to one sample. */
export function mapSample(
  record: Buffer,
  vars: Map<string, VarHeader>,
  opts: MapOptions
): TelemetrySample {
  const s = opts.signs ?? DEFAULT_SIGNS
  const ratio = opts.steeringRatio > 0 ? opts.steeringRatio : 1

  const speedChannel = readNumber(record, vars, CHANNELS.speed, NaN)
  const vx = readNumber(record, vars, CHANNELS.velocityX, NaN)
  // Prefer the body-frame forward velocity; fall back to the scalar speed.
  const speed = Number.isFinite(vx) ? Math.abs(vx) : Number.isFinite(speedChannel) ? speedChannel : 0

  const hasVy = vars.has(CHANNELS.velocityY)

  return {
    t: readNumber(record, vars, CHANNELS.time) - (opts.timeOrigin ?? 0),
    speed,
    ax: readNumber(record, vars, CHANNELS.longAccel),
    ay: s.latAccel * readNumber(record, vars, CHANNELS.latAccel),
    yawRate: s.yawRate * readNumber(record, vars, CHANNELS.yawRate),
    // Handwheel to road wheel. Everything downstream is in road-wheel steer.
    steer: (s.steer * readNumber(record, vars, CHANNELS.steer)) / ratio,
    lateralVelocity: hasVy
      ? s.lateralVelocity * readNumber(record, vars, CHANNELS.velocityY)
      : undefined,
    throttle: readNumber(record, vars, CHANNELS.throttle),
    brake: readNumber(record, vars, CHANNELS.brake),
    lapDistPct: readNumber(record, vars, CHANNELS.lapDistPct),
    lap: readNumber(record, vars, CHANNELS.lap),
    // Absolute heading, for the track map. Left undefined rather than zero when
    // the sim does not publish it, so a map can decline to draw rather than
    // drawing a straight line and calling it a circuit.
    heading: vars.has(CHANNELS.heading)
      ? readNumber(record, vars, CHANNELS.heading)
      : undefined,
    gear: vars.has(CHANNELS.gear) ? readNumber(record, vars, CHANNELS.gear) : undefined,
    engineSpeed: vars.has(CHANNELS.rpm)
      ? (readNumber(record, vars, CHANNELS.rpm) * 2 * Math.PI) / 60
      : undefined,
    rideHeight: readCorners(record, vars, CORNER_PREFIXES, 'rideHeight'),
    shockDeflection: readCorners(record, vars, CORNER_PREFIXES, 'shockDefl'),
    shockVelocity: readCorners(record, vars, CORNER_PREFIXES, 'shockVel'),
    tireTemp: readCorners(record, vars, CORNER_PREFIXES, 'tempM'),
    // iRacing publishes pressures in kPa; the app's model is SI.
    tirePressure: readCorners(record, vars, CORNER_PREFIXES, 'pressure')?.map((p) => p * 1000) as
      | [number, number, number, number]
      | undefined
  }
}

export interface ConventionCheck {
  /** Samples that met the steady-turn filter. */
  n: number
  /** Fraction of those where sign(Ay) matched sign(V*r). */
  agreement: number
  /** Fraction where sign(steer) matched sign(yaw rate). */
  steerAgreement: number
  ok: boolean
  detail: string
}

/**
 * Check the sign conventions against the data rather than trusting them.
 *
 * In any steady turn Ay = V*r exactly -- that is Ch 4's transport term, and it
 * is a kinematic identity, not a modelling assumption. So the two channels MUST
 * agree in sign, and if they do not, one of them is being read upside down.
 *
 * The steer check is weaker and reported separately: a car in a normal corner
 * steers into the turn, so sign(delta) should match sign(r), but a car in a
 * big enough slide genuinely has opposite lock and legitimately disagrees.
 * Below about 80% agreement on a full session, suspect the sign rather than
 * the driver.
 */
export function checkConventions(samples: TelemetrySample[]): ConventionCheck {
  let n = 0
  let ayAgree = 0
  let steerAgree = 0

  for (const s of samples) {
    if (s.speed < 10) continue
    const transport = s.speed * s.yawRate
    if (Math.abs(transport) < 1.5) continue // not turning meaningfully
    if (Math.abs(s.ax) > 3) continue // not a steady turn
    n++
    if (Math.sign(s.ay) === Math.sign(transport)) ayAgree++
    if (Math.sign(s.steer) === Math.sign(s.yawRate)) steerAgree++
  }

  if (n < 30) {
    return {
      n,
      agreement: 0,
      steerAgreement: 0,
      ok: true,
      detail: 'not enough cornering yet to check'
    }
  }

  const agreement = ayAgree / n
  const steerAgreement = steerAgree / n
  const ok = agreement > 0.9

  return {
    n,
    agreement,
    steerAgreement,
    ok,
    detail: ok
      ? `Ay and V*r agree on ${(agreement * 100).toFixed(0)}% of ${n} cornering samples`
      : `Ay and V*r DISAGREE on ${((1 - agreement) * 100).toFixed(0)}% of ${n} samples — ` +
        'one of LatAccel or YawRate is being read with the wrong sign'
  }
}

/**
 * A steering ratio inferred from the data, for when the session YAML does not
 * carry one.
 *
 * The steady-state cornering equation, in HANDWHEEL angle, is
 *
 *     theta = G (L/R) + G K Ay
 *
 * so it is linear in two regressors -- the Ackermann term L*r/V and the lateral
 * acceleration -- with coefficients G and G*K. Fitting BOTH recovers the ratio
 * cleanly.
 *
 * Fitting only the Ackermann term, which is the obvious thing to try, is
 * systematically biased: the understeer contribution does not vanish, it gets
 * absorbed into the one coefficient, and the ratio comes back too large by a
 * factor of roughly (1 + K Ay R / L). The symptom is subtle and nasty -- every
 * steer angle is scaled, so the REAR axle identification stays perfect while
 * the front is wrong, and the two look like a tyre difference rather than a
 * units error. Restricting to gentle corners reduces the bias without removing
 * it, so the two-parameter fit is the fix rather than a tighter filter.
 */
export function inferSteeringRatio(
  samples: TelemetrySample[],
  wheelbase: number,
  /**
   * Cap on |Ay|, m/s^2. Generous, because the two-regressor fit no longer needs
   * to hide from the understeer term in gentle corners -- but not unlimited,
   * since a real car's K is not constant near the limit.
   */
  maxAy = 10
): number | null {
  // Normal equations for y = a*x1 + b*x2, no intercept: steer is zero when
  // both the curvature and the lateral acceleration are.
  let s11 = 0
  let s22 = 0
  let s12 = 0
  let s1y = 0
  let s2y = 0
  let n = 0

  for (const s of samples) {
    if (s.speed < 15) continue
    if (Math.abs(s.ay) > maxAy) continue
    const ackermann = (wheelbase * s.yawRate) / s.speed
    if (Math.abs(ackermann) < 5e-4) continue
    const ay = s.ay / 9.80665
    // s.steer here is still HANDWHEEL, since this runs before the division.
    s11 += ackermann * ackermann
    s22 += ay * ay
    s12 += ackermann * ay
    s1y += ackermann * s.steer
    s2y += ay * s.steer
    n++
  }

  if (n < 50) return null
  const det = s11 * s22 - s12 * s12
  // A near-singular system means the two regressors are collinear over this
  // data -- every corner taken at the same radius, say -- and the ratio cannot
  // be separated from the understeer term. Say so rather than returning the
  // biased single-regressor answer.
  if (Math.abs(det) < 1e-12 * Math.max(s11 * s22, 1e-12)) return null

  const ratio = (s1y * s22 - s2y * s12) / det
  return ratio > 1 && ratio < 40 ? ratio : null
}

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
 * At low lateral acceleration a car is close to Ackermann, so the road-wheel
 * steer is about L/R = L*r/V. Regressing handwheel angle against that gives the
 * ratio. Deliberately restricted to gentle corners, because at any real
 * cornering load the understeer term dominates and the fit would return the
 * ratio times an unknown factor.
 */
export function inferSteeringRatio(
  samples: TelemetrySample[],
  wheelbase: number,
  maxAy = 3
): number | null {
  let sxy = 0
  let sxx = 0
  let n = 0
  for (const s of samples) {
    if (s.speed < 15) continue
    if (Math.abs(s.ay) > maxAy) continue
    const ackermann = (wheelbase * s.yawRate) / s.speed
    if (Math.abs(ackermann) < 5e-4) continue
    // s.steer here is still HANDWHEEL, since this runs before the division.
    sxy += s.steer * ackermann
    sxx += ackermann * ackermann
    n++
  }
  if (n < 50 || sxx <= 0) return null
  const ratio = sxy / sxx
  return ratio > 1 && ratio < 40 ? ratio : null
}

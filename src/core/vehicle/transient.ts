/**
 * Transient stability and control -- Ch 6.
 *
 * The 2-DOF car as a second-order system. The two results worth carrying
 * around are:
 *
 *   omega_n^2 = Cf*Cr*L^2 / (m*Izz*V^2) * (1 + K*V^2/(g*L))
 *   2*zeta*omega_n = [ m*(a^2*Cf + b^2*Cr) + Izz*(Cf + Cr) ] / (m*Izz*V)
 *
 * from which: omega_n falls as 1/V (the car responds more slowly the faster it
 * goes), and omega_n -> 0 at the critical speed -- steady-state divergence and
 * dynamic instability are the same event.
 *
 * Everything here is cross-checked two ways: the closed-form modal parameters
 * above, and the eigenvalues of the state matrix A. They must agree, and the
 * app shows both so the disagreement is visible if a parameter set is pushed
 * somewhere the closed form does not hold.
 */

import { G, eig2x2, rk4, type Complex } from '../util/numeric.js'
import { derive, type BicycleVehicle } from './params.js'
import { stabilityDerivatives, stabilityFactor } from './steadyState.js'

export interface StateSpace {
  /** A matrix, row-major [[a11,a12],[a21,a22]], states [beta, r]. */
  A: [[number, number], [number, number]]
  /** B column, [b1, b2] for input delta. */
  B: [number, number]
}

/**
 * State-space form of Ch 6 §3, states x = [beta, r], input delta.
 *
 *   m*V*(betadot + r) = Y_beta*beta + Y_r*r + Y_delta*delta
 *   Izz*rdot          = N_beta*beta + N_r*r + N_delta*delta
 */
export function stateSpace(v: BicycleVehicle, speed: number): StateSpace {
  const d = stabilityDerivatives(v, speed)
  const mV = v.mass * speed
  return {
    A: [
      [d.yBeta / mV, d.yR / mV - 1],
      [d.nBeta / v.izz, d.nR / v.izz]
    ],
    B: [d.yDelta / mV, d.nDelta / v.izz]
  }
}

export interface ModalParameters {
  /** Speed these parameters were evaluated at, m/s. */
  speed: number
  /** Undamped natural frequency, rad/s. */
  omegaN: number
  /** Undamped natural frequency, Hz. */
  frequencyHz: number
  /** Damping ratio. */
  zeta: number
  /** Damped natural frequency, rad/s. NaN when overdamped. */
  omegaD: number
  /** Damped natural frequency, Hz. NaN when overdamped. */
  dampedHz: number
  /** Numerator (lead) time constant of the yaw response, s. */
  tauR: number
  /** True when both eigenvalues have negative real parts. */
  stable: boolean
  /** Eigenvalues of A, for the root-locus plot. */
  eigenvalues: [Complex, Complex]
}

/** Closed-form and eigenvalue modal parameters at a given speed. */
export function modal(v: BicycleVehicle, speed: number): ModalParameters {
  const { L } = derive(v)
  const { mass: m, izz, a, b, cf, cr } = v
  const sf = stabilityFactor(v, speed)

  const omegaNSq = ((cf * cr * L * L) / (m * izz * speed * speed)) * sf
  const omegaN = Math.sqrt(Math.abs(omegaNSq)) * Math.sign(omegaNSq || 1)
  const twoZetaOmegaN = (m * (a * a * cf + b * b * cr) + izz * (cf + cr)) / (m * izz * speed)
  const zeta = omegaN !== 0 ? twoZetaOmegaN / (2 * omegaN) : Infinity

  const ss = stateSpace(v, speed)
  const eigenvalues = eig2x2(ss.A[0][0], ss.A[0][1], ss.A[1][0], ss.A[1][1])
  const stable = eigenvalues.every((e) => e.re < 0)

  const under = zeta < 1 && omegaNSq > 0
  return {
    speed,
    omegaN,
    frequencyHz: omegaN / (2 * Math.PI),
    zeta,
    omegaD: under ? omegaN * Math.sqrt(1 - zeta * zeta) : NaN,
    dampedHz: under ? (omegaN * Math.sqrt(1 - zeta * zeta)) / (2 * Math.PI) : NaN,
    tauR: (m * a * speed) / (cr * L),
    stable,
    eigenvalues
  }
}

/**
 * Modal parameters swept over speed -- the central plot of Ch 6.
 *
 * The sweep starts at vMin rather than at zero because omega_n goes as 1/V:
 * below walking pace the closed form diverges, which is neither interesting
 * nor a regime the 2-DOF model is meant to describe.
 */
export function modalSweep(
  v: BicycleVehicle,
  vMax: number,
  n = 120,
  vMin = 5
): ModalParameters[] {
  const out: ModalParameters[] = []
  for (let i = 0; i < n; i++) out.push(modal(v, vMin + ((vMax - vMin) * i) / (n - 1)))
  return out
}

export interface StepSample {
  t: number
  /** Sideslip angle, rad. */
  beta: number
  /** Yaw rate, rad/s. */
  yawRate: number
  /** Lateral acceleration, g. */
  ay: number
}

export interface StepResponse {
  samples: StepSample[]
  /** Steady-state yaw rate, rad/s. */
  yawSteady: number
  /** Steady-state lateral acceleration, g. */
  aySteady: number
  metrics: ResponseMetrics
}

export interface ResponseMetrics {
  /** Yaw rate overshoot as a fraction of steady state (0.1 = 10%). */
  yawOvershoot: number
  /** Time to first yaw peak, s. NaN if no overshoot. */
  yawPeakTime: number
  /** Yaw rate 10-90% rise time, s. */
  yawRiseTime: number
  /** Time for yaw rate to settle within 5% and stay, s. */
  yawSettlingTime: number
  /** Time for yaw rate to reach 90% of steady state, s. */
  yawResponseTime90: number
  /** Time for lateral acceleration to reach 90% of steady state, s. */
  ayResponseTime90: number
  /**
   * Lag of lateral acceleration behind yaw rate, s -- the delay drivers
   * describe as the car "taking a set" (Ch 6 §4, §5).
   */
  ayLagBehindYaw: number
}

/**
 * Step steer response, integrated directly from the state-space model.
 *
 * Integrating rather than evaluating a closed-form second-order step keeps the
 * numerator zero (tau_r) in play automatically, which is the point of Ch 6 §4:
 * the lead term makes the initial yaw response faster than a pure second-order
 * system, and it is why lateral acceleration lags yaw rate.
 *
 * @param steer road-wheel steer angle, rad
 */
export function stepSteer(
  v: BicycleVehicle,
  speed: number,
  steer: number,
  duration = 3,
  dt = 0.001
): StepResponse {
  const ss = stateSpace(v, speed)
  const d = stabilityDerivatives(v, speed)
  const samples: StepSample[] = []

  const ayOf = (beta: number, r: number): number =>
    (d.yBeta * beta + d.yR * r + d.yDelta * steer) / v.mass / G

  rk4(
    (_t, x) => [
      ss.A[0][0] * x[0] + ss.A[0][1] * x[1] + ss.B[0] * steer,
      ss.A[1][0] * x[0] + ss.A[1][1] * x[1] + ss.B[1] * steer
    ],
    [0, 0],
    0,
    duration,
    dt,
    (t, x) => samples.push({ t, beta: x[0], yawRate: x[1], ay: ayOf(x[0], x[1]) })
  )

  const last = samples[samples.length - 1]
  const yawSteady = last.yawRate
  const aySteady = last.ay
  return {
    samples,
    yawSteady,
    aySteady,
    metrics: responseMetrics(samples, yawSteady, aySteady)
  }
}

function crossingTime(
  samples: StepSample[],
  pick: (s: StepSample) => number,
  target: number
): number {
  for (let i = 1; i < samples.length; i++) {
    const p = pick(samples[i - 1])
    const c = pick(samples[i])
    if ((p < target && c >= target) || (p > target && c <= target)) {
      const f = (target - p) / (c - p || 1)
      return samples[i - 1].t + f * (samples[i].t - samples[i - 1].t)
    }
  }
  return NaN
}

function responseMetrics(
  samples: StepSample[],
  yawSteady: number,
  aySteady: number
): ResponseMetrics {
  const sgn = Math.sign(yawSteady) || 1
  let peak = -Infinity
  let peakTime = NaN
  for (const s of samples) {
    const val = s.yawRate * sgn
    if (val > peak) {
      peak = val
      peakTime = s.t
    }
  }
  const absSteady = Math.abs(yawSteady)
  const overshoot = absSteady > 0 ? Math.max(peak / absSteady - 1, 0) : 0

  const t10 = crossingTime(samples, (s) => s.yawRate * sgn, 0.1 * absSteady)
  const t90 = crossingTime(samples, (s) => s.yawRate * sgn, 0.9 * absSteady)
  const ay90 = crossingTime(samples, (s) => s.ay * Math.sign(aySteady || 1), 0.9 * Math.abs(aySteady))

  // Settling: last time the response is outside the 5% band.
  let settling = 0
  for (const s of samples) {
    if (Math.abs(s.yawRate - yawSteady) > 0.05 * absSteady) settling = s.t
  }

  return {
    yawOvershoot: overshoot,
    yawPeakTime: overshoot > 1e-4 ? peakTime : NaN,
    yawRiseTime: t90 - t10,
    yawSettlingTime: settling,
    yawResponseTime90: t90,
    ayResponseTime90: ay90,
    ayLagBehindYaw: ay90 - t90
  }
}

// ---------------------------------------------------------------------------
// Frequency response
// ---------------------------------------------------------------------------

export interface BodePoint {
  /** Frequency, Hz. */
  hz: number
  /** Yaw rate magnitude, (rad/s) per rad of steer. */
  yawMag: number
  /** Yaw rate phase, degrees. */
  yawPhase: number
  /** Lateral acceleration magnitude, g per rad of steer. */
  ayMag: number
  /** Lateral acceleration phase, degrees. */
  ayPhase: number
}

interface Cx {
  re: number
  im: number
}

const cAdd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im })
const cMul = (a: Cx, b: Cx): Cx => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re
})
const cScale = (a: Cx, s: number): Cx => ({ re: a.re * s, im: a.im * s })
const cDiv = (a: Cx, b: Cx): Cx => {
  const den = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den }
}
const cAbs = (a: Cx): number => Math.hypot(a.re, a.im)
const cArg = (a: Cx): number => (Math.atan2(a.im, a.re) * 180) / Math.PI

/**
 * Frequency response of yaw rate and lateral acceleration to steer, computed
 * from (jwI - A)^-1 B directly. This is the swept-steer test of Ch 11 in
 * closed form.
 */
export function frequencyResponse(
  v: BicycleVehicle,
  speed: number,
  hzMin = 0.05,
  hzMax = 10,
  n = 180
): BodePoint[] {
  const ss = stateSpace(v, speed)
  const d = stabilityDerivatives(v, speed)
  const out: BodePoint[] = []

  for (let i = 0; i < n; i++) {
    const hz = hzMin * Math.pow(hzMax / hzMin, i / (n - 1))
    const w: Cx = { re: 0, im: 2 * Math.PI * hz }

    // M = jwI - A
    const m11 = cAdd(w, { re: -ss.A[0][0], im: 0 })
    const m12: Cx = { re: -ss.A[0][1], im: 0 }
    const m21: Cx = { re: -ss.A[1][0], im: 0 }
    const m22 = cAdd(w, { re: -ss.A[1][1], im: 0 })
    const det = cAdd(cMul(m11, m22), cScale(cMul(m12, m21), -1))

    // x = M^-1 B
    const bx: Cx = { re: ss.B[0], im: 0 }
    const by: Cx = { re: ss.B[1], im: 0 }
    const beta = cDiv(cAdd(cMul(m22, bx), cScale(cMul(m12, by), -1)), det)
    const r = cDiv(cAdd(cMul(m11, by), cScale(cMul(m21, bx), -1)), det)

    // Ay = (Y_beta*beta + Y_r*r + Y_delta) / m / g, with delta = 1
    const ay = cScale(
      cAdd(cAdd(cScale(beta, d.yBeta), cScale(r, d.yR)), { re: d.yDelta, im: 0 }),
      1 / (v.mass * G)
    )

    out.push({
      hz,
      yawMag: cAbs(r),
      yawPhase: cArg(r),
      ayMag: cAbs(ay),
      ayPhase: cArg(ay)
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Second-order textbook relations -- Ch 6 §2, used for the vocabulary panel
// ---------------------------------------------------------------------------

/** Overshoot of a pure second-order step response, as a fraction. */
export function secondOrderOvershoot(zeta: number): number {
  if (zeta >= 1) return 0
  return Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta))
}

/** Time to peak, s. */
export function secondOrderPeakTime(omegaN: number, zeta: number): number {
  if (zeta >= 1) return NaN
  return Math.PI / (omegaN * Math.sqrt(1 - zeta * zeta))
}

/** 5% settling time, s (the 3/(zeta*omega_n) approximation). */
export function secondOrderSettlingTime(omegaN: number, zeta: number): number {
  return 3 / (zeta * omegaN)
}

// ---------------------------------------------------------------------------
// Where the car actually goes -- the path traced by a step steer
// ---------------------------------------------------------------------------

export interface PathSample {
  t: number
  /** Earth-frame position, m. */
  x: number
  y: number
  /** Heading -- the direction the car is POINTING, rad. */
  heading: number
  /** Course -- the direction the car is TRAVELLING, rad. Equals heading + beta. */
  course: number
  yawRate: number
  /** Lateral acceleration, g. */
  ay: number
  beta: number
}

/**
 * Integrate a step response into the path the car actually traces.
 *
 * The reason to draw this rather than only plot yaw rate: the gap between
 * heading and course is what Ch 6 §4 is about. Steer input produces a yaw
 * moment immediately, so the car starts ROTATING at once -- but it is still
 * travelling in nearly the old direction until the rear axle builds slip angle
 * and the path actually bends. Seeing the nose swing while the trail stays
 * straight is the clearest possible statement of "the car takes a set".
 *
 * Forward speed is held constant, consistent with the 2-DOF model.
 */
export function trajectory(response: StepResponse, speed: number): PathSample[] {
  const out: PathSample[] = []
  let heading = 0
  let x = 0
  let y = 0

  for (let i = 0; i < response.samples.length; i++) {
    const s = response.samples[i]
    if (i > 0) {
      const prev = response.samples[i - 1]
      const dt = s.t - prev.t
      // Trapezoidal on yaw rate, then advance along the mean course.
      const newHeading = heading + ((prev.yawRate + s.yawRate) / 2) * dt
      const course = (heading + newHeading) / 2 + (prev.beta + s.beta) / 2
      x += speed * Math.cos(course) * dt
      y += speed * Math.sin(course) * dt
      heading = newHeading
    }
    out.push({
      t: s.t,
      x,
      y,
      heading,
      course: heading + s.beta,
      yawRate: s.yawRate,
      ay: s.ay,
      beta: s.beta
    })
  }
  return out
}

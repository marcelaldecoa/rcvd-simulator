/**
 * Driving and braking -- Ch 20.
 *
 * Chapter 2 gave one tyre's longitudinal force and the friction ellipse it
 * shares with lateral force. This chapter asks the vehicle-level questions:
 * which wheels drive, how torque splits between them, and how braking is
 * distributed. The constraint is always the same one -- each tyre has a
 * friction budget and both demands draw on it.
 *
 * Three results here are worth the whole chapter:
 *
 *   - The traction formulas differ only in the SIGN of one term, and that sign
 *     explains the layout of essentially every fast car ever built.
 *   - A differential's locking torque is a yaw moment, and at realistic settings
 *     it is worth about a degree of opposite lock. "The car won't rotate on
 *     exit" is usually a differential problem wearing a balance problem's
 *     clothes.
 *   - Ideal brake bias equals the instantaneous load distribution, which rises
 *     with deceleration -- so a fixed bias is correct at exactly one point on
 *     the pedal.
 */

import { G } from '../util/numeric.js'

const R2D = 180 / Math.PI

export type DriveLayout = 'rwd' | 'fwd' | 'awd'

export interface TractionGeometry {
  /** Front axle to CG, m. */
  a: number
  /** CG to rear axle, m. */
  b: number
  /** CG height, m. */
  h: number
  /** Tyre friction coefficient. */
  mu: number
}

/**
 * Maximum acceleration by layout, g -- Ch 20 §2.1 and Ex 20.1.
 *
 *     RWD:  mu (a/L) / (1 - mu h/L)
 *     FWD:  mu (b/L) / (1 + mu h/L)
 *     AWD:  mu
 *
 * The static REAR load fraction is a/L, because a is measured from the front
 * axle. The chapter warns explicitly that many texts define a and b the other
 * way round and that swapping them silently exchanges the two answers.
 *
 * Everything interesting is in the denominators. RWD's is self-reinforcing --
 * accelerating loads the driven axle -- and FWD's is self-limiting. A FWD car
 * can carry MORE static weight on its driven axle and still lose by 20%.
 */
export function tractionLimit(g: TractionGeometry, layout: DriveLayout): number {
  const L = g.a + g.b
  if (L <= 0) return 0
  const muH = (g.mu * g.h) / L
  switch (layout) {
    case 'awd':
      return g.mu
    case 'rwd': {
      const denom = 1 - muH
      // Past mu*h = L the rear "lifts the front" faster than it loads itself
      // and the linear model runs away. Physically the car wheelies first.
      return denom > 0 ? (g.mu * (g.a / L)) / denom : Infinity
    }
    case 'fwd':
      return (g.mu * (g.b / L)) / (1 + muH)
  }
}

/** Load on the driven axle at its own traction limit, as a fraction of total weight. */
export function drivenAxleLoadFraction(g: TractionGeometry, layout: DriveLayout): number {
  const L = g.a + g.b
  if (L <= 0) return 0
  if (layout === 'awd') return 1
  const ax = tractionLimit(g, layout)
  if (!isFinite(ax)) return 1
  const transfer = (ax * g.h) / L
  return layout === 'rwd' ? g.a / L + transfer : g.b / L - transfer
}

export interface LayoutComparison {
  layout: DriveLayout
  maxAcceleration: number
  staticDrivenFraction: number
  drivenFractionAtLimit: number
  /** Percentage points of load the acceleration recruits (or loses). */
  recruited: number
}

/** All three layouts side by side -- Ex 20.1 and 20.2 in one object. */
export function compareLayouts(g: TractionGeometry): LayoutComparison[] {
  const L = g.a + g.b
  return (['rwd', 'fwd', 'awd'] as DriveLayout[]).map((layout) => {
    const staticDriven = layout === 'awd' ? 1 : layout === 'rwd' ? g.a / L : g.b / L
    const atLimit = drivenAxleLoadFraction(g, layout)
    return {
      layout,
      maxAcceleration: tractionLimit(g, layout),
      staticDrivenFraction: staticDriven,
      drivenFractionAtLimit: atLimit,
      recruited: atLimit - staticDriven
    }
  })
}

// ---------------------------------------------------------------------------
// Differentials -- Ch 20 §3
// ---------------------------------------------------------------------------

export type DiffType = 'open' | 'lsd' | 'spool'

export interface DiffSetup {
  /** Constant locking torque from spring preload, N.m. Acts in every phase. */
  preload: number
  /** Locking torque as a fraction of input torque, from the drive ramp. */
  driveRamp: number
  /** The same on the overrun side. */
  coastRamp: number
}

export interface DiffState {
  /** Locking torque -- the DIFFERENCE the diff can sustain across the outputs. */
  lockTorque: number
  torqueHigh: number
  torqueLow: number
  /** Torque bias ratio at this input torque. */
  tbr: number
}

/**
 * Locking torque and the split it produces -- Ex 20.3.
 *
 *     T_lock = T_preload + k(ramp) * T_input
 *
 * TBR is not a constant of the differential: preload contributes a FIXED
 * component, so at low input torque the diff behaves nearly like a spool (the
 * exercise gets TBR = 39 at 100 N.m) and only at high torque does it asymptote
 * toward (1+k)/(1-k). That is exactly why too much preload makes a car refuse
 * to rotate on a trailing throttle and in slow corners -- and why the
 * diagnostic rule is that a problem on BOTH entry and exit means preload.
 */
export function diffState(setup: DiffSetup, inputTorque: number, coast = false): DiffState {
  const ramp = coast ? setup.coastRamp : setup.driveRamp
  const lockTorque = Math.min(setup.preload + ramp * inputTorque, inputTorque)
  const torqueHigh = (inputTorque + lockTorque) / 2
  const torqueLow = (inputTorque - lockTorque) / 2
  return {
    lockTorque,
    torqueHigh,
    torqueLow,
    tbr: torqueLow > 1e-9 ? torqueHigh / torqueLow : Infinity
  }
}

/** The TBR a ramp asymptotes to once preload is negligible. */
export function asymptoticTbr(ramp: number): number {
  return ramp < 1 ? (1 + ramp) / (1 - ramp) : Infinity
}

/**
 * Total drive torque a differential can transmit -- Ex 20.4.
 *
 * Open: twice the weaker wheel, because torque is always split equally, so the
 * lightly loaded inside rear caps the whole car.
 * LSD: solve T_total - 2*T_low = preload + ramp*T_total for T_total.
 * Spool: simply the sum, since the wheels are rigidly connected.
 */
export function maxDriveTorque(
  type: DiffType,
  innerLimit: number,
  outerLimit: number,
  setup?: DiffSetup
): number {
  switch (type) {
    case 'open':
      return 2 * innerLimit
    case 'spool':
      return innerLimit + outerLimit
    case 'lsd': {
      if (!setup) return 2 * innerLimit
      const denom = 1 - setup.driveRamp
      if (denom <= 0) return innerLimit + outerLimit
      const total = (2 * innerLimit + setup.preload) / denom
      // The outside wheel still cannot exceed its own limit.
      return Math.min(total, innerLimit + outerLimit)
    }
  }
}

export interface DiffYaw {
  forceInside: number
  forceOutside: number
  /** Yaw moment, N.m. Positive here means it OPPOSES the turn. */
  yawMoment: number
  /** The steer angle that would produce the same moment, deg. */
  equivalentSteer: number
}

/**
 * The yaw moment a locked differential makes -- Ch 20 §3.2 and Ex 20.5.
 *
 * When the diff locks, the faster outside wheel is held back and the inside
 * wheel is driven forward, so the longitudinal force difference across the
 * track pushes the car OUT of the turn. More locking on power means more
 * traction and more understeer on exit, and the two cannot be separated without
 * an electronically controlled diff.
 *
 * The magnitude is the thing: at the exercise's numbers this is worth nearly a
 * full degree of opposite lock, on a car whose total steer in a fast corner
 * might be three to five degrees.
 */
export function diffYawMoment(opts: {
  torqueInside: number
  torqueOutside: number
  rollingRadius: number
  track: number
  /** Yaw moment per degree of steer, N.m/deg -- Ch 8's control derivative. */
  controlDerivative?: number
}): DiffYaw {
  const forceInside = opts.torqueInside / opts.rollingRadius
  const forceOutside = opts.torqueOutside / opts.rollingRadius
  const yawMoment = ((forceInside - forceOutside) * opts.track) / 2
  return {
    forceInside,
    forceOutside,
    yawMoment,
    equivalentSteer: opts.controlDerivative ? yawMoment / opts.controlDerivative : 0
  }
}

// ---------------------------------------------------------------------------
// Brakes -- Ch 20 §4
// ---------------------------------------------------------------------------

/**
 * Ideal front brake bias -- Ch 20 §4.1 and Ex 20.6.
 *
 *     %front = b/L + Ax h/L
 *
 * It equals the instantaneous load distribution, as it must: putting both axles
 * at the same friction utilisation IS matching the load split. And because it
 * RISES with deceleration, a fixed bias is correct at exactly one point on the
 * pedal.
 */
export function idealBrakeBias(frontWeightFraction: number, hOverL: number, ax: number): number {
  return frontWeightFraction + ax * hOverL
}

export interface BrakingState {
  idealBias: number
  frontLoad: number
  rearLoad: number
  transfer: number
  /** Utilisation of each axle's available friction at the actual bias. */
  frontUtilisation: number
  rearUtilisation: number
  /** Which axle locks first at this bias and deceleration. */
  locksFirst: 'front' | 'rear' | 'together'
  /** How far the actual bias sits from ideal, in bias points. */
  biasError: number
}

/**
 * What a chosen bias actually does at a given deceleration -- Ch 20 §4.2.
 *
 * The asymmetry that decides every real bias setting: fronts locking first
 * means the car pushes straight, which is slow but stable; rears locking first
 * means the rear axle loses its lateral capability entirely and the car spins.
 * Every road car and most race cars therefore sit forward of ideal on purpose.
 */
export function brakingState(opts: {
  weight: number
  frontWeightFraction: number
  hOverL: number
  ax: number
  /** Actual front bias, 0-1. */
  bias: number
  mu: number
}): BrakingState {
  const transfer = opts.weight * opts.ax * opts.hOverL
  const frontLoad = opts.weight * opts.frontWeightFraction + transfer
  const rearLoad = opts.weight * (1 - opts.frontWeightFraction) - transfer
  const demand = opts.weight * opts.ax
  const frontDemand = demand * opts.bias
  const rearDemand = demand * (1 - opts.bias)
  const frontUtilisation = frontLoad > 0 ? frontDemand / (opts.mu * frontLoad) : Infinity
  const rearUtilisation = rearLoad > 0 ? rearDemand / (opts.mu * rearLoad) : Infinity
  const ideal = idealBrakeBias(opts.frontWeightFraction, opts.hOverL, opts.ax)
  return {
    idealBias: ideal,
    frontLoad,
    rearLoad,
    transfer,
    frontUtilisation,
    rearUtilisation,
    locksFirst:
      Math.abs(frontUtilisation - rearUtilisation) < 1e-9
        ? 'together'
        : frontUtilisation > rearUtilisation
          ? 'front'
          : 'rear',
    biasError: opts.bias - ideal
  }
}

/** The deceleration at which a fixed bias is exactly ideal. */
export function balancedDeceleration(
  bias: number,
  frontWeightFraction: number,
  hOverL: number
): number {
  return hOverL > 0 ? (bias - frontWeightFraction) / hOverL : 0
}

/** Kinetic energy dissipated between two speeds, J -- Ch 20 §4.3. */
export function brakingEnergy(mass: number, speedFrom: number, speedTo: number): number {
  return 0.5 * mass * (speedFrom * speedFrom - speedTo * speedTo)
}

export interface DiscTemperatures {
  totalEnergy: number
  intoDiscs: number
  perFrontDisc: number
  perRearDisc: number
  frontRise: number
  rearRise: number
}

/**
 * Disc temperature rise from one braking event -- Ex 20.7.
 *
 *     dT = E / (m_disc * c_p)
 *
 * Nearly 200 K on the fronts in a single stop, from a warm baseline of 300 C.
 * The design margin is set by the CUMULATIVE thermal state over a lap rather
 * than the single event, which is why brake duct sizing is a lap-time
 * parameter and not only a durability one.
 */
export function discTemperatureRise(opts: {
  mass: number
  speedFrom: number
  speedTo: number
  discMass: number
  specificHeat?: number
  /** Fraction of the energy that reaches the discs at all. */
  intoDiscFraction?: number
  /** Front share of the braking. */
  frontShare?: number
}): DiscTemperatures {
  const cp = opts.specificHeat ?? 480
  const intoFraction = opts.intoDiscFraction ?? 0.9
  const frontShare = opts.frontShare ?? 0.55

  const totalEnergy = brakingEnergy(opts.mass, opts.speedFrom, opts.speedTo)
  const intoDiscs = totalEnergy * intoFraction
  const perFrontDisc = (intoDiscs * frontShare) / 2
  const perRearDisc = (intoDiscs * (1 - frontShare)) / 2
  const capacity = opts.discMass * cp
  return {
    totalEnergy,
    intoDiscs,
    perFrontDisc,
    perRearDisc,
    frontRise: capacity > 0 ? perFrontDisc / capacity : 0,
    rearRise: capacity > 0 ? perRearDisc / capacity : 0
  }
}

/** Peak power dissipated, W, if the stop takes this long. */
export function brakingPower(energy: number, seconds: number): number {
  return seconds > 0 ? energy / seconds : 0
}

/** Time to brake between two speeds at a constant deceleration, s. */
export function brakingTime(speedFrom: number, speedTo: number, ax: number): number {
  return ax > 0 ? (speedFrom - speedTo) / (ax * G) : 0
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** A plate LSD at a typical circuit setting. */
export const CIRCUIT_DIFF: DiffSetup = {
  preload: 60,
  driveRamp: 0.35,
  coastRamp: 0.2
}

/** The setting that makes a car refuse to rotate anywhere. */
export const OVER_PRELOADED_DIFF: DiffSetup = {
  preload: 300,
  driveRamp: 0.45,
  coastRamp: 0.4
}

/** Degrees, exported for callers that want the module's own conversion. */
export const RAD_TO_DEG = R2D

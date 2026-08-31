/**
 * Load sensitivity (Ch 2 §3) -- "the most important nonlinearity in the book".
 *
 * Two equivalent parameterisations are used in the course notes:
 *
 *  (a) The linearised friction form of Ch 2 §3:
 *        mu_y(Fz) = mu0 * (1 - k_mu * (Fz - Fz0) / Fz0)
 *
 *  (b) The quadratic force form used in Exercises 2.2 and 2.6:
 *        Fy(Fz) = mu0' * Fz - c * Fz^2
 *
 * They are the same curve. (b) is the one that yields the central result
 *        axle loss = 2 c * Delta^2
 * -- quadratic in load transfer and independent of nominal load.
 */

export interface LoadSensitivity {
  /** Peak friction coefficient at the reference load. */
  mu0: number
  /** Reference load, N. */
  fz0: number
  /**
   * Fractional fall in mu per unit fractional rise in load above fz0.
   * k_mu = 0.1 means mu falls 10% when load doubles.
   */
  kMu: number
}

/** mu_y(Fz), clamped to stay positive. Ch 2 §3. */
export function muAtLoad(ls: LoadSensitivity, fz: number): number {
  const mu = ls.mu0 * (1 - ls.kMu * (fz - ls.fz0) / ls.fz0)
  return Math.max(mu, 1e-6)
}

/** Peak lateral force at a given load, N. */
export function peakFyAtLoad(ls: LoadSensitivity, fz: number): number {
  return muAtLoad(ls, fz) * fz
}

/**
 * Convert the (mu0, fz0, kMu) form to the quadratic coefficients of
 * Fy = A*Fz - c*Fz^2 used in Exercises 2.2 and 2.6.
 */
export function quadraticCoefficients(ls: LoadSensitivity): { a: number; c: number } {
  // Fy = mu0*(1 - kMu*(Fz-Fz0)/Fz0)*Fz = mu0*(1+kMu)*Fz - (mu0*kMu/Fz0)*Fz^2
  return { a: ls.mu0 * (1 + ls.kMu), c: (ls.mu0 * ls.kMu) / ls.fz0 }
}

/**
 * Fit the quadratic load-sensitivity model to two (Fz, Fy) measurements.
 * This is Exercise 2.2 as a reusable function.
 */
export function fitFromTwoPoints(
  fz1: number,
  fy1: number,
  fz2: number,
  fy2: number,
  referenceLoad?: number
): LoadSensitivity {
  const mu1 = fy1 / fz1
  const mu2 = fy2 / fz2
  const k = (mu2 - mu1) / (fz2 - fz1) // d(mu)/d(Fz), negative
  const a = mu1 - k * fz1 // mu at zero load
  const fz0 = referenceLoad ?? (fz1 + fz2) / 2
  const mu0 = a + k * fz0
  // mu(Fz) = mu0*(1 - kMu*(Fz-fz0)/fz0)  =>  d(mu)/dFz = -mu0*kMu/fz0 = k
  const kMu = (-k * fz0) / mu0
  return { mu0, fz0, kMu }
}

export interface AxleCapacity {
  /** Total axle lateral force with the given load transfer, N. */
  fyAxle: number
  /** Axle lateral force with zero load transfer, N. */
  fyAxleNoTransfer: number
  /** Absolute loss, N (positive = capacity lost). */
  loss: number
  /** Loss as a fraction of the no-transfer capacity. */
  lossFraction: number
  /** Outer tire load, N. */
  fzOuter: number
  /** Inner tire load, N. */
  fzInner: number
}

/**
 * Axle lateral capacity under lateral load transfer (Ch 2 §3, Consequence 1).
 *
 * @param ls        load sensitivity model
 * @param fzNominal per-tire load with no transfer, N
 * @param delta     load transferred from inner to outer tire, N
 *
 * Inner-wheel lift is handled: once the inner load reaches zero it contributes
 * nothing and cannot go negative.
 */
export function axleCapacity(
  ls: LoadSensitivity,
  fzNominal: number,
  delta: number
): AxleCapacity {
  const d = Math.abs(delta)
  const fzOuter = fzNominal + d
  const fzInner = Math.max(fzNominal - d, 0)
  const fyAxle = peakFyAtLoad(ls, fzOuter) + (fzInner > 0 ? peakFyAtLoad(ls, fzInner) : 0)
  const fyAxleNoTransfer = 2 * peakFyAtLoad(ls, fzNominal)
  const loss = fyAxleNoTransfer - fyAxle
  return {
    fyAxle,
    fyAxleNoTransfer,
    loss,
    lossFraction: fyAxleNoTransfer > 0 ? loss / fyAxleNoTransfer : 0,
    fzOuter,
    fzInner
  }
}

/**
 * The closed-form loss 2*c*Delta^2 of Exercise 2.6.
 * Valid while the inner tire stays on the ground; diverges from
 * axleCapacity() once it lifts.
 */
export function quadraticLoss(ls: LoadSensitivity, delta: number): number {
  const { c } = quadraticCoefficients(ls)
  return 2 * c * delta * delta
}

/** Load at which the inner tire lifts, N. */
export function liftOffTransfer(fzNominal: number): number {
  return fzNominal
}

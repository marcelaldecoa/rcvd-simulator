/** Small numeric helpers shared by the physics modules. No dependencies. */

export const DEG = Math.PI / 180
export const G = 9.80665

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

export function toDeg(rad: number): number {
  return rad / DEG
}

export function toRad(deg: number): number {
  return deg * DEG
}

/** n evenly spaced values from a to b inclusive. */
export function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a]
  const out = new Array<number>(n)
  const step = (b - a) / (n - 1)
  for (let i = 0; i < n; i++) out[i] = a + i * step
  return out
}

/** Sample f over [a,b] into {x,y} pairs. */
export function sample(
  a: number,
  b: number,
  n: number,
  f: (x: number) => number
): { x: number; y: number }[] {
  return linspace(a, b, n).map((x) => ({ x, y: f(x) }))
}

/**
 * Maximise a unimodal f on [a,b] by golden-section search.
 * Returns the argmax and the maximum value.
 */
export function goldenMax(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-9,
  maxIter = 200
): { at: number; value: number } {
  const phi = (Math.sqrt(5) - 1) / 2
  let lo = a
  let hi = b
  let c = hi - phi * (hi - lo)
  let d = lo + phi * (hi - lo)
  let fc = f(c)
  let fd = f(d)
  for (let i = 0; i < maxIter && hi - lo > tol; i++) {
    if (fc > fd) {
      hi = d
      d = c
      fd = fc
      c = hi - phi * (hi - lo)
      fc = f(c)
    } else {
      lo = c
      c = d
      fc = fd
      d = lo + phi * (hi - lo)
      fd = f(d)
    }
  }
  const at = (lo + hi) / 2
  return { at, value: f(at) }
}

/**
 * Find a root of f on [a,b] by bisection. Returns null if f(a) and f(b)
 * do not bracket a sign change.
 */
export function bisect(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-10,
  maxIter = 200
): number | null {
  let fa = f(a)
  let fb = f(b)
  if (fa === 0) return a
  if (fb === 0) return b
  if (fa * fb > 0) return null
  let lo = a
  let hi = b
  for (let i = 0; i < maxIter && hi - lo > tol; i++) {
    const mid = 0.5 * (lo + hi)
    const fm = f(mid)
    if (fm === 0) return mid
    if (fa * fm < 0) {
      hi = mid
      fb = fm
    } else {
      lo = mid
      fa = fm
    }
  }
  void fb
  return 0.5 * (lo + hi)
}

/** Central-difference derivative. */
export function ddx(f: (x: number) => number, x: number, h = 1e-6): number {
  return (f(x + h) - f(x - h)) / (2 * h)
}

export interface Complex {
  re: number
  im: number
}

/** Eigenvalues of a real 2x2 matrix [[a,b],[c,d]]. */
export function eig2x2(a: number, b: number, c: number, d: number): [Complex, Complex] {
  const tr = a + d
  const det = a * d - b * c
  const disc = tr * tr - 4 * det
  if (disc >= 0) {
    const s = Math.sqrt(disc)
    return [
      { re: (tr + s) / 2, im: 0 },
      { re: (tr - s) / 2, im: 0 }
    ]
  }
  const s = Math.sqrt(-disc)
  return [
    { re: tr / 2, im: s / 2 },
    { re: tr / 2, im: -s / 2 }
  ]
}

/**
 * Fixed-step RK4 integration of xdot = f(t, x) for a vector state.
 * Calls `onStep` at every step including t = t0.
 */
export function rk4(
  f: (t: number, x: number[]) => number[],
  x0: number[],
  t0: number,
  t1: number,
  dt: number,
  onStep: (t: number, x: number[]) => void
): number[] {
  const n = x0.length
  let x = x0.slice()
  let t = t0
  onStep(t, x)
  const steps = Math.max(1, Math.round((t1 - t0) / dt))
  const add = (u: number[], v: number[], s: number): number[] => {
    const out = new Array<number>(n)
    for (let i = 0; i < n; i++) out[i] = u[i] + s * v[i]
    return out
  }
  for (let s = 0; s < steps; s++) {
    const k1 = f(t, x)
    const k2 = f(t + dt / 2, add(x, k1, dt / 2))
    const k3 = f(t + dt / 2, add(x, k2, dt / 2))
    const k4 = f(t + dt, add(x, k3, dt))
    const next = new Array<number>(n)
    for (let i = 0; i < n; i++) next[i] = x[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
    x = next
    t = t0 + (s + 1) * dt
    onStep(t, x)
  }
  return x
}

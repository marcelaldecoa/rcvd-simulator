/**
 * Tire size scaling -- the staggered-tire question of Ch 5 §4.
 *
 * "A rear-heavy car with correspondingly larger rear tires can be perfectly
 * neutral or understeering. This is the analytical justification for staggered
 * tire sizes." Modelling both axles with the same tire throws that away, so the
 * app carries a size factor for the rear.
 *
 * A larger tire of the same construction and pressure carries proportionally
 * more load at the same friction coefficient and has proportionally more
 * cornering stiffness, so the reference load, stiffness and slip stiffness all
 * scale linearly. Contact length scales as the square root, since patch area
 * grows with load while the aspect ratio of the patch stays roughly constant.
 */

import type { MagicFormulaParams } from './magicFormula.js'

/**
 * @param s size factor. 1.0 leaves the tire unchanged; 1.3 is a tire 30%
 *          larger in load capacity and cornering stiffness.
 */
export function scaleTire(p: MagicFormulaParams, s: number): MagicFormulaParams {
  if (s === 1) return p
  return {
    ...p,
    name: `${p.name ?? 'Tire'} ×${s.toFixed(2)}`,
    lateral: { ...p.lateral, fz0: p.lateral.fz0 * s },
    longitudinal: { ...p.longitudinal, fz0: p.longitudinal.fz0 * s },
    caMax: p.caMax * s,
    fzAtPeakStiffness: p.fzAtPeakStiffness * s,
    slipStiffness: p.slipStiffness * s,
    contactLength: p.contactLength * Math.sqrt(s)
  }
}

export interface GripScale {
  /** Multiplier on peak friction. */
  mu?: number
  /** Multiplier on cornering and slip stiffness. */
  stiffness?: number
}

/**
 * Scale a tire's grip without changing its size.
 *
 * Size scaling (above) and grip scaling are different physical things and the
 * distinction matters pedagogically. A larger tire of the same construction
 * behaves like the same tire at a lower fraction of its capacity: at a fixed
 * load its cornering stiffness barely moves, and the gain shows up at the
 * LIMIT. Grip scaling instead represents compound, temperature, pressure,
 * wear or surface -- things that change how much force the rubber makes at
 * every slip angle, and so move the linear balance as well as the limit.
 *
 * This is the primitive the Ch 2 lab's balance control uses, and the one a
 * conditions model would build on.
 */
export function scaleTireGrip(p: MagicFormulaParams, g: GripScale): MagicFormulaParams {
  const mu = g.mu ?? 1
  const stiffness = g.stiffness ?? 1
  if (mu === 1 && stiffness === 1) return p
  return {
    ...p,
    lateral: { ...p.lateral, mu0: p.lateral.mu0 * mu },
    longitudinal: { ...p.longitudinal, mu0: p.longitudinal.mu0 * mu },
    caMax: p.caMax * stiffness,
    slipStiffness: p.slipStiffness * stiffness
  }
}

/**
 * The formula catalogue -- the equations of the course, made playable.
 *
 * The point of this module is not to compute anything new. Everything here is
 * already in the models. The point is to expose each equation as an object you
 * can render, substitute numbers into, sweep one variable of, and decompose
 * into terms -- so a learner can hold the formula in their hands rather than
 * watch it produce a number.
 *
 * BECAUSE it duplicates arithmetic that lives elsewhere, every formula that has
 * a counterpart in the models is tested against that counterpart. A playground
 * that quietly drifts from the simulator would be worse than no playground.
 */

import { G } from '../util/numeric.js'

export interface FormulaVar {
  key: string
  /** Symbol, as LaTeX without delimiters. */
  tex: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  value: number
  /** Digits to show when substituted. */
  digits?: number
}

export interface FormulaTerm {
  label: string
  value: number
  /** Colour hint for the breakdown bar. */
  tone?: 'front' | 'rear' | 'accent' | 'warn'
}

export interface Formula {
  id: string
  title: string
  /** Where it comes from, e.g. "Ch 5 §4". */
  reference: string
  chapter: number
  /** The equation, as LaTeX. */
  tex: string
  /** One line on what it is for. */
  meaning: string
  vars: FormulaVar[]
  /** Evaluate with the given variable values. */
  evaluate: (v: Record<string, number>) => number
  /** The same equation with numbers in place of symbols, as LaTeX. */
  substituted: (v: Record<string, number>) => string
  /** Unit of the result. */
  unit: string
  resultTex: string
  digits?: number
  /**
   * Optional decomposition into additive terms, for formulas that are a sum or
   * difference. This is where "why is it this value" usually lives.
   */
  terms?: (v: Record<string, number>) => FormulaTerm[]
  /**
   * What those terms decompose. Usually the result itself, but not always:
   * Exercise 3.5's cornering speed is most usefully broken into the two halves
   * of its DENOMINATOR, because the interesting behaviour is that difference
   * closing on zero. Stated explicitly so the integrity test knows which
   * breakdowns must sum to the answer and which must not.
   */
  termsDescribe?: 'result' | 'denominator'
  /** Heading for the breakdown panel. */
  termsLabel?: string
  /** What to notice when sweeping. */
  insight: string
  /** Variables whose sweep is most instructive; the first is the default. */
  sweep: string[]
}

/**
 * Format a number for substitution into LaTeX.
 *
 * Scientific notation only past a million: a cornering stiffness of 143564 is
 * far easier to recognise written out than as 1.44x10^5, and these are numbers
 * the reader is meant to connect back to their own car.
 */
function n(x: number, digits = 3): string {
  if (!isFinite(x)) return '\\infty'
  const abs = Math.abs(x)
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) {
    const exp = Math.floor(Math.log10(abs))
    return `${(x / 10 ** exp).toFixed(2)}\\times10^{${exp}}`
  }
  return x.toFixed(digits)
}

const v = (
  key: string,
  tex: string,
  label: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  value: number,
  digits = 2
): FormulaVar => ({ key, tex, label, unit, min, max, step, value, digits })

export const FORMULAS: Formula[] = [
  // ------------------------------------------------------------- Chapter 2
  {
    id: 'load-sensitivity-loss',
    title: 'Axle capacity lost to load transfer',
    reference: 'Ch 2 §3 · Exercise 2.6',
    chapter: 2,
    tex: '\\text{Loss} = 2c\\,\\Delta^2',
    meaning:
      'How much lateral force an axle gives up when its load is split unevenly between the two tyres.',
    vars: [
      v('c', 'c', 'Load-sensitivity coefficient', '1/N', 1e-5, 1.2e-4, 1e-6, 4.65e-5, 7),
      v('d', '\\Delta', 'Load transferred', 'N', 0, 2500, 10, 800, 0)
    ],
    evaluate: ({ c, d }) => 2 * c * d * d,
    substituted: ({ c, d }) => `2 \\times ${n(c, 7)} \\times ${n(d, 0)}^2`,
    unit: 'N',
    resultTex: '\\text{Loss}',
    digits: 1,
    insight:
      'Quadratic, and independent of the nominal load. Small transfers are almost free; large ones are very expensive. Doubling the transfer quadruples the loss — which is why doubling roll stiffness at one end more than doubles the balance effect.',
    sweep: ['d', 'c']
  },
  {
    id: 'friction-ellipse',
    title: 'Friction ellipse',
    reference: 'Ch 2 §6',
    chapter: 2,
    tex: 'F_y = F_{y,\\max}\\sqrt{1 - \\left(\\frac{F_x}{F_{x,\\max}}\\right)^2}',
    meaning: 'Lateral force still available while using part of the friction budget longitudinally.',
    vars: [
      v('fx', 'F_x', 'Longitudinal force in use', 'N', 0, 6000, 25, 3000, 0),
      v('fxmax', 'F_{x,\\max}', 'Peak longitudinal force', 'N', 1000, 8000, 50, 5000, 0),
      v('fymax', 'F_{y,\\max}', 'Peak lateral force', 'N', 1000, 8000, 50, 4500, 0)
    ],
    evaluate: ({ fx, fxmax, fymax }) =>
      fymax * Math.sqrt(Math.max(1 - (Math.min(Math.abs(fx), fxmax) / fxmax) ** 2, 0)),
    substituted: ({ fx, fxmax, fymax }) =>
      `${n(fymax, 0)}\\sqrt{1 - \\left(\\frac{${n(fx, 0)}}{${n(fxmax, 0)}}\\right)^2}`,
    unit: 'N',
    resultTex: 'F_y',
    digits: 0,
    insight:
      'The curve is flat near the top and steep near the edge. Braking at half of capability costs only 13% of cornering; the last 10% of cornering costs over half the braking. Trail braking is cheap early and expensive late.',
    sweep: ['fx', 'fxmax']
  },
  {
    id: 'full-slide-angle',
    title: 'Full-slide slip angle (brush model)',
    reference: 'Ch 2 §2.3',
    chapter: 2,
    tex: '\\tan\\alpha_{sl} = \\dfrac{3\\mu F_z}{C_\\alpha}',
    meaning: 'The slip angle at which the sliding zone has consumed the whole contact patch.',
    vars: [
      v('mu', '\\mu', 'Peak friction coefficient', '', 0.6, 2.2, 0.01, 1.6),
      v('fz', 'F_z', 'Vertical load', 'N', 500, 8000, 50, 4000, 0),
      v('ca', 'C_\\alpha', 'Cornering stiffness', 'N/rad', 20000, 200000, 500, 91673, 0)
    ],
    evaluate: ({ mu, fz, ca }) => (Math.atan((3 * mu * fz) / ca) * 180) / Math.PI,
    substituted: ({ mu, fz, ca }) =>
      `\\arctan\\dfrac{3 \\times ${n(mu, 2)} \\times ${n(fz, 0)}}{${n(ca, 0)}}`,
    unit: 'deg',
    resultTex: '\\alpha_{sl}',
    digits: 2,
    insight:
      'This is where the force curve peaks, and it explains the peak rather than fitting it. A stiffer tyre reaches full slide sooner; more load or more friction pushes it later.',
    sweep: ['ca', 'fz', 'mu']
  },
  {
    id: 'relaxation-lag',
    title: 'Tyre relaxation lag',
    reference: 'Ch 2 §8',
    chapter: 2,
    tex: '\\tau = \\dfrac{\\sigma_r}{V}',
    meaning: 'Lateral force builds with distance travelled, not instantly — so the lag shrinks with speed.',
    vars: [
      v('sigma', '\\sigma_r', 'Relaxation length', 'm', 0.1, 1.0, 0.01, 0.5),
      v('speed', 'V', 'Speed', 'm/s', 5, 80, 0.5, 40, 1)
    ],
    evaluate: ({ sigma, speed }) => (sigma / speed) * 1000,
    substituted: ({ sigma, speed }) => `\\dfrac{${n(sigma, 2)}}{${n(speed, 1)}}`,
    unit: 'ms',
    resultTex: '\\tau',
    digits: 1,
    insight:
      'Reaching 95% of steady force takes about 3τ. At racing speed this is a few tens of milliseconds and safely ignorable for handling; at low speed, in a slalom, it is not.',
    sweep: ['speed', 'sigma']
  },

  // ------------------------------------------------------------- Chapter 5
  {
    id: 'understeer-gradient',
    title: 'Understeer gradient',
    reference: 'Ch 5 §4',
    chapter: 5,
    tex: 'K = \\dfrac{W_f}{C_f} - \\dfrac{W_r}{C_r}',
    meaning:
      'The single most useful result in vehicle dynamics: extra steer needed per g, and the sign of the car’s balance.',
    vars: [
      v('wf', 'W_f', 'Front axle load', 'N', 1000, 12000, 25, 3318, 0),
      v('cf', 'C_f', 'Front axle cornering stiffness', 'N/rad', 30000, 300000, 500, 143564, 0),
      v('wr', 'W_r', 'Rear axle load', 'N', 1000, 12000, 25, 3548, 0),
      v('cr', 'C_r', 'Rear axle cornering stiffness', 'N/rad', 30000, 300000, 500, 157500, 0)
    ],
    evaluate: ({ wf, cf, wr, cr }) => ((wf / cf - wr / cr) * 180) / Math.PI,
    substituted: ({ wf, cf, wr, cr }) =>
      `\\dfrac{${n(wf, 0)}}{${n(cf, 0)}} - \\dfrac{${n(wr, 0)}}{${n(cr, 0)}}`,
    unit: 'deg/g',
    resultTex: 'K',
    digits: 4,
    terms: ({ wf, cf, wr, cr }) => [
      { label: 'Front compliance  Wf/Cf', value: ((wf / cf) * 180) / Math.PI, tone: 'front' },
      { label: 'Rear compliance  Wr/Cr', value: ((wr / cr) * 180) / Math.PI, tone: 'rear' }
    ],
    insight:
      'It is a DIFFERENCE of two compliances, so it is small compared with either. That is why balance is delicate: two large numbers nearly cancelling. Note it is not weight distribution alone — a rear-heavy car with bigger rear tyres can be perfectly neutral.',
    sweep: ['cr', 'cf', 'wf']
  },
  {
    id: 'cornering-equation',
    title: 'Steady-state cornering equation',
    reference: 'Ch 5 §4',
    chapter: 5,
    tex: '\\delta = \\dfrac{L}{R} + K A_y',
    meaning: 'How much steer a corner needs: the geometric part, plus the tyre part.',
    vars: [
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 3.0),
      v('R', 'R', 'Corner radius', 'm', 15, 300, 1, 60, 0),
      v('K', 'K', 'Understeer gradient', 'deg/g', -3, 6, 0.01, 0.5),
      v('ay', 'A_y', 'Lateral acceleration', 'g', 0, 2, 0.01, 1.0)
    ],
    evaluate: ({ L, R, K, ay }) => (L / R) * (180 / Math.PI) + K * ay,
    substituted: ({ L, R, K, ay }) =>
      `\\dfrac{${n(L, 2)}}{${n(R, 0)}} + ${n(K, 2)} \\times ${n(ay, 2)}`,
    unit: 'deg',
    resultTex: '\\delta',
    digits: 3,
    terms: ({ L, R, K, ay }) => [
      { label: 'Ackermann  L/R', value: (L / R) * (180 / Math.PI), tone: 'accent' },
      { label: 'Tyre slip  K·Ay', value: K * ay, tone: 'warn' }
    ],
    insight:
      'Plot steer against lateral acceleration and the SLOPE is K while the intercept is the Ackermann angle. That is the entire content of the skid-pad test, and why it is the highest information-per-effort test in the field.',
    sweep: ['ay', 'K', 'R']
  },
  {
    id: 'stability-factor',
    title: 'Stability factor',
    reference: 'Ch 5 §6',
    chapter: 5,
    tex: '\\text{SF} = 1 + \\dfrac{K V^2}{gL}',
    meaning: 'The denominator shared by every steady-state response gain — the fingerprint of K.',
    vars: [
      v('K', 'K', 'Understeer gradient', 'rad/g', -0.05, 0.09, 0.0005, 0.0006, 4),
      v('speed', 'V', 'Speed', 'm/s', 5, 90, 0.5, 40, 1),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 3.0)
    ],
    evaluate: ({ K, speed, L }) => 1 + (K * speed * speed) / (G * L),
    substituted: ({ K, speed, L }) =>
      `1 + \\dfrac{${n(K, 4)} \\times ${n(speed, 1)}^2}{${n(G, 3)} \\times ${n(L, 2)}}`,
    unit: '',
    resultTex: '\\text{SF}',
    digits: 4,
    insight:
      'It appears in yaw gain, lateral acceleration gain, path curvature gain — and again inside the yaw natural frequency of Ch 6. When it reaches zero the car diverges, and that is the SAME event as the natural frequency reaching zero. One number, two chapters.',
    sweep: ['speed', 'K']
  },
  {
    id: 'yaw-gain',
    title: 'Yaw velocity gain',
    reference: 'Ch 5 §6',
    chapter: 5,
    tex: '\\dfrac{r}{\\delta} = \\dfrac{V/L}{1 + KV^2/(gL)}',
    meaning: 'Yaw rate produced per unit of steer — how eagerly the car rotates.',
    vars: [
      v('speed', 'V', 'Speed', 'm/s', 5, 90, 0.5, 40, 1),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 3.0),
      v('K', 'K', 'Understeer gradient', 'rad/g', -0.05, 0.09, 0.0005, 0.0112, 4)
    ],
    evaluate: ({ speed, L, K }) => speed / L / (1 + (K * speed * speed) / (G * L)),
    substituted: ({ speed, L, K }) =>
      `\\dfrac{${n(speed, 1)}/${n(L, 2)}}{1 + \\dfrac{${n(K, 4)} \\times ${n(speed, 1)}^2}{${n(G, 3)} \\times ${n(L, 2)}}}`,
    unit: '1/s',
    resultTex: 'r/\\delta',
    digits: 4,
    insight:
      'For a neutral car this is V/L and rises forever. For an understeering car it PEAKS at the characteristic speed and declines after. For an oversteering car it goes to infinity at the critical speed. Sweep speed and watch which of the three you have.',
    sweep: ['speed', 'K']
  },
  {
    id: 'characteristic-speed',
    title: 'Characteristic and critical speed',
    reference: 'Ch 5 §5',
    chapter: 5,
    tex: 'V = \\sqrt{\\dfrac{gL}{|K|}}',
    meaning:
      'Understeering car: the speed needing twice the Ackermann angle. Oversteering car: the speed at which it diverges.',
    vars: [
      v('K', '|K|', 'Understeer gradient magnitude', 'rad/g', 0.001, 0.09, 0.0005, 0.0112, 4),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 2.6)
    ],
    evaluate: ({ K, L }) => Math.sqrt((G * L) / Math.max(K, 1e-9)),
    substituted: ({ K, L }) => `\\sqrt{\\dfrac{${n(G, 3)} \\times ${n(L, 2)}}{${n(K, 4)}}}`,
    unit: 'm/s',
    resultTex: 'V',
    digits: 2,
    insight:
      'The same expression serves both, which is the point: the two are one phenomenon seen from either side of neutral. A nearly neutral car has an enormous characteristic speed — the balance is delicate, not that the car is fast.',
    sweep: ['K', 'L']
  },
  {
    id: 'neutral-steer-point',
    title: 'Neutral steer point',
    reference: 'Ch 5 §8',
    chapter: 5,
    tex: 'x_{NSP} = \\dfrac{C_r L}{C_f + C_r}',
    meaning: 'Where a side force produces pure sideslip and no yaw — the car’s aerodynamic centre.',
    vars: [
      v('cf', 'C_f', 'Front axle cornering stiffness', 'N/rad', 30000, 300000, 500, 143564, 0),
      v('cr', 'C_r', 'Rear axle cornering stiffness', 'N/rad', 30000, 300000, 500, 157500, 0),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 3.0)
    ],
    evaluate: ({ cf, cr, L }) => (cr * L) / (cf + cr),
    substituted: ({ cf, cr, L }) =>
      `\\dfrac{${n(cr, 0)} \\times ${n(L, 2)}}{${n(cf, 0)} + ${n(cr, 0)}}`,
    unit: 'm aft of front axle',
    resultTex: 'x_{NSP}',
    digits: 3,
    insight:
      'Static margin is the distance from the CG to this point, as a fraction of wheelbase. Positive means stable. It is the aircraft neutral-point construction transferred to a car, and it says the same thing as K in a different language.',
    sweep: ['cr', 'cf']
  },

  // ------------------------------------------------------------- Chapter 6
  {
    id: 'yaw-natural-frequency',
    title: 'Yaw natural frequency',
    reference: 'Ch 6 §3',
    chapter: 6,
    tex: '\\omega_n = \\sqrt{\\dfrac{C_f C_r L^2}{m I_{zz} V^2}\\left(1 + \\dfrac{KV^2}{gL}\\right)}',
    meaning: 'How quickly the car responds in yaw — and it falls as speed rises.',
    vars: [
      v('cf', 'C_f', 'Front axle cornering stiffness', 'N/rad', 30000, 300000, 500, 80000, 0),
      v('cr', 'C_r', 'Rear axle cornering stiffness', 'N/rad', 30000, 300000, 500, 90000, 0),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 2.6),
      v('m', 'm', 'Mass', 'kg', 400, 2000, 5, 1000, 0),
      v('izz', 'I_{zz}', 'Yaw inertia', 'kg·m²', 300, 4000, 10, 1400, 0),
      v('speed', 'V', 'Speed', 'm/s', 5, 90, 0.5, 30, 1),
      v('K', 'K', 'Understeer gradient', 'rad/g', -0.05, 0.09, 0.0005, 0.0112, 4)
    ],
    evaluate: ({ cf, cr, L, m, izz, speed, K }) => {
      const sf = 1 + (K * speed * speed) / (G * L)
      return Math.sqrt(Math.max(((cf * cr * L * L) / (m * izz * speed * speed)) * sf, 0))
    },
    substituted: ({ cf, cr, L, m, izz, speed, K }) =>
      `\\sqrt{\\dfrac{${n(cf, 0)} \\times ${n(cr, 0)} \\times ${n(L, 2)}^2}{${n(m, 0)} \\times ${n(izz, 0)} \\times ${n(speed, 1)}^2} \\times ${n(1 + (K * speed * speed) / (G * L), 4)}}`,
    unit: 'rad/s',
    resultTex: '\\omega_n',
    digits: 3,
    insight:
      'Note the V² in the denominator: the car gets SLOWER to respond the faster it goes. Counterintuitive but fundamental, and the reason high-speed corrections must be started earlier. Reducing yaw inertia raises it — the case for mid-engine layouts.',
    sweep: ['speed', 'izz', 'K']
  },
  {
    id: 'lead-time-constant',
    title: 'Yaw response lead time constant',
    reference: 'Ch 6 §4',
    chapter: 6,
    tex: '\\tau_r = \\dfrac{m a V}{C_r L}',
    meaning:
      'The numerator zero that makes initial yaw faster than a pure second-order system — and makes lateral acceleration lag it.',
    vars: [
      v('m', 'm', 'Mass', 'kg', 400, 2000, 5, 1000, 0),
      v('a', 'a', 'CG to front axle', 'm', 0.8, 2.2, 0.01, 1.25),
      v('speed', 'V', 'Speed', 'm/s', 5, 90, 0.5, 30, 1),
      v('cr', 'C_r', 'Rear axle cornering stiffness', 'N/rad', 30000, 300000, 500, 90000, 0),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 2.6)
    ],
    evaluate: ({ m, a, speed, cr, L }) => ((m * a * speed) / (cr * L)) * 1000,
    substituted: ({ m, a, speed, cr, L }) =>
      `\\dfrac{${n(m, 0)} \\times ${n(a, 2)} \\times ${n(speed, 1)}}{${n(cr, 0)} \\times ${n(L, 2)}}`,
    unit: 'ms',
    resultTex: '\\tau_r',
    digits: 1,
    insight:
      'It grows with speed and with a forward CG. Physically: steer makes front force and therefore a yaw moment instantly, while the path only bends once the rear axle has built slip angle. That delay is what drivers call the car "taking a set".',
    sweep: ['speed', 'cr', 'a']
  },

  // ------------------------------------------------------------- Chapter 3
  {
    id: 'dynamic-pressure',
    title: 'Dynamic pressure',
    reference: 'Ch 3 §3',
    chapter: 3,
    tex: 'q = \tfrac{1}{2}\rho V^2',
    meaning: 'The pressure the airflow can convert into force — everything aerodynamic scales with it.',
    vars: [
      v('rho', '\rho', 'Air density', 'kg/m³', 0.8, 1.35, 0.005, 1.225, 3),
      v('speed', 'V', 'Speed', 'm/s', 0, 100, 0.5, 55.6, 1)
    ],
    evaluate: ({ rho, speed }) => 0.5 * rho * speed * speed,
    substituted: ({ rho, speed }) => `\tfrac{1}{2} \times ${n(rho, 3)} \times ${n(speed, 1)}^2`,
    unit: 'Pa',
    resultTex: 'q',
    digits: 0,
    insight:
      'At 200 km/h this is about 1900 Pa — under 2% of atmospheric pressure. Aerodynamic forces are small pressure differences acting over large areas, which is why a few percent error in a pressure measurement is a large error in a force.',
    sweep: ['speed', 'rho']
  },
  {
    id: 'downforce',
    title: 'Downforce',
    reference: 'Ch 3 §6',
    chapter: 3,
    tex: 'L = \tfrac{1}{2}\rho V^2 C_L A',
    meaning: 'Vertical load added by the bodywork — load without mass, which is the whole trick.',
    vars: [
      v('rho', '\rho', 'Air density', 'kg/m³', 0.8, 1.35, 0.005, 1.225, 3),
      v('speed', 'V', 'Speed', 'm/s', 0, 100, 0.5, 60, 1),
      v('cla', 'C_L A', 'Downforce coefficient × area', 'm²', 0, 7, 0.05, 3.0)
    ],
    evaluate: ({ rho, speed, cla }) => 0.5 * rho * speed * speed * cla,
    substituted: ({ rho, speed, cla }) =>
      `\tfrac{1}{2} \times ${n(rho, 3)} \times ${n(speed, 1)}^2 \times ${n(cla, 2)}`,
    unit: 'N',
    resultTex: 'L',
    digits: 0,
    insight:
      'It grows with the SQUARE of speed while the car weight does not grow at all. That single asymmetry is why a wing works, why grip becomes speed-dependent, and why aero balance produces a handling balance that drifts along a straight.',
    sweep: ['speed', 'cla', 'rho']
  },
  {
    id: 'aero-cornering-speed',
    title: 'Cornering speed with downforce',
    reference: 'Ch 3, Exercise 3.5',
    chapter: 3,
    tex: 'V = \sqrt{\dfrac{\mu m g}{\dfrac{m}{R} - \dfrac{\mu\rho C_L A}{2}}}',
    meaning: 'The speed a corner can be taken at once downforce is in the balance.',
    vars: [
      v('mu', '\mu', 'Friction coefficient', '', 0.8, 2.2, 0.01, 1.5),
      v('m', 'm', 'Mass', 'kg', 400, 1600, 5, 750, 0),
      v('R', 'R', 'Corner radius', 'm', 30, 400, 1, 200, 0),
      v('rho', '\rho', 'Air density', 'kg/m³', 0.8, 1.35, 0.005, 1.225, 3),
      v('cla', 'C_L A', 'Downforce coefficient × area', 'm²', 0, 4.0, 0.05, 3.0)
    ],
    evaluate: ({ mu, m, R, rho, cla }) => {
      const denom = m / R - (mu * rho * cla) / 2
      return denom <= 0 ? 999 : Math.sqrt((mu * m * G) / denom)
    },
    substituted: ({ mu, m, R, rho, cla }) =>
      `\sqrt{\dfrac{${n(mu, 2)} \times ${n(m, 0)} \times ${n(G, 2)}}{${n(m / R, 3)} - ${n((mu * rho * cla) / 2, 3)}}}`,
    unit: 'm/s',
    resultTex: 'V',
    digits: 1,
    terms: ({ m, R, mu, rho, cla }) => [
      { label: 'Demand  m/R', value: m / R, tone: 'warn' },
      { label: 'Downforce relief  μρCₗA/2', value: (mu * rho * cla) / 2, tone: 'accent' }
    ],
    termsDescribe: 'denominator',
    termsLabel: 'The denominator — watch it close on zero',
    insight:
      'Watch the denominator, not the answer. It is a DIFFERENCE, and as downforce grows it approaches zero and the speed runs away. Ch 3 calls that near-singularity the mathematical signature of the ground-effect era. It is also an artefact of assuming one fixed μ — with load-sensitive tyres the simulator never diverges.',
    sweep: ['cla', 'R', 'mu']
  },

  // ------------------------------------------------------------ Chapter 18
  {
    id: 'lateral-load-transfer',
    title: 'Total lateral load transfer',
    reference: 'Ch 18 §5',
    chapter: 18,
    tex: '\\Delta F_z = \\dfrac{W A_y h}{t}',
    meaning: 'Fixed by statics. Nothing on the setup sheet changes it except CG height and track.',
    vars: [
      v('w', 'W', 'Total weight', 'N', 4000, 20000, 50, 6866, 0),
      v('ay', 'A_y', 'Lateral acceleration', 'g', 0, 2.5, 0.01, 1.5),
      v('h', 'h', 'CG height', 'm', 0.15, 0.7, 0.005, 0.3, 3),
      v('t', 't', 'Track width', 'm', 1.2, 2.0, 0.01, 1.575)
    ],
    evaluate: ({ w, ay, h, t }) => (w * ay * h) / t,
    substituted: ({ w, ay, h, t }) =>
      `\\dfrac{${n(w, 0)} \\times ${n(ay, 2)} \\times ${n(h, 3)}}{${n(t, 2)}}`,
    unit: 'N',
    resultTex: '\\Delta F_z',
    digits: 0,
    insight:
      'Anti-roll bars do not appear here, and that is the whole lesson: bars change the DISTRIBUTION between axles, never the total. To reduce the total you must lower the CG, widen the track, or take weight out.',
    sweep: ['h', 'ay', 't']
  },
  {
    id: 'longitudinal-load-transfer',
    title: 'Longitudinal load transfer',
    reference: 'Ch 18 §6',
    chapter: 18,
    tex: '\\Delta F_z = \\dfrac{W A_x h}{L}',
    meaning: 'Load moved between axles under braking or power.',
    vars: [
      v('w', 'W', 'Total weight', 'N', 4000, 20000, 50, 6866, 0),
      v('ax', 'A_x', 'Longitudinal acceleration', 'g', -2, 1.5, 0.01, -1.0),
      v('h', 'h', 'CG height', 'm', 0.15, 0.7, 0.005, 0.3, 3),
      v('L', 'L', 'Wheelbase', 'm', 1.8, 3.6, 0.01, 3.0)
    ],
    evaluate: ({ w, ax, h, L }) => (w * ax * h) / L,
    substituted: ({ w, ax, h, L }) =>
      `\\dfrac{${n(w, 0)} \\times ${n(ax, 2)} \\times ${n(h, 3)}}{${n(L, 2)}}`,
    unit: 'N',
    resultTex: '\\Delta F_z',
    digits: 0,
    insight:
      'Same structure as lateral transfer but divided by WHEELBASE, not track — and with no distribution parameter at all, because there is only one axle pair fore-and-aft. Anti-dive changes how it is reacted, never how much there is.',
    sweep: ['ax', 'h', 'L']
  }
]

export function formulaById(id: string): Formula | undefined {
  return FORMULAS.find((f) => f.id === id)
}

/** Current values of a formula's variables, as a plain record. */
export function defaultValues(f: Formula): Record<string, number> {
  return Object.fromEntries(f.vars.map((x) => [x.key, x.value]))
}

export interface FormulaSweepPoint {
  x: number
  y: number
}

/**
 * Evaluate the formula across the range of one variable, holding the rest.
 * This is the chart that shows *why* the answer is what it is.
 */
export function sweepFormula(
  f: Formula,
  values: Record<string, number>,
  key: string,
  n = 120
): FormulaSweepPoint[] {
  const spec = f.vars.find((x) => x.key === key)
  if (!spec) return []
  const out: FormulaSweepPoint[] = []
  for (let i = 0; i <= n; i++) {
    const x = spec.min + ((spec.max - spec.min) * i) / n
    const y = f.evaluate({ ...values, [key]: x })
    out.push({ x, y: isFinite(y) ? y : NaN })
  }
  return out
}

/**
 * Local sensitivity of the result to each variable, as the change produced by
 * a 10% move in that variable. Answers "which of these actually matters here?"
 */
export function localSensitivity(
  f: Formula,
  values: Record<string, number>
): { key: string; tex: string; label: string; delta: number }[] {
  const base = f.evaluate(values)
  return f.vars
    .map((spec) => {
      const span = spec.max - spec.min
      const step = 0.1 * (Math.abs(values[spec.key]) || span * 0.1)
      const up = Math.min(values[spec.key] + step, spec.max)
      const down = Math.max(values[spec.key] - step, spec.min)
      const delta = (f.evaluate({ ...values, [spec.key]: up }) -
        f.evaluate({ ...values, [spec.key]: down })) / 2
      void base
      return { key: spec.key, tex: spec.tex, label: spec.label, delta }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/**
 * A top-down view of the car in a steady turn.
 *
 * This is the intuition anchor for the whole app. Every other chart is an
 * abstraction; this one shows the thing itself -- where the car is pointing,
 * where it is actually going, and how hard each axle is working to hold the
 * corner.
 *
 * The single idea it exists to make visible: understeer and oversteer are
 * nothing more than "which axle is running the bigger slip angle". When the
 * front arc is wider than the rear arc, the car understeers. That is the whole
 * definition, and it takes one look rather than a paragraph.
 *
 * Geometry (all exact, all from the bicycle model of Ch 5):
 *
 *   beta_f = delta - alpha_f      velocity direction at the front axle
 *   beta_r = -alpha_r             velocity direction at the rear axle
 *   alpha_f - alpha_r = delta - L/R
 *
 * Angles are drawn multiplied by an exaggeration factor, because real slip
 * angles are 1-6 degrees and would be invisible. Because EVERY angle is
 * multiplied by the same factor, the construction stays internally consistent
 * -- the arcs still add up. The factor is always shown on screen.
 */

import { toDeg } from '@core/util/numeric.js'

export interface CarDiagramProps {
  /** CG to front axle, m. */
  a: number
  /** CG to rear axle, m. */
  b: number
  /** Track width, m -- for drawing only. */
  track?: number
  /** Road-wheel steer angle, rad. Positive = left turn. */
  steer: number
  /** Front slip angle, rad. */
  alphaF: number
  /** Rear slip angle, rad. */
  alphaR: number
  /** Sideslip angle at the CG, rad. */
  beta: number
  /** Path radius, m. */
  radius: number
  /** Front axle lateral force, N. */
  fyFront: number
  /** Rear axle lateral force, N. */
  fyRear: number
  /** Force used for arrow scaling, N -- typically the larger axle capacity. */
  forceScale: number
  /** Angle exaggeration factor. */
  exaggeration?: number
  /** Fraction of each axle's grip in use, 0-1, for the saturation shading. */
  usageFront?: number
  usageRear?: number
  height?: number
}

const W = 560
const H = 470
const CX = 322
const CY = 250
const PX_PER_M = 66

/** Unit vector for an angle measured from "straight ahead", positive = left. */
function dir(theta: number): [number, number] {
  return [-Math.sin(theta), -Math.cos(theta)]
}

function pointAt(cx: number, cy: number, r: number, theta: number): [number, number] {
  const [dx, dy] = dir(theta)
  return [cx + dx * r, cy + dy * r]
}

/** Wedge from angle a0 to a1 at radius r -- the visual slip angle. */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = pointAt(cx, cy, r, a0)
  const [x1, y1] = pointAt(cx, cy, r, a1)
  // In screen space (y down) an increasing CCW angle sweeps clockwise.
  const sweep = a1 > a0 ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 ${sweep} ${x1} ${y1} Z`
}

function ray(cx: number, cy: number, len: number, theta: number): string {
  const [x, y] = pointAt(cx, cy, len, theta)
  return `M ${cx} ${cy} L ${x} ${y}`
}

export function CarDiagram({
  a,
  b,
  track = 1.6,
  steer,
  alphaF,
  alphaR,
  beta,
  radius,
  fyFront,
  fyRear,
  forceScale,
  exaggeration = 5,
  usageFront = 0,
  usageRear = 0,
  height = H
}: CarDiagramProps): React.JSX.Element {
  const k = exaggeration

  // Everything scaled by the same factor, so the construction stays consistent.
  const dDraw = steer * k
  const bfDraw = (steer - alphaF) * k // velocity direction at the front axle
  const brDraw = -alphaR * k // velocity direction at the rear axle
  const betaDraw = beta * k

  const frontY = CY - a * PX_PER_M
  const rearY = CY + b * PX_PER_M
  const halfTrack = (track / 2) * PX_PER_M
  const bodyHalfWidth = halfTrack * 0.78

  const rayLen = 92
  const arcR = 40

  const forceLen = (f: number): number =>
    Math.min((Math.abs(f) / Math.max(forceScale, 1)) * 74, 92)

  // Path arc, drawn with the same exaggeration so it agrees with the angles.
  const rDraw = Math.max((radius / k) * PX_PER_M, 60)

  const saturationColor = (u: number): string =>
    u > 0.98 ? '#ff6b6b' : u > 0.9 ? '#ffcc55' : u > 0.7 ? '#6ee787' : '#3d4b5c'

  const Wheel = ({
    x,
    y,
    angle,
    color
  }: {
    x: number
    y: number
    angle: number
    color: string
  }): React.JSX.Element => (
    <rect
      x={x - 5}
      y={y - 13}
      width={10}
      height={26}
      rx={2.5}
      fill={color}
      transform={`rotate(${(-angle * 180) / Math.PI} ${x} ${y})`}
    />
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} style={{ width: '100%', display: 'block' }}>
      <defs>
        <marker id="arrowF" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#5aa9ff" />
        </marker>
        <marker id="arrowR" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff9f4d" />
        </marker>
        <marker id="arrowV" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#4dd6c1" />
        </marker>
      </defs>

      {/* The path the car is actually following. */}
      <path
        d={`M ${CX - rDraw + rDraw * Math.cos(-0.85)} ${CY + rDraw * Math.sin(-0.85)}
            A ${rDraw} ${rDraw} 0 0 1 ${CX - rDraw + rDraw * Math.cos(0.85)} ${CY + rDraw * Math.sin(0.85)}`}
        fill="none"
        stroke="#2b3a4a"
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />
      <text x={16} y={H - 12} fill="#5f6f80" fontSize={10} fontFamily="var(--mono)">
        path radius {radius > 900 ? '∞' : radius.toFixed(0) + ' m'} · angles shown ×{k.toFixed(1)}
      </text>

      {/* ---- car body, drawn along its own centreline (nose up) ---- */}
      <g>
        <rect
          x={CX - bodyHalfWidth}
          y={frontY - 34}
          width={bodyHalfWidth * 2}
          height={rearY - frontY + 62}
          rx={16}
          fill="#18222e"
          stroke="#31445a"
          strokeWidth={1.5}
        />
        {/* axle lines */}
        <line
          x1={CX - halfTrack}
          y1={frontY}
          x2={CX + halfTrack}
          y2={frontY}
          stroke="#31445a"
          strokeWidth={1.5}
        />
        <line
          x1={CX - halfTrack}
          y1={rearY}
          x2={CX + halfTrack}
          y2={rearY}
          stroke="#31445a"
          strokeWidth={1.5}
        />

        {/* grip-usage bars beside each axle */}
        <rect
          x={CX + halfTrack + 12}
          y={frontY - 13}
          width={6}
          height={26}
          rx={3}
          fill="#1d2733"
        />
        <rect
          x={CX + halfTrack + 12}
          y={frontY + 13 - 26 * Math.min(usageFront, 1)}
          width={6}
          height={26 * Math.min(usageFront, 1)}
          rx={3}
          fill={saturationColor(usageFront)}
        />
        <rect
          x={CX + halfTrack + 12}
          y={rearY - 13}
          width={6}
          height={26}
          rx={3}
          fill="#1d2733"
        />
        <rect
          x={CX + halfTrack + 12}
          y={rearY + 13 - 26 * Math.min(usageRear, 1)}
          width={6}
          height={26 * Math.min(usageRear, 1)}
          rx={3}
          fill={saturationColor(usageRear)}
        />

        <Wheel x={CX - halfTrack} y={frontY} angle={dDraw} color="#456177" />
        <Wheel x={CX + halfTrack} y={frontY} angle={dDraw} color="#456177" />
        <Wheel x={CX - halfTrack} y={rearY} angle={0} color="#456177" />
        <Wheel x={CX + halfTrack} y={rearY} angle={0} color="#456177" />
      </g>

      {/* ---- front axle: heading vs travel ---- */}
      <g>
        <path
          d={arcPath(CX, frontY, arcR, dDraw, bfDraw)}
          fill="#5aa9ff"
          fillOpacity={0.28}
          stroke="none"
        />
        {/* where the wheel points */}
        <path
          d={ray(CX, frontY, rayLen, dDraw)}
          stroke="#5aa9ff"
          strokeWidth={1.6}
          strokeDasharray="5 4"
          fill="none"
        />
        {/* where it is actually going */}
        <path
          d={ray(CX, frontY, rayLen, bfDraw)}
          stroke="#5aa9ff"
          strokeWidth={2.2}
          fill="none"
          markerEnd="url(#arrowF)"
        />
        {/* lateral force */}
        <path
          d={ray(CX, frontY, forceLen(fyFront), dDraw + Math.PI / 2)}
          stroke="#5aa9ff"
          strokeWidth={5}
          strokeOpacity={0.55}
          fill="none"
          markerEnd="url(#arrowF)"
        />
        <text
          x={pointAt(CX, frontY, arcR + 16, (dDraw + bfDraw) / 2)[0]}
          y={pointAt(CX, frontY, arcR + 16, (dDraw + bfDraw) / 2)[1]}
          fill="#5aa9ff"
          fontSize={13}
          fontWeight={650}
          textAnchor="middle"
          fontFamily="var(--mono)"
        >
          αf {toDeg(alphaF).toFixed(1)}°
        </text>
      </g>

      {/* ---- rear axle ---- */}
      <g>
        <path
          d={arcPath(CX, rearY, arcR, 0, brDraw)}
          fill="#ff9f4d"
          fillOpacity={0.28}
          stroke="none"
        />
        <path
          d={ray(CX, rearY, rayLen, 0)}
          stroke="#ff9f4d"
          strokeWidth={1.6}
          strokeDasharray="5 4"
          fill="none"
        />
        <path
          d={ray(CX, rearY, rayLen, brDraw)}
          stroke="#ff9f4d"
          strokeWidth={2.2}
          fill="none"
          markerEnd="url(#arrowR)"
        />
        <path
          d={ray(CX, rearY, forceLen(fyRear), Math.PI / 2)}
          stroke="#ff9f4d"
          strokeWidth={5}
          strokeOpacity={0.55}
          fill="none"
          markerEnd="url(#arrowR)"
        />
        <text
          x={pointAt(CX, rearY, arcR + 18, brDraw / 2)[0]}
          y={pointAt(CX, rearY, arcR + 18, brDraw / 2)[1] + 12}
          fill="#ff9f4d"
          fontSize={13}
          fontWeight={650}
          textAnchor="middle"
          fontFamily="var(--mono)"
        >
          αr {toDeg(alphaR).toFixed(1)}°
        </text>
      </g>

      {/* ---- CG: sideslip between centreline and travel ---- */}
      <g>
        <path
          d={arcPath(CX, CY, 26, 0, betaDraw)}
          fill="#4dd6c1"
          fillOpacity={0.22}
          stroke="none"
        />
        <path
          d={ray(CX, CY, 74, betaDraw)}
          stroke="#4dd6c1"
          strokeWidth={2.2}
          fill="none"
          markerEnd="url(#arrowV)"
        />
        <circle cx={CX} cy={CY} r={4.5} fill="#dbe4ee" />
        <text
          x={CX + 10}
          y={CY + 26}
          fill="#4dd6c1"
          fontSize={11.5}
          fontFamily="var(--mono)"
        >
          β {toDeg(beta).toFixed(2)}°
        </text>
      </g>

      {/* ---- legend ---- */}
      <g fontSize={10.5} fontFamily="var(--sans)">
        <line x1={16} y1={20} x2={38} y2={20} stroke="#8b9bad" strokeWidth={1.6} strokeDasharray="5 4" />
        <text x={44} y={23.5} fill="#8b9bad">
          where the wheel points
        </text>
        <line x1={16} y1={38} x2={38} y2={38} stroke="#8b9bad" strokeWidth={2.2} />
        <text x={44} y={41.5} fill="#8b9bad">
          where it is actually going
        </text>
        <line x1={16} y1={56} x2={38} y2={56} stroke="#8b9bad" strokeWidth={5} strokeOpacity={0.55} />
        <text x={44} y={59.5} fill="#8b9bad">
          lateral force from the tyres
        </text>
        {/* A miniature of the construction, so "the shaded angle" needs no
            explaining: two rays with the angle between them filled in. */}
        <g transform="translate(16 68)">
          <path d="M 0 0 L 26 -9 L 26 0 Z" fill="#4dd6c1" fillOpacity={0.32} />
          <path d="M 0 0 L 28 -10" stroke="#8b9bad" strokeWidth={1.4} strokeDasharray="4 3" />
          <path d="M 0 0 L 28 0" stroke="#8b9bad" strokeWidth={2} />
        </g>
        <text x={52} y={71} fill="#dbe4ee">
          the shaded angle between them <tspan fill="#8b9bad">= the slip angle</tspan>
        </text>
      </g>

      <text x={W - 16} y={20} fill="#5f6f80" fontSize={10} textAnchor="end" fontFamily="var(--mono)">
        steer {toDeg(steer).toFixed(2)}°
      </text>
    </svg>
  )
}

/**
 * Plain-language reading of a trim state.
 *
 * The numbers are already on screen; what a learner needs is the sentence a
 * race engineer would say about them.
 */
export function describeBalance(
  alphaF: number,
  alphaR: number,
  beta: number,
  usageFront: number,
  usageRear: number
): { verdict: string; tone: 'front' | 'rear' | 'ok'; detail: string; attitude: string } {
  const diff = toDeg(alphaF - alphaR)
  const tone = Math.abs(diff) < 0.15 ? 'ok' : diff > 0 ? 'front' : 'rear'
  const verdict =
    tone === 'ok' ? 'Neutral' : tone === 'front' ? 'Understeer — pushing' : 'Oversteer — loose'

  const detail =
    tone === 'ok'
      ? 'Both axles are running the same slip angle. The car is following the Ackermann angle: exactly the steer the geometry alone would ask for.'
      : tone === 'front'
        ? `The front is running ${Math.abs(diff).toFixed(2)}° more slip than the rear. You have to add that much extra lock beyond the geometric angle to hold the corner — that difference IS the understeer.`
        : `The rear is running ${Math.abs(diff).toFixed(2)}° more slip than the front. The car is rotating more than you asked for, so you take lock OUT. Push far enough and the steer needed goes negative: opposite lock.`

  const limiting = usageFront > usageRear ? 'front' : 'rear'
  const worst = Math.max(usageFront, usageRear)
  const attitude =
    (toDeg(beta) > 0.05
      ? 'The nose is pointing outside the corner — typical below the tangent speed. '
      : toDeg(beta) < -0.05
        ? 'The nose is pointing into the corner, the attitude of a car being driven quickly. '
        : '') +
    (worst > 0.98
      ? `The ${limiting} axle is at its limit — this is as much lateral acceleration as the car has.`
      : worst > 0.9
        ? `The ${limiting} axle is at ${(worst * 100).toFixed(0)}% of its grip and will run out first.`
        : `Grip in hand at both ends; the ${limiting} axle is working hardest at ${(worst * 100).toFixed(0)}%.`)

  return { verdict, tone, detail, attitude }
}

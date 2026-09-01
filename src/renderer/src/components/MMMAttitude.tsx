/**
 * The car as the Moment Method holds it -- Ch 8 §2.
 *
 * The map's two inputs are an attitude, not a manoeuvre, and that is the part
 * people find strange. This draws the constrained test itself: the car is
 * travelling in a STRAIGHT LINE (r = 0, so the path never bends), yawed to
 * sideslip β, with the wheels turned to δ, and something outside the car is
 * holding it there. The forces it makes and the moment it makes are the two
 * numbers plotted opposite.
 *
 * Unlike the steady-cornering diagram, the angles here are drawn TRUE. β and δ
 * on this map run to ten degrees or more, so there is nothing to exaggerate --
 * and seeing an honest ten degrees of yaw is part of the point.
 */

import { toDeg } from '@core/util/numeric.js'

const W = 360
const H = 300
const CX = 180
const CY = 150
const PX_PER_M = 46

export interface MMMAttitudeProps {
  /** CG to front axle, m. */
  a: number
  /** CG to rear axle, m. */
  b: number
  track?: number
  /** Sideslip angle, rad. */
  beta: number
  /** Road-wheel steer angle, rad. */
  steer: number
  /** Axle lateral forces, N. */
  fyFront: number
  fyRear: number
  /** Yaw moment, N.m. */
  yawMoment: number
  /** Force that maps to a full-length arrow, N. */
  forceScale: number
  /** Yaw moment that maps to a full sweep, N.m. */
  momentScale: number
  height?: number
}

/** Rotate (dx, dy) by theta, screen coords with y down, positive theta = left. */
function rot(dx: number, dy: number, theta: number): [number, number] {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [dx * c + dy * s, -dx * s + dy * c]
}

export function MMMAttitude({
  a,
  b,
  track = 1.6,
  beta,
  steer,
  fyFront,
  fyRear,
  yawMoment,
  forceScale,
  momentScale,
  height = H
}: MMMAttitudeProps): React.JSX.Element {
  // The car is yawed by -beta from the (straight) velocity direction: beta is
  // measured from the car's centreline TO the velocity vector.
  const psi = -beta
  const af = a * PX_PER_M
  const br = b * PX_PER_M
  const half = (track / 2) * PX_PER_M

  /** A point given in car-body coords (forward +, left +), in px. */
  const P = (fwd: number, left: number): [number, number] => {
    const [dx, dy] = rot(-left, -fwd, psi)
    return [CX + dx, CY + dy]
  }

  const [fx, fy] = P(af, 0)
  const [rx, ry] = P(-br, 0)
  const [flx, fly] = P(af, half)
  const [frx, fry] = P(af, -half)
  const [rlx, rly] = P(-br, half)
  const [rrx, rry] = P(-br, -half)

  /** A wheel: a short bar at the given body point, turned by `angle` from the body. */
  const wheel = (px: number, py: number, angle: number): string => {
    const [dx, dy] = rot(0, -1, psi + angle)
    const len = 15
    return `M ${px - dx * len} ${py - dy * len} L ${px + dx * len} ${py + dy * len}`
  }

  /** Lateral force arrow at a body point: perpendicular to the car, +Fy to the left. */
  const forceArrow = (
    px: number,
    py: number,
    force: number
  ): { path: string; tip: [number, number] } => {
    const mag = (Math.abs(force) / Math.max(forceScale, 1)) * 78
    const sign = force >= 0 ? 1 : -1
    const [dx, dy] = rot(-sign, 0, psi)
    return {
      path: `M ${px} ${py} L ${px + dx * mag} ${py + dy * mag}`,
      tip: [px + dx * mag, py + dy * mag]
    }
  }

  const fArrow = forceArrow(fx, fy, fyFront)
  const rArrow = forceArrow(rx, ry, fyRear)

  // Yaw moment as an arc around the CG. A stub arc on its own says nothing --
  // is 900 N.m a lot? -- so it is drawn against a faint FULL arc representing
  // everything this car can generate. The comparison is the information.
  const FULL = 2.4
  const mr = 44
  const arc = (sweep: number, sign: number): string => {
    const end: [number, number] = [
      CX + mr * Math.cos(-sign * sweep),
      CY + mr * Math.sin(-sign * sweep)
    ]
    return `M ${CX + mr} ${CY} A ${mr} ${mr} 0 ${sweep > Math.PI ? 1 : 0} ${
      sign > 0 ? 0 : 1
    } ${end[0]} ${end[1]}`
  }
  const fraction = Math.min(Math.abs(yawMoment) / Math.max(momentScale, 1), 1)
  const dirSign = yawMoment >= 0 ? 1 : -1
  const arcPath = arc(fraction * FULL, dirSign)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} style={{ display: 'block', width: '100%' }}>
      {/*
        One marker per colour. `currentColor` inside a <marker> resolves against
        the marker's own inherited colour, not the shape that references it, so
        a single shared arrowhead comes out the wrong colour on every arrow.
      */}
      <defs>
        {[
          ['v', '#dbe4ee'],
          ['f', '#5aa9ff'],
          ['r', '#ff9f4d'],
          ['n-pos', '#6ee787'],
          ['n-neg', '#ff6b6b']
        ].map(([id, colour]) => (
          <marker
            key={id}
            id={`mmm-arrow-${id}`}
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 z" fill={colour} />
          </marker>
        ))}
      </defs>

      {/* the path: straight, because r = 0 */}
      <line x1={CX} y1={H - 6} x2={CX} y2={10} stroke="#3a4756" strokeWidth={1.5} strokeDasharray="6 5" />
      <text className="chart-tick" x={CX + 7} y={20} fill="#5f6f80">
        path (straight — r = 0)
      </text>

      {/* velocity */}
      <g>
        <line
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - 74}
          stroke="#dbe4ee"
          strokeWidth={2}
          markerEnd="url(#mmm-arrow-v)"
        />
        <text className="chart-tick" x={CX + 6} y={CY - 62} fill="#dbe4ee">
          V
        </text>
      </g>

      {/* the car */}
      <g>
        <line x1={fx} y1={fy} x2={rx} y2={ry} stroke="#8b9bad" strokeWidth={2.4} />
        <line x1={flx} y1={fly} x2={frx} y2={fry} stroke="#8b9bad" strokeWidth={1.6} />
        <line x1={rlx} y1={rly} x2={rrx} y2={rry} stroke="#8b9bad" strokeWidth={1.6} />
        <path d={wheel(flx, fly, steer)} stroke="#5aa9ff" strokeWidth={4.5} strokeLinecap="round" />
        <path d={wheel(frx, fry, steer)} stroke="#5aa9ff" strokeWidth={4.5} strokeLinecap="round" />
        <path d={wheel(rlx, rly, 0)} stroke="#ff9f4d" strokeWidth={4.5} strokeLinecap="round" />
        <path d={wheel(rrx, rry, 0)} stroke="#ff9f4d" strokeWidth={4.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={4} fill="#dbe4ee" />
      </g>

      {/*
        The sideslip angle drawn as a shaded angle, not just a number: it is the
        angle between where the car is POINTING and where it is actually GOING,
        and that is the whole idea the map is built on.
      */}
      <path
        d={`M ${CX} ${CY} L ${CX} ${CY - 62} A 62 62 0 0 ${psi > 0 ? 0 : 1} ${
          CX + 62 * Math.sin(psi)
        } ${CY - 62 * Math.cos(psi)} Z`}
        fill="#ffcc55"
        fillOpacity={0.2}
        stroke="none"
      />
      <text className="chart-tick" x={12} y={H - 34} fill="#ffcc55">
        β = {toDeg(beta).toFixed(1)}° — the shaded angle between where the car points
      </text>
      <text className="chart-tick" x={12} y={H - 21} fill="#5aa9ff">
        and where it is going. δ = {toDeg(steer).toFixed(1)}° is the front wheels.
      </text>

      {/* axle forces */}
      <path
        d={fArrow.path}
        stroke="#5aa9ff"
        strokeWidth={2.6}
        fill="none"
        markerEnd="url(#mmm-arrow-f)"
      />
      <path
        d={rArrow.path}
        stroke="#ff9f4d"
        strokeWidth={2.6}
        fill="none"
        markerEnd="url(#mmm-arrow-r)"
      />

      {/* the yaw moment the pair of them leaves over, against all the car has */}
      <path d={arc(FULL, dirSign)} stroke="#3a4756" strokeWidth={2} fill="none" />
      <text className="chart-tick" x={CX + mr + 8} y={CY - 30} fill="#5f6f80">
        all this car has
      </text>
      {fraction > 0.004 && (
        <g>
          <path
            d={arcPath}
            stroke={yawMoment >= 0 ? '#6ee787' : '#ff6b6b'}
            strokeWidth={2.4}
            fill="none"
            markerEnd={`url(#mmm-arrow-${yawMoment >= 0 ? 'n-pos' : 'n-neg'})`}
          />
          <text
            className="chart-tick"
            x={CX + mr + 8}
            y={CY + 4}
            fill={yawMoment >= 0 ? '#6ee787' : '#ff6b6b'}
          >
            N — {(fraction * 100).toFixed(0)}% of it
          </text>
        </g>
      )}
    </svg>
  )
}

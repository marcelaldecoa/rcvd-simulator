/**
 * The path a car traces through a step steer, animated.
 *
 * Ch 6's central claim is that yaw response leads lateral response -- the nose
 * rotates before the car actually changes direction. A pair of time traces
 * states that; watching the car do it makes it obvious.
 *
 * Two arrows leave the car: where it is POINTING (heading) and where it is
 * GOING (course). The gap between them is sideslip. Early in the step they
 * separate visibly, and above the tangent speed the gap even changes sign
 * partway through -- the nose swings from outside the corner to inside it
 * during a single input.
 */

import { toDeg } from '@core/util/numeric.js'
import type { PathSample } from '@core/vehicle/transient.js'

export interface PathDiagramProps {
  path: PathSample[]
  /** Index of the sample currently being shown. */
  cursor: number
  /** Wheelbase, m -- for drawing the car to scale. */
  wheelbase: number
  height?: number
}

const W = 620
const H = 400
const PAD = 46

export function PathDiagram({
  path,
  cursor,
  wheelbase,
  height = H
}: PathDiagramProps): React.JSX.Element {
  if (!path.length) return <svg viewBox={`0 0 ${W} ${H}`} height={height} />

  // Fit the whole path, so the view does not jump as the animation runs.
  const xs = path.map((p) => p.x)
  const ys = path.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY)

  // Earth x forward -> screen right; earth y left -> screen up.
  const sx = (x: number): number => PAD + (x - minX) * scale
  const sy = (y: number): number => H - PAD - (y - minY) * scale

  const i = Math.min(Math.max(cursor, 0), path.length - 1)
  const now = path[i]

  const trail = path
    .slice(0, i + 1)
    .map((p, k) => `${k ? 'L' : 'M'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ')
  const ahead = path
    .slice(i)
    .map((p, k) => `${k ? 'L' : 'M'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ')

  const carLen = Math.max(wheelbase * scale, 16)
  const carWid = carLen * 0.44
  const cx = sx(now.x)
  const cy = sy(now.y)
  // Screen y is inverted relative to earth y, so a left turn (+psi) is -deg.
  const headingDeg = -toDeg(now.heading)

  const arrow = (angleRad: number, len: number, color: string, marker: string): string => {
    const a = -angleRad
    return `M ${cx} ${cy} L ${cx + Math.cos(a) * len} ${cy + Math.sin(a) * len}`
  }
  void arrow

  const rayTo = (angleRad: number, len: number): [number, number] => {
    const a = -angleRad
    return [cx + Math.cos(a) * len, cy + Math.sin(a) * len]
  }
  const [hx, hy] = rayTo(now.heading, 62)
  const [gx, gy] = rayTo(now.course, 78)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} style={{ width: '100%', display: 'block' }}>
      <defs>
        <marker id="pathHead" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#8b9bad" />
        </marker>
        <marker id="pathGo" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#4dd6c1" />
        </marker>
      </defs>

      {/* the straight line the car would have followed with no input */}
      <line
        x1={sx(path[0].x)}
        y1={sy(path[0].y)}
        x2={sx(path[0].x) + (W - 2 * PAD)}
        y2={sy(path[0].y)}
        stroke="#243040"
        strokeWidth={1}
        strokeDasharray="5 5"
      />
      <text x={sx(path[0].x) + 8} y={sy(path[0].y) - 7} fill="#5f6f80" fontSize={9.5}>
        no steer input
      </text>

      <path d={ahead} fill="none" stroke="#243040" strokeWidth={1.5} />
      <path d={trail} fill="none" stroke="#4dd6c1" strokeWidth={2.4} strokeOpacity={0.85} />

      {/* the car */}
      <g transform={`rotate(${headingDeg} ${cx} ${cy})`}>
        <rect
          x={cx - carLen / 2}
          y={cy - carWid / 2}
          width={carLen}
          height={carWid}
          rx={carWid * 0.3}
          fill="#18222e"
          stroke="#5aa9ff"
          strokeWidth={1.6}
        />
      </g>

      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#8b9bad" strokeWidth={1.8} markerEnd="url(#pathHead)" />
      <line x1={cx} y1={cy} x2={gx} y2={gy} stroke="#4dd6c1" strokeWidth={2.2} markerEnd="url(#pathGo)" />

      <g fontSize={10} fontFamily="var(--sans)">
        <line x1={16} y1={18} x2={38} y2={18} stroke="#8b9bad" strokeWidth={1.8} />
        <text x={44} y={21.5} fill="#8b9bad">
          pointing (heading)
        </text>
        <line x1={16} y1={34} x2={38} y2={34} stroke="#4dd6c1" strokeWidth={2.2} />
        <text x={44} y={37.5} fill="#8b9bad">
          going (course)
        </text>
      </g>

      <text x={W - 12} y={20} fill="#5f6f80" fontSize={10} textAnchor="end" fontFamily="var(--mono)">
        t = {now.t.toFixed(2)} s
      </text>
      <text x={W - 12} y={35} fill="#5f6f80" fontSize={10} textAnchor="end" fontFamily="var(--mono)">
        sideslip β {toDeg(now.beta) >= 0 ? '+' : ''}
        {toDeg(now.beta).toFixed(2)}°
      </text>
      <text x={W - 12} y={50} fill="#5f6f80" fontSize={10} textAnchor="end" fontFamily="var(--mono)">
        rotated {toDeg(now.heading).toFixed(1)}°
      </text>
    </svg>
  )
}

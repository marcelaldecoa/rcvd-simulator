/**
 * The four wheel loads, seen from above.
 *
 * Ch 18 is about where the weight goes. Four numbers in a table state it; a
 * picture where each contact patch grows and shrinks and changes colour shows
 * it, and shows the moment an inner wheel lifts.
 *
 * The car travels up the page and is cornering LEFT, so the right-hand wheels
 * are the loaded outer pair -- matching the cornering diagram elsewhere in the
 * app, which also draws a left-hand turn.
 */

import type { WheelLoads } from '@core/vehicle/chassis.js'

export interface WheelLoadDiagramProps {
  loads: WheelLoads
  /** Static load per wheel with no transfer, N -- the reference size. */
  staticFront: number
  staticRear: number
  /** Body roll angle, rad, for the roll indicator. */
  rollAngle?: number
  height?: number
}

const W = 320
const H = 340

/** Patch radius, scaled by the square root of load so AREA tracks load. */
function radiusFor(load: number, reference: number): number {
  if (reference <= 0) return 0
  return 26 * Math.sqrt(Math.max(load, 0) / reference)
}

function colorFor(load: number, reference: number): string {
  const r = reference > 0 ? load / reference : 1
  if (r <= 0.001) return '#ff6b6b'
  if (r < 0.45) return '#ffcc55'
  if (r > 1.55) return '#5aa9ff'
  return '#6ee787'
}

export function WheelLoadDiagram({
  loads,
  staticFront,
  staticRear,
  rollAngle = 0,
  height = H
}: WheelLoadDiagramProps): React.JSX.Element {
  const cx = W / 2
  const frontY = 96
  const rearY = 246
  const half = 76

  // Reference for sizing: the heavier static corner, so both axles share a
  // scale and their relative loading is directly comparable.
  const ref = Math.max(staticFront, staticRear)

  const corners = [
    { x: cx - half, y: frontY, load: loads.fi, label: 'FI', static: staticFront },
    { x: cx + half, y: frontY, load: loads.fo, label: 'FO', static: staticFront },
    { x: cx - half, y: rearY, load: loads.ri, label: 'RI', static: staticRear },
    { x: cx + half, y: rearY, load: loads.ro, label: 'RO', static: staticRear }
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} style={{ width: '100%', display: 'block' }}>
      <defs>
        <marker id="turnArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#4dd6c1" />
        </marker>
      </defs>

      {/* chassis outline */}
      <rect
        x={cx - 46}
        y={frontY - 40}
        width={92}
        height={rearY - frontY + 74}
        rx={18}
        fill="#18222e"
        stroke="#31445a"
        strokeWidth={1.4}
      />
      <line x1={cx - half} y1={frontY} x2={cx + half} y2={frontY} stroke="#31445a" strokeWidth={1.4} />
      <line x1={cx - half} y1={rearY} x2={cx + half} y2={rearY} stroke="#31445a" strokeWidth={1.4} />

      {corners.map((c) => (
        <g key={c.label}>
          {/* static reference ring, so the change is visible not just the size */}
          <circle
            cx={c.x}
            cy={c.y}
            r={radiusFor(c.static, ref)}
            fill="none"
            stroke="#31445a"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={c.x}
            cy={c.y}
            r={radiusFor(c.load, ref)}
            fill={colorFor(c.load, c.static)}
            fillOpacity={0.32}
            stroke={colorFor(c.load, c.static)}
            strokeWidth={1.6}
          />
          <text
            x={c.x}
            y={c.y - 3}
            fill="#dbe4ee"
            fontSize={12}
            fontWeight={650}
            textAnchor="middle"
            fontFamily="var(--mono)"
          >
            {(c.load / 1000).toFixed(2)}
          </text>
          <text x={c.x} y={c.y + 10} fill="#8b9bad" fontSize={9} textAnchor="middle">
            kN
          </text>
          <text
            x={c.x}
            y={c.y + radiusFor(Math.max(c.load, c.static), ref) + 14}
            fill="#5f6f80"
            fontSize={9.5}
            textAnchor="middle"
            fontFamily="var(--mono)"
          >
            {c.label}
            {c.load <= 0.001 ? ' — LIFTED' : ` ${((c.load / c.static) * 100).toFixed(0)}%`}
          </text>
        </g>
      ))}

      {/* which way the corner goes */}
      <path
        d={`M ${cx - 118} ${H / 2 + 26} Q ${cx - 132} ${H / 2} ${cx - 118} ${H / 2 - 26}`}
        fill="none"
        stroke="#4dd6c1"
        strokeWidth={1.6}
        markerEnd="url(#turnArrow)"
      />
      <text
        x={cx - 140}
        y={H / 2 + 4}
        fill="#4dd6c1"
        fontSize={9.5}
        textAnchor="middle"
        transform={`rotate(-90 ${cx - 140} ${H / 2 + 4})`}
      >
        turning left
      </text>

      <text x={12} y={18} fill="#5f6f80" fontSize={9.5} fontFamily="var(--sans)">
        area ∝ load · dashed ring = static
      </text>
      {rollAngle !== 0 && (
        <text
          x={W - 12}
          y={18}
          fill="#5f6f80"
          fontSize={10}
          textAnchor="end"
          fontFamily="var(--mono)"
        >
          roll {((rollAngle * 180) / Math.PI).toFixed(2)}°
        </text>
      )}
      {loads.anyLifted && (
        <text x={W / 2} y={H - 8} fill="#ff6b6b" fontSize={11} fontWeight={650} textAnchor="middle">
          inner wheel lifted
        </text>
      )}
    </svg>
  )
}

/** Stacked bar of the three Ch 18 §5 contributions at one axle. */
export function TransferBreakdown({
  geometric,
  elastic,
  unsprung,
  label,
  scale
}: {
  geometric: number
  elastic: number
  unsprung: number
  label: string
  /** Largest total across both axles, so the two bars share a scale. */
  scale: number
}): React.JSX.Element {
  const total = geometric + elastic + unsprung
  const pct = (v: number): string => `${(Math.abs(v) / Math.max(scale, 1)) * 100}%`
  return (
    <div className="breakdown">
      <div className="breakdown-head">
        <span>{label}</span>
        <span className="breakdown-total">{total.toFixed(0)} N</span>
      </div>
      <div className="breakdown-bar">
        <div
          className="breakdown-seg"
          style={{ width: pct(geometric), background: '#5aa9ff' }}
          title={`Geometric ${geometric.toFixed(0)} N`}
        />
        <div
          className="breakdown-seg"
          style={{ width: pct(elastic), background: '#4dd6c1' }}
          title={`Elastic ${elastic.toFixed(0)} N`}
        />
        <div
          className="breakdown-seg"
          style={{ width: pct(unsprung), background: '#ff9f4d' }}
          title={`Unsprung ${unsprung.toFixed(0)} N`}
        />
      </div>
      <div className="breakdown-legend">
        <span style={{ color: '#5aa9ff' }}>geometric {geometric.toFixed(0)}</span>
        <span style={{ color: '#4dd6c1' }}>elastic {elastic.toFixed(0)}</span>
        <span style={{ color: '#ff9f4d' }}>unsprung {unsprung.toFixed(0)}</span>
      </div>
    </div>
  )
}

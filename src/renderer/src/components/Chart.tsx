/**
 * A compact SVG line/scatter chart with a hover crosshair.
 *
 * Deliberately hand-rolled on d3-scale rather than pulled from a charting
 * library: nearly every plot in this subject wants annotation a generic
 * library fights you on -- the Ackermann reference line, the characteristic
 * speed marker, the friction ellipse, the point the car is currently at.
 */

import { line as d3line, curveMonotoneX } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

export interface Pt {
  x: number
  y: number
}

export interface Series {
  name: string
  points: Pt[]
  color: string
  dashed?: boolean
  width?: number
  /** Draw as unconnected dots rather than a line. */
  scatter?: boolean
  /** Exclude from the hover readout. */
  quiet?: boolean
}

export interface Marker {
  x: number
  y: number
  label?: string
  color?: string
}

export interface RuleLine {
  value: number
  label?: string
  color?: string
  dashed?: boolean
}

export interface ChartProps {
  series: Series[]
  height?: number
  xLabel?: string
  yLabel?: string
  xDomain?: [number, number]
  yDomain?: [number, number]
  /** Force zero into the y domain. */
  zeroY?: boolean
  markers?: Marker[]
  vRules?: RuleLine[]
  hRules?: RuleLine[]
  /** Formatter for the hover readout. */
  fmtX?: (v: number) => string
  fmtY?: (v: number) => string
  legend?: boolean
  /** Shaded band on the x axis, e.g. an unstable speed range. */
  xBands?: { from: number; to: number; color: string; label?: string }[]
}

const M = { top: 12, right: 16, bottom: 34, left: 56 }

function niceDomain(values: number[], forceZero: boolean): [number, number] {
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1]
  if (forceZero) {
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 0)
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1
    return [lo - pad, hi + pad]
  }
  const pad = (hi - lo) * 0.06
  return [lo - pad, hi + pad]
}

export function Chart({
  series,
  height = 250,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  zeroY = true,
  markers = [],
  vRules = [],
  hRules = [],
  fmtX = (v) => v.toFixed(2),
  fmtY = (v) => v.toFixed(2),
  legend = true,
  xBands = []
}: ChartProps): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<{ px: number; x: number } | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const all = series.flatMap((s) => s.points)
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y).filter((v) => isFinite(v))

  const xDom =
    xDomain ??
    (xs.length ? ([Math.min(...xs), Math.max(...xs)] as [number, number]) : [0, 1])
  const yDom = yDomain ?? niceDomain(ys.length ? ys : [0, 1], zeroY)

  const iw = Math.max(width - M.left - M.right, 10)
  const ih = height - M.top - M.bottom

  const x = useMemo(() => scaleLinear().domain(xDom).range([0, iw]), [xDom[0], xDom[1], iw])
  const y = useMemo(() => scaleLinear().domain(yDom).range([ih, 0]), [yDom[0], yDom[1], ih])

  const path = useMemo(
    () =>
      d3line<Pt>()
        .x((p) => x(p.x))
        .y((p) => y(p.y))
        .defined((p) => isFinite(p.y))
        .curve(curveMonotoneX),
    [x, y]
  )

  const xTicks = x.ticks(6)
  const yTicks = y.ticks(5)

  // Hover: nearest sample in the first non-quiet series.
  const probe = hover
    ? series
        .filter((s) => !s.quiet && s.points.length)
        .map((s) => {
          let best = s.points[0]
          let bd = Infinity
          for (const p of s.points) {
            const d = Math.abs(p.x - hover.x)
            if (d < bd) {
              bd = d
              best = p
            }
          }
          return { series: s, point: best }
        })
    : []

  const tipLeft = hover
    ? Math.min(Math.max(hover.px + M.left + 12, 4), Math.max(width - 170, 4))
    : 0

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        className="chart-svg"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * width - M.left
          if (px < 0 || px > iw) return setHover(null)
          setHover({ px, x: x.invert(px) })
        }}
      >
        <g transform={`translate(${M.left},${M.top})`}>
          {xBands.map((b, i) => (
            <rect
              key={i}
              x={x(Math.max(b.from, xDom[0]))}
              y={0}
              width={Math.max(x(Math.min(b.to, xDom[1])) - x(Math.max(b.from, xDom[0])), 0)}
              height={ih}
              fill={b.color}
            />
          ))}

          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line className="chart-grid" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
              <text className="chart-tick" x={-8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtY(t)}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line className="chart-grid" x1={x(t)} x2={x(t)} y1={0} y2={ih} />
              <text className="chart-tick" x={x(t)} y={ih + 15} textAnchor="middle">
                {fmtX(t)}
              </text>
            </g>
          ))}

          {/* Zero lines, drawn brighter than the grid. */}
          {yDom[0] < 0 && yDom[1] > 0 && (
            <line x1={0} x2={iw} y1={y(0)} y2={y(0)} stroke="#33414f" strokeWidth={1} />
          )}
          {xDom[0] < 0 && xDom[1] > 0 && (
            <line x1={x(0)} x2={x(0)} y1={0} y2={ih} stroke="#33414f" strokeWidth={1} />
          )}

          {hRules.map((r, i) => (
            <g key={`h${i}`}>
              <line
                x1={0}
                x2={iw}
                y1={y(r.value)}
                y2={y(r.value)}
                stroke={r.color ?? '#5f6f80'}
                strokeWidth={1}
                strokeDasharray={r.dashed === false ? undefined : '4 3'}
              />
              {r.label && (
                <text
                  className="chart-tick"
                  x={iw - 4}
                  y={y(r.value) - 4}
                  textAnchor="end"
                  fill={r.color ?? '#5f6f80'}
                >
                  {r.label}
                </text>
              )}
            </g>
          ))}

          {vRules.map((r, i) => (
            <g key={`v${i}`}>
              <line
                x1={x(r.value)}
                x2={x(r.value)}
                y1={0}
                y2={ih}
                stroke={r.color ?? '#5f6f80'}
                strokeWidth={1}
                strokeDasharray={r.dashed === false ? undefined : '4 3'}
              />
              {r.label && (
                <text
                  className="chart-tick"
                  x={x(r.value) + 4}
                  y={11}
                  fill={r.color ?? '#5f6f80'}
                >
                  {r.label}
                </text>
              )}
            </g>
          ))}

          {series.map((s) =>
            s.scatter ? (
              <g key={s.name}>
                {s.points.map((p, i) =>
                  isFinite(p.y) ? (
                    <circle key={i} cx={x(p.x)} cy={y(p.y)} r={1.6} fill={s.color} opacity={0.8} />
                  ) : null
                )}
              </g>
            ) : (
              <path
                key={s.name}
                d={path(s.points) ?? undefined}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width ?? 1.8}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                strokeLinecap="round"
              />
            )
          )}

          {markers.map((m, i) => (
            <g key={i}>
              <circle
                cx={x(m.x)}
                cy={y(m.y)}
                r={4}
                fill={m.color ?? '#4dd6c1'}
                stroke="#0b0f14"
                strokeWidth={1.5}
              />
              {m.label && (
                <text
                  className="chart-tick"
                  x={x(m.x) + 8}
                  y={y(m.y) - 6}
                  fill={m.color ?? '#4dd6c1'}
                >
                  {m.label}
                </text>
              )}
            </g>
          ))}

          {hover && (
            <line
              x1={hover.px}
              x2={hover.px}
              y1={0}
              y2={ih}
              stroke="#4dd6c1"
              strokeWidth={1}
              opacity={0.45}
            />
          )}
          {hover &&
            probe.map((p, i) =>
              isFinite(p.point.y) ? (
                <circle
                  key={i}
                  cx={x(p.point.x)}
                  cy={y(p.point.y)}
                  r={3}
                  fill={p.series.color}
                />
              ) : null
            )}

          <line x1={0} x2={iw} y1={ih} y2={ih} stroke="#243040" />
          <line x1={0} x2={0} y1={0} y2={ih} stroke="#243040" />
        </g>

        {xLabel && (
          <text className="chart-axis-label" x={M.left + iw / 2} y={height - 3} textAnchor="middle">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            className="chart-axis-label"
            transform={`translate(11,${M.top + ih / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {yLabel}
          </text>
        )}
      </svg>

      {hover && probe.length > 0 && (
        <div className="chart-tip" style={{ left: tipLeft, top: 6 }}>
          <div style={{ color: '#8b9bad', marginBottom: 2 }}>
            {xLabel?.split('(')[0].trim() ?? 'x'} {fmtX(hover.x)}
          </div>
          {probe.map((p, i) => (
            <div className="chart-tip-row" key={i}>
              <span className="legend-swatch" style={{ background: p.series.color }} />
              <span>{fmtY(p.point.y)}</span>
              <span style={{ color: '#5f6f80' }}>{p.series.name}</span>
            </div>
          ))}
        </div>
      )}

      {legend && series.filter((s) => !s.quiet).length > 1 && (
        <div className="chart-legend">
          {series
            .filter((s) => !s.quiet)
            .map((s) => (
              <div className="legend-item" key={s.name}>
                <span
                  className="legend-swatch"
                  style={{
                    background: s.dashed
                      ? `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)`
                      : s.color
                  }}
                />
                {s.name}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

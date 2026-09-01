/**
 * The MMM carpet plot -- Ch 8 §3.
 *
 * Yaw moment N against lateral acceleration Ay, crossed by two families of
 * contours: constant steer angle (each sweeping sideslip) and constant sideslip
 * (each sweeping steer). Everything the chapter asks you to read off the
 * diagram is drawn explicitly rather than left to the eye:
 *
 *   - the N = 0 axis, and the trim line traced along it
 *   - the envelope, so "it closes" is something you see rather than are told
 *   - the band between max trimmed Ay and max Ay, which is the performance the
 *     car's balance is throwing away
 *   - a right-hand axis in deg/s^2, because N/Izz is the rate at which the car
 *     is leaving whatever state you are looking at (Ex 8.6)
 *
 * Hand-rolled rather than routed through <Chart> for a specific reason: these
 * contours loop back on themselves in Ay near the limit, and the shared chart's
 * monotone-in-x curve interpolation would quietly draw them wrong.
 */

import { scaleLinear } from 'd3-scale'
import { useLayoutEffect, useRef, useState } from 'react'
import { toDeg } from '@core/util/numeric.js'
import type { MMMDiagram, MMMPoint } from '@core/vehicle/momentMethod.js'

const M = { top: 14, right: 64, bottom: 38, left: 64 }

export interface MMMPlotProps {
  diagram: MMMDiagram
  /** The state the sliders are holding the car at. */
  current?: MMMPoint
  /** Yaw inertia, kg.m^2 -- for the right-hand yaw-acceleration axis. */
  izz: number
  height?: number
  showSteerLines?: boolean
  showBetaLines?: boolean
  showTrim?: boolean
  showEnvelope?: boolean
}

export function MMMPlot({
  diagram,
  current,
  izz,
  height = 400,
  showSteerLines = true,
  showBetaLines = true,
  showTrim = true,
  showEnvelope = true
}: MMMPlotProps): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(680)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Both families, not just one: the widest point of the map is generally on a
  // constant-beta line (both axles at their own peak needs a non-zero steer),
  // and a domain taken from the steer family alone clips it off the plot.
  const all = [...diagram.constantSteer, ...diagram.constantBeta].flatMap((c) => c.points)
  const ayMax = Math.max(Math.max(...all.map((p) => Math.abs(p.ay))), diagram.maxAy) * 1.06 || 1
  const nMax = Math.max(...all.map((p) => Math.abs(p.yawMoment))) * 1.08 || 1

  const iw = Math.max(width - M.left - M.right, 10)
  const ih = height - M.top - M.bottom

  const x = scaleLinear().domain([-ayMax, ayMax]).range([0, iw])
  const y = scaleLinear().domain([-nMax, nMax]).range([ih, 0])

  const poly = (pts: MMMPoint[]): string =>
    pts.map((p) => `${x(p.ay).toFixed(1)},${y(p.yawMoment).toFixed(1)}`).join(' ')

  const envelope = [
    ...diagram.envelope.map((e) => `${x(e.ay).toFixed(1)},${y(e.nUpper).toFixed(1)}`),
    ...[...diagram.envelope]
      .reverse()
      .map((e) => `${x(e.ay).toFixed(1)},${y(e.nLower).toFixed(1)}`)
  ].join(' ')
  const trimAy = diagram.trimLine.map((t) => t.ay)
  const trimSpan: [number, number] = trimAy.length
    ? [Math.min(...trimAy), Math.max(...trimAy)]
    : [0, 0]
  /**
   * Trim markers only where a drawn steer contour crosses, so the dots tie the
   * blue lines to the white one instead of turning it into a dotted rope.
   */
  const trimMarks = diagram.constantSteer
    .map((c) =>
      diagram.trimLine.reduce<{ steer: number; ay: number } | null>(
        (best, t) =>
          best === null || Math.abs(t.steer - c.value) < Math.abs(best.steer - c.value) ? t : best,
        null
      )
    )
    .filter((t): t is { steer: number; ay: number } => t !== null)

  const xTicks = x.ticks(7)
  const yTicks = y.ticks(6)
  /** The same N, read as the yaw acceleration it would produce. */
  const yawAccel = (n: number): number => toDeg(n / izz)

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} height={height}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* the balance-loss band: Ay the car can make but cannot trim */}
          {showTrim && diagram.balanceLoss > 1e-4 && (
            <rect
              x={x(diagram.maxTrimmedAy)}
              y={0}
              width={Math.max(x(diagram.maxAy) - x(diagram.maxTrimmedAy), 0)}
              height={ih}
              fill="rgba(255, 107, 107, 0.09)"
            />
          )}

          {xTicks.map((t) => (
            <line key={`gx${t}`} className="chart-grid" x1={x(t)} x2={x(t)} y1={0} y2={ih} />
          ))}
          {yTicks.map((t) => (
            <line key={`gy${t}`} className="chart-grid" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
          ))}

          {showEnvelope && (
            <polygon
              points={envelope}
              fill="rgba(77, 214, 193, 0.05)"
              stroke="#2b7d72"
              strokeWidth={1.4}
            />
          )}

          {/* constant sideslip: the family the driver does not command directly */}
          {showBetaLines &&
            diagram.constantBeta.map((c) => (
              <polyline
                key={`b${c.value}`}
                points={poly(c.points)}
                fill="none"
                stroke="#ff9f4d"
                strokeOpacity={0.32}
                strokeWidth={1.1}
              >
                <title>{`beta = ${toDeg(c.value).toFixed(1)} deg`}</title>
              </polyline>
            ))}

          {/* constant steer: the family the driver does command */}
          {showSteerLines &&
            diagram.constantSteer.map((c) => (
              <polyline
                key={`s${c.value}`}
                points={poly(c.points)}
                fill="none"
                stroke="#5aa9ff"
                strokeOpacity={Math.abs(c.value) < 1e-9 ? 0.95 : 0.6}
                strokeWidth={Math.abs(c.value) < 1e-9 ? 1.9 : 1.3}
              >
                <title>{`delta = ${toDeg(c.value).toFixed(1)} deg`}</title>
              </polyline>
            ))}

          {/* Label the steer contours where they are furthest apart -- at beta
              = 0, the middle of each sweep -- rather than at their ends, where
              every one of them converges on the same two tips. */}
          {showSteerLines &&
            diagram.constantSteer.map((c, i) => {
              if (i % 2 !== 0) return null
              const mid = c.points[Math.floor(c.points.length / 2)]
              return (
                <text
                  key={`sl${c.value}`}
                  className="chart-tick"
                  x={x(mid.ay) + 5}
                  y={y(mid.yawMoment) - 4}
                  fill="#5aa9ff"
                  fillOpacity={0.85}
                >
                  {`δ ${toDeg(c.value) >= 0 ? '+' : ''}${toDeg(c.value).toFixed(0)}°`}
                </text>
              )
            })}

          {/* N = 0 -- every state the free car can actually hold */}
          <line x1={0} x2={iw} y1={y(0)} y2={y(0)} stroke="#dbe4ee" strokeWidth={1.2} />
          <text className="chart-tick" x={4} y={y(0) - 6} fill="#dbe4ee">
            N = 0 · trim
          </text>
          <line x1={x(0)} x2={x(0)} y1={0} y2={ih} stroke="#3a4756" strokeWidth={1} />

          {showTrim && (
            <>
              <line
                x1={x(diagram.maxTrimmedAy)}
                x2={x(diagram.maxTrimmedAy)}
                y1={0}
                y2={ih}
                stroke="#4dd6c1"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={x(diagram.maxAy)}
                x2={x(diagram.maxAy)}
                y1={0}
                y2={ih}
                stroke="#ff6b6b"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={x(trimSpan[0])}
                x2={x(trimSpan[1])}
                y1={y(0)}
                y2={y(0)}
                stroke="#4dd6c1"
                strokeWidth={3}
              />
              {trimMarks.map((t, i) => (
                <circle key={`t${i}`} cx={x(t.ay)} cy={y(0)} r={3} fill="#4dd6c1" />
              ))}
            </>
          )}

          {current && (
            <g>
              <line
                x1={x(current.ay)}
                x2={x(current.ay)}
                y1={y(current.yawMoment)}
                y2={y(0)}
                stroke="#ffcc55"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <circle
                cx={x(current.ay)}
                cy={y(current.yawMoment)}
                r={6}
                fill="#ffcc55"
                fillOpacity={0.22}
                stroke="#ffcc55"
                strokeWidth={1.8}
              />
            </g>
          )}

          {xTicks.map((t) => (
            <text key={`tx${t}`} className="chart-tick" x={x(t)} y={ih + 14} textAnchor="middle">
              {t.toFixed(1)}
            </text>
          ))}
          {yTicks.map((t) => (
            <text key={`ty${t}`} className="chart-tick" x={-8} y={y(t) + 3} textAnchor="end">
              {Math.round(t)}
            </text>
          ))}
          {yTicks.map((t) => (
            <text
              key={`tr${t}`}
              className="chart-tick"
              x={iw + 8}
              y={y(t) + 3}
              textAnchor="start"
              fill="#8b9bad"
            >
              {yawAccel(t).toFixed(0)}
            </text>
          ))}
          <text className="chart-axis-label" x={iw / 2} y={ih + 31} textAnchor="middle">
            Lateral acceleration Ay (g)
          </text>
          <text
            className="chart-axis-label"
            transform={`translate(${-47},${ih / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Yaw moment N (N·m)
          </text>
          <text
            className="chart-axis-label"
            transform={`translate(${iw + 50},${ih / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Yaw acceleration (deg/s²)
          </text>
        </g>
      </svg>
      <div className="chart-legend">
        {showSteerLines && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#5aa9ff' }} />
            constant steer δ
          </span>
        )}
        {showBetaLines && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#ff9f4d', opacity: 0.5 }} />
            constant sideslip β
          </span>
        )}
        {showTrim && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#4dd6c1' }} />
            trim line (N = 0)
          </span>
        )}
        {showEnvelope && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#2b7d72', opacity: 0.7 }} />
            envelope — where the map closes
          </span>
        )}
        {current && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#ffcc55' }} />
            you are here
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * The front-elevation construction of Ch 17, drawn.
 *
 * This is the picture the whole chapter is about. Two control arms, extended
 * until they meet at the instant centre; a line from that point through the
 * contact patch; where that line crosses the vehicle centreline is the roll
 * centre. Three design quantities -- camber gain, roll centre height and the
 * geometric share of load transfer -- all fall out of where one point lands,
 * and the reason to draw it rather than tabulate it is that the coupling
 * between them is obvious in a picture and invisible in a table.
 *
 * The view is scaled to fit whatever the geometry does, including the cases
 * that go badly wrong: an instant centre far outboard, or a roll centre below
 * ground. Those are the interesting ones.
 */

import type { InstantCentre } from '@core/vehicle/geometry.js'

const W = 560
const H = 300

export interface SuspensionDiagramProps {
  /** Track width, m. */
  track: number
  upperJointHeight: number
  lowerJointHeight: number
  ic: InstantCentre
  /** Wheel rolling radius, m -- for drawing the tyre. */
  rollingRadius?: number
  height?: number
}

export function SuspensionDiagram({
  track,
  upperJointHeight,
  lowerJointHeight,
  ic,
  rollingRadius = 0.33,
  height = H
}: SuspensionDiagramProps): React.JSX.Element {
  // World coordinates: x from the vehicle centreline (0) outboard positive,
  // y up from the ground. The contact patch sits at half a track.
  const patchX = track / 2
  const finiteIc = isFinite(ic.fvsa)
  // The instant centre lies a signed FVSA inboard of the contact patch.
  const icX = finiteIc ? patchX - ic.fvsa : patchX - 6
  const icY = ic.height
  const rcY = ic.rollCentreHeight

  const xs = [0, patchX, icX, patchX + 0.2, -0.2]
  const ys = [0, upperJointHeight, lowerJointHeight, icY, rcY, rollingRadius * 2]
  const xMin = Math.min(...xs) - 0.15
  const xMax = Math.max(...xs) + 0.15
  const yMin = Math.min(...ys, -0.2) - 0.1
  const yMax = Math.max(...ys, 0.8) + 0.1

  const pad = { l: 34, r: 14, t: 12, b: 30 }
  const iw = W - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const scale = Math.min(iw / (xMax - xMin), ih / (yMax - yMin))
  const px = (x: number): number => pad.l + (x - xMin) * scale
  const py = (y: number): number => pad.t + (yMax - y) * scale

  const upperOuter: [number, number] = [patchX, upperJointHeight]
  const lowerOuter: [number, number] = [patchX, lowerJointHeight]

  return (
    <svg viewBox={`0 0 ${W} ${height}`} height={height} style={{ display: 'block', width: '100%' }}>
      {/* ground */}
      <line
        x1={pad.l}
        x2={W - pad.r}
        y1={py(0)}
        y2={py(0)}
        stroke="#3a4756"
        strokeWidth={1.5}
      />
      <text className="chart-tick" x={pad.l + 2} y={py(0) + 12} fill="#5f6f80">
        ground
      </text>

      {/* vehicle centreline */}
      <line
        x1={px(0)}
        x2={px(0)}
        y1={pad.t}
        y2={py(0)}
        stroke="#243040"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text className="chart-tick" x={px(0) + 4} y={pad.t + 10} fill="#5f6f80">
        centreline
      </text>

      {/* the construction line from the instant centre through the contact patch */}
      {finiteIc && (
        <line
          x1={px(icX)}
          y1={py(icY)}
          x2={px(0)}
          y2={py(rcY)}
          stroke="#4dd6c1"
          strokeWidth={1.2}
          strokeDasharray="5 4"
        />
      )}

      {/* arms, extended to the instant centre */}
      {finiteIc && (
        <>
          <line
            x1={px(upperOuter[0])}
            y1={py(upperOuter[1])}
            x2={px(icX)}
            y2={py(icY)}
            stroke="#5aa9ff"
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeOpacity={0.55}
          />
          <line
            x1={px(lowerOuter[0])}
            y1={py(lowerOuter[1])}
            x2={px(icX)}
            y2={py(icY)}
            stroke="#5aa9ff"
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeOpacity={0.55}
          />
        </>
      )}

      {/* the arms themselves -- the physical part, drawn solid */}
      <line
        x1={px(upperOuter[0])}
        y1={py(upperOuter[1])}
        x2={px(upperOuter[0] - Math.min(0.42, Math.abs(ic.fvsa) || 0.42) * Math.sign(ic.fvsa || 1))}
        y2={py(
          upperOuter[1] +
            (finiteIc
              ? ((icY - upperOuter[1]) / (icX - upperOuter[0])) *
                (-Math.min(0.42, Math.abs(ic.fvsa) || 0.42) * Math.sign(ic.fvsa || 1))
              : 0)
        )}
        stroke="#5aa9ff"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={px(lowerOuter[0])}
        y1={py(lowerOuter[1])}
        x2={px(lowerOuter[0] - Math.min(0.5, Math.abs(ic.fvsa) || 0.5) * Math.sign(ic.fvsa || 1))}
        y2={py(
          lowerOuter[1] +
            (finiteIc
              ? ((icY - lowerOuter[1]) / (icX - lowerOuter[0])) *
                (-Math.min(0.5, Math.abs(ic.fvsa) || 0.5) * Math.sign(ic.fvsa || 1))
              : 0)
        )}
        stroke="#5aa9ff"
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      {/* wheel */}
      <rect
        x={px(patchX) - 7}
        y={py(rollingRadius * 2)}
        width={14}
        height={py(0) - py(rollingRadius * 2)}
        fill="none"
        stroke="#8b9bad"
        strokeWidth={2}
        rx={3}
      />
      <circle cx={px(patchX)} cy={py(0)} r={3} fill="#dbe4ee" />
      <text className="chart-tick" x={px(patchX) + 10} y={py(0) - 4} fill="#8b9bad">
        contact patch
      </text>

      {/* ball joints */}
      <circle cx={px(upperOuter[0])} cy={py(upperOuter[1])} r={3.5} fill="#5aa9ff" />
      <circle cx={px(lowerOuter[0])} cy={py(lowerOuter[1])} r={3.5} fill="#5aa9ff" />

      {/* instant centre */}
      {finiteIc ? (
        <>
          <circle
            cx={px(icX)}
            cy={py(icY)}
            r={5}
            fill="none"
            stroke="#ffcc55"
            strokeWidth={2}
          />
          <text className="chart-tick" x={px(icX) + 8} y={py(icY) - 5} fill="#ffcc55">
            instant centre
          </text>
        </>
      ) : (
        <text className="chart-tick" x={pad.l + 6} y={pad.t + 28} fill="#ffcc55">
          arms parallel — instant centre at infinity, no camber change
        </text>
      )}

      {/* roll centre */}
      <circle
        cx={px(0)}
        cy={py(rcY)}
        r={5}
        fill={rcY >= 0 ? '#4dd6c1' : '#ff6b6b'}
        fillOpacity={0.3}
        stroke={rcY >= 0 ? '#4dd6c1' : '#ff6b6b'}
        strokeWidth={2}
      />
      <text
        className="chart-tick"
        x={px(0) + 9}
        y={py(rcY) + 4}
        fill={rcY >= 0 ? '#4dd6c1' : '#ff6b6b'}
      >
        roll centre {(rcY * 1000).toFixed(0)} mm{rcY < 0 ? ' — below ground' : ''}
      </text>

      {/* the swing arm length, as a measured span along the ground */}
      {finiteIc && (
        <>
          <line
            x1={px(patchX)}
            y1={py(0) + 16}
            x2={px(icX)}
            y2={py(0) + 16}
            stroke="#ffcc55"
            strokeWidth={1}
          />
          <text
            className="chart-tick"
            x={(px(patchX) + px(icX)) / 2}
            y={py(0) + 27}
            textAnchor="middle"
            fill="#ffcc55"
          >
            FVSA {Math.abs(ic.fvsa).toFixed(2)} m{ic.fvsa < 0 ? ' (outboard)' : ''}
          </text>
        </>
      )}
    </svg>
  )
}

/**
 * The contact patch, seen from above.
 *
 * This is the picture that explains the shape of the tyre curve, and it
 * explains three things at once that are usually taught separately:
 *
 *   - WHY the force curve bends over and peaks where it does. Bristles enter at
 *     the leading edge and deflect linearly, so shear rises as a straight line.
 *     The friction limit follows the parabolic pressure distribution, which is
 *     zero at both edges. Where the line meets the parabola, rubber lets go.
 *     The peak is the slip angle at which the sliding zone has eaten the whole
 *     patch.
 *
 *   - WHY there is pneumatic trail. The shear distribution is lopsided toward
 *     the rear, so its centroid sits behind the patch centre.
 *
 *   - WHY steering torque warns of the front limit. As the sliding zone grows
 *     from the rear, the centroid moves FORWARD, so trail collapses while grip
 *     is still building.
 *
 * The car travels up the page, so the leading edge is at the top.
 */

import type { ContactPatch } from '@core/tire/brush.js'

export interface PatchDiagramProps {
  patch: ContactPatch
  /** Peak of the friction envelope across all slip angles, for a stable scale. */
  scale: number
  height?: number
}

const W = 300
const H = 340
const PAD_TOP = 34
const PAD_BOTTOM = 34
const PATCH_X = 78
const PATCH_W = 54

export function PatchDiagram({
  patch,
  scale,
  height = H
}: PatchDiagramProps): React.JSX.Element {
  const top = PAD_TOP
  const bottom = H - PAD_BOTTOM
  const len = bottom - top

  const yOf = (xi: number): number => top + xi * len
  const shearX = (q: number): number => PATCH_X + PATCH_W + 14 + (q / scale) * 150

  const boundary = 1 - patch.slidingFraction
  const centroidY = yOf(patch.centroid)

  const envelope = patch.samples
    .map((s, i) => `${i ? 'L' : 'M'} ${shearX(s.qMax)} ${yOf(s.xi)}`)
    .join(' ')
  const actual = patch.samples
    .map((s, i) => `${i ? 'L' : 'M'} ${shearX(s.q)} ${yOf(s.xi)}`)
    .join(' ')
  const fill = `${actual} L ${shearX(0)} ${yOf(1)} L ${shearX(0)} ${yOf(0)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} style={{ width: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="patchGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee787" stopOpacity="0.30" />
          <stop offset={`${boundary * 100}%`} stopColor="#6ee787" stopOpacity="0.30" />
          <stop offset={`${boundary * 100}%`} stopColor="#ff6b6b" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.30" />
        </linearGradient>
      </defs>

      <text x={PATCH_X + PATCH_W / 2} y={16} fill="#8b9bad" fontSize={10} textAnchor="middle">
        leading edge
      </text>
      <text x={PATCH_X + PATCH_W / 2} y={H - 10} fill="#8b9bad" fontSize={10} textAnchor="middle">
        trailing edge
      </text>

      {/* the patch outline, shaded by what the rubber is doing */}
      <rect
        x={PATCH_X}
        y={top}
        width={PATCH_W}
        height={len}
        rx={PATCH_W / 2}
        fill="url(#patchGrad)"
        stroke="#31445a"
        strokeWidth={1.2}
      />

      {/* adhesion / sliding boundary */}
      {patch.slidingFraction > 0.001 && patch.slidingFraction < 0.999 && (
        <>
          <line
            x1={PATCH_X - 8}
            y1={yOf(boundary)}
            x2={shearX(scale * 0.05) + 160}
            y2={yOf(boundary)}
            stroke="#ffcc55"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
          <text x={PATCH_X - 12} y={yOf(boundary) + 3.5} fill="#ffcc55" fontSize={9.5} textAnchor="end">
            breaks away
          </text>
        </>
      )}

      <text
        x={PATCH_X + PATCH_W / 2}
        y={yOf(boundary / 2) + 3}
        fill="#6ee787"
        fontSize={10}
        fontWeight={650}
        textAnchor="middle"
      >
        {boundary > 0.12 ? 'gripping' : ''}
      </text>
      <text
        x={PATCH_X + PATCH_W / 2}
        y={yOf(boundary + patch.slidingFraction / 2) + 3}
        fill="#ff6b6b"
        fontSize={10}
        fontWeight={650}
        textAnchor="middle"
      >
        {patch.slidingFraction > 0.12 ? 'sliding' : ''}
      </text>

      {/* shear distribution */}
      <path d={fill} fill="#5aa9ff" fillOpacity={0.2} />
      <path d={envelope} fill="none" stroke="#5f6f80" strokeWidth={1.3} strokeDasharray="4 3" />
      <path d={actual} fill="none" stroke="#5aa9ff" strokeWidth={2.2} />
      <line x1={shearX(0)} y1={top} x2={shearX(0)} y2={bottom} stroke="#31445a" strokeWidth={1} />

      {/* where the resultant acts */}
      <line
        x1={PATCH_X - 4}
        y1={centroidY}
        x2={shearX(scale * 0.02) + 168}
        y2={centroidY}
        stroke="#4dd6c1"
        strokeWidth={1.4}
      />
      <circle cx={PATCH_X + PATCH_W / 2} cy={centroidY} r={4} fill="#4dd6c1" />
      <line
        x1={PATCH_X - 4}
        y1={yOf(0.5)}
        x2={PATCH_X + PATCH_W + 4}
        y2={yOf(0.5)}
        stroke="#5f6f80"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      <text x={W - 4} y={centroidY - 5} fill="#4dd6c1" fontSize={9.5} textAnchor="end">
        force acts here
      </text>
      <text x={PATCH_X - 12} y={yOf(0.5) + 3.5} fill="#5f6f80" fontSize={9.5} textAnchor="end">
        centre
      </text>

      <text x={shearX(0) + 6} y={top - 8} fill="#8b9bad" fontSize={9.5}>
        shear stress
      </text>
      <text x={shearX(0) + 6} y={top + 4} fill="#5f6f80" fontSize={9}>
        dashed = friction limit
      </text>
    </svg>
  )
}

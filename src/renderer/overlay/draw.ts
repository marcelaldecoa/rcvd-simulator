/**
 * Drawing the overlay box.
 *
 * Separated from the window plumbing so it can be reasoned about -- and tested
 * -- as a pure function of a reading and a config. Nothing here touches IPC or
 * the DOM beyond the 2D context it is handed.
 *
 * The design brief, and the reasons behind each part:
 *
 *   - A SLIP ANGLE DIAGRAM, because the numbers mean nothing to a driver
 *     mid-corner but the picture does: two shaded angles, and whichever is
 *     wider is the end that is giving up. That is the whole definition of
 *     understeer, and it takes a glance rather than a paragraph.
 *   - A WORD -- neutral, understeer, oversteer -- for what the picture shows.
 *   - A COLOUR from green through yellow to red for how close to the limit the
 *     car is, which is a DIFFERENT question from the word. A car can be
 *     strongly understeering at 40% of its grip.
 *
 * Angles are drawn exaggerated, because real slip angles are a few degrees and
 * would be invisible at this size. Every angle is multiplied by the same
 * factor, so the picture stays internally consistent, and the factor is shown.
 */

export interface OverlayReadingView {
  balance: 'understeer' | 'neutral' | 'oversteer'
  text: string
  zone: 'under' | 'at' | 'over'
  usage: number
  usageFront: number
  usageRear: number
  limitingAxle: 'front' | 'rear'
  provisional: boolean
  alphaFront: number
  alphaRear: number
  beta: number
  ay: number
  speed: number
}

export interface DrawConfig {
  width: number
  height: number
  textScale: number
  showDiagram: boolean
  showBars: boolean
  showNumbers: boolean
}

export interface DrawStatus {
  connected: boolean
  detail: string
}

const FRONT = '#5aa9ff'
const REAR = '#ff9f4d'
const DIM = '#8b9bad'
const FAINT = '#5f6f80'

/** Green through yellow to red, continuous. Peripheral vision reads a ramp. */
export function usageColour(usage: number, greenBelow = 0.85, redAbove = 1): string {
  const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t)
  const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
  if (usage <= greenBelow) {
    const t = clamp01(usage / greenBelow)
    return `rgb(${lerp(80, 190, t)}, ${lerp(231, 226, t)}, ${lerp(135, 90, t)})`
  }
  const t = clamp01((usage - greenBelow) / Math.max(redAbove - greenBelow, 1e-6))
  return `rgb(${lerp(190, 255, t)}, ${lerp(226, 107, t)}, ${lerp(90, 107, t)})`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * A slip angle, drawn as a shaded angle from a wheel.
 *
 * The same idiom the cornering diagram uses in the main app: the angle between
 * where the wheel points and where it is actually going, shaded so its width is
 * the thing you read. Deliberately not called a wedge -- that is jargon nobody
 * outside this codebase uses.
 */
function shadedAngle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  colour: string
): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  // Screen y is down, so a positive (left) angle sweeps anticlockwise.
  ctx.arc(cx, cy, radius, -Math.PI / 2 - from, -Math.PI / 2 - to, to > from)
  ctx.closePath()
  ctx.fillStyle = colour
  ctx.globalAlpha = 0.28
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = colour
  ctx.lineWidth = 1.5
  ctx.stroke()
}

/** The whole box, from a reading. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  config: DrawConfig,
  reading: OverlayReadingView | null,
  status: DrawStatus
): void {
  const { width: W, height: H, textScale: k } = config
  ctx.clearRect(0, 0, W, H)

  const colour = reading ? usageColour(reading.usage) : FAINT
  const pad = 10

  // Backing panel. Dark and slightly translucent so it reads over any track
  // surface; the window's own opacity is applied on top of this.
  ctx.fillStyle = 'rgba(11, 15, 20, 0.72)'
  roundRect(ctx, 1, 1, W - 2, H - 2, 8)
  ctx.fill()
  ctx.strokeStyle = colour
  ctx.lineWidth = 2
  ctx.stroke()

  if (!reading) {
    ctx.fillStyle = DIM
    ctx.font = `${13 * k}px Inter, "Segoe UI", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(status.connected ? 'waiting for data' : 'not connected', W / 2, H / 2 - 6 * k)
    ctx.fillStyle = FAINT
    ctx.font = `${10 * k}px Inter, "Segoe UI", system-ui, sans-serif`
    // The detail line is the difference between a user who can fix it and one
    // who cannot, so it is worth the space even in the empty state.
    wrapText(ctx, status.detail, W / 2, H / 2 + 12 * k, W - 2 * pad, 12 * k)
    ctx.textAlign = 'left'
    return
  }

  let y = pad

  // ---- the verdict ------------------------------------------------------
  ctx.textAlign = 'center'
  ctx.fillStyle = colour
  ctx.font = `700 ${20 * k}px Inter, "Segoe UI", system-ui, sans-serif`
  ctx.fillText(reading.text, W / 2, y + 18 * k)
  y += 26 * k

  ctx.font = `${10 * k}px Inter, "Segoe UI", system-ui, sans-serif`
  ctx.fillStyle = DIM
  const zoneWord =
    reading.zone === 'under' ? 'under the limit' : reading.zone === 'at' ? 'at the limit' : 'sliding'
  ctx.fillText(
    `${zoneWord} · ${Math.round(reading.usage * 100)}%${reading.provisional ? ' · learning' : ''}`,
    W / 2,
    y + 10 * k
  )
  y += 18 * k
  ctx.textAlign = 'left'

  // ---- the diagram ------------------------------------------------------
  if (config.showDiagram) {
    const boxH = Math.min(H - y - (config.showBars ? 46 * k : 14 * k), 120 * k)
    if (boxH > 40) {
      drawSlipDiagram(ctx, pad, y, W - 2 * pad, boxH, reading, k, config.showNumbers)
      y += boxH + 6
    }
  }

  // ---- the usage bars ---------------------------------------------------
  if (config.showBars && y < H - 30 * k) {
    drawUsageBar(ctx, pad, y, W - 2 * pad, 9 * k, 'F', reading.usageFront, FRONT, k)
    y += 13 * k
    drawUsageBar(ctx, pad, y, W - 2 * pad, 9 * k, 'R', reading.usageRear, REAR, k)
  }
}

/** Front and rear slip angles as shaded angles either side of a car. */
function drawSlipDiagram(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: OverlayReadingView,
  k: number,
  showNumbers: boolean
): void {
  const cx = x + w / 2
  const top = y + 8
  const bottom = y + h - 8
  const half = (bottom - top) / 2
  const midY = top + half

  // Real slip angles are a few degrees and would be invisible. Everything is
  // scaled by ONE factor so the construction stays consistent.
  const biggest = Math.max(Math.abs(r.alphaFront), Math.abs(r.alphaRear), 0.02)
  const exaggeration = Math.min(Math.max(0.6 / biggest, 1), 14)

  // Car body: a simple centreline with two axles.
  ctx.strokeStyle = DIM
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, top)
  ctx.lineTo(cx, bottom)
  ctx.stroke()

  const axleHalf = Math.min(w * 0.16, 26)
  for (const [ay, colour] of [
    [top, FRONT],
    [bottom, REAR]
  ] as const) {
    ctx.strokeStyle = colour
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - axleHalf, ay)
    ctx.lineTo(cx + axleHalf, ay)
    ctx.stroke()
  }

  // The shaded angles: from the car's centreline to where each axle is really
  // travelling. The wider one is the end that is giving up.
  const radius = Math.min(half * 0.85, w * 0.3)
  shadedAngle(ctx, cx, top, radius, 0, r.alphaFront * exaggeration, FRONT)
  shadedAngle(ctx, cx, bottom, radius, 0, r.alphaRear * exaggeration, REAR)

  if (showNumbers) {
    const deg = (a: number): string => `${Math.abs((a * 180) / Math.PI).toFixed(1)}°`
    ctx.font = `${10 * k}px Inter, "Segoe UI", system-ui, sans-serif`
    ctx.fillStyle = FRONT
    ctx.textAlign = 'left'
    ctx.fillText(deg(r.alphaFront), x + 2, top + 4)
    ctx.fillStyle = REAR
    ctx.fillText(deg(r.alphaRear), x + 2, bottom + 4)

    ctx.fillStyle = FAINT
    ctx.textAlign = 'right'
    ctx.fillText(`${r.ay.toFixed(2)} g`, x + w - 2, midY - 4)
    ctx.fillText(`${Math.round(r.speed * 3.6)} km/h`, x + w - 2, midY + 9 * k)
    ctx.textAlign = 'left'
    ctx.fillStyle = FAINT
    ctx.font = `${8.5 * k}px Inter, "Segoe UI", system-ui, sans-serif`
    ctx.fillText(`angles ×${exaggeration.toFixed(1)}`, x + 2, bottom + 14 * k)
  }
}

/** One axle's share of its own peak slip angle. */
function drawUsageBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  usage: number,
  labelColour: string,
  k: number
): void {
  const labelW = 12 * k
  const barX = x + labelW
  const barW = w - labelW

  ctx.fillStyle = labelColour
  ctx.font = `600 ${9 * k}px Inter, "Segoe UI", system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(label, x, y + h - 1)

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, barX, y, barW, h, h / 2)
  ctx.fill()

  const filled = Math.max(0, Math.min(usage, 1.25)) / 1.25
  ctx.fillStyle = usageColour(usage)
  roundRect(ctx, barX, y, Math.max(barW * filled, h), h, h / 2)
  ctx.fill()

  // The limit itself, marked, so "at 100%" is a place on the bar rather than a
  // number to be remembered.
  const limitX = barX + barW * (1 / 1.25)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(limitX, y - 1)
  ctx.lineTo(limitX, y + h + 1)
  ctx.stroke()
}

/** Wrap a status sentence into the box rather than letting it run off the edge. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ')
  let line = ''
  let cursor = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, cursor)
      line = word
      cursor += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, cx, cursor)
}

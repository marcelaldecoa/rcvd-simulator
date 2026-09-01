/**
 * Overlay configuration -- what the driver is allowed to change, and the rules
 * that keep any of it from producing an unusable window.
 *
 * Kept pure and separate from the file I/O so the validation is testable. That
 * matters more than usual here: a bad value in a persisted config file would be
 * read at startup, and an overlay that opens at 4 pixels wide, fully
 * transparent, and off the edge of the screen is one the user cannot see well
 * enough to fix. Every field is clamped on the way in and on the way out.
 */

export interface OverlayConfig {
  /** Whether the overlay window exists at all. */
  enabled: boolean
  /** Top-left position in screen pixels. Null means "place it for me". */
  x: number | null
  y: number | null
  width: number
  height: number
  /** Multiplier on every font size in the overlay. */
  textScale: number
  /** Window opacity, 0.15 to 1. */
  opacity: number
  /**
   * Locked means click-through: the overlay ignores the mouse entirely so it
   * cannot steal a click from the game. Unlocking it makes it draggable.
   */
  locked: boolean
  /** Show the slip-angle diagram, or just the text and bars. */
  showDiagram: boolean
  /** Show the per-axle usage bars. */
  showBars: boolean
  /** Show the numeric slip angles alongside the diagram. */
  showNumbers: boolean
}

export const OVERLAY_DEFAULTS: OverlayConfig = {
  enabled: false,
  x: null,
  y: null,
  width: 320,
  height: 260,
  textScale: 1,
  opacity: 0.85,
  locked: true,
  showDiagram: true,
  showBars: true,
  showNumbers: true
}

/** Bounds, in one place, so the UI sliders and the validator cannot disagree. */
export const OVERLAY_LIMITS = {
  width: { min: 180, max: 900 },
  height: { min: 140, max: 800 },
  textScale: { min: 0.6, max: 2.5 },
  opacity: { min: 0.15, max: 1 }
} as const

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/**
 * Coerce anything into a usable config.
 *
 * Takes `unknown` on purpose: the input is a JSON file a user could have edited
 * by hand, or one written by an older version of the app. Anything unreadable
 * falls back to the default for that field rather than rejecting the whole
 * file, so one bad value never costs the user the rest of their settings.
 */
export function normaliseOverlayConfig(input: unknown): OverlayConfig {
  const o = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const d = OVERLAY_DEFAULTS
  return {
    enabled: bool(o.enabled, d.enabled),
    // Null is meaningful -- it asks the window manager to place the overlay --
    // so it survives, but a non-finite number does not.
    x: o.x === null || o.x === undefined ? null : Number.isFinite(o.x) ? (o.x as number) : null,
    y: o.y === null || o.y === undefined ? null : Number.isFinite(o.y) ? (o.y as number) : null,
    width: Math.round(clamp(num(o.width, d.width), OVERLAY_LIMITS.width.min, OVERLAY_LIMITS.width.max)),
    height: Math.round(
      clamp(num(o.height, d.height), OVERLAY_LIMITS.height.min, OVERLAY_LIMITS.height.max)
    ),
    textScale: clamp(
      num(o.textScale, d.textScale),
      OVERLAY_LIMITS.textScale.min,
      OVERLAY_LIMITS.textScale.max
    ),
    opacity: clamp(num(o.opacity, d.opacity), OVERLAY_LIMITS.opacity.min, OVERLAY_LIMITS.opacity.max),
    locked: bool(o.locked, d.locked),
    showDiagram: bool(o.showDiagram, d.showDiagram),
    showBars: bool(o.showBars, d.showBars),
    showNumbers: bool(o.showNumbers, d.showNumbers)
  }
}

/** Apply a partial change, validating the result. */
export function applyOverlayConfig(
  current: OverlayConfig,
  patch: Partial<OverlayConfig>
): OverlayConfig {
  return normaliseOverlayConfig({ ...current, ...patch })
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Keep the window somewhere the user can actually reach it.
 *
 * A saved position is only valid until the monitor arrangement changes --
 * unplug a second screen and a perfectly good config now points off into
 * nowhere. Rather than trust it, the position is checked against the displays
 * that exist NOW and nudged back if it has been orphaned.
 */
export function constrainToDisplays(
  config: OverlayConfig,
  displays: Rect[],
  /** How much of the window must be visible for the position to count as usable. */
  minVisible = 80
): { x: number; y: number } {
  const width = config.width
  const height = config.height

  const fallback = (): { x: number; y: number } => {
    const d = displays[0] ?? { x: 0, y: 0, width: 1920, height: 1080 }
    return { x: Math.round(d.x + d.width - width - 40), y: Math.round(d.y + 60) }
  }

  if (config.x === null || config.y === null) return fallback()

  const x = config.x
  const y = config.y
  const visible = displays.some((d) => {
    const overlapX = Math.min(x + width, d.x + d.width) - Math.max(x, d.x)
    const overlapY = Math.min(y + height, d.y + d.height) - Math.max(y, d.y)
    return overlapX >= Math.min(minVisible, width) && overlapY >= Math.min(minVisible, height)
  })

  return visible ? { x: Math.round(x), y: Math.round(y) } : fallback()
}

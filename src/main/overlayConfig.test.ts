/**
 * Overlay configuration validation.
 *
 * These tests exist because of one failure mode: a bad value in a persisted
 * config file is read at startup, and an overlay that opens four pixels wide,
 * fully transparent and off the edge of the screen is one the user cannot see
 * well enough to fix. Every path in has to be clamped.
 */

import { describe, expect, it } from 'vitest'
import {
  OVERLAY_DEFAULTS,
  OVERLAY_LIMITS,
  applyOverlayConfig,
  constrainToDisplays,
  normaliseOverlayConfig
} from './overlayConfig.js'

describe('normalising whatever was on disk', () => {
  it('returns the defaults for nothing at all', () => {
    expect(normaliseOverlayConfig(undefined)).toEqual(OVERLAY_DEFAULTS)
    expect(normaliseOverlayConfig(null)).toEqual(OVERLAY_DEFAULTS)
    expect(normaliseOverlayConfig('not a config')).toEqual(OVERLAY_DEFAULTS)
  })

  it('clamps a window too small to see or too large to be sane', () => {
    expect(normaliseOverlayConfig({ width: 4, height: 4 }).width).toBe(OVERLAY_LIMITS.width.min)
    expect(normaliseOverlayConfig({ width: 99999 }).width).toBe(OVERLAY_LIMITS.width.max)
  })

  it('refuses to make the overlay invisible', () => {
    // Opacity zero is the one setting a user can apply and then be unable to
    // find their way back from.
    expect(normaliseOverlayConfig({ opacity: 0 }).opacity).toBe(OVERLAY_LIMITS.opacity.min)
    expect(normaliseOverlayConfig({ opacity: -3 }).opacity).toBe(OVERLAY_LIMITS.opacity.min)
    expect(normaliseOverlayConfig({ opacity: 5 }).opacity).toBe(1)
  })

  it('clamps text scale to something readable', () => {
    expect(normaliseOverlayConfig({ textScale: 0.01 }).textScale).toBe(OVERLAY_LIMITS.textScale.min)
    expect(normaliseOverlayConfig({ textScale: 40 }).textScale).toBe(OVERLAY_LIMITS.textScale.max)
  })

  it('keeps one bad field from costing the user the rest', () => {
    const c = normaliseOverlayConfig({ width: 'wide', height: 300, opacity: 0.5, textScale: 1.4 })
    expect(c.width).toBe(OVERLAY_DEFAULTS.width)
    expect(c.height).toBe(300)
    expect(c.opacity).toBe(0.5)
    expect(c.textScale).toBe(1.4)
  })

  it('rounds pixel dimensions, since a fractional window is meaningless', () => {
    const c = normaliseOverlayConfig({ width: 320.7, height: 260.2 })
    expect(Number.isInteger(c.width)).toBe(true)
    expect(Number.isInteger(c.height)).toBe(true)
  })

  it('treats null position as meaningful and a bad number as absent', () => {
    // Null asks the window manager to place it; NaN is corruption.
    expect(normaliseOverlayConfig({ x: null, y: null }).x).toBeNull()
    expect(normaliseOverlayConfig({ x: NaN, y: 10 }).x).toBeNull()
    expect(normaliseOverlayConfig({ x: 400, y: 200 }).x).toBe(400)
  })

  it('is idempotent, so saving a loaded config changes nothing', () => {
    const once = normaliseOverlayConfig({ width: 9999, opacity: 0, textScale: 0.01 })
    expect(normaliseOverlayConfig(once)).toEqual(once)
  })

  it('validates a patch rather than trusting it', () => {
    const c = applyOverlayConfig(OVERLAY_DEFAULTS, { opacity: 99, width: 1 })
    expect(c.opacity).toBe(1)
    expect(c.width).toBe(OVERLAY_LIMITS.width.min)
    expect(c.height).toBe(OVERLAY_DEFAULTS.height)
  })
})

describe('keeping the window somewhere the user can reach it', () => {
  const single = [{ x: 0, y: 0, width: 1920, height: 1080 }]
  const dual = [
    { x: 0, y: 0, width: 1920, height: 1080 },
    { x: 1920, y: 0, width: 1920, height: 1080 }
  ]

  it('places an unpositioned overlay near the top right', () => {
    const p = constrainToDisplays({ ...OVERLAY_DEFAULTS, x: null, y: null }, single)
    expect(p.x).toBeGreaterThan(1920 / 2)
    expect(p.y).toBeLessThan(1080 / 2)
  })

  it('leaves a good position alone', () => {
    const p = constrainToDisplays({ ...OVERLAY_DEFAULTS, x: 300, y: 200 }, single)
    expect(p).toEqual({ x: 300, y: 200 })
  })

  it('rescues a position orphaned by unplugging a monitor', () => {
    // The realistic failure: the overlay was on the second screen, the screen
    // is gone, and the saved position now points into nowhere.
    const onSecond = { ...OVERLAY_DEFAULTS, x: 2400, y: 300 }
    expect(constrainToDisplays(onSecond, dual)).toEqual({ x: 2400, y: 300 })
    const rescued = constrainToDisplays(onSecond, single)
    expect(rescued.x).toBeLessThan(1920)
  })

  it('rescues a window dragged almost entirely off the edge', () => {
    const p = constrainToDisplays({ ...OVERLAY_DEFAULTS, x: 1900, y: 1060 }, single)
    expect(p.x).toBeLessThan(1900)
  })

  it('tolerates having no displays at all rather than throwing', () => {
    const p = constrainToDisplays({ ...OVERLAY_DEFAULTS, x: null, y: null }, [])
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })
})

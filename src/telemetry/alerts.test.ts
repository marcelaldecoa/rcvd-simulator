/**
 * The audible cue's trigger logic.
 *
 * Every test here is about NOT making a sound. That is the whole engineering
 * problem: a cue that fires whenever a number crosses a line becomes a car
 * alarm, and a driver stops hearing a car alarm within a lap — at which point
 * it is worse than silence, because it occupies attention and carries nothing.
 */

import { describe, expect, it } from 'vitest'
import { AlertTracker, type AlertInput } from './alerts.js'

const at = (usageFront: number, usageRear: number): AlertInput => ({
  valid: true,
  usageFront,
  usageRear
})

describe('when the overlay should speak', () => {
  it('warns on the approach, not after the event', () => {
    const a = new AlertTracker()
    // 0.92 of the front axle's own peak: still gripping, about not to be.
    expect(a.update(at(0.92, 0.4), 0)).toBe('frontLimit')
  })

  it('stays quiet well under the limit', () => {
    const a = new AlertTracker()
    for (let i = 0; i < 100; i++) {
      expect(a.update(at(0.5, 0.5), i / 60)).toBeNull()
    }
  })

  it('fires once per corner, not once per frame', () => {
    const a = new AlertTracker()
    let fired = 0
    // Two seconds held above the threshold, at 60 Hz.
    for (let i = 0; i < 120; i++) {
      if (a.update(at(0.95, 0.4), i / 60)) fired++
    }
    expect(fired).toBe(1)
  })

  it('does not retrigger on a number hovering at the threshold', () => {
    const a = new AlertTracker()
    let fired = 0
    // Dithering either side of 0.9 by a hundredth, for five seconds. Without
    // hysteresis this is the classic alarm: dozens of cues in one corner.
    for (let i = 0; i < 300; i++) {
      const usage = 0.9 + (i % 2 === 0 ? 0.01 : -0.01)
      if (a.update(at(usage, 0.4), i / 60)) fired++
    }
    expect(fired).toBe(1)
  })

  it('speaks again for a genuinely separate corner', () => {
    const a = new AlertTracker()
    expect(a.update(at(0.95, 0.4), 0)).toBe('frontLimit')
    // Clearly released between corners...
    for (let i = 1; i < 120; i++) a.update(at(0.3, 0.3), i / 60)
    // ...then loaded up again, well past the minimum interval.
    expect(a.update(at(0.95, 0.4), 3)).toBe('frontLimit')
  })

  it('keeps a chicane from becoming a burst', () => {
    const a = new AlertTracker()
    expect(a.update(at(0.95, 0.4), 0)).toBe('frontLimit')
    a.update(at(0.3, 0.3), 0.2)
    // Armed again, but only 0.4 s later: too soon to be useful, so silent.
    expect(a.update(at(0.95, 0.4), 0.4)).toBeNull()
  })

  it('tells the two ends apart', () => {
    const a = new AlertTracker()
    expect(a.update(at(0.4, 0.95), 0)).toBe('rearLimit')
    for (let i = 0; i < 200; i++) a.update(at(0.3, 0.3), 1 + i / 60)
    expect(a.update(at(0.95, 0.4), 6)).toBe('frontLimit')
  })

  it('names the end that is further gone when both are close', () => {
    const a = new AlertTracker()
    expect(a.update(at(0.92, 0.99), 0)).toBe('rearLimit')
  })

  it('does not let the silent axle fire on the next frame', () => {
    // Both crossed; only one sounded. If the other stayed armed it would fire
    // immediately afterwards and the minimum interval would mean nothing.
    const a = new AlertTracker()
    expect(a.update(at(0.92, 0.99), 0)).toBe('rearLimit')
    expect(a.update(at(0.92, 0.99), 1 / 60)).toBeNull()
    expect(a.update(at(0.92, 0.99), 2)).toBeNull()
  })

  it('says nothing at all when there is nothing to measure', () => {
    const a = new AlertTracker()
    // A parked car reports usage 0 and valid false. It must not somehow
    // arm-and-fire when the car starts moving.
    for (let i = 0; i < 60; i++) {
      expect(a.update({ valid: false, usageFront: 0, usageRear: 0 }, i / 60)).toBeNull()
    }
    expect(a.update(at(0.4, 0.4), 1)).toBeNull()
  })

  it('honours a cue being switched off', () => {
    const a = new AlertTracker({ front: false })
    expect(a.update(at(0.99, 0.4), 0)).toBeNull()
    expect(a.update(at(0.99, 0.95), 5)).toBe('rearLimit')
  })

  it('can be retuned without being rebuilt', () => {
    const a = new AlertTracker()
    a.configure({ threshold: 0.99 })
    expect(a.update(at(0.95, 0.4), 0)).toBeNull()
    expect(a.update(at(0.995, 0.4), 1)).toBe('frontLimit')
  })
})

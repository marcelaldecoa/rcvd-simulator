/**
 * When the overlay should make a sound.
 *
 * The hard part of an audible driving aid is not making noise, it is making
 * noise rarely enough to mean something. A cue that fires every time a number
 * wobbles across a threshold becomes a car alarm: the driver stops hearing it
 * within a lap, and it is then worse than silence because it occupies attention
 * without carrying information.
 *
 * So three rules, and each exists to kill a specific way of being annoying:
 *
 *   THRESHOLD BELOW THE LIMIT. The cue fires on the APPROACH, not the event.
 *   By the time a rear axle has actually let go, the driver's inner ear has
 *   already told them and a speaker is late. What they cannot feel is the last
 *   tenth before it happens, and that is what is worth saying. Understeer
 *   especially: it is undramatic, it is easy to miss, and it is where a driver
 *   loses time without noticing.
 *
 *   HYSTERESIS. Usage hovering at the threshold would otherwise retrigger on
 *   every frame that crosses it. A cue must fall clearly back below before it
 *   can fire again, so one corner produces one cue.
 *
 *   A MINIMUM INTERVAL. Even with hysteresis, a sequence of quick corners can
 *   legitimately arm and fire repeatedly. A floor on the gap keeps a chicane
 *   from becoming a burst.
 *
 * Front and rear are tracked separately, because they are different messages,
 * but only one sounds at a time -- whichever axle is further into its own
 * limit. Two tones at once is a chord, not information.
 */

export type AlertCue = 'frontLimit' | 'rearLimit'

export interface AlertOptions {
  /** Fraction of an axle's own peak at which the cue fires. */
  threshold?: number
  /** How far below the threshold usage must fall before it can fire again. */
  releaseBand?: number
  /** Shortest gap between cues, seconds. */
  minInterval?: number
  /** Whether each cue is wanted at all. */
  front?: boolean
  rear?: boolean
}

export const DEFAULT_ALERTS: Required<AlertOptions> = {
  // Below 1.0 deliberately: this is a warning, not a report.
  threshold: 0.9,
  releaseBand: 0.08,
  minInterval: 1.2,
  front: true,
  rear: true
}

/** The reading fields an alert depends on. */
export interface AlertInput {
  valid: boolean
  usageFront: number
  usageRear: number
}

export class AlertTracker {
  private armedFront = true
  private armedRear = true
  private lastAt = -Infinity
  private opts: Required<AlertOptions>

  constructor(opts: AlertOptions = {}) {
    this.opts = { ...DEFAULT_ALERTS, ...opts }
  }

  configure(opts: AlertOptions): void {
    this.opts = { ...this.opts, ...opts }
  }

  reset(): void {
    this.armedFront = true
    this.armedRear = true
    this.lastAt = -Infinity
  }

  /**
   * Decide what to play, if anything.
   *
   * `t` is seconds; any monotonic clock will do. Returns null far more often
   * than not, which is the point.
   */
  update(reading: AlertInput, t: number): AlertCue | null {
    const { threshold, releaseBand, minInterval, front, rear } = this.opts

    // Not measuring: say nothing, and re-arm so that coming back up to speed
    // does not immediately fire on a stale armed state.
    if (!reading.valid) {
      this.armedFront = true
      this.armedRear = true
      return null
    }

    const release = threshold - releaseBand

    // Re-arm first. An axle that has dropped clear can fire again next time,
    // including within this same call if it then crosses -- which cannot
    // happen, but ordering it this way means the state is never stale.
    if (reading.usageFront < release) this.armedFront = true
    if (reading.usageRear < release) this.armedRear = true

    const frontReady = front && this.armedFront && reading.usageFront >= threshold
    const rearReady = rear && this.armedRear && reading.usageRear >= threshold
    if (!frontReady && !rearReady) return null

    // Disarm both ends that crossed, even if only one gets to sound. Otherwise
    // the silent one fires on the very next frame and the interval is defeated.
    if (frontReady) this.armedFront = false
    if (rearReady) this.armedRear = false

    if (t - this.lastAt < minInterval) return null
    this.lastAt = t

    // Whichever axle is further into its own limit. Comparing usage rather than
    // raw slip angle is what makes this fair between two axles whose peaks are
    // at different angles.
    if (frontReady && rearReady) {
      return reading.usageRear > reading.usageFront ? 'rearLimit' : 'frontLimit'
    }
    return frontReady ? 'frontLimit' : 'rearLimit'
  }
}

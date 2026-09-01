/**
 * The overlay's audible cues.
 *
 * Synthesised rather than shipped as files. Three reasons, in order of how much
 * they mattered:
 *
 *   A cue has to cut through engine noise and a headset without being loud, so
 *   it wants a narrow, clean spectrum in a band the car is not already filling.
 *   That is easier to tune as an oscillator than to source as a sample.
 *
 *   The two ends must be distinguishable WITHOUT LOOKING, which is the entire
 *   point of a sound. Pitch does that: the front cue is low, the rear cue is
 *   high, and the mapping is arbitrary but consistent. A driver learns it in a
 *   lap.
 *
 *   And there are no binary assets to ship, license or keep in sync with a
 *   build.
 *
 * Every cue is short. A long sound is still playing when the corner has moved
 * on, which is worse than not playing at all.
 */

export type CueKind = 'tone' | 'blip' | 'chirp'
export type CueEnd = 'front' | 'rear'

export interface SoundConfig {
  enabled: boolean
  /** 0-1. */
  volume: number
  kind: CueKind
}

/** Front low, rear high. Fifths apart, so they are unmistakable. */
const PITCH: Record<CueEnd, number> = {
  front: 440,
  rear: 660
}

export class CuePlayer {
  private ctx: AudioContext | null = null
  private failed = false

  /**
   * The context is created on first use rather than at construction.
   *
   * An AudioContext made before the page is allowed to play starts suspended,
   * and in that state the first cue -- the one that matters, because it is the
   * first time the driver learns the sound means something -- is silently
   * dropped. Creating it late, and resuming it every time, means a cue either
   * plays or reports why it could not.
   */
  private context(): AudioContext | null {
    if (this.failed) return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
      } catch {
        this.failed = true
        return null
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** True when audio is usable at all, for the settings UI to report. */
  get available(): boolean {
    return !this.failed
  }

  play(end: CueEnd, config: SoundConfig): void {
    if (!config.enabled || config.volume <= 0) return
    const ctx = this.context()
    if (!ctx) return

    const base = PITCH[end]
    const now = ctx.currentTime
    // Well below 1 even at full volume: this sits under a driver's audio, not
    // over it, and a startling noise mid-corner is an active hazard.
    const peak = Math.min(1, Math.max(0, config.volume)) * 0.22

    switch (config.kind) {
      case 'blip':
        // Two short pulses. Reads as deliberate rather than as a system beep.
        this.pulse(ctx, base, now, 0.055, peak)
        this.pulse(ctx, base, now + 0.085, 0.055, peak)
        break
      case 'chirp': {
        // A rising sweep: urgency without volume, which is the trade worth
        // making when the sound has to be quiet.
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(base * 0.8, now)
        osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.16)
        this.envelope(gain, now, 0.18, peak)
        osc.connect(gain).connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.2)
        break
      }
      default:
        this.pulse(ctx, base, now, 0.13, peak)
    }
  }

  private pulse(
    ctx: AudioContext,
    freq: number,
    at: number,
    length: number,
    peak: number
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, at)
    this.envelope(gain, at, length, peak)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + length + 0.02)
  }

  /**
   * A ramped envelope, because a square-edged one clicks.
   *
   * The click is broadband and is the part that actually annoys over a stint --
   * more than the tone itself.
   */
  private envelope(gain: GainNode, at: number, length: number, peak: number): void {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  }

  /** Let the settings UI demonstrate a cue without driving. */
  preview(end: CueEnd, config: SoundConfig): void {
    this.play(end, { ...config, enabled: true })
  }
}

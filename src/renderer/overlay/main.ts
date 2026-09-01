/**
 * The overlay renderer.
 *
 * Does nothing but paint. Every number it draws was computed in the main
 * process, because at 60 Hz over a running game there is no budget here for
 * estimating sideslip as well as rendering.
 *
 * Painting is driven by requestAnimationFrame rather than by the arrival of a
 * reading. Data comes in at whatever rate the source runs; the display should
 * run at whatever rate the compositor wants. Decoupling them means a burst of
 * samples cannot queue up frames, and a gap in the data leaves the last frame
 * up rather than blanking.
 */

import { drawOverlay, type DrawConfig, type DrawStatus, type OverlayReadingView } from './draw.js'
import { CuePlayer, type SoundConfig } from './sound.js'
import { AlertTracker } from '@telemetry/alerts.js'

interface SoundSettings extends SoundConfig {
  front: boolean
  rear: boolean
  threshold: number
}

interface OverlayBridge {
  onConfig: (
    fn: (
      c: DrawConfig & {
        locked: boolean
        soundEnabled: boolean
        soundVolume: number
        soundKind: SoundConfig['kind']
        soundFront: boolean
        soundRear: boolean
        soundThreshold: number
      }
    ) => void
  ) => void
  onReading: (fn: (r: OverlayReadingView | null) => void) => void
  onStatus: (fn: (s: DrawStatus) => void) => void
}

const bridge = (window as unknown as { rcvdOverlay?: OverlayBridge }).rcvdOverlay

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')

let config: DrawConfig = {
  width: 320,
  height: 260,
  textScale: 1,
  showDiagram: true,
  showBars: true,
  showNumbers: true
}
let reading: OverlayReadingView | null = null
let status: DrawStatus = { connected: false, detail: 'starting up' }
let dirty = true

// Audible cues. The decision of WHETHER to sound lives in the shared, tested
// tracker; this file only decides what it sounds like.
const cues = new CuePlayer()
const alerts = new AlertTracker()
let sound: SoundSettings = {
  enabled: false,
  volume: 0.6,
  kind: 'blip',
  front: true,
  rear: true,
  threshold: 0.9
}

/**
 * Match the backing store to the device pixel ratio.
 *
 * Without this the box is soft on any scaled display, which for something read
 * in peripheral vision at a glance is worse than it sounds.
 */
function resize(): void {
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  config = { ...config, width: w, height: h }
  dirty = true
}

function frame(): void {
  if (ctx && dirty) {
    drawOverlay(ctx, config, reading, status)
    dirty = false
  }
  requestAnimationFrame(frame)
}

if (bridge) {
  bridge.onConfig((c) => {
    config = {
      ...config,
      textScale: c.textScale,
      showDiagram: c.showDiagram,
      showBars: c.showBars,
      showNumbers: c.showNumbers
    }
    sound = {
      enabled: c.soundEnabled,
      volume: c.soundVolume,
      kind: c.soundKind,
      front: c.soundFront,
      rear: c.soundRear,
      threshold: c.soundThreshold
    }
    alerts.configure({
      threshold: sound.threshold,
      front: sound.front,
      rear: sound.rear
    })
    // The drag handle only exists when the window is unlocked; while locked the
    // whole window is click-through anyway and the class would do nothing.
    document.body.classList.toggle('unlocked', !c.locked)
    dirty = true
  })
  bridge.onReading((r) => {
    reading = r
    dirty = true
    if (!sound.enabled || !r) return
    // performance.now() is milliseconds and monotonic, which is exactly what
    // the tracker's intervals want -- and unlike the sample timestamp it does
    // not jump when a session restarts.
    const cue = alerts.update(r, performance.now() / 1000)
    if (cue) cues.play(cue === 'frontLimit' ? 'front' : 'rear', sound)
  })
  bridge.onStatus((s) => {
    status = s
    dirty = true
  })
} else {
  status = { connected: false, detail: 'overlay bridge unavailable' }
}

window.addEventListener('resize', resize)
resize()
requestAnimationFrame(frame)

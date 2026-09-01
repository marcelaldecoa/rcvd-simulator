/**
 * Capture screenshots of the overlay, for the README.
 *
 * Drives the REAL overlay window over the REAL IPC channel, so what lands in
 * docs/images is what the renderer actually draws rather than a mock-up. If the
 * overlay's appearance changes, re-running this updates the documentation, and
 * if it breaks, this fails rather than quietly shipping a stale picture.
 *
 *   npm run capture:overlay
 */
import { app, BrowserWindow } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

await import('../out/main/index.js')

const OUT = resolve('docs/images')
const DEG = Math.PI / 180

/** States chosen to show the three colours and both balance verdicts. */
const SHOTS = [
  {
    name: 'overlay-under',
    config: { enabled: true, width: 320, height: 260, textScale: 1, opacity: 1, locked: true },
    reading: {
      balance: 'neutral',
      text: 'NEUTRAL',
      zone: 'under',
      usage: 0.42,
      usageFront: 0.42,
      usageRear: 0.4,
      limitingAxle: 'front',
      provisional: false,
      alphaFront: 2.1 * DEG,
      alphaRear: 2.0 * DEG,
      beta: -1.2 * DEG,
      ay: 0.72,
      speed: 41
    }
  },
  {
    name: 'overlay-at-limit',
    config: { enabled: true, width: 320, height: 260, textScale: 1, opacity: 1, locked: true },
    reading: {
      balance: 'understeer',
      text: 'UNDERSTEER',
      zone: 'at',
      usage: 0.93,
      usageFront: 0.93,
      usageRear: 0.71,
      limitingAxle: 'front',
      provisional: false,
      alphaFront: 5.6 * DEG,
      alphaRear: 3.6 * DEG,
      beta: -2.4 * DEG,
      ay: 1.48,
      speed: 38
    }
  },
  {
    name: 'overlay-over',
    config: { enabled: true, width: 320, height: 260, textScale: 1, opacity: 1, locked: true },
    reading: {
      balance: 'oversteer',
      text: 'OVERSTEER',
      zone: 'over',
      usage: 1.18,
      usageFront: 0.78,
      usageRear: 1.18,
      limitingAxle: 'rear',
      provisional: false,
      alphaFront: 4.7 * DEG,
      alphaRear: 8.3 * DEG,
      beta: -6.9 * DEG,
      ay: 1.33,
      speed: 36
    }
  },
  {
    name: 'overlay-learning',
    config: { enabled: true, width: 320, height: 260, textScale: 1, opacity: 1, locked: true },
    reading: {
      balance: 'understeer',
      text: 'UNDERSTEER',
      zone: 'under',
      usage: 0.55,
      usageFront: 0.55,
      usageRear: 0.4,
      limitingAxle: 'front',
      provisional: true,
      alphaFront: 3.3 * DEG,
      alphaRear: 2.0 * DEG,
      beta: -1.5 * DEG,
      ay: 0.91,
      speed: 44
    }
  },
  {
    name: 'overlay-large-text',
    config: { enabled: true, width: 420, height: 320, textScale: 1.6, opacity: 1, locked: true },
    reading: {
      balance: 'understeer',
      text: 'UNDERSTEER',
      zone: 'at',
      usage: 0.9,
      usageFront: 0.9,
      usageRear: 0.68,
      limitingAxle: 'front',
      provisional: false,
      alphaFront: 5.4 * DEG,
      alphaRear: 3.4 * DEG,
      beta: -2.2 * DEG,
      ay: 1.44,
      speed: 39
    }
  },
  {
    name: 'overlay-waiting',
    config: { enabled: true, width: 320, height: 260, textScale: 1, opacity: 1, locked: true },
    reading: null,
    status: { connected: false, detail: 'iRacing is not running, or has not opened its telemetry' }
  }
]

const settle = (ms) => new Promise((r) => setTimeout(r, ms))

const watchdog = setTimeout(() => {
  console.log('FAIL  capture exceeded 120 s')
  app.exit(1)
}, 120_000)

app.whenReady().then(async () => {
  await settle(1200)
  await mkdir(OUT, { recursive: true })

  const main = BrowserWindow.getAllWindows()[0]
  if (!main) {
    console.log('FAIL  no main window')
    return app.exit(1)
  }
  if (main.webContents.isLoading()) {
    await new Promise((r) => main.webContents.once('did-finish-load', r))
  }

  for (const shot of SHOTS) {
    // Applying the config through the real IPC handler is what creates or
    // resizes the overlay window, exactly as the settings UI does.
    await main.webContents.executeJavaScript(
      `window.rcvd.setOverlayConfig(${JSON.stringify(shot.config)})`
    )
    await settle(900)

    const overlay = BrowserWindow.getAllWindows().find((w) => w !== main)
    if (!overlay) {
      console.log(`FAIL  overlay window missing for ${shot.name}`)
      continue
    }
    if (overlay.webContents.isLoading()) {
      await new Promise((r) => overlay.webContents.once('did-finish-load', r))
    }

    overlay.webContents.send('overlay:status', shot.status ?? { connected: true, detail: 'connected' })
    overlay.webContents.send('overlay:reading', shot.reading)
    // Two frames: the renderer paints on requestAnimationFrame, so one tick is
    // not always enough to be sure the new state is on screen.
    await settle(400)

    const image = await overlay.webContents.capturePage()
    const file = join(OUT, `${shot.name}.png`)
    await writeFile(file, image.toPNG())
    console.log(`wrote ${file}  ${image.getSize().width}x${image.getSize().height}`)
  }

  await main.webContents.executeJavaScript('window.rcvd.setOverlayConfig({ enabled: false })')
  await settle(300)
  clearTimeout(watchdog)
  app.exit(0)
})

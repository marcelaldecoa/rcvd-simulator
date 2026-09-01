/**
 * Screenshot a lab from the running app, for the README.
 *
 * Same principle as capture-overlay.mjs: drive the real window rather than
 * mocking one up, so what lands in docs/images is what the app actually draws
 * and re-running this is enough to keep the documentation honest.
 *
 *   npm run capture:app
 */
import { app, BrowserWindow } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

await import('../out/main/index.js')

const OUT = resolve('docs/images')
const settle = (ms) => new Promise((r) => setTimeout(r, ms))

const watchdog = setTimeout(() => {
  console.log('FAIL  capture exceeded 90 s')
  app.exit(1)
}, 90_000)

app.whenReady().then(async () => {
  await settle(1500)
  await mkdir(OUT, { recursive: true })

  const win = BrowserWindow.getAllWindows()[0]
  if (!win) {
    console.log('FAIL  no window')
    return app.exit(1)
  }
  if (win.webContents.isLoading()) {
    await new Promise((r) => win.webContents.once('did-finish-load', r))
  }
  await settle(2500)
  // Big enough that the widget grid lays out in more than one column, which is
  // how anyone will actually see it.
  win.setSize(1500, 1000)
  await settle(400)

  const js = (code) => win.webContents.executeJavaScript(code)

  // Prefer the generated session file: it has laps, lap times and a heading
  // channel, so the whole dashboard is populated rather than half of it. The
  // synthetic sweep is a matrix of steady trims, not a lap.
  const ibt = resolve('.smoke-session.ibt')
  const source = existsSync(ibt) ? JSON.stringify({ file: ibt }) : "'synthetic'"
  if (!existsSync(ibt)) {
    console.log('note: .smoke-session.ibt missing, falling back to the synthetic sweep')
    console.log('      run `npm run smoke` first for a fuller screenshot')
  }

  await js(`(async () => {
    const SOURCE = ${source};
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Session Dashboard'))
    item.click()
    await new Promise(r => setTimeout(r, 400))
    await window.rcvd.selectSource(SOURCE)
    // Wait for the widgets, which need enough samples to have accumulated.
    const deadline = Date.now() + 25000
    while (Date.now() < deadline) {
      if (document.querySelectorAll('.dash-grid .panel').length > 0) break
      await new Promise(r => setTimeout(r, 200))
    }
    // A little longer, so the numbers settle rather than being caught mid-fill.
    await new Promise(r => setTimeout(r, 4000))
  })()`)

  const widgets = await js("document.querySelectorAll('.dash-grid .panel').length")
  if (!widgets) {
    console.log('FAIL  dashboard rendered no widgets')
    return app.exit(1)
  }

  const image = await win.webContents.capturePage()
  const file = join(OUT, 'dashboard.png')
  await writeFile(file, image.toPNG())
  console.log(`wrote ${file}  ${image.getSize().width}x${image.getSize().height}  ${widgets} widgets`)

  await js('window.rcvd.stopTelemetry()')
  clearTimeout(watchdog)
  app.exit(0)
})

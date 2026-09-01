/**
 * Screenshot the overlay's settings from the running app, for the README.
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

  // The audible-cue settings, which live with the rest of the overlay controls.
  await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('iRacing Telemetry'))
    item.click()
    await new Promise(r => setTimeout(r, 800))
    const panel = [...document.querySelectorAll('.panel')].find(
      p => p.querySelector('.panel-title')?.textContent === 'Audible warning'
    )
    if (!panel) throw new Error('audible warning panel missing')
    panel.scrollIntoView({ block: 'center' })
    await new Promise(r => setTimeout(r, 700))
  })()`)

  const image = await win.webContents.capturePage()
  const file = join(OUT, 'sound-settings.png')
  await writeFile(file, image.toPNG())
  console.log(`wrote ${file}  ${image.getSize().width}x${image.getSize().height}`)

  clearTimeout(watchdog)
  app.exit(0)
})

/**
 * End-to-end smoke test of the built app.
 *
 * It imports the REAL compiled main process, so the IPC handlers, the preload
 * bridge and the renderer bundle under test are exactly the ones that ship.
 * This is the one path `npm run dev:web` cannot exercise: in the browser
 * `readDoc` falls back to fetch, so a broken preload would go unnoticed there.
 *
 *   npm run smoke
 */
import { app, BrowserWindow } from 'electron'

// Importing the real main registers its whenReady handler before ours, so by
// the time we run, its IPC handlers exist and its window has been created.
await import('../out/main/index.js')

const checks = []
const record = (name, pass, detail = '') => {
  checks.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const settle = (ms) => new Promise((r) => setTimeout(r, ms))

app.whenReady().then(async () => {
  await settle(300)
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) {
    console.log('FAIL  main process created no window')
    return app.exit(1)
  }

  const consoleErrors = []
  win.webContents.on('console-message', (e) => {
    if (e.level === 'error') consoleErrors.push(e.message)
  })

  if (win.webContents.isLoading()) {
    await new Promise((r) => win.webContents.once('did-finish-load', r))
  }
  // Let React mount and the charts compute.
  await settle(2500)

  const js = (code) => win.webContents.executeJavaScript(code)

  const bridge = await js('typeof window.rcvd')
  record('preload bridge exposed', bridge === 'object', `typeof window.rcvd = ${bridge}`)

  const listed = await js('window.rcvd.listDocs().then(f => f.length)').catch(
    (e) => `ERROR ${e.message}`
  )
  record('listDocs over IPC', listed === 24, `${listed} documents`)

  const doc = await js(
    "window.rcvd.readDoc('ch06-transient-stability-and-control.md').then(t => t.length)"
  ).catch((e) => `ERROR ${e.message}`)
  record('readDoc over IPC', typeof doc === 'number' && doc > 1000, `${doc} chars`)

  const blocked = await js(
    "window.rcvd.readDoc('../package.json').then(() => 'ALLOWED', () => 'BLOCKED')"
  ).catch(() => 'BLOCKED')
  record('path traversal blocked', blocked === 'BLOCKED', String(blocked))

  const chapters = await js("document.querySelectorAll('.nav-item').length")
  record('renderer mounted', chapters === 24, `${chapters} chapters in the sidebar`)

  const curves = await js("document.querySelectorAll('.chart-svg path[stroke]').length")
  record('lab charts drawn', curves > 5, `${curves} plotted curves`)

  // Walk the three labs, checking each renders curves and readouts.
  for (const [n, name] of [
    [2, 'Tire Behavior'],
    [5, 'Steady-State'],
    [6, 'Transient']
  ]) {
    const got = await js(`(async () => {
      const items = [...document.querySelectorAll('.nav-item')]
      const item = items.find(e => e.textContent.includes(${JSON.stringify(name)}))
      if (!item) return { error: 'nav item not found' }
      item.click()
      await new Promise(r => setTimeout(r, 1200))
      return {
        curves: document.querySelectorAll('.chart-svg path[stroke]').length,
        readouts: document.querySelectorAll('.readout-value').length,
        nan: document.body.innerText.includes('NaN')
      }
    })()`)
    record(
      `Ch ${n} lab renders`,
      !got.error && got.curves > 3 && got.readouts > 3 && !got.nan,
      got.error ?? `${got.curves} curves, ${got.readouts} readouts${got.nan ? ', HAS NaN' : ''}`
    )
  }

  const katex = await js(`(async () => {
    document.querySelectorAll('.tab')[1].click()
    await new Promise(r => setTimeout(r, 1800))
    return document.querySelectorAll('.notes .katex').length
  })()`)
  record('notes render with KaTeX', katex > 10, `${katex} typeset expressions`)

  record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

  const failed = checks.filter((c) => !c.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  app.exit(failed === 0 ? 0 : 1)
})

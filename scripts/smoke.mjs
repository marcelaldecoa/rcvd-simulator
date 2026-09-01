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

// A watchdog. Without it, any throw inside an injected script leaves the
// Electron window open and the process alive with NO OUTPUT AT ALL, which
// turns a test failure into a hung job that is hard to diagnose.
const WATCHDOG_MS = 180_000
const watchdog = setTimeout(() => {
  console.log('FAIL  smoke run exceeded ' + WATCHDOG_MS / 1000 + 's - aborting')
  app.exit(1)
}, WATCHDOG_MS)

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
  // Overview + 23 chapters + glossary. Asserted as a floor rather than an
  // exact count, so adding a document is not a smoke-test failure.
  record('listDocs over IPC', listed >= 25, `${listed} documents`)

  const doc = await js(
    "window.rcvd.readDoc('ch06-transient-stability-and-control.md').then(t => t.length)"
  ).catch((e) => `ERROR ${e.message}`)
  record('readDoc over IPC', typeof doc === 'number' && doc > 1000, `${doc} chars`)

  const blocked = await js(
    "window.rcvd.readDoc('../package.json').then(() => 'ALLOWED', () => 'BLOCKED')"
  ).catch(() => 'BLOCKED')
  record('path traversal blocked', blocked === 'BLOCKED', String(blocked))

  const chapters = await js("document.querySelectorAll('.nav-item').length")
  record('renderer mounted', chapters === 28, `${chapters} nav entries in the sidebar`)

  // The app now opens on the cornering diagram, so check that specifically:
  // the slip-angle labels, the plain-language verdict, and the car itself.
  const front = await js(`(() => {
    const svg = document.querySelector('.panel svg')
    const texts = [...(svg?.querySelectorAll('text') ?? [])].map(t => t.textContent.trim())
    return {
      alphaF: texts.some(t => t.startsWith('αf')),
      alphaR: texts.some(t => t.startsWith('β') || t.startsWith('αr')),
      shadedAngles: (svg?.querySelectorAll('path[fill-opacity]') ?? []).length,
      verdict: document.querySelector('.verdict-headline')?.textContent?.trim() ?? '',
      experiments: document.querySelectorAll('.try-head').length,
      nan: document.body.innerText.includes('NaN')
    }
  })()`)
  record(
    'cornering diagram drawn',
    front.alphaF && front.alphaR && front.shadedAngles >= 3 && !front.nan,
    `${front.shadedAngles} slip angles shaded`
  )
  record(
    'plain-language verdict shown',
    /Understeer|Oversteer|Neutral/.test(front.verdict),
    front.verdict
  )
  record('guided experiments listed', front.experiments === 5, `${front.experiments} experiments`)

  // Walk the three chart dashboards. The cornering lab is deliberately
  // diagram-heavy rather than chart-heavy and is checked above instead.
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
      // Wait for content rather than guessing a duration: these labs do real
      // numerical work on mount (golden-section searches, ODE integration),
      // so a fixed sleep is a race that shows up as an empty page.
      const deadline = Date.now() + 6000
      while (Date.now() < deadline) {
        if (document.querySelectorAll('.chart-svg path[stroke]').length > 3) break
        await new Promise(r => setTimeout(r, 100))
      }
      await new Promise(r => setTimeout(r, 250))
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

  // Ch 2's contact patch and Ch 6's animated path are the intuition anchors
  // for those chapters; check each is actually on screen.
  const patch = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Tire Behavior'))
    item.click()
    await new Promise(r => setTimeout(r, 1200))
    const svg = [...document.querySelectorAll('.panel svg')].find(s => s.textContent.includes('leading edge'))
    return {
      found: !!svg,
      labels: svg ? [...svg.querySelectorAll('text')].map(t => t.textContent.trim()) : [],
      experiments: document.querySelectorAll('.try-head').length
    }
  })()`)
  record(
    'Ch 2 contact patch drawn',
    patch.found && patch.labels.includes('gripping') && patch.labels.includes('sliding'),
    patch.found ? 'gripping / sliding zones labelled' : 'not found'
  )
  record('Ch 2 experiments listed', patch.experiments === 4, `${patch.experiments} experiments`)

  const pathview = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Transient'))
    item.click()
    await new Promise(r => setTimeout(r, 1400))
    const svg = [...document.querySelectorAll('.panel svg')].find(s => s.textContent.includes('no steer input'))
    return {
      found: !!svg,
      labels: svg ? [...svg.querySelectorAll('text')].map(t => t.textContent.trim()) : [],
      experiments: document.querySelectorAll('.try-head').length
    }
  })()`)
  record(
    'Ch 6 path animation drawn',
    pathview.found &&
      pathview.labels.some((t) => t.includes('pointing')) &&
      pathview.labels.some((t) => t.includes('going')),
    pathview.found ? 'heading and course both drawn' : 'not found'
  )
  record('Ch 6 experiments listed', pathview.experiments === 4, `${pathview.experiments} experiments`)

  // Exercise mode: parsed from the notes, with solutions withheld.
  const ex = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Tire Behavior'))
    item.click()
    await new Promise(r => setTimeout(r, 900))
    const tab = [...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === 'Exercises')
    if (!tab) return { error: 'no Exercises tab' }
    tab.click()
    await new Promise(r => setTimeout(r, 1600))
    const before = !!document.querySelector('.exercise-solution')
    const reveal = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('worked solution'))
    reveal?.click()
    await new Promise(r => setTimeout(r, 900))
    return {
      chips: document.querySelectorAll('.exercise-chip').length,
      id: document.querySelector('.exercise-id')?.textContent ?? '',
      katex: document.querySelectorAll('.exercise-question .katex').length,
      solutionHiddenInitially: !before,
      solutionShown: !!document.querySelector('.exercise-solution'),
      solutionHasAnswer: (document.querySelector('.exercise-solution')?.textContent ?? '').includes('2698')
    }
  })()`)
  record('exercises parsed from the notes', ex.chips === 6 && ex.id === '2.1', `${ex.chips} exercises, showing ${ex.id}`)
  record('exercise maths typeset', ex.katex >= 3, `${ex.katex} expressions`)
  record(
    'solution withheld then revealed',
    ex.solutionHiddenInitially && ex.solutionShown && ex.solutionHasAnswer,
    ex.solutionHasAnswer ? 'reveals the 2698 N answer' : 'answer not found'
  )

  // Conditions: presets must produce distinct, physically sensible cars, and
  // the sensitivity ranking must reorder when the metric changes.
  const cond = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Changing Conditions'))
    item.click()
    const waitFor = async (test, ms = 8000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        try { if (test()) return true } catch { /* not ready */ }
        await new Promise(r => setTimeout(r, 100))
      }
      return false
    }
    await waitFor(() => document.querySelectorAll('.readout').length > 3)
    await new Promise(r => setTimeout(r, 300))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const press = async (t) => {
      ;[...document.querySelectorAll('.btn')].find(b => b.textContent.trim() === t)?.click()
      await new Promise(r => setTimeout(r, 700))
    }
    const out = {}
    for (const p of ['Wet', 'Qualifying', 'Overheated rears']) {
      await press(p)
      out[p] = { verdict: document.querySelector('.verdict-headline')?.textContent?.trim(), ...read() }
    }
    await press('Optimum')
    await press('What matters')
    await waitFor(() => document.querySelectorAll('.tornado-row').length > 4)
    const rank = () => [...document.querySelectorAll('.tornado-row')]
      .map(r => r.querySelector('.tornado-label')?.textContent?.trim() ?? '')
    const balanceTop = rank()[0]
    await press('Outright grip')
    await new Promise(r => setTimeout(r, 400))
    const gripTop = rank()[0]
    await press('Stint')
    await waitFor(() => document.querySelectorAll('.chart-svg path[stroke]').length > 3)
    const stintCurves = document.querySelectorAll('.chart-svg path[stroke]').length
    return { out, balanceTop, gripTop, stintCurves, nan: document.body.innerText.includes('NaN') }
  })()`)
  record(
    'conditions presets change the car',
    parseFloat(cond.out['Wet']['Limit Ay']) < parseFloat(cond.out['Qualifying']['Limit Ay']) && !cond.nan,
    `wet ${cond.out['Wet']['Limit Ay']} vs qualifying ${cond.out['Qualifying']['Limit Ay']}`
  )
  record(
    'overheated rears flips the car to oversteer',
    /Oversteer/.test(cond.out['Overheated rears'].verdict) &&
      cond.out['Overheated rears']['Gives up first'] === 'rear',
    cond.out['Overheated rears'].verdict
  )
  record(
    'wet changes the limit but not the linear gradient',
    cond.out['Wet']['Understeer gradient'] === cond.out['Qualifying']['Understeer gradient'],
    `both ${cond.out['Wet']['Understeer gradient']}`
  )
  record(
    'sensitivity ranking reorders with the metric',
    cond.balanceTop !== cond.gripTop && cond.gripTop === 'Track grip',
    `balance: ${cond.balanceTop} · grip: ${cond.gripTop}`
  )
  record('stint timeline drawn', cond.stintCurves >= 4, `${cond.stintCurves} curves`)

  // Ch 18 wheel loads: the four-corner diagram, the three-way breakdown, and
  // the arithmetic check the chapter itself recommends.
  const wl = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Wheel Loads'))
    item.click()
    await new Promise(r => setTimeout(r, 1500))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const svg = [...document.querySelectorAll('.panel svg')].find(s => s.textContent.includes('turning left'))
    const legends = [...document.querySelectorAll('.breakdown-legend')].map(e => e.textContent)
    return {
      diagram: !!svg,
      corners: svg ? [...svg.querySelectorAll('text')].filter(t => /^(FI|FO|RI|RO)/.test(t.textContent.trim())).length : 0,
      breakdowns: legends.length,
      hasThreeParts: legends.every(t => /geometric/.test(t) && /elastic/.test(t) && /unsprung/.test(t)),
      readouts: read(),
      nan: document.body.innerText.includes('NaN')
    }
  })()`)
  record(
    'Ch 18 four-corner diagram drawn',
    wl.diagram && wl.corners === 4 && !wl.nan,
    `${wl.corners} corners labelled`
  )
  record(
    'Ch 18 splits transfer three ways at each axle',
    wl.breakdowns === 2 && wl.hasThreeParts,
    `${wl.breakdowns} axles, geometric/elastic/unsprung`
  )
  record(
    'Ch 18 reports TLLTD and roll gradient',
    /% front/.test(wl.readouts['TLLTD'] ?? '') && /deg\/g/.test(wl.readouts['Roll gradient'] ?? ''),
    `TLLTD ${wl.readouts['TLLTD']}, roll ${wl.readouts['Roll gradient']}`
  )

  // Ch 7: bars must move balance far more than they move total grip.
  const pa = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Pair Analysis'))
    item.click()
    const waitFor = async (test, ms = 8000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        try { if (test()) return true } catch { /* not ready */ }
        await new Promise(r => setTimeout(r, 100))
      }
      return false
    }
    await waitFor(() =>
      [...document.querySelectorAll('.field')].some(f => f.textContent.includes('Front anti-roll bar'))
    )
    await new Promise(r => setTimeout(r, 300))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const setSlider = (label, value) => {
      const found = [...document.querySelectorAll('.field')].find(f => f.textContent.includes(label))
      if (!found) throw new Error('slider not found: ' + label)
      const input = found.querySelector('input[type=range]')
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const sample = async (f, r) => {
      setSlider('Front anti-roll bar', f)
      await new Promise(x => setTimeout(x, 250))
      setSlider('Rear anti-roll bar', r)
      await new Promise(x => setTimeout(x, 450))
      const ro = read()
      return {
        tlltd: parseFloat(ro['TLLTD']),
        limit: parseFloat(ro['Limit Ay']),
        balance: parseFloat(ro['Limit balance'])
      }
    }
    const rearBar = await sample(2000, 37000)
    const frontBar = await sample(37000, 2000)
    await sample(27000, 12000)
    return {
      rearBar,
      frontBar,
      curves: document.querySelectorAll('.chart-svg path[stroke]').length,
      cost: read()['Cost of load transfer'],
      experiments: document.querySelectorAll('.try-head').length,
      nan: document.body.innerText.includes('NaN')
    }
  })()`)
  record(
    'Ch 7 bar moves TLLTD front to rear',
    pa.frontBar.tlltd > pa.rearBar.tlltd + 10,
    `${pa.rearBar.tlltd}% -> ${pa.frontBar.tlltd}% front`
  )
  record(
    'Ch 7 front bar adds understeer at the limit',
    pa.frontBar.balance > pa.rearBar.balance,
    `balance ${pa.rearBar.balance} -> ${pa.frontBar.balance} g`
  )
  record(
    'Ch 7 bars redistribute without reducing total grip',
    Math.abs(pa.frontBar.limit - pa.rearBar.limit) / pa.rearBar.limit < 0.05,
    `limit ${pa.rearBar.limit} vs ${pa.frontBar.limit} g`
  )
  record(
    'Ch 7 quantifies what load transfer costs',
    parseFloat(pa.cost ?? '0') > 0 && !pa.nan,
    `${pa.cost} lost to transfer`
  )
  record('Ch 7 experiments listed', pa.experiments === 5, `${pa.experiments} experiments`)

  // Ch 5: the understeer budget, whose five non-trivial rows come from Ch 2, 17,
  // 19 and 23. The checks are that every row is actually populated, that the
  // total differs materially from what Ch 5 can compute alone, and that the two
  // aligning-torque rows shrink toward the limit as pneumatic trail collapses.
  const bud = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Steady-State Stability'))
    item.click()
    const waitFor = async (test, ms = 15000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        try { if (test()) return true } catch { /* not ready */ }
        await new Promise(r => setTimeout(r, 120))
      }
      return false
    }
    const panel = () => [...document.querySelectorAll('.panel')].find(p => p.textContent.includes('Understeer budget'))
    await waitFor(() => panel() && panel().querySelector('table.data'))
    await new Promise(r => setTimeout(r, 300))
    const rows = () => [...panel().querySelectorAll('table.data tbody tr')].map(r =>
      [...r.children].map(c => c.textContent.trim()))
    const preset = (name) => {
      const b = [...panel().querySelectorAll('.btn')].find(x => x.textContent.trim() === name)
      b.click()
    }
    const setAy = (v) => {
      const f = [...panel().querySelectorAll('.field')].find(x => x.textContent.includes('Evaluate the budget at'))
      const input = f.querySelector('input[type=range]')
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(v))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    preset('Road car')
    await new Promise(r => setTimeout(r, 400))
    const road = rows()
    setAy(1.5)
    await new Promise(r => setTimeout(r, 400))
    const atLimit = rows()
    setAy(0.5)
    preset('Ideal')
    await new Promise(r => setTimeout(r, 400))
    const ideal = rows()
    preset('Race car')
    await new Promise(r => setTimeout(r, 400))
    const race = rows()

    return { road, atLimit, ideal, race, nan: document.body.innerText.includes('NaN') }
  })()`)
  const bRow = (t, i) => t[i]
  const bK = (t) => parseFloat(t[7][1])
  record(
    'Ch 5 budget populates all six mechanisms',
    bud.road.length === 8 &&
      bud.road.slice(0, 6).every((r) => parseFloat(r[1]) !== 0 || parseFloat(r[2]) !== 0),
    bud.road.slice(0, 6).map((r) => r[0].split(' ')[0] + ' ' + r[1]).join(', ')
  )
  record(
    'Ch 5 budget names the chapter each row comes from',
    bud.road.slice(0, 6).map((r) => r[4]).join(',') === 'Ch 5,Ch 2,Ch 17,Ch 19,Ch 23,Ch 23',
    bud.road.slice(0, 6).map((r) => r[4]).join(' ')
  )
  // A perfect SUSPENSION empties rows 3-6. It does not empty row 2: the tyre's
  // own pneumatic trail is physics, not a bushing, and no amount of stiffness
  // designs it out. So the ideal car's K is the basic row plus the Ch 2 row,
  // exactly, and nothing else.
  record(
    'Ch 5 ideal suspension empties the four compliance rows but not the tyre row',
    bud.ideal.slice(2, 6).every((r) => Math.abs(parseFloat(r[1])) < 1e-9 && Math.abs(parseFloat(r[2])) < 1e-9) &&
      Math.abs(parseFloat(bRow(bud.ideal, 1)[1])) > 1e-4,
    `rows 3-6 zero, Ch 2 row ${bud.ideal[1][1]}/${bud.ideal[1][2]}`
  )
  record(
    'Ch 5 ideal K is the basic row plus the aligning-torque row, exactly',
    Math.abs(
      bK(bud.ideal) -
        (parseFloat(bRow(bud.ideal, 0)[1]) -
          parseFloat(bRow(bud.ideal, 0)[2]) +
          parseFloat(bRow(bud.ideal, 1)[1]) -
          parseFloat(bRow(bud.ideal, 1)[2]))
    ) < 0.002,
    `K ${bud.ideal[7][1]} = ${bud.ideal[0][1]}-${bud.ideal[0][2]} + ${bud.ideal[1][1]}-${bud.ideal[1][2]}`
  )
  record(
    'Ch 5 compliance changes the character of the car, not just the number',
    bK(bud.road) > bK(bud.race) && bK(bud.race) > bK(bud.ideal),
    `ideal ${bud.ideal[7][1]} < race ${bud.race[7][1]} < road ${bud.road[7][1]}`
  )
  record(
    'Ch 5 aligning-torque rows fade toward the limit as trail collapses',
    parseFloat(bRow(bud.atLimit, 1)[1]) < parseFloat(bRow(bud.road, 1)[1]) &&
      parseFloat(bRow(bud.atLimit, 5)[1]) < parseFloat(bRow(bud.road, 5)[1]) &&
      bK(bud.atLimit) < bK(bud.road) &&
      !bud.nan,
    `Mz rows ${bud.road[1][1]}/${bud.road[5][1]} -> ${bud.atLimit[1][1]}/${bud.atLimit[5][1]}`
  )

  // Ch 8: the Moment Method. The load-bearing check is the cross-chapter one --
  // the N = 0 line must reproduce the Ch 7 pair-analysis limit, live in the app
  // and not just in a unit test. The rest checks that the decomposition into
  // stability and control actually responds to a setup change.
  const mmm = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Force-Moment'))
    item.click()
    const waitFor = async (test, ms = 20000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        try { if (test()) return true } catch { /* not ready */ }
        await new Promise(r => setTimeout(r, 150))
      }
      return false
    }
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    await waitFor(() => read()['Trimmed limit (Ch 8)'] !== undefined)
    await new Promise(r => setTimeout(r, 400))
    const base = read()

    // Drive the terminal-oversteer experiment and re-read.
    const head = [...document.querySelectorAll('.try-head')].find(b => b.textContent.includes('terminal oversteer'))
    head.click()
    await new Promise(r => setTimeout(r, 200))
    const setup = [...document.querySelectorAll('.try-body .btn')].find(b => b.textContent.includes('Set it up'))
    setup.click()
    await waitFor(() => read()['Stability ∂N/∂Ay'] !== base['Stability ∂N/∂Ay'])
    await new Promise(r => setTimeout(r, 400))
    const loose = read()
    const undo = [...document.querySelectorAll('.try-body .btn')].find(b => b.textContent.trim() === 'Undo')
    if (undo) undo.click()
    await new Promise(r => setTimeout(r, 800))

    return {
      base,
      loose,
      contours: document.querySelectorAll('.chart-svg polyline').length,
      trimDots: document.querySelectorAll('.chart-svg circle').length,
      envelope: document.querySelectorAll('.chart-svg polygon').length,
      experiments: document.querySelectorAll('.try-head').length,
      nan: document.body.innerText.includes('NaN')
    }
  })()`)
  const num = (v) => parseFloat(v ?? 'NaN')
  record(
    'Ch 8 draws a carpet of both contour families',
    mmm.contours > 20 && mmm.envelope >= 1,
    `${mmm.contours} contours, ${mmm.envelope} envelope`
  )
  record(
    'Ch 8 trimmed limit reproduces the Ch 7 pair-analysis limit',
    Math.abs(num(mmm.base['Trimmed limit (Ch 8)']) - num(mmm.base['Same car via Ch 7 pair analysis'])) <
      0.005,
    `Ch 8 ${mmm.base['Trimmed limit (Ch 8)']} vs Ch 7 ${mmm.base['Same car via Ch 7 pair analysis']}`
  )
  record(
    'Ch 8 recovers the understeer gradient from stability over control',
    Math.abs(num(mmm.base['K from the map']) - num(mmm.base['K from Ch 5'])) < 0.05,
    `map ${mmm.base['K from the map']} vs Ch 5 ${mmm.base['K from Ch 5']}`
  )
  record(
    'Ch 8 reports the balance loss as max Ay minus max trimmed Ay',
    Math.abs(
      num(mmm.base['Max Ay anywhere']) -
        num(mmm.base['Max trimmed Ay']) -
        num(mmm.base['Thrown away'])
    ) < 0.002 && num(mmm.base['Thrown away']) >= 0,
    `${mmm.base['Max Ay anywhere']} - ${mmm.base['Max trimmed Ay']} = ${mmm.base['Thrown away']}`
  )
  record(
    'Ch 8 calls the default car stable',
    num(mmm.base['Stability ∂N/∂Ay']) < 0 && num(mmm.base['Control ∂N/∂δ']) > 0,
    `stability ${mmm.base['Stability ∂N/∂Ay']}, control ${mmm.base['Control ∂N/∂δ']}`
  )
  record(
    'Ch 8 flips stability positive when the rear loses grip',
    num(mmm.loose['Stability ∂N/∂Ay']) > 0 && num(mmm.loose['K from the map']) < 0,
    `stability ${mmm.base['Stability ∂N/∂Ay']} -> ${mmm.loose['Stability ∂N/∂Ay']}`
  )
  record(
    'Ch 8 keeps agreeing with Ch 7 after a setup change',
    Math.abs(
      num(mmm.loose['Trimmed limit (Ch 8)']) - num(mmm.loose['Same car via Ch 7 pair analysis'])
    ) < 0.005 && !mmm.nan,
    `Ch 8 ${mmm.loose['Trimmed limit (Ch 8)']} vs Ch 7 ${mmm.loose['Same car via Ch 7 pair analysis']}`
  )
  record('Ch 8 experiments listed', mmm.experiments === 5, `${mmm.experiments} experiments`)

  // Part II, chapters 16, 17, 19, 20 and 23. The load-bearing check is the first
  // one: Ch 16 must actually FEED the rest of the app rather than computing roll
  // stiffness in a corner by itself.
  const part2 = await js(`(async () => {
    const waitFor = async (test, ms = 20000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        try { if (test()) return true } catch { /* not ready */ }
        await new Promise(r => setTimeout(r, 120))
      }
      return false
    }
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const rows = () => [...document.querySelectorAll('table.data tr')].map(r =>
      [...r.children].map(c => c.textContent.trim()))
    const go = async (name, until) => {
      const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes(name))
      if (!item) throw new Error('nav item missing: ' + name)
      item.click()
      await waitFor(until)
      await new Promise(r => setTimeout(r, 350))
    }
    const setSlider = (label, value) => {
      const f = [...document.querySelectorAll('.field')].find(x => x.textContent.includes(label))
      if (!f) throw new Error('slider not found: ' + label)
      const input = f.querySelector('input[type=range]')
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const clickBtn = (text) => {
      const b = [...document.querySelectorAll('.btn')].find(x => x.textContent.includes(text))
      if (!b) throw new Error('button not found: ' + text)
      b.click()
    }

    // --- Ch 7 before, Ch 16 pushes rates across, Ch 7 after ---------------
    await go('Pair Analysis', () => read()['TLLTD'])
    const pairBefore = read()

    await go('Ride and Roll Rates', () => rows().length > 2)
    const ratesRows = rows()
    const ratesReadouts = read()
    let pushed = false
    try { clickBtn('Send these rates to the car'); pushed = true } catch { /* already in sync */ }
    await new Promise(r => setTimeout(r, 600))
    const syncLabel = [...document.querySelectorAll('.btn')]
      .map(b => b.textContent.trim())
      .find(t => /up to date|Send these rates/.test(t))

    await go('Pair Analysis', () => read()['TLLTD'])
    const pairAfter = read()

    // --- Ch 17 ------------------------------------------------------------
    await go('Suspension Geometry', () => read()['Swing arm (FVSA)'])
    const geoRace = read()
    clickBtn('Exercise 17.1')
    await new Promise(r => setTimeout(r, 600))
    const geoEx = read()
    clickBtn('Race geometry')
    await new Promise(r => setTimeout(r, 400))

    // --- Ch 19 ------------------------------------------------------------
    await go('Steering Systems', () => read()['Signal clarity'])
    setSlider('Caster', 2)
    await new Promise(r => setTimeout(r, 500))
    const steerLow = read()
    setSlider('Caster', 12)
    await new Promise(r => setTimeout(r, 500))
    const steerHigh = read()
    setSlider('Caster', 6)
    await new Promise(r => setTimeout(r, 400))

    // --- Ch 20 ------------------------------------------------------------
    await go('Driving and Braking', () => read()['Torque bias ratio'])
    const drive = read()
    const driveRows = rows()

    // --- Ch 23 ------------------------------------------------------------
    await go('Compliances', () => read()['Bar, effective'])
    const compl = read()

    return {
      ratesRows, ratesReadouts, pushed, syncLabel,
      pairBefore, pairAfter,
      geoRace, geoEx,
      steerLow, steerHigh,
      drive, driveRows,
      compl,
      nan: document.body.innerText.includes('NaN')
    }
  })()`)

  const val = (v) => parseFloat(String(v ?? 'NaN'))
  const p2 = part2

  // Ch 16 -- Exercise 16.1, rendered.
  const frontRow = p2.ratesRows.find((r) => r[0] === 'Front') ?? []
  record(
    'Ch 16 reproduces Exercise 16.1 in the corner table',
    Math.abs(val(frontRow[2]) - 46.13) < 0.05 &&
      Math.abs(val(frontRow[3]) - 40.32) < 0.05 &&
      Math.abs(val(frontRow[5]) - 2.57) < 0.02,
    `wheel ${frontRow[2]}, ride ${frontRow[3]}, ${frontRow[5]}`
  )
  record(
    'Ch 16 shows the 7% error from treating the tyre as rigid',
    val(frontRow[6]) > val(frontRow[5]) &&
      Math.abs(val(frontRow[6]) / val(frontRow[5]) - 1.07) < 0.01,
    `${frontRow[5]} with the tyre vs ${frontRow[6]} without`
  )
  record(
    'Ch 16 squares the installation ratio',
    Math.abs(
      val(p2.ratesReadouts['If IR were 10% higher']) / val(p2.ratesReadouts['Wheel rate now']) - 1.21
    ) < 0.005,
    `${p2.ratesReadouts['Wheel rate now']} -> ${p2.ratesReadouts['If IR were 10% higher']}`
  )
  record(
    'Ch 16 rates actually reach Chapter 7',
    p2.syncLabel === 'Car is up to date' &&
      (!p2.pushed || p2.pairBefore['TLLTD'] !== p2.pairAfter['TLLTD']),
    p2.pushed
      ? `TLLTD ${p2.pairBefore['TLLTD']} -> ${p2.pairAfter['TLLTD']}`
      : 'already in sync'
  )

  // Ch 17 -- the corrected Exercise 17.1.
  record(
    'Ch 17 puts a sane geometry inboard with a low roll centre',
    val(p2.geoRace['Swing arm (FVSA)']) > 2 &&
      val(p2.geoRace['Roll centre']) > 0 &&
      val(p2.geoRace['Roll centre']) < 120,
    `FVSA ${p2.geoRace['Swing arm (FVSA)']}, RC ${p2.geoRace['Roll centre']}`
  )
  record(
    'Ch 17 Exercise 17.1 geometry puts the roll centre BELOW ground',
    val(p2.geoEx['Roll centre']) < 0 && Math.abs(val(p2.geoEx['Roll centre']) + 165) < 3,
    `${p2.geoEx['Roll centre']} — the notes report +438 mm from a frame mix-up`
  )
  record(
    'Ch 17 reports the swing arm as outboard for that geometry',
    /outboard/.test(String(p2.geoEx['Swing arm (FVSA)'])) &&
      Math.abs(val(p2.geoEx['Camber gain']) - 0.0461) < 0.0005,
    `${p2.geoEx['Swing arm (FVSA)']}, gain ${p2.geoEx['Camber gain']}`
  )

  // Ch 19 -- the caster trade.
  record(
    'Ch 19 buries the front-limit cue as caster grows',
    val(p2.steerHigh['Mechanical trail']) > val(p2.steerLow['Mechanical trail']) * 2 &&
      val(p2.steerHigh['Signal clarity']) < val(p2.steerLow['Signal clarity']),
    `2 deg: ${p2.steerLow['Signal clarity']} clarity, 12 deg: ${p2.steerHigh['Signal clarity']}`
  )
  record(
    'Ch 19 quantifies the understeer compliance invents',
    val(p2.steerLow['Apparent understeer']) > 0 && val(p2.steerLow['Budget coefficient']) > 0,
    `${p2.steerLow['Apparent understeer']} deg/g apparent`
  )

  // Ch 20 -- one sign, and the differential as a steering input.
  const rwd = p2.driveRows.find((r) => r[0] === 'Rear drive') ?? []
  const fwd = p2.driveRows.find((r) => r[0] === 'Front drive') ?? []
  // The mechanism, not the weight distribution. Ch 20 Ex 20.1's car happens to
  // be front-biased, which is what lets the exercise say "more static weight on
  // the driven axle and still slower" -- but the garage's formula car is
  // rear-biased, so that particular phrasing does not apply to it. What holds
  // for ANY car is the sign of the load transfer term: rear drive recruits load
  // as it accelerates, front drive sheds it, and rear drive wins.
  record(
    'Ch 20 has rear drive recruit load and front drive shed it',
    val(rwd[1]) > val(fwd[1]) && val(rwd[4]) > 0 && val(fwd[4]) < 0,
    `RWD ${rwd[1]} at ${rwd[4]}, FWD ${fwd[1]} at ${fwd[4]}`
  )
  record(
    'Ch 20 ranks open < LSD < spool',
    val(p2.drive['Open']) < val(p2.drive['This LSD']) &&
      val(p2.drive['This LSD']) < val(p2.drive['Spool']),
    `${p2.drive['Open']} / ${p2.drive['This LSD']} / ${p2.drive['Spool']}`
  )
  record(
    'Ch 20 prices the differential in degrees of steering',
    val(p2.drive['…as opposite lock']) > 0.05,
    `${p2.drive['Anti-turn yaw moment']} = ${p2.drive['…as opposite lock']} deg of opposite lock`
  )

  // Ch 23 -- the series relation, twice.
  record(
    'Ch 23 loses part of every bar to its mounts',
    val(p2.compl['Bar, effective']) < val(p2.compl['Bar, nominal']) &&
      val(p2.compl['A 50% bigger bar delivers']) < 100,
    `${p2.compl['Bar, nominal']} nominal -> ${p2.compl['Bar, effective']} effective, upgrade delivers ${p2.compl['A 50% bigger bar delivers']}`
  )
  record(
    'Ch 23 dilutes a setup change through chassis twist',
    val(p2.compl['Setup change realized']) > 0 &&
      val(p2.compl['Setup change realized']) < 100 &&
      !p2.nan,
    `${p2.compl['Setup change realized']} of an intended TLLTD change survives`
  )

  // Aerodynamics and the g-g envelope. The claim worth checking is that
  // downforce actually reaches the vehicle model rather than sitting in its own
  // corner of the app.
  const aero = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Aerodynamic Fundamentals'))
    item.click()
    const deadline = Date.now() + 6000
    while (Date.now() < deadline) {
      if (document.querySelectorAll('.chart-svg path[stroke]').length > 3) break
      await new Promise(r => setTimeout(r, 100))
    }
    await new Promise(r => setTimeout(r, 400))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    return { readouts: read(), curves: document.querySelectorAll('.chart-svg path[stroke]').length,
             nan: document.body.innerText.includes('NaN') }
  })()`)
  record(
    'Ch 3 aero lab reports downforce and drag',
    parseFloat(aero.readouts['Downforce'] ?? '0') > 0 &&
      parseFloat(aero.readouts['Drag'] ?? '0') > 0 && !aero.nan,
    `${aero.readouts['Downforce']} down, ${aero.readouts['Drag']} drag`
  )
  record(
    'aero buys real cornering speed',
    parseFloat(aero.readouts['With this aero'] ?? '0') >
      parseFloat(aero.readouts['Without wings'] ?? '0'),
    `${aero.readouts['Without wings']} -> ${aero.readouts['With this aero']} (${aero.readouts['Gain']})`
  )
  record(
    'load-sensitive model reads below the constant-mu closed form',
    parseFloat(aero.readouts['With this aero'] ?? '0') <
      parseFloat(aero.readouts['Closed form, constant μ'] ?? '0'),
    `${aero.readouts['With this aero']} vs closed form ${aero.readouts['Closed form, constant μ']}`
  )

  const gg = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('g-g Diagram'))
    item.click()
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      if (document.querySelectorAll('.chart-svg path[stroke]').length > 3) break
      await new Promise(r => setTimeout(r, 100))
    }
    await new Promise(r => setTimeout(r, 500))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const usage = {}
    for (const label of ['Blends everything', 'Brakes straight, then turns', 'Never at the limit']) {
      ;[...document.querySelectorAll('.btn')].find(b => b.textContent.trim() === label)?.click()
      await new Promise(r => setTimeout(r, 700))
      usage[label] = parseFloat(read()['Envelope used'] ?? '0')
    }
    return { readouts: read(), usage, dots: document.querySelectorAll('.chart-svg circle').length,
             nan: document.body.innerText.includes('NaN') }
  })()`)
  record(
    'g-g envelope brakes harder than it accelerates',
    Math.abs(parseFloat(gg.readouts['Peak braking'] ?? '0')) >
      parseFloat(gg.readouts['Peak acceleration'] ?? '0') && !gg.nan,
    `${gg.readouts['Peak braking']} braking vs ${gg.readouts['Peak acceleration']} power`
  )
  record(
    'g-g usage overlay ranks driving styles correctly',
    gg.usage['Blends everything'] > gg.usage['Brakes straight, then turns'] &&
      gg.usage['Brakes straight, then turns'] > gg.usage['Never at the limit'],
    `blend ${gg.usage['Blends everything']}% > notch ${gg.usage['Brakes straight, then turns']}% > timid ${gg.usage['Never at the limit']}%`
  )
  record('g-g plots the usage scatter', gg.dots > 100, `${gg.dots} samples plotted`)

  // Formula playground: equation, substitution, answer and sweep must all move
  // together, and the sweep must actually change when a symbol is clicked.
  const formulas = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('The Formulas'))
    item.click()
    const deadline = Date.now() + 6000
    while (Date.now() < deadline) {
      if (document.querySelector('.formula-result-value')) break
      await new Promise(r => setTimeout(r, 100))
    }
    await new Promise(r => setTimeout(r, 300))
    const read = () => ({
      substituted: document.querySelectorAll('.formula-big')[1]?.textContent?.trim() ?? '',
      result: document.querySelector('.formula-result-value')?.textContent?.trim() ?? '',
      axis: document.querySelector('.chart-axis-label')?.textContent?.trim() ?? '',
      terms: [...document.querySelectorAll('.term-value')].map(e => e.textContent.trim())
    })
    const pick = async (name) => {
      ;[...document.querySelectorAll('.formula-pick .btn')].find(b => b.textContent.trim() === name)?.click()
      await new Promise(r => setTimeout(r, 600))
      return read()
    }
    const count = document.querySelectorAll('.formula-pick .btn').length
    const understeer = await pick('Understeer gradient')
    const axisBefore = read().axis
    // Click the second symbol chip; the chart axis must follow it.
    document.querySelectorAll('.formula-var .formula-symbol')[1]?.click()
    await new Promise(r => setTimeout(r, 500))
    const axisAfter = read().axis
    // Move a slider; substitution and result must both change.
    const field = [...document.querySelectorAll('.formula-var')].find(f => f.textContent.includes('Rear axle cornering stiffness'))
    const input = field.querySelector('input[type=range]')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '90000')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 500))
    const moved = read()
    const omega = await pick('Yaw natural frequency')
    return { count, understeer, axisBefore, axisAfter, moved, omega, nan: document.body.innerText.includes('NaN') }
  })()`)
  record('formula catalogue listed', formulas.count >= 17, `${formulas.count} formulas`)
  record(
    'formula substitutes your numbers into the equation',
    formulas.understeer.substituted.includes('3318') &&
      formulas.understeer.substituted.includes('143564'),
    formulas.understeer.substituted.slice(0, 40)
  )
  record(
    'formula decomposes into terms that explain the answer',
    formulas.understeer.terms.length === 2 && !formulas.nan,
    `terms ${formulas.understeer.terms.join(' , ')} -> ${formulas.understeer.result}`
  )
  record(
    'clicking a symbol moves it onto the chart axis',
    formulas.axisBefore !== formulas.axisAfter && formulas.axisAfter.length > 0,
    `${formulas.axisBefore} -> ${formulas.axisAfter}`
  )
  record(
    'moving a slider updates substitution and answer together',
    formulas.moved.substituted.includes('90000') &&
      formulas.moved.result !== formulas.understeer.result,
    `${formulas.understeer.result} -> ${formulas.moved.result}`
  )
  record(
    'yaw natural frequency reproduces Exercise 6.1',
    Math.abs(parseFloat(formulas.omega.result) - 7.35) < 0.02,
    `${formulas.omega.result} rad/s vs 7.35 expected`
  )

  // Bilingual glossary: parsed from the markdown, searchable in both
  // languages, with inline maths typeset rather than shown as raw TeX.
  const glossary = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Glossary'))
    item.click()
    await new Promise(r => setTimeout(r, 1700))
    const type = async (v) => {
      const b = document.querySelector('.glossary-search')
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(b, v)
      b.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise(r => setTimeout(r, 400))
    }
    const rows = () => [...document.querySelectorAll('.glossary-table tbody tr')]
      .map(tr => [...tr.querySelectorAll('td')].slice(0, 2).map(td => td.textContent.trim()))
    const total = document.querySelectorAll('.glossary-table tbody tr').length
    await type('slip angle')
    const english = rows()
    await type('angulo de deriva')
    const accentless = rows()
    await type('barra estabilizadora')
    const portuguese = rows()
    await type('   ')
    const whitespace = document.querySelectorAll('.glossary-table tbody tr').length
    await type('')
    return {
      total,
      english,
      accentless,
      portuguese,
      whitespace,
      katex: document.querySelectorAll('.glossary-table .katex').length,
      rawTex: [...document.body.innerText].some(
        (c, i, arr) => c.charCodeAt(0) === 92 && /[a-zA-Z]/.test(arr[i + 1] || '')
      ),
      flags: document.querySelectorAll('.glossary-flag').length
    }
  })()`)
  record('glossary parsed from markdown', glossary.total > 150, `${glossary.total} terms`)
  record(
    'glossary searches English',
    glossary.english.some((r) => r[0] === 'Slip angle' && r[1] === 'Ângulo de deriva'),
    glossary.english[0]?.join(' -> ') ?? 'none'
  )
  record(
    'glossary searches Portuguese',
    glossary.portuguese.some((r) => r[0] === 'Anti-roll bar' && r[1] === 'Barra estabilizadora'),
    glossary.portuguese[0]?.join(' -> ') ?? 'none'
  )
  record(
    'glossary search ignores accents',
    glossary.accentless.length === glossary.english.length && glossary.accentless.length > 0,
    `"angulo de deriva" finds ${glossary.accentless.length}`
  )
  record(
    'glossary whitespace query shows everything',
    glossary.whitespace === glossary.total,
    `${glossary.whitespace} of ${glossary.total}`
  )
  record(
    'glossary typesets maths instead of showing raw TeX',
    glossary.katex > 40 && !glossary.rawTex,
    `${glossary.katex} expressions, no raw TeX`
  )
  record(
    'glossary flags terms kept in English',
    glossary.flags > 15,
    `${glossary.flags} flagged`
  )

  const katex = await js(`(async () => {
    const item = [...document.querySelectorAll('.nav-item')].find(e => e.textContent.includes('Tire Behavior'))
    item.click()
    await new Promise(r => setTimeout(r, 900))
    const tab = [...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === 'Notes')
    tab.click()
    await new Promise(r => setTimeout(r, 1800))
    return document.querySelectorAll('.notes .katex').length
  })()`)
  record('notes render with KaTeX', katex > 10, `${katex} typeset expressions`)

  record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

  clearTimeout(watchdog)
  const failed = checks.filter((c) => !c.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  app.exit(failed === 0 ? 0 : 1)
}).catch((err) => {
  // Report and exit rather than hang: an unhandled rejection inside an
  // injected script used to leave the process alive producing nothing at all.
  clearTimeout(watchdog)
  console.log('FAIL  smoke run threw: ' + (err?.stack ?? err))
  console.log(checks.filter((c) => c.pass).length + '/' + checks.length + ' checks passed before the error')
  app.exit(1)
})

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
    await new Promise(r => setTimeout(r, 1400))
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
    const rank = () => [...document.querySelectorAll('.tornado-row')].map(r => r.querySelector('.tornado-label').textContent.trim())
    const balanceTop = rank()[0]
    await press('Outright grip')
    const gripTop = rank()[0]
    await press('Stint')
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
    await new Promise(r => setTimeout(r, 1600))
    const read = () => Object.fromEntries([...document.querySelectorAll('.readout')].map(r => [
      r.querySelector('.readout-label')?.textContent?.trim(),
      r.querySelector('.readout-value')?.textContent?.trim()]))
    const setSlider = (label, value) => {
      const field = [...document.querySelectorAll('.field')].find(f => f.textContent.includes(label))
      const input = field.querySelector('input[type=range]')
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
  record('formula catalogue listed', formulas.count >= 14, `${formulas.count} formulas`)
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

  const failed = checks.filter((c) => !c.pass).length
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  app.exit(failed === 0 ? 0 : 1)
})

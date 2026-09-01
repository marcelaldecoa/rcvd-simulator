/**
 * Connect to a running iRacing session and report what comes back.
 *
 * This is the one part of the telemetry stack that cannot be unit tested: it
 * needs the simulator. So it gets a script instead, and the script is written
 * to answer the questions that actually matter when the live path misbehaves --
 * did it attach, what is it reading, and are the SIGNS right.
 *
 * The sign question is the important one. Everything downstream is
 * mirror-symmetric, so flipping every lateral channel together is harmless;
 * flipping only some of them is what silently corrupts the overlay. In a steady
 * turn Ay must equal V*r, which makes the check pure arithmetic on the data.
 *
 *   npm run live:check                (drive a few corners while it runs)
 */
import { LiveIRacingSource } from '../src/telemetry/live.js'
import { checkConventions } from '../src/telemetry/irsdk/channels.js'
import type { TelemetrySample } from '../src/telemetry/types.js'

const SECONDS = Number(process.argv[2] ?? 20)

const source = new LiveIRacingSource()
const samples: TelemetrySample[] = []
source.subscribe((s) => samples.push(s))

await source.start()
console.log(`status: ${source.status().detail}`)
if (!source.status().connected) {
  console.log('\nNot connected. Start iRacing and join a session, then run this again.')
  source.stop()
  process.exit(1)
}

const session = source.session()
console.log(`car:    ${session.carName ?? '(not published)'}`)
console.log(`track:  ${session.trackName ?? '(not published)'}`)
console.log(`rate:   ${session.sampleRate} Hz`)
console.log(`ratio:  ${source.ratio.toFixed(2)} deg handwheel per deg road wheel`)
console.log(`\nCollecting for ${SECONDS} s — drive, and take a few corners in BOTH directions.\n`)

let last = 0
const ticker = setInterval(() => {
  const s = samples[samples.length - 1]
  if (!s) return
  const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1).padStart(6)
  process.stdout.write(
    `\r  ${samples.length - last} Hz  ` +
      `v=${(s.speed * 3.6).toFixed(0).padStart(3)} km/h  ` +
      `ay=${(s.ay / 9.80665).toFixed(2).padStart(5)} g  ` +
      `r=${deg(s.yawRate)}°/s  steer=${deg(s.steer)}°   `
  )
  last = samples.length
}, 1000)

await new Promise((r) => setTimeout(r, SECONDS * 1000))
clearInterval(ticker)
source.stop()

console.log(`\n\ncollected ${samples.length} samples in ${SECONDS} s ` +
  `(${(samples.length / SECONDS).toFixed(1)} Hz)`)

if (samples.length === 0) {
  console.log('FAIL  attached but no samples arrived')
  process.exit(1)
}

// Presence comes from the variable index, not from the data. A parked car has
// a flat steer trace and a missing channel has a flat steer trace, and only one
// of those is a problem.
const missing = source.missingChannels()
console.log(
  missing.length === 0
    ? '\nall channels present'
    : `\nNOT published by this car: ${missing.join(', ')}`
)

const spread = (pick: (s: TelemetrySample) => number): string => {
  let lo = Infinity
  let hi = -Infinity
  for (const s of samples) {
    const v = pick(s)
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  return `${lo.toFixed(3)} .. ${hi.toFixed(3)}`
}
console.log('\nchannel ranges')
console.log(`  speed     ${spread((s) => s.speed)}`)
console.log(`  ay        ${spread((s) => s.ay)}`)
console.log(`  ax        ${spread((s) => s.ax)}`)
console.log(`  yawRate   ${spread((s) => s.yawRate)}`)
console.log(`  steer     ${spread((s) => s.steer)}`)
console.log(`  latVel    ${spread((s) => s.lateralVelocity ?? NaN)}`)

// Sideslip is the overlay's whole subject, so check it is not silently zero.
// It comes from lateral velocity when the sim publishes it and from integrated
// yaw otherwise, and the two are worth telling apart.
const moving = samples.filter((s) => s.speed > 10)
const beta = moving
  .filter((s) => s.lateralVelocity !== undefined)
  .map((s) => (Math.atan2(s.lateralVelocity as number, s.speed) * 180) / Math.PI)

if (beta.length > 0) {
  console.log(
    `\nsideslip from VelocityY: ${Math.min(...beta).toFixed(2)}° .. ${Math.max(...beta).toFixed(2)}°`
  )
} else if (moving.length === 0) {
  // Do not blame the channel for a car that never moved. Saying "VelocityY is
  // not usable" here would send someone hunting a bug that is not there.
  console.log('\nsideslip: the car never moved — drive while this runs to check it')
} else {
  console.log('\nsideslip: VelocityY not published — the app will integrate yaw instead, which drifts')
}

const check = checkConventions(samples)
console.log(`\nsign convention: ${check.detail}`)
if (check.n >= 30) {
  console.log(`  steer agrees with yaw rate on ${(check.steerAgreement * 100).toFixed(0)}% of samples`)
}
console.log(check.ok ? '\nOK' : '\nFAIL  sign mismatch — see src/telemetry/irsdk/channels.ts')
process.exit(check.ok ? 0 : 1)

/**
 * Generate a synthetic .ibt session file.
 *
 * Not a mock: it writes real bytes in the real iRacing layout, using the same
 * `buildTestBuffer` the layout tests use. That lets the smoke test drive the
 * ACTUAL file path -- picker to parser to identification to lap comparison --
 * without owning a recorded session, which is otherwise the one part of the
 * telemetry feature that cannot be exercised here.
 *
 * The car it describes is the app's own FORMULA_CAR, driven around a notional
 * circuit at steady trim states. That matters: the identification can then be
 * checked against stiffnesses we chose, rather than merely checked for being
 * finite.
 *
 *   npx tsx scripts/make-test-ibt.mts [outputPath]
 */

import { writeFile } from 'node:fs/promises'
import { buildTestBuffer, VarType } from '../src/telemetry/irsdk/layout.js'
import { CHANNELS } from '../src/telemetry/irsdk/channels.js'
import { FORMULA_CAR, derive } from '../src/core/vehicle/params.js'
import { trimFromSteer } from '../src/core/vehicle/steadyState.js'
import { G } from '../src/core/util/numeric.js'

const RATE = 60
const STEERING_RATIO = 12
const LAPS = 5

const d = derive(FORMULA_CAR)

/**
 * Corners specified by the lateral acceleration they are taken at, not by a
 * steer angle.
 *
 * Choosing steer directly turned out to be a trap: the steer needed for a
 * given Ay scales as V^-2, so a plausible-looking set of angles at a plausible
 * set of speeds put nearly every corner outside the linear range the axle
 * identification fits. Specifying Ay and solving for steer guarantees the
 * session actually spans the range being identified in.
 *
 *     delta = L/R + K Ay,   1/R = Ay g / V^2
 */
interface Corner {
  /** Target lateral acceleration, g. Zero means a straight. */
  ay: number
  speed: number
  length: number
}

function steerFor(corner: Corner): number {
  if (corner.ay === 0) return 0
  const kRad = summariseK()
  const ackermann = (d.L * corner.ay * G) / (corner.speed * corner.speed)
  return ackermann + kRad * corner.ay
}

/** The car's own understeer gradient, rad/g. */
function summariseK(): number {
  return d.wf / FORMULA_CAR.cf - d.wr / FORMULA_CAR.cr
}

interface Row {
  t: number
  speed: number
  vx: number
  vy: number
  yawRate: number
  handwheel: number
  latAccel: number
  longAccel: number
  lap: number
  lapDistPct: number
  shock: [number, number, number, number]
}

/** A deterministic PRNG, so a regenerated file is byte-identical. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A lap made of corners, each held at a steady trim state of the real vehicle
 * model. Steady states are what the identification is entitled to fit, and
 * generating them from `trimFromSteer` means the answer is known in advance.
 */
/**
 * A lap spanning a real range of lateral acceleration, so the identification
 * has something to fit rather than one operating point repeated.
 */
function planFor(slow: boolean): Corner[] {
  return [
    { ay: 0, speed: 62, length: 420 },
    { ay: 0.62, speed: 34, length: 180 },
    { ay: 0.25, speed: 58, length: 240 },
    { ay: -0.45, speed: 44, length: 260 },
    { ay: 0, speed: 60, length: 380 },
    { ay: 0.68, speed: 28, length: 200 },
    { ay: -0.2, speed: 62, length: 220 },
    { ay: 0.38, speed: 50, length: 260 },
    { ay: 0, speed: 50, length: 340 },
    { ay: -0.55, speed: 36, length: 220 },
    { ay: 0.5, speed: 40, length: 240 },
    { ay: -0.32, speed: 54, length: 200 },
    { ay: 0, speed: 58, length: 500 },
    // The stretch the "slow" lap loses time in, so the comparison has
    // something real to find. Same corner, taken slower.
    { ay: 0.45, speed: slow ? 30 : 46, length: 400 }
  ]
}

/** Total lap distance, so lapDistPct actually reaches 1 rather than clamping. */
const LAP_LENGTH = planFor(false).reduce((sum, c) => sum + c.length, 0)

function buildLap(lapNumber: number, t0: number, slow: boolean, rand: () => number): Row[] {
  const rows: Row[] = []
  const plan = planFor(slow)

  let dist = 0
  let t = t0
  for (const seg of plan) {
    const steer = steerFor(seg)
    const trim = seg.ay === 0 ? null : trimFromSteer(FORMULA_CAR, seg.speed, steer)
    const samples = Math.max(2, Math.round((seg.length / seg.speed) * RATE))
    for (let i = 0; i < samples; i++) {
      // Shock velocity: a little road noise everywhere, more in the corners
      // where the car is loaded. Realistic enough for a histogram to be a
      // histogram of something.
      const rough = 0.012 + (trim ? 0.02 : 0.004)
      const shockOf = (): number => (rand() - 0.5) * 2 * rough
      rows.push({
        t,
        speed: seg.speed,
        vx: seg.speed,
        vy: trim ? seg.speed * Math.tan(trim.beta) : 0,
        yawRate: trim ? trim.yawRate : 0,
        handwheel: steer * STEERING_RATIO,
        latAccel: trim ? trim.ay * G : 0,
        longAccel: 0,
        lap: lapNumber,
        lapDistPct: Math.min(dist / LAP_LENGTH, 0.9999),
        shock: [shockOf(), shockOf(), shockOf(), shockOf()]
      })
      dist += seg.speed / RATE
      t += 1 / RATE
    }
  }
  return rows
}

async function main(): Promise<void> {
  const out = process.argv[2] ?? 'test-session.ibt'
  const rand = mulberry32(11)

  const rows: Row[] = []
  let t = 0
  for (let lap = 1; lap <= LAPS; lap++) {
    // Lap 3 is the slow one, so a comparison has a clear answer.
    const built = buildLap(lap, t, lap === 3, rand)
    rows.push(...built)
    t = built[built.length - 1].t + 1 / RATE
  }

  const col = <T,>(f: (r: Row) => T): T[] => rows.map(f)
  const buf = buildTestBuffer({
    asFile: true,
    tickRate: RATE,
    sessionInfo:
      'WeekendInfo:\n' +
      ' TrackDisplayName: Synthetic Test Circuit\n' +
      ` TrackLength: ${(LAP_LENGTH / 1000).toFixed(2)} km\n` +
      'DriverInfo:\n' +
      ` DriverCarSteeringRatio: ${STEERING_RATIO}\n` +
      ' CarScreenName: RCVD Formula Car\n',
    vars: [
      { name: CHANNELS.time, type: VarType.Double, values: col((r) => r.t) },
      { name: CHANNELS.speed, type: VarType.Float, values: col((r) => r.speed) },
      { name: CHANNELS.velocityX, type: VarType.Float, values: col((r) => r.vx) },
      { name: CHANNELS.velocityY, type: VarType.Float, values: col((r) => r.vy) },
      { name: CHANNELS.yawRate, type: VarType.Float, values: col((r) => r.yawRate) },
      { name: CHANNELS.steer, type: VarType.Float, values: col((r) => r.handwheel) },
      { name: CHANNELS.latAccel, type: VarType.Float, values: col((r) => r.latAccel) },
      { name: CHANNELS.longAccel, type: VarType.Float, values: col((r) => r.longAccel) },
      { name: CHANNELS.throttle, type: VarType.Float, values: col(() => 0.6) },
      { name: CHANNELS.brake, type: VarType.Float, values: col(() => 0) },
      { name: CHANNELS.lap, type: VarType.Int, values: col((r) => r.lap) },
      { name: CHANNELS.lapDistPct, type: VarType.Float, values: col((r) => r.lapDistPct) },
      { name: CHANNELS.gear, type: VarType.Int, values: col(() => 4) },
      { name: CHANNELS.rpm, type: VarType.Float, values: col(() => 7200) },
      { name: 'LFshockVel', type: VarType.Float, values: col((r) => r.shock[0]) },
      { name: 'RFshockVel', type: VarType.Float, values: col((r) => r.shock[1]) },
      { name: 'LRshockVel', type: VarType.Float, values: col((r) => r.shock[2]) },
      { name: 'RRshockVel', type: VarType.Float, values: col((r) => r.shock[3]) }
    ]
  })

  await writeFile(out, buf)
  console.log(
    `wrote ${out}: ${rows.length} samples, ${LAPS} laps, ` +
      `Cf=${(FORMULA_CAR.cf / 1000).toFixed(1)} kN/rad, Cr=${(FORMULA_CAR.cr / 1000).toFixed(1)} kN/rad, ` +
      `L=${d.L.toFixed(2)} m`
  )
}

void main()

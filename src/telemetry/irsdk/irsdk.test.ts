/**
 * The iRacing binary layout, channel mapping and .ibt parsing.
 *
 * All of it tested against buffers built in memory in exactly the layout the
 * real thing uses. That is the point of having separated the layout from the
 * transport: the riskiest part of the telemetry phase -- binary offsets, type
 * sizes, sign conventions -- is checkable without iRacing installed, without a
 * session file, and without Windows.
 */

import { describe, expect, it } from 'vitest'
import {
  CORNER_PREFIXES,
  DISK_SUB_HEADER_SIZE,
  HEADER_SIZE,
  VAR_HEADER_SIZE,
  VarType,
  buildTestBuffer,
  indexVars,
  readCorners,
  readDiskSubHeader,
  readHeader,
  readNumber,
  readVar,
  readVarHeaders,
  recordLength,
  requiredBytes,
  sizeOf
} from './layout.js'
import {
  CHANNELS,
  DEFAULT_SIGNS,
  checkConventions,
  inferSteeringRatio,
  mapSample
} from './channels.js'
import { looksLikeIbt, parseIbt } from '../ibt.js'
import { toRad } from '../../core/util/numeric.js'

/** A session's worth of bytes, with the channels the overlay actually reads. */
function buildSession(opts: {
  n: number
  speed: number
  yawRate: number
  latAccel: number
  handwheel: number
  lateralVelocity?: number
  asFile?: boolean
  sessionInfo?: string
}) {
  const rep = (v: number): number[] => Array.from({ length: opts.n }, () => v)
  return buildTestBuffer({
    asFile: opts.asFile,
    sessionInfo: opts.sessionInfo,
    vars: [
      { name: CHANNELS.time, type: VarType.Double, values: Array.from({ length: opts.n }, (_, i) => 100 + i / 60) },
      { name: CHANNELS.speed, type: VarType.Float, values: rep(opts.speed) },
      { name: CHANNELS.velocityX, type: VarType.Float, values: rep(opts.speed) },
      { name: CHANNELS.velocityY, type: VarType.Float, values: rep(opts.lateralVelocity ?? 0) },
      { name: CHANNELS.yawRate, type: VarType.Float, values: rep(opts.yawRate) },
      { name: CHANNELS.steer, type: VarType.Float, values: rep(opts.handwheel) },
      { name: CHANNELS.latAccel, type: VarType.Float, values: rep(opts.latAccel) },
      { name: CHANNELS.longAccel, type: VarType.Float, values: rep(0) },
      { name: CHANNELS.throttle, type: VarType.Float, values: rep(0.5) },
      { name: CHANNELS.brake, type: VarType.Float, values: rep(0) },
      { name: CHANNELS.lap, type: VarType.Int, values: rep(3) },
      { name: CHANNELS.lapDistPct, type: VarType.Float, values: rep(0.25) },
      { name: CHANNELS.gear, type: VarType.Int, values: rep(4) },
      { name: CHANNELS.rpm, type: VarType.Float, values: rep(6000) },
      { name: 'LFshockVel', type: VarType.Float, values: rep(0.01) },
      { name: 'RFshockVel', type: VarType.Float, values: rep(0.02) },
      { name: 'LRshockVel', type: VarType.Float, values: rep(0.03) },
      { name: 'RRshockVel', type: VarType.Float, values: rep(0.04) },
      { name: 'LFpressure', type: VarType.Float, values: rep(160) },
      { name: 'RFpressure', type: VarType.Float, values: rep(161) },
      { name: 'LRpressure', type: VarType.Float, values: rep(162) },
      { name: 'RRpressure', type: VarType.Float, values: rep(163) }
    ]
  })
}

describe('the binary layout', () => {
  const buf = buildSession({ n: 10, speed: 40, yawRate: 0.3, latAccel: 12, handwheel: 0.6 })
  const header = readHeader(buf)
  const vars = readVarHeaders(buf, header)

  it('has the structure sizes the SDK defines', () => {
    // If any of these three drift, every offset below them is wrong and the
    // failure mode is silently plausible numbers.
    expect(HEADER_SIZE).toBe(112)
    expect(DISK_SUB_HEADER_SIZE).toBe(32)
    expect(VAR_HEADER_SIZE).toBe(144)
  })

  it('sizes each value type correctly', () => {
    expect(sizeOf(VarType.Char)).toBe(1)
    expect(sizeOf(VarType.Bool)).toBe(1)
    expect(sizeOf(VarType.Int)).toBe(4)
    expect(sizeOf(VarType.BitField)).toBe(4)
    expect(sizeOf(VarType.Float)).toBe(4)
    expect(sizeOf(VarType.Double)).toBe(8)
  })

  it('reads the header', () => {
    expect(header.version).toBe(2)
    expect(header.tickRate).toBe(60)
    expect(header.numVars).toBe(22)
    expect(header.bufLen).toBeGreaterThan(0)
    expect(header.varHeaderOffset).toBeGreaterThanOrEqual(HEADER_SIZE)
  })

  it('reads every variable header, with names and units', () => {
    expect(vars).toHaveLength(header.numVars)
    const index = indexVars(vars)
    expect(index.has(CHANNELS.speed)).toBe(true)
    expect(index.get(CHANNELS.time)?.type).toBe(VarType.Double)
    expect(index.get(CHANNELS.lap)?.type).toBe(VarType.Int)
  })

  it('reads values of every type out of a record', () => {
    const index = indexVars(vars)
    const record = buf.subarray(header.buffers[0].bufOffset, header.buffers[0].bufOffset + header.bufLen)
    expect(readNumber(record, index, CHANNELS.speed)).toBeCloseTo(40, 4)
    expect(readNumber(record, index, CHANNELS.lap)).toBe(3)
    expect(readNumber(record, index, CHANNELS.time)).toBeCloseTo(100, 9)
    expect(readVar(record, index.get(CHANNELS.gear)!)).toBe(4)
  })

  it('returns a fallback for a channel that is not published', () => {
    // Different cars publish different channel sets, so a missing channel is
    // an ordinary state and must not throw.
    const index = indexVars(vars)
    const record = buf.subarray(header.buffers[0].bufOffset)
    expect(readNumber(record, index, 'NoSuchChannel', -1)).toBe(-1)
  })

  it('reads the four corners in the SDK order', () => {
    const index = indexVars(vars)
    const record = buf.subarray(header.buffers[0].bufOffset)
    expect(CORNER_PREFIXES).toEqual(['LF', 'RF', 'LR', 'RR'])
    const v = readCorners(record, index, CORNER_PREFIXES, 'shockVel')
    expect(v?.map((x) => Math.round(x * 100))).toEqual([1, 2, 3, 4])
  })

  it('returns undefined when a corner set is incomplete', () => {
    const index = indexVars(vars)
    const record = buf.subarray(header.buffers[0].bufOffset)
    expect(readCorners(record, index, CORNER_PREFIXES, 'rideHeight')).toBeUndefined()
  })

  it('computes the record length from the variable table', () => {
    expect(recordLength(vars)).toBe(header.bufLen)
  })

  it('refuses a truncated buffer rather than reading rubbish', () => {
    expect(() => readHeader(Buffer.alloc(10))).toThrow(/truncated/)
  })
})

describe('mapping iRacing channels to the app’s sample', () => {
  const n = 5
  const buf = buildSession({
    n,
    speed: 40,
    yawRate: 0.3,
    latAccel: 12,
    handwheel: 0.6,
    lateralVelocity: -1.2
  })
  const header = readHeader(buf)
  const index = indexVars(readVarHeaders(buf, header))
  const record = buf.subarray(header.buffers[0].bufOffset, header.buffers[0].bufOffset + header.bufLen)

  it('converts handwheel angle to road-wheel steer', () => {
    // The conversion that silently scales every slip angle if it is wrong.
    const s = mapSample(record, index, { steeringRatio: 12 })
    // To float32 precision: the SDK publishes steer as a 32-bit float, so the
    // value that comes back is 0.6 rounded to float and then divided.
    expect(s.steer).toBeCloseTo(0.6 / 12, 7)
    const direct = mapSample(record, index, { steeringRatio: 1 })
    expect(direct.steer).toBeCloseTo(0.6, 6)
  })

  it('carries lateral velocity through, because sideslip depends on it', () => {
    const s = mapSample(record, index, { steeringRatio: 12 })
    expect(s.lateralVelocity).toBeCloseTo(-1.2, 5)
  })

  it('leaves lateral velocity undefined when the channel is absent', () => {
    // Which is the signal the estimator uses to fall back to integration.
    const bare = buildTestBuffer({
      vars: [
        { name: CHANNELS.speed, type: VarType.Float, values: [30] },
        { name: CHANNELS.yawRate, type: VarType.Float, values: [0.2] }
      ]
    })
    const h = readHeader(bare)
    const i = indexVars(readVarHeaders(bare, h))
    const r = bare.subarray(h.buffers[0].bufOffset)
    expect(mapSample(r, i, { steeringRatio: 12 }).lateralVelocity).toBeUndefined()
  })

  it('rebases session time so a sample stream starts near zero', () => {
    const s = mapSample(record, index, { steeringRatio: 12, timeOrigin: 100 })
    expect(s.t).toBeCloseTo(0, 9)
  })

  it('converts RPM to rad/s and tyre pressure to SI', () => {
    const s = mapSample(record, index, { steeringRatio: 12 })
    expect(s.engineSpeed).toBeCloseTo((6000 * 2 * Math.PI) / 60, 3)
    expect(s.tirePressure?.[0]).toBeCloseTo(160000, 0)
  })

  it('applies sign flips to every lateral channel together', () => {
    // Mirroring the whole car is physically meaningless -- every relation is
    // between these channels. Flipping only SOME of them is what would break.
    const flipped = mapSample(record, index, {
      steeringRatio: 12,
      signs: { lateralVelocity: -1, yawRate: -1, steer: -1, latAccel: -1 }
    })
    const normal = mapSample(record, index, { steeringRatio: 12, signs: DEFAULT_SIGNS })
    expect(flipped.ay).toBeCloseTo(-normal.ay, 6)
    expect(flipped.yawRate).toBeCloseTo(-normal.yawRate, 6)
    expect(flipped.steer).toBeCloseTo(-normal.steer, 9)
    expect(flipped.lateralVelocity).toBeCloseTo(-normal.lateralVelocity!, 6)
  })
})

describe('checking the sign conventions against the data', () => {
  const consistent = Array.from({ length: 200 }, (_, i) => ({
    t: i / 60,
    speed: 40,
    ax: 0,
    // Ay = V*r exactly -- Ch 4's transport term, a kinematic identity.
    ay: 40 * 0.3,
    yawRate: 0.3,
    steer: toRad(2),
    throttle: 0.5,
    brake: 0,
    lapDistPct: 0,
    lap: 1
  }))

  it('passes a set where Ay and V*r agree', () => {
    const c = checkConventions(consistent)
    expect(c.ok).toBe(true)
    expect(c.agreement).toBeCloseTo(1, 6)
  })

  it('catches a lateral acceleration channel read upside down', () => {
    // The failure this check exists for. Ay = V*r is an identity, so a
    // disagreement means one of the two is being read with the wrong sign --
    // and the overlay would then call every corner the wrong way round.
    const flipped = consistent.map((s) => ({ ...s, ay: -s.ay }))
    const c = checkConventions(flipped)
    expect(c.ok).toBe(false)
    expect(c.detail).toMatch(/DISAGREE/)
  })

  it('reports honestly when there is not enough cornering to judge', () => {
    const straight = consistent.map((s) => ({ ...s, yawRate: 0, ay: 0 }))
    const c = checkConventions(straight)
    expect(c.n).toBeLessThan(30)
    expect(c.detail).toMatch(/not enough/)
  })

  it('keeps the steer check separate, because opposite lock is legitimate', () => {
    // A car in a big slide genuinely steers against the corner. That is a
    // driver state, not a sign error, so it must not fail the check.
    const drifting = consistent.map((s) => ({ ...s, steer: -s.steer }))
    const c = checkConventions(drifting)
    expect(c.ok).toBe(true)
    expect(c.steerAgreement).toBeCloseTo(0, 6)
  })
})

describe('inferring the steering ratio from data', () => {
  const L = 3
  const RATIO = 14
  const K_RAD_PER_G = 0.02

  /**
   * Handwheel = G(L/R) + G K Ay -- a car with real understeer, not a kinematic
   * one. Corners are specified by the lateral acceleration they are taken at,
   * so the session actually spans the range the fit is entitled to work over.
   */
  const session = (speeds: number[], ayValues: number[]) => {
    const out = []
    let t = 0
    for (const speed of speeds) {
      for (const ay of ayValues) {
        const R = (speed * speed) / (ay * 9.80665)
        const yawRate = speed / R
        const roadWheel = L / R + K_RAD_PER_G * ay
        for (let i = 0; i < 20; i++) {
          out.push({
            t: (t += 1 / 60),
            speed,
            ax: 0,
            ay: ay * 9.80665,
            yawRate,
            steer: roadWheel * RATIO,
            throttle: 0.3,
            brake: 0,
            lapDistPct: 0,
            lap: 1
          })
        }
      }
    }
    return out
  }

  it('recovers a known ratio from a car that actually understeers', () => {
    // The two-regressor fit separates the ratio from the understeer term, so
    // it is right even when the corners are not gentle.
    const samples = session([30, 45, 60], [0.2, 0.35, 0.5, 0.65])
    expect(inferSteeringRatio(samples, L)).toBeCloseTo(RATIO, 4)
  })

  it('is NOT fooled by the understeer term, which a one-regressor fit is', () => {
    // The bug this replaced. Regressing handwheel on the Ackermann term alone
    // absorbs the understeer contribution into the one coefficient and returns
    // a ratio that is too large -- which scales every steer angle, leaves the
    // REAR axle identification perfect and the front wrong, and looks like a
    // tyre difference rather than a units error.
    const samples = session([30, 45, 60], [0.2, 0.35, 0.5, 0.65])
    let sxy = 0
    let sxx = 0
    for (const s of samples) {
      const ack = (L * s.yawRate) / s.speed
      sxy += s.steer * ack
      sxx += ack * ack
    }
    const naive = sxy / sxx
    expect(naive).toBeGreaterThan(RATIO * 1.05)
    expect(inferSteeringRatio(samples, L)).toBeCloseTo(RATIO, 4)
  })

  it('declines when the two regressors cannot be separated', () => {
    // Every corner at the same radius and speed makes the Ackermann term and
    // Ay proportional, so no fit can tell the ratio from the understeer. That
    // is a real limitation and it says so rather than returning the biased
    // answer.
    expect(inferSteeringRatio(session([40], [0.5]), L)).toBeNull()
  })

  it('declines rather than guessing when there is too little data', () => {
    expect(inferSteeringRatio([], 3)).toBeNull()
  })
})

describe('.ibt session files', () => {
  const buf = buildSession({
    n: 120,
    speed: 40,
    yawRate: 0.3,
    latAccel: 12,
    handwheel: 0.6,
    lateralVelocity: -1.2,
    asFile: true,
    sessionInfo: 'WeekendInfo:\n TrackDisplayName: Test Circuit\n CarScreenName: Test Car\n'
  })

  it('recognises a real layout and rejects anything else', () => {
    expect(looksLikeIbt(buf)).toBe(true)
    expect(looksLikeIbt(Buffer.alloc(400))).toBe(false)
    expect(looksLikeIbt(Buffer.from('not telemetry at all'))).toBe(false)
  })

  it('carries the disk sub-header a live source does not have', () => {
    const disk = readDiskSubHeader(buf)
    expect(disk.sessionRecordCount).toBe(120)
  })

  it('parses every record', () => {
    const f = parseIbt(buf, { steeringRatio: 12 })
    expect(f.samples).toHaveLength(120)
    expect(f.samples[0].t).toBeCloseTo(0, 9)
    expect(f.samples[59].t).toBeCloseTo(59 / 60, 6)
    expect(f.samples[0].speed).toBeCloseTo(40, 4)
  })

  it('reads the session YAML for names', () => {
    const f = parseIbt(buf, { steeringRatio: 12 })
    expect(f.sessionInfo).toMatch(/Test Circuit/)
  })

  it('decimates on request, for a long session', () => {
    const f = parseIbt(buf, { steeringRatio: 12, decimate: 4 })
    expect(f.samples).toHaveLength(30)
  })

  it('prefers the ratio the SESSION FILE declares over anything supplied', () => {
    // The file knows what car was driven. A ratio configured elsewhere in the
    // app describes the garage car, which may be a different car entirely --
    // and letting it win silently scales every front slip angle while leaving
    // the rear alone, which reads as a tyre difference rather than a units
    // error.
    const withRatio = buildSession({
      n: 40,
      speed: 40,
      yawRate: 0.3,
      latAccel: 12,
      handwheel: 0.6,
      asFile: true,
      sessionInfo: 'DriverInfo:\n DriverCarSteeringRatio: 14.5\n'
    })
    const f = parseIbt(withRatio, { steeringRatio: 9, wheelbase: 3 })
    expect(f.steeringRatio).toBeCloseTo(14.5, 6)
    expect(f.steeringRatioSource).toBe('session file')
  })

  it('falls back to a supplied ratio when the file declares none', () => {
    const f = parseIbt(buf, { steeringRatio: 9, wheelbase: 3 })
    expect(f.steeringRatio).toBeCloseTo(9, 6)
    expect(f.steeringRatioSource).toBe('supplied')
  })

  it('infers only when nothing at all is declared', () => {
    const f = parseIbt(buf, { wheelbase: 3 })
    expect(f.steeringRatioInferred).toBe(true)
    expect(f.steeringRatioSource).toBe('inferred')
    expect(f.steeringRatio).toBeGreaterThan(0)
  })

  it('trusts the file size over a record count that overstates it', () => {
    // A session that ended in a crash, or a file still being written, declares
    // more records than it contains. Reading past the end would produce
    // plausible-looking rubbish rather than an error.
    const truncated = Buffer.from(buf.subarray(0, buf.length - 40 * readHeader(buf).bufLen))
    const f = parseIbt(truncated, { steeringRatio: 12 })
    expect(f.samples.length).toBeLessThan(120)
    expect(f.samples.length).toBeGreaterThan(60)
    expect(f.samples.every((s) => Number.isFinite(s.speed))).toBe(true)
  })

  it('shares its whole parser with the live source', () => {
    // The economy that made this file short: a .ibt is the same header and
    // variable table as the shared memory, so the same readers serve both.
    const live = buildSession({ n: 4, speed: 40, yawRate: 0.3, latAccel: 12, handwheel: 0.6 })
    const lh = readHeader(live)
    const fh = readHeader(buf)
    expect(readVarHeaders(live, lh).map((v) => v.name)).toEqual(
      readVarHeaders(buf, fh).map((v) => v.name)
    )
  })
})

describe('required region size', () => {
  /**
   * The bug this pins cost a debugging session against a live sim.
   *
   * The shared-memory reader used to ask Windows for a view of a FIXED 2 MB.
   * iRacing's mapping is not a fixed size -- it is dominated by the session
   * string, which grows with the car count -- and at Richmond it was 1.19 MB.
   * MapViewOfFile refuses a view larger than the mapping, and the error it
   * returns is ACCESS_DENIED, which is indistinguishable from "not running" to
   * code that never reads it. The app insisted iRacing was closed while it was
   * running perfectly.
   *
   * So: never invent a size. This is the arithmetic that derives one honestly.
   */
  const build = (sessionInfo: string): Buffer =>
    buildTestBuffer({
      sessionInfo,
      vars: [
        { name: 'Speed', type: VarType.Float, values: [40, 41, 42] },
        { name: 'YawRate', type: VarType.Float, values: [0.1, 0.2, 0.3] }
      ]
    })

  it('covers everything the header points at', () => {
    const buf = build('a'.repeat(4096))
    const header = readHeader(buf)
    const need = requiredBytes(header)

    expect(need).toBeGreaterThanOrEqual(header.sessionInfoOffset + header.sessionInfoLength)
    expect(need).toBeGreaterThanOrEqual(header.varHeaderOffset + header.numVars * VAR_HEADER_SIZE)
    for (let i = 0; i < header.numBuf; i++) {
      expect(need).toBeGreaterThanOrEqual(header.buffers[i].bufOffset + header.bufLen)
    }
    // Everything it points at is inside the buffer it came from.
    expect(need).toBeLessThanOrEqual(buf.length)
  })

  it('tracks the session string rather than assuming a constant', () => {
    const small = requiredBytes(readHeader(build('x'.repeat(1024))))
    const large = requiredBytes(readHeader(build('x'.repeat(65536))))
    // The whole reason a fixed size is wrong: this number moves with the
    // session, so a constant is either too small or -- fatally -- too large.
    expect(large - small).toBe(65536 - 1024)
  })

  it('is never smaller than the header itself', () => {
    expect(requiredBytes(readHeader(build('')))).toBeGreaterThanOrEqual(HEADER_SIZE)
  })
})

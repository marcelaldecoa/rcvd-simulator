/**
 * The debrief brief: what an AI coach is told about your session.
 *
 * This module exists mostly to answer one question precisely -- what leaves
 * your machine -- and to make that answer testable and inspectable rather than
 * buried in an HTTP call.
 *
 * Two decisions shape it:
 *
 * RAW SAMPLES ARE NEVER SENT. A session is tens of thousands of rows and a
 * model cannot do arithmetic on them any better than the code here already
 * has. What goes instead is the DERIVED picture -- the same numbers the
 * dashboard shows -- which is a few hundred bytes, is legible to a human
 * before they send it, and is the level at which coaching advice is actually
 * given.
 *
 * IT SPEAKS THE BOOK'S LANGUAGE. The brief carries the chapter each number
 * belongs to, so the answer can point at a chapter and its lab rather than
 * offering generic sim-racing advice. That is the only reason this is worth
 * having over any other coaching tool: it is coaching against a specific text
 * the user is reading.
 *
 * The prompt is deliberately strict about what telemetry can and cannot claim.
 * Ch 11's discipline about confounders applies to reading data as much as to
 * running a test: telemetry can say a corner was slower and that more lock was
 * used through it. It cannot say the car understeered, only that the driver
 * added steering, and those are different claims.
 */

import type { SessionSummary } from './dashboard.js'
import type { AxleIdentification } from './identifyAxle.js'
import type { Identification } from './identify.js'

const R2D = 180 / Math.PI

export interface DebriefContext {
  carName?: string
  trackName?: string
  /** The garage car's name, which may not be the car actually driven. */
  garageCar?: string
  /** Understeer gradient of the garage car, deg/g. */
  garageK?: number
  identification?: Identification | null
  axle?: AxleIdentification | null
}

/** Exactly what is sent. Small enough to read before sending, by design. */
export interface DebriefBrief {
  session: {
    car?: string
    track?: string
    laps: number
    bestLapTime: number | null
    lapTimes: number[]
  }
  balance: {
    understeerShare: number
    neutralShare: number
    oversteerShare: number
    frontLimitedShare: number
    chapter: string
  }
  grip: {
    meanReach: number
    atLimitShare: number
    /** True when the modelled envelope does not match the car driven. */
    modelSuspect: boolean
    chapter: string
  }
  limits: {
    frontPeakDeg: number
    rearPeakDeg: number
    frontSource: string
    rearSource: string
    chapter: string
  }
  sectors: {
    from: number
    to: number
    gripUsed: number
    dominantBalance: string
    timeAvailable: number
  }[]
  identified?: {
    understeerGradientDegPerG?: number
    frontCorneringStiffnessNPerRad?: number
    rearCorneringStiffnessNPerRad?: number
    /**
     * False when the driving had too little spread in slip angle for the fit to
     * mean anything -- the same corner at the same speed all session gives a
     * line through the origin and one point, which is exact and worthless.
     * Sent because a stiffness with this omitted reads as a measurement.
     */
    wellConditioned?: boolean
    r2Front?: number
    r2Rear?: number
    note: string
  }
  garage?: {
    car?: string
    understeerGradientDegPerG?: number
  }
}

const share = (x: number): number => Math.round(x * 1000) / 1000

/** Which balance a stretch mostly showed. */
function dominant(b: { understeer: number; neutral: number; oversteer: number; samples: number }): string {
  if (b.samples === 0) return 'none'
  if (b.understeer >= b.neutral && b.understeer >= b.oversteer) return 'understeer'
  if (b.oversteer >= b.neutral) return 'oversteer'
  return 'neutral'
}

export function buildDebrief(
  summary: SessionSummary,
  ctx: DebriefContext = {}
): DebriefBrief {
  const complete = summary.laps.filter((l) => l.complete && l.time !== null)

  const brief: DebriefBrief = {
    session: {
      car: ctx.carName,
      track: ctx.trackName,
      laps: complete.length,
      bestLapTime: summary.bestLapTime,
      lapTimes: complete.map((l) => Math.round((l.time as number) * 1000) / 1000)
    },
    balance: {
      understeerShare: share(summary.balance.understeer),
      neutralShare: share(summary.balance.neutral),
      oversteerShare: share(summary.balance.oversteer),
      frontLimitedShare: share(summary.frontLimited),
      chapter: 'Ch 5 — steady-state stability and control'
    },
    grip: {
      meanReach: share(summary.gripUsed),
      atLimitShare: share(summary.atLimit),
      modelSuspect: summary.envelopeSuspect,
      chapter: 'Ch 9 — the g-g diagram'
    },
    limits: {
      frontPeakDeg: Math.round(summary.limits.front.peakSlipAngle * R2D * 100) / 100,
      rearPeakDeg: Math.round(summary.limits.rear.peakSlipAngle * R2D * 100) / 100,
      frontSource: summary.limits.front.source,
      rearSource: summary.limits.rear.source,
      chapter: 'Ch 2 / Ch 14 — tyre behaviour and data treatment'
    },
    // The worst handful only. Sending all twelve buries the three that matter.
    sectors: summary.worst.slice(0, 5).map((s) => ({
      from: share(s.from),
      to: share(s.to),
      gripUsed: share(s.gripUsed),
      dominantBalance: dominant(s.balance),
      timeAvailable: Math.round(s.timeAvailable * 100) / 100
    }))
  }

  if (ctx.garageCar || ctx.garageK !== undefined) {
    brief.garage = {
      car: ctx.garageCar,
      understeerGradientDegPerG:
        ctx.garageK === undefined ? undefined : Math.round(ctx.garageK * 1000) / 1000
    }
  }

  if (ctx.identification || ctx.axle) {
    brief.identified = {
      understeerGradientDegPerG: ctx.identification
        ? Math.round(ctx.identification.KDeg * 1000) / 1000
        : undefined,
      frontCorneringStiffnessNPerRad: ctx.axle ? Math.round(ctx.axle.cf) : undefined,
      rearCorneringStiffnessNPerRad: ctx.axle ? Math.round(ctx.axle.cr) : undefined,
      wellConditioned: ctx.axle?.wellConditioned,
      r2Front: ctx.axle ? Math.round(ctx.axle.r2Front * 1000) / 1000 : undefined,
      r2Rear: ctx.axle ? Math.round(ctx.axle.r2Rear * 1000) / 1000 : undefined,
      note: 'Fitted from this session, not assumed from the garage car.'
    }
  }

  return brief
}

/**
 * The instructions the coach works under.
 *
 * Long, and every clause is load-bearing. The failure mode of an AI coach is
 * fluent generic advice -- "be smoother on entry", "carry more speed" -- which
 * is unfalsifiable and would be identical without any telemetry at all. Each
 * rule below is aimed at one way of producing that.
 */
export const COACH_SYSTEM = `You are a race engineer debriefing a driver, and you are working strictly from the framework of Milliken & Milliken, "Race Car Vehicle Dynamics" (SAE, 1995). The driver is studying that book alongside a simulator, so your job is to connect what their data did to what they are reading.

WHAT THE DATA CAN AND CANNOT SAY. Telemetry can say a corner was slower and that more steering was used through it. It CANNOT say the car understeered — only that the driver added lock, which is a different claim. Ch 11's discipline about confounders applies to reading data as much as to running a test. Never assert a cause the data does not carry. Where a number has more than one explanation, say so and say what would distinguish them.

THE TWO BALANCE NUMBERS ARE DIFFERENT. The limit balance (which end gives up first, from the difference of the slip angles) and the linear understeer gradient K are different quantities and can move in opposite directions. Do not treat one as evidence about the other.

BALANCE AND PROXIMITY TO THE LIMIT ARE DIFFERENT QUESTIONS. A car can understeer strongly at 40% of its grip. "Understeer" says which end is giving up; grip used says how close to the edge the car is.

IF modelSuspect IS TRUE, the friction envelope in the app does not match the car actually driven, so grip figures and time-available figures rank the driver's corners against each other and measure nothing. Say this plainly and tell them to identify the car first. Do not build an argument on those numbers.

IF A LIMIT SOURCE IS "model", that axle's peak slip angle is an assumption from the garage tyre, not a measurement, so anything downstream of it is provisional.

IF identified.wellConditioned IS FALSE, the driver took the same corner at the same speed all session, so the fitted cornering stiffnesses come from one operating point. A line through the origin and a single point is exact and tells you nothing. Treat those stiffnesses as unusable and say what driving would fix it: a range of speeds and corner severities.

WHAT TO PRODUCE, in under 400 words:
1. The single most useful observation, first, in one sentence.
2. Two or three specific things to try, each naming whether it is a DRIVING change or a SETUP change — they are not interchangeable and confusing them wastes a session.
3. For each, the chapter of the book that governs it, so they can go and read it.

Be direct and concrete. Do not pad, do not flatter, do not hedge into uselessness. If the session is too short or too gentle to support conclusions, say that instead of manufacturing advice — that is a genuinely useful thing to be told.`

/** The user-side message: the brief, and what to do with it. */
export function briefToPrompt(brief: DebriefBrief): string {
  return `Here is the session, already reduced to derived measurements (no raw samples).

${JSON.stringify(brief, null, 2)}

Notes on the fields:
- Shares are fractions of the cornering the driver did, not of the whole lap.
- "meanReach" is how far out toward the friction envelope they drove, radially, 1.0 being on the boundary.
- "timeAvailable" is a rough conversion from the shortfall in grip used, for RANKING stretches against each other. It is not a lap-time prediction.
- Sector bounds are fractions of lap distance.

Debrief this session.`
}

/** A rough size guard, so a user can see what they are about to send. */
export function briefSize(brief: DebriefBrief): number {
  return JSON.stringify(brief).length
}

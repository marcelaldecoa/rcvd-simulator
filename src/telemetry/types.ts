/**
 * Telemetry data model (Phase 2).
 *
 * The channel set below is deliberately expressed in RCVD's vocabulary and SI
 * units, not in any simulator's. iRacing publishes its own names and a mix of
 * units; adapting is the job of a source, so that everything downstream --
 * the g-g diagram, the understeer identification, the load-transfer estimate --
 * is written once against this shape.
 *
 * Sign conventions match the rest of the app (see src/core/tire/types.ts):
 * positive lateral acceleration, yaw rate and steer are all to the left, and
 * loads are positive in compression.
 */

/** One sample of vehicle state. All SI, all in the vehicle body frame. */
export interface TelemetrySample {
  /** Session time, s. */
  t: number
  /** Forward speed, m/s. */
  speed: number
  /** Longitudinal acceleration, m/s^2. Positive forward. */
  ax: number
  /** Lateral acceleration, m/s^2. */
  ay: number
  /** Yaw rate, rad/s. */
  yawRate: number
  /** Road-wheel steer angle, rad. */
  steer: number
  /**
   * Lateral velocity in the body frame, m/s. Positive to the left.
   *
   * Optional because not every source has it, but strongly preferred when it
   * does: sideslip is the one channel that cannot be reconstructed accurately
   * without it. The alternative -- integrating beta_dot = Ay/V - r -- drifts,
   * because any bias in Ay or r accumulates without bound. iRacing publishes
   * this directly as VelocityY, so on the live source it is always present.
   */
  lateralVelocity?: number
  /** Throttle, 0-1. */
  throttle: number
  /** Brake, 0-1. */
  brake: number
  /** Distance around the lap, 0-1. */
  lapDistPct: number
  /** Lap number. */
  lap: number
  /** Gear, 0 = neutral, -1 = reverse. */
  gear?: number
  /** Engine speed, rad/s. */
  engineSpeed?: number
  /** Per-corner ride heights, m. Order: LF, RF, LR, RR. */
  rideHeight?: [number, number, number, number]
  /** Per-corner shock deflections, m. */
  shockDeflection?: [number, number, number, number]
  /** Per-corner shock velocities, m/s -- the Ch 22 histogram input. */
  shockVelocity?: [number, number, number, number]
  /** Per-corner tire surface temperatures, degC (inner, middle, outer averaged). */
  tireTemp?: [number, number, number, number]
  /** Per-corner tire pressures, Pa. */
  tirePressure?: [number, number, number, number]
}

/** What the source knows about the car and session. */
export interface SessionInfo {
  trackName?: string
  trackLength?: number
  carName?: string
  /** Sample rate, Hz. */
  sampleRate: number
}

/**
 * Setup values worth reading back into the models. This is the subset that the
 * Part I and Part II chapters actually consume; it is not a full setup sheet.
 */
export interface SetupSnapshot {
  /** Corner weights, N. Order: LF, RF, LR, RR. */
  cornerWeights?: [number, number, number, number]
  /** Wheel rates, N/m. */
  wheelRates?: [number, number, number, number]
  /** Anti-roll bar rates, N.m/rad. Order: front, rear. */
  barRates?: [number, number]
  /** Static camber, rad. */
  camber?: [number, number, number, number]
  /** Static toe, rad. */
  toe?: [number, number, number, number]
  /** Cold tire pressures, Pa. */
  pressures?: [number, number, number, number]
  /** Brake bias, fraction to the front. */
  brakeBias?: number
  /** Ride heights, m. */
  rideHeights?: [number, number, number, number]
}

export type SourceKind = 'live' | 'file' | 'synthetic'

export interface SourceStatus {
  kind: SourceKind
  connected: boolean
  /** Human-readable state, e.g. "iRacing not running". */
  detail: string
}

/**
 * A telemetry source. Three implementations are planned:
 *
 *   live      -- iRacing shared memory (Local\IRSDKMemMapFileName) at 60 Hz
 *   file      -- an .ibt session file, replayed or scanned
 *   synthetic -- generated from the app's own vehicle model, so the whole
 *                downstream pipeline can be built and tested before any of the
 *                simulator plumbing exists
 *
 * Only `synthetic` is implemented today. The interface exists now so that the
 * analysis code written against it does not have to change when the others
 * land.
 */
export interface TelemetrySource {
  readonly kind: SourceKind
  status(): SourceStatus
  session(): SessionInfo
  setup(): SetupSnapshot | null
  /** Subscribe to samples. Returns an unsubscribe function. */
  subscribe(onSample: (s: TelemetrySample) => void): () => void
  /** All samples, for a file source. Empty for a live source. */
  all(): TelemetrySample[]
  start(): Promise<void>
  stop(): void
}

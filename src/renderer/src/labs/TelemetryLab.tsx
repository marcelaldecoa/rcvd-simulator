/**
 * The telemetry and overlay lab.
 *
 * Two jobs on one page: choose where the data comes from, and configure the
 * box that floats over the game.
 *
 * The overlay's own numbers -- slip angles, balance, limit usage -- are
 * computed in the main process and arrive here already finished, at a throttled
 * ten per second rather than the sixty the overlay itself gets. There is no
 * reason for a settings page to re-render at frame rate.
 */

import { useCallback, useEffect, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, Verdict } from '../components/Teach'
import { ButtonRow, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import { derive } from '@core/vehicle/params.js'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { rearTireParams } from '../store/garage'
import { toDeg } from '@core/util/numeric.js'
import { summarise } from '@core/vehicle/steadyState.js'
import {
  identifyUndersteerGradient,
  ggPoints,
  type Identification
} from '@telemetry/identify.js'
import type { TelemetrySample } from '@telemetry/types.js'
import {
  crossCheckIdentification,
  identifyAxleStiffness,
  type AxleIdentification
} from '@telemetry/identifyAxle.js'
import {
  biggestSegments,
  compareLaps,
  describeSegment,
  splitLaps,
  type Lap,
  type LapComparison
} from '@telemetry/laps.js'

interface OverlayConfig {
  enabled: boolean
  x: number | null
  y: number | null
  width: number
  height: number
  textScale: number
  opacity: number
  locked: boolean
  showDiagram: boolean
  showBars: boolean
  showNumbers: boolean
  soundEnabled: boolean
  soundVolume: number
  soundKind: 'tone' | 'blip' | 'chirp'
  soundFront: boolean
  soundRear: boolean
  soundThreshold: number
}

interface TelemetryState {
  status: { kind: string; connected: boolean; detail: string }
  reading: {
    balance: string
    text: string
    zone: 'under' | 'at' | 'over'
    usage: number
    usageFront: number
    usageRear: number
    provisional: boolean
    state: { alphaFront: number; alphaRear: number; beta: number; ay: number; speed: number }
  } | null
  limits: {
    front: { peakSlipAngle: number; source: string; confidence: number }
    rear: { peakSlipAngle: number; source: string; confidence: number }
  }
  integratingSideslip: boolean
  samplesSeen: number
}

interface Bridge {
  getOverlayConfig(): Promise<OverlayConfig>
  setOverlayConfig(patch: Partial<OverlayConfig>): Promise<OverlayConfig>
  selectSource(choice: 'live' | 'synthetic' | { file: string }): Promise<TelemetryState>
  stopTelemetry(): Promise<TelemetryState>
  telemetryState(): Promise<TelemetryState>
  pickSessionFile(): Promise<string | null>
  telemetrySamples(): Promise<TelemetrySample[]>
  onTelemetry(fn: (s: TelemetryState) => void): () => void
}

const bridge = (): Bridge | null =>
  (window as unknown as { rcvd?: Partial<Bridge> }).rcvd?.getOverlayConfig
    ? ((window as unknown as { rcvd: Bridge }).rcvd)
    : null

const ZONE_TONE = { under: 'ok', at: 'warn', over: 'danger' } as const

export function TelemetryLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const setVehicle = useGarage((s) => s.setVehicle)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)

  const [config, setConfig] = useState<OverlayConfig | null>(null)
  const [state, setState] = useState<TelemetryState | null>(null)
  const [source, setSource] = useState<'none' | 'live' | 'synthetic' | 'file'>('none')
  const [file, setFile] = useState<string | null>(null)
  const [samples, setSamples] = useState<TelemetrySample[]>([])
  const [fit, setFit] = useState<Identification | null>(null)
  const [axle, setAxle] = useState<AxleIdentification | null>(null)
  const [laps, setLaps] = useState<Lap[]>([])
  const [refLap, setRefLap] = useState<number | null>(null)
  const [cmpLap, setCmpLap] = useState<number | null>(null)

  const api = bridge()
  const v = derive(vehicle)

  /** The modelled peak slip angles the overlay starts from, from the garage tyres. */
  const modelPeaks = (() => {
    const f = new MagicFormulaTire(tire)
    const r = new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale))
    return { front: f.peakFy(v.wf / 2).at, rear: r.peakFy(v.wr / 2).at }
  })()

  useEffect(() => {
    if (!api) return
    void api.getOverlayConfig().then(setConfig)
    void api.telemetryState().then(setState)
    return api.onTelemetry(setState)
  }, [api])

  /**
   * Analyse whenever a FILE source is active, rather than when the button in
   * this lab happens to be clicked.
   *
   * Driving it from the click handler looked simpler and was quietly wrong: a
   * session selected any other way -- restored at startup, opened from the
   * damper lab, set over IPC -- left these panels blank with a source loaded
   * and no explanation. Reacting to the state the main process reports means
   * the analysis follows the data, whatever put it there.
   */
  useEffect(() => {
    if (!api) return
    if (state?.status.kind !== 'file' || !state.status.connected) return
    if (samples.length > 0) return
    let cancelled = false
    void api.telemetrySamples().then((all) => {
      if (cancelled || all.length === 0) return
      setSamples(all)
      setFit(identifyUndersteerGradient(all, { wheelbase: v.L }))
      setAxle(
        identifyAxleStiffness(all, {
          geometry: { a: vehicle.a, b: vehicle.b, frontWeightFraction: v.frontWeightFraction },
          weight: v.w
        })
      )
      const found = splitLaps(all).filter((l) => l.complete)
      setLaps(found)
      // Default to the two quickest complete laps, which is what anyone opening
      // a session wants to look at first.
      const byTime = [...found].sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9))
      setRefLap(byTime[0]?.number ?? null)
      setCmpLap(byTime[1]?.number ?? byTime[0]?.number ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [api, state?.status.kind, state?.status.connected, samples.length, v.L, v.w, v.frontWeightFraction, vehicle.a, vehicle.b])

  /** Clear the analysis when the source goes away, so it cannot go stale. */
  useEffect(() => {
    if (state?.status.kind !== 'file' && samples.length > 0) {
      setSamples([])
      setFit(null)
      setAxle(null)
      setLaps([])
    }
  }, [state?.status.kind, samples.length])

  const patch = useCallback(
    (p: Partial<OverlayConfig>) => {
      if (!api) return
      void api.setOverlayConfig(p).then(setConfig)
    },
    [api]
  )

  const choose = useCallback(
    async (kind: 'live' | 'synthetic' | 'file') => {
      if (!api) return
      if (kind === 'file') {
        const path = await api.pickSessionFile()
        if (!path) return
        setFile(path)
        setSource('file')
        setState(await api.selectSource({ file: path }))
        return
      }
      setSource(kind)
      setSamples([])
      setFit(null)
      setAxle(null)
      setLaps([])
      setState(await api.selectSource(kind))
    },
    [api]
  )

  if (!api) {
    return (
      <div className="lab">
        <div className="empty">
          <h3>Telemetry needs the desktop app</h3>
          <div>
            The overlay and the iRacing connection live in the Electron shell, so this page is
            inert in a browser. Run <code>npm run dev</code> rather than <code>npm run dev:web</code>.
          </div>
        </div>
      </div>
    )
  }

  const ggChart: Series[] = samples.length
    ? [
        {
          name: 'Where the driver went',
          color: '#4dd6c1',
          scatter: true,
          points: ggPoints(samples).filter((_, i) => i % Math.max(1, Math.floor(samples.length / 3000)) === 0)
        }
      ]
    : []

  const check = fit && axle ? crossCheckIdentification(fit.KDeg, axle) : null

  const comparison: LapComparison | null = (() => {
    if (refLap === null || cmpLap === null) return null
    const a = laps.find((l) => l.number === refLap)
    const b = laps.find((l) => l.number === cmpLap)
    return a && b ? compareLaps(a, b) : null
  })()

  const deltaChart: Series[] = comparison
    ? [
        {
          name: 'Cumulative delta (s) — climbing means losing',
          color: '#ffcc55',
          points: comparison.distance.map((d, i) => ({ x: d * 100, y: comparison.delta[i] }))
        }
      ]
    : []

  const speedChart: Series[] = comparison
    ? [
        {
          name: `Lap ${refLap}`,
          color: '#4dd6c1',
          points: comparison.distance.map((d, i) => ({ x: d * 100, y: comparison.reference.speed[i] * 3.6 }))
        },
        {
          name: `Lap ${cmpLap}`,
          color: '#ff9f4d',
          points: comparison.distance.map((d, i) => ({ x: d * 100, y: comparison.compared.speed[i] * 3.6 }))
        }
      ]
    : []

  const reading = state?.reading ?? null
  const connected = state?.status.connected ?? false

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        The same bicycle model the rest of this course is built on, fed by live data. iRacing
        publishes velocities and a yaw rate; the <strong>slip angles are derived</strong>, by
        exactly the arithmetic of Chapter 5.
      </div>

      <div className="stage">
        <Panel
          title="Where the data comes from"
          reference="Phase 2"
          right={
            <ButtonRow
              options={[
                { value: 'live', label: 'iRacing' },
                { value: 'synthetic', label: 'Synthetic' },
                { value: 'file', label: 'Open .ibt…' }
              ]}
              value={source === 'none' ? 'synthetic' : source}
              onChange={(k) => void choose(k as 'live' | 'synthetic' | 'file')}
            />
          }
          note={
            <>
              <strong>Synthetic</strong> generates laps from the app's own vehicle model, so the
              whole pipeline can be watched working without the simulator running. It is also how
              the analysis was tested: if it cannot recover the slip angles of a car we built
              ourselves, it will not recover the slip angles of a car we did not.
            </>
          }
        >
          <Readouts>
            <Readout
              label="Source"
              value={state?.status.kind ?? 'none'}
              tone={connected ? 'ok' : 'warn'}
            />
            <Readout label="Samples seen" value={String(state?.samplesSeen ?? 0)} />
            <Readout
              label="Sideslip"
              value={state?.integratingSideslip ? 'integrated' : 'measured'}
              tone={state?.integratingSideslip ? 'warn' : 'ok'}
            />
          </Readouts>
          <div className="panel-note">
            {state?.status.detail ?? 'no source selected'}
            {file && <> · {file}</>}
          </div>
          {state?.integratingSideslip && (
            <div className="panel-note">
              <strong>This source has no lateral velocity channel</strong>, so sideslip is being
              integrated from Ay and yaw rate. That drifts — any bias in either channel
              accumulates — so treat the slip angles as indicative rather than exact. iRacing
              publishes the channel directly, so the live source never does this.
            </div>
          )}
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button
              className="btn"
              onClick={() => {
                setSource('none')
                void api.stopTelemetry().then(setState)
              }}
            >
              Stop
            </button>
          </div>
        </Panel>

        <div className="stack">
          <Panel title="What the overlay is showing" reference="live">
            {reading ? (
              <>
                <Readouts>
                  <Readout
                    label="Balance"
                    value={reading.text}
                    tone={
                      reading.balance === 'understeer'
                        ? 'front'
                        : reading.balance === 'oversteer'
                          ? 'rear'
                          : 'ok'
                    }
                  />
                  <Readout
                    label="Limit usage"
                    value={`${Math.round(reading.usage * 100)}%`}
                    tone={ZONE_TONE[reading.zone]}
                  />
                  <Readout
                    label="Front slip"
                    value={toDeg(reading.state.alphaFront).toFixed(2)}
                    unit="deg"
                    tone="front"
                  />
                  <Readout
                    label="Rear slip"
                    value={toDeg(reading.state.alphaRear).toFixed(2)}
                    unit="deg"
                    tone="rear"
                  />
                  <Readout label="Sideslip β" value={toDeg(reading.state.beta).toFixed(2)} unit="deg" />
                  <Readout label="Lateral" value={reading.state.ay.toFixed(2)} unit="g" />
                </Readouts>
                <div style={{ padding: '0 12px 12px' }}>
                  <Verdict
                    headline={
                      reading.zone === 'under'
                        ? 'Under the limit'
                        : reading.zone === 'at'
                          ? 'At the limit'
                          : 'Past the peak — sliding'
                    }
                    tone={
                      reading.zone === 'under' ? 'ok' : reading.zone === 'at' ? 'front' : 'rear'
                    }
                  >
                    The <strong>word</strong> says which end is giving up first; the{' '}
                    <strong>colour</strong> says how close to the edge the car is. They answer
                    different questions and are free to disagree — a car can be strongly
                    understeering at 40% of its grip.
                  </Verdict>
                </div>
              </>
            ) : (
              <div className="panel-note" style={{ borderTop: 'none' }}>
                No readings yet. Choose a source above.
              </div>
            )}
          </Panel>

          <Panel
            title="Where the limit is"
            note={
              <>
                Nothing in the telemetry says where the limit is, so it has to be estimated. The
                overlay starts from the garage tyre's peak slip angle and switches to what it
                observes once the driver has actually been past a peak.
              </>
            }
          >
            <Readouts>
              <Readout
                label="Front peak"
                value={toDeg(state?.limits.front.peakSlipAngle ?? modelPeaks.front).toFixed(2)}
                unit="deg"
                tone={state?.limits.front.source === 'observed' ? 'ok' : 'warn'}
              />
              <Readout
                label="…from"
                value={state?.limits.front.source ?? 'model'}
              />
              <Readout
                label="Rear peak"
                value={toDeg(state?.limits.rear.peakSlipAngle ?? modelPeaks.rear).toFixed(2)}
                unit="deg"
                tone={state?.limits.rear.source === 'observed' ? 'ok' : 'warn'}
              />
              <Readout label="…from" value={state?.limits.rear.source ?? 'model'} />
            </Readouts>
            <div className="panel-note">
              While either says <strong>model</strong>, the overlay marks itself{' '}
              <em>learning</em> — the colours are then only as good as the match between the
              garage car and the car being driven. An observed peak needs evidence on{' '}
              <strong>both sides</strong> of it, because the highest angle a driver happened to
              visit is not a peak.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="The overlay"
          reference="configurable"
          right={
            <ButtonRow
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' }
              ]}
              value={config?.enabled ? 'on' : 'off'}
              onChange={(v) => patch({ enabled: v === 'on' })}
            />
          }
          note={
            <>
              <strong>iRacing must run windowed or borderless.</strong> A DirectX application in
              true exclusive fullscreen owns the display and nothing composites on top of it —
              that applies to every overlay ever written, not just this one.
            </>
          }
        >
          {config && (
            <>
              <Slider
                label="Width"
                unit="px"
                value={config.width}
                min={180}
                max={900}
                step={10}
                digits={0}
                onChange={(width) => patch({ width })}
              />
              <Slider
                label="Height"
                unit="px"
                value={config.height}
                min={140}
                max={800}
                step={10}
                digits={0}
                onChange={(height) => patch({ height })}
              />
              <Slider
                label="Text size"
                unit="×"
                value={config.textScale}
                min={0.6}
                max={2.5}
                step={0.05}
                digits={2}
                onChange={(textScale) => patch({ textScale })}
              />
              <Slider
                label="Transparency"
                unit="% opaque"
                value={config.opacity * 100}
                min={15}
                max={100}
                step={1}
                digits={0}
                onChange={(pct) => patch({ opacity: pct / 100 })}
              />
              <Slider
                label="Position from the left"
                unit="px"
                value={config.x ?? 0}
                min={0}
                max={3800}
                step={10}
                digits={0}
                onChange={(x) => patch({ x })}
              />
              <Slider
                label="Position from the top"
                unit="px"
                value={config.y ?? 0}
                min={0}
                max={2000}
                step={10}
                digits={0}
                onChange={(y) => patch({ y })}
              />

              <div className="btn-row" style={{ marginTop: 10 }}>
                <button
                  className={`btn${config.locked ? ' active' : ''}`}
                  onClick={() => patch({ locked: !config.locked })}
                >
                  {config.locked ? 'Locked — click-through' : 'Unlocked — drag to move'}
                </button>
                <button className="btn" onClick={() => patch({ x: null, y: null })}>
                  Reset position
                </button>
              </div>
              <div className="panel-note">
                While <strong>locked</strong> the overlay ignores the mouse entirely, so it can
                never steal a click from the game. Unlock it to drag the box anywhere, then lock
                it again before driving.
              </div>

              <div className="btn-row" style={{ marginTop: 10 }}>
                <button
                  className={`btn${config.showDiagram ? ' active' : ''}`}
                  onClick={() => patch({ showDiagram: !config.showDiagram })}
                >
                  Slip diagram
                </button>
                <button
                  className={`btn${config.showBars ? ' active' : ''}`}
                  onClick={() => patch({ showBars: !config.showBars })}
                >
                  Usage bars
                </button>
                <button
                  className={`btn${config.showNumbers ? ' active' : ''}`}
                  onClick={() => patch({ showNumbers: !config.showNumbers })}
                >
                  Numbers
                </button>
              </div>
            </>
          )}
        </Panel>

        {config && (
        <Panel
          title="Audible warning"
          reference="driving aid"
          note={
            <>
              A cue as an axle approaches <em>its own</em> peak — the front one low, the rear one
              high, so you can tell them apart without looking. It fires below the limit on
              purpose: by the time the rear has let go your inner ear has already said so and a
              speaker is late. The one worth having is the front, because understeer is
              undramatic and easy to miss.
              <br />
              <br />
              One cue per corner, never per frame, with a floor on how often it can repeat. An
              alarm that goes off constantly stops being heard within a lap.
            </>
          }
        >
          <div className="btn-row">
            <button
              className={`btn${config.soundEnabled ? ' active' : ''}`}
              onClick={() => patch({ soundEnabled: !config.soundEnabled })}
            >
              {config.soundEnabled ? 'Sound on' : 'Sound off'}
            </button>
            <button
              className={`btn${config.soundFront ? ' active' : ''}`}
              disabled={!config.soundEnabled}
              onClick={() => patch({ soundFront: !config.soundFront })}
            >
              Front · understeer
            </button>
            <button
              className={`btn${config.soundRear ? ' active' : ''}`}
              disabled={!config.soundEnabled}
              onClick={() => patch({ soundRear: !config.soundRear })}
            >
              Rear · oversteer
            </button>
          </div>

          <div className="btn-row" style={{ marginTop: 8 }}>
            {(['tone', 'blip', 'chirp'] as const).map((k) => (
              <button
                key={k}
                className={`btn${config.soundKind === k ? ' active' : ''}`}
                disabled={!config.soundEnabled}
                onClick={() => patch({ soundKind: k })}
              >
                {k}
              </button>
            ))}
          </div>

          <Slider
            label="Volume"
            value={config.soundVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ soundVolume: v })}
            display={`${Math.round(config.soundVolume * 100)}%`}
          />
          <Slider
            label="Warn at"
            value={config.soundThreshold}
            min={0.6}
            max={0.98}
            step={0.01}
            onChange={(v) => patch({ soundThreshold: v })}
            display={`${Math.round(config.soundThreshold * 100)}%`}
            unit="of the axle's peak"
          />
        </Panel>
        )}

        <Panel
          title="After the session"
          reference="Ch 5 §4 · Ch 9"
          note={
            <>
              A loaded <code>.ibt</code> is not real-time, so it can do what the overlay cannot:
              scan the whole session and fit the car's <em>actual</em> understeer gradient.
            </>
          }
        >
          {samples.length === 0 ? (
            <div className="panel-note" style={{ borderTop: 'none' }}>
              Open a <code>.ibt</code> session file above and this fills in. The fit needs real
              cornering — a few laps of anything is plenty.
            </div>
          ) : (
            <>
              <Readouts>
                <Readout label="Samples" value={samples.length.toLocaleString()} />
                <Readout
                  label="K measured"
                  value={fit ? `${fit.KDeg >= 0 ? '+' : ''}${fit.KDeg.toFixed(3)}` : '—'}
                  unit="deg/g"
                  tone="accent"
                />
                <Readout
                  label="K from the garage"
                  value={`${summarise(vehicle).KDeg >= 0 ? '+' : ''}${summarise(vehicle).KDeg.toFixed(3)}`}
                  unit="deg/g"
                />
                <Readout
                  label="Fit quality r²"
                  value={fit ? fit.r2.toFixed(3) : '—'}
                  tone={fit && fit.r2 > 0.8 ? 'ok' : 'danger'}
                />
                <Readout
                  label="Reached"
                  value={fit ? fit.maxAy.toFixed(2) : '—'}
                  unit="g"
                />
              </Readouts>
              <div className="panel-note">
                {fit && fit.r2 <= 0.8 ? (
                  <>
                    <strong>Do not trust that gradient.</strong> An r² below about 0.8 means the
                    samples are not describing a single steady-state relationship — usually
                    because the session had too little sustained cornering, or too much of it was
                    under braking or power, where the derivation does not hold.
                  </>
                ) : (
                  <>
                    The same regression as a constant-radius skid pad, run over ordinary laps.
                    Nothing in Ch 5's derivation requires a constant radius — only that the
                    Ackermann term L·r/V is accounted for, which it is. Samples under significant
                    longitudinal acceleration are rejected, because trail braking and power-on
                    both violate the steady-turn assumption.
                  </>
                )}
              </div>
              <Chart
                series={ggChart}
                height={260}
                xLabel="Lateral acceleration (g)"
                yLabel="Longitudinal acceleration (g)"
                zeroY={false}
                fmtX={(x) => x.toFixed(1)}
                fmtY={(y) => y.toFixed(1)}
              />
              <div className="panel-note">
                The g-g scatter of what the driver actually used. Chapter 9's diagnostic is the
                shape of the <em>gaps</em>: an empty diagonal means braking and cornering are
                being done in sequence rather than blended, which is the commonest and largest
                lap-time loss there is.
              </div>
            </>
          )}
        </Panel>

        <Panel
          title="This car, identified"
          reference="Ch 5 §4 · Ch 7 §3"
          note={
            <>
              A fitted K is <strong>one equation in two unknowns</strong> — any number of
              (C<sub>f</sub>, C<sub>r</sub>) pairs produce it. Measured sideslip breaks the
              degeneracy: with β known, each axle's slip angle is known separately, and
              regressing its force against it recovers the two stiffnesses on their own.
            </>
          }
        >
          {!axle ? (
            <div className="panel-note" style={{ borderTop: 'none' }}>
              Open a <code>.ibt</code> session above. The fit needs sustained cornering below
              the tyre's peak — a few laps of anything is plenty.
            </div>
          ) : (
            <>
              <Readouts>
                <Readout label="C(f) measured" value={(axle.cf / 1000).toFixed(1)} unit="kN/rad" tone="front" />
                <Readout label="C(r) measured" value={(axle.cr / 1000).toFixed(1)} unit="kN/rad" tone="rear" />
                <Readout label="C(f) in the garage" value={(vehicle.cf / 1000).toFixed(1)} unit="kN/rad" />
                <Readout label="C(r) in the garage" value={(vehicle.cr / 1000).toFixed(1)} unit="kN/rad" />
                <Readout
                  label="Front fit r²"
                  value={Number.isNaN(axle.r2Front) ? 'undefined' : axle.r2Front.toFixed(3)}
                  tone={axle.r2Front > 0.8 ? 'ok' : 'danger'}
                />
                <Readout
                  label="Rear fit r²"
                  value={Number.isNaN(axle.r2Rear) ? 'undefined' : axle.r2Rear.toFixed(3)}
                  tone={axle.r2Rear > 0.8 ? 'ok' : 'danger'}
                />
                <Readout
                  label="Slip angle range"
                  value={toDeg(Math.min(axle.spreadFront, axle.spreadRear)).toFixed(2)}
                  unit="deg"
                  tone={axle.wellConditioned ? 'ok' : 'danger'}
                />
              </Readouts>
              {!axle.wellConditioned && (
                <div className="panel-note">
                  <strong>Not enough spread to support this fit.</strong> The session covers
                  only {toDeg(Math.min(axle.spreadFront, axle.spreadRear)).toFixed(2)}° of slip
                  angle, which is close to a single operating point — and a line through the
                  origin and one point is exact whatever the truth is. The stiffnesses above
                  may well be right; they are simply not <em>evidence</em>.
                  <br />
                  <br />
                  Drive a wider range of corners, or the same corners at more speeds, and this
                  resolves itself.
                </div>
              )}
              {check && (
                <div className="panel-note">
                  <strong>{check.agrees ? 'Cross-check passes.' : 'Cross-check FAILS.'}</strong>{' '}
                  {check.detail}
                  <br />
                  <br />
                  Two independent fits — steer against A<sub>y</sub>, and axle force against
                  axle slip — sharing no arithmetic beyond the samples. Agreement is real
                  evidence; disagreement means suspect the sideslip channel or the assumed
                  weight distribution before trusting either number.
                </div>
              )}
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button
                  className="btn active"
                  disabled={!check?.agrees || !axle.wellConditioned}
                  onClick={() => setVehicle({ cf: axle.cf, cr: axle.cr })}
                >
                  Use this car everywhere
                </button>
              </div>
              <div className="panel-note">
                That writes the measured stiffnesses into the garage, so{' '}
                <strong>every chapter runs on your car</strong> rather than on the preset —
                the understeer budget, the Moment Method map, the pair analysis, all of it.
                Mass and geometry stay as they are: telemetry does not publish them, and
                guessing them would quietly corrupt everything downstream.
                {(!check?.agrees || !axle.wellConditioned) && (
                  <>
                    <br />
                    <br />
                    Disabled while the fit is unsupported or the two routes disagree. Writing a
                    number that failed its own checks into the garage would spread one bad
                    measurement through twenty labs.
                  </>
                )}
              </div>
            </>
          )}
        </Panel>

        <Panel title="What the box is for, and what it is not">
          <Explain
            seeing={
              <>
                A slip-angle diagram, a word, and a colour. The two shaded angles are the front
                and rear axles; whichever is wider is the end giving up first, which is the whole
                definition of understeer from Chapter 5 and takes a glance rather than a
                paragraph.
              </>
            }
            look={
              <>
                That the colour and the word can disagree. <strong>Green, yellow, red</strong> is
                how much of each axle's own peak slip angle is in use — how close to the edge.{' '}
                <strong>Understeer or oversteer</strong> is which end is nearer that edge. Being
                green and understeering at the same time is normal and correct.
              </>
            }
            matters={
              <>
                Because the association between what the car <em>felt</em> like and what the
                numbers <em>said</em> is the thing worth building, and it is very hard to build
                from a chapter alone.
                <br />
                <br />
                An honest caveat: nobody reads a box mid-corner. The value of a real-time overlay
                is peripheral glance and replay review — noticing afterwards that the moment the
                car felt vague was the moment the front bar went yellow. Treat it as a training
                aid rather than an instrument, and expect most of the learning to happen watching
                the replay.
              </>
            }
          />
        </Panel>
      </div>

      {laps.length >= 2 && (
        <div className="grid2">
          <Panel
            title="Where the time went"
            reference="Ch 11"
            right={
              <div className="btn-row">
                <select
                  style={{ width: 'auto', fontSize: 11, padding: '2px 5px' }}
                  value={refLap ?? ''}
                  onChange={(e) => setRefLap(Number(e.target.value))}
                >
                  {laps.map((l) => (
                    <option key={l.number} value={l.number}>
                      Lap {l.number} — {l.time?.toFixed(3)} s
                    </option>
                  ))}
                </select>
                <select
                  style={{ width: 'auto', fontSize: 11, padding: '2px 5px' }}
                  value={cmpLap ?? ''}
                  onChange={(e) => setCmpLap(Number(e.target.value))}
                >
                  {laps.map((l) => (
                    <option key={l.number} value={l.number}>
                      Lap {l.number} — {l.time?.toFixed(3)} s
                    </option>
                  ))}
                </select>
              </div>
            }
            note={
              <>
                Compared by <strong>distance</strong>, not by time. Two laps take different
                times by definition, so the same clock reading is a different corner — the
                only honest comparison is at the same point on the track.
              </>
            }
          >
            <Chart
              series={deltaChart}
              height={210}
              xLabel="Distance around the lap (%)"
              yLabel="Cumulative delta (s)"
              zeroY={false}
              fmtX={(x) => x.toFixed(0)}
              fmtY={(y) => y.toFixed(2)}
              hRules={[{ value: 0, color: '#3a4756' }]}
            />
            <div className="panel-note">
              Read the <strong>slope</strong>, not the height. Where the line climbs, time is
              being lost; a flat stretch means the two laps were equal there, however far
              apart they already were.
            </div>
            <Chart
              series={speedChart}
              height={190}
              xLabel="Distance around the lap (%)"
              yLabel="Speed (km/h)"
              zeroY={false}
              fmtX={(x) => x.toFixed(0)}
              fmtY={(y) => y.toFixed(0)}
            />
            {comparison && (
              <Readouts>
                <Readout
                  label="Total"
                  value={`${comparison.total >= 0 ? '+' : ''}${comparison.total.toFixed(3)}`}
                  unit="s"
                  tone={comparison.total > 0 ? 'danger' : 'ok'}
                />
                <Readout label="Complete laps" value={String(laps.length)} />
              </Readouts>
            )}
          </Panel>

          <Panel
            title="The stretches that mattered"
            note={
              <>
                A lap delta is usually a few places where something real happened plus a lot
                of noise. These are the few.
              </>
            }
          >
            {comparison ? (
              <table className="data">
                <thead>
                  <tr>
                    <th>Where</th>
                    <th>Delta</th>
                    <th>Speed</th>
                    <th>Lateral</th>
                    <th>Steer</th>
                  </tr>
                </thead>
                <tbody>
                  {biggestSegments(comparison, 6).map((seg) => (
                    <tr key={seg.from}>
                      <td>
                        {(seg.from * 100).toFixed(0)}–{(seg.to * 100).toFixed(0)}%
                      </td>
                      <td style={{ color: seg.delta > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                        {seg.delta >= 0 ? '+' : ''}
                        {seg.delta.toFixed(3)} s
                      </td>
                      <td>
                        {seg.speedDelta >= 0 ? '+' : ''}
                        {seg.speedDelta.toFixed(1)} m/s
                      </td>
                      <td>
                        {seg.ayDelta >= 0 ? '+' : ''}
                        {seg.ayDelta.toFixed(2)} g
                      </td>
                      <td>
                        {seg.steerDelta >= 0 ? '+' : ''}
                        {toDeg(seg.steerDelta).toFixed(1)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="panel-note" style={{ borderTop: 'none' }}>
                Pick two laps above.
              </div>
            )}
            <div className="panel-note">
              {comparison && biggestSegments(comparison, 1)[0]
                ? describeSegment(biggestSegments(comparison, 1)[0])
                : ''}
              <br />
              <br />
              Deliberately cautious about causes. Telemetry can say a corner was slower and
              that more lock was used through it. It <em>cannot</em> say the car understeered
              — that is a different claim, and Ch 11's discipline about confounders applies to
              reading data as much as to running a test.
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

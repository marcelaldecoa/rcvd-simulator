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
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)

  const [config, setConfig] = useState<OverlayConfig | null>(null)
  const [state, setState] = useState<TelemetryState | null>(null)
  const [source, setSource] = useState<'none' | 'live' | 'synthetic' | 'file'>('none')
  const [file, setFile] = useState<string | null>(null)
  const [samples, setSamples] = useState<TelemetrySample[]>([])
  const [fit, setFit] = useState<Identification | null>(null)

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
        // A file source has the whole session at once, so it can do the work
        // the overlay cannot afford: fit the car's actual understeer gradient.
        const all = await api.telemetrySamples()
        setSamples(all)
        setFit(identifyUndersteerGradient(all, { wheelbase: v.L }))
        return
      }
      setSource(kind)
      setSamples([])
      setFit(null)
      setState(await api.selectSource(kind))
    },
    [api, v.L]
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
    </div>
  )
}

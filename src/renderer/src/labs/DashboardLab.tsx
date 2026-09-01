/**
 * The session dashboard.
 *
 * The engineer's page: what the car did, where the time is, and a way through
 * to the theory behind each number. Everything on it is a measurement of YOUR
 * session rather than a model output, and every widget links to the lab that
 * lets you change something and see what happens.
 *
 * Two things it deliberately does not claim:
 *
 *   It does not show an optimal line. That needs the track boundaries and a
 *   minimum-time solve, and the simulator publishes neither. "Grip left on the
 *   table" is the honest form of the same question and comes straight out of
 *   Ch 9's friction envelope.
 *
 *   It does not tell you the car understeered because the driver said so. It
 *   reports the slip-angle difference, which is Ch 5's definition, and where
 *   that difference lived on the circuit.
 */

import { useEffect, useMemo, useState } from 'react'
import { Panel, Readout, Readouts } from '../components/ui'
import { BalanceBar, Bar, Widget } from '../components/Widget'
import { Coach } from '../components/Coach'
import { useTelemetrySource } from '../lib/telemetry'
import { useGarage, rearTireParams } from '../store/garage'
import { derive } from '@core/vehicle/params.js'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { analyseSession, trackPath, type SessionSummary } from '@telemetry/dashboard.js'
import { buildDebrief } from '@telemetry/coach.js'
import { splitLaps, type Lap } from '@telemetry/laps.js'
import { toDeg } from '@core/util/numeric.js'
import type { GGOptions } from '@core/performance/gg.js'

const fmtTime = (s: number | null): string => {
  if (s === null || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return m > 0 ? `${m}:${rest.toFixed(3).padStart(6, '0')}` : rest.toFixed(3)
}

export function DashboardLab(): React.JSX.Element {
  const { api, state, source, file, samples, loading, choose, stop } = useTelemetrySource()

  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const aero = useGarage((s) => s.aero)
  const powertrain = useGarage((s) => s.powertrain)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)

  const v = derive(vehicle)

  const gg: GGOptions = useMemo(
    () => ({
      vehicle,
      chassis,
      tireFront: new MagicFormulaTire(tire),
      tireRear: new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale)),
      aero,
      powertrain
    }),
    [vehicle, chassis, tire, rearTireScale, rearGripScale, aero, powertrain]
  )

  const modelPeaks = useMemo(() => {
    const f = new MagicFormulaTire(tire)
    const r = new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale))
    return { front: f.peakFy(v.wf / 2).at, rear: r.peakFy(v.wr / 2).at }
  }, [tire, rearTireScale, rearGripScale, v.wf, v.wr])

  const [summary, setSummary] = useState<SessionSummary | null>(null)

  useEffect(() => {
    if (samples.length < 50) {
      setSummary(null)
      return
    }
    setSummary(
      analyseSession(samples, {
        geometry: { a: vehicle.a, b: vehicle.b, frontWeightFraction: v.frontWeightFraction },
        limits: { modelPeakFront: modelPeaks.front, modelPeakRear: modelPeaks.rear },
        gg,
        sectors: 12
      })
    )
  }, [samples, vehicle.a, vehicle.b, v.frontWeightFraction, modelPeaks, gg])

  /** What the coach would be sent. Built here so the page can show it. */
  const brief = useMemo(
    () =>
      summary && summary.usable > 0
        ? buildDebrief(summary, {
            garageCar: vehicle.name,
            trackName: undefined,
            carName: undefined
          })
        : null,
    [summary, vehicle.name]
  )

  const laps: Lap[] = useMemo(() => (samples.length ? splitLaps(samples) : []), [samples])
  const complete = laps.filter((l) => l.complete && l.time !== null)

  /** The best lap's path, if the source publishes a heading. */
  const shape = useMemo(() => {
    if (!complete.length) return null
    const best = complete.reduce((a, b) => ((a.time as number) < (b.time as number) ? a : b))
    return trackPath(best.samples)
  }, [complete])

  if (!api) {
    return (
      <div className="lab lab-wide">
        <div className="empty">
          <h3>The dashboard needs the desktop app</h3>
          <div>
            It reads a live iRacing session or a <code>.ibt</code> file through the Electron
            shell, so this page is inert in a browser. Run <code>npm run dev</code>.
          </div>
        </div>
      </div>
    )
  }

  const enough = summary !== null && summary.usable > 0

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Everything here is measured from <strong>your</strong> session. Each widget names the
        chapter it comes from and opens the lab that lets you do something about it — which is
        the whole point: a number off a trace is inert until you can go and turn the knob that
        governs it.
      </div>

      <Panel
        title="Session"
        reference="source"
        note={
          <>
            {state?.status.detail ?? 'no source selected'}
            {file && <> · {file}</>}
            {loading && <> · reading…</>}
          </>
        }
      >
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button
            className={`btn${source === 'live' ? ' active' : ''}`}
            onClick={() => void choose('live')}
          >
            Live iRacing
          </button>
          <button
            className={`btn${source === 'file' ? ' active' : ''}`}
            onClick={() => void choose('file')}
          >
            Open .ibt…
          </button>
          <button
            className={`btn${source === 'synthetic' ? ' active' : ''}`}
            onClick={() => void choose('synthetic')}
          >
            Synthetic
          </button>
          <button className="btn" onClick={() => void stop()}>
            Stop
          </button>
        </div>
        <Readouts>
          <Readout label="Laps" value={String(complete.length)} />
          <Readout
            label="Best lap"
            value={fmtTime(complete.length ? Math.min(...complete.map((l) => l.time as number)) : null)}
          />
          <Readout label="Samples" value={samples.length.toLocaleString()} />
          <Readout
            label="Usable"
            value={summary ? summary.usable.toLocaleString() : '0'}
            tone={enough ? 'ok' : 'warn'}
          />
        </Readouts>
      </Panel>

      {!enough ? (
        <div className="empty">
          <h3>Nothing to read yet</h3>
          <div>
            Choose a source above. A live session fills in as you drive; a <code>.ibt</code> file
            is analysed the moment it loads. Below about 11 km/h nothing is measured at all —
            slip angles need road speed — so a session spent in the pit box will show zero
            usable samples even though it has plenty of raw ones.
          </div>
        </div>
      ) : (
        <div className="dash-grid">
          <Widget
            title="Balance, over the whole session"
            reference="Ch 5 §4"
            lab="steady"
            note={
              <>
                The share of cornering time each end spent giving up first, from the difference
                of the two slip angles. This is the <em>limit</em> balance, not the linear
                understeer gradient — Ch 5 is explicit that those are different numbers and can
                move in opposite directions.
              </>
            }
          >
            <BalanceBar
              understeer={summary.balance.understeer}
              neutral={summary.balance.neutral}
              oversteer={summary.balance.oversteer}
            />
            <div style={{ marginTop: 12 }}>
              <Bar
                value={summary.frontLimited}
                colour="var(--accent)"
                label="front axle nearer its own peak"
                caption={`${Math.round(summary.frontLimited * 100)}% of cornering`}
              />
            </div>
          </Widget>

          <Widget
            title="Grip used"
            reference="Ch 9 §2"
            lab="gg"
            note={
              <>
                How far out toward the friction envelope you actually drove, measured radially so
                a straight-line braking point counts as using the envelope. The envelope comes
                from the garage car, so this is only as good as the match between it and the car
                you drove — <strong>identify the car first</strong> if you have not.
              </>
            }
          >
            <Bar
              value={summary.gripUsed}
              colour={summary.gripUsed > 0.9 ? 'var(--ok)' : 'var(--accent)'}
              label="mean reach into the envelope"
              caption={`${(summary.gripUsed * 100).toFixed(0)}%`}
            />
            <Bar
              value={summary.atLimit}
              colour="var(--warn, #ffcc55)"
              label="cornering within 5% of the boundary"
              caption={`${(summary.atLimit * 100).toFixed(0)}%`}
            />
            {summary.envelopeSuspect && (
              <div
                className="panel-note"
                style={{ padding: '6px 0 0', color: 'var(--warn, #ffcc55)' }}
              >
                {summary.exceededEnvelope ? (
                  <>
                    <strong>Over 100% in places.</strong> Nobody exceeds their own tyres, so the
                    garage car is more conservative than the one you drove and the envelope is
                    drawn too small.
                  </>
                ) : (
                  <>
                    <strong>Implausibly low.</strong> Nobody drives at a fifth of their car, so
                    the garage car almost certainly has more grip than the one you drove and the
                    envelope is drawn too big.
                  </>
                )}{' '}
                Until it is calibrated, treat grip and the time figures as a{' '}
                <em>ranking</em> of your corners against each other, not a measurement. Open a
                session file and use <strong>This car, identified</strong> to fix it.
              </div>
            )}
          </Widget>

          <Widget
            title="Where the grip is going unused"
            reference="Ch 9 · Ch 11"
            lab="pair"
            labText="pair analysis"
            note={
              <>
                Ranked by time notionally available, from the shortfall in grip used. Cornering
                time goes roughly as 1/√(a<sub>y</sub>), so this ranks stretches honestly — it is
                not a lap-time prediction, and it says nothing about the line you took.
                {summary.envelopeSuspect && (
                  <>
                    {' '}
                    <strong style={{ color: 'var(--warn, #ffcc55)' }}>
                      The envelope does not match this car
                    </strong>
                    , so the seconds are inflated and only their <em>order</em> means anything.
                  </>
                )}
              </>
            }
          >
            <table className="sector-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Grip</th>
                  <th>Balance</th>
                  <th>Avail.</th>
                </tr>
              </thead>
              <tbody>
                {summary.worst.slice(0, 6).map((s) => {
                  const dominant =
                    s.balance.samples === 0
                      ? '—'
                      : s.balance.understeer >= s.balance.oversteer &&
                          s.balance.understeer >= s.balance.neutral
                        ? 'under'
                        : s.balance.oversteer >= s.balance.neutral
                          ? 'over'
                          : 'neutral'
                  return (
                    <tr key={s.index}>
                      <td>
                        {(s.from * 100).toFixed(0)}–{(s.to * 100).toFixed(0)}%
                      </td>
                      <td>{s.gripUsed > 0 ? `${(s.gripUsed * 100).toFixed(0)}%` : '—'}</td>
                      <td
                        style={{
                          color:
                            dominant === 'under'
                              ? 'var(--accent)'
                              : dominant === 'over'
                                ? 'var(--danger)'
                                : 'var(--text-dim)'
                        }}
                      >
                        {dominant}
                      </td>
                      <td>{s.timeAvailable > 0 ? `${s.timeAvailable.toFixed(2)} s` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Widget>

          <Widget
            title="Tyre limits, as observed"
            reference="Ch 2 · Ch 14"
            lab="tireData"
            labText="tyre data"
            note={
              <>
                The overlay starts from the garage tyre's peak slip angle and switches to what it
                observes once you have driven past a peak at that axle — and it requires evidence
                on <em>both sides</em> of a candidate peak, because the highest angle you happened
                to reach is not a peak.
              </>
            }
          >
            <Readouts>
              <Readout
                label="Front peak"
                value={toDeg(summary.limits.front.peakSlipAngle).toFixed(2)}
                unit="deg"
                tone={summary.limits.front.source === 'observed' ? 'ok' : 'warn'}
              />
              <Readout
                label="Rear peak"
                value={toDeg(summary.limits.rear.peakSlipAngle).toFixed(2)}
                unit="deg"
                tone={summary.limits.rear.source === 'observed' ? 'ok' : 'warn'}
              />
            </Readouts>
            <div className="panel-note" style={{ padding: '8px 0 0' }}>
              {summary.limits.front.source === 'observed' &&
              summary.limits.rear.source === 'observed'
                ? 'Both ends measured from your driving.'
                : 'Still on the modelled peaks at one or both ends — drive past the limit to calibrate.'}
            </div>
          </Widget>

          <Widget
            title="Track"
            reference="reconstructed"
            lab="telemetry"
            labText="telemetry"
            note={
              !shape || shape.points.length === 0 ? (
                'This source publishes no heading channel, so the shape cannot be reconstructed. Integrating the yaw rate instead would look right for the first corners and then bend the far side of the circuit somewhere it never went, so it is not attempted.'
              ) : shape.closed ? (
                'Integrated from the sim’s absolute heading and your speed, then closed at the line. A shape, not a survey — good enough to tell one corner from another. Colour is the grip used in that sector.'
              ) : (
                <>
                  <strong>Left open.</strong> The lap ends {Math.round(shape.gap)} m from where it
                  started, on a {Math.round(shape.length)} m path — too far to be integration
                  drift. That is an out-lap, a partial lap or a point-to-point run, and dragging
                  the ends together would distort every corner rather than fix anything.
                </>
              )
            }
          >
            {shape && shape.points.length > 0 ? (
              <TrackMap path={shape.points} summary={summary} />
            ) : (
              <NoTrack />
            )}
          </Widget>

          <Widget
            title="Lap times"
            reference="Ch 11"
            lab="telemetry"
            labText="compare laps"
            note="A lap-to-lap delta says where this lap lost to that one; it says nothing about whether either was any good. The grip widget is the absolute question."
          >
            {complete.length < 2 ? (
              <div className="widget-bar-caption">Two complete laps needed to compare.</div>
            ) : (
              <LapTable laps={complete} />
            )}
          </Widget>
        </div>
      )}

      <Coach brief={brief} />
    </div>
  )
}

function NoTrack(): React.JSX.Element {
  return <div className="widget-bar-caption">no heading channel in this source</div>
}

/**
 * The reconstructed lap, coloured by how much of the envelope was used.
 *
 * Colour rather than a second trace: the driver's question at a glance is
 * "which corner is costing me", and a red stretch answers it without needing a
 * legend read mid-thought.
 */
function TrackMap({
  path,
  summary
}: {
  path: { x: number; y: number; distance: number }[]
  summary: SessionSummary
}): React.JSX.Element {
  const xs = path.map((p) => p.x)
  const ys = path.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const pad = 10
  const scale = Math.min((300 - 2 * pad) / w, (220 - 2 * pad) / h)

  // Screen y grows downward; the track's y is northward, so it is flipped.
  const px = (p: { x: number; y: number }): [number, number] => [
    pad + (p.x - minX) * scale,
    220 - pad - (p.y - minY) * scale
  ]

  const gripAt = (distance: number): number => {
    const s = summary.sectors[Math.min(summary.sectors.length - 1, Math.floor(distance * summary.sectors.length))]
    return s?.gripUsed ?? 0
  }
  const colour = (g: number): string =>
    g <= 0 ? 'var(--text-faint)' : g > 0.92 ? '#6ee787' : g > 0.8 ? '#ffcc55' : '#ff6b6b'

  // One polyline per sector, so each can carry its own colour.
  const segments: { d: string; colour: string }[] = []
  let current: string[] = []
  let currentSector = -1
  for (const p of path) {
    const sector = Math.floor(p.distance * summary.sectors.length)
    const [x, y] = px(p)
    if (sector !== currentSector) {
      if (current.length > 1) {
        segments.push({ d: current.join(' '), colour: colour(gripAt(currentSector / summary.sectors.length)) })
      }
      // Start the new run at the previous point so there is no gap.
      current = current.length ? [current[current.length - 1]] : []
      currentSector = sector
    }
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  if (current.length > 1) {
    segments.push({ d: current.join(' '), colour: colour(gripAt(currentSector / summary.sectors.length)) })
  }

  const [sx, sy] = px(path[0])

  return (
    <svg viewBox="0 0 300 220" style={{ width: '100%', height: 'auto' }}>
      {segments.map((s, i) => (
        <polyline
          key={i}
          points={s.d}
          fill="none"
          stroke={s.colour}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <circle cx={sx} cy={sy} r={4} fill="var(--text)" />
      <text x={sx + 7} y={sy + 3} fontSize={9} fill="var(--text-faint)">
        start
      </text>
    </svg>
  )
}

function LapTable({ laps }: { laps: Lap[] }): React.JSX.Element {
  const best = laps.reduce((a, b) => ((a.time as number) < (b.time as number) ? a : b))
  return (
    <table className="sector-table">
      <thead>
        <tr>
          <th>Lap</th>
          <th>Time</th>
          <th>Δ best</th>
          <th>Peak Ay</th>
        </tr>
      </thead>
      <tbody>
        {laps.map((l) => {
          const delta = (l.time as number) - (best.time as number)
          return (
            <tr key={l.number}>
              <td>{l.number}</td>
              <td>{fmtTime(l.time)}</td>
              <td style={{ color: delta === 0 ? 'var(--ok)' : 'var(--text-dim)' }}>
                {delta === 0 ? 'best' : `+${delta.toFixed(3)}`}
              </td>
              <td>{l.maxAy.toFixed(2)} g</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

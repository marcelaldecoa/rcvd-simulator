/**
 * Start here -- how a car corners.
 *
 * The front door of the app. Everything else plots abstractions; this shows the
 * car itself and builds the one idea the whole subject rests on:
 *
 *   a tyre makes lateral force ONLY by slipping,
 *   and understeer/oversteer is just which axle is slipping more.
 *
 * Three controls, one picture, a plain-English verdict, and guided experiments.
 * No equations until the learner asks for them.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { CarDiagram, describeBalance } from '../components/CarDiagram'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { Panel, Readout, Readouts, Slider } from '../components/ui'
import { Chart, type Series } from '../components/Chart'
import { rearTireParams, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { derive } from '@core/vehicle/params.js'
import { axleLimits, nonlinearTrim } from '@core/vehicle/steadyState.js'
import { linspace, toDeg, toRad } from '@core/util/numeric.js'

export function CorneringLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const setVehicle = useGarage((s) => s.setVehicle)
  const tire = useGarage((s) => s.tire)
  const rearScale = useGarage((s) => s.rearTireScale)
  const rearGrip = useGarage((s) => s.rearGripScale)
  const setRearGrip = useGarage((s) => s.setRearGripScale)
  const speed = useGarage((s) => s.speed)
  const setSpeed = useGarage((s) => s.setSpeed)

  /** Cornering effort as a fraction of the car's own limit. */
  const [effort, setEffort] = useState(0.6)
  const [autoScale, setAutoScale] = useState(true)
  const [manualExag, setManualExag] = useState(6)
  const [playing, setPlaying] = useState(false)

  const tireFront = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireRear = useMemo(
    () => new MagicFormulaTire(rearTireParams(tire, rearScale, rearGrip)),
    [tire, rearScale, rearGrip]
  )

  const d = derive(vehicle)
  const limits = useMemo(
    () => axleLimits(vehicle, tireFront, tireRear),
    [vehicle, tireFront, tireRear]
  )
  const ay = effort * limits.limitAy
  const trim = useMemo(
    () => nonlinearTrim(vehicle, tireFront, tireRear, speed, ay),
    [vehicle, tireFront, tireRear, speed, ay]
  )

  /**
   * Auto exaggeration is anchored to the slip angles AT THE LIMIT, not at the
   * current effort. Scaling to the instantaneous angles would make the drawing
   * rescale continuously as the corner builds, so nothing would appear to grow
   * -- which is exactly what the picture exists to show.
   */
  const exaggeration = useMemo(() => {
    if (!autoScale) return manualExag
    const atLimit = nonlinearTrim(vehicle, tireFront, tireRear, speed, limits.limitAy)
    const biggest = Math.max(toDeg(atLimit.alphaF), toDeg(atLimit.alphaR), 0.3)
    return Math.min(Math.max(24 / biggest, 1), 30)
  }, [autoScale, manualExag, vehicle, tireFront, tireRear, speed, limits.limitAy])

  // Sweep the corner so the learner watches the slip angles grow and sees
  // which axle runs out first, rather than having to infer it.
  const raf = useRef<number>(0)
  useEffect(() => {
    if (!playing) return
    let t = 0
    const tick = (): void => {
      t += 0.012
      setEffort(0.06 + 0.94 * (0.5 - 0.5 * Math.cos(t)))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing])

  const balance = describeBalance(
    trim.alphaF,
    trim.alphaR,
    trim.beta,
    trim.usageFront,
    trim.usageRear
  )

  // Axle characteristics, normalised to g -- the Ch 7 diagram, but introduced
  // here because it is the clearest possible picture of "which axle gives up".
  const axleCurves: Series[] = useMemo(() => {
    const { wf, wr } = derive(vehicle)
    const alphas = linspace(0, toRad(12), 90)
    return [
      {
        name: 'Front axle',
        color: '#5aa9ff',
        points: alphas.map((al) => ({
          x: toDeg(al),
          y: (2 * tireFront.fy(al, wf / 2)) / wf
        }))
      },
      {
        name: 'Rear axle',
        color: '#ff9f4d',
        points: alphas.map((al) => ({
          x: toDeg(al),
          y: (2 * tireRear.fy(al, wr / 2)) / wr
        }))
      }
    ]
  }, [vehicle, tireFront, tireRear])

  const experiments: Experiment[] = [
    {
      title: 'Why does a tyre need to slip at all?',
      action: 'Drag "How hard you are cornering" down to zero, then back up slowly.',
      predict: 'What happens to the two shaded angles, and to the force arrows?',
      result: (
        <>
          At zero cornering the shaded angles vanish and so do the force arrows. A tyre
          makes lateral force <strong>only</strong> by running at a slip angle —
          by pointing slightly away from where it is actually travelling. More
          corner means more slip means more force, until the tyre runs out.
          That is the entire mechanism by which a car changes direction.
        </>
      )
    },
    {
      title: 'Make the car understeer',
      action: 'Give the rear more grip than the front — slide "Rear grip vs front" right.',
      predict: 'Which shaded angle grows? Which end runs out of grip first?',
      result: (
        <>
          The <strong>front</strong> angle becomes the larger one. The front now
          needs more slip angle than the rear to hold the same corner, so you must
          add lock beyond the geometric angle — and that extra lock <em>is</em> the
          understeer. The front grip bar fills first, so at the limit the car runs
          wide. Notice you never touched the front of the car.
        </>
      ),
      run: () => setRearGrip(1.3),
      reset: () => setRearGrip(1.12)
    },
    {
      title: 'Make the car oversteer',
      action: 'Now take grip away from the rear instead.',
      predict: 'Which shaded angle grows now? What happens to the steering angle?',
      result: (
        <>
          The rear angle overtakes the front. The car rotates more than you asked
          for, so the steer angle needed <em>falls</em> — and if you push further
          it goes negative, which is opposite lock. The rear grip bar now saturates
          first, so the car spins rather than pushes. Notice nothing about the car
          changed except which end has more grip.
        </>
      ),
      run: () => setRearGrip(0.85),
      reset: () => setRearGrip(1.12)
    },
    {
      title: 'Watch the nose swing into the corner',
      action:
        'Set cornering effort to about half, then sweep speed from 10 m/s up to 70 m/s.',
      predict: 'Which way does the teal arrow (where the car is actually going) move?',
      result: (
        <>
          At low speed the nose points <strong>outside</strong> the corner. Above
          the <em>tangent speed</em> it points <strong>into</strong> it — the
          attitude of a car being driven quickly. Nothing about the car changed;
          only the speed did. The rear axle needs a fixed slip angle to make its
          force, and as the corner gets faster and wider that slip angle comes to
          exceed the geometric angle b/R.
        </>
      )
    },
    {
      title: 'Find the limit',
      action: 'Press Play and watch one full corner build and release.',
      predict: 'Which grip bar reaches the top first, and what does the car do there?',
      result: (
        <>
          The bar that fills first is the axle that gives up first, and it decides
          whether the car pushes or spins. This is the single most useful thing to
          know about a car, and it is set by how the grip is split front-to-rear —
          which is exactly what tyres, springs, bars and aerodynamics are all
          adjusting.
        </>
      )
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        A tyre generates lateral force <strong>only by slipping</strong> — by pointing
        slightly away from the direction it is actually travelling. Everything else in
        vehicle dynamics is a consequence. Below, the shaded angle at each axle{' '}
        <strong>is</strong> that slip angle.
      </div>

      <div className="stage">
        <Panel
          title="The car in a steady corner"
          reference="Ch 5"
          right={
            <button
              className={`btn${playing ? ' active' : ''}`}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? '⏸ Pause' : '▶ Play a corner'}
            </button>
          }
        >
          <CarDiagram
            a={vehicle.a}
            b={vehicle.b}
            steer={trim.steer}
            alphaF={trim.alphaF}
            alphaR={trim.alphaR}
            beta={trim.beta}
            radius={trim.radius}
            fyFront={trim.fyFront}
            fyRear={trim.fyRear}
            forceScale={Math.max(limits.capacityFront, limits.capacityRear)}
            exaggeration={exaggeration}
            usageFront={trim.usageFront}
            usageRear={trim.usageRear}
          />
          <div style={{ padding: '0 12px 12px' }}>
            <Verdict headline={balance.verdict} tone={balance.tone}>
              {balance.detail}
              <div style={{ marginTop: 6, color: 'var(--text-dim)' }}>{balance.attitude}</div>
            </Verdict>
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Your three controls">
            <Slider
              label="How hard you are cornering"
              unit="of the limit"
              value={effort}
              min={0}
              max={1}
              step={0.005}
              display={`${(effort * 100).toFixed(0)}%`}
              onChange={(v) => {
                setPlaying(false)
                setEffort(v)
              }}
            />
            <Slider
              label="Speed"
              unit="km/h"
              value={speed}
              min={8}
              max={75}
              step={0.5}
              display={(speed * 3.6).toFixed(0)}
              onChange={setSpeed}
            />
            <Slider
              label="Rear grip vs front"
              unit="×"
              value={rearGrip}
              min={0.75}
              max={1.35}
              step={0.005}
              onChange={setRearGrip}
            />
            <div style={{ borderTop: '1px solid var(--border-soft)', margin: '12px 0 10px' }} />
            <Slider
              label="Weight on the front axle"
              unit="%"
              value={d.frontWeightFraction}
              min={0.35}
              max={0.65}
              step={0.005}
              display={(d.frontWeightFraction * 100).toFixed(1)}
              onChange={(f) => setVehicle({ a: d.L * (1 - f), b: d.L * f })}
            />
            <div className="field-row" style={{ marginBottom: 6 }}>
              <span className="field-label">Angle exaggeration (drawing only)</span>
              <span className="field-value">×{exaggeration.toFixed(1)}</span>
            </div>
            <div className="btn-row">
              <button
                className={`btn${autoScale ? ' active' : ''}`}
                onClick={() => setAutoScale(true)}
              >
                Auto
              </button>
              <button
                className={`btn${!autoScale ? ' active' : ''}`}
                onClick={() => {
                  setManualExag(Math.round(exaggeration))
                  setAutoScale(false)
                }}
              >
                Manual
              </button>
            </div>
            {!autoScale && (
              <div style={{ marginTop: 8 }}>
                <Slider
                  label="Factor"
                  unit="×"
                  value={manualExag}
                  min={1}
                  max={30}
                  step={0.5}
                  digits={1}
                  onChange={setManualExag}
                />
              </div>
            )}
          </Panel>

          <Panel title="What the car is doing">
            <Readouts>
              <Readout
                label="Lateral acceleration"
                value={ay.toFixed(2)}
                unit="g"
                tone="accent"
              />
              <Readout label="Limit" value={limits.limitAy.toFixed(2)} unit="g" />
              <Readout
                label="Front slip angle"
                value={toDeg(trim.alphaF).toFixed(2)}
                unit="deg"
                tone="front"
              />
              <Readout
                label="Rear slip angle"
                value={toDeg(trim.alphaR).toFixed(2)}
                unit="deg"
                tone="rear"
              />
              <Readout
                label="Front grip used"
                value={(trim.usageFront * 100).toFixed(0)}
                unit="%"
                tone={trim.usageFront > 0.95 ? 'danger' : 'front'}
              />
              <Readout
                label="Rear grip used"
                value={(trim.usageRear * 100).toFixed(0)}
                unit="%"
                tone={trim.usageRear > 0.95 ? 'danger' : 'rear'}
              />
              <Readout
                label="Steering (at the wheel)"
                value={toDeg(trim.steer * vehicle.steeringRatio).toFixed(0)}
                unit="deg"
              />
              <Readout
                label="Corner radius"
                value={trim.radius > 900 ? '—' : trim.radius.toFixed(0)}
                unit="m"
              />
            </Readouts>
          </Panel>

          <Panel
            title="Which axle gives up first?"
            reference="Ch 7 §3"
            note={
              <>
                Each curve is one axle's force divided by the weight it carries, so
                both are in g and can be compared directly. <strong>The curve that
                peaks lower is the limiting axle.</strong> The dot shows where each
                axle is right now.
              </>
            }
          >
            <Chart
              series={axleCurves}
              height={190}
              xLabel="Slip angle (deg)"
              yLabel="Axle force ÷ its weight (g)"
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(1)}
              hRules={[{ value: ay, label: 'now', color: '#4dd6c1' }]}
              markers={[
                { x: toDeg(trim.alphaF), y: ay, color: '#5aa9ff' },
                { x: toDeg(trim.alphaR), y: ay, color: '#ff9f4d' }
              ]}
            />
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Reading the picture">
          <Explain
            seeing={
              <>
                The car in a steady left-hand corner, seen from above. At each axle
                the <strong>dashed line</strong> is where the wheel is pointing and
                the <strong>solid arrow</strong> is where it is actually travelling.
                The angle between them is the slip angle, shaded. The thick arrow is
                the lateral force that slip angle produces.
              </>
            }
            look={
              <>
                Compare the two shaded angles. <strong>Front bigger than rear is
                understeer</strong>; rear bigger than front is oversteer. Then watch
                the two grip bars beside the car: the one that fills first is the end
                that gives up first.
              </>
            }
            matters={
              <>
                Every setup change a race engineer makes — tyre sizes and pressures,
                springs, anti-roll bars, wing angles — is an attempt to move those two
                angles relative to each other. Once you can see them, the rest of the
                subject is detail.
              </>
            }
          />
          <div className="warn-box" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--bg-input)' }}>
            Slip angles on a real car are only a few degrees, which would be invisible
            at true scale. Every angle here is drawn <strong>×{exaggeration.toFixed(1)}</strong>.
            Because they are all multiplied by the same factor the construction stays
            consistent — the angles still add up exactly as the equations say.
          </div>
        </Panel>
      </div>
    </div>
  )
}

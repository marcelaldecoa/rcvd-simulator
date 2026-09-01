/**
 * Changing conditions.
 *
 * The rest of the app shows you a car. This shows you what happens to it while
 * you drive: fuel burning off, tyres wearing and heating, a surface whose grip
 * moves. Three views, answering three different questions:
 *
 *   Compare   -- what changed, against a baseline you froze. Ch 11's A-B-A
 *                protocol: change one thing, hold everything else, read the
 *                difference rather than the absolute number.
 *   Stint     -- how the car drifts lap by lap when everything moves at once.
 *   What matters -- of all of it, which condition actually moves the needle.
 *
 * Two balance numbers are shown throughout, deliberately. The understeer
 * gradient is balance in the linear range; limit balance is which end gives up
 * first. They are different quantities and can move in opposite directions --
 * worn tyres do exactly that -- and conflating them is a good way to chase the
 * wrong setup change.
 */

import { useMemo, useState } from 'react'
import { CarDiagram, describeBalance } from '../components/CarDiagram'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { nonlinearTrim } from '@core/vehicle/steadyState.js'
import { toDeg } from '@core/util/numeric.js'
import {
  applyConditions,
  CONDITION_PRESETS,
  DEFAULT_STINT,
  DEFAULT_TUNING,
  metricsFor,
  NOMINAL_CONDITIONS,
  sensitivity,
  stintSweep,
  type ConditionInputs,
  type Conditions,
  type MetricKey
} from '@core/conditions/index.js'

type View = 'compare' | 'stint' | 'matters'

const METRIC_LABELS: Record<MetricKey, string> = {
  understeerDeg: 'Understeer gradient (deg/g)',
  limitBalance: 'Limit balance (g in hand at the rear)',
  limitAy: 'Limit lateral acceleration (g)'
}

export function ConditionsLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)
  const speed = useGarage((s) => s.speed)
  const tank = useGarage((s) => s.tank)
  const chassis = useGarage((s) => s.chassis)

  const [view, setView] = useState<View>('compare')
  const [conditions, setConditions] = useState<Conditions>({
    ...NOMINAL_CONDITIONS,
    fuelMass: tank.capacity * 0.5
  })
  const [baseline, setBaseline] = useState<Conditions>({
    ...NOMINAL_CONDITIONS,
    fuelMass: tank.capacity * 0.5
  })
  const [metric, setMetric] = useState<MetricKey>('limitBalance')

  const inputs: ConditionInputs = useMemo(
    () => ({
      dryVehicle: vehicle,
      tire,
      rearTireScale,
      rearGripScale,
      tank,
      chassis
    }),
    [vehicle, tire, rearTireScale, rearGripScale, tank, chassis]
  )

  const set = (patch: Partial<Conditions>): void =>
    setConditions((c) => ({ ...c, ...patch }))

  const applied = useMemo(() => applyConditions(inputs, conditions), [inputs, conditions])
  const appliedBase = useMemo(() => applyConditions(inputs, baseline), [inputs, baseline])
  const now = useMemo(() => metricsFor(applied, chassis), [applied, chassis])
  const was = useMemo(() => metricsFor(appliedBase, chassis), [appliedBase, chassis])

  const trim = useMemo(() => {
    const front = new MagicFormulaTire(applied.tireFront)
    const rear = new MagicFormulaTire(applied.tireRear)
    return nonlinearTrim(applied.vehicle, front, rear, speed, now.limitAy * 0.85)
  }, [applied, speed, now.limitAy])

  const verdict = describeBalance(
    trim.alphaF,
    trim.alphaR,
    trim.beta,
    trim.usageFront,
    trim.usageRear
  )

  // --- stint ---------------------------------------------------------------
  const stint = useMemo(() => {
    const sweep = stintSweep(DEFAULT_STINT, tank)
    return sweep.map((p) => ({ ...p, m: metricsFor(applyConditions(inputs, p.conditions), chassis) }))
  }, [inputs, tank, chassis])

  const stintGrip: Series[] = useMemo(
    () => [
      {
        name: 'Limit lateral acceleration',
        color: '#4dd6c1',
        points: stint.map((p) => ({ x: p.lap, y: p.m.limitAy }))
      }
    ],
    [stint]
  )

  const stintBalance: Series[] = useMemo(
    () => [
      {
        name: 'Limit balance (rear grip in hand)',
        color: '#ffcc55',
        points: stint.map((p) => ({ x: p.lap, y: p.m.limitBalance }))
      }
    ],
    [stint]
  )

  const stintInputs: Series[] = useMemo(
    () => [
      {
        name: 'Fuel (kg)',
        color: '#5aa9ff',
        points: stint.map((p) => ({ x: p.lap, y: p.fuelMass }))
      },
      {
        name: 'Rear wear (×50)',
        color: '#ff9f4d',
        points: stint.map((p) => ({ x: p.lap, y: p.wearRear * 50 }))
      },
      {
        name: 'Rear temp (°C ÷ 2)',
        color: '#ff6b6b',
        points: stint.map((p) => ({ x: p.lap, y: p.conditions.tempRear / 2 }))
      }
    ],
    [stint]
  )

  const bestLap = stint.reduce((a, b) => (b.m.limitAy > a.m.limitAy ? b : a), stint[0])

  // --- sensitivity ---------------------------------------------------------
  const rows = useMemo(
    () => sensitivity(inputs, conditions, metric),
    [inputs, conditions, metric]
  )
  const widest = Math.max(...rows.map((r) => Math.abs(r.delta)), 1e-9)

  // --- deltas --------------------------------------------------------------
  const delta = (a: number, b: number): string =>
    `${a - b >= 0 ? '+' : ''}${(a - b).toFixed(3)}`
  const tone = (d: number, goodPositive = true): 'ok' | 'danger' | undefined => {
    if (Math.abs(d) < 1e-4) return undefined
    return (d > 0) === goodPositive ? 'ok' : 'danger'
  }

  // Empty vs full, for the fuel experiment's write-up.
  const fuelSpan = useMemo(() => {
    const at = (fuelMass: number, ch = chassis): ReturnType<typeof metricsFor> =>
      metricsFor(applyConditions(inputs, { ...conditions, fuelMass }), ch)
    const empty = at(0)
    const full = at(tank.capacity)
    // The same comparison with the CG on the ground, i.e. no load transfer,
    // so the write-up can quote how much of the effect transfer is supplying.
    const flat = { ...chassis, cgHeight: 0.001 }
    const dFlat = at(0, flat).limitAy - at(tank.capacity, flat).limitAy
    return {
      dLimit: empty.limitAy - full.limitAy,
      dLimitNoTransfer: dFlat,
      dFrontPct: (empty.frontWeightFraction - full.frontWeightFraction) * 100,
      dIzz: full.izz - empty.izz
    }
  }, [inputs, conditions, tank.capacity, chassis])

  const experiments: Experiment[] = [
    {
      title: 'Burn off a tank of fuel — and find a surprise',
      action: 'Freeze the baseline at full fuel, then drag fuel down to nearly empty.',
      predict: 'How much does limit lateral acceleration improve? Guess a number first.',
      result: (
        <>
          <strong>{fuelSpan.dLimit.toFixed(3)} g</strong> across a whole tank — and
          most of that is load transfer. With the CG on the ground the same 60 kg would
          be worth only {fuelSpan.dLimitNoTransfer.toFixed(3)} g, because an axle's
          capacity is 2·μ·Fz while the weight it carries is 2·Fz, so the limit is just{' '}
          <strong>μ at the operating load</strong> and the mass very nearly cancels.
          <br />
          <br />
          What restores it is Ch 18: heavier means more load transfer, and Ch 2's
          capacity loss goes as the <strong>square</strong> of that transfer. Fuel also
          moves weight distribution by {fuelSpan.dFrontPct.toFixed(2)} points and yaw
          inertia by {fuelSpan.dIzz.toFixed(0)} kg·m², which Ch 6 shows changes both yaw
          natural frequency and damping. A car balanced on lap 1 is a different car by
          lap 20.
        </>
      ),
      run: () => {
        setBaseline({ ...conditions, fuelMass: tank.capacity })
        set({ fuelMass: 3 })
      }
    },
    {
      title: 'Wear the rears out',
      action: 'Take rear wear to 90% and leave the fronts fresh.',
      predict: 'Which way does each of the two balance numbers move?',
      result: (
        <>
          They move in <strong>opposite directions</strong>, and that is not a bug.
          Less tread means less squirm, so rear cornering stiffness <em>rises</em> and
          the linear understeer gradient rises with it. But degraded rubber has less
          peak grip, so limit balance falls and the rear now gives up first. The driver
          feels the second one: the car understeers gently at low g and steps out at
          the limit.
        </>
      ),
      run: () => {
        setBaseline({ ...conditions, wearRear: 0 })
        set({ wearRear: 0.9 })
      }
    },
    {
      title: 'Go out on cold tyres',
      action: 'Load the "Out-lap, cold tyres" preset and compare against Optimum.',
      predict: 'How much of the car’s grip is missing on the first lap?',
      result: (
        <>
          A large fraction, and it is nearly all friction rather than balance — cold
          tyres at both ends scale both axles alike. That is why an out-lap feels slow
          but not <em>strange</em>, whereas one end being cold feels alarming. Try
          setting only the rear temperature low and watch the verdict flip.
        </>
      ),
      run: () => {
        setBaseline(CONDITION_PRESETS.find((p) => p.name === 'Optimum')!.conditions(tank))
        setConditions(
          CONDITION_PRESETS.find((p) => p.name === 'Out-lap, cold tyres')!.conditions(tank)
        )
      }
    },
    {
      title: 'Find out what actually matters',
      action: 'Open "What matters" and switch the metric between grip and balance.',
      predict: 'Is the same condition top of both lists?',
      result: (
        <>
          No — and that is the useful part. <strong>Track grip</strong> dominates
          outright lateral acceleration but barely touches balance, because it scales
          both axles alike. Balance is a <em>difference</em>, so it is moved by the
          per-axle effects: one end's wear, temperature or pressure. If the car is
          slow, look at the surface and the tyres as a whole; if it is badly balanced,
          look for something acting on one end only.
        </>
      ),
      run: () => {
        setView('matters')
        setMetric('limitBalance')
      }
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Nothing about a car stays still. Fuel burns off, tyres wear and heat, the
        surface changes. Every model in this app already accounts for it — this page
        just lets you <strong>move the world and watch the car respond</strong>.
      </div>

      <div className="stage">
        <div className="stack">
          <Panel
            title="Conditions"
            reference="Ch 2 §8 · Ch 12"
            right={
              <div className="viewswitch">
                <ButtonRow
                  options={[
                    { value: 'compare', label: 'Compare' },
                    { value: 'stint', label: 'Stint' },
                    { value: 'matters', label: 'What matters' }
                  ]}
                  value={view}
                  onChange={setView}
                />
              </div>
            }
          >
            <div className="btn-row" style={{ marginBottom: 12 }}>
              {CONDITION_PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="btn"
                  title={p.detail}
                  onClick={() => setConditions(p.conditions(tank))}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <Slider
              label="Fuel aboard"
              unit="kg"
              value={conditions.fuelMass}
              min={0}
              max={tank.capacity}
              step={0.5}
              digits={1}
              onChange={(fuelMass) => set({ fuelMass })}
            />
            <Slider
              label="Track grip"
              unit="×"
              value={conditions.trackGrip}
              min={0.5}
              max={1.1}
              step={0.005}
              onChange={(trackGrip) => set({ trackGrip })}
            />

            <div className="cond-pair">
              <Slider
                label="Front wear"
                unit="%"
                value={conditions.wearFront}
                min={0}
                max={1}
                step={0.01}
                display={(conditions.wearFront * 100).toFixed(0)}
                onChange={(wearFront) => set({ wearFront })}
              />
              <Slider
                label="Rear wear"
                unit="%"
                value={conditions.wearRear}
                min={0}
                max={1}
                step={0.01}
                display={(conditions.wearRear * 100).toFixed(0)}
                onChange={(wearRear) => set({ wearRear })}
              />
              <Slider
                label="Front temperature"
                unit="°C"
                value={conditions.tempFront}
                min={20}
                max={150}
                step={1}
                digits={0}
                onChange={(tempFront) => set({ tempFront })}
              />
              <Slider
                label="Rear temperature"
                unit="°C"
                value={conditions.tempRear}
                min={20}
                max={150}
                step={1}
                digits={0}
                onChange={(tempRear) => set({ tempRear })}
              />
              <Slider
                label="Front pressure"
                unit="kPa"
                value={conditions.pressureFront}
                min={110}
                max={240}
                step={1}
                digits={0}
                onChange={(pressureFront) => set({ pressureFront })}
              />
              <Slider
                label="Rear pressure"
                unit="kPa"
                value={conditions.pressureRear}
                min={110}
                max={240}
                step={1}
                digits={0}
                onChange={(pressureRear) => set({ pressureRear })}
              />
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn active" onClick={() => setBaseline(conditions)}>
                Freeze as baseline
              </button>
              <button className="btn" onClick={() => setConditions(baseline)}>
                Back to baseline
              </button>
              <button
                className="btn"
                onClick={() => setConditions({ ...NOMINAL_CONDITIONS, fuelMass: conditions.fuelMass })}
              >
                Reset tyres
              </button>
            </div>

            <div className="model-note">
              <strong>What this model does and does not capture.</strong> Fuel is exact
              statics — mass, CG and yaw inertia. Temperature, pressure and wear are
              engineering parameterisations honouring the <em>direction</em> Ch 2 §8
              gives (peak μ has an optimum temperature window; pressure raises
              stiffness and lowers μ) since the chapter supplies no curves. Optimum
              here is {DEFAULT_TUNING.tempOptimum} °C at{' '}
              {DEFAULT_TUNING.pressureReference} kPa.
              <br />
              <br />
              This is still the <strong>bicycle model</strong>: no load transfer, no
              aerodynamics, no braking or traction. So mass barely moves the lateral
              limit here — an axle's capacity and the weight it carries scale together
              and cancel. Fuel's real effect on lateral grip runs through load
              transfer, which arrives with Ch 7 and Ch 18.
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title={`The car right now, at ${(now.limitAy * 0.85).toFixed(2)} g`}>
            <CarDiagram
              a={applied.vehicle.a}
              b={applied.vehicle.b}
              steer={trim.steer}
              alphaF={trim.alphaF}
              alphaR={trim.alphaR}
              beta={trim.beta}
              radius={trim.radius}
              fyFront={trim.fyFront}
              fyRear={trim.fyRear}
              forceScale={Math.max(trim.limits.capacityFront, trim.limits.capacityRear)}
              exaggeration={Math.min(Math.max(9 / Math.max(toDeg(trim.alphaF), 0.2), 1), 30)}
              usageFront={trim.usageFront}
              usageRear={trim.usageRear}
              height={300}
            />
            <div style={{ padding: '0 12px 12px' }}>
              <Verdict headline={verdict.verdict} tone={verdict.tone}>
                {verdict.detail}
              </Verdict>
            </div>
            <Readouts>
              <Readout label="Limit Ay" value={now.limitAy.toFixed(2)} unit="g" tone="accent" />
              <Readout
                label="Limit balance"
                value={`${now.limitBalance >= 0 ? '+' : ''}${now.limitBalance.toFixed(3)}`}
                unit="g"
                tone={now.limitBalance >= 0 ? 'front' : 'danger'}
              />
              <Readout
                label="Understeer gradient"
                value={`${now.understeerDeg >= 0 ? '+' : ''}${now.understeerDeg.toFixed(3)}`}
                unit="deg/g"
              />
              <Readout label="Gives up first" value={now.limitingAxle} tone={now.limitingAxle === 'rear' ? 'danger' : 'front'} />
              <Readout label="Mass" value={now.mass.toFixed(0)} unit="kg" />
              <Readout
                label="Front weight"
                value={(now.frontWeightFraction * 100).toFixed(1)}
                unit="%"
              />
            </Readouts>
          </Panel>
        </div>
      </div>

      {view === 'compare' && (
        <Panel
          title="What changed"
          reference="Ch 11 — A-B-A"
          note={
            <>
              Freeze a baseline, change one thing, and read the <strong>difference</strong>.
              Ch 11's whole argument about test discipline is that absolute numbers drift
              and differences do not.
            </>
          }
        >
          <table className="data">
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Baseline</th>
                <th>Now</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Limit lateral acceleration (g)</td>
                <td>{was.limitAy.toFixed(3)}</td>
                <td>{now.limitAy.toFixed(3)}</td>
                <td style={{ color: `var(--${tone(now.limitAy - was.limitAy) ?? 'text'})` }}>
                  {delta(now.limitAy, was.limitAy)}
                </td>
              </tr>
              <tr>
                <td>Limit balance — rear grip in hand (g)</td>
                <td>{was.limitBalance.toFixed(3)}</td>
                <td>{now.limitBalance.toFixed(3)}</td>
                <td>{delta(now.limitBalance, was.limitBalance)}</td>
              </tr>
              <tr>
                <td>Understeer gradient (deg/g)</td>
                <td>{was.understeerDeg.toFixed(3)}</td>
                <td>{now.understeerDeg.toFixed(3)}</td>
                <td>{delta(now.understeerDeg, was.understeerDeg)}</td>
              </tr>
              <tr>
                <td>Limiting axle</td>
                <td>{was.limitingAxle}</td>
                <td
                  style={{
                    color:
                      now.limitingAxle === was.limitingAxle ? undefined : 'var(--warn)'
                  }}
                >
                  {now.limitingAxle}
                </td>
                <td>{now.limitingAxle === was.limitingAxle ? '—' : 'flipped'}</td>
              </tr>
              <tr>
                <td>Mass (kg)</td>
                <td>{was.mass.toFixed(1)}</td>
                <td>{now.mass.toFixed(1)}</td>
                <td>{delta(now.mass, was.mass)}</td>
              </tr>
              <tr>
                <td>Front weight fraction (%)</td>
                <td>{(was.frontWeightFraction * 100).toFixed(2)}</td>
                <td>{(now.frontWeightFraction * 100).toFixed(2)}</td>
                <td>{delta(now.frontWeightFraction * 100, was.frontWeightFraction * 100)}</td>
              </tr>
              <tr>
                <td>Yaw inertia (kg·m²)</td>
                <td>{was.izz.toFixed(0)}</td>
                <td>{now.izz.toFixed(0)}</td>
                <td>{delta(now.izz, was.izz)}</td>
              </tr>
              <tr className="total">
                <td>Grip multiplier, front / rear</td>
                <td colSpan={3}>
                  {(applied.gripFront.mu ?? 1).toFixed(3)} / {(applied.gripRear.mu ?? 1).toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      )}

      {view === 'stint' && (
        <>
          <div className="grid2">
            <Panel
              title="Grip through the stint"
              reference={`${DEFAULT_STINT.laps} laps`}
              note={
                <>
                  Two effects fight each other. Fuel burning off and tyres coming up to
                  temperature make the car quicker; wear makes it slower. The peak is in
                  the middle — here around <strong>lap {bestLap.lap}</strong> — not at
                  either end.
                </>
              }
            >
              <Chart
                series={stintGrip}
                height={210}
                xLabel="Lap"
                yLabel="Limit Ay (g)"
                zeroY={false}
                fmtX={(v) => v.toFixed(0)}
                fmtY={(v) => v.toFixed(2)}
                vRules={[{ value: bestLap.lap, label: 'best', color: '#6ee787' }]}
              />
            </Panel>

            <Panel
              title="Balance through the stint"
              note={
                <>
                  Rears wear faster than fronts here, so the rear's grip advantage bleeds
                  away and the car drifts toward oversteer. Where the line crosses zero,
                  the limiting axle changes and the car stops pushing and starts
                  stepping out.
                </>
              }
            >
              <Chart
                series={stintBalance}
                height={210}
                xLabel="Lap"
                yLabel="Rear grip in hand (g)"
                fmtX={(v) => v.toFixed(0)}
                fmtY={(v) => v.toFixed(2)}
                hRules={[{ value: 0, label: 'balance flips here', color: '#ff6b6b' }]}
              />
            </Panel>
          </div>

          <Panel title="What is changing underneath" note="Scaled to share one axis.">
            <Chart
              series={stintInputs}
              height={180}
              xLabel="Lap"
              yLabel="scaled"
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(0)}
            />
          </Panel>
        </>
      )}

      {view === 'matters' && (
        <Panel
          title="What actually matters"
          reference="Ch 9 §6"
          right={
            <ButtonRow
              options={[
                { value: 'limitAy', label: 'Outright grip' },
                { value: 'limitBalance', label: 'Limit balance' },
                { value: 'understeerDeg', label: 'Understeer gradient' }
              ]}
              value={metric}
              onChange={setMetric}
            />
          }
          note={
            <>
              Each bar is how far <strong>{METRIC_LABELS[metric]}</strong> moves across a
              realistic range of that one condition, everything else held at its current
              value. Switch the metric and the ranking reorders — which is the point:
              what makes a car <em>fast</em> and what makes it <em>balanced</em> are not
              the same list. A bar at zero on the grip metric means that condition acts
              only on the axle that is not currently limiting, so it cannot move the
              limit at all until the balance flips.
            </>
          }
        >
          <div className="tornado">
            {rows.map((r) => (
              <div className="tornado-row" key={r.name}>
                <div className="tornado-label">{r.name}</div>
                <div className="tornado-track">
                  <div className="tornado-mid" />
                  <div
                    className="tornado-bar"
                    style={{
                      width: `${(Math.abs(r.delta) / widest) * 50}%`,
                      [r.delta >= 0 ? 'left' : 'right']: '50%',
                      background: r.delta >= 0 ? 'var(--front)' : 'var(--rear)'
                    }}
                  />
                </div>
                <div className="tornado-value">
                  {r.delta >= 0 ? '+' : ''}
                  {r.delta.toFixed(3)}
                </div>
                <div className="tornado-range">{r.range}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Two different balance numbers">
          <Explain
            seeing={
              <>
                <strong>Understeer gradient</strong> is balance in the linear range —
                how much extra lock you need per g, set by the ratio of axle load to
                cornering stiffness. <strong>Limit balance</strong> is how much grip the
                rear axle has in hand over the front: which end gives up first.
              </>
            }
            look={
              <>
                Watch them move independently. A uniform grip change — a wet track,
                a cold surface — moves the <em>limit</em> hard and the gradient barely at
                all. Anything acting on one end only moves both, and wear moves them in{' '}
                <strong>opposite directions</strong>.
              </>
            }
            matters={
              <>
                A driver reporting "it understeers into the corner but snaps on the exit"
                is describing both numbers at once. Chasing one while ignoring the other
                is how setup work goes in circles.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

/**
 * Chapter 7 lab -- steady-state pair analysis.
 *
 * Where the two halves of the course meet. The tyres of Ch 2, at the wheel
 * loads of Ch 18, produce axle characteristics whose peaks decide which end of
 * the car gives up first. And because capacity loss goes as the SQUARE of load
 * transfer while the total transfer is fixed, the only lever is the
 * distribution -- TLLTD.
 *
 * The TLLTD sweep is the centrepiece: it shows balance crossing through neutral
 * while total grip barely moves, which is the precise statement of "bars
 * redistribute, they do not reduce".
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { CarDiagram, describeBalance } from '../components/CarDiagram'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Panel, Readout, Readouts, Slider } from '../components/ui'
import { rearTireParams, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { derive } from '@core/vehicle/params.js'
import { lateralTransfer, wheelLoads } from '@core/vehicle/chassis.js'
import {
  axleCharacteristic,
  pairLimit,
  pairState,
  pairSweep,
  tlltdSweep
} from '@core/vehicle/pairAnalysis.js'
import { toDeg } from '@core/util/numeric.js'

const RADIUS = 60

export function PairAnalysisLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const setChassis = useGarage((s) => s.setChassis)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)
  const setRearGrip = useGarage((s) => s.setRearGripScale)

  const [phase, setPhase] = useState(0) // ax in g

  const tireF = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireR = useMemo(
    () => new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale)),
    [tire, rearTireScale, rearGripScale]
  )

  const d = derive(vehicle)
  const limit = useMemo(
    () => pairLimit(vehicle, chassis, tireF, tireR, phase),
    [vehicle, chassis, tireF, tireR, phase]
  )
  const state = useMemo(
    () => pairState(vehicle, chassis, tireF, tireR, limit.limitAy * 0.92, RADIUS, phase),
    [vehicle, chassis, tireF, tireR, limit.limitAy, phase]
  )
  const tlltdNow = lateralTransfer(vehicle, chassis, 1).tlltd

  const verdict = describeBalance(
    state.alphaF,
    state.alphaR,
    state.beta,
    state.usageFront,
    state.usageRear
  )

  // --- axle characteristics, normalised to g (Ch 7 §3) --------------------
  const axleCurves: Series[] = useMemo(() => {
    const loads = wheelLoads(vehicle, chassis, state.ay, phase)
    const f = axleCharacteristic(tireF, loads.fo, loads.fi, d.wf)
    const r = axleCharacteristic(tireR, loads.ro, loads.ri, d.wr)
    return [
      {
        name: 'Front axle',
        color: '#5aa9ff',
        points: f.map((p) => ({ x: toDeg(p.alpha), y: p.fyPerWeight }))
      },
      {
        name: 'Rear axle',
        color: '#ff9f4d',
        points: r.map((p) => ({ x: toDeg(p.alpha), y: p.fyPerWeight }))
      },
      {
        name: 'Front, outer tyre alone',
        color: '#2b5f8f',
        dashed: true,
        quiet: true,
        points: f.map((p) => ({ x: toDeg(p.alpha), y: p.outer / d.wf }))
      },
      {
        name: 'Front, inner tyre alone',
        color: '#264a66',
        dashed: true,
        quiet: true,
        points: f.map((p) => ({ x: toDeg(p.alpha), y: p.inner / d.wf }))
      }
    ]
  }, [vehicle, chassis, tireF, tireR, state.ay, phase, d.wf, d.wr])

  // --- TLLTD sweep --------------------------------------------------------
  const sweep = useMemo(
    () => tlltdSweep(vehicle, chassis, tireF, tireR, 24),
    [vehicle, chassis, tireF, tireR]
  )

  const tlltdCurves: Series[] = useMemo(
    () => [
      {
        name: 'Limit balance (rear grip in hand)',
        color: '#ffcc55',
        points: sweep.map((s) => ({ x: s.tlltd * 100, y: s.limit.limitBalance }))
      }
    ],
    [sweep]
  )

  const tlltdGrip: Series[] = useMemo(
    () => [
      {
        name: 'Front axle limit',
        color: '#5aa9ff',
        points: sweep.map((s) => ({ x: s.tlltd * 100, y: s.limit.limitAyFront }))
      },
      {
        name: 'Rear axle limit',
        color: '#ff9f4d',
        points: sweep.map((s) => ({ x: s.tlltd * 100, y: s.limit.limitAyRear }))
      },
      {
        name: 'The car (lower of the two)',
        color: '#4dd6c1',
        points: sweep.map((s) => ({ x: s.tlltd * 100, y: s.limit.limitAy }))
      }
    ],
    [sweep]
  )

  const bestTlltd = sweep.reduce((a, b) => (b.limit.limitAy > a.limit.limitAy ? b : a), sweep[0])

  // How much balance the bars can move, against how far from neutral the car
  // currently is. If the second exceeds the first, no bar setting can fix it.
  const barAuthority = useMemo(() => {
    const bal = sweep.map((s) => s.limit.limitBalance)
    const span = Math.max(...bal) - Math.min(...bal)
    return { span, canReachNeutral: Math.min(...bal) < 0 && Math.max(...bal) > 0 }
  }, [sweep])

  // --- skid pad with and without load transfer ---------------------------
  const skidPad: Series[] = useMemo(() => {
    const withTransfer = pairSweep(vehicle, chassis, tireF, tireR, RADIUS, 34, phase)
    const flat = pairSweep(
      vehicle,
      { ...chassis, cgHeight: 0.001 },
      tireF,
      tireR,
      RADIUS,
      34,
      phase
    )
    return [
      {
        name: 'With load transfer (Ch 7)',
        color: '#4dd6c1',
        points: withTransfer.map((p) => ({ x: p.ay, y: toDeg(p.steer) }))
      },
      {
        name: 'No load transfer (Ch 5)',
        color: '#5f6f80',
        dashed: true,
        points: flat.map((p) => ({ x: p.ay, y: toDeg(p.steer) }))
      }
    ]
  }, [vehicle, chassis, tireF, tireR, phase])

  const totalBar = chassis.barRollStiffnessFront + chassis.barRollStiffnessRear

  const experiments: Experiment[] = [
    {
      title: 'Turn a bar and move the balance',
      action: 'Put nearly all the bar on the front, then nearly all on the rear.',
      predict: 'Does total grip change as much as balance does?',
      result: (
        <>
          Balance swings by <strong>{barAuthority.span.toFixed(3)} g</strong> across the
          whole bar range while the car's overall limit barely moves — a percent or two.
          That is the precise statement of{' '}
          <strong>"bars redistribute, they do not reduce"</strong>, and why the bar is
          the canonical <em>orthogonal</em> adjustment: it does one thing, and a tool
          acting on one thing beats a better tool acting on three.
        </>
      ),
      run: () =>
        setChassis({
          barRollStiffnessFront: totalBar * 0.05,
          barRollStiffnessRear: totalBar * 0.95
        }),
      reset: () => setChassis({ barRollStiffnessFront: 27000, barRollStiffnessRear: 12000 })
    },
    {
      title: 'See what load transfer costs you',
      action: 'Compare the two skid-pad curves, then drop the CG toward zero.',
      predict: 'How much lateral acceleration is load transfer taking away?',
      result: (
        <>
          The dashed line is the same car and tyres with the CG on the ground — no
          transfer, so both tyres on each axle work at the same load and neither is
          pushed onto the flat part of its curve. The gap is what load transfer costs,
          and it is entirely the quadratic capacity loss of Ch 2 Exercise 2.6 applied
          twice over.
        </>
      ),
      run: () => setChassis({ cgHeight: 0.15 }),
      reset: () => setChassis({ cgHeight: 0.3 })
    },
    {
      title: 'Brake into the corner and watch the rear let go',
      action: 'Move the corner phase to braking.',
      predict: 'Which axle becomes the limiting one, and why now?',
      result: (
        <>
          Longitudinal transfer unloads the rear at exactly the moment corner entry is
          asking it for lateral force, so the rear axle characteristic collapses and the
          balance swings toward oversteer. Ch 7 §5 calls this the analytical account of
          corner-entry instability — and it is why brake bias belongs on the handling
          sheet, not the braking sheet.
        </>
      ),
      run: () => setPhase(-0.7),
      reset: () => setPhase(0)
    },
    {
      title: 'Discover what a bar CANNOT fix',
      action:
        'Look at whether the balance line ever crosses zero as TLLTD sweeps, then set rear grip back to equal the front and look again.',
      predict: 'Can the bars alone make this car neutral at the limit?',
      result: (
        <>
          {barAuthority.canReachNeutral ? (
            <>
              On this car they can — the balance line crosses zero inside the bar range,
              so there is a bar setting that makes it neutral at the limit.
            </>
          ) : (
            <>
              <strong>Not on this car.</strong> The bars move balance by{' '}
              {barAuthority.span.toFixed(3)} g, but the rear currently has{' '}
              {limit.limitBalance.toFixed(3)} g of grip in hand — so every bar setting
              still leaves it understeering. The balance line never reaches zero.
            </>
          )}
          <br />
          <br />
          That is Ch 12's primary/secondary hierarchy in one picture. A grip difference
          between the axles — tyre compound, size, pressure, temperature, wear — is a{' '}
          <strong>primary</strong> effect, and no amount of bar will undo it. Bars are a{' '}
          <strong>secondary</strong> tool: fine adjustment around a car that is already
          roughly right. Fix the tyres first, then trim with the bar.
        </>
      ),
      run: () => setRearGrip(1.0),
      reset: () => setRearGrip(1.12)
    },
    {
      title: 'Find the TLLTD that makes the car fastest',
      action: 'Read the peak of the teal line on the TLLTD sweep.',
      predict: 'Is the fastest setting the same as the neutral-balance setting?',
      result: (
        <>
          Close, but not identical. The car's limit is the <em>lower</em> of the two
          axle limits, so it peaks where the two curves cross — which is where balance
          is neutral. In practice the fastest setting is usually a little to the
          understeer side of that crossing, because a driver can use a car that pushes
          and cannot use one that snaps. Here the peak is at{' '}
          <strong>{(bestTlltd.tlltd * 100).toFixed(1)}% front</strong>.
        </>
      )
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Real tyres, at real wheel loads. Because capacity loss grows with the{' '}
        <strong>square</strong> of load transfer and the total is fixed, the only lever
        is how you <strong>split</strong> it — which is what every anti-roll bar is for.
      </div>

      <div className="stage">
        <Panel
          title="Which axle gives up first?"
          reference="Ch 7 §3"
          note={
            <>
              Each curve is one axle's total force divided by the weight it carries, so
              both are in g and directly comparable. <strong>The curve that peaks lower
              is the limiting axle.</strong> The faint dashed pair shows the outer and
              inner tyres separately — the outer is doing most of the work, and that
              asymmetry is exactly what costs the axle its capacity.
            </>
          }
        >
          <Chart
            series={axleCurves}
            height={280}
            xLabel="Slip angle (deg)"
            yLabel="Axle force ÷ its weight (g)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(1)}
            hRules={[{ value: state.ay, label: 'now', color: '#4dd6c1' }]}
            markers={[
              { x: toDeg(state.alphaF), y: state.ay, color: '#5aa9ff' },
              { x: toDeg(state.alphaR), y: state.ay, color: '#ff9f4d' }
            ]}
          />
        </Panel>

        <div className="stack">
          <Panel
            title="Corner phase"
            right={
              <ButtonRow
                options={[
                  { value: -0.7, label: 'Braking' },
                  { value: 0, label: 'Mid-corner' },
                  { value: 0.45, label: 'Power' }
                ]}
                value={phase}
                onChange={setPhase}
              />
            }
          >
            <Slider
              label="Longitudinal acceleration"
              unit="g"
              value={phase}
              min={-1.4}
              max={1.0}
              step={0.05}
              display={`${phase >= 0 ? '+' : ''}${phase.toFixed(2)}`}
              onChange={setPhase}
            />
            <Slider
              label="Front anti-roll bar"
              unit="kN·m/rad"
              value={chassis.barRollStiffnessFront}
              min={0}
              max={90000}
              step={500}
              display={(chassis.barRollStiffnessFront / 1000).toFixed(0)}
              onChange={(barRollStiffnessFront) => setChassis({ barRollStiffnessFront })}
            />
            <Slider
              label="Rear anti-roll bar"
              unit="kN·m/rad"
              value={chassis.barRollStiffnessRear}
              min={0}
              max={90000}
              step={500}
              display={(chassis.barRollStiffnessRear / 1000).toFixed(0)}
              onChange={(barRollStiffnessRear) => setChassis({ barRollStiffnessRear })}
            />
            <Readouts>
              <Readout label="TLLTD" value={(tlltdNow * 100).toFixed(1)} unit="% front" tone="accent" />
              <Readout label="Limit Ay" value={limit.limitAy.toFixed(3)} unit="g" />
              <Readout
                label="Limit balance"
                value={`${limit.limitBalance >= 0 ? '+' : ''}${limit.limitBalance.toFixed(3)}`}
                unit="g"
                tone={limit.limitBalance >= 0 ? 'front' : 'danger'}
              />
              <Readout
                label="Gives up first"
                value={limit.limitingAxle}
                tone={limit.limitingAxle === 'rear' ? 'danger' : 'front'}
              />
              <Readout label="Front axle limit" value={limit.limitAyFront.toFixed(3)} unit="g" tone="front" />
              <Readout label="Rear axle limit" value={limit.limitAyRear.toFixed(3)} unit="g" tone="rear" />
            </Readouts>
          </Panel>

          <Panel title={`The car at ${state.ay.toFixed(2)} g`}>
            <CarDiagram
              a={vehicle.a}
              b={vehicle.b}
              track={chassis.trackFront}
              steer={state.steer}
              alphaF={state.alphaF}
              alphaR={state.alphaR}
              beta={state.beta}
              radius={RADIUS}
              fyFront={d.wf * state.ay}
              fyRear={d.wr * state.ay}
              forceScale={Math.max(state.capacityFront, state.capacityRear)}
              exaggeration={Math.min(Math.max(9 / Math.max(toDeg(state.alphaF), 0.2), 1), 30)}
              usageFront={state.usageFront}
              usageRear={state.usageRear}
              height={280}
            />
            <div style={{ padding: '0 12px 12px' }}>
              <Verdict headline={verdict.verdict} tone={verdict.tone}>
                {verdict.detail}
              </Verdict>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Sweeping TLLTD — the master balance parameter"
          reference="Ch 7 §4"
          note={
            <>
              Moving load transfer forward costs the front axle and spares the rear, so
              the two limits cross. Where the balance line crosses zero the car is
              neutral at the limit; either side of it, one end gives up first.
            </>
          }
        >
          <Chart
            series={tlltdGrip}
            height={200}
            xLabel="TLLTD (% front)"
            yLabel="Limit Ay (g)"
            zeroY={false}
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(2)}
            vRules={[{ value: tlltdNow * 100, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
          <Chart
            series={tlltdCurves}
            height={150}
            xLabel="TLLTD (% front)"
            yLabel="Rear grip in hand (g)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(2)}
            hRules={[{ value: 0, label: 'neutral at the limit', color: '#6ee787' }]}
            vRules={[{ value: tlltdNow * 100, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>

        <Panel
          title={`Skid pad, R = ${RADIUS} m — what load transfer costs`}
          reference="Ch 5 vs Ch 7"
          note={
            <>
              Same car, same tyres. The dashed line has the CG on the ground, so both
              tyres on an axle work at the same load; the solid line is the real car.
              The gap is the quadratic capacity loss of Exercise 2.6, paid twice.
            </>
          }
        >
          <Chart
            series={skidPad}
            height={260}
            xLabel="Lateral acceleration (g)"
            yLabel="Road-wheel steer (deg)"
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
          />
          <Readouts>
            <Readout
              label="Limit with transfer"
              value={limit.limitAy.toFixed(3)}
              unit="g"
              tone="accent"
            />
            <Readout
              label="Limit if CG were on the ground"
              value={pairLimit(
                vehicle,
                { ...chassis, cgHeight: 0.001 },
                tireF,
                tireR,
                phase
              ).limitAy.toFixed(3)}
              unit="g"
            />
            <Readout
              label="Cost of load transfer"
              value={(
                pairLimit(vehicle, { ...chassis, cgHeight: 0.001 }, tireF, tireR, phase).limitAy -
                limit.limitAy
              ).toFixed(3)}
              unit="g"
              tone="danger"
            />
          </Readouts>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Why the distribution is the only lever">
          <Explain
            seeing={
              <>
                Splitting an axle's load unevenly costs capacity, and the loss grows
                with the <strong>square</strong> of the transfer (Ch 2, Exercise 2.6).
                The total transfer is fixed by mass, lateral acceleration, CG height and
                track — none of which change at a race weekend.
              </>
            }
            look={
              <>
                So the front and rear losses are{' '}
                <strong>2c·ΔF²</strong> each, and their <em>difference</em> is set purely
                by how the fixed total is split. Move it forward and the front loses
                more: understeer. Move it back: oversteer.
              </>
            }
            matters={
              <>
                That single derivative is why anti-roll bars exist, why they change
                balance without costing much total grip, and why TLLTD — not spring rate,
                not roll stiffness on its own — is the number a race engineer actually
                tunes.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

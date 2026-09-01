/**
 * Chapter 20 lab -- driving and braking.
 *
 * Three separate arguments, each of which comes down to one number.
 *
 *   - The traction formulas for rear and front drive differ only in the SIGN of
 *     one term. That sign is self-reinforcing in one case and self-limiting in
 *     the other, and it explains the layout of essentially every fast car.
 *   - A differential's locking torque is a yaw moment. At a realistic circuit
 *     setting it is worth about a degree of opposite lock, which is 20-30% of a
 *     driver's steering authority in a fast corner -- so "the car won't rotate
 *     on exit" is usually a differential problem wearing a balance problem's
 *     clothes, and chasing it with anti-roll bars is a category error.
 *   - Ideal brake bias equals the instantaneous load split, which rises with
 *     deceleration. A fixed bias is therefore correct at exactly one point on
 *     the pedal, and the asymmetry of the two failure modes decides which side
 *     of that point to sit on.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  CIRCUIT_DIFF,
  OVER_PRELOADED_DIFF,
  asymptoticTbr,
  balancedDeceleration,
  brakingState,
  brakingTime,
  compareLayouts,
  diffState,
  diffYawMoment,
  discTemperatureRise,
  idealBrakeBias,
  maxDriveTorque,
  tractionLimit,
  type DriveLayout
} from '@core/performance/driveline.js'
import { derive } from '@core/vehicle/params.js'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'

const LAYOUT_LABEL: Record<DriveLayout, string> = {
  rwd: 'Rear drive',
  fwd: 'Front drive',
  awd: 'All-wheel drive'
}

const INPUT_TORQUE = 900
const INNER_LIMIT = 1100
const OUTER_LIMIT = 2600

export function DrivelineLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const diff = useGarage((s) => s.diff)
  const setDiff = useGarage((s) => s.setDiff)
  const layout = useGarage((s) => s.driveLayout)
  const setLayout = useGarage((s) => s.setDriveLayout)
  const bias = useGarage((s) => s.brakeBias)
  const setBias = useGarage((s) => s.setBrakeBias)
  const tire = useGarage((s) => s.tire)
  const speed = useGarage((s) => s.speed)

  const v = derive(vehicle)
  /**
   * Longitudinal friction at the load the driven axle actually carries, rather
   * than a nominal peak. Ch 2's load sensitivity applies here as much as
   * anywhere, and using the tyre's own mu keeps this lab honest against the
   * rest of the app.
   */
  const mu = useMemo(
    () => new MagicFormulaTire(tire).muX(v.wr / 2),
    [tire, v.wr]
  )
  const geom = useMemo(
    () => ({ a: vehicle.a, b: vehicle.b, h: chassis.cgHeight, mu }),
    [vehicle.a, vehicle.b, chassis.cgHeight, mu]
  )
  const layouts = useMemo(() => compareLayouts(geom), [geom])
  const hOverL = chassis.cgHeight / v.L

  // --- traction against CG height, for the dragster argument --------------
  const tractionChart: Series[] = useMemo(() => {
    const build = (l: DriveLayout, name: string, color: string): Series => ({
      name,
      color,
      points: Array.from({ length: 41 }, (_, i) => {
        const h = 0.15 + (0.55 * i) / 40
        const ax = tractionLimit({ ...geom, h }, l)
        return { x: h, y: isFinite(ax) ? Math.min(ax, 4) : 4 }
      })
    })
    return [
      build('rwd', 'Rear drive', '#ff9f4d'),
      build('fwd', 'Front drive', '#5aa9ff'),
      build('awd', 'All-wheel drive', '#4dd6c1')
    ]
  }, [geom])

  // --- differential: locking and its yaw moment ---------------------------
  const state = useMemo(() => diffState(diff, INPUT_TORQUE), [diff])
  const yaw = useMemo(
    () =>
      diffYawMoment({
        torqueInside: state.torqueHigh,
        torqueOutside: state.torqueLow,
        rollingRadius: 0.33,
        track: chassis.trackRear,
        controlDerivative: 3000
      }),
    [state, chassis.trackRear]
  )

  const tbrChart: Series[] = useMemo(() => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const t = 40 + (1960 * i) / 60
      return { t, s: diffState(diff, t) }
    })
    return [
      {
        name: 'Torque bias ratio',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.t, y: Math.min(p.s.tbr, 20) }))
      },
      {
        name: 'Ramp alone (no preload)',
        color: '#5f6f80',
        dashed: true,
        points: pts.map((p) => ({ x: p.t, y: asymptoticTbr(diff.driveRamp) }))
      }
    ]
  }, [diff])

  const torqueByType = {
    open: maxDriveTorque('open', INNER_LIMIT, OUTER_LIMIT),
    lsd: maxDriveTorque('lsd', INNER_LIMIT, OUTER_LIMIT, diff),
    spool: maxDriveTorque('spool', INNER_LIMIT, OUTER_LIMIT)
  }

  // --- brakes -------------------------------------------------------------
  const biasChart: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const ax = 0.2 + (2.3 * i) / 40
      return { ax, ideal: idealBrakeBias(v.frontWeightFraction, hOverL, ax) * 100 }
    })
    return [
      {
        name: 'Ideal front bias (%)',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.ax, y: p.ideal }))
      },
      {
        name: 'Your fixed bias',
        color: '#ffcc55',
        dashed: true,
        points: pts.map((p) => ({ x: p.ax, y: bias * 100 }))
      }
    ]
  }, [v.frontWeightFraction, hOverL, bias])

  const decel = 1.5
  const brake = useMemo(
    () =>
      brakingState({
        weight: v.w,
        frontWeightFraction: v.frontWeightFraction,
        hOverL,
        ax: decel,
        bias,
        mu
      }),
    [v.w, v.frontWeightFraction, hOverL, bias, mu]
  )
  const balancedAt = balancedDeceleration(bias, v.frontWeightFraction, hOverL)
  const thermal = useMemo(
    () =>
      discTemperatureRise({
        mass: vehicle.mass,
        speedFrom: speed * 1.9,
        speedTo: speed * 0.8,
        discMass: 5.2,
        frontShare: bias
      }),
    [vehicle.mass, speed, bias]
  )
  const stopSeconds = brakingTime(speed * 1.9, speed * 0.8, decel)

  const brakeVerdict =
    brake.locksFirst === 'rear'
      ? {
          headline: 'Rears lock first — the unsafe failure',
          tone: 'rear' as const,
          detail: (
            <>
              The rear axle loses its lateral capability entirely at the moment it locks, and
              the car spins. Every road car and most race cars sit deliberately{' '}
              <em>forward</em> of ideal for exactly this reason.
            </>
          )
        }
      : brake.locksFirst === 'front'
        ? {
            headline: 'Fronts lock first — stable but slow',
            tone: 'front' as const,
            detail: (
              <>
                The car pushes straight, stopping distance grows, and steering is lost — but
                nothing rotates. This is the failure mode to choose if you must choose one.
              </>
            )
          }
        : {
            headline: `Both axles at the same utilisation`,
            tone: 'ok' as const,
            detail: (
              <>
                Bias exactly matches the instantaneous load split. True at this deceleration
                and nowhere else, which is the whole problem with a fixed bias.
              </>
            )
          }

  const experiments: Experiment[] = [
    {
      title: 'Swap the drive axle and watch one sign do all the work',
      action: 'Switch between rear, front and all-wheel drive.',
      predict: 'Which layout has more static weight on its driven axle? Which is faster?',
      result: (
        <>
          On this car the <strong>front</strong> axle carries more static weight, and front
          drive is still slower — because load transfer works against it. Rear drive's
          denominator is <em>1 − μh/L</em> and front drive's is <em>1 + μh/L</em>, and that
          one sign is the whole difference.
          <br />
          <br />
          Rear drive <strong>recruits</strong> load as it accelerates; front drive{' '}
          <strong>sheds</strong> it. Rearward bias and a high CG therefore both improve
          straight-line traction — which is why a dragster is shaped like a dragster, and why
          the same two features are ruinous for cornering, where lateral transfer scales with
          the same <em>h</em>. Circuit racing resolves the conflict firmly in favour of
          cornering.
        </>
      ),
      run: () => setLayout('fwd'),
      reset: () => setLayout('rwd')
    },
    {
      title: 'Wind on preload until the car stops rotating',
      action: 'Raise preload toward 300 N·m and watch the low-torque end of the TBR curve.',
      predict: 'At what point in a lap does preload act?',
      result: (
        <>
          <strong>Everywhere.</strong> Preload is a constant locking torque, so at low input
          torque it dominates completely and the differential behaves nearly like a spool —
          on a trailing throttle, in slow corners, and during the rotation phase where the
          driver needs the car to turn.
          <br />
          <br />
          That is the diagnostic rule of Ch 20 §3.6: ramp angles act only in their own torque
          direction, so a problem on <em>both</em> entry and exit is preload. Reduce preload
          first; it is the only setting that acts in every phase.
        </>
      ),
      run: () => setDiff(OVER_PRELOADED_DIFF),
      reset: () => setDiff(CIRCUIT_DIFF)
    },
    {
      title: 'Price the differential in degrees of steering',
      action: 'Read the yaw moment the diff makes, and the steer angle equivalent to it.',
      predict: 'Is it comparable to what the driver commands?',
      result: (
        <>
          At this setting the locked diff makes{' '}
          <strong>{yaw.yawMoment.toFixed(0)} N·m</strong> of anti-turn moment, equivalent to{' '}
          <strong>{Math.abs(yaw.equivalentSteer).toFixed(2)}° of opposite lock</strong>. On a
          car whose total steer in a fast corner is three to five degrees, that is a fifth to
          a third of the driver's entire authority, working against them — and it appears
          only under power.
          <br />
          <br />
          Which is why chasing "won't rotate on exit" with anti-roll bars fails: bars move
          steady-state balance in every phase, and this moment exists only in one. It is Ch
          12's orthogonality argument in its most concrete form, and it is the reason
          electronically controlled differentials are so valuable where they are permitted —
          release the locking during rotation, reapply it for traction, and the trade
          disappears.
        </>
      )
    },
    {
      title: 'Set a fixed bias and find where it is right',
      action: 'Move the brake bias and read where the ideal curve crosses it.',
      predict: 'How wrong is it at the other end of the pedal?',
      result: (
        <>
          A fixed bias is correct at <strong>one</strong> deceleration —{' '}
          {balancedAt > 0 ? `${balancedAt.toFixed(2)} g here` : 'nowhere in the useful range'}{' '}
          — because the ideal rises with deceleration while the bias does not. Below that
          point the fronts lock early; above it the rears do.
          <br />
          <br />
          The asymmetry decides where to sit. Fronts locking first is slow and stable; rears
          locking first is fast and then catastrophic. So the bias goes <em>forward</em> of
          ideal at the deceleration that matters most, and the driver modulates the rest.
        </>
      ),
      run: () => setBias(0.5),
      reset: () => setBias(0.62)
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Which wheels drive, how the torque splits between them, and how the braking is
        distributed. Every answer comes back to the same constraint —{' '}
        <strong>each tyre has one friction budget</strong> and both demands draw on it.
      </div>

      <div className="stage">
        <Panel
          title="Traction by layout"
          reference="Ch 20 §2.1"
          right={
            <ButtonRow
              options={[
                { value: 'rwd', label: 'RWD' },
                { value: 'fwd', label: 'FWD' },
                { value: 'awd', label: 'AWD' }
              ]}
              value={layout}
              onChange={(l) => setLayout(l as DriveLayout)}
            />
          }
          note={
            <>
              The two formulas differ by a single sign. Rear drive's denominator makes
              acceleration <strong>self-reinforcing</strong>; front drive's makes it{' '}
              <strong>self-limiting</strong>. Nothing else in the chapter matters as much.
            </>
          }
        >
          <Formula
            tex={String.raw`A_x^{RWD}=\frac{\mu\,a/L}{1-\mu\,h/L}\qquad A_x^{FWD}=\frac{\mu\,b/L}{1+\mu\,h/L}\qquad A_x^{AWD}=\mu`}
            block
          />
          <table className="data">
            <thead>
              <tr>
                <th>Layout</th>
                <th>Max A(x)</th>
                <th>Static on driven axle</th>
                <th>At the limit</th>
                <th>Recruited</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map((l) => (
                <tr
                  key={l.layout}
                  style={l.layout === layout ? { color: 'var(--accent)' } : undefined}
                >
                  <td>{LAYOUT_LABEL[l.layout]}</td>
                  <td>{isFinite(l.maxAcceleration) ? l.maxAcceleration.toFixed(3) : '—'} g</td>
                  <td>{(l.staticDrivenFraction * 100).toFixed(1)}%</td>
                  <td>{(l.drivenFractionAtLimit * 100).toFixed(1)}%</td>
                  <td
                    style={{
                      color: l.recruited >= 0 ? 'var(--ok)' : 'var(--danger)'
                    }}
                  >
                    {l.recruited >= 0 ? '+' : ''}
                    {(l.recruited * 100).toFixed(1)} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Chart
            series={tractionChart}
            height={220}
            xLabel="CG height (m)"
            yLabel="Maximum acceleration (g)"
            fmtX={(v) => v.toFixed(2)}
            fmtY={(v) => v.toFixed(2)}
            vRules={[{ value: chassis.cgHeight, label: 'your car', color: '#dbe4ee' }]}
          />
          <div className="panel-note">
            Raising the CG makes rear drive <strong>better</strong> and front drive{' '}
            <strong>worse</strong>, and does nothing to all-wheel drive. It also makes
            cornering worse for every layout, because lateral load transfer scales with the
            same height — which is the conflict circuit racing settles in favour of cornering
            and drag racing settles the other way.
          </div>
        </Panel>

        <div className="stack">
          <Panel
            title="Differential"
            right={
              <ButtonRow
                options={[
                  { value: 'circuit', label: 'Circuit' },
                  { value: 'over', label: 'Too much preload' }
                ]}
                value={diff.preload > 150 ? 'over' : 'circuit'}
                onChange={(x) => setDiff(x === 'over' ? OVER_PRELOADED_DIFF : CIRCUIT_DIFF)}
              />
            }
          >
            <Slider
              label="Preload"
              unit="N·m"
              value={diff.preload}
              min={0}
              max={400}
              step={5}
              digits={0}
              onChange={(preload) => setDiff({ preload })}
            />
            <Slider
              label="Drive ramp"
              unit="lock per unit input"
              value={diff.driveRamp}
              min={0}
              max={0.7}
              step={0.01}
              digits={2}
              onChange={(driveRamp) => setDiff({ driveRamp })}
            />
            <Slider
              label="Coast ramp"
              unit="lock per unit input"
              value={diff.coastRamp}
              min={0}
              max={0.7}
              step={0.01}
              digits={2}
              onChange={(coastRamp) => setDiff({ coastRamp })}
            />
            <Readouts>
              <Readout label={`Locking at ${INPUT_TORQUE} N·m`} value={state.lockTorque.toFixed(0)} unit="N·m" />
              <Readout label="Torque bias ratio" value={state.tbr.toFixed(2)} tone="accent" />
              <Readout label="Anti-turn yaw moment" value={yaw.yawMoment.toFixed(0)} unit="N·m" tone="warn" />
              <Readout
                label="…as opposite lock"
                value={Math.abs(yaw.equivalentSteer).toFixed(2)}
                unit="deg"
                tone={Math.abs(yaw.equivalentSteer) > 0.6 ? 'danger' : 'ok'}
              />
            </Readouts>
            <div className="panel-note">
              More locking on power means more traction <em>and</em> more understeer on exit.
              The two cannot be separated on a passive differential — which is the whole
              value of an electronically controlled one.
            </div>
          </Panel>

          <Panel title="What each type transmits" reference="Ch 20 Ex 20.4">
            <Readouts>
              <Readout label="Open" value={torqueByType.open.toFixed(0)} unit="N·m" />
              <Readout label="This LSD" value={torqueByType.lsd.toFixed(0)} unit="N·m" tone="accent" />
              <Readout label="Spool" value={torqueByType.spool.toFixed(0)} unit="N·m" />
              <Readout
                label="LSD recovers"
                value={`${(
                  ((torqueByType.lsd - torqueByType.open) /
                    Math.max(torqueByType.spool - torqueByType.open, 1)) *
                  100
                ).toFixed(0)}%`}
                unit="of the spool gain"
                tone="ok"
              />
            </Readouts>
            <div className="panel-note">
              With the inside wheel able to hold {INNER_LIMIT} N·m and the outside{' '}
              {OUTER_LIMIT}. An open diff wastes most of the outside wheel because it always
              splits torque equally — so the lightly loaded inside rear caps the whole car,
              and if it lifts, everything goes to zero.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="The differential is not a constant"
          reference="Ch 20 §3.2"
          note={
            <>
              Torque bias ratio depends on how much torque is going through the diff, because
              preload is a <strong>fixed</strong> component and the ramp is a proportional
              one. At low torque preload dominates and the diff is effectively locked.
            </>
          }
        >
          <Chart
            series={tbrChart}
            height={230}
            xLabel="Input torque (N·m)"
            yLabel="Torque bias ratio"
            zeroY={false}
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[{ value: INPUT_TORQUE, label: 'sample', color: '#dbe4ee' }]}
          />
          <div className="panel-note">
            The grey line is what the ramp alone would give. Everything above it, at the left
            of the chart, is preload — and the left of the chart is corner entry and slow
            corners, exactly where you wanted the car to rotate.
          </div>
        </Panel>

        <Panel
          title="Brake bias, and the one deceleration it is right at"
          reference="Ch 20 §4.1"
          note={
            <>
              The ideal bias <em>is</em> the instantaneous load distribution — that is what
              putting both axles at equal friction utilisation means. It rises with
              deceleration; a fixed bias does not.
            </>
          }
        >
          <Chart
            series={biasChart}
            height={210}
            xLabel="Deceleration (g)"
            yLabel="Front bias (%)"
            zeroY={false}
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(0)}
            vRules={
              balancedAt > 0.2 && balancedAt < 2.5
                ? [{ value: balancedAt, label: 'balanced here', color: '#6ee787' }]
                : []
            }
          />
          <Slider
            label="Front brake bias"
            unit="%"
            value={bias * 100}
            min={40}
            max={85}
            step={0.5}
            digits={1}
            onChange={(pct) => setBias(pct / 100)}
          />
          <Readouts>
            <Readout label={`Ideal at ${decel} g`} value={(brake.idealBias * 100).toFixed(1)} unit="%" />
            <Readout
              label="Yours is"
              value={`${brake.biasError >= 0 ? '+' : ''}${(brake.biasError * 100).toFixed(1)}`}
              unit="pts"
              tone={brake.biasError >= 0 ? 'ok' : 'danger'}
            />
            <Readout label="Front utilisation" value={`${(brake.frontUtilisation * 100).toFixed(0)}%`} tone="front" />
            <Readout label="Rear utilisation" value={`${(brake.rearUtilisation * 100).toFixed(0)}%`} tone="rear" />
            <Readout label="Rear axle load" value={brake.rearLoad.toFixed(0)} unit="N" />
            <Readout
              label="…of its static"
              value={`${((brake.rearLoad / (v.w * (1 - v.frontWeightFraction))) * 100).toFixed(0)}%`}
              tone="warn"
            />
          </Readouts>
          <div style={{ padding: '0 12px 12px' }}>
            <Verdict headline={brakeVerdict.headline} tone={brakeVerdict.tone}>
              {brakeVerdict.detail}
            </Verdict>
          </div>
          <Readouts>
            <Readout label="Energy per stop" value={(thermal.totalEnergy / 1e6).toFixed(2)} unit="MJ" />
            <Readout label="Front disc rise" value={thermal.frontRise.toFixed(0)} unit="K" tone="danger" />
            <Readout label="Rear disc rise" value={thermal.rearRise.toFixed(0)} unit="K" />
            <Readout
              label="Peak power"
              value={(thermal.totalEnergy / Math.max(stopSeconds, 0.1) / 1000).toFixed(0)}
              unit="kW"
            />
          </Readouts>
          <div className="panel-note">
            One stop raises the front discs by a couple of hundred degrees. From a warm
            baseline the cumulative state over a lap, not the single event, sets the margin —
            which is why brake duct sizing is a lap-time parameter and not only a durability
            one.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Corner entry is never one problem">
          <Explain
            seeing={
              <>
                Three separate mechanisms that all deliver longitudinal force, and all of
                them spend the same friction budget the tyres need for cornering.
              </>
            }
            look={
              <>
                How much of each one is a <em>handling</em> parameter rather than a
                performance one. Torque split changes yaw moment. Brake bias changes which
                axle gives up. Neither is a straight-line adjustment, and both act only in
                their own corner phase.
              </>
            }
            matters={
              <>
                Because braking is not a longitudinal event. On corner entry, four things act
                at once: longitudinal transfer unloads the rear exactly when it is asked for
                lateral force (Ch 7), aerodynamic pitch shifts the balance forward (Ch 15),
                anti-dive geometry changes how the pitch develops (Ch 17), and scrub radius
                turns any braking asymmetry into steering torque (Ch 19).
                <br />
                <br />
                So corner-entry instability is rarely a single-cause problem, and the
                discipline of Chapter 12 applies with full force: identify the{' '}
                <strong>phase</strong> first, then reach for a tool that acts only in that
                phase.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

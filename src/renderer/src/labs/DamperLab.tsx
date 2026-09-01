/**
 * Chapter 22 lab -- dampers.
 *
 * The chapter opens by admitting that its own theory does not determine the
 * answer: damper settings are found empirically, guided by theory, not derived
 * from it. So this lab deliberately does not pretend to produce a setup. It
 * shows the four things theory DOES fix, and each one is a claim that can be
 * checked by moving a slider:
 *
 *   - Damping is modal. zeta says what the body does, and the bands have names.
 *   - The two masses have modes far apart, which is the ONLY reason low-speed
 *     and high-speed damping are separate adjustments.
 *   - At steady state a damper makes no force, so it cannot move steady-state
 *     balance. It moves the balance during the transient and nowhere else.
 *   - Load variation costs lateral force quadratically, which is why contact
 *     patch load variation -- not ride, not body control -- is the objective.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  LINEAR_DAMPER,
  OVER_REBOUND_DAMPER,
  RACE_DAMPER,
  axleRollDamping,
  criticalDamping,
  curveShape,
  damperForce,
  damperFromWheelRate,
  dampingRatio,
  describeZeta,
  forceVelocityCurve,
  jackingRisk,
  loadVariationLoss,
  modeSeparation,
  readDyno,
  reboundRatio,
  transientTlltd,
  type DamperCurve
} from '@core/vehicle/damper.js'
import { deriveRates, rideRate, wheelRate } from '@core/vehicle/rates.js'
import { allCorners, readHistogram, type HistogramSet } from '@telemetry/histogram.js'
import type { TelemetrySample } from '@telemetry/types.js'
import { deriveChassis } from '@core/vehicle/chassis.js'

/** Ch 22 §3.3's velocity bands, which is where each mode actually lives. */
const BODY_BAND = { from: 0, to: 0.05 }
const WHEEL_BAND = { from: 0.1, to: 0.5 }

export function DamperLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const rates = useGarage((s) => s.rates)

  const [curve, setCurve] = useState<DamperCurve>({ ...RACE_DAMPER })
  const [rearScale, setRearScale] = useState(0.55)
  const [rollTime, setRollTime] = useState(0.3)
  const [loadSwing, setLoadSwing] = useState(0.35)
  /** A loaded session, for the velocity histogram. Empty until one is opened. */
  const [session, setSession] = useState<TelemetrySample[]>([])
  const [histogram, setHistogram] = useState<HistogramSet | null>(null)

  const d = useMemo(() => deriveRates(rates), [rates])
  const dc = useMemo(() => deriveChassis(vehicle, chassis), [vehicle, chassis])

  const kwFront = wheelRate(rates.front.springRate, rates.front.installationRatio)
  const krFront = rideRate(kwFront, rates.front.tireRate) * 1000
  const unsprungCorner = chassis.unsprungMassFront / 2

  const crit = criticalDamping(krFront, rates.front.sprungCornerMass)
  const zeta = dampingRatio(curve.lowSpeedBump, krFront, rates.front.sprungCornerMass)
  const modes = useMemo(
    () =>
      modeSeparation(
        krFront,
        rates.front.sprungCornerMass,
        rates.front.tireRate * 1000,
        kwFront * 1000,
        unsprungCorner
      ),
    [krFront, rates.front.sprungCornerMass, rates.front.tireRate, kwFront, unsprungCorner]
  )

  const dyno = readDyno(900, 0.05, rates.front.installationRatio)
  const damperReferred = damperFromWheelRate(curve.lowSpeedBump, rates.front.installationRatio)

  // --- force-velocity curve, both referred ways ---------------------------
  const fvSeries: Series[] = useMemo(() => {
    const pts = forceVelocityCurve(curve, 0.45)
    return [
      {
        name: 'Wheel-referred force (N)',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.velocity * 1000, y: p.force }))
      },
      {
        name: 'Linear valving, same low-speed rate',
        color: '#5f6f80',
        dashed: true,
        points: pts.map((p) => ({
          x: p.velocity * 1000,
          y: p.velocity >= 0 ? curve.lowSpeedBump * p.velocity : curve.lowSpeedRebound * p.velocity
        }))
      }
    ]
  }, [curve])

  // --- transient balance ---------------------------------------------------
  const rollDampingFront = axleRollDamping(curve.lowSpeedBump, chassis.trackFront)
  const rollDampingRear = axleRollDamping(curve.lowSpeedBump * rearScale, chassis.trackRear)
  const transient = useMemo(
    () =>
      transientTlltd({
        rollStiffnessFront: d.rollRateFront,
        rollStiffnessRear: d.rollRateRear,
        rollDampingFront,
        rollDampingRear,
        rollAngle: dc.rollGradientDeg * 1.4,
        rollTime
      }),
    [d.rollRateFront, d.rollRateRear, rollDampingFront, rollDampingRear, dc.rollGradientDeg, rollTime]
  )

  const transientSeries: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const t = 0.08 + (0.72 * i) / 40
      const r = transientTlltd({
        rollStiffnessFront: d.rollRateFront,
        rollStiffnessRear: d.rollRateRear,
        rollDampingFront,
        rollDampingRear,
        rollAngle: dc.rollGradientDeg * 1.4,
        rollTime: t
      })
      return { t, transient: r.transient * 100, steady: r.steadyState * 100 }
    })
    return [
      {
        name: 'TLLTD during turn-in (% front)',
        color: '#ff9f4d',
        points: pts.map((p) => ({ x: p.t, y: p.transient }))
      },
      {
        name: 'Steady state — dampers do nothing',
        color: '#4dd6c1',
        dashed: true,
        points: pts.map((p) => ({ x: p.t, y: p.steady }))
      }
    ]
  }, [d.rollRateFront, d.rollRateRear, rollDampingFront, rollDampingRear, dc.rollGradientDeg])

  // --- load variation ------------------------------------------------------
  const staticCorner = (vehicle.mass * 9.80665 * (vehicle.b / (vehicle.a + vehicle.b))) / 2
  const loss = useMemo(
    () => loadVariationLoss(1.7, 6e-5, staticCorner, staticCorner * loadSwing),
    [staticCorner, loadSwing]
  )
  const lossSeries: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const swing = (0.8 * i) / 40
      return {
        x: swing * 100,
        y: loadVariationLoss(1.7, 6e-5, staticCorner, staticCorner * swing).lossFraction * 100
      }
    })
    return [{ name: 'Lateral force lost (%)', color: '#ff6b6b', points: pts }]
  }, [staticCorner])

  const jack = jackingRisk(curve.lowSpeedRebound, krFront, 4)

  /**
   * Load a session for the histogram.
   *
   * Only available in the desktop app -- the file picker and the .ibt parser
   * both live in the main process. In a browser this button is simply absent.
   */
  const bridge = (window as unknown as {
    rcvd?: {
      pickSessionFile?: () => Promise<string | null>
      selectSource?: (c: unknown) => Promise<unknown>
      telemetrySamples?: () => Promise<TelemetrySample[]>
    }
  }).rcvd
  const canLoad = Boolean(bridge?.pickSessionFile)

  const loadSession = async (): Promise<void> => {
    if (!bridge?.pickSessionFile || !bridge.selectSource || !bridge.telemetrySamples) return
    const path = await bridge.pickSessionFile()
    if (!path) return
    await bridge.selectSource({ file: path })
    const samples = await bridge.telemetrySamples()
    setSession(samples)
    setHistogram(
      allCorners(samples, {
        installationRatio: rates.front.installationRatio,
        lowSpeedBoundary: 0.05
      })
    )
  }

  const verdict = histogram ? readHistogram(histogram) : null
  const lf = histogram?.corners.LF ?? null

  /**
   * The histogram drawn against the SAME velocity axis as the force curve.
   *
   * That overlay is the whole point of Ch 22 §4.3: the curve says what the
   * damper would do at each velocity, the histogram says how often it is
   * actually asked, and a knee placed where the car never goes is a setting
   * with no effect.
   */
  const histogramSeries: Series[] = useMemo(() => {
    if (!lf) return []
    const peak = Math.max(...lf.bins.map((b) => b.fraction), 1e-9)
    return [
      {
        name: 'Time spent at this wheel velocity (LF)',
        color: '#ff9f4d',
        points: lf.bins.map((b) => ({ x: b.velocity * 1000, y: (b.fraction / peak) * 100 }))
      }
    ]
  }, [lf])

  const zetaVerdict =
    zeta >= 0.55 && zeta <= 0.85
      ? { headline: `ζ = ${zeta.toFixed(2)} — the race compromise`, tone: 'ok' as const }
      : zeta < 0.55
        ? { headline: `ζ = ${zeta.toFixed(2)} — underdamped`, tone: 'rear' as const }
        : { headline: `ζ = ${zeta.toFixed(2)} — firm`, tone: 'front' as const }

  const experiments: Experiment[] = [
    {
      title: 'Try to change steady-state balance with a damper',
      action: 'Move the rear damper scale and watch both lines on the TLLTD chart.',
      predict: 'Does the teal line move?',
      result: (
        <>
          <strong>It cannot.</strong> At steady state the roll velocity is zero, so the
          dampers make no force at all and the balance is whatever the springs and bars say.
          Only the orange line — the transient — responds.
          <br />
          <br />
          That is the chapter's diagnostic rule, and it is worth memorising: if a complaint
          exists <em>only</em> during the transient and disappears once the car is settled,
          it is a damper problem. If it persists at steady state it is a spring, bar,
          geometry or aero problem. Using dampers to fix a steady-state problem is the single
          most common setup error there is.
        </>
      ),
      run: () => setRearScale(1.6),
      reset: () => setRearScale(0.55)
    },
    {
      title: 'Change your turn-in style without touching the car',
      action: 'Shorten the roll time from 0.30 s to 0.12 s.',
      predict: 'Does the car’s balance change?',
      result: (
        <>
          Yes — the transient shift scales with <strong>roll velocity</strong>, so a quick
          aggressive turn-in produces a bigger damper contribution than a long sweeper.
          Nobody touched the car.
          <br />
          <br />
          Two consequences. A driver who changes their entry style changes the car's
          transient balance, which is a real source of "it was fine yesterday". And a damper
          change that helps in slow corners may do almost nothing in fast ones, because the
          roll velocities are different.
        </>
      ),
      run: () => setRollTime(0.12),
      reset: () => setRollTime(0.3)
    },
    {
      title: 'Wind on rebound until the car jacks down',
      action: 'Raise low-speed rebound toward 20,000 N·s/m.',
      predict: 'What happens over a series of bumps?',
      result: (
        <>
          The wheel cannot re-extend before the next bump arrives, so each compression starts
          from a partially compressed position and the body ratchets progressively lower.
          The condition is <em>c<sub>rebound</sub>/K<sub>R</sub> ≳ 1/f<sub>bump</sub></em> —
          a rebound time constant longer than the gap between bumps.
          <br />
          <br />
          On a road car this costs travel and rides harshly, and it is bounded. On a
          high-downforce car it is the most dangerous failure mode in the book: the aero map
          is steep near the ground, so the car does not lose performance gradually but falls
          off a cliff; the loss is front-biased because the front of the floor runs closest,
          so it is a <em>balance</em> event at high speed; and there is no travel in reserve.
          Hence blow-off valving on rebound, bump rubbers to define a floor, and checking
          ride-height traces for downward drift over rough sections.
        </>
      ),
      run: () => setCurve(OVER_REBOUND_DAMPER),
      reset: () => setCurve({ ...RACE_DAMPER })
    },
    {
      title: 'Compare a digressive damper with a linear one',
      action: 'Switch valving and look at the high-velocity end of the curve.',
      predict: 'What does the knee buy?',
      result: (
        <>
          Body control without harshness. Below the knee the digressive curve is as firm as
          the linear one, so it controls dive, roll and heave just as well. Above it, it
          flattens — so a kerb or a sharp bump does not spike the force and unload the
          contact patch.
          <br />
          <br />
          That is exactly the separation the two modes make possible: the body lives below
          about 50 mm/s of wheel velocity and the wheel lives above 100 mm/s, so the two
          regions of the curve are doing genuinely different jobs. It only works while the
          modes stay apart — on a very stiff car they close up, and the tuning gets harder.
        </>
      ),
      run: () => setCurve(LINEAR_DAMPER),
      reset: () => setCurve({ ...RACE_DAMPER })
    },
    {
      title: 'Let the contact patch load oscillate',
      action: 'Increase the load swing and read what it costs.',
      predict: 'Does an oscillation around the same mean cost anything?',
      result: (
        <>
          Yes, and quadratically. Because F<sub>y</sub>(F<sub>z</sub>) is <em>concave</em>,
          the gain when load rises is smaller than the loss when it falls, so any fluctuation
          reduces the average lateral force available even though the mean load is unchanged.
          The penalty is exactly <em>b·Δ²</em> — the same Jensen argument that made lateral
          load transfer costly in Chapter 2, now applied in <strong>time</strong> rather than
          across a track.
          <br />
          <br />
          Two things follow. The square means the worst excursions dominate, so suppressing
          the biggest 20% of the variation matters more than trimming the rest. And it gives
          the damper a measurable, physically grounded objective —{' '}
          <strong>RMS contact patch load variation</strong> on a 7-post rig — that can be
          optimised without reference to subjective ride quality or lap time.
        </>
      ),
      run: () => setLoadSwing(0.7),
      reset: () => setLoadSwing(0.35)
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        The least understood and most over-adjusted component on the car, because its effect
        depends on <strong>velocity</strong> — which depends on the road, the driver and the
        car's own motion. Theory does not determine a damper setting. What it fixes is the
        four things below.
      </div>

      <div className="stage">
        <Panel
          title="The force–velocity curve"
          reference="Ch 22 §3.4"
          right={
            <ButtonRow
              options={[
                { value: 'race', label: 'Digressive' },
                { value: 'linear', label: 'Linear' },
                { value: 'over', label: 'Too much rebound' }
              ]}
              value={
                curve.lowSpeedRebound > 15000
                  ? 'over'
                  : curveShape(curve) === 'digressive'
                    ? 'race'
                    : 'linear'
              }
              onChange={(x) =>
                setCurve(
                  x === 'over'
                    ? { ...OVER_REBOUND_DAMPER }
                    : x === 'linear'
                      ? { ...LINEAR_DAMPER }
                      : { ...RACE_DAMPER }
                )
              }
            />
          }
          note={
            <>
              Wheel-referred, which is the only way to compare two cars or even the two ends
              of one car. The shaded regions are where each mode lives: the{' '}
              <strong>body</strong> below about 50 mm/s and the <strong>wheel</strong> above
              100 mm/s. Those are different jobs, which is why the curve has a knee.
            </>
          }
        >
          <Chart
            series={fvSeries}
            height={280}
            xLabel="Wheel velocity (mm/s) — positive is bump"
            yLabel="Force (N)"
            zeroY={false}
            fmtX={(x) => x.toFixed(0)}
            fmtY={(y) => y.toFixed(0)}
            xBands={[
              { from: BODY_BAND.from * 1000, to: BODY_BAND.to * 1000, color: 'rgba(77,214,193,0.08)' },
              { from: WHEEL_BAND.from * 1000, to: WHEEL_BAND.to * 1000, color: 'rgba(255,159,77,0.08)' }
            ]}
            vRules={[{ value: curve.kneeVelocity * 1000, label: 'knee', color: '#ffcc55' }]}
          />
          <Readouts>
            <Readout label="Shape" value={curveShape(curve)} tone="accent" />
            <Readout label="Rebound : bump" value={`${reboundRatio(curve).toFixed(2)} : 1`} />
            <Readout
              label="Blow-off"
              value={curve.blowOffForce ? `${curve.blowOffForce} N` : 'none'}
            />
            <Readout label="Force at 50 mm/s" value={damperForce(curve, 0.05).toFixed(0)} unit="N" />
            <Readout label="…at 300 mm/s" value={damperForce(curve, 0.3).toFixed(0)} unit="N" />
          </Readouts>
          <div className="panel-note">
            Almost all dampers run more rebound than bump, typically 2:1 to 4:1: bump force
            lifts the sprung mass and adds to what the tyre already sees, while rebound force
            controls the release of stored spring energy. Too much rebound and the car jacks
            down.
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Valving" reference="wheel-referred">
            <Slider
              label="Low-speed bump"
              unit="N·s/m"
              value={curve.lowSpeedBump}
              min={500}
              max={12000}
              step={100}
              digits={0}
              onChange={(lowSpeedBump) => setCurve({ ...curve, lowSpeedBump })}
            />
            <Slider
              label="Low-speed rebound"
              unit="N·s/m"
              value={curve.lowSpeedRebound}
              min={500}
              max={24000}
              step={100}
              digits={0}
              onChange={(lowSpeedRebound) => setCurve({ ...curve, lowSpeedRebound })}
            />
            <Slider
              label="High-speed bump"
              unit="N·s/m"
              value={curve.highSpeedBump}
              min={200}
              max={8000}
              step={100}
              digits={0}
              onChange={(highSpeedBump) => setCurve({ ...curve, highSpeedBump })}
            />
            <Slider
              label="Knee velocity"
              unit="mm/s at the wheel"
              value={curve.kneeVelocity * 1000}
              min={10}
              max={150}
              step={5}
              digits={0}
              onChange={(mm) => setCurve({ ...curve, kneeVelocity: mm / 1000 })}
            />
            <Slider
              label="Rear damping, relative to front"
              unit="×"
              value={rearScale}
              min={0.2}
              max={2}
              step={0.05}
              digits={2}
              onChange={setRearScale}
            />
          </Panel>

          <Panel
            title="What the body does"
            reference="Ch 22 §3.1"
            note={
              <>
                Damping ratio is the low-speed coefficient over the critical value for this
                corner's ride rate and sprung mass — so it moves when you change a{' '}
                <em>spring</em> as well as when you change a damper.
              </>
            }
          >
            <Formula
              tex={String.raw`c_{crit}=2\sqrt{K_Rm_s}\qquad \zeta=\frac{c}{c_{crit}}\qquad c_{damper}=\frac{c_{wheel}}{IR^2}`}
              block
            />
            <Readouts>
              <Readout label="Ride rate" value={(krFront / 1000).toFixed(1)} unit="N/mm" />
              <Readout label="Critical damping" value={crit.toFixed(0)} unit="N·s/m" />
              <Readout label="Damping ratio ζ" value={zeta.toFixed(3)} tone={zetaVerdict.tone === 'ok' ? 'ok' : 'warn'} />
              <Readout
                label="At the damper"
                value={damperReferred.toFixed(0)}
                unit="N·s/m"
                tone="accent"
              />
            </Readouts>
            <div style={{ padding: '0 12px 12px' }}>
              <Verdict headline={zetaVerdict.headline} tone={zetaVerdict.tone}>
                {describeZeta(zeta)}
              </Verdict>
            </div>
            <div className="panel-note">
              A dyno sheet reading <strong>900 N at 50 mm/s</strong> means{' '}
              {dyno.wheelForce.toFixed(0)} N at {(dyno.wheelVelocity * 1000).toFixed(1)} mm/s
              of <em>wheel</em> velocity on this car, because rate transforms as IR² while
              velocity transforms linearly. Comparing damper settings between cars — or
              between the two ends of one car — requires this conversion first.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Two modes, far apart — and why that matters"
          reference="Ch 22 §3.3"
          note={
            <>
              The body bounces on the suspension; the wheel bounces on the tyre. The
              separation between them is what makes low-speed and high-speed damping{' '}
              <strong>separate adjustments</strong> rather than one knob.
            </>
          }
        >
          <Readouts>
            <Readout label="Body mode" value={modes.bodyHz.toFixed(2)} unit="Hz" tone="accent" />
            <Readout label="Wheel hop" value={modes.hopHz.toFixed(1)} unit="Hz" tone="rear" />
            <Readout
              label="Separation"
              value={`${modes.ratio.toFixed(1)} : 1`}
              tone={modes.separable ? 'ok' : 'danger'}
            />
            <Readout label="Unsprung corner" value={unsprungCorner.toFixed(0)} unit="kg" />
          </Readouts>
          <div className="panel-note">
            {modes.separable ? (
              <>
                Comfortably separated. Inputs near {modes.bodyHz.toFixed(1)} Hz excite the
                body and produce <strong>low</strong> wheel velocities; inputs near{' '}
                {modes.hopHz.toFixed(0)} Hz excite the wheel and produce{' '}
                <strong>high</strong> ones. The two regions of the force–velocity curve
                therefore address different modes, and can be tuned independently.
              </>
            ) : (
              <>
                <strong>Too close together.</strong> Stiffen a car far enough — a
                high-downforce platform at 5–7 Hz — and the body mode climbs toward the wheel
                mode. The two begin to interact, the velocity bands overlap, and low-speed
                and high-speed damping stop being independent adjustments. This is one more
                reason damper tuning on such cars is harder.
              </>
            )}
          </div>
          <Chart
            series={lossSeries}
            height={200}
            xLabel="Contact patch load swing (± % of static)"
            yLabel="Lateral force lost (%)"
            fmtX={(x) => x.toFixed(0)}
            fmtY={(y) => y.toFixed(1)}
            vRules={[{ value: loadSwing * 100, label: 'now', color: '#dbe4ee' }]}
          />
          <Slider
            label="Load swing"
            unit="± % of static"
            value={loadSwing * 100}
            min={0}
            max={80}
            step={1}
            digits={0}
            onChange={(pct) => setLoadSwing(pct / 100)}
          />
          <Readouts>
            <Readout label="Steady" value={loss.steadyForce.toFixed(0)} unit="N" />
            <Readout label="Mean while oscillating" value={loss.meanOscillatingForce.toFixed(0)} unit="N" />
            <Readout
              label="Lost"
              value={`${(loss.lossFraction * 100).toFixed(2)}%`}
              tone={loss.lossFraction > 0.03 ? 'danger' : 'warn'}
            />
          </Readouts>
          <div className="panel-note">
            The curve is a <strong>parabola</strong>, not a line — the penalty goes as the
            square of the fluctuation. A damper's real job is not comfort and not even body
            control; it is keeping the vertical tyre load as constant as it can.
          </div>
        </Panel>

        <Panel
          title="Dampers move balance during the transient and nowhere else"
          reference="Ch 22 §4.1"
          note={
            <>
              During roll onset the roll velocity is non-zero, so each axle's damper adds to
              its roll resistance and the load transfer distribution shifts. Once the car is
              settled the velocity is zero and so is the shift.
            </>
          }
        >
          <Chart
            series={transientSeries}
            height={230}
            xLabel="Time to reach full roll (s) — quicker turn-in to the left"
            yLabel="TLLTD (% front)"
            zeroY={false}
            fmtX={(x) => x.toFixed(2)}
            fmtY={(y) => y.toFixed(1)}
            vRules={[{ value: rollTime, label: 'now', color: '#dbe4ee' }]}
          />
          <Slider
            label="Turn-in time"
            unit="s"
            value={rollTime}
            min={0.08}
            max={0.8}
            step={0.01}
            digits={2}
            onChange={setRollTime}
          />
          <Readouts>
            <Readout label="Steady-state TLLTD" value={(transient.steadyState * 100).toFixed(1)} unit="% front" tone="accent" />
            <Readout label="During turn-in" value={(transient.transient * 100).toFixed(1)} unit="% front" tone="warn" />
            <Readout
              label="Damper shift"
              value={`${transient.shift >= 0 ? '+' : ''}${(transient.shift * 100).toFixed(1)}`}
              unit="pts"
              tone={transient.shift >= 0 ? 'front' : 'rear'}
            />
            <Readout label="Roll velocity" value={transient.rollVelocity.toFixed(3)} unit="rad/s" />
          </Readouts>
          <div className="panel-note">
            {transient.shift > 0.005 ? (
              <>
                The front dampers dominate, so transient TLLTD moves <strong>forward</strong>{' '}
                and the car understeers <em>on turn-in only</em>. To fix it: reduce front
                low-speed bump or increase rear — <em>not</em> the bars, which would move the
                mid-corner balance that was already correct.
              </>
            ) : transient.shift < -0.005 ? (
              <>
                The rear dampers dominate, so transient TLLTD moves <strong>rearward</strong>{' '}
                and the car is loose <em>on turn-in only</em>. Increase front low-speed bump
                or reduce rear low-speed rebound.
              </>
            ) : (
              <>The two ends are damped in proportion to their roll rates, so the dampers
              leave the balance where the springs and bars put it, even during the transient.</>
            )}
          </div>
          <Readouts>
            <Readout
              label="Rebound time constant"
              value={jack.timeConstant.toFixed(2)}
              unit="s"
            />
            <Readout label="Gap between bumps at 4 Hz" value={jack.bumpInterval.toFixed(2)} unit="s" />
            <Readout
              label="Jacking down"
              value={jack.atRisk ? 'at risk' : 'clear'}
              tone={jack.atRisk ? 'danger' : 'ok'}
            />
          </Readouts>
        </Panel>
      </div>

      <div className="grid2">
        <Panel
          title="Which part of the curve does this circuit use?"
          reference="Ch 22 §4.3"
          right={
            canLoad ? (
              <div className="btn-row">
                <button className="btn" onClick={() => void loadSession()}>
                  Open a .ibt session…
                </button>
              </div>
            ) : undefined
          }
          note={
            <>
              The chapter calls this the essential damper diagnostic. A force–velocity curve
              has four adjustable regions and only some of them are being used on any given
              track — so the histogram answers a question the curve alone cannot.
            </>
          }
        >
          {!canLoad ? (
            <div className="panel-note" style={{ borderTop: 'none' }}>
              Loading a session needs the desktop app: the file picker and the{' '}
              <code>.ibt</code> parser both live in the main process.
            </div>
          ) : !lf ? (
            <div className="panel-note" style={{ borderTop: 'none' }}>
              Open a session above. If the car does not publish shock velocity channels the
              histogram stays empty — not every car does, and that is an ordinary outcome
              rather than an error.
            </div>
          ) : (
            <>
              <Chart
                series={histogramSeries}
                height={230}
                xLabel="Wheel velocity (mm/s) — positive is bump"
                yLabel="Time spent (% of the busiest bin)"
                fmtX={(x) => x.toFixed(0)}
                fmtY={(y) => y.toFixed(0)}
                xBands={[
                  { from: -50, to: 50, color: 'rgba(77,214,193,0.10)' }
                ]}
                vRules={[
                  { value: curve.kneeVelocity * 1000, label: 'your knee', color: '#ffcc55' },
                  { value: -curve.kneeVelocity * 1000, color: '#ffcc55', dashed: true }
                ]}
              />
              <Readouts>
                <Readout label="Samples" value={session.length.toLocaleString()} />
                <Readout
                  label="Below 50 mm/s"
                  value={`${(lf.lowSpeedFraction * 100).toFixed(0)}%`}
                  tone={lf.lowSpeedFraction > 0.9 ? 'ok' : 'warn'}
                />
                <Readout
                  label="95th percentile"
                  value={(Math.abs(lf.percentile(0.95)) * 1000).toFixed(0)}
                  unit="mm/s"
                />
                <Readout label="Peak" value={(lf.peak * 1000).toFixed(0)} unit="mm/s" tone="danger" />
                <Readout label="RMS" value={(lf.rms * 1000).toFixed(0)} unit="mm/s" />
                <Readout
                  label="Bump : rebound"
                  value={`${(lf.bumpFraction * 100).toFixed(0)} : ${((1 - lf.bumpFraction) * 100).toFixed(0)}`}
                />
              </Readouts>
              {verdict && (
                <div style={{ padding: '0 12px 12px' }}>
                  <Verdict
                    headline={verdict.headline}
                    tone={verdict.lowSpeedFraction > 0.9 ? 'ok' : verdict.lowSpeedFraction > 0.7 ? 'front' : 'rear'}
                  >
                    {verdict.detail}
                  </Verdict>
                </div>
              )}
              <div className="panel-note">
                The yellow line is <strong>your knee</strong>, on the same axis. If it sits
                where the histogram is empty, moving it changes nothing about how this car
                behaves on this circuit — which is exactly the session Ch 22 says teams waste.
                <br />
                <br />
                Note this is <strong>wheel</strong> velocity, not shock velocity. The
                conversion is linear through the installation ratio ({rates.front.installationRatio.toFixed(2)}
                ), and reading a histogram in the wrong one puts every band in the wrong place
                while still looking entirely plausible.
              </div>
            </>
          )}
        </Panel>

        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="What theory can and cannot tell you">
          <Explain
            seeing={
              <>
                A force–velocity curve, the two modes it has to serve, the transient balance
                it produces, and the load variation it exists to suppress. Four things, and
                between them they are most of what damper theory actually determines.
              </>
            }
            look={
              <>
                What is <em>missing</em>. There is no road in this model, no driver, no
                temperature, no hysteresis, and no coupling between the four corners. The
                real case is a nonlinear, hysteretic, temperature-dependent, four-corner
                system excited by a non-stationary random road plus driver inputs plus
                aerodynamic loads — and the gap between the quarter-car model and a damper
                programme is filled by <strong>rig testing and track data</strong>, not by
                more algebra.
              </>
            }
            matters={
              <>
                Because knowing which questions theory answers keeps you from over-adjusting.
                It tells you the damping ratio your body motion needs, that your two modes
                are far enough apart to tune separately, that a damper cannot move
                steady-state balance, and that load variation costs grip quadratically. It
                does <em>not</em> tell you where to put the knee, and no amount of modelling
                will.
                <br />
                <br />
                The tool that does is a <strong>damper velocity histogram</strong> from track
                data: it shows what fraction of the lap is spent in each velocity band, and
                hence which part of the curve actually matters on that circuit. A team
                adjusting the high-speed knee on a smooth track where 90% of the time is below
                50 mm/s is wasting its session.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

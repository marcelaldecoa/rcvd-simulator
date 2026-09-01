/**
 * Chapter 19 lab -- steering systems.
 *
 * The chapter's argument is that the steering wheel is an INSTRUMENT before it
 * is a control, and that most of the design decisions are about protecting the
 * one term in the torque equation that carries information:
 *
 *     M = F_y (t_p + t_m) + F_z (KPI, caster jacking) + F_x (scrub) + friction
 *
 * Only the first term knows anything about what the front tyres are doing, and
 * only the PNEUMATIC half of its trail collapses at the limit. So caster --
 * which is good for camber -- dilutes the front-limit warning, and the chapter
 * refuses to give a universal answer. This lab is where the trade becomes a
 * number instead of an opinion.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  FORMULA_STEERING,
  ROAD_STEERING,
  ackermannSweep,
  aligningComplianceCoefficient,
  bumpSteerToe,
  feedbackQuality,
  lostSteerFromCompliance,
  mechanicalTrail,
  rideHeightChange
} from '@core/vehicle/steering.js'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { rideRate, wheelRate } from '@core/vehicle/rates.js'
import { derive } from '@core/vehicle/params.js'
import { toDeg, toRad } from '@core/util/numeric.js'

const AY = 1.4

export function SteeringLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const steering = useGarage((s) => s.steering)
  const setSteering = useGarage((s) => s.setSteering)
  const setCompliance = useGarage((s) => s.setCompliance)
  const tire = useGarage((s) => s.tire)
  const aero = useGarage((s) => s.aero)
  const rates = useGarage((s) => s.rates)

  const v = derive(vehicle)
  const tireF = useMemo(() => new MagicFormulaTire(tire), [tire])

  /**
   * Pneumatic trail from the real tyre, sampled relative to that tyre's OWN
   * peak rather than at fixed slip angles.
   *
   * Fixed angles do not travel between tyres: this tyre at this load peaks at
   * about 4.6 deg, so a hard-coded "8 deg for the peak" lands well past the
   * trail's zero crossing and reports a negative trail. Sampling at 60% of the
   * peak angle and at the peak itself keeps the two conditions meaningful for
   * any tyre and any load.
   */
  const trail = useMemo(() => {
    const fz = v.wf / 2
    const peakAlpha = tireF.peakFy(fz).at
    return {
      peakAlpha,
      linear: tireF.pneumaticTrail(peakAlpha * 0.4, fz),
      atPeak: tireF.pneumaticTrail(peakAlpha, fz)
    }
  }, [tireF, v.wf])

  const feedback = useMemo(
    () =>
      feedbackQuality({
        rollingRadius: steering.rollingRadius,
        casterDeg: steering.caster,
        pneumaticTrailLinear: trail.linear,
        pneumaticTrailAtPeak: trail.atPeak,
        peakForce: v.wf * AY
      }),
    [steering.rollingRadius, steering.caster, trail, v.wf]
  )

  const lost = useMemo(
    () =>
      lostSteerFromCompliance({
        axleLateralForce: v.wf * AY,
        totalTrail: trail.linear + mechanicalTrail(steering.rollingRadius, steering.caster),
        degPer100Nm: steering.compliancePer100Nm,
        ratio: steering.ratio,
        ay: AY
      }),
    [v.wf, trail.linear, steering]
  )

  const budgetCoefficient = aligningComplianceCoefficient(
    steering.compliancePer100Nm,
    steering.ratio
  )

  // --- trail against slip angle: the signal, drawn ------------------------
  const trailChart: Series[] = useMemo(() => {
    const tm = mechanicalTrail(steering.rollingRadius, steering.caster)
    const fz = v.wf / 2
    const pts = Array.from({ length: 51 }, (_, i) => {
      const a = (14 * i) / 50
      const tp = tireF.pneumaticTrail(toRad(a), fz)
      const fy = 2 * tireF.fy(toRad(a), fz)
      return { a, tp, total: tp + tm, torque: fy * (tp + tm), fy }
    })
    return [
      {
        name: 'Total trail (mm)',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.a, y: p.total * 1000 }))
      },
      {
        name: 'Pneumatic trail alone (mm)',
        color: '#ff9f4d',
        points: pts.map((p) => ({ x: p.a, y: p.tp * 1000 }))
      },
      {
        name: 'Mechanical trail from caster (mm)',
        color: '#5f6f80',
        dashed: true,
        points: pts.map((p) => ({ x: p.a, y: tm * 1000 }))
      }
    ]
  }, [steering.rollingRadius, steering.caster, tireF, v.wf])

  const torqueChart: Series[] = useMemo(() => {
    const tm = mechanicalTrail(steering.rollingRadius, steering.caster)
    const fz = v.wf / 2
    const pts = Array.from({ length: 51 }, (_, i) => {
      const a = (14 * i) / 50
      const tp = tireF.pneumaticTrail(toRad(a), fz)
      const fy = 2 * tireF.fy(toRad(a), fz)
      return { a, torque: (fy * (tp + tm)) / steering.ratio, fy }
    })
    const maxFy = Math.max(...pts.map((p) => p.fy))
    const maxT = Math.max(...pts.map((p) => p.torque))
    return [
      {
        name: 'Steering wheel torque (N·m)',
        color: '#5aa9ff',
        points: pts.map((p) => ({ x: p.a, y: p.torque }))
      },
      {
        name: 'Front axle force (scaled to the same peak)',
        color: '#6ee787',
        dashed: true,
        points: pts.map((p) => ({ x: p.a, y: (p.fy / maxFy) * maxT }))
      }
    ]
  }, [steering, tireF, v.wf])

  const ackermannChart: Series[] = useMemo(() => {
    const sweep = ackermannSweep(steering.ackermann, chassis.trackFront, v.L)
    return [
      {
        name: 'Inside wheel, this geometry',
        color: '#5aa9ff',
        points: sweep.map((p) => ({ x: p.outer, y: p.actual }))
      },
      {
        name: '100% Ackermann',
        color: '#4dd6c1',
        dashed: true,
        points: sweep.map((p) => ({ x: p.outer, y: p.ideal }))
      },
      {
        name: 'Parallel steer',
        color: '#5f6f80',
        dashed: true,
        points: sweep.map((p) => ({ x: p.outer, y: p.outer }))
      }
    ]
  }, [steering.ackermann, chassis.trackFront, v.L])

  /**
   * How far the front axle sinks between 40 and 80 m/s.
   *
   * The front axle's SHARE of the downforce, over the front axle's RIDE rate
   * (both wheels, tyre in series) -- not the whole car's downforce over a wheel
   * rate, which overstates it several times over.
   */
  const rideDrop = useMemo(() => {
    const kw = wheelRate(rates.front.springRate, rates.front.installationRatio)
    const axleRideRate = 2 * rideRate(kw, rates.front.tireRate)
    return rideHeightChange(aero.clA * aero.aeroBalance, aero.rho, 40, 80, axleRideRate)
  }, [rates.front, aero.clA, aero.aeroBalance, aero.rho])
  const speedToe = bumpSteerToe(rideDrop, steering.bumpSteerPer10mm)

  const clarity = feedback.signalClarity
  /**
   * The threshold is anchored to the chapter's own two worked cases rather than
   * picked: Ex 19.2, which it calls acceptable feedback, sits at 45%, and Ex
   * 19.3, which it says has buried the cue, sits at 28%.
   */
  const verdict =
    clarity > 0.35
      ? {
          headline: 'The limit will be announced',
          tone: 'ok' as const,
          detail: (
            <>
              Pneumatic trail is comparable to the caster trail, so its collapse survives
              into the torque the driver feels. The steering goes light relative to the
              cornering as the front approaches its peak, which is the cue.
            </>
          )
        }
      : {
          headline: 'The limit warning is buried',
          tone: 'front' as const,
          detail: (
            <>
              At this load the tyre only makes{' '}
              <strong>{(trail.linear * 1000).toFixed(1)} mm</strong> of pneumatic trail in
              its linear range, against <strong>
                {(feedback.mechanicalTrail * 1000).toFixed(1)} mm
              </strong>{' '}
              from {steering.caster.toFixed(1)}° of caster. Total trail therefore barely
              changes as the tyre saturates, the torque keeps tracking the force, and the
              driver gets no distinct signal.
              <br />
              <br />
              Worth noticing <em>why</em> rather than just that: this is a light car, so the
              front tyres carry little load, so the contact patch is short and its trail is
              small. The same caster that is moderate on a heavy car is a lot on this one.
              Take caster down toward 2–3° and the cue comes back.
            </>
          )
        }

  const experiments: Experiment[] = [
    {
      title: 'Buy camber with caster, and see what it costs',
      action: 'Take caster from 6° to 12° and watch the trail chart and the torque chart.',
      predict: 'Does the driver still get told the front is at its limit?',
      result: (
        <>
          Doubling caster roughly doubles the caster-induced camber gain, which is genuinely
          useful at the loaded outside wheel. It also roughly doubles steering effort, and —
          the part that matters — it{' '}
          <strong>roughly halves the visibility of the front-limit warning</strong>. The
          pneumatic component collapses just as much as before, but it is now a small
          fraction of a large total.
          <br />
          <br />
          Ch 19 §7's rule falls straight out of the picture: keep mechanical trail{' '}
          <em>comparable to or smaller than</em> pneumatic trail at moderate slip. If camber
          is what you want, take it from the suspension geometry of Chapter 17, where it
          costs no feedback.
        </>
      ),
      run: () => setSteering({ caster: 12 }),
      reset: () => setSteering({ caster: FORMULA_STEERING.caster })
    },
    {
      title: 'Measure understeer through a compliant column',
      action: 'Raise the steering compliance toward a road car’s and read the lost steer.',
      predict: 'How much understeer does the car appear to have that it does not?',
      result: (
        <>
          At this trail and lateral force the system gives up{' '}
          <strong>{lost.roadWheelLost.toFixed(2)}°</strong> of road wheel steer, which reads
          as <strong>{lost.apparentUndersteer.toFixed(2)} deg/g</strong> of understeer that
          the car does not have. On a race car whose whole gradient might be 1–2 deg/g, that
          is a large fraction of the measurement.
          <br />
          <br />
          Worse, it is not a constant offset — it grows with lateral acceleration, so it
          corrupts the <em>shape</em> of K(A<sub>y</sub>) and makes the car look as though it
          develops terminal understeer it does not have. Ch 11's remedy: measure steer at
          the road wheel, or measure the compliance separately and correct.
        </>
      ),
      run: () => setSteering({ compliancePer100Nm: 0.9 }),
      reset: () => setSteering({ compliancePer100Nm: FORMULA_STEERING.compliancePer100Nm })
    },
    {
      title: 'Choose Ackermann for the corner you actually care about',
      action: 'Sweep Ackermann from anti (−30%) through parallel to pro (100%).',
      predict: 'Where on the chart does the choice actually matter?',
      result: (
        <>
          Almost nowhere at small steer angles, and a great deal at large ones. At 6° of
          outside steer, 100% Ackermann asks for only 0.4° more on the inside wheel; at 20°
          it asks for nearly 5°.
          <br />
          <br />
          That asymmetry <em>is</em> the design rule. A high-downforce car spends its
          critical time at high lateral acceleration and small steer angles, where the inside
          front is nearly unloaded and peaks at a <em>lower</em> slip angle — so giving it
          extra steer is exactly backwards, and anti-Ackermann is right. An autocross car
          lives at large steer angles and lower g, where the geometric requirement dominates
          and pro-Ackermann keeps both tyres near their kinematically correct angles.
        </>
      ),
      run: () => setSteering({ ackermann: 100 }),
      reset: () => setSteering({ ackermann: FORMULA_STEERING.ackermann })
    },
    {
      title: 'Let the car steer itself down the straight',
      action: 'Raise bump steer toward a sloppy 0.06°/10 mm and look at the speed-toe readout.',
      predict: 'Is bump steer a bump problem or a speed problem?',
      result: (
        <>
          On a downforce car, <strong>both</strong> — and the speed problem is the worse one.
          Ride height is a function of speed, so a bump steer curve becomes a continuous,
          speed-dependent alignment change. Here the car picks up{' '}
          <strong>{speedToe.total.toFixed(3)}° of toe</strong> between 40 and 80 m/s, purely
          from sinking on its springs.
          <br />
          <br />
          Toe-out is destabilising, so the car feels nervous exactly where nervousness is
          least welcome, scrubs and heats its tyres on the straights, and shifts its balance
          with speed in a way that is easily confused with an aero balance shift. This is why
          the modern target is under 0.02°/10 mm across the working travel rather than merely
          "small at static ride height".
        </>
      ),
      run: () => setSteering({ bumpSteerPer10mm: 0.06 }),
      reset: () => setSteering({ bumpSteerPer10mm: FORMULA_STEERING.bumpSteerPer10mm })
    },
    {
      title: 'Send the compliance coefficient to the understeer budget',
      action: 'Apply this steering system’s measured compliance to the Ch 5 budget.',
      predict: 'Which row of the budget does a steering column land in?',
      result: (
        <>
          The <strong>aligning torque compliance steer</strong> row. Ch 5 §4.1 lists it
          without saying where the number comes from; it comes from here, as{' '}
          {budgetCoefficient.toFixed(3)} deg per kN·m. Ch 23 §2 notes that the steering
          system and the tyre carcass are usually the two largest compliances on a
          well-built race car — and neither of them is a suspension bushing.
        </>
      ),
      run: () => setCompliance('front', { aligningComplianceSteer: budgetCoefficient })
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        The steering wheel is an <strong>instrument</strong> before it is a control. Only one
        term in the torque reaching the driver's hands knows anything about the front tyres,
        and only half of that term collapses at the limit — which is why every choice on this
        page is really a choice about how clearly the car can speak.
      </div>

      <div className="stage">
        <Panel
          title="Trail, and what survives to the limit"
          reference="Ch 19 §2 and Ex 19.2–19.3"
          note={
            <>
              <strong>Pneumatic trail collapses</strong> as the contact patch slides — that
              collapse is the front-limit warning. <strong>Mechanical trail does not.</strong>{' '}
              The grey line is a constant, so the more caster you run, the less of the tyre's
              own signal is left in the total.
            </>
          }
        >
          <Chart
            series={trailChart}
            height={250}
            xLabel="Front slip angle (deg)"
            yLabel="Trail (mm)"
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(0)}
          />
          <Chart
            series={torqueChart}
            height={200}
            xLabel="Front slip angle (deg)"
            yLabel="Steering wheel torque (N·m)"
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
          />
          <div className="panel-note">
            The green dashed line is the axle force, scaled to the same peak. Where the blue
            line falls away from it, the steering is going light relative to the cornering —
            and that gap is the entire front-limit cue.
            <br />
            <br />
            <strong>Signal clarity</strong> is the fraction of total trail that is the
            collapsing part, t<sub>p</sub>/(t<sub>p</sub> + t<sub>m</sub>). Caster does not
            change how many millimetres the trail drops; it changes how large that drop is
            relative to the total, which is what a driver can perceive. The chapter's own two
            cases put the useful boundary near 35%.
          </div>
        </Panel>

        <div className="stack">
          <Panel
            title="The steering system"
            right={
              <ButtonRow
                options={[
                  { value: 'race', label: 'Formula' },
                  { value: 'road', label: 'Road car' }
                ]}
                value={steering.ratio < 14 ? 'race' : 'road'}
                onChange={(x) => setSteering(x === 'race' ? FORMULA_STEERING : ROAD_STEERING)}
              />
            }
          >
            <Slider
              label="Caster"
              unit="deg"
              value={steering.caster}
              min={0}
              max={14}
              step={0.25}
              digits={2}
              onChange={(caster) => setSteering({ caster })}
            />
            <Slider
              label="Steering ratio"
              unit=": 1"
              value={steering.ratio}
              min={6}
              max={22}
              step={0.5}
              digits={1}
              onChange={(ratio) => setSteering({ ratio })}
            />
            <Slider
              label="System compliance"
              unit="deg/100 N·m"
              value={steering.compliancePer100Nm}
              min={0}
              max={1.4}
              step={0.02}
              digits={2}
              onChange={(compliancePer100Nm) => setSteering({ compliancePer100Nm })}
            />
            <Slider
              label="Ackermann"
              unit="%"
              value={steering.ackermann}
              min={-40}
              max={120}
              step={5}
              digits={0}
              onChange={(ackermann) => setSteering({ ackermann })}
            />
            <Slider
              label="Bump steer"
              unit="deg/10 mm"
              value={steering.bumpSteerPer10mm}
              min={0}
              max={0.08}
              step={0.002}
              digits={3}
              onChange={(bumpSteerPer10mm) => setSteering({ bumpSteerPer10mm })}
            />
            <Slider
              label="Scrub radius"
              unit="mm"
              value={steering.scrubRadius * 1000}
              min={-30}
              max={40}
              step={1}
              digits={0}
              onChange={(mm) => setSteering({ scrubRadius: mm / 1000 })}
            />
          </Panel>

          <Panel title="What the driver gets" reference="Ch 19 §7">
            <Readouts>
              <Readout
                label="Mechanical trail"
                value={(feedback.mechanicalTrail * 1000).toFixed(1)}
                unit="mm"
              />
              <Readout
                label={`Pneumatic trail at ${toDeg(trail.peakAlpha * 0.4).toFixed(1)}°`}
                value={(trail.linear * 1000).toFixed(1)}
                unit="mm"
                tone="rear"
              />
              <Readout
                label={`…at the peak, ${toDeg(trail.peakAlpha).toFixed(1)}°`}
                value={(trail.atPeak * 1000).toFixed(1)}
                unit="mm"
              />
              <Readout
                label="Total trail retained"
                value={`${(feedback.trailRetained * 100).toFixed(0)}%`}
              />
              <Readout
                label="Torque rises"
                value={`${(feedback.torqueRise * 100).toFixed(0)}%`}
                tone="front"
              />
              <Readout
                label="…while force rises"
                value={`${(feedback.forceRise * 100).toFixed(0)}%`}
                tone="ok"
              />
              <Readout
                label="Signal clarity"
                value={`${(clarity * 100).toFixed(0)}%`}
                tone={clarity > 0.6 ? 'ok' : 'danger'}
              />
            </Readouts>
            <div style={{ padding: '0 12px 12px' }}>
              <Verdict headline={verdict.headline} tone={verdict.tone}>
                {verdict.detail}
              </Verdict>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Ackermann, and why race cars run the other way"
          reference="Ch 19 §3 and Ex 19.6"
          note={
            <>
              The gap between the teal and grey lines is what 100% Ackermann asks for. It is
              almost nothing at racing steer angles and large in a hairpin — which is the
              whole argument for choosing the geometry to suit the fast corners.
            </>
          }
        >
          <Chart
            series={ackermannChart}
            height={240}
            xLabel="Outside wheel steer (deg)"
            yLabel="Inside wheel steer (deg)"
            zeroY={false}
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(1)}
          />
          <div className="panel-note">
            Peak slip angle <strong>rises with vertical load</strong>. At racing lateral
            acceleration the inside front is nearly unloaded, so it peaks at a{' '}
            <em>lower</em> slip angle than the outside — and Ackermann, which gives it{' '}
            <em>more</em> steer, pushes it further past its own peak for no force and a lot
            of heat. Hence anti-Ackermann on downforce cars and pro-Ackermann where the
            corners are tight and the loads are even.
          </div>
        </Panel>

        <Panel
          title="Compliance, and the understeer it invents"
          reference="Ch 19 §4 and Ex 19.4"
          note={
            <>
              Every degree the column, rack, tie rods and arms give up is a degree the driver
              added and the road wheels never saw — so it reads as understeer the car does
              not have.
            </>
          }
        >
          <Formula
            tex={String.raw`\Delta K = \frac{\Delta\delta_{\text{lost}}}{A_y} = \frac{F_y\,(t_p+t_m)\,C_{\text{sys}}}{G\,A_y}`}
            block
          />
          <Readouts>
            <Readout label={`Front force at ${AY} g`} value={((v.wf * AY) / 1000).toFixed(2)} unit="kN" />
            <Readout label="Aligning moment" value={lost.moment.toFixed(0)} unit="N·m" />
            <Readout label="Lost at the handwheel" value={lost.handwheelLost.toFixed(2)} unit="deg" />
            <Readout
              label="Lost at the road wheel"
              value={lost.roadWheelLost.toFixed(3)}
              unit="deg"
              tone="warn"
            />
            <Readout
              label="Apparent understeer"
              value={`+${lost.apparentUndersteer.toFixed(3)}`}
              unit="deg/g"
              tone="danger"
            />
            <Readout
              label="Budget coefficient"
              value={budgetCoefficient.toFixed(3)}
              unit="deg/kN·m"
              tone="accent"
            />
          </Readouts>
          <div className="panel-note">
            The last number is what Chapter 5's understeer budget calls{' '}
            <strong>aligning torque compliance steer</strong>. The budget lists the row; this
            is where the number in it comes from.
          </div>
          <Readouts>
            <Readout
              label="Ride height drop, 40→80 m/s"
              value={rideDrop.toFixed(1)}
              unit="mm"
            />
            <Readout
              label="Toe it produces"
              value={speedToe.total.toFixed(3)}
              unit="deg"
              tone={speedToe.total > 0.1 ? 'danger' : 'ok'}
            />
          </Readouts>
          <div className="panel-note">
            Bump steer on a downforce car is not a bump problem. Ride height falls with speed,
            so the alignment changes down the straight — a continuous, speed-dependent toe
            change confounded with the aero balance shift.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Protecting the one informative term">
          <Explain
            seeing={
              <>
                The torque path from the front contact patches to the driver's hands, and how
                much of the tyre's own behaviour survives it. Trail on the left, the torque it
                produces underneath, and the two things that dilute it — caster and compliance
                — on the right.
              </>
            }
            look={
              <>
                Where the torque curve <em>stops tracking</em> the force curve. That divergence
                is the front axle telling the driver it is near its peak, and it exists only
                because pneumatic trail collapses. Anything that adds constant trail — caster,
                mostly — makes the divergence smaller.
              </>
            }
            matters={
              <>
                Because a driver at the limit is running a control loop on this signal. Ch 19
                §7's design objective is simply to keep <em>F<sub>y</sub>(t<sub>p</sub> +
                t<sub>m</sub>)</em> dominant and everything else small: minimise KPI-driven and
                friction terms, keep the rack free of stiction, and if power assistance is used
                make it torque-<em>proportional</em> so the shape of the curve survives.
                <br />
                <br />
                And the trade has no universal answer. More caster gives camber where it is
                wanted and takes away the warning. Teams resolve it by measuring, and by giving
                the driver the choice.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

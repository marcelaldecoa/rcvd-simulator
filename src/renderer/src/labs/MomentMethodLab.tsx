/**
 * Chapter 8 lab -- the MRA Moment Method.
 *
 * Every other lab in Part I imposes yaw equilibrium, so each steer angle admits
 * exactly one answer. This one takes the constraint away and asks what the car
 * does at attitudes it cannot hold -- which is most of a lap.
 *
 * Three things the rest of the course cannot show, and which this lab is built
 * around:
 *
 *   1. The vertical axis is not decoration. N/Izz is the rate at which the car
 *      is leaving the state you are looking at (Ex 8.6), so height above the
 *      trim line is literally "how fast this is going wrong".
 *   2. Understeer is a RATIO, not a primitive. Stability and control are the
 *      two real numbers, and a car can be short of either one.
 *   3. The gap between the most Ay the car can make and the most it can trim
 *      is performance the balance is throwing away -- and the map says which
 *      of the two repairs applies.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { MMMPlot } from '../components/MMMPlot'
import { MMMAttitude } from '../components/MMMAttitude'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { rearTireParams, stiffnessFromTires, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { scaleTireGrip } from '@core/tire/scale.js'
import { derive } from '@core/vehicle/params.js'
import { summarise } from '@core/vehicle/steadyState.js'
import { pairLimit } from '@core/vehicle/pairAnalysis.js'
import { aeroLoads } from '@core/aero/index.js'
import {
  maxTrimmedAy,
  mmmDiagram,
  mmmPoint,
  stabilityAndControl,
  trimAtSteer,
  type MMMOptions
} from '@core/vehicle/momentMethod.js'
import { toDeg, toRad } from '@core/util/numeric.js'

/** Stiffness multipliers swept for the stability-vs-control chart. */
const STIFFNESS_SWEEP = [0.6, 0.75, 0.9, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0]

export function MomentMethodLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const setChassis = useGarage((s) => s.setChassis)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)
  const setRearGrip = useGarage((s) => s.setRearGripScale)
  const aero = useGarage((s) => s.aero)
  const setAero = useGarage((s) => s.setAero)
  const speed = useGarage((s) => s.speed)

  const [betaDeg, setBetaDeg] = useState(-3)
  const [steerDeg, setSteerDeg] = useState(2)
  const [showSteer, setShowSteer] = useState(true)
  const [showBeta, setShowBeta] = useState(true)

  const tireF = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireR = useMemo(
    () => new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale)),
    [tire, rearTireScale, rearGripScale]
  )

  const d = derive(vehicle)
  const loads = useMemo(() => aeroLoads(aero, speed), [aero, speed])

  const options: MMMOptions = useMemo(
    () => ({
      vehicle,
      chassis,
      tireFront: tireF,
      tireRear: tireR,
      aero: { front: loads.front, rear: loads.rear },
      // Ten degrees of road-wheel steer at racing speed is off the end of
      // anything real; six is enough to close the map and leaves the contour
      // fan legible. The trim line is solved on its own grid regardless.
      steerRange: toRad(6),
      betaRange: toRad(12),
      lines: 13
    }),
    [vehicle, chassis, tireF, tireR, loads.front, loads.rear]
  )

  const diagram = useMemo(() => mmmDiagram(options), [options])
  const point = useMemo(
    () => mmmPoint(options, toRad(betaDeg), toRad(steerDeg)),
    [options, betaDeg, steerDeg]
  )

  /** The Ch 7 answer, for the cross-check that the two chapters agree. */
  const fromPair = useMemo(
    () =>
      pairLimit(vehicle, chassis, tireF, tireR, 0, { front: loads.front, rear: loads.rear })
        .limitAy,
    [vehicle, chassis, tireF, tireR, loads.front, loads.rear]
  )
  const solvedTrimLimit = useMemo(() => maxTrimmedAy(options), [options])

  /** Yaw acceleration at the current state -- Ex 8.6. */
  const yawAccel = point.yawMoment / vehicle.izz
  const ayAfter = (speed * yawAccel * 0.3) / 9.80665

  /**
   * Ch 5's K, computed from the stiffnesses these tyres ACTUALLY have right now
   * rather than from the vehicle's stored cf/cr.
   *
   * The garage keeps cf and cr as explicit parameters, synced from the tyres
   * only when asked — which is the right design elsewhere, and exactly wrong
   * here. Putting a stale linear number next to a live one implies they should
   * agree and then shows them disagreeing for a reason that has nothing to do
   * with Chapter 8.
   */
  const linearK = useMemo(
    () =>
      summarise({
        ...vehicle,
        ...stiffnessFromTires(vehicle, tire, rearTireScale, rearGripScale)
      }).KDeg,
    [vehicle, tire, rearTireScale, rearGripScale]
  )
  const mapK = toDeg(diagram.understeerFromRatio)

  // --- the trim line in the plane the driver lives in ---------------------
  // Solved point by point rather than by building a second whole diagram: this
  // chart wants only the N = 0 crossings, and the contours and envelope that
  // come with a diagram are most of its cost.
  const trimChart: Series[] = useMemo(() => {
    const n = 61
    // Swept wider than the drawn contours on purpose: with downforce the turn-
    // over sits past six degrees, and a chart that stops before the peak shows
    // a curve that merely flattens, which is a different claim.
    const range = toRad(11)
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const steer = (range * i) / (n - 1)
      const t = trimAtSteer(options, steer)
      if (t) pts.push({ x: toDeg(steer), y: t.ay })
    }
    return [{ name: 'Trimmed Ay (the car can hold this)', color: '#4dd6c1', points: pts }]
  }, [options])

  // --- stability and control are not the same thing -----------------------
  const derivativeSweep = useMemo(() => {
    const at = (k: number): { k: number; stability: number; control: number; kDeg: number } => {
      const f = new MagicFormulaTire(scaleTireGrip(tire, { stiffness: k }))
      const r = new MagicFormulaTire(
        scaleTireGrip(rearTireParams(tire, rearTireScale, rearGripScale), { stiffness: k })
      )
      const sc = stabilityAndControl({ ...options, tireFront: f, tireRear: r })
      return { k, stability: sc.stability, control: sc.control, kDeg: toDeg(sc.understeerFromRatio) }
    }
    return STIFFNESS_SWEEP.map(at)
  }, [options, tire, rearTireScale, rearGripScale])

  const derivativeCurves: Series[] = useMemo(() => {
    const base = derivativeSweep.find((p) => p.k === 1)
    if (!base) return []
    const rel = (v: number, b: number): number => (Math.abs(b) > 1e-9 ? v / b : 0)
    return [
      {
        name: 'Control  ∂N/∂δ',
        color: '#5aa9ff',
        points: derivativeSweep.map((p) => ({ x: p.k, y: rel(p.control, base.control) }))
      },
      {
        name: 'Stability  ∂N/∂Ay',
        color: '#ff9f4d',
        points: derivativeSweep.map((p) => ({ x: p.k, y: rel(p.stability, base.stability) }))
      },
      {
        name: 'Understeer K (their ratio)',
        color: '#4dd6c1',
        points: derivativeSweep.map((p) => ({ x: p.k, y: rel(p.kDeg, base.kDeg) }))
      }
    ]
  }, [derivativeSweep])

  const totalBar = chassis.barRollStiffnessFront + chassis.barRollStiffnessRear
  const onTrim = Math.abs(point.yawMoment) < 40

  const verdict = onTrim
    ? {
        headline: 'The car can hold this',
        tone: 'ok' as const,
        detail: (
          <>
            The yaw moment is essentially zero, so forces <em>and</em> moments balance. This
            is a steady-state point — one of the states Chapters 5 and 7 compute. Every
            such point lies on the teal line.
          </>
        )
      }
    : point.yawMoment > 0
      ? {
          headline: `Rotating in at ${toDeg(yawAccel).toFixed(0)}°/s²`,
          tone: 'rear' as const,
          detail: (
            <>
              A net positive moment is turning the car further into the corner. Nobody is
              holding this attitude — the car is passing through it. Left alone for 0.3 s
              the yaw rate builds by {(yawAccel * 0.3).toFixed(2)} rad/s, which at{' '}
              {speed.toFixed(0)} m/s is another <strong>{ayAfter.toFixed(2)} g</strong> of
              lateral acceleration. That is the departure.
            </>
          )
        }
      : {
          headline: `Straightening at ${Math.abs(toDeg(yawAccel)).toFixed(0)}°/s²`,
          tone: 'front' as const,
          detail: (
            <>
              A net negative moment is turning the car back out of the corner — the
              restoring direction. This is what stability <em>is</em>: leave the trim line
              and the car generates a moment that pushes you back toward it.
            </>
          )
        }

  const experiments: Experiment[] = [
    {
      title: 'Read the vertical axis as a clock',
      action: 'Push sideslip to one edge with the steering left near zero.',
      predict: 'What does a point far above or below the trim line actually mean?',
      result: (
        <>
          It means the state is <strong>not survivable for long</strong>. Divide N by Izz
          and you have yaw acceleration; the right-hand axis is already doing that for you.
          A few hundred degrees per second squared means the car leaves that attitude in a
          fraction of a second. So the map's vertical extent is the car's{' '}
          <strong>rotational authority</strong> — how fast a driver can rotate it into a
          hairpin — and its vertical distance from the trim line is how quickly whatever
          you are looking at is going wrong.
        </>
      ),
      run: () => {
        setBetaDeg(-11)
        setSteerDeg(0)
      },
      reset: () => {
        setBetaDeg(-3)
        setSteerDeg(2)
      }
    },
    {
      title: 'Turn the front bar up and watch two numbers move opposite ways',
      action: 'Put most of the anti-roll bar on the front axle.',
      predict: 'Does the car get better or worse?',
      result: (
        <>
          Both, and that is the point of Ch 8 §6. Front bar moves load transfer forward, so
          the front axle saturates earlier and the <strong>maximum trimmed Ay falls</strong>
          . But the same change makes the car resist leaving trim more firmly —{' '}
          <strong>stability rises</strong>. Steady-state analysis reports one number and
          hides the trade; the map shows you are buying calm with grip.
        </>
      ),
      run: () =>
        setChassis({
          barRollStiffnessFront: totalBar * 0.9,
          barRollStiffnessRear: totalBar * 0.1
        }),
      reset: () => setChassis({ barRollStiffnessFront: 27000, barRollStiffnessRear: 12000 })
    },
    {
      title: 'Take grip off the rear and find terminal oversteer',
      action: 'Drop rear grip below the front.',
      predict: 'What stops the trim line — the tyres, or the car?',
      result: (
        <>
          <strong>The car.</strong> With the rear giving up first, following the trim line
          outward eventually reaches constant-δ lines whose slope has turned{' '}
          <em>positive</em>: more Ay now makes more positive yaw moment, which makes more Ay
          — a divergence. The equilibrium still exists mathematically, but nobody can hold
          it open-loop. Notice the envelope still extends to the right of where the usable
          trim line stops. That red band is real force capability rendered unreachable by
          balance, and it is why Ch 8 §5 insists the trim line can terminate against a{' '}
          <em>stability</em> boundary rather than a tyre one.
        </>
      ),
      run: () => setRearGrip(0.84),
      reset: () => setRearGrip(1.12)
    },
    {
      title: 'Move the aero balance rearward',
      action: 'Shift the centre of pressure back.',
      predict: 'Trimmed limit up or down? And what does it cost?',
      result: (
        <>
          Rearward aero loads the rear axle, so the trimmed limit goes <strong>up</strong> —
          the car will hold more g. What it costs is on the vertical axis: the available
          yaw moment shrinks, so the car becomes <strong>stable and reluctant</strong>. It
          will not rotate. Ch 8 §7 is blunt about the consequence — lap time is not
          maximised by peak trimmed Ay alone, because a car that cannot be rotated on entry
          brakes later, turns later and gets on power later.
        </>
      ),
      run: () => setAero({ aeroBalance: 0.34 }),
      reset: () => setAero({ aeroBalance: 0.45 })
    },
    {
      title: 'Stiffen every tyre and see which derivative moves',
      action:
        'Look at the stability-and-control chart. Follow the three lines to the right of 1.0.',
      predict: 'Stiffer tyres — sharper, more stable, or both?',
      result: (
        <>
          <strong>Sharper only.</strong> Control climbs almost in proportion with stiffness;
          stability barely moves. The algebra says why: stability is{' '}
          <em>W(a·C_f − b·C_r)/(C_f + C_r)</em>, and scaling both stiffnesses scales the top
          and bottom alike. Control is <em>L·C_f·C_r/(C_f + C_r)</em>, which scales.
          <br />
          <br />
          And since understeer is their ratio, the car also gets{' '}
          <strong>less understeering</strong> — which is exactly Ch 5's K = W_f/C_f −
          W_r/C_r seen from the other side. Three facts that look independent are one fact.
        </>
      )
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Every other chapter makes the car obey yaw equilibrium, so each steer angle has one
        answer. Here that constraint is <strong>removed</strong>: the car is held at a
        sideslip and a steer angle it may have no way of sustaining, and we record what it
        makes. Most of a lap happens off the trim line.
      </div>

      <div className="stage">
        <Panel
          title="The MMM diagram"
          reference="Ch 8 §3"
          right={
            <div className="btn-row">
              <button
                className={`btn${showSteer ? ' active' : ''}`}
                onClick={() => setShowSteer(!showSteer)}
              >
                constant δ
              </button>
              <button
                className={`btn${showBeta ? ' active' : ''}`}
                onClick={() => setShowBeta(!showBeta)}
              >
                constant β
              </button>
            </div>
          }
          note={
            <>
              Horizontal is lateral acceleration; vertical is the yaw moment left over.{' '}
              <strong>Only the white line matters to a steady corner</strong> — everything
              off it is a state the car is passing through. Turn one contour family off if
              the grid is hard to read. The right-hand axis is the same yaw moment divided
              by Izz, so a point's height is the rate at which the car is leaving it.
            </>
          }
        >
          <MMMPlot
            diagram={diagram}
            current={point}
            izz={vehicle.izz}
            height={420}
            showSteerLines={showSteer}
            showBetaLines={showBeta}
          />
        </Panel>

        <div className="stack">
          <Panel title="Hold the car here" reference="Ch 8 §2">
            <Slider
              label="Sideslip β"
              unit="deg"
              value={betaDeg}
              min={-12}
              max={12}
              step={0.25}
              digits={2}
              onChange={setBetaDeg}
            />
            <Slider
              label="Road-wheel steer δ"
              unit="deg"
              value={steerDeg}
              min={-10}
              max={10}
              step={0.25}
              digits={2}
              onChange={setSteerDeg}
            />
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  const t = diagram.trimLine.reduce((best, cur) =>
                    Math.abs(toDeg(cur.steer) - steerDeg) < Math.abs(toDeg(best.steer) - steerDeg)
                      ? cur
                      : best
                  )
                  setSteerDeg(Number(toDeg(t.steer).toFixed(2)))
                  setBetaDeg(Number(toDeg(t.beta).toFixed(2)))
                }}
              >
                Snap to the trim line
              </button>
              <button
                className="btn"
                onClick={() => {
                  setBetaDeg(0)
                  setSteerDeg(0)
                }}
              >
                Straight ahead
              </button>
            </div>
            <Readouts>
              <Readout label="Lateral accel" value={point.ay.toFixed(3)} unit="g" tone="accent" />
              <Readout label="Yaw moment N" value={point.yawMoment.toFixed(0)} unit="N·m" />
              <Readout
                label="Yaw acceleration"
                value={toDeg(yawAccel).toFixed(0)}
                unit="deg/s²"
                tone={Math.abs(toDeg(yawAccel)) > 60 ? 'danger' : 'ok'}
              />
              <Readout label="Front slip αf" value={toDeg(point.alphaF).toFixed(2)} unit="deg" tone="front" />
              <Readout label="Rear slip αr" value={toDeg(point.alphaR).toFixed(2)} unit="deg" tone="rear" />
              <Readout label="Front axle Fy" value={(point.fyFront / 1000).toFixed(2)} unit="kN" tone="front" />
            </Readouts>
          </Panel>

          <Panel
            title="What that attitude looks like"
            note={
              <>
                Angles are drawn <strong>true</strong>, not exaggerated — on this map they
                are big enough to see. The path is straight because the basic diagram takes
                zero path curvature: a car sliding down a straight, held there by the rig.
              </>
            }
          >
            <MMMAttitude
              a={vehicle.a}
              b={vehicle.b}
              track={chassis.trackFront}
              beta={toRad(betaDeg)}
              steer={toRad(steerDeg)}
              fyFront={point.fyFront}
              fyRear={point.fyRear}
              yawMoment={point.yawMoment}
              forceScale={Math.max(d.w * diagram.maxAy, 1)}
              momentScale={Math.max(diagram.maxYawMoment, 1)}
              height={260}
            />
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
          title="What the balance is throwing away"
          reference="Ch 8 §5"
          note={
            <>
              The red band on the diagram is the difference between the most lateral
              acceleration this car can produce in <em>any</em> attitude and the most it can
              actually <em>hold</em>. It is grip the tyres have and the balance will not let
              the driver use.
            </>
          }
        >
          <Readouts>
            <Readout label="Max Ay anywhere" value={diagram.maxAy.toFixed(3)} unit="g" tone="danger" />
            <Readout
              label="Max trimmed Ay"
              value={diagram.maxTrimmedAy.toFixed(3)}
              unit="g"
              tone="accent"
            />
            <Readout
              label="Thrown away"
              value={diagram.balanceLoss.toFixed(3)}
              unit="g"
              tone="warn"
            />
            <Readout
              label="Peak yaw moment"
              value={(diagram.maxYawMoment / 1000).toFixed(1)}
              unit="kN·m"
            />
            <Readout
              label="Peak rotation"
              value={toDeg(diagram.maxYawMoment / vehicle.izz).toFixed(0)}
              unit="deg/s²"
            />
          </Readouts>
          <Chart
            series={trimChart}
            height={210}
            xLabel="Road-wheel steer δ (deg)"
            yLabel="Trimmed Ay (g)"
            zeroY={false}
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(2)}
            hRules={[
              { value: diagram.maxAy, label: 'max Ay anywhere', color: '#ff6b6b' },
              { value: solvedTrimLimit, label: 'trimmed limit', color: '#4dd6c1' }
            ]}
          />
          <div className="panel-note">
            The trim line does not run on forever. It rises steeply, flattens, and then{' '}
            <strong>turns back down</strong>: past the front axle's peak, more steer only
            buys more slip angle on the <em>falling</em> side of the tyre curve. The long
            flat stretch is terminal understeer — the driver adds lock and the car does not
            respond — and the peak of it is the trimmed limit.
          </div>
          <Readouts>
            <Readout
              label="Trimmed limit (Ch 8)"
              value={solvedTrimLimit.toFixed(3)}
              unit="g"
              tone="accent"
            />
            <Readout label="Same car via Ch 7 pair analysis" value={fromPair.toFixed(3)} unit="g" />
          </Readouts>
          <div className="panel-note">
            Those two agree, and they must. On the N = 0 line the moment balance forces{' '}
            <em>a·F_yf = b·F_yr</em>, which with <em>F_yf + F_yr = W·Ay</em> splits the
            demand in exactly the static load ratio — the assumption Chapter 7 starts from.
            The Moment Method does not replace the earlier chapters; it contains them along
            one line and adds the rest of the plane.
          </div>
        </Panel>

        <Panel
          title="Understeer is a ratio, not a thing"
          reference="Ch 8 §4"
          note={
            <>
              Stability is how much yaw moment a unit of lateral acceleration produces at
              fixed steer — the car's resistance to leaving trim. Control is how much yaw
              moment the driver can command at fixed lateral acceleration. Understeer is
              what you get when you divide one by the other, which means{' '}
              <strong>two cars with the same K can be short of completely different
              things</strong>.
            </>
          }
        >
          <Formula
            tex={String.raw`K \;\propto\; -\,\frac{\partial N/\partial A_y\big|_{\delta}}{\partial N/\partial\delta\big|_{A_y}}`}
            block
          />
          <Readouts>
            <Readout
              label="Stability ∂N/∂Ay"
              value={diagram.stability.toFixed(0)}
              unit="N·m/g"
              tone={diagram.stability < 0 ? 'ok' : 'danger'}
            />
            <Readout
              label="Control ∂N/∂δ"
              value={(diagram.control / (180 / Math.PI)).toFixed(0)}
              unit="N·m/deg"
              tone="front"
            />
            <Readout
              label="K from the map"
              value={`${mapK >= 0 ? '+' : ''}${mapK.toFixed(3)}`}
              unit="deg/g"
              tone="accent"
            />
            <Readout
              label="K from Ch 5"
              value={`${linearK >= 0 ? '+' : ''}${linearK.toFixed(3)}`}
              unit="deg/g"
            />
          </Readouts>
          <div className="panel-note">
            Those two are the same number reached from opposite ends, and they agree to a
            hundredth of a degree per g or so. The residual is not error: the map takes its
            derivatives over a small but finite sideslip, so it reads a <em>secant</em> of
            the tyre curve, while Ch 5's cornering stiffness is the <em>tangent</em> at the
            origin. On a curve those differ by a few percent.
            <br />
            <br />
            Watch what that does near neutral. K is a <em>difference</em> of two nearly
            equal terms, so when the car is close to balanced a couple of percent on each
            stiffness can move K by half its own size — while both numbers stay within a
            few hundredths of each other in absolute terms. Near neutral, K is a
            badly conditioned way to describe a car. Stability and control are not.
          </div>
          <Chart
            series={derivativeCurves}
            height={220}
            xLabel="Tyre stiffness, both axles (× current)"
            yLabel="Relative to your car (= 1)"
            zeroY={false}
            fmtX={(v) => v.toFixed(2)}
            fmtY={(v) => v.toFixed(2)}
            vRules={[{ value: 1, label: 'your car', color: '#dbe4ee' }]}
            hRules={[{ value: 1, color: '#3a4756' }]}
          />
          <div className="panel-note">
            Stiffen every tyre on the car and <strong>control climbs while stability sits
            still</strong>. The two are not the same axis, and only one of them is for sale
            at the tyre shop. Their ratio — the understeer gradient — therefore{' '}
            <em>falls</em>, which is Ch 5's <em>K = W_f/C_f − W_r/C_r</em> arriving from a
            completely different direction.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Why remove the constraint at all?">
          <Explain
            seeing={
              <>
                A map of what the car <em>produces</em> — lateral acceleration across,
                yaw moment up — at every attitude, whether or not it could ever settle
                there. The single white line across the middle is everything the previous
                three chapters could describe.
              </>
            }
            look={
              <>
                How much of the plane sits <em>off</em> that line. Corner entry, a
                correction, a deliberate rotation, a gust, a kerb — none of them are
                equilibrium states, and a method that only computes equilibrium is silent
                about all of them.
              </>
            }
            matters={
              <>
                It converts three separate judgements into one picture. "The car pushes on
                entry" becomes: the trim line stops early, the envelope extends past it, and
                the available yaw moment at the limit is small. That is a diagnosis with a
                repair attached, rather than a complaint.
                <br />
                <br />
                The honest caveats, from Ch 8 §8: this is <strong>quasi-steady</strong> —
                there is no inertia in it, so it says nothing about how fast the car moves
                between states (that is Chapter 6). And it is only as good as the tyre data.
                Comparing two configurations is far more trustworthy than trusting either
                one's absolute numbers.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

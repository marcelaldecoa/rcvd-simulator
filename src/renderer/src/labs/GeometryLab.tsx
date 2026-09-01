/**
 * Chapter 17 lab -- suspension geometry.
 *
 * One point does everything. Move the instant centre and the camber curve, the
 * roll centre and the geometric share of load transfer all move together, and
 * they cannot be chosen independently. Ch 17 §4 says so; this lab is where you
 * can fail to separate them yourself.
 *
 * The lab also carries a correction. The companion notes' Exercise 17.1 puts
 * that geometry's roll centre 438 mm ABOVE ground; the construction actually
 * puts it 165 mm below. The notes solve the instant centre in a frame local to
 * the wheel and then read the roll centre as though the answer were a vehicle
 * coordinate, and drop a sign on the way. The preset is here so the picture can
 * make the point that no amount of arithmetic will.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { SuspensionDiagram } from '../components/SuspensionDiagram'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { ButtonRow, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  EXERCISE_17_1,
  RACE_WISHBONE,
  antiDivePercent,
  camberCurve,
  corneringCamber,
  geometricSplit,
  instantCentre,
  rollAxisHeightAtCg,
  rollCamberCoefficient,
  rollMomentArm,
  staticCamberRequired,
  travelPerDegreeRoll
} from '@core/vehicle/geometry.js'
import { deriveChassis } from '@core/vehicle/chassis.js'
import { derive } from '@core/vehicle/params.js'

const TARGET_CAMBER = -2.5
const AY = 1.4

export function GeometryLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const setChassis = useGarage((s) => s.setChassis)
  const geometryFront = useGarage((s) => s.geometryFront)
  const geometryRear = useGarage((s) => s.geometryRear)
  const setGeometry = useGarage((s) => s.setGeometry)
  const compliance = useGarage((s) => s.compliance)
  const setCompliance = useGarage((s) => s.setCompliance)

  const v = derive(vehicle)
  const dc = useMemo(() => deriveChassis(vehicle, chassis), [vehicle, chassis])
  const icF = useMemo(() => instantCentre(geometryFront), [geometryFront])
  const icR = useMemo(() => instantCentre(geometryRear), [geometryRear])

  const rollAxis = rollAxisHeightAtCg(
    icF.rollCentreHeight,
    icR.rollCentreHeight,
    vehicle.a,
    v.L
  )
  const H = rollMomentArm(dc.sprungCgHeight, rollAxis)

  const split = useMemo(
    () =>
      geometricSplit({
        sprungWeight: dc.sprungWeight,
        frontWeightFraction: v.frontWeightFraction,
        rollCentreFront: icF.rollCentreHeight,
        rollCentreRear: icR.rollCentreHeight,
        trackFront: chassis.trackFront,
        trackRear: chassis.trackRear,
        sprungCgHeight: dc.sprungCgHeight,
        ay: AY
      }),
    [dc, v.frontWeightFraction, icF, icR, chassis.trackFront, chassis.trackRear]
  )

  const camber = staticCamberRequired({
    targetCamber: TARGET_CAMBER,
    rollGradient: dc.rollGradientDeg,
    ay: AY,
    fvsa: icF.fvsa,
    bumpTravel: dc.rollGradientDeg * AY * travelPerDegreeRoll(chassis.trackFront)
  })

  const rollCamberF = rollCamberCoefficient({
    rollGradient: dc.rollGradientDeg,
    ay: AY,
    fvsa: icF.fvsa,
    bumpTravel: dc.rollGradientDeg * AY * travelPerDegreeRoll(chassis.trackFront)
  })

  const cornering = corneringCamber({
    staticCamber: camber.staticCamber,
    fvsa: icF.fvsa,
    rollGradient: dc.rollGradientDeg,
    ay: AY,
    travelPerDegreeRoll: travelPerDegreeRoll(chassis.trackFront)
  })

  const camberChart: Series[] = useMemo(
    () => [
      {
        name: 'Camber through travel',
        color: '#5aa9ff',
        points: camberCurve(icF.fvsa, camber.staticCamber).map((p) => ({
          x: p.travel,
          y: p.camber
        }))
      }
    ],
    [icF.fvsa, camber.staticCamber]
  )

  /** Roll centre and camber gain cannot be separated -- swept together. */
  const couplingChart: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const angle = -8 + (12 * i) / 40
      const ic = instantCentre({ ...geometryFront, upperArmAngle: angle })
      return { angle, ic }
    }).filter((p) => isFinite(p.ic.fvsa) && Math.abs(p.ic.fvsa) < 12)
    return [
      {
        name: 'Roll centre height (mm)',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.angle, y: p.ic.rollCentreHeight * 1000 }))
      },
      {
        name: 'Camber gain (deg/mm × 1000)',
        color: '#ff9f4d',
        points: pts.map((p) => ({ x: p.angle, y: p.ic.camberGainDegPerMm * 1000 }))
      }
    ]
  }, [geometryFront])

  const antiDive = antiDivePercent(0.42, 3.1, chassis.cgHeight, v.L)

  const experiments: Experiment[] = [
    {
      title: 'Try to separate roll centre from camber gain',
      action: 'Move the upper arm angle and watch both lines on the coupling chart.',
      predict: 'Can you raise the roll centre without changing the camber curve?',
      result: (
        <>
          <strong>No.</strong> Both are functions of where one point lands, so every change
          to the geometry moves both. That is Ch 17 §4's central claim, and it is why
          "raise the roll centre" is never a free adjustment — you have also just changed
          how much camber the outside tyre keeps in a corner.
          <br />
          <br />
          A good design places the instant centre well inboard and slightly above ground:
          long swing arm, gentle camber curve, low roll centre. Getting all three at once
          is the actual difficulty of the chapter.
        </>
      )
    },
    {
      title: 'Load the notes’ own Exercise 17.1 geometry',
      action: 'Switch the front geometry to the exercise preset.',
      predict: 'Where does the roll centre end up?',
      result: (
        <>
          <strong>165 mm below ground</strong> — not the 438 mm above that the companion
          notes report. Both arms rise going inboard, so they meet <em>outboard</em> of the
          wheel; the line from there through the contact patch descends as it runs inward,
          and by the centreline it is under the road.
          <br />
          <br />
          The notes solve the instant centre in a frame measured from the wheel (getting
          1.244 m outboard, correctly) and then use that number as though it were a vehicle
          coordinate against a contact patch at 0.775 m — so they work with a 0.469 m
          separation instead of the 1.244 m they had just computed, and drop the sign on a
          descending line.
          <br />
          <br />
          Their <em>conclusion</em> survives, for a better reason: an outboard instant
          centre buries the roll centre, and a 1.24 m swing arm is a savage camber curve.
          Not a sensible layout — but not because the roll centre is high.
        </>
      ),
      run: () => setGeometry('front', EXERCISE_17_1),
      reset: () => setGeometry('front', RACE_WISHBONE)
    },
    {
      title: 'Fix a camber problem with the roll gradient instead',
      action: 'Look at the static camber the target needs, then stiffen the car in roll.',
      predict: 'Which lever moves the requirement more — geometry or roll stiffness?',
      result: (
        <>
          At a big roll gradient the geometry can only take back a fraction of the camber
          the body loses, and the required static setting becomes absurd — the tyre then
          runs on its inner shoulder in a straight line and the inside wheel is nowhere
          useful. Ch 17 Ex 17.4 is emphatic that{' '}
          <strong>the correct fix is not more static camber</strong>: it is less roll, or a
          shorter swing arm, accepting the heave sensitivity that comes with it.
          <br />
          <br />
          Most race cars solve it by simply not rolling. That is why Chapter 16's roll
          gradient and this chapter's camber curve are designed together.
        </>
      ),
      run: () =>
        setChassis({
          barRollStiffnessFront: chassis.barRollStiffnessFront * 2.2,
          barRollStiffnessRear: chassis.barRollStiffnessRear * 2.2
        }),
      reset: () => setChassis({ barRollStiffnessFront: 27000, barRollStiffnessRear: 12000 })
    },
    {
      title: 'Send the camber coefficient to the understeer budget',
      action: 'Apply this geometry’s roll camber coefficient to the Ch 5 budget.',
      predict: 'How big is the roll camber row once it is derived rather than guessed?',
      result: (
        <>
          The budget's "camber gained relative to the road per degree of roll" is exactly{' '}
          <strong>1 minus what this geometry recovers</strong>. Here that is{' '}
          {rollCamberF.toFixed(2)}. Until now it was a number typed into a preset; it is a
          consequence of a swing arm length and a roll gradient, and this is where the
          consequence is computed.
        </>
      ),
      run: () => setCompliance('front', { rollCamber: rollCamberF })
    }
  ]

  const usingExercise = Math.abs(geometryFront.upperArmAngle - EXERCISE_17_1.upperArmAngle) < 0.01

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Where the two arms meet decides <strong>three</strong> things at once — how much
        camber the wheel keeps in roll, where the body rolls about, and how much of the
        load transfer travels through the links instead of the springs. You do not get to
        pick them separately.
      </div>

      <div className="stage">
        <Panel
          title="The construction"
          reference="Ch 17 §3–4"
          right={
            <ButtonRow
              options={[
                { value: 'race', label: 'Race geometry' },
                { value: 'ex', label: 'Exercise 17.1' }
              ]}
              value={usingExercise ? 'ex' : 'race'}
              onChange={(x) =>
                setGeometry('front', x === 'ex' ? EXERCISE_17_1 : RACE_WISHBONE)
              }
            />
          }
          note={
            <>
              Extend both arms until they cross — that is the <strong>instant centre</strong>
              . Draw a line from it through the contact patch, and where that line reaches
              the vehicle centreline is the <strong>roll centre</strong>. The distance from
              the instant centre back to the patch is the swing arm length, and camber gain
              is one over it.
            </>
          }
        >
          <SuspensionDiagram
            track={geometryFront.track}
            upperJointHeight={geometryFront.upperJointHeight}
            lowerJointHeight={geometryFront.lowerJointHeight}
            ic={icF}
            height={320}
          />
          <Readouts>
            <Readout
              label="Swing arm (FVSA)"
              value={Math.abs(icF.fvsa).toFixed(2)}
              unit={icF.fvsa < 0 ? 'm outboard' : 'm'}
              tone={icF.fvsa < 0 ? 'danger' : 'accent'}
            />
            <Readout
              label="Camber gain"
              value={Math.abs(icF.camberGainDegPerMm).toFixed(4)}
              unit="deg/mm"
            />
            <Readout
              label="Roll centre"
              value={(icF.rollCentreHeight * 1000).toFixed(0)}
              unit="mm"
              tone={icF.rollCentreHeight < 0 ? 'danger' : 'ok'}
            />
            <Readout label="Instant centre height" value={(icF.height * 1000).toFixed(0)} unit="mm" />
          </Readouts>
        </Panel>

        <div className="stack">
          <Panel title="Front geometry">
            <Slider
              label="Upper arm angle"
              unit="deg, + rises inboard"
              value={geometryFront.upperArmAngle}
              min={-8}
              max={10}
              step={0.1}
              digits={1}
              onChange={(upperArmAngle) => setGeometry('front', { upperArmAngle })}
            />
            <Slider
              label="Lower arm angle"
              unit="deg, + falls inboard"
              value={geometryFront.lowerArmAngle}
              min={-8}
              max={10}
              step={0.1}
              digits={1}
              onChange={(lowerArmAngle) => setGeometry('front', { lowerArmAngle })}
            />
            <Slider
              label="Upper ball joint height"
              unit="m"
              value={geometryFront.upperJointHeight}
              min={0.3}
              max={0.6}
              step={0.005}
              digits={3}
              onChange={(upperJointHeight) => setGeometry('front', { upperJointHeight })}
            />
            <Slider
              label="Lower ball joint height"
              unit="m"
              value={geometryFront.lowerJointHeight}
              min={0.1}
              max={0.35}
              step={0.005}
              digits={3}
              onChange={(lowerJointHeight) => setGeometry('front', { lowerJointHeight })}
            />
            <Slider
              label="Rear roll centre (via rear upper arm)"
              unit="deg"
              value={geometryRear.upperArmAngle}
              min={-8}
              max={10}
              step={0.1}
              digits={1}
              onChange={(upperArmAngle) => setGeometry('rear', { upperArmAngle })}
            />
          </Panel>

          <Panel
            title="Roll axis and what rides on it"
            reference="Ch 17 Ex 17.2–17.3"
            note={
              <>
                The roll axis joins the two roll centres, and <em>H</em> — the distance from
                the sprung CG down to it — is what Chapter 16's roll gradient divides by.
                Raise both roll centres and the car rolls less for the same springs, which
                is the tempting part; Ex 17.6 is about the bill.
              </>
            }
          >
            <Readouts>
              <Readout label="Rear roll centre" value={(icR.rollCentreHeight * 1000).toFixed(0)} unit="mm" tone="rear" />
              <Readout label="Roll axis under CG" value={(rollAxis * 1000).toFixed(0)} unit="mm" />
              <Readout label="Roll moment arm H" value={(H * 1000).toFixed(0)} unit="mm" tone="accent" />
              <Readout label="Roll gradient" value={dc.rollGradientDeg.toFixed(2)} unit="deg/g" />
              <Readout
                label={`Geometric transfer at ${AY} g`}
                value={split.total.toFixed(0)}
                unit="N"
              />
              <Readout
                label="…of the sprung total"
                value={`${(split.fractionOfTotal * 100).toFixed(0)}%`}
              />
              <Readout
                label="Geometric split"
                value={`${(split.frontShare * 100).toFixed(0)}% front`}
                tone={split.frontShare < 0.4 ? 'danger' : 'front'}
              />
            </Readouts>
            <div className="panel-note">
              The geometric part travels through <strong>rigid links</strong>, so it arrives
              the instant the tyre makes force; the elastic part has to wait for the body to
              roll. In a transient that is the whole difference — and because the split
              between the axles is set by their roll centre heights,{' '}
              <strong>roll centres are a balance tool</strong>, not only a roll-control one.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="The camber budget"
          reference="Ch 17 §5 and Ex 17.4"
          note={
            <>
              Body roll leans the outside wheel out of the corner; camber gain in bump takes
              some of it back. Whatever is left has to be paid for with static camber — and
              static camber is spent in a straight line as well as in a corner.
            </>
          }
        >
          <Chart
            series={camberChart}
            height={220}
            xLabel="Wheel travel (mm, + is bump)"
            yLabel="Camber (deg)"
            zeroY={false}
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(2)}
            vRules={[{ value: 0, label: 'static', color: '#dbe4ee' }]}
          />
          <Readouts>
            <Readout label="Roll at 1.4 g" value={camber.roll.toFixed(2)} unit="deg" />
            <Readout label="Camber gain recovers" value={camber.camberGain.toFixed(2)} unit="deg" tone="ok" />
            <Readout
              label="…which is"
              value={`${(camber.recovered * 100).toFixed(0)}%`}
              tone={camber.recovered > 0.5 ? 'ok' : 'warn'}
            />
            <Readout
              label={`Static camber for ${TARGET_CAMBER}°`}
              value={camber.staticCamber.toFixed(2)}
              unit="deg"
              tone={camber.staticCamber < -4 ? 'danger' : 'accent'}
            />
            <Readout label="Outside wheel ends at" value={cornering.outside.toFixed(2)} unit="deg" tone="front" />
            <Readout label="Inside wheel ends at" value={cornering.inside.toFixed(2)} unit="deg" tone="rear" />
          </Readouts>
          <div className="panel-note">
            {camber.staticCamber < -4 ? (
              <>
                <strong>That static setting is a signal, not a solution.</strong> The tyre
                will run on its inner shoulder under braking and the inside wheel is far past
                anything useful. Reduce the roll gradient or shorten the swing arm.
              </>
            ) : (
              <>
                A workable static setting. Note how much of it is doing nothing but cancelling
                body roll — which is why a car that does not roll needs far less of it.
              </>
            )}
          </div>
        </Panel>

        <Panel
          title="You cannot move one without the other"
          reference="Ch 17 §4"
          note={
            <>
              Both curves are the same instant centre seen two ways. Every upper-arm angle
              that gives you the roll centre you want also fixes the camber gain you get, and
              there is no third knob.
            </>
          }
        >
          <Chart
            series={couplingChart}
            height={240}
            xLabel="Upper arm angle (deg)"
            yLabel="Roll centre (mm) · camber gain (×1000)"
            zeroY={false}
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(0)}
            vRules={[{ value: geometryFront.upperArmAngle, label: 'now', color: '#dbe4ee' }]}
            hRules={[{ value: 0, color: '#3a4756' }]}
          />
          <Readouts>
            <Readout
              label="Roll camber coefficient"
              value={rollCamberF.toFixed(3)}
              unit="deg/deg"
              tone="accent"
            />
            <Readout
              label="Budget currently uses"
              value={compliance.front.rollCamber.toFixed(3)}
            />
            <Readout label="Anti-dive (3.1 m SVSA)" value={antiDive.toFixed(0)} unit="%" tone={antiDive > 100 ? 'danger' : 'ok'} />
          </Readouts>
          <div className="panel-note">
            The first number is what Chapter 5's understeer budget calls "roll camber" — one
            minus what this geometry recovers. Over 100% anti-dive, as in Ex 17.5, means the
            nose <em>rises</em> under braking and the suspension goes rigid in the braking
            phase, which is when it is needed most.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Why one point decides three things">
          <Explain
            seeing={
              <>
                The front elevation of one corner, with the arms extended to their instant
                centre and the roll centre constructed from it. Everything on this page is a
                consequence of where that one point sits.
              </>
            }
            look={
              <>
                That the <strong>swing arm length</strong> and the{' '}
                <strong>roll centre height</strong> move together and always will. A short
                arm gives generous camber gain and, for the same instant centre height, a
                higher roll centre. A long arm gives a stable camber curve in heave and a low
                roll centre. There is no setting that gives both halves of what you want.
              </>
            }
            matters={
              <>
                Because the choice propagates. The roll centre sets <em>H</em>, which sets
                the roll gradient of Chapter 16; the roll gradient sets the camber the tyre
                loses, which this geometry then has to take back; and the roll centre heights
                split the geometric load transfer between the axles, which shifts the balance
                of Chapter 7 before any spring or bar is touched.
                <br />
                <br />
                The one warning the picture cannot show: the instant centre{' '}
                <strong>migrates</strong> as the car rolls and heaves, so all of this is a
                snapshot at one attitude. A geometry whose roll centre wanders 300 mm
                sideways in two degrees of roll is producing behaviour nobody designed.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

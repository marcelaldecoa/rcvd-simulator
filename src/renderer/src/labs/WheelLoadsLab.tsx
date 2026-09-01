/**
 * Chapter 18 lab -- wheel loads.
 *
 * "The pivotal chapter of Part II." The one idea to leave with: the TOTAL
 * lateral load transfer is fixed by mass, lateral acceleration, CG height and
 * track -- none of which you can change at a race weekend -- while its
 * DISTRIBUTION between the axles is free, and is the entire balance lever.
 *
 * The layout makes that split visible. Total transfer sits in one readout that
 * bars cannot move; the stacked breakdown beside it redistributes as you turn
 * them.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { TransferBreakdown, WheelLoadDiagram } from '../components/WheelLoadDiagram'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { Panel, Readout, Readouts, Slider, Formula } from '../components/ui'
import { useGarage } from '../store/garage'
import { derive } from '@core/vehicle/params.js'
import {
  deriveChassis,
  lateralTransfer,
  longitudinalTransfer,
  totalRollMoment,
  wheelLoads
} from '@core/vehicle/chassis.js'
import { linspace, toDeg } from '@core/util/numeric.js'

export function WheelLoadsLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const setChassis = useGarage((s) => s.setChassis)

  const [ay, setAy] = useState(1.2)
  const [ax, setAx] = useState(0)

  const d = derive(vehicle)
  const dc = deriveChassis(vehicle, chassis)
  const transfer = lateralTransfer(vehicle, chassis, ay)
  const loads = wheelLoads(vehicle, chassis, ay, ax)
  const scale = Math.max(transfer.front, transfer.rear)

  const totalBar = chassis.barRollStiffnessFront + chassis.barRollStiffnessRear

  // Total transfer against Ay, with the front/rear split -- the "fixed total,
  // free distribution" story in one chart.
  const transferCurves: Series[] = useMemo(() => {
    const ays = linspace(0, 2.2, 45)
    return [
      {
        name: 'Front',
        color: '#5aa9ff',
        points: ays.map((a) => ({ x: a, y: lateralTransfer(vehicle, chassis, a).front / 1000 }))
      },
      {
        name: 'Rear',
        color: '#ff9f4d',
        points: ays.map((a) => ({ x: a, y: lateralTransfer(vehicle, chassis, a).rear / 1000 }))
      },
      {
        name: 'Total (fixed by m, h, t)',
        color: '#5f6f80',
        dashed: true,
        points: ays.map((a) => {
          const t = lateralTransfer(vehicle, chassis, a)
          return { x: a, y: (t.front + t.rear) / 1000 }
        })
      }
    ]
  }, [vehicle, chassis])

  const longCurve: Series[] = useMemo(() => {
    const axs = linspace(-1.6, 1.2, 40)
    const { wf, wr } = derive(vehicle)
    return [
      {
        name: 'Front axle load',
        color: '#5aa9ff',
        points: axs.map((a) => ({
          x: a,
          y: Math.max(wf - longitudinalTransfer(vehicle, chassis, a), 0) / 1000
        }))
      },
      {
        name: 'Rear axle load',
        color: '#ff9f4d',
        points: axs.map((a) => ({
          x: a,
          y: Math.max(wr + longitudinalTransfer(vehicle, chassis, a), 0) / 1000
        }))
      }
    ]
  }, [vehicle, chassis])

  const experiments: Experiment[] = [
    {
      title: 'Try to change the total with the bars',
      action: 'Move front bar stiffness from one end of its range to the other.',
      predict: 'What happens to the total transfer readout? To the front/rear split?',
      result: (
        <>
          The <strong>total does not move at all</strong>. Bars redistribute; they
          cannot reduce. Total transfer is{' '}
          <Formula tex="W A_y h / t" /> — mass, lateral acceleration, CG height and
          track, none of which a bar touches. What the bar changes is which axle
          absorbs it, and that is the whole of balance tuning.
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
      title: 'Now actually reduce the total',
      action: 'Lower the CG, or widen the track.',
      predict: 'Which of these changes balance as well as total grip?',
      result: (
        <>
          Both cut the total, and <strong>lowering the CG does not change balance</strong>{' '}
          — it scales both axles alike. Widening one track reduces that end's transfer
          specifically, so it adds grip there <em>and</em> moves balance. This is why
          Ch 7 §4 lists CG height as a grip change and track width as both.
        </>
      ),
      run: () => setChassis({ cgHeight: 0.22 }),
      reset: () => setChassis({ cgHeight: 0.3 })
    },
    {
      title: 'Lift a wheel',
      action: 'Push lateral acceleration up until an inner tyre goes to zero.',
      predict: 'What happens to the diagram, and what has happened to the car?',
      result: (
        <>
          Once the inner wheel lifts, the outer tyre carries the entire axle load, and
          the axle is at its worst possible operating point on the load-sensitivity
          curve. Beyond that the model clamps the load at zero — a wheel cannot pull
          down. On a real car this is the start of a roll-over, and it is why total
          transfer is worth reducing even though it is not a balance tool.
        </>
      ),
      run: () => setAy(2.0)
    },
    {
      title: 'Brake into the corner',
      action: 'Set longitudinal acceleration to about −0.8 g.',
      predict: 'Which axle gains load, and what does that do to the rear tyres?',
      result: (
        <>
          The front gains and the rear is unloaded — at exactly the moment corner entry
          is asking the rear for lateral force. Ch 7 §5 calls this the analytical account
          of corner-entry instability, and it is why brake bias is a handling parameter
          rather than just a braking one.
        </>
      ),
      run: () => setAx(-0.8),
      reset: () => setAx(0)
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Total lateral load transfer is <strong>fixed</strong> by mass, lateral
        acceleration, CG height and track. Its <strong>distribution</strong> between the
        axles is free — and that distribution is the whole of balance tuning.
      </div>

      <div className="stage">
        <Panel title="The four wheel loads" reference="Ch 18 §5">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16 }}>
            <WheelLoadDiagram
              loads={loads}
              staticFront={d.wf / 2}
              staticRear={d.wr / 2}
              rollAngle={transfer.rollAngle}
              height={330}
            />
            <div>
              <TransferBreakdown
                label="Front axle"
                geometric={transfer.frontGeometric}
                elastic={transfer.frontElastic}
                unsprung={transfer.frontUnsprung}
                scale={scale}
              />
              <TransferBreakdown
                label="Rear axle"
                geometric={transfer.rearGeometric}
                elastic={transfer.rearElastic}
                unsprung={transfer.rearUnsprung}
                scale={scale}
              />
              <div style={{ marginTop: 12 }}>
                <Explain
                  seeing={
                    <>
                      Each contact patch is drawn with <strong>area proportional to
                      load</strong>, against a dashed ring showing its static value.
                      The bars split each axle's transfer into the three paths of
                      Ch 18 §5.
                    </>
                  }
                  look={
                    <>
                      The <strong>elastic</strong> term usually dominates — it is the one
                      the springs and bars control, and the only one you can change from
                      the pit lane. Geometric transfer goes through the links and is set
                      by roll centre height; unsprung transfer is not yours to move at all.
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Operating point">
            <Slider
              label="Lateral acceleration"
              unit="g"
              value={ay}
              min={0}
              max={2.2}
              step={0.02}
              onChange={setAy}
            />
            <Slider
              label="Longitudinal acceleration"
              unit="g"
              value={ax}
              min={-1.6}
              max={1.2}
              step={0.02}
              display={`${ax >= 0 ? '+' : ''}${ax.toFixed(2)}  ${ax < -0.05 ? '(braking)' : ax > 0.05 ? '(power)' : ''}`}
              onChange={setAx}
            />
            <Readouts>
              <Readout
                label="Total transfer"
                value={((transfer.front + transfer.rear) / 1000).toFixed(2)}
                unit="kN"
                tone="accent"
              />
              <Readout label="TLLTD" value={(transfer.tlltd * 100).toFixed(1)} unit="% front" tone="front" />
              <Readout label="Roll angle" value={toDeg(transfer.rollAngle).toFixed(2)} unit="deg" />
              <Readout label="Roll gradient" value={dc.rollGradientDeg.toFixed(2)} unit="deg/g" />
              <Readout label="Roll moment arm H" value={dc.rollMomentArm.toFixed(3)} unit="m" />
              <Readout
                label="Long. transfer"
                value={(longitudinalTransfer(vehicle, chassis, ax) / 1000).toFixed(2)}
                unit="kN"
              />
              <Readout label="Sprung mass" value={dc.sprungMass.toFixed(0)} unit="kg" />
              <Readout
                label="Roll moment"
                value={(totalRollMoment(vehicle, chassis, ay) / 1000).toFixed(2)}
                unit="kN·m"
              />
            </Readouts>
          </Panel>

          <Panel title="Chassis" reference="Ch 16 · 17 · 18">
            <Slider
              label="CG height"
              unit="m"
              value={chassis.cgHeight}
              min={0.15}
              max={0.6}
              step={0.005}
              digits={3}
              onChange={(cgHeight) => setChassis({ cgHeight })}
            />
            <Slider
              label="Front track"
              unit="m"
              value={chassis.trackFront}
              min={1.2}
              max={2.0}
              step={0.01}
              onChange={(trackFront) => setChassis({ trackFront })}
            />
            <Slider
              label="Rear track"
              unit="m"
              value={chassis.trackRear}
              min={1.2}
              max={2.0}
              step={0.01}
              onChange={(trackRear) => setChassis({ trackRear })}
            />
            <Slider
              label="Front roll centre height"
              unit="mm"
              value={chassis.rollCentreHeightFront}
              min={-0.05}
              max={0.2}
              step={0.005}
              display={(chassis.rollCentreHeightFront * 1000).toFixed(0)}
              onChange={(rollCentreHeightFront) => setChassis({ rollCentreHeightFront })}
            />
            <Slider
              label="Rear roll centre height"
              unit="mm"
              value={chassis.rollCentreHeightRear}
              min={-0.05}
              max={0.2}
              step={0.005}
              display={(chassis.rollCentreHeightRear * 1000).toFixed(0)}
              onChange={(rollCentreHeightRear) => setChassis({ rollCentreHeightRear })}
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
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Transfer against lateral acceleration"
          reference="Ch 18 §5"
          note={
            <>
              All three lines are straight — transfer is linear in Ay. The dashed total
              is what you cannot change with bars; the gap between the two solid lines
              is what you can.
            </>
          }
        >
          <Chart
            series={transferCurves}
            height={210}
            xLabel="Lateral acceleration (g)"
            yLabel="Load transfer (kN)"
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[{ value: ay, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>

        <Panel
          title="Axle loads under braking and power"
          reference="Ch 18 §6"
          note={
            <>
              <Formula tex="\Delta F_z = W A_x h / L" /> — note it depends on{' '}
              <strong>wheelbase</strong>, not track, and unlike lateral transfer it has
              no distribution parameter to tune. Anti-dive and anti-squat change how it
              is reacted, not how much of it there is.
            </>
          }
        >
          <Chart
            series={longCurve}
            height={210}
            xLabel="Longitudinal acceleration (g)"
            yLabel="Axle load (kN)"
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[{ value: ax, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>
      </div>

      <Panel title="Try these" reference="guided">
        <TryThis experiments={experiments} />
      </Panel>
    </div>
  )
}

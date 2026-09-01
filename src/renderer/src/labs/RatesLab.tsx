/**
 * Chapter 16 lab -- ride and roll rates.
 *
 * The lab that closes a hole in the app. Every chapter downstream of Ch 18 has
 * been asking you to dial in a roll stiffness with no way to reach one from a
 * spring rate, which is not how a setup sheet is written. This is the
 * arithmetic that turns springs, bars, tyres and installation ratios into the
 * numbers those chapters consume -- and the "push these into the car" button is
 * the point of the whole page, because it makes the causality visible instead
 * of leaving four numbers sitting in a config object.
 *
 * Two things worth watching, both of which the chapter warns about and both of
 * which are easy to disbelieve until you move the slider:
 *
 *   - Installation ratio enters SQUARED. A 10% error is a 21% error in rate.
 *   - The tyre is one of the two springs, not a correction to the other one.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  FORMULA_RATES,
  SEDAN_RATES,
  deriveRates,
  rideFrequency,
  rideRate,
  rollGradientFromRates,
  springRateForFrequency,
  tireComplianceLoss,
  wheelRate
} from '@core/vehicle/rates.js'
import { deriveChassis } from '@core/vehicle/chassis.js'

const R2D = 180 / Math.PI

/** Ch 16 §4's table, drawn as bands behind the frequency readout. */
const FREQUENCY_BANDS = [
  { label: 'Passenger car', from: 1.0, to: 1.5 },
  { label: 'Sports car', from: 1.5, to: 2.0 },
  { label: 'GT / touring', from: 2.0, to: 3.0 },
  { label: 'Formula, moderate aero', from: 3.0, to: 4.5 },
  { label: 'High downforce', from: 4.5, to: 7.0 }
]

function bandFor(hz: number): string {
  const b = FREQUENCY_BANDS.find((x) => hz >= x.from && hz < x.to)
  return b ? b.label : hz < 1 ? 'Softer than a passenger car' : 'Beyond high downforce'
}

export function RatesLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const rates = useGarage((s) => s.rates)
  const setRates = useGarage((s) => s.setRates)
  const setCornerRates = useGarage((s) => s.setCornerRates)
  const applyRates = useGarage((s) => s.applyRatesToChassis)

  const d = useMemo(() => deriveRates(rates), [rates])
  const dc = useMemo(() => deriveChassis(vehicle, chassis), [vehicle, chassis])

  /** The roll gradient these rates imply, before Ch 18's jacking correction. */
  const impliedRollGradient =
    rollGradientFromRates(dc.sprungWeight, dc.rollMomentArm, d.rollRateTotal) * R2D

  /** How far the chassis the rest of the app is using has drifted from these rates. */
  const chassisTotal =
    chassis.springRollStiffnessFront +
    chassis.springRollStiffnessRear +
    chassis.barRollStiffnessFront +
    chassis.barRollStiffnessRear
  const inSync = Math.abs(d.rollRateTotal / chassisTotal - 1) < 0.005

  // --- installation ratio: the squared term, drawn ------------------------
  const irCurve: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const ir = 0.4 + (0.6 * i) / 40
      const kw = wheelRate(rates.front.springRate, ir)
      return {
        ir,
        wheel: kw,
        freq: rideFrequency(rideRate(kw, rates.front.tireRate), rates.front.sprungCornerMass)
      }
    })
    return [
      {
        name: 'Wheel rate (N/mm)',
        color: '#5aa9ff',
        points: pts.map((p) => ({ x: p.ir, y: p.wheel }))
      }
    ]
  }, [rates.front.springRate, rates.front.tireRate, rates.front.sprungCornerMass])

  // --- what the tyre takes away, across the whole stiffness range ---------
  const tireCurve: Series[] = useMemo(() => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const kw = 5 + (295 * i) / 60
      return { x: kw, y: tireComplianceLoss(kw, rates.front.tireRate) * 100 }
    })
    return [{ name: 'Compliance lost to the tyre (%)', color: '#ff9f4d', points: pts }]
  }, [rates.front.tireRate])

  // --- ride frequency against spring rate ---------------------------------
  const freqCurve: Series[] = useMemo(() => {
    const build = (tireRate: number, name: string, color: string): Series => ({
      name,
      color,
      points: Array.from({ length: 61 }, (_, i) => {
        const ks = 20 + (380 * i) / 60
        const kw = wheelRate(ks, rates.front.installationRatio)
        return {
          x: ks,
          y: rideFrequency(rideRate(kw, tireRate), rates.front.sprungCornerMass)
        }
      })
    })
    return [
      build(rates.front.tireRate, 'With the tyre in series', '#4dd6c1'),
      build(1e9, 'If the tyre were rigid', '#5f6f80')
    ]
  }, [rates.front.installationRatio, rates.front.tireRate, rates.front.sprungCornerMass])

  const targetSpring = springRateForFrequency(
    d.front.rideFrequency + 0.4,
    rates.front.sprungCornerMass,
    rates.front.tireRate,
    rates.front.installationRatio
  )

  const experiments: Experiment[] = [
    {
      title: 'Get the installation ratio 10% wrong',
      action: 'Move the front installation ratio from its value to 10% higher.',
      predict: 'How far out is the wheel rate? And the ride frequency?',
      result: (
        <>
          The wheel rate is out by <strong>21%</strong> and the frequency by{' '}
          <strong>10%</strong>. The square is why the first number is so large, and the
          square root in the frequency formula is why the second is not — frequency error
          tracks IR error one for one.
          <br />
          <br />
          The practical consequence, from Ch 16 §3: installation ratio is{' '}
          <strong>measured, not assumed</strong>, and measured through the travel range
          rather than at static ride height, because a progressive geometry's ratio is a
          function of position.
        </>
      ),
      run: () =>
        setCornerRates('front', { installationRatio: rates.front.installationRatio * 1.1 }),
      reset: () =>
        setCornerRates('front', { installationRatio: FORMULA_RATES.front.installationRatio })
    },
    {
      title: 'Make the tyre the suspension',
      action: 'Raise the front spring until the wheel rate passes 150 N/mm.',
      predict: 'How much of the total compliance is left in the spring?',
      result: (
        <>
          At 150 N/mm against a typical tyre, <strong>a third of the compliance is in the
          carcass</strong>, and at 300 N/mm it is more than half. Past that point the ride
          rate stops responding to the spring at all — you are adjusting the stiffer of two
          springs in series, and the softer one dominates.
          <br />
          <br />
          Two things follow. Ride frequency calculations that ignore the tyre are seriously
          wrong for stiff cars. And <strong>tyre pressure becomes a suspension rate
          adjustment</strong>, not only a contact-patch one — which is why it is such a
          high-leverage change.
        </>
      ),
      run: () => setCornerRates('front', { springRate: 390 }),
      reset: () => setCornerRates('front', { springRate: FORMULA_RATES.front.springRate })
    },
    {
      title: 'Chase a ride frequency target',
      action: `Try to reach ${(d.front.rideFrequency + 0.4).toFixed(2)} Hz at the front.`,
      predict: 'How much more spring does 0.4 Hz cost?',
      result: (
        <>
          {targetSpring > 0 ? (
            <>
              It needs <strong>{targetSpring.toFixed(0)} N/mm</strong> against the current{' '}
              {rates.front.springRate.toFixed(0)} — a{' '}
              {((targetSpring / rates.front.springRate - 1) * 100).toFixed(0)}% increase for
              a {((0.4 / d.front.rideFrequency) * 100).toFixed(0)}% frequency gain. That is
              f ∝ √K, made worse by the tyre's series softening.
            </>
          ) : (
            <>
              <strong>It cannot be reached at all.</strong> Past a certain frequency the
              tyre alone is too soft, and no spring however stiff will get there — the
              series relation has no positive solution. That ceiling is the endpoint of Ch
              16 Exercise 16.7: at some stiffness, the tyre <em>is</em> the suspension.
            </>
          )}
          <br />
          <br />
          And in practice you would fit the nearest catalogue rate and accept the frequency
          that follows, because tyre rate varies with pressure and temperature by more than
          the difference.
        </>
      ),
      run: () => targetSpring > 0 && setCornerRates('front', { springRate: targetSpring }),
      reset: () => setCornerRates('front', { springRate: FORMULA_RATES.front.springRate })
    },
    {
      title: 'Watch the roll stiffness reach the rest of the car',
      action: 'Change a bar, then press "Send these rates to the car".',
      predict: 'What happens to TLLTD and the balance three chapters away?',
      result: (
        <>
          The four roll-stiffness numbers Ch 18 consumes are recomputed from these springs,
          bars, tyres and installation ratios, and every chapter downstream —{' '}
          <strong>wheel loads, pair analysis, the Moment Method</strong> — picks up the
          change. Until you press it, those chapters are using whatever was there before.
          <br />
          <br />
          That the button exists at all is the teaching point. Roll stiffness is not a
          setting; it is a <em>consequence</em>, and this is where the consequence is
          computed.
        </>
      ),
      run: applyRates
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Springs are not roll stiffness, and roll stiffness is not what the tyres feel. This
        chapter is the chain between them — and the two links people skip are that{' '}
        <strong>installation ratio is squared</strong> and that the{' '}
        <strong>tyre is one of the two springs</strong>.
      </div>

      <div className="stage">
        <Panel
          title="The chain, corner by corner"
          reference="Ch 16 §8"
          note={
            <>
              Spring rate through the installation ratio gives the wheel rate; the wheel
              rate in series with the tyre gives the ride rate; the ride rate over the
              sprung corner mass gives the frequency. Skip the tyre and every frequency here
              comes out high.
            </>
          }
        >
          <Formula tex={String.raw`K_w = K_s\,IR^2 \qquad K_R = \frac{K_wK_T}{K_w+K_T} \qquad f = \frac{1}{2\pi}\sqrt{\frac{K_R}{m_s}}`} block />

          <table className="data">
            <thead>
              <tr>
                <th>Corner</th>
                <th>Spring</th>
                <th>Wheel</th>
                <th>Ride</th>
                <th>Lost to tyre</th>
                <th>Frequency</th>
                <th>If tyre rigid</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Front', rates.front, d.front],
                  ['Rear', rates.rear, d.rear]
                ] as const
              ).map(([name, c, dd]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{c.springRate.toFixed(0)}</td>
                  <td>{dd.wheelRate.toFixed(1)}</td>
                  <td>{dd.rideRate.toFixed(1)}</td>
                  <td style={{ color: 'var(--rear)' }}>{(dd.tireLoss * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--accent)' }}>{dd.rideFrequency.toFixed(2)} Hz</td>
                  <td style={{ color: 'var(--text-faint)' }}>
                    {dd.frequencyIgnoringTire.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Readouts>
            <Readout label="Front is a" value={bandFor(d.front.rideFrequency)} />
            <Readout
              label="Rear / front frequency"
              value={d.frequencyRatioRearToFront.toFixed(3)}
              tone={d.frequencyRatioRearToFront > 1.05 ? 'ok' : 'warn'}
            />
          </Readouts>
          <div className="panel-note">
            Olley's <strong>flat ride</strong> criterion wants the rear 10–20% above the
            front, so pitch decays quickly after a bump.{' '}
            {d.frequencyRatioRearToFront > 1.05
              ? 'This car obeys it.'
              : 'This car does not — which race cars routinely do not, because the aero platform matters more than pitch comfort.'}
          </div>
        </Panel>

        <div className="stack">
          <Panel
            title="Front corner"
            right={
              <ButtonRow
                options={[
                  { value: 'race', label: 'Race' },
                  { value: 'road', label: 'Road' }
                ]}
                value={rates.front.springRate > 60 ? 'race' : 'road'}
                onChange={(v) =>
                  setRates(v === 'race' ? { ...FORMULA_RATES } : { ...SEDAN_RATES })
                }
              />
            }
          >
            <Slider
              label="Spring rate"
              unit="N/mm"
              value={rates.front.springRate}
              min={15}
              max={400}
              step={1}
              digits={0}
              onChange={(springRate) => setCornerRates('front', { springRate })}
            />
            <Slider
              label="Installation ratio"
              unit="spring / wheel"
              value={rates.front.installationRatio}
              min={0.35}
              max={1.1}
              step={0.005}
              digits={3}
              onChange={(installationRatio) => setCornerRates('front', { installationRatio })}
            />
            <Slider
              label="Tyre vertical rate"
              unit="N/mm"
              value={rates.front.tireRate}
              min={150}
              max={500}
              step={5}
              digits={0}
              onChange={(tireRate) => setCornerRates('front', { tireRate })}
            />
            <Slider
              label="Sprung corner mass"
              unit="kg"
              value={rates.front.sprungCornerMass}
              min={80}
              max={450}
              step={5}
              digits={0}
              onChange={(sprungCornerMass) => setCornerRates('front', { sprungCornerMass })}
            />
            <Slider
              label="Front anti-roll bar"
              unit="N·m/rad at the bar"
              value={rates.barRateFront}
              min={0}
              max={6000}
              step={50}
              digits={0}
              onChange={(barRateFront) => setRates({ barRateFront })}
            />
            <Slider
              label="Rear anti-roll bar"
              unit="N·m/rad at the bar"
              value={rates.barRateRear}
              min={0}
              max={6000}
              step={50}
              digits={0}
              onChange={(barRateRear) => setRates({ barRateRear })}
            />
          </Panel>

          <Panel
            title="What the car gets"
            reference="Ch 16 §5–7"
            note={
              <>
                These four numbers are what Chapter 18 consumes, and everything after it —
                wheel loads, pair analysis, the Moment Method — is built on them.
              </>
            }
          >
            <Readouts>
              <Readout
                label="Front roll rate"
                value={(d.rollRateFront / 1000).toFixed(1)}
                unit="kN·m/rad"
                tone="front"
              />
              <Readout
                label="Rear roll rate"
                value={(d.rollRateRear / 1000).toFixed(1)}
                unit="kN·m/rad"
                tone="rear"
              />
              <Readout
                label="Bar share, front"
                value={`${(d.barShareFront * 100).toFixed(0)}%`}
              />
              <Readout label="Bar share, rear" value={`${(d.barShareRear * 100).toFixed(0)}%`} />
              <Readout
                label="Elastic TLLTD"
                value={(d.elasticTlltd * 100).toFixed(1)}
                unit="% front"
                tone="accent"
              />
              <Readout
                label="Roll gradient implied"
                value={impliedRollGradient.toFixed(2)}
                unit="deg/g"
              />
            </Readouts>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className={`btn${inSync ? '' : ' active'}`} onClick={applyRates}>
                {inSync ? 'Car is up to date' : 'Send these rates to the car'}
              </button>
            </div>
            <div className="panel-note">
              {inSync ? (
                <>
                  The rest of the app is using these numbers. Change a spring or a bar and
                  this button will offer to send the new ones across.
                </>
              ) : (
                <>
                  <strong>The car is still on the old numbers.</strong> Chapter 18 currently
                  has {(chassisTotal / 1000).toFixed(1)} kN·m/rad of total roll stiffness
                  against the {(d.rollRateTotal / 1000).toFixed(1)} these rates imply — a{' '}
                  {Math.abs((d.rollRateTotal / chassisTotal - 1) * 100).toFixed(0)}%
                  difference. Roll stiffness is a consequence of the setup sheet, and this
                  is where the consequence is computed.
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Why the installation ratio is measured, not assumed"
          reference="Ch 16 §3"
          note={
            <>
              The curve is a parabola because the rate transformation is a{' '}
              <strong>square</strong>. Read the slope: near the current setting, a 10% error
              in ratio is a 21% error in rate — and it is an error you cannot see anywhere
              on the car.
            </>
          }
        >
          <Chart
            series={irCurve}
            height={230}
            xLabel="Installation ratio (spring travel / wheel travel)"
            yLabel="Wheel rate (N/mm)"
            fmtX={(v) => v.toFixed(2)}
            fmtY={(v) => v.toFixed(0)}
            vRules={[
              { value: rates.front.installationRatio, label: 'now', color: '#dbe4ee' },
              {
                value: rates.front.installationRatio * 1.1,
                label: '+10%',
                color: '#ff6b6b',
                dashed: true
              }
            ]}
          />
          <Readouts>
            <Readout label="Wheel rate now" value={d.front.wheelRate.toFixed(1)} unit="N/mm" />
            <Readout
              label="If IR were 10% higher"
              value={wheelRate(rates.front.springRate, rates.front.installationRatio * 1.1).toFixed(
                1
              )}
              unit="N/mm"
              tone="danger"
            />
          </Readouts>
        </Panel>

        <Panel
          title="The tyre is the other spring"
          reference="Ch 16 Ex 16.7"
          note={
            <>
              How much of the wheel rate the tyre takes away depends only on the{' '}
              <strong>ratio</strong> K<sub>w</sub>/K<sub>T</sub>. That is why the same tyre
              is a 7% correction on a road car and a third of the total compliance on a
              high-downforce one.
            </>
          }
        >
          <Chart
            series={tireCurve}
            height={230}
            xLabel="Wheel rate (N/mm)"
            yLabel="Compliance in the tyre (%)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(0)}
            vRules={[{ value: d.front.wheelRate, label: 'your car', color: '#dbe4ee' }]}
          />
          <Chart
            series={freqCurve}
            height={190}
            xLabel="Spring rate (N/mm)"
            yLabel="Ride frequency (Hz)"
            zeroY={false}
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(2)}
            vRules={[{ value: rates.front.springRate, label: 'now', color: '#dbe4ee' }]}
          />
          <div className="panel-note">
            The grey line is the answer you get by treating the tyre as rigid. The gap
            between them is not a rounding error — and it <em>grows</em> with spring rate,
            so the stiffer the car, the more wrong the shortcut becomes.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Where this sits in the course">
          <Explain
            seeing={
              <>
                The arithmetic that connects a setup sheet to a vehicle model. Springs,
                bars, tyres and installation ratios go in; the four roll stiffnesses that
                Chapter 18 needs come out, along with the ride frequencies that decide
                whether the platform suits the surface and the aerodynamics.
              </>
            }
            look={
              <>
                The two multiplications everyone gets wrong. <strong>IR is squared</strong>,
                so a small measurement error is a large rate error. And the{' '}
                <strong>tyre is in series</strong>, so above about 100 N/mm of wheel rate
                the spring is no longer the thing you are adjusting.
              </>
            }
            matters={
              <>
                Because the roll gradient this produces sets the camber loss of Chapter 17,
                the elastic TLLTD sets the balance of Chapter 7, and the ride frequency sets
                what the dampers of Chapter 22 are working against. Get this chapter wrong
                and every one of those is wrong in a way no amount of track time will
                diagnose.
                <br />
                <br />
                The honest caveat from Ch 16 §9: this is the <em>simplified</em>{' '}
                calculation. Constant installation ratios, no angularity correction, no
                separate treatment of unsprung mass. Errors of 10–20% in absolute rates —
                but the <em>ratios</em>, which set balance, are far less affected. Use it
                for setup direction; measure on a rig for anything where the absolute
                frequency matters.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

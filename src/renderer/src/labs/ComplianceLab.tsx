/**
 * Chapter 23 lab -- compliances.
 *
 * The last chapter, and deliberately so: you cannot see what compliance does to
 * a car until you know what the car was supposed to do. Its whole content is
 * one relation --
 *
 *     1/K_eff = 1/K_intended + 1/K_compliance
 *
 * -- and three consequences that follow from it. The softest element dominates.
 * Effective stiffness is always less than intended. And adding stiffness to the
 * stiff element buys almost nothing, which is the entire explanation of "the
 * bar change didn't do anything".
 *
 * The chapter does not add a theory. It corrects the PARAMETERS of the theory
 * already built, so this lab's job is to show which earlier chapter each
 * correction lands in and how much of it survives.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, Verdict, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import {
  RACE_COMPLIANCE_TARGETS,
  ROAD_COMPLIANCE_TARGETS,
  camberBudget,
  camberMoment,
  carcassDeflection,
  chassisDilution,
  complianceSteerBudget,
  seriesRate,
  seriesUpgrade
} from '@core/vehicle/compliance.js'
import { deriveRates } from '@core/vehicle/rates.js'
import { derive } from '@core/vehicle/params.js'

const AY = 1.5

export function ComplianceLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const rates = useGarage((s) => s.rates)
  const targets = useGarage((s) => s.complianceTargets)
  const setTargets = useGarage((s) => s.setComplianceTargets)
  const compliance = useGarage((s) => s.compliance)
  const setCompliance = useGarage((s) => s.setCompliance)

  const v = derive(vehicle)
  const d = useMemo(() => deriveRates(rates), [rates])

  // --- the bar in series with its mounts ----------------------------------
  const barNominal = d.barRollRateFront
  const upgrade = useMemo(
    () => seriesUpgrade(barNominal, barNominal * 1.5, targets.barMountRate),
    [barNominal, targets.barMountRate]
  )

  const seriesChart: Series[] = useMemo(() => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const nominal = 2000 + (200000 * i) / 60
      return { x: nominal / 1000, y: seriesRate(nominal, targets.barMountRate) / 1000 }
    })
    return [
      { name: 'Effective bar rate (kN·m/rad)', color: '#4dd6c1', points: pts },
      {
        name: 'What you asked for',
        color: '#5f6f80',
        dashed: true,
        points: pts.map((p) => ({ x: p.x, y: p.x }))
      }
    ]
  }, [targets.barMountRate])

  // --- compliance steer at both ends --------------------------------------
  const steer = useMemo(
    () =>
      complianceSteerBudget({
        frontCoefficient: compliance.front.lateralComplianceSteer,
        rearCoefficient: compliance.rear.lateralComplianceSteer,
        frontForce: v.wf * AY,
        rearForce: v.wr * AY,
        ay: AY
      }),
    [compliance, v.wf, v.wr]
  )

  // --- compliance camber ---------------------------------------------------
  const fy = (v.wf * AY) / 2
  const moment = camberMoment(fy, 0.33)
  const complianceCamberDeg = (fy / 1000) * targets.camber
  const camber = camberBudget({
    targetCamber: -2.0,
    rollLoss: 1.2,
    geometryGain: 0.8,
    complianceLoss: complianceCamberDeg
  })

  // --- carcass -------------------------------------------------------------
  const carcass = carcassDeflection(v.wf * AY * 0.6, 380, 180)

  // --- chassis torsion ------------------------------------------------------
  const dilution = useMemo(
    () => chassisDilution(targets.chassisStiffness, d.rollRateFront, d.rollRateRear),
    [targets.chassisStiffness, d.rollRateFront, d.rollRateRear]
  )

  const dilutionChart: Series[] = useMemo(() => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const k = 500 + (19500 * i) / 60
      return { x: k, y: chassisDilution(k, d.rollRateFront, d.rollRateRear).effectiveness * 100 }
    })
    return [{ name: 'TLLTD change realized (%)', color: '#ff9f4d', points: pts }]
  }, [d.rollRateFront, d.rollRateRear])

  const isRoad = targets.lateralSteer > 0.15
  const verdict =
    dilution.effectiveness > 0.85
      ? {
          headline: 'Setup changes mostly arrive',
          tone: 'ok' as const,
          detail: (
            <>
              The chassis is stiff enough relative to the axles that a bar change lands
              roughly where the arithmetic says it will, and correlation between simulation
              and track has a chance.
            </>
          )
        }
      : {
          headline: `Only ${(dilution.effectiveness * 100).toFixed(0)}% of a setup change survives`,
          tone: 'front' as const,
          detail: (
            <>
              The chassis is a torsional spring between the two axles, so every TLLTD change
              is attenuated by an unknown and possibly non-linear factor. The whole apparatus
              of Chapters 7, 16 and 18 is being applied to a car that only partly obeys it —
              and the engineer slowly stops trusting the model. Fixing chassis stiffness is
              not a refinement; it is what makes the rest of the book applicable.
            </>
          )
        }

  const experiments: Experiment[] = [
    {
      title: 'Fit a bigger bar and get almost nothing',
      action: 'Look at the series chart, then soften the bar mounts toward a road car’s.',
      predict: 'How much of a 50% bar increase actually reaches the car?',
      result: (
        <>
          Only <strong>{(upgrade.realizedFraction * 100).toFixed(0)}%</strong> of it. The
          mounts are a spring in series, so the bar and its mounts share the deflection, and
          the softer of the two dominates.
          <br />
          <br />
          Note where the teal curve flattens: the mount rate is a <strong>hard ceiling</strong>
          . Even an infinitely stiff bar cannot exceed {(targets.barMountRate / 1000).toFixed(0)}{' '}
          kN·m/rad. So the remedy for "the bar change didn't do anything" is never a bigger
          bar — it is stiffer drop links and mounts.
        </>
      ),
      run: () => setTargets({ barMountRate: 45000 }),
      reset: () => setTargets({ barMountRate: RACE_COMPLIANCE_TARGETS.barMountRate })
    },
    {
      title: 'Build a road car’s deliberate cancellation',
      action: 'Set front compliance steer to 0.12 deg/kN and rear to 0.09.',
      predict: 'What does the net do? Is the car therefore fine?',
      result: (
        <>
          The net is nearly zero — front compliance oversteer balanced against rear
          compliance understeer, which is exactly how road car suspension engineers use
          bushings on purpose. Turn-in feel from the front, stability from the rear, tuned to
          a small controlled residual.
          <br />
          <br />
          <strong>But a small net is not small compliance.</strong> Each term is large
          individually, so the cancellation holds only at this lateral acceleration and this
          load split. Under braking, under power, or at a different A<sub>y</sub>, the two
          scale differently and it fails. The coefficients also drift independently with
          bushing age and temperature. And the phase lag each one introduces does not cancel
          at all.
          <br />
          <br />
          A race car should have <em>both</em> coefficients small, not two large ones that
          happen to agree today.
        </>
      ),
      run: () => {
        setCompliance('front', { lateralComplianceSteer: 0.12 })
        setCompliance('rear', { lateralComplianceSteer: 0.09 })
      },
      reset: () => {
        setCompliance('front', { lateralComplianceSteer: 0.008 })
        setCompliance('rear', { lateralComplianceSteer: 0.006 })
      }
    },
    {
      title: 'Find the camber you are losing to structure',
      action: 'Raise compliance camber toward a road car’s and read the static requirement.',
      predict: 'How much static camber exists purely to cancel deflection?',
      result: (
        <>
          Here, <strong>{(camber.complianceShare * 100).toFixed(0)}%</strong> of the static
          setting is doing nothing but covering structural deflection. Left unmeasured, the
          engineer sets the camber the kinematics imply, runs short of target dynamically,
          and spends the session chasing a front grip deficit with bars and pressures.
          <br />
          <br />
          And it is <em>load-dependent</em>, so a static camber chosen to be right at one
          lateral acceleration is wrong at every other — a nonlinearity in K(A<sub>y</sub>)
          that no kinematic model predicts. Which is why Ch 23 §5's priority is blunt:
          stiffening the upright is worth more than any amount of camber adjustment, because
          it removes the error instead of compensating for it at one point.
        </>
      ),
      run: () => setTargets({ camber: 0.22 }),
      reset: () => setTargets({ camber: RACE_COMPLIANCE_TARGETS.camber })
    },
    {
      title: 'Soften the chassis and watch the model stop applying',
      action: 'Drop chassis stiffness toward 1500 N·m/deg.',
      predict: 'What fraction of a bar change still reaches the tyres?',
      result: (
        <>
          The chassis sits as a torsional spring between the two axle roll rates, so it
          dilutes every TLLTD change made with bars. Below about 3000 N·m/deg a substantial
          fraction of each adjustment disappears into twist.
          <br />
          <br />
          Ch 23 §6 offers two readings and they disagree. Against the front/rear{' '}
          <em>difference</em> — the book's own criterion — even a modest chassis is
          comfortably stiff. Against the common heuristic of 5–10× the <em>total</em> roll
          stiffness, the same chassis falls short. The honest conclusion is that it transmits
          the differential torque adequately while still diluting setup changes enough to be
          worth measuring.
        </>
      ),
      run: () => setTargets({ chassisStiffness: 1500 }),
      reset: () => setTargets({ chassisStiffness: RACE_COMPLIANCE_TARGETS.chassisStiffness })
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Every chapter so far assumed rigid links. This one removes the assumption and finds
        that the difference between what the geometry says and what the car does is routinely{' '}
        <strong>20–40%</strong> on the quantities that matter. Compliance is not a new theory
        — it corrects the parameters of the one already built.
      </div>

      <div className="stage">
        <Panel
          title="Everything is two springs in series"
          reference="Ch 23 §3"
          right={
            <ButtonRow
              options={[
                { value: 'race', label: 'Race targets' },
                { value: 'road', label: 'Road car' }
              ]}
              value={isRoad ? 'road' : 'race'}
              onChange={(x) =>
                setTargets(x === 'road' ? ROAD_COMPLIANCE_TARGETS : RACE_COMPLIANCE_TARGETS)
              }
            />
          }
          note={
            <>
              The teal curve is what you get; the grey line is what you asked for. They part
              company early, and the curve <strong>flattens toward the mount rate</strong> —
              which is a ceiling no amount of bar can pass.
            </>
          }
        >
          <Formula
            tex={String.raw`\frac{1}{K_{\text{eff}}}=\frac{1}{K_{\text{intended}}}+\frac{1}{K_{\text{compliance}}}`}
            block
          />
          <Chart
            series={seriesChart}
            height={250}
            xLabel="Nominal bar rate (kN·m/rad)"
            yLabel="Effective rate (kN·m/rad)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(0)}
            vRules={[{ value: barNominal / 1000, label: 'your bar', color: '#dbe4ee' }]}
            hRules={[
              {
                value: targets.barMountRate / 1000,
                label: 'ceiling set by the mounts',
                color: '#ff6b6b'
              }
            ]}
          />
          <Readouts>
            <Readout label="Bar, nominal" value={(barNominal / 1000).toFixed(1)} unit="kN·m/rad" />
            <Readout
              label="Bar, effective"
              value={(upgrade.before / 1000).toFixed(1)}
              unit="kN·m/rad"
              tone="accent"
            />
            <Readout label="Lost to mounts" value={`${(upgrade.lossBefore * 100).toFixed(0)}%`} tone="danger" />
            <Readout
              label="A 50% bigger bar delivers"
              value={`${(upgrade.realizedFraction * 100).toFixed(0)}%`}
              unit="of the intent"
              tone={upgrade.realizedFraction > 0.7 ? 'ok' : 'warn'}
            />
          </Readouts>
          <Slider
            label="Bar mount and drop-link rate"
            unit="kN·m/rad"
            value={targets.barMountRate / 1000}
            min={10}
            max={300}
            step={5}
            digits={0}
            onChange={(k) => setTargets({ barMountRate: k * 1000 })}
          />
        </Panel>

        <div className="stack">
          <Panel
            title="Compliance steer, both ends"
            reference="Ch 23 §4"
            note={
              <>
                Positive means the axle steers <strong>into</strong> the turn under its own
                lateral force. At the front that is an oversteer contribution; at the rear the
                identical sign is an understeer contribution.
              </>
            }
          >
            <Slider
              label="Front lateral compliance steer"
              unit="deg/kN"
              value={compliance.front.lateralComplianceSteer}
              min={0}
              max={0.2}
              step={0.002}
              digits={3}
              onChange={(lateralComplianceSteer) =>
                setCompliance('front', { lateralComplianceSteer })
              }
            />
            <Slider
              label="Rear lateral compliance steer"
              unit="deg/kN"
              value={compliance.rear.lateralComplianceSteer}
              min={0}
              max={0.2}
              step={0.002}
              digits={3}
              onChange={(lateralComplianceSteer) =>
                setCompliance('rear', { lateralComplianceSteer })
              }
            />
            <Readouts>
              <Readout label="Front steers" value={steer.front.steer.toFixed(3)} unit="deg" tone="front" />
              <Readout label="Rear steers" value={steer.rear.steer.toFixed(3)} unit="deg" tone="rear" />
              <Readout
                label="Front adds to K"
                value={`${steer.front.deltaK >= 0 ? '+' : ''}${steer.front.deltaK.toFixed(3)}`}
                unit="deg/g"
              />
              <Readout
                label="Rear adds to K"
                value={`${steer.rear.deltaK >= 0 ? '+' : ''}${steer.rear.deltaK.toFixed(3)}`}
                unit="deg/g"
              />
              <Readout
                label="Net"
                value={`${steer.net >= 0 ? '+' : ''}${steer.net.toFixed(3)}`}
                unit="deg/g"
                tone="accent"
              />
              <Readout
                label="Gross"
                value={steer.gross.toFixed(3)}
                unit="deg/g"
                tone={steer.gross > 0.3 ? 'danger' : 'ok'}
              />
            </Readouts>
            <div className="panel-note">
              {steer.cancellation > 0.7 && steer.gross > 0.2 ? (
                <>
                  <strong>The two are cancelling.</strong> That is a road car design, and it
                  works only at this lateral acceleration and this load split. A race car
                  wants both terms small, not two large ones that agree today.
                </>
              ) : (
                <>
                  Both terms small — the race car answer. The Ch 23 §7 rig target is under
                  0.05 deg/kN; road cars run 0.2–0.5 by design.
                </>
              )}
            </div>
          </Panel>

          <Panel title="Compliance camber" reference="Ch 23 §5">
            <Slider
              label="Compliance camber"
              unit="deg/kN"
              value={targets.camber}
              min={0}
              max={0.35}
              step={0.005}
              digits={3}
              onChange={(camberRate) => setTargets({ camber: camberRate })}
            />
            <Readouts>
              <Readout label="Moment into the upright" value={moment.toFixed(0)} unit="N·m" tone="warn" />
              <Readout label="Camber lost to deflection" value={complianceCamberDeg.toFixed(2)} unit="deg" tone="danger" />
              <Readout label="Static camber needed" value={camber.staticCamber.toFixed(2)} unit="deg" tone="accent" />
              <Readout
                label="…of which, for deflection"
                value={`${(camber.complianceShare * 100).toFixed(0)}%`}
              />
            </Readouts>
            <div className="panel-note">
              Lateral force acts at ground level, a rolling radius below the wheel centre, so
              it always tries to camber the wheel <strong>positively</strong> — the
              unfavourable way. And it scales with load, so a static setting correct at one
              lateral acceleration is wrong at all the others.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Chassis torsion dilutes every setup change"
          reference="Ch 23 §7 and Ex 23.6"
          note={
            <>
              The chassis is a torsional spring sitting between the two axles' roll rates. If
              it is soft relative to them, a bar change partly disappears into twist before it
              ever reaches a tyre.
            </>
          }
        >
          <Chart
            series={dilutionChart}
            height={230}
            xLabel="Chassis torsional stiffness (N·m/deg)"
            yLabel="TLLTD change realized (%)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(0)}
            vRules={[{ value: targets.chassisStiffness, label: 'your car', color: '#dbe4ee' }]}
          />
          <Slider
            label="Chassis torsional stiffness"
            unit="N·m/deg"
            value={targets.chassisStiffness}
            min={800}
            max={20000}
            step={100}
            digits={0}
            onChange={(chassisStiffness) => setTargets({ chassisStiffness })}
          />
          <Readouts>
            <Readout
              label="Chassis vs total axle rate"
              value={dilution.chassisToAxleRatio.toFixed(2)}
              unit="×"
            />
            <Readout
              label="Chassis vs front/rear difference"
              value={
                isFinite(dilution.differenceRatio) ? dilution.differenceRatio.toFixed(0) : '∞'
              }
              unit="×"
              tone="ok"
            />
            <Readout
              label="Setup change realized"
              value={`${(dilution.effectiveness * 100).toFixed(0)}%`}
              tone={dilution.effectiveness > 0.85 ? 'ok' : 'danger'}
            />
          </Readouts>
          <div style={{ padding: '0 12px 12px' }}>
            <Verdict headline={verdict.headline} tone={verdict.tone}>
              {verdict.detail}
            </Verdict>
          </div>
        </Panel>

        <Panel
          title="The two biggest compliances are not bushings"
          reference="Ch 23 §2"
          note={
            <>
              On a well-built race car the largest single terms are the{' '}
              <strong>tyre carcass</strong> and the <strong>steering system</strong>. Neither
              is something a suspension designer usually thinks of as compliance.
            </>
          }
        >
          <Readouts>
            <Readout label="Carcass deflection" value={carcass.deflectionMm.toFixed(1)} unit="mm" tone="warn" />
            <Readout
              label="Looks like this much slip"
              value={carcass.apparentSlipDeg.toFixed(1)}
              unit="deg"
              tone="danger"
            />
          </Readouts>
          <div className="panel-note">
            That number is an overestimate of the <em>additional</em> slip angle, and the
            reason it is an overestimate is the point: a measured cornering stiffness{' '}
            <strong>already contains the carcass</strong>. The tyre is tread stiffness and
            carcass stiffness in series, which is why the brush model's{' '}
            <em>C<sub>α</sub> = 2c<sub>p</sub>a²</em> underpredicts real tyres and why{' '}
            <em>C<sub>α</sub></em> is always measured rather than calculated.
            <br />
            <br />
            The practical consequence: <strong>tyre pressure changes carcass stiffness</strong>
            , therefore cornering stiffness, therefore peak slip angle, therefore the balance.
            That is why pressure is such a high-leverage adjustment, and it is the same
            mechanism Chapter 16 met from the other side, where the carcass is one of the two
            springs setting ride rate.
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Why this chapter is last">
          <Explain
            seeing={
              <>
                Four corrections, each landing in a chapter you have already built. The bar
                rate of Chapter 16 is reduced. The camber curve of Chapter 17 is offset. The
                cornering compliance of Chapter 5 gains two rows. The TLLTD of Chapter 18 is
                diluted.
              </>
            }
            look={
              <>
                That none of them is a new phenomenon. Every one is the same series relation
                applied to a different load path, and every one makes the real car{' '}
                <em>softer</em> than the drawing — never stiffer.
              </>
            }
            matters={
              <>
                Because the discipline that follows is what separates a car that behaves as
                calculated from one that does not: design the kinematics, compute the rates
                and load transfers, predict the balance,{' '}
                <strong>measure the compliances</strong>, correct the model parameters, then
                re-predict and validate against the track.
                <br />
                <br />
                Skipping the measurement step is why so many well-calculated cars do not
                behave as calculated. And on a race car the philosophy is the opposite of a
                road car's: eliminate compliance so the kinematics you designed are the
                kinematics you have — with the occasional deliberate exception, such as a
                rack mount kept slightly soft to filter a resonance out of the driver's hands.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

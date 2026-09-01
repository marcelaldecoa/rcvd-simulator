/**
 * Chapter 5 lab -- steady-state stability and control.
 *
 * The chapter's whole apparatus from one parameter set:
 *   - the understeer gradient and its Bundorf decomposition
 *   - the constant-radius skid pad, whose slope IS K
 *   - the three response gains sharing one stability-factor denominator
 *   - the significant speeds: characteristic, critical, tangent
 *   - the neutral steer point and static margin
 *   - and the closing caveat: with real tires, K is not a constant
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { CarDiagram, describeBalance } from '../components/CarDiagram'
import { Verdict } from '../components/Teach'
import {
  BalancePill,
  ButtonRow,
  Formula,
  Panel,
  Readout,
  Readouts,
  Slider
} from '../components/ui'
import { stiffnessFromTires, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { scaleTire } from '@core/tire/scale.js'
import { VEHICLE_PRESETS, derive } from '@core/vehicle/params.js'
import {
  axleLimits,
  constantRadiusSweep,
  nonlinearConstantRadiusSweep,
  responseAtSpeed,
  speedSweep,
  summarise,
  trimFromSteer
} from '@core/vehicle/steadyState.js'
import {
  FORMULA_COMPLIANCE,
  NO_COMPLIANCE,
  SEDAN_COMPLIANCE,
  budgetShares,
  understeerBudget
} from '@core/vehicle/understeerBudget.js'
import { G, toDeg } from '@core/util/numeric.js'

const RADIUS = 60 // m, a typical skid pad

export function SteadyStateLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const setVehicle = useGarage((s) => s.setVehicle)
  const replaceVehicle = useGarage((s) => s.replaceVehicle)
  const tire = useGarage((s) => s.tire)
  const rearScale = useGarage((s) => s.rearTireScale)
  const setRearScale = useGarage((s) => s.setRearTireScale)
  const speed = useGarage((s) => s.speed)
  const setSpeed = useGarage((s) => s.setSpeed)
  const syncStiffness = useGarage((s) => s.syncStiffnessFromTire)
  const chassis = useGarage((s) => s.chassis)
  const compliance = useGarage((s) => s.compliance)
  const setCompliance = useGarage((s) => s.setCompliance)

  const d = derive(vehicle)
  const s = summarise(vehicle)
  const r = responseAtSpeed(vehicle, speed)
  const tireFront = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireRear = useMemo(() => new MagicFormulaTire(scaleTire(tire, rearScale)), [tire, rearScale])

  // What the linear model's Cf and Cr *would* be if taken from the tires.
  const implied = useMemo(
    () => stiffnessFromTires(vehicle, tire, rearScale),
    [vehicle, tire, rearScale]
  )
  const mismatch = Math.max(
    Math.abs(vehicle.cf - implied.cf) / implied.cf,
    Math.abs(vehicle.cr - implied.cr) / implied.cr
  )

  const vMax = 80

  /** Lateral acceleration the picture and the trim readouts are taken at. */
  const [trimAy, setTrimAy] = useState(0.5)
  /** Lateral acceleration the budget's two aligning-torque rows are evaluated at. */
  const [budgetAy, setBudgetAy] = useState(0.5)
  const limits = useMemo(
    () => axleLimits(vehicle, tireFront, tireRear),
    [vehicle, tireFront, tireRear]
  )

  // --- Constant-radius skid pad ------------------------------------------
  const nonlinear = useMemo(
    () => nonlinearConstantRadiusSweep(vehicle, tireFront, tireRear, RADIUS, 50),
    [vehicle, tireFront, tireRear]
  )
  const ayLimit = nonlinear.length ? nonlinear[nonlinear.length - 1].ay : 1.5

  const skidPad: Series[] = useMemo(() => {
    const linear = constantRadiusSweep(vehicle, RADIUS, ayLimit)
    return [
      {
        name: 'Linear theory  δ = L/R + K·Ay',
        color: '#4dd6c1',
        points: linear.map((p) => ({ x: p.ay, y: toDeg(p.steer) }))
      },
      {
        name: 'With nonlinear tires',
        color: '#ffcc55',
        points: nonlinear.map((p) => ({ x: p.ay, y: toDeg(p.steer) }))
      },
      {
        name: 'Ackermann L/R',
        color: '#5f6f80',
        dashed: true,
        points: linear.map((p) => ({ x: p.ay, y: toDeg(p.ackermann) }))
      }
    ]
  }, [vehicle, nonlinear, ayLimit])

  const localK: Series[] = useMemo(
    () => [
      {
        name: 'Local K (nonlinear)',
        color: '#ffcc55',
        points: nonlinear.slice(1).map((p) => ({ x: p.ay, y: toDeg(p.localK) }))
      },
      {
        name: 'Linear-theory K',
        color: '#4dd6c1',
        dashed: true,
        points: nonlinear.slice(1).map((p) => ({ x: p.ay, y: s.KDeg }))
      }
    ],
    [nonlinear, s.KDeg]
  )

  // --- Response gains vs speed -------------------------------------------
  const sweep = useMemo(() => speedSweep(vehicle, vMax, 160), [vehicle])

  const gainCurves: Series[] = useMemo(
    () => [
      {
        name: 'Yaw rate gain r/δ',
        color: '#4dd6c1',
        points: sweep.map((p) => ({ x: p.speed, y: p.yawGain }))
      },
      {
        name: 'Neutral steer V/L',
        color: '#5f6f80',
        dashed: true,
        points: sweep.map((p) => ({ x: p.speed, y: p.speed / d.L }))
      }
    ],
    [sweep, d.L]
  )

  const ayGainCurve: Series[] = useMemo(
    () => [
      {
        name: 'Lateral accel gain Ay/δ',
        color: '#5aa9ff',
        points: sweep.map((p) => ({ x: p.speed, y: p.lateralAccelGain }))
      }
    ],
    [sweep]
  )

  const sideslipCurve: Series[] = useMemo(
    () => [
      {
        name: 'Sideslip gain β/δ',
        color: '#ff9f4d',
        points: sweep.map((p) => ({ x: p.speed, y: p.sideslipGain }))
      }
    ],
    [sweep]
  )

  const stabilityCurve: Series[] = useMemo(
    () => [
      {
        name: 'Stability factor 1 + KV²/gL',
        color: '#6ee787',
        points: sweep.map((p) => ({ x: p.speed, y: p.stabilityFactor }))
      }
    ],
    [sweep]
  )

  // --- Understeer budget --------------------------------------------------
  // All six rows, live. Five of them need chapters this one has not reached
  // yet, which is the honest situation: Ch 5 defines the table and Ch 2, 17, 19
  // and 23 fill it in.
  const budget = useMemo(
    () =>
      understeerBudget({
        vehicle,
        chassis,
        tireFront,
        tireRear,
        compliance,
        ay: budgetAy
      }),
    [vehicle, chassis, tireFront, tireRear, compliance, budgetAy]
  )
  const shares = useMemo(() => budgetShares(budget), [budget])
  const bareK = useMemo(
    () =>
      understeerBudget({
        vehicle,
        chassis,
        tireFront,
        tireRear,
        compliance: NO_COMPLIANCE,
        ay: budgetAy,
        ignorePneumaticTrail: true
      }).K,
    [vehicle, chassis, tireFront, tireRear, budgetAy]
  )

  const trim = trimFromSteer(
    vehicle,
    speed,
    r.lateralAccelGain > 0 ? trimAy / r.lateralAccelGain : 0
  )
  const usageFront = limits.capacityFront > 0 ? (d.wf * trim.ay) / limits.capacityFront : 0
  const usageRear = limits.capacityRear > 0 ? (d.wr * trim.ay) / limits.capacityRear : 0
  const verdict = describeBalance(trim.alphaF, trim.alphaR, trim.beta, usageFront, usageRear)

  const vRules = [
    ...(s.characteristicSpeed && s.characteristicSpeed < vMax
      ? [{ value: s.characteristicSpeed, label: 'V_char', color: '#4dd6c1' }]
      : []),
    ...(s.criticalSpeed && s.criticalSpeed < vMax
      ? [{ value: s.criticalSpeed, label: 'V_crit', color: '#ff6b6b' }]
      : []),
    ...(s.tangentSpeed < vMax
      ? [{ value: s.tangentSpeed, label: 'V_tan', color: '#ff9f4d' }]
      : []),
    { value: speed, label: 'now', color: '#dbe4ee', dashed: false as const }
  ]

  const unstableBand =
    s.criticalSpeed && s.criticalSpeed < vMax
      ? [{ from: s.criticalSpeed, to: vMax, color: 'rgba(255,107,107,0.07)' }]
      : []

  return (
    <div className="lab">
      <div className="stack">
        <Panel
          title="The car"
          reference="Ch 5 §2"
          right={
            <select
              style={{ width: 'auto', fontSize: 11, padding: '2px 5px' }}
              value={vehicle.name}
              onChange={(e) => {
                const p = VEHICLE_PRESETS.find((v) => v.name === e.target.value)
                if (p) replaceVehicle(p)
              }}
            >
              {VEHICLE_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              {!VEHICLE_PRESETS.some((p) => p.name === vehicle.name) && (
                <option value={vehicle.name}>{vehicle.name}</option>
              )}
            </select>
          }
        >
          <Slider
            label="Mass"
            unit="kg"
            value={vehicle.mass}
            min={400}
            max={2000}
            step={10}
            digits={0}
            onChange={(mass) => setVehicle({ mass })}
          />
          <Slider
            label="Wheelbase"
            unit="m"
            value={d.L}
            min={1.8}
            max={3.6}
            step={0.01}
            onChange={(L) => {
              const f = d.frontWeightFraction
              setVehicle({ a: L * (1 - f), b: L * f })
            }}
          />
          <Slider
            label="Front weight fraction"
            unit="%"
            value={d.frontWeightFraction}
            min={0.35}
            max={0.65}
            step={0.005}
            display={(d.frontWeightFraction * 100).toFixed(1)}
            onChange={(f) => setVehicle({ a: d.L * (1 - f), b: d.L * f })}
          />
          <Slider
            label="Front axle stiffness Cf"
            unit="kN/rad"
            value={vehicle.cf}
            min={30000}
            max={300000}
            step={1000}
            display={(vehicle.cf / 1000).toFixed(0)}
            onChange={(cf) => setVehicle({ cf })}
          />
          <Slider
            label="Rear axle stiffness Cr"
            unit="kN/rad"
            value={vehicle.cr}
            min={30000}
            max={300000}
            step={1000}
            display={(vehicle.cr / 1000).toFixed(0)}
            onChange={(cr) => setVehicle({ cr })}
          />
          <Slider
            label="Speed"
            unit="m/s"
            value={speed}
            min={5}
            max={vMax}
            step={0.5}
            digits={1}
            display={`${speed.toFixed(1)}  (${(speed * 3.6).toFixed(0)} km/h)`}
            onChange={setSpeed}
          />
          <Slider
            label="Rear tire size vs front"
            unit="×"
            value={rearScale}
            min={0.8}
            max={1.8}
            step={0.01}
            onChange={setRearScale}
          />
          <div style={{ marginTop: 10 }}>
            <ButtonRow
              options={[{ value: 'sync', label: 'Set Cf, Cr from the Ch 2 tires' }]}
              value={''}
              onChange={syncStiffness}
            />
          </div>
          {mismatch > 0.1 && (
            <div className="warn-box">
              The linear model's axle stiffnesses disagree with what the Ch 2 tires
              actually produce at these loads by {(mismatch * 100).toFixed(0)}% (implied{' '}
              {(implied.cf / 1000).toFixed(0)} / {(implied.cr / 1000).toFixed(0)} kN/rad).
              The linear and nonlinear curves below are describing two different cars.
            </div>
          )}
        </Panel>

        <Panel title="Understeer gradient" reference="Ch 5 §4" right={<BalancePill balance={s.balance} />}>
          <Formula tex="K = \frac{W_f}{C_f} - \frac{W_r}{C_r} = D_f - D_r" block />
          <Readouts>
            <Readout
              label="K"
              value={s.KDeg.toFixed(3)}
              unit="deg/g"
              tone={s.balance === 'oversteer' ? 'danger' : s.balance === 'neutral' ? 'ok' : 'accent'}
            />
            <Readout label="Df front compliance" value={(s.Df * (180 / Math.PI)).toFixed(3)} unit="deg/g" tone="front" />
            <Readout label="Dr rear compliance" value={(s.Dr * (180 / Math.PI)).toFixed(3)} unit="deg/g" tone="rear" />
            <Readout label="Static margin" value={(s.staticMargin * 100).toFixed(2)} unit="% WB" />
            <Readout label="Neutral steer point" value={s.neutralSteerPoint.toFixed(3)} unit="m aft front" />
            <Readout label="Dynamic index" value={d.dynamicIndex.toFixed(3)} />
          </Readouts>
        </Panel>

        <Panel title="Significant speeds" reference="Ch 5 §5">
          <Readouts>
            <Readout
              label="Characteristic speed"
              value={s.characteristicSpeed ? s.characteristicSpeed.toFixed(1) : '—'}
              unit={s.characteristicSpeed ? 'm/s' : undefined}
              tone="accent"
            />
            <Readout
              label="Critical speed"
              value={s.criticalSpeed ? s.criticalSpeed.toFixed(1) : '—'}
              unit={s.criticalSpeed ? 'm/s' : undefined}
              tone="danger"
            />
            <Readout label="Tangent speed" value={s.tangentSpeed.toFixed(1)} unit="m/s" tone="warn" />
          </Readouts>
          {s.criticalSpeed && (
            <div className="warn-box">
              This car is oversteering. Above {s.criticalSpeed.toFixed(1)} m/s (
              {(s.criticalSpeed * 3.6).toFixed(0)} km/h) it cannot be held on a steady path
              by a fixed steer input — yaw response grows without bound. Ch 6 shows this is
              the same event as the yaw natural frequency reaching zero.
            </div>
          )}
        </Panel>
      </div>

      <div className="stack">
        <div className="grid2">
          <Panel
            title={`Constant-radius skid pad, R = ${RADIUS} m`}
            reference="Ch 5 §4 · Ch 11"
            note={
              <>
                The single most useful result in vehicle dynamics, and the highest
                information-per-effort test in the field: <strong>the slope of this line
                is K</strong>. The intercept at zero lateral acceleration is the Ackermann
                angle L/R. With real tires the line curves upward near the limit — the
                chapter's closing point that K is not a constant.
              </>
            }
          >
            <Chart
              series={skidPad}
              height={250}
              xLabel="Lateral acceleration Ay (g)"
              yLabel="Road-wheel steer δ (deg)"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(1)}
            />
          </Panel>

          <Panel
            title="Local understeer gradient"
            reference="Ch 5, closing section"
            note={
              <>
                <Formula tex="K_{local} = \frac{d\delta}{dA_y}" /> computed from the
                nonlinear sweep. Linear theory holds a constant K; the real car's gradient
                climbs as the tires move onto the flat part of their curves. Limit lateral
                acceleration here is <strong>{ayLimit.toFixed(2)} g</strong>.
              </>
            }
          >
            <Chart
              series={localK}
              height={250}
              xLabel="Lateral acceleration Ay (g)"
              yLabel="Local K (deg/g)"
              /* Clamped: the gradient diverges as an axle saturates, and an
                 autoscaled axis would squash the whole useful range flat. */
              yDomain={[Math.min(0, s.KDeg * 1.5), Math.max(Math.abs(s.KDeg) * 6, 1.2)]}
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(2)}
            />
          </Panel>
        </div>

        <Panel
          title="Response gains versus speed"
          reference="Ch 5 §6"
          note={
            <>
              All three gains share the denominator{' '}
              <Formula tex="1 + KV^2/(gL)" /> — the fingerprint of the understeer gradient
              in every steady-state response. Yaw gain peaks at the characteristic speed
              for an understeering car, rises without bound toward the critical speed for
              an oversteering one, and is exactly V/L for a neutral car. Sideslip changes
              sign at the tangent speed: below it the nose points out of the corner, above
              it into the corner.
            </>
          }
        >
          <div className="grid2">
            <Chart
              series={gainCurves}
              height={200}
              xLabel="Speed V (m/s)"
              yLabel="r/δ  (1/s)"
              vRules={vRules}
              xBands={unstableBand}
              xDomain={[0, vMax]}
              yDomain={[0, Math.min(Math.max(...sweep.map((p) => p.yawGain)) * 1.1, vMax / d.L * 3)]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(2)}
            />
            <Chart
              series={ayGainCurve}
              height={200}
              xLabel="Speed V (m/s)"
              yLabel="Ay/δ  (g/rad)"
              vRules={vRules}
              xBands={unstableBand}
              xDomain={[0, vMax]}
              yDomain={[0, Math.min(Math.max(...sweep.map((p) => p.lateralAccelGain)) * 1.1, 200)]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(0)}
            />
            <Chart
              series={sideslipCurve}
              height={200}
              xLabel="Speed V (m/s)"
              yLabel="β/δ  (rad/rad)"
              vRules={vRules}
              xDomain={[0, vMax]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(2)}
            />
            <Chart
              series={stabilityCurve}
              height={200}
              xLabel="Speed V (m/s)"
              yLabel="Stability factor"
              vRules={vRules}
              hRules={[{ value: 0, label: 'divergence', color: '#ff6b6b' }]}
              xDomain={[0, vMax]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(1)}
            />
          </div>
        </Panel>

        <div className="grid2">
          <Panel
            title={`Stability derivatives at ${speed.toFixed(0)} m/s`}
            reference="Ch 5 §7"
            note={
              <>
                <Formula tex="N_\beta" /> is the master stability parameter — the yawing
                moment per unit sideslip. Stabilising means understeer; destabilising means
                oversteer. It carries the same physical content as K, in the language
                Milliken brought over from aircraft stability and control.
              </>
            }
          >
            <table className="data">
              <thead>
                <tr>
                  <th>Derivative</th>
                  <th>Value</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Y<sub>β</sub></td>
                  <td>{(r.derivatives.yBeta / 1000).toFixed(1)} kN/rad</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>damping in sideslip</td>
                </tr>
                <tr>
                  <td>Y<sub>r</sub></td>
                  <td>{(r.derivatives.yR / 1000).toFixed(2)} kN·s/rad</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>force from yaw rate</td>
                </tr>
                <tr>
                  <td>Y<sub>δ</sub></td>
                  <td>{(r.derivatives.yDelta / 1000).toFixed(1)} kN/rad</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>control force</td>
                </tr>
                <tr>
                  <td>N<sub>β</sub></td>
                  <td style={{ color: r.derivatives.nBeta > 0 ? 'var(--front)' : 'var(--danger)' }}>
                    {(r.derivatives.nBeta / 1000).toFixed(1)} kN·m/rad
                  </td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>
                    static directional stability
                  </td>
                </tr>
                <tr>
                  <td>N<sub>r</sub></td>
                  <td>{(r.derivatives.nR / 1000).toFixed(1)} kN·m·s/rad</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>yaw damping</td>
                </tr>
                <tr>
                  <td>N<sub>δ</sub></td>
                  <td>{(r.derivatives.nDelta / 1000).toFixed(1)} kN·m/rad</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text-faint)' }}>control moment</td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Understeer budget"
            reference="Ch 5 §4.1 · Ch 2, 17, 19, 23"
            right={
              <ButtonRow
                options={[
                  { value: 'formula', label: 'Race car' },
                  { value: 'sedan', label: 'Road car' },
                  { value: 'none', label: 'Ideal' }
                ]}
                value={
                  compliance.front.aligningComplianceSteer ===
                  SEDAN_COMPLIANCE.front.aligningComplianceSteer
                    ? 'sedan'
                    : compliance.front.aligningComplianceSteer === 0
                      ? 'none'
                      : 'formula'
                }
                onChange={(v) => {
                  const pick =
                    v === 'sedan'
                      ? SEDAN_COMPLIANCE
                      : v === 'none'
                        ? NO_COMPLIANCE
                        : FORMULA_COMPLIANCE
                  setCompliance('front', pick.front)
                  setCompliance('rear', pick.rear)
                }}
              />
            }
            note={
              <>
                The contributions to cornering compliance are additive, so they can be
                tabulated and summed <em>by mechanism</em>. That is what turns "the car
                understeers" into a plan: the last column says which chapter to go and
                read, and the bar says how much of the answer is sitting in that row.
                <br />
                <br />
                Chapter 5 can only fill in the first line. The other five are the reason
                Part II exists.
              </>
            }
          >
            <table className="data">
              <thead>
                <tr>
                  <th>Mechanism</th>
                  <th>Front</th>
                  <th>Rear</th>
                  <th>Share of K</th>
                  <th>Ch</th>
                </tr>
              </thead>
              <tbody>
                {budget.lines.map((l, i) => (
                  <tr key={l.mechanism}>
                    <td>{l.mechanism}</td>
                    <td>{l.front.toFixed(3)}</td>
                    <td>{l.rear.toFixed(3)}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          height: 7,
                          width: `${Math.round(shares[i].share * 100)}%`,
                          minWidth: shares[i].share > 0.002 ? 2 : 0,
                          background: shares[i].k >= 0 ? 'var(--accent)' : 'var(--danger)',
                          verticalAlign: 'middle',
                          marginRight: 5
                        }}
                      />
                      <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                        {shares[i].k >= 0 ? '+' : '−'}
                        {Math.round(shares[i].share * 100)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-faint)', fontSize: 10 }}>{l.chapter}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td style={{ color: 'var(--text)' }}>Df, Dr (deg/g)</td>
                  <td style={{ color: 'var(--front)' }}>{budget.Df.toFixed(3)}</td>
                  <td style={{ color: 'var(--rear)' }}>{budget.Dr.toFixed(3)}</td>
                  <td colSpan={2} />
                </tr>
                <tr className="total">
                  <td style={{ color: 'var(--text)' }}>K = Df − Dr</td>
                  <td colSpan={2} style={{ color: 'var(--accent)' }}>
                    {budget.K.toFixed(3)} deg/g
                  </td>
                  <td colSpan={2} style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                    Ch 5 alone says {bareK.toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>

            <Slider
              label="Evaluate the budget at"
              unit="g"
              value={budgetAy}
              min={0.1}
              max={1.6}
              step={0.05}
              onChange={setBudgetAy}
            />
            <div className="panel-note">
              The budget is a linear construction with two rows that are not. Pneumatic
              trail collapses as the tyre saturates, so both aligning-torque rows{' '}
              <strong>shrink as you slide this toward the limit</strong> — which is
              part of why a car's K is not a constant, and why those rows shape the K(Ay)
              curve rather than merely offsetting it.
            </div>

            <div className="grid2" style={{ marginTop: 4 }}>
              <div>
                <Slider
                  label="Front roll camber"
                  unit="deg/deg"
                  value={compliance.front.rollCamber}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(rollCamber) => setCompliance('front', { rollCamber })}
                />
                <Slider
                  label="Front roll steer"
                  unit="deg/deg"
                  value={compliance.front.rollSteer}
                  min={-0.2}
                  max={0.2}
                  step={0.005}
                  digits={3}
                  onChange={(rollSteer) => setCompliance('front', { rollSteer })}
                />
                <Slider
                  label="Front steering compliance"
                  unit="deg/kN·m"
                  value={compliance.front.aligningComplianceSteer}
                  min={0}
                  max={1.6}
                  step={0.02}
                  onChange={(aligningComplianceSteer) =>
                    setCompliance('front', { aligningComplianceSteer })
                  }
                />
              </div>
              <div>
                <Slider
                  label="Rear roll camber"
                  unit="deg/deg"
                  value={compliance.rear.rollCamber}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(rollCamber) => setCompliance('rear', { rollCamber })}
                />
                <Slider
                  label="Rear roll steer"
                  unit="deg/deg"
                  value={compliance.rear.rollSteer}
                  min={-0.2}
                  max={0.2}
                  step={0.005}
                  digits={3}
                  onChange={(rollSteer) => setCompliance('rear', { rollSteer })}
                />
                <Slider
                  label="Rear lateral compliance steer"
                  unit="deg/kN"
                  value={compliance.rear.lateralComplianceSteer}
                  min={-0.08}
                  max={0.08}
                  step={0.002}
                  digits={3}
                  onChange={(lateralComplianceSteer) =>
                    setCompliance('rear', { lateralComplianceSteer })
                  }
                />
              </div>
            </div>
            <div className="panel-note">
              Positive roll steer and positive compliance steer both mean{' '}
              <strong>the axle steers itself into the turn</strong>. At the rear that is
              stabilising — the rear roll understeer of Ch 19 §5, and the
              rear-toe-in-under-load of Ch 23 §4. At the front the identical sign does the
              opposite, because K is a <em>difference</em> between the two ends.
            </div>
          </Panel>
        </div>

        <Panel
          title={`The car at ${trim.ay.toFixed(2)} g and ${speed.toFixed(0)} m/s`}
          reference="Ch 5 §4"
          note={
            <>
              Front and rear slip angles differ by exactly{' '}
              <Formula tex="K \cdot A_y" /> — that difference, and nothing else, is what
              separates the required steer angle from the Ackermann angle. The picture
              is the same construction as <strong>Start here</strong>, now driven by
              linear theory rather than the tyre curves.
            </>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 14,
              alignItems: 'start'
            }}
          >
            <div>
              <CarDiagram
                a={vehicle.a}
                b={vehicle.b}
                steer={trim.steer}
                alphaF={trim.alphaF}
                alphaR={trim.alphaR}
                beta={trim.beta}
                radius={trim.radius}
                fyFront={d.wf * trim.ay}
                fyRear={d.wr * trim.ay}
                forceScale={Math.max(limits.capacityFront, limits.capacityRear)}
                exaggeration={Math.min(Math.max(6 / Math.max(toDeg(trim.alphaF), 0.2), 1), 30)}
                usageFront={usageFront}
                usageRear={usageRear}
                height={330}
              />
              <Slider
                label="Lateral acceleration"
                unit="g"
                value={trimAy}
                min={0.05}
                max={Math.max(limits.limitAy, 0.3)}
                step={0.01}
                onChange={setTrimAy}
              />
            </div>
            <div>
              <Verdict headline={verdict.verdict} tone={verdict.tone}>
                {verdict.detail}
              </Verdict>
            </div>
          </div>

          <div style={{ marginTop: 12 }} />
          <Readouts>
            <Readout label="Road-wheel steer" value={toDeg(trim.steer).toFixed(2)} unit="deg" tone="accent" />
            <Readout label="Handwheel" value={toDeg(trim.handwheel).toFixed(0)} unit="deg" />
            <Readout label="Path radius" value={trim.radius.toFixed(1)} unit="m" />
            <Readout label="Yaw rate" value={trim.yawRate.toFixed(3)} unit="rad/s" />
            <Readout label="Front slip angle" value={toDeg(trim.alphaF).toFixed(2)} unit="deg" tone="front" />
            <Readout label="Rear slip angle" value={toDeg(trim.alphaR).toFixed(2)} unit="deg" tone="rear" />
            <Readout label="αf − αr" value={toDeg(trim.alphaF - trim.alphaR).toFixed(2)} unit="deg" />
            <Readout label="Sideslip β" value={toDeg(trim.beta).toFixed(2)} unit="deg" tone="warn" />
            <Readout label="Ackermann L/R" value={toDeg(trim.ackermann).toFixed(2)} unit="deg" />
            <Readout label="Lateral accel" value={trim.ay.toFixed(2)} unit="g" />
            <Readout label="Stability factor" value={r.stabilityFactor.toFixed(3)} />
            <Readout label="Ay = V·r check" value={((speed * trim.yawRate) / G).toFixed(2)} unit="g" />
          </Readouts>
        </Panel>
      </div>
    </div>
  )
}

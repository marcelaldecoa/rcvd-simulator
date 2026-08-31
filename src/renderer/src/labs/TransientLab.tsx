/**
 * Chapter 6 lab -- transient stability and control.
 *
 * The chapter's principal theoretical payoff is that steady-state divergence
 * and dynamic instability are the same event: the stability factor appears in
 * both the Ch 5 gains and in omega_n, and both vanish together at the critical
 * speed. The root locus and the omega_n-vs-speed plot are placed side by side
 * so that coincidence is visible rather than asserted.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import { derive } from '@core/vehicle/params.js'
import { responseAtSpeed, summarise } from '@core/vehicle/steadyState.js'
import {
  frequencyResponse,
  modal,
  modalSweep,
  secondOrderOvershoot,
  stepSteer
} from '@core/vehicle/transient.js'
import { toDeg, toRad } from '@core/util/numeric.js'

const STEER_DEG = 2
const V_MAX = 80

export function TransientLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const setVehicle = useGarage((s) => s.setVehicle)
  const speed = useGarage((s) => s.speed)
  const setSpeed = useGarage((s) => s.setSpeed)

  const d = derive(vehicle)
  const ss = summarise(vehicle)
  const m = modal(vehicle, speed)
  const gains = responseAtSpeed(vehicle, speed)

  const steer = toRad(STEER_DEG)

  // --- Step steer ---------------------------------------------------------
  const step = useMemo(
    () => stepSteer(vehicle, speed, steer, 2.5, 0.0005),
    [vehicle, speed, steer]
  )

  // Thin the samples for plotting; 5000 points per series is wasted ink.
  const thin = <T,>(arr: T[], n = 400): T[] => {
    const k = Math.max(1, Math.floor(arr.length / n))
    return arr.filter((_, i) => i % k === 0)
  }

  const stepSeries: Series[] = useMemo(() => {
    const pts = thin(step.samples)
    const yawSteady = step.yawSteady
    const aySteady = step.aySteady
    return [
      {
        name: 'Yaw rate (normalised)',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.t, y: yawSteady !== 0 ? p.yawRate / yawSteady : 0 }))
      },
      {
        name: 'Lateral accel (normalised)',
        color: '#5aa9ff',
        points: pts.map((p) => ({ x: p.t, y: aySteady !== 0 ? p.ay / aySteady : 0 }))
      },
      {
        name: 'Steady state',
        color: '#5f6f80',
        dashed: true,
        quiet: true,
        points: pts.map((p) => ({ x: p.t, y: 1 }))
      }
    ]
  }, [step])

  const sideslipSeries: Series[] = useMemo(
    () => [
      {
        name: 'Sideslip β',
        color: '#ff9f4d',
        points: thin(step.samples).map((p) => ({ x: p.t, y: toDeg(p.beta) }))
      }
    ],
    [step]
  )

  // --- Modal parameters vs speed -----------------------------------------
  const sweep = useMemo(() => modalSweep(vehicle, V_MAX, 200), [vehicle])

  const freqSeries: Series[] = useMemo(
    () => [
      {
        name: 'Yaw natural frequency',
        color: '#4dd6c1',
        points: sweep.map((p) => ({ x: p.speed, y: p.frequencyHz }))
      },
      {
        name: 'Damped frequency',
        color: '#5aa9ff',
        dashed: true,
        points: sweep.map((p) => ({ x: p.speed, y: p.dampedHz }))
      }
    ],
    [sweep]
  )

  const zetaSeries: Series[] = useMemo(
    () => [
      {
        name: 'Damping ratio ζ',
        color: '#ffcc55',
        points: sweep.map((p) => ({ x: p.speed, y: p.zeta }))
      }
    ],
    [sweep]
  )

  // --- Root locus ---------------------------------------------------------
  const rootLocus: Series[] = useMemo(() => {
    const upper = sweep
      .map((p) => ({ x: p.eigenvalues[0].re, y: p.eigenvalues[0].im }))
      .filter((p) => isFinite(p.x) && isFinite(p.y))
    const lower = sweep
      .map((p) => ({ x: p.eigenvalues[1].re, y: p.eigenvalues[1].im }))
      .filter((p) => isFinite(p.x) && isFinite(p.y))
    return [
      { name: 'Eigenvalues as speed rises', color: '#4dd6c1', points: upper, scatter: true },
      { name: 'conjugate', color: '#2b7d72', points: lower, scatter: true, quiet: true }
    ]
  }, [sweep])

  // --- Frequency response -------------------------------------------------
  const bode = useMemo(() => frequencyResponse(vehicle, speed, 0.05, 8, 160), [vehicle, speed])

  const bodeMag: Series[] = useMemo(
    () => [
      { name: 'Yaw rate r/δ', color: '#4dd6c1', points: bode.map((p) => ({ x: p.hz, y: p.yawMag })) },
      {
        name: 'Lateral accel Ay/δ (÷10)',
        color: '#5aa9ff',
        points: bode.map((p) => ({ x: p.hz, y: p.ayMag / 10 }))
      }
    ],
    [bode]
  )

  const bodePhase: Series[] = useMemo(
    () => [
      { name: 'Yaw rate phase', color: '#4dd6c1', points: bode.map((p) => ({ x: p.hz, y: p.yawPhase })) },
      {
        name: 'Lateral accel phase',
        color: '#5aa9ff',
        points: bode.map((p) => ({ x: p.hz, y: p.ayPhase }))
      }
    ],
    [bode]
  )

  const vCrit = ss.criticalSpeed
  const vRules = [
    ...(vCrit && vCrit < V_MAX ? [{ value: vCrit, label: 'V_crit', color: '#ff6b6b' }] : []),
    ...(ss.characteristicSpeed && ss.characteristicSpeed < V_MAX
      ? [{ value: ss.characteristicSpeed, label: 'V_char', color: '#2b7d72' }]
      : []),
    { value: speed, label: 'now', color: '#dbe4ee', dashed: false as const }
  ]

  const metrics = step.metrics

  return (
    <div className="lab">
      <div className="stack">
        <Panel title="Transient parameters" reference="Ch 6 §6">
          <Slider
            label="Speed"
            unit="m/s"
            value={speed}
            min={5}
            max={V_MAX}
            step={0.5}
            display={`${speed.toFixed(1)}  (${(speed * 3.6).toFixed(0)} km/h)`}
            onChange={setSpeed}
          />
          <Slider
            label="Yaw inertia Izz"
            unit="kg·m²"
            value={vehicle.izz}
            min={200}
            max={4000}
            step={10}
            digits={0}
            onChange={(izz) => setVehicle({ izz })}
          />
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
            label="Front weight fraction"
            unit="%"
            value={d.frontWeightFraction}
            min={0.35}
            max={0.65}
            step={0.005}
            display={(d.frontWeightFraction * 100).toFixed(1)}
            onChange={(f) => setVehicle({ a: d.L * (1 - f), b: d.L * f })}
          />
          <div className="field">
            <div className="field-row">
              <span className="field-label">Radius of gyration k</span>
              <span className="field-value">{d.yawRadiusOfGyration.toFixed(3)} m</span>
            </div>
            <div className="field-row">
              <span className="field-label">Dynamic index Izz/(m·a·b)</span>
              <span className="field-value">{d.dynamicIndex.toFixed(3)}</span>
            </div>
          </div>
        </Panel>

        <Panel
          title={`Modal parameters at ${speed.toFixed(0)} m/s`}
          reference="Ch 6 §3"
          note={
            <>
              Closed form and eigenvalues are computed independently and must agree. If
              they ever diverge, the parameter set has left the region where the
              closed-form expressions hold.
            </>
          }
        >
          <Readouts>
            <Readout
              label="Natural frequency"
              value={m.frequencyHz.toFixed(3)}
              unit="Hz"
              tone="accent"
            />
            <Readout label="ωn" value={m.omegaN.toFixed(2)} unit="rad/s" />
            <Readout
              label="Damping ratio ζ"
              value={m.zeta.toFixed(3)}
              tone={m.zeta < 0.4 ? 'warn' : 'ok'}
            />
            <Readout label="Damped freq" value={isFinite(m.dampedHz) ? m.dampedHz.toFixed(3) : '—'} unit="Hz" />
            <Readout label="Lead τr" value={(m.tauR * 1000).toFixed(0)} unit="ms" tone="rear" />
            <Readout
              label="Stability"
              value={m.stable ? 'stable' : 'DIVERGENT'}
              tone={m.stable ? 'ok' : 'danger'}
            />
            <Readout label="Eigenvalue Re" value={m.eigenvalues[0].re.toFixed(2)} />
            <Readout label="Eigenvalue Im" value={m.eigenvalues[0].im.toFixed(2)} />
          </Readouts>
          {!m.stable && (
            <div className="warn-box">
              Both the steady-state gain denominator and ωn have passed through zero.
              Ch 6 §3.2: steady-state divergence and dynamic instability are the same
              event.
            </div>
          )}
        </Panel>

        <Panel title={`Step response metrics (${STEER_DEG}° step)`} reference="Ch 6 §5">
          <Readouts>
            <Readout
              label="Yaw overshoot"
              value={(metrics.yawOvershoot * 100).toFixed(1)}
              unit="%"
              tone={metrics.yawOvershoot > 0.2 ? 'warn' : undefined}
            />
            <Readout label="Rise time 10-90" value={(metrics.yawRiseTime * 1000).toFixed(0)} unit="ms" />
            <Readout label="Yaw 90% time" value={(metrics.yawResponseTime90 * 1000).toFixed(0)} unit="ms" tone="accent" />
            <Readout label="Ay 90% time" value={(metrics.ayResponseTime90 * 1000).toFixed(0)} unit="ms" tone="front" />
            <Readout
              label="Ay lag behind yaw"
              value={(metrics.ayLagBehindYaw * 1000).toFixed(0)}
              unit="ms"
              tone="warn"
            />
            <Readout label="5% settling" value={(metrics.yawSettlingTime * 1000).toFixed(0)} unit="ms" />
            <Readout label="Second-order overshoot" value={(secondOrderOvershoot(m.zeta) * 100).toFixed(1)} unit="%" />
            <Readout label="Steady yaw rate" value={step.yawSteady.toFixed(3)} unit="rad/s" />
          </Readouts>
        </Panel>
      </div>

      <div className="stack">
        <Panel
          title={`Step steer response — ${STEER_DEG}° at ${speed.toFixed(0)} m/s`}
          reference="Ch 6 §4"
          note={
            <>
              Both traces are normalised to their own steady state, so the{' '}
              <strong>gap between them is the lag</strong>. Yaw acceleration is
              instantaneous — steer immediately makes front lateral force, which
              immediately makes a yaw moment — while lateral acceleration must wait for
              the rear axle to build slip angle. That delay of{' '}
              <strong>{(metrics.ayLagBehindYaw * 1000).toFixed(0)} ms</strong> is what
              drivers describe as the car "taking a set". The lead time constant{' '}
              <Formula tex="\tau_r = maV/(C_r L)" /> is {(m.tauR * 1000).toFixed(0)} ms and
              grows with speed and with a forward CG.
            </>
          }
        >
          <Chart
            series={stepSeries}
            height={250}
            xLabel="Time (s)"
            yLabel="Response / steady state"
            fmtX={(v) => v.toFixed(2)}
            fmtY={(v) => v.toFixed(2)}
            hRules={[{ value: 1, color: '#5f6f80' }]}
            markers={
              isFinite(metrics.yawPeakTime)
                ? [
                    {
                      x: metrics.yawPeakTime,
                      y: 1 + metrics.yawOvershoot,
                      label: `${(metrics.yawOvershoot * 100).toFixed(0)}% overshoot`,
                      color: '#4dd6c1'
                    }
                  ]
                : []
            }
          />
          <Chart
            series={sideslipSeries}
            height={140}
            xLabel="Time (s)"
            yLabel="Sideslip β (deg)"
            fmtX={(v) => v.toFixed(2)}
            fmtY={(v) => v.toFixed(2)}
          />
        </Panel>

        <div className="grid2">
          <Panel
            title="Natural frequency versus speed"
            reference="Ch 6 §3.1"
            note={
              <>
                <Formula tex="\omega_n^2 = \frac{C_fC_rL^2}{mI_{zz}V^2}\left(1+\frac{KV^2}{gL}\right)" block />
                The car gets <strong>slower to respond as it goes faster</strong> —
                counterintuitive but fundamental, and the reason high-speed corrections
                must be initiated earlier.
              </>
            }
          >
            <Chart
              series={freqSeries}
              height={210}
              xLabel="Speed V (m/s)"
              yLabel="Frequency (Hz)"
              vRules={vRules}
              xDomain={[0, V_MAX]}
              yDomain={[0, Math.max(...sweep.map((p) => p.frequencyHz)) * 1.08]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(1)}
            />
          </Panel>

          <Panel
            title="Damping ratio versus speed"
            reference="Ch 6 §3.3"
            note={
              <>
                The numerator is speed-independent while the denominator grows with V, so
                damping falls with speed. Race cars at speed are noticeably underdamped in
                yaw — which is why a bump or a gust produces a visible weave. The band
                below ζ = 0.4 is where that becomes a handling complaint.
              </>
            }
          >
            <Chart
              series={zetaSeries}
              height={210}
              xLabel="Speed V (m/s)"
              yLabel="ζ"
              vRules={vRules}
              hRules={[
                { value: 1, label: 'critically damped', color: '#5f6f80' },
                { value: 0.7, label: 'ζ = 0.7 target', color: '#6ee787' },
                { value: 0.4, label: 'underdamped', color: '#ffcc55' }
              ]}
              xDomain={[0, V_MAX]}
              yDomain={[0, Math.min(3, Math.max(...sweep.map((p) => (isFinite(p.zeta) ? p.zeta : 0))) * 1.1)]}
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(1)}
            />
          </Panel>
        </div>

        <div className="grid2">
          <Panel
            title="Root locus with speed"
            reference="Ch 6 §3.2"
            note={
              <>
                Eigenvalues of the state matrix as speed sweeps from 5 to {V_MAX} m/s.
                Crossing into the right half plane is the critical speed — the same event
                as the stability factor reaching zero in Ch 5.
              </>
            }
          >
            <Chart
              series={rootLocus}
              height={250}
              xLabel="Real part (1/s)"
              yLabel="Imaginary part (rad/s)"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(1)}
              vRules={[{ value: 0, label: 'stability boundary', color: '#ff6b6b', dashed: false }]}
              markers={[
                {
                  x: m.eigenvalues[0].re,
                  y: m.eigenvalues[0].im,
                  label: `${speed.toFixed(0)} m/s`,
                  color: '#dbe4ee'
                }
              ]}
            />
          </Panel>

          <Panel
            title={`Frequency response at ${speed.toFixed(0)} m/s`}
            reference="Ch 6 §4 · Ch 11"
            note={
              <>
                The swept-steer test in closed form. Low-frequency magnitude equals the
                Ch 5 steady-state gain ({gains.yawGain.toFixed(3)} 1/s for yaw rate); the
                roll-off and phase lag above the natural frequency are what limit how tight
                a loop the driver can close around the car.
              </>
            }
          >
            <Chart
              series={bodeMag}
              height={150}
              xLabel="Frequency (Hz)"
              yLabel="Magnitude"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(2)}
              vRules={[{ value: m.frequencyHz, label: 'ωn', color: '#4dd6c1' }]}
            />
            <Chart
              series={bodePhase}
              height={150}
              xLabel="Frequency (Hz)"
              yLabel="Phase (deg)"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(0)}
              vRules={[{ value: m.frequencyHz, label: 'ωn', color: '#4dd6c1' }]}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

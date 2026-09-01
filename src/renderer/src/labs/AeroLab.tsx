/**
 * Aerodynamics -- Ch 3 and Ch 15.
 *
 * The one idea that reorganises everything else: with wings, grip stops being a
 * property of the car and becomes a property of the car AT A SPEED. Every
 * "peak lateral g" figure elsewhere in the app is really a slice through a
 * surface, and this is where that becomes visible.
 *
 * Ch 15 §9 is blunt that total downforce sets grip while aero BALANCE sets
 * handling, and that balance is the harder problem because it moves with ride
 * height, rake, pitch, roll, yaw and the wake ahead. This lab models balance as
 * a constant and says so; what it can show honestly is that even a fixed aero
 * balance produces a speed-dependent handling balance, because downforce grows
 * with V² while weight does not.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { ButtonRow, Formula as Tex, Panel, Readout, Readouts, Slider } from '../components/ui'
import { rearTireParams, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { derive } from '@core/vehicle/params.js'
import { pairLimit } from '@core/vehicle/pairAnalysis.js'
import {
  aeroEfficiency,
  aeroLoads,
  airDensity,
  AERO_PRESETS,
  downforce,
  drag,
  dragPower,
  dynamicPressure,
  maxCorneringSpeed,
  maxCorneringSpeedNoAero,
  speedAtOneG
} from '@core/aero/index.js'
import { corneringSpeedForRadius, DEFAULT_POWERTRAIN } from '@core/performance/gg.js'
import { linspace } from '@core/util/numeric.js'

const V_MAX = 95

export function AeroLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const aero = useGarage((s) => s.aero)
  const setAero = useGarage((s) => s.setAero)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)
  const speed = useGarage((s) => s.speed)
  const setSpeed = useGarage((s) => s.setSpeed)

  const [altitude, setAltitude] = useState(0)
  const [temperature, setTemperature] = useState(15)

  const tireF = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireR = useMemo(
    () => new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale)),
    [tire, rearTireScale, rearGripScale]
  )

  const d = derive(vehicle)
  const loads = aeroLoads(aero, speed)
  const opts = useMemo(
    () => ({
      vehicle,
      chassis,
      tireFront: tireF,
      tireRear: tireR,
      aero,
      powertrain: DEFAULT_POWERTRAIN
    }),
    [vehicle, chassis, tireF, tireR, aero]
  )

  // --- grip against speed --------------------------------------------------
  const gripCurves: Series[] = useMemo(() => {
    const speeds = linspace(0, V_MAX, 34)
    return [
      {
        name: 'With this aero',
        color: '#4dd6c1',
        points: speeds.map((V) => ({
          x: V,
          y: pairLimit(vehicle, chassis, tireF, tireR, 0, aeroLoads(aero, V)).limitAy
        }))
      },
      {
        name: 'Mechanical grip only',
        color: '#5f6f80',
        dashed: true,
        points: speeds.map((V) => ({
          x: V,
          y: pairLimit(vehicle, chassis, tireF, tireR).limitAy
        }))
      }
    ]
  }, [vehicle, chassis, tireF, tireR, aero])

  // --- forces --------------------------------------------------------------
  const forceCurves: Series[] = useMemo(() => {
    const speeds = linspace(0, V_MAX, 34)
    return [
      {
        name: 'Downforce (kN)',
        color: '#5aa9ff',
        points: speeds.map((V) => ({ x: V, y: downforce(aero, V) / 1000 }))
      },
      {
        name: 'Drag (kN)',
        color: '#ff9f4d',
        points: speeds.map((V) => ({ x: V, y: drag(aero, V) / 1000 }))
      },
      {
        name: 'Car weight (kN)',
        color: '#5f6f80',
        dashed: true,
        points: speeds.map((V) => ({ x: V, y: d.w / 1000 }))
      }
    ]
  }, [aero, d.w])

  // --- balance against speed ----------------------------------------------
  const balanceCurve: Series[] = useMemo(() => {
    const speeds = linspace(0, V_MAX, 30)
    return [
      {
        name: 'Limit balance (rear grip in hand)',
        color: '#ffcc55',
        points: speeds.map((V) => ({
          x: V,
          y: pairLimit(vehicle, chassis, tireF, tireR, 0, aeroLoads(aero, V)).limitBalance
        }))
      }
    ]
  }, [vehicle, chassis, tireF, tireR, aero])

  const oneG = speedAtOneG(vehicle.mass, aero)
  const cornerRadius = 150
  const speedWithAero = corneringSpeedForRadius(opts, cornerRadius)
  const speedNoAero = corneringSpeedForRadius(
    { ...opts, aero: { ...aero, clA: 0 } },
    cornerRadius
  )

  const localRho = airDensity(101325 * Math.exp(-altitude / 8400), 273.15 + temperature)

  const experiments: Experiment[] = [
    {
      title: 'Take the wings off',
      action: 'Set the downforce coefficient to zero.',
      predict: 'What happens to the grip-versus-speed line?',
      result: (
        <>
          It goes <strong>flat</strong>. That is the whole difference: without
          aerodynamics a car has one cornering limit, and it is the same at 20 m/s as at
          90. With wings the limit is a function of speed, so every "peak lateral g"
          number is meaningless until you say how fast the car was going.
        </>
      ),
      run: () => setAero({ clA: 0 }),
      reset: () => setAero({ clA: 3.0 })
    },
    {
      title: 'Move the aero balance and watch handling become speed-dependent',
      action: 'Push aero balance well forward, to about 60% front.',
      predict: 'Does the balance line stay flat with speed?',
      result: (
        <>
          No — and this is Ch 15 §9's point. Downforce grows with V² while weight does
          not, so the aero share of each axle's load grows with speed. A fixed aero
          balance that differs from the static weight split therefore produces a{' '}
          <strong>handling balance that drifts with speed</strong>. Set aero balance
          equal to the static front weight fraction ({(d.frontWeightFraction * 100).toFixed(1)}%)
          and the line flattens out.
        </>
      ),
      run: () => setAero({ aeroBalance: 0.6 }),
      reset: () => setAero({ aeroBalance: 0.45 })
    },
    {
      title: 'Race at altitude',
      action: 'Take altitude to 1500 m and temperature to 35 °C.',
      predict: 'How much downforce goes missing?',
      result: (
        <>
          About a fifth of it. Density falls to roughly 0.96 kg/m³ against 1.225 at sea
          level, and downforce and drag fall with it in proportion — as does engine
          power. Aerodynamic figures are always quoted at a reference density and must
          be corrected; a car set up at sea level arrives at altitude as a different car.
        </>
      ),
      run: () => {
        setAltitude(1500)
        setTemperature(35)
      },
      reset: () => {
        setAltitude(0)
        setTemperature(15)
      }
    },
    {
      title: 'Chase the singularity',
      action: 'Raise the downforce coefficient as far as it goes.',
      predict:
        'Ch 3 says the closed-form corner speed runs away to infinity past a critical CₗA. Does this model do the same?',
      result: (
        <>
          <strong>No</strong>, and the difference is instructive. The closed form assumes
          one fixed μ, so past a critical downforce its denominator turns negative and
          the answer is unbounded. Real tyres are <em>load-sensitive</em>: each extra
          newton of download buys less grip than the last, so the curve keeps rising but
          never runs away. The singularity is an artefact of the constant-μ assumption,
          not a property of cars.
        </>
      ),
      run: () => setAero({ clA: 6.5 }),
      reset: () => setAero({ clA: 3.0 })
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        With wings, grip stops being a property of the car and becomes a property of the
        car <strong>at a speed</strong>. Every peak-g figure elsewhere in this app is a
        slice through the curve below.
      </div>

      <div className="stage">
        <Panel
          title="Cornering limit against speed"
          reference="Ch 3 · Ch 9 §2"
          note={
            <>
              The dashed line is the same car with the wings removed — one limit, flat
              forever. The gap between them is what aerodynamics buys, and it is worth
              nothing at all in a hairpin and a great deal in a fast corner.
            </>
          }
        >
          <Chart
            series={gripCurves}
            height={280}
            xLabel="Speed (m/s)"
            yLabel="Limit lateral acceleration (g)"
            zeroY
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[{ value: speed, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>

        <div className="stack">
          <Panel
            title="Aerodynamics"
            reference="Ch 15"
            right={
              <select
                style={{ width: 'auto', fontSize: 11, padding: '2px 5px' }}
                value={aero.name}
                onChange={(e) => {
                  const p = AERO_PRESETS.find((x) => x.name === e.target.value)
                  if (p) setAero(p)
                }}
              >
                {AERO_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            }
          >
            <Slider
              label="Downforce coefficient C_L·A"
              unit="m²"
              value={aero.clA}
              min={0}
              max={7}
              step={0.05}
              onChange={(clA) => setAero({ clA })}
            />
            <Slider
              label="Drag coefficient C_D·A"
              unit="m²"
              value={aero.cdA}
              min={0.3}
              max={2.5}
              step={0.01}
              onChange={(cdA) => setAero({ cdA })}
            />
            <Slider
              label="Aero balance"
              unit="% front"
              value={aero.aeroBalance}
              min={0.25}
              max={0.7}
              step={0.005}
              display={(aero.aeroBalance * 100).toFixed(1)}
              onChange={(aeroBalance) => setAero({ aeroBalance })}
            />
            <Slider
              label="Speed"
              unit="m/s"
              value={speed}
              min={5}
              max={V_MAX}
              step={0.5}
              display={`${speed.toFixed(0)}  (${(speed * 3.6).toFixed(0)} km/h)`}
              onChange={setSpeed}
            />
            <div style={{ borderTop: '1px solid var(--border-soft)', margin: '12px 0 10px' }} />
            <Slider
              label="Altitude"
              unit="m"
              value={altitude}
              min={0}
              max={3000}
              step={50}
              digits={0}
              onChange={setAltitude}
            />
            <Slider
              label="Air temperature"
              unit="°C"
              value={temperature}
              min={-5}
              max={45}
              step={1}
              digits={0}
              onChange={setTemperature}
            />
            <div className="btn-row" style={{ marginTop: 8 }}>
              <ButtonRow
                options={[{ value: 'apply', label: `Use this density (${localRho.toFixed(3)} kg/m³)` }]}
                value=""
                onChange={() => setAero({ rho: localRho })}
              />
            </div>
          </Panel>

          <Panel title={`At ${speed.toFixed(0)} m/s`}>
            <Readouts>
              <Readout label="Downforce" value={(loads.total / 1000).toFixed(2)} unit="kN" tone="accent" />
              <Readout label="…as a fraction of weight" value={(loads.total / d.w).toFixed(2)} unit="×" />
              <Readout label="Drag" value={(loads.drag / 1000).toFixed(2)} unit="kN" tone="rear" />
              <Readout label="Power to push it" value={(dragPower(aero, speed) / 1000).toFixed(0)} unit="kW" />
              <Readout label="Dynamic pressure" value={dynamicPressure(aero.rho, speed).toFixed(0)} unit="Pa" />
              <Readout label="Efficiency L/D" value={aeroEfficiency(aero).toFixed(2)} />
              <Readout label="Front download" value={(loads.front / 1000).toFixed(2)} unit="kN" tone="front" />
              <Readout label="Rear download" value={(loads.rear / 1000).toFixed(2)} unit="kN" tone="rear" />
              <Readout
                label="Speed for 1 g of downforce"
                value={isFinite(oneG) ? oneG.toFixed(0) : '—'}
                unit={isFinite(oneG) ? 'm/s' : undefined}
              />
              <Readout label="Air density" value={aero.rho.toFixed(3)} unit="kg/m³" />
            </Readouts>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Downforce and drag against speed"
          reference="Ch 3 §3"
          note={
            <>
              Both grow with <Tex tex="V^2" />, so they cross the car's own weight at a
              definite speed — {isFinite(oneG) ? `${oneG.toFixed(0)} m/s here` : 'never, with no wings'}.
              Drag <em>power</em>, though, grows with <Tex tex="V^3" />, which is why top
              speed is so expensive and why low-drag trim exists.
            </>
          }
        >
          <Chart
            series={forceCurves}
            height={220}
            xLabel="Speed (m/s)"
            yLabel="Force (kN)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[{ value: speed, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>

        <Panel
          title="Handling balance against speed"
          reference="Ch 15 §9"
          note={
            <>
              Total downforce sets grip; <strong>aero balance sets handling</strong>. Because
              downforce grows with speed and weight does not, a fixed aero balance that
              differs from the static weight split ({(d.frontWeightFraction * 100).toFixed(1)}% front)
              gives a car whose balance <em>moves with speed</em> — understeering at one end
              of the straight and loose at the other.
            </>
          }
        >
          <Chart
            series={balanceCurve}
            height={220}
            xLabel="Speed (m/s)"
            yLabel="Rear grip in hand (g)"
            fmtX={(v) => v.toFixed(0)}
            fmtY={(v) => v.toFixed(2)}
            hRules={[{ value: 0, label: 'neutral at the limit', color: '#6ee787' }]}
            vRules={[{ value: speed, label: 'now', color: '#dbe4ee', dashed: false }]}
          />
        </Panel>
      </div>

      <Panel
        title={`What it is worth: a ${cornerRadius} m corner`}
        reference="Ch 3, Exercise 3.5"
      >
        <Readouts>
          <Readout
            label="With this aero"
            value={isFinite(speedWithAero) ? speedWithAero.toFixed(1) : '—'}
            unit="m/s"
            tone="accent"
          />
          <Readout
            label="Without wings"
            value={isFinite(speedNoAero) ? speedNoAero.toFixed(1) : '—'}
            unit="m/s"
          />
          <Readout
            label="Gain"
            value={
              isFinite(speedWithAero) && isFinite(speedNoAero)
                ? `${(((speedWithAero - speedNoAero) / speedNoAero) * 100).toFixed(0)}`
                : '—'
            }
            unit="%"
            tone="ok"
          />
          <Readout
            label="Closed form, constant μ"
            value={(() => {
              const v = maxCorneringSpeed(vehicle.mass, cornerRadius, 1.66, aero)
              return isFinite(v) ? v.toFixed(1) : '∞'
            })()}
            unit="m/s"
            tone="warn"
          />
          <Readout
            label="No-aero closed form"
            value={maxCorneringSpeedNoAero(cornerRadius, 1.66).toFixed(1)}
            unit="m/s"
          />
        </Readouts>
        <div className="model-note">
          The closed form of Exercise 3.5 assumes a single constant μ. This simulator uses
          load-sensitive tyres, so it always reads <strong>lower</strong> — each extra
          newton of downforce buys less grip than the last. Push the downforce coefficient
          far enough and the closed form reports ∞ while the simulator keeps returning a
          finite, falling-return answer. The singularity belongs to the assumption, not to
          the car.
        </div>
      </Panel>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="What aerodynamics changes">
          <Explain
            seeing={
              <>
                Downforce adds vertical load without adding mass. Capacity rises with
                load; demand rises with weight. Because only one of those grows, the
                cornering limit climbs with <Tex tex="V^2" />.
              </>
            }
            look={
              <>
                The grip curve is the headline, but the <strong>balance</strong> curve is
                the one that decides whether the car is drivable. A balance that swings
                across the speed range forces the driver to drive to the worst case, so a
                car with less downforce and a stable platform can be quicker than one with
                more.
              </>
            }
            matters={
              <>
                Ch 15 §9: the objective is not maximum downforce, it is maximum downforce
                <em> subject to acceptable balance stability</em>. This lab holds aero
                balance constant with ride height and attitude — a real car's does not,
                and that variation is most of the engineering.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

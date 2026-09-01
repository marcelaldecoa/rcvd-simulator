/**
 * The g-g diagram -- Ch 9.
 *
 * The complete performance envelope, and the chapter's most valuable practical
 * content: the distinction between what the car COULD do and what the driver
 * DID. The usage overlay here generates the classic patterns of Ch 9 §4 --
 * including the amateur "notch" between braking and cornering -- so they can be
 * recognised rather than described.
 *
 * The boundary is solved, not drawn. Every point comes from pair analysis at
 * the wheel loads of that longitudinal state, with downforce at that speed, so
 * the departures from a circle the chapter lists appear on their own.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { ButtonRow, Panel, Readout, Readouts, Slider } from '../components/ui'
import { rearTireParams, useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import {
  envelopeUsage,
  ggEnvelope,
  ggSurface,
  mirrorEnvelope,
  type GGOptions,
  type GGPoint
} from '@core/performance/gg.js'

type Style = 'ideal' | 'notch' | 'timid' | 'brakeShy'

const STYLE_LABEL: Record<Style, string> = {
  ideal: 'Blends everything',
  notch: 'Brakes straight, then turns',
  timid: 'Never at the limit',
  brakeShy: 'Fast in corners, soft on the brakes'
}

/**
 * Synthesise a lap's worth of (Ax, Ay) samples in a given driving style.
 *
 * These are illustrative, not measured. Their job is to make the Ch 9 §4
 * patterns recognisable; the same overlay accepts real telemetry unchanged.
 */
function drivingStyle(style: Style, boundary: GGPoint[], n = 260): GGPoint[] {
  const out: GGPoint[] = []
  // A deterministic pseudo-random source, so the plot does not reshuffle on
  // every render.
  let seed = 7
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  for (let i = 0; i < n; i++) {
    const b = boundary[Math.floor(rand() * boundary.length)]
    const side = rand() < 0.5 ? -1 : 1
    let scale = 1
    if (style === 'ideal') scale = 0.93 + rand() * 0.07
    if (style === 'timid') scale = 0.5 + rand() * 0.25
    if (style === 'brakeShy') scale = b.ax < 0 ? 0.5 + rand() * 0.2 : 0.9 + rand() * 0.1
    if (style === 'notch') {
      // Only the pure-braking and pure-cornering corners of the envelope get used.
      const pure = Math.abs(b.ax) < 0.15 || b.ay < 0.2 * Math.max(...boundary.map((p) => p.ay))
      scale = pure ? 0.92 + rand() * 0.08 : 0.42 + rand() * 0.2
    }
    out.push({ ax: b.ax * scale, ay: b.ay * scale * side })
  }
  return out
}

export function GGLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const chassis = useGarage((s) => s.chassis)
  const aero = useGarage((s) => s.aero)
  const powertrain = useGarage((s) => s.powertrain)
  const setPowertrain = useGarage((s) => s.setPowertrain)
  const tire = useGarage((s) => s.tire)
  const rearTireScale = useGarage((s) => s.rearTireScale)
  const rearGripScale = useGarage((s) => s.rearGripScale)
  const speed = useGarage((s) => s.speed)
  const setSpeed = useGarage((s) => s.setSpeed)

  const [style, setStyle] = useState<Style>('notch')
  const [showUsage, setShowUsage] = useState(true)

  const tireF = useMemo(() => new MagicFormulaTire(tire), [tire])
  const tireR = useMemo(
    () => new MagicFormulaTire(rearTireParams(tire, rearTireScale, rearGripScale)),
    [tire, rearTireScale, rearGripScale]
  )

  const opts: GGOptions = useMemo(
    () => ({ vehicle, chassis, tireFront: tireF, tireRear: tireR, aero, powertrain }),
    [vehicle, chassis, tireF, tireR, aero, powertrain]
  )

  const envelope = useMemo(() => ggEnvelope(opts, speed), [opts, speed])
  const samples = useMemo(
    () => (showUsage ? drivingStyle(style, envelope.boundary) : []),
    [style, envelope, showUsage]
  )
  const usage = useMemo(() => envelopeUsage(envelope, samples), [envelope, samples])

  const surface = useMemo(() => ggSurface(opts, [20, 40, 60, 80]), [opts])

  const series: Series[] = useMemo(() => {
    const s: Series[] = [
      {
        name: `Capability at ${speed.toFixed(0)} m/s`,
        color: '#4dd6c1',
        width: 2.2,
        points: mirrorEnvelope(envelope.boundary).map((p) => ({ x: p.ay, y: p.ax }))
      }
    ]
    if (showUsage) {
      s.push({
        name: 'What the driver used',
        color: '#ffcc55',
        scatter: true,
        points: samples.map((p) => ({ x: p.ay, y: p.ax }))
      })
    }
    return s
  }, [envelope, samples, showUsage, speed])

  const surfaceSeries: Series[] = useMemo(
    () =>
      surface.map((e, i) => ({
        name: `${e.speed.toFixed(0)} m/s`,
        color: ['#264a66', '#2b7d72', '#4dd6c1', '#a8f0e4'][i],
        points: mirrorEnvelope(e.boundary).map((p) => ({ x: p.ay, y: p.ax }))
      })),
    [surface]
  )

  const experiments: Experiment[] = [
    {
      title: 'Recognise the amateur signature',
      action: 'Set the driving style to "Brakes straight, then turns".',
      predict: 'Where does the scatter sit, and where is it missing?',
      result: (
        <>
          The data reaches peak braking and peak cornering but leaves a{' '}
          <strong>notch</strong> between them. The driver is finishing the braking before
          starting to turn instead of blending the two. Ch 9 §4 calls this the classic
          amateur pattern, and the time is in the transition — which, per Ch 1, is
          exactly where lap time is most sensitive because that is where speed is lowest.
        </>
      ),
      run: () => setStyle('notch')
    },
    {
      title: 'Tell a brake problem from a driver problem',
      action: 'Switch to "Fast in corners, soft on the brakes".',
      predict: 'Is this the same diagnosis as the notch?',
      result: (
        <>
          No. Here the lateral limits are being reached but the braking ones are not — the
          driver trusts the car in a corner and does not trust it under braking. Ch 9 §4
          points at brake balance, brake feel or confidence, not at technique. Two
          different plots, two different conversations.
        </>
      ),
      run: () => setStyle('brakeShy')
    },
    {
      title: 'Watch the envelope grow with speed',
      action: 'Sweep the speed slider from 20 up to 90 m/s.',
      predict: 'Does the whole envelope scale, or only part of it?',
      result: (
        <>
          The braking and lateral limits both grow, because downforce loads every tyre.
          Acceleration does not — it is capped by power, which <em>falls</em> as 1/V. So
          the envelope stretches downward and sideways while its top stays put. This is
          why the g-g "diagram" is really a <strong>g-g-V surface</strong>, and why
          quoting one peak-g number without a speed says very little.
        </>
      ),
      run: () => setSpeed(85),
      reset: () => setSpeed(40)
    },
    {
      title: 'Find where power stops mattering',
      action: 'Drop engine power and watch the top of the envelope.',
      predict: 'At what speed does the car stop being traction-limited?',
      result: (
        <>
          At low speed the car cannot put the power down and the traction limit binds; at
          high speed the power term, falling as 1/V and fighting drag, binds instead. The
          readout says which is active. Below the crossover, more power buys nothing —
          which is why traction, not horsepower, is the exit-of-corner currency.
        </>
      ),
      run: () => setPowertrain({ power: 180_000 }),
      reset: () => setPowertrain({ power: 400_000 })
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Everything the car can do, in one picture — and, overlaid, everything the driver
        actually did. Ch 9 calls the comparison the most-used diagnostic in race data
        analysis.
      </div>

      <div className="stage">
        <Panel
          title={`The g-g diagram at ${speed.toFixed(0)} m/s`}
          reference="Ch 9"
          right={
            <ButtonRow
              options={[
                { value: 1, label: showUsage ? 'Hide usage' : 'Show usage' }
              ]}
              value={0}
              onChange={() => setShowUsage(!showUsage)}
            />
          }
          note={
            <>
              Braking is downward, acceleration upward, cornering to either side. The
              boundary is <strong>solved, not drawn</strong>: each point comes from pair
              analysis at that longitudinal state, so the asymmetries are results rather
              than decoration.
            </>
          }
        >
          <Chart
            series={series}
            height={400}
            xLabel="Lateral acceleration (g)"
            yLabel="Longitudinal acceleration (g)   ← braking · power →"
            zeroY
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
            hRules={[{ value: 0, color: '#33414f', dashed: false }]}
          />
        </Panel>

        <div className="stack">
          <Panel title="Envelope">
            <Slider
              label="Speed"
              unit="m/s"
              value={speed}
              min={10}
              max={95}
              step={1}
              display={`${speed.toFixed(0)}  (${(speed * 3.6).toFixed(0)} km/h)`}
              onChange={setSpeed}
            />
            <Slider
              label="Power at the wheels"
              unit="kW"
              value={powertrain.power}
              min={80_000}
              max={800_000}
              step={5000}
              display={(powertrain.power / 1000).toFixed(0)}
              onChange={(power) => setPowertrain({ power })}
            />
            <Slider
              label="Braking friction"
              unit="μ"
              value={powertrain.brakingMu}
              min={0.8}
              max={2.4}
              step={0.01}
              onChange={(brakingMu) => setPowertrain({ brakingMu })}
            />
            <Slider
              label="Driven axle load share"
              unit="%"
              value={powertrain.drivenAxleShare}
              min={0.3}
              max={0.75}
              step={0.005}
              display={(powertrain.drivenAxleShare * 100).toFixed(0)}
              onChange={(drivenAxleShare) => setPowertrain({ drivenAxleShare })}
            />
            <Readouts>
              <Readout label="Peak lateral" value={envelope.peakAy.toFixed(2)} unit="g" tone="accent" />
              <Readout label="Peak braking" value={envelope.peakBraking.toFixed(2)} unit="g" tone="front" />
              <Readout
                label="Peak acceleration"
                value={envelope.peakAcceleration.toFixed(2)}
                unit="g"
                tone="rear"
              />
              <Readout
                label="Acceleration limited by"
                value={envelope.powerLimited ? 'power' : 'traction'}
                tone={envelope.powerLimited ? 'warn' : 'ok'}
              />
              <Readout label="Downforce" value={(envelope.downforce / 1000).toFixed(2)} unit="kN" />
              <Readout
                label="Envelope used"
                value={showUsage ? (usage.fraction * 100).toFixed(0) : '—'}
                unit={showUsage ? '%' : undefined}
                tone={usage.fraction > 0.5 ? 'ok' : 'warn'}
              />
            </Readouts>
          </Panel>

          <Panel title="Driving style" reference="Ch 9 §4">
            <div className="btn-row">
              {(Object.keys(STYLE_LABEL) as Style[]).map((k) => (
                <button
                  key={k}
                  className={`btn${style === k && showUsage ? ' active' : ''}`}
                  onClick={() => {
                    setStyle(k)
                    setShowUsage(true)
                  }}
                >
                  {STYLE_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="model-note">
              These traces are <strong>synthesised</strong> to make the Ch 9 §4 patterns
              recognisable — they are not measured data. The same overlay takes real
              telemetry unchanged, which is what the Phase 2 iRacing work is for.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="The g-g-V surface"
          reference="Ch 9 §2"
          note={
            <>
              A stack of envelopes indexed by speed. On a downforce car this is the honest
              picture: a single g-g diagram is one slice of it, and a peak-g figure quoted
              without a speed is close to meaningless.
            </>
          }
        >
          <Chart
            series={surfaceSeries}
            height={320}
            xLabel="Lateral acceleration (g)"
            yLabel="Longitudinal acceleration (g)"
            zeroY
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
            hRules={[{ value: 0, color: '#33414f', dashed: false }]}
          />
        </Panel>

        <Panel title="Reading the plot">
          <Explain
            seeing={
              <>
                The teal outline is capability; the scattered points are usage. Braking is
                below the axis, power above, cornering to the sides.
              </>
            }
            look={
              <>
                <strong>Filling the boundary everywhere</strong> is a good driver in a
                well-matched car. A <strong>notch between braking and cornering</strong>{' '}
                means the two are not being blended. <strong>Lateral limits reached but
                not braking limits</strong> points at the brakes, not the driver.{' '}
                <strong>Data outside the boundary</strong> means your boundary model is
                wrong — usually downforce or banking left out.
              </>
            }
            matters={
              <>
                The envelope is asymmetric for real reasons, all of them visible here:
                braking beats acceleration because all four wheels brake and only the
                driven axle pulls; the upper quadrants are narrower because the driven
                axle spends friction on traction; and the whole thing grows with speed
                because of downforce.
              </>
            }
          />
        </Panel>
      </div>

      <Panel title="Try these" reference="guided">
        <TryThis experiments={experiments} />
      </Panel>
    </div>
  )
}

/**
 * Chapter 14 lab -- tire data treatment.
 *
 * One picture carries this chapter, and it is the pair of charts at the top:
 * the same tyre swept at five loads, raw and normalised. Raw, the curves fan
 * out over a factor of four in peak force. Normalised, they land on top of one
 * another. That collapse is Radt's method and it is the whole reason a tyre can
 * be described by two load-dependent numbers instead of a data table.
 *
 * The rest of the lab is what the collapse buys: interpolation to loads nobody
 * tested, a peak slip angle that rises with load (and therefore an axle whose
 * two tyres can never both be optimal), a friction ellipse that is a THEOREM
 * rather than an assumption, and a tyre comparison that refuses to reduce to a
 * single number.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain, TryThis, type Experiment } from '../components/Teach'
import { ButtonRow, Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import {
  BRUSH_PEAK_NORMALISED,
  RCVD_MASTER_FIT,
  brushMaster,
  characterise,
  collapseSpread,
  collapseTire,
  combinedSlip,
  masterPeak,
  mfMaster,
  slipCircleLocus
} from '@core/tire/nondimensional.js'
import { derive } from '@core/vehicle/params.js'
import { toDeg, toRad } from '@core/util/numeric.js'

const LOAD_COLOURS = ['#5aa9ff', '#4dd6c1', '#6ee787', '#ffcc55', '#ff9f4d']
const R2D = 180 / Math.PI

export function TireDataLab(): React.JSX.Element {
  const vehicle = useGarage((s) => s.vehicle)
  const tire = useGarage((s) => s.tire)
  const v = derive(vehicle)

  const [spread, setSpread] = useState(2.5)
  const [master, setMaster] = useState<'brush' | 'rcvd'>('rcvd')
  const [slipRatio, setSlipRatio] = useState(0.05)
  const [alphaDeg, setAlphaDeg] = useState(2)
  /** How much the tyre's SHAPE factor drifts with load. Zero = pure MF. */
  const [shapeDrift, setShapeDrift] = useState(0)
  const [combinedLoad, setCombinedLoad] = useState(4000)

  const model = useMemo(() => new MagicFormulaTire(tire), [tire])

  /** Five loads spanning a realistic corner: nearly unloaded to double static. */
  const loads = useMemo(() => {
    const centre = v.wf / 2
    return [1 / spread, 1 / Math.sqrt(spread), 1, Math.sqrt(spread), spread].map(
      (k) => centre * k
    )
  }, [v.wf, spread])

  /**
   * One curve per load, each from a tyre whose shape factor is allowed to drift.
   *
   * At zero drift this is just the garage tyre at five loads, and the collapse
   * is exact -- see the panel note. The drift knob exists so the collapse can
   * be BROKEN, because a demonstration you cannot break is not a demonstration.
   */
  const curves = useMemo(() => {
    if (shapeDrift === 0) return collapseTire(model, loads)
    const reference = loads[Math.floor(loads.length / 2)]
    return loads.map((fz) => {
      const k = 1 + shapeDrift * (fz / reference - 1)
      const t = new MagicFormulaTire({ ...tire, shapeC: tire.shapeC * k })
      return collapseTire(t, [fz])[0]
    })
  }, [model, tire, loads, shapeDrift])
  const quality = useMemo(() => collapseSpread(curves), [curves])

  const rawSeries: Series[] = useMemo(
    () =>
      curves.map((c, i) => ({
        name: `${(c.fz / 1000).toFixed(2)} kN`,
        color: LOAD_COLOURS[i % LOAD_COLOURS.length],
        points: c.points.map((p) => ({ x: toDeg(p.alpha), y: p.fy }))
      })),
    [curves]
  )

  const collapsedSeries: Series[] = useMemo(() => {
    const masterFn = master === 'brush' ? brushMaster : (a: number) => mfMaster(a, RCVD_MASTER_FIT)
    const reference: Series = {
      name: master === 'brush' ? 'Brush master curve' : 'RCVD master fit',
      color: '#dbe4ee',
      dashed: true,
      points: Array.from({ length: 61 }, (_, i) => {
        const a = (4 * i) / 60
        return { x: a, y: masterFn(a) }
      })
    }
    return [
      ...curves.map((c, i) => ({
        name: `${(c.fz / 1000).toFixed(2)} kN`,
        color: LOAD_COLOURS[i % LOAD_COLOURS.length],
        points: c.points.map((p) => ({ x: p.normalisedSlip, y: p.normalisedForce }))
      })),
      reference
    ]
  }, [curves, master])

  /** Peak slip angle against load -- the Ex 14.3 trend, drawn. */
  const peakSeries: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const fz = 300 + (6000 * i) / 40
      const muY = model.muY(fz)
      const ca = model.corneringStiffness(fz)
      return {
        fz,
        peak: toDeg(model.peakFy(fz).at),
        mu: muY,
        ca
      }
    })
    return [
      {
        name: 'Slip angle at the peak (deg)',
        color: '#ff9f4d',
        points: pts.map((p) => ({ x: p.fz / 1000, y: p.peak }))
      }
    ]
  }, [model])

  const stiffnessSeries: Series[] = useMemo(() => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const fz = 300 + (6000 * i) / 40
      return { fz, ca: model.corneringStiffness(fz) / R2D, mu: model.muY(fz) }
    })
    return [
      {
        name: 'Cornering stiffness (N/deg)',
        color: '#5aa9ff',
        points: pts.map((p) => ({ x: p.fz / 1000, y: p.ca }))
      },
      {
        name: 'Peak friction × 1000',
        color: '#4dd6c1',
        points: pts.map((p) => ({ x: p.fz / 1000, y: p.mu * 1000 }))
      }
    ]
  }, [model])

  // --- combined slip: the ellipse as a consequence -------------------------
  const fz = combinedLoad
  const combinedInputs = {
    corneringStiffness: model.corneringStiffness(fz),
    slipStiffness: tire.slipStiffness,
    muX: model.muX(fz),
    muY: model.muY(fz),
    fz
  }
  const combined = combinedSlip({ ...combinedInputs, alpha: toRad(alphaDeg), slipRatio })
  const pureLateral = combinedSlip({ ...combinedInputs, alpha: toRad(alphaDeg), slipRatio: 0 })

  const ellipseSeries: Series[] = useMemo(() => {
    const ring = (s: number, name: string, color: string, dashed = false): Series => ({
      name,
      color,
      dashed,
      points: slipCircleLocus(combinedInputs, s).map((p) => ({
        x: p.fx / 1000,
        y: p.fy / 1000
      }))
    })
    return [
      ring(BRUSH_PEAK_NORMALISED, 'Fully sliding — the friction ellipse', '#ff6b6b'),
      ring(2, 'Total normalised slip 2.0', '#ffcc55', true),
      ring(1, 'Total normalised slip 1.0', '#4dd6c1', true),
      {
        name: 'You are here',
        color: '#dbe4ee',
        scatter: true,
        points: [{ x: combined.fx / 1000, y: combined.fy / 1000 }]
      }
    ]
  }, [combinedInputs, combined.fx, combined.fy])

  // --- Ex 14.6, live -------------------------------------------------------
  const peakBar = master === 'brush' ? BRUSH_PEAK_NORMALISED : masterPeak(RCVD_MASTER_FIT).at
  const tireA = characterise('Tire A', 1.6, 1300, 4000, peakBar)
  const tireB = characterise('Tire B', 1.52, 1800, 4000, peakBar)

  const experiments: Experiment[] = [
    {
      title: 'Widen the load range until the collapse breaks',
      action: 'Push the load spread from 2.5 toward 8.',
      predict: 'Does the normalised family stay on one curve?',
      result: (
        <>
          Remarkably well, and that is the finding. A load range that spreads the{' '}
          <em>raw</em> peak forces over a factor of several still lands within a few percent
          of one normalised curve, because both axes were divided by quantities that carry
          the load dependence.
          <br />
          <br />
          Where it does start to separate is at the extremes, and Ch 14 §7 names why:
          extrapolation toward very low loads is where fitted μ(F<sub>z</sub>) forms
          misbehave, and the normalisation <em>presumes</em> the master curve shape is
          invariant — which for radically different constructions should be checked, not
          assumed.
        </>
      ),
      run: () => setSpread(8),
      reset: () => setSpread(2.5)
    },
    {
      title: 'Swap the master curve and watch the peak move',
      action: 'Switch between the brush form and RCVD’s own fit.',
      predict: 'Does the peak sit at ᾱ = 3?',
      result: (
        <>
          Only for the brush form, and the chapter is explicit that this is an{' '}
          <strong>artefact</strong> of the brush model's parabolic pressure assumption
          rather than a property of real tyres. RCVD's fitted master curve peaks near ᾱ ≈{' '}
          {masterPeak(RCVD_MASTER_FIT).at.toFixed(2)}.
          <br />
          <br />
          It matters because peak slip angle is <em>ᾱ<sub>peak</sub> · μF<sub>z</sub>/C<sub>α</sub></em>
          , so the choice of master curve scales every peak angle you predict by the same
          factor. The brush form is here because it is closed form and the chapter's own
          exercises use it — not because it is the better fit.
        </>
      ),
      run: () => setMaster('brush'),
      reset: () => setMaster('rcvd')
    },
    {
      title: 'Add slip ratio and watch the ellipse appear',
      action: 'Hold the slip angle and wind slip ratio up from zero.',
      predict: 'Where does the point go, and what is it tracing?',
      result: (
        <>
          It swings around a ring. Nothing in this calculation assumed an ellipse — the
          normalisation was applied to each direction separately, the resultant was fed
          through <em>one</em> master curve, and the answer was projected back along the slip
          vector. The ellipse falls out.
          <br />
          <br />
          At full slide the point lands exactly on the outer ring, for any direction of the
          slip vector, because squaring and adding the two normalised components gives
          identically 1. Inside the sliding boundary the locus is still an ellipse but a
          smaller one, scaled by the master curve — so the friction ellipse is really a{' '}
          <strong>nested family indexed by total slip</strong>, and the outermost is the
          limit. That is something the naive ellipse does not tell you.
        </>
      ),
      run: () => setSlipRatio(0.18),
      reset: () => setSlipRatio(0.05)
    },
    {
      title: 'Decide which tyre is better',
      action: 'Read the Tire A / Tire B comparison and pick one.',
      predict: 'Is the higher peak μ the better tyre?',
      result: (
        <>
          Not on its own. A has {((tireA.peakForce / tireB.peakForce - 1) * 100).toFixed(1)}%
          more peak grip and reaches it at {tireA.peakSlipAngleDeg.toFixed(1)}°; B peaks at{' '}
          {tireB.peakSlipAngleDeg.toFixed(1)}° with{' '}
          {((tireB.corneringStiffnessPerDeg / tireA.corneringStiffnessPerDeg - 1) * 100).toFixed(
            0
          )}
          % more cornering stiffness.
          <br />
          <br />
          <strong>A</strong> suits a car that can afford large slip angles — low downforce,
          generous lock, a driver steering on the throttle. <strong>B</strong> suits a
          high-downforce car: higher stiffness means a higher yaw natural frequency (Ch 6),
          a low peak angle means less energy in the patch and less degradation over a stint,
          and an aero car must run small slip angles anyway because a yawed floor loses
          downforce.
          <br />
          <br />
          There is a stability argument too: B's sharper peak gives less warning and a
          steeper drop after it. The lesson is that <strong>peak μ alone is a poor
          comparison</strong> — the pair (μ, C<sub>α</sub>) is what says how the tyre will
          actually be used, and the right answer depends on the car.
        </>
      )
    }
  ]

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        Tyre data arrives as hundreds of curves. Rescale both axes by quantities that carry
        the load dependence — the peak force at that load, and the slope at that load — and
        the whole family <strong>collapses onto one curve</strong>. Everything else in this
        chapter is what that buys.
      </div>

      <div className="stage">
        <Panel
          title="The same tyre, five loads"
          reference="Ch 14 §1"
          note={
            <>
              Raw data. More load, more force, and the peak arrives later — three separate
              load effects tangled together. This is the family you would have to carry
              around, interpolate within, and somehow compare against another tyre's.
            </>
          }
        >
          <Chart
            series={rawSeries}
            height={280}
            xLabel="Slip angle (deg)"
            yLabel="Lateral force (N)"
            fmtX={(x) => x.toFixed(1)}
            fmtY={(y) => y.toFixed(0)}
          />
          <div className="panel-note">
            Peak forces here span a factor of{' '}
            <strong>
              {(
                Math.max(...curves.map((c) => c.muY * c.fz)) /
                Math.min(...curves.map((c) => c.muY * c.fz))
              ).toFixed(1)}
            </strong>
            , and the slip angle at the peak moves from{' '}
            {toDeg(curves[0].peakAlpha).toFixed(1)}° to{' '}
            {toDeg(curves[curves.length - 1].peakAlpha).toFixed(1)}°.
          </div>
        </Panel>

        <div className="stack">
          <Panel
            title="Normalise both axes"
            reference="Ch 14 §2"
            right={
              <ButtonRow
                options={[
                  { value: 'rcvd', label: 'RCVD fit' },
                  { value: 'brush', label: 'Brush form' }
                ]}
                value={master}
                onChange={(m) => setMaster(m as 'brush' | 'rcvd')}
              />
            }
            note={
              <>
                The same five curves, each divided by <em>its own</em> peak force and{' '}
                <em>its own</em> slope. Load sensitivity has been divided out of both axes,
                and what is left — the shape of the transition from linear to saturated —
                is nearly the same at every load.
              </>
            }
          >
            <Formula
              tex={String.raw`\bar F_y=\frac{F_y}{\mu_yF_z}\qquad \bar\alpha=\frac{C_\alpha\tan\alpha}{\mu_yF_z}`}
              block
            />
            <Chart
              series={collapsedSeries}
              height={260}
              xLabel="Normalised slip ᾱ"
              yLabel="Normalised force F̄"
              xDomain={[0, 4]}
              fmtX={(x) => x.toFixed(1)}
              fmtY={(y) => y.toFixed(2)}
            />
            <Readouts>
              <Readout
                label="Mean spread between loads"
                value={(quality.meanSpread * 100).toFixed(1)}
                unit="% of peak"
                tone={quality.meanSpread < 0.06 ? 'ok' : 'warn'}
              />
              <Readout
                label="Worst spread"
                value={(quality.maxSpread * 100).toFixed(1)}
                unit="% of peak"
              />
              <Readout
                label="Master curve peaks at"
                value={peakBar.toFixed(2)}
                unit="ᾱ"
                tone="accent"
              />
            </Readouts>
            <Slider
              label="Load range swept"
              unit="× either side of static"
              value={spread}
              min={1.2}
              max={8}
              step={0.1}
              digits={1}
              onChange={setSpread}
            />
            <Slider
              label="Shape drift with load"
              unit="× per unit load"
              value={shapeDrift}
              min={0}
              max={0.5}
              step={0.01}
              digits={2}
              onChange={setShapeDrift}
            />
            <div className="panel-note">
              <strong>Be suspicious of a perfect collapse.</strong> For a Magic Formula whose
              shape factors do not vary with load, the collapse is an{' '}
              <em>algebraic identity</em>: F<sub>y</sub>/D is a function of Bα alone, and
              ᾱ = C<sub>α</sub>α/D = BCα, so F̄ = f(ᾱ/C) exactly — whatever B does with load.
              At zero drift this chart is confirming that algebra, not discovering anything
              about a tyre.
              <br />
              <br />
              The drift slider is the honest test. It lets the tyre's <em>shape</em> vary
              with load, which is precisely what the method assumes does not happen, and the
              family comes apart. What Radt's normalisation actually claims about measured
              data is that the shape is <strong>nearly invariant</strong> — and Ch 14 §7 says
              plainly that for radically different constructions this should be checked
              rather than assumed.
            </div>
          </Panel>

          <Panel title="What ᾱ actually means">
            <div className="panel-note" style={{ borderTop: 'none', paddingTop: 0 }}>
              The numerator is the force the <em>linear</em> model would predict; the
              denominator is the peak the tyre actually has. So ᾱ is{' '}
              <strong>how hard this tyre is being asked to work, as a fraction of what it
              has</strong> — and that is a question whose answer does not depend on load.
              <br />
              <br />
              Which is also why the collapse works at all: two things vary with load, the
              initial slope and the peak force, and both have been divided out.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="Peak slip angle rises with load"
          reference="Ch 14 Ex 14.3"
          note={
            <>
              Because the peak sits at a fixed ᾱ, the slip angle it corresponds to is{' '}
              <em>ᾱ<sub>peak</sub> · μF<sub>z</sub>/C<sub>α</sub></em> — and μF<sub>z</sub>{' '}
              grows faster than C<sub>α</sub> does.
            </>
          }
        >
          <Chart
            series={peakSeries}
            height={210}
            xLabel="Vertical load (kN)"
            yLabel="Slip angle at the peak (deg)"
            zeroY={false}
            fmtX={(x) => x.toFixed(1)}
            fmtY={(y) => y.toFixed(1)}
          />
          <div className="panel-note">
            The handling consequence is direct. Two tyres on an axle share approximately one
            slip angle, but the heavily loaded outside tyre wants a{' '}
            <strong>larger</strong> one than the lightly loaded inside tyre. They cannot both
            be at their optimum — one is past its peak while the other is short of it. That
            is a loss <em>on top of</em> Chapter 2's load sensitivity, and it is the argument
            behind anti-Ackermann in Chapter 19.
          </div>
          <Chart
            series={stiffnessSeries}
            height={190}
            xLabel="Vertical load (kN)"
            yLabel="C(α) (N/deg) · μ × 1000"
            zeroY={false}
            fmtX={(x) => x.toFixed(1)}
            fmtY={(y) => y.toFixed(0)}
          />
          <div className="panel-note">
            The two load-dependent functions that are all the collapse leaves behind.
            Cornering stiffness <strong>rises and then saturates</strong>; peak friction{' '}
            <strong>falls</strong>. Two functions in place of a table of hundreds of curves.
          </div>
        </Panel>

        <Panel
          title="The friction ellipse is a theorem"
          reference="Ch 14 §5 and Ex 14.5"
          note={
            <>
              Nothing here assumes an ellipse. Each direction is normalised by its own
              stiffness and its own peak, the resultant goes through <em>one</em> master
              curve, and the answer is projected back along the slip vector. The rings are
              what comes out.
            </>
          }
        >
          <Chart
            series={ellipseSeries}
            height={280}
            xLabel="Longitudinal force (kN)"
            yLabel="Lateral force (kN)"
            zeroY={false}
            fmtX={(x) => x.toFixed(1)}
            fmtY={(y) => y.toFixed(1)}
          />
          <Slider
            label="Vertical load"
            unit="N"
            value={combinedLoad}
            min={800}
            max={8000}
            step={100}
            digits={0}
            onChange={setCombinedLoad}
          />
          <Slider
            label="Slip angle"
            unit="deg"
            value={alphaDeg}
            min={0}
            max={14}
            step={0.25}
            digits={2}
            onChange={setAlphaDeg}
          />
          <Slider
            label="Slip ratio"
            unit=""
            value={slipRatio}
            min={0}
            max={0.35}
            step={0.005}
            digits={3}
            onChange={setSlipRatio}
          />
          <Readouts>
            <Readout label="Normalised slip ᾱ" value={combined.bar.toFixed(3)} />
            <Readout label="Master curve" value={combined.masterForce.toFixed(3)} tone="accent" />
            <Readout label="Longitudinal" value={(combined.fx / 1000).toFixed(2)} unit="kN" />
            <Readout label="Lateral" value={(combined.fy / 1000).toFixed(2)} unit="kN" />
            <Readout
              label="Lateral lost to the slip ratio"
              value={
                pureLateral.fy > 0
                  ? `${((1 - combined.fy / pureLateral.fy) * 100).toFixed(0)}%`
                  : '—'
              }
              tone="danger"
            />
            <Readout
              label="State"
              value={combined.sliding ? 'fully sliding' : 'still gripping'}
              tone={combined.sliding ? 'danger' : 'ok'}
            />
          </Readouts>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Try these" reference="guided">
          <TryThis experiments={experiments} />
        </Panel>

        <Panel title="Two numbers instead of a data table">
          <Explain
            seeing={
              <>
                A family of measured curves and the single curve they collapse onto. The
                collapse is not a curve fit — it is a change of variables that divides out
                the two things load actually does to a tyre.
              </>
            }
            look={
              <>
                What is left over. Once the peak force and the initial slope are removed, the{' '}
                <em>shape</em> of the transition is nearly invariant with load. If two tyres
                collapse onto the same master curve they differ only in μ(F<sub>z</sub>) and
                C<sub>α</sub>(F<sub>z</sub>) — two functions rather than hundreds of curves.
                And if they <em>don't</em> collapse together, that is itself a meaningful
                finding about construction.
              </>
            }
            matters={
              <>
                Three payoffs, and the first is the practical one. Real wheel loads in a
                corner — one wheel nearly unloaded, another at double static —{' '}
                <strong>routinely fall outside any convenient test matrix</strong>, so you
                have to interpolate, and this is what makes the interpolation principled.
                <br />
                <br />
                The cautions are real too. Rig μ differs from track μ by 10–20%; temperature
                is the largest uncontrolled variable and a slip-angle sweep heats the tyre as
                it proceeds; extrapolation toward very low loads is where fitted forms
                misbehave. Ch 14 §8's summary is the honest one:{' '}
                <strong>to understand a tyre, nondimensionalise; to simulate a vehicle, fit
                a Magic Formula.</strong> Serious practice uses both — which is why this app
                does the second everywhere else and the first here.
              </>
            }
          />
        </Panel>
      </div>
    </div>
  )
}

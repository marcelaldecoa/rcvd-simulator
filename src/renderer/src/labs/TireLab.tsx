/**
 * Chapter 2 lab -- the force generator.
 *
 * Five linked views, each attached to a specific claim in the chapter:
 *   1. Fy vs slip angle at several loads      -- the curve's three regions
 *   2. Peak Fy vs load                        -- load sensitivity, the concave curve
 *   3. Axle capacity vs load transfer         -- the 2c*Delta^2 loss
 *   4. Aligning torque and pneumatic trail    -- the front-limit warning
 *   5. The friction ellipse                   -- combined operation
 *
 * The load-transfer panel is the one worth lingering on: it is the mechanism
 * behind every anti-roll bar adjustment on every race car, and the chapter
 * says so explicitly.
 */

import { useMemo } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Formula, Panel, Readout, Readouts, Slider } from '../components/ui'
import { useGarage } from '../store/garage'
import { MagicFormulaTire } from '@core/tire/magicFormula.js'
import { axleCapacity, quadraticCoefficients } from '@core/tire/loadSensitivity.js'
import { ellipseRemainingFx } from '@core/tire/brush.js'
import { linspace, toDeg, toRad } from '@core/util/numeric.js'

const LOAD_COLORS = ['#5aa9ff', '#4dd6c1', '#ffcc55', '#ff9f4d', '#ff6b6b']

export function TireLab(): React.JSX.Element {
  const tire = useGarage((s) => s.tire)
  const setTire = useGarage((s) => s.setTire)

  const model = useMemo(() => new MagicFormulaTire(tire), [tire])
  const fz0 = tire.lateral.fz0

  const loads = useMemo(
    () => [0.5, 0.75, 1.0, 1.25, 1.5].map((f) => Math.round(fz0 * f)),
    [fz0]
  )

  // --- 1. Lateral force curves at several loads ---------------------------
  const fyCurves: Series[] = useMemo(
    () =>
      loads.map((fz, i) => ({
        name: `${(fz / 1000).toFixed(1)} kN`,
        color: LOAD_COLORS[i],
        points: linspace(0, toRad(16), 120).map((a) => ({ x: toDeg(a), y: model.fy(a, fz) }))
      })),
    [loads, model]
  )

  const fyPeaks = useMemo(
    () =>
      loads.map((fz, i) => {
        const p = model.peakFy(fz)
        return { x: toDeg(p.at), y: p.value, color: LOAD_COLORS[i] }
      }),
    [loads, model]
  )

  // --- 2. Load sensitivity -----------------------------------------------
  const loadSweep = useMemo(() => linspace(fz0 * 0.15, fz0 * 2.0, 70), [fz0])

  const peakVsLoad: Series[] = useMemo(
    () => [
      {
        name: 'Peak Fy',
        color: '#4dd6c1',
        points: loadSweep.map((fz) => ({ x: fz / 1000, y: model.peakFy(fz).value / 1000 }))
      },
      {
        name: 'If μ were constant',
        color: '#5f6f80',
        dashed: true,
        points: loadSweep.map((fz) => ({ x: fz / 1000, y: (model.muY(fz0) * fz) / 1000 }))
      }
    ],
    [loadSweep, model, fz0]
  )

  const muVsLoad: Series[] = useMemo(
    () => [
      {
        name: 'μy',
        color: '#ffcc55',
        points: loadSweep.map((fz) => ({ x: fz / 1000, y: model.muY(fz) }))
      }
    ],
    [loadSweep, model]
  )

  // --- 3. Axle capacity under lateral load transfer -----------------------
  const nominal = fz0
  const transferSweep = useMemo(() => linspace(0, nominal * 0.99, 60), [nominal])

  const axleCurves: Series[] = useMemo(() => {
    const exact = transferSweep.map((d) => {
      const cap = axleCapacity(tire.lateral, nominal, d)
      return { x: d / 1000, y: cap.fyAxle / 1000 }
    })
    const noTransfer = axleCapacity(tire.lateral, nominal, 0).fyAxle / 1000
    const { c } = quadraticCoefficients(tire.lateral)
    return [
      { name: 'Axle capacity', color: '#4dd6c1', points: exact },
      {
        name: 'No-transfer capacity',
        color: '#5f6f80',
        dashed: true,
        points: transferSweep.map((d) => ({ x: d / 1000, y: noTransfer }))
      },
      {
        name: 'Closed form  2cΔ²',
        color: '#ff9f4d',
        dashed: true,
        points: transferSweep.map((d) => ({
          x: d / 1000,
          y: noTransfer - (2 * c * d * d) / 1000
        }))
      }
    ]
  }, [transferSweep, tire.lateral, nominal])

  const halfTransfer = axleCapacity(tire.lateral, nominal, nominal * 0.5)
  const quarterTransfer = axleCapacity(tire.lateral, nominal, nominal * 0.25)

  // --- 4. Aligning torque and pneumatic trail -----------------------------
  const mzCurves: Series[] = useMemo(() => {
    const alphas = linspace(0, toRad(16), 120)
    return [
      {
        name: 'Aligning torque Mz',
        color: '#ff9f4d',
        points: alphas.map((a) => ({ x: toDeg(a), y: model.mz(a, fz0) }))
      },
      {
        name: 'Fy scaled (/100)',
        color: '#5aa9ff',
        dashed: true,
        points: alphas.map((a) => ({ x: toDeg(a), y: model.fy(a, fz0) / 100 }))
      }
    ]
  }, [model, fz0])

  const trailCurve: Series[] = useMemo(() => {
    const alphas = linspace(0, toRad(16), 120)
    return [
      {
        name: 'Pneumatic trail',
        color: '#4dd6c1',
        points: alphas.map((a) => ({ x: toDeg(a), y: model.pneumaticTrail(a, fz0) * 1000 }))
      }
    ]
  }, [model, fz0])

  const alphaPeak = model.peakFy(fz0).at
  const mzPeakAlpha = useMemo(() => {
    let best = 0
    let bestV = -Infinity
    for (const a of linspace(0, toRad(16), 400)) {
      const m = model.mz(a, fz0)
      if (m > bestV) {
        bestV = m
        best = a
      }
    }
    return best
  }, [model, fz0])

  // --- 5. Friction ellipse ------------------------------------------------
  const fyMax = model.peakFy(fz0).value
  const fxMax = model.peakFx(fz0).value

  const ellipse: Series[] = useMemo(() => {
    const idealised = linspace(-1, 1, 120).map((r) => ({
      x: (r * fxMax) / 1000,
      y: ellipseRemainingFx(0, 1, 1) * 0 + (fyMax * Math.sqrt(Math.max(1 - r * r, 0))) / 1000
    }))
    // The model's own combined-slip envelope, walked around the limit.
    const actual = linspace(0, Math.PI, 90).map((phi) => {
      const c = model.combined({
        alpha: Math.atan(Math.sin(phi) * Math.tan(model.peakFy(fz0).at)),
        kappa: Math.cos(phi) * model.peakFx(fz0).at,
        fz: fz0
      })
      return { x: c.fx / 1000, y: c.fy / 1000 }
    })
    return [
      { name: 'Ideal ellipse', color: '#5f6f80', dashed: true, points: idealised },
      { name: 'Model envelope', color: '#4dd6c1', points: actual }
    ]
  }, [model, fz0, fxMax, fyMax])

  return (
    <div className="lab">
      <div className="stack">
        <Panel title="Tire parameters" reference="Ch 2">
          <Slider
            label="Peak friction μ₀ at reference load"
            value={tire.lateral.mu0}
            min={0.7}
            max={2.2}
            step={0.01}
            onChange={(mu0) => setTire({ lateral: { ...tire.lateral, mu0 } })}
          />
          <Slider
            label="Load sensitivity k_μ"
            value={tire.lateral.kMu}
            min={0}
            max={0.35}
            step={0.005}
            digits={3}
            onChange={(kMu) => setTire({ lateral: { ...tire.lateral, kMu } })}
          />
          <Slider
            label="Reference load Fz₀"
            unit="N"
            value={tire.lateral.fz0}
            min={1500}
            max={9000}
            step={100}
            digits={0}
            onChange={(v) =>
              setTire({
                lateral: { ...tire.lateral, fz0: v },
                longitudinal: { ...tire.longitudinal, fz0: v }
              })
            }
          />
          <Slider
            label="Peak cornering stiffness"
            unit="kN/rad"
            value={tire.caMax}
            min={40000}
            max={260000}
            step={1000}
            display={(tire.caMax / 1000).toFixed(0)}
            onChange={(caMax) => setTire({ caMax })}
          />
          <Slider
            label="Load at peak stiffness"
            unit="N"
            value={tire.fzAtPeakStiffness}
            min={2000}
            max={12000}
            step={100}
            digits={0}
            onChange={(fzAtPeakStiffness) => setTire({ fzAtPeakStiffness })}
          />
          <Slider
            label="Peak slip angle at Fz₀"
            unit="deg"
            value={tire.peakSlipAngleDeg}
            min={3}
            max={14}
            step={0.1}
            digits={1}
            onChange={(peakSlipAngleDeg) => setTire({ peakSlipAngleDeg })}
          />
          <Slider
            label="Shape factor C"
            value={tire.shapeC}
            min={1.1}
            max={1.9}
            step={0.01}
            onChange={(shapeC) => setTire({ shapeC })}
          />
          <Slider
            label="Contact patch length"
            unit="mm"
            value={tire.contactLength}
            min={0.08}
            max={0.3}
            step={0.005}
            display={(tire.contactLength * 1000).toFixed(0)}
            onChange={(contactLength) => setTire({ contactLength })}
          />
          <Slider
            label="Trail zero / Fy peak"
            value={tire.trailZeroRatio}
            min={0.5}
            max={2.0}
            step={0.05}
            onChange={(trailZeroRatio) => setTire({ trailZeroRatio })}
          />
        </Panel>

        <Panel title="At the reference load" reference="Fz₀">
          <Readouts>
            <Readout label="Cornering stiffness" value={(model.corneringStiffness(fz0) / 1000).toFixed(1)} unit="kN/rad" tone="accent" />
            <Readout label="…per degree" value={(model.corneringStiffness(fz0) / (180 / Math.PI)).toFixed(0)} unit="N/deg" />
            <Readout label="Peak Fy" value={(fyMax / 1000).toFixed(2)} unit="kN" />
            <Readout label="at slip angle" value={toDeg(alphaPeak).toFixed(1)} unit="deg" />
            <Readout label="μy" value={model.muY(fz0).toFixed(3)} />
            <Readout label="Curvature E" value={model.curvatureE.toFixed(2)} />
          </Readouts>
        </Panel>
      </div>

      <div className="stack">
        <div className="grid2">
          <Panel
            title="Lateral force vs slip angle"
            reference="Ch 2 §2.2"
            note={
              <>
                Three regions: linear below roughly 2–4°, a transitional bend as more of
                the patch slides, then the peak near <Formula tex="\mu_y F_z" /> and the
                decline beyond. Notice the peak slip angle <em>rises</em> with load — the
                reason race cars run parallel or anti-Ackermann steering (Ch 19).
              </>
            }
          >
            <Chart
              series={fyCurves}
              markers={fyPeaks.map((p) => ({ ...p }))}
              height={270}
              xLabel="Slip angle α (deg)"
              yLabel="Lateral force Fy (N)"
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => (v / 1000).toFixed(1) + 'k'}
            />
          </Panel>

          <Panel
            title="Load sensitivity"
            reference="Ch 2 §3"
            note={
              <>
                The most important nonlinearity in the book. Peak force is concave in
                load, so an axle that transfers load loses capacity. Everything about
                balance tuning follows from the gap between these two lines.
              </>
            }
          >
            <Chart
              series={peakVsLoad}
              height={190}
              xLabel="Vertical load Fz (kN)"
              yLabel="Peak Fy (kN)"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(1)}
            />
            <Chart
              series={muVsLoad}
              height={130}
              xLabel="Vertical load Fz (kN)"
              yLabel="μy"
              zeroY={false}
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(2)}
            />
          </Panel>
        </div>

        <Panel
          title="Axle capacity under lateral load transfer"
          reference="Ch 2 §3 · Exercise 2.6"
          note={
            <>
              <Formula tex="F_y^{axle}(\Delta) = F_y^{axle}(0) - 2c\Delta^2" block />
              Quadratic in load transfer and <strong>independent of nominal load</strong>.
              Small transfers are almost free; large ones are very expensive. This is why
              doubling roll stiffness at one end more than doubles the balance effect —
              and why the front/rear <em>difference</em> in transfer (TLLTD, Ch 7) is the
              master balance parameter. The closed form and the exact curve part company
              once the inner tire lifts.
            </>
          }
        >
          <Chart
            series={axleCurves}
            height={230}
            xLabel="Load transfer Δ (kN)"
            yLabel="Axle lateral capacity (kN)"
            zeroY={false}
            fmtX={(v) => v.toFixed(1)}
            fmtY={(v) => v.toFixed(1)}
            vRules={[
              { value: nominal / 1000, label: 'inner tire lifts', color: '#ff6b6b' }
            ]}
          />
          <Readouts>
            <Readout label="Δ = 25% of load" value={(quarterTransfer.lossFraction * 100).toFixed(2)} unit="% lost" />
            <Readout label="Δ = 50% of load" value={(halfTransfer.lossFraction * 100).toFixed(2)} unit="% lost" tone="warn" />
            <Readout label="Ratio (should be 4×)" value={(halfTransfer.loss / quarterTransfer.loss).toFixed(2)} unit="×" tone="accent" />
            <Readout label="c coefficient" value={quadraticCoefficients(tire.lateral).c.toExponential(2)} unit="1/N" />
          </Readouts>
        </Panel>

        <div className="grid2">
          <Panel
            title="Aligning torque and pneumatic trail"
            reference="Ch 2 §4"
            note={
              <>
                Aligning torque peaks at a <strong>lower</strong> slip angle than lateral
                force and is already decaying while grip is still building. That inversion
                is the driver's front-limit warning. Raise the trail-zero ratio and the
                warning weakens — the same thing excessive caster or power assistance does
                in the real car.
              </>
            }
          >
            <Chart
              series={mzCurves}
              height={190}
              xLabel="Slip angle α (deg)"
              yLabel="Mz (N·m) / Fy÷100"
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(0)}
              vRules={[
                { value: toDeg(mzPeakAlpha), label: 'Mz peak', color: '#ff9f4d' },
                { value: toDeg(alphaPeak), label: 'Fy peak', color: '#5aa9ff' }
              ]}
            />
            <Chart
              series={trailCurve}
              height={130}
              xLabel="Slip angle α (deg)"
              yLabel="Trail (mm)"
              fmtX={(v) => v.toFixed(0)}
              fmtY={(v) => v.toFixed(0)}
            />
          </Panel>

          <Panel
            title="The friction ellipse"
            reference="Ch 2 §6"
            note={
              <>
                Braking at 50% of longitudinal capability leaves{' '}
                <strong>{(Math.sqrt(1 - 0.25) * 100).toFixed(0)}%</strong> of lateral.
                Trail braking is cheap near the start and expensive near the end — the
                first 60% of braking costs 20% of cornering, the last 11% of cornering
                costs over half the braking.
              </>
            }
          >
            <Chart
              series={ellipse}
              height={300}
              xLabel="Longitudinal force Fx (kN)"
              yLabel="Lateral force Fy (kN)"
              fmtX={(v) => v.toFixed(1)}
              fmtY={(v) => v.toFixed(1)}
            />
            <Readouts>
              <Readout label="Peak Fy" value={(fyMax / 1000).toFixed(2)} unit="kN" tone="front" />
              <Readout label="Peak Fx" value={(fxMax / 1000).toFixed(2)} unit="kN" tone="rear" />
              <Readout label="Fy at 50% braking" value={((fyMax * Math.sqrt(0.75)) / 1000).toFixed(2)} unit="kN" />
              <Readout label="Fx at 90% cornering" value={(ellipseRemainingFx(0.9 * fyMax, fyMax, fxMax) / 1000).toFixed(2)} unit="kN" />
            </Readouts>
          </Panel>
        </div>
      </div>
    </div>
  )
}

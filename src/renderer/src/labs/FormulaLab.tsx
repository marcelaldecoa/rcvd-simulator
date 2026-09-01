/**
 * The formula playground.
 *
 * The animations elsewhere build intuition; this is where it has to land as
 * mathematics. Each equation is shown three ways at once —
 *
 *   1. the formula itself,
 *   2. the same formula with YOUR numbers written into it,
 *   3. the answer,
 *
 * — and then a chart sweeps one variable so you can see the shape of the
 * relationship rather than a single point on it. Where a formula is naturally a
 * sum or a difference, its terms are broken out, because "why is it this value"
 * usually means "which term is winning".
 *
 * Nothing here is a second implementation. Every formula is tested against the
 * model function it mirrors, so the playground cannot drift from the simulator.
 */

import { useMemo, useState } from 'react'
import { Chart, type Series } from '../components/Chart'
import { Explain } from '../components/Teach'
import { Formula as Tex, Panel, Slider } from '../components/ui'
import {
  defaultValues,
  FORMULAS,
  localSensitivity,
  sweepFormula,
  type Formula
} from '@core/formulas/index.js'

const TONE: Record<string, string> = {
  front: '#5aa9ff',
  rear: '#ff9f4d',
  accent: '#4dd6c1',
  warn: '#ffcc55'
}

export function FormulaLab(): React.JSX.Element {
  const [active, setActive] = useState<Formula>(FORMULAS[4]) // understeer gradient
  const [values, setValues] = useState<Record<string, number>>(() =>
    defaultValues(FORMULAS[4])
  )
  const [sweepKey, setSweepKey] = useState<string>(FORMULAS[4].sweep[0])

  const select = (f: Formula): void => {
    setActive(f)
    setValues(defaultValues(f))
    setSweepKey(f.sweep[0])
  }

  const result = active.evaluate(values)
  const terms = active.terms?.(values)
  const sweepVar = active.vars.find((v) => v.key === sweepKey) ?? active.vars[0]

  const curve: Series[] = useMemo(
    () => [
      {
        name: `${active.title}`,
        color: '#4dd6c1',
        points: sweepFormula(active, values, sweepVar.key).map((p) => ({ x: p.x, y: p.y }))
      }
    ],
    [active, values, sweepVar.key]
  )

  const sensitivity = useMemo(() => localSensitivity(active, values), [active, values])
  const widest = Math.max(...sensitivity.map((s) => Math.abs(s.delta)), 1e-12)

  const termScale = terms ? Math.max(...terms.map((t) => Math.abs(t.value)), 1e-12) : 1

  const chapters = [...new Set(FORMULAS.map((f) => f.chapter))].sort((a, b) => a - b)

  return (
    <div className="lab lab-wide">
      <div className="lab-intro">
        The equations of the course, with your numbers written into them. Change a value
        and watch the substitution, the answer and the <strong>shape of the
        relationship</strong> move together.
      </div>

      <div className="formula-pick">
        {chapters.map((ch) => (
          <div key={ch} className="formula-pick-group">
            <span className="formula-pick-label">Ch {ch}</span>
            {FORMULAS.filter((f) => f.chapter === ch).map((f) => (
              <button
                key={f.id}
                className={`btn${f.id === active.id ? ' active' : ''}`}
                onClick={() => select(f)}
              >
                {f.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="stage">
        <div className="stack">
          <Panel title={active.title} reference={active.reference}>
            <div className="formula-meaning">{active.meaning}</div>

            <div className="formula-stage">
              <div className="formula-row">
                <span className="formula-tag">The formula</span>
                <div className="formula-big">
                  <Tex tex={active.tex} block />
                </div>
              </div>

              <div className="formula-row">
                <span className="formula-tag formula-tag-sub">With your numbers</span>
                <div className="formula-big">
                  <Tex
                    tex={`${active.resultTex} = ${active.substituted(values)}`}
                    block
                  />
                </div>
              </div>

              <div className="formula-result">
                <Tex tex={`${active.resultTex} =`} />
                <span className="formula-result-value">
                  {result.toFixed(active.digits ?? 3)}
                </span>
                <span className="formula-result-unit">{active.unit}</span>
              </div>
            </div>

            {terms && (
              <div className="formula-terms">
                <div className="formula-tag" style={{ marginBottom: 8 }}>
                  Where it comes from
                </div>
                {terms.map((t) => (
                  <div className="term-row" key={t.label}>
                    <div className="term-label">{t.label}</div>
                    <div className="term-track">
                      <div
                        className="term-bar"
                        style={{
                          width: `${(Math.abs(t.value) / termScale) * 100}%`,
                          background: TONE[t.tone ?? 'accent']
                        }}
                      />
                    </div>
                    <div className="term-value">{t.value.toFixed(active.digits ?? 3)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Play with it">
            <div className="formula-hint">
              Click a symbol to put it on the chart’s x-axis.
            </div>
            {active.vars.map((spec) => (
              <div
                key={spec.key}
                className={`formula-var${spec.key === sweepKey ? ' formula-var-active' : ''}`}
              >
                <button
                  className="formula-symbol"
                  onClick={() => setSweepKey(spec.key)}
                  title={`Sweep ${spec.label}`}
                >
                  <Tex tex={spec.tex} />
                </button>
                <div style={{ flex: 1 }}>
                  <Slider
                    label={spec.label}
                    unit={spec.unit}
                    value={values[spec.key]}
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    digits={spec.digits ?? 2}
                    onChange={(x) => setValues({ ...values, [spec.key]: x })}
                  />
                </div>
              </div>
            ))}
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="btn" onClick={() => setValues(defaultValues(active))}>
                Reset values
              </button>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title={`How the answer moves with ${sweepVar.label}`}
            reference={`sweeping ${sweepVar.unit ? sweepVar.unit : sweepVar.key}`}
          >
            <Chart
              series={curve}
              height={280}
              xLabel={`${sweepVar.label}${sweepVar.unit ? ` (${sweepVar.unit})` : ''}`}
              yLabel={`${active.title}${active.unit ? ` (${active.unit})` : ''}`}
              zeroY={false}
              fmtX={(x) => (Math.abs(x) >= 1000 ? (x / 1000).toFixed(1) + 'k' : x.toFixed(2))}
              fmtY={(y) => (Math.abs(y) >= 1000 ? (y / 1000).toFixed(1) + 'k' : y.toFixed(2))}
              markers={[{ x: values[sweepVar.key], y: result, label: 'now', color: '#dbe4ee' }]}
              vRules={[
                { value: values[sweepVar.key], color: '#dbe4ee', dashed: false }
              ]}
              hRules={[{ value: 0, color: '#33414f', dashed: false }]}
            />
          </Panel>

          <Panel
            title="Which variable is actually driving this?"
            note="Change in the answer for a 10% move in each variable, at the values you have now."
          >
            <div className="tornado">
              {sensitivity.map((s) => (
                <div className="tornado-row" key={s.key}>
                  <div className="tornado-label">
                    <button className="formula-symbol formula-symbol-sm" onClick={() => setSweepKey(s.key)}>
                      <Tex tex={s.tex} />
                    </button>
                    <span style={{ marginLeft: 8 }}>{s.label}</span>
                  </div>
                  <div className="tornado-track">
                    <div className="tornado-mid" />
                    <div
                      className="tornado-bar"
                      style={{
                        width: `${(Math.abs(s.delta) / widest) * 50}%`,
                        [s.delta >= 0 ? 'left' : 'right']: '50%',
                        background: s.delta >= 0 ? 'var(--front)' : 'var(--rear)'
                      }}
                    />
                  </div>
                  <div className="tornado-value">
                    {s.delta >= 0 ? '+' : ''}
                    {s.delta.toFixed(Math.max((active.digits ?? 3) - 1, 1))}
                  </div>
                  <div className="tornado-range" />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="What to notice">
            <Explain
              seeing={active.meaning}
              look={active.insight}
              matters={
                <>
                  Every formula here is tested against the model that produces the same
                  quantity elsewhere in the app, so what you compute on this page is
                  exactly what the simulator uses — not a simplified restatement of it.
                </>
              }
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

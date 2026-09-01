/**
 * Teaching components.
 *
 * A dashboard full of correct charts is not a teaching tool. What was missing
 * was the part a good instructor supplies: what am I looking at, what should I
 * do, and what should I notice when I do it.
 *
 *   <Explain>   what you're seeing / what to look for / why it matters
 *   <TryThis>   a concrete experiment with a one-click setup and a prediction
 */

import { useState, type ReactNode } from 'react'

export function Explain({
  seeing,
  look,
  matters
}: {
  seeing: ReactNode
  look: ReactNode
  matters?: ReactNode
}): React.JSX.Element {
  return (
    <div className="explain">
      <div className="explain-row">
        <span className="explain-tag">What this shows</span>
        <div>{seeing}</div>
      </div>
      <div className="explain-row">
        <span className="explain-tag explain-tag-look">What to look for</span>
        <div>{look}</div>
      </div>
      {matters && (
        <div className="explain-row">
          <span className="explain-tag explain-tag-why">Why it matters</span>
          <div>{matters}</div>
        </div>
      )}
    </div>
  )
}

export interface Experiment {
  title: string
  /** What the learner should do, or what the button will do for them. */
  action: string
  /** What they should predict before running it. */
  predict: string
  /** What actually happens, revealed after. */
  result: ReactNode
  /** Applies the setup. Omit for experiments the learner performs by hand. */
  run?: () => void
  /** Restores whatever the experiment changed. */
  reset?: () => void
}

export function TryThis({ experiments }: { experiments: Experiment[] }): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  return (
    <div className="try-list">
      {experiments.map((e, i) => (
        <div className={`try${open === i ? ' try-open' : ''}`} key={e.title}>
          <button className="try-head" onClick={() => setOpen(open === i ? null : i)}>
            <span className="try-num">{i + 1}</span>
            <span className="try-title">{e.title}</span>
            <span className="try-chev">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="try-body">
              <div className="try-step">
                <span className="try-label">Do</span>
                {e.action}
              </div>
              <div className="try-step">
                <span className="try-label">Predict</span>
                {e.predict}
              </div>

              <div className="btn-row" style={{ marginTop: 8 }}>
                {e.run && (
                  <button
                    className="btn active"
                    onClick={() => {
                      e.run!()
                      setRevealed(new Set(revealed).add(i))
                    }}
                  >
                    Set it up for me
                  </button>
                )}
                {!revealed.has(i) && (
                  <button className="btn" onClick={() => setRevealed(new Set(revealed).add(i))}>
                    Show me what happens
                  </button>
                )}
                {e.reset && revealed.has(i) && (
                  <button className="btn" onClick={e.reset}>
                    Undo
                  </button>
                )}
              </div>

              {revealed.has(i) && (
                <div className="try-result">
                  <span className="try-label try-label-result">What happens</span>
                  {e.result}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** A large, plain-language verdict banner. */
export function Verdict({
  headline,
  tone,
  children
}: {
  headline: string
  tone: 'front' | 'rear' | 'ok'
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className={`verdict verdict-${tone}`}>
      <div className="verdict-headline">{headline}</div>
      {children && <div className="verdict-body">{children}</div>}
    </div>
  )
}

/**
 * A dashboard widget: one measurement, and the chapter that explains it.
 *
 * The link is the point, not decoration. A number off a telemetry trace is
 * inert on its own -- "the front axle limited you for 62% of the cornering" is
 * only actionable if you can go and see what governs that, turn its knobs, and
 * come back. So every widget names its chapter and opens its lab.
 */

import type { ReactNode } from 'react'
import type { LabId } from '../data/chapters'
import { useNav } from '../store/nav'

export function Widget({
  title,
  reference,
  lab,
  labText = 'open lab',
  note,
  children
}: {
  title: string
  /** Where this comes from in the book, e.g. "Ch 5 §4". */
  reference?: string
  /** The lab that lets you do something about it. */
  lab?: LabId
  labText?: string
  note?: ReactNode
  children?: ReactNode
}): React.JSX.Element {
  const goToLab = useNav((s) => s.goToLab)
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        {reference && <span className="panel-ref">{reference}</span>}
        {lab && (
          <button
            className="widget-link"
            onClick={() => goToLab(lab)}
            title={`Open the ${labText} for this measurement`}
          >
            {labText} →
          </button>
        )}
      </div>
      {children && <div className="panel-body">{children}</div>}
      {note && <div className="panel-note">{note}</div>}
    </div>
  )
}

/**
 * A proportion drawn as a bar.
 *
 * Used for balance shares and grip used, where the question is always "how much
 * of the whole" and a number alone makes the reader do the comparison.
 */
export function Bar({
  value,
  colour,
  label,
  caption
}: {
  /** 0-1. Values above 1 are clamped, and the caption should say so. */
  value: number
  colour: string
  label: string
  caption?: string
}): React.JSX.Element {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="widget-bar">
      <div className="widget-bar-label">
        <span>{label}</span>
        <span className="widget-bar-caption">{caption ?? `${Math.round(value * 100)}%`}</span>
      </div>
      <div className="widget-bar-track">
        <div className="widget-bar-fill" style={{ width: `${pct}%`, background: colour }} />
      </div>
    </div>
  )
}

/**
 * The three balance shares as one stacked bar.
 *
 * Stacked rather than three separate bars because they sum to the whole, and
 * seeing that they do is most of the information: a car that is 70% understeer
 * and 5% oversteer is a different problem from one that is 40% and 35%.
 */
export function BalanceBar({
  understeer,
  neutral,
  oversteer
}: {
  understeer: number
  neutral: number
  oversteer: number
}): React.JSX.Element {
  const total = understeer + neutral + oversteer
  if (total <= 0) return <div className="widget-bar-caption">no cornering measured</div>
  const seg = (v: number, colour: string, title: string): React.JSX.Element => (
    <div style={{ width: `${(v / total) * 100}%`, background: colour }} title={title} />
  )
  return (
    <>
      <div className="widget-stack">
        {seg(understeer, 'var(--accent)', `understeer ${Math.round((understeer / total) * 100)}%`)}
        {seg(neutral, 'var(--ok)', `neutral ${Math.round((neutral / total) * 100)}%`)}
        {seg(oversteer, 'var(--danger)', `oversteer ${Math.round((oversteer / total) * 100)}%`)}
      </div>
      <div className="widget-legend">
        <span>
          <i style={{ background: 'var(--accent)' }} /> understeer{' '}
          {Math.round((understeer / total) * 100)}%
        </span>
        <span>
          <i style={{ background: 'var(--ok)' }} /> neutral {Math.round((neutral / total) * 100)}%
        </span>
        <span>
          <i style={{ background: 'var(--danger)' }} /> oversteer{' '}
          {Math.round((oversteer / total) * 100)}%
        </span>
      </div>
    </>
  )
}

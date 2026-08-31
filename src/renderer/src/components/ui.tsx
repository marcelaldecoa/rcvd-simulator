/** Small shared UI primitives: panels, sliders, readouts, formula blocks. */

import { useEffect, useRef, type ReactNode } from 'react'
import katex from 'katex'

export function Panel({
  title,
  reference,
  note,
  children,
  right
}: {
  title: string
  reference?: string
  note?: ReactNode
  children?: ReactNode
  right?: ReactNode
}): React.JSX.Element {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        {right}
        {reference && <span className="panel-ref">{reference}</span>}
      </div>
      {children && <div className="panel-body">{children}</div>}
      {note && <div className="panel-note">{note}</div>}
    </div>
  )
}

export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  digits = 2,
  display,
  onChange
}: {
  label: string
  unit?: string
  value: number
  min: number
  max: number
  step: number
  digits?: number
  /** Override the shown value, e.g. to display in different units. */
  display?: string
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <span className="field-value">
          {display ?? value.toFixed(digits)}
          {unit && <span className="field-unit"> {unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Readout({
  label,
  value,
  unit,
  tone
}: {
  label: string
  value: string
  unit?: string
  tone?: 'accent' | 'front' | 'rear' | 'warn' | 'danger' | 'ok'
}): React.JSX.Element {
  return (
    <div className="readout">
      <div className="readout-label">{label}</div>
      <div className={`readout-value${tone ? ` v-${tone}` : ''}`}>
        {value}
        {unit && <span className="readout-unit">{unit}</span>}
      </div>
    </div>
  )
}

export function Readouts({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="readouts">{children}</div>
}

/** A KaTeX-rendered formula. `block` centres it on its own line. */
export function Formula({
  tex,
  block = false
}: {
  tex: string
  block?: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    katex.render(tex, ref.current, {
      displayMode: block,
      throwOnError: false,
      output: 'html'
    })
  }, [tex, block])
  return <span ref={ref} style={block ? { display: 'block', margin: '10px 0' } : undefined} />
}

export function ButtonRow<T extends string | number>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div className="btn-row">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={`btn${o.value === value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BalancePill({ balance }: { balance: string }): React.JSX.Element {
  return <span className={`pill pill-${balance}`}>{balance}</span>
}

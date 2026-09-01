import { useState } from 'react'
import { CHAPTERS, PARTS, type Chapter } from './data/chapters'
import { Notes } from './components/Notes'
import { Exercises } from './components/Exercises'
import { Glossary } from './components/Glossary'
import { FormulaLab } from './labs/FormulaLab'
import { CorneringLab } from './labs/CorneringLab'
import { ConditionsLab } from './labs/ConditionsLab'
import { TireLab } from './labs/TireLab'
import { SteadyStateLab } from './labs/SteadyStateLab'
import { TransientLab } from './labs/TransientLab'
import { PairAnalysisLab } from './labs/PairAnalysisLab'
import { WheelLoadsLab } from './labs/WheelLoadsLab'
import { useGarage } from './store/garage'
import { summarise } from '@core/vehicle/steadyState.js'

type View = 'lab' | 'notes' | 'exercises'

function LabFor({ chapter }: { chapter: Chapter }): React.JSX.Element {
  switch (chapter.lab) {
    case 'cornering':
      return <CorneringLab />
    case 'conditions':
      return <ConditionsLab />
    case 'tire':
      return <TireLab />
    case 'steady':
      return <SteadyStateLab />
    case 'transient':
      return <TransientLab />
    case 'pair':
      return <PairAnalysisLab />
    case 'wheelLoads':
      return <WheelLoadsLab />
    case 'glossary':
      return <Glossary />
    case 'formulas':
      return <FormulaLab />
    default:
      return (
        <div className="empty">
          <h3>No interactive lab for this chapter yet</h3>
          {chapter.blurb && <div>{chapter.blurb}</div>}
          <div style={{ marginTop: 14, fontSize: 12 }}>
            The notes are complete — switch to the Notes tab. Labs are being built in the
            order the course recommends: Ch 2, 5 and 6 first, then the limit chapters.
          </div>
        </div>
      )
  }
}

export function App(): React.JSX.Element {
  const [active, setActive] = useState<Chapter>(CHAPTERS.find((c) => c.lab === 'cornering')!)
  const [view, setView] = useState<View>('lab')

  const vehicle = useGarage((s) => s.vehicle)
  const speed = useGarage((s) => s.speed)
  const s = summarise(vehicle)

  const showLab = active.lab !== undefined
  const hasExercises = active.n > 0
  const effectiveView: View =
    view === 'lab' && !showLab ? 'notes' : view === 'exercises' && !hasExercises ? 'notes' : view

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <h1 className="sidebar-title">RCVD Simulator</h1>
          <div className="sidebar-sub">Milliken &amp; Milliken · study environment</div>
        </div>
        <div className="sidebar-scroll">
          {PARTS.map((part) => (
            <div key={part}>
              <div className="nav-group">{part}</div>
              {CHAPTERS.filter((c) => c.part === part).map((c) => (
                <div
                  key={`${c.part}-${c.n}-${c.lab ?? 'notes'}`}
                  className={`nav-item${c === active ? ' active' : ''}`}
                  onClick={() => {
                    setActive(c)
                    if (c.lab) setView('lab')
                  }}
                >
                  <span className="nav-num">{c.n === 0 ? '—' : c.n}</span>
                  <span>{c.title}</span>
                  {c.lab && <span className="nav-lab">lab</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h2>
            {active.n > 0 && (
              <span style={{ color: 'var(--text-faint)' }}>Chapter {active.n} · </span>
            )}
            {active.title}
          </h2>

          <div
            style={{
              color: 'var(--text-faint)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              display: 'flex',
              gap: 14
            }}
          >
            <span>{vehicle.name}</span>
            <span>
              K{' '}
              <span
                style={{
                  color:
                    s.balance === 'oversteer'
                      ? 'var(--danger)'
                      : s.balance === 'neutral'
                        ? 'var(--ok)'
                        : 'var(--accent)'
                }}
              >
                {s.KDeg >= 0 ? '+' : ''}
                {s.KDeg.toFixed(3)}
              </span>{' '}
              deg/g
            </span>
            <span>V {speed.toFixed(0)} m/s</span>
          </div>

          <div className="tabs">
            {showLab && (
              <button
                className={`tab${effectiveView === 'lab' ? ' active' : ''}`}
                onClick={() => setView('lab')}
              >
                Lab
              </button>
            )}
            <button
              className={`tab${effectiveView === 'notes' ? ' active' : ''}`}
              onClick={() => setView('notes')}
            >
              Notes
            </button>
            {hasExercises && (
              <button
                className={`tab${effectiveView === 'exercises' ? ' active' : ''}`}
                onClick={() => setView('exercises')}
              >
                Exercises
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {effectiveView === 'lab' ? (
            <LabFor chapter={active} />
          ) : effectiveView === 'exercises' ? (
            <Exercises file={active.file} title={`Chapter ${active.n}`} />
          ) : (
            <Notes file={active.file} />
          )}
        </div>
      </main>
    </div>
  )
}

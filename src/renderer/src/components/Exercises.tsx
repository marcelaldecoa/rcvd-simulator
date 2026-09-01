/**
 * Exercise mode.
 *
 * The course overview is blunt about this: "The exercises are the load-bearing
 * part. Vehicle dynamics is a subject in which the equations are easy to read
 * and hard to use." Scrolling past them in the notes is not doing them, so here
 * they are one at a time, with the solution withheld until asked for and a
 * record of which ones you have worked.
 *
 * Progress lives in localStorage: it is a personal study record, not app state,
 * and it should survive a restart without needing anywhere to put it.
 */

import { useEffect, useMemo, useState } from 'react'
import { parseExercises, type Exercise } from '@core/util/exercises.js'
import { readDoc } from '../lib/docs'
import { renderMarkdown } from '../lib/markdown'

type Status = 'unseen' | 'attempted' | 'done'

const KEY = 'rcvd.exercise.progress'

function loadProgress(): Record<string, Status> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Status>
  } catch {
    return {}
  }
}

function saveProgress(p: Record<string, Status>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // A private window or blocked site data: progress simply is not kept.
  }
}

/** Markdown rendered asynchronously into a div. */
function Rendered({ src, className }: { src: string; className?: string }): React.JSX.Element {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let live = true
    renderMarkdown(src).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [src])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

function ExerciseCard({
  ex,
  status,
  onStatus
}: {
  ex: Exercise
  status: Status
  onStatus: (s: Status) => void
}): React.JSX.Element {
  const [showSolution, setShowSolution] = useState(false)

  // Collapse the solution again when moving to a different exercise.
  useEffect(() => setShowSolution(false), [ex.id])

  return (
    <div className={`exercise exercise-${status}`}>
      <div className="exercise-head">
        <span className="exercise-id">{ex.id}</span>
        <span className={`exercise-status exercise-status-${status}`}>
          {status === 'done' ? 'worked' : status === 'attempted' ? 'attempted' : 'not started'}
        </span>
      </div>

      <Rendered src={ex.question} className="exercise-question notes" />

      <div className="btn-row" style={{ marginTop: 10 }}>
        {!showSolution && (
          <button
            className="btn active"
            onClick={() => {
              setShowSolution(true)
              if (status === 'unseen') onStatus('attempted')
            }}
          >
            Show the worked solution
          </button>
        )}
        {showSolution && (
          <>
            <button className="btn" onClick={() => setShowSolution(false)}>
              Hide solution
            </button>
            <button
              className={`btn${status === 'done' ? ' active' : ''}`}
              onClick={() => onStatus(status === 'done' ? 'attempted' : 'done')}
            >
              {status === 'done' ? '✓ Marked as worked' : 'Mark as worked'}
            </button>
          </>
        )}
      </div>

      {showSolution &&
        (ex.solution ? (
          <div className="exercise-solution">
            <div className="exercise-solution-tag">Worked solution</div>
            <Rendered src={ex.solution} className="notes" />
          </div>
        ) : (
          <div className="exercise-solution">
            The notes give no worked solution for this one.
          </div>
        ))}
    </div>
  )
}

export function Exercises({ file, title }: { file: string; title: string }): React.JSX.Element {
  const [exercises, setExercises] = useState<Exercise[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState<Record<string, Status>>(loadProgress)

  useEffect(() => {
    let live = true
    setExercises(null)
    setError(null)
    setIndex(0)
    readDoc(file)
      .then((src) => live && setExercises(parseExercises(src)))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [file])

  const setStatus = (id: string, s: Status): void => {
    const next = { ...progress, [id]: s }
    setProgress(next)
    saveProgress(next)
  }

  const doneCount = useMemo(
    () => (exercises ?? []).filter((e) => progress[e.id] === 'done').length,
    [exercises, progress]
  )

  if (error) {
    return (
      <div className="notes-loading">
        Could not load <code>{file}</code>
        <br />
        {error}
      </div>
    )
  }
  if (!exercises) return <div className="notes-loading">Loading exercises…</div>
  if (!exercises.length) {
    return (
      <div className="empty">
        <h3>This document has no exercises</h3>
        <div>Every numbered chapter does — pick one from the sidebar.</div>
      </div>
    )
  }

  const current = exercises[Math.min(index, exercises.length - 1)]

  return (
    <div className="exercises">
      <div className="exercises-bar">
        <div className="exercises-title">
          {title} · <span style={{ color: 'var(--text-faint)' }}>exercises</span>
        </div>
        <div className="exercises-progress">
          <div className="exercises-progress-track">
            <div
              className="exercises-progress-fill"
              style={{ width: `${(doneCount / exercises.length) * 100}%` }}
            />
          </div>
          <span>
            {doneCount} / {exercises.length} worked
          </span>
        </div>
      </div>

      <div className="exercises-picker">
        {exercises.map((e, i) => (
          <button
            key={e.id}
            className={`exercise-chip exercise-chip-${progress[e.id] ?? 'unseen'}${
              i === index ? ' active' : ''
            }`}
            onClick={() => setIndex(i)}
          >
            {e.id}
          </button>
        ))}
      </div>

      <ExerciseCard
        ex={current}
        status={progress[current.id] ?? 'unseen'}
        onStatus={(s) => setStatus(current.id, s)}
      />

      <div className="btn-row exercises-nav">
        <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Previous
        </button>
        <button
          className="btn"
          disabled={index >= exercises.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

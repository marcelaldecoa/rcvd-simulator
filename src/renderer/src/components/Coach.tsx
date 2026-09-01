/**
 * The post-session coach panel.
 *
 * This is the only control in the app that sends anything off the machine, and
 * the interface is built to make that obvious rather than smooth. It is off
 * until the user supplies their own key; it runs once per press; and the exact
 * payload can be read in full before pressing, because "we only send derived
 * data" is a claim the user should be able to check rather than take.
 *
 * The key is written to the main process and never read back. The UI only ever
 * learns WHETHER one is set, which is all it needs and avoids the key sitting
 * in a renderer that might be screen-shared or screenshotted.
 */

import { useCallback, useEffect, useState } from 'react'
import { Panel } from './ui'
import type { DebriefBrief } from '@telemetry/coach.js'

interface CoachStatus {
  ready: boolean
  detail: string
  hasKey: boolean
}

interface CoachResult {
  ok: boolean
  text: string
  error?: string
  model?: string
  usage?: { input: number; output: number }
}

interface CoachBridge {
  coachStatus(): Promise<CoachStatus>
  setCoachKey(key: string): Promise<CoachStatus>
  coachDebrief(req: { brief: DebriefBrief; question?: string }): Promise<CoachResult>
}

const coachBridge = (): CoachBridge | null => {
  const w = window as unknown as { rcvd?: Partial<CoachBridge> }
  return w.rcvd?.coachStatus ? (w.rcvd as CoachBridge) : null
}

/**
 * Paragraphs and simple lists.
 *
 * Not a markdown renderer: the answer is prose with the occasional bullet, and
 * pulling in a parser to bold the odd word would be more machinery than the
 * job needs.
 */
function Prose({ text }: { text: string }): React.JSX.Element {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((para, i) => (
          <p key={i} className="coach-para">
            {para.trim()}
          </p>
        ))}
    </>
  )
}

export function Coach({ brief }: { brief: DebriefBrief | null }): React.JSX.Element | null {
  const api = coachBridge()
  const [status, setStatus] = useState<CoachStatus | null>(null)
  const [key, setKey] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<CoachResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPayload, setShowPayload] = useState(false)

  useEffect(() => {
    if (!api) return
    void api.coachStatus().then(setStatus)
  }, [api])

  const saveKey = useCallback(async () => {
    if (!api) return
    setStatus(await api.setCoachKey(key))
    setKey('')
  }, [api, key])

  const run = useCallback(async () => {
    if (!api || !brief) return
    setBusy(true)
    setResult(null)
    try {
      setResult(await api.coachDebrief({ brief, question: question.trim() || undefined }))
    } finally {
      setBusy(false)
    }
  }, [api, brief, question])

  if (!api) return null

  return (
    <Panel
      title="Debrief"
      reference="post-session"
      note={
        <>
          <strong>This is the only feature here that leaves your machine.</strong> It sends the
          derived summary below — never raw telemetry — to Anthropic&rsquo;s API, one call per
          press, billed to your own key. Everything else in this app runs locally.
        </>
      }
    >
      {!status?.hasKey ? (
        <>
          <div className="coach-note">{status?.detail ?? 'checking…'}</div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <input
              className="coach-input"
              type="password"
              placeholder="sk-ant-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              spellCheck={false}
            />
            <button className="btn" disabled={!key.trim()} onClick={() => void saveKey()}>
              Save key
            </button>
          </div>
          <div className="coach-note" style={{ marginTop: 8 }}>
            Stored in the app&rsquo;s settings file on this machine, in plain text — the same as
            any other setting, and readable by anything that can read your files. It is never
            sent back to this page once saved.
          </div>
        </>
      ) : (
        <>
          <div className="btn-row">
            <input
              className="coach-input"
              placeholder="Optional: something specific to ask about"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn" disabled={!brief || busy} onClick={() => void run()}>
              {busy ? 'Thinking…' : 'Ask for a debrief'}
            </button>
            <button className="btn" onClick={() => setShowPayload((v) => !v)}>
              {showPayload ? 'Hide' : 'Show'} what is sent
            </button>
            <button
              className="btn"
              onClick={() => {
                void api.setCoachKey('').then(setStatus)
                setResult(null)
              }}
            >
              Forget key
            </button>
          </div>

          {!brief && (
            <div className="coach-note" style={{ marginTop: 8 }}>
              Load a session first — there is nothing to debrief yet.
            </div>
          )}

          {showPayload && brief && (
            <pre className="coach-payload">{JSON.stringify(brief, null, 2)}</pre>
          )}

          {result && !result.ok && (
            <div className="coach-note coach-error" style={{ marginTop: 10 }}>
              {result.error}
            </div>
          )}

          {result?.ok && (
            <div className="coach-answer">
              <Prose text={result.text} />
              <div className="coach-note">
                {result.model}
                {result.usage &&
                  ` · ${result.usage.input.toLocaleString()} in, ${result.usage.output.toLocaleString()} out`}
                . Advice from a language model reading numbers — it has not driven your car, and
                the chapters it names are the place to check whether it is right.
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/**
 * The post-session coach: the one place in this app that talks to the network.
 *
 * Worth stating plainly, because it is the only feature here with an outside
 * consequence: calling this SENDS A DESCRIPTION OF YOUR SESSION TO ANTHROPIC'S
 * API, billed to the key you supply. Everything else in the app runs entirely
 * on your machine.
 *
 * So the design is deliberately grudging:
 *
 *   - It is off until the user enters their own key. No key, no call, and the
 *     UI says so rather than failing at request time.
 *   - It runs only when asked. There is no polling, no background refresh, no
 *     "helpfully" debriefing on session end.
 *   - It sends the derived brief from telemetry/coach.ts and nothing else --
 *     never raw samples -- and that brief is small enough for a person to read
 *     in full before pressing the button, which the UI offers.
 *
 * `fetch` rather than the Anthropic SDK: one POST does not justify a dependency
 * in the main process, and keeping it visible here makes the request easy to
 * audit.
 */

import { COACH_SYSTEM, briefToPrompt, type DebriefBrief } from '../telemetry/coach.js'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-opus-5'
/** Long enough for a real debrief, short enough to bound a surprise bill. */
const MAX_TOKENS = 1400
const TIMEOUT_MS = 90_000

export interface CoachRequest {
  brief: DebriefBrief
  model?: string
  /** A question from the driver, appended to the standard debrief request. */
  question?: string
}

export interface CoachResult {
  ok: boolean
  text: string
  /** Set when the call failed, in words a user can act on. */
  error?: string
  model?: string
  usage?: { input: number; output: number }
}

/**
 * Turn whatever the API failed with into something worth reading.
 *
 * The status codes here are the ones a user can actually do something about,
 * and each gets the action rather than the code.
 */
function explain(status: number, body: string): string {
  switch (status) {
    case 401:
      return 'The API key was rejected. Check it in the coach panel — keys begin "sk-ant-".'
    case 403:
      return 'The API key is not permitted to use this model.'
    case 404:
      return 'That model name was not found. Clear the model override to use the default.'
    case 429:
      return 'Rate limited by the API. Wait a moment and try again.'
    case 529:
      return 'The API is overloaded. Try again shortly.'
    default:
      if (status >= 500) return `The API returned a server error (${status}). Try again shortly.`
      return `The API rejected the request (${status}): ${body.slice(0, 300)}`
  }
}

export class CoachService {
  constructor(private getKey: () => string | undefined) {}

  /** Whether a debrief can be requested at all. */
  available(): { ready: boolean; detail: string } {
    const key = this.getKey()
    if (!key) {
      return {
        ready: false,
        detail:
          'No API key set. The coach is the only part of this app that sends anything off your machine, so it stays off until you enter your own key.'
      }
    }
    if (!key.startsWith('sk-ant-')) {
      return { ready: false, detail: 'That does not look like an Anthropic API key (they begin "sk-ant-").' }
    }
    return { ready: true, detail: 'Ready. Each debrief is one API call, billed to your key.' }
  }

  async debrief(req: CoachRequest): Promise<CoachResult> {
    const key = this.getKey()
    const state = this.available()
    if (!key || !state.ready) return { ok: false, text: '', error: state.detail }

    const model = req.model?.trim() || DEFAULT_MODEL
    const prompt = req.question
      ? `${briefToPrompt(req.brief)}\n\nThe driver also asks: ${req.question}`
      : briefToPrompt(req.brief)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': API_VERSION
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: COACH_SYSTEM,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        return { ok: false, text: '', error: explain(res.status, await res.text().catch(() => '')) }
      }

      const json = (await res.json()) as {
        content?: { type: string; text?: string }[]
        usage?: { input_tokens?: number; output_tokens?: number }
        model?: string
      }
      const text = (json.content ?? [])
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text as string)
        .join('\n')

      return {
        ok: true,
        text,
        model: json.model ?? model,
        usage: {
          input: json.usage?.input_tokens ?? 0,
          output: json.usage?.output_tokens ?? 0
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false, text: '', error: `The request timed out after ${TIMEOUT_MS / 1000} s.` }
      }
      return {
        ok: false,
        text: '',
        error: `Could not reach the API (${e instanceof Error ? e.message : String(e)}). Check your connection.`
      }
    } finally {
      clearTimeout(timer)
    }
  }
}

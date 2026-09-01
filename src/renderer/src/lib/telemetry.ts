/**
 * The renderer's side of the telemetry bridge.
 *
 * Extracted so the telemetry lab and the dashboard cannot disagree about the
 * IPC contract. Two hand-maintained copies of the same interface drift the
 * first time a channel is added, and TypeScript will not notice because each
 * copy is internally consistent -- it just silently describes a preload that no
 * longer exists.
 */

import { useCallback, useEffect, useState } from 'react'
import type { TelemetrySample } from '@telemetry/types.js'

export interface OverlayConfig {
  enabled: boolean
  x: number | null
  y: number | null
  width: number
  height: number
  textScale: number
  opacity: number
  locked: boolean
  showDiagram: boolean
  showBars: boolean
  showNumbers: boolean
}

export interface TelemetryState {
  status: { kind: string; connected: boolean; detail: string }
  reading: {
    balance: string
    text: string
    zone: 'under' | 'at' | 'over'
    usage: number
    usageFront: number
    usageRear: number
    provisional: boolean
    valid: boolean
    state: { alphaFront: number; alphaRear: number; beta: number; ay: number; speed: number }
  } | null
  limits: {
    front: { peakSlipAngle: number; source: string; confidence: number }
    rear: { peakSlipAngle: number; source: string; confidence: number }
  }
  integratingSideslip: boolean
  samplesSeen: number
}

export interface Bridge {
  getOverlayConfig(): Promise<OverlayConfig>
  setOverlayConfig(patch: Partial<OverlayConfig>): Promise<OverlayConfig>
  selectSource(choice: 'live' | 'synthetic' | { file: string }): Promise<TelemetryState>
  stopTelemetry(): Promise<TelemetryState>
  telemetryState(): Promise<TelemetryState>
  pickSessionFile(): Promise<string | null>
  telemetrySamples(): Promise<TelemetrySample[]>
  onTelemetry(fn: (s: TelemetryState) => void): () => void
}

/** Null in a plain browser, where there is no Electron preload. */
export const bridge = (): Bridge | null =>
  (window as unknown as { rcvd?: Partial<Bridge> }).rcvd?.getOverlayConfig
    ? (window as unknown as { rcvd: Bridge }).rcvd
    : null

export type SourceKind = 'none' | 'live' | 'synthetic' | 'file'

export interface TelemetrySourceHook {
  api: Bridge | null
  state: TelemetryState | null
  source: SourceKind
  file: string | null
  samples: TelemetrySample[]
  loading: boolean
  choose: (kind: 'live' | 'synthetic' | 'file') => Promise<void>
  stop: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Own a telemetry source and the samples it has produced.
 *
 * The samples are fetched in an effect keyed on the source rather than in the
 * click handler that picks it. That distinction cost a debugging session once
 * already: with the fetch in the handler, a source selected any other way --
 * restored on mount, changed from another page -- left every panel blank while
 * the status line cheerfully said "connected".
 */
export function useTelemetrySource(): TelemetrySourceHook {
  const api = bridge()
  const [state, setState] = useState<TelemetryState | null>(null)
  const [file, setFile] = useState<string | null>(null)
  const [samples, setSamples] = useState<TelemetrySample[]>([])
  const [loading, setLoading] = useState(false)

  // Derived, never stored. The main process owns which source is running -- it
  // restores one at startup and can be told to change by anything holding the
  // bridge -- so a copy here goes stale silently and lights up the wrong button
  // while the page shows another source's data.
  const source: SourceKind = (state?.status.kind as SourceKind) ?? 'none'

  useEffect(() => {
    if (!api) return
    void api.telemetryState().then(setState)
    return api.onTelemetry(setState)
  }, [api])

  const refresh = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      setSamples(await api.telemetrySamples())
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    if (!api || source === 'none') {
      setSamples([])
      return
    }
    void refresh()
    // A file is complete the moment it is opened. A live or synthetic source
    // ACCUMULATES, so fetching once on selection captures the empty moment
    // just after starting it and never updates -- which reads as "no data" for
    // the rest of the session while the status line says connected.
    if (source === 'file') return
    const id = setInterval(() => void refresh(), 2000)
    return () => clearInterval(id)
  }, [api, source, file, refresh])

  const choose = useCallback(
    async (kind: 'live' | 'synthetic' | 'file') => {
      if (!api) return
      if (kind === 'file') {
        const path = await api.pickSessionFile()
        if (!path) return
        setFile(path)
        setState(await api.selectSource({ file: path }))
        return
      }
      setFile(null)
      setState(await api.selectSource(kind))
    },
    [api]
  )

  const stop = useCallback(async () => {
    if (!api) return
    setFile(null)
    setState(await api.stopTelemetry())
  }, [api])

  return { api, state, source, file, samples, loading, choose, stop, refresh }
}

import { contextBridge, ipcRenderer } from 'electron'

/** The renderer's only route out of the sandbox. Deliberately tiny. */
const api = {
  listDocs: (): Promise<string[]> => ipcRenderer.invoke('docs:list'),
  readDoc: (name: string): Promise<string> => ipcRenderer.invoke('docs:read', name),

  // --- telemetry and the overlay ------------------------------------------
  getOverlayConfig: (): Promise<unknown> => ipcRenderer.invoke('overlay:config:get'),
  setOverlayConfig: (patch: unknown): Promise<unknown> =>
    ipcRenderer.invoke('overlay:config:set', patch),
  /** Choose a source: 'live', 'synthetic', or { file } for a .ibt. */
  selectSource: (choice: unknown): Promise<unknown> =>
    ipcRenderer.invoke('telemetry:select', choice),
  stopTelemetry: (): Promise<unknown> => ipcRenderer.invoke('telemetry:stop'),
  telemetryState: (): Promise<unknown> => ipcRenderer.invoke('telemetry:state'),
  /** Open a file picker for a .ibt session file. Returns the chosen path. */
  pickSessionFile: (): Promise<string | null> => ipcRenderer.invoke('telemetry:pick'),
  /** Session samples, for the post-session analysis. */
  telemetrySamples: (): Promise<unknown[]> => ipcRenderer.invoke('telemetry:samples'),

  coachStatus: (): Promise<unknown> => ipcRenderer.invoke('coach:status'),
  setCoachKey: (key: string): Promise<unknown> => ipcRenderer.invoke('coach:setKey', key),
  coachDebrief: (req: unknown): Promise<unknown> => ipcRenderer.invoke('coach:debrief', req),
  /** Throttled state pushes, so the UI does not re-render at 60 Hz. */
  onTelemetry: (fn: (state: unknown) => void): (() => void) => {
    const handler = (_e: unknown, state: unknown): void => fn(state)
    ipcRenderer.on('telemetry:state', handler)
    return () => ipcRenderer.removeListener('telemetry:state', handler)
  }
}

contextBridge.exposeInMainWorld('rcvd', api)

export type RcvdApi = typeof api

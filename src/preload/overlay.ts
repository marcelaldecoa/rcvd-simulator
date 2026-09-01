/**
 * The overlay window's preload.
 *
 * Deliberately even smaller than the main window's: the overlay only ever
 * receives. It has no reason to read a file, invoke a handler or send anything
 * back, so it is given no way to. A window that floats over a game and cannot
 * be clicked is not a place to put capability.
 */

import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onConfig: (fn: (c: unknown) => void): void => {
    ipcRenderer.on('overlay:config', (_e, c) => fn(c))
  },
  onReading: (fn: (r: unknown) => void): void => {
    ipcRenderer.on('overlay:reading', (_e, r) => fn(r))
  },
  onStatus: (fn: (s: unknown) => void): void => {
    ipcRenderer.on('overlay:status', (_e, s) => fn(s))
  }
}

contextBridge.exposeInMainWorld('rcvdOverlay', api)

export type RcvdOverlayApi = typeof api

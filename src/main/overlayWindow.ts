/**
 * The overlay window.
 *
 * A second BrowserWindow that sits over iRacing: transparent, frameless,
 * always on top, and click-through so it can never steal an input from the
 * game. Everything the driver can change -- position, size, text scale and
 * transparency -- lands here.
 *
 * One constraint the code cannot work around and the user has to know about:
 * a DirectX application running in TRUE EXCLUSIVE FULLSCREEN owns the display
 * and nothing composites on top of it. iRacing must be in windowed or borderless
 * mode for any overlay to appear. That is not a limitation of this
 * implementation; it applies to every overlay ever written.
 */

import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { constrainToDisplays, type OverlayConfig } from './overlayConfig.js'

export interface OverlayHost {
  window(): BrowserWindow | null
  apply(config: OverlayConfig): void
  send(channel: string, payload: unknown): void
  close(): void
}

/**
 * Create or update the overlay window to match a config.
 *
 * Deliberately idempotent: the caller hands it the whole config every time
 * anything changes and this decides what actually needs doing. That is simpler
 * to reason about than a set of individual setters, and it means the window can
 * be rebuilt from a config file with no special "first run" path.
 */
export function createOverlayHost(preloadPath: string, rendererUrl?: string): OverlayHost {
  let win: BrowserWindow | null = null

  const displays = (): { x: number; y: number; width: number; height: number }[] =>
    screen.getAllDisplays().map((d) => ({
      x: d.workArea.x,
      y: d.workArea.y,
      width: d.workArea.width,
      height: d.workArea.height
    }))

  const build = (config: OverlayConfig): BrowserWindow => {
    const pos = constrainToDisplays(config, displays())
    const w = new BrowserWindow({
      width: config.width,
      height: config.height,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      // Above ordinary always-on-top windows, so another utility does not
      // cover it. 'screen-saver' is the highest level that still lets system
      // dialogs through.
      alwaysOnTop: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        // The overlay is doing 60 Hz canvas work; letting it throttle when the
        // game has focus would make it stutter exactly when it is being used.
        backgroundThrottling: false
      }
    })
    w.setAlwaysOnTop(true, 'screen-saver')
    w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (rendererUrl) {
      void w.loadURL(`${rendererUrl}overlay.html`)
    } else {
      void w.loadFile(join(import.meta.dirname, '../renderer/overlay.html'))
    }
    w.once('ready-to-show', () => w.showInactive())
    w.on('closed', () => {
      win = null
    })
    return w
  }

  return {
    window: () => win,

    apply(config: OverlayConfig): void {
      if (!config.enabled) {
        if (win && !win.isDestroyed()) win.close()
        win = null
        return
      }
      if (!win || win.isDestroyed()) win = build(config)

      const pos = constrainToDisplays(config, displays())
      win.setBounds({ x: pos.x, y: pos.y, width: config.width, height: config.height })
      win.setOpacity(config.opacity)

      // Locked means the mouse passes straight through to the game. `forward`
      // keeps move events flowing so the overlay can still show a hover state
      // while remaining un-clickable.
      win.setIgnoreMouseEvents(config.locked, { forward: true })
      win.setResizable(!config.locked)
      win.setFocusable(!config.locked)

      // The renderer needs the config too, for text scale and which panels to
      // draw -- those are its business, not the window's.
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => win?.webContents.send('overlay:config', config))
      } else {
        win.webContents.send('overlay:config', config)
      }
    },

    send(channel: string, payload: unknown): void {
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    },

    close(): void {
      if (win && !win.isDestroyed()) win.close()
      win = null
    }
  }
}

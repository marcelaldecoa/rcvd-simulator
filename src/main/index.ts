import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { docsDir, listDocs, readDocFile } from './docs.js'
import { SettingsStore } from './settings.js'
import { applyOverlayConfig, type OverlayConfig } from './overlayConfig.js'
import { createOverlayHost, type OverlayHost } from './overlayWindow.js'
import { TelemetryService, type SourceChoice } from './telemetryService.js'
import type { OverlayReading } from '../telemetry/state.js'

const resolveDocsDir = (): string =>
  docsDir({
    packaged: app.isPackaged,
    mainDir: import.meta.dirname,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath
  })

let mainWindow: BrowserWindow | null = null
let overlay: OverlayHost | null = null
let settings: SettingsStore | null = null
const telemetry = new TelemetryService()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1680,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0d1117',
    title: 'RCVD Simulator',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow = win

  win.on('ready-to-show', () => win.show())
  win.on('closed', () => {
    mainWindow = null
    // The overlay is a window too, so leaving it open would keep the app alive
    // with nothing the user can interact with -- and on Windows, no taskbar
    // entry to find it by, since the overlay sets skipTaskbar. Closing the main
    // window means quitting.
    overlay?.close()
  })

  // Keep external links out of the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

/**
 * A reading is produced sixty times a second. The overlay wants every one of
 * them; the settings UI in the main window does not, and re-rendering React at
 * 60 Hz to move a status line would be a waste of the machine.
 */
function wireTelemetry(): void {
  telemetry.subscribe((reading: OverlayReading) => {
    overlay?.send('overlay:reading', toOverlayView(reading))

    if (mainWindow && !mainWindow.isDestroyed() && telemetry.shouldBroadcast(Date.now(), 10)) {
      mainWindow.webContents.send('telemetry:state', telemetry.state())
    }
  })
}

/** The subset the overlay actually draws -- sent as a flat object, not a class. */
function toOverlayView(r: OverlayReading): Record<string, unknown> {
  return {
    balance: r.balance,
    text: r.text,
    zone: r.zone,
    usage: r.usage,
    usageFront: r.usageFront,
    usageRear: r.usageRear,
    limitingAxle: r.limitingAxle,
    provisional: r.provisional,
    alphaFront: r.state.alphaFront,
    alphaRear: r.state.alphaRear,
    beta: r.state.beta,
    ay: r.state.ay,
    speed: r.state.speed,
    valid: r.valid
  }
}

function pushOverlayStatus(): void {
  const s = telemetry.state()
  overlay?.send('overlay:status', { connected: s.status.connected, detail: s.status.detail })
}

app.whenReady().then(async () => {
  settings = new SettingsStore(SettingsStore.pathFor(app.getPath('userData')))
  await settings.load()

  overlay = createOverlayHost(
    join(import.meta.dirname, '../preload/overlay.mjs'),
    process.env.ELECTRON_RENDERER_URL ? `${process.env.ELECTRON_RENDERER_URL}/` : undefined
  )
  overlay.apply(settings.get().overlay)
  wireTelemetry()

  ipcMain.handle('docs:list', () => listDocs(resolveDocsDir()))
  ipcMain.handle('docs:read', (_e, name: string) => readDocFile(resolveDocsDir(), name))

  // --- overlay configuration ------------------------------------------------
  ipcMain.handle('overlay:config:get', () => settings?.get().overlay)
  ipcMain.handle('overlay:config:set', (_e, patch: Partial<OverlayConfig>) => {
    if (!settings) return null
    const next = applyOverlayConfig(settings.get().overlay, patch ?? {})
    settings.update({ overlay: next })
    overlay?.apply(next)
    pushOverlayStatus()
    return next
  })

  // --- telemetry ------------------------------------------------------------
  ipcMain.handle('telemetry:select', async (_e, choice: SourceChoice) => {
    await telemetry.select(choice)
    if (typeof choice === 'object' && 'file' in choice) {
      settings?.update({ lastSessionFile: choice.file })
    }
    pushOverlayStatus()
    return telemetry.state()
  })
  ipcMain.handle('telemetry:stop', async () => {
    await telemetry.stop()
    pushOverlayStatus()
    return telemetry.state()
  })
  ipcMain.handle('telemetry:state', () => telemetry.state())
  ipcMain.handle('telemetry:samples', () => telemetry.samples())
  ipcMain.handle('telemetry:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open an iRacing telemetry file',
      defaultPath: settings?.get().lastSessionFile,
      filters: [{ name: 'iRacing telemetry', extensions: ['ibt'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  overlay?.close()
  void telemetry.stop()
  void settings?.save()
})

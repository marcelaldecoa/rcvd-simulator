import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { docsDir, listDocs, readDocFile } from './docs.js'

const resolveDocsDir = (): string =>
  docsDir({
    packaged: app.isPackaged,
    mainDir: import.meta.dirname,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath
  })

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

  win.on('ready-to-show', () => win.show())

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

app.whenReady().then(() => {
  ipcMain.handle('docs:list', () => listDocs(resolveDocsDir()))
  ipcMain.handle('docs:read', (_e, name: string) => readDocFile(resolveDocsDir(), name))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

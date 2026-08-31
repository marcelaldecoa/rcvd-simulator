import { contextBridge, ipcRenderer } from 'electron'

/** The renderer's only route to the filesystem. Deliberately tiny. */
const api = {
  listDocs: (): Promise<string[]> => ipcRenderer.invoke('docs:list'),
  readDoc: (name: string): Promise<string> => ipcRenderer.invoke('docs:read', name)
}

contextBridge.exposeInMainWorld('rcvd', api)

export type RcvdApi = typeof api

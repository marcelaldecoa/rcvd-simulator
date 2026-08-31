/**
 * Access to the course notes.
 *
 * In the Electron app this goes through the preload bridge. In the browser
 * dev server (`npm run dev:web`) the docs folder is served statically, which
 * lets the renderer be developed without launching Electron.
 */

export function readDoc(file: string): Promise<string> {
  if (typeof window !== 'undefined' && window.rcvd) return window.rcvd.readDoc(file)
  return fetch(`/${file}`).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.text()
  })
}

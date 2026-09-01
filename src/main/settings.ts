/**
 * Persisted settings, in one small JSON file under the user data directory.
 *
 * Deliberately not a dependency: the whole need is "read a small object at
 * start, write it when it changes", and the interesting part -- making sure a
 * corrupt or hand-edited file cannot produce an unusable overlay -- lives in
 * `overlayConfig.ts` where it can be tested without touching a disk.
 *
 * Writes are debounced because the settings change on every drag of a slider,
 * and writing the file sixty times a second while somebody adjusts opacity
 * would be a poor use of an SSD.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { normaliseOverlayConfig, type OverlayConfig } from './overlayConfig.js'

export interface Settings {
  overlay: OverlayConfig
  /** Last .ibt file opened, offered as the default next time. */
  lastSessionFile?: string
  /** Steering ratio to use when the sim does not publish one. */
  steeringRatio?: number
}

export class SettingsStore {
  private data: Settings
  private pending: ReturnType<typeof setTimeout> | null = null

  constructor(private path: string) {
    this.data = { overlay: normaliseOverlayConfig(undefined) }
  }

  get(): Settings {
    return this.data
  }

  async load(): Promise<Settings> {
    try {
      const raw = await readFile(this.path, 'utf8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      this.data = {
        overlay: normaliseOverlayConfig(parsed.overlay),
        lastSessionFile:
          typeof parsed.lastSessionFile === 'string' ? parsed.lastSessionFile : undefined,
        steeringRatio:
          typeof parsed.steeringRatio === 'number' && Number.isFinite(parsed.steeringRatio)
            ? parsed.steeringRatio
            : undefined
      }
    } catch {
      // No file, unreadable file, or invalid JSON. All three mean the same
      // thing to a user -- start from defaults -- and none is worth an error.
      this.data = { overlay: normaliseOverlayConfig(undefined) }
    }
    return this.data
  }

  update(patch: Partial<Settings>): Settings {
    this.data = {
      ...this.data,
      ...patch,
      overlay: patch.overlay ? normaliseOverlayConfig(patch.overlay) : this.data.overlay
    }
    this.scheduleSave()
    return this.data
  }

  private scheduleSave(): void {
    if (this.pending) clearTimeout(this.pending)
    this.pending = setTimeout(() => void this.save(), 400)
  }

  async save(): Promise<void> {
    this.pending = null
    try {
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(this.path, JSON.stringify(this.data, null, 2), 'utf8')
    } catch {
      // A settings file that cannot be written is a nuisance, not a failure.
      // The app keeps working with the in-memory copy.
    }
  }

  static pathFor(userDataDir: string): string {
    return join(userDataDir, 'settings.json')
  }
}

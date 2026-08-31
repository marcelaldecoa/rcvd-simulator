import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'

/** A plain markdown filename, no directory separators and no traversal. */
const DOC_NAME = /^[a-z0-9][a-z0-9-]*\.md$/i

export function isSafeDocName(name: string): boolean {
  return DOC_NAME.test(name)
}

export interface DocsDirOptions {
  packaged: boolean
  /** Directory of the compiled main bundle (out/main). */
  mainDir?: string
  /** Electron's app path. Note this is the ENTRY SCRIPT's directory, which is
   *  not the project root when Electron is launched with a script argument --
   *  which is why mainDir is tried first. */
  appPath: string
  resourcesPath?: string
}

/**
 * The course notes live in the repo's docs/ folder in development and ship as
 * an extra resource in a packaged build.
 *
 * Resolution order, most reliable first:
 *   1. resources/docs, in a packaged build
 *   2. two levels up from the compiled main bundle -- stable no matter how
 *      Electron was launched
 *   3. the app path
 */
export function docsDir(opts: DocsDirOptions): string {
  const packaged = join(opts.resourcesPath ?? '', 'docs')
  if (opts.packaged && existsSync(packaged)) return packaged

  if (opts.mainDir) {
    const fromMain = join(opts.mainDir, '..', '..', 'docs')
    if (existsSync(fromMain)) return fromMain
  }
  return join(opts.appPath, 'docs')
}

export async function listDocs(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const files = await readdir(dir)
  return files.filter((f) => f.endsWith('.md')).sort()
}

export async function readDocFile(dir: string, name: string): Promise<string> {
  if (!isSafeDocName(name)) {
    throw new Error(`Refusing to read "${name}": not a docs filename`)
  }
  return readFile(join(dir, name), 'utf-8')
}

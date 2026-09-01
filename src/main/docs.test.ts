/**
 * The docs bridge is the renderer's only route to the filesystem, so its
 * filename check is a real boundary. These tests pin it.
 */

import { describe, expect, it } from 'vitest'
import { join, resolve } from 'node:path'
import { docsDir, isSafeDocName, listDocs, readDocFile } from './docs.js'

const REPO = resolve(import.meta.dirname, '../..')
const DOCS = join(REPO, 'docs')

describe('doc filename validation', () => {
  it('accepts the course notes', () => {
    expect(isSafeDocName('ch02-tire-behavior.md')).toBe(true)
    expect(isSafeDocName('00-course-overview.md')).toBe(true)
  })

  it('rejects path traversal', () => {
    expect(isSafeDocName('../package.json')).toBe(false)
    expect(isSafeDocName('../../secrets.md')).toBe(false)
    expect(isSafeDocName('..\\..\\windows\\system32\\config.md')).toBe(false)
    expect(isSafeDocName('/etc/passwd')).toBe(false)
    expect(isSafeDocName('C:\\Users\\me\\notes.md')).toBe(false)
  })

  it('rejects subdirectories and non-markdown', () => {
    expect(isSafeDocName('sub/ch02.md')).toBe(false)
    expect(isSafeDocName('ch02.md.exe')).toBe(false)
    expect(isSafeDocName('ch02.txt')).toBe(false)
    expect(isSafeDocName('.env')).toBe(false)
    expect(isSafeDocName('')).toBe(false)
  })

  it('refuses to read a rejected name', async () => {
    await expect(readDocFile(DOCS, '../package.json')).rejects.toThrow(/Refusing to read/)
  })
})

describe('docs directory resolution', () => {
  const MAIN = join(REPO, 'out', 'main')

  it('uses the app path in development', () => {
    expect(docsDir({ packaged: false, appPath: REPO })).toBe(DOCS)
  })

  it('falls back to the app path when the packaged resource is missing', () => {
    expect(
      docsDir({ packaged: true, appPath: REPO, resourcesPath: join(REPO, 'nope') })
    ).toBe(DOCS)
  })

  it('resolves from the main bundle when the app path is wrong', () => {
    // Electron sets app path to the ENTRY SCRIPT's directory, so launching via
    // `electron scripts/smoke.mjs` makes appPath .../scripts. Resolving from
    // the compiled main bundle instead keeps docs findable either way.
    const resolved = docsDir({
      packaged: false,
      mainDir: MAIN,
      appPath: join(REPO, 'scripts')
    })
    expect(resolved).toContain('docs')
    expect(resolved).not.toContain('scripts')
  })

  it('prefers the packaged resource when it exists', () => {
    expect(
      docsDir({ packaged: true, mainDir: MAIN, appPath: REPO, resourcesPath: REPO })
    ).toBe(DOCS)
  })
})

describe('reading the real course notes', () => {
  it('lists the overview, all 23 chapters and the glossary', async () => {
    // Asserted by content rather than a count, so adding a document does not
    // fail a test that was not about the new document.
    const files = await listDocs(DOCS)
    expect(files[0]).toBe('00-course-overview.md')
    expect(files).toContain('glossary.md')
    expect(files.filter((f) => /^ch\d\d-/.test(f))).toHaveLength(23)
    expect(files.every((f) => f.endsWith('.md'))).toBe(true)
  })

  it('returns an empty list rather than throwing on a missing folder', async () => {
    expect(await listDocs(join(REPO, 'does-not-exist'))).toEqual([])
  })

  it('reads a chapter', async () => {
    const text = await readDocFile(DOCS, 'ch06-transient-stability-and-control.md')
    expect(text).toContain('Transient Stability and Control')
    expect(text).toContain('$$')
  })
})

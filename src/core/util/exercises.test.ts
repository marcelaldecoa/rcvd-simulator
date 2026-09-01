/**
 * Exercise parsing is checked against the real course notes, not fixtures.
 * The whole point is that it survives the actual documents; a fixture that I
 * wrote to match my own parser would prove nothing.
 */

import { describe, expect, it } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseExercises } from './exercises.js'

const DOCS = resolve(import.meta.dirname, '../../../docs')

const load = (name: string): Promise<string> => readFile(join(DOCS, name), 'utf-8')

describe('parsing the course exercises', () => {
  it('finds all six Chapter 2 exercises, each with a solution', async () => {
    const ex = parseExercises(await load('ch02-tire-behavior.md'))
    expect(ex).toHaveLength(6)
    expect(ex.map((e) => e.id)).toEqual(['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'])
    expect(ex.every((e) => e.solution && e.solution.length > 20)).toBe(true)
  })

  it('keeps the question and its solution apart', async () => {
    const ex = parseExercises(await load('ch02-tire-behavior.md'))
    const first = ex[0]
    // The question states the parameters; the solution states the answer.
    expect(first.question).toContain('1600')
    expect(first.question).not.toContain('2698')
    expect(first.solution).toContain('2698')
  })

  it('preserves the LaTeX in both', async () => {
    const ex = parseExercises(await load('ch05-steady-state-stability-and-control.md'))
    expect(ex.some((e) => e.question.includes('$'))).toBe(true)
    expect(ex.some((e) => (e.solution ?? '').includes('$$'))).toBe(true)
  })

  it('parses every chapter, and pairs every exercise with a solution', async () => {
    const files = (await readdir(DOCS)).filter((f) => f.startsWith('ch') && f.endsWith('.md'))
    expect(files).toHaveLength(23)

    let total = 0
    for (const f of files) {
      const ex = parseExercises(await load(f))
      expect(ex.length, `${f} has no exercises`).toBeGreaterThan(0)
      const orphans = ex.filter((e) => !e.solution).map((e) => e.id)
      expect(orphans, `${f} has unmatched exercises`).toEqual([])
      // Ids must belong to the chapter the file is for.
      const chapter = Number(f.slice(2, 4))
      expect(ex.every((e) => e.chapter === chapter), `${f} id mismatch`).toBe(true)
      total += ex.length
    }
    // 23 chapters, 5-8 exercises each per the course overview.
    expect(total).toBeGreaterThan(120)
  })

  it('returns nothing for a document with no exercise section', async () => {
    expect(parseExercises(await load('00-course-overview.md'))).toEqual([])
  })

  it('does not mistake body text for an exercise', () => {
    const md = [
      '# Chapter 9',
      '',
      'Section 2.1 discusses **9.9** things, and mentions **1.5** g.',
      '',
      '## Exercises',
      '',
      '**9.1** A real question.',
      '',
      '## Solutions',
      '',
      '**9.1** A real answer.'
    ].join('\n')
    const ex = parseExercises(md)
    expect(ex).toHaveLength(1)
    expect(ex[0].id).toBe('9.1')
    expect(ex[0].question).toBe('A real question.')
    expect(ex[0].solution).toBe('A real answer.')
  })
})

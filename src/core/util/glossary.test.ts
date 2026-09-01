/**
 * Glossary parsing, checked against the real docs/glossary.md rather than a
 * fixture -- the same reasoning as the exercise parser. A fixture written to
 * match my own parser would prove nothing.
 */

import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fold, parseGlossary, searchGlossary } from './glossary.js'

const DOCS = resolve(import.meta.dirname, '../../../docs')
const source = await readFile(join(DOCS, 'glossary.md'), 'utf-8')
const terms = parseGlossary(source)

describe('parsing the glossary', () => {
  it('finds a substantial number of terms', () => {
    expect(terms.length).toBeGreaterThan(150)
  })

  it('gives every term both languages', () => {
    for (const t of terms) {
      expect(t.en, JSON.stringify(t)).toBeTruthy()
      expect(t.pt, JSON.stringify(t)).toBeTruthy()
    }
  })

  it('assigns every term to a section', () => {
    expect(terms.every((t) => t.section.length > 0)).toBe(true)
    expect(new Set(terms.map((t) => t.section)).size).toBeGreaterThanOrEqual(9)
  })

  it('never captures a header or separator row', () => {
    expect(terms.some((t) => /^english$/i.test(t.en))).toBe(false)
    expect(terms.some((t) => /^-+$/.test(t.en))).toBe(false)
  })

  it('translates the terms the course leans on hardest', () => {
    const find = (en: string): string | undefined =>
      terms.find((t) => t.en.toLowerCase() === en.toLowerCase())?.pt
    expect(find('Slip angle')).toBe('Ângulo de deriva')
    expect(find('Load transfer')).toBe('Transferência de carga')
    expect(find('Anti-roll bar')).toBe('Barra estabilizadora')
    expect(find('Sprung mass')).toBe('Massa suspensa')
    expect(find('Roll centre')).toBe('Centro de rolagem')
    expect(find('Damping ratio')).toBe('Fator de amortecimento')
  })

  it('keeps tyre and vehicle sideslip apart', () => {
    const tyre = terms.find((t) => t.en === 'Slip angle')!
    const vehicle = terms.find((t) => t.en === 'Sideslip angle')!
    expect(tyre.symbol).toContain('alpha')
    expect(vehicle.symbol).toContain('beta')
    expect(vehicle.pt).not.toBe(tyre.pt)
  })

  it('carries symbols where the book uses them', () => {
    expect(terms.filter((t) => t.symbol).length).toBeGreaterThan(40)
    expect(terms.find((t) => t.en === 'Wheelbase')?.symbol).toBe('$L$')
  })

  it('flags the terms Brazilian practice keeps in English', () => {
    const kept = terms.filter((t) => t.keepsEnglish).map((t) => t.en)
    expect(kept).toContain('Setup')
    expect(kept).toContain('Grip')
    expect(kept).toContain('Downforce')
    expect(kept.length).toBeGreaterThan(15)
  })

  it('strips the flag character out of the visible note', () => {
    expect(terms.every((t) => !t.note.includes('⚑'))).toBe(true)
  })
})

describe('searching the glossary', () => {
  it('matches English', () => {
    expect(searchGlossary(terms, 'roll centre').some((t) => t.en === 'Roll centre')).toBe(true)
  })

  it('matches Portuguese', () => {
    expect(
      searchGlossary(terms, 'barra estabilizadora').some((t) => t.en === 'Anti-roll bar')
    ).toBe(true)
  })

  it('ignores accents, in both directions', () => {
    expect(searchGlossary(terms, 'angulo de deriva').length).toBeGreaterThan(0)
    expect(searchGlossary(terms, 'ÂNGULO DE DERIVA').length).toBeGreaterThan(0)
    expect(fold('Ângulo')).toBe('angulo')
    expect(fold('cambagem')).toBe('cambagem')
  })

  it('matches on symbol', () => {
    expect(searchGlossary(terms, 'TLLTD').length).toBeGreaterThan(0)
  })

  it('returns everything for an empty or whitespace query', () => {
    // A search box emits a lone space readily; it must not blank the list.
    expect(searchGlossary(terms, '')).toHaveLength(terms.length)
    expect(searchGlossary(terms, '   ')).toHaveLength(terms.length)
  })

  it('keeps the English term visible where Brazilian practice uses it', () => {
    const setup = terms.find((t) => t.en === 'Setup')!
    expect(setup.pt).toBe('Acerto')
    expect(setup.keepsEnglish).toBe(true)
  })

  it('returns nothing for a term that is not there', () => {
    expect(searchGlossary(terms, 'zzzznotaterm')).toHaveLength(0)
  })
})

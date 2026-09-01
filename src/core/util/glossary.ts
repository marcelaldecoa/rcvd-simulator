/**
 * Parsing the bilingual glossary out of docs/glossary.md.
 *
 * The glossary is authored as markdown so it reads well on its own and in the
 * Notes tab, but ~200 terms need search to be useful while studying. Rather
 * than maintain the list twice, the app parses the same file.
 */

export interface GlossaryTerm {
  /** English term. */
  en: string
  /** Brazilian Portuguese term. */
  pt: string
  /** Symbol as used in the book, or '' if none. */
  symbol: string
  /** Note or clarification. */
  note: string
  /** The section heading this term appeared under. */
  section: string
  /**
   * True when Brazilian motorsport conventionally keeps the English term.
   * Flagged in the source with a maritime flag character.
   */
  keepsEnglish: boolean
}

/** Strip markdown emphasis and inline maths delimiters for searching/display. */
function clean(cell: string): string {
  return cell
    .replace(/\*\*/g, '')
    .replace(/^\s*\|?\s*/, '')
    .replace(/\s*\|?\s*$/, '')
    .trim()
}

/**
 * Parse the glossary. Only four-column tables are taken, which skips the
 * two-column quick-reference table (a subset) and the prose sections.
 */
export function parseGlossary(markdown: string): GlossaryTerm[] {
  const out: GlossaryTerm[] = []
  let section = ''

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()

    const heading = /^##\s+(?:\d+\.\s*)?(.+)$/.exec(line)
    if (heading) {
      section = heading[1].trim()
      continue
    }

    if (!line.startsWith('|')) continue
    // Separator row, e.g. |---|---|
    if (/^\|[\s:|-]+\|$/.test(line)) continue

    const cells = line.slice(1, -1).split('|').map(clean)
    if (cells.length !== 4) continue
    // Header row
    if (/^english$/i.test(cells[0])) continue
    if (!cells[0] || !cells[1]) continue

    const note = cells[3]
    out.push({
      en: cells[0],
      pt: cells[1],
      symbol: cells[2] === '—' ? '' : cells[2],
      note: note.replace(/⚑\s*/g, '').trim(),
      section,
      keepsEnglish: note.includes('⚑')
    })
  }
  return out
}

/** Case- and accent-insensitive substring search across both languages. */
export function searchGlossary(terms: GlossaryTerm[], query: string): GlossaryTerm[] {
  // Trim before testing for emptiness: a query of only spaces must show
  // everything, not nothing.
  const q = fold(query).trim()
  if (!q) return terms
  return terms.filter((t) =>
    [t.en, t.pt, t.symbol, t.note, t.section].some((f) => fold(f).includes(q))
  )
}

/** Lowercase and strip diacritics, so "deriva" matches "Deriva" and "cambagem" matches "Cambagem". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

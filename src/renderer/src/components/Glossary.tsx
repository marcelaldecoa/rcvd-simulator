/**
 * The bilingual glossary, searchable.
 *
 * ~200 terms is past the point where scrolling a table is useful, so this
 * parses docs/glossary.md and puts a search box in front of it. Search is
 * accent-insensitive and covers both languages, so "angulo de deriva" finds
 * "Ângulo de deriva" and "slip angle" finds the same row.
 *
 * The source of truth stays the markdown file — it renders perfectly well on
 * its own and in the Notes tab, and maintaining the list twice would guarantee
 * the two drift apart.
 */

import { useEffect, useMemo, useState } from 'react'
import { parseGlossary, searchGlossary, type GlossaryTerm } from '@core/util/glossary.js'
import { readDoc } from '../lib/docs'
import { Formula } from './ui'

type Direction = 'en-pt' | 'pt-en'

/**
 * Render text that may contain inline TeX, e.g. "Bundorf; $K = D_f - D_r$" or
 * a bare symbol cell like "$W_f$, $W_r$". Used for both the symbol and the
 * note column, since the notes carry maths too.
 *
 * The inner pattern is [^$]+ rather than .+ deliberately: a greedy .+ swallows
 * the separator between two expressions and hands KaTeX one malformed blob.
 */
function Tex({ value }: { value: string }): React.JSX.Element | null {
  if (!value) return null
  if (!value.includes('$')) return <>{value}</>
  return (
    <>
      {value.split(/(\$[^$]+\$)/).map((part, i) => {
        const m = /^\$([^$]+)\$$/.exec(part)
        return m ? <Formula key={i} tex={m[1]} /> : <span key={i}>{part}</span>
      })}
    </>
  )
}

export function Glossary(): React.JSX.Element {
  const [terms, setTerms] = useState<GlossaryTerm[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState<Direction>('en-pt')
  const [section, setSection] = useState<string>('all')

  useEffect(() => {
    let live = true
    readDoc('glossary.md')
      .then((src) => live && setTerms(parseGlossary(src)))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [])

  const sections = useMemo(
    () => (terms ? [...new Set(terms.map((t) => t.section))] : []),
    [terms]
  )

  const results = useMemo(() => {
    if (!terms) return []
    const scoped = section === 'all' ? terms : terms.filter((t) => t.section === section)
    const found = searchGlossary(scoped, query)
    return direction === 'pt-en'
      ? [...found].sort((a, b) => a.pt.localeCompare(b.pt, 'pt-BR'))
      : found
  }, [terms, query, section, direction])

  if (error) {
    return (
      <div className="notes-loading">
        Could not load <code>glossary.md</code>
        <br />
        {error}
      </div>
    )
  }
  if (!terms) return <div className="notes-loading">Loading glossary…</div>

  const first = direction === 'en-pt' ? 'English' : 'Português (BR)'
  const second = direction === 'en-pt' ? 'Português (BR)' : 'English'

  return (
    <div className="glossary">
      <div className="glossary-bar">
        <input
          className="glossary-search"
          type="search"
          placeholder="Search in either language — busque nos dois idiomas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="btn-row">
          <button
            className={`btn${direction === 'en-pt' ? ' active' : ''}`}
            onClick={() => setDirection('en-pt')}
          >
            EN → PT
          </button>
          <button
            className={`btn${direction === 'pt-en' ? ' active' : ''}`}
            onClick={() => setDirection('pt-en')}
          >
            PT → EN
          </button>
        </div>
        <select
          style={{ width: 'auto', maxWidth: 260 }}
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="all">All sections · todas as seções</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="glossary-count">
          {results.length} / {terms.length}
        </span>
      </div>

      <div className="glossary-note">
        Terms marked <span className="glossary-flag">EN</span> are conventionally kept in
        English in Brazilian motorsport, even though the Portuguese term is given. ·{' '}
        Os termos marcados com <span className="glossary-flag">EN</span> costumam ser
        usados em inglês no automobilismo brasileiro.
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <h3>No match</h3>
          <div>Nenhum resultado para “{query}”.</div>
        </div>
      ) : (
        <table className="data glossary-table">
          <thead>
            <tr>
              <th>{first}</th>
              <th>{second}</th>
              <th>Símbolo</th>
              <th>Notes · Observações</th>
            </tr>
          </thead>
          <tbody>
            {results.map((t) => (
              <tr key={`${t.section}-${t.en}`}>
                <td className="glossary-term">
                  {direction === 'en-pt' ? t.en : t.pt}
                  {t.keepsEnglish && <span className="glossary-flag">EN</span>}
                </td>
                <td className="glossary-term-2">
                  {direction === 'en-pt' ? t.pt : t.en}
                </td>
                <td className="glossary-symbol">
                  <Tex value={t.symbol} />
                </td>
                <td className="glossary-meaning">
                  <Tex value={t.note} />
                  {section === 'all' && (
                    <span className="glossary-section">{t.section.split('—')[0].trim()}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

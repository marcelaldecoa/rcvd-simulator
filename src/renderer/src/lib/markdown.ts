/**
 * Markdown + LaTeX rendering, shared by the notes viewer and the exercises.
 *
 * Order matters: the maths is pulled out into placeholders *before* markdown
 * parsing, because a markdown parser will happily eat the underscores and
 * asterisks inside a TeX expression. It goes back in as KaTeX-rendered HTML
 * afterwards.
 */

import { marked } from 'marked'
import katex from 'katex'

interface Extracted {
  text: string
  math: { tex: string; block: boolean }[]
}

const PLACEHOLDER = (i: number): string => ` MATH${i} `

function extractMath(src: string): Extracted {
  const math: { tex: string; block: boolean }[] = []
  const stash = (tex: string, block: boolean): string => {
    math.push({ tex, block })
    return PLACEHOLDER(math.length - 1)
  }

  // Fenced code first, so a $ inside a code block is left alone.
  const codeBlocks: string[] = []
  let text = src.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m)
    return ` CODE${codeBlocks.length - 1} `
  })

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => stash(tex.trim(), true))
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => stash(tex.trim(), false))
  text = text.replace(/ CODE(\d+) /g, (_m, i: string) => codeBlocks[Number(i)])
  return { text, math }
}

function restoreMath(html: string, math: Extracted['math']): string {
  return html.replace(/ MATH(\d+) /g, (_m, i: string) => {
    const item = math[Number(i)]
    if (!item) return ''
    try {
      return katex.renderToString(item.tex, {
        displayMode: item.block,
        throwOnError: false,
        output: 'html'
      })
    } catch {
      return `<code>${item.tex}</code>`
    }
  })
}

/** Render course-notes markdown to HTML with its mathematics typeset. */
export async function renderMarkdown(src: string): Promise<string> {
  const { text, math } = extractMath(src)
  const parsed = await marked.parse(text, { gfm: true, breaks: false })
  return restoreMath(parsed, math)
}

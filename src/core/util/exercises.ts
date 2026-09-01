/**
 * Pulling the exercises out of the course notes.
 *
 * The overview calls the exercises "the load-bearing part" of the course:
 * "vehicle dynamics is a subject in which the equations are easy to read and
 * hard to use." Reading them in a scrolling document is not doing them, so they
 * are parsed out and presented one at a time with the solution withheld until
 * asked for.
 *
 * The notes use a consistent shape -- a `## Exercises` section and a
 * `## Solutions` section, each with items marked `**N.M**` -- which is what
 * makes this reliable rather than a guess.
 */

export interface Exercise {
  /** The label as printed, e.g. "2.4". */
  id: string
  /** Chapter number parsed from the id. */
  chapter: number
  /** Exercise markdown, without the leading label. */
  question: string
  /** Solution markdown, or null if the notes have no matching solution. */
  solution: string | null
}

/** Split a section body into `**N.M**`-labelled items. */
function splitItems(body: string): Map<string, string> {
  const out = new Map<string, string>()
  // Capture from one bold label up to the next one, or to the end.
  const re = /\*\*(\d+\.\d+)\*\*([\s\S]*?)(?=\n\s*\*\*\d+\.\d+\*\*|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    out.set(m[1], m[2].trim())
  }
  return out
}

/** Text between a `## <heading>` and the next `## ` heading (or end / `---`). */
function section(markdown: string, heading: string): string {
  const start = markdown.search(new RegExp(`^##\\s+${heading}\\s*$`, 'm'))
  if (start < 0) return ''
  const after = markdown.slice(start)
  const nextIdx = after.slice(1).search(/^##\s+/m)
  return nextIdx < 0 ? after : after.slice(0, nextIdx + 1)
}

/**
 * Parse one chapter's markdown into exercises paired with their solutions.
 * Returns an empty array for documents that have no exercise section.
 */
export function parseExercises(markdown: string): Exercise[] {
  const questions = splitItems(section(markdown, 'Exercises'))
  const solutions = splitItems(section(markdown, 'Solutions'))

  return [...questions.entries()]
    .map(([id, question]) => ({
      id,
      chapter: Number(id.split('.')[0]),
      question,
      solution: solutions.get(id) ?? null
    }))
    .sort((a, b) => Number(a.id.split('.')[1]) - Number(b.id.split('.')[1]))
}

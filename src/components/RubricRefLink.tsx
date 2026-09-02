import { ExternalLink } from 'lucide-react'
import { LIKERT_RUBRIC_DOC_URL } from '@/lib/links'

// Persistent reference chip to the Likert rubric doc, placed at the top-right of the question
// section so the reference is next to the questions it explains. Styled as a blue chip (matching
// the Patient Panel's Show/Hide control) so "this is interactive" looks the same everywhere; on
// hover the icon drifts up-and-right — the "opens in a new tab" gesture.
function DocChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-xs transition-all hover:border-blue-500 hover:bg-blue-100 hover:text-blue-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/60 dark:hover:text-blue-200"
    >
      {children}
      <ExternalLink className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}

// The 1–5 quality-scale rubric doc — placed by the Likert scales.
export function LikertRubricLink() {
  return <DocChip href={LIKERT_RUBRIC_DOC_URL}>Rubrics</DocChip>
}

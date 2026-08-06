import { ExternalLink } from 'lucide-react'
import { RUBRIC_DOC_URL } from '@/lib/links'

// Persistent reference to the full scoring rubric, shown by the rubric section header so a
// clinician can re-check the criteria mid-session without leaving.
//
// Styled as a button rather than a muted text link: as grey text at text-xs it read as a footnote
// and invited no click. It reuses the blue chip treatment of the Patient Panel's Show/Hide control
// so "this is interactive" looks the same everywhere on the page. On hover the icon drifts
// up-and-right — the direction the "opens in a new tab" gesture implies.
export function RubricRefLink() {
  return (
    <a
      href={RUBRIC_DOC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-xs transition-all hover:border-blue-500 hover:bg-blue-100 hover:text-blue-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/60 dark:hover:text-blue-200"
    >
      Scoring rubric
      <ExternalLink className="size-3.5 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}

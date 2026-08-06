import { SECTION_IDS, scrollToSection } from '@/lib/sections'

interface Props {
  responseCount: number
}

// Treatment 1 (UI_FLAGS.taskStrip): one line under the header saying what this page is for.
//
// It exists because the landing screen's instructions are shown exactly once — storage.ts restores
// a resumed session directly into `cycle`, so a clinician who closes the tab and comes back never
// reads them again. The trailing link doubles as proof that there is something below the fold.
export function TaskStrip({ responseCount }: Props) {
  return (
    <div className="border-b bg-blue-50/60 dark:bg-blue-950/25">
      <p className="mx-auto max-w-7xl px-4 py-2.5 text-base text-blue-900 dark:text-blue-200">
        Please review the <strong>{responseCount} health summaries</strong> below, then score each
        one on the checklist. Take your time — your answers are saved as you go.{' '}
        <button
          type="button"
          onClick={() => scrollToSection(SECTION_IDS.rubric)}
          className="cursor-pointer font-semibold underline underline-offset-4 hover:text-blue-700 dark:hover:text-blue-100"
        >
          Go to the checklist
        </button>
      </p>
    </div>
  )
}

interface Props {
  responseCount: number
  // Cross-mode "go to scoring" jump supplied by App (from compare mode it must first switch
  // back to focus before scrolling, which a plain scrollToSection cannot do).
  onGoToScoring: () => void
}

// Treatment 1 (UI_FLAGS.taskStrip): the standing task definition under the header.
//
// It exists because the landing screen's instructions are shown exactly once — storage.ts restores
// a resumed session directly into `cycle`, so a clinician who closes the tab and comes back never
// reads them again. The trailing link doubles as proof that there is something below the fold.
//
// The block leads with the rater's ROLE, not the procedure (owner 2026-08-29). The clinician
// round showed raters reading the sleep panel and history first, forming their own diagnosis, and
// judging the responses against that expectation — doing the responses' job instead of grading it.
// A "don't be misled" warning would patch the symptom; the root cause was that nothing on screen
// said the follow-up already happened and accuracy is READ OFF THE RECORD, not judged. The
// definition stays on screen for the whole session, shaped as a brief (eyebrow + primary +
// demoted procedure) so it reads as the task itself rather than a dismissible tip.
export function TaskStrip({ responseCount, onGoToScoring }: Props) {
  return (
    <div className="border-b bg-blue-50/60 dark:bg-blue-950/25">
      {/* Structured as a brief, not a hint bar (owner 2026-08-29): an eyebrow naming what this
          block is, the role definition as the primary line, and the procedure demoted to a
          smaller muted line. The previous single-sentence strip read as a dismissible tip. */}
      <div className="mx-auto max-w-7xl px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700/80 dark:text-blue-300/80">
          Your task
        </p>
        <p className="mt-1 text-base font-medium leading-relaxed text-blue-950 dark:text-blue-100">
          Each patient has six years of follow-up on record. The <strong>Future risk</strong>{' '}
          panel shows what health conditions actually developed during this period. Use this
          information when rating the accuracy of each response.
        </p>
        <p className="mt-1 text-sm text-blue-900/75 dark:text-blue-200/75">
          Rate the {responseCount} health summaries using the rubric below. Your answers are
          saved automatically as you go.{' '}
          <button
            type="button"
            onClick={onGoToScoring}
            className="cursor-pointer font-semibold underline underline-offset-4 hover:text-blue-700 dark:hover:text-blue-100"
          >
            Go to scoring
          </button>
        </p>
      </div>
    </div>
  )
}

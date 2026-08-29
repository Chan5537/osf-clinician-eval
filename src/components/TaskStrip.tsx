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
// The LEAD sentence defines the rater's role, not the procedure (owner 2026-08-29). The clinician
// round showed raters reading the sleep panel and history first, forming their own diagnosis, and
// judging the responses against that expectation — doing the responses' job instead of grading it.
// A "don't be misled" warning would patch the symptom; the root cause was that nothing on screen
// said the follow-up already happened and accuracy is READ OFF THE RECORD, not judged. This
// sentence is that definition, and it stays on screen for the whole session.
export function TaskStrip({ responseCount, onGoToScoring }: Props) {
  return (
    <div className="border-b bg-blue-50/60 dark:bg-blue-950/25">
      <p className="mx-auto max-w-7xl px-4 py-2.5 text-base text-blue-900 dark:text-blue-200">
        Each patient&rsquo;s six-year follow-up is already on record — the{' '}
        <strong>Future risk</strong> panel shows what actually developed, and the accuracy
        question asks you to read each response against that record. Rate the{' '}
        <strong>{responseCount} health summaries</strong> on the rubric below; your answers are
        saved as you go.{' '}
        <button
          type="button"
          onClick={onGoToScoring}
          className="cursor-pointer font-semibold underline underline-offset-4 hover:text-blue-700 dark:hover:text-blue-100"
        >
          Go to scoring
        </button>
      </p>
    </div>
  )
}

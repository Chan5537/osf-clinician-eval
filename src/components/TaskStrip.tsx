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
    // STICKY (owner 2026-08-29): the strip is the standing definition of what scoring is aimed
    // at, so it stays pinned while the rater scrolls the letters. Solid backgrounds — the page
    // scrolls underneath, so the translucent tint it used to have would let content bleed
    // through. Compressed to one breath: heading inline, definition primary, procedure demoted
    // to the same line in a quieter voice.
    <div className="sticky top-0 z-40 border-b bg-blue-50 shadow-sm dark:bg-blue-950">
      <p className="mx-auto max-w-7xl px-4 py-2 text-sm leading-snug text-blue-950 dark:text-blue-100">
        <span className="font-bold">Your task</span>
        <span aria-hidden="true" className="mx-2 text-blue-400 dark:text-blue-600">|</span>
        Each patient has six years of follow-up on record; the <strong>Future risk</strong> panel
        shows what actually developed. Use this information when rating the accuracy of each
        response.{' '}
        <span className="text-blue-900/70 dark:text-blue-200/70">
          Rate the {responseCount} health summaries using the rubric below — answers are saved as
          you go.{' '}
          <button
            type="button"
            onClick={onGoToScoring}
            className="cursor-pointer font-semibold underline underline-offset-4 hover:text-blue-700 dark:hover:text-blue-100"
          >
            Go to scoring
          </button>
        </span>
      </p>
    </div>
  )
}

// Switches for the "does the clinician know what to do?" treatments.
//
// A clinician entering a case sees the Patient Panel, the query, and three health summaries — the
// scoring rubric starts roughly 1100px down, below the fold on a laptop, with nothing saying it is
// there. Worse, storage.ts restores a resumed session straight into `cycle`, so anyone who closes
// the tab and comes back never sees the landing instructions again.
//
// Three independent treatments address that. They are NOT mutually exclusive — flip any
// combination and compare. Editing this file hot-reloads the page, so no rebuild is needed.
export const UI_FLAGS = {
  /**
   * A slim always-present strip under the header stating the task in one line.
   * Cheapest and most explicit; the trade-off is that a fixed banner tends to be filtered out
   * after the first couple of cases.
   */
  taskStrip: true,

  /**
   * A compact fixed rail on the right edge listing the four sections, highlighting whichever is
   * on screen and jumping to it on click. Turns the page into a visible procedure and, unlike a
   * banner, stays useful because it tracks position. Hidden below the xl breakpoint, where there
   * is no room for it beside the content.
   */
  stepRail: true,

  /**
   * The sticky bottom bar states the next action and shows a progress bar instead of a bare
   * "0 of 47 items answered" counter, plus a "Go to scoring" jump that appears only while the
   * rubric is off screen. Always visible, costs no vertical space at the top.
   */
  submitBarGuide: true,
} as const

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { caseContext, futureRiskRollup, inPanel23 } from '@/lib/case-context'

interface Props {
  caseId: string
  responseCount: number
  // Cross-mode "go to scoring" jump supplied by App (from compare mode it must first switch
  // back to focus before scrolling, which a plain scrollToSection cannot do).
  onGoToScoring: () => void
}

// The pinned evaluation target (owner 2026-09-03), replacing the task strip that used to sit here.
//
// The strip that preceded it spent its line DESCRIBING where the target was ("the Future risk
// panel shows what actually developed"), while the target itself scrolled out of view as soon as
// the rater reached the responses — exactly when accuracy is being judged. Pinning the outcome
// removes the round trip: what the patient went on to develop is on screen for the whole case.
//
// It keeps the two things the old strip carried that nothing else does: a one-clause statement of
// the task (the landing instructions are shown exactly once — a resumed session lands straight in
// `cycle` and never sees them again) and the jump to the scoring section, which also proves there
// is something below the fold.
//
// Naming: the label stays "Future risk", with the same "New onset risk" tag as the panel, because
// the rubric's scoring guidance names that panel in so many words.
// How many condition names the strip shows before it collapses. A pinned bar that grows with
// the patient buys its own problem: it covers the letters it is meant to be read against. In
// the 100-patient batch the cap never bites (median 1 condition, max 3, always one risk type),
// but earlier cohorts carried patients with 22 recorded conditions, so the guard stays.
const COLLAPSE_AFTER = 4

export function FutureRiskStrip({ caseId, responseCount, onGoToScoring }: Props) {
  const ctx = caseContext(caseId)
  const inPanel = (ctx?.futureDiseaseGroundTruth ?? []).filter(inPanel23)
  const { groups } = futureRiskRollup(inPanel)
  // Keyed on caseId so moving to the next patient starts collapsed again — an expanded strip
  // left over from a three-condition case must not sit half-screen tall on the next one.
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const expanded = expandedFor === caseId
  const total = inPanel.length
  const overflows = total > COLLAPSE_AFTER
  // Budget the condition names across groups, in the rollup's own order (largest group first).
  let budget = expanded || !overflows ? Number.POSITIVE_INFINITY : COLLAPSE_AFTER

  return (
    <div className="sticky top-0 z-40 border-b bg-indigo-50 shadow-sm dark:bg-indigo-950">
      <div className="mx-auto flex max-h-[35vh] max-w-7xl flex-wrap items-baseline gap-x-4 gap-y-2 overflow-y-auto px-4 py-3 text-indigo-950 dark:text-indigo-100">
        <span className="flex shrink-0 items-baseline gap-1.5">
          <TrendingUp className="size-5 self-center text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">Future risk</span>
          <span className="rounded-full border border-indigo-300 bg-indigo-100/70 px-2.5 py-0.5 text-sm font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
            New onset risk
          </span>
        </span>

        {/* The recorded outcome itself: risk type, then the conditions inside it. Same rollup and
            the same 23-panel scoping as the panel version, so the two never disagree. */}
        {groups.length > 0 ? (
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {groups.map(({ group, conditions }) => {
              const shown = conditions.slice(0, Math.max(0, budget))
              budget -= conditions.length
              // A group whose names are all budgeted away still shows its chip: the risk TYPE is
              // the altitude the responses answer at, so it must never be the part that is cut.
              return (
              <span key={group} className="flex flex-wrap items-baseline gap-1.5">
                <span className="rounded-md bg-indigo-600 px-2.5 py-1 text-base font-semibold text-white dark:bg-indigo-500">
                  {group}
                  <span className="pl-2 text-sm font-normal tabular-nums text-white/75">
                    {conditions.length}
                  </span>
                </span>
                <span className="text-base font-medium">
                  {shown.map((n, i) => (
                    <span key={n} className="whitespace-nowrap">
                      {n}
                      {i < shown.length - 1 && (
                        <span className="px-1.5 text-indigo-400" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              </span>
              )
            })}
            {overflows && (
              <button
                type="button"
                onClick={() => setExpandedFor(expanded ? null : caseId)}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-indigo-300 bg-indigo-100/70 px-2 py-0.5 text-sm font-medium text-indigo-800 hover:bg-indigo-200/70 dark:border-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="size-3.5" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    +{total - COLLAPSE_AFTER} more <ChevronDown className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </span>
        ) : (
          <span className="text-base font-medium">
            No new-onset condition recorded in the 6-year window.
          </span>
        )}

        {/* Task + jump, demoted: one clause, quieter voice, pushed to the end of the line. */}
        <span className="ml-auto shrink-0 text-sm text-indigo-800/80 dark:text-indigo-200/80">
          Rate the {responseCount} summaries against it.{' '}
          <button
            type="button"
            onClick={onGoToScoring}
            className="cursor-pointer font-semibold underline underline-offset-4 hover:text-indigo-950 dark:hover:text-indigo-50"
          >
            Go to scoring
          </button>
        </span>
      </div>
    </div>
  )
}

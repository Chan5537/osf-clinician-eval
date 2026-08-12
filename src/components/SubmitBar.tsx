import { ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isComplete, pickCount, requiredCount } from '@/lib/reducer'
import { SECTION_IDS } from '@/lib/sections'
import { useSectionInView } from '@/lib/use-section-observer'
import { UI_FLAGS } from '@/lib/ui-flags'
import type { RubricState, DemoCase } from '@/lib/types'

interface Props {
  state: RubricState
  onSubmit: () => void
  onBack: () => void
  onSkip: () => void
  // Cross-mode "go to scoring" jump supplied by App (from compare mode it must first switch
  // back to focus before scrolling, which a plain scrollToSection cannot do).
  onGoToScoring: () => void
  canGoBack: boolean
  isLast: boolean
  // The current case — sets how many items must be answered before submit.
  demoCase: DemoCase
}

// Sticky bottom bar. Back returns to the previous case (answers are preserved per case, so
// reviewers can revise). Submit stays disabled until every required atom is answered (Yes/No/N/A);
// its label reflects whether more cases remain.
//
// Treatment 3 (UI_FLAGS.submitBarGuide) rewrites the middle section. The bar is the one element
// visible on every screen of every case, so it is the cheapest place to say what to do next:
//   • a progress bar rather than a bare "12 of 47 items answered" count — a proportion is readable
//     at a glance, where a fraction has to be divided first;
//   • a "Go to scoring" jump that appears ONLY while the rubric is off screen, so it guides a
//     clinician who is lost and gets out of the way once they are looking at the thing it points to.
export function SubmitBar({
  state,
  onSubmit,
  onBack,
  onSkip,
  onGoToScoring,
  canGoBack,
  isLast,
  demoCase,
}: Props) {
  const total = requiredCount(demoCase)
  const done = pickCount(state, demoCase)
  const complete = isComplete(state, demoCase)
  const rubricInView = useSectionInView(SECTION_IDS.rubric)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={!canGoBack}
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        {UI_FLAGS.submitBarGuide ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
            <div className="w-full max-w-xs">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-base font-medium text-foreground">
                  {/* Reads as state, not as an order: the counter and bar sit right beside it,
                      so the label only has to say what is being counted. */}
                  {complete ? 'All items answered' : 'Scoring progress'}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {done}/{total}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                aria-label="Checklist progress"
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    complete ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {!rubricInView && !complete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={onGoToScoring}
              >
                Go to scoring
                <ArrowDown className="size-4" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {complete ? (
              <span className="font-medium text-foreground">All items answered</span>
            ) : (
              <>
                {done} of {total} items answered
              </>
            )}
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* Skip lets a reviewer move on without scoring this case yet (answers persist, so they can
              come back via the dots or Back). Hidden on the last case, where Submit is the only exit. */}
          {!isLast && (
            <Button type="button" variant="ghost" size="lg" onClick={onSkip}>
              Skip
              <ChevronRight className="size-4" />
            </Button>
          )}
          <Button type="button" size="lg" disabled={!complete} onClick={onSubmit}>
            {isLast ? 'Submit & finish' : 'Submit & next'}
          </Button>
        </div>
      </div>
    </div>
  )
}

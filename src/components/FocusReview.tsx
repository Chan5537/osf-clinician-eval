import { useState } from 'react'
import { ArmBadge } from '@/components/ArmBadge'
import type { Dispatch } from 'react'
import { Check, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Markdown } from '@/components/Markdown'
import { LikertDimensions } from '@/components/LikertRubric'
import { LikertRubricLink } from '@/components/RubricRefLink'
import { AVATAR_STYLES, CARD_STYLES } from '@/components/response-colors'
import { armAnsweredCount, armRequiredCount } from '@/lib/reducer'
import { cn } from '@/lib/utils'
import type { RubricState, RubricAction, ResponseEntry } from '@/lib/types'

interface Props {
  // The present responses for THIS case (blinded A/B[/C]); arm navigation follows array length.
  responses: ResponseEntry[]
  state: RubricState
  dispatch: Dispatch<RubricAction>
  // Switch to the read-only side-by-side comparison view.
  onCompare: () => void
}

// Both panes get the same fixed height on lg+, so response and rubric scroll independently and
// the clinician reads/scores without long-distance page scrolling. Below lg the panes stack with
// natural height (inner scrollboxes inside a stacked page feel worse than plain page scroll).
// 19rem ≈ header + task strip + tab bar + submit bar + vertical gaps.
const PANE_HEIGHT = 'lg:h-[calc(100vh-19rem)] lg:min-h-[28rem]'

// Focus mode: one arm at a time. A tab bar (one tab per blinded response, with that arm's
// completion badge, plus prev/next arrows) selects the arm; below it the split view shows the
// response's markdown on the left and its 4 Likert scales on the right. All arms share the case's
// single scoring state, so switching tabs (or to compare mode) never loses answers.
export function FocusReview({ responses, state, dispatch, onCompare }: Props) {
  // Active arm is view-local: the parent remounts this component per case (<main key={i}>),
  // so each case starts back at the first arm.
  const [idx, setIdx] = useState(0)
  const r = responses[idx]
  const total = armRequiredCount()

  return (
    <section className="space-y-3">
      {/* Arm tab bar: which response is under review, and how far each one's scoring is. The
          compare entry sits beside the tabs as a blue action chip — the app's established
          "this is interactive" look (Show/Hide, doc links) — named for what it does. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Review &amp; score</h2>
          <button
            type="button"
            onClick={onCompare}
            className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-xs transition-all hover:border-blue-500 hover:bg-blue-100 hover:text-blue-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/60 dark:hover:text-blue-200"
          >
            <Columns3 className="size-4" />
            Compare side by side
          </button>
        </div>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Responses">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous response"
            disabled={idx === 0}
            onClick={() => setIdx(idx - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {responses.map((resp, i) => {
            const answered = armAnsweredCount(state, resp.label)
            const complete = answered === total
            const selected = i === idx
            return (
              <button
                key={resp.label}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setIdx(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  // Selected = dark solid, unmistakable which arm is under review.
                  selected
                    ? 'border-transparent bg-foreground font-semibold text-background shadow-sm'
                    : 'border-border text-muted-foreground hover:bg-muted/60',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                    AVATAR_STYLES[resp.label],
                  )}
                  aria-hidden="true"
                >
                  {resp.label}
                </span>
                <span className="hidden sm:inline">Response {resp.label}</span>
                <ArmBadge arm={resp.arm} />
                {complete ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      selected ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {answered}/{total}
                  </span>
                )}
              </button>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next response"
            disabled={idx === responses.length - 1}
            onClick={() => setIdx(idx + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: the response letter, full markdown (no streaming in focus mode — the clinician
            is here to score, not to watch a reveal). key resets scroll position per arm. */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9">
              <AvatarFallback className={cn('text-base font-semibold', AVATAR_STYLES[r.label])}>
                {r.label}
              </AvatarFallback>
            </Avatar>
            <span className="text-base font-semibold leading-none">Response {r.label}</span>
            <ArmBadge arm={r.arm} />
          </div>
          <Card className={cn('overflow-hidden py-0', CARD_STYLES[r.label])}>
            <div key={r.label} className={cn('overflow-y-auto p-4', PANE_HEIGHT)}>
              <Markdown>{r.markdown}</Markdown>
            </div>
          </Card>
        </div>

        {/* Right: this arm's 4 Likert scales, scrolling independently of the response. */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex h-9 items-center justify-between gap-3">
            <span className="text-base font-semibold leading-none">
              Rubric — Response {r.label}
            </span>
            <LikertRubricLink />
          </div>
          <div
            key={r.label}
            className={cn('overflow-y-auto rounded-xl border bg-card p-3', PANE_HEIGHT)}
          >
            <LikertDimensions label={r.label} state={state} dispatch={dispatch} />
          </div>
        </div>
      </div>
    </section>
  )
}

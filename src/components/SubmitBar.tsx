import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isComplete, pickCount, pickKeysFor } from '@/lib/reducer'
import type { RubricState } from '@/lib/types'

interface Props {
  state: RubricState
  onSubmit: () => void
  onBack: () => void
  canGoBack: boolean
  isLast: boolean
  // Number of responses in the current case (2 or 3) — sets how many picks are required.
  nResponses: number
}

// Sticky bottom bar. Back returns to the previous case (answers are preserved
// per case, so reviewers can revise). Submit stays disabled until all required
// Likert picks are made; its label reflects whether more cases remain.
export function SubmitBar({ state, onSubmit, onBack, canGoBack, isLast, nResponses }: Props) {
  const totalPicks = pickKeysFor(nResponses).length
  const done = pickCount(state, nResponses)
  const complete = isComplete(state, nResponses)

  return (
    <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
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
        <span className="text-sm text-muted-foreground">
          {complete ? (
            <span className="font-medium text-foreground">All picks complete</span>
          ) : (
            <>
              {done} of {totalPicks} picks complete
            </>
          )}
        </span>
        <Button type="button" size="lg" disabled={!complete} onClick={onSubmit}>
          {isLast ? 'Submit & finish' : 'Submit & next'}
        </Button>
      </div>
    </div>
  )
}

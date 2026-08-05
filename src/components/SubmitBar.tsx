import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isComplete, pickCount, requiredCount } from '@/lib/reducer'
import type { RubricState, DemoCase } from '@/lib/types'

interface Props {
  state: RubricState
  onSubmit: () => void
  onBack: () => void
  canGoBack: boolean
  isLast: boolean
  // The current case — sets how many atoms must be answered before submit.
  demoCase: DemoCase
}

// Sticky bottom bar. Back returns to the previous case (answers are preserved
// per case, so reviewers can revise). Submit stays disabled until every required
// atom is answered (Yes/No/N/A); its label reflects whether more cases remain.
export function SubmitBar({ state, onSubmit, onBack, canGoBack, isLast, demoCase }: Props) {
  const total = requiredCount(demoCase)
  const done = pickCount(state, demoCase)
  const complete = isComplete(state, demoCase)

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
            <span className="font-medium text-foreground">All items answered</span>
          ) : (
            <>
              {done} of {total} items answered
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

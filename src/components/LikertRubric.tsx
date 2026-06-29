import type { Dispatch } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AxisHelp } from '@/components/AxisHelp'
import { RubricRefLink } from '@/components/RubricRefLink'
import { RUBRIC_DIMENSIONS } from '@/lib/rubric-config'
import type { RubricDimensionDef } from '@/lib/rubric-config'
import { scoreKey, noteKey } from '@/lib/reducer'
import { cn } from '@/lib/utils'
import type {
  RubricState,
  RubricAction,
  LikertScore,
  ResponseLabel,
  ResponseSlot,
} from '@/lib/types'

interface Props {
  state: RubricState
  dispatch: Dispatch<RubricAction>
  // Display labels present for THIS case (A/B or A/B/C), in display order.
  labels: ResponseLabel[]
}

const slotFor = (label: ResponseLabel): ResponseSlot =>
  label.toLowerCase() as ResponseSlot

// Compact one-line summary of all five anchors for the dimension help popover.
function anchorsHelpText(dim: RubricDimensionDef): string {
  return (
    dim.question +
    '\n\n' +
    dim.anchors.map((a) => `${a.value} — ${a.label}: ${a.description}`).join('\n\n')
  )
}

function LikertScale({
  value,
  anchorLabels,
  onSelect,
}: {
  value: LikertScore
  anchorLabels: Record<number, string>
  onSelect: (v: LikertScore) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n
        return (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            title={anchorLabels[n]}
            onClick={() => onSelect(n as LikertScore)}
            className={cn('h-8 w-8 p-0 tabular-nums', selected && 'font-semibold')}
          >
            {n}
          </Button>
        )
      })}
    </div>
  )
}

function ResponseRow({
  dim,
  label,
  state,
  dispatch,
  anchorLabels,
}: {
  dim: RubricDimensionDef
  label: ResponseLabel
  state: RubricState
  dispatch: Dispatch<RubricAction>
  anchorLabels: Record<number, string>
}) {
  const slot = slotFor(label)
  const sk = scoreKey(dim.key, slot)
  const nk = noteKey(dim.key, slot)
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Response {label}
        </span>
        <LikertScale
          value={state[sk]}
          anchorLabels={anchorLabels}
          onSelect={(value) => dispatch({ type: 'SET_PICK', axis: sk, value })}
        />
      </div>
      <Textarea
        value={state[nk]}
        onChange={(e) => dispatch({ type: 'SET_NOTE', axis: nk, value: e.target.value })}
        placeholder="Comment (optional)"
        className="min-h-0 resize-none text-sm"
        rows={1}
      />
    </div>
  )
}

// SensorFM-aligned rubric (Survey ED.1): five dimensions, each scored on a 1–5 Likert for
// EVERY response (A/B[/C]). The clinician scores all responses for one dimension before
// the next — yielding both absolute Likert scores and comparative win-rates from one grid.
export function LikertRubric({ state, dispatch, labels }: Props) {
  const totalCells = RUBRIC_DIMENSIONS.length * labels.length

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Clinical quality rubric</h2>
          <p className="text-xs text-muted-foreground">
            Rate every response on each dimension (1 = lowest, 5 = highest). Tap the ⓘ for the
            full scale. {totalCells} ratings in total.
          </p>
        </div>
        <RubricRefLink />
      </div>

      {RUBRIC_DIMENSIONS.map((dim) => {
        const anchorLabels = Object.fromEntries(
          dim.anchors.map((a) => [a.value, `${a.value} — ${a.label}`]),
        ) as Record<number, string>
        const scored = labels.filter(
          (l) => state[scoreKey(dim.key, slotFor(l))] !== null,
        ).length
        const complete = scored === labels.length
        return (
          <div key={dim.key} className="rounded-lg border bg-card px-4">
            <div className="flex items-start justify-between gap-3 border-b py-3">
              <div className="flex items-start gap-1.5">
                <div>
                  <h3 className="text-sm font-medium">{dim.label}</h3>
                  <p className="text-xs text-muted-foreground">{dim.question}</p>
                </div>
                <AxisHelp label={dim.label} text={anchorsHelpText(dim)} />
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  complete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {scored} of {labels.length} scored
              </span>
            </div>
            <div
              className={cn(
                'grid grid-cols-1 gap-3 py-4',
                labels.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
              )}
            >
              {labels.map((label) => (
                <ResponseRow
                  key={label}
                  dim={dim}
                  label={label}
                  state={state}
                  dispatch={dispatch}
                  anchorLabels={anchorLabels}
                />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

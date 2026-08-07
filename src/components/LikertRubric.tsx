import type { Dispatch } from 'react'
import { RUBRIC_DIMENSIONS } from '@/lib/rubric-config'
import type { RubricAnchor } from '@/lib/rubric-config'
import { likertKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import type {
  RubricState,
  RubricAction,
  LikertScore,
  RubricDimension,
  ResponseLabel,
} from '@/lib/types'

// The 3 subjective-quality Likert scales (1–5) asked ONCE per response, ABOVE the boolean disease
// checklist. Each scale is rendered as a TABLE — Score / Anchor / Description — mirroring the
// clinician rubric doc (the verbatim SensorFM "PHA Integration Clinician Rubric"): the clinician
// reads every anchor's description in-place and clicks the row whose description best matches, rather
// than picking a bare number. Visual language matches ChecklistRubric (left rail + tint + header pill)
// so the two components read as one system.
interface DimColor {
  rail: string
  bg: string
  header: string
  selected: string // applied to the chosen row
  selectedText: string
}
const DIM_COLORS: Record<RubricDimension, DimColor> = {
  justifiability: {
    rail: 'border-l-violet-500',
    bg: 'bg-violet-500/[0.04] dark:bg-violet-400/[0.06]',
    header: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    selected: 'bg-violet-500/15 ring-1 ring-inset ring-violet-500/40',
    selectedText: 'text-violet-800 dark:text-violet-200',
  },
  personalization: {
    rail: 'border-l-teal-500',
    bg: 'bg-teal-500/[0.04] dark:bg-teal-400/[0.06]',
    header: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
    selected: 'bg-teal-500/15 ring-1 ring-inset ring-teal-500/40',
    selectedText: 'text-teal-800 dark:text-teal-200',
  },
  // Verbatim SensorFM "Harm" scale — reuses ChecklistRubric's amber category color.
  harm: {
    rail: 'border-l-amber-500',
    bg: 'bg-amber-500/[0.05] dark:bg-amber-400/[0.07]',
    header: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    selected: 'bg-amber-500/20 ring-1 ring-inset ring-amber-500/50',
    selectedText: 'text-amber-800 dark:text-amber-200',
  },
}

// One clickable anchor row: the score chip, the bold anchor label, and its full description.
function AnchorRow({
  anchor,
  selected,
  color,
  onSelect,
}: {
  anchor: RubricAnchor
  selected: boolean
  color: DimColor
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
        'hover:bg-foreground/[0.04]',
        selected && color.selected,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
          selected
            ? cn('border-transparent', color.header, color.selectedText)
            : 'border-border text-muted-foreground',
        )}
        aria-hidden="true"
      >
        {anchor.value}
      </span>
      <span className="min-w-0 space-y-0.5">
        <span
          className={cn(
            'block text-sm font-semibold leading-tight',
            selected ? color.selectedText : 'text-foreground',
          )}
        >
          {anchor.label}
        </span>
        <span className="block text-[13px] leading-snug text-muted-foreground">
          {anchor.description}
        </span>
      </span>
    </button>
  )
}

// The 3 Likert dimensions for ONE response — each a Score/Anchor/Description table. Rendered inside
// the combined per-response card, above that response's boolean checklist.
export function LikertDimensions({
  label,
  state,
  dispatch,
}: {
  label: ResponseLabel
  state: RubricState
  dispatch: Dispatch<RubricAction>
}) {
  return (
    <div className="space-y-3">
      {RUBRIC_DIMENSIONS.map((dim) => {
        const c = DIM_COLORS[dim.key]
        const key = likertKey(label, dim.key)
        const value = state.likert[key] ?? null
        return (
          <div key={dim.key} className={cn('overflow-hidden rounded-md border-l-4', c.rail, c.bg)}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 pt-2.5">
              <span
                className={cn(
                  'inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                  c.header,
                )}
              >
                {dim.label}
              </span>
              <span className="text-sm font-medium leading-snug text-foreground">
                {dim.question}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label={`${dim.label} — 1 to 5`}
              className="mt-1.5 px-1.5 pb-2"
            >
              {dim.anchors.map((anchor) => (
                <AnchorRow
                  key={anchor.value}
                  anchor={anchor}
                  selected={value === anchor.value}
                  color={c}
                  onSelect={() =>
                    dispatch({ type: 'SET_LIKERT', key, value: anchor.value as LikertScore })
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

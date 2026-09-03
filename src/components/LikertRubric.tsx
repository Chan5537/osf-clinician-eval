import type { Dispatch } from 'react'
import { RUBRIC_DIMENSIONS } from '@/lib/rubric-config'
import type { RubricAnchor } from '@/lib/rubric-config'
import { likertKey } from '@/lib/types'
import { AxisHelp } from '@/components/AxisHelp'
import { InlineEmphasis } from '@/components/InlineEmphasis'
import { cn } from '@/lib/utils'
import type {
  RubricState,
  RubricAction,
  LikertScore,
  RubricDimension,
  ResponseLabel,
} from '@/lib/types'

// The 4 subjective-quality Likert scales (1–5) asked ONCE per response — the whole rubric since
// v6 (Likert-only). Each scale is rendered as a TABLE — Score / Anchor / Description — mirroring
// the clinician rubric doc (the verbatim SensorFM "PHA Integration Clinician Rubric"): the
// clinician reads every anchor's description in-place and clicks the row whose description best
// matches, rather than picking a bare number. Rendered by BOTH layout modes (FocusReview's right
// pane and CompareRubric's columns), which is what keeps the two modes scoring-identical.
interface DimColor {
  rail: string
  bg: string
  header: string
  selected: string // applied to the chosen row
  selectedText: string
}
const DIM_COLORS: Record<RubricDimension, DimColor> = {
  // Verbatim SensorFM "Context" scale (added 2026-08-10). Distinct blue hue — the whole-response
  // "useful summary to a provider" axis; doesn't collide with violet/teal/amber below.
  factuality: {
    rail: 'border-l-blue-500',
    bg: 'bg-blue-500/[0.04] dark:bg-blue-400/[0.06]',
    header: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    selected: 'bg-blue-500/15 ring-1 ring-inset ring-blue-500/40',
    selectedText: 'text-blue-800 dark:text-blue-200',
  },
  safety: {
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
  // Usefulness (v9: SensorFM verbatim, replaces Relevance) — rose hue, distinct from the others.
  usefulness: {
    rail: 'border-l-rose-500',
    bg: 'bg-rose-500/[0.04] dark:bg-rose-400/[0.06]',
    header: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    selected: 'bg-rose-500/15 ring-1 ring-inset ring-rose-500/40',
    selectedText: 'text-rose-800 dark:text-rose-200',
  },
  // Comprehensiveness (v7: the added-information axis) — amber.
  comprehensiveness: {
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
        {/* The per-anchor description is deliberately NOT rendered (owner, 2026-08-18): these are
            subjective scores, and a paragraph under every option invited rule-matching against the
            wording instead of a judgement. The text stays in rubric-config.ts and in the linked
            rubric doc, so a rater who wants the long form can still read it. */}
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
              {/* The full anchor definitions live behind this toggletip rather than under every
                  option (owner, 2026-08-18): a paragraph beneath all 25 choices invited matching
                  the wording instead of judging, but bare labels drift between raters — "Useful"
                  vs "Very Useful" carries no definition on its own. One click, without leaving
                  the page. */}
              <AxisHelp
                label={dim.label}
                cta="What 1–5 mean here"
                text={
                  <dl className="space-y-2">
                    {dim.anchors.map((a) => (
                      <div key={a.value}>
                        <dt className="font-semibold tabular-nums">
                          {a.value} · {a.label}
                        </dt>
                        <dd className="text-[13px] leading-snug text-muted-foreground">
                          {a.description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                }
              />
              {/* "How to score it" + the worked example, behind a toggletip (Zitao, 2026-08-25).
                HISTORY, because this reverses a deliberate decision and the reasoning still
                stands: on 2026-08-24 this block was placed INLINE precisely so a rater could not
                miss it — Factuality and Safety each send the rater to a named panel, and a rater
                who invents their own procedure is the documented cause of the ±0.55 sign-flip in
                the 2026-08-18 internal round.
                WHAT CHANGED: the v4 rubric put five of these on screen per response, three
                responses to a page — roughly 1,500 words of standing instruction competing with
                the letters being judged. Zitao's report from using the interface is that the
                page is too dense to read, and instruction nobody reads protects nobody.
                WHY THIS IS ACCEPTABLE: the CTA names what is inside ("How to score · example")
                rather than hiding it behind a bare icon, and it sits beside the anchor toggletip
                raters already open by habit.
                RESIDUAL RISK, recorded honestly: the panel each axis is scored against is now
                one click away rather than on the page. An inline chip naming that panel was
                built and then removed as unnecessary (Zitao, same day) — the rubric pin plus
                example was judged enough. If the clinician round shows raters scoring Factuality
                without opening the outcome panel (the only outcome-keyed axis since rubric v5),
                this is the first thing to revisit. */}
            {/* Examples RESTORED to the UI (Chan, 2026-09-02, v8). They were dropped on
                2026-09-01 on the grounds that the v7 questions were self-contained; the axes
                proved not to be — Usefulness r=0.80 with Personalization in the clinician
                round — and a rater cannot infer a criterion's INTENT from a stem alone. They
                sit under "How to score" in the same toggletip, so the scoring page stays as
                dense as it was. Every example quotes a real letter of the LOADED batch
                (2026-08-25 rule); if the batch is replaced, the examples must be rewritten. */}
            {dim.howToScore && (
              <AxisHelp
                label={dim.label}
                cta="How to score · example"
                text={
                  <div className="space-y-2 text-[13px] leading-snug">
                    <p>
                      <span className="font-semibold">How to score it: </span>
                      <span className="text-muted-foreground">
                        <InlineEmphasis text={dim.howToScore} />
                      </span>
                    </p>
                    {dim.example && (
                      <p>
                        <span className="font-semibold">Example: </span>
                        <span className="text-muted-foreground">
                          <InlineEmphasis text={dim.example} />
                        </span>
                      </p>
                    )}
                  </div>
                }
              />
            )}
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

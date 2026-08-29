import { futureRiskRollup, inPanel23 } from '@/lib/case-context'
import { cn } from '@/lib/utils'

interface Props {
  conditions: string[]
  emptyLabel: string
}

// The patient's recorded new diagnoses, laid out as RISK TYPE (left) -> the conditions inside it
// (right).
//
// WHY THIS SHAPE (owner 2026-08-22)
// This block replaces two separate panels that were saying overlapping things: a "patient group"
// card naming the organ system the patient was SAMPLED on, and a flat condition list underneath.
// The sampling card had to go — it named a cohort criterion while reading as a statement about
// this patient's prognosis, and with the disease rubric onboarded it would have sat next to the
// scoring questions looking like an answer key (a wrong one: it is the sampling anchor, and for
// the sleep-issue strata it is not a risk at all, it is a sleep finding). What the rater actually
// needs from both panels is the same one thing — which risk areas this patient's recorded outcome
// falls into, and what is in each — so they are one block now.
//
// LEFT is the risk type, because that is the altitude the responses answer at: they name an
// organ-system group, not a diagnosis. RIGHT is the specific conditions, so the group is never a
// bare taxonomy label — you can see what it is made of without opening anything else.
//
// Conditions run HORIZONTALLY and wrap. Stacked one-per-line (the previous treatment) a patient
// with 22 recorded conditions produced a column half a screen tall, which buried the risk types
// the block exists to show. `leading-6` fixes the line box so a wrapped run stays on an even
// rhythm instead of drifting with the tallest name in each row.
export function FutureRiskGrid({ conditions, emptyLabel }: Props) {
  // Scoped to the 23-disease panel (owner 2026-08-23) — the vocabulary the responses choose from.
  // Same principle as the sleep panel: show what a letter could have named, so a rater cannot fault
  // one for "missing" a condition it was never offered. On the eight cases on screen this takes the
  // block from 82 rows to 37.
  // ⚠️ The dropped rows are NOT announced on screen. A footer counting them was added and then
  //    removed at the owner's direction (2026-08-23) as scaffolding. Consequence to keep in mind
  //    when reading this block: it shows the panel-covered part of the outcome, not the patient's
  //    whole recorded outcome — 45 of 82 rows across these eight cases are not represented, some
  //    of them clinically salient (Aortic valve disease, Circadian rhythm sleep disorder).
  const inPanel = conditions.filter(inPanel23)
  const { groups, outside } = futureRiskRollup(inPanel)

  if (conditions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  // Recorded conditions exist, but none is on the panel. Does not occur in the eight cases on
  // screen (the smallest kept 2 of 3), but it is reachable, and a header row with nothing under it
  // would read as a rendering fault rather than as a real finding.
  // NOT `emptyLabel`: that one says nothing was recorded in the window, which would be false here —
  // conditions were recorded, they just fall outside these risk types.
  if (inPanel.length === 0) {
    return <p className="text-sm text-muted-foreground">No recorded diagnosis in these risk types.</p>
  }

  // The largest risk type carries the emphasis: a group holding six recorded conditions and one
  // holding a single condition are not the same finding, and the old flat list hid that entirely.
  // Rank comes from futureRiskRollup (most conditions first), so the highlight only restates the
  // ordering rather than adding a judgement of its own.
  //
  // ⛔ STRICT winner only. futureRiskRollup breaks count ties by menu order, which is arbitrary —
  //    highlighting the winner of a tie would assert a dominant risk type that the record does not
  //    show. Two of the eight cases on screen tie exactly this way (circulatory 5 : neurological 5,
  //    and circulatory 3 : endocrine/metabolic 3), and both would have been given a false lead.
  //    When the top two are level, nothing is highlighted and the ordering speaks for itself.
  const dominant =
    groups.length > 0 && (groups.length === 1 || groups[0].conditions.length > groups[1].conditions.length)
      ? groups[0].group
      : null

  return (
    <div>
      {/* No column headers (owner 2026-08-29): a category chip beside condition names explains
          itself, and the labels ("Risk type" / "Conditions recorded in it") read as generated
          scaffolding rather than clinical language. */}
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-0">
        {groups.map(({ group, conditions: names }) => (
          <Row
            key={group}
            label={group}
            count={names.length}
            names={names}
            emphasis={group === dominant}
          />
        ))}

        {/* Every one of the 23 panel diseases sits inside the five groups, so this should never
            fire once the list is panel-scoped. Kept as a visible failure mode rather than removed:
            if it ever renders, the panel file and the category map have drifted apart. */}
        {outside.length > 0 && (
          <Row label="outside these five" count={outside.length} names={outside} muted />
        )}
      </div>

    </div>
  )
}

function Row({
  label,
  count,
  names,
  emphasis = false,
  muted = false,
}: {
  label: string
  count: number
  names: string[]
  emphasis?: boolean
  muted?: boolean
}) {
  return (
    <>
      {/* contents-less wrapper is not possible in a grid, so each row is two siblings sharing the
          parent grid and a common top border — that border is what makes them read as one row. */}
      <div className="border-t border-border/60 py-1.5">
        <span
          className={cn(
            'inline-flex items-baseline gap-1.5 rounded-md px-2 py-0.5 text-sm',
            muted
              ? 'text-muted-foreground'
              : emphasis
                ? 'bg-indigo-600 font-semibold text-white dark:bg-indigo-500'
                : 'border border-indigo-200 bg-indigo-50 font-medium text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200',
          )}
        >
          {label}
          <span
            className={cn(
              'text-xs font-normal tabular-nums',
              muted
                ? 'text-muted-foreground'
                : emphasis
                  ? 'text-white/75'
                  : 'text-indigo-700/70 dark:text-indigo-300/70',
            )}
          >
            {count}
          </span>
        </span>
      </div>
      <div
        className={cn(
          'border-t border-border/60 py-1.5 text-sm leading-6',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {names.map((n, i) => (
          <span key={n} className="whitespace-nowrap">
            {n}
            {i < names.length - 1 && (
              <span className="px-1.5 text-muted-foreground/50" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </>
  )
}

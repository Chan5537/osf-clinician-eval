import { groupByCategory } from '@/lib/case-context'

interface Props {
  conditions: string[]
  // Shown when the list is empty — the two lists mean different things when nothing is there.
  emptyLabel: string
}

// A flat list of condition names, bucketed into organ-system groups (label on the left,
// conditions on the right). Replaces the previous badge/chip treatment: chips rendered at
// text-xs, wrapped into ragged rows, carried no ordering, and hid the tail behind "+N more" —
// none of which survives a clinician scanning 20 conditions. Plain rows at text-sm read at a
// glance and the grouping does the work the chips were pretending to do.
//
// Used by BOTH medical history and the future-disease ground truth, so the two lists stay
// visually parallel and a reader can compare them without re-learning a layout.
export function ConditionList({ conditions, emptyLabel }: Props) {
  if (conditions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  const groups = groupByCategory(conditions)
  return (
    <dl className="divide-y divide-border/60">
      {groups.map((g) => (
        <div
          key={g.category}
          className="grid grid-cols-1 gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[10.5rem_1fr]"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">
            {g.category}
          </dt>
          <dd className="flex flex-col gap-1">
            {g.conditions.map((c) => (
              <span key={c} className="text-sm leading-snug text-foreground">
                {c}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

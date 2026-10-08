import { Fragment } from 'react'
import phecodeNames from '@/data/phecode-names.json'
import { groupByCategory } from '@/lib/case-context'

interface Props {
  conditions: string[]
  // Shown when the list is empty — the two lists mean different things when nothing is there.
  emptyLabel: string
}

// A raw exporter token (`pc_296.22_dx`) that slipped through the upstream name lookup resolves
// here against the authoritative phecode map (every code the v46 batch leaked has a
// clinical_name there — the exporter simply used a narrower name source). A code the table
// somehow lacks stays visible as "Code X" rather than disappearing. The exporter should still
// be fixed at the source; 16 such entries shipped across 8 cases.
const NAME_BY_CODE: Record<string, string> = phecodeNames.nameByCode
function displayName(name: string): string {
  const m = /^pc_(.+)_dx$/.exec(name)
  if (!m) return name
  return NAME_BY_CODE[m[1]] ?? `Code ${m[1]}`
}

// Grouped by organ-system category (RESTORED 2026-10-08, owner, after Zongzhe's internal-round
// feedback: "grouped by disease category for easier searching/better readability"). The median
// gap60 patient carries 9 conditions and 44/100 carry more than 10 (max 65), which a single
// flat row made hard to search.
//
// HISTORY, because this reverses ea44efa (2026-08-28), which flattened the list after raters read
// the grouped taxonomy as a diagnostic worksheet and judged the letters against their own
// prediction instead of the recorded outcome. That concern was tied to the outcome-keyed rubric of
// the time. Rubric v15 evaluates reasoning "regardless of whether the risk later developed" and
// asks raters to know which history conditions are most strongly linked to a risk, which grouping
// makes easier. If raters again start scoring against their own call, revisit this first.
//
// Layout: category on the left with its count, the names as one wrapped row on the right. One
// name per line (the pre-ea44efa layout) ran to 27 lines for a single category on HSP_v7_014.
// Categories follow CATEGORY_ORDER, the same in every case, so a rater looking for, e.g.,
// circulatory history finds it in the same place each time. Names resolve BEFORE grouping, so a
// leaked pc_ token is filed under its real category.
export function ConditionList({ conditions, emptyLabel }: Props) {
  if (conditions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  const groups = groupByCategory(conditions.map(displayName))
  return (
    <dl className="divide-y divide-border/60">
      {groups.map((g) => (
        <div
          key={g.category}
          className="grid grid-cols-1 gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr]"
        >
          <dt className="flex items-baseline gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">
            {g.category}
            <span className="font-normal normal-case tabular-nums text-muted-foreground/80">
              ({g.conditions.length})
            </span>
          </dt>
          <dd className="text-sm leading-relaxed text-foreground">
            {g.conditions.map((c, i) => (
              <Fragment key={c}>
                <span className="sm:whitespace-nowrap">{c}</span>
                {i < g.conditions.length - 1 && (
                  <span className="text-muted-foreground/70"> · </span>
                )}
              </Fragment>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

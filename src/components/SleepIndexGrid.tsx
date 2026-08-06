import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'

interface Props {
  sleepIndex: SleepIndex
}

// The session's PSG-derived sleep indices, in three clinical groups (breathing,
// continuity, architecture).
//
// Values are printed as recorded, with no normal/abnormal verdict attached — the metrics CSV
// ships raw numbers and any severity cut-off shown here would be a clinical constant invented
// by the UI. A metric that is null in the source (PLMI is null for 3 of the 5 sessions) is
// omitted rather than rendered as 0 or "—", matching how the demographics block already
// refuses to display unrecorded fields.
export function SleepIndexGrid({ sleepIndex }: Props) {
  const groups = SLEEP_INDEX_GROUPS.map((g) => ({
    ...g,
    metrics: g.metrics.filter((m) => sleepIndex[m.field] != null),
  })).filter((g) => g.metrics.length > 0)

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No sleep indices recorded.</p>
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {g.title}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {g.metrics.map((m) => (
              <div key={m.field} className="flex flex-col rounded-md border bg-background px-2.5 py-1.5">
                {/* The LABEL carries the emphasis, not the value. Scanning 15 tiles you are
                    looking for "where is AHI", so the metric name is the index key; the number is
                    what you read once you have found it. Emphasising the value instead made every
                    tile shout a figure whose meaning you still had to look up. */}
                <span className="text-sm font-semibold leading-snug text-foreground">
                  {m.label}
                </span>
                <span className="text-base font-medium tabular-nums text-muted-foreground">
                  {formatMetric(sleepIndex[m.field] as number)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground/80">
                    {m.unit}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

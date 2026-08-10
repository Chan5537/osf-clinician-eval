import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'
import { SleepVitalsChart } from '@/components/SleepVitalsChart'

interface Props {
  sleepIndex: SleepIndex
  // The case's organ category — drives the category-filtered sleep-vitals chart shown above the grid.
  category: string
}

// The session's PSG-derived sleep indices: the category-filtered sleep-vitals CHART (browser-native
// severity bars, from the same numbers as the grid) on top, then the full raw numbers in three
// clinical groups (breathing, continuity, architecture) below.
//
// Values are printed as recorded, with no normal/abnormal verdict attached in the grid — the metrics
// ship raw numbers and any severity cut-off shown in the GRID would be a clinical constant invented by
// the UI. (The CHART does apply AASM severity bands — those are cited clinical cut-offs, not invented.)
// A metric that is null in the source (PLMI is null for most sessions) is omitted rather than rendered
// as 0 or "—", matching how the demographics block already refuses to display unrecorded fields.
export function SleepIndexGrid({ sleepIndex, category }: Props) {
  const groups = SLEEP_INDEX_GROUPS.map((g) => ({
    ...g,
    metrics: g.metrics.filter((m) => sleepIndex[m.field] != null),
  })).filter((g) => g.metrics.length > 0)

  const chart = <SleepVitalsChart sleepIndex={sleepIndex} category={category} />

  if (groups.length === 0) {
    return chart ?? <p className="text-sm text-muted-foreground">No sleep indices recorded.</p>
  }

  return (
    <div className="space-y-3">
      {chart}
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

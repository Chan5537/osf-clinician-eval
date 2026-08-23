import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'
import { SleepVitalsChart } from '@/components/SleepVitalsChart'

interface Props {
  // Metrics the system was GIVEN — the only numbers this component prints.
  sleepIndex: SleepIndex
  // FULL recorded index. Passed straight through to the chart, whose stage donut is the one
  // element allowed to read beyond the given set (owner 2026-08-22: keep the figure, drop the
  // supporting numbers). Nothing in the grid below reads from it.
  stageIndex: SleepIndex
  // The case's organ category — drives the category-filtered sleep-vitals chart shown above the grid.
  category: string
}

// The session's PSG-derived sleep indices: the category-filtered sleep-vitals CHART (browser-native
// severity bars, from the same numbers as the grid) on top, then the raw numbers in three
// clinical groups (breathing, continuity, architecture) below.
//
// ⛔ ONLY the metrics the system was given are shown (owner 2026-08-22). The caller has already
//    filtered `sleepIndex` through withGivenFieldsOnly, so a metric the response could not have
//    used never reaches this component. The panel previously rendered all 16 recorded fields
//    while the prompt injects 8 — and three of the Likert scales ask whether the response read
//    this patient's physiology correctly, so those eight extra rows were inviting the rater to
//    penalise a response for ignoring data it was never handed.
//
// Values are printed as recorded, with no normal/abnormal verdict attached in the grid — the metrics
// ship raw numbers and any severity cut-off shown in the GRID would be a clinical constant invented by
// the UI. (The CHART does apply AASM severity bands — those are cited clinical cut-offs, not invented.)
// A metric that is null in the source (PLMI is null for most sessions) is omitted rather than rendered
// as 0 or "—", matching how the demographics block already refuses to display unrecorded fields.
export function SleepIndexGrid({ sleepIndex, stageIndex, category }: Props) {
  const groups = SLEEP_INDEX_GROUPS.map((g) => ({
    ...g,
    metrics: g.metrics.filter((m) => sleepIndex[m.field] != null),
  })).filter((g) => g.metrics.length > 0)

  const chart = (
    <SleepVitalsChart sleepIndex={sleepIndex} stageIndex={stageIndex} category={category} />
  )

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

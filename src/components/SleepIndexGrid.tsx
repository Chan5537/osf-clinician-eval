import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'

interface Props {
  // Metrics the system was GIVEN — the only numbers this component prints.
  sleepIndex: SleepIndex
}

// The session's PSG-derived sleep indices as plain numbers in three clinical groups (breathing,
// continuity, architecture). The sleep-vitals chart + stage donut that used to sit above the grid
// were REMOVED 2026-08-28 (owner): clinician feedback showed raters dwelling on the visualisation
// and reasoning from it instead of judging the letters — the panel is context, not the exhibit.
// SleepVitalsChart.tsx stays in the tree unused in case the figure is wanted back.
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

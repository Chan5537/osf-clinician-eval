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
          {/* Plain text, no tiles (owner 2026-08-28): the bordered cards still read as an
              exhibit to study. One wrapped line per group — name, value, unit — presents the
              numbers without staging them. */}
          <p className="text-sm leading-relaxed text-foreground">
            {g.metrics.map((m, i) => (
              <span key={m.field} className="whitespace-nowrap">
                <span className="font-medium">{m.label}</span>{' '}
                <span className="tabular-nums">{formatMetric(sleepIndex[m.field] as number)}</span>
                <span className="text-muted-foreground/80"> {m.unit}</span>
                {i < g.metrics.length - 1 && <span className="text-muted-foreground/60"> · </span>}
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  )
}

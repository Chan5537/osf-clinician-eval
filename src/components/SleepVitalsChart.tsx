import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'
import {
  bandSegments,
  indicesForCategory,
  severityOf,
  severityPosition,
  SLEEP_BANDS,
  SLEEP_STAGES,
  type Severity,
} from '@/lib/sleep-bands'
import { cn } from '@/lib/utils'

// The Patient Panel's sleep-vitals visualization: a compact, browser-native severity-bar chart.
//
// Its BARS read the SAME `sleepIndex` numbers as the numeric grid (human_eval.json source), so the
// chart and the grid can never disagree — there is no npz/CSV recomputation (the old baked matplotlib
// PNG, which drew from a different, conflicting source, was removed 2026-08-07). The stage donut is
// the one exception: it reads `stageIndex`, the full recorded set, because a donut missing two of its
// four slices would be drawn wrong rather than drawn partially.
//
// It shows ONLY the indices clinically relevant to the case's organ CATEGORY (indicesForCategory) —
// e.g. a circulatory case shows AHI/ODI/SpO₂/arousals, a neurological case shows sleep stages/PLMI.
// Each index is a horizontal bar coloured by its AASM severity band (green/amber/red); indices with
// no clinical band render as a plain grey bar with the value only. Null indices are omitted.

interface Props {
  // Metrics the system was GIVEN — drives the severity bars and the reference rows, i.e. every
  // number this figure states.
  sleepIndex: SleepIndex
  // FULL recorded index, used for the stage donut and nothing else. See StageDonut for why the
  // donut is allowed to read beyond the given set.
  stageIndex: SleepIndex
  category: string
}

// field -> {label, unit}, flattened from the grid's group definitions (single source of labels).
const SPEC_BY_FIELD = Object.fromEntries(
  SLEEP_INDEX_GROUPS.flatMap((g) => g.metrics).map((m) => [m.field, m]),
) as Record<string, { field: string; label: string; unit: string }>

// Severity -> band-segment fill + chip text. 4-tier semantic clinical colours (NOT the app accent):
// green normal, amber mild/borderline, ORANGE moderate, red severe/concerning. The band segments are
// drawn at reduced opacity so the black value marker reads clearly on top.
const SEV_SEG: Record<Severity, string> = {
  normal: 'bg-emerald-400/70 dark:bg-emerald-500/60',
  borderline: 'bg-amber-400/70 dark:bg-amber-500/60',
  moderate: 'bg-orange-400/75 dark:bg-orange-500/60',
  concerning: 'bg-red-400/75 dark:bg-red-500/60',
}
const SEV_CHIP: Record<Severity, string> = {
  normal: 'text-emerald-700 dark:text-emerald-300',
  borderline: 'text-amber-700 dark:text-amber-300',
  moderate: 'text-orange-700 dark:text-orange-300',
  concerning: 'text-red-700 dark:text-red-300',
}

// A SEVERITY-POSITION bar: the AASM bands are painted across the track (danger always on the right)
// and a black marker sits at the value's position on that clinical axis. Position encodes SEVERITY,
// not raw magnitude — so a severe nadir SpO₂ (79%) sits far right/red even though 79 < a borderline
// mean SpO₂ of 94% in absolute terms. Only indices with a band reach here (see the reference group
// below for the rest).
function SeverityBar({ field, value }: { field: string; value: number }) {
  const spec = SPEC_BY_FIELD[field]
  const label = spec?.label ?? field
  const unit = spec?.unit ?? ''
  const sev = severityOf(field, value)
  const pos = severityPosition(field, value)
  const segs = bandSegments(field)
  if (!sev || pos == null || !segs) return null
  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
      <span className="truncate text-xs font-medium text-foreground" title={label}>
        {label}
      </span>
      <div
        className="relative h-3 rounded-[4px]"
        role="img"
        aria-label={`${label} ${formatMetric(value)} ${unit} — ${sev.label} (marker toward the right = more concerning)`}
      >
        {/* painted clinical bands, left(healthy)→right(concerning) */}
        <div className="absolute inset-0 flex overflow-hidden rounded-[4px]">
          {segs.map((s, i) => (
            <div key={i} className={cn('h-full', SEV_SEG[s.severity])} style={{ width: `${s.width * 100}%` }} />
          ))}
        </div>
        {/* value marker */}
        <div
          className="absolute -top-0.5 -bottom-0.5 w-[3px] rounded-full bg-slate-900 ring-[1.5px] ring-background dark:bg-white"
          style={{ left: `calc(${pos * 100}% - 1.5px)` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{formatMetric(value)}</span>
        <span className="ml-0.5 text-[10px]">{unit}</span>
        <span className={cn('ml-1.5 font-semibold', SEV_CHIP[sev.severity])}>{sev.label}</span>
      </span>
    </div>
  )
}

// A plain reference-value row (no clinical severity band): label + value only, grouped separately so
// it reads as deliberate context — never a coloured/greyed bar that could look "broken".
function ReferenceRow({ field, value }: { field: string; value: number }) {
  const spec = SPEC_BY_FIELD[field]
  const label = spec?.label ?? field
  const unit = spec?.unit ?? ''
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-border/60 py-1 last:border-b-0">
      <span className="truncate text-xs text-muted-foreground" title={label}>
        {label}
      </span>
      <span className="whitespace-nowrap text-xs tabular-nums">
        <span className="font-semibold text-foreground">{formatMetric(value)}</span>
        <span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}

// An inline-SVG sleep-stage donut (the shape carried over from the old matplotlib figure), drawn from
// the recorded N1/N2/N3/REM percentages. No image, no external lib — arc paths computed from
// cumulative angles. Center shows TST if available.
// NOTE: N1 and N2 are deliberately NOT in the numeric grid any more, so the donut is the only place
// they appear — as shape, not as figures. See the comment inside the function.
function StageDonut({ sleepIndex }: { sleepIndex: SleepIndex }) {
  // Owner 2026-08-22: the donut EARNS ITS PLACE even though N1/N2 were not given to the system —
  // it is the one view of overall sleep architecture, and a clinician reads the shape of the night
  // from it. What does not need to be on screen is the supporting numbers: N1 and N2 stay out of
  // the numeric grid, so the figure informs the reader without adding two metrics they might then
  // fault a response for ignoring. It is therefore fed the FULL recorded index, not the given-only
  // one — the deliberate exception to the panel's "given metrics only" rule.
  //
  // ⛔ ALL FOUR stages or nothing. The donut normalises by the sum of the slices it has, so a
  //    partial set is not a partial donut — it is a WRONG one: with only N3 (10%) and REM (15%)
  //    present the ring would draw them as 40% / 60% of the night.
  if (SLEEP_STAGES.some((s) => sleepIndex[s.field] == null)) return null

  const slices = SLEEP_STAGES.map((s) => ({ ...s, value: sleepIndex[s.field] })).filter(
    (s) => s.value != null && (s.value as number) > 0,
  ) as { field: string; label: string; color: string; value: number }[]
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (slices.length === 0 || total <= 0) return null

  const size = 132
  const cx = size / 2
  const cy = size / 2
  const rOuter = 60
  const rInner = 38

  // build one donut-segment path per stage
  let acc = -90 // start at 12 o'clock
  const polar = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
  }
  const segments = slices.map((s) => {
    const frac = s.value / total
    const start = acc
    const end = acc + frac * 360
    acc = end
    const large = end - start > 180 ? 1 : 0
    const [x0o, y0o] = polar(rOuter, start)
    const [x1o, y1o] = polar(rOuter, end)
    const [x1i, y1i] = polar(rInner, end)
    const [x0i, y0i] = polar(rInner, start)
    const d = [
      `M ${x0o} ${y0o}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o}`,
      `L ${x1i} ${y1i}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${x0i} ${y0i}`,
      'Z',
    ].join(' ')
    return { ...s, d, pct: frac * 100 }
  })

  const tst = sleepIndex['tst_min']

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Sleep-stage composition: ${segments.map((s) => `${s.label} ${s.pct.toFixed(0)}%`).join(', ')}`}
        className="shrink-0"
      >
        {segments.map((s) => (
          <path key={s.field} d={s.d} fill={s.color} stroke="var(--background)" strokeWidth={1.5} />
        ))}
        {tst != null && (
          <>
            <text x={cx} y={cy - 3} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {(tst / 60).toFixed(1)}h
            </text>
            <text x={cx} y={cy + 11} textAnchor="middle" className="fill-muted-foreground text-[9px]">
              asleep
            </text>
          </>
        )}
      </svg>
      <ul className="space-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.field} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SleepVitalsChart({ sleepIndex, stageIndex, category }: Props) {
  // the category's index list, minus any that are null/absent for this session
  const fields = indicesForCategory(category).filter((f) => sleepIndex[f] != null)
  // Read from stageIndex, not sleepIndex: the donut draws the FULL architecture (see StageDonut).
  // `every`, matching StageDonut's own all-or-nothing rule, so the figure is not kept alive by a
  // stage set the donut will then refuse to draw.
  const hasStages = SLEEP_STAGES.every((s) => stageIndex[s.field] != null)
  // split into clinically-scored (has an AASM band) vs plain reference values (no band). Reference
  // values are shown as bare numbers in their own group — never a coloured/greyed bar (2026-08-10).
  const banded = fields.filter((f) => SLEEP_BANDS[f])
  const reference = fields.filter((f) => !SLEEP_BANDS[f])

  if (fields.length === 0 && !hasStages) return null

  return (
    <figure className="m-0 space-y-3 rounded-md border bg-background/60 p-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sleep vitals relevant to this case
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <LegendDot className="bg-emerald-400/80 dark:bg-emerald-500/70" /> normal
          <LegendDot className="bg-amber-400/80 dark:bg-amber-500/70" /> mild
          <LegendDot className="bg-orange-400/85 dark:bg-orange-500/70" /> moderate
          <LegendDot className="bg-red-400/85 dark:bg-red-500/70" /> severe
        </span>
      </figcaption>

      {/* Sleep-stage donut (overall architecture) — the shape carried over from the old figure. */}
      {hasStages && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sleep stages
          </p>
          <StageDonut sleepIndex={stageIndex} />
        </div>
      )}

      {/* Clinically scored, category-relevant indices — severity-position bars (marker toward the
          right = more concerning). */}
      {banded.length > 0 && (
        <div>
          {(hasStages || reference.length > 0) && (
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Clinically scored indices
            </p>
          )}
          <div className="space-y-2">
            {banded.map((f) => (
              <SeverityBar key={f} field={f} value={sleepIndex[f] as number} />
            ))}
          </div>
        </div>
      )}

      {/* Reference values — no established severity band, shown as plain context. */}
      {reference.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Reference values <span className="font-normal normal-case">— no severity band</span>
          </p>
          <div>
            {reference.map((f) => (
              <ReferenceRow key={f} field={f} value={sleepIndex[f] as number} />
            ))}
          </div>
        </div>
      )}
    </figure>
  )
}

function LegendDot({ className }: { className: string }) {
  return <span className={cn('inline-block size-2 rounded-full', className)} aria-hidden="true" />
}

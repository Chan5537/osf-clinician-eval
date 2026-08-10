import { SLEEP_INDEX_GROUPS, formatMetric } from '@/lib/case-context'
import type { SleepIndex } from '@/lib/case-context'
import {
  barFraction,
  indicesForCategory,
  severityOf,
  SLEEP_STAGES,
  type Severity,
} from '@/lib/sleep-bands'
import { cn } from '@/lib/utils'

// The Patient Panel's sleep-vitals visualization: a compact, browser-native severity-bar chart.
//
// It reads the SAME `sleepIndex` numbers as the numeric grid (human_eval.json source), so the chart
// and the grid can never disagree — there is no npz/CSV recomputation (the old baked matplotlib PNG,
// which drew from a different, conflicting source, was removed 2026-08-07).
//
// It shows ONLY the indices clinically relevant to the case's organ CATEGORY (indicesForCategory) —
// e.g. a circulatory case shows AHI/ODI/SpO₂/arousals, a neurological case shows sleep stages/PLMI.
// Each index is a horizontal bar coloured by its AASM severity band (green/amber/red); indices with
// no clinical band render as a plain grey bar with the value only. Null indices are omitted.

interface Props {
  sleepIndex: SleepIndex
  category: string
}

// field -> {label, unit}, flattened from the grid's group definitions (single source of labels).
const SPEC_BY_FIELD = Object.fromEntries(
  SLEEP_INDEX_GROUPS.flatMap((g) => g.metrics).map((m) => [m.field, m]),
) as Record<string, { field: string; label: string; unit: string }>

// Severity -> bar + chip classes. Semantic clinical colours (NOT the app accent): green good, amber
// borderline, red concerning. A no-band index uses a neutral slate bar.
const SEV_BAR: Record<Severity, string> = {
  normal: 'bg-emerald-500 dark:bg-emerald-400',
  borderline: 'bg-amber-500 dark:bg-amber-400',
  concerning: 'bg-red-500 dark:bg-red-400',
}
const SEV_CHIP: Record<Severity, string> = {
  normal: 'text-emerald-700 dark:text-emerald-300',
  borderline: 'text-amber-700 dark:text-amber-300',
  concerning: 'text-red-700 dark:text-red-300',
}

function IndexBar({ field, value }: { field: string; value: number }) {
  const spec = SPEC_BY_FIELD[field]
  const label = spec?.label ?? field
  const unit = spec?.unit ?? ''
  const sev = severityOf(field, value)
  const frac = barFraction(field, value)
  const barColor = sev ? SEV_BAR[sev.severity] : 'bg-slate-400 dark:bg-slate-500'
  // no-band indices (tst/waso/sol/…) have no scale — show a thin full-width neutral track + value.
  const width = frac == null ? 1 : frac

  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
      <span className="truncate text-xs font-medium text-foreground" title={label}>
        {label}
      </span>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label} ${formatMetric(value)} ${unit}${sev ? ` (${sev.label})` : ''}`}
      >
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width]', barColor)}
          style={{ width: `${width * 100}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{formatMetric(value)}</span>
        <span className="ml-0.5 text-[10px]">{unit}</span>
        {sev && <span className={cn('ml-1.5 font-medium', SEV_CHIP[sev.severity])}>{sev.label}</span>}
      </span>
    </div>
  )
}

// An inline-SVG sleep-stage donut (the shape carried over from the old matplotlib figure), drawn from
// the same N1/N2/N3/REM percentages the grid shows. No image, no external lib — arc paths computed
// from cumulative angles. Center shows TST if available.
function StageDonut({ sleepIndex }: { sleepIndex: SleepIndex }) {
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

export function SleepVitalsChart({ sleepIndex, category }: Props) {
  // the category's index list, minus any that are null/absent for this session
  const fields = indicesForCategory(category).filter((f) => sleepIndex[f] != null)
  const hasStages = SLEEP_STAGES.some((s) => sleepIndex[s.field] != null)

  if (fields.length === 0 && !hasStages) return null

  return (
    <figure className="m-0 space-y-3 rounded-md border bg-background/60 p-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sleep vitals relevant to this case
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <LegendDot className="bg-emerald-500 dark:bg-emerald-400" /> healthy
          <LegendDot className="bg-amber-500 dark:bg-amber-400" /> borderline
          <LegendDot className="bg-red-500 dark:bg-red-400" /> concerning
        </span>
      </figcaption>

      {/* Sleep-stage donut (overall architecture) — the shape carried over from the old figure. */}
      {hasStages && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sleep stages
          </p>
          <StageDonut sleepIndex={sleepIndex} />
        </div>
      )}

      {/* Category-relevant severity bars. */}
      {fields.length > 0 && (
        <div>
          {hasStages && (
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Key measures
            </p>
          )}
          <div className="space-y-1.5">
            {fields.map((f) => (
              <IndexBar key={f} field={f} value={sleepIndex[f] as number} />
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

// AASM severity bands + the organ-category → sleep-index mapping for the Patient Panel's
// sleep-vitals chart (SleepVitalsChart.tsx).
//
// SEVERITY BANDS are mirrored verbatim from the Python-side single source of truth,
// osf-human-eval/exp/sleepfm/aasm_reference.yaml (Berry 2012 / Kapur 2017 / AASM 1999). Only the 8
// indices with a clinical band appear here; the rest render as plain (uncoloured) value rows. Keep
// this table in sync with the YAML if the thresholds ever change (noted as an open item in the plan).
//
// The chart reads the SAME `sleepIndex` numbers as the numeric grid (human_eval.json source), so the
// chart and grid are always consistent — no npz/CSV recomputation.

// 4-tier severity (2026-08-10 redesign): AHI/ODI genuinely have 4 AASM tiers
// (normal/mild/moderate/severe), so "moderate" gets its own ORANGE — it was previously collapsed
// into the same red as "severe". 3-tier indices simply never use `moderate`.
export type Severity = 'normal' | 'borderline' | 'moderate' | 'concerning'

// A band spec drives a SEVERITY-POSITION bar (not an absolute-length bar): the marker shows WHERE
// the value falls on the index's own clinical axis, with the danger (red) end ALWAYS on the right.
//
// `axisMin`/`axisMax` = the clinical display range (e.g. SpO₂ 70–100, NOT 0–100, so a low SpO₂
// sits far right instead of looking "high"). `worstEnd` says which axis end is the concerning one:
//   'high'  → higher value is worse (AHI/ODI/ARI): marker at (v-min)/(max-min), red on the right.
//   'low'   → lower value is worse (SpO₂/SE):      marker REVERSED so low sits on the right (red).
// This is what fixes "mean SpO₂ 94% (borderline) looked longer/healthier than nadir 79% (severe)".
//
// `stops` are ordered ascending by threshold; the severity is the band a value ≤ threshold falls in.
interface BandSpec {
  axisMin: number
  axisMax: number
  worstEnd: 'high' | 'low'
  // ordered ascending by threshold; severity is the band a value ≤ threshold falls into.
  stops: { max: number; severity: Severity; label: string }[]
}

// The banded indices. Thresholds from aasm_reference.yaml; `axisMin/Max` are the clinical DISPLAY
// range (not 0..absolute-max) so the marker position reflects severity, and `worstEnd` puts red on
// the right. AHI/ODI now use the full 4-tier scale (moderate=orange).
export const SLEEP_BANDS: Record<string, BandSpec> = {
  // respiratory-event indices — higher is worse; display 0..60 (severe is unbounded, 60 is the cap)
  ahi: {
    axisMin: 0, axisMax: 60, worstEnd: 'high',
    stops: [
      { max: 5, severity: 'normal', label: 'normal' },
      { max: 15, severity: 'borderline', label: 'mild' },
      { max: 30, severity: 'moderate', label: 'moderate' },
      { max: Infinity, severity: 'concerning', label: 'severe' },
    ],
  },
  odi: {
    axisMin: 0, axisMax: 60, worstEnd: 'high',
    stops: [
      { max: 5, severity: 'normal', label: 'normal' },
      { max: 15, severity: 'borderline', label: 'mild' },
      { max: 30, severity: 'moderate', label: 'moderate' },
      { max: Infinity, severity: 'concerning', label: 'severe' },
    ],
  },
  rdi: {
    // RDI ≥ AHI by definition; same AASM-style severity tiers as AHI (2026-08-10, so the respiratory
    // panel's RDI is a scored bar rather than a grey reference value).
    axisMin: 0, axisMax: 60, worstEnd: 'high',
    stops: [
      { max: 5, severity: 'normal', label: 'normal' },
      { max: 15, severity: 'borderline', label: 'mild' },
      { max: 30, severity: 'moderate', label: 'moderate' },
      { max: Infinity, severity: 'concerning', label: 'severe' },
    ],
  },
  ari: {
    axisMin: 0, axisMax: 40, worstEnd: 'high',
    stops: [
      { max: 15, severity: 'normal', label: 'normal' },
      { max: 25, severity: 'borderline', label: 'elevated' },
      { max: Infinity, severity: 'concerning', label: 'high' },
    ],
  },
  plmi: {
    axisMin: 0, axisMax: 40, worstEnd: 'high',
    stops: [
      { max: 15, severity: 'normal', label: 'normal' },
      { max: Infinity, severity: 'concerning', label: 'elevated' },
    ],
  },
  // oxygenation + efficiency — LOWER is worse; display the clinical range, reversed so low = right/red
  se: {
    axisMin: 60, axisMax: 100, worstEnd: 'low',
    stops: [
      { max: 75, severity: 'concerning', label: 'poor' },
      { max: 85, severity: 'borderline', label: 'reduced' },
      { max: Infinity, severity: 'normal', label: 'normal' },
    ],
  },
  mean_spo2: {
    axisMin: 70, axisMax: 100, worstEnd: 'low',
    stops: [
      { max: 90, severity: 'concerning', label: 'low' },
      { max: 94, severity: 'borderline', label: 'borderline' },
      { max: Infinity, severity: 'normal', label: 'normal' },
    ],
  },
  // NEW BAND (2026-08-10 — NOT in the original aasm_reference.yaml; common clinical desaturation
  // cutoffs, flagged for Zitao to confirm): nadir/lowest SpO₂ ≥90 normal, 85–89 borderline, <85
  // severe. Same 70–100 reversed axis as mean SpO₂ so the two are directly comparable (79% sits far
  // right / red, while a borderline 94% mean sits left — the fix for the mean-vs-nadir confusion).
  nadir_spo2: {
    axisMin: 70, axisMax: 100, worstEnd: 'low',
    stops: [
      { max: 85, severity: 'concerning', label: 'severe' },
      { max: 90, severity: 'borderline', label: 'borderline' },
      { max: Infinity, severity: 'normal', label: 'normal' },
    ],
  },
  // sleep-stage ratios — a middle band is normal, both tails abnormal. worstEnd 'high' is nominal
  // (both tails are 'borderline', none 'concerning'), so the axis direction only sets bar geometry.
  n3_pct: {
    axisMin: 0, axisMax: 40, worstEnd: 'high',
    stops: [
      { max: 10, severity: 'borderline', label: 'low' },
      { max: 23, severity: 'normal', label: 'normal' },
      { max: Infinity, severity: 'borderline', label: 'high' },
    ],
  },
  rem_pct: {
    axisMin: 0, axisMax: 40, worstEnd: 'high',
    stops: [
      { max: 15, severity: 'borderline', label: 'low' },
      { max: 25, severity: 'normal', label: 'normal' },
      { max: Infinity, severity: 'borderline', label: 'high' },
    ],
  },
}

// The severity band + its label for a value (null if the field has no clinical band).
export function severityOf(field: string, value: number): { severity: Severity; label: string } | null {
  const spec = SLEEP_BANDS[field]
  if (!spec) return null
  for (const stop of spec.stops) {
    if (value <= stop.max) return { severity: stop.severity, label: stop.label }
  }
  return { severity: spec.stops[spec.stops.length - 1].severity, label: spec.stops[spec.stops.length - 1].label }
}

// Marker position (0..1) on the index's clinical axis, with the DANGER end always at 1 (right).
// For worstEnd 'high' the raw value maps left→right; for 'low' it's reversed so a low value sits
// right (red). Clamped to the axis. null if the field has no band.
export function severityPosition(field: string, value: number): number | null {
  const spec = SLEEP_BANDS[field]
  if (!spec) return null
  const { axisMin, axisMax, worstEnd } = spec
  const raw = (value - axisMin) / (axisMax - axisMin)
  const pos = worstEnd === 'low' ? 1 - raw : raw
  return Math.max(0, Math.min(1, pos))
}

// The colored band SEGMENTS to paint across the track, left→right, danger on the right. Each segment
// is { widthPct, severity }. Built from the stops mapped onto the axis and ordered so the worst band
// is rightmost — matching severityPosition's convention.
export function bandSegments(field: string): { width: number; severity: Severity }[] | null {
  const spec = SLEEP_BANDS[field]
  if (!spec) return null
  const { axisMin, axisMax, worstEnd } = spec
  const span = axisMax - axisMin
  // stops are ascending by value; convert each to an axis fraction width
  const segs: { width: number; severity: Severity }[] = []
  let prev = axisMin
  for (const stop of spec.stops) {
    const upper = stop.max === Infinity ? axisMax : stop.max
    const width = Math.max(0, Math.min(axisMax, upper) - prev) / span
    if (width > 0) segs.push({ width, severity: stop.severity })
    prev = upper
    if (prev >= axisMax) break
  }
  // for 'low' (higher = better), the ascending-value order runs good→…; reverse so red ends right
  return worstEnd === 'low' ? segs.slice().reverse() : segs
}

// ── organ-category → which sleep indices to surface ───────────────────────────────────────────────
// Each case is scoped to ONE organ system; the chart shows the indices clinically tied to it. Every
// category includes the universal breathing/oxygenation core (sleep-disordered breathing affects all
// systems). Order = most→least salient for that system. (Locked with the user 2026-08-07.)
export const CATEGORY_INDEX_MAP: Record<string, string[]> = {
  circulatory: ['ahi', 'odi', 'mean_spo2', 'nadir_spo2', 'ari'],
  respiratory: ['ahi', 'odi', 'rdi', 'mean_spo2', 'nadir_spo2'],
  neurological: ['n1_pct', 'n2_pct', 'n3_pct', 'rem_pct', 'ari', 'plmi', 'se'],
  endocrine_metabolic: ['ahi', 'odi', 'mean_spo2', 'tst_min', 'se'],
  mental: ['rem_pct', 'se', 'waso_min', 'sol_min', 'tst_min'],
}

// Canonical category string ("circulatory system", "endocrine/metabolic", "mental disorders") OR a
// case_id slug ("endocrine_metabolic", "mental") → the CATEGORY_INDEX_MAP key.
export function categoryKey(category: string): string {
  const c = (category || '').toLowerCase().trim()
  if (c.startsWith('circulatory')) return 'circulatory'
  if (c.startsWith('respiratory')) return 'respiratory'
  if (c.startsWith('neuro')) return 'neurological'
  if (c.startsWith('endocrine') || c.includes('metabolic')) return 'endocrine_metabolic'
  if (c.startsWith('mental')) return 'mental'
  return c
}

// The ordered list of index fields to show for a case's category (empty if unknown category).
export function indicesForCategory(category: string): string[] {
  return CATEGORY_INDEX_MAP[categoryKey(category)] ?? []
}

// ── sleep-stage composition (the donut) ───────────────────────────────────────────────────────────
// N1 → N2 → N3 → REM, light→deep, a sequential-ish palette distinct from the severity green/amber/red
// (those mean "good/bad"; these are just stage identity). The donut is always shown regardless of
// category — it is the overall sleep-architecture snapshot.
export interface StageSpec {
  field: string
  label: string
  // fill for light + dark; kept explicit so Tailwind's JIT sees them (they are inline styles here).
  color: string
}
export const SLEEP_STAGES: StageSpec[] = [
  { field: 'n1_pct', label: 'N1', color: '#c7d2fe' }, // light
  { field: 'n2_pct', label: 'N2', color: '#818cf8' },
  { field: 'n3_pct', label: 'N3', color: '#4338ca' }, // deep
  { field: 'rem_pct', label: 'REM', color: '#f59e0b' }, // REM — warm, set apart from NREM blues
]

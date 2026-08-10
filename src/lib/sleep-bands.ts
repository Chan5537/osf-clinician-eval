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

export type Severity = 'normal' | 'borderline' | 'concerning'

// A band spec: ordered thresholds low→high. `higherIsBetter` flips which end is "good".
// Each stop is [inclusiveUpperBound, severity]; the last stop uses Infinity.
interface BandSpec {
  // display scale max for the bar (the point at which the bar is "full"); clamps beyond it.
  scaleMax: number
  higherIsBetter: boolean
  // ordered ascending by threshold; severity is the band a value ≤ threshold falls into.
  stops: { max: number; severity: Severity; label: string }[]
}

// The 8 banded indices. Thresholds verbatim from aasm_reference.yaml (rounded display bounds).
export const SLEEP_BANDS: Record<string, BandSpec> = {
  // respiratory-event indices — lower is better
  ahi: {
    scaleMax: 60,
    higherIsBetter: false,
    stops: [
      { max: 5, severity: 'normal', label: 'normal' },
      { max: 15, severity: 'borderline', label: 'mild' },
      { max: 30, severity: 'concerning', label: 'moderate' },
      { max: Infinity, severity: 'concerning', label: 'severe' },
    ],
  },
  odi: {
    scaleMax: 60,
    higherIsBetter: false,
    stops: [
      { max: 5, severity: 'normal', label: 'normal' },
      { max: 15, severity: 'borderline', label: 'mild' },
      { max: 30, severity: 'concerning', label: 'moderate' },
      { max: Infinity, severity: 'concerning', label: 'severe' },
    ],
  },
  ari: {
    scaleMax: 40,
    higherIsBetter: false,
    stops: [
      { max: 15, severity: 'normal', label: 'normal' },
      { max: 25, severity: 'borderline', label: 'elevated' },
      { max: Infinity, severity: 'concerning', label: 'high' },
    ],
  },
  plmi: {
    scaleMax: 40,
    higherIsBetter: false,
    stops: [
      { max: 15, severity: 'normal', label: 'normal' },
      { max: Infinity, severity: 'concerning', label: 'elevated' },
    ],
  },
  // oxygenation + efficiency — higher is better
  se: {
    scaleMax: 100,
    higherIsBetter: true,
    stops: [
      { max: 75, severity: 'concerning', label: 'poor' },
      { max: 85, severity: 'borderline', label: 'reduced' },
      { max: Infinity, severity: 'normal', label: 'normal' },
    ],
  },
  mean_spo2: {
    scaleMax: 100,
    higherIsBetter: true,
    stops: [
      { max: 90, severity: 'concerning', label: 'low' },
      { max: 94, severity: 'borderline', label: 'borderline' },
      { max: Infinity, severity: 'normal', label: 'normal' },
    ],
  },
  // sleep-stage ratios — a middle band is normal, both tails abnormal
  n3_pct: {
    scaleMax: 40,
    higherIsBetter: false,
    stops: [
      { max: 10, severity: 'borderline', label: 'low' },
      { max: 23, severity: 'normal', label: 'normal' },
      { max: Infinity, severity: 'borderline', label: 'high' },
    ],
  },
  rem_pct: {
    scaleMax: 40,
    higherIsBetter: false,
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

// The bar fill fraction (0..1) for a value against its display scale.
export function barFraction(field: string, value: number): number | null {
  const spec = SLEEP_BANDS[field]
  if (!spec) return null
  return Math.max(0, Math.min(1, value / spec.scaleMax))
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

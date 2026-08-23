// What the system was actually GIVEN for this case.
//
// WHY THIS FILE EXISTS
// The Patient Panel used to render every sleep metric the sidecar carried (16 fields). The
// generation prompt injects only 8 of them, so the clinician was shown eight measurements the
// response could not possibly have used — while three of the Likert scales (Context,
// Justifiability, Personalization) ask whether the response read this patient's physiology
// correctly. That scores a response against inputs it never received.
//
// Owner 2026-08-22: a metric that was not given to the system is NOT DISPLAYED — not collapsed,
// not greyed, not shown behind a toggle. This module is the one place that decides which is which.
//
// ⛔ SOURCE OF TRUTH is the generation prompt, NOT this file: the injected metric list lives in
//    osf-LLM-prompt/exp/sleepfm/prompts_v28.py as `_V28_METRIC_KEYS` (the `metric__*` CSV keys).
//    When the prompt line bumps a version, re-check that list against GIVEN_SLEEP_FIELDS below.
//    There is no automatic link between the two repos — this is a hand-kept mirror, so it is
//    written out explicitly with its provenance rather than derived from something that looks
//    authoritative but is not.
//
// Mirrored from prompts_v28.py::_V28_METRIC_KEYS (2026-08-22), in that file's order:
//   metric__tst_min, metric__trt_min, metric__se, metric__n3_pct,
//   metric__rem_pct, metric__ahi, metric__ari, metric__odi
export const GIVEN_SLEEP_FIELDS: readonly string[] = [
  'tst_min',
  'trt_min',
  'se',
  'n3_pct',
  'rem_pct',
  'ahi',
  'ari',
  'odi',
]

const GIVEN = new Set(GIVEN_SLEEP_FIELDS)

export function isGivenToSystem(field: string): boolean {
  return GIVEN.has(field)
}

/**
 * Drop every metric the system was not given.
 *
 * Applied ONCE, where the panel receives the sidecar's sleep index, so that every downstream
 * consumer — the numeric grid, the severity bars, the category-filtered chart, the stage donut —
 * inherits the restriction instead of each re-implementing it (and each drifting separately).
 */
export function withGivenFieldsOnly<T extends Record<string, number | null>>(
  sleepIndex: T,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [field, value] of Object.entries(sleepIndex)) {
    if (GIVEN.has(field)) out[field] = value
  }
  return out
}

import type {
  RubricState,
  RubricAction,
  RubricDimension,
  RubricScoreKey,
  RubricNoteKey,
  ResponseSlot,
} from './types'

// The 4 SensorFM dimensions × 3 response slots = 12 Likert scores (the gating picks),
// each with a paired optional note. Built programmatically so the key set stays in sync
// with the type and never drifts. (Harm dropped — see rubric-config.ts header.)
const DIMENSIONS: RubricDimension[] = [
  'context',
  'personalization',
  'justifiability',
  'relevance',
]
const SLOTS: ResponseSlot[] = ['a', 'b', 'c']

export function scoreKey(dim: RubricDimension, slot: ResponseSlot): RubricScoreKey {
  return `${dim}_${slot}`
}
export function noteKey(dim: RubricDimension, slot: ResponseSlot): RubricNoteKey {
  return `${dim}_${slot}_note`
}

// The pick keys that gate submission for a case with `nResponses` responses: one Likert per
// dimension per PRESENT response (slots a,b[,c]). A 2-arm case has 4×2 = 8 required picks; a
// 3-arm case has 4×3 = 12. The rubric state always allocates all 3 slots (initialRubricState),
// but only the slots that exist in the current case are REQUIRED — otherwise a 2-response case
// could never satisfy the `_c` picks and the clinician could never submit.
export function pickKeysFor(nResponses: number): RubricScoreKey[] {
  const slots = SLOTS.slice(0, Math.max(0, Math.min(SLOTS.length, nResponses)))
  return DIMENSIONS.flatMap((d) => slots.map((s) => scoreKey(d, s)))
}

// Back-compat default (full 3-slot key set). Prefer pickKeysFor(nResponses) at call sites that
// know the current case's response count.
export const PICK_KEYS: RubricScoreKey[] = pickKeysFor(SLOTS.length)

export const initialRubricState: RubricState = (() => {
  const state = {} as Record<string, unknown>
  for (const d of DIMENSIONS) {
    for (const s of SLOTS) {
      state[scoreKey(d, s)] = null
      state[noteKey(d, s)] = ''
    }
  }
  return state as RubricState
})()

export function rubricReducer(state: RubricState, action: RubricAction): RubricState {
  switch (action.type) {
    case 'SET_PICK':
      return { ...state, [action.axis]: action.value }
    case 'SET_NOTE':
      return { ...state, [action.axis]: action.value }
    case 'RESET':
      return { ...initialRubricState }
    default:
      return state
  }
}

/** Number of required Likert picks made, for a case with `nResponses` responses (default 3). */
export function pickCount(state: RubricState, nResponses: number = SLOTS.length): number {
  return pickKeysFor(nResponses).reduce((n, key) => (state[key] !== null ? n + 1 : n), 0)
}

/** True iff every required Likert pick (per present response) is non-null. Notes stay optional. */
export function isComplete(state: RubricState, nResponses: number = SLOTS.length): boolean {
  return pickKeysFor(nResponses).every((key) => state[key] !== null)
}

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

// The 12 pick keys that gate submission (one Likert per dimension per response). Notes excluded.
export const PICK_KEYS: RubricScoreKey[] = DIMENSIONS.flatMap((d) =>
  SLOTS.map((s) => scoreKey(d, s)),
)

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

/** Number of the 12 required Likert picks that have been made. */
export function pickCount(state: RubricState): number {
  return PICK_KEYS.reduce((n, key) => (state[key] !== null ? n + 1 : n), 0)
}

/** True iff all 12 Likert picks are non-null. Notes remain optional. */
export function isComplete(state: RubricState): boolean {
  return PICK_KEYS.every((key) => state[key] !== null)
}

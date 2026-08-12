import type {
  RubricState,
  RubricAction,
  DemoCase,
  LikertKey,
  LikertScore,
  ResponseLabel,
} from './types'
import { likertKey } from './types'
import { RUBRIC_DIMENSIONS } from './rubric-config'

// LIKERT-ONLY rubric state machine (v6). Each case's rubric holds ONE data-driven map:
//   likert — one LikertScore per (responseLabel, dimension), keyed `${label}__${dimension}`; a
//            value is 1–5 or null (unanswered). The key set is the present response labels × the
//            fixed RUBRIC_DIMENSIONS. Every cell is required for submission.
//
// The boolean atom checklist was removed from scoring in v6; the data's `atoms` are ignored.

/** Every Likert key for a case: present response labels × the Likert dimensions. All required. */
export function likertKeysFor(demoCase: DemoCase): LikertKey[] {
  const keys: LikertKey[] = []
  for (const r of demoCase.responses) {
    for (const dim of RUBRIC_DIMENSIONS) keys.push(likertKey(r.label, dim.key))
  }
  return keys
}

/** Blank state for a case: every Likert cell -> null (unanswered). */
export function buildInitialRubricState(demoCase: DemoCase): RubricState {
  const likert: Record<LikertKey, LikertScore> = {}
  for (const key of likertKeysFor(demoCase)) likert[key] = null
  return { likert }
}

export function rubricReducer(
  state: RubricState,
  action: RubricAction,
  demoCase?: DemoCase,
): RubricState {
  switch (action.type) {
    case 'SET_LIKERT':
      return { ...state, likert: { ...state.likert, [action.key]: action.value } }
    case 'RESET':
      return demoCase ? buildInitialRubricState(demoCase) : { likert: {} }
    default:
      return state
  }
}

/** A Likert cell counts as answered when it holds a concrete 1–5 value — not null. */
function likertAnswered(v: LikertScore | undefined): boolean {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5
}

/** Number of required items answered for this case. */
export function pickCount(state: RubricState, demoCase: DemoCase): number {
  return likertKeysFor(demoCase).reduce(
    (n, key) => (likertAnswered(state.likert[key]) ? n + 1 : n),
    0,
  )
}

/** Total number of required items for this case. */
export function requiredCount(demoCase: DemoCase): number {
  return likertKeysFor(demoCase).length
}

/** True iff every Likert cell (1–5) of every response is answered. */
export function isComplete(state: RubricState, demoCase: DemoCase): boolean {
  return likertKeysFor(demoCase).every((key) => likertAnswered(state.likert[key]))
}

// --- per-arm helpers (focus mode's tab badges) ------------------------------ //

/** Number of Likert cells answered for ONE response. */
export function armAnsweredCount(state: RubricState, label: ResponseLabel): number {
  return RUBRIC_DIMENSIONS.reduce(
    (n, dim) => (likertAnswered(state.likert[likertKey(label, dim.key)]) ? n + 1 : n),
    0,
  )
}

/** Number of Likert cells required for one response (the fixed dimension count). */
export function armRequiredCount(): number {
  return RUBRIC_DIMENSIONS.length
}

/** True iff every Likert cell of ONE response is answered. */
export function armComplete(state: RubricState, label: ResponseLabel): boolean {
  return armAnsweredCount(state, label) === RUBRIC_DIMENSIONS.length
}

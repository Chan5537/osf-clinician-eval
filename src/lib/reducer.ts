import type {
  RubricState,
  RubricAction,
  DemoCase,
  LikertKey,
  LikertScore,
  ResponseLabel,
  ResponseEntry,
  RankValue,
} from './types'
import { likertKey } from './types'
import { RUBRIC_DIMENSIONS } from './rubric-config'

// LIKERT + RANK rubric state machine (v10). Each case's rubric holds TWO maps:
//   likert — one LikertScore per (responseLabel, dimension), keyed `${label}__${dimension}`; a
//            value is 1–5 or null (unanswered). The key set is the present response labels × the
//            fixed RUBRIC_DIMENSIONS. Every cell is required for submission.
//   rank   — the case-level comparative question (v10): one place (1=best … 3=worst) per response
//            label, forced strict order. Every place is required for submission.
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

/** Blank state for a case: every Likert cell and every rank place -> null (unanswered). */
export function buildInitialRubricState(demoCase: DemoCase): RubricState {
  const likert: Record<LikertKey, LikertScore> = {}
  for (const key of likertKeysFor(demoCase)) likert[key] = null
  const rank: RubricState['rank'] = {}
  for (const r of demoCase.responses) rank[r.label] = null
  return { likert, rank }
}

export function rubricReducer(
  state: RubricState,
  action: RubricAction,
  demoCase?: DemoCase,
): RubricState {
  switch (action.type) {
    case 'SET_LIKERT':
      return { ...state, likert: { ...state.likert, [action.key]: action.value } }
    case 'SET_RANK': {
      // SWAP, don't collide. If another response already holds this place, it takes the place the
      // clicked response is giving up (possibly null). The result is therefore always either a
      // partial injection or a complete permutation — two responses can never share a place, so
      // there is no invalid state to validate or render an error for.
      const surrendered = state.rank[action.label] ?? null
      const next: RubricState['rank'] = { ...state.rank }
      for (const [label, place] of Object.entries(state.rank)) {
        if (label !== action.label && place === action.value && place !== null) {
          next[label as ResponseLabel] = surrendered
        }
      }
      next[action.label] = action.value
      return { ...state, rank: next }
    }
    case 'RESET':
      return demoCase ? buildInitialRubricState(demoCase) : { likert: {}, rank: {} }
    default:
      return state
  }
}

/** A Likert cell counts as answered when it holds a concrete 1–5 value — not null. */
function likertAnswered(v: LikertScore | undefined): boolean {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5
}

/** A rank place counts as answered when it holds a concrete 1–3 — not null. */
function rankAnswered(v: RankValue | undefined): boolean {
  return v === 1 || v === 2 || v === 3
}

/** This response's place in the case-level ranking, or null. */
export function rankOf(state: RubricState, label: ResponseLabel): RankValue {
  return state.rank?.[label] ?? null
}

/**
 * True iff every present response holds a place. Distinctness is guaranteed upstream by the
 * reducer's swap, so this only has to check for holes.
 */
export function rankComplete(state: RubricState, responses: ResponseEntry[]): boolean {
  return responses.every((r) => rankAnswered(state.rank?.[r.label]))
}

/** Rank places answered for this case (0 … responses.length). */
export function rankPickCount(state: RubricState, demoCase: DemoCase): number {
  return demoCase.responses.reduce(
    (n, r) => (rankAnswered(state.rank?.[r.label]) ? n + 1 : n),
    0,
  )
}

/** Number of required items answered for this case: Likert cells + rank places. */
export function pickCount(state: RubricState, demoCase: DemoCase): number {
  const likertDone = likertKeysFor(demoCase).reduce(
    (n, key) => (likertAnswered(state.likert[key]) ? n + 1 : n),
    0,
  )
  return likertDone + rankPickCount(state, demoCase)
}

/** Total required items for this case: Likert cells + one rank place per response. */
export function requiredCount(demoCase: DemoCase): number {
  return likertKeysFor(demoCase).length + demoCase.responses.length
}

/**
 * True iff every Likert cell (1–5) AND every rank place (1–3) is answered.
 *
 * ⛔ THE RANK GATE IS LOAD-BEARING, not cosmetic. A submitted case writes one rating row per
 * response for dimension 'rank_overall'. The server completion trigger (migrations/005, /007)
 * counts only rows with `value is not null`, so a null-valued rank row leaves that response one
 * dimension short of v_dims and the rater's completion email NEVER FIRES — silently, with no
 * error anywhere. Gating here is what guarantees rank values are never null at submit time.
 */
export function isComplete(state: RubricState, demoCase: DemoCase): boolean {
  return (
    likertKeysFor(demoCase).every((key) => likertAnswered(state.likert[key])) &&
    rankComplete(state, demoCase.responses)
  )
}

// --- per-arm helpers (focus mode's tab badges) ------------------------------ //
//
// ⚠️ These stay LIKERT-ONLY on purpose. The ranking is a case-level fact that belongs to no
// single arm, so folding it in here would make a response's tab read "5/6" for a question that is
// not about that response. Keeping them Likert-only is what lets a tab show "5/5 ✓" while the
// case as a whole is still incomplete because the ranking is unanswered.

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

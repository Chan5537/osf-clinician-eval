import type {
  RubricState,
  RubricAction,
  DemoCase,
  CheckKey,
  LikertKey,
  AtomScore,
  LikertScore,
} from './types'
import { atomKey, likertKey } from './types'
import { RUBRIC_DIMENSIONS } from './rubric-config'

// HYBRID rubric state machine. Each case's rubric holds TWO data-driven maps:
//   • atoms  — one AtomScore  per (responseLabel, atomId), keyed `${label}__${atomId}`; a value is
//              1 (Yes) / 0 (No) / 'NA' / null (unanswered). The key set is built from the case's
//              responses' atoms (responses[i].atoms), NOT a fixed compile-time grid.
//   • likert — one LikertScore per (responseLabel, dimension), keyed `${label}__${dimension}`; a
//              value is 1–5 or null. The key set is the present response labels × the 3 fixed
//              RUBRIC_DIMENSIONS.
//
// Placeholder atoms (blinding padding, `placeholder: true`) are pre-set to 'NA', are NOT required
// for completion, and are never presented as answerable — they exist only so every response shows
// the same atom count. Every Likert cell is required.

/** Every (label, atomId) boolean key for a case — including placeholders. */
export function allKeysFor(demoCase: DemoCase): CheckKey[] {
  const keys: CheckKey[] = []
  for (const r of demoCase.responses) {
    for (const a of r.atoms) keys.push(atomKey(r.label, a.id))
  }
  return keys
}

/** Boolean keys that GATE submission: every real (non-placeholder) atom on every response. */
export function requiredKeysFor(demoCase: DemoCase): CheckKey[] {
  const keys: CheckKey[] = []
  for (const r of demoCase.responses) {
    for (const a of r.atoms) {
      if (!a.placeholder) keys.push(atomKey(r.label, a.id))
    }
  }
  return keys
}

/** Every Likert key for a case: present response labels × the Likert dimensions. All are required. */
export function likertKeysFor(demoCase: DemoCase): LikertKey[] {
  const keys: LikertKey[] = []
  for (const r of demoCase.responses) {
    for (const dim of RUBRIC_DIMENSIONS) keys.push(likertKey(r.label, dim.key))
  }
  return keys
}

/**
 * Blank state for a case:
 *  - every real atom -> null (unanswered); every placeholder -> 'NA' (locked);
 *  - every Likert cell -> null (unanswered).
 */
export function buildInitialRubricState(demoCase: DemoCase): RubricState {
  const atoms: Record<CheckKey, AtomScore> = {}
  for (const r of demoCase.responses) {
    for (const a of r.atoms) {
      atoms[atomKey(r.label, a.id)] = a.placeholder ? 'NA' : null
    }
  }
  const likert: Record<LikertKey, LikertScore> = {}
  for (const key of likertKeysFor(demoCase)) likert[key] = null
  return { atoms, likert }
}

export function rubricReducer(
  state: RubricState,
  action: RubricAction,
  demoCase?: DemoCase,
): RubricState {
  switch (action.type) {
    case 'SET_ATOM':
      return { ...state, atoms: { ...state.atoms, [action.key]: action.value } }
    case 'SET_LIKERT':
      return { ...state, likert: { ...state.likert, [action.key]: action.value } }
    case 'RESET':
      return demoCase ? buildInitialRubricState(demoCase) : { atoms: {}, likert: {} }
    default:
      return state
  }
}

/** An atom counts as answered when it holds a concrete AtomScore (1, 0, or 'NA') — not null. */
function atomAnswered(v: AtomScore | undefined): boolean {
  return v === 1 || v === 0 || v === 'NA'
}

/** A Likert cell counts as answered when it holds a concrete 1–5 value — not null. */
function likertAnswered(v: LikertScore | undefined): boolean {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5
}

/** Number of required items answered for this case — Likert cells + required boolean atoms. */
export function pickCount(state: RubricState, demoCase: DemoCase): number {
  const likertDone = likertKeysFor(demoCase).reduce(
    (n, key) => (likertAnswered(state.likert[key]) ? n + 1 : n),
    0,
  )
  const atomDone = requiredKeysFor(demoCase).reduce(
    (n, key) => (atomAnswered(state.atoms[key]) ? n + 1 : n),
    0,
  )
  return likertDone + atomDone
}

/** Total number of required items for this case — Likert cells + required boolean atoms. */
export function requiredCount(demoCase: DemoCase): number {
  return likertKeysFor(demoCase).length + requiredKeysFor(demoCase).length
}

/** True iff every Likert cell (1–5) AND every required atom (Yes/No/NA) is answered. */
export function isComplete(state: RubricState, demoCase: DemoCase): boolean {
  const likertOk = likertKeysFor(demoCase).every((key) => likertAnswered(state.likert[key]))
  const atomsOk = requiredKeysFor(demoCase).every((key) => atomAnswered(state.atoms[key]))
  return likertOk && atomsOk
}

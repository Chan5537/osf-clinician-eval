import type { RubricState, RubricAction, DemoCase, CheckKey } from './types'
import { atomKey } from './types'

// Weighted-boolean rubric state machine. The rubric is DATA-DRIVEN: each case's key set is built
// from its responses' atoms (responses[i].atoms), NOT a fixed compile-time grid. A key is
// `${responseLabel}__${atomId}`; a value is an AtomScore (1 = Yes, 0 = No, 'NA', or null = unanswered).
//
// Placeholder atoms (blinding padding, `placeholder: true`) are pre-set to 'NA', are NOT required for
// completion, and are never presented as answerable — they exist only so every response shows the same
// atom count.

/** Every (label, atomId) key for a case — including placeholders. */
export function allKeysFor(demoCase: DemoCase): CheckKey[] {
  const keys: CheckKey[] = []
  for (const r of demoCase.responses) {
    for (const a of r.atoms) keys.push(atomKey(r.label, a.id))
  }
  return keys
}

/** The keys that GATE submission: every real (non-placeholder) atom on every response. */
export function requiredKeysFor(demoCase: DemoCase): CheckKey[] {
  const keys: CheckKey[] = []
  for (const r of demoCase.responses) {
    for (const a of r.atoms) {
      if (!a.placeholder) keys.push(atomKey(r.label, a.id))
    }
  }
  return keys
}

/** Blank state for a case: every real atom -> null (unanswered); every placeholder -> 'NA' (locked). */
export function buildInitialRubricState(demoCase: DemoCase): RubricState {
  const state: RubricState = {}
  for (const r of demoCase.responses) {
    for (const a of r.atoms) {
      state[atomKey(r.label, a.id)] = a.placeholder ? 'NA' : null
    }
  }
  return state
}

export function rubricReducer(
  state: RubricState,
  action: RubricAction,
  demoCase?: DemoCase,
): RubricState {
  switch (action.type) {
    case 'SET_ATOM':
      return { ...state, [action.key]: action.value }
    case 'RESET':
      return demoCase ? buildInitialRubricState(demoCase) : {}
    default:
      return state
  }
}

/** An atom counts as answered when it holds a concrete AtomScore (1, 0, or 'NA') — not null. */
function answered(v: RubricState[string]): boolean {
  return v === 1 || v === 0 || v === 'NA'
}

/** Number of required atoms answered for this case. */
export function pickCount(state: RubricState, demoCase: DemoCase): number {
  return requiredKeysFor(demoCase).reduce((n, key) => (answered(state[key]) ? n + 1 : n), 0)
}

/** Total number of required atoms for this case. */
export function requiredCount(demoCase: DemoCase): number {
  return requiredKeysFor(demoCase).length
}

/** True iff every required atom has been answered (Yes/No/NA). */
export function isComplete(state: RubricState, demoCase: DemoCase): boolean {
  return requiredKeysFor(demoCase).every((key) => answered(state[key]))
}

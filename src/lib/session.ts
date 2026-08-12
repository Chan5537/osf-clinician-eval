// Multi-case session state machine: landing -> cycle through cases -> completion.
//
// This layer is composed ON TOP of the unchanged single-case rubric reducer.
// The session reducer holds one RubricState per case and delegates the flat
// RubricAction to the targeted case via the RUBRIC action. No router; the
// `view` field drives which screen App renders.

import type { RubricState, RubricAction, DemoCase } from './types'
import { buildInitialRubricState, rubricReducer } from './reducer'
import { DEMO_CASES } from '@/data/demo-cases'

// Bump whenever the case CONTENT or stored shape changes, so stale localStorage
// is discarded rather than mis-hydrated. v2 = N-response shape + SensorFM Likert rubric.
// v3 = organ-system redesign (sleep-vitals figure, 4-criteria rubric [Harm dropped]).
// v4 = weighted-boolean rubric (per-response Yes/No/NA atom checklist; open data-driven key scheme).
// v5 = HYBRID rubric: adds 3 per-response Likert scales (justifiability/personalization/safety) on
//      top of the boolean atoms; RubricState becomes { atoms, likert } (structured, two maps).
// v6 = LIKERT-ONLY rubric (boolean atoms dropped from UI/gate/export; RubricState = { likert })
//      + focus/compare layout modes (SessionState.layoutMode).
export const SCHEMA_VERSION = 6

export type SessionView = 'landing' | 'cycle' | 'completion'

// How the case page presents the responses:
//   'focus'   — one arm at a time: response on the left, its Likert scales on the right.
//               ALL scoring happens here.
//   'compare' — READ-ONLY: all arms side by side for cross-reading; no scoring controls
//               (there is no A-vs-B comparison rubric yet).
// Entered/left via the in-page action buttons (Compare side by side / Back to scoring);
// persisted so a reload keeps the view.
export type LayoutMode = 'focus' | 'compare'

export interface CaseRubric {
  state: RubricState
  submitted: boolean
  submittedAt: string | null // ISO 8601 (UTC) -> export submitted_at; null until submitted
  durationSeconds: number | null
  revealed: boolean // streaming reveal already played for this case (skip re-stream on revisit)
}

export interface SessionState {
  view: SessionView
  currentCaseIndex: number
  cases: CaseRubric[] // length === DEMO_CASES.length, aligned 1:1 by index
  reviewer: string // optional free-text initials; '' when skipped
  caseEnteredAt: number | null // Date.now() epoch ms — NOT performance.now()
  layoutMode: LayoutMode // focus (default) | compare — persisted so a reload keeps the choice
}

const blankCase = (demoCase: DemoCase): CaseRubric => ({
  state: buildInitialRubricState(demoCase),
  submitted: false,
  submittedAt: null,
  durationSeconds: null,
  revealed: false,
})

export function initialSessionState(): SessionState {
  return {
    view: 'landing',
    currentCaseIndex: 0,
    cases: DEMO_CASES.map((dc) => blankCase(dc)),
    reviewer: '',
    caseEnteredAt: null,
    layoutMode: 'focus',
  }
}

// First case not yet SUBMITTED (the resume target). All submitted -> length (sentinel).
export function firstIncompleteIndex(s: SessionState): number {
  const i = s.cases.findIndex((c) => !c.submitted)
  return i === -1 ? s.cases.length : i
}

export function allCasesSubmitted(s: SessionState): boolean {
  return s.cases.every((c) => c.submitted)
}

export type SessionAction =
  | { type: 'SET_REVIEWER'; reviewer: string }
  | { type: 'BEGIN' }
  | { type: 'RUBRIC'; caseIndex: number; action: RubricAction } // delegate flat RubricAction
  | { type: 'SUBMIT_CASE'; caseIndex: number; at: string; durationSeconds: number | null }
  | { type: 'NEXT_CASE' }
  | { type: 'GOTO_CASE'; caseIndex: number }
  | { type: 'FINISH' }
  | { type: 'RESET_ALL' }
  | { type: 'ENTER_CASE'; at: number } // stamps caseEnteredAt = Date.now()
  | { type: 'REVEAL_CASE'; caseIndex: number } // mark streaming reveal as played (once)
  | { type: 'SET_LAYOUT_MODE'; mode: LayoutMode } // focus/compare toggle

function patchCase(s: SessionState, i: number, patch: Partial<CaseRubric>): SessionState {
  return { ...s, cases: s.cases.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case 'SET_REVIEWER':
      return { ...s, reviewer: a.reviewer }
    case 'BEGIN': {
      const i = firstIncompleteIndex(s)
      if (i >= s.cases.length) return { ...s, view: 'completion' }
      return { ...s, view: 'cycle', currentCaseIndex: i, caseEnteredAt: Date.now() }
    }
    case 'RUBRIC': {
      const c = s.cases[a.caseIndex]
      // Editing re-opens a submitted case so a later re-submit re-stamps honestly.
      const nextState = rubricReducer(c.state, a.action, DEMO_CASES[a.caseIndex])
      return patchCase(s, a.caseIndex, {
        state: nextState,
        submitted: false,
        submittedAt: null,
        durationSeconds: null,
      })
    }
    case 'SUBMIT_CASE':
      return patchCase(s, a.caseIndex, {
        submitted: true,
        submittedAt: a.at,
        durationSeconds: a.durationSeconds,
      })
    case 'NEXT_CASE': {
      const next = s.currentCaseIndex + 1
      if (next >= s.cases.length) return { ...s, view: 'completion' }
      return { ...s, currentCaseIndex: next, caseEnteredAt: Date.now() }
    }
    case 'GOTO_CASE':
      return { ...s, view: 'cycle', currentCaseIndex: a.caseIndex, caseEnteredAt: Date.now() }
    case 'FINISH':
      return { ...s, view: 'completion' }
    case 'RESET_ALL':
      return initialSessionState()
    case 'ENTER_CASE':
      return { ...s, caseEnteredAt: a.at }
    case 'REVEAL_CASE':
      return patchCase(s, a.caseIndex, { revealed: true })
    case 'SET_LAYOUT_MODE':
      return { ...s, layoutMode: a.mode }
    default:
      return s
  }
}

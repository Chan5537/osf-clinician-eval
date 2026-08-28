// Multi-case session state machine: landing -> cycle through cases -> completion.
//
// This layer is composed ON TOP of the unchanged single-case rubric reducer.
// The session reducer holds one RubricState per case and delegates the flat
// RubricAction to the targeted case via the RUBRIC action. No router; the
// `view` field drives which screen App renders.

import type { RubricState, RubricAction, DemoCase, ResponseLabel } from './types'
import { buildInitialRubricState, rubricReducer } from './reducer'
import { DEMO_CASES } from '@/data/demo-cases'
import type { TimeAccumulator } from './timing'
import { advance, touch, park, resume } from './timing'

// Bump whenever the case CONTENT or stored shape changes, so stale localStorage
// is discarded rather than mis-hydrated. v2 = N-response shape + SensorFM Likert rubric.
// v3 = organ-system redesign (sleep-vitals figure, 4-criteria rubric [Harm dropped]).
// v4 = weighted-boolean rubric (per-response Yes/No/NA atom checklist; open data-driven key scheme).
// v5 = HYBRID rubric: adds 3 per-response Likert scales (justifiability/personalization/safety) on
//      top of the boolean atoms; RubricState becomes { atoms, likert } (structured, two maps).
// v6 = LIKERT-ONLY rubric (boolean atoms dropped from UI/gate/export; RubricState = { likert })
//      + focus/compare layout modes (SessionState.layoutMode).
// v7 = adds the 5th Likert dimension "Relevance" (Prof. Yang 8/13) + the v12.1 8-case batch
//      (one per cohort sub-group, 3 blinded arms per case).
// v8 = TIMING instrumentation only (no rubric/content change): per-case active/idle accounting
//      alongside the original wall clock, plus per-response active time. CaseRubric gains
//      `timing`, so the stored shape changes and stale v7 sessions must be discarded.
// v9 = v28 letter batch (group-level Assessment) on the same v16 8-patient set.
// v10 = the DISEASE rubric is onboarded (lib/rubric-config-disease.ts). The Likert KEYS are
//       unchanged, so a stale v9 session would deserialise cleanly and silently present
//       answers given to the health-management questions as answers to the disease ones.
//       Same keys + different questions is exactly the case a version bump exists to catch.
// v11 = the disease rubric is rewritten to the owner's five axes (Factuality / Safe /
//       Personalization / Trustworthy / Justifiability). Keys unchanged again, questions
//       and anchors changed again — same reason as v10, so the same bump.
// v12 = disease rubric v4 (Chan, 2026-08-24; agreed with Zitao). Five axes: Factuality / Safety /
//       Trustworthiness / Relevance / Personalization. Justifiability is DROPPED and Relevance
//       restored in its place, so the `justifiability` KEY now carries the Relevance question —
//       a v11 session would deserialise cleanly and present Justifiability answers as Relevance
//       ones. Factuality and Safety are now scored against the recorded-outcome panel, reversing
//       the v11 prohibition (see the header of lib/rubric-config-disease.ts). Questions, anchors
//       and the meaning of one key all changed: discard stale sessions.
// v13 = disease rubric v5 (2026-08-28, Zitao). The `harm` KEY now carries Comprehensiveness —
//       Safety is retired (it tracked Factuality; see the header of lib/rubric-config-disease.ts)
//       — and Personalization is re-scoped from the synthesis to the recommendations. A v12
//       session would present Safety answers as Comprehensiveness ones: discard stale sessions.
// v14 = the v46 letter batch (10 patients, two per category) replaced the 5-case v33.11 batch
//       in commit 7121544 WITHOUT this bump — case count and content both changed, so a v13
//       session created against the old batch would map its answers onto the wrong cases.
//       Bumped here after the fact, with the arm-literal fix (BASE/OURS/TRUTH).
export const SCHEMA_VERSION = 14

export type SessionView = 'landing' | 'cycle' | 'completion'

// How the case page presents the responses:
//   'focus'   — one arm at a time: response on the left, its Likert scales on the right.
//               ALL scoring happens here.
//   'compare' — READ-ONLY: all arms side by side for cross-reading; no scoring controls
//               (there is no A-vs-B comparison rubric yet).
// Entered/left via the in-page action buttons (Compare side by side / Back to scoring);
// persisted so a reload keeps the view.
export type LayoutMode = 'focus' | 'compare'

// Per-case timing ledger. Survives reload, so a case resumed the next morning keeps the effort
// already spent on it instead of restarting from zero (the pre-v8 behaviour, which additionally
// reported `null` because nothing ever re-stamped the clock baseline on resume).
export interface CaseTiming {
  acc: TimeAccumulator // whole-case active/idle accounting
  // Active ms attributed to each blinded response letter, keyed by ResponseLabel ('A'|'B'|'C').
  // Credited on each Likert pick to the response that pick belongs to.
  perResponseMs: Record<string, number>
  // Which response the rater is currently working on — the attribution target for elapsed time.
  focusedLabel: ResponseLabel | null
  wallMs: number // entry -> submit, unconditional; accumulated across resumes
  enteredAt: number | null // epoch ms of the current visit; null when not the active case
}

export interface CaseRubric {
  state: RubricState
  submitted: boolean
  submittedAt: string | null // ISO 8601 (UTC) -> export submitted_at; null until submitted
  durationSeconds: number | null
  revealed: boolean // streaming reveal already played for this case (skip re-stream on revisit)
  timing: CaseTiming
}

export function newCaseTiming(): CaseTiming {
  return {
    acc: { runningSince: null, lastActivityAt: 0, activeMs: 0, idleMs: 0 },
    perResponseMs: {},
    focusedLabel: null,
    wallMs: 0,
    enteredAt: null,
  }
}

export interface SessionState {
  view: SessionView
  currentCaseIndex: number
  cases: CaseRubric[] // length === DEMO_CASES.length, aligned 1:1 by index
  reviewer: string // optional free-text initials; '' when skipped
  caseEnteredAt: number | null // Date.now() epoch ms — NOT performance.now()
  layoutMode: LayoutMode // focus (default) | compare — persisted so a reload keeps the choice
  // Epoch ms when the tab was last hidden; null while visible. The parked gap becomes idle time
  // on the matching VISIBILITY resume.
  hiddenAt: number | null
}

const blankCase = (demoCase: DemoCase): CaseRubric => ({
  state: buildInitialRubricState(demoCase),
  submitted: false,
  submittedAt: null,
  durationSeconds: null,
  revealed: false,
  timing: newCaseTiming(),
})

export function initialSessionState(): SessionState {
  return {
    view: 'landing',
    currentCaseIndex: 0,
    cases: DEMO_CASES.map((dc) => blankCase(dc)),
    reviewer: '',
    caseEnteredAt: null,
    layoutMode: 'focus',
    hiddenAt: null,
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
  | { type: 'ENTER_CASE'; at: number } // stamps caseEnteredAt + starts the case's active clock
  | { type: 'REVEAL_CASE'; caseIndex: number } // mark streaming reveal as played (once)
  | { type: 'SET_LAYOUT_MODE'; mode: LayoutMode } // focus/compare toggle
  // Tab hidden/visible. Drives the idle split; `at` is the caller's Date.now().
  | { type: 'VISIBILITY'; hidden: boolean; at: number }
  // The rater moved to a different response card — retargets per-response attribution.
  | { type: 'FOCUS_RESPONSE'; label: ResponseLabel; at: number }

function patchCase(s: SessionState, i: number, patch: Partial<CaseRubric>): SessionState {
  return { ...s, cases: s.cases.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }
}

// Settle the case clock up to `now`, crediting the active delta to whichever response is focused.
// Every timing transition funnels through here so per-response time can never drift from the
// case total: the sum of perResponseMs is exactly the active time spent while some card was focused.
function settle(t: CaseTiming, now: number): CaseTiming {
  const nextAcc = advance(t.acc, now)
  const delta = nextAcc.activeMs - t.acc.activeMs
  const label = t.focusedLabel
  const perResponseMs =
    label && delta > 0
      ? { ...t.perResponseMs, [label]: (t.perResponseMs[label] ?? 0) + delta }
      : t.perResponseMs
  return { ...t, acc: nextAcc, perResponseMs }
}

// Begin (or resume) a visit to case `i`: start its clocks, and stop the clock on whichever case
// was previously active so time is never double-counted across two cases.
function enterCase(s: SessionState, i: number, now: number): SessionState {
  const cases = s.cases.map((c, idx) => {
    if (idx === s.currentCaseIndex && idx !== i && c.timing.enteredAt !== null) {
      const settled = settle(c.timing, now)
      return {
        ...c,
        timing: {
          ...settled,
          acc: park(settled.acc, now),
          wallMs: c.timing.wallMs + Math.max(0, now - c.timing.enteredAt),
          enteredAt: null,
        },
      }
    }
    if (idx !== i) return c
    // Resuming: keep prior activeMs/idleMs/perResponseMs, restart the running stretch.
    return {
      ...c,
      timing: {
        ...c.timing,
        acc: { ...c.timing.acc, runningSince: now, lastActivityAt: now },
        enteredAt: now,
      },
    }
  })
  return { ...s, cases, currentCaseIndex: i, caseEnteredAt: now }
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case 'SET_REVIEWER':
      return { ...s, reviewer: a.reviewer }
    case 'BEGIN': {
      const i = firstIncompleteIndex(s)
      if (i >= s.cases.length) return { ...s, view: 'completion' }
      return enterCase({ ...s, view: 'cycle' }, i, Date.now())
    }
    case 'RUBRIC': {
      const c = s.cases[a.caseIndex]
      // Editing re-opens a submitted case so a later re-submit re-stamps honestly.
      const nextState = rubricReducer(c.state, a.action, DEMO_CASES[a.caseIndex])
      // A pick is an interaction: settle elapsed time, then restart the idle window. The Likert
      // key is `${label}__${dimension}`, so the pick itself tells us which response to credit —
      // no component needs to report focus for scoring time to be attributed correctly.
      const now = Date.now()
      const picked =
        a.action.type === 'SET_LIKERT' ? (a.action.key.split('__')[0] as ResponseLabel) : null
      const retargeted = picked ? { ...c.timing, focusedLabel: picked } : c.timing
      const settled = settle(retargeted, now)
      return patchCase(s, a.caseIndex, {
        state: nextState,
        submitted: false,
        submittedAt: null,
        durationSeconds: null,
        timing: { ...settled, acc: touch(settled.acc, now) },
      })
    }
    case 'SUBMIT_CASE': {
      // Freeze the ledger at submit: settle the final stretch and close the wall-clock visit.
      const c = s.cases[a.caseIndex]
      const now = Date.now()
      const settled = settle(c.timing, now)
      return patchCase(s, a.caseIndex, {
        submitted: true,
        submittedAt: a.at,
        durationSeconds: a.durationSeconds,
        timing: {
          ...settled,
          acc: park(settled.acc, now),
          wallMs:
            c.timing.wallMs + (c.timing.enteredAt !== null ? Math.max(0, now - c.timing.enteredAt) : 0),
          enteredAt: null,
        },
      })
    }
    case 'NEXT_CASE': {
      const next = s.currentCaseIndex + 1
      if (next >= s.cases.length) return { ...s, view: 'completion' }
      return enterCase(s, next, Date.now())
    }
    case 'GOTO_CASE':
      return enterCase({ ...s, view: 'cycle' }, a.caseIndex, Date.now())
    case 'FINISH':
      return { ...s, view: 'completion' }
    case 'RESET_ALL':
      return initialSessionState()
    case 'ENTER_CASE':
      // Now actually dispatched (App mount/resume). Pre-v8 this action existed but nothing sent it,
      // so a reloaded session had caseEnteredAt=null and reported a null duration.
      return enterCase(s, s.currentCaseIndex, a.at)
    case 'VISIBILITY': {
      const c = s.cases[s.currentCaseIndex]
      if (!c || c.timing.enteredAt === null) return { ...s, hiddenAt: a.hidden ? a.at : null }
      if (a.hidden) {
        const settled = settle(c.timing, a.at)
        return patchCase({ ...s, hiddenAt: a.at }, s.currentCaseIndex, {
          timing: { ...settled, acc: park(settled.acc, a.at) },
        })
      }
      return patchCase({ ...s, hiddenAt: null }, s.currentCaseIndex, {
        timing: { ...c.timing, acc: resume(c.timing.acc, a.at, s.hiddenAt) },
      })
    }
    case 'FOCUS_RESPONSE': {
      const c = s.cases[s.currentCaseIndex]
      if (!c) return s
      // Settle under the OLD focus first, so elapsed time lands on the card actually being read.
      const settled = settle(c.timing, a.at)
      return patchCase(s, s.currentCaseIndex, {
        timing: { ...settled, focusedLabel: a.label },
      })
    }
    case 'REVEAL_CASE':
      return patchCase(s, a.caseIndex, { revealed: true })
    case 'SET_LAYOUT_MODE':
      return { ...s, layoutMode: a.mode }
    default:
      return s
  }
}

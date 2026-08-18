// localStorage persistence for the evaluation session.
//
// Every access is wrapped in try/catch: Safari private mode throws on access,
// and writes can throw on quota. A failure must NEVER blank the app — it just
// means we fall back to a fresh in-memory session.

import type { SessionState, CaseRubric, CaseTiming } from './session'
import { SCHEMA_VERSION, initialSessionState, newCaseTiming } from './session'
import { buildInitialRubricState } from './reducer'
import type { RubricState, DemoCase } from './types'
import { DEMO_CASES } from '@/data/demo-cases'

// Neutral localStorage key (no brand token; visible in a screen-shared devtools session).
const KEY = 'clinician-eval-session'

interface Envelope {
  version: number
  session: SessionState
}

// Rebuild a clean RubricState for a specific case, copying only that case's known Likert keys
// from `stored`. Renamed/removed/foreign keys vanish, so the reducer never receives a malformed
// object.
function sanitizeRubric(stored: unknown, demoCase: DemoCase): RubricState {
  const base: RubricState = buildInitialRubricState(demoCase)
  if (stored && typeof stored === 'object') {
    const src = stored as { likert?: unknown }
    if (src.likert && typeof src.likert === 'object') {
      const l = src.likert as Record<string, unknown>
      for (const k of Object.keys(base.likert)) {
        const v = l[k]
        if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === null)
          base.likert[k] = v as RubricState['likert'][string]
      }
    }
  }
  return base
}

// Rebuild a case's timing ledger from storage. ACCUMULATED totals (activeMs/idleMs/perResponseMs/
// wallMs) are kept — they are the record of effort already spent. LIVE clock baselines
// (runningSince, enteredAt) are deliberately dropped: a baseline from a previous browser session
// would otherwise bill the entire time the laptop was closed to this case. ENTER_CASE re-stamps
// them on mount.
function sanitizeTiming(stored: unknown): CaseTiming {
  const base = newCaseTiming()
  if (!stored || typeof stored !== 'object') return base
  const t = stored as Partial<CaseTiming>
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  const acc = (t.acc ?? {}) as Record<string, unknown>
  const perResponseMs: Record<string, number> = {}
  if (t.perResponseMs && typeof t.perResponseMs === 'object') {
    for (const [k, v] of Object.entries(t.perResponseMs)) {
      if (k === 'A' || k === 'B' || k === 'C') perResponseMs[k] = num(v)
    }
  }
  return {
    acc: {
      runningSince: null, // re-stamped on entry; never trusted across a reload
      lastActivityAt: 0,
      activeMs: num(acc.activeMs),
      idleMs: num(acc.idleMs),
    },
    perResponseMs,
    focusedLabel:
      t.focusedLabel === 'A' || t.focusedLabel === 'B' || t.focusedLabel === 'C'
        ? t.focusedLabel
        : null,
    wallMs: num(t.wallMs),
    enteredAt: null,
  }
}

export function load(): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope
    if (!env || env.version !== SCHEMA_VERSION || !env.session) return null
    const s = env.session
    // Index-alignment guard: array length must match the current case set.
    if (!Array.isArray(s.cases) || s.cases.length !== DEMO_CASES.length) return null
    const fresh = initialSessionState()
    const cases: CaseRubric[] = DEMO_CASES.map((dc, i) => {
      const c = s.cases[i] ?? fresh.cases[i]
      return {
        state: sanitizeRubric(c?.state, dc),
        submitted: !!c?.submitted,
        submittedAt: typeof c?.submittedAt === 'string' ? c.submittedAt : null,
        durationSeconds: typeof c?.durationSeconds === 'number' ? c.durationSeconds : null,
        revealed: !!c?.revealed,
        timing: sanitizeTiming(c?.timing),
      }
    })
    return {
      view: s.view === 'completion' || s.view === 'cycle' ? s.view : 'landing',
      currentCaseIndex:
        Number.isInteger(s.currentCaseIndex) &&
        s.currentCaseIndex >= 0 &&
        s.currentCaseIndex < DEMO_CASES.length
          ? s.currentCaseIndex
          : 0,
      cases,
      reviewer: typeof s.reviewer === 'string' ? s.reviewer : '',
      caseEnteredAt: null, // never trust a persisted clock baseline; re-stamped by ENTER_CASE
      layoutMode: s.layoutMode === 'compare' ? 'compare' : 'focus',
      hiddenAt: null,
    }
  } catch {
    return null // corrupt JSON / disabled storage -> start fresh, never blank the app
  }
}

export function save(session: SessionState): void {
  try {
    const env: Envelope = { version: SCHEMA_VERSION, session }
    localStorage.setItem(KEY, JSON.stringify(env))
  } catch {
    /* quota / private mode — best effort; in-memory state stays correct */
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

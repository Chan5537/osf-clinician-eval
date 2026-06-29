// localStorage persistence for the evaluation session.
//
// Every access is wrapped in try/catch: Safari private mode throws on access,
// and writes can throw on quota. A failure must NEVER blank the app — it just
// means we fall back to a fresh in-memory session.

import type { SessionState, CaseRubric } from './session'
import { SCHEMA_VERSION, initialSessionState } from './session'
import { initialRubricState } from './reducer'
import type { RubricState } from './types'
import { DEMO_CASES } from '@/data/demo-cases'

// Neutral localStorage key (no brand token; visible in a screen-shared devtools session).
const KEY = 'clinician-eval-session'

interface Envelope {
  version: number
  session: SessionState
}

// Rebuild a clean RubricState, copying only known keys from `stored`. Renamed
// or partial keys vanish, so the reducer never receives a malformed object.
function sanitizeRubric(stored: unknown): RubricState {
  const base: RubricState = { ...initialRubricState }
  const target = base as unknown as Record<string, unknown>
  if (stored && typeof stored === 'object') {
    const src = stored as Record<string, unknown>
    for (const k of Object.keys(base)) {
      if (src[k] !== undefined) target[k] = src[k]
    }
  }
  return base
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
    const cases: CaseRubric[] = DEMO_CASES.map((_dc, i) => {
      const c = s.cases[i] ?? fresh.cases[i]
      return {
        state: sanitizeRubric(c?.state),
        submitted: !!c?.submitted,
        submittedAt: typeof c?.submittedAt === 'string' ? c.submittedAt : null,
        durationSeconds: typeof c?.durationSeconds === 'number' ? c.durationSeconds : null,
        revealed: !!c?.revealed,
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
      caseEnteredAt: null, // never trust a persisted clock baseline; re-stamp on entry
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

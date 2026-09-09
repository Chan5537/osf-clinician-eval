// Local-first mirror of the session to Supabase.
//
// THE RULE: localStorage is the source of truth for the running app. The network
// is a mirror — written AFTER the local save, read ONCE at boot. A failed network
// write changes a status pill and nothing else. A clinician must never be blocked,
// and must never lose work, because the network dropped.
//
// Two things are mirrored:
//   session_state  the whole SessionState blob, debounced (resume / B6)
//   rating         15 rows per submitted case                (collection / B8)
//
// Both are UPSERTS on a natural key, so delivery is at-least-once and duplicates
// are harmless. That is what lets the queue retry blindly with no dedup table.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { RUBRIC_VERSION } from './rubric-config'
import { BATCH } from '@/data/demo-cases'
import { supabase, SUPABASE_ENABLED } from './supabase'
import { sanitizeSession } from './storage'
import { ratingRowsForCase, type RatingRow } from './sync-rows'

// ---------------------------------------------------------------- status ----

export type SyncStatus =
  | { kind: 'off' } // no backend configured (kill switch) — render nothing
  | { kind: 'idle' } // everything mirrored
  | { kind: 'saving' }
  | { kind: 'queued'; pending: number } // saved locally, not yet uploaded
  | { kind: 'error'; message: string; pending: number }

let status: SyncStatus = SUPABASE_ENABLED ? { kind: 'idle' } : { kind: 'off' }
const listeners = new Set<(s: SyncStatus) => void>()

export function getSyncStatus(): SyncStatus {
  return status
}

export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setStatus(next: SyncStatus): void {
  // Compare by value: useSyncExternalStore re-renders on identity change, and a
  // fresh object every tick would re-render the header forever.
  if (JSON.stringify(next) === JSON.stringify(status)) return
  status = next
  for (const fn of listeners) fn(status)
}

// ----------------------------------------------------------------- queue ----

type Op =
  | { id: string; kind: 'session'; raterId: string; session: SessionState; rev: number }
  | { id: string; kind: 'ratings'; raterId: string; rows: RatingRow[] }

const QUEUE_KEY = `clinician-eval-syncq::${BATCH || 'all'}`
const MAX_OPS = 60
const MAX_BACKOFF_MS = 60_000

let queue: Op[] = []
let attempts = 0
let nextAttemptAt = 0
let draining = false
let loaded = false

function loadQueue(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Op[]) : []
    if (Array.isArray(parsed)) queue = parsed
  } catch {
    queue = [] // an unreadable queue must not brick startup
  }
}

function persistQueue(): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Over quota. Drop the OLDEST session op (superseded by definition) and retry
    // once; ratings are never dropped here — they are the irreplaceable part.
    const i = queue.findIndex((o) => o.kind === 'session')
    if (i >= 0) {
      queue.splice(i, 1)
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
      } catch {
        /* give up: the in-memory queue still drains this session */
      }
    }
  }
}

function enqueue(op: Op): void {
  loadQueue()
  // Session ops are whole-state upserts, so only the newest can matter: collapse
  // rather than accumulate. This is what keeps the queue bounded during a long
  // offline stretch.
  if (op.kind === 'session') queue = queue.filter((o) => o.kind !== 'session')
  queue.push(op)
  if (queue.length > MAX_OPS) queue = queue.slice(-MAX_OPS)
  persistQueue()
  reportQueued()
  void drain()
}

function reportQueued(): void {
  if (!SUPABASE_ENABLED) return
  if (queue.length === 0) setStatus({ kind: 'idle' })
  else if (status.kind !== 'error') setStatus({ kind: 'queued', pending: queue.length })
}

// ------------------------------------------------------------- the writes ----

async function runOp(op: Op): Promise<void> {
  if (!supabase) throw new Error('no client')

  if (op.kind === 'session') {
    const { error } = await supabase.from('session_state').upsert(
      {
        rater_id: op.raterId,
        batch: BATCH,
        schema_version: SCHEMA_VERSION,
        rubric_version: RUBRIC_VERSION,
        state: op.session as unknown as Record<string, unknown>,
        client_rev: op.rev,
      },
      { onConflict: 'rater_id,batch' },
    )
    if (error) throw error
    return
  }

  if (op.rows.length === 0) return
  const { error } = await supabase
    .from('rating')
    .upsert(op.rows, { onConflict: 'rater_id,batch,case_id,response_label,dimension' })
  if (error) throw error
}

/** Auth expired mid-round: refresh once before treating it as a real failure. */
async function isRecoverableAuth(err: unknown): Promise<boolean> {
  const code = (err as { status?: number; code?: string })?.status
  const msg = String((err as Error)?.message ?? '')
  if (code === 401 || code === 403 || /jwt|token|expired/i.test(msg)) {
    try {
      const { error } = await supabase!.auth.refreshSession()
      return !error
    } catch {
      return false
    }
  }
  return false
}

async function drain(): Promise<void> {
  if (!SUPABASE_ENABLED || draining) return
  loadQueue()
  if (queue.length === 0) {
    setStatus({ kind: 'idle' })
    return
  }
  if (Date.now() < nextAttemptAt) return

  draining = true
  setStatus({ kind: 'saving' })
  try {
    // One op at a time, in order, so a session upsert can never overtake a submit.
    while (queue.length > 0) {
      const op = queue[0]
      try {
        await runOp(op)
      } catch (err) {
        if (await isRecoverableAuth(err)) {
          try {
            await runOp(op)
          } catch (again) {
            return failWith(again)
          }
        } else {
          return failWith(err)
        }
      }
      queue.shift()
      persistQueue()
    }
    attempts = 0
    nextAttemptAt = 0
    setStatus({ kind: 'idle' })
  } finally {
    draining = false
  }
}

function failWith(err: unknown): void {
  attempts += 1
  // Exponential backoff with ±20% jitter, so five raters failing at once do not
  // retry in lockstep.
  const base = Math.min(1000 * 2 ** attempts, MAX_BACKOFF_MS)
  nextAttemptAt = Date.now() + base * (0.8 + Math.random() * 0.4)
  persistQueue()
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  setStatus(
    offline
      ? { kind: 'queued', pending: queue.length }
      : {
          kind: 'error',
          message: String((err as Error)?.message ?? 'Upload failed'),
          pending: queue.length,
        },
  )
}

// --------------------------------------------------------------- public API ----

let sessionTimer: number | null = null

/** Debounced whole-session mirror. Safe to call on every state change. */
export function queueSessionSync(raterId: string, session: SessionState, rev: number): void {
  if (!SUPABASE_ENABLED || !raterId) return
  if (sessionTimer) window.clearTimeout(sessionTimer)
  // 2s, deliberately slower than storage.ts's 300ms: localStorage is free, a
  // round-trip per keystroke is not. Worst case a closed tab leaves 2s of state
  // un-mirrored — and localStorage still has it, so nothing is lost, only unsent.
  sessionTimer = window.setTimeout(() => {
    enqueue({ id: `s-${Date.now()}`, kind: 'session', raterId, session, rev })
  }, 2000)
}

/** A submitted case: its 15 rating rows, plus the session blob. */
export function queueCaseSubmit(
  raterId: string,
  session: SessionState,
  caseIndex: number,
  rev: number,
): void {
  if (!SUPABASE_ENABLED || !raterId) return
  const rows = ratingRowsForCase(session, caseIndex, raterId)
  if (rows.length > 0) {
    enqueue({ id: `r-${caseIndex}-${Date.now()}`, kind: 'ratings', raterId, rows })
  }
  // Submitting also moves currentCaseIndex, so mirror the session immediately
  // rather than waiting out the debounce.
  if (sessionTimer) window.clearTimeout(sessionTimer)
  enqueue({ id: `s-${Date.now()}`, kind: 'session', raterId, session, rev })
}

/** Drain now, ignoring backoff. The Retry button and pagehide both use this. */
export async function flushNow(): Promise<void> {
  nextAttemptAt = 0
  await drain()
}

export function pendingCount(): number {
  loadQueue()
  return queue.length
}

// ------------------------------------------------------------ drain triggers ----

if (SUPABASE_ENABLED && typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushNow())
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void drain()
  })
  // Best effort on unload. sendBeacon cannot carry the auth header, so durability
  // comes from the queue surviving in localStorage, not from this call landing.
  window.addEventListener('pagehide', () => void drain())
  window.setInterval(() => void drain(), 30_000)
}

// ------------------------------------------------------------ hydrate / reconcile ----

export interface ServerSession {
  state: SessionState
  clientRev: number
  updatedAt: string
}

/**
 * Read this rater's server state for the current batch. Exactly once, at boot.
 *
 * NEVER throws and never rejects: a network failure, a cold-started free-tier
 * project, or a missing row all return null, and the caller falls back to local.
 * Losing the mirror must never cost the rater their session.
 *
 * Refuses a row from a different schema/rubric version — those answers were given
 * to a different instrument (see the ⛔ note in session.ts).
 */
export async function hydrate(raterId: string): Promise<ServerSession | null> {
  if (!SUPABASE_ENABLED || !supabase || !raterId) return null
  try {
    const { data, error } = await supabase
      .from('session_state')
      .select('state, client_rev, updated_at, schema_version, rubric_version')
      .eq('rater_id', raterId)
      .eq('batch', BATCH)
      .maybeSingle()
    if (error || !data) return null
    if (data.schema_version !== SCHEMA_VERSION || data.rubric_version !== RUBRIC_VERSION) {
      return null
    }
    const raw = data.state as unknown as SessionState
    if (!raw || !Array.isArray(raw.cases)) return null
    // Re-shape against the CURRENT batch before it reaches the reducer. Without this a
    // session recorded against a longer batch restores an out-of-range currentCaseIndex
    // and App white-screens on `demoCase.case_id`. localStorage has always been
    // sanitised on read; the server path must be too.
    const state = sanitizeSession(raw)
    return {
      state,
      clientRev: typeof data.client_rev === 'number' ? data.client_rev : 0,
      updatedAt: String(data.updated_at ?? ''),
    }
  } catch {
    return null
  }
}

const submittedCount = (s: SessionState | null | undefined): number =>
  s?.cases?.filter((c) => c?.submitted).length ?? 0

export interface Reconciled {
  state: SessionState | null
  source: 'local' | 'server' | 'fresh'
  /** Both sides hold submitted work and they disagree — worth telling the rater. */
  diverged: boolean
  localSubmitted: number
  serverSubmitted: number
}

/**
 * Decide what the app boots with. PURE — no I/O, no storage, no clock.
 *
 * THE RULE: more submitted cases wins. Ties break to the higher rev, then to local.
 *
 * Submitted cases is the only metric that tracks irreplaceable human effort. Using
 * `updated_at` instead would pick the most recently *touched* device — which is
 * exactly wrong when someone opens a stale laptop and its debounce fires over the
 * machine where the real work happened.
 *
 * NOT a merge. Case-level union sounds better and is a trap: timing ledgers would
 * double-count and currentCaseIndex becomes ambiguous. Pick a winner; the caller
 * stashes the loser (storage.stashSuperseded) so a wrong call stays recoverable.
 */
export function reconcile(
  local: SessionState | null,
  localRev: number,
  server: ServerSession | null,
): Reconciled {
  const l = submittedCount(local)
  const s = submittedCount(server?.state)
  const base = { localSubmitted: l, serverSubmitted: s }

  if (!local && !server) return { state: null, source: 'fresh', diverged: false, ...base }
  if (!server) return { state: local, source: 'local', diverged: false, ...base }
  if (!local) return { state: server.state, source: 'server', diverged: false, ...base }

  // Diverged only when BOTH sides hold submitted work and the counts differ:
  // that is the case a human should confirm. Everything else resolves silently.
  const diverged = l > 0 && s > 0 && l !== s

  if (s > l) return { state: server.state, source: 'server', diverged, ...base }
  if (l > s) return { state: local, source: 'local', diverged, ...base }
  if (server.clientRev > localRev)
    return { state: server.state, source: 'server', diverged: false, ...base }
  return { state: local, source: 'local', diverged: false, ...base }
}

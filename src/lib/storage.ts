// localStorage persistence for the evaluation session.
//
// Every access is wrapped in try/catch: Safari private mode throws on access,
// and writes can throw on quota. A failure must NEVER blank the app — it just
// means we fall back to a fresh in-memory session.

import type { SessionState, CaseRubric, CaseTiming } from './session'
import { SCHEMA_VERSION, initialSessionState, newCaseTiming } from './session'
import { buildInitialRubricState } from './reducer'
import type { RubricState, DemoCase, LikertScore, ResponseLabel, RankValue } from './types'
import { RANK_DIMENSION } from './types'
import { DEMO_CASES, BATCH, BLOCK_ID, BLOCK_SIZE, TOTAL_BLOCKS } from '@/data/demo-cases'

// Neutral localStorage key (no brand token; visible in a screen-shared devtools session).
// Scoped by BLOCK so two blocks scored in the same browser keep separate progress.
const KEY = `clinician-eval-session::${BLOCK_ID}`

interface Envelope {
  version: number
  // Monotonic client revision, bumped on every save(). Compared against
  // session_state.client_rev to break a reconcile tie when both sides hold the
  // same number of submitted cases. Wall-clock timestamps are NOT usable for
  // this: two machines' clocks disagree, and the most recently *touched* device
  // is not the one with the most work on it.
  rev?: number
  // Which letter set the answers were given to. case_ids restart at HSP_v7_000 in every
  // batch, so answers from another batch describe different letters and must not be reused.
  batch?: string
  // case_id per stored case, positionally parallel to session.cases. Restoring BY case_id
  // (rather than by index, as before 2026-09-02) means adding cases to a batch no longer
  // discards a rater's work: what matches is kept, what is new starts empty.
  caseIds?: string[]
  session: SessionState
}

// Rebuild a clean RubricState for a specific case, copying only that case's known Likert keys
// from `stored`. Renamed/removed/foreign keys vanish, so the reducer never receives a malformed
// object.
function sanitizeRubric(stored: unknown, demoCase: DemoCase): RubricState {
  const base: RubricState = buildInitialRubricState(demoCase)
  if (stored && typeof stored === 'object') {
    const src = stored as { likert?: unknown; rank?: unknown }
    if (src.likert && typeof src.likert === 'object') {
      const l = src.likert as Record<string, unknown>
      for (const k of Object.keys(base.likert)) {
        const v = l[k]
        if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === null)
          base.likert[k] = v as RubricState['likert'][string]
      }
    }
    // The case-level ranking, allowlist-rebuilt the same way: a place for a letter this case does
    // not have, or a value outside 1–3, is dropped rather than handed to the reducer.
    // ⚠️ WITHOUT THIS BRANCH THE WHOLE `rank` MAP IS SILENTLY DISCARDED on every load and every
    // server hydrate (sync.ts runs sanitizeSession), because this function rebuilds from
    // buildInitialRubricState rather than merging — so a rater's ranking would vanish on reload
    // while their Likert scores survived, with nothing anywhere reporting the loss.
    if (src.rank && typeof src.rank === 'object') {
      const rk = src.rank as Record<string, unknown>
      for (const label of Object.keys(base.rank) as ResponseLabel[]) {
        const v = rk[label]
        if (v === 1 || v === 2 || v === 3 || v === null) base.rank[label] = v
      }
      // A hand-edited or partially-written file could hold duplicate places, which the reducer's
      // swap can never produce. Enforce distinctness on the way IN so the no-ties invariant holds
      // for restored state too: first writer of a place keeps it, later duplicates reset to null.
      const taken = new Set<number>()
      for (const label of Object.keys(base.rank) as ResponseLabel[]) {
        const v = base.rank[label]
        if (v === null || v === undefined) continue
        if (taken.has(v)) base.rank[label] = null
        else taken.add(v)
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
    // A different letter set: the answers were about other text. Never silently reuse them.
    if (env.batch && BATCH && env.batch !== BATCH) return null
    const s = env.session
    if (!Array.isArray(s.cases)) return null
    const fresh = initialSessionState()
    // Restore by case_id. A stored session from a smaller/larger version of the same batch
    // keeps every case it shares with the current set; the rest start empty.
    const stored = new Map<string, unknown>()
    if (Array.isArray(env.caseIds)) {
      env.caseIds.forEach((cid, i) => { if (cid && s.cases[i]) stored.set(cid, s.cases[i]) })
    } else {
      // Pre-2026-09-02 envelope: no case_id list, so fall back to the old positional match,
      // which is right exactly when the case set has not changed.
      DEMO_CASES.forEach((dc, i) => { if (s.cases[i]) stored.set(dc.case_id, s.cases[i]) })
    }
    const cases: CaseRubric[] = DEMO_CASES.map((dc, i) => {
      const c = (stored.get(dc.case_id) as CaseRubric | undefined) ?? fresh.cases[i]
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
    const env: Envelope = {
      version: SCHEMA_VERSION,
      batch: BATCH,
      caseIds: DEMO_CASES.map((c) => c.case_id),
      rev: nextRev(),
      session,
    }
    localStorage.setItem(KEY, JSON.stringify(env))
  } catch {
    /* quota / private mode — best effort; in-memory state stays correct */
  }
}

// ---- revision counter -------------------------------------------------------------------
// Read once at module load, then advanced in memory. Reading storage on every save would
// cost a JSON.parse per keystroke, and a stale read is harmless here: the counter only has
// to be MONOTONIC WITHIN A DEVICE, never comparable across devices.
let revCounter: number | null = null

function nextRev(): number {
  if (revCounter === null) revCounter = readRev()
  revCounter += 1
  return revCounter
}

function readRev(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const env = JSON.parse(raw) as Envelope
    return typeof env?.rev === 'number' && Number.isFinite(env.rev) && env.rev >= 0 ? env.rev : 0
  } catch {
    return 0
  }
}

/**
 * Re-shape an arbitrary SessionState against the CURRENT batch.
 *
 * `load()` has always done this for localStorage — rebuilding `cases` per case_id and
 * clamping `currentCaseIndex` — but a session arriving from the SERVER used to skip it.
 * That is a real crash: a session recorded against 10 cases, restored while a shorter
 * batch is served, leaves currentCaseIndex past the end of DEMO_CASES, and App reads
 * `demoCase.case_id` on undefined and white-screens.
 *
 * Reachable in production, not just behind VITE_CASE_LIMIT: any batch that loses a case
 * between two of a rater's sittings does the same thing.
 *
 * Keeps every answer whose case_id still exists; anything else starts empty.
 */
export function sanitizeSession(s: SessionState): SessionState {
  const fresh = initialSessionState()
  const byId = new Map<string, CaseRubric>()
  if (Array.isArray(s.cases)) {
    // Positional: a stored session's cases[] is parallel to the DEMO_CASES it was
    // written against. We cannot know that older list, so index against the current
    // one — the same assumption load() makes on the pre-2026-09-02 envelope path.
    DEMO_CASES.forEach((dc, i) => {
      const c = s.cases[i]
      if (c) byId.set(dc.case_id, c)
    })
  }
  const cases: CaseRubric[] = DEMO_CASES.map((dc, i) => {
    const c = byId.get(dc.case_id) ?? fresh.cases[i]
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
    caseEnteredAt: null, // never trust a persisted clock baseline
    layoutMode: s.layoutMode === 'compare' ? 'compare' : 'focus',
    hiddenAt: null,
  }
}

/** The stored session PLUS its revision — what reconcile() needs. `load()` is unchanged. */
export function loadEnvelope(): { session: SessionState; rev: number } | null {
  const session = load()
  if (!session) return null
  return { session, rev: readRev() }
}

/**
 * Park a session that reconcile() is about to overwrite.
 *
 * Costs four lines and turns a wrong reconcile from terminal into recoverable: the
 * losing side is still on disk, under a timestamped key, for as long as the browser
 * keeps it. Never throws — a full quota must not block the sign-in that triggered it.
 */
export function stashSuperseded(session: SessionState): void {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    localStorage.setItem(
      `${KEY}::superseded-${stamp}`,
      JSON.stringify({ version: SCHEMA_VERSION, batch: BATCH, session }),
    )
  } catch {
    /* best effort — losing the backup must never block the round */
  }
}


// ---- blocks & archive -------------------------------------------------------------------
// A hundred-case batch is scored in blocks, and a rater may come back days later, on another
// machine, or after clearing site data. Two affordances cover that: the landing screen shows
// what each block already holds in THIS browser (blockProgress), and a downloaded export can
// be handed back to the app to rebuild the session (restoreFromExport).

const blockKey = (block: number) => `clinician-eval-session::b${block}`

export interface BlockProgress {
  block: number
  first: number // 1-indexed case number in the batch
  last: number
  submitted: number
  size: number
}

/** What each block of the current batch already holds in this browser. */
export function blockProgress(totalCases: number): BlockProgress[] {
  const out: BlockProgress[] = []
  for (let b = 1; b <= TOTAL_BLOCKS; b++) {
    const first = (b - 1) * BLOCK_SIZE + 1
    const last = Math.min(b * BLOCK_SIZE, totalCases)
    let submitted = 0
    try {
      const raw = localStorage.getItem(blockKey(b))
      if (raw) {
        const env = JSON.parse(raw) as Envelope
        if (env?.version === SCHEMA_VERSION && (!env.batch || !BATCH || env.batch === BATCH)) {
          submitted = (env.session?.cases ?? []).filter((c) => c?.submitted).length
        }
      }
    } catch {
      /* unreadable block: report it as empty rather than blocking the picker */
    }
    out.push({ block: b, first, last, submitted, size: last - first + 1 })
  }
  return out
}

/** Rows as written by lib/export.ts (long format, one per case x response x dimension). */
interface ExportRow {
  case_id?: string
  response_label?: string
  batch?: string
  // 'likert' (a per-response 1–5 scale) | 'rank' (the case-level comparative ranking). Needed to
  // tell the two row families apart on the way back in — see the branch in restoreFromExport.
  kind?: string
  dimension?: string
  value?: string | number
  submitted_at?: string | null
  duration_seconds?: number | null
  reviewer?: string
}

/**
 * Rebuild this block's session from a previously downloaded JSON export and persist it.
 * Returns a human-readable summary; throws with a reason the caller can show.
 *
 * ⛔ Refuses a file from another batch or another rubric version: the answers would be about
 * different letters or different questions. Rows for cases outside the current block are
 * ignored (that is how a whole-batch export restores into one block).
 */
export function restoreFromExport(text: string): string {
  let parsed: { schema_version?: number; reviewer?: string; reviews?: ExportRow[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not the JSON export (try the .json you downloaded).')
  }
  const rows = parsed.reviews
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No answers found in that file.')
  if (parsed.schema_version !== SCHEMA_VERSION) {
    throw new Error(
      `That file was saved under rubric schema ${parsed.schema_version}, and this round runs ` +
        `schema ${SCHEMA_VERSION}. The questions changed, so those answers cannot be reused.`,
    )
  }
  const fileBatch = rows.find((r) => r.batch)?.batch
  if (fileBatch && BATCH && fileBatch !== BATCH) {
    throw new Error(`That file scored batch ${fileBatch}; this round serves ${BATCH}.`)
  }

  const byCase = new Map<string, ExportRow[]>()
  for (const r of rows) {
    if (!r.case_id) continue
    const list = byCase.get(r.case_id) ?? []
    list.push(r)
    byCase.set(r.case_id, list)
  }

  const fresh = initialSessionState()
  let restored = 0
  const cases: CaseRubric[] = DEMO_CASES.map((dc, i) => {
    const rowsFor = byCase.get(dc.case_id)
    if (!rowsFor || rowsFor.length === 0) return fresh.cases[i]
    const state = buildInitialRubricState(dc)
    let any = false
    for (const r of rowsFor) {
      if (!r.response_label || !r.dimension) continue
      const v = Number(r.value)
      // The case-level ranking rides in the SAME long-format rows as the Likert cells, one row per
      // response carrying that response's place. It MUST be branched off first: a rank row's value
      // (1–3) also satisfies the 1–5 guard below, so without this it would be written as
      // state.likert['A__rank_overall'] — a key that exists in no case, losing the answer AND
      // seeding a junk key that sanitizeRubric then strips on the next load.
      if (r.kind === 'rank' || r.dimension === RANK_DIMENSION) {
        if (v === 1 || v === 2 || v === 3) {
          const label = r.response_label as ResponseLabel
          if (label in state.rank) {
            state.rank[label] = v as RankValue
            any = true
          }
        }
        continue
      }
      if (v >= 1 && v <= 5) {
        state.likert[`${r.response_label}__${r.dimension}`] = v as LikertScore
        any = true
      }
    }
    const submittedAt = rowsFor.find((r) => r.submitted_at)?.submitted_at ?? null
    const dur = rowsFor.find((r) => typeof r.duration_seconds === 'number')?.duration_seconds ?? null
    if (any || submittedAt) restored++
    return {
      state,
      submitted: !!submittedAt,
      submittedAt: submittedAt ?? null,
      durationSeconds: typeof dur === 'number' ? dur : null,
      revealed: false,
      timing: newCaseTiming(),
    }
  })

  if (restored === 0) {
    throw new Error('That file holds no answers for the cases in this block.')
  }
  const session: SessionState = {
    ...fresh,
    cases,
    reviewer: parsed.reviewer || fresh.reviewer,
    view: 'cycle',
    currentCaseIndex: Math.max(0, cases.findIndex((c) => !c.submitted)),
  }
  save(session)
  return `Restored ${restored} case(s) into this block.`
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

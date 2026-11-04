// SessionState -> public.rating rows, for ONE case.
//
// Deliberately built on buildRows() from export.ts rather than re-deriving the
// shape. buildRows already decides what a "row" is (one per case x response x
// dimension), which cases count as touched, and how timing is apportioned. A
// second implementation here would drift from the CSV export the moment either
// side changed — and the two are meant to describe the same round.
//
// Pure and side-effect free so it can be reasoned about (and tested) without a
// network or a browser.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { buildRows, textFingerprint } from './export'
import { RUBRIC_VERSION } from './rubric-config'
import { DEMO_CASES } from '@/data/demo-cases'

/** One row of public.rating. Column names match supabase/migrations/001_init.sql. */
export interface RatingRow {
  rater_id: string
  batch: string
  case_id: string
  response_label: string
  dimension: string
  value: number | null
  rubric_version: string
  schema_version: number
  response_sha: string
  submitted_at: string | null
  duration_seconds: number | null
  active_seconds: number | null
  idle_seconds: number | null
  response_active_seconds: number | null
}

/** '' / undefined -> null, so an empty Likert cell is SQL NULL rather than 0. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}

/**
 * The rating rows for a single case. Returns [] when the case is untouched
 * (buildRows omits it), so an accidental call on a blank case writes nothing.
 *
 * `batch` falls back to the case's own watermark and then to '' — but a row with
 * an empty batch violates the batch_response foreign key and will be REJECTED by
 * Postgres rather than landing unattributable. That is the intended behaviour.
 */
export function ratingRowsForCase(
  session: SessionState,
  caseIndex: number,
  raterId: string,
): RatingRow[] {
  const demoCase = DEMO_CASES[caseIndex]
  if (!demoCase) return []

  return buildRows(session)
    .filter((r) => r.case_id === demoCase.case_id)
    .map((r) => ({
      rater_id: raterId,
      batch: String(r.batch ?? demoCase.batch ?? ''),
      case_id: String(r.case_id),
      response_label: String(r.response_label),
      dimension: String(r.dimension),
      value: numOrNull(r.value),
      rubric_version: String(r.rubric_version),
      schema_version: SCHEMA_VERSION,
      response_sha: String(r.response_sha),
      submitted_at: strOrNull(r.submitted_at),
      duration_seconds: numOrNull(r.duration_seconds),
      active_seconds: numOrNull(r.active_seconds),
      idle_seconds: numOrNull(r.idle_seconds),
      response_active_seconds: numOrNull(r.response_active_seconds),
    }))
}

/** Every touched case's rows — used to backfill a session that predates the backend. */
export function allRatingRows(session: SessionState, raterId: string): RatingRow[] {
  return DEMO_CASES.flatMap((_, i) => ratingRowsForCase(session, i, raterId))
}

// ------------------------------------------------------------- comments ----

/**
 * One row of public.rating_comment (supabase/migrations/012_rating_comment.sql).
 * ⚠️ No `response_label`: that column is GENERATED from `target` on the server, and PostgREST
 * rejects a write to a generated column.
 */
export interface CommentRow {
  rater_id: string
  batch: string
  case_id: string
  scope: 'likert' | 'rank'
  target: string // 'A' | 'B' | 'C' for likert, 'case' for rank
  comment: string // trimmed; '' = no comment (or a cleared one)
  rubric_version: string
  schema_version: number
  response_sha: string | null // the letter commented on; null for the ranking comment
  submitted_at: string | null
}

/**
 * The comment rows for a single SUBMITTED case — [] otherwise. Comments on a case not yet submitted
 * travel inside the session_state blob and land here at submit, alongside the ratings.
 *
 * Emits EVERY target (one per response + the ranking), blank ones included. That makes each write
 * a complete, idempotent picture of the case: a comment the rater cleared is overwritten with ''
 * rather than lingering, with no delete path needed. The extract filters out blanks.
 */
export function commentRowsForCase(
  session: SessionState,
  caseIndex: number,
  raterId: string,
): CommentRow[] {
  const demoCase = DEMO_CASES[caseIndex]
  const c = session.cases[caseIndex]
  if (!demoCase || !c || !c.submitted) return []
  const base = {
    rater_id: raterId,
    batch: String(demoCase.batch ?? ''),
    case_id: demoCase.case_id,
    rubric_version: RUBRIC_VERSION,
    schema_version: SCHEMA_VERSION,
    submitted_at: strOrNull(c.submittedAt),
  }
  const rows: CommentRow[] = demoCase.responses.map((r) => ({
    ...base,
    scope: 'likert',
    target: r.label,
    comment: (c.state.comments?.likert?.[r.label] ?? '').trim(),
    response_sha: textFingerprint(r.markdown),
  }))
  rows.push({
    ...base,
    scope: 'rank',
    target: 'case',
    comment: (c.state.comments?.rank ?? '').trim(),
    response_sha: null,
  })
  return rows
}

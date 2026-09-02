// Client-side export of the session's ratings to JSON and CSV.
//
// LIKERT-ONLY schema (v6, LONG / TIDY format): one row per (case, response, Likert dimension).
// The `kind` column is kept ('likert' on every row) for forward compatibility with future
// side-by-side comparison metrics.
//
// ⛔ NO `arm` COLUMN (2026-09-02, owner). It used to ride along as the unblinding key, which
// meant a rater who opened their own export could read off which response came from which
// system. The export now carries `batch` (which letter set was scored), `response_sha` (the
// fingerprint of the exact text shown) and `response_text` (that text). Arms are recovered on
// the generation side by joining results/<batch>_arm_key.csv on (case_id, response_label) —
// see scripts/decode_review_csv.py in the prompt repo. The sha makes a join against the wrong
// batch fail loudly instead of relabelling every score in silence.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { pickCount } from './reducer'
import { RUBRIC_DIMENSIONS, RUBRIC_VERSION } from './rubric-config'
import { DEMO_CASES } from '@/data/demo-cases'
import { likertKey } from './types'
import type { LikertScore } from './types'
import { msToSeconds } from './timing'

// One row per (case, response, Likert dimension). `value` is the clinician's answer; `arm` is the
// unblinding key.
const COLUMNS: string[] = [
  'reviewer',
  'case_id',
  'query_id',
  'response_label', // blinded A/B/C the clinician saw
  'batch', // which exported letter set this row scored (join key to the arm key file)
  'response_sha', // fingerprint of response_text — guards the join, survives Excel mangling
  'kind', // 'likert' (reserved for future comparison-metric row kinds)
  'dimension', // usefulness | factuality | comprehensiveness | personalization | relevance
  'value', // 1–5 ; '' (unanswered)
  'submitted_at',
  // TIMING (v8). `duration_seconds` keeps its original wall-clock meaning so pre-v8 analysis
  // scripts stay valid; the new columns are APPENDED, never reordered. All are case-level facts
  // except response_active_seconds, which is per (case, response).
  'duration_seconds', // wall clock, entry -> submit (unchanged definition)
  'active_seconds', // wall clock minus time hidden/idle — real time-on-task
  'idle_seconds', // the remainder; active + idle == duration (up to rounding)
  'response_active_seconds', // active seconds attributed to THIS response card
  // APPENDED (2026-08-29, keys renamed): which rubric wording + key vocabulary produced this
  // row. Files with different values must never be pooled — same rule as the SCHEMA bumps.
  'rubric_version',
  // Last on purpose: it is long and multi-line, so every leading column stays readable in a
  // spreadsheet. This is the letter exactly as the clinician read it (RFC-4180 quoted).
  'response_text',
]

export type ReviewRow = Record<string, string | number | boolean | null>

// FNV-1a over UTF-8 bytes -> 8 hex chars. MIRRORED in the prompt repo's
// scripts/export_calibrated_batch_to_ui.py (text_fingerprint) and decode_review_csv.py —
// change one, change all three, or the review CSV can no longer be joined to its arm key.
export function textFingerprint(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let h = 0x811c9dc5
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

function likertValueCell(v: LikertScore): string | number {
  if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5) return v
  return '' // null / unanswered
}

export function buildRows(session: SessionState): ReviewRow[] {
  const rows: ReviewRow[] = []
  session.cases.forEach((c, i) => {
    const dc = DEMO_CASES[i]
    const touched = pickCount(c.state, dc) > 0 || c.submitted
    if (!touched) return
    const s = c.state
    const t = c.timing
    // Report the wall clock the ledger actually measured; fall back to the legacy field for a
    // case carried over from a session that predates the ledger.
    const wallSeconds = t.wallMs > 0 ? msToSeconds(t.wallMs) : c.durationSeconds
    const activeSeconds = msToSeconds(t.acc.activeMs)
    const idleSeconds = msToSeconds(t.acc.idleMs)
    for (const r of dc.responses) {
      // The 4 subjective-quality Likert dimensions, once per response.
      for (const dim of RUBRIC_DIMENSIONS) {
        rows.push({
          reviewer: session.reviewer,
          case_id: dc.case_id,
          query_id: dc.query_id,
          response_label: r.label,
          batch: dc.batch ?? '',
          response_sha: textFingerprint(r.markdown),
          kind: 'likert',
          dimension: dim.key,
          value: likertValueCell(s.likert[likertKey(r.label, dim.key)] ?? null),
          submitted_at: c.submittedAt,
          duration_seconds: wallSeconds,
          active_seconds: activeSeconds,
          idle_seconds: idleSeconds,
          response_active_seconds: msToSeconds(t.perResponseMs[r.label] ?? 0),
          rubric_version: RUBRIC_VERSION,
          response_text: r.markdown,
        })
      }
    }
  })
  return rows
}

export function toJSON(session: SessionState): string {
  return JSON.stringify(
    {
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      reviewer: session.reviewer,
      reviews: buildRows(session),
    },
    null,
    2,
  )
}

// RFC-4180: quote any field containing , " CR or LF; double embedded quotes.
// Excel CSV-injection guard: prefix a leading = + - @ with a single quote.
export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCSV(session: SessionState): string {
  const rows = buildRows(session)
  const lines = [COLUMNS.join(',')]
  for (const r of rows) lines.push(COLUMNS.map((c) => escapeCSV(r[c])).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n' // UTF-8 BOM + CRLF terminators
}

export function downloadText(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename // neutral filename — no source tokens
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Client-side export of the session's ratings to JSON and CSV.
//
// LIKERT-ONLY schema (v6, LONG / TIDY format): one row per (case, response, Likert dimension).
// The `kind` column is kept ('likert' on every row) for forward compatibility with future
// side-by-side comparison metrics. The per-row `arm` is the UNBLINDING KEY, carried only in the
// export and never rendered — so the export is offered ONLY on the completion screen.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { pickCount } from './reducer'
import { RUBRIC_DIMENSIONS } from './rubric-config'
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
  'arm', // UNBLINDING KEY — source arm for this response
  'kind', // 'likert' (reserved for future comparison-metric row kinds)
  'dimension', // context | justifiability | personalization | harm
  'value', // 1–5 ; '' (unanswered)
  'submitted_at',
  // TIMING (v8). `duration_seconds` keeps its original wall-clock meaning so pre-v8 analysis
  // scripts stay valid; the new columns are APPENDED, never reordered. All are case-level facts
  // except response_active_seconds, which is per (case, response).
  'duration_seconds', // wall clock, entry -> submit (unchanged definition)
  'active_seconds', // wall clock minus time hidden/idle — real time-on-task
  'idle_seconds', // the remainder; active + idle == duration (up to rounding)
  'response_active_seconds', // active seconds attributed to THIS response card
]

export type ReviewRow = Record<string, string | number | boolean | null>

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
          arm: r.arm, // unblinding key
          kind: 'likert',
          dimension: dim.key,
          value: likertValueCell(s.likert[likertKey(r.label, dim.key)] ?? null),
          submitted_at: c.submittedAt,
          duration_seconds: wallSeconds,
          active_seconds: activeSeconds,
          idle_seconds: idleSeconds,
          response_active_seconds: msToSeconds(t.perResponseMs[r.label] ?? 0),
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

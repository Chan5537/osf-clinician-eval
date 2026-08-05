// Client-side export of the session's ratings to JSON and CSV.
//
// WEIGHTED-BOOLEAN schema (LONG / TIDY format): one row per (case, response, atom). Because the
// atom set is per-response and per-case-varying, a fixed wide grid no longer fits — long format is
// the natural shape and the arm map collapses to a single per-row `arm` (the UNBLINDING KEY, carried
// only in the export, never rendered). The export carries the un-blinding key and is therefore
// offered ONLY on the completion screen.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { pickCount } from './reducer'
import { DEMO_CASES } from '@/data/demo-cases'
import { atomKey } from './types'
import type { AtomScore } from './types'

// One row per (case, response, atom). `value` is the clinician's answer; `arm` is the unblinding key.
const COLUMNS: string[] = [
  'reviewer',
  'case_id',
  'query_id',
  'response_label', // blinded A/B/C the clinician saw
  'arm', // UNBLINDING KEY — source arm for this response
  'atom_id',
  'criterion',
  'axis',
  'weight',
  'value', // 1 (Yes) / 0 (No) / NA / '' (unanswered)
  'submitted_at',
  'duration_seconds',
]

export type ReviewRow = Record<string, string | number | boolean | null>

function valueCell(v: AtomScore): string | number {
  if (v === 'NA') return 'NA'
  if (v === 0 || v === 1) return v
  return '' // null / unanswered
}

export function buildRows(session: SessionState): ReviewRow[] {
  const rows: ReviewRow[] = []
  session.cases.forEach((c, i) => {
    const dc = DEMO_CASES[i]
    const touched = pickCount(c.state, dc) > 0 || c.submitted
    if (!touched) return
    const s = c.state
    for (const r of dc.responses) {
      for (const a of r.atoms) {
        if (a.placeholder) continue // padding rows are not scored — omit from the export
        rows.push({
          reviewer: session.reviewer,
          case_id: dc.case_id,
          query_id: dc.query_id,
          response_label: r.label,
          arm: r.arm, // unblinding key
          atom_id: a.id,
          criterion: a.criterion,
          axis: a.axis,
          weight: a.weight,
          value: valueCell(s[atomKey(r.label, a.id)] ?? null),
          submitted_at: c.submittedAt,
          duration_seconds: c.durationSeconds,
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

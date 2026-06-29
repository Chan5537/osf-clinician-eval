// Client-side export of the session's ratings to JSON and CSV.
//
// SensorFM-aligned schema: one row per touched case, carrying the 15 Likert scores
// (5 dimensions × 3 responses) + their optional notes, plus the un-blinding ARM MAP
// (a_arm/b_arm/c_arm = which source arm each displayed Response A/B/C actually was).
// The export carries the un-blinding key and is therefore offered ONLY on the
// completion screen.

import type { SessionState } from './session'
import { SCHEMA_VERSION } from './session'
import { pickCount, scoreKey, noteKey } from './reducer'
import { RUBRIC_DIMENSIONS } from './rubric-config'
import { DEMO_CASES } from '@/data/demo-cases'
import type { ResponseSlot, ArmId } from './types'

const SLOTS: ResponseSlot[] = ['a', 'b', 'c']

// Fixed metadata columns + arm map, then the dimension×slot score/note columns.
const META_COLUMNS = ['reviewer', 'case_id', 'query_id', 'a_arm', 'b_arm', 'c_arm'] as const
const TAIL_COLUMNS = ['submitted_at', 'duration_seconds'] as const

// Programmatic score/note column list, grouped BY DIMENSION (matches the rating order:
// all responses for one dimension before the next): context_a, context_a_note, context_b, ...
const SCORE_NOTE_COLUMNS: string[] = RUBRIC_DIMENSIONS.flatMap((d) =>
  SLOTS.flatMap((s) => [scoreKey(d.key, s), noteKey(d.key, s)]),
)

const COLUMNS: string[] = [...META_COLUMNS, ...SCORE_NOTE_COLUMNS, ...TAIL_COLUMNS]

export type ReviewRow = Record<string, string | number | boolean | null>

export function buildRows(session: SessionState): ReviewRow[] {
  const rows: ReviewRow[] = []
  session.cases.forEach((c, i) => {
    const touched = pickCount(c.state) > 0 || c.submitted
    if (!touched) return
    const dc = DEMO_CASES[i]
    const s = c.state

    // Arm map: which source arm each displayed slot (a/b/c) actually was. responses[]
    // is in display order (A,B[,C]); index 0->a, 1->b, 2->c. This is the unblinding key.
    const armBySlot: Record<ResponseSlot, ArmId | null> = { a: null, b: null, c: null }
    dc.responses.forEach((r, idx) => {
      const slot = SLOTS[idx]
      if (slot) armBySlot[slot] = r.arm
    })

    const row: ReviewRow = {
      reviewer: session.reviewer,
      case_id: dc.case_id,
      query_id: dc.query_id,
      a_arm: armBySlot.a,
      b_arm: armBySlot.b,
      c_arm: armBySlot.c,
      submitted_at: c.submittedAt, // recorded at Submit, never synthesized at export
      duration_seconds: c.durationSeconds,
    }
    for (const d of RUBRIC_DIMENSIONS) {
      for (const slot of SLOTS) {
        row[scoreKey(d.key, slot)] = s[scoreKey(d.key, slot)]
        row[noteKey(d.key, slot)] = s[noteKey(d.key, slot)]
      }
    }
    rows.push(row)
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

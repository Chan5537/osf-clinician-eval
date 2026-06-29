// Type system for the SleepFM v2 clinician evaluation.
//
// SensorFM-aligned rubric (Survey ED.1): 5 dimensions
// (Context, Personalization, Justifiability, Relevance, Harm), each scored on a
// 5-point Likert for EVERY response (A/B/C), grouped by dimension. = 15 picks.
//
// A case carries an ORDERED, pre-blinded, pre-shuffled array of responses, so the
// UI never assumes a fixed number of arms (2 or 3) and never sees source identity.

export type LikertScore = 1 | 2 | 3 | 4 | 5 | null

// Blinded display letter the clinician sees; assigned by the exporter after shuffle.
export type ResponseLabel = 'A' | 'B' | 'C'
// Source arm — the UNBLINDING KEY. Carried in data + export only; NEVER rendered.
export type ArmId = 'A' | 'B' | 'C'
// Lowercase rubric slot, positionally derived from display label (A->a, B->b, C->c).
export type ResponseSlot = 'a' | 'b' | 'c'

export interface ResponseEntry {
  label: ResponseLabel // blinded display letter (A/B/C)
  markdown: string // the rendered patient-facing letter
  arm: ArmId // source arm — unblinding key, never surfaced in the UI
}

export interface Demographics {
  age: number
  sex: 'F' | 'M'
  bmi: number
  race: string
}

export interface DemoCase {
  case_id: string
  demographics: Demographics
  ehr_history: string[] // e.g. "Essential hypertension (I10)"
  query_id: string
  query_text: string
  responses: ResponseEntry[] // ordered by display label A,B[,C]; length 2 or 3
}

export type RubricDimension =
  | 'context'
  | 'personalization'
  | 'justifiability'
  | 'relevance'
  | 'harm'

// RubricState is a flat grid: one Likert score + one optional note per
// (dimension, slot). Keys are `${dim}_${slot}` and `${dim}_${slot}_note`, e.g.
// `context_a`, `context_a_note`, ... `harm_c`, `harm_c_note`. Flat keying keeps
// the existing SET_PICK/SET_NOTE reducer and the storage sanitizer working.
export type RubricScoreKey = `${RubricDimension}_${ResponseSlot}`
export type RubricNoteKey = `${RubricScoreKey}_note`

export type RubricState = {
  [K in RubricScoreKey]: LikertScore
} & {
  [K in RubricNoteKey]: string
}

export type RubricAction =
  | { type: 'SET_PICK'; axis: RubricScoreKey; value: LikertScore }
  | { type: 'SET_NOTE'; axis: RubricNoteKey; value: string }
  | { type: 'RESET' }

// Type system for the OSF clinician evaluation.
//
// WEIGHTED-BOOLEAN rubric: each response is scored on its OWN per-response checklist of atoms
// (Yes / No / N/A), grouped by category (sleep-index, disease, safety). The atoms differ per
// response (per-response-mentioned diseases) and are supplied by the data (responses[i].atoms),
// not hardcoded — so the rubric is data-driven and stays in sync with the scoring sheet.
//
// A case carries an ORDERED, pre-blinded, pre-shuffled array of responses, so the UI never assumes
// a fixed number of arms (2 or 3) and never sees source identity.

// Blinded display letter the clinician sees; assigned by the exporter after shuffle.
export type ResponseLabel = 'A' | 'B' | 'C'
// Source arm — the UNBLINDING KEY. Carried in data + export only; NEVER rendered.
export type ArmId = 'A' | 'B' | 'C'

// A single weighted-boolean rubric atom (one Yes/No/NA question about a response).
export interface RubricAtom {
  id: string // stable per-response id, e.g. "A2__overnight_breathing_ahi_spo2" or "S1"
  criterion: string // atom family: A2/A5 (sleep-index), D2/D3/D5/D6 (disease), S1/S2/S3 (safety), PAD
  axis: string // reporting axis: 'sleep_index' | 'incremental_value' | 'disease' | 'safety'
  question: string // the rater-facing Yes/No question
  weight: number // signed weight (+1 positive, -1 defect, 0 for padding)
  element?: string // the data element this atom is about (slot label / disease name) — UI highlights it
  placeholder?: boolean // true = a blinding-pad atom (locked N/A, never scored)
}

export interface ResponseEntry {
  label: ResponseLabel // blinded display letter (A/B/C)
  markdown: string // the rendered patient-facing letter
  arm: ArmId // source arm — unblinding key, never surfaced in the UI
  atoms: RubricAtom[] // this response's weighted-boolean checklist (data-driven, per-response)
}

export interface Demographics {
  age: number
  sex: 'F' | 'M'
  bmi: number
  race: string
  bp?: string // blood pressure "systolic/diastolic" mmHg; present only when recorded
}

export interface DemoCase {
  case_id: string
  demographics: Demographics
  ehr_history: string[] // e.g. "Essential hypertension (I10)"
  query_id: string
  query_text: string
  responses: ResponseEntry[] // ordered by display label A,B[,C]; length 2 or 3
}

// A clinician's answer to one atom: Yes (1) / No (0) / N/A / not-yet-answered (null).
export type AtomScore = 0 | 1 | 'NA' | null

// HYBRID rubric (per Prof. Yang, 2026-08): each response is scored on BOTH
//   (1) 3 subjective-quality Likert scales (1–5), asked ONCE per response, and
//   (2) the data-driven boolean disease atoms (Yes/No/N/A), per response.
// A clinician's answer to one Likert dimension: 1–5, or null (not-yet-answered).
export type LikertScore = 1 | 2 | 3 | 4 | 5 | null

// The three subjective-quality dimensions scored once per response.
export type RubricDimension = 'justifiability' | 'personalization' | 'harm'

// Boolean-atom key: `${label}__${atomId}` (e.g. "A__S1",
// "B__D2__future_risk_of_essential_hypertension"). Built per case from responses[i].atoms —
// NOT a fixed compile-time product.
export type CheckKey = string
// Likert key: `${label}__${dimension}` (e.g. "A__safety"). Built per case from the
// present response labels × the 3 fixed dimensions.
export type LikertKey = string

// RubricState carries BOTH scoring parts, kept as two parallel data-driven maps so the boolean
// checklist and the Likert scales never collide in one namespace:
//   • atoms  — one AtomScore  per (responseLabel, atomId)      keyed by CheckKey
//   • likert — one LikertScore per (responseLabel, dimension)  keyed by LikertKey
export interface RubricState {
  atoms: Record<CheckKey, AtomScore>
  likert: Record<LikertKey, LikertScore>
}

// Build the storage/state key for one (response label, atom id).
export function atomKey(label: ResponseLabel, atomId: string): CheckKey {
  return `${label}__${atomId}`
}

// Build the storage/state key for one (response label, Likert dimension).
export function likertKey(label: ResponseLabel, dimension: RubricDimension): LikertKey {
  return `${label}__${dimension}`
}

export type RubricAction =
  | { type: 'SET_ATOM'; key: CheckKey; value: AtomScore }
  | { type: 'SET_LIKERT'; key: LikertKey; value: LikertScore }
  | { type: 'RESET' }

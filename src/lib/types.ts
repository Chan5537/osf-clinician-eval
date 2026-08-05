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

// RubricState is an OPEN, data-driven map: one AtomScore per (responseLabel, atomId), keyed
// `${label}__${atomId}` (e.g. "A__S1", "B__D2__future_risk_of_essential_hypertension"). The key
// set is built per case from responses[i].atoms — it is NOT a fixed compile-time product.
export type CheckKey = string
export type RubricState = Record<CheckKey, AtomScore>

// Build the storage/state key for one (response label, atom id).
export function atomKey(label: ResponseLabel, atomId: string): CheckKey {
  return `${label}__${atomId}`
}

export type RubricAction =
  | { type: 'SET_ATOM'; key: CheckKey; value: AtomScore }
  | { type: 'RESET' }

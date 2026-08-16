// Type system for the OSF clinician evaluation.
//
// LIKERT-ONLY rubric (v6, 2026-08-12): each response is scored on the 4 subjective-quality
// Likert scales (1–5) defined in rubric-config.ts, asked once per response. The former
// weighted-boolean atom checklist is no longer scored — the data still carries each response's
// `atoms` (the upstream exporter emits them and that file must not be edited), but the UI, the
// completion gate, and the export all ignore them.
//
// A case carries an ORDERED, pre-blinded, pre-shuffled array of responses, so the UI never assumes
// a fixed number of arms (2 or 3) and never sees source identity.

// Blinded display letter the clinician sees; assigned by the exporter after shuffle.
export type ResponseLabel = 'A' | 'B' | 'C'
// Source arm — the UNBLINDING KEY. Carried in data + export only; NEVER rendered.
export type ArmId = 'A' | 'B' | 'C'

// A single weighted-boolean rubric atom, as present in the generated data. IGNORED since v6 —
// kept only so the generated JSON keeps type-checking without edits.
export interface RubricAtom {
  id: string // stable per-response id, e.g. "A2__overnight_breathing_ahi_spo2" or "S1"
  criterion: string // atom family: A2/A5 (sleep-index), D2/D3/D5/D6 (disease), S1/S2/S3 (safety), PAD
  axis: string // reporting axis: 'sleep_index' | 'incremental_value' | 'disease' | 'safety'
  question: string // the rater-facing Yes/No question
  weight: number // signed weight (+1 positive, -1 defect, 0 for padding)
  element?: string // the data element this atom is about (slot label / disease name)
  placeholder?: boolean // true = a blinding-pad atom
}

export interface ResponseEntry {
  label: ResponseLabel // blinded display letter (A/B/C)
  markdown: string // the rendered patient-facing letter
  arm: ArmId // source arm — unblinding key, never surfaced in the UI
  atoms: RubricAtom[] // present in the data; ignored since v6 (Likert-only rubric)
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
  // Organ category the case is scoped to (canonical, e.g. "circulatory system"). Drives the Patient
  // Panel's category-filtered sleep-vitals chart. Emitted by the exporter from the record's `group`.
  category: string
  demographics: Demographics
  ehr_history: string[] // e.g. "Essential hypertension (I10)"
  query_id: string
  query_text: string
  responses: ResponseEntry[] // ordered by display label A,B[,C]; length 2 or 3
}

// A clinician's answer to one Likert dimension: 1–5, or null (not-yet-answered).
export type LikertScore = 1 | 2 | 3 | 4 | 5 | null

// The four subjective-quality dimensions scored once per response.
export type RubricDimension = 'context' | 'justifiability' | 'personalization' | 'relevance' | 'harm'

// Likert key: `${label}__${dimension}` (e.g. "A__harm"). Built per case from the
// present response labels × the fixed dimensions.
export type LikertKey = string

// The whole scoring state of one case: one LikertScore per (responseLabel, dimension).
export interface RubricState {
  likert: Record<LikertKey, LikertScore>
}

// Build the storage/state key for one (response label, Likert dimension).
export function likertKey(label: ResponseLabel, dimension: RubricDimension): LikertKey {
  return `${label}__${dimension}`
}

export type RubricAction =
  | { type: 'SET_LIKERT'; key: LikertKey; value: LikertScore }
  | { type: 'RESET' }

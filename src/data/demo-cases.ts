import type { DemoCase } from '@/lib/types'
import raw from './demo-cases.generated.json'

// Case data is GENERATED, not hand-authored. The Python emitter
// (osf-human-eval: scripts/export_calibrated_batch_to_ui.py) renders each arm's letter, embeds the
// sleep figure as a base64 data-URI, shuffles display order per case, joins the medical history, and
// writes demo-cases.generated.json. The app cycles through every entry in DEMO_CASES.
//
// SOURCE-BLINDING RULE: each response's `markdown` must never contain the strings Agent, Base,
// GPT, Gemini, OSF, tool, ReAct, oracle, or "ground truth". The arm identity lives only in
// `responses[i].arm` (the unblinding key) and is NEVER surfaced in the UI — only `label` +
// `markdown` are rendered. Display order is shuffled in the emitter so card position carries no
// source signal. If you change case content or count, bump SCHEMA_VERSION in src/lib/session.ts.

// Sprint/dev knob: `VITE_CASE_LIMIT=5 npm run dev` serves only the first N cases for faster
// iteration. Unset (the default — CI/production never sets it) serves the full batch.
const CASE_LIMIT = Number(import.meta.env.VITE_CASE_LIMIT) || 0

// BLOCKS (2026-09-02). A 100-patient batch is 100 x 3 x 5 = 1500 Likert answers — three to
// five hours, which nobody scores in one sitting. `?block=2` serves the second slice of
// BLOCK_SIZE cases, so each rater's unit of work is finishable and exportable on its own.
// The slicing is by position in the batch, which is stable: the emitter writes cases in
// case_id order. Blocks are free on the analysis side — the decoder joins on case_id, so
// scores from different blocks pool without any extra bookkeeping.
export const BLOCK_SIZE = 25

function blockFromUrl(): number {
  try {
    const n = Number(new URLSearchParams(window.location.search).get('block'))
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

const ALL = raw as DemoCase[]
export const TOTAL_BLOCKS = Math.ceil(ALL.length / BLOCK_SIZE)
// Out-of-range block -> the whole batch, never an empty case set: DEMO_CASES[i] is read
// unguarded all over the app, so an empty slice is a blank screen. Serving everything is
// visibly different from a 25-case block (no Block chip in the header), so a mistyped URL
// announces itself instead of silently handing out someone else's slice.
const requested = blockFromUrl()
export const BLOCK = requested > 0 && requested <= TOTAL_BLOCKS ? requested : 0
if (requested > 0 && BLOCK === 0) {
  console.warn(`block=${requested} is out of range (1-${TOTAL_BLOCKS}); serving the whole batch`)
}
const sliced = BLOCK > 0 ? ALL.slice((BLOCK - 1) * BLOCK_SIZE, BLOCK * BLOCK_SIZE) : ALL

export const DEMO_CASES = CASE_LIMIT > 0 ? sliced.slice(0, CASE_LIMIT) : sliced

// Which letter set is loaded, and which slice of it. Both go into the storage key: case_ids
// restart at HSP_v7_000 in every batch, so a stored answer is only meaningful next to the
// batch it was given in.
export const BATCH: string = ALL[0]?.batch ?? ''
export const BLOCK_ID = BLOCK > 0 ? `b${BLOCK}` : 'all'

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
//
// 2026-10-08 (Prof. Yang): 5 clinicians, each patient rated by 3, each clinician rates 60. So the
// 100 cases are 5 blocks of 20 (each block = 4 patients per area, because gap60 cycles the five
// areas every 5 ids), and each clinician is assigned 3 blocks — see SLOT_BLOCKS.
export const BLOCK_SIZE = 20

// RATER SLOTS (2026-10-08). Each clinician gets a personal link carrying `?slot=N` (1..5). The
// slot decides which 3 blocks they score, following Zitao's assignment sheet ("OSF - Clinical
// Evaluation Splitting"): block k is rated by slots k, k+1, k+2 (mod 5). Every block therefore has
// exactly 3 raters, every slot exactly 3 blocks (60 cases), and every pair of slots shares 1 or 2
// blocks — the overlap the reliability analysis needs.
//
// ⚠️ MIRRORED IN SQL: supabase/migrations/009_rater_slot.sql (public.slot_covers_case) computes the
// same rotation for the completion trigger. Change both or neither.
export const N_SLOTS = 5
export const SLOT_BLOCKS: Record<number, number[]> = {
  1: [1, 4, 5],
  2: [1, 2, 5],
  3: [1, 2, 3],
  4: [2, 3, 4],
  5: [3, 4, 5],
}

function intParam(name: string): number {
  try {
    const n = Number(new URLSearchParams(window.location.search).get(name))
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

// The slot named in the URL. 0 = none (or invalid). The server copy on rater.slot is authoritative
// once claimed; App reconciles the two after sign-in (see lib/slot.ts).
const requestedSlot = intParam('slot')
export const SLOT = requestedSlot >= 1 && requestedSlot <= N_SLOTS ? requestedSlot : 0

const ALL = raw as DemoCase[]
export const TOTAL_BLOCKS = Math.ceil(ALL.length / BLOCK_SIZE)
// Out-of-range block -> the whole batch, never an empty case set: DEMO_CASES[i] is read
// unguarded all over the app, so an empty slice is a blank screen. Serving everything is
// visibly different from a block (no Block chip in the header), so a mistyped URL
// announces itself instead of silently handing out someone else's slice.
const requested = intParam('block')
// A block outside this slot's assignment is refused exactly like an out-of-range one: the landing
// screen's picker (which only offers the slot's own blocks) is the way back in.
const inSlot = (b: number) => SLOT === 0 || (SLOT_BLOCKS[SLOT] ?? []).includes(b)
export const BLOCK =
  requested > 0 && requested <= TOTAL_BLOCKS && inSlot(requested) ? requested : 0
if (requested > 0 && BLOCK === 0 && import.meta.env.VITE_APP_MODE !== 'clinician') {
  // Dev only: a console message is developer instrumentation, and the visible
  // absence of the Block chip already announces the fallback to everyone else.
  console.warn(`block=${requested} is out of range (1-${TOTAL_BLOCKS}) or not in slot ${SLOT}`)
}
const sliced = BLOCK > 0 ? ALL.slice((BLOCK - 1) * BLOCK_SIZE, BLOCK * BLOCK_SIZE) : ALL

// A batch larger than one block is only ever scored a block at a time (Chan, 2026-10-06): without
// ?block= the app stays on the landing screen, where the block buttons are the only way in. A
// session therefore never holds more than BLOCK_SIZE cases, so the per-case dots always fit.
export const MUST_CHOOSE_BLOCK = TOTAL_BLOCKS > 1 && BLOCK === 0

export const DEMO_CASES = CASE_LIMIT > 0 ? sliced.slice(0, CASE_LIMIT) : sliced

// What this rater is assigned: their slot's blocks, or every block when no slot is named (dev).
export const ASSIGNED_BLOCKS: number[] =
  SLOT > 0 ? (SLOT_BLOCKS[SLOT] ?? []) : Array.from({ length: TOTAL_BLOCKS }, (_, i) => i + 1)
export const ASSIGNED_CASE_COUNT = ALL.filter((_, i) =>
  ASSIGNED_BLOCKS.includes(Math.floor(i / BLOCK_SIZE) + 1),
).length

// Which letter set is loaded, and which slice of it. Both go into the storage key: case_ids
// restart at HSP_v7_000 in every batch, so a stored answer is only meaningful next to the
// batch it was given in.
export const BATCH: string = ALL[0]?.batch ?? ''
export const BLOCK_ID = BLOCK > 0 ? `b${BLOCK}` : 'all'

// The key of this block's row in session_state. One row per (rater, batch, BLOCK): with a single
// row per (rater, batch), finishing block 1 and opening block 2 restored block 1's answers onto
// block 2's cases (sanitizeSession matched them by position) — as SUBMITTED, because the side with
// more submitted cases wins reconcile(). session_state.batch is free text with no foreign key, so
// the block rides in it; `rating` rows keep the plain BATCH.
export const SESSION_BATCH = BLOCK > 0 ? `${BATCH}::${BLOCK_ID}` : BATCH

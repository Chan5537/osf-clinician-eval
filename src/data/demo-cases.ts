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

export const DEMO_CASES = raw as DemoCase[]

import type { Dispatch, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RubricRefLink } from '@/components/RubricRefLink'
import { atomKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { RubricState, RubricAction, AtomScore, ResponseEntry, RubricAtom } from '@/lib/types'

// Render an atom question with two emphases so it's fast to scan:
//   • the DATA ELEMENT the question is about (the sleep-slot label "overnight breathing (AHI, SpO2)",
//     "sleep stage (N1, N2, N3, REM)", "sleep continuity (TST, ...)", or a disease name like
//     "Essential hypertension") -> highlighted chip. This is the exact `element` string from the data,
//     so it matches whatever is actually in the question — no guessing.
//   • ALL-CAPS emphasis words (CONNECTS, NONRELEVANT, OVER-TREAT, SPECIFIC, NOT RELEVANT ...) -> bold.
const CAPS_RUN = /\b([A-Z][A-Z]+(?:[-\s]+[A-Z][A-Z]+)*)\b/g // 2+ consecutive all-caps words

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Bold every ALL-CAPS emphasis run inside a plain text segment.
function boldCaps(segment: string, kb: string): ReactNode[] {
  const out: ReactNode[] = []
  let li = 0
  let m: RegExpExecArray | null
  CAPS_RUN.lastIndex = 0
  while ((m = CAPS_RUN.exec(segment)) !== null) {
    if (m.index > li) out.push(segment.slice(li, m.index))
    out.push(
      <strong key={`b${kb}-${m.index}`} className="font-semibold">
        {m[0]}
      </strong>,
    )
    li = m.index + m[0].length
  }
  if (li < segment.length) out.push(segment.slice(li))
  return out
}

function renderQuestion(text: string, element?: string): ReactNode[] {
  // Highlight EVERY occurrence of the known data element; bold caps-runs in the segments between.
  if (!element || !element.trim()) return boldCaps(text, 'q')
  const re = new RegExp(escapeRegExp(element.trim()), 'gi')
  const nodes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(...boldCaps(text.slice(last, m.index), String(last)))
    nodes.push(
      <span
        key={`el${m.index}`}
        className="rounded bg-primary/10 px-1 font-semibold text-primary"
      >
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
    if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-width matches
  }
  if (last < text.length) nodes.push(...boldCaps(text.slice(last), String(last)))
  return nodes
}

interface Props {
  state: RubricState
  dispatch: Dispatch<RubricAction>
  // The present responses for THIS case (blinded A/B[/C]), each carrying its own atom checklist.
  responses: ResponseEntry[]
}

// Human-facing category headers + order (by axis). Future-disease risk leads — it is the prediction's
// headline (the incremental value SleepFM adds), so the clinician scores it before the sleep-data read.
const AXIS_ORDER: string[] = ['incremental_value', 'disease', 'sleep_index', 'safety']
const AXIS_LABEL: Record<string, string> = {
  incremental_value: 'Future-disease risk',
  disease: 'Future-disease risk',
  sleep_index: 'Sleep-data interpretation',
  safety: 'Safety',
}

// Yes / No / N/A tri-state control for one atom.
function TriState({
  value,
  onSelect,
  disabled,
}: {
  value: AtomScore
  onSelect: (v: AtomScore) => void
  disabled?: boolean
}) {
  const opts: { v: AtomScore; label: string }[] = [
    { v: 1, label: 'Yes' },
    { v: 0, label: 'No' },
    { v: 'NA', label: 'N/A' },
  ]
  return (
    <div className="flex gap-1.5" role="group" aria-label="answer">
      {opts.map(({ v, label }) => {
        const selected = value === v
        return (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect(v)}
            className={cn('h-8 min-w-12 px-2 text-xs', selected && 'font-semibold')}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}

function AtomRow({
  label,
  atom,
  state,
  dispatch,
}: {
  label: ResponseEntry['label']
  atom: RubricAtom
  state: RubricState
  dispatch: Dispatch<RubricAction>
}) {
  const key = atomKey(label, atom.id)
  const value = state[key] ?? null
  const defect = atom.weight < 0
  return (
    <div className="flex items-start justify-between gap-4 border-t py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm leading-snug">{renderQuestion(atom.question, atom.element)}</p>
        <span
          className={cn(
            'mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            defect
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary',
          )}
        >
          {defect ? 'flag if present' : 'positive'}
        </span>
      </div>
      <div className="shrink-0">
        <TriState value={value} onSelect={(v) => dispatch({ type: 'SET_ATOM', key, value: v })} />
      </div>
    </div>
  )
}

function ResponseChecklist({
  response,
  state,
  dispatch,
}: {
  response: ResponseEntry
  state: RubricState
  dispatch: Dispatch<RubricAction>
}) {
  const real = response.atoms.filter((a) => !a.placeholder)
  const answered = real.filter((a) => {
    const v = state[atomKey(response.label, a.id)]
    return v === 0 || v === 1 || v === 'NA'
  }).length
  const complete = answered === real.length

  // group by axis, in AXIS_ORDER; skip empty groups. Merge incremental_value+disease under one header.
  const groups = AXIS_ORDER.map((axis) => ({
    axis,
    label: AXIS_LABEL[axis] ?? axis,
    atoms: real.filter((a) => a.axis === axis),
  })).filter((g) => g.atoms.length > 0)
  // de-dupe consecutive identical headers (incremental_value + disease both -> "Future-disease risk")
  const merged: { label: string; atoms: RubricAtom[] }[] = []
  for (const g of groups) {
    const last = merged[merged.length - 1]
    if (last && last.label === g.label) last.atoms.push(...g.atoms)
    else merged.push({ label: g.label, atoms: [...g.atoms] })
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Response {response.label}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            complete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {answered} of {real.length} answered
        </span>
      </div>
      <div className="space-y-4 px-4 py-3">
        {merged.map((g) => (
          <div key={g.label}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            <div>
              {g.atoms.map((atom) => (
                <AtomRow
                  key={atom.id}
                  label={response.label}
                  atom={atom}
                  state={state}
                  dispatch={dispatch}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Weighted-boolean rubric: each blinded response is scored on its OWN checklist of Yes/No/N/A atoms
// (data-driven, per-response), grouped by category. Positive atoms reward; defect atoms are flagged
// only if present. The clinician answers every atom (N/A when it doesn't apply) to submit.
export function ChecklistRubric({ state, dispatch, responses }: Props) {
  // total required atoms across all responses (excludes blinding placeholders)
  const totalRequired = requiredKeysForCount(responses)
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Clinical quality rubric</h2>
          <p className="text-xs text-muted-foreground">
            For each response, mark every item Yes, No, or N/A (when it doesn&apos;t apply).{' '}
            {totalRequired} items in total.
          </p>
        </div>
        <RubricRefLink />
      </div>

      {responses.map((r) => (
        <ResponseChecklist key={r.label} response={r} state={state} dispatch={dispatch} />
      ))}
    </section>
  )
}

// Count of required (non-placeholder) atoms across the present responses.
function requiredKeysForCount(responses: ResponseEntry[]): number {
  return responses.reduce((n, r) => n + r.atoms.filter((a) => !a.placeholder).length, 0)
}

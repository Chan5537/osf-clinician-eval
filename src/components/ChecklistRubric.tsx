import type { Dispatch, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RubricRefLink } from '@/components/RubricRefLink'
import { atomKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { RubricState, RubricAction, AtomScore, ResponseEntry, RubricAtom } from '@/lib/types'

// Render an atom question with two emphases so it's fast to scan:
//   • ALL-CAPS emphasis words (CONNECTS, NONRELEVANT, OVER-TREAT, SPECIFIC, DO NOT ...) -> bold
//   • data mentions — a parenthetical listing measurement acronyms, e.g. "(AHI, SpO2)" or
//     "(N1, N2, N3, REM)" -> highlighted chip. Prose parentheticals ("(if a calibrated risk is
//     shown)") are left plain — only parentheticals whose contents are mostly acronym/number tokens.
const CAPS_RUN = /\b([A-Z][A-Z]+(?:[-\s]+[A-Z][A-Z]+)*)\b/g // 2+ consecutive all-caps words
const DATA_PAREN = /\(([^)]*)\)/g

function looksLikeData(inner: string): boolean {
  const tokens = inner
    .split(/[,\s/]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return false
  // a data mention: most tokens are short acronym/number-ish (e.g. AHI, SpO2, N1, ODI, REM, TST)
  const dataish = tokens.filter((t) => /^[A-Za-z]{1,5}\d*$/.test(t) && /[A-Z0-9]/.test(t)).length
  return dataish >= Math.ceil(tokens.length / 2) && dataish >= 1
}

function renderQuestion(text: string): ReactNode[] {
  // First split out data-parentheticals, then bold caps-runs within the plain segments.
  const nodes: ReactNode[] = []
  let last = 0
  const boldCaps = (segment: string, kb: number): ReactNode[] => {
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
  let dm: RegExpExecArray | null
  DATA_PAREN.lastIndex = 0
  while ((dm = DATA_PAREN.exec(text)) !== null) {
    const inner = dm[1]
    if (!looksLikeData(inner)) continue // leave prose parentheticals to the caps-bolding pass
    if (dm.index > last) nodes.push(...boldCaps(text.slice(last, dm.index), last))
    nodes.push(
      <span
        key={`d${dm.index}`}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        {dm[0]}
      </span>,
    )
    last = dm.index + dm[0].length
  }
  if (last < text.length) nodes.push(...boldCaps(text.slice(last), last))
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
        <p className="text-sm leading-snug">{renderQuestion(atom.question)}</p>
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

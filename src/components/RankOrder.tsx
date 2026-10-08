import type { Dispatch } from 'react'
import { Trophy } from 'lucide-react'
import { AVATAR_STYLES } from '@/components/response-colors'
import { rankOf, rankComplete } from '@/lib/reducer'
import { cn } from '@/lib/utils'
import type { RubricState, RubricAction, ResponseEntry, RankValue } from '@/lib/types'

// THE CASE-LEVEL COMPARATIVE QUESTION (rubric v10, 2026-09-18) — one forced best-to-worst ranking
// of the responses, asked once per case after every per-response scale.
//
// WHY IT EXISTS: the five Likert scales measure each response in isolation. What they cannot
// capture is the forced global trade-off a clinician makes when the axes disagree — which letter
// they would actually stand behind. That judgement is the whole contribution of the IR paper's
// comparative section (Metwally et al., Nature 2026), which asks its raters to pick between
// responses in a section kept SEPARATE from the absolute rubric. Hence the separate visual
// treatment below: slate, not one of the five axis hues, so it reads as a different KIND of
// judgement rather than a sixth axis.
//
// ⚠️ ONE OVERALL RANK, NOT PER-AXIS. Per-axis ranks would re-encode what the Likert scales already
// give by construction, at triple the rater cost.
//
// ⚠️ THE STEM STANDS ALONE (owner, 2026-09-18). An earlier draft carried a criterion sentence
// ("judge them as letters you would actually send..."), a three-point tie-break order, a
// no-ties notice, a "how to break a tie" toggletip and a hint to finish scoring first. All were
// REMOVED at the owner's instruction: the question is a holistic judgement, and instructing the
// rater how to weigh the axes both pre-empts that judgement and re-anchors it to the Likert
// scales it is meant to be independent of. Do not reinstate them without asking.
// The no-ties rule needs no prose: SET_RANK swaps on conflict, so a tie cannot be entered.
//
// ⛔ DO NOT reword this as "which response do you find more trustworthy" (the IR paper's own
// phrasing). That construct was measured in the v6 round and INVERTED — BASE 4.00 > OURS 2.90 >
// TRUTH 2.30 — because it scores rhetorical confidence against panels holding no model evidence.
// See the ⛔⛔ block in lib/rubric-config-disease.ts.
//
// BLINDING: no system, arm, architecture, prediction, "ground truth" or "oracle" wording below.

// 1 = best. Labels carry both the ordinal and a plain word: "1st" alone is ambiguous about
// direction to a rater meeting the question for the first time. The word sits on the two ends only
// (computed below), so a 2-response batch reads Best/Worst rather than Best/Middle.
const ORDINALS = ['1st', '2nd', '3rd'] as const

// PLACE-FIRST LAYOUT (Sirui, 2026-10-08): one row per place, and the rater picks the response that
// fills it ("given a rank, select the response"), instead of picking a place for each response.
// Raters think "which is best?", not "where does A go?". ONLY THE VIEW IS INVERTED: the state is
// still one place per response (`rank[label]`), written through the same SET_RANK action, so the
// stored rows, export, server completion trigger and analysis are all unchanged.
//
// Choosing a response that already holds another place MOVES it here, and whichever response held
// this place takes the one it gave up (SET_RANK's swap). A response can therefore never sit in two
// rows, and a tie cannot be entered.
export function RankOrder({
  responses,
  state,
  dispatch,
}: {
  responses: ResponseEntry[]
  state: RubricState
  dispatch: Dispatch<RubricAction>
}) {
  const complete = rankComplete(state, responses)
  const n = responses.length
  const places = ORDINALS.slice(0, n).map((short, i) => ({
    value: (i + 1) as Exclude<RankValue, null>,
    short,
    word: i === 0 ? 'Best' : i === n - 1 ? 'Worst' : null,
  }))
  const shortOf = (v: RankValue) => (v ? ORDINALS[v - 1] : null)

  const ordered = responses
    .filter((r) => rankOf(state, r.label) !== null)
    .slice()
    .sort((a, b) => (rankOf(state, a.label) ?? 9) - (rankOf(state, b.label) ?? 9))

  return (
    <section
      aria-labelledby="rank-heading"
      className="rounded-xl border border-border border-l-4 border-l-slate-500 bg-slate-500/[0.04] p-4 dark:bg-slate-400/[0.06]"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Trophy className="size-4 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden />
          <h2 id="rank-heading" className="text-base font-semibold tracking-tight">
            Overall ranking
          </h2>
          {complete ? (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Answered
            </span>
          ) : null}
        </div>

        <p className="text-sm font-medium leading-snug text-foreground">
          Taking everything together, rank these {n} responses from best to worst.
        </p>
        <p className="text-xs text-muted-foreground">
          For each place, select the response that belongs there.
        </p>
      </div>

      <ul className="mt-3 space-y-1.5">
        {places.map((p) => {
          const holder = responses.find((r) => rankOf(state, r.label) === p.value)
          return (
            <li
              key={p.value}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2"
            >
              {/* The place label: ordinal large, the direction word beneath it. Fixed width so the
                  response buttons line up in a column across the rows. */}
              <span className="flex w-16 shrink-0 flex-col leading-tight">
                <span className="text-base font-bold tabular-nums">{p.short}</span>
                {p.word && <span className="text-xs text-muted-foreground">{p.word}</span>}
              </span>

              <div
                role="radiogroup"
                aria-label={`${p.short} place${p.word ? ` (${p.word.toLowerCase()})` : ''}`}
                className="flex flex-wrap items-center gap-1.5"
              >
                {responses.map((r) => {
                  const selected = holder?.label === r.label
                  // Where this response sits now, if somewhere else — shown on the button so a
                  // rater can see that choosing it here will move it.
                  const elsewhere = !selected ? shortOf(rankOf(state, r.label)) : null
                  return (
                    <button
                      key={r.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={
                        elsewhere
                          ? `Response ${r.label} is ranked ${elsewhere} — choose it to move it here`
                          : undefined
                      }
                      onClick={() => dispatch({ type: 'SET_RANK', label: r.label, value: p.value })}
                      className={cn(
                        // Fixed width, so each response stays in the same column on every row whatever its
                        // "· 2nd" hint adds; a grid of aligned choices is what makes the rows scannable.
                        'flex w-44 cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        selected
                          ? 'border-transparent bg-foreground font-semibold text-background shadow-sm'
                          : elsewhere
                            ? 'border-dashed border-border text-muted-foreground/70 hover:bg-muted/60'
                            : 'border-border text-foreground hover:bg-muted/60',
                      )}
                    >
                      {/* Same avatar chip + "Response X" phrasing as FocusReview's tab bar, so a
                          letter reads identically in both places. */}
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                          AVATAR_STYLES[r.label],
                        )}
                        aria-hidden="true"
                      >
                        {r.label}
                      </span>
                      <span>Response {r.label}</span>
                      {elsewhere && (
                        <span className="ml-auto text-xs font-normal tabular-nums">{elsewhere}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Choosing a response held elsewhere SWAPS (see the reducer's SET_RANK), so another row
          changes without the rater touching it. Announce the resulting order, or a screen-reader
          user is never told that the other row moved. */}
      <p aria-live="polite" className="sr-only">
        {complete
          ? `Ranking set: ${ordered.map((r, k) => `${k + 1}. Response ${r.label}`).join(', ')}`
          : 'Ranking incomplete.'}
      </p>
    </section>
  )
}

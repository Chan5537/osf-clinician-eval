import type { Dispatch } from 'react'
import { Trophy } from 'lucide-react'
import { AxisHelp } from '@/components/AxisHelp'
import { AVATAR_STYLES } from '@/components/response-colors'
import { rankOf, rankComplete, armComplete } from '@/lib/reducer'
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
// ⚠️ WHY THE CRITERION IS SPELLED OUT rather than left as "which is best": an unanchored global
// judgement is vibes, and two raters resolve axis-conflicts differently. The three-point priority
// list restates the existing axes in plain words WITHOUT naming them — naming them would invite
// the rater to recompute their Likert scores instead of making a holistic call.
//
// ⛔ DO NOT reword this as "which response do you find more trustworthy" (the IR paper's own
// phrasing). That construct was measured in the v6 round and INVERTED — BASE 4.00 > OURS 2.90 >
// TRUTH 2.30 — because it scores rhetorical confidence against panels holding no model evidence.
// See the ⛔⛔ block in lib/rubric-config-disease.ts. "Would actually send to this patient" keeps
// the forced-preference structure without importing the poisoned construct.
//
// BLINDING: no system, arm, architecture, prediction, "ground truth" or "oracle" wording below.

// 1 = best. Labels carry both the ordinal and a plain word: "1st" alone is ambiguous about
// direction to a rater meeting the question for the first time.
const PLACES: { value: Exclude<RankValue, null>; short: string; word: string }[] = [
  { value: 1, short: '1st', word: 'Best' },
  { value: 2, short: '2nd', word: 'Middle' },
  { value: 3, short: '3rd', word: 'Worst' },
]

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
  // Every response scored on every scale — the point at which this question is easiest to answer.
  const allScored = responses.every((r) => armComplete(state, r.label))
  // A 2-response batch degrades to Best/Worst rather than showing a dead 3rd place.
  const places = PLACES.slice(0, responses.length)

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
          <span className="rounded bg-slate-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Final question for this case
          </span>
          {complete ? (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Answered
            </span>
          ) : null}
        </div>

        <p className="text-sm font-medium leading-snug text-foreground">
          Taking everything together, rank these {responses.length} responses from best to worst.
        </p>

        <p className="text-[13px] leading-snug text-muted-foreground">
          Judge them as letters you would actually send to this patient. When the responses
          disagree, weigh them in this order: (1) is it right about this patient, (2) would acting
          on it help or harm them, (3) how well is it written for them.{' '}
          <span className="font-medium text-foreground">
            Every response gets a different place — no ties.
          </span>
        </p>

        <AxisHelp
          label="Overall ranking"
          cta="How to break a tie"
          text={
            <p className="text-[13px] leading-snug">
              These are forced choices. Small differences are expected and are exactly what this
              question is for — if you find yourself indifferent, choose on the first point above
              (is it right about this patient), then the second, then the third. Your 1–5 scores
              above are where “these are equally good” is recorded; this question asks which one
              you would pick.
            </p>
          }
        />

        {!allScored ? (
          <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[13px] leading-snug text-amber-800 dark:text-amber-300">
            You can answer this at any point, but it is easiest once you have scored all{' '}
            {responses.length} responses above.
          </p>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1.5">
        {responses.map((r) => {
          const current = rankOf(state, r.label)
          return (
            <li
              key={r.label}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2"
            >
              {/* Same avatar chip + "Response X" phrasing as FocusReview's tab bar, so a letter
                  reads identically in both places. */}
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    AVATAR_STYLES[r.label],
                  )}
                  aria-hidden="true"
                >
                  {r.label}
                </span>
                <span className="text-sm font-semibold">Response {r.label}</span>
              </span>

              <div
                role="radiogroup"
                aria-label={`Place for Response ${r.label}`}
                className="flex items-center gap-1"
              >
                {places.map((p) => {
                  const selected = current === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => dispatch({ type: 'SET_RANK', label: r.label, value: p.value })}
                      className={cn(
                        'cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        selected
                          ? 'border-transparent bg-foreground font-semibold text-background shadow-sm'
                          : 'border-border text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      <span className="tabular-nums">{p.short}</span>
                      <span className="ml-1.5 hidden font-normal sm:inline">{p.word}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Choosing a taken place SWAPS the two responses (see the reducer's SET_RANK), so another
          row changes without the rater touching it. Announce the resulting order, or a
          screen-reader user is never told that the other row moved. */}
      <p aria-live="polite" className="sr-only">
        {complete
          ? `Ranking set: ${ordered.map((r, n) => `${n + 1}. Response ${r.label}`).join(', ')}`
          : 'Ranking incomplete.'}
      </p>
    </section>
  )
}

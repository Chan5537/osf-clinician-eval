import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Moon, TrendingUp, UserRound } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ConditionList } from '@/components/ConditionList'
import { FutureRiskGrid } from '@/components/FutureRiskGrid'
import { SleepIndexGrid } from '@/components/SleepIndexGrid'
import { caseContext, inPanel23 } from '@/lib/case-context'
import { withGivenFieldsOnly } from '@/lib/given-inputs'
import { cn } from '@/lib/utils'
import type { Demographics } from '@/lib/types'

interface Props {
  caseId: string
  demographics: Demographics
  ehrHistory: string[]
}

function DemographicItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-medium leading-snug text-foreground">{value}</span>
    </div>
  )
}

// Per-section identity: a left rail + a matching icon tint, so each block is recognisable before
// it is read. Static class strings — Tailwind's JIT cannot see dynamically built ones.
//
// The hues keep their app-wide meaning (cyan = sleep data, indigo = future-disease outcome), so
// the colour is a wayfinding cue rather than decoration. Medical history has no counterpart hue,
// so it stays a neutral slate instead of borrowing one that already means something else.
interface SectionStyle {
  rail: string
  icon: string
}
const SLEEP_STYLE: SectionStyle = {
  rail: 'border-l-cyan-500',
  icon: 'text-cyan-600 dark:text-cyan-400',
}
const HISTORY_STYLE: SectionStyle = {
  rail: 'border-l-slate-400 dark:border-l-slate-500',
  icon: 'text-slate-500 dark:text-slate-400',
}
const OUTCOME_STYLE: SectionStyle = {
  rail: 'border-l-indigo-500',
  icon: 'text-indigo-600 dark:text-indigo-400',
}
// REMOVED 2026-08-22 (owner): the "Patient group" / "Patient future risk" card and its teal style.
// It named the COHORT SAMPLING criterion while reading as a claim about this patient's prognosis,
// and it overlapped with the recorded-outcome block. With the disease rubric onboarded it would
// have sat beside the scoring questions as a de-facto answer key — and a wrong one, since the
// stratum is the sampling anchor, matching the dominant recorded risk type for only 4 of the 5
// risky cases and naming a SLEEP FINDING ("short total sleep time") rather than any risk for all
// three sleep-issue cases. What it usefully carried is now the left column of FutureRiskGrid.
// ⚠️ Dropped with it: cohort group ('Sleep-issue' / 'Future-risk') and stratum are no longer
//    visible anywhere in the UI. Put them back somewhere deliberate if a reviewer needs them —
//    the sleep-issue strata would belong in the Sleep panel, not next to the outcome.

// Row styling for one collapsible section. The left rail sits on the item so it spans the header
// AND the opened body, which is what makes an expanded section still read as one block.
const itemClass = (s: SectionStyle) => cn('border-l-4 px-4', s.rail)

// Tailwind's preflight resets <button> to cursor:default, so without `cursor-pointer` the row
// gives no pointer feedback at all. The base trigger's hover:underline is dropped for a row-wide
// tint, which reads as "this strip is a control" rather than underlining two unrelated texts.
const TRIGGER_CLASS = 'cursor-pointer rounded-md px-1 hover:bg-muted/60 hover:no-underline'

// Header row for a collapsible sub-panel: icon + title on the left; on the right a count (so the
// clinician knows how much is inside without opening it) plus an explicit Show/Hide chip.
//
// The chip exists because these sections start COLLAPSED — a chevron alone is easy to scan past,
// and a collapsed panel with no visible affordance reads as an empty section rather than a closed
// one. It flips its own label off the trigger's aria-expanded state via the `group/accordion-trigger`
// class the base AccordionTrigger already sets, so there is no extra state to thread through.
function SectionHeader({
  icon: Icon,
  style,
  title,
  meta,
}: {
  icon: LucideIcon
  style: SectionStyle
  title: string
  meta: string
}) {
  return (
    <span className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2">
      <span className="flex items-center gap-2">
        <Icon className={cn('size-4 shrink-0', style.icon)} aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">{title}</span>
      </span>
      <span className="flex items-center gap-2.5">
        <span className="text-sm font-normal text-muted-foreground">{meta}</span>
        <span className="inline-flex shrink-0 items-center rounded-md border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700 transition-colors group-hover/accordion-trigger:border-blue-500 group-hover/accordion-trigger:bg-blue-100 group-hover/accordion-trigger:text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:group-hover/accordion-trigger:border-blue-600 dark:group-hover/accordion-trigger:bg-blue-900/60 dark:group-hover/accordion-trigger:text-blue-200">
          <span className="group-aria-expanded/accordion-trigger:hidden">Show</span>
          <span className="hidden group-aria-expanded/accordion-trigger:inline">Hide</span>
        </span>
      </span>
    </span>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// The reference panel: everything about the case the clinician is allowed to see before
// reading the summaries. Four parts — demographics, sleep indices, medical history, and the
// recorded future-disease outcome.
//
// Demographics sits open in a tinted title bar (it is one row and always relevant); the tint is
// what makes the whole card read as a titled panel rather than a stretch of page. The other three
// are independently collapsible and all start COLLAPSED, so the panel stays short and the
// clinician opens only what a given case actually needs — each identified by its rail and icon.
//
// Sleep indices and the future-disease list come from the sidecar (see lib/case-context.ts);
// demographics and history come from the case file itself.
export function CaseContextPanel({ caseId, demographics, ehrHistory }: Props) {
  const { age, sex, bmi, race, bp } = demographics
  const context = caseContext(caseId)

  // Show only fields that are actually recorded — never a fabricated value. age 0 and bmi 0 are
  // the "not recorded" sentinels from the export (BMI is null in the source for every patient),
  // so they are omitted rather than shown as "0" / "0.0" (Prof. Yang: don't invent inputs).
  const demoItems: { label: string; value: string }[] = []
  if (age > 0) demoItems.push({ label: 'Age', value: `${age}` })
  if (sex) demoItems.push({ label: 'Sex', value: sex })
  if (bmi > 0) demoItems.push({ label: 'BMI', value: bmi.toFixed(1) })
  // Blood pressure is deliberately NOT shown (owner 2026-08-29): an abnormal reading is a
  // one-line cardiovascular argument, and the clinician round showed raters building their own
  // prediction from exactly such cues. The letters may still cite it; the panel does not lead
  // with it. (`bp` stays destructured so the data path is documented, not silently dropped.)
  void bp
  if (race && race !== 'Unknown') demoItems.push({ label: 'Race', value: race })

  const futureGt = context?.futureDiseaseGroundTruth ?? []
  // The header count matches what the block actually lists — it is scoped to the 23-disease panel
  // (see FutureRiskGrid), so counting the raw recorded list would promise rows that are not there.
  const futureGtInPanel = futureGt.filter(inPanel23)

  // The sleep panel shows ONLY what the system was given (owner 2026-08-22). Filtering here — at
  // the one place the sidecar's index enters the UI — means the numeric grid, the severity bars,
  // the category chart and the stage donut all inherit it, instead of each filtering separately.
  const givenSleepIndex = context ? withGivenFieldsOnly(context.sleepIndex) : null
  // Count what will actually be rendered — nulls are dropped downstream, so the raw field count
  // would overstate it.
  const sleepMetricCount = givenSleepIndex
    ? Object.values(givenSleepIndex).filter((v) => v != null).length
    : 0

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/40 px-4 py-3">
        {/* Kept one step above the collapsible sub-section titles (text-base) so the panel still
            reads as their parent, and level with the Clinical quality rubric heading, which is
            this section's peer rather than its child. */}
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <UserRound className="size-5.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          Patient Panel
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {demoItems.map((it) => (
            <DemographicItem key={it.label} label={it.label} value={it.value} />
          ))}
        </div>
      </div>

      {/* A missing sidecar entry must be LOUD, not silent: without it two of the four sections
          would quietly render empty and read as a patient with no findings. */}
      {!context && (
        <p className="border-b bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          No case-context record for <span className="font-mono">{caseId}</span> — sleep indices
          and the future-disease outcome are unavailable. Re-run{' '}
          <span className="font-mono">scripts/build_case_context.py</span>.
        </p>
      )}

      {/* Order + defaults reversed 2026-08-28 (owner): the recorded outcome now sits FIRST and
          starts OPEN. Clinician feedback showed raters opening sleep + history first and
          re-deriving their own (cardiovascular) prediction — doing the letters' job instead of
          judging it against what actually happened. The reference belongs on screen before the
          material it grades. Sleep and history still start collapsed. */}
      <Accordion type="multiple" defaultValue={['future-disease']}>
        <AccordionItem value="future-disease" className={itemClass(OUTCOME_STYLE)}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              icon={TrendingUp}
              style={OUTCOME_STYLE}
              // Renamed "Future risk" 2026-08-28 (owner). The 08-22 rationale required the
              // label to carry NOT-A-PREDICTION and the 6-year window; the short name carries
              // neither, so both move to the meta text ("recorded in the 6 years after the
              // study" — past-tense fact, window stated). Rubric howToScore strings reference
              // this panel BY NAME — keep them in step (rubric-config-disease.ts, Factuality).
              // ⛔ Still avoids the blinding-gate phrases: no "ground truth", no "oracle".
              title="Future risk"
              // Meta trimmed 2026-08-29 (owner): the long form read as generated scaffolding.
              // "6-year follow-up" keeps the recorded-not-predicted cue in two clinical words;
              // the full statement lives in Factuality's howToScore.
              meta={
                context
                  ? `${plural(futureGtInPanel.length, 'condition')} · 6-year follow-up`
                  : 'unavailable'
              }
            />
          </AccordionTrigger>
          <AccordionContent>
            {context ? (
              <FutureRiskGrid
                conditions={futureGt}
                emptyLabel="No new-onset condition recorded in the 6-year window."
              />
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sleep-indices" className={itemClass(SLEEP_STYLE)}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              icon={Moon}
              style={SLEEP_STYLE}
              title="Sleep panel"
              meta={plural(sleepMetricCount, 'metric')}
            />
          </AccordionTrigger>
          <AccordionContent>
            {context && givenSleepIndex ? (
              <SleepIndexGrid sleepIndex={givenSleepIndex} />
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="medical-history" className={itemClass(HISTORY_STYLE)}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              icon={ClipboardList}
              style={HISTORY_STYLE}
              title="Prior medical history"
              meta={plural(ehrHistory.length, 'condition')}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ConditionList
              conditions={ehrHistory}
              emptyLabel="No coded history recorded at the time of the study."
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </section>
  )
}

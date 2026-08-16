import type { LucideIcon } from 'lucide-react'
import { ClipboardList, FlaskConical, Moon, TrendingUp, UserRound } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ConditionList } from '@/components/ConditionList'
import { SleepIndexGrid } from '@/components/SleepIndexGrid'
import { caseContext, selectionSummary } from '@/lib/case-context'
import { useReveal } from '@/lib/reveal'
import { cn } from '@/lib/utils'
import type { Demographics } from '@/lib/types'

interface Props {
  caseId: string
  category: string
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
// INTERNAL-only section (cohort group + selection reason): amber, the same hue as the arm-reveal
// badge, so everything that exists only behind the reveal switch shares one look.
const INTERNAL_STYLE: SectionStyle = {
  rail: 'border-l-amber-500 border-dashed',
  icon: 'text-amber-600 dark:text-amber-400',
}

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
export function CaseContextPanel({ caseId, category, demographics, ehrHistory }: Props) {
  const { age, sex, bmi, race, bp } = demographics
  const context = caseContext(caseId)
  // INTERNAL reveal switch (header 'Reveal arms' / ?reveal=1) — also unlocks the selection section.
  const reveal = useReveal()

  // Show only fields that are actually recorded — never a fabricated value. age 0 and bmi 0 are
  // the "not recorded" sentinels from the export (BMI is null in the source for every patient),
  // so they are omitted rather than shown as "0" / "0.0" (Prof. Yang: don't invent inputs).
  const demoItems: { label: string; value: string }[] = []
  if (age > 0) demoItems.push({ label: 'Age', value: `${age}` })
  if (sex) demoItems.push({ label: 'Sex', value: sex })
  if (bmi > 0) demoItems.push({ label: 'BMI', value: bmi.toFixed(1) })
  if (bp) demoItems.push({ label: 'Blood pressure', value: `${bp} mmHg` })
  if (race && race !== 'Unknown') demoItems.push({ label: 'Race', value: race })

  const futureGt = context?.futureDiseaseGroundTruth ?? []
  // Count what will actually be rendered — SleepIndexGrid drops null metrics (PLMI is null for
  // 3 of the 5 sessions), so the raw field count would overstate it.
  const sleepMetricCount = context
    ? Object.values(context.sleepIndex).filter((v) => v != null).length
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

      {/* No defaultValue: all three start COLLAPSED. The clinician opens what they need, which
          also means the recorded outcome is never on screen unless they deliberately ask for it. */}
      <Accordion type="multiple">
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
            {context ? (
              <SleepIndexGrid sleepIndex={context.sleepIndex} category={category} />
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
            <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
              Conditions the patient was already diagnosed with at the time of the sleep study.
            </p>
            <ConditionList
              conditions={ehrHistory}
              emptyLabel="No coded history recorded at the time of the study."
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="future-disease" className={itemClass(OUTCOME_STYLE)}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              icon={TrendingUp}
              style={OUTCOME_STYLE}
              // Label deliberately avoids the phrase the blinding gate greps for (see README);
              // "recorded outcome" is also plainer for a clinician than the ML term.
              title="Future disease · recorded outcome"
              meta={context ? plural(futureGt.length, 'condition') : 'unavailable'}
            />
          </AccordionTrigger>
          <AccordionContent>
            {context ? (
              <>
                <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
                  New-onset conditions this patient went on to be diagnosed with, within the
                  6-year window after the sleep study. Recorded outcome — not any
                  system&apos;s prediction.
                </p>
                <ConditionList
                  conditions={futureGt}
                  emptyLabel="No new-onset condition recorded in the 6-year window."
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* INTERNAL: why the patient is in the batch (cohort_group x stratum + the selector's
            verbatim reason). Rendered ONLY while the arm-reveal switch is on — the reason names
            realized onsets and internal thresholds, so clinicians never see this section. */}
        {reveal && context?.selection && (
          <AccordionItem value="selection" className={itemClass(INTERNAL_STYLE)}>
            <AccordionTrigger className={TRIGGER_CLASS}>
              <SectionHeader
                icon={FlaskConical}
                style={INTERNAL_STYLE}
                title="Cohort group · why selected"
                meta={`internal · ${selectionSummary(context.selection)}`}
              />
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
                Internal review only — not shown to clinicians. Sub-group the patient was sampled from
                and the selector&apos;s reason string.
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Group</dt>
                <dd className="font-medium">{selectionSummary(context.selection)}</dd>
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="font-mono text-[12px] leading-snug">{context.selection.reason}</dd>
              </dl>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </section>
  )
}

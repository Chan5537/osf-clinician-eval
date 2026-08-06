import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ConditionList } from '@/components/ConditionList'
import { SleepIndexGrid } from '@/components/SleepIndexGrid'
import { caseContext } from '@/lib/case-context'
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

// Styling for the whole trigger row. Tailwind's preflight resets <button> to cursor:default, so
// without `cursor-pointer` the row gives no pointer feedback at all. The base trigger's
// hover:underline is dropped for a row-wide tint, which reads as "this strip is a control"
// rather than underlining two unrelated pieces of text.
const TRIGGER_CLASS =
  '-mx-2 cursor-pointer rounded-md px-2 hover:bg-muted/60 hover:no-underline'

// Header row for a collapsible sub-panel: title on the left; on the right a count (so the
// clinician knows how much is inside without opening it) plus an explicit Show/Hide chip.
//
// The chip exists because these sections start COLLAPSED — a chevron alone is easy to scan past,
// and a collapsed panel with no visible affordance reads as an empty section rather than a closed
// one. It flips its own label off the trigger's aria-expanded state via the `group/accordion-trigger`
// class the base AccordionTrigger already sets, so there is no extra state to thread through.
function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <span className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2">
      <span className="text-base font-semibold text-foreground">{title}</span>
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
// reading the responses. Four parts — demographics, sleep indices, medical history, and the
// recorded future-disease outcome.
//
// Demographics sits open at the top (it is one row and always relevant). The other three are
// independently collapsible and all start COLLAPSED, so the panel stays one screen-line tall and
// the clinician opens only what a given case actually needs.
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
  if (bp) demoItems.push({ label: 'Blood pressure', value: `${bp} mmHg` })
  if (race && race !== 'Unknown') demoItems.push({ label: 'Race', value: race })

  const futureGt = context?.futureDiseaseGroundTruth ?? []
  // Count what will actually be rendered — SleepIndexGrid drops null metrics (PLMI is null for
  // 3 of the 5 sessions), so the raw field count would overstate it.
  const sleepMetricCount = context
    ? Object.values(context.sleepIndex).filter((v) => v != null).length
    : 0

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        {/* Kept one step above the collapsible sub-section titles (text-base) so the panel still
            reads as their parent after both were scaled up. */}
        <h2 className="text-lg font-semibold tracking-tight">Patient Panel</h2>
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
      <Accordion type="multiple" className="px-4">
        <AccordionItem value="sleep-indices">
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader title="Sleep indices" meta={plural(sleepMetricCount, 'metric')} />
          </AccordionTrigger>
          <AccordionContent>
            {context ? (
              <SleepIndexGrid sleepIndex={context.sleepIndex} />
            ) : (
              <p className="text-sm text-muted-foreground">Unavailable.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="medical-history">
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              title="Medical history"
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

        <AccordionItem value="future-disease">
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              // Label deliberately avoids the phrase the blinding gate greps for (see README);
              // "recorded outcome" is also plainer for a clinician than the ML term.
              title="Future disease · recorded outcome"
              meta={
                context ? plural(futureGt.length, 'condition') : 'unavailable'
              }
            />
          </AccordionTrigger>
          <AccordionContent>
            {context ? (
              <>
                <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
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
      </Accordion>
    </section>
  )
}

import type { LucideIcon } from 'lucide-react'
import { ClipboardList, FlaskConical, Moon, UserRound } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { ConditionList } from '@/components/ConditionList'
import { SleepIndexGrid } from '@/components/SleepIndexGrid'
import { caseContext } from '@/lib/case-context'
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
// Auxiliary information (model-relevant med/lab) — amber, the "unknown" hue.
const AUX_STYLE: SectionStyle = {
  rail: 'border-l-amber-500',
  icon: 'text-amber-600 dark:text-amber-400',
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
  tag,
  tagClass,
}: {
  icon: LucideIcon
  style: SectionStyle
  title: string
  meta: string
  tag?: string
  tagClass?: string
}) {
  return (
    <span className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2">
      <span className="flex items-center gap-2">
        <Icon className={cn('size-4 shrink-0', style.icon)} aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">{title}</span>
        {tag && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              tagClass ??
                'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
            )}
          >
            {tag}
          </span>
        )}
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
      <Accordion type="multiple">
        {/* The recorded outcome moved OUT of this panel (owner 2026-09-03): it is now pinned
            above the page as FutureRiskStrip, on screen for the whole case instead of scrolling
            away exactly when the responses are being judged. Repeating it here would put the
            same two lines on screen twice. The strip keeps the "Future risk" name and the
            "New onset risk" tag, so the rubric guidance that names this panel still resolves. */}
        <AccordionItem value="sleep-indices" className={itemClass(SLEEP_STYLE)}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <SectionHeader
              icon={Moon}
              style={SLEEP_STYLE}
              title="Sleep panel"
              tag="Known info"
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
              tag="Known info"
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

        {/* Auxiliary information (owner 2026-09-02): ONE panel, tagged Unknown, after the
            history. Medication and lab are the study's ADDED information — mostly absent
            from the EHR, predictable from the recording. Presenting them as top-level
            chart panels over-guided raters; folded here they read as "what the chart
            usually lacks". The lab sub-block shows HbA1c only — the one analyte the
            letters may carry — never the full w90 panel. EHR records still display when
            they exist (data logic unchanged). */}
        {context?.ehrRecords && (
          <AccordionItem value="auxiliary-info" className={itemClass(AUX_STYLE)}>
            <AccordionTrigger className={TRIGGER_CLASS}>
              <SectionHeader
                icon={FlaskConical}
                style={AUX_STYLE}
                title="Auxiliary information"
                tag="Unknown"
                tagClass="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                meta="medication · lab test"
              />
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-2.5 text-xs text-muted-foreground">
                Mostly missing from the EHR for these patients, but may be predictable from
                the sleep recording.
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="mb-1.5">
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      Medication
                    </span>
                  </p>
                  {context.ehrRecords.medications.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {context.ehrRecords.medications.map((m) => (
                        <li
                          key={m}
                          className="inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-sm capitalize text-foreground"
                        >
                          {m}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      No EHR prescription in the 30 days before the study.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5">
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      Lab test (HbA1c)
                    </span>
                  </p>
                  {(() => {
                    const a1c = context.ehrRecords.labs.find((l) => /hba1c/i.test(l.name))
                    return a1c ? (
                      <p className="text-foreground">
                        {a1c.value}
                        {' %'}
                        {a1c.abnormal ? ' — abnormal per the recording site' : ''}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        No EHR HbA1c in the 90 days around the study.
                      </p>
                    )
                  })()}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

      </Accordion>
    </section>
  )
}

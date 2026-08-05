import { useState } from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { Demographics } from '@/lib/types'

interface Props {
  demographics: Demographics
  ehrHistory: string[]
}

// How many EHR-history chips to show before the "+N more" toggle (Zitao 2026-07-02: collapse the
// history so ~5 show initially rather than the full list).
const EHR_PREVIEW_COUNT = 5

function DemographicItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

// Collapsible reference panel, expanded by default. Shows the case background the
// clinician is allowed to see — demographics + coded EHR history. Deliberately
// holds no PSG signal or sleep-derived metrics.
export function CaseContextPanel({ demographics, ehrHistory }: Props) {
  const { age, sex, bmi, race, bp } = demographics
  const [showAllHistory, setShowAllHistory] = useState(false)
  // Show only fields that are actually recorded — never a fabricated value. age 0 and bmi 0 are the
  // "not recorded" sentinels from the export (BMI is null in the source for every patient), so they
  // are omitted rather than shown as "0" / "0.0" (Prof. Yang: don't invent inputs).
  const demoItems: { label: string; value: string }[] = []
  if (age > 0) demoItems.push({ label: 'Age', value: `${age}` })
  if (sex) demoItems.push({ label: 'Sex', value: sex })
  if (bmi > 0) demoItems.push({ label: 'BMI', value: bmi.toFixed(1) })
  if (bp) demoItems.push({ label: 'Blood pressure', value: `${bp} mmHg` })
  if (race && race !== 'Unknown') demoItems.push({ label: 'Race', value: race })

  const hiddenCount = ehrHistory.length - EHR_PREVIEW_COUNT
  const shownHistory =
    showAllHistory || hiddenCount <= 0 ? ehrHistory : ehrHistory.slice(0, EHR_PREVIEW_COUNT)
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="case-context"
      className="rounded-lg border bg-card px-4"
    >
      <AccordionItem value="case-context" className="border-none">
        <AccordionTrigger className="text-sm font-semibold">
          Case context
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {demoItems.map((it) => (
              <DemographicItem key={it.label} label={it.label} value={it.value} />
            ))}
          </div>
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Medical history
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {shownHistory.map((dx) => (
                <Badge key={dx} variant="secondary" className="font-normal">
                  {dx}
                </Badge>
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {showAllHistory ? 'Show less' : `+${hiddenCount} more`}
                </button>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

import { Fragment } from 'react'
import phecodeNames from '@/data/phecode-names.json'

interface Props {
  conditions: string[]
  // Shown when the list is empty — the two lists mean different things when nothing is there.
  emptyLabel: string
}

// A raw exporter token (`pc_296.22_dx`) that slipped through the upstream name lookup resolves
// here against the authoritative phecode map (every code the v46 batch leaked has a
// clinical_name there — the exporter simply used a narrower name source). A code the table
// somehow lacks stays visible as "Code X" rather than disappearing. The exporter should still
// be fixed at the source; 16 such entries shipped across 8 cases.
const NAME_BY_CODE: Record<string, string> = phecodeNames.nameByCode
function displayName(name: string): string {
  const m = /^pc_(.+)_dx$/.exec(name)
  if (!m) return name
  return NAME_BY_CODE[m[1]] ?? `Code ${m[1]}`
}

// One wrapped row of condition names. Until 2026-08-28 this grouped conditions under organ-system
// headings (MENTAL DISORDERS / MUSCULOSKELETAL / ...) — and clinician feedback showed exactly the
// failure that invites: raters read the history taxonomy as a diagnostic worksheet and derived
// their own prediction from it. Flat names state what is on record without ranking or organising
// it into an argument. The category grouping survives where it IS the point: the outcome panel
// (FutureRiskGrid).
export function ConditionList({ conditions, emptyLabel }: Props) {
  if (conditions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    // The separator sits OUTSIDE each name's no-wrap span (2026-10-06): with " · " inside it, the
    // spans touched with no break opportunity between them, so a long history became one line that
    // the panel's overflow-hidden cut off mid-name. Names stay whole from `sm` up; on a phone a
    // single long name may wrap rather than overflow.
    <p className="text-sm leading-relaxed text-foreground">
      {conditions.map((c, i) => (
        <Fragment key={c}>
          <span className="sm:whitespace-nowrap">{displayName(c)}</span>
          {i < conditions.length - 1 && <span className="text-muted-foreground/70"> · </span>}
        </Fragment>
      ))}
    </p>
  )
}

interface Props {
  conditions: string[]
  // Shown when the list is empty — the two lists mean different things when nothing is there.
  emptyLabel: string
}

// A raw exporter token (`pc_296.22_dx`) that slipped through the upstream name lookup renders as
// "Code 296.22" — visible and obviously unfinished rather than machine noise in a clinical panel.
// STOPGAP, not a fix: the name belongs in the exporter's phecode map; 16 such entries shipped in
// the v46 batch. Remove this once the exporter resolves every name.
function displayName(name: string): string {
  const m = /^pc_(.+)_dx$/.exec(name)
  return m ? `Code ${m[1]}` : name
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
    <p className="text-sm leading-relaxed text-foreground">
      {conditions.map((c, i) => (
        <span key={c} className="whitespace-nowrap">
          {displayName(c)}
          {i < conditions.length - 1 && <span className="text-muted-foreground/70"> · </span>}
        </span>
      ))}
    </p>
  )
}

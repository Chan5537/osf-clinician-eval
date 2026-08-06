// The four blocks of a case page, named once so the anchors, the step rail and the submit bar's
// "go to scoring" jump can never drift apart.
//
// `action: false` marks reference material the clinician reads only if they want it; `action: true`
// marks the two things they must actually do. Only the actions are numbered — numbering all four
// would imply the panel and the query are chores to complete.

export interface SectionSpec {
  id: string
  /** Rail label — short, because the rail is narrow. */
  label: string
  action: boolean
}

export const SECTIONS: SectionSpec[] = [
  // "Panel", not "Patient": the whole case is about one patient, so "Patient" named the case
  // rather than the block. "Panel" points at the thing the rail actually jumps to.
  { id: 'sec-patient-panel', label: 'Panel', action: false },
  { id: 'sec-patient-query', label: 'Query', action: false },
  { id: 'sec-health-summaries', label: 'Read summaries', action: true },
  { id: 'sec-rubric', label: 'Score', action: true },
]

export const SECTION_IDS = {
  panel: SECTIONS[0].id,
  query: SECTIONS[1].id,
  summaries: SECTIONS[2].id,
  rubric: SECTIONS[3].id,
}

// Step number shown for the action sections (1-based over actions only); null for reference blocks.
export function stepNumber(spec: SectionSpec): number | null {
  if (!spec.action) return null
  return SECTIONS.filter((s) => s.action).indexOf(spec) + 1
}

// Smooth-scroll to a section. The sections carry `scroll-mt-*`, so the sticky header does not
// cover the heading we just jumped to.
export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

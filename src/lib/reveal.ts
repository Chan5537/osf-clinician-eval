// INTERNAL REVIEW ONLY — arm reveal.
//
// Each response carries its source arm (`ResponseEntry.arm`, the un-blinding key) which the UI
// never renders for clinicians. For internal review sessions this context lets us flip a
// non-persisted switch that shows a small "base / ours / ground truth" badge next to each
// "Response X" header. Deliberately NOT part of SessionState/localStorage/export: a page reload
// resets it to OFF, and it never touches the exported scores. Enable via the header button or
// `?reveal=1` in the URL. Clinician deployments simply never flip it.
import { createContext, useContext } from 'react'
import type { ArmId } from './types'

export const ARM_NAMES: Record<ArmId, string> = {
  A: 'base',
  B: 'ours',
  C: 'ground truth',
}

export const RevealContext = createContext<boolean>(false)
export const useReveal = () => useContext(RevealContext)

export function initialRevealFromUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('reveal') === '1'
  } catch {
    return false
  }
}

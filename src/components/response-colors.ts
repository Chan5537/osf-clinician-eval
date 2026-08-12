import type { ResponseLabel } from '@/lib/types'

// Per-letter identity colors shared by ResponseCard (compare mode) and FocusReview (focus
// mode), so the same blinded letter always looks identical. Lives in its own non-component
// file: exporting constants from a component file breaks Vite's fast refresh.
export const AVATAR_STYLES: Record<ResponseLabel, string> = {
  A: 'bg-emerald-200 text-emerald-800',
  B: 'bg-pink-200 text-pink-800',
  C: 'bg-indigo-200 text-indigo-800',
}

export const CARD_STYLES: Record<ResponseLabel, string> = {
  A: 'border-emerald-200',
  B: 'border-pink-200',
  C: 'border-indigo-200',
}

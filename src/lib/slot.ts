// Rater slot: which 3 of the 5 blocks a clinician scores (see SLOT_BLOCKS in data/demo-cases.ts).
//
// The SERVER allocates it (2026-10-09, migration 010): there is one public link, and at a rater's
// first sign-in claim_slot() gives them the least-filled slot, in the order of Zitao's sheet
// (1st rater = clinician_1, ...). Clients cannot write rater.slot at all. The `?slot=N` in the URL
// is only a routing cache: after sign-in the app redirects to the slot the account holds, so the
// module-level SLOT / BLOCK gating in demo-cases.ts serves the right blocks. A `?slot` in a link
// is never honoured as a claim. Researchers are never allocated: they preview the URL's slot, or
// clinician_1 on the plain link.

import { supabase, SUPABASE_ENABLED } from './supabase'
import { SLOT, SLOT_BLOCKS, BLOCK } from '@/data/demo-cases'

export type SlotResult =
  | { kind: 'ok' } // the URL already carries the account's slot (or a researcher's preview)
  | { kind: 'redirect'; url: string } // go to the account's slot
  | { kind: 'failed' } // could not read or allocate: show Retry, never guess
  | { kind: 'off' } // no backend (kill switch): nothing to sync

/** Read this rater's slot, allocating one on first sign-in. Never throws. */
export async function syncSlot(raterId: string): Promise<SlotResult> {
  if (!SUPABASE_ENABLED || !supabase || !raterId) return { kind: 'off' }
  try {
    const { data, error } = await supabase
      .from('rater')
      .select('slot, is_researcher')
      .eq('id', raterId)
      .maybeSingle()
    if (error || !data) return { kind: 'failed' }

    let held: number | null = typeof data.slot === 'number' ? data.slot : null
    // Researchers are never allocated. They preview a slot instead: the ?slot=N in the URL, or
    // clinician_1 when the plain link carries none (2026-10-09, so the team needs no special link).
    if (data.is_researcher && held === null) {
      if (SLOT > 0) return { kind: 'ok' }
      const u = new URL(window.location.href)
      u.searchParams.set('slot', '1')
      if (BLOCK > 0 && !(SLOT_BLOCKS[1] ?? []).includes(BLOCK)) u.searchParams.delete('block')
      return { kind: 'redirect', url: u.toString() }
    }

    if (held === null) {
      const claim = await supabase.rpc('claim_slot')
      if (claim.error || typeof claim.data !== 'number') return { kind: 'failed' }
      held = claim.data
    }
    if (held === SLOT) return { kind: 'ok' }

    const u = new URL(window.location.href)
    u.searchParams.set('slot', String(held))
    if (BLOCK > 0 && !(SLOT_BLOCKS[held] ?? []).includes(BLOCK)) u.searchParams.delete('block')
    return { kind: 'redirect', url: u.toString() }
  } catch {
    return { kind: 'failed' }
  }
}

// Rater slot: which 3 of the 5 blocks a clinician scores (see SLOT_BLOCKS in data/demo-cases.ts).
//
// The slot arrives in the personal link (`?slot=N`) and is CLAIMED onto rater.slot at the first
// sign-in. From then on the server copy wins: a clinician who later opens the bare site link, or a
// link with another slot, is sent back to their own blocks. rater.slot is write-once for
// clinicians (009_rater_slot.sql), so editing the URL cannot move anyone to another set.

import { supabase, SUPABASE_ENABLED } from './supabase'
import { SLOT, SLOT_BLOCKS, BLOCK } from '@/data/demo-cases'

export type SlotResult =
  | { kind: 'ok'; slot: number } // the URL already carries the rater's slot
  | { kind: 'redirect'; url: string } // the rater holds a different slot: go there
  | { kind: 'none' } // no slot anywhere — they need their personal link
  | { kind: 'unknown' } // backend off or unreachable: trust the URL, never block the round

/** Read (and if needed claim) this rater's slot. Never throws. */
export async function syncSlot(raterId: string): Promise<SlotResult> {
  if (!SUPABASE_ENABLED || !supabase || !raterId) return { kind: 'unknown' }
  try {
    const { data, error } = await supabase
      .from('rater')
      .select('slot')
      .eq('id', raterId)
      .maybeSingle()
    if (error || !data) return { kind: 'unknown' }
    let held = typeof data.slot === 'number' ? data.slot : null

    if (held === null && SLOT > 0) {
      // `slot is null` in the filter makes the claim race-safe across two tabs: only one wins.
      await supabase.from('rater').update({ slot: SLOT }).eq('id', raterId).is('slot', null)
      const again = await supabase.from('rater').select('slot').eq('id', raterId).maybeSingle()
      held = typeof again.data?.slot === 'number' ? again.data.slot : null
      if (held === null) return { kind: 'unknown' }
    }

    if (held === null) return { kind: 'none' }
    if (held === SLOT) return { kind: 'ok', slot: held }

    const u = new URL(window.location.href)
    u.searchParams.set('slot', String(held))
    if (BLOCK > 0 && !(SLOT_BLOCKS[held] ?? []).includes(BLOCK)) u.searchParams.delete('block')
    return { kind: 'redirect', url: u.toString() }
  } catch {
    return { kind: 'unknown' }
  }
}

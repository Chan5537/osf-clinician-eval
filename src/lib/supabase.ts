// Supabase client singleton + the round's kill switch.
//
// KILL SWITCH (the ~90s rollback). When VITE_SUPABASE_URL is empty the whole
// backend is OFF: `supabase` is null, SUPABASE_ENABLED is false, sync.ts no-ops,
// and App skips the sign-in gate entirely. The app then behaves exactly as it did
// before this branch — localStorage plus manual CSV/JSON download. One env var and
// a redeploy, with no code change, is deliberately the cheapest possible way out
// if Supabase misbehaves mid-round.
//
// The anon key is PUBLIC by design: this is a static site served from a public
// repo, so the key is in the bundle either way. RLS is the security boundary —
// see supabase/migrations/002_rls.sql.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** True when a backend is configured. Everything network-touching must check this first. */
export const SUPABASE_ENABLED: boolean = URL.length > 0 && ANON.length > 0

// One client for the tab. Two clients would race each other for the auth token in
// localStorage and fight over refresh.
export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(URL, ANON, {
      auth: {
        // IMPLICIT, not PKCE. PKCE returns ?code= and needs its verifier in the
        // SAME browser that requested the link — which breaks when a clinician
        // opens mail in Outlook's in-app browser and it hands off to Safari.
        // Implicit returns tokens in the URL FRAGMENT, which never reaches the
        // server, so GitHub Pages' lack of SPA rewrites is irrelevant and no
        // router is needed: supabase-js reads the hash, stores the session, and
        // history.replaceState's it away.
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        // Namespaced so the auth token never collides with the session keys
        // storage.ts owns (`clinician-eval-session::*`).
        storageKey: 'clinician-eval-auth',
      },
    })
  : null

/**
 * Where a magic link should land. BASE_URL is '/osf-clinician-eval/' in the
 * deployed build and '/osf-clinician-eval/' under `npm run dev` too (vite.config
 * sets `base`), so this matches what is registered in the Supabase dashboard's
 * redirect allow-list. Same pattern already used for assets in App.tsx.
 */
export function authRedirectTo(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

/// <reference types="vite/client" />

// Typed build-time environment. Without these the custom VITE_* reads are `any`,
// so a typo (VITE_SUPABSE_URL) would compile and silently disable the backend.
interface ImportMetaEnv {
  /** Supabase project URL. EMPTY = backend off (the kill switch); see lib/supabase.ts. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon key. Public by design — RLS is the boundary. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 'clinician' strips developer affordances at build time; anything else = dev. */
  readonly VITE_APP_MODE?: string
  /** Dev-only: serve just the first N cases (`VITE_CASE_LIMIT=3 npm run dev`). */
  readonly VITE_CASE_LIMIT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

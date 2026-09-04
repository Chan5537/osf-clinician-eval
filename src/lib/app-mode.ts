// Build mode: which affordances exist in the bundle at all.
//
// Prof. Yang, 2026-09-04: "there can't be a button that they can click to reveal
// ... they should have a very simple, dedicated website" / "this one is for
// development, is for us".
//
// This is a BUILD-TIME constant, not a runtime role check, so the clinician bundle
// does not merely hide the developer affordances — Vite's dead-code elimination
// removes them. `?reveal=1` cannot resurrect what was never shipped.
//
//   VITE_APP_MODE=clinician   deploy.yml sets this
//   VITE_APP_MODE=dev         the default for local work
export const APP_MODE: 'clinician' | 'dev' =
  import.meta.env.VITE_APP_MODE === 'clinician' ? 'clinician' : 'dev'

/**
 * True in the internal build only. Gate anything a clinician must not see:
 * arm reveal, destructive resets, internal diagnostics.
 *
 * NOT gated by this: the CSV/JSON download and "Restore from file". Those stay in
 * BOTH builds on purpose — they are the last-resort recovery path if the backend
 * fails mid-round, and trading a proven escape hatch for tidiness would be a bad
 * bargain in a one-shot study.
 */
export const IS_DEV_BUILD: boolean = APP_MODE === 'dev'

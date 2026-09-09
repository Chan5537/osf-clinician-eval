// Build flags: which affordances exist in the bundle at all.
//
// Prof. Yang, 2026-09-04: "there can't be a button that they can click to reveal
// ... they should have a very simple, dedicated website" / "this one is for
// development, is for us".
//
// These are BUILD-TIME constants, not runtime role checks, so the clinician bundle
// does not merely hide the developer affordances — Vite's dead-code elimination
// removes them. `?reveal=1` cannot resurrect what was never shipped.
//
//   VITE_APP_MODE=clinician   deploy.yml sets this
//   VITE_APP_MODE=dev         the default for local work
export const APP_MODE: 'clinician' | 'dev' =
  import.meta.env.VITE_APP_MODE === 'clinician' ? 'clinician' : 'dev'

/**
 * True in the internal build only. Gates everything a clinician must not see:
 * the arm reveal, "Start over", the CSV/JSON download, "Restore from file", and
 * internal diagnostics.
 *
 * (Downloads were kept in both builds until 2026-09-08, on the theory that they
 * were a recovery path worth the clutter. Prof. Yang ruled otherwise: the ending
 * screen is a thank-you and nothing else. The recovery path is now the extract
 * SQL, which does not require the rater to do anything.)
 */
export const IS_DEV_BUILD: boolean = APP_MODE === 'dev'

/**
 * Whether the sign-in screen offers a password as well as an email link.
 *
 * SEPARATE FROM `IS_DEV_BUILD` on purpose. Supabase's built-in SMTP is rate
 * limited to a few messages an hour across the whole project, and "Generate link"
 * in the dashboard spends from the same budget — exhausting it locks everyone out,
 * including the operator. Password sign-in is the way around that.
 *
 * But testing the CLINICIAN build is exactly when you need to get in without email,
 * and folding this into IS_DEV_BUILD would mean the only build you can sign into
 * easily is the one whose UI you are not trying to check. So it is its own flag:
 *
 *   VITE_ALLOW_PASSWORD_SIGNIN=1 VITE_APP_MODE=clinician npm run dev
 *
 * Defaults ON in dev builds (convenience) and OFF in clinician builds unless the
 * flag is set explicitly. deploy.yml never sets it, so the deployed site is
 * magic-link only.
 */
export const ALLOW_PASSWORD_SIGNIN: boolean =
  import.meta.env.VITE_ALLOW_PASSWORD_SIGNIN === '1' || IS_DEV_BUILD

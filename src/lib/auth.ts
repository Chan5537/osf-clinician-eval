// Magic-link auth, as one hook. No router: SessionView already drives the screens,
// and this layer sits above it.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, SUPABASE_ENABLED } from './supabase'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

/** `throttledFor` = seconds until another send is allowed; a link is already out. */
export interface SignInResult {
  throttledFor?: number
}

export interface AuthState {
  status: AuthStatus
  user: User | null
  /** auth.users.id — the rater_id every server row is keyed by. Null until signed in. */
  raterId: string | null
  email: string | null
  /**
   * Send a magic link. Rejects with a displayable message on real failure.
   *
   * Resolves with `throttledFor` when Supabase declined because a link went to this
   * address moments ago — a link IS in the inbox, so the caller should treat it as a
   * send, not an error.
   */
  signIn: (email: string) => Promise<SignInResult>
  /**
   * DEV BUILD ONLY — password sign-in, for testing without email.
   *
   * Supabase's built-in SMTP is rate limited to a few messages an hour, shared
   * across the project, and it is trivially exhausted while setting a round up.
   * Worse, "Generate link" in the dashboard routes through the SAME limiter, so
   * hitting the cap locks you out of your own project entirely.
   *
   * Create the account with Authentication -> Users -> Add user -> Create new
   * user, with "Auto Confirm User" ticked, then sign in here. Never reachable in
   * the clinician build (see app-mode.ts).
   */
  signInWithPassword: (email: string, password: string) => Promise<void>
  /** Exchange the emailed 6-digit code for a session. */
  verifyCode: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  // With no backend configured the gate must not exist at all: report 'signed-in'
  // so App renders its normal body and the round runs exactly as it did before
  // this branch. This is the kill switch's front half.
  const [status, setStatus] = useState<AuthStatus>(
    SUPABASE_ENABLED ? 'loading' : 'signed-in',
  )
  const [user, setUser] = useState<User | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (!SUPABASE_ENABLED || !supabase) return

    // getSession() resolves the CURRENT tab, including a session just parsed out
    // of the magic-link fragment. Holding 'loading' until it settles is what keeps
    // a returning rater from seeing the sign-in screen flash for ~200ms right
    // after clicking their link — the most confusing possible moment.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return
        setUser(data.session?.user ?? null)
        setStatus(data.session ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        // A failed session read must not strand the rater on a blank splash.
        if (mounted.current) setStatus('signed-out')
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return
      setUser(session?.user ?? null)
      setStatus(session ? 'signed-in' : 'signed-out')
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string): Promise<SignInResult> => {
    if (!supabase) throw new Error('Sign-in is not available in this build.')
    const address = email.trim()
    if (!address) throw new Error('Enter your email address.')
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        // NO emailRedirectTo — that is the switch. With a redirect URL Supabase mails a
        // clickable link; without one it mails a 6-DIGIT CODE, which the rater types on
        // the page they are already on.
        //
        // Two reasons this is the better shape here (owner, 2026-09-17):
        //   * A link makes first-time sign-in leave the site: page -> inbox -> click ->
        //     back. A code keeps the whole flow in one tab.
        //   * Links are single-use, and corporate mail scanners (Gmail did this on
        //     2026-09-08; Microsoft Defender is worse) FETCH them on arrival, consuming
        //     the link before the human clicks it. A scanner cannot type a code into a
        //     form, so this failure mode disappears.
        //
        // The template must also carry the code — see supabase/README.md.
        // OPEN SIGNUP (owner, 2026-09-17). A rater who reaches the site can enrol
        // themselves; there is no roster to maintain and no lockout when someone
        // mistypes the address we expected.
        //
        // The trade accepted with it: the site is public, so anyone with the URL can
        // create an account. Their rows are indistinguishable from a real clinician's
        // in `rating`, so before analysis, filter on the rater addresses you actually
        // recruited — see supabase/extract.sql, which pins the batch and rubric version
        // but NOT the set of raters.
        shouldCreateUser: true,
      },
    })
    if (error) {
      // Supabase does not always populate `message` — a 500 from the mailer can arrive
      // as a bare object, which `${error.message}` renders as "{}" and tells the rater
      // nothing. Dig for whatever the payload actually carries, and keep the status
      // code so a screenshot is diagnosable.
      const raw =
        error.message ||
        (error as { error_description?: string }).error_description ||
        (error as { error?: string }).error ||
        ''
      const status = (error as { status?: number }).status
      // eslint-disable-next-line no-console
      console.error('[auth] signInWithOtp failed', { status, error })

      // Supabase throttles repeat sends to the SAME address (60s by default).
      //
      // This is NOT a failure: it means a link was already sent and is sitting in the
      // rater's inbox. Throwing here put them in front of a red error box with a dead
      // button for a minute, which reads as "the system is broken" when the correct
      // action is "go read your email". Resolve instead, and let the caller show the
      // same "check your email" screen it would show after a fresh send.
      const after = raw.match(/after (\d+) seconds?/i)
      if (after || /for security purposes|only request this after/i.test(raw)) {
        return { throttledFor: after ? Number(after[1]) : 60 }
      }
      if (/rate limit|too many/i.test(raw)) {
        throw new Error(
          'Too many sign-in emails have been sent recently. Please wait a few minutes and try again.',
        )
      }
      if (/signups? not allowed|disabled/i.test(raw)) {
        throw new Error(
          'Sign-up is currently closed. Please contact the study team so they can add you.',
        )
      }
      // 504 = Supabase connected to the mail server and then hung waiting for it.
      // Distinct from 500 (refused) and worth its own wording, because for a rater the
      // right action is simply to retry — the request may even have gone out.
      if (status === 504 || status === 408) {
        throw new Error(
          'The email server did not respond in time. Please try again — if the message ' +
            'does arrive, you can ignore the extra one.',
        )
      }
      // A 500 here is the mail server refusing, not anything the rater did wrong.
      if (status === 500 || !raw) {
        throw new Error(
          'We could not send the sign-in email just now — this is a problem on our side, ' +
            'not with your address. Please try again in a moment, or contact the study team.',
        )
      }
      throw new Error(raw)
    }
    return {}
  }, [])

  const verifyCode = useCallback(async (email: string, token: string) => {
    if (!supabase) throw new Error('Sign-in is not available in this build.')
    const code = token.replace(/\D/g, '') // tolerate spaces/dashes as pasted from mail
    if (code.length !== 6) throw new Error('Please enter the 6-digit code from your email.')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })
    if (error) {
      const raw = error.message || ''
      if (/expired/i.test(raw)) {
        throw new Error('That code has expired. Request a new one below.')
      }
      if (/invalid|incorrect/i.test(raw)) {
        throw new Error('That code is not right. Please check the email and try again.')
      }
      throw new Error(raw || 'Could not verify that code.')
    }
    // onAuthStateChange swaps the screen; nothing else to do here.
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Sign-in is not available in this build.')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return {
    status,
    user,
    raterId: user?.id ?? null,
    email: user?.email ?? null,
    signIn,
    signInWithPassword,
    verifyCode,
    signOut,
  }
}

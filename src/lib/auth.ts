// Magic-link auth, as one hook. No router: SessionView already drives the screens,
// and this layer sits above it.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, SUPABASE_ENABLED, authRedirectTo } from './supabase'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export interface AuthState {
  status: AuthStatus
  user: User | null
  /** auth.users.id — the rater_id every server row is keyed by. Null until signed in. */
  raterId: string | null
  email: string | null
  /** Send a magic link. Resolves on success; rejects with a displayable message. */
  signIn: (email: string) => Promise<void>
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

  const signIn = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Sign-in is not available in this build.')
    const address = email.trim()
    if (!address) throw new Error('Enter your email address.')
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: authRedirectTo(),
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
      // A 500 here is the mail server refusing, not anything the rater did wrong.
      if (status === 500 || !raw) {
        throw new Error(
          'We could not send the sign-in email just now — this is a problem on our side, ' +
            'not with your address. Please try again in a moment, or contact the study team.',
        )
      }
      throw new Error(raw)
    }
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
    signOut,
  }
}

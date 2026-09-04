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
        // Signups are DISABLED in the dashboard, so this is belt-and-braces: an
        // address that was never invited gets no link and no account.
        shouldCreateUser: false,
      },
    })
    if (error) {
      // Supabase says "Signups not allowed for otp" for an uninvited address.
      // A clinician cannot act on that wording; say what they should do instead.
      const msg = /signups not allowed/i.test(error.message)
        ? 'That address is not on the study list. Please use the address the invitation was sent to.'
        : error.message
      throw new Error(msg)
    }
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
    signOut,
  }
}

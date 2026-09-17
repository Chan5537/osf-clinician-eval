import { useState } from 'react'
import { KeyRound, Mail, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ALLOW_PASSWORD_SIGNIN } from '@/lib/app-mode'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'

interface Props {
  onSignIn: (email: string) => Promise<void>
  /** DEV BUILD ONLY — bypasses email entirely. See the note in lib/auth.ts. */
  onSignInWithPassword?: (email: string, password: string) => Promise<void>
}

// Sign-in gate. No password: the rater enters their email and gets a one-time link.
//
// OPEN SIGNUP (owner, 2026-09-17): no roster, no invitations. A clinician who reaches
// the site enrols themselves, and a mistyped address cannot lock anyone out.
//
// Passwordless suits 3-5 external clinicians: nothing to reset, nothing to store, no
// support burden. The same address is both sign-up and sign-in, so there is no
// "register vs log in" choice to get wrong.
export function SignInScreen({ onSignIn, onSignInWithPassword }: Props) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (usePassword && onSignInWithPassword) {
        await onSignInWithPassword(email, password)
        return // onAuthStateChange swaps the screen; no "check your email" step
      }
      await onSignIn(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <LogoLockup />

            {sent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MailCheck
                    className="size-5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <h1 className="text-lg font-semibold tracking-tight">Check your email</h1>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We sent a sign-in link to <strong>{email}</strong>. Open it on this device to
                  begin. The link is valid for 24 hours.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  If it has not arrived within a minute or two, please check your spam or junk
                  folder. Some email systems open links automatically for security scanning,
                  which can use the link up before you click it — if it says the link is
                  invalid or expired, just request a new one.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setSent(false)
                    setError(null)
                  }}
                >
                  Use a different address
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    Clinician Evaluation Study
                  </h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Enter your email address and we will send you a sign-in link. There is no
                    password to remember, and no account to set up — the same address works
                    every time you come back.
                  </p>
                  {/* The reason signing in matters, in the rater's terms: it is what
                      lets them stop and come back on any computer. */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Signing in saves your progress to your account, so you can stop at any point
                    and pick up where you left off — on this computer or another one.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@institution.edu"
                  />
                </div>

                {error && (
                  <p
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                {/* DEV ONLY. IS_DEV_BUILD is a build-time constant, so none of this
                    exists in the clinician bundle — there is no password field for a
                    clinician to be confused by, and no password path to attack. */}
                {ALLOW_PASSWORD_SIGNIN && onSignInWithPassword && usePassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {usePassword ? (
                    <KeyRound className="size-4" aria-hidden="true" />
                  ) : (
                    <Mail className="size-4" aria-hidden="true" />
                  )}
                  {busy
                    ? usePassword
                      ? 'Signing in…'
                      : 'Sending…'
                    : usePassword
                      ? 'Sign in'
                      : 'Email me a sign-in link'}
                </Button>

                {ALLOW_PASSWORD_SIGNIN && onSignInWithPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsePassword((v) => !v)
                      setError(null)
                    }}
                    className="w-full cursor-pointer text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {usePassword
                      ? 'Use an email link instead'
                      : 'Sign in with a password instead'}
                  </button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ALLOW_PASSWORD_SIGNIN } from '@/lib/app-mode'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'

interface Props {
  onSignIn: (email: string) => Promise<{ throttledFor?: number }>
  /** Exchange the emailed sign-in code for a session. */
  onVerifyCode: (email: string, code: string) => Promise<void>
  /** Return to the landing screen without signing in. */
  onBack?: () => void
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
export function SignInScreen({ onSignIn, onVerifyCode, onBack, onSignInWithPassword }: Props) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  // Seconds until another link may be requested. Links are single-use and mail systems
  // routinely consume them in transit, so re-sending is a NORMAL action here, not an
  // error path — but an unthrottled button invites a rater to spend the project-wide
  // hourly quota on themselves in ten seconds.
  const [cooldown, setCooldown] = useState(0)
  // True when the last request was throttled: a link exists but is not newly sent.
  const [alreadySent, setAlreadySent] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  async function send() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (usePassword && onSignInWithPassword) {
        await onSignInWithPassword(email, password)
        return // onAuthStateChange swaps the screen; no "check your email" step
      }
      const res = await onSignIn(email)
      setSent(true)
      // Throttled means a link is ALREADY in their inbox — same destination screen,
      // just a longer wait before another send is allowed.
      setCooldown(res?.throttledFor ?? 30)
      setAlreadySent(Boolean(res?.throttledFor))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.')
      // Stay on the form so the address is still there to correct or retry.
      setSent(false)
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await send()
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <LogoLockup />

            {sent ? (
              /* CODE ENTRY. The rater never leaves this page: the email carries a number,
                 not a link, so there is no round trip through the inbox and nothing for a
                 mail scanner to consume. */
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (busy) return
                  setBusy(true)
                  setError(null)
                  try {
                    await onVerifyCode(email, code)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not verify that code.')
                  } finally {
                    setBusy(false)
                  }
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MailCheck
                      className="size-5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <h1 className="text-lg font-semibold tracking-tight">
                      {alreadySent ? 'Check your inbox' : 'Check your email'}
                    </h1>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {alreadySent ? (
                      <>
                        A code was sent to <strong>{email}</strong> a moment ago and is still
                        valid — enter that one below.
                      </>
                    ) : (
                      <>
                        We sent a sign-in code to <strong>{email}</strong>. Enter it below to
                        continue.
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Sign-in code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={10}
                    value={code}
                    // Normalise on the way IN rather than validating on the way out: strip
                    // anything that is not a digit (mail clients wrap codes in spaces, and
                    // a pasted "482 917" is otherwise silently rejected) and cap at six.
                    // What is in the box is then exactly what gets submitted.
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="········"
                    className="max-w-[13rem] text-center text-lg tracking-[0.3em] tabular-nums"
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={busy || code.length < 6}
                >
                  {busy ? 'Verifying…' : 'Continue'}
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || cooldown > 0}
                    onClick={() => void send()}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send a new code'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setSent(false)
                      setError(null)
                      setCooldown(0)
                      setAlreadySent(false)
                      setCode('')
                    }}
                  >
                    Use a different address
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="-ml-1 inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </button>
                )}
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    Sign in to begin
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

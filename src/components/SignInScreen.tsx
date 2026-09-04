import { useState } from 'react'
import { Mail, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'

interface Props {
  onSignIn: (email: string) => Promise<void>
}

// Sign-in gate. No password: the rater enters the address the invitation went to
// and gets a one-time link.
//
// Passwordless is the right call for 3-5 external clinicians — nothing to reset,
// nothing to store, and no support burden on us. Signups are disabled in the
// Supabase dashboard, so the invite list IS the access control.
export function SignInScreen({ onSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
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
                  folder.
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
                    Please sign in with the email address your invitation was sent to. We will
                    email you a link — there is no password to remember.
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
                    placeholder="you@hospital.org"
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

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  <Mail className="size-4" aria-hidden="true" />
                  {busy ? 'Sending…' : 'Email me a sign-in link'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

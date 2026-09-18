import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'
import { IS_DEV_BUILD } from '@/lib/app-mode'
import { armRequiredCount } from '@/lib/reducer'
import { RUBRIC_DIMENSIONS } from '@/lib/rubric-config'
import { GUIDELINE_DOC_URL, LIKERT_RUBRIC_DOC_URL } from '@/lib/links'
import { DEMO_CASES, BLOCK, BLOCK_SIZE, TOTAL_BLOCKS } from '@/data/demo-cases'
import { blockProgress, restoreFromExport } from '@/lib/storage'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface Props {
  reviewer: string
  onReviewerChange: (value: string) => void
  onBegin: () => void
  /** Authenticated email, when a backend is configured. Null = no auth (kill switch). */
  signedInAs?: string | null
  onSignOut?: () => void
  /** True when a backend is configured, so Begin will require sign-in. */
  requiresSignIn?: boolean
  /** Cases already submitted, so the button can read "Continue" rather than "Begin". */
  submitted?: number
}

// Opening screen: task explanation + axis overview (labels imported from
// rubric-config so the audited blinding copy is never retyped) + optional
// initials. The word "tool" never appears; no agent architecture is revealed.
export function LandingScreen({
  reviewer,
  onReviewerChange,
  onBegin,
  signedInAs,
  onSignOut,
  requiresSignIn = false,
  submitted,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [blocks] = useState(() => blockProgress(DEMO_CASES.length))
  const total = DEMO_CASES.length
  // How far in they already are, so the primary button can say so.
  const submittedCount = submitted ?? 0
  const nResponses = DEMO_CASES[0]?.responses.length ?? 3
  const responseLetters = (DEMO_CASES[0]?.responses ?? []).map((r) => r.label).join(', ')
  // items-per-case for the first case (each case has the same per-response count by design)
  // Items per RESPONSE — the five Likert scales. Deliberately NOT requiredCount/responses.length:
  // since v10 requiredCount also counts the case-level rank places, which are not per-response
  // items, so that arithmetic would silently claim six scales per response.
  const itemsPerResponse = armRequiredCount()
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <LogoLockup />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Clinician Evaluation Study
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Thank you for taking part. You will review{' '}
                <strong>{total} cases</strong>. For each, you will see a case summary, a
                clinical query, and <strong>{nResponses} responses (Response {responseLetters})</strong>.
                You review and rate them <strong>one at a time</strong>, with the rating scales
                right beside the response; a side-by-side reading view is one click away whenever
                you want to compare. You will not be told which system produced each response.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-muted-foreground">
                For each response you will rate <strong>{itemsPerResponse} quality scales</strong>{' '}
                from <strong>1 to 5</strong>. These are judgement calls — pick the score that
                matches your impression. At the end of each case you will also{' '}
                <strong>rank the {nResponses} responses from best to worst</strong>. The whole study
                takes about <strong>15–20 minutes</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What each case shows
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Alongside the patient's question you have a <strong>Sleep panel</strong> (the
                measurements from their overnight study), their <strong>Prior medical
                history</strong>, and the <strong>Patient group</strong> — what brought them in.
                It is all open by default, and worth a look before the responses.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rating scales
              </p>
              <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {RUBRIC_DIMENSIONS.map((d) => (
                  <li key={d.key}>{d.label}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reference materials
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" className="flex-1 justify-between">
                  <a href={GUIDELINE_DOC_URL} target="_blank" rel="noopener noreferrer">
                    Evaluation guideline
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1 justify-between">
                  <a href={LIKERT_RUBRIC_DOC_URL} target="_blank" rel="noopener noreferrer">
                    Likert Scale Rubric
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These open in a new tab; you can also reach the rubric from each
                section during the evaluation.
              </p>
            </div>

            {/* Identity. With a backend, WHO you are comes from the sign-in, not a
                free-text box — it is the key your progress and answers are stored
                under. The initials input survives only for the no-backend build
                (kill switch), where nothing else records a rater. */}
            {!signedInAs && requiresSignIn ? (
              /* Signed out. Say plainly what pressing Begin will ask for, so the sign-in
                 screen is never a surprise — but do not put a form here: the point of this
                 screen is to let someone read the brief before committing. */
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                You will be asked for your email address when you begin, so your progress
                can be saved and you can continue on any computer.
              </p>
            ) : signedInAs ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Signed in as</span>
                <span className="text-sm font-medium">{signedInAs}</span>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="ml-auto cursor-pointer text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Sign out
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reviewer">Your initials (optional)</Label>
                <Input
                  id="reviewer"
                  value={reviewer}
                  onChange={(e) => onReviewerChange(e.target.value)}
                  placeholder="e.g. JS"
                  className="max-w-[12rem]"
                  autoComplete="off"
                />
              </div>
            )}

            {/* BLOCKS (2026-09-02). A full batch is too long for one sitting, so it is served
                in blocks of BLOCK_SIZE. Whoever arrives without ?block= picks one here, and
                sees what this browser already holds for each — so "where was I" is answerable
                before committing to a block. */}
            {TOTAL_BLOCKS > 1 && BLOCK === 0 && (
              <div className="space-y-2">
                <Label>Choose a block</Label>
                <p className="text-xs text-muted-foreground">
                  The batch is split into blocks of {BLOCK_SIZE} cases. Each block is scored and
                  downloaded on its own; you can do them in any order, on any day.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {blocks.map((b) => (
                    <Button
                      key={b.block}
                      type="button"
                      variant="outline"
                      className="h-auto flex-col items-start gap-0.5 py-2"
                      onClick={() => {
                        const u = new URL(window.location.href)
                        u.searchParams.set('block', String(b.block))
                        window.location.href = u.toString()
                      }}
                    >
                      <span className="text-sm font-semibold">Block {b.block}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Cases {b.first}–{b.last}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {b.submitted > 0 ? `${b.submitted}/${b.size} done` : 'not started'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {signedInAs || requiresSignIn ? (
                  <>
                    Your progress is saved to your account as you go, so you can close the page
                    and <strong>resume on any computer</strong>. There is nothing to download
                    and nothing to send us.
                  </>
                ) : (
                  <>
                    Your progress is saved in this browser as you go, so you can close the page
                    and resume later.
                    {IS_DEV_BUILD && (
                      <>
                        {' '}
                        You can also download it at any time from the header, and put that file
                        back with <strong>Restore from file</strong> — on another machine, or
                        after clearing your browser.
                      </>
                    )}
                  </>
                )}
              </p>
              {/* Dev-only (Yang, 2026-09-08). With downloads gone from the clinician
                  build there is no file for them to restore FROM, and resume now comes
                  from their account automatically. Kept in dev as the recovery path. */}
              {IS_DEV_BUILD && (
                <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = '' // let the same file be picked again after a failure
                    if (!f) return
                    try {
                      const msg = restoreFromExport(await f.text())
                      toast.success(msg)
                      window.setTimeout(() => window.location.reload(), 600)
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not read that file.')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => fileRef.current?.click()}
                >
                  Restore from file
                </Button>
                </>
              )}
            </div>

            <Button size="lg" className="w-full sm:w-auto" onClick={onBegin}>
              {/* The label has to tell the truth about what the button does. With the
                  lockup now acting as a home button, a rater can be HERE mid-round, and
                  "Begin evaluation" would read as "start over". */}
              {!signedInAs && requiresSignIn
                ? 'Sign in and begin'
                : submittedCount > 0 && submittedCount < total
                  ? `Continue — ${submittedCount} of ${total} done`
                  : submittedCount >= total
                    ? 'Review your answers'
                    : BLOCK > 0
                      ? `Begin block ${BLOCK}`
                      : 'Begin evaluation'}
            </Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

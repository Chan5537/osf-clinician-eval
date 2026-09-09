import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Pencil } from 'lucide-react'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'
import { IS_DEV_BUILD } from '@/lib/app-mode'
import { getSyncStatus, onSyncStatus } from '@/lib/sync'
import type { SessionState } from '@/lib/session'
import type { DemoCase } from '@/lib/types'
import { pickCount } from '@/lib/reducer'
import { toJSON, toCSV, downloadText } from '@/lib/export'

interface Props {
  session: SessionState
  cases: DemoCase[]
  onReview: (index: number) => void
  onResetAll: () => void
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// Final screen. Shows only "Case n" + case_id + a status chip per case — never
// left_is_agent, never query_id, never which side was cited. Offers the
// JSON/CSV download (the only place the un-blinding export is reachable).
export function CompletionScreen({ session, cases, onReview, onResetAll }: Props) {
  // Live upload backlog. A rater who closes the tab while rows are still queued
  // would leave those cases unsent, so the closing message holds until it clears.
  const sync = useSyncExternalStore(onSyncStatus, getSyncStatus, getSyncStatus)
  const uploadPending =
    sync.kind === 'queued' || sync.kind === 'error' ? sync.pending : 0

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <LogoLockup />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Evaluation complete — thank you!
              </h1>
              {/* The clinician sentence must not advertise affordances their build does
                  not have: downloads and "start over" are dev-only now. Reviewing a case
                  IS still available to them, and is worth naming. */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {IS_DEV_BUILD ? (
                  <>
                    You have reviewed all {cases.length} cases. You can download your
                    ratings, review or edit any case, or start over.
                  </>
                ) : (
                  <>
                    You have reviewed all {cases.length} cases, and your ratings have been
                    recorded. You may go back and revise any case below, or simply close
                    this page — we truly appreciate your time.
                  </>
                )}
              </p>
            </div>

            <ul className="divide-y rounded-lg border">
              {session.cases.map((c, i) => {
                const touched = pickCount(c.state, cases[i]) > 0
                const status = c.submitted
                  ? { label: 'Submitted', variant: 'secondary' as const }
                  : touched
                    ? { label: 'Needs re-submit', variant: 'outline' as const }
                    : { label: 'Not started', variant: 'outline' as const }
                return (
                  <li key={cases[i].case_id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Case {i + 1}</span>
                      <span className="text-xs text-muted-foreground">{cases[i].case_id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant} className="font-normal">
                        {status.label}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onReview(i)}
                      >
                        <Pencil className="size-3.5" />
                        Review
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* DOWNLOADS ARE DEV-ONLY (Prof. Yang, 2026-09-08).
                A clinician has no use for the file — their answers are already in the
                study database — and every export carries the response text plus the
                internal keys the analysis joins on. The rater-facing ending is a thank
                you and nothing else. The dev build keeps the buttons as the recovery
                path if an upload never lands. */}
            {IS_DEV_BUILD && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() =>
                      downloadText(
                        `clinician-ratings-${isoDate()}.json`,
                        'application/json',
                        toJSON(session),
                      )
                    }
                  >
                    <Download className="size-4" />
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      downloadText(
                        `clinician-ratings-${isoDate()}.csv`,
                        'text/csv;charset=utf-8',
                        toCSV(session),
                      )
                    }
                  >
                    <Download className="size-4" />
                    Download CSV
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              {uploadPending > 0 ? (
                <>
                  Your ratings are saved. <strong>{uploadPending}</strong> still to upload —
                  please keep this page open until the header reads “Saved”.
                </>
              ) : (
                <>
                  Your ratings have been recorded. There is nothing further you need to do,
                  and nothing to send us.
                </>
              )}
            </p>

            {/* A3: dev only. Note this copy had NO confirm dialog at all, unlike the
                header's — one click ended a completed round. */}
            {IS_DEV_BUILD && (
              <div className="border-t pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={onResetAll}>
                  Start over
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Pencil } from 'lucide-react'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'
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
              <p className="text-sm leading-relaxed text-muted-foreground">
                You have reviewed all {cases.length} pairs. You can download your
                ratings, review or edit any pair, or start over.
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
                      <span className="text-sm font-medium">Pair {i + 1}</span>
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
              <p className="text-xs leading-relaxed text-muted-foreground">
                Please download your ratings and send the file to the research team
                (your answers are not transmitted automatically). The export includes
                an internal key for the research team.
              </p>
            </div>

            <div className="border-t pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={onResetAll}>
                Start over
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

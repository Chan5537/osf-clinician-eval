import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogoLockup } from '@/components/LogoLockup'
import { AppFooter } from '@/components/AppFooter'
import { requiredCount } from '@/lib/reducer'
import { GUIDELINE_DOC_URL, RUBRIC_DOC_URL } from '@/lib/links'
import { DEMO_CASES } from '@/data/demo-cases'

// The rubric categories shown on the landing screen (weighted-boolean checklist).
const RUBRIC_CATEGORIES = ['Sleep-data interpretation', 'Future-disease risk', 'Safety']

interface Props {
  reviewer: string
  onReviewerChange: (value: string) => void
  onBegin: () => void
}

// Opening screen: task explanation + axis overview (labels imported from
// rubric-config so the audited blinding copy is never retyped) + optional
// initials. The word "tool" never appears; no agent architecture is revealed.
export function LandingScreen({ reviewer, onReviewerChange, onBegin }: Props) {
  const total = DEMO_CASES.length
  const nResponses = DEMO_CASES[0]?.responses.length ?? 3
  const responseLetters = (DEMO_CASES[0]?.responses ?? []).map((r) => r.label).join(', ')
  // items-per-case for the first case (each case has the same per-response count by design)
  const itemsPerResponse = DEMO_CASES[0]
    ? Math.round(requiredCount(DEMO_CASES[0]) / (DEMO_CASES[0].responses.length || 1))
    : 0
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
                clinical query, and <strong>{nResponses} responses (Response {responseLetters})</strong>{' '}
                shown side-by-side. You will not be told which system produced each response.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-muted-foreground">
                For each response you will answer a short <strong>Yes / No / N&#47;A checklist</strong>{' '}
                (about <strong>{itemsPerResponse} items per response</strong>), grouped by category.
                Mark an item <strong>N&#47;A</strong> when it does not apply to that response. The
                whole study takes about <strong>15–20 minutes</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rubric categories
              </p>
              <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {RUBRIC_CATEGORIES.map((c) => (
                  <li key={c}>{c}</li>
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
                  <a href={RUBRIC_DOC_URL} target="_blank" rel="noopener noreferrer">
                    Scoring rubric
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These open in a new tab; you can also reach the rubric from each
                section during the evaluation.
              </p>
            </div>

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

            <p className="text-xs leading-relaxed text-muted-foreground">
              Your progress is saved in this browser, so you can close the page and
              resume later.
            </p>

            <Button size="lg" className="w-full sm:w-auto" onClick={onBegin}>
              Begin evaluation
            </Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  )
}

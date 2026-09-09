import { useReducer, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DEMO_CASES, BLOCK, TOTAL_BLOCKS, BLOCK_SIZE } from '@/data/demo-cases'
import {
  sessionReducer,
  initialSessionState,
  allCasesSubmitted,
} from '@/lib/session'
import type { SessionState, SessionAction } from '@/lib/session'
import type { RubricAction } from '@/lib/types'
import { load, save, clear, loadEnvelope, stashSuperseded } from '@/lib/storage'
import { useAuth } from '@/lib/auth'
import { SUPABASE_ENABLED } from '@/lib/supabase'
import { hydrate, reconcile, queueSessionSync, queueCaseSubmit, flushNow } from '@/lib/sync'
import { IS_DEV_BUILD, ALLOW_PASSWORD_SIGNIN } from '@/lib/app-mode'
import { SignInScreen } from '@/components/SignInScreen'
import { SyncStatus } from '@/components/SyncStatus'
import { toCSV, toJSON, downloadText } from '@/lib/export'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SECTION_IDS, scrollToSection } from '@/lib/sections'
import { UI_FLAGS } from '@/lib/ui-flags'
import { RevealContext, initialRevealFromUrl } from '@/lib/reveal'
import { FutureRiskStrip } from '@/components/FutureRiskStrip'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingScreen } from '@/components/LandingScreen'
import { CompletionScreen } from '@/components/CompletionScreen'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { AppFooter } from '@/components/AppFooter'
import { CaseContextPanel } from '@/components/CaseContextPanel'
import { QueryBubble } from '@/components/QueryBubble'
import { ResponsePair } from '@/components/ResponsePair'
import { FocusReview } from '@/components/FocusReview'
import { SubmitBar } from '@/components/SubmitBar'

// Lazy initializer: hydrate from localStorage exactly once at render-init.
// (StrictMode double-invokes effects but not the useReducer init, so this is
// the safe place to read storage.)
function initSession(): SessionState {
  return load() ?? initialSessionState()
}

function App() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, initSession)
  // INTERNAL: arm-reveal switch (not persisted, not exported); see lib/reveal.ts
  const [reveal, setReveal] = useState<boolean>(initialRevealFromUrl)
  const debounceRef = useRef<number | null>(null)
  const auth = useAuth()
  const raterId = auth.raterId

  // Local persist (300ms), then the network mirror (2s). Two timers on purpose:
  // localStorage is free and must stay tight, a round-trip per keystroke is not.
  // ORDER MATTERS — local first, always. If the tab dies between them, the work is
  // still on disk and the next boot re-mirrors it.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      save(session)
      if (raterId) queueSessionSync(raterId, session, loadEnvelope()?.rev ?? 0)
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [session, raterId])

  // Pull this rater's server session exactly once per sign-in, and let
  // reconcile() decide which side the round continues from.
  const hydrated = useRef<string | null>(null)
  useEffect(() => {
    if (!SUPABASE_ENABLED || !raterId || hydrated.current === raterId) return
    hydrated.current = raterId
    let cancelled = false
    void (async () => {
      const server = await hydrate(raterId) // never throws; null on any failure
      if (cancelled || !server) return
      const env = loadEnvelope()
      const r = reconcile(env?.session ?? null, env?.rev ?? 0, server)
      if (r.source !== 'server' || !r.state) return
      // Diverged = both machines hold submitted work. Only the rater can say which
      // is right, so ask rather than silently choosing.
      if (r.diverged) {
        const ok = window.confirm(
          `Found progress from another device: ${r.serverSubmitted} of ${DEMO_CASES.length} cases scored there, ` +
            `${r.localSubmitted} here.\n\nContinue with the ${r.serverSubmitted}-case version? ` +
            `Your ${r.localSubmitted}-case version is kept as a backup.`,
        )
        if (!ok) return
      }
      if (env?.session) stashSuperseded(env.session) // never destroy the loser
      dispatch({ type: 'HYDRATE', state: r.state })
      save(r.state)
    })()
    return () => {
      cancelled = true
    }
  }, [raterId])

  // Re-stamp the clock baseline for the case being resumed. storage.load() deliberately drops
  // every live baseline (a persisted one would bill the whole overnight gap to the case), so
  // WITHOUT this the resumed case has no baseline and reports a null duration. Pre-v8 the
  // ENTER_CASE action existed but was never dispatched, which is exactly that bug.
  const entered = useRef(false)
  useEffect(() => {
    if (entered.current) return // StrictMode double-invokes effects; stamp once
    entered.current = true
    if (session.view === 'cycle') dispatch({ type: 'ENTER_CASE', at: Date.now() })
  }, [session.view])

  // Idle accounting: a hidden tab is not time-on-task. Also settles on pagehide so a closed
  // laptop parks the clock instead of accruing until the next interaction.
  useEffect(() => {
    const onVisibility = () =>
      dispatch({ type: 'VISIBILITY', hidden: document.hidden, at: Date.now() })
    const onHide = () => {
      dispatch({ type: 'VISIBILITY', hidden: true, at: Date.now() })
      void flushNow() // best-effort drain; the localStorage queue is the real durability
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  // Synchronous write that cancels the pending debounce — used on Submit so a
  // navigation can never drop the just-committed picks.
  const flush = (next: SessionState) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    save(next)
  }

  // AUTH GATE. Sits ABOVE the existing SessionView switch, which already acts as
  // the router — no react-router needed.
  //
  // The 'loading' hold matters: detectSessionInUrl parses the magic-link fragment
  // asynchronously, so without it a rater who just clicked their link would see
  // the sign-in screen flash for ~200ms immediately after clicking it.
  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }
  if (auth.status === 'signed-out') {
    return (
      <SignInScreen
        onSignIn={auth.signIn}
        // Undefined unless password sign-in is enabled for this build, so the path
        // is unreachable in the deployed site even before dead-code elimination.
        onSignInWithPassword={ALLOW_PASSWORD_SIGNIN ? auth.signInWithPassword : undefined}
      />
    )
  }

  if (session.view === 'landing') {
    return (
      <LandingScreen
        signedInAs={auth.email}
        onSignOut={() => void auth.signOut()}
        reviewer={session.reviewer}
        onReviewerChange={(r) => dispatch({ type: 'SET_REVIEWER', reviewer: r })}
        onBegin={() => dispatch({ type: 'BEGIN' })}
      />
    )
  }

  if (session.view === 'completion') {
    return (
      <CompletionScreen
        session={session}
        cases={DEMO_CASES}
        onReview={(i) => dispatch({ type: 'GOTO_CASE', caseIndex: i })}
        onResetAll={() => {
          clear()
          dispatch({ type: 'RESET_ALL' })
        }}
      />
    )
  }

  // Clamp at the point of use. sanitizeSession() already bounds the index on both the
  // local and server paths, so this is belt-and-braces — but the failure mode it guards
  // is a WHITE SCREEN with the session intact but unreachable, which is the worst thing
  // that can happen to a clinician mid-round. A clamp is a cheap price for never seeing
  // it again, whatever future path sets the index.
  const i =
    Number.isInteger(session.currentCaseIndex) &&
    session.currentCaseIndex >= 0 &&
    session.currentCaseIndex < DEMO_CASES.length
      ? session.currentCaseIndex
      : 0
  const demoCase = DEMO_CASES[i]
  const caseRubric = session.cases[i]

  // Nothing renderable at all (an empty batch). Say so rather than crashing.
  if (!demoCase || !caseRubric) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          No cases are available in this build. Please contact the study team.
        </p>
      </div>
    )
  }

  // Adapter: forward the flat RubricAction into the session reducer, so the
  // rubric components keep their existing Dispatch<RubricAction> prop type.
  const caseDispatch = (action: RubricAction) =>
    dispatch({ type: 'RUBRIC', caseIndex: i, action })

  // Jump to the scoring block. From compare mode this first switches back to focus, then scrolls
  // once the focus view has mounted (the rubric anchor does not exist in compare mode).
  function goToScoring() {
    if (session.layoutMode !== 'focus') {
      dispatch({ type: 'SET_LAYOUT_MODE', mode: 'focus' })
      window.setTimeout(() => scrollToSection(SECTION_IDS.rubric), 60)
    } else {
      scrollToSection(SECTION_IDS.rubric)
    }
  }

  function handleSubmit() {
    const at = new Date().toISOString()
    // Wall clock across ALL visits to this case (prior visits are already banked in timing.wallMs),
    // not just the current one — so a case interrupted by a reload reports total elapsed time.
    const priorWallMs = caseRubric.timing.wallMs
    const thisVisitMs =
      caseRubric.timing.enteredAt != null
        ? Math.max(0, Date.now() - caseRubric.timing.enteredAt)
        : session.caseEnteredAt != null
          ? Math.max(0, Date.now() - session.caseEnteredAt)
          : 0
    const totalWallMs = priorWallMs + thisVisitMs
    const durationSeconds = totalWallMs > 0 ? Math.round(totalWallMs / 1000) : null
    const submitAction: SessionAction = {
      type: 'SUBMIT_CASE',
      caseIndex: i,
      at,
      durationSeconds,
    }
    const afterSubmit = sessionReducer(session, submitAction)
    const navAction: SessionAction = allCasesSubmitted(afterSubmit)
      ? { type: 'FINISH' }
      : { type: 'NEXT_CASE' }
    const next = sessionReducer(afterSubmit, navAction)
    dispatch(submitAction)
    dispatch(navAction)
    flush(next) // persist the post-nav state synchronously — ALWAYS before the network
    // B8: this case's 15 rating rows go to the server now, not at the end of the
    // round. A rater who stops at case 6 still leaves us six cases of data.
    if (raterId) queueCaseSubmit(raterId, next, i, loadEnvelope()?.rev ?? 0)
    toast.success('Submitted ✓')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submittedCount = session.cases.filter((c) => c.submitted).length

  return (
    <RevealContext.Provider value={reveal}>
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}ucla_logo.jpg`}
              alt="UCLA"
              className="h-9 w-auto rounded-sm object-contain"
            />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Clinician Evaluation</h1>
              <p className="text-xs text-muted-foreground">UCLA Health Intelligence Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProgressIndicator
              current={i}
              total={DEMO_CASES.length}
              submitted={session.cases.map((c) => c.submitted)}
              onGoto={(idx) => dispatch({ type: 'GOTO_CASE', caseIndex: idx })}
            />
            <SyncStatus />
            {BLOCK > 0 && (
              <span
                className="hidden shrink-0 rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground sm:inline-flex"
                title={`Cases ${(BLOCK - 1) * BLOCK_SIZE + 1}-${(BLOCK - 1) * BLOCK_SIZE + DEMO_CASES.length} of the batch`}
              >
                Block {BLOCK}/{TOTAL_BLOCKS}
              </span>
            )}
            {/* Download at ANY time, in either format (2026-09-02 / -09-03). It used to live
                only on the completion screen, so a rater who stopped at case 60 of 100 left us
                nothing. Rows are emitted for touched cases only, so a partial file is simply a
                shorter file. Two formats because they answer different questions: CSV is what
                analysis reads, JSON is what "Restore from file" accepts. Naming them by purpose
                rather than by extension is the difference between a rater picking the right one
                and picking the first one. */}
            {/* Dev-only (Yang, 2026-09-08): a clinician has no use for the export —
                their answers are already in the database — and it carries the response
                text and join keys. Kept in the dev build as the recovery path. */}
            {IS_DEV_BUILD && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Download your answers so far. Progress is also saved in this browser automatically."
                  >
                    Download progress
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-2 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {submittedCount} of {DEMO_CASES.length} case(s) submitted
                    {BLOCK > 0 ? ` in block ${BLOCK}` : ''}. Cases you have not touched are left out.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      downloadText(
                        `clinician-review-${session.reviewer || 'anon'}${BLOCK > 0 ? `-b${BLOCK}` : ''}.csv`,
                        'text/csv',
                        toCSV(session),
                      )
                      toast.success('CSV downloaded')
                    }}
                  >
                    CSV — send this in
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      downloadText(
                        `clinician-review-${session.reviewer || 'anon'}${BLOCK > 0 ? `-b${BLOCK}` : ''}.json`,
                        'application/json',
                        toJSON(session),
                      )
                      toast.success('JSON downloaded — keep it to resume on another machine')
                    }}
                  >
                    JSON — to resume later
                  </Button>
                </PopoverContent>
              </Popover>
            )}
            {/* A3 (Yang 6:22): the reveal button must not exist in the clinician
                build. IS_DEV_BUILD is a build-time constant, so this whole subtree
                — and the ArmBadge it drives — is eliminated from that bundle. */}
            {IS_DEV_BUILD && (
              <Button
                type="button"
                variant={reveal ? 'default' : 'outline'}
                size="sm"
                title="Internal review only — show which arm (base / ours / ground truth) each response is. Not saved, not exported."
                className={reveal ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border-dashed text-muted-foreground'}
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? 'Arms revealed' : 'Reveal arms'}
              </Button>
            )}
            {/* A3: one mis-click behind one confirm wipes an entire round. Dev only. */}
            {IS_DEV_BUILD && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  if (
                    window.confirm(
                      'Start over? This clears all your answers for every pair.',
                    )
                  ) {
                    clear()
                    dispatch({ type: 'RESET_ALL' })
                  }
                }}
              >
                Start over
              </Button>
            )}
          </div>
        </div>
      </header>

      {UI_FLAGS.taskStrip && (
        <FutureRiskStrip
          caseId={demoCase.case_id}
          responseCount={demoCase.responses.length}
          onGoToScoring={goToScoring}
        />
      )}

      {/* Section anchors drive the step rail and the submit bar's "Go to scoring" jump; the
          scroll-mt keeps the sticky header from covering whatever we just scrolled to. */}
      <main
        key={i}
        className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 pt-6 pb-28 animate-in fade-in duration-300"
      >
        <div id={SECTION_IDS.panel} className="scroll-mt-24">
          <CaseContextPanel
            caseId={demoCase.case_id}
            demographics={demoCase.demographics}
            ehrHistory={demoCase.ehr_history}
          />
        </div>
        <div id={SECTION_IDS.query} className="scroll-mt-24">
          <QueryBubble queryText={demoCase.query_text} />
        </div>
        {session.layoutMode === 'compare' ? (
          // READ-ONLY comparison: all responses side by side, no scoring controls — there is no
          // A-vs-B comparison rubric yet, so the Likert scales live in the focus view only.
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight">
                All responses — side by side
              </h2>
              {/* Bright blue solid — the compare view's one way back into the scoring flow, so it
                  must not read as a quiet default button. */}
              <Button
                type="button"
                size="lg"
                onClick={goToScoring}
                className="bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                <ClipboardCheck className="size-5" />
                Back to scoring
              </Button>
            </div>
            <div id={SECTION_IDS.summaries} className="scroll-mt-24">
              <ResponsePair
                responses={demoCase.responses}
                streamEnabled={!caseRubric.revealed}
                onAllRevealed={() => dispatch({ type: 'REVEAL_CASE', caseIndex: i })}
              />
            </div>
          </section>
        ) : (
          // Focus mode merges "read" and "score" into one split view; it carries the rubric
          // anchor that goToScoring targets.
          <div id={SECTION_IDS.rubric} className="scroll-mt-24">
            <FocusReview
              responses={demoCase.responses}
              state={caseRubric.state}
              dispatch={caseDispatch}
              onCompare={() => dispatch({ type: 'SET_LAYOUT_MODE', mode: 'compare' })}
              onFocusResponse={(label) =>
                dispatch({ type: 'FOCUS_RESPONSE', label, at: Date.now() })
              }
            />
          </div>
        )}
      </main>

      <SubmitBar
        state={caseRubric.state}
        onSubmit={handleSubmit}
        onGoToScoring={goToScoring}
        onBack={() => dispatch({ type: 'GOTO_CASE', caseIndex: i - 1 })}
        onSkip={() => {
          dispatch({ type: 'GOTO_CASE', caseIndex: i + 1 })
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        canGoBack={i > 0}
        isLast={i === DEMO_CASES.length - 1}
        demoCase={demoCase}
      />
      <AppFooter />
    </div>
    </RevealContext.Provider>
  )
}

export default App

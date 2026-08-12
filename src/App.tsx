import { useReducer, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { DEMO_CASES } from '@/data/demo-cases'
import {
  sessionReducer,
  initialSessionState,
  allCasesSubmitted,
} from '@/lib/session'
import type { SessionState, SessionAction } from '@/lib/session'
import type { RubricAction } from '@/lib/types'
import { load, save, clear } from '@/lib/storage'
import { SECTION_IDS, scrollToSection } from '@/lib/sections'
import { UI_FLAGS } from '@/lib/ui-flags'
import { TaskStrip } from '@/components/TaskStrip'
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
  const debounceRef = useRef<number | null>(null)

  // Debounced persist; coalesces note keystrokes.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => save(session), 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [session])

  // Synchronous write that cancels the pending debounce — used on Submit so a
  // navigation can never drop the just-committed picks.
  const flush = (next: SessionState) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    save(next)
  }

  if (session.view === 'landing') {
    return (
      <LandingScreen
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

  const i = session.currentCaseIndex
  const demoCase = DEMO_CASES[i]
  const caseRubric = session.cases[i]

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
    const durationSeconds =
      session.caseEnteredAt != null
        ? Math.round((Date.now() - session.caseEnteredAt) / 1000)
        : null
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
    flush(next) // persist the post-nav state synchronously
    toast.success('Submitted ✓')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
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
          </div>
        </div>
      </header>

      {UI_FLAGS.taskStrip && (
        <TaskStrip responseCount={demoCase.responses.length} onGoToScoring={goToScoring} />
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
            category={demoCase.category}
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
  )
}

export default App

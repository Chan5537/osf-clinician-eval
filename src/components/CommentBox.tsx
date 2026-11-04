import { useEffect, useId, useRef, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { COMMENT_MAX_CHARS } from '@/lib/types'
import { cn } from '@/lib/utils'

// OPTIONAL FREE-TEXT COMMENT (2026-11-03, Prof. Yang + clinician request). Used twice:
//   FocusReview — under one response's five Likert scales ("Comments on Response A")
//   RankOrder   — under the overall ranking ("Comments on your ranking")
//
// NEUTRAL STYLING ON PURPOSE: muted card, no axis hue, so it never reads as a sixth scale. Comments
// are never required and never affect completion.
//
// LOCAL DRAFT, THEN COMMIT. The text lives in local state and reaches the session (SET_COMMENT)
// on blur, after 600 ms without typing, and on unmount. NOT on every keystroke: each dispatch
// re-renders the whole App (letters included) and settles the timing ledger.
// ⛔ THE UNMOUNT FLUSH IS LOAD-BEARING. FocusReview remounts the rubric pane on every tab switch
// (key={r.label}), so a draft typed just before clicking another response would otherwise be lost.
//
// BLINDING: no arm / system / model / outcome wording in anything rendered here.

const IDLE_COMMIT_MS = 600
const COUNTER_FROM = Math.floor(COMMENT_MAX_CHARS * 0.8)

export function CommentBox({
  label,
  placeholder,
  value,
  onCommit,
  className,
}: {
  label: string
  placeholder: string
  value: string
  onCommit: (text: string) => void
  className?: string
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)

  // Adopt a change that arrives from outside (a server hydrate, or the same ranking comment edited
  // in the other view) — but never overwrite what the rater is typing right now.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (!editing) setDraft(value)
  }

  // The latest draft/value/callback, for the idle timer and the unmount flush (which must not
  // close over a stale render).
  const latest = useRef({ draft, value, onCommit })
  useEffect(() => {
    latest.current = { draft, value, onCommit }
  })

  const flush = () => {
    const p = latest.current
    if (p.draft !== p.value) p.onCommit(p.draft)
  }

  // Idle commit: 600 ms after the last keystroke.
  useEffect(() => {
    const t = window.setTimeout(flush, IDLE_COMMIT_MS)
    return () => window.clearTimeout(t)
  }, [draft])

  // Unmount commit (tab switch, case change, view change).
  useEffect(() => () => flush(), [])

  return (
    <div className={cn('rounded-md border bg-muted/30 p-3', className)}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold">
        <MessageSquareText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {label}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <p id={hintId} className="sr-only">
        Optional. Saved automatically as you type.
      </p>
      <Textarea
        id={id}
        aria-describedby={hintId}
        value={draft}
        placeholder={placeholder}
        maxLength={COMMENT_MAX_CHARS}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft !== value) onCommit(draft)
        }}
        className="mt-2 min-h-20 max-h-60 overflow-y-auto bg-background dark:bg-background"
      />
      {draft.length >= COUNTER_FROM && (
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {draft.length.toLocaleString()} / {COMMENT_MAX_CHARS.toLocaleString()}
        </p>
      )}
    </div>
  )
}

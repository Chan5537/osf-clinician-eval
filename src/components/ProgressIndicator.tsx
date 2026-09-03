import { useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  current: number
  total: number
  submitted: boolean[]
  onGoto?: (index: number) => void
}

// Two shapes, because a hundred-case batch broke the one we had.
//
// <= DOTS_MAX cases: a clickable dot per case, so a reviewer can jump anywhere without
// submitting first (answers persist per case).
// Above that: the dot row ran the full width of the header and squeezed the logo and the
// buttons off it. A bar plus "n submitted" carries the same two facts — where I am, how much
// is done — in fixed width, and the jump lives in the number field next to it.
const DOTS_MAX = 25

export function ProgressIndicator({ current, total, submitted, onGoto }: Props) {
  if (total > DOTS_MAX) {
    return <CompactProgress current={current} total={total} submitted={submitted} onGoto={onGoto} />
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Case {current + 1} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === current
          const isDone = submitted[i]
          const clickable = !!onGoto && !isCurrent
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to case ${i + 1}${isDone ? ' (submitted)' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
              disabled={!clickable}
              onClick={clickable ? () => onGoto(i) : undefined}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                isCurrent
                  ? 'bg-primary ring-2 ring-primary/30 ring-offset-1'
                  : isDone
                    ? 'bg-primary/60'
                    : 'bg-muted-foreground/30',
                clickable && 'cursor-pointer hover:bg-primary/80',
                isCurrent && 'cursor-default',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

// Large batches: a bar, a jump field, and one shortcut. Three ways to move, because with a
// hundred cases "click the dot" is gone and scrolling back to find where you stopped is not a
// navigation model.
function CompactProgress({ current, total, submitted, onGoto }: Props) {
  const done = submitted.filter(Boolean).length
  const barRef = useRef<HTMLDivElement>(null)
  // The field holds a DRAFT: committing on every keystroke made typing "45" travel through
  // case 4 first, re-rendering the whole case on the way. Enter or blur commits; Escape reverts.
  const [draft, setDraft] = useState(String(current + 1))
  useEffect(() => setDraft(String(current + 1)), [current])

  const commit = () => {
    const n = Number(draft)
    if (Number.isInteger(n) && n >= 1 && n <= total) onGoto?.(n - 1)
    else setDraft(String(current + 1))
  }

  // The next case with nothing submitted, wrapping past the end — the "where was I" answer for
  // a rater who left mid-batch and came back.
  const nextUnscored = (() => {
    for (let i = current + 1; i < total; i++) if (!submitted[i]) return i
    for (let i = 0; i <= current; i++) if (!submitted[i]) return i
    return -1
  })()

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        Case {current + 1} of {total} · {done} submitted
      </span>
      <div className="flex items-center gap-2">
        {/* Click anywhere on the bar to jump there — the dots' one-click feel, at scale. */}
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label={`Case ${current + 1} of ${total}; ${done} submitted. Click to jump.`}
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          title="Click to jump to that point in the batch"
          className="relative h-2.5 w-36 cursor-pointer overflow-hidden rounded-full bg-muted-foreground/20"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && current + 1 < total) onGoto?.(current + 1)
            if (e.key === 'ArrowLeft' && current > 0) onGoto?.(current - 1)
          }}
          onClick={(e) => {
            const rect = barRef.current?.getBoundingClientRect()
            if (!rect || !onGoto) return
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            onGoto(Math.min(total - 1, Math.floor(ratio * total)))
          }}
        >
          <div
            className="h-full rounded-full bg-primary/60 transition-[width]"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
          {/* Where the reviewer is standing, which the fill alone does not say: submitted cases
              need not be the ones behind them. */}
          <span
            className="absolute top-0 h-full w-0.5 bg-primary"
            style={{ left: `${total > 1 ? (current / (total - 1)) * 100 : 0}%` }}
            aria-hidden="true"
          />
        </div>
        <input
          type="number"
          min={1}
          max={total}
          value={draft}
          aria-label="Jump to case number"
          title="Type a case number, then Enter"
          className="h-7 w-16 rounded-md border bg-background px-2 text-xs tabular-nums"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setDraft(String(current + 1))
          }}
          onBlur={commit}
        />
        <button
          type="button"
          disabled={nextUnscored < 0 || nextUnscored === current}
          onClick={() => nextUnscored >= 0 && onGoto?.(nextUnscored)}
          title={nextUnscored >= 0 ? `Go to case ${nextUnscored + 1} — the next one not yet submitted` : 'Every case is submitted'}
          className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-40"
        >
          <SkipForward className="size-3" aria-hidden="true" />
          Next unscored
        </button>
      </div>
    </div>
  )
}

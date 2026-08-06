import { cn } from '@/lib/utils'

interface Props {
  current: number
  total: number
  submitted: boolean[]
  onGoto?: (index: number) => void
}

// "Case n of N" + step dots. A dot is clickable only for already-submitted
// cases or the current one (forward navigation to unseen cases stays Submit-only).
// aria-labels say "Case 1/2/3" — never echo query_id (design blinding).
export function ProgressIndicator({ current, total, submitted, onGoto }: Props) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Case {current + 1} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === current
          const isDone = submitted[i]
          const clickable = !!onGoto && (isDone || isCurrent)
          return (
            <button
              key={i}
              type="button"
              aria-label={`Case ${i + 1}${isDone ? ' (submitted)' : ''}`}
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
                clickable && !isCurrent && 'hover:bg-primary/80 cursor-pointer',
                !clickable && 'cursor-default',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

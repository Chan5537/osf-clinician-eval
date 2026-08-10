import { cn } from '@/lib/utils'

interface Props {
  current: number
  total: number
  submitted: boolean[]
  onGoto?: (index: number) => void
}

// "Case n of N" + step dots. Every dot is clickable so a reviewer can jump freely to ANY case —
// forward to skip ahead, back to revisit — without having to submit first (answers persist per case).
// A submitted case reads darker; the current one has a ring. aria-labels say "Case 1/2/3" — never
// echo query_id (design blinding).
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

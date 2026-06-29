import { useRef } from 'react'
import { ResponseCard } from '@/components/ResponseCard'
import type { ResponseEntry } from '@/lib/types'

interface Props {
  responses: ResponseEntry[] // ordered, blinded, shuffled; length 2 or 3
  // Streaming reveal: enabled => cards animate on mount; false => render full (revisit).
  streamEnabled: boolean
  onAllRevealed?: () => void
}

// All responses side-by-side on desktop, stacked below md. Cards stream in parallel
// (identical treatment keeps the blinding intact). The caption keeps the clinician aware
// that ordering is randomized and source-blinded.
export function ResponsePair({ responses, streamEnabled, onAllRevealed }: Props) {
  // Count finished cards across renders; fire onAllRevealed exactly once when all are done.
  // The parent remounts this component per case (<main key={i}>), so the ref resets per case.
  const revealedRef = useRef(0)
  const firedRef = useRef(false)
  const handleRevealed = () => {
    revealedRef.current += 1
    if (revealedRef.current >= responses.length && !firedRef.current) {
      firedRef.current = true
      onAllRevealed?.()
    }
  }

  const cols = responses.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'

  return (
    <div className="space-y-3">
      <p className="text-xs italic text-muted-foreground">
        Responses shown in randomized order, source-blinded
      </p>
      <div className={`grid grid-cols-1 gap-4 ${cols}`}>
        {responses.map((r) => (
          <ResponseCard
            key={r.label}
            label={r.label}
            markdown={r.markdown}
            streamEnabled={streamEnabled}
            onRevealed={handleRevealed}
          />
        ))}
      </div>
    </div>
  )
}

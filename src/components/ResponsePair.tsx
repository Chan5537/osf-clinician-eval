import { useRef } from 'react'
import { ResponseCard } from '@/components/ResponseCard'
import type { ResponseEntry } from '@/lib/types'

interface Props {
  responses: ResponseEntry[] // ordered, blinded, shuffled; length 2 or 3
  // Streaming reveal: enabled => cards animate on mount; false => render full (revisit).
  streamEnabled: boolean
  onAllRevealed?: () => void
}

// All responses side-by-side on desktop, stacked below md. Cards stream in parallel and get
// identical treatment, which is what keeps the blinding intact.
//
// The randomization itself happens in the exporter, which shuffles display order per case; the
// former "shown in randomized order, source-blinded" caption that said so was dropped on request.
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
  )
}

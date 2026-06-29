import { useEffect, useMemo, useRef, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { useReducedMotion } from '@/lib/use-reduced-motion'

interface Props {
  markdown: string
  // false => render the full markdown immediately (revisit, or while another case is active)
  enabled: boolean
  // chars/sec; tuned so a typical letter reveals in ~6–10s. Long letters are capped.
  speedCps?: number
  onDone?: () => void
  className?: string
}

// Split the source into a streamable PROSE PREFIX and a MEDIA TAIL (the risk figure
// image line + the GFM footnote/reference block). We progressively reveal the prose, then
// append the tail ATOMICALLY at the end — so a base64 image or a half-formed [^1] footnote
// never flashes broken mid-reveal. The tail boundary = the earliest of the first image line
// (`![`) or the first footnote definition (`[^x]:`) / "References" header.
function splitProseAndTail(md: string): { prose: string; tail: string } {
  const candidates: number[] = []
  const img = md.search(/^!\[/m)
  if (img !== -1) candidates.push(img)
  const footnote = md.search(/^\[\^[^\]]+\]:/m)
  if (footnote !== -1) candidates.push(footnote)
  const refsHeader = md.search(/^#{1,6}\s+(References|References and additional resources)/im)
  if (refsHeader !== -1) candidates.push(refsHeader)
  if (candidates.length === 0) return { prose: md, tail: '' }
  const cut = Math.min(...candidates)
  return { prose: md.slice(0, cut), tail: md.slice(cut) }
}

const MIN_DURATION_MS = 1500
const MAX_DURATION_MS = 9000
const TICK_MS = 40

export function StreamingMarkdown({
  markdown,
  enabled,
  speedCps = 600,
  onDone,
  className,
}: Props) {
  const reduced = useReducedMotion()
  const { prose, tail } = useMemo(() => splitProseAndTail(markdown), [markdown])
  const animate = enabled && !reduced && prose.length > 0

  // When animating, reveal chars within the prose prefix over time; otherwise the value is
  // ignored and the full markdown is rendered directly (no setState needed for that path).
  const [revealed, setRevealed] = useState(0)
  const doneRef = useRef(false)

  const fireDone = () => {
    if (!doneRef.current) {
      doneRef.current = true
      onDone?.()
    }
  }

  useEffect(() => {
    // Non-animated path: report done once on mount. No setState — the render path below
    // already shows the full markdown when !animate, so there is no state to update.
    if (!animate) {
      fireDone()
      return
    }
    // Animated path: advance `revealed` on a fixed tick, with the per-step char count
    // chosen so total reveal time lands in [MIN, MAX]. Clears on unmount/skip.
    const totalMs = Math.min(
      MAX_DURATION_MS,
      Math.max(MIN_DURATION_MS, (prose.length / speedCps) * 1000),
    )
    const steps = Math.max(1, Math.round(totalMs / TICK_MS))
    const perStep = Math.max(1, Math.ceil(prose.length / steps))
    const id = window.setInterval(() => {
      setRevealed((r) => {
        const next = r + perStep
        if (next >= prose.length) {
          window.clearInterval(id)
          fireDone()
          return prose.length
        }
        return next
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
    // Re-run only when the source/animation gate changes (NOT on rubric/note re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, animate, prose.length, speedCps])

  // Non-animated => render the whole letter. Animated => prose slice, then prose+tail at end.
  const proseDone = !animate || revealed >= prose.length
  const shown = !animate ? markdown : proseDone ? prose + tail : prose.slice(0, revealed)

  const skip = () => {
    setRevealed(prose.length)
    fireDone()
  }

  return (
    <div className={className}>
      <Markdown>{shown}</Markdown>
      {animate && !proseDone && (
        <button
          type="button"
          onClick={skip}
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
        >
          Skip ⏭
        </button>
      )}
    </div>
  )
}

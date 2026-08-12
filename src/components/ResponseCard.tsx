import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StreamingMarkdown } from '@/components/StreamingMarkdown'
import { AVATAR_STYLES, CARD_STYLES } from '@/components/response-colors'
import { cn } from '@/lib/utils'
import type { ResponseLabel } from '@/lib/types'

interface Props {
  label: ResponseLabel
  markdown: string
  // Streaming reveal: enabled => animate on mount; false => render full immediately.
  streamEnabled: boolean
  onRevealed?: () => void
}

// A single assistant response. CRITICAL: only ever shows the letter A, B, or C —
// never a source label (Agent / Base / GPT / Gemini / OSF). Source identity
// is blinded.
export function ResponseCard({ label, markdown, streamEnabled, onRevealed }: Props) {
  return (
    // min-w-0: a grid item defaults to min-width:auto, which prevents it from shrinking below its
    // content's intrinsic width (long reference URLs). min-w-0 lets the column shrink so the
    // markdown wraps instead of overflowing/clipping.
    <div className="flex min-w-0 flex-col gap-2">
      {/* Single-line header: with the "assistant" sub-label gone, items-center puts the title's
          baseline block on the avatar's centre, so the title sits level with the letter inside
          the circle instead of riding above it. */}
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9">
          <AvatarFallback className={cn('text-base font-semibold', AVATAR_STYLES[label])}>
            {label}
          </AvatarFallback>
        </Avatar>
        <span className="text-base font-semibold leading-none">Response {label}</span>
      </div>
      <Card className={cn('overflow-hidden py-0', CARD_STYLES[label])}>
        <ScrollArea className="max-h-[600px]">
          <div className="min-w-0 p-4">
            <StreamingMarkdown
              markdown={markdown}
              enabled={streamEnabled}
              onDone={onRevealed}
            />
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

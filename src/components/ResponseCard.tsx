import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StreamingMarkdown } from '@/components/StreamingMarkdown'
import { cn } from '@/lib/utils'
import type { ResponseLabel } from '@/lib/types'

interface Props {
  label: ResponseLabel
  markdown: string
  // Streaming reveal: enabled => animate on mount; false => render full immediately.
  streamEnabled: boolean
  onRevealed?: () => void
}

const AVATAR_STYLES: Record<ResponseLabel, string> = {
  A: 'bg-emerald-200 text-emerald-800',
  B: 'bg-pink-200 text-pink-800',
  C: 'bg-indigo-200 text-indigo-800',
}

const CARD_STYLES: Record<ResponseLabel, string> = {
  A: 'border-emerald-200',
  B: 'border-pink-200',
  C: 'border-indigo-200',
}

// A single assistant response. CRITICAL: only ever shows the letter A, B, or C —
// never a source label (Agent / Base / GPT / Gemini / SleepFM). Source identity
// is blinded.
export function ResponseCard({ label, markdown, streamEnabled, onRevealed }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback className={cn('text-sm font-semibold', AVATAR_STYLES[label])}>
            {label}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Response {label}</span>
          <span className="text-xs text-muted-foreground">assistant</span>
        </div>
      </div>
      <Card className={cn('overflow-hidden py-0', CARD_STYLES[label])}>
        <ScrollArea className="max-h-[600px]">
          <div className="p-4">
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

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  label: string
  text: ReactNode
  /** Visible call to action beside the icon. Omit for an icon-only toggletip. */
  cta?: string
}

// Per-axis help. A bare info icon announces that something exists but not what, so a rater
// stuck between 3 and 4 has no reason to open it; `cta` puts the promise on the surface
// ("What 1-5 mean here" — `here` signals these are THIS scale's definitions, not the general
// guideline they already skimmed). Kept small and muted because it repeats once per scale per
// response, 15 times on a page.
// Implemented as a click/tap Popover toggletip rather than a
// hover Tooltip, because Radix Tooltip does not open on touch and the audience
// may use iPads.
export function AxisHelp({ label, text, cta }: Props) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={cta ?? `What does ${label} mean?`}
        className="inline-flex items-center gap-1 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <Info className="size-3.5 shrink-0" />
        {cta ? (
          <span className="text-xs underline decoration-dotted underline-offset-2">{cta}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 text-sm leading-relaxed">
        {text}
      </PopoverContent>
    </Popover>
  )
}

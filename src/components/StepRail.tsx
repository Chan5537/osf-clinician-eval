import { Check } from 'lucide-react'
import { SECTIONS, scrollToSection, stepNumber } from '@/lib/sections'
import { useActiveSection } from '@/lib/use-section-observer'
import { cn } from '@/lib/utils'

interface Props {
  /** True once every required rubric item on this case has an answer. */
  scoringComplete: boolean
}

const SECTION_IDS_LIST = SECTIONS.map((s) => s.id)

// Treatment 2 (UI_FLAGS.stepRail): a compact rail pinned to the right edge listing the four blocks
// of the page, highlighting whichever is on screen and jumping to it on click.
//
// Unlike a banner it does not get filtered out, because it keeps changing as you scroll — it tells
// you where you are, not just what to do. Reference blocks show a dot; the two action blocks show
// their step number, and Score flips to a tick once the case is fully answered.
//
// `fixed` rather than a layout column on purpose: the content is already max-w-7xl and turning the
// page into a two-column grid to host a 9rem rail would disturb every other block. Hidden below xl,
// where there is no free gutter beside the content.
export function StepRail({ scoringComplete }: Props) {
  const active = useActiveSection(SECTION_IDS_LIST)

  return (
    <nav
      aria-label="Case sections"
      className="fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 rounded-lg border bg-background/90 p-2 shadow-sm backdrop-blur xl:flex"
    >
      {SECTIONS.map((s) => {
        const step = stepNumber(s)
        const isActive = active === s.id
        const done = s.id === SECTIONS[3].id && scoringComplete
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSection(s.id)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
              isActive ? 'bg-muted' : 'hover:bg-muted/60',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done
                  ? 'bg-emerald-600 text-white'
                  : step != null
                    ? isActive
                      ? 'bg-blue-600 text-white'
                      : 'border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                    : isActive
                      ? 'bg-foreground/70 text-background'
                      : 'border border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : step != null ? step : '·'}
            </span>
            <span
              className={cn(
                'text-sm whitespace-nowrap transition-colors',
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

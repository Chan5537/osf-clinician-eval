import { ARM_NAMES, useReveal } from '@/lib/reveal'
import type { ArmId } from '@/lib/types'

// Renders ONLY when the internal reveal switch is on; otherwise null (nothing in the DOM).
export function ArmBadge({ arm }: { arm: ArmId }) {
  const reveal = useReveal()
  if (!reveal) return null
  return (
    <span
      className="ml-2 rounded-md border border-dashed border-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200"
      title="Internal review only — arm identity"
    >
      {ARM_NAMES[arm]}
    </span>
  )
}

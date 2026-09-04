import { useSyncExternalStore } from 'react'
import { Check, CloudUpload, Loader2, TriangleAlert } from 'lucide-react'
import { getSyncStatus, onSyncStatus, flushNow } from '@/lib/sync'

// Upload state, in the header next to the progress indicator.
//
// ⛔ THE COPY MUST NEVER SAY "NOT SAVED".
// Every answer is written to this browser BEFORE any network call, so work is
// never at risk from a failed upload — it is only un-mirrored. A clinician who
// reads "not saved" will stop working and email us, and they will be wrong to.
// The failure wording is therefore "Not uploaded", and the queued wording leads
// with the reassurance ("Saved on this device") before the caveat.
export function SyncStatus() {
  const status = useSyncExternalStore(onSyncStatus, getSyncStatus, getSyncStatus)

  // Kill switch on: there is no backend to report, so render nothing at all
  // rather than a permanently green tick that would misdescribe the round.
  if (status.kind === 'off') return null

  const base =
    'hidden shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium sm:inline-flex'

  if (status.kind === 'saving') {
    return (
      <span className={`${base} border-border bg-muted text-muted-foreground`} aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Saving…
      </span>
    )
  }

  if (status.kind === 'idle') {
    return (
      <span
        className={`${base} border-border bg-muted text-muted-foreground`}
        title="Your answers are saved to your account. You can close this page and resume on any computer."
        aria-live="polite"
      >
        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Saved
      </span>
    )
  }

  // queued | error — both mean "safe here, not yet uploaded".
  const isError = status.kind === 'error'
  return (
    <span
      className={`${base} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100`}
      title={
        isError
          ? `Your answers are safe in this browser. The upload failed: ${status.message}`
          : 'Your answers are safe in this browser and will upload automatically.'
      }
      aria-live="polite"
    >
      {isError ? (
        <TriangleAlert className="size-3.5" aria-hidden="true" />
      ) : (
        <CloudUpload className="size-3.5" aria-hidden="true" />
      )}
      {isError ? 'Not uploaded' : 'Saved on this device'}
      {status.pending > 0 && (
        <span className="tabular-nums opacity-75">· {status.pending} to upload</span>
      )}
      <button
        type="button"
        onClick={() => void flushNow()}
        className="cursor-pointer font-semibold underline underline-offset-2 hover:opacity-80"
      >
        Retry
      </button>
    </span>
  )
}

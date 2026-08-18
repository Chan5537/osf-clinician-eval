// Active-time accounting for the evaluation session.
//
// WHY THIS EXISTS. The original instrumentation stamped `caseEnteredAt` on entry and reported
// `Date.now() - caseEnteredAt` at submit. That number is honest wall clock, but it cannot tell a
// 3.9-hour coffee break apart from 3.9 hours of deliberation — in the 2026-08-18 internal round one
// case reported 13997s for exactly that reason. So we now track THREE quantities and let the
// analyst choose, rather than privileging one:
//
//   • wallMs   — entry -> submit, unconditional. The old `duration_seconds`, preserved verbatim.
//   • activeMs — wall clock MINUS time the rater was demonstrably away.
//   • idleMs   — the difference. wallMs === activeMs + idleMs is an invariant (see advance()).
//
// "Away" is two things: the tab being hidden (visibilitychange), and a stretch with no interaction
// longer than IDLE_TIMEOUT_MS. The second matters because a rater can leave a visible tab open.
//
// Everything here is a PURE function over an explicit clock argument — no Date.now(), no DOM, no
// timers. The caller supplies `now`. That keeps the accounting reducer-safe (React may replay
// reducers under StrictMode) and testable by simulation.

// A stretch with no interaction longer than this counts as idle, even if the tab stayed visible.
// 60s is deliberately generous: reading a long clinical letter without clicking is real work, and
// over-aggressive idling would understate genuine deliberation.
export const IDLE_TIMEOUT_MS = 60_000

export interface TimeAccumulator {
  // Epoch ms when the currently-accruing stretch began; null when parked (hidden/idle).
  runningSince: number | null
  // Epoch ms of the last interaction or tick — the basis for the IDLE_TIMEOUT_MS test.
  lastActivityAt: number
  activeMs: number
  idleMs: number
}

export function newAccumulator(now: number): TimeAccumulator {
  return { runningSince: now, lastActivityAt: now, activeMs: 0, idleMs: 0 }
}

// Fold elapsed time up to `now` into the accumulator, splitting it into active vs idle.
//
// The split rule: a running stretch contributes active time only up to IDLE_TIMEOUT_MS past the
// last interaction; everything beyond that is retroactively reclassified as idle. This is what
// lets a walked-away-with-tab-open case (the 13997s one) resolve correctly after the fact, without
// needing a background timer to have been firing the whole time.
export function advance(acc: TimeAccumulator, now: number): TimeAccumulator {
  if (acc.runningSince === null) return acc // parked: nothing accrues
  if (now <= acc.runningSince) return acc // clock went backwards (NTP/sleep) — never accrue negative

  const elapsed = now - acc.runningSince
  // Active credit is capped by how long we'd been idle-free at the start of this stretch.
  const activeBudget = Math.max(0, acc.lastActivityAt + IDLE_TIMEOUT_MS - acc.runningSince)
  const active = Math.min(elapsed, activeBudget)

  return {
    ...acc,
    runningSince: now,
    activeMs: acc.activeMs + active,
    idleMs: acc.idleMs + (elapsed - active),
  }
}

// Register a real interaction (a rubric pick). Settles time up to `now`, then restarts the
// idle window from `now`.
export function touch(acc: TimeAccumulator, now: number): TimeAccumulator {
  const settled = advance(acc, now)
  return { ...settled, lastActivityAt: now, runningSince: settled.runningSince ?? now }
}

// Tab hidden / rater left: settle up to `now` and park. Time while parked is neither active
// nor idle-accrued here — resume() attributes the whole parked gap to idle.
export function park(acc: TimeAccumulator, now: number): TimeAccumulator {
  if (acc.runningSince === null) return acc
  return { ...advance(acc, now), runningSince: null }
}

// Tab visible again. The entire parked gap is idle by definition — the rater was not looking.
export function resume(acc: TimeAccumulator, now: number, parkedAt: number | null): TimeAccumulator {
  if (acc.runningSince !== null) return acc // already running
  const gap = parkedAt !== null && now > parkedAt ? now - parkedAt : 0
  return { ...acc, runningSince: now, lastActivityAt: now, idleMs: acc.idleMs + gap }
}

export const msToSeconds = (ms: number): number => Math.round(ms / 1000)

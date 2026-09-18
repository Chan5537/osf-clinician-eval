// Property check for reconcile() in src/lib/sync.ts.
//
//   node scripts/checks/reconcile.check.mjs
//
// There is no test framework in this repo (CI's only gate is `tsc -b && vite build`),
// and adding one mid-round is churn. But reconcile() decides which of two sessions a
// clinician keeps when they have worked on two machines — it is the one function whose
// failure silently destroys an afternoon of somebody's work. So it gets a check.
//
// The logic below is a hand-port of the pure function in sync.ts. If you change the
// rule there, change it here and re-run. The last assertion is the one that matters:
// across every combination of progress and revision order, the winner must never hold
// LESS work than the loser.

const submittedCount = (s) => (s && s.cases ? s.cases.filter((c) => c && c.submitted).length : 0)

export function reconcile(local, localRev, server) {
  const l = submittedCount(local)
  const s = submittedCount(server && server.state)
  const base = { localSubmitted: l, serverSubmitted: s }
  if (!local && !server) return { state: null, source: 'fresh', diverged: false, ...base }
  if (!server) return { state: local, source: 'local', diverged: false, ...base }
  if (!local) return { state: server.state, source: 'server', diverged: false, ...base }
  const diverged = l > 0 && s > 0 && l !== s
  if (s > l) return { state: server.state, source: 'server', diverged, ...base }
  if (l > s) return { state: local, source: 'local', diverged, ...base }
  if (server.clientRev > localRev)
    return { state: server.state, source: 'server', diverged: false, ...base }
  return { state: local, source: 'local', diverged: false, ...base }
}

const S = (n, total = 10) => ({ cases: Array.from({ length: total }, (_, i) => ({ submitted: i < n })) })
const srv = (n, rev = 0) => ({ state: S(n), clientRev: rev, updatedAt: '' })

let pass = 0
let fail = 0
const t = (name, got, want) => {
  const ok = got === want
  ok ? pass++ : fail++
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${ok ? '' : `  got=${got} want=${want}`}`)
}

console.log('reconcile()')
t('both empty -> fresh', reconcile(null, 0, null).source, 'fresh')
t('no server -> local (first login adopts local work)', reconcile(S(3), 5, null).source, 'local')
t('no local -> server (new machine)', reconcile(null, 0, srv(4)).source, 'server')
t('server ahead 6v3 -> server', reconcile(S(3), 9, srv(6)).source, 'server')
t('local ahead 6v3 -> local', reconcile(S(6), 1, srv(3)).source, 'local')
t('tie, server rev higher -> server', reconcile(S(4), 2, srv(4, 9)).source, 'server')
t('tie, local rev higher -> local', reconcile(S(4), 9, srv(4, 2)).source, 'local')
t('tie, equal rev -> local', reconcile(S(4), 5, srv(4, 5)).source, 'local')
t('both zero -> local', reconcile(S(0), 0, srv(0)).source, 'local')

console.log('\ndivergence flag (prompt the rater only when both sides hold work and differ)')
t('6 vs 3 -> diverged', reconcile(S(6), 1, srv(3)).diverged, true)
t('3 vs 6 -> diverged', reconcile(S(3), 1, srv(6)).diverged, true)
t('4 vs 4 -> not diverged', reconcile(S(4), 1, srv(4)).diverged, false)
t('0 vs 5 -> not diverged', reconcile(S(0), 1, srv(5)).diverged, false)
t('5 vs 0 -> not diverged', reconcile(S(5), 1, srv(0)).diverged, false)

console.log('\nPROPERTY: the winner never holds less work than the loser')
let violations = 0
for (let l = 0; l <= 10; l++) {
  for (let s = 0; s <= 10; s++) {
    for (const [lr, sr] of [[1, 9], [9, 1], [5, 5]]) {
      const r = reconcile(S(l), lr, srv(s, sr))
      const kept = r.source === 'local' ? l : r.source === 'server' ? s : 0
      if (kept < Math.max(l, s)) {
        violations++
        console.log(`  FAIL local=${l} server=${s} revs=${lr}/${sr} kept=${kept}`)
      }
    }
  }
}
t('all 363 combinations keep max(local, server)', violations, 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

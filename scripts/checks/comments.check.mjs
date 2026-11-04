// Check for the optional clinician comments (2026-11-03) against the REAL modules.
//
//   VITE_SUPABASE_URL= node scripts/checks/comments.check.mjs
//
// There is no test framework in this repo (see reconcile.check.mjs). Unlike that check, this one
// does not hand-port anything: it loads src/ through Vite's SSR loader, so it exercises the code
// that ships. What it guards, in order of how badly a regression would hurt a live round:
//   * a comment edit must never un-submit a case, nor move its frozen timing;
//   * comments must never become public.rating rows (completion-trigger v_dims; see 012);
//   * a session saved before comments existed must load WITHOUT being discarded;
//   * comments must survive save/load, the server-hydrate sanitize, and export -> restore.
// Run with the backend OFF (empty VITE_SUPABASE_URL): nothing here should touch the network.
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { createServer } = await import(APP + '/node_modules/vite/dist/node/index.js')

// Minimal browser globals the modules touch at import time.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}
globalThis.window = globalThis
globalThis.document = { addEventListener() {}, hidden: false }
globalThis.addEventListener = () => {}

const server = await createServer({ root: APP, configFile: APP + '/vite.config.ts', logLevel: 'error',
  server: { middlewareMode: true }, appType: 'custom' })
const L = (p) => server.ssrLoadModule(p)
const { DEMO_CASES } = await L('/src/data/demo-cases.ts')
const { sessionReducer, initialSessionState, SCHEMA_VERSION } = await L('/src/lib/session.ts')
const { isComplete, pickCount, requiredCount, likertKeysFor } = await L('/src/lib/reducer.ts')
const { save, load, sanitizeSession, restoreFromExport } = await L('/src/lib/storage.ts')
const { buildRows, buildCommentRows, toJSON } = await L('/src/lib/export.ts')
const { ratingRowsForCase, commentRowsForCase } = await L('/src/lib/sync-rows.ts')
const { RUBRIC_VERSION } = await L('/src/lib/rubric-config.ts')

let pass = 0, fail = 0
const t = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${!ok && extra ? '  ' + extra : ''}`) }

const dc = DEMO_CASES[0]
const labels = dc.responses.map((r) => r.label)
let s = initialSessionState()
s = sessionReducer(s, { type: 'BEGIN' })
const R = (action) => (s = sessionReducer(s, { type: 'RUBRIC', caseIndex: 0, action }))

t('initial comments empty for every present letter', JSON.stringify(s.cases[0].state.comments) ===
  JSON.stringify({ likert: Object.fromEntries(labels.map((l) => [l, ''])), rank: '' }))

R({ type: 'SET_COMMENT', scope: 'likert', label: 'A', text: '  A missed it  ' })
R({ type: 'SET_COMMENT', scope: 'rank', text: 'none adequate' })
t('comments do not count as answered items', pickCount(s.cases[0].state, dc) === 0)
t('required count unchanged (likert cells + rank places)', requiredCount(dc) === likertKeysFor(dc).length + dc.responses.length)
t('comments do not make a case complete', !isComplete(s.cases[0].state, dc))
t('likert comment retargets focused response (pre-submit)', s.cases[0].timing.focusedLabel === 'A')
R({ type: 'SET_COMMENT', scope: 'likert', label: 'B', text: 'x'.repeat(2500) })
t('reducer clamps to 2000 chars', s.cases[0].state.comments.likert.B.length === 2000)
R({ type: 'SET_COMMENT', scope: 'likert', label: 'B', text: '' })

// rating rows must be untouched by comments
const before = buildRows(s).length
t('buildRows emits no comment rows', buildRows(s).every((r) => r.kind === 'likert' || r.kind === 'rank'))
t('no rating dimension ever named like a comment', buildRows(s).every((r) => !/comment/.test(String(r.dimension))))

// fill everything and submit
for (const k of likertKeysFor(dc)) R({ type: 'SET_LIKERT', key: k, value: 3 })
labels.forEach((l, i) => R({ type: 'SET_RANK', label: l, value: i + 1 }))
t('complete once scores + ranks done (comments irrelevant)', isComplete(s.cases[0].state, dc))
s = sessionReducer(s, { type: 'SUBMIT_CASE', caseIndex: 0, at: '2026-11-04T00:00:00Z', durationSeconds: 60 })
const ratingRows = ratingRowsForCase(s, 0, 'uid')
t('rating rows = responses x 6 (unchanged shape)', ratingRows.length === labels.length * 6, String(ratingRows.length))
t('rating rows carry no comment field', ratingRows.every((r) => !('comment' in r)))

const cr = commentRowsForCase(s, 0, 'uid')
t('comment rows: every target incl. blanks (n letters + 1)', cr.length === labels.length + 1, String(cr.length))
t('comment rows trimmed', cr.find((r) => r.target === 'A').comment === 'A missed it')
t('blank target emitted as empty string', cr.find((r) => r.target === 'B').comment === '')
t('rank row: target case, null sha', (() => { const r = cr.find((x) => x.scope === 'rank'); return r.target === 'case' && r.response_sha === null && r.comment === 'none adequate' })())
t('likert rows carry the same sha as the rating rows', cr.filter((r) => r.scope === 'likert').every((c) =>
  ratingRows.find((r) => r.response_label === c.target).response_sha === c.response_sha))
t('no generated column in payload', cr.every((r) => !('response_label' in r)))
t('comment rows carry rubric/schema version + submitted_at', cr.every((r) => r.rubric_version === RUBRIC_VERSION && r.schema_version === SCHEMA_VERSION && r.submitted_at === '2026-11-04T00:00:00Z'))
const s2 = sessionReducer(initialSessionState(), { type: 'BEGIN' })
t('unsubmitted case -> no comment rows', commentRowsForCase(s2, 0, 'uid').length === 0)

// THE key behaviour: a comment edit on a submitted case does not un-submit and does not move timing
const timingBefore = JSON.stringify(s.cases[0].timing)
R({ type: 'SET_COMMENT', scope: 'likert', label: 'C', text: 'added after submit' })
t('comment edit keeps case submitted', s.cases[0].submitted === true && s.cases[0].submittedAt === '2026-11-04T00:00:00Z' && s.cases[0].durationSeconds === 60)
t('comment edit after submit leaves timing frozen', JSON.stringify(s.cases[0].timing) === timingBefore)
R({ type: 'SET_LIKERT', key: likertKeysFor(dc)[0], value: 4 })
t('control: score edit still un-submits', s.cases[0].submitted === false)
s = sessionReducer(s, { type: 'SUBMIT_CASE', caseIndex: 0, at: '2026-11-04T00:01:00Z', durationSeconds: 70 })

// persistence: save/load and server-style sanitize keep comments
save(s)
const loaded = load()
t('save/load round-trips comments', loaded.cases[0].state.comments.likert.C === 'added after submit' && loaded.cases[0].state.comments.rank === 'none adequate')
t('sanitizeSession keeps comments (server hydrate path)', sanitizeSession(JSON.parse(JSON.stringify(s))).cases[0].state.comments.likert.A === '  A missed it  ')

// backward compatibility: a pre-feature blob (no comments) loads, keeps scores, no discard
const key = [...store.keys()].find((k) => k.startsWith('clinician-eval-session::'))
const env = JSON.parse(store.get(key))
for (const c of env.session.cases) delete c.state.comments
store.set(key, JSON.stringify(env))
const old = load()
t('pre-feature blob is NOT discarded (same SCHEMA_VERSION)', old !== null)
t('pre-feature blob keeps scores + submitted flag', old.cases[0].submitted === true && old.cases[0].state.likert[likertKeysFor(dc)[0]] === 4)
t('pre-feature blob gets empty comments', old.cases[0].state.comments.rank === '' && labels.every((l) => old.cases[0].state.comments.likert[l] === ''))

// hostile blob: foreign letter, non-string, over-long
const bad = JSON.parse(JSON.stringify(s))
bad.cases[0].state.comments = { likert: { A: 42, Z: 'foreign', B: 'y'.repeat(5000) }, rank: { not: 'a string' } }
const clean = sanitizeSession(bad).cases[0].state.comments
t('sanitize drops non-strings and foreign letters, clamps length', clean.likert.A === '' && !('Z' in clean.likert) && clean.likert.B.length === 2000 && clean.rank === '')

// AUTOFILL keeps comments
const af = sessionReducer(s, { type: 'AUTOFILL_ALL', at: 'x' })
t('autofill preserves comments', af.cases[0].state.comments.likert.C === 'added after submit')

// JSON export -> restore round trip
const exported = toJSON(s)
const parsed = JSON.parse(exported)
t('JSON export carries comments array (non-blank only)', Array.isArray(parsed.comments) && parsed.comments.length === 3, String(parsed.comments?.length))
t('buildCommentRows has no arm column', buildCommentRows(s).every((r) => !('arm' in r)))
store.clear()
restoreFromExport(exported)
const restored = load()
t('restoreFromExport restores comments', restored.cases[0].state.comments.likert.A === 'A missed it' && restored.cases[0].state.comments.rank === 'none adequate' && restored.cases[0].state.comments.likert.C === 'added after submit')
const noComments = JSON.parse(exported); delete noComments.comments
store.clear(); restoreFromExport(JSON.stringify(noComments))
t('restore of a pre-feature export still works', load().cases[0].submitted === true)

// RESET clears comments
const rs = sessionReducer(s, { type: 'RUBRIC', caseIndex: 0, action: { type: 'RESET' } })
t('RESET clears comments', rs.cases[0].state.comments.rank === '')

console.log(`\n${pass} passed, ${fail} failed`)
await server.close()
process.exit(fail ? 1 : 0)

// Drains notification_outbox and emails the study operator.
//
// Deploy:  supabase functions deploy notify-completions
// Secrets: supabase secrets set GMAIL_USER=... GMAIL_APP_PASSWORD=... NOTIFY_TO=...
// Schedule: fired immediately by the completion trigger (migration 006); pg_cron every
//           5 minutes is the safety net.
//
// SENDS VIA GMAIL SMTP — the same account and app password already configured under
// Authentication -> Emails for sign-in codes. It previously used Resend's HTTP API, which
// left the project sending through two providers for no reason: auth mail via Gmail,
// notifications via Resend, each with its own way to fail. Resend's sandbox sender also
// only delivers to the Resend account's own address, which is a silent-drop waiting to
// happen. One provider, one set of credentials, one failure mode to reason about.
//
// WHY AN OUTBOX RATHER THAN EMAILING FROM THE TRIGGER
// The trigger runs inside the clinician's submit transaction. An HTTP call there
// would make a clinician's submission depend on an email provider being up, and a
// slow provider would slow their UI. The trigger only writes a row — always fast,
// always local — and this function sends on its own schedule. If it fails, the row
// stays pending and is retried; nothing is lost and no submission is affected.
//
// The link in the email is deliberately NOT the rating data. It points at a
// login-protected dashboard view, so nothing sensitive travels in the message and
// nothing is readable by whoever the mail is forwarded to.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_APP_PASSWORD = (Deno.env.get('GMAIL_APP_PASSWORD') ?? '').replace(/\s+/g, '')
// Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are presentation only
// and SMTP AUTH rejects them, so strip whitespace rather than rely on careful pasting.
const NOTIFY_TO = Deno.env.get('NOTIFY_TO') || GMAIL_USER  // defaults to the sender
// Where the button goes: the project's rating table, behind a dashboard login.
const PROJECT_REF = SUPABASE_URL.split('//')[1]?.split('.')[0] ?? ''

/**
 * Deep link into the SQL editor with this rater's responses already queried.
 *
 * The dashboard accepts `?content=<url-encoded SQL>` on /sql/new, so the operator lands
 * on a populated editor and presses Run — rather than the bare editor they then have to
 * write a query into.
 *
 * Deliberately a QUERY, not the JSON itself: the result requires a dashboard login, so
 * nothing sensitive travels in the email and forwarding it leaks nothing. Ratings can be
 * joined back to the arm key, so a public JSON URL would be a quiet un-blinding vector.
 */
function reviewUrl(email: string, batch: string): string {
  const sql = `-- Responses from ${email} (${batch})
select r.case_id,
       r.response_label,
       br.arm_name                       as arm,
       r.dimension,
       r.value,
       r.submitted_at,
       r.duration_seconds,
       r.active_seconds
  from public.rating r
  join public.rater ra on ra.id = r.rater_id
  join public.batch_response br
    on br.batch = r.batch and br.case_id = r.case_id
   and br.response_label = r.response_label
 where ra.email = '${email.replace(/'/g, "''")}'
   and r.batch = '${batch.replace(/'/g, "''")}'
 order by br.case_position, r.response_label, r.dimension;

-- Same rows as a single JSON document (click the cell to expand):
-- select jsonb_agg(t) from (<the select above>) t;`
  return `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new?content=${encodeURIComponent(sql)}`
}

const MAX_ATTEMPTS = 5

interface OutboxRow {
  id: number
  kind: string
  batch: string
  rater_id: string
  attempts: number
  payload: {
    email?: string
    batch?: string
    rows_submitted?: number
    cases?: number
    completed_at?: string
  }
}

/**
 * Every rating this rater submitted, as analysis-ready rows.
 *
 * Column names and order deliberately MIRROR src/lib/export.ts COLUMNS — the browser
 * export a rater used to download and email in by hand — so the attachment drops into
 * the same analysis without a translation step. The one addition is `arm`, resolved
 * server-side from batch_response; the browser export omits it on purpose, because a
 * rater must not be able to un-blind themselves from their own file.
 */
async function fetchRows(
  supabase: ReturnType<typeof createClient>,
  raterId: string,
  batch: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('rating')
    .select(
      'case_id, response_label, dimension, value, submitted_at, duration_seconds, ' +
        'active_seconds, idle_seconds, response_active_seconds, rubric_version, ' +
        'schema_version, response_sha, batch, rater:rater_id(email), ' +
        'batch_response!inner(arm, arm_name, query_id, case_position)',
    )
    .eq('rater_id', raterId)
    .eq('batch', batch)
  if (error) throw error

  const rows = (data ?? []).map((r) => {
    const br = (r as Record<string, never>).batch_response as unknown as {
      arm?: string
      arm_name?: string
      query_id?: string
      case_position?: number
    }
    const ra = (r as Record<string, never>).rater as unknown as { email?: string }
    return {
      reviewer: ra?.email ?? '',
      case_id: r.case_id,
      query_id: br?.query_id ?? '',
      response_label: r.response_label,
      arm: br?.arm_name ?? br?.arm ?? '',
      batch: r.batch,
      response_sha: r.response_sha,
      // Two row families share this table (v10). 'rank_overall' is the case-level comparative
      // ranking, value = that response's place (1 = best); everything else is a 1–5 Likert scale.
      // Labelling a rank row 'likert' would make the attachment actively misleading and would
      // trip the kind filters the analysis scripts rely on.
      kind: r.dimension === 'rank_overall' ? 'rank' : 'likert',
      dimension: r.dimension,
      value: r.value,
      submitted_at: r.submitted_at,
      duration_seconds: r.duration_seconds,
      active_seconds: r.active_seconds,
      idle_seconds: r.idle_seconds,
      response_active_seconds: r.response_active_seconds,
      rubric_version: r.rubric_version,
      schema_version: r.schema_version,
      _case_position: br?.case_position ?? 0,
    }
  })

  rows.sort(
    (a, b) =>
      (a._case_position as number) - (b._case_position as number) ||
      String(a.response_label).localeCompare(String(b.response_label)) ||
      String(a.dimension).localeCompare(String(b.dimension)),
  )
  for (const r of rows) delete (r as Record<string, unknown>)._case_position
  return rows
}

/** RFC-4180 CSV, mirroring escapeCSV() in src/lib/export.ts (including the Excel guard). */
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return ''
    let s = String(v)
    if (/^[=+\-@]/.test(s)) s = `'${s}` // spreadsheet formula-injection guard
    if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
    return s
  }
  return (
    '\uFEFF' +
    [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') +
    '\r\n'
  )
}

function body(r: OutboxRow): { subject: string; html: string } {
  const p = r.payload
  const who = p.email ?? 'A clinician'
  return {
    subject: `Evaluation complete — ${who}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;line-height:1.5">
        <h2 style="margin:0 0 4px;font-size:18px">Evaluation complete</h2>
        <p style="margin:0 0 16px;color:#555">
          <strong>${who}</strong> has finished the full set.
        </p>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr><td style="padding:2px 16px 2px 0;color:#666">Cases</td><td>${p.cases ?? '—'}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#666">Ratings</td><td>${p.rows_submitted ?? '—'}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#666">Batch</td><td>${p.batch ?? r.batch}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#666">Finished</td><td>${
            p.completed_at ? new Date(p.completed_at).toLocaleString() : '—'
          }</td></tr>
        </table>
        <a href="${reviewUrl(p.email ?? '', p.batch ?? r.batch)}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                  padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600">
          View their responses
        </a>
        <p style="margin:16px 0 0;color:#666;font-size:13px">
          Their full responses are attached as <strong>.json</strong> and
          <strong>.csv</strong>, with arms resolved.
        </p>
        <p style="margin:8px 0 0;color:#888;font-size:12px">
          The link opens the Supabase SQL editor with their responses already queried — press Run.
          You will need to be signed in. The ratings themselves are deliberately not
          included in this email.
        </p>
      </div>`,
  }
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // ?selftest=1 sends one mail immediately, bypassing the outbox entirely.
  //
  // Worth its own path: "no email arrived" has five possible causes (trigger, gateway,
  // credentials, SMTP, delivery) and the outbox route cannot distinguish them. This
  // exercises credentials -> SMTP -> inbox on its own and reports the real error.
  if (new URL(req.url).searchParams.get('selftest') === '1') {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return json({ ok: false, stage: 'config', error: 'GMAIL_USER/GMAIL_APP_PASSWORD not set' })
    }
    try {
      const c = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
        },
      })
      try {
        await c.send({
          from: `UCLA Health Intelligence Lab <${GMAIL_USER}>`,
          to: NOTIFY_TO,
          subject: 'Self-test — clinician evaluation notifications',
          html: '<p>If you are reading this, credentials and SMTP are working.</p>',
        })
      } finally {
        await c.close()
      }
      return json({ ok: true, sent_to: NOTIFY_TO, from: GMAIL_USER })
    } catch (e) {
      return json({ ok: false, stage: 'smtp', error: String(e) })
    }
  }

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return new Response(
      JSON.stringify({
        error:
          'GMAIL_USER and GMAIL_APP_PASSWORD are not set. ' +
          'supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=<16 chars>',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Reply to the CALLER immediately and finish the sending in the background.
  //
  // The work here is slow by nature — 180 rows, two attachments, an SMTP handshake —
  // and it was overrunning pg_net's timeout, which made the immediate kick look flaky
  // even when the mail went out. EdgeRuntime.waitUntil keeps the isolate alive for the
  // promise after the response is returned, so the caller sees a fast 200 and the send
  // still completes.
  //
  // Nothing is lost if the isolate is killed early: the outbox row is only marked sent
  // after the provider accepts it, so cron retries anything unfinished.
  const work = drain(supabase)
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime
  if (runtime?.waitUntil) {
    runtime.waitUntil(work)
    return json({ accepted: true, note: 'sending in background' })
  }
  return json(await work)
})

/** Send every pending notification. Extracted so it can run after the response. */
async function drain(
  supabase: ReturnType<typeof createClient>,
): Promise<{ sent: number; failed: number; failures: string[] }> {
  const { data: rows } = await supabase
    .from('notification_outbox')
    .select('id, kind, batch, rater_id, attempts, payload')
    .is('sent_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(20)

  let sent = 0
  const failures: string[] = []

  for (const r of rows as OutboxRow[]) {
    const { subject, html } = body(r)
    try {
      // Attach the rater's own data, so the round can be archived straight from the
      // inbox without a dashboard round trip. JSON for scripts, CSV for a spreadsheet —
      // the same two formats the browser export offered before collection was automated.
      //
      // ⚠️ Unlike the deep link, THIS PUTS RATING DATA IN AN EMAIL. It is acceptable only
      //    because NOTIFY_TO is the operator's own address. Never add a second recipient
      //    without revisiting that: ratings join to batch_response, so a forwarded
      //    attachment is also a partial un-blinding.
      const attachments: { filename: string; content: string }[] = []
      try {
        const dataRows = await fetchRows(supabase, r.rater_id, r.batch)
        if (dataRows.length > 0) {
          const who = (r.payload.email ?? 'rater').replace(/[^a-zA-Z0-9]+/g, '-')
          const stamp = new Date().toISOString().slice(0, 10)
          const base = `clinician-ratings-${who}-${r.batch}-${stamp}`
          const json = JSON.stringify(
            {
              schema_version: dataRows[0]?.schema_version ?? null,
              rubric_version: dataRows[0]?.rubric_version ?? null,
              batch: r.batch,
              reviewer: r.payload.email ?? null,
              exported_at: new Date().toISOString(),
              reviews: dataRows,
            },
            null,
            2,
          )
          attachments.push({ filename: `${base}.json`, content: btoa(unescape(encodeURIComponent(json))) })
          attachments.push({
            filename: `${base}.csv`,
            content: btoa(unescape(encodeURIComponent(toCSV(dataRows)))),
          })
        }
      } catch (attachErr) {
        // A failed attachment must not cost the notification. Send without it and say so
        // in the log; the deep link still gets the operator to the data.
        console.error('attachment build failed', attachErr)
      }

      const client = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true, // implicit TLS; denomailer handles 465 directly
          auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
        },
      })
      try {
        await client.send({
          from: `UCLA Health Intelligence Lab <${GMAIL_USER}>`,
          to: NOTIFY_TO,
          subject,
          html,
          // denomailer takes attachment content as base64, same as the previous provider.
          attachments: attachments.map((a) => ({
            filename: a.filename,
            encoding: 'base64' as const,
            content: a.content,
            contentType: a.filename.endsWith('.json') ? 'application/json' : 'text/csv',
          })),
        })
      } finally {
        // Always close: a leaked connection would exhaust Gmail's per-session limits and
        // start failing sends that have nothing wrong with them.
        await client.close()
      }
      // Mark sent only after the provider accepted it. A crash before this point
      // means the row stays pending and is retried — at-least-once, which for a
      // notification is the right side to err on.
      await supabase
        .from('notification_outbox')
        .update({ sent_at: new Date().toISOString(), attempts: r.attempts + 1, last_error: null })
        .eq('id', r.id)
      sent++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failures.push(`#${r.id}: ${msg}`)
      await supabase
        .from('notification_outbox')
        .update({ attempts: r.attempts + 1, last_error: msg })
        .eq('id', r.id)
    }
  }

  return { sent, failed: failures.length, failures }
}

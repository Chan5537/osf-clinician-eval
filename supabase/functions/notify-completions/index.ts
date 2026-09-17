// Drains notification_outbox and emails the study operator.
//
// Deploy:  supabase functions deploy notify-completions
// Secrets: supabase secrets set RESEND_API_KEY=... NOTIFY_TO=... NOTIFY_FROM=...
// Schedule: pg_cron, or Supabase Dashboard -> Edge Functions -> Schedules (every 5 min).
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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const NOTIFY_TO = Deno.env.get('NOTIFY_TO')!            // the operator's address
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? 'onboarding@resend.dev'
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
  attempts: number
  payload: {
    email?: string
    batch?: string
    rows_submitted?: number
    cases?: number
    completed_at?: string
  }
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
        <p style="margin:16px 0 0;color:#888;font-size:12px">
          Opens the Supabase SQL editor with their responses already queried — press Run.
          You will need to be signed in. The ratings themselves are deliberately not
          included in this email.
        </p>
      </div>`,
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: rows, error } = await supabase
    .from('notification_outbox')
    .select('id, kind, batch, attempts, payload')
    .is('sent_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  if (!rows?.length) {
    return new Response(JSON.stringify({ sent: 0, note: 'nothing pending' }), { status: 200 })
  }

  let sent = 0
  const failures: string[] = []

  for (const r of rows as OutboxRow[]) {
    const { subject, html } = body(r)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject, html }),
      })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
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

  return new Response(JSON.stringify({ sent, failed: failures.length, failures }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

# Supabase — clinician evaluation round

Everything the backend needs, in the order it must happen.

## Layout

| Path | What it is |
|---|---|
| `migrations/001_init.sql` | Schema: `rater`, `batch_response`, `session_state`, `rating` |
| `migrations/002_rls.sql` | Row level security. **The only security boundary** |
| `<batch>_arm_key.csv` | The frozen un-blinding key (committed on purpose) |
| `extract.sql` | Analysis-ready tidy CSV + three audit queries |
| `../scripts/data/freeze_arm_key.py` | Regenerates/verifies the arm key |
| `../scripts/data/seed_batch.py` | Loads the arm key into `batch_response` |

## Setup, in order

Each step is safe on its own, and steps 1–2 touch no application code.

### 1. Migrations

SQL Editor → paste the **contents** of each file (not its path) → Run.

```
migrations/001_init.sql     then     migrations/002_rls.sql
```

Expect `Success. No rows returned` — these are DDL statements, so zero rows is correct.
Both are idempotent, so re-running after a fix is safe.

⚠️ After `002`, **nobody** can read `batch_response`, including you. Step 3 fixes that.

To copy a file straight to the clipboard:

```bash
pbcopy < supabase/migrations/001_init.sql
```

### 2. Auth configuration

**Authentication → Sign In / Providers → Email**
- **Disable "Enable email signups".** This *is* the access control: with it off, only
  invited addresses can sign in, and the app's `shouldCreateUser: false` turns an
  uninvited address into a clear message rather than a silent new account.
- Keep magic link / email OTP enabled.

**Authentication → URL Configuration**
- Site URL: `https://chan5537.github.io/osf-clinician-eval/` (trailing slash required)
- Redirect URLs: that same URL **and** `http://localhost:5173/osf-clinician-eval/`

The `/osf-clinician-eval/` path matters in both — Vite serves under that base even in
dev, and a mismatch here is the usual cause of "the magic link does nothing".

**Sessions** — raise email OTP expiry to `86400` (24h). Clinicians read mail on a delay,
and SignInScreen's copy already promises 24 hours.

### 3. Invite yourself, then become the researcher

Authentication → Users → **Invite user** → your address. Click the link, then:

```sql
update public.rater set is_researcher = true
 where email = 'parkchanyeong5537@gmail.com';

select email, is_researcher from public.rater;   -- confirm
```

### 4. Seed the arm key

```bash
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # shell only — NEVER in .env or the repo

python3 scripts/data/seed_batch.py            # 30 rows for v611_r10
python3 scripts/data/seed_batch.py --verify   # confirm the DB matches the bundle
```

`seed_batch.py` refuses to run if the bundle and the committed arm key disagree, so a
regenerated batch cannot quietly overwrite the key.

### 5. App environment

`.env.local` for development, repo secrets for CI (`.github/workflows/deploy.yml`):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_APP_MODE=dev        # CI sets 'clinician'
```

The anon key is public by design — it ships in the bundle either way. RLS is what
protects the data.

## Verify before the round opens

Do not skip these. RLS is the only boundary, so it must be observed working.

1. **A second account cannot read someone else's data.** Invite a throwaway address,
   sign in as it, and confirm `rating` / `session_state` return only its own rows.
2. **A non-researcher sees zero arm keys**: `select * from batch_response` must return
   0 rows for that account. This is the check that proves the study stays blinded.
3. **Privilege cannot be self-granted**: as the non-researcher, `update public.rater
   set is_researcher = true where id = auth.uid();` must raise
   `is_researcher is not self-assignable`.
4. **Integrity audit is empty** (`extract.sql`, audit 1).

## Rollback

Set `VITE_SUPABASE_URL=""` and redeploy (~90s). The client is tree-shaken out, the
sign-in gate disappears, and the app returns to localStorage + manual CSV/JSON
download with no code change. Collected rows stay in Postgres and remain extractable.

---

## Completion notifications

One email to the study operator when a clinician finishes the **whole** set — not per
case. At 10 cases x 3-5 raters, per-case mail is ~50 messages, which get filtered and
stop being read; "this rater is done" is 3-5 messages and is the signal that matters.

**Shape:** a trigger writes to `notification_outbox`; an Edge Function drains it and
sends. The database never calls an email provider itself — otherwise a clinician's
submission would depend on that provider being up, and a slow provider would slow their
UI. If sending fails, the row stays pending and is retried.

**The email carries no rating data.** Its button opens a login-protected view, so
nothing sensitive is in the message and forwarding it leaks nothing.

### Setup

**1. Migration** — run `migrations/003_completion_notify.sql` in the SQL editor.

**2. Resend** — sign up at [resend.com](https://resend.com), create an API key. The
sandbox sender `onboarding@resend.dev` works immediately and only delivers to your own
address, which is all this needs. (Verifying a domain also lifts the Supabase auth email
rate limit — see the note below.)

**3. Deploy the function** (needs the Supabase CLI, `brew install supabase/tap/supabase`):

```bash
supabase login
supabase link --project-ref mypuldhldvfomboheczx

supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  NOTIFY_TO=parkchanyeong5537@gmail.com \
  NOTIFY_FROM=onboarding@resend.dev

supabase functions deploy notify-completions
```

**4. Schedule it** — Dashboard → Edge Functions → `notify-completions` → Schedules →
every 5 minutes. (Or `select cron.schedule(...)` if you prefer pg_cron.)

### Checking it

```sql
-- who has finished, and did the mail go out?
select * from public.completion_status;

-- still pending?
select id, kind, attempts, last_error
  from public.notification_outbox where sent_at is null;
```

Force a send without waiting for the schedule:

```bash
curl -X POST "https://mypuldhldvfomboheczx.supabase.co/functions/v1/notify-completions" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

To re-test a notification that already sent, clear the row and re-cross the threshold:

```sql
delete from public.notification_outbox where kind = 'rater_completed';
```

### Note: this also fixes the auth email rate limit

Supabase's built-in SMTP allows only a few messages an hour **project-wide**, and
"Generate link" in the dashboard spends from the same budget — exhausting it locks the
operator out too (it did, on 2026-09-08). Setting the same Resend credentials under
**Authentication → Emails → SMTP Settings** raises that to thousands a day.

Do this before inviting clinicians. Three to five raters requesting links, plus re-sends,
will otherwise hit the cap during the round — and a rate-limited clinician sees nothing
at all.

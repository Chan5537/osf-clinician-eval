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

---

# Email notifications — step by step

**Goal:** one email to you, only when a clinician has finished *all* the cases.

Six steps, about 20 minutes. Do them in order. Steps 1–2 are safe on their own; nothing
sends until step 5.

> **Step 1 is a SQL step and the rest are terminal/dashboard steps — it is the easy one to
> skip.** Without it there is no outbox table and no trigger, so nothing is ever recorded
> and no email can ever send, even with the function deployed and cron running. Confirm it
> before moving on:
>
> ```sql
> select count(*) from public.notification_outbox;   -- 0, not an error
> ```
>
> `relation "public.notification_outbox" does not exist` means Step 1 has not run.

---

## Step 1 — Run the migration

This creates the outbox table and the trigger that watches for a finished rater.

```bash
pbcopy < supabase/migrations/003_completion_notify.sql
```

Then: **SQL Editor** → ⌘A → ⌘V → ⌘↵.

You may get the "destructive operation" warning again — that is the `drop trigger if
exists` line that makes the file re-runnable. Run it.

✅ **Expect:** `Success. No rows returned`

Confirm it landed:

```sql
select count(*) as outbox_table from public.notification_outbox;
select tgname from pg_trigger where tgname = 'rating_completion_notify';
```

`0` and one row named `rating_completion_notify`.

---

## Step 2 — Get a Resend account and API key

Resend is the service that actually sends the mail. Free tier is 3,000/month; you need
about five.

1. Go to **[resend.com](https://resend.com)** → sign up
2. **API Keys** → **Create API Key** → name it `osf-clinician-eval`
3. Copy the key (starts `re_`). **It is shown once.**

No domain setup needed. The sender `onboarding@resend.dev` works immediately — it can
only deliver to your own signup address, which is exactly what you want.

### Where the key goes — and where it must NOT

Resend's quickstart shows the key pasted inline in JavaScript. **Do not do that here.**
Anything under `src/` is compiled into a public bundle served from a public GitHub repo,
so a key there is world-readable. The same goes for `.env.local`: every `VITE_*` value is
inlined into that bundle by design.

The Resend key belongs on Supabase's servers, set in Step 5. It never enters this repo.

| Key | Lives in | Why |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env.local` (gitignored) | Public by design — RLS is what protects the data |
| `RESEND_API_KEY` | `supabase secrets set` | Secret. Sends mail as you |
| `SUPABASE_SERVICE_ROLE_KEY` | Your shell, for one command | Bypasses RLS entirely — full database access |

**If a key is ever pasted somewhere it should not be** — a chat, a commit, a screenshot —
treat it as compromised and rotate it: Resend → API Keys → delete → create a new one, then
re-run `supabase secrets set`. Rotating costs a minute; assuming it was fine can cost your
sending domain's reputation.

---

## Step 3 — Install the Supabase CLI

Download the prebuilt binary. No Homebrew, no Xcode:

```bash
mkdir -p ~/.local/bin
cd /tmp
curl -sL -o supabase.tar.gz \
  https://github.com/supabase/cli/releases/download/v2.117.0/supabase_darwin_arm64.tar.gz
tar -xzf supabase.tar.gz && mv supabase ~/.local/bin/ && chmod +x ~/.local/bin/supabase

# once, if ~/.local/bin is not already on PATH:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

supabase --version    # 2.117.0
```

(Apple Silicon. For Intel, swap `darwin_arm64` for `darwin_amd64`.)

> **Why not `brew install supabase/tap/supabase`?** Homebrew builds it from source and
> fails with *"Your Command Line Tools are too outdated"*, demanding a multi-GB Xcode
> update the CLI itself does not need. The release binary is the same v2.117.0.

---

## Step 4 — Connect the CLI to your project

> **Two places use the Resend key, and they are set differently.** `supabase secrets set`
> configures the *Edge Function* (notifications). The *auth* emails (sign-in links) read
> their key from the SMTP form in the dashboard, which the CLI never touches. Rotating the
> key means updating BOTH, or one of them silently stops working.
>
> Confirm the function's copy with `supabase secrets list` — it prints hashes and
> `updated_at`, so a recent timestamp is the evidence the new key landed.
>
> If `secrets list` reports `Cannot find project ref`, the CLI is looking for
> `supabase/.temp/project-ref`. An older `link` may have written only
> `linked-project.json`; `printf '<project-ref>' > supabase/.temp/project-ref` fixes it
> without re-linking.

⚠️ **Every `supabase` command must be run from `app/`** — the directory holding
`supabase/`. The CLI resolves paths relative to the working directory, so running from
one level up (`clinician_sleepfm_eval_interface/`) fails with
`Entrypoint path does not exist ... /supabase/functions/notify-completions/index.ts`.
Check with `pwd`; it must end in `/app`.

```bash
cd "/Users/chanyeong/Desktop/Research/UCLA Health Intelligence Lab/sleep_foundation_model/clinician_sleepfm_eval_interface/app"

supabase login          # opens a browser
supabase link --project-ref mypuldhldvfomboheczx
```

`link` will ask for your **database password** — the one set when the project was
created. If you do not have it: **Settings → Database → Reset database password**.

---

## Step 5 — Deploy the emailer

Two commands. Replace `re_xxxxxxxx` with your key from step 2.

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  NOTIFY_TO=parkchanyeong5537@gmail.com \
  NOTIFY_FROM=onboarding@resend.dev

supabase functions deploy notify-completions
```

✅ **Expect:** `Deployed Function notify-completions`

Secrets live on Supabase's servers, never in the repo. Confirm with `supabase secrets list`
— you should see `RESEND_API_KEY`, `NOTIFY_TO` and `NOTIFY_FROM`.

**`WARNING: Docker is not running` is harmless here.** Docker is only needed to run
functions locally; deploying builds on Supabase's servers.

---

## Step 6 — Run it on a schedule

The function works the moment it is deployed; a schedule just means you do not have to
trigger it yourself. Two ways, depending on what your dashboard offers.

### Option A — the Cron UI (recommended)

**Dashboard → Integrations → Cron → Jobs → Create job**

(It lives under *Integrations*, not on the Edge Functions page. Earlier versions of this
guide said Edge Functions → Schedules; that tab no longer exists.)

1. **Install the Cron integration** if it is not already listed as Installed.
2. The Type options **Supabase Edge Function** and **HTTP Request** will be greyed out
   with *"pg_net needs to be installed"*. Click **Install pg_net extension** in that
   same form — `pg_net` is what lets Postgres make HTTP calls, which is how cron reaches
   an Edge Function.
3. Then fill in:
   - Name: `drain-notification-outbox` (cannot be renamed later)
   - Schedule: `*/5 * * * *`
   - Type: **Supabase Edge Function** → `notify-completions` → method **POST**
   - **Timeout: `10000`** — the field defaults to `1000`, which is ONE SECOND in
     milliseconds. The function makes a network call to Resend; a 1s budget will often
     abort mid-send and record a timeout instead of delivering.
   - **HTTP Request Body: `{}`** — the function ignores the body, but an empty one can
     upset content-type handling.
   - Headers: leave empty; the dashboard supplies auth for its own Edge Functions.

The UI supplies the auth header itself, so no service-role key is pasted anywhere. Prefer
this over Option B for that reason.

### Option B — SQL (works everywhere)

```bash
pbcopy < supabase/migrations/004_schedule_notify.sql
```

Paste into the SQL Editor, **replace `<SERVICE_ROLE_KEY>` with the real key**, then run.
The placeholder is there because this file is committed; never paste the real key back
into it.

Confirm:

```sql
select jobname, schedule, active from cron.job;
```

### Option C — skip it

With 3–5 raters finishing once each, you can simply run the curl from the testing section
when you want to check, or press **Test** on the function page in the dashboard. The
outbox holds pending notifications indefinitely, so nothing is lost by draining it late.

Scheduling is convenience, not correctness.

---

# Testing it end to end

Nothing has been proven until an email actually arrives.

**1. Complete a round.** Sign in and score every case. Use one case to keep it short:

```bash
VITE_APP_MODE=clinician VITE_ALLOW_PASSWORD_SIGNIN=1 VITE_CASE_LIMIT=1 npm run dev
```

⚠️ With `VITE_CASE_LIMIT=1` the app serves 1 case, but the trigger counts against the
**full 30-response batch in the database** — so it will not fire. To test the trigger
itself, either run all 10 cases, or temporarily narrow the batch:

```sql
-- TEMPORARY: pretend the batch is one case, so 15 ratings counts as complete
delete from public.batch_response
 where batch = 'v611_r10' and case_id <> 'HSP_v7_026';
```

Restore afterwards with `python3 scripts/data/seed_batch.py`.

⚠️ **The trigger only runs when a `rating` row is written.** Changing the batch size (or
running the migration late) does not retroactively fire it. If the threshold became true
without a rating write, nudge the rows — this rewrites them in place and changes no answer:

```sql
update public.rating set updated_at = now() where case_id = 'HSP_v7_026';
```

**2. Check the trigger fired:**

```sql
select * from public.completion_status;
```

One row, `sent_at` still null.

**3. Send without waiting for the schedule.**

Easiest: **Dashboard → Edge Functions → `notify-completions` → Test → Send**. No terminal,
no key.

Or, **in a terminal** (a ```bash block never goes in the SQL editor — pasting `curl` there
gives `syntax error at or near "curl"`):

```bash
curl -X POST "https://mypuldhldvfomboheczx.supabase.co/functions/v1/notify-completions" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Or just wait: cron drains it within 5 minutes.

✅ **Expect:** `{"sent":1,"failed":0,"failures":[]}` — and an email.

**4. Confirm it will not send twice:**

```sql
select email, sent_at from public.completion_status;   -- sent_at now filled
```

Revise an answer in the app; no second email. That is the `unique (kind, rater_id,
batch)` constraint doing its job.

---

# If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `relation "notification_outbox" does not exist` | Step 1 never ran | Run `migrations/003_completion_notify.sql` |
| `completion_status` empty after 003 | No rating write since the trigger existed | `update public.rating set updated_at = now();` |
| `completion_status` empty | Round not actually complete | `select count(*) from rating where submitted_at is not null;` — needs to equal responses × dimensions (150 for the full batch) |
| Row exists, `sent_at` null | Function never ran | Run the curl in step 3; read `last_error` |
| `last_error` mentions 403 | Bad or missing Resend key | Re-run `supabase secrets set` |
| `last_error` mentions "not allowed to send" | Sender not verified | Use `onboarding@resend.dev`, and send to your Resend signup address |
| `Entrypoint path does not exist` | Ran from the wrong directory | `cd` into `app/` (`pwd` must end in `/app`) and retry |
| Function deploy fails | Not linked | Re-run `supabase link` **from `app/`** |
| `WARNING: Docker is not running` | — | Ignore; only needed for local function runs |

Read errors with:

```sql
select id, attempts, last_error, created_at
  from public.notification_outbox where sent_at is null;
```

Reset a notification to test again:

```sql
delete from public.notification_outbox where kind = 'rater_completed';
```

---

# While you are here: fix the auth email limit

**Do this before inviting clinicians.**

Supabase's built-in email allows only a few messages an hour *project-wide*, and
"Generate link" in the dashboard spends from the same budget. Exhausting it locks out
the operator too — it did, on 2026-09-08.

With 3–5 clinicians requesting sign-in links, plus re-sends, you will hit it during the
round, and a rate-limited clinician sees nothing at all.

**Fix** — reuse the Resend credentials from step 2:

**Authentication → Emails → SMTP Settings** → Enable custom SMTP

```
Host:             smtp.resend.com
Port:             587                  <- STARTTLS, not 465
Username:         resend               <- literally this word
Password:         <your RESEND_API_KEY>  (the re_... value, NOT your account password)
Sender email:     onboarding@resend.dev  (or an address at a verified domain)
Sender name:      UCLA Health Intelligence Lab
Minimum interval: 60
```

⚠️ **Use 587, not 465.** Resend accepts both, but Supabase's sender expects STARTTLS;
against 465 (implicit TLS) it fails with a 500 and the unhelpful message
*"Error sending magic link email"*. An earlier version of this file said 465 — that was
wrong, and this is what it looks like when it bites.

If 587 still fails, check in this order:

1. **Resend → Logs.** Nothing there at all = Supabase never reached Resend (host, port or
   credentials). An entry with an error = Resend will name the reason.
2. **Password** is the API key (`re_...`), not the Resend account password — and not a key
   you have since revoked.
3. **Username** is the literal word `resend`, not an email address.
4. **Sender** is `onboarding@resend.dev` or an address at a domain you have verified.

Supabase raises the email rate limit from ~4/hour to 300/hour automatically once custom
SMTP is enabled, so there is nothing to change under Authentication → Rate Limits for
sending. The two worth raising are the **IP-based** ones — hospitals commonly NAT an
entire site behind one address, so several clinicians can look like one IP:

| Setting | Default | Suggested |
|---|---|---|
| Rate limit for token verifications | 30 / 5 min | 60 |
| Rate limit for sign-ups and sign-ins | 30 / 5 min | 60 |

⚠️ `onboarding@resend.dev` only delivers to your own address. **To email real
clinicians you must verify a domain in Resend** (Domains → Add Domain, add the DNS
records). Worth doing before the round opens.

---

# How it works, briefly

```
clinician submits last case
        ↓
trigger counts their submitted ratings
        ↓  (only when every case is done)
row written to notification_outbox        ← unique per rater: fires once, ever
        ↓
Edge Function, every 5 min, drains it
        ↓
Resend → your inbox
```

The database never calls Resend directly. If it did, a clinician's submission would
depend on an email provider being up, and a slow provider would slow their screen. The
trigger only writes a local row; sending happens separately and retries on failure.

**The email contains no rating data** — just counts and a button to a login-protected
view. Emails get forwarded and indexed, and ratings can be joined back to the arm key,
so putting the data in the message would be a quiet un-blinding risk.

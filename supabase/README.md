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

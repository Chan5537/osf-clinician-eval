-- ============================================================================
-- 001_init.sql — clinician evaluation round: schema
--
-- Four tables:
--   rater           one row per clinician (B5: identity)
--   batch_response  the frozen un-blinding key + response snapshot
--   session_state   per-rater resume blob (B6)
--   rating          the tidy fact table, one row per scored cell (B8)
--
-- Design notes that are NOT obvious from the DDL alone are inline below. The
-- short version: `case_id` is not unique across batches, the arm key must
-- survive the app bundle being regenerated, and scores from different rubric
-- versions must never pool.
-- ============================================================================

-- ---------------------------------------------------------------- raters ---
-- id === auth.users.id. No surrogate key: the auth user IS the rater.
create table if not exists public.rater (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,                          -- optional; replaces the old free-text initials
  is_researcher boolean not null default false, -- read-all + arm-key access. NOT self-assignable.
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------- batch manifest / ARM KEY ---
-- THE DURABLE UN-BLINDING KEY.
--
-- The map from the blinded letter a clinician sees (`response_label`) to the
-- source arm (`arm`) otherwise lives in exactly one place: the app bundle
-- src/data/demo-cases.generated.json. Regenerating that file changes the
-- per-case shuffle and silently re-points every score already collected.
-- Snapshotting it here severs that dependency: once seeded, attribution is
-- immune to anything that happens to the bundle.
--
-- Seeded ONCE per batch from supabase/<batch>_arm_key.csv (see
-- scripts/data/freeze_arm_key.py). Never written by the app; readable only by
-- a researcher (see 002_rls.sql), so a rater holding their own access token
-- still cannot un-blind themselves.
--
-- `arm` holds the raw exporter literal. For v611_r10 that is 'A'|'B'|'C' — the
-- SAME alphabet as response_label, which is why they are separate columns and
-- why `arm_name` carries the resolved BASE/OURS/TRUTH.
create table if not exists public.batch_response (
  batch          text not null,
  case_id        text not null,
  response_label text not null check (response_label in ('A','B','C')),
  arm            text not null,
  arm_name       text,                          -- BASE | OURS | TRUTH, once the legend is confirmed
  query_id       text,
  case_position  int  not null,                 -- index within the batch; stable analysis ordering
  response_sha   text not null,                 -- FNV-1a of response_text (mirrors export.ts)
  response_text  text not null,                 -- exact text shown, for provenance/audit
  created_at     timestamptz not null default now(),
  -- case_id RESTARTS at HSP_v7_000 in every batch, so it is never a key alone.
  primary key (batch, case_id, response_label)
);

-- ------------------------------------------------- per-rater resume state ---
-- Exactly one row per (rater, batch): the whole SessionState blob, upserted in
-- place. Current-value-only by design — no history table.
--
-- Stored as jsonb rather than normalized because the reducer already produces a
-- self-contained serializable value, storage.ts already sanitizes it on read,
-- and nothing server-side queries inside it. ~30KB/rater.
create table if not exists public.session_state (
  rater_id       uuid not null references public.rater(id) on delete cascade,
  batch          text not null,
  schema_version int  not null,                 -- guards stored SHAPE compatibility
  rubric_version text not null,                 -- guards QUESTION compatibility
  state          jsonb not null,
  -- Monotonic per-device counter from the client envelope. Used only to break a
  -- tie in reconcile(); wall-clock timestamps are unreliable across machines.
  client_rev     bigint not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (rater_id, batch)
);

-- ------------------------------------------------------------- the ratings ---
-- One row per (rater, batch, case, response, dimension).
-- 10 cases x 3 responses x 5 dimensions = 150 rows for a complete round.
--
-- Column set deliberately mirrors buildRows() in src/lib/export.ts so the server
-- rows and the CSV export can never drift apart in what a "row" means.
create table if not exists public.rating (
  rater_id                uuid not null references public.rater(id) on delete cascade,
  batch                   text not null,
  case_id                 text not null,
  response_label          text not null,
  dimension               text not null,
  value                   smallint check (value between 1 and 5),  -- null = not yet answered

  -- HARD PARTITION KEYS. Two past rubric renames CROSSED OVER (relevance ->
  -- Trustworthiness, justifiability -> Relevance), so pooling rows across
  -- differing rubric_version silently swaps dimensions. Always filter on it.
  rubric_version          text not null,
  schema_version          int  not null,

  -- INTEGRITY TRIPWIRE. The fingerprint of the text THIS rater actually saw.
  -- At extraction, rating.response_sha <> batch_response.response_sha means the
  -- row was scored against different text than what is snapshotted, so its arm
  -- attribution is unsound. Cheap, and it makes that condition detectable
  -- rather than invisible.
  response_sha            text not null,

  -- Case-level facts, denormalized onto each row (matches the export shape).
  submitted_at            timestamptz,
  duration_seconds        int,
  active_seconds          int,
  idle_seconds            int,
  response_active_seconds int,

  updated_at              timestamptz not null default now(),

  primary key (rater_id, batch, case_id, response_label, dimension),

  -- A rating can only exist for a response that was snapshotted. If the bundle
  -- is regenerated with a new shuffle mid-round, writes fail LOUDLY here
  -- instead of quietly orphaning attribution.
  foreign key (batch, case_id, response_label)
    references public.batch_response (batch, case_id, response_label)
);

-- NOTE: there is deliberately NO `arm` column on `rating`. Arms are resolved
-- only at extraction, by joining batch_response. That preserves the blinding
-- property established in app commit c4c9176: the un-blinding key is never in
-- a row a rater can read.

create index if not exists rating_extract_idx
  on public.rating (batch, rubric_version, rater_id);
create index if not exists session_state_batch_idx
  on public.session_state (batch);

-- ------------------------------------------------------------- housekeeping ---
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rating_touch on public.rating;
create trigger rating_touch before update on public.rating
  for each row execute function public.touch_updated_at();

drop trigger if exists session_touch on public.session_state;
create trigger session_touch before update on public.session_state
  for each row execute function public.touch_updated_at();

-- Auto-provision a rater row when an invited user first signs in. SECURITY
-- DEFINER because the new user has no rights on public.rater yet; this is also
-- why `rater` needs no INSERT policy (see 002_rls.sql).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.rater (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

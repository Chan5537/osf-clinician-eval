-- ============================================================================
-- 012_rating_comment.sql — optional free-text clinician comments
--
-- WHY (2026-11-03; Prof. Yang + a clinician in the v66w3_60 round)
-- "If all 3 responses are sub-optimal we have to choose the best of the lot without any input on
-- what could be an optimal response? There is no option to comment." Two optional boxes per case:
--   scope 'likert' — one per response, about that response's five scores   (target 'A'|'B'|'C')
--   scope 'rank'   — one per case, about the overall ranking               (target 'case')
-- Zitao: selected comments go to the supplement / extended data.
--
-- ⛔ WHY A SEPARATE TABLE AND NOT NEW public.rating ROWS
--   notify_complete_raters() (011) sets v_dims = max(count(distinct dimension)) per response and
--   calls a rater complete only when every response reaches it. A comment "dimension" on rating
--   would raise v_dims from 6 to 7 for EVERYONE the moment one rater commented; since comments are
--   optional, nobody else would ever reach it and the completion emails would silently stop.
--   (rating.value is also smallint 1-5; it cannot hold text.)
--   This table carries no trigger, so comments can never fire or block a completion.
--
-- SHAPE
--   * The app upserts EVERY target of a submitted case (blank ones as ''), so each write is a
--     complete, idempotent picture of the case and a cleared comment is overwritten with ''.
--     A complete rater has 60 cases x 4 = 240 rows. Extract with  btrim(comment) <> ''.
--   * response_label is GENERATED from target: the letter for a likert comment, NULL for the
--     ranking comment. That lets a likert comment carry the same batch_response foreign key as
--     rating (a comment can only exist for a snapshotted letter), while the ranking comment skips
--     it (MATCH SIMPLE ignores a FK with a NULL column). ⚠️ Clients must NOT send response_label.
--   * NO `arm` COLUMN — the same blinding property as rating: arms are resolved only at extraction
--     by joining batch_response, which raters cannot read (002_rls.sql).
--   * response_sha = fingerprint of the letter commented on (likert only): the same integrity
--     tripwire as rating.response_sha.
--
-- Idempotent: safe to re-run. Apply BEFORE deploying the app build that writes comments.
-- ============================================================================

create table if not exists public.rating_comment (
  rater_id       uuid not null references public.rater(id) on delete cascade,
  batch          text not null,
  case_id        text not null,
  scope          text not null check (scope in ('likert', 'rank')),
  target         text not null,                 -- 'A'|'B'|'C' for likert, 'case' for rank
  response_label text generated always as
                   (case when target in ('A', 'B', 'C') then target end) stored,
  comment        text not null default '' check (char_length(comment) <= 4000),  -- app caps at 2000
  rubric_version text not null,                 -- same partition key as rating; always filter on it
  schema_version int  not null,
  response_sha   text,                          -- the letter commented on; NULL for the ranking
  submitted_at   timestamptz,                   -- the case's submit stamp
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (rater_id, batch, case_id, scope, target),
  constraint rating_comment_target_matches_scope check (
       (scope = 'likert' and target in ('A', 'B', 'C') and response_sha is not null)
    or (scope = 'rank'   and target = 'case'           and response_sha is null)
  ),
  foreign key (batch, case_id, response_label)
    references public.batch_response (batch, case_id, response_label)
);

create index if not exists rating_comment_extract_idx
  on public.rating_comment (batch, rubric_version, rater_id);

drop trigger if exists rating_comment_touch on public.rating_comment;
create trigger rating_comment_touch before update on public.rating_comment
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS ---
-- Mirrors rating_own (010/011): a rater reads and writes only their own rows, and only for a case
-- they may rate (rating_allowed: an active rater, a case in the batch). Researchers read all.
alter table public.rating_comment enable row level security;

drop policy if exists rating_comment_own on public.rating_comment;
create policy rating_comment_own on public.rating_comment
  for all to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid() and public.rating_allowed(batch, case_id));

drop policy if exists rating_comment_researcher_read on public.rating_comment;
create policy rating_comment_researcher_read on public.rating_comment
  for select to authenticated
  using (public.is_researcher());

revoke all on public.rating_comment from anon;

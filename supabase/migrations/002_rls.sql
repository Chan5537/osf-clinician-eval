-- ============================================================================
-- 002_rls.sql — row level security
--
-- ⚠️ RLS IS THE ONLY SECURITY BOUNDARY HERE.
-- The app is a static site on GitHub Pages and the repo is PUBLIC, so the
-- Supabase anon key ships in the JS bundle. That is normal and expected for
-- Supabase, but it means nothing is protected by obscurity: every guarantee in
-- this round rests on the policies below. Verify them by signing in as a second
-- test account before the round opens (see the plan's Verification section) —
-- do not assume them.
-- ============================================================================

alter table public.rater          enable row level security;
alter table public.batch_response enable row level security;
alter table public.session_state  enable row level security;
alter table public.rating         enable row level security;

-- Researcher predicate.
--   security definer -> reads public.rater WITHOUT re-entering rater's own
--                       policy, which would recurse.
--   stable           -> the planner may inline it instead of re-running per row.
create or replace function public.is_researcher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select r.is_researcher from public.rater r where r.id = auth.uid()), false)
$$;

-- ----------------------------------------------------------------- rater ---
drop policy if exists rater_select_self on public.rater;
create policy rater_select_self on public.rater
  for select to authenticated
  using (id = auth.uid() or public.is_researcher());

drop policy if exists rater_update_self on public.rater;
create policy rater_update_self on public.rater
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT policy on purpose: rows are created only by the
-- on_auth_user_created trigger (SECURITY DEFINER), so a rater cannot insert
-- themselves with is_researcher = true.
--
-- UPDATE is open so a rater can set their own display_name — but that would
-- also let them flip is_researcher and read the arm key. This trigger closes
-- that hole.
-- BOOTSTRAP: `auth.uid()` is NULL when the statement comes from the SQL editor,
-- a migration, or the service-role key rather than a signed-in user. Those callers
-- are already trusted (they bypass RLS entirely), and without this exemption the
-- rule deadlocks: the FIRST researcher can never be created, because granting the
-- flag requires already holding it.
--
-- The guard still does its real job — a signed-in clinician (auth.uid() is not
-- null, is_researcher false) cannot grant themselves access to the arm key.
create or replace function public.guard_rater_privilege()
returns trigger language plpgsql as $$
begin
  if new.is_researcher is distinct from old.is_researcher
     and auth.uid() is not null
     and not public.is_researcher() then
    raise exception 'is_researcher is not self-assignable';
  end if;
  return new;
end $$;

drop trigger if exists rater_guard on public.rater;
create trigger rater_guard before update on public.rater
  for each row execute function public.guard_rater_privilege();

-- ------------------------------------------- batch_response: RESEARCHER ONLY ---
-- This table holds the un-blinding key. A rater must NEVER read it. The app has
-- no reason to query it either: the response text it needs is already in the
-- bundle it downloaded.
drop policy if exists batch_response_researcher on public.batch_response;
create policy batch_response_researcher on public.batch_response
  for select to authenticated
  using (public.is_researcher());

-- No INSERT/UPDATE/DELETE policy at all. RLS default-denies, so the only write
-- path is the service_role key used by the seed script, which bypasses RLS.
-- That is the correct blast radius for an un-blinding key.

-- --------------------------------------------------------- session_state ---
drop policy if exists session_own on public.session_state;
create policy session_own on public.session_state
  for all to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

drop policy if exists session_researcher_read on public.session_state;
create policy session_researcher_read on public.session_state
  for select to authenticated
  using (public.is_researcher());

-- ---------------------------------------------------------------- rating ---
-- `for all` with BOTH using and with check pinned to auth.uid() covers
-- select/insert/update/delete in one policy, and the with-check half is what
-- stops a rater rewriting rater_id to someone else's on update.
--
-- ACCEPTED RISK: this also lets a rater DELETE their own rows. For 3-5 trusted
-- clinicians over a two-week round that is fine. To close it, replace this with
-- separate select/insert/update policies and simply omit delete.
drop policy if exists rating_own on public.rating;
create policy rating_own on public.rating
  for all to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

drop policy if exists rating_researcher_read on public.rating;
create policy rating_researcher_read on public.rating
  for select to authenticated
  using (public.is_researcher());

-- ----------------------------------------------------------------- setup ---
-- Run ONCE, by hand, in the SQL editor, after your own first sign-in:
--
--   update public.rater set is_researcher = true
--    where email = 'parkchanyeong5537@gmail.com';
--
-- Until then NOBODY can read batch_response, including you.

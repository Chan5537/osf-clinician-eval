-- ============================================================================
-- 010_auto_allocate.sql — the server assigns each new clinician a slot
--
-- WHY (2026-10-09)
-- The raters are external and anonymous to us: Prof. Yang cannot share names or
-- emails, so per-person links (009's `?slot=N`) cannot be handed out reliably. There
-- is ONE public link, and the server allocates every new rater to a slot of Zitao's
-- sheet ("OSF - Clinical Evaluation Splitting"): slot N = clinician_N = the chunks
-- slot_covers_case() gives it (1 -> 1,4,5 · 2 -> 1,2,5 · 3 -> 1,2,3 · 4 -> 2,3,4 ·
-- 5 -> 3,4,5).
--
-- THE RULE — claim_slot(), called by the app at a rater's first sign-in:
--   1. Idempotent: a rater who holds a slot gets it back.
--   2. Researchers are never allocated and never counted.
--   3. Least-filled slot wins, counting only ACTIVE holders: active = true AND
--      (has submitted a rating OR was allocated < 48 h ago). A sign-up who never
--      rates stops counting after 48 h, so the next newcomer inherits that slot.
--   4. Ties go in the sheet's order 1, 2, 3, 4, 5: the 1st rater is clinician_1, ...
--      the 6th joins the least-filled slot (clinician_1 again when all are full).
--   5. One transaction-level advisory lock: simultaneous sign-ups get distinct slots.
--
-- GUARDRAILS
--   * rater.slot / active / slot_assigned_at cannot be written by a clinician
--     directly — only by claim_slot(), the SQL editor, or a researcher.
--   * A rating is accepted only for a case in the rater's slot (RLS on `rating`),
--     so an unallocated or stray account cannot score anything, even via the API.
--   * Release a stray or a dropout:  update public.rater set active = false where email = '...';
--
-- Builds on 009 (rater.slot, slot_covers_case). Idempotent: safe to re-run.
-- ============================================================================

alter table public.rater add column if not exists slot_assigned_at timestamptz;
alter table public.rater add column if not exists active boolean not null default true;

-- ---------------------------------------------------------------- guard ---
-- Replaces 009's write-once rule. auth.uid() is still the CALLER inside a security
-- definer function, so claim_slot() marks its own write with a transaction-local flag.
create or replace function public.guard_rater_slot()
returns trigger language plpgsql as $$
begin
  if (new.slot is distinct from old.slot
      or new.active is distinct from old.active
      or new.slot_assigned_at is distinct from old.slot_assigned_at)
     and auth.uid() is not null
     and not public.is_researcher()
     and coalesce(current_setting('app.slot_claim', true), '') <> 'on' then
    raise exception 'slot is assigned by the server';
  end if;
  return new;
end $$;

drop trigger if exists rater_slot_guard on public.rater;
create trigger rater_slot_guard before update on public.rater
  for each row execute function public.guard_rater_slot();

-- ----------------------------------------------------------- allocation ---
create or replace function public.claim_slot()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_me   public.rater%rowtype;
  v_slot int;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.claim_slot'));

  select * into v_me from public.rater where id = v_uid;
  if not found then
    raise exception 'no rater row for this account';
  end if;
  if v_me.is_researcher or v_me.slot is not null then
    return v_me.slot;
  end if;

  select s into v_slot
    from generate_series(1, 5) s
   order by (select count(*)
               from public.rater r
              where r.slot = s
                and r.active
                and not r.is_researcher
                and (r.slot_assigned_at > now() - interval '48 hours'
                     or exists (select 1 from public.rating rt
                                 where rt.rater_id = r.id and rt.submitted_at is not null))),
            s
   limit 1;

  perform set_config('app.slot_claim', 'on', true);
  update public.rater set slot = v_slot, slot_assigned_at = now() where id = v_uid;
  perform set_config('app.slot_claim', 'off', true);
  return v_slot;
end $$;

revoke all on function public.claim_slot() from public;
grant execute on function public.claim_slot() to authenticated;

-- ------------------------------------------------- server-side enforcement ---
-- May the CALLER rate this case? Researchers always; otherwise an active rater whose
-- slot covers the case. slot_covers_case(null, ...) is true by design (009's trigger
-- fallback), so a null slot is refused explicitly here.
create or replace function public.rating_allowed(p_batch text, p_case_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select r.is_researcher
        or (r.active and r.slot is not null and exists (
              select 1 from public.batch_response br
               where br.batch = p_batch and br.case_id = p_case_id
                 and public.slot_covers_case(r.slot, br.case_position)))
      from public.rater r
     where r.id = auth.uid()), false)
$$;

drop policy if exists rating_own on public.rating;
create policy rating_own on public.rating
  for all to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid() and public.rating_allowed(batch, case_id));

-- ------------------------------------------------------------ monitoring ---
-- One row per (slot, holder), labelled with the sheet's column so it can be copied into
-- the "Email ID" row. security_invoker: RLS still applies, so only a researcher sees
-- everyone (a clinician sees their own row; anon sees nothing).
create or replace view public.slot_allocation with (security_invoker = true) as
select 'clinician_' || s                                      as sheet_column,
       s                                                      as slot,
       (select string_agg(b::text, ', ' order by b) from generate_series(1, 5) b
         where public.slot_covers_case(s, (b - 1) * 20))      as chunks,
       r.email,
       r.active,
       r.slot_assigned_at,
       (select count(distinct rt.case_id) from public.rating rt
         where rt.rater_id = r.id and rt.submitted_at is not null) as cases_submitted,
       r.id is not null and r.active
         and (r.slot_assigned_at > now() - interval '48 hours'
              or exists (select 1 from public.rating rt
                          where rt.rater_id = r.id and rt.submitted_at is not null))
                                                              as counts_toward_fill
  from generate_series(1, 5) s
  left join public.rater r on r.slot = s and not r.is_researcher
 order by s, r.slot_assigned_at;

revoke all on public.slot_allocation from anon;
grant select on public.slot_allocation to authenticated;

-- ---------------------------------------------------------- sanity check ---
-- Expect the sheet: 1 -> 1, 4, 5 · 2 -> 1, 2, 5 · 3 -> 1, 2, 3 · 4 -> 2, 3, 4 · 5 -> 3, 4, 5
select 'clinician_' || s as sheet_column,
       string_agg(b::text, ', ' order by b) as chunks
  from generate_series(1, 5) s, generate_series(1, 5) b
 where public.slot_covers_case(s, (b - 1) * 20)
 group by s order by s;

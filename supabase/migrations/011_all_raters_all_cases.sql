-- ============================================================================
-- 011_all_raters_all_cases.sql — every rater rates the whole batch (no slots)
--
-- WHY (Prof. Yang, 2026-10-09 6:26–6:33 PM)
-- The round shrinks to 60 patients (12 per area; batch v66w3_60) and EVERY response
-- is rated by EVERY clinician — fully crossed — for however many clinicians are
-- found ("we may not be able to find 5"). The per-rater slots of 009/010 (each
-- clinician scoring 3 of 5 blocks of a 100-case batch) are retired.
--
-- WHAT THIS CHANGES
--   * rating_allowed(): a researcher, or an ACTIVE rater rating a case that is in the
--     batch. No slot. Deactivating a stray still stops them:
--       update public.rater set active = false where email = '...';
--   * notify_complete_raters(): complete = every response in the batch (180).
--   * Slots are cleared and claim_slot() is no longer callable from the app.
--   * slot_allocation is replaced by rater_progress (who is rating, how far along).
--
-- Kept: rater.active, the guard on slot/active columns (010), BLOCK-keyed sessions.
-- Idempotent: safe to re-run.
-- ============================================================================

create or replace function public.rating_allowed(p_batch text, p_case_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select r.is_researcher
        or (r.active and exists (
              select 1 from public.batch_response br
               where br.batch = p_batch and br.case_id = p_case_id))
      from public.rater r
     where r.id = auth.uid()), false)
$$;

-- 007's statement-level trigger: complete = every response of the batch, for everyone.
create or replace function public.notify_complete_raters()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r          record;
  v_dims     int;
  v_responses int;
  v_cases    int;
  v_complete int;
  v_done     int;
  v_email    text;
  v_inserted boolean;
begin
  for r in select distinct rater_id, batch, rubric_version from new_rows loop
    select coalesce(max(d), 5) into v_dims
      from (
        select count(distinct dimension) as d
          from public.rating
         where batch = r.batch and rubric_version = r.rubric_version
         group by rater_id, case_id, response_label
      ) t;

    select count(*), count(distinct case_id) into v_responses, v_cases
      from public.batch_response where batch = r.batch;
    continue when v_responses = 0;

    select count(*) into v_complete
      from (
        select rt.case_id, rt.response_label
          from public.rating rt
         where rt.rater_id       = r.rater_id
           and rt.batch          = r.batch
           and rt.rubric_version = r.rubric_version
           and rt.submitted_at is not null
           and rt.value is not null
         group by rt.case_id, rt.response_label
        having count(distinct rt.dimension) >= v_dims
      ) t;

    continue when v_complete < v_responses;

    select count(*) into v_done
      from public.rating
     where rater_id = r.rater_id and batch = r.batch
       and submitted_at is not null and value is not null;

    select email into v_email from public.rater where id = r.rater_id;

    with ins as (
      insert into public.notification_outbox (kind, rater_id, batch, payload)
      values (
        'rater_completed', r.rater_id, r.batch,
        jsonb_build_object(
          'email',          v_email,
          'batch',          r.batch,
          'rows_submitted', v_done,
          'cases',          v_cases,
          'completed_at',   now()
        )
      )
      on conflict (kind, rater_id, batch) do nothing
      returning 1
    )
    select exists (select 1 from ins) into v_inserted;

    if v_inserted then
      perform public.kick_notify_drain();
    end if;
  end loop;
  return null;
end $$;

-- Retire the slots. (No auth.uid() in the SQL editor, so 010's guard lets this through.)
update public.rater set slot = null, slot_assigned_at = null where slot is not null;
revoke execute on function public.claim_slot() from authenticated;
drop view if exists public.slot_allocation;

-- ------------------------------------------------------------ monitoring ---
-- One row per non-researcher account: how far each clinician is through the batch.
-- security_invoker: RLS applies, so only a researcher sees everyone.
create or replace view public.rater_progress with (security_invoker = true) as
select r.email,
       r.active,
       r.created_at                                         as signed_up,
       count(distinct rt.case_id) filter (where rt.batch = 'v66w3_60'
                                            and rt.submitted_at is not null) as cases_submitted,
       (select count(distinct case_id) from public.batch_response
         where batch = 'v66w3_60')                          as cases_in_batch,
       max(rt.updated_at)                                   as last_rating
  from public.rater r
  left join public.rating rt on rt.rater_id = r.id
 where not r.is_researcher
 group by r.id, r.email, r.active, r.created_at
 order by r.created_at;

revoke all on public.rater_progress from anon;
grant select on public.rater_progress to authenticated;

select * from public.rater_progress;

-- ============================================================================
-- 007_completion_statement_trigger.sql — evaluate completion per STATEMENT
--
-- THE RACE THIS FIXES
-- notify_if_rater_complete ran FOR EACH ROW. A finished round arrives as ten
-- separate upserts of fifteen rows each, so the trigger fired 150 times, and each
-- firing judged completeness against whatever had committed at that instant. The
-- final row of the final batch is the only firing that can see a complete round —
-- and if any row of that batch had not yet committed when it ran, the trigger
-- declined and NOTHING re-evaluated afterwards.
--
-- That is why "submit everything, then wait" produced no email, while
-- `update public.rating set updated_at = now()` always produced one: the manual
-- update was a fresh statement over already-committed rows.
--
-- A statement-level AFTER trigger runs ONCE per statement, after all its rows are
-- committed, so it always sees the finished state. It also drops the work from 150
-- evaluations per round to one per upsert batch.
-- ============================================================================

-- Evaluate every rater touched by the statement that just ran.
create or replace function public.notify_complete_raters()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r          record;
  v_dims     int;
  v_responses int;
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

    select count(*) into v_responses
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
          'cases',          (select count(distinct case_id) from public.batch_response
                              where batch = r.batch),
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

-- Replace the row-level trigger with statement-level ones. Separate triggers for
-- insert and update because a transition table may name only one operation.
drop trigger if exists rating_completion_notify     on public.rating;
drop trigger if exists rating_completion_notify_ins on public.rating;
drop trigger if exists rating_completion_notify_upd on public.rating;

create trigger rating_completion_notify_ins
  after insert on public.rating
  referencing new table as new_rows
  for each statement execute function public.notify_complete_raters();

create trigger rating_completion_notify_upd
  after update on public.rating
  referencing new table as new_rows
  for each statement execute function public.notify_complete_raters();

-- Catch anyone who finished while the old trigger was missing them.
update public.rating set updated_at = updated_at;

select * from public.completion_status;

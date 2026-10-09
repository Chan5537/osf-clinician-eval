-- ============================================================================
-- 009_rater_slot.sql — per-rater block assignment (5 clinicians x 60 of 100 cases)
--
-- THE DESIGN (Prof. Yang, 2026-10-08; Zitao's sheet "OSF - Clinical Evaluation Splitting")
-- 100 cases = 5 blocks of 20 consecutive case_positions. Five rater SLOTS. Block k is
-- rated by slots k, k+1, k+2 (mod 5), so every case has exactly 3 raters and every
-- slot scores exactly 3 blocks = 60 cases (180 responses).
--
-- WHAT THIS CHANGES
--   1. rater.slot — claimed by the app at a clinician's first sign-in from the
--      `?slot=N` in their personal link, then write-once for clinicians.
--   2. slot_covers_case() — the rotation, in SQL. MIRRORS SLOT_BLOCKS / BLOCK_SIZE in
--      src/data/demo-cases.ts. Change both or neither.
--   3. notify_complete_raters() — "complete" now means every response IN THE RATER'S
--      SLOT, not every response in the batch. Without this a clinician who finishes
--      their 60 cases holds 180 of 300 responses and the completion email never fires.
--      A rater with no slot keeps the old whole-batch rule.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.rater
  add column if not exists slot smallint check (slot between 1 and 5);

-- Write-once for clinicians. rater_update_self (002_rls.sql) lets a rater update their
-- own row so the app can claim the slot; this stops them changing it afterwards, which
-- would move their answers onto blocks nobody assigned them. Same bootstrap exemption as
-- guard_rater_privilege: SQL editor / service role (auth.uid() is null) and researchers
-- can reassign.
create or replace function public.guard_rater_slot()
returns trigger language plpgsql as $$
begin
  if old.slot is not null
     and new.slot is distinct from old.slot
     and auth.uid() is not null
     and not public.is_researcher() then
    raise exception 'slot is already assigned';
  end if;
  return new;
end $$;

drop trigger if exists rater_slot_guard on public.rater;
create trigger rater_slot_guard before update on public.rater
  for each row execute function public.guard_rater_slot();

-- Does this slot score the case at this position? Null slot = no assignment = every case.
create or replace function public.slot_covers_case(p_slot int, p_case_position int)
returns boolean language sql immutable as $$
  select p_slot is null
      or (((p_slot - (p_case_position / 20 + 1)) % 5) + 5) % 5 in (0, 1, 2)
$$;

-- 007's statement-level trigger, with the expected set narrowed to the rater's slot.
create or replace function public.notify_complete_raters()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r          record;
  v_slot     int;
  v_dims     int;
  v_responses int;
  v_cases    int;
  v_complete int;
  v_done     int;
  v_email    text;
  v_inserted boolean;
begin
  for r in select distinct rater_id, batch, rubric_version from new_rows loop
    select slot into v_slot from public.rater where id = r.rater_id;

    select coalesce(max(d), 5) into v_dims
      from (
        select count(distinct dimension) as d
          from public.rating
         where batch = r.batch and rubric_version = r.rubric_version
         group by rater_id, case_id, response_label
      ) t;

    select count(*), count(distinct br.case_id) into v_responses, v_cases
      from public.batch_response br
     where br.batch = r.batch
       and public.slot_covers_case(v_slot, br.case_position);
    continue when v_responses = 0;

    select count(*) into v_complete
      from (
        select rt.case_id, rt.response_label
          from public.rating rt
          join public.batch_response br
            on br.batch = rt.batch
           and br.case_id = rt.case_id
           and br.response_label = rt.response_label
         where rt.rater_id       = r.rater_id
           and rt.batch          = r.batch
           and rt.rubric_version = r.rubric_version
           and rt.submitted_at is not null
           and rt.value is not null
           and public.slot_covers_case(v_slot, br.case_position)
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
          'slot',           v_slot,
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

-- Sanity check of the rotation: expect 5 rows, each slot covering 60 positions, and
-- every position covered exactly 3 times (the second query returns no rows).
select s as slot, count(*) filter (where public.slot_covers_case(s, p)) as cases
  from generate_series(1, 5) s, generate_series(0, 99) p
 group by s order by s;

select p as uncovered_or_overcovered_position
  from generate_series(0, 99) p
 where (select count(*) from generate_series(1, 5) s
         where public.slot_covers_case(s, p)) <> 3;

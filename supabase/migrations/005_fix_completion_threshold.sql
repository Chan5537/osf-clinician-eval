-- ============================================================================
-- 005_fix_completion_threshold.sql
--
-- FIXES A CIRCULAR THRESHOLD in notify_if_rater_complete (003).
--
-- The original derived the dimension count from the rater's OWN rows:
--
--     select count(distinct dimension) into v_dims
--       from public.rating where rater_id = new.rater_id ...
--
-- so the bar moved with the data being measured. A rater who had answered only
-- three of the five dimensions produced v_dims = 3 and an expected total of
-- 30 x 3 = 90 — and would have been declared complete, and their notification
-- sent, two dimensions short of a finished round.
--
-- The fix stops multiplying at all. "Complete" now means: for every response in
-- the batch, this rater has a submitted, non-null score on every dimension the
-- RUBRIC defines. The dimension list is pinned to the rubric version so a future
-- rubric with a different number of axes does not silently change the bar for
-- rows already collected.
-- ============================================================================

create or replace function public.notify_if_rater_complete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dims       int;
  v_responses  int;
  v_complete   int;
  v_done       int;
  v_email      text;
begin
  -- The rubric's own axis count, taken from the widest coverage any rater has
  -- reached on a single response — never from a partial row set. Falls back to 5,
  -- the count in rubric v9 (factuality, comprehensiveness, personalization,
  -- usefulness, safety).
  select coalesce(max(d), 5) into v_dims
    from (
      select count(distinct dimension) as d
        from public.rating
       where batch = new.batch and rubric_version = new.rubric_version
       group by rater_id, case_id, response_label
    ) t;

  select count(*) into v_responses
    from public.batch_response
   where batch = new.batch;

  if v_responses = 0 then return new; end if;

  -- Responses this rater has fully scored: every dimension present, submitted and
  -- non-null. Counting per response rather than in aggregate means a rater cannot
  -- reach the total by over-answering one case and under-answering another.
  select count(*) into v_complete
    from (
      select r.case_id, r.response_label
        from public.rating r
       where r.rater_id       = new.rater_id
         and r.batch          = new.batch
         and r.rubric_version = new.rubric_version
         and r.submitted_at is not null
         and r.value is not null
       group by r.case_id, r.response_label
      having count(distinct r.dimension) >= v_dims
    ) t;

  if v_complete < v_responses then return new; end if;

  select count(*) into v_done
    from public.rating
   where rater_id = new.rater_id and batch = new.batch
     and submitted_at is not null and value is not null;

  select email into v_email from public.rater where id = new.rater_id;

  insert into public.notification_outbox (kind, rater_id, batch, payload)
  values (
    'rater_completed', new.rater_id, new.batch,
    jsonb_build_object(
      'email',          v_email,
      'batch',          new.batch,
      'rows_submitted', v_done,
      'cases',          (select count(distinct case_id) from public.batch_response
                          where batch = new.batch),
      'completed_at',   now()
    )
  )
  on conflict (kind, rater_id, batch) do nothing;

  return new;
end $$;

-- Re-evaluate everyone already in the table: the trigger only runs on a rating
-- WRITE, so a rater who finished under the old (or no) trigger is never revisited.
update public.rating set updated_at = updated_at;

select * from public.completion_status;

-- Round status: run in the Supabase SQL editor at any point during testing.
--
--   batch_responses   30 = the full 10-case batch. 3 = still shrunk from the notification test.
--   dimensions        5 once anything has been rated.
--   needed            what one rater must submit to count as complete.
select 'batch_responses' as metric,
       (select count(*)::text from public.batch_response)                    as value
union all
select 'distinct dimensions',
       (select count(distinct dimension)::text from public.rating)
union all
select 'needed for completion',
       ((select count(*) from public.batch_response)
        * greatest((select count(distinct dimension) from public.rating), 1))::text;

-- Per rater: who has signed in, what they have submitted, and when they were last active.
select ra.email,
       count(r.*)                                                  as rating_rows,
       count(*) filter (where r.submitted_at is not null)          as submitted,
       count(distinct r.case_id)                                   as cases,
       max(r.updated_at)                                           as last_rating,
       (select s.updated_at from public.session_state s
         where s.rater_id = ra.id limit 1)                         as session_saved
  from public.rater ra
  left join public.rating r on r.rater_id = ra.id
 group by ra.id, ra.email
 order by ra.email;

-- Completion notifications: a row means the trigger fired; sent_at means mail went out.
select email, completed_at, sent_at, attempts, last_error
  from public.completion_status;

-- Why has no completion email arrived?
--
-- The trigger fires only when a rater has submitted EVERY (case x response x dimension)
-- in the batch. Run this to see how far off they are.

select ra.email,
       count(*) filter (where r.submitted_at is not null and r.value is not null) as done,
       (select count(*) from public.batch_response br where br.batch = r.batch)
         * (select count(distinct dimension) from public.rating)                  as needed,
       count(distinct r.case_id)                                                  as cases_scored,
       (select count(distinct case_id) from public.batch_response
         where batch = r.batch)                                                   as cases_in_batch
  from public.rating r
  join public.rater ra on ra.id = r.rater_id
 group by ra.email, r.batch;

-- Outbox: a row here means the trigger DID fire.
select * from public.completion_status;

-- Force the trigger to re-evaluate. It runs on rating writes only, so if the threshold
-- became reachable some other way (batch restored, migration run late) nothing re-checks
-- it until a rating row is written. This rewrites rows in place and changes no answer.
-- update public.rating set updated_at = now();

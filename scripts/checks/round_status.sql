-- Round status: run in the Supabase SQL editor at any point during the round.
--
-- Clinician round v66w3_full100_5x20: 5 slots, each rating 3 blocks of 20 cases.
-- A slotted rater is complete at 60 cases = 180 responses (x 5 Likert dimensions).
select 'batch_responses' as metric,
       (select count(*)::text from public.batch_response
         where batch = 'v66w3_full100_5x20')                                 as value   -- expect 300
union all
select 'raters per slot',
       (select string_agg(coalesce(slot::text, 'none') || ':' || n, '  ' order by slot)
          from (select slot, count(*) as n from public.rater group by slot) t);

-- Per rater: slot, how far they are (submitted responses out of their slot's 180), and when
-- they were last active.
select ra.email,
       ra.slot,
       count(distinct (r.case_id, r.response_label))
         filter (where r.submitted_at is not null)                 as responses_submitted,
       (select count(*) from public.batch_response br
         where br.batch = 'v66w3_full100_5x20'
           and public.slot_covers_case(ra.slot, br.case_position)) as responses_assigned,
       count(distinct r.case_id)                                   as cases_touched,
       max(r.updated_at)                                           as last_rating,
       (select max(s.updated_at) from public.session_state s
         where s.rater_id = ra.id)                                 as session_saved
  from public.rater ra
  left join public.rating r on r.rater_id = ra.id and r.batch = 'v66w3_full100_5x20'
 group by ra.id, ra.email, ra.slot
 order by ra.slot nulls last, ra.email;

-- Completion notifications: a row means the trigger fired; sent_at means mail went out.
select email, completed_at, sent_at, attempts, last_error
  from public.completion_status;

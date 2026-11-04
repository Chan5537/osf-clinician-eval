-- Round status: run in the Supabase SQL editor at any point during the round.
--
-- Clinician round v66w3_60: 60 cases (3 blocks of 20); EVERY rater rates all of them, so a rater is
-- complete at 60 cases = 180 responses (x 5 Likert dimensions + the per-case ranking).
select 'batch_responses' as metric,
       (select count(*)::text from public.batch_response where batch = 'v66w3_60') as value;  -- expect 180

-- Per clinician (researchers excluded): how far along, and when last active.
-- Deactivate a stray sign-up so its answers are refused:  update public.rater set active = false where email = '...';
select * from public.rater_progress;

-- Completion notifications: a row means the trigger fired; sent_at means mail went out.
select email, completed_at, sent_at, attempts, last_error
  from public.completion_status;

-- Optional free-text comments (migrations/012), per clinician: how many non-blank, and how many
-- were added or edited after the case was submitted (updated_at later than submitted_at).
select ra.email,
       count(*) filter (where btrim(c.comment) <> '')                                  as comments,
       count(*) filter (where btrim(c.comment) <> '' and c.scope = 'likert')           as on_scores,
       count(*) filter (where btrim(c.comment) <> '' and c.scope = 'rank')             as on_ranking,
       count(*) filter (where btrim(c.comment) <> ''
                          and c.updated_at > c.submitted_at + interval '1 minute')     as edited_after_submit
  from public.rater ra
  join public.rating_comment c on c.rater_id = ra.id and c.batch = 'v66w3_60'
 where not ra.is_researcher
 group by ra.email
 order by ra.email;

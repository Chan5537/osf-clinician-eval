-- PREFLIGHT: run BEFORE the round opens (clinician batch v66w3_60: 60 cases, every rater rates all of them).
-- Everything here must be true or the round is not running the real thing.

select 'batch_response rows'      as check,
       count(*)::text             as actual,
       '180'                      as expected,
       case when count(*) = 180 then 'OK' else 'FIX: python3 scripts/data/seed_batch.py' end as verdict
  from public.batch_response where batch = 'v66w3_60'
union all
select 'cases in batch',
       count(distinct case_id)::text, '60',
       case when count(distinct case_id) = 60 then 'OK' else 'FIX: seed_batch.py' end
  from public.batch_response where batch = 'v66w3_60'
union all
select 'leftover test ratings',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: scripts/checks/reset_round.sql' end
  from public.rating where batch = 'v66w3_60'
union all
select 'leftover sessions',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.session_state where batch like 'v66w3_60%'
union all
select 'leftover notifications',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.notification_outbox where batch = 'v66w3_60'
union all
select 'RLS enabled on all 4',
       count(*)::text, '4',
       case when count(*) = 4 then 'OK' else 'FIX: run 002_rls.sql' end
  from pg_tables
 where schemaname = 'public' and rowsecurity
   and tablename in ('rater','batch_response','session_state','rating')
union all
select 'completion triggers (007)',
       count(*)::text, '2',
       case when count(*) = 2 then 'OK' else 'FIX: run 007_completion_statement_trigger.sql' end
  from pg_trigger where tgname in ('rating_completion_notify_ins', 'rating_completion_notify_upd')
union all
select 'every rater rates every case (011)',
       count(*)::text, '1',
       case when count(*) = 1 then 'OK' else 'FIX: run 011_all_raters_all_cases.sql' end
  from pg_views where viewname = 'rater_progress'
union all
-- Before the link goes out, every existing account is the team's: flag each as a researcher, or its
-- answers count as a clinician's. Lists who is left:  select email from public.rater where not is_researcher;
select 'team accounts are researchers',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK'
            else 'FIX: update public.rater set is_researcher = true where email in (...)' end
  from public.rater where not is_researcher
union all
select 'you are a researcher',
       coalesce(max(case when is_researcher then '1' else '0' end), '0'), '1',
       case when bool_or(is_researcher) then 'OK'
            else 'FIX: update public.rater set is_researcher=true where email=...' end
  from public.rater;

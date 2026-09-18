-- PREFLIGHT: run BEFORE the end-to-end rehearsal.
-- Everything here must be true or the rehearsal is not testing the real thing.

select 'batch_response rows'      as check,
       count(*)::text             as actual,
       '30'                       as expected,
       case when count(*) = 30 then 'OK' else 'FIX: python3 scripts/data/seed_batch.py' end as verdict
  from public.batch_response
union all
select 'cases in batch',
       count(distinct case_id)::text, '10',
       case when count(distinct case_id) = 10 then 'OK' else 'FIX: seed_batch.py' end
  from public.batch_response
union all
select 'arm legend filled',
       count(*) filter (where arm_name is not null)::text, '30',
       case when count(*) filter (where arm_name is not null) = 30
            then 'OK' else 'FIX: freeze_arm_key.py --legend A=BASE,B=OURS,C=TRUTH' end
  from public.batch_response
union all
select 'leftover test ratings',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: scripts/checks/reset_round.sql' end
  from public.rating
union all
select 'leftover sessions',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.session_state
union all
select 'leftover notifications',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.notification_outbox
union all
select 'RLS enabled on all 4',
       count(*)::text, '4',
       case when count(*) = 4 then 'OK' else 'FIX: run 002_rls.sql' end
  from pg_tables
 where schemaname = 'public' and rowsecurity
   and tablename in ('rater','batch_response','session_state','rating')
union all
select 'completion trigger',
       count(*)::text, '1',
       case when count(*) = 1 then 'OK' else 'FIX: run 003_completion_notify.sql' end
  from pg_trigger where tgname = 'rating_completion_notify'
union all
select 'you are a researcher',
       coalesce(max(case when is_researcher then '1' else '0' end), '0'), '1',
       case when bool_or(is_researcher) then 'OK'
            else 'FIX: update public.rater set is_researcher=true where email=...' end
  from public.rater;

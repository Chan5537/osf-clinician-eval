-- PREFLIGHT: run BEFORE the round opens (clinician batch v66w3_full100_5x20).
-- Everything here must be true or the round is not running the real thing.

select 'batch_response rows'      as check,
       count(*)::text             as actual,
       '300'                      as expected,
       case when count(*) = 300 then 'OK' else 'FIX: python3 scripts/data/seed_batch.py' end as verdict
  from public.batch_response where batch = 'v66w3_full100_5x20'
union all
select 'cases in batch',
       count(distinct case_id)::text, '100',
       case when count(distinct case_id) = 100 then 'OK' else 'FIX: seed_batch.py' end
  from public.batch_response where batch = 'v66w3_full100_5x20'
union all
select 'slot column + rotation (009)',
       count(*)::text, '300',
       case when count(*) = 300 then 'OK' else 'FIX: run 009_rater_slot.sql' end
  from generate_series(1, 5) s, generate_series(0, 99) p
 where public.slot_covers_case(s, p)
union all
select 'leftover test ratings',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: scripts/checks/reset_round.sql' end
  from public.rating where batch = 'v66w3_full100_5x20'
union all
select 'leftover sessions',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.session_state where batch like 'v66w3_full100_5x20%'
union all
select 'leftover notifications',
       count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'FIX: reset_round.sql' end
  from public.notification_outbox where batch = 'v66w3_full100_5x20'
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
select 'you are a researcher',
       coalesce(max(case when is_researcher then '1' else '0' end), '0'), '1',
       case when bool_or(is_researcher) then 'OK'
            else 'FIX: update public.rater set is_researcher=true where email=...' end
  from public.rater;

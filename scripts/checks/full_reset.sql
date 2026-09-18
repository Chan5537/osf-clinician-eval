-- FULL RESET for an end-to-end rehearsal. Accounts are kept; all answers are cleared.
--
-- ⚠️ Run this BEFORE clearing the browsers, then run __evalReset() in every window you
--    have signed in from. If you clear the browser first, the app re-hydrates from the
--    server and puts everything back.

delete from public.rating;
delete from public.session_state;
delete from public.notification_outbox;

-- Everything the rehearsal depends on, in one pass. All verdicts must read OK.
select 'rating rows'          as check, count(*)::text as actual, '0' as want,
       case when count(*) = 0 then 'OK' else 'still populated' end as verdict
  from public.rating
union all
select 'session rows', count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'still populated' end from public.session_state
union all
select 'outbox rows', count(*)::text, '0',
       case when count(*) = 0 then 'OK' else 'still populated' end from public.notification_outbox
union all
select 'batch responses', count(*)::text, '30',
       case when count(*) = 30 then 'OK' else 'FIX: python3 scripts/data/seed_batch.py' end
  from public.batch_response
union all
select 'arm legend', count(*) filter (where arm_name is not null)::text, '30',
       case when count(*) filter (where arm_name is not null) = 30 then 'OK'
            else 'FIX: seed_batch.py' end from public.batch_response
union all
select 'immediate-kick key',
       case when value like '<%' then 'placeholder' else 'set' end, 'set',
       case when value like '<%' then 'FIX: update app_config' else 'OK' end
  from public.app_config where key = 'service_key'
union all
select 'completion trigger', count(*)::text, '1',
       case when count(*) = 1 then 'OK' else 'FIX: run 003 + 005 + 006' end
  from pg_trigger where tgname = 'rating_completion_notify';

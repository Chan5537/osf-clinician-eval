-- ============================================================================
-- 004_schedule_notify.sql — run the notification drain every 5 minutes
--
-- The dashboard's scheduling UI has moved around between Supabase versions (it is
-- under Integrations -> Cron, not on the function page). This does the same thing
-- in SQL, which is stable and reviewable.
--
-- ⚠️ BEFORE RUNNING: replace <SERVICE_ROLE_KEY> below with the real key.
--    This file is COMMITTED, so it must never contain the key. Paste the real
--    value into the SQL editor only — do not save it back into this file.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: unschedule first so re-running does not stack duplicate jobs.
select cron.unschedule('drain-notification-outbox')
 where exists (select 1 from cron.job where jobname = 'drain-notification-outbox');

select cron.schedule(
  'drain-notification-outbox',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://mypuldhldvfomboheczx.supabase.co/functions/v1/notify-completions',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- Confirm it registered.
select jobid, jobname, schedule, active from cron.job;

-- ============================================================================
-- 006_notify_immediately.sql — send the moment a rater finishes
--
-- Until now the trigger only WROTE to notification_outbox and a 5-minute cron job
-- drained it. That is up to five minutes of silence after a clinician finishes,
-- which is the wrong shape: the trigger already knows the instant they are done.
--
-- This adds a pg_net call so the drain runs immediately. Cron stays as the safety
-- net — if the call fails, is throttled, or the function is briefly down, the row
-- is still in the outbox and the next poll picks it up. Belt and braces, because
-- an HTTP call from inside a transaction must never be the only path.
--
-- pg_net is ASYNCHRONOUS: net.http_post() queues the request and returns at once,
-- so the clinician's submit is never waiting on an email. A failure here cannot
-- roll back their ratings.
--
-- ⚠️ BEFORE RUNNING: replace <SERVICE_ROLE_KEY> below with the real key.
--    This file is COMMITTED — do not paste the key back into it.
-- ============================================================================

create extension if not exists pg_net;

-- Store the call parameters once, rather than baking the key into the function body
-- where it would end up in pg_proc for anyone with catalog access to read.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- No policy at all: service-role only. Raters and the anon key cannot read it.

insert into public.app_config (key, value) values
  ('notify_url', 'https://mypuldhldvfomboheczx.supabase.co/functions/v1/notify-completions'),
  ('service_key', '<SERVICE_ROLE_KEY>')
on conflict (key) do update set value = excluded.value;

-- Fire the drain. Never raises: a notification problem must not cost a rating.
create or replace function public.kick_notify_drain()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from public.app_config where key = 'notify_url';
  select value into v_key from public.app_config where key = 'service_key';
  if v_url is null or v_key is null or v_key = '<SERVICE_ROLE_KEY>' then
    return; -- not configured; cron will still drain the outbox
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := '{}'::jsonb
  );
exception when others then
  -- Swallow deliberately. The outbox row is already committed, so cron recovers.
  raise warning 'notify drain kick failed: %', sqlerrm;
end $$;

-- Re-declare the completion trigger with the immediate kick appended.
create or replace function public.notify_if_rater_complete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dims       int;
  v_responses  int;
  v_complete   int;
  v_done       int;
  v_email      text;
  v_inserted   boolean := false;
begin
  select coalesce(max(d), 5) into v_dims
    from (
      select count(distinct dimension) as d
        from public.rating
       where batch = new.batch and rubric_version = new.rubric_version
       group by rater_id, case_id, response_label
    ) t;

  select count(*) into v_responses
    from public.batch_response where batch = new.batch;
  if v_responses = 0 then return new; end if;

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

  with ins as (
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
    on conflict (kind, rater_id, batch) do nothing
    returning 1
  )
  select exists (select 1 from ins) into v_inserted;

  -- Only on the FIRST crossing. Without this guard every later edit by a finished
  -- rater would fire another HTTP request for a notification already sent.
  if v_inserted then
    perform public.kick_notify_drain();
  end if;

  return new;
end $$;

select 'immediate notification enabled' as status;

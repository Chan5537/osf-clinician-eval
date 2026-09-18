-- ============================================================================
-- 008_kick_timeout.sql — stop the immediate kick timing out
--
-- net._http_response recorded, at 2026-09-18 04:45:
--   Timeout of 5000 ms reached. Total time: 5001 ms
--   (DNS 15 ms, TCP/SSL 48 ms, HTTP request/response 4935 ms)
--
-- pg_net defaults to a 5 second timeout. The function does real work inside that
-- window: read 150 rating rows, build JSON and CSV, base64 them, open an SMTP
-- session to Gmail, send with attachments, close. Five seconds is not enough, and
-- the next attempt at 04:50 returning 200 shows it is borderline rather than
-- broken — which is the worst kind of unreliable.
--
-- Note the timeout is pg_net's alone: the function keeps running and usually still
-- sends. So a timeout does not lose the email, it loses the RECORD of it, and
-- leaves cron to retry something already delivered. The outbox's sent_at guard
-- prevents a duplicate, but the logs become misleading.
--
-- 30 seconds is comfortably above the observed ~5 s with room for a slow SMTP
-- handshake, and still well under the gateway's own limit.
-- ============================================================================

create or replace function public.kick_notify_drain()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from public.app_config where key = 'notify_url';
  select value into v_key from public.app_config where key = 'service_key';
  if v_url is null or v_key is null or v_key like '<%' then
    return; -- not configured; cron still drains the outbox
  end if;
  perform net.http_post(
    url         := v_url,
    headers     := jsonb_build_object(
                     'Content-Type',  'application/json',
                     'Authorization', 'Bearer ' || v_key
                   ),
    body        := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
exception when others then
  raise warning 'notify drain kick failed: %', sqlerrm;
end $$;

select 'kick timeout raised to 30s' as status;

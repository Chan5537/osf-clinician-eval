-- ============================================================================
-- 003_completion_notify.sql — "a clinician finished the whole set" notification
--
-- ONE email, to the study operator only, when a rater has submitted EVERY case
-- in the batch. Not per case: at 10 cases x 3-5 raters that would be ~50 emails,
-- which get filtered and stop being read. The signal that matters is "this rater
-- is done", and there are only 3-5 of those.
--
-- Mechanism: a row in `notification_outbox` is the durable record that the event
-- happened; an Edge Function drains it and sends. The DB never talks to an email
-- provider directly — if the provider is down, the row simply stays unsent and is
-- retried, instead of a failed HTTP call rolling back a clinician's submission.
-- ============================================================================

-- ---------------------------------------------------------------- outbox ---
create table if not exists public.notification_outbox (
  id           bigint generated always as identity primary key,
  kind         text not null,                       -- 'rater_completed'
  rater_id     uuid not null references public.rater(id) on delete cascade,
  batch        text not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,                         -- null = still pending
  attempts     int not null default 0,
  last_error   text,
  -- ONE notification per rater per batch per kind. This is what makes the whole
  -- thing idempotent: a rater who revises an answer after finishing re-crosses the
  -- completion threshold, and without this unique key that would email again on
  -- every subsequent edit.
  unique (kind, rater_id, batch)
);

create index if not exists outbox_pending_idx
  on public.notification_outbox (created_at) where sent_at is null;

alter table public.notification_outbox enable row level security;

-- Researcher-read only. Raters have no policy at all, so they cannot see that
-- notifications exist, let alone read another rater's. Writes come from the
-- trigger (security definer) and the Edge Function (service role), never a client.
drop policy if exists outbox_researcher on public.notification_outbox;
create policy outbox_researcher on public.notification_outbox
  for select to authenticated using (public.is_researcher());

-- ------------------------------------------------------- completion trigger ---
-- Fires after every rating write. Cheap: one indexed count against rows this rater
-- already owns, then a no-op unless the threshold is crossed for the first time.
--
-- "Complete" = the rater has a submitted rating for every (case, response,
-- dimension) the batch defines. Derived from batch_response x the dimension count
-- rather than hardcoding 150, so a batch of a different size still works.
create or replace function public.notify_if_rater_complete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_expected int;
  v_done     int;
  v_dims     int;
  v_email    text;
begin
  -- How many distinct dimensions this rater is actually being asked (the rubric
  -- defines it, but the data is the honest source and needs no redeploy to change).
  select count(distinct dimension) into v_dims
    from public.rating
   where rater_id = new.rater_id and batch = new.batch;

  if v_dims = 0 then return new; end if;

  select count(*) * v_dims into v_expected
    from public.batch_response
   where batch = new.batch;

  select count(*) into v_done
    from public.rating
   where rater_id = new.rater_id
     and batch    = new.batch
     and submitted_at is not null
     and value is not null;

  if v_done < v_expected then return new; end if;

  select email into v_email from public.rater where id = new.rater_id;

  -- ON CONFLICT DO NOTHING is the idempotency guard: the first crossing inserts,
  -- every later write is a no-op, so revising an answer never re-notifies.
  insert into public.notification_outbox (kind, rater_id, batch, payload)
  values (
    'rater_completed',
    new.rater_id,
    new.batch,
    jsonb_build_object(
      'email',          v_email,
      'batch',          new.batch,
      'rows_submitted', v_done,
      'cases',          (select count(distinct case_id) from public.batch_response where batch = new.batch),
      'completed_at',   now()
    )
  )
  on conflict (kind, rater_id, batch) do nothing;

  return new;
end $$;

drop trigger if exists rating_completion_notify on public.rating;
create trigger rating_completion_notify
  after insert or update on public.rating
  for each row execute function public.notify_if_rater_complete();

-- ----------------------------------------------------------------- helpers ---
-- Who has finished, and did their notification go out?
--   select * from public.completion_status;
create or replace view public.completion_status as
select ra.email,
       o.batch,
       o.created_at as completed_at,
       o.sent_at,
       o.attempts,
       o.last_error
  from public.notification_outbox o
  join public.rater ra on ra.id = o.rater_id
 where o.kind = 'rater_completed'
 order by o.created_at desc;

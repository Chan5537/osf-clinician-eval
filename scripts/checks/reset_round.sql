-- Clear ALL test data so the round starts clean. Destructive; accounts are kept.
--
-- Order matters only for rating -> batch_response (foreign key). These three have no
-- FKs between them, but ratings are deleted first out of habit.
-- Comments (migrations/012). Guarded so this still runs on a project without 012.
do $$ begin
  if to_regclass('public.rating_comment') is not null then delete from public.rating_comment; end if;
end $$;
delete from public.rating;
delete from public.session_state;
delete from public.notification_outbox;

-- Confirm empty.
select 'rating' as tbl, count(*) from public.rating
union all select 'session_state', count(*) from public.session_state
union all select 'notification_outbox', count(*) from public.notification_outbox;

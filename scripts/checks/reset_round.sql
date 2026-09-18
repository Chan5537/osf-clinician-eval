-- Clear ALL test data so the round starts clean. Destructive; accounts are kept.
--
-- Order matters only for rating -> batch_response (foreign key). These three have no
-- FKs between them, but ratings are deleted first out of habit.
delete from public.rating;
delete from public.session_state;
delete from public.notification_outbox;

-- Confirm empty.
select 'rating' as tbl, count(*) from public.rating
union all select 'session_state', count(*) from public.session_state
union all select 'notification_outbox', count(*) from public.notification_outbox;

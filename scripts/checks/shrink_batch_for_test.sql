-- TEMPORARY: make the completion trigger reachable without scoring all 10 cases.
--
-- 🔴 IF YOU RUN THIS, RESTORE THE BATCH AFTERWARDS:
--        python3 scripts/data/seed_batch.py && python3 scripts/data/seed_batch.py --verify
--    This was forgotten once (2026-09-09 -> 2026-09-17) and left the live project with
--    3 of 30 responses for eight days. A clinician scoring ONE case would have been
--    marked complete and the notification would have fired nine cases early.
--
--    scripts/checks/preflight.sql catches it. Run that before any real round.
--
-- Prefer the app's "Fill all (test)" button instead (npm run start:test): it reaches the
-- same completion state without touching batch_response at all.
--
-- ⚠️ THIS DELETES RATINGS for every case except the one kept. Test data only — never run
--    it against a round with real clinician answers in it.
--
-- Afterwards, RESTORE:  python3 scripts/data/seed_batch.py
--    Leaving the batch shrunk means a real clinician would be marked "complete" after
--    one case, and the completion email would fire eight cases early.

-- Keep whichever case you have already scored in full.
\set keep 'HSP_v7_026'

-- Ratings first: rating has a foreign key onto batch_response, so the child rows must go
-- before the parents they point at.
delete from public.rating         where case_id <> 'HSP_v7_026';
delete from public.batch_response where case_id <> 'HSP_v7_026';

-- The trigger only evaluates on a rating WRITE. Deleting rows elsewhere changed the
-- threshold but touched no rating, so nudge them: this rewrites in place and alters no
-- answer.
update public.rating set updated_at = now();

-- Expect one row, sent_at null until the function drains the outbox.
select * from public.completion_status;

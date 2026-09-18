-- ============================================================================
-- extract.sql — pull the round's ratings as an analysis-ready tidy CSV
--
-- Run in the Supabase SQL editor and use "Download CSV".
-- Requires is_researcher = true on your rater row.
--
-- ⚠️ RUN THE TWO AUDITS AT THE BOTTOM *BEFORE* TRUSTING AN EXTRACT.
--    Query 1 catches scores given against text that is not what is snapshotted
--    (i.e. the bundle changed mid-round), which would misattribute arms.
--    Query 2 catches a rubric change mid-round, which makes rows non-poolable.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MAIN EXTRACT
-- Column order matches src/lib/export.ts COLUMNS so downstream analysis that
-- reads the browser CSV reads this identically — plus `arm`, which the browser
-- export deliberately omits (it is the un-blinding key; see app commit c4c9176).
-- ---------------------------------------------------------------------------
select
  coalesce(ra.display_name, split_part(ra.email, '@', 1)) as reviewer,
  r.case_id,
  br.query_id,
  r.response_label,                          -- the blinded letter the clinician saw
  coalesce(br.arm_name, br.arm)   as arm,    -- resolved from the SNAPSHOT, never the client
  r.batch,
  r.response_sha,                            -- kept: lets a saved extract be re-verified later
  -- v10: two row families. 'rank_overall' carries the case-level comparative ranking
  -- (value = that response's place, 1 = best); everything else is a 1-5 Likert scale.
  case when r.dimension = 'rank_overall' then 'rank' else 'likert' end as kind,
  r.dimension,
  r.value,
  r.submitted_at,
  r.duration_seconds,
  r.active_seconds,
  r.idle_seconds,
  r.response_active_seconds,
  r.rubric_version
from public.rating r
join public.batch_response br
  on  br.batch          = r.batch
  and br.case_id        = r.case_id
  and br.response_label = r.response_label
join public.rater ra
  on ra.id = r.rater_id
where r.batch          = 'v611_r10'
  -- ⚠️ ZONGZHE'S FIRST ROUND WAS SCORED UNDER 'v10-20260918'. Those rows are still valid and
  -- still join (the letters did not change, so response_sha is stable) — they are simply in a
  -- different rubric partition. Switch the pin to read them; never pool the two on
  -- trustworthiness, whose howToScore changed in v11.
  and r.rubric_version = 'v11-20260918'  -- ALWAYS pin: past renames crossed over
  -- ⚠️ SIGN-UP IS OPEN (2026-09-17): anyone reaching the public URL can create an
  -- account, and their rows are indistinguishable from a recruited clinician's. Before
  -- analysis, restrict to the raters you actually recruited — uncomment and fill in:
  -- and ra.email in ('clinician1@example.org', 'clinician2@example.org')
  and r.submitted_at is not null         -- submitted cases only
  and r.response_sha   = br.response_sha -- integrity tripwire (see audit 1)
order by reviewer, br.case_position, r.response_label, r.dimension;


-- ===========================================================================
-- AUDIT 1 — INTEGRITY.  MUST RETURN ZERO ROWS.
--
-- Any row here was scored against different text than what is snapshotted, so
-- the main extract's WHERE clause silently DROPPED it. A non-empty result means
-- the bundle was regenerated mid-round: stop and reconcile before analysing.
-- ===========================================================================
-- select r.batch, r.case_id, r.response_label,
--        count(*) as n_rows, count(distinct r.rater_id) as n_raters
--   from public.rating r
--   join public.batch_response br
--     on br.batch = r.batch and br.case_id = r.case_id
--    and br.response_label = r.response_label
--  where r.response_sha <> br.response_sha
--  group by 1, 2, 3
--  order by 1, 2, 3;


-- ===========================================================================
-- AUDIT 2 — COMPLETENESS / POOLABILITY.
--
-- 180 submitted rows = a full round (10 cases x 3 responses x (5 Likert + 1 rank)).
-- If n_rubric_versions > 1 for ANY rater, STOP: a rubric changed mid-round and
-- those rows are not comparable. Partition by rubric_version and report apart.
-- ===========================================================================
-- select ra.email,
--        count(*) filter (where r.submitted_at is not null)                     as submitted_rows,
--        count(distinct r.case_id) filter (where r.submitted_at is not null)    as cases_done,
--        count(*) filter (where r.value is null)                                as null_values,
--        count(distinct r.rubric_version)                                       as n_rubric_versions,
--        max(r.updated_at)                                                      as last_activity
--   from public.rater ra
--   left join public.rating r
--     on r.rater_id = ra.id and r.batch = 'v611_r10'
--  where not ra.is_researcher
--  group by 1
--  order by 1;


-- ===========================================================================
-- AUDIT 3 — BLINDING SANITY (optional).
--
-- Arms should be roughly balanced across the letters a rater saw. A strong
-- letter->arm correlation would mean the per-case shuffle failed.
-- ===========================================================================
-- select br.response_label, coalesce(br.arm_name, br.arm) as arm, count(*) as n
--   from public.batch_response br
--  where br.batch = 'v611_r10'
--  group by 1, 2
--  order by 1, 2;

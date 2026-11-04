# Spec: optional clinician comment boxes (Likert scores + overall ranking)


## 1. Context

In the live v66w3_60 round, a clinician raised three problems in Slack (via Prof. Yang):
1. The best response might still have missed the risk that actually developed.
2. When all three responses are weak, they still have to rank them and have no way to say what a good response would look like.
3. There is no way to comment.

Yang asked for a free-text box so clinicians can explain their reasoning. Zitao wants to use selected comments as supplementary / extended-data material. Agreed scope: **two kinds of optional comment box**: one for the Likert scores, one for the overall ranking.

Decisions confirmed with Chan:
- **Likert comment = one per response.** The box sits at the bottom of each response's rubric pane, so a case has 3 (the clinician sees one at a time). The ranking comment is one per case.
- **Editing a comment never un-submits a case.** Clinicians who have already finished can add comments to submitted cases without submitting again.

Hard constraints that come from the round being live (results already exist for 5 raters):
- **Do NOT bump `SCHEMA_VERSION` (28) or `RUBRIC_VERSION` (`v15-20261008`).** A bump makes `storage.load()` and `sync.hydrate()` discard every in-progress session, and it splits the analysis partition. The change has to be purely additive: an old session blob with no `comments` must load cleanly.
- **Comments must never go into `public.rating`.** The completion trigger (`011_all_raters_all_cases.sql`, `notify_complete_raters`) sets `v_dims = max(count(distinct dimension))` per response. A new "comment" dimension would raise `v_dims` to 7. Since comments are optional, almost nobody would then reach it, so no completion email would ever fire and the failure would be silent. `value smallint check 1–5` cannot hold text either. Comments therefore get **their own table**.
- Comments are **never required**. They are not counted in `pickCount`, `requiredCount` or `isComplete`, and they do not appear in the SubmitBar progress or the tab `n/5` badges.
- Blinding: comment UI copy contains no arm, system, model or "ground truth" wording.

## 2. UX / UI design

### 2.1 Placement

| Box | Where | Why there |
|---|---|---|
| **Likert comment** ("Comments on Response A", optional) | Focus view, **right pane, below the 5th Likert scale**, inside the scrolling rubric pane (`FocusReview.tsx`, after `<LikertDimensions>`) | It sits next to the scores it explains. The pane header already reads "Rubric — Response A", so it is clear which letter the comment is about. A rater reaches it naturally after answering the last scale. A box under the two-column grid would sit right next to the ranking box, making two look-alike boxes with unclear scopes. |
| **Ranking comment** ("Comments on your ranking", optional) | **Inside `RankOrder`, below the 1st/2nd/3rd rows** | `RankOrder` is rendered in **both** Focus and Compare views and writes the same case state, so the comment appears in both views for free and stays in sync. Compare is the view a rater opens to make the comparative judgement. |
| Compare view, Likert | No box | Compare has no Likert scales, so a Likert comment box there would have no scores to refer to. |

Below the `lg` breakpoint the panes stack at natural height, so the Likert box simply follows the scales.

### 2.2 Visual and interaction spec (new `src/components/CommentBox.tsx`)

- **Styling:** neutral, deliberately *not* one of the 5 axis hues, so it does not read as a 6th scale. Use a muted card (`rounded-md border bg-muted/30 p-3`), a `MessageSquareText` lucide icon, and a bold label followed by a muted "(optional)".
- **Input:** the existing `src/components/ui/textarea.tsx` (shadcn, already has `field-sizing-content`, so it auto-grows), with `min-h-20 max-h-60 overflow-y-auto`.
- **Character limit:** `maxLength = COMMENT_MAX_CHARS = 2000`. Show a counter only past 80% of the limit (`1,712 / 2,000`), so it does not add clutter.
- **Local draft, then commit.** The box keeps its own `useState` draft and dispatches `SET_COMMENT` **on blur, after 600 ms idle, and on unmount**. It does *not* dispatch on every keystroke: each dispatch re-renders the whole App, including the markdown letters, and the session reducer settles the timing ledger on every RUBRIC action. **The flush on unmount is required.** FocusReview remounts the pane on every tab switch (`key={r.label}`), so without it a draft typed just before clicking another tab would be lost.
- **Accessibility:** `<label htmlFor>` linked to the textarea, `aria-describedby` pointing at the placeholder hint, and no `aria-invalid`, because a comment has no invalid state.
- **Tab badge (small extra):** in the FocusReview tab bar, show a tiny `MessageSquareText size-3` icon when that response has a non-empty comment. Keep it separate from the `n/5` / ✓ completion badge, because comments are not part of completion.
- **Saved state:** no extra indicator. The existing `SyncStatus` header pill already reports saving, queued and error.

### 2.3 Copy

These texts are blinding-safe and do not tell the rater how to weigh the axes. Prof. Yang and Zitao should sign off on the final wording, because RankOrder's header records an owner rule against adding guidance to the ranking stem. A placeholder in an optional box is a different thing from guidance in the stem, but it is worth flagging.

- Likert label: **"Comments on Response {X}"** · *optional*
  Placeholder: *"Anything behind these scores — e.g. what this response got right, missed, or got wrong."*
- Ranking label: **"Comments on your ranking"** · *optional*
  Placeholder: *"Why this order? If none of the responses was adequate, what would a better response have said?"* This directly answers the clinician's "all 3 sub-optimal" complaint.
- `LandingScreen.tsx`: add one sentence to the task description: *"Each response and the ranking have an optional comment box if you want to explain a score or suggest what a better response would say."*

## 3. Frontend state changes

### 3.1 `src/lib/types.ts`
```ts
export const COMMENT_MAX_CHARS = 2000
export interface RubricComments {
  likert: Partial<Record<ResponseLabel, string>>  // one per present response
  rank: string                                    // one per case
}
// RubricState gains:
comments: RubricComments
// RubricAction gains:
| { type: 'SET_COMMENT'; scope: 'likert'; label: ResponseLabel; text: string }
| { type: 'SET_COMMENT'; scope: 'rank'; text: string }
```
Comments live in `RubricState` rather than `CaseRubric`. `LikertDimensions`/`FocusReview`/`RankOrder` already receive a case-scoped `state` + `dispatch`, so this needs no new prop plumbing.

### 3.2 `src/lib/reducer.ts`
- `buildInitialRubricState`: `comments: { likert: {A:'',B:'',C:''} for the present labels, rank: '' }`.
- `SET_COMMENT`: store `text.slice(0, COMMENT_MAX_CHARS)`. Do not trim while the rater is typing; trim only when building rows.
- `RESET` clears comments, which is already true because it rebuilds initial state.
- `pickCount` / `requiredCount` / `isComplete` / `arm*` stay **unchanged**. Add a comment saying comments are never required.

### 3.3 `src/lib/session.ts` (`RUBRIC` case)
- If `action.type === 'SET_COMMENT'`, **keep `submitted`, `submittedAt` and `durationSeconds`**; only `state` changes.
- Timing:
  - Case not yet submitted: settle and touch as usual, because typing is active work. Retarget `focusedLabel` to the response the likert comment is about, the same way `SET_LIKERT` does.
  - Case already submitted: leave `timing` untouched, so the scoring time recorded at submit stays frozen.
- `AUTOFILL_ALL`: build `state: { likert, rank, comments: c.state.comments }`. Without this the property would be dropped and TypeScript will flag it.
- **No `SCHEMA_VERSION` bump.** Add a note under v28 explaining that comments are additive and handled by sanitizeRubric's default.

### 3.4 `src/lib/storage.ts`
- `sanitizeRubric`: add a `comments` branch with the same allowlist pattern as `rank`. Keep only labels that exist in `base.comments.likert` and only string values, then clamp to max length. **Without this branch, comments are silently dropped on every reload and server hydrate.** That is the same trap the `rank` branch's ⚠️ comment describes. Old blobs that have no `comments` key fall through to the empty defaults, so no data is lost and no bump is needed.
- `restoreFromExport`: read an optional top-level `comments` array from the JSON export (see §4.3) back into `state.comments`.

### 3.5 Components
- **New** `src/components/CommentBox.tsx` (spec in §2.2). Props: `id`, `label`, `placeholder`, `value`, `onCommit(text)`.
- `FocusReview.tsx`: inside the right-pane scroller, after `<LikertDimensions>`, add `<CommentBox … value={state.comments.likert[r.label] ?? ''} onCommit={(t) => dispatch({type:'SET_COMMENT', scope:'likert', label:r.label, text:t})}/>`. Add the tab-bar comment icon.
- `RankOrder.tsx`: add `<CommentBox>` after the `<ul>` of places and before the sr-only live region.

### 3.6 `src/App.tsx`
- Wrap `caseDispatch`. When `action.type === 'SET_COMMENT'` and the case is already submitted and `raterId` is set, compute `next` with `sessionReducer` and call the new `queueCommentSync(raterId, next, i)` (§4.2).
- For cases that are not yet submitted, comments travel in the `session_state` blob (already mirrored every 2 s) and are written to the table at submit.
- `__evalReset`: also `delete from rating_comment where rater_id = uid`.

## 4. Backend

### 4.1 Migration `supabase/migrations/012_rating_comment.sql` (idempotent)
```sql
create table if not exists public.rating_comment (
  rater_id       uuid not null references public.rater(id) on delete cascade,
  batch          text not null,
  case_id        text not null,
  scope          text not null check (scope in ('likert','rank')),
  target         text not null,                 -- 'A'|'B'|'C' for likert, 'case' for rank
  -- FK-able letter: NULL for the case-level comment, so MATCH SIMPLE skips the FK.
  response_label text generated always as
                   (case when target in ('A','B','C') then target end) stored,
  comment        text not null default '' check (char_length(comment) <= 4000),
  rubric_version text not null,
  schema_version int  not null,
  response_sha   text,                          -- the letter commented on; NULL for rank
  submitted_at   timestamptz,                   -- the case's submit stamp
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (rater_id, batch, case_id, scope, target),
  check ((scope = 'likert' and target in ('A','B','C') and response_sha is not null)
      or (scope = 'rank'   and target = 'case'          and response_sha is null)),
  foreign key (batch, case_id, response_label)
    references public.batch_response (batch, case_id, response_label)
);
create index if not exists rating_comment_extract_idx on public.rating_comment (batch, rubric_version, rater_id);
drop trigger if exists rating_comment_touch on public.rating_comment;
create trigger rating_comment_touch before update on public.rating_comment
  for each row execute function public.touch_updated_at();

alter table public.rating_comment enable row level security;
-- Mirrors rating_own (010): own rows only, and only for a case the caller may rate.
drop policy if exists rating_comment_own on public.rating_comment;
create policy rating_comment_own on public.rating_comment for all to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid() and public.rating_allowed(batch, case_id));
drop policy if exists rating_comment_researcher_read on public.rating_comment;
create policy rating_comment_researcher_read on public.rating_comment for select to authenticated
  using (public.is_researcher());
revoke all on public.rating_comment from anon;
```
Design notes to keep in the file header:
- The table is separate from `rating` because of the completion-trigger `v_dims` problem (§1).
- There is no `arm` column (same blinding property as `rating`); the arm is resolved at extraction.
- No trigger is attached, so comments never fire or affect completion emails.
- The client must **not** send `response_label` in upsert payloads, because it is a generated column.

### 4.2 Sync (`src/lib/sync-rows.ts`, `src/lib/sync.ts`)
- `sync-rows.ts`: new `CommentRow` type and `commentRowsForCase(session, caseIndex, raterId)`.
  - Returns `[]` unless the case is submitted.
  - Otherwise emits **every** target for the case (3 likert + 1 rank), **including empty strings**, trimmed.
  - Writing every target on every write makes the operation idempotent. A comment the rater cleared overwrites to `''`, so no delete path is needed. A complete rater ends up with 60 × 4 = 240 small rows.
  - Fields: `batch` (falls back to `demoCase.batch`, as for ratings), `response_sha = textFingerprint(markdown)` for likert and `null` for rank, `RUBRIC_VERSION`, `SCHEMA_VERSION`, `submitted_at`.
- `sync.ts`:
  - New `Op` kind `{ kind: 'comments'; caseId; raterId; rows: CommentRow[] }`. `runOp` upserts into `rating_comment` with `onConflict: 'rater_id,batch,case_id,scope,target'`.
  - `queueCaseSubmit`: enqueue the comments op **after** the ratings op.
  - New `queueCommentSync(raterId, session, caseIndex)`: debounced 1.5 s per case. `enqueue` collapses any pending comments op for the same `caseId` (same idea as the session-op collapse), which keeps the queue bounded.
  - **Do not let a comments op wedge the queue.** `drain()` is strictly in-order and stops at the first failure, so a permanently failing comment write would block every later *ratings* write. If a `comments` op fails with a schema or permission error (`42P01`, `PGRST205`, `42501`), log it and drop it. The text is still in `session_state` and can be recovered. Transient and network errors keep the normal backoff.
  - `debugState()` lists comments ops.

### 4.3 Exports and extraction
- `src/lib/export.ts`: new `buildCommentRows(session)` with columns `reviewer, case_id, query_id, batch, scope, target, response_sha, comment, submitted_at, rubric_version`. It returns non-empty comments for touched cases.
  - `toJSON` adds `comments: buildCommentRows(session)`.
  - **CSV `COLUMNS` and `buildRows` stay unchanged.** Add a ⛔ comment saying comments must never be folded into `buildRows`, because `ratingRowsForCase` maps `buildRows` directly into `public.rating` (§1). This also keeps `clinician_round_v66w3_60_analysis.py` and its CSV readers untouched.
- `supabase/extract.sql`: add a **COMMENTS EXTRACT** block, ready for the supplement. For each non-empty comment it gives:
  - reviewer, case_id, case_position
  - scope and target
  - `arm` (the target's arm, likert only)
  - `letter_key` for the case, e.g. `A=OURS; B=BASE; C=TRUTH`, so a reader can decode "Response B" written inside free text
  - `ranking_decoded`, e.g. `C(OURS) > A(BASE) > B(TRUTH)`, from that rater's `rank_overall` rows
  - `scores`, the 5 Likert values for the response (likert only)
  - comment, submitted_at, updated_at

  Use the same pins as the main extract (`batch = 'v66w3_60'`, `rubric_version = 'v15-20261008'`, recruited-email filter) plus the `response_sha` tripwire for likert rows.
- `scripts/data/export_rater.py`: also write `results/<batch>__<rater>__<rubric>__comments.csv`, with arms resolved using the same service-role read.
- `scripts/checks/round_status.sql`: add the number of non-empty comments per rater. `reset_round.sql` / `full_reset.sql`: also clear `rating_comment`.
- `notify-completions` edge function: **no change**. The email is one-shot and comments may arrive after it, so analysis reads comments from extract.sql or export_rater.py.

## 5. Rollout order (the order matters)

1. Chan applies `012_rating_comment.sql` in the Supabase SQL editor, **before** any app deploy. Otherwise every comments op fails; the §4.2 guard limits the damage, but the comments would then exist only in the session blob.
2. Run the RLS check with a second test account (002_rls.sql requirement): it cannot read or insert another rater's comments, and cannot insert for a case outside the batch.
3. Deploy a preview build and have Zitao do his pass.
4. Deploy (Chan pushes; Claude cannot push or use credentials).
5. Slack note to the clinicians: the boxes are optional, and they can go back to any already-submitted case and add a comment without re-submitting.

## 6. Verification

- `npm run build` (`tsc -b && vite build`, the only CI gate) and `npm run lint`.
- Local end-to-end: `npm run start:fresh` (local Supabase reset and reseed, which applies 012), then `npm run start:test`.
  1. Type a Likert comment on A, then switch to tab B immediately → the comment is still there when you return (unmount flush).
  2. Reload → Likert and rank comments are restored (sanitize branch).
  3. Submit → 18 `rating` rows plus 4 `rating_comment` rows; `rating` is unchanged in shape.
  4. Edit a comment on a submitted case → the case **stays submitted**, `rating_comment.updated_at` advances, `rating` rows are untouched, the progress dots are unchanged.
  5. "Fill all (test)" with no comments → the completion email still fires, and `v_dims` is still 6.
  6. Hand-delete `comments` from the localStorage session JSON → the app loads with no session discard (backward compatibility for live raters).
  7. Rank comment typed in Compare view appears in Focus view, and the reverse.
  8. 2,000-character limit and counter; very long text does not break the pane layout.
  9. Run the extract.sql comments block → arms, letter_key and ranking_decoded are correct when checked against the local arm key.
  10. Blinding: grep the clinician `dist/` bundle; the new copy adds no arm, model or ground-truth strings.
- Optional: `scripts/checks/comments.check.mjs` in the style of `reconcile.check.mjs`, which hand-ports `sanitizeRubric`'s comments branch and asserts that old blobs, wrong labels and over-long strings are handled.

## 7. Out of scope / follow-ups

- The clinician's first concern (the "best" response might not predict the actual outcome) is about how the rubric should be read, and needs its own reply. Justifiability (v14) is defined as "follows from the reasoning, not whether the risk developed". Zitao or Yang should answer it in the thread; the comment box now gives clinicians a place to record such cases.
- Comments are free text. Screen them for patient-identifying detail before quoting anything in the supplement.
- Some sign-ups are unrecruited strays; the extract's email filter must be applied to comments too.

## Critical files
`src/lib/{types,reducer,session,storage,export,sync,sync-rows}.ts`, `src/App.tsx`, `src/components/{FocusReview,RankOrder,LandingScreen}.tsx`, new `src/components/CommentBox.tsx`, new `supabase/migrations/012_rating_comment.sql`, `supabase/extract.sql`, `scripts/data/export_rater.py`, `scripts/checks/{round_status,reset_round,full_reset}.sql`.

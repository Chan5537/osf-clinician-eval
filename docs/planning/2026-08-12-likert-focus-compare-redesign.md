# Likert-only rubric + Focus/Compare layout redesign (2026-08-12)

## 1. Current situation

- Each case shows all 2–3 blinded responses side-by-side (`ResponsePair`), then a flat
  rubric section below (`ChecklistRubric`): per response, 4 Likert scales (1–5) followed by
  a data-driven boolean atom checklist (Yes/No/N/A).
- The clinician scrolls a long page; a response and its rubric are far apart, which makes
  per-response review slow.
- `RubricState = { atoms, likert }` (schema v5); the export emits both `kind='likert'` and
  `kind='boolean'` rows.

## 2. Planned changes

### 2.1 Rubric content: Likert-only

Drop the boolean atoms from the UI, the completion gate, and the export. Per case, the
required items become `responses.length × 4` Likert cells.

- `demo-cases.generated.json` is NOT touched (it is overwritten by the upstream exporter);
  `responses[i].atoms` stays in the data and is simply ignored.
- `RubricState` becomes `{ likert }`; `SCHEMA_VERSION` 5 → 6 (stale localStorage discarded).
- Export: only `kind='likert'` rows; atom-specific columns (`atom_id/criterion/axis/weight`)
  removed. The `kind` column is kept for forward compatibility with future comparison metrics.

### 2.2 Two layout modes with a clinician-facing toggle

A `Focus / Compare` segmented toggle in the header (persisted in the session, default
`focus`). Both modes share the same scoring state — switching never loses answers.

- **Focus mode (new, default)** — one arm at a time. Patient Panel + Query stay at the top
  of the page (whole-page scroll). Below them, an arm tab bar (Response A/B/C tabs with
  per-arm completion badges + prev/next arrows), then a split view: left = that response's
  markdown, right = its 4 Likert scales. On `lg+` both panes are viewport-height and scroll
  independently; below `lg` they stack with natural height.
- **Compare mode** — the current format: all responses side-by-side (`ResponsePair`, with
  the streaming reveal), and below it the rubric side-by-side (`CompareRubric`, new): one
  column per response, each holding that response's 4 Likert scales.

### 2.3 Component-level plan (for the implementer)

| File | Change |
| --- | --- |
| `lib/types.ts` | Remove `AtomScore`/`CheckKey`/`atomKey`/`SET_ATOM`; `RubricState = { likert }`. Keep `RubricAtom` + `ResponseEntry.atoms` as the (ignored) data shape. |
| `lib/reducer.ts` | Likert-only state machine; add per-arm helpers `armAnsweredCount` / `armRequiredCount` / `armComplete` for the tab badges. |
| `lib/session.ts` | `SCHEMA_VERSION = 6`; add `layoutMode: 'focus' \| 'compare'` + `SET_LAYOUT_MODE` action. |
| `lib/storage.ts` | Sanitize `likert` only; sanitize `layoutMode` (default `focus`). |
| `lib/export.ts` | Likert-only rows; drop atom columns. |
| `components/FocusReview.tsx` | NEW: arm tabs + split view (left response / right rubric, independent scrolling). |
| `components/CompareRubric.tsx` | NEW: side-by-side per-response Likert columns for compare mode. |
| `components/ChecklistRubric.tsx` | DELETED (boolean rendering; Likert rendering already lives in `LikertRubric.tsx`, reused by both new components). |
| `components/RubricRefLink.tsx` | Remove `BooleanRubricLink` (doc URL kept in `links.ts`). |
| `components/ResponseCard.tsx` | Export `AVATAR_STYLES`/`CARD_STYLES` so FocusReview reuses the identical per-letter look. |
| `App.tsx` | Header toggle; render FocusReview or ResponsePair+CompareRubric by mode. StepRail only in compare mode (its 4 sections don't exist in focus mode); in focus mode the FocusReview block carries the `sec-rubric` anchor so the submit bar's "Go to scoring" jump still works. |

## 3. Expected outcome

- Default experience: clinician reviews one arm at a time with the response and its rubric
  side by side, no long-distance scrolling; switches arms via tabs/arrows.
- Compare mode remains one click away for cross-arm comparison, and is the future home of
  true side-by-side comparison metrics (not yet in the data).
- Per case, submit unlocks when all `responses.length × 4` Likert cells are answered.
- Verification: `npm run build` (type-check + production build) passes; manual dev-server
  walkthrough of both modes.

## Confirmed boundaries (owner sign-off, 2026-08-12)

| # | Decision point | Owner decision |
| --- | --- | --- |
| 1 | Mode mechanism | Build the toggle NOW; default focus; compare mode = current layout with side-by-side Likert columns; shared scoring state. |
| 2 | Boolean removal depth | Remove from UI + completion gate + export. Data JSON untouched (atoms ignored). |
| 3 | Focus-mode layout | Patient Panel + Query stay at page top; split view below with independently scrolling panes. |
| 4 | Arm navigation / gating | Tabs + prev/next arrows, free manual switching, per-arm completion badge on each tab; submit still requires every Likert of every arm. |

Adopted project conventions (not re-asked): SCHEMA_VERSION bump on shape change;
generated JSONs read-only; blinding rules (never render `arm`); arm navigation driven by
`responses.length` (2-arm cases supported).

⚠️ Deploy note: the v6 schema bump discards any in-progress clinician session stored under
schema v5 — have active reviewers export before this ships.

## Revision (owner feedback on first build, 2026-08-12)

1. **Compare mode is READ-ONLY** — it shows only the side-by-side response cards; there is no
   A-vs-B comparison rubric yet, so no scoring controls appear there. `CompareRubric.tsx` was
   removed; all scoring lives in the focus view. Export is unaffected (it reads the shared
   `RubricState.likert` map, which is mode-agnostic).
2. **Header toggle replaced by contextual action buttons** — the segmented Focus/Compare control
   in the header drew no clicks. Instead: the focus view's section header carries a blue
   "Compare side by side" action chip (the app's established interactive-chip look), and the
   compare view carries a primary "Back to scoring" button. `goToScoring` in App handles the
   cross-mode jump (switch to focus, then scroll once the rubric anchor exists); TaskStrip and
   SubmitBar take it as a prop.
3. **StepRail retired** — the four-section page it navigated no longer exists in either mode
   (flag removed from ui-flags; StepRail.tsx kept on disk for reference).

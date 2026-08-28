# Rubric v5 — source of truth and validation

**Active as of 2026-08-28** (v5, Zitao; v4 by Chan 2026-08-24 stands for the three unchanged
axes). Implemented in
[`src/lib/rubric-config-disease.ts`](../../src/lib/rubric-config-disease.ts); session
`SCHEMA_VERSION` bumped to **13**.

## What v5 changes from v4

1. **Safety is retired; the `harm` key now carries Comprehensiveness.** In the 2026-08-24
   judge run Safety moved in parallel with Factuality (both outcome-keyed, same arm ordering) —
   no independent signal for a fifth of the composite. Comprehensiveness grades how broadly the
   *Detailed analysis* ranges across the pertinent aspects of the patient's health and whether
   what it raises does work in the argument. It deliberately names no data source, and its
   wording deliberately avoids anything a rater could read as an instruction to count (the same
   softening Factuality got on 2026-08-25).
2. **Personalization is re-scoped from the synthesis to the recommendations** — advice grounded
   in this patient's own circumstances, saying why *this* patient should take these steps.
   Anchors 4 and 1 keep their SensorFM ED.1 text verbatim; the rest is minimally edited.
3. Factuality, Trustworthiness and Relevance are unchanged from v4.
4. With Safety retired, **Factuality is again the only axis keyed on the recorded outcome.**
   Note the ground-truth arm carries no medication/lab content (no labels exist for most
   patients), so it need not top Comprehensiveness — expected, not a bug.
5. ⛔ **v5 scores are not comparable with v4** (same keys, different questions) — report
   separately, never pooled.
6. Worked examples for the two changed axes are deliberately absent until the letter batch that
   ships to clinicians is finalised — examples must quote real letters of the loaded batch, and
   the loaded v33.11 letters cannot illustrate either axis.
7. The .docx has not caught up with the two v5 axes yet: for them the config file is the interim
   source of truth until Chan issues an updated docx. The three unchanged axes still follow the
   2026-08-24 docx.

## Source of truth

`[updated] Clinician Evaluation Rubric.docx` in this folder. Every question, anchor label and
anchor description in `rubric-config-disease.ts` is transcribed from it. **If the two disagree,
the .docx wins and the code is wrong.**

## The five criteria

| # | Criterion | Stored key | Scored against |
|---|---|---|---|
| 1 | **Factuality** | `context` | The "Future risk" panel (recorded 6-year outcome) |
| 2 | **Comprehensiveness** | `harm` | The "Detailed analysis" section · breadth put to use |
| 3 | **Trustworthiness** | `relevance` | Sleep panel + Prior medical history |
| 4 | **Relevance** | `justifiability` | What the patient asked |
| 5 | **Personalization** | `personalization` | The "What this means for you" advice · this patient's own circumstances |

**The keys are not the names.** They are frozen so `LikertKey`, the completion gate, the reducer
and the CSV export keep working. Renaming them breaks every stored session and every exported CSV.

Note `justifiability` now carries **Relevance**: v4 drops the Justifiability criterion and restores
Relevance, which needed a key.

## What v4 changes from v33

1. **Justifiability dropped, Relevance restored** (SensorFM Survey ED.1 verbatim).
2. **Factuality and Safety are now scored against the recorded outcome.** This reverses v33's
   explicit prohibition. See the ⛔ block at the top of `rubric-config-disease.ts` for the full
   reasoning and the accepted blinding risk.
3. **Personalization drops the "or Mistaken" suffix** — correctness lives in Factuality now.
4. **Trustworthiness** replaces the old evidence-volume ladder with a confidence-vs-evidence *fit*
   scale, so a well-calibrated hedge scores as well as a well-supported assertion.
5. **Per-criterion "How to score it" + worked examples** now render inline in the UI, above the
   anchors, rather than behind the toggletip.

## Why the guidance is inline, not behind a click

In the 2026-08-18 internal round (8 cases × 3 arms × 5 dimensions × 2 raters), the two raters
produced **equal and opposite** B−A effects — Chan −0.55, Zitao +0.55 — cancelling to exactly
0.000 (p = 0.86). Each rater found a large effect and disagreed on its *sign*. Without a visible
procedure, raters invent their own; the anchors alone were not enough.

## Validation (2026-08-24 LLM-judge run — **v4 axes**; a v5 smoke is pending)

3 judges (Claude Opus 4.5, GPT-5 mini, Gemini 2.5 Pro) × 6 cases × 3 arms = 54 scored responses.
Harness in the generation repo at `sleepfm-agent-eval/rubric_v2_eval/`.

| Criterion | A baseline | B SleepFM | C oracle | B−A |
|---|---|---|---|---|
| Factuality | 1.33 | 2.33 | 3.00 | **+1.00** |
| Trustworthiness | 3.22 | 3.89 | 3.67 | +0.67 |
| Safety | 3.83 | 4.33 | 4.33 | +0.50 |
| Relevance | 3.83 | 4.33 | 4.56 | +0.50 |
| Personalization | 4.44 | 4.50 | 4.44 | +0.06 |
| **Composite** | **3.33** | **3.88** | **4.00** | **+0.54** |

Paired by (judge × case), n = 18: **B−A = +0.544, p = 0.0046** (14W/0T/4L) · C−A = +0.667,
p = 0.0016 · C−B = +0.122, p = 0.64 (n.s.). The ordering replicates across all three judges
independently.

**LLM judges are a smoke test for whether the rubric *can* separate arms — not a substitute for
clinicians.** Given the sign-flip history, two human raters should score the same cases before the
clinician round.

## Open items

- **Personalization did not discriminate under the v4 synthesis wording** (+0.06); every arm
  cleared the floor because the format mandates quoting patient values. The v5 advice re-scope
  is its second chance — if the clinician round still shows nothing, retire it on evidence.
- **v5 judge smoke not yet run**: rerun the 3-judge harness on the final batch to check that
  Comprehensiveness discriminates, that re-scoped Personalization leaves the floor, and that no
  remaining axis tracks Factuality.
- **Blinding leak** in the v33 batch, `HSP_v7_040` arm B: the letter says *"From the provided
  future-condition rows only Sleep disorders (score 100) remains after filtering"*, which reveals
  it had prediction scores. 1 of 18 responses; must be fixed before clinicians see it.
- **Arm C naming**: in `HSP_v7_000` it emits *"cognitive decline", "vascular instability", "mood
  worsening"* rather than condition names, so Factuality may understate it.
- **Blinding check**: because two axes now key on the recorded outcome, test after the clinician
  round whether raters can identify arms above chance.

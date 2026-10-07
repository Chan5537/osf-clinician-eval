// DISEASE rubric v15 — the five Likert scales asked about the letter's FUTURE-DISEASE CALL,
// plus the case-level comparative ranking (see components/RankOrder.tsx; it is not an axis).
//
// v15 (2026-10-07, Chan): a wording pass for the clinician round. Goal: every "What 1–5 mean
//    here" and "How to score · example" text is self-contained, so raters score from the
//    definitions rather than from their own priors. Changes:
//    - ORDER: Relevance moves to the first slot (keys unchanged; export columns follow this order).
//    - All five: no description defines a scale with its own word ("justified", "personalized",
//      "useful", "relevant"); each How to score defines its terms; every example is laid out as a
//      patient block (HSP_v7_000 values, quoted in parentheses as the letters write them) followed
//      by one constructed response per score, 5 to 1. No example features a risk prediction:
//      predictions appear in one arm's letters only (100/300 in v66w3_full100_parens).
//    - Relevance: precision and priority only (omission moved to Comprehensiveness).
//    - Justifiability: "reasoning" = evidence, inference, conclusion; "sound" = all three hold;
//      predictions count as evidence; the "selective reading" clause at 2 is dropped.
//    - Comprehensiveness: NEW QUESTION (coverage in breadth and depth, replacing "beyond the
//      known information"). Full/Partial/Minimal per dimension, combined into 1–5.
//    - Personalization: question unchanged; terms defined; 4 vs 5 = synthesis carried into the
//      recommendations.
//    - Usefulness: NEW QUESTION (useful to a clinician planning follow-up care, replacing
//      SensorFM's "useful summary to a healthcare provider"); decision value x actionability.
//    ⛔ v15 is NOT comparable with v14 on Comprehensiveness or Usefulness (different questions), and
//       the other three changed their anchors: filter on rubric_version, never pool.
//
// v14 (2026-10-06, Chan; agreed with Zitao after Prof. Yang's critique of Accuracy): ACCURACY ->
//    JUSTIFIABILITY (key `justifiability`), the first axis. SensorFM ED.1 [Justifiability] in the house
//    form, grading the reasoning behind the future-risk conclusions rather than the call against the
//    recorded outcome. The other four axes are unchanged, word for word. See the JUSTIFIABILITY block
//    below for provenance and the three departures from ED.1.
//    ⛔ v14 is NOT comparable with v13 on the first axis (a different key and question), and v14
//       `justifiability` is NOT v6 `justifiability` — filter on rubric_version.
//
// v13 (2026-09-29, Chan): TRUSTWORTHINESS -> RELEVANCE (key `relevance`), the last axis. SensorFM
//    ED.1 [Relevance] in the house form: "To what extent ..." stem, uniform label ladder, one-sentence
//    howToScore, a worked example. The other four axes are unchanged, word for word. See the RELEVANCE
//    block below for provenance, the v6 guard, and what Trustworthiness carried that now has no home.
//    ⛔ v13 is NOT comparable with v12 on the last axis: a different key and a different question.
//
// v10 (2026-09-18, Chan; agreed with Zitao in-session). THE FINAL WORDING. Two axes change:
//
//   1. FACTUALITY -> ACCURACY, BROADENED. The v8/v9 stem asked whether the response "identifies
//      the new health risk this patient actually went on to develop". That is a deterministic
//      lookup against the "Future risk" panel, and the measured consequence is stark: in the v6
//      clinician round the outcome-matched arm scored EXACTLY 5.00 on every case — a perfect
//      ceiling with ZERO VARIANCE — against 2.80 and 3.10 for the other two. An arm constructed
//      FROM the outcome panel cannot lose a lookup against it, so the axis was reporting which
//      arm the rater held rather than how good the response was. That is both an inflated score
//      and a blinding leak.
//      The fix is NOT to drop the outcome key — correctness has nowhere else to live, and the
//      2026-08-24 note below records what happened last time it moved (Factuality decayed into a
//      transcription check). The fix is to make the outcome ONE OF FOUR SURFACES the score spans:
//      disease prediction, interpretation of this patient's results, references, recommendations.
//      Naming the right disease now earns the right AREA of the ladder; the other three surfaces
//      decide between 5 and 4. The ceiling becomes reachable by any arm and automatic for none.
//
//   2. SAFETY -> TRUSTWORTHINESS. Zitao's ask, verbatim: our arm "scores very low due to false
//      positive/strongly confident reasoning. But despite false positives, we do highlight a lot
//      of true positives and value in that sense." No v8 axis credited that — Factuality graded
//      the headline call and Safety graded consequence. Trustworthiness grades whether the case
//      the response makes is CARRIED BY THE REASONING IT SHOWS, so a response that surfaces a
//      real risk on visible reasoning scores well even when it also carries false positives.
//      Safety is absorbed into anchor 1: harmful advice is the limiting case of untrustworthy
//      advice. This mirrors the IR paper (Metwally et al., Nature 2026), where Safety is an
//      absolute item and Trustworthiness is the comparative judgement.
//
//   ⛔ v10 scores are NOT comparable with v8 or v9. Two keys are renamed AND two questions
//      change meaning. This break is FREE: no ratings were ever collected under v9-20260903 —
//      the only collected round (human_eval/clinician_round/clinician-ratings-2026-09-01.csv)
//      ran under v6-20260829. Verified before taking the break, not assumed.
//
// v8 (2026-09-02, Chan; ask from Zitao: "can the rubrics now better assess response quality").
// TWO structural repairs and one wording pass, all driven by the v6 clinician round
// (human_eval/clinician_round/clinician-ratings-2026-09-01.csv, n=150, ONE rater "ML"):
//
//   1. ⛔ USEFULNESS WAS NESTED INSIDE FACTUALITY and is now de-nested. The v7 anchors read
//      "points to what they went on to develop" at 5/4/3 and "points elsewhere/away" at 2/1,
//      so scores 3-5 REQUIRED a correct call and 1-2 REQUIRED a wrong one: Factuality
//      mechanically set Usefulness's floor, and the truth arm was pinned >=3 in every case by
//      construction rather than by judgement. Two of five axes would have moved together by
//      definition, double-weighting the one axis that carries arm separation (+1.00 in the
//      2026-08-24 judge run) while presenting it as two independent pieces of evidence.
//      v8 asks FORESEEABILITY instead — how far past the chart the response reaches — which is
//      conditionally independent of whether the reach was correct. A wrong-but-bold call can
//      now score 4 on Usefulness and 1 on Factuality, which is the whole point: those are
//      different properties and the instrument must be able to say so.
//
//   2. PERSONALIZATION CORRELATED r=0.80 WITH USEFULNESS across the 30 v6 responses — the
//      rater was not scoring two things. Kept as an axis (owner's call 2026-09-02: no better
//      alternative on offer) but re-scoped to be separable: it now grades the SUGGESTIONS
//      block alone, by a swap test (would this line survive being pasted into another
//      patient's letter?), with novelty/value explicitly assigned to Usefulness. If the
//      internal round repeats r>0.7, retire it on evidence.
//
//   3. ABSOLUTE QUANTIFIERS REPLACED WITH OBSERVABLE MOVES. Personalization's 5 demanded
//      "EVERY suggestion ... written for this person alone" and Factuality's 5 "nothing added"
//      — unreachable ceilings, and the data shows it: across 30 responses Personalization was
//      NEVER once scored 5 and used 4/5 levels (sd 0.85). An anchor a rater cannot reach is a
//      scale point that does not exist. Each anchor now names a move that can be observed in
//      the text (per Zitao: the SensorFM ED.1 style, "linking a unique biomarker to a distinct
//      lifestyle habit"), so 5 is attainable and the ladder is evenly spaced.
//
//   ⛔ v8 scores are NOT comparable with v7 or earlier. This costs nothing: no v7 ratings were
//      ever collected (the clinician round ran on v6), so the break is free and is being taken
//      NOW, before the internal round, rather than after it.
//
// v6 (2026-08-29, owner; wording settled in-session against the live v56 letters): the axis SET
//
// v6 (2026-08-29, owner; wording settled in-session against the live v56 letters): the axis SET
// is rebuilt around what the clinician round showed raters actually doing.
//   ⚠️ THE v6 ORDER BELOW IS SUPERSEDED. v8 (2026-09-02, owner) runs
//      Factuality, Comprehensiveness, Personalization, Relevance, Safety — Factuality leads
//      because it sets the task frame (did the letter call what actually happened), and Safety
//      is LAST: it grades the consequence of the letter, which reads most naturally after the
//      rater has already judged what the letter claims. The v6 reasoning is kept below for the
//      batches scored under it.
//   ORDER IS PART OF THE DESIGN: Usefulness comes FIRST because it teaches the task frame —
//   "the question is what is NEW for this patient" — before any other judgement is made.
//   1. Usefulness (key `usefulness`, was Relevance on `relevance`): what does the patient learn
//      that their chart could not already tell them. Replaces Relevance, which clinicians
//      scored backwards — reading the history is good practice to them, so history-heavy
//      responses scored HIGH on focus. Usefulness does not fault reading the chart; it asks
//      whether the patient learns anything beyond it.
//   2. Factuality (unchanged key): now explicitly two-tier — the NEW risk area is the entry,
//      the named conditions are the ceiling (right area alone caps at 3).
//   3. Comprehensiveness (unchanged key): the integration wording — aspects reasoned together
//      into the conclusion, not counted.
//   4. Personalization (unchanged key): suggestions specific to this patient. Sweet point
//      between SensorFM ED.1 (anchors 1-3 near-verbatim) and findings-linked specificity
//      (anchors 4-5). "Suggestions", not "recommendations" — the section carries things to
//      watch and to raise, not only things to do. Verified against the v56 letters: the
//      actionable STYLE is format-driven and arm-invariant; what varies is whether the asks
//      come from this letter's own findings.
//   5. Justifiability (key `justifiability`, was Trustworthiness on `trustworthiness`): the
//      guard axis — conclusions weighed against the evidence THE RESPONSE GIVES, never against
//      the visible panels alone (that reference punished any arm whose grounds the rater
//      cannot see). Replaces the confidence-tone framing: the format forces every letter to
//      commit, so under-claiming barely exists, and "is this justified" is the judgement
//      clinicians already know how to make.
//   ⛔ v6 scores are NOT comparable with v5 or earlier — report separately, never pooled.
//   Worked examples are DELIBERATELY ABSENT until the clinician batch is final; they must
//   quote real letters of the loaded batch.
//
// v5 (2026-08-28, Zitao; wording approved in-session): TWO axes change, three stand.
//   - `harm` now carries COMPREHENSIVENESS, replacing Safety. Safety earned its keep only while
//     it measured something Factuality did not: in the 2026-08-24 judge run the two moved in
//     parallel (both outcome-keyed; Safety A 3.83 / B 4.33 / C 4.33 against Factuality's
//     A 1.33 / B 2.33 / C 3.00) — no independent signal for a fifth of the composite.
//     Comprehensiveness grades how broadly the ANALYSIS ranges across the pertinent aspects of
//     this patient's health, and whether what it raises does work in the argument. It names no
//     specific data source on purpose — pointing at any one signal would be leading.
//   - `personalization` is RE-SCOPED from the synthesis to the RECOMMENDATIONS: advice grounded
//     in this patient's own circumstances, saying why THIS patient should take these steps.
//   - Factuality, Trustworthiness and Relevance are UNCHANGED from v4, comments included.
//   - With Safety retired, Factuality is again the ONLY axis keyed on the outcome panel.
//   - ⛔ v5 scores are NOT comparable with v4 (same keys, different questions) — report separately.
//   - Worked examples for the two changed axes are DELIBERATELY ABSENT until the letter batch
//     they must quote from is finalised (2026-08-25 rule: examples quote real letters of the
//     loaded batch, and the loaded v33.11 letters cannot illustrate either axis).
//
// SOURCE OF TRUTH: for the three UNCHANGED axes, "[updated] Clinician Evaluation Rubric.docx"
// (Chan, 2026-08-24), held at sleepfm-agent-eval/rubric_v2_eval/ — if the two disagree there, the
// .docx wins and this file is wrong. The docx has not caught up with the two v5 axes yet: for
// them THIS FILE is the interim source of truth until Chan issues an updated docx
// (see docs/rubric/README.md).
//
// STATUS: Chan-authored, agreed with Zitao 2026-08-24. This set SUPERSEDES the 2026-08-22/23
// wording that previously stood in this file.
//
// ⛔ WHAT THIS OVERRIDES, recorded so the cost stays visible rather than forgotten.
//    The prior version of this file carried an explicit prohibition:
//      "Nothing in this instrument is scored against the RECORDED OUTCOME ... an axis scored
//       against the recorded outcome would let the ground-truth arm score perfectly every time
//       and be identified on sight."
//    v4 deliberately reverses that for TWO axes — Factuality and Safety both now send the rater to
//    the future-disease outcome panel. The reasoning behind the reversal:
//      - Correctness had nowhere else to live. Under the previous wording Factuality became a
//        fact-check of quoted values (does the letter misquote AHI), which is a transcription
//        check, and the axis stopped measuring whether the letter picked the right conditions.
//      - In the 2026-08-24 LLM-judge run over the v33 batch (3 judges x 6 cases x 3 arms), the
//        outcome-keyed Factuality was the axis that carried the arm separation: A 1.33 / B 2.33 /
//        C 3.00, and composite B-A = +0.544 (p = 0.0046, 14W/0T/4L). No other axis came close.
//    THE BLINDING RISK IS REAL AND IS NOT DISMISSED: an arm that keeps matching the outcome panel
//    can in principle be picked out. It is accepted knowingly, and should be checked after the
//    clinician round by testing whether raters can identify arms above chance.
//
// KEYS RENAMED 2026-08-29 (owner): the keys now ARE the labels. The old frozen set had been
// relabelled three times and ended with `relevance` and `justifiability` each carrying the
// other's axis — a guaranteed misread for anyone analysing the export by column name. The
// rename rode the same SCHEMA_VERSION bump as the v5 axis changes, so no comparable session
// was invalidated by it. For reading HISTORICAL (pre-rename) exports:
//         old context         -> factuality        (Factuality since v33)
//         old harm            -> comprehensiveness (Safety in v33/v4, Comprehensiveness in v5)
//         old relevance       -> trustworthiness   (Trustworthy v33, Trustworthiness v4/v5)
//         old justifiability  -> relevance         (Justifiability v33, Relevance v4/v5)
//         personalization     -> personalization
//   - higher is better on all five.
//
// ⛔ SCORES ARE NOT COMPARABLE with any earlier batch. Same keys, different questions. Anything
//    scored under the v26/v33 wording is reported separately, never pooled with v4.
//
// PROVENANCE of each criterion:
//   - Relevance is SensorFM Survey ED.1 VERBATIM (see the generation repo at
//     docs/sensorfm_rubric_verbatim.md). Personalization is ADAPTED from ED.1: v33 dropped the
//     "or Mistaken" label suffix (correctness lives in Factuality), and v5 re-scopes the axis to
//     the recommendations — anchors 4 and 1 were already about advice and keep their ED.1 text
//     verbatim; the rest is minimally edited toward advice.
//   - Factuality's anchor ladder is structured after the IR paper's "all relevant and correct
//     interpretations" item: one repeated frame, the quantifier the only thing that varies.
//   - Comprehensiveness (v5) is house-authored. Its wording follows the 2026-08-25 Factuality
//     softening: extent words throughout, nothing a rater could read as an instruction to count.
//     Its "does work in the argument" test is the same line Relevance draws at dilution, so the
//     two stay consistent: breadth put to use scores on both; a recital of the whole chart
//     scores on neither.
//   - Trustworthiness rates the FIT between stated confidence and available evidence, never felt
//     trust. Grounded in Kim et al., FAccT 2024 (arXiv:2405.00623): first-person hedging LOWERED
//     self-reported trust while RAISING task accuracy, so a felt-trust scale would penalise a
//     well-calibrated letter for being appropriately cautious.
//
// ⚠️ NOT MEASURED HERE, deliberately: whether an arm repeats the SAME diseases across patients.
//    It is a CROSS-PATIENT property and a blinded rater holding one case cannot see it. It belongs
//    in a script over the batch, reported alongside the Likert means.
//
// BLINDING CONSTRAINTS carry over unchanged: no reference to architecture (tools, ReAct, SleepFM,
// "the model", a specific arm), no naming of a condition or group, no "oracle"
// anywhere in rater-facing text. ⚠️ "Ground-truth" IS now used, as the Sleep panel / Prior
// medical history tag (owner 2026-09-18, replacing "Known info"): it labels the RECORDED
// INPUTS a rater can verify. It must never be used of an ARM or of the Future risk outcome —
// the strip says "What this patient actually developed" in plain words for that reason.
// anywhere in rater-facing text. The panel is called "Future risk" (renamed 2026-08-28, owner;
// previously "Future disease(s) patient developed in 6 years" — keep the howToScore strings
// below in step with it; the recorded-outcome meaning now lives in the panel's meta line).
import type { RubricDimensionDef } from './rubric-config'

// Stamped into every export row (rubric_version column) so a CSV identifies which wording —
// and which key vocabulary — produced it. Bump alongside SCHEMA_VERSION when axes change.
export const RUBRIC_VERSION = 'v15-20261007'

// Guidance strings are written one line per array element and joined with '\n', so the block
// structure RubricText reads (blank line = new block; "- " list; "|" table) stays visible here.
const lines = (...rows: string[]) => rows.join('\n')

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // RELEVANCE — first slot from v15. Precision and priority only: whether what the response
    // includes is clinically relevant to the risk it raises, and whether the most strongly linked
    // information leads. Omission of a relevant finding is NOT graded here (it moved to
    // Comprehensiveness breadth in v15), and recommendations are out of scope, otherwise every
    // response's advice section would count as irrelevant information.
    key: 'relevance',
    label: 'Relevance',
    question:
      "To what extent does this response identify and prioritize the most clinically relevant " +
      "information (e.g., sleep findings, medical history, supporting studies) for this patient's " +
      'future disease risk?',
    howToScore: lines(
      `**Evaluate** whether the response **identifies** the most clinically relevant information for the future disease risk it raises, and **prioritizes** it.`,
      ``,
      `Information is **clinically relevant** when it is one of the following, and the response connects it to the risk it raises:`,
      ``,
      `- **Sleep findings**: a value or pattern from the sleep study that raises or lowers the risk of that disease (e.g., Sleep efficiency or RDI for heart disease).`,
      `- **Medical history**: a condition in Prior medical history, or the patient's age, sex or BMI, that raises or lowers the risk of that disease (e.g., Essential hypertension for heart disease).`,
      `- **Supporting studies**: a cited study of the link between such findings or conditions and that disease.`,
      ``,
      `Information that is none of these is **irrelevant**, however accurate (e.g., a Prior medical history condition unrelated to that disease, or a sleep value the response never connects to it).`,
      ``,
      `**Identifying** means selecting the information most strongly linked to the risk. **Prioritizing** means presenting that information first and giving it the most space.`,
      ``,
      `Recommendations (what the patient should watch for or do) are not counted on this scale. This scale does not judge whether every relevant finding is included. Ignore the reference list.`,
    ),
    example: lines(
      `**Patient:** a 73-year-old man.`,
      ``,
      `- **Sleep panel:** Sleep efficiency (68.0%), WASO (127.0 min), RDI (42.6 events per hour), AHI (14.0 events per hour), Sleep onset latency (7.5 min), N1 (7.7%), Time in bed (422.5 min).`,
      `- **Prior medical history** includes Essential hypertension, Hyperlipidemia, Spinal stenosis, Osteoarthritis; localized and Acute posthemorrhagic anemia.`,
      ``,
      `All five responses raise **Ischemic Heart Disease** as the future risk.`,
      ``,
      `**Response X** opens with the two Sleep panel findings most strongly linked to heart disease: fragmented sleep (Sleep efficiency 68.0%; WASO 127.0 min) and frequent breathing disturbance (RDI 42.6 events per hour). It connects the fragmented sleep to that risk through a cited community study in which wakefulness after sleep onset predicted cardiovascular events, adds Essential hypertension and Hyperlipidemia as conditions that raise the same risk, and notes that the mild AHI (14.0 events per hour) lowers but does not remove the concern. Every item is connected to heart disease, and the most strongly linked come first: **Very Relevant (5)**.`,
      ``,
      `**Response Y** has the same opening, study and history, but also restates Spinal stenosis and Osteoarthritis; localized without linking them to heart disease. That is a small amount of irrelevant information: **Relevant (4)**.`,
      ``,
      `**Response Z** opens by reviewing Sleep onset latency (7.5 min) and N1 (7.7%), and lists Spinal stenosis, Osteoarthritis; localized and Acute posthemorrhagic anemia, connecting none of them to heart disease. Only in its second half does it reach Sleep efficiency (68.0%), RDI (42.6 events per hour) and the supporting study. The most clinically relevant information is present but placed after irrelevant information: **Neutral (3)**.`,
      ``,
      `**Response W** spends most of its length on the same unrelated Prior medical history conditions and on sleep timing (Time in bed 422.5 min; Sleep onset latency 7.5 min). It mentions Sleep efficiency (68.0%) in a single sentence near the end, and never mentions the RDI (42.6 events per hour) or Essential hypertension. Most of the information is irrelevant, and the most strongly linked finding occupies a single sentence: **Not Relevant (2)**.`,
      ``,
      `**Response V** names Ischemic Heart Disease but supports it with nothing that bears on it: it describes sleep timing (Time in bed 422.5 min; Sleep onset latency 7.5 min; N1 7.7%) and Spinal stenosis and Osteoarthritis; localized, connecting none of them to heart disease. No sleep finding, Prior medical history condition or study is connected to the risk: **Not Relevant At All (1)**.`,
    ),
    anchors: [
      {
        value: 5,
        label: 'Very Relevant',
        description:
          '**Identifies** the information most strongly linked to the risk it raises and **presents it first**, giving it the most space. **All** information in the response is clinically relevant.',
      },
      {
        value: 4,
        label: 'Relevant',
        description:
          '**Leads with** the information most strongly linked to the risk, but includes **a small amount** of irrelevant information (e.g., one or two Prior medical history conditions or sleep values not linked to the risk) that slightly dilutes it.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          '**About half** of the information is clinically relevant and about half is irrelevant, **or** the most clinically relevant information is present but **placed after** irrelevant information.',
      },
      {
        value: 2,
        label: 'Not Relevant',
        description:
          '**Most** of the information is irrelevant; the information most strongly linked to the risk occupies **only a small part** of the response.',
      },
      {
        value: 1,
        label: 'Not Relevant At All',
        description:
          '**None** of the information is clinically relevant: the response connects **no** sleep finding, medical history condition or study to the risk it raises, or raises no future disease risk at all.',
      },
    ],
  },
  {
    // JUSTIFIABILITY — v15 defines "reasoning" as three components (evidence, inference,
    // conclusion) and "sound" as all three holding, so no anchor uses "justified". A risk
    // prediction the response reports counts as evidence. The v14 "selective reading" clause at
    // anchor 2 is dropped: omission is graded once, under Comprehensiveness breadth. The worked
    // example deliberately contains no risk prediction: predictions appear in one arm only, so an
    // example built on one would steer raters toward or against that arm.
    key: 'justifiability',
    label: 'Justifiability',
    question:
      "To what extent are this response's conclusions about future disease risk, and its suggested " +
      'next steps, clinically justified by reasoning from the available evidence (e.g., sleep findings, ' +
      'medical history, supporting studies)?',
    howToScore: lines(
      `**Evaluate** the **reasoning** the response states for each conclusion about future disease risk and each suggested next step, **not whether** the risk later developed.`,
      ``,
      `Reasoning has three components:`,
      ``,
      `- **Evidence**: the information a conclusion rests on. This can be a sleep finding, a condition in Prior medical history, the patient's age or sex, a risk prediction the response reports, or a cited study's result.`,
      `- **Inference**: the stated link from the evidence to the conclusion, i.e. why the evidence makes the risk more or less likely, or why the next step addresses the risk (e.g., a study showing the association, or an established clinical mechanism).`,
      `- **Conclusion**: the future risk raised or the next step suggested, together with how firmly it is stated (e.g., "may", "is associated with", "will").`,
      ``,
      `Reasoning is **sound** when all three hold:`,
      ``,
      `1. the evidence is stated and read correctly;`,
      `2. the inference is stated and holds (a cited study concerns the same condition or outcome as the claim it supports);`,
      `3. the conclusion is stated no more firmly than the evidence allows.`,
      ``,
      `These are **not reasoning**:`,
      ``,
      `- a finding placed next to a conclusion with no stated link (e.g., "Your RDI is 42.6 events per hour. Watch for heart disease.");`,
      `- a general statement that applies to anyone (e.g., "Sleep is important for heart health.").`,
      ``,
      `The **primary conclusion** is the future risk the response names first. Evaluate only the reasoning the response states; do not supply reasoning it leaves out.`,
    ),
    example: lines(
      `**Patient:** a 73-year-old man.`,
      ``,
      `- **Sleep panel:** Sleep efficiency (68.0%), WASO (127.0 min), RDI (42.6 events per hour), AHI (14.0 events per hour), Nadir SpO₂ (91.0%).`,
      `- **Prior medical history** includes Essential hypertension, Hyperlipidemia and Chronic renal failure [CKD].`,
      ``,
      `All five responses name **Ischemic Heart Disease** as the primary conclusion.`,
      ``,
      `**Response X**`,
      ``,
      `- Evidence: fragmented sleep (Sleep efficiency 68.0%; WASO 127.0 min).`,
      `- Inference: a cited community study in which more wakefulness after sleep onset was associated with later cardiovascular events.`,
      `- Conclusion: this fragmented sleep "is associated with a higher risk" of Ischemic Heart Disease.`,
      ``,
      `X also acknowledges evidence pointing the other way: the mild AHI (14.0 events per hour) does not by itself add to that risk. It suggests a blood-pressure and cholesterol review "because your prior Essential hypertension and Hyperlipidemia raise the same risk". Every conclusion and next step is supported by sound reasoning: **Very Justifiable (5)**.`,
      ``,
      `**Response Y** gives the same reasoning but says the fragmented sleep "clearly raises" the risk. That is somewhat firmer than an association allows, but the conclusion itself does not change: **Justifiable (4)**.`,
      ``,
      `**Response Z** supports the primary conclusion as X does, but also recommends "a kidney function test" and states no evidence for it. Prior medical history lists Chronic renal failure [CKD], but the response never mentions it, and the rater must not supply that link. A secondary next step is not supported: **Neutral (3)**.`,
      ``,
      `**Response W** states the same evidence (Sleep efficiency 68.0%) but links it to heart disease through a cited study of all-cause mortality, which is a different outcome. The inference for the primary conclusion does not hold: **Unjustifiable (2)**.`,
      ``,
      `**Response V** states that the patient's oxygen "dropped dangerously low overnight (Nadir SpO₂ 91.0%)" and concludes from this that his heart disease risk is high. A nadir of 91.0% is a mild dip, so the primary conclusion rests on a misreading of the patient's data: **Very Unjustifiable (1)**.`,
    ),
    anchors: [
      {
        value: 5,
        label: 'Very Justifiable',
        description:
          '**Every** conclusion and next step is supported by **sound** reasoning. Evidence that **points against** a conclusion (e.g., a normal or mild value) is **acknowledged**.',
      },
      {
        value: 4,
        label: 'Justifiable',
        description:
          '**Every** conclusion and next step **states its evidence and reads it correctly**, but one or two have a **minor weakness that does not change the conclusion**: the inference is left implicit, or the conclusion is stated **somewhat** more firmly than the evidence allows (e.g., "clearly raises your risk" where the cited study shows an association).',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'The **primary conclusion** is supported by sound reasoning, or has only a minor weakness as described at 4, but **at least one** secondary conclusion or next step is **not**: it states no evidence, misreads its evidence, or rests on an inference that does not hold. A response that **declines to reach any conclusion**, leaving nothing to evaluate, also scores 3.',
      },
      {
        value: 2,
        label: 'Unjustifiable',
        description:
          'The **primary conclusion** states its evidence, but the **inference does not hold**: an association presented as certain to occur (e.g., "you will develop"), a prediction stated far more firmly than its size allows, or a cited study of a **different condition, outcome or population**.',
      },
      {
        value: 1,
        label: 'Very Unjustifiable',
        description:
          "The **primary conclusion** states **no evidence**, or rests on a **misreading** of the patient's data (e.g., a value reported incorrectly, or judged against the wrong reference range).",
      },
    ],
  },
  {
    // COMPREHENSIVENESS — v15 replaces the question. v7–v14 asked for information "beyond the known
    // information", which measured novelty, not comprehensiveness. v15 asks for COVERAGE in the
    // information-quality sense, collapsed to two dimensions: breadth (scope + range of sources)
    // and depth (development + context). ⛔ v7 retired an earlier coverage framing because it
    // rewarded chart-tour letters; the guard is that breadth is defined relative to the risk raised
    // and a finding only counts as developed with value, meaning and context, so a chart tour is
    // full breadth with minimal depth and caps at 3. Depth's "context" is limited to meaning and
    // limits on purpose: relating findings to one another is Personalization's synthesis.
    key: 'comprehensiveness',
    label: 'Comprehensiveness',
    question:
      "To what extent does this response cover this patient's future disease risk in both breadth and " +
      'depth (e.g., range of relevant findings and sources, detail and context for each risk)?',
    howToScore: lines(
      `**Evaluate** how fully the response accounts for the future disease risk it raises, on two dimensions: **breadth**, the range of relevant findings and sources it draws on, and **depth**, how fully it develops each finding. Rate each as full, partial or minimal using the definitions below; the 1–5 scale combines the two.`,
      ``,
      `A **relevant finding** is one that raises or lowers the risk of that disease. Findings fall into these domains: Breathing & oxygenation, Sleep continuity and Sleep architecture (from the Sleep panel or the sleep recording); Prior medical history; and age, sex and BMI. **Types of source** are the Patient Panel, values from the sleep recording not shown in the Sleep panel, risk predictions or estimates, and published studies.`,
      ``,
      `| Breadth | Meaning |`,
      `|---|---|`,
      `| Full | Draws on every finding strongly linked to the risk, across more than one domain, and on more than one type of source. |`,
      `| Partial | Omits one or more strongly linked findings, or draws on a single type of source. |`,
      `| Minimal | Rests on a single finding. |`,
      ``,
      `A finding is **developed** when the response gives:`,
      ``,
      `1. its specific value (e.g., Sleep efficiency (68.0%), not "poor sleep");`,
      `2. its meaning: how it relates to the risk, through a mechanism or a supporting study;`,
      `3. its context: what the measure means and the limits of what it shows (e.g., magnitude, uncertainty).`,
      ``,
      `| Depth | Meaning |`,
      `|---|---|`,
      `| Full | Every finding the response uses is developed. |`,
      `| Partial | Some findings are developed; others are only named. |`,
      `| Minimal | Findings are named or listed without development. |`,
      ``,
      `Listing many findings without developing them adds breadth, not depth. Credit development regardless of whether you agree with it.`,
    ),
    example: lines(
      `**Patient:** a 73-year-old man.`,
      ``,
      `- **Sleep panel:** Sleep efficiency (68.0%), WASO (127.0 min), RDI (42.6 events per hour), AHI (14.0 events per hour), Nadir SpO₂ (91.0%).`,
      `- **Prior medical history** includes Essential hypertension and Hyperlipidemia.`,
      ``,
      `All five responses raise **Ischemic Heart Disease** as the future risk. The findings most strongly linked to that risk are the fragmented sleep (Sleep efficiency, WASO), the breathing disturbance (RDI), and Essential hypertension and Hyperlipidemia.`,
      ``,
      `**Response X**`,
      ``,
      `- **Breadth:** it draws on all three domains (Sleep continuity, Breathing & oxygenation, Prior medical history) and on three types of source: the Patient Panel, the sleep recording (26 awakenings, not shown in the Sleep panel) and a cited cohort study.`,
      `- **Depth:** it develops each finding.`,
      `  - The fragmented sleep (Sleep efficiency 68.0%; WASO 127.0 min) is linked to Ischemic Heart Disease through the cohort study, in which wakefulness after sleep onset was associated with later cardiovascular events.`,
      `  - The breathing disturbance (RDI 42.6 events per hour) is linked through recurrent arousals and surges in blood pressure, and qualified by the mild AHI (14.0 events per hour) and the modest Nadir SpO₂ (91.0%).`,
      `  - Essential hypertension and Hyperlipidemia are presented as established risk factors for Ischemic Heart Disease.`,
      ``,
      `Breadth and depth are both full: **Very Comprehensive (5)**.`,
      ``,
      `**Response Y** draws on the same findings and sources. It develops the fragmented sleep as X does, but mentions the RDI (42.6 events per hour), Essential hypertension and Hyperlipidemia only in passing ("these are also worth noting"). Breadth is full; depth is partial: **Comprehensive (4)**.`,
      ``,
      `**Response Z** develops the fragmented sleep as fully as X (value, cohort study, context) but rests on that single finding, omitting the RDI, Essential hypertension and Hyperlipidemia. Depth is full; breadth is minimal: **Neutral (3)**. A response that instead listed every strongly linked finding without developing any of them would also score **Neutral (3)**.`,
      ``,
      `**Response W** rests on a single finding, the RDI (42.6 events per hour), and states that frequent breathing disturbance is "linked to heart disease" without a mechanism, study or context. Breadth is minimal; depth is partial: **Not Comprehensive (2)**.`,
      ``,
      `**Response V** attributes the risk to "your poor sleep", with no value, link or context. Both dimensions are minimal: **Not Comprehensive At All (1)**.`,
    ),
    anchors: [
      {
        value: 5,
        label: 'Very Comprehensive',
        description:
          'Draws on **every** finding strongly linked to the risk, across more than one domain and more than one type of source, and **develops each** of them. (Breadth full; depth full.)',
      },
      {
        value: 4,
        label: 'Comprehensive',
        description:
          'Covers every strongly linked finding but develops **only some**; **or** develops every finding it uses but **omits** one or more strongly linked findings, or draws on a single type of source. (One dimension full, the other partial.)',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Develops a **single** finding fully; **or** lists every strongly linked finding **without developing** any; **or** covers and develops the findings only in part. (One full and the other minimal, or both partial.)',
      },
      {
        value: 2,
        label: 'Not Comprehensive',
        description:
          'Rests on a **single** finding and develops it **only in part**; **or** names several findings, omitting some that are strongly linked, **without developing** any. (One minimal, the other partial.)',
      },
      {
        value: 1,
        label: 'Not Comprehensive At All',
        description: 'Rests on a **single** finding, **named without development**. (Both minimal.)',
      },
    ],
  },
  {
    // PERSONALIZATION — v15 defines the stem's terms: health aspects (areas of present health;
    // demographics are details, not aspects; the risk raised is not an aspect, or every response
    // would count as sleep + cardiovascular), synthesis (relating two or more aspects), and
    // patient-specific vs generic (the transferability test). 4 vs 5 is now one observable
    // difference: synthesis of two or more aspects carried into the recommendations.
    key: 'personalization',
    label: 'Personalization',
    question:
      'To what extent does this response personalize its synthesis of different health aspects (e.g., lifestyle, cardiovascular) to this patient?',
    howToScore: lines(
      `**Evaluate** whether the response's account of the patient's future health is **specific to this patient** or **generic**. Evaluate both the **analysis** (the explanation of the risk) and the **recommendations** (what the patient is advised to watch for, raise or do).`,
      ``,
      `- **Health aspects** are areas of the patient's present health that the response draws on, such as sleep, cardiovascular, metabolic, kidney and mental health, and lifestyle (e.g., smoking, physical activity). The future risk the response raises is not itself an aspect.`,
      `- **Synthesis** means relating two or more health aspects to each other, by stating how they combine or interact in this patient (e.g., fragmented sleep compounding existing Essential hypertension). Discussing aspects in separate, unconnected passages is not synthesis.`,
      `- A statement is **patient-specific** when it rests on this patient's own details (a value from the Sleep panel or the sleep recording, a condition in Prior medical history, or their age, sex or BMI) and would not hold unchanged for a different patient. A statement is **generic** when it could be moved, unchanged, into a response for another patient.`,
      ``,
      `Citing a value without relating it to the risk or to a recommendation does not make a statement patient-specific.`,
    ),
    example: lines(
      `**Patient:** a 73-year-old man.`,
      ``,
      `- **Sleep panel:** Sleep efficiency (68.0%), WASO (127.0 min), RDI (42.6 events per hour), AHI (14.0 events per hour).`,
      `- **Prior medical history** includes Essential hypertension, Hyperlipidemia and Tobacco use disorder.`,
      ``,
      `All five responses raise **Ischemic Heart Disease** as the future risk.`,
      ``,
      `**Response X**`,
      ``,
      `- **Analysis:** it synthesizes three health aspects through his own details: sleep (Sleep efficiency 68.0%; WASO 127.0 min), cardiovascular and metabolic (Essential hypertension; Hyperlipidemia), and lifestyle (Tobacco use disorder). It explains that his fragmented sleep adds to the strain his existing hypertension and cholesterol already place on the coronary arteries, and that smoking compounds both.`,
      `- **Recommendations:** they follow from that synthesis: a blood-pressure and cholesterol review given the Essential hypertension and Hyperlipidemia; smoking-cessation support given the Tobacco use disorder; and reporting his frequent night-time awakenings (26 per night, from the sleep recording).`,
      ``,
      `**Highly Personalized (5)**.`,
      ``,
      `**Response Y** relates only his sleep findings (Sleep efficiency 68.0%; WASO 127.0 min; RDI 42.6 events per hour) to the risk, so the analysis draws on a single aspect. Its recommendation is tied to those findings: "mention your frequent night-time breathing disturbance (RDI 42.6 events per hour) at your next appointment": **Personalized (4)**.`,
      ``,
      `**Response Z** gives X's analysis but closes with "eat a balanced diet, exercise regularly, and see your doctor for routine check-ups". The analysis is patient-specific; the recommendations are generic: **Neutral (3)**.`,
      ``,
      `**Response W** opens with "your AHI is 14.0 events per hour and your Sleep efficiency is 68.0%", follows with a general passage on preventing heart disease in older adults that never refers back to those values, and closes with the same generic advice as Z. The values are related to neither the risk nor the recommendations: **Not Personalized (2)**.`,
      ``,
      `**Response V** states only that "sleep problems are linked to heart disease; eat well, stay active and see your doctor". No detail of this patient appears: **Not Personalized At All (1)**.`,
    ),
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          'The analysis **synthesizes two or more** health aspects through this patient\'s own details, and the recommendations **follow from that synthesis**, each tied to the details it addresses.',
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          'The analysis and the recommendations are **both** patient-specific, but **either** the analysis draws on **only one** health aspect (no synthesis), **or** it synthesizes aspects while **only some** recommendations are tied to them and the rest are generic.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          '**Either** the analysis **or** the recommendations are patient-specific, **not both**; the other is generic.',
      },
      {
        value: 2,
        label: 'Not Personalized',
        description:
          "**Cites** this patient's details (e.g., age, isolated sleep values) but relates them to **neither** the risk **nor** the recommendations. The content would apply equally to a broad population with similar values.",
      },
      {
        value: 1,
        label: 'Not Personalized At All',
        description:
          'Contains **no** patient-specific statement. One-size-fits-all content of the kind found in a general health article.',
      },
    ],
  },
  {
    // USEFULNESS — v15 replaces SensorFM's verbatim stem ("a useful summary to a healthcare
    // provider"): the response is written to the patient and the rater IS the clinician, so the
    // stem now names the clinical task, planning follow-up care. ⛔ This ends direct comparability
    // with SensorFM ED.1 [Context]; the labels stay SensorFM's. Two dimensions: decision value of
    // the analysis (level of concern + focus for follow-up, distinct from Comprehensiveness, which
    // credits developing findings rather than ranking them) and actionability (specific step,
    // with timing). Concern stated in words earns the same credit as a number: only one arm
    // states risk numerically, so the definition says so and the example uses words only.
    key: 'usefulness',
    label: 'Usefulness',
    question:
      "To what extent is this response useful to a clinician planning follow-up care for this patient's " +
      'future disease risk (e.g., the level of concern the analysis establishes, specific follow-up steps)?',
    howToScore: lines(
      `**Evaluate** the response on two dimensions:`,
      ``,
      `- **decision value of the analysis**: whether the analysis tells a clinician how much concern the risk warrants, and which of the patient's findings or conditions follow-up should focus on;`,
      `- **actionability**: whether the response gives a follow-up step a clinician could carry out or order, and states when.`,
      ``,
      `Rate each as full, partial or minimal using the definitions below; the 1–5 scale combines the two.`,
      ``,
      `| Decision value | Meaning |`,
      `|---|---|`,
      `| Full | The analysis states the **level of concern** the risk warrants (its magnitude, likelihood or urgency) **and** singles out the **findings or conditions** that follow-up should focus on. |`,
      `| Partial | The analysis does **one** of these but not the other. |`,
      `| Minimal | The analysis describes findings without indicating how much concern they warrant or which should be the focus of follow-up. |`,
      ``,
      `A level of concern stated in words (e.g., "mild", "substantial", "warrants prompt attention") earns the same credit as one stated as a number (e.g., "about twice as likely"). Presenting every finding as equally "worth keeping in mind" does not single out a focus.`,
      ``,
      `| Actionability | Meaning |`,
      `|---|---|`,
      `| Full | At least one **specific** follow-up step (a named test, measurement or referral, or a named symptom to ask about) **with a time frame** (e.g., "at your next routine appointment") **or a trigger** (e.g., "promptly if chest discomfort develops on exertion"). |`,
      `| Partial | Specific follow-up steps with no time frame or trigger, **or** steps that point only to an area (e.g., "have your heart health checked"). |`,
      `| Minimal | No follow-up step, or only advice that gives a clinician nothing to carry out (e.g., "discuss these results with your doctor", "keep healthy habits"). |`,
    ),
    example: lines(
      `**Patient:** a 73-year-old man.`,
      ``,
      `- **Sleep panel:** Sleep efficiency (68.0%), WASO (127.0 min), RDI (42.6 events per hour), AHI (14.0 events per hour).`,
      `- **Prior medical history** includes Essential hypertension and Hyperlipidemia.`,
      ``,
      `All five responses raise **Ischemic Heart Disease** as the future risk.`,
      ``,
      `**Response X**`,
      ``,
      `- **Analysis:** it describes the concern as "substantial enough to warrant active attention, though not urgent". It singles out the fragmented sleep (Sleep efficiency 68.0%; WASO 127.0 min) and the existing Essential hypertension and Hyperlipidemia as what follow-up should focus on, and notes that the mild AHI (14.0 events per hour) is a lesser concern.`,
      `- **Follow-up steps:** a blood-pressure and lipid review "at your next routine appointment", and asking about chest discomfort or breathlessness on exertion, with assessment "promptly if these develop".`,
      ``,
      `Decision value and actionability are both full: **Very Useful (5)**.`,
      ``,
      `**Response Y** has the same analysis and recommends a blood-pressure and lipid review, but does not say when. Decision value is full; actionability is partial: **Useful (4)**.`,
      ``,
      `**Response Z** has the same analysis but proposes no follow-up step. Decision value is full; actionability is minimal: **Neutral (3)**.`,
      ``,
      `**Response W** states that "this is a significant concern", but presents the fragmented sleep, the RDI (42.6 events per hour), Essential hypertension and Hyperlipidemia as all "worth keeping in mind", without singling out a focus, and closes with "discuss these results with your doctor". Decision value is partial; actionability is minimal: **Useless (2)**.`,
      ``,
      `**Response V** lists the same values, says only that they "may be relevant to your heart", and closes with "keep up healthy habits". Both dimensions are minimal: **Very Useless (1)**.`,
    ),
    anchors: [
      {
        value: 5,
        label: 'Very Useful',
        description:
          'The analysis conveys **how much concern** the risk warrants and **what follow-up should focus on**, and the response gives at least one **specific, timed** follow-up step. (Decision value full; actionability full.)',
      },
      {
        value: 4,
        label: 'Useful',
        description:
          'One dimension is complete and the other only in part. For example, the analysis conveys the level of concern and the focus, but the follow-up steps lack timing or point only to an area; **or** the follow-up step is specific and timed, but the analysis conveys only the level of concern, or only the focus. (One full, the other partial.)',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'For example, the analysis is complete but **no follow-up step** is given; **or** a specific, timed step follows an analysis that conveys **neither** the level of concern nor the focus; **or** both dimensions are only partly met. (One full and the other minimal, or both partial.)',
      },
      {
        value: 2,
        label: 'Useless',
        description:
          'For example, the analysis conveys only the level of concern, or only the focus, and **no follow-up step** is given; **or** the analysis conveys neither, and the follow-up steps lack timing or point only to an area. (One minimal, the other partial.)',
      },
      {
        value: 1,
        label: 'Very Useless',
        description:
          'The analysis conveys **neither** the level of concern nor a focus for follow-up, and **no** follow-up step a clinician could carry out is given. (Both minimal.)',
      },
    ],
  },
]

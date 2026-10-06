// DISEASE rubric v14 — the five Likert scales asked about the letter's FUTURE-DISEASE CALL,
// plus the case-level comparative ranking (see components/RankOrder.tsx; it is not an axis).
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
export const RUBRIC_VERSION = 'v14-20261006'

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // JUSTIFIABILITY (key `justifiability`) — REPLACES ACCURACY, v14 (2026-10-06, Chan; agreed with
    // Zitao after Prof. Yang's critique of Accuracy). First slot, as Accuracy held.
    //
    // WHY ACCURACY WENT: its stem still keyed one of its four surfaces on the "Future risk" panel, so
    //    the axis graded the call against the recorded outcome; Prof. Yang's ask is that the axis
    //    grade the REASONING instead. Justifiability keeps three of Accuracy's surfaces —
    //    interpretation of the data, supporting studies, recommendations — recast as whether each
    //    conclusion FOLLOWS from them, and drops the outcome surface. howToScore says so out loud:
    //    "not whether the risk it raises later developed".
    //    ⚠️ With Accuracy retired, NO axis is keyed on the Future risk panel any more.
    //
    // SOURCE: SensorFM Survey ED.1 [Justifiability] (docs/sensorfm_rubric_verbatim.md in the
    //    generation repo), adapted the way Relevance was in v13: the "To what extent ..." stem, an e.g.
    //    list, scope to future disease risk. ED.1 asks about "the suggested next steps or actions";
    //    the stem widens that to the CONCLUSIONS about future disease risk as well. The labels are
    //    ED.1's own ladder (Very Unjustifiable ... Very Justifiable), as Usefulness keeps ED.1's. The
    //    anchors keep ED.1's moves nearly word for word:
    //      1 "unsupported by any data"        2 "somewhat unjustifiable ... weak correlative ...
    //                                            while ignoring stronger ... signals"
    //      3 "Split evenly between unjustifiable and justifiable"
    //      4 "Accurate reporting and interpretation of data, but contains minor, harmless ..."
    //      5 "explicitly justified by ... data"
    //
    // ⛔ THREE DELIBERATE DEPARTURES FROM ED.1, each a guard against a measured failure:
    //    - "verified data in the patient profile" -> "the patient's data". v6's `justifiability`
    //      sent the rater to the visible panels and INVERTED (BASE 4.00 > OURS 2.90 > TRUTH 2.30):
    //      any ground the rater could not see in a panel scored as unsupported.
    //    - "weak correlative predictions" -> "weak correlative evidence", so the anchor cannot be
    //      read as an instruction to discount model output.
    //    - "Ignore discussion on predicted targets ..." stays removed (2026-08-18b, rubric-config.ts).
    //    Plus the v12 stopping rule at anchor 3 ("declines to reach any conclusion"), so a hedging
    //    response cannot win by asserting nothing. Do NOT anchor on caveat language: one arm carries
    //    a verbatim estimate caveat in 10/10 letters (docs/rubric/README.md).
    //
    // ⚠️ NOT v6's `justifiability`, despite the shared key and label: different stem, anchors and
    //    reference point. Filter on rubric_version before pooling — never pool v6 with v14.
    //
    // THE EXAMPLE is built on HSP_v7_000 (the same case as Relevance's), from values on the Sleep
    //    panel. It is a constructed same-risk pair, not one arm's letter: X joins a move from one arm
    //    (the sleep-efficiency study) with a move from another (the mild-AHI qualification); Y's
    //    flaw (an all-cause-mortality study under a heart-disease claim) is taken from a third
    //    letter. No arm is the exemplar and no arm is the foil.
    key: 'justifiability',
    label: 'Justifiability',
    question:
      "To what extent are this response's conclusions about future disease risk, and its suggested " +
      'next steps, clinically justified by reasoning from the available evidence (e.g., sleep findings, ' +
      'medical history, supporting studies)?',
    howToScore:
      'Judge the **reasoning** the response presents, **not whether** the risk it raises later ' +
      'developed: ask whether each conclusion and next step **follows from** the patient\'s data and ' +
      'the studies cited in support of it.',
    example:
      'Both responses are for the same patient and raise the same future risk, **Ischemic Heart ' +
      'Disease**. Response X reasons from reduced sleep efficiency [SE 68.0%] to that risk through a ' +
      'community study in which wakefulness after sleep onset predicted cardiovascular events, notes ' +
      'that a mild [AHI 14.0 events/hour] does not by itself settle the question, and suggests a ' +
      'blood-pressure and cholesterol review that follows from those findings: Very Justifiable (5). ' +
      'Response Y reaches the same conclusion, but supports it with a study of all-cause mortality ' +
      'rather than heart disease, and leaves the frequent breathing disturbance [RDI 42.6 ' +
      'events/hour] unaddressed; the conclusion is stated, but not established by the reasoning ' +
      'presented: Unjustifiable (2), or Neutral (3) where its other conclusions are justified.',
    anchors: [
      {
        value: 5,
        label: 'Very Justifiable',
        description:
          "**All** conclusions about future disease risk, and **all** suggested next steps, are **explicitly justified** by reasoning from the patient's data, and each supporting study substantiates the claim it is attached to. Findings that weigh against those conclusions are **addressed**.",
      },
      {
        value: 4,
        label: 'Justifiable',
        description:
          "**Accurate** reporting and interpretation of the patient's data, with conclusions that follow from it, but contains **minor**, harmless gaps in reasoning (e.g., one conclusion stated **somewhat** more firmly than its stated basis supports).",
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          '**Split evenly** between justifiable and unjustifiable conclusions. A response that **declines to reach any conclusion**, leaving nothing to appraise, also scores here.',
      },
      {
        value: 2,
        label: 'Unjustifiable',
        description:
          "Conclusions are **somewhat unjustifiable**, resting on **weak** correlative evidence or on studies that do not substantiate them, while **ignoring stronger** signals in the patient's own data.",
      },
      {
        value: 1,
        label: 'Very Unjustifiable',
        description:
          "Draws conclusions or recommends actions that are **unsupported** by any data or reasoning the response presents, or that rest on a **misinterpretation** of the patient's data.",
      },
    ],
  },
  {
    // v7 (owner 2026-09-01): the coverage framing is retired — it rewarded
    // chart-tour letters and put the truth arm LOWEST, the reverse of the eval's purpose.
    // The name stays Comprehensiveness (owner 2026-09-01) but the axis now measures the
    // increment directly; "known information" is the exact wording
    // the panel's Ground-truth tags carry, so the question and the screen point at each other.
    key: 'comprehensiveness',
    label: 'Comprehensiveness',
    question:
      'To what extent does this response give the patient information beyond the known information ' +
      '(e.g., the Sleep panel, Prior medical history)?',
    howToScore:
      'Weigh what the response **adds** against what it **restates** from the Ground-truth panels. ' +
      'Information the patient could not have worked out from those panels counts for more than ' +
      'information they could.',
    // Examples live in the rubric doc (owner 2026-09-01), not in the UI.
    example:
      'Two responses for the same patient, both opening on the same recording [AHI 27.7 ' +
      'events/hour; ODI 27.5 events/hour]. One adds a chemistry estimate neither panel holds — ' +
      '**HbA1c 6.8 %**, outside the stated reference range, flagged as an estimate rather than a ' +
      'blood result — and names a specific condition to watch beyond what the panels list: Very ' +
      'Comprehensive (5). The other restates the same two indices, notes that the history already ' +
      'covers those areas, and concludes they are worth watching; a reader learns nothing the ' +
      'panels did not already give them: Not Comprehensive At All (1).',
    anchors: [
      {
        value: 5,
        label: 'Very Comprehensive',
        description:
          'Carries named content **absent from both** Ground-truth panels — a condition neither panel points to, an estimated value such as a chemistry figure, a medication resemblance — and states what in this recording points there. The patient could not have reached it from the panels alone.',
      },
      {
        value: 4,
        label: 'Comprehensive',
        description:
          '**Mostly** information beyond the known information, though the panels **already hint** at where it lands. **Some** space spent restating them.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          '**Something new** is in there, wrapped in **about as much** recital of the known information.',
      },
      {
        value: 2,
        label: 'Not Comprehensive',
        description:
          '**Mostly repackages** the known information as future risk; **little** rests on this recording.',
      },
      {
        value: 1,
        label: 'Not Comprehensive At All',
        description:
          '**Every** fact in it appears in the Sleep panel or Prior medical history. Delete the recording and the letter still writes itself.',
      },
    ],
  },
  {
    // Sweet point between SensorFM ED.1 (anchors 1-3 near-verbatim) and findings-linked
    // specificity (anchors 4-5). "Suggestions" — the section carries things to WATCH, to RAISE
    // and to DO; only the last is a recommendation. Checked against the v56 letters: the
    // actionable style is format-driven and identical across arms, so style is not scored;
    // whether each suggestion comes from THIS letter's findings is.
    key: 'personalization',
    label: 'Personalization',
    question:
      'To what extent does this response personalize its synthesis of different health aspects (e.g., lifestyle, cardiovascular) to this patient?',
    howToScore:
      'Judge the **whole response** — the analysis and the suggestions. Ask whether it could be **moved ' +
      'into another patient\'s letter unchanged**.',
    example:
      'Both responses are for the same patient. Response X ties the recording to their own history ' +
      'in the analysis — "your history records prior conditions in the mental area without ' +
      'identifying this specific new condition" — and carries that into what to do: "notice ' +
      'persistent changes in worry, tension, mood, or sleep and bring them up at your next routine ' +
      'appointment." Analysis and suggestions are both built from this patient: Personalized (4); ' +
      'synthesizing a further aspect, such as tying a specific sleep finding in as well, would ' +
      'reach 5. Response Y reports numbers and closes "continue the routine preventive habits and ' +
      'follow-up already recommended for you" — surface-level stats plus advice that fits anyone: ' +
      'Not Personalized (2).',
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          "**Deeply synthesizes multiple** distinct aspects of this patient's profile (e.g. a specific sleep finding, a named condition in their history, their demographics), and carries that synthesis into what it tells them to watch, raise, or do. Reads as written for this person alone.",
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          "**Goes beyond** surface-level reporting by connecting **specific** aspects of this patient's profile (e.g. linking one of their own findings to a condition in their history, or to a specific thing to raise). Some general advice sits alongside.",
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          '**Split evenly** between generic and somewhat personalized health context.',
      },
      {
        value: 2,
        label: 'Not Personalized',
        description:
          'Mentions **surface-level** stats (e.g. basic demographics or isolated sleep numbers) that remain **broad** and could apply to a wide population with similar baseline values.',
      },
      {
        value: 1,
        label: 'Not Personalized At All',
        description:
          '**One-size-fits-all**, boilerplate content. It **ignores** the provided data and reads like a generic health article.',
      },
    ],
  },
  {
    // USEFULNESS — VERBATIM SensorFM (Survey ED.1), adopted 2026-09-03 (Chan), replacing Relevance.
    //
    // The question, the five anchor labels and their descriptions below are SensorFM's own words,
    // unedited. That is the point: an axis we did not author cannot be accused of being shaped to
    // our result, and it makes our radar directly comparable to theirs.
    //
    // Chosen over Trustworthiness, which was the other candidate for this slot. Trustworthiness is
    // v6's `justifiability` renamed, and in the v6 clinician round that axis ran BASE 4.00 > OURS
    // 2.90 > TRUTH 2.30 — the exact REVERSE of how much model prediction each arm carries, because
    // raters weighed confidence against panels holding no model evidence and scored any ground they
    // could not see as unsupported.
    //
    // ⚠️ NOTE THE EARLIER, DIFFERENT USEFULNESS. v7 carried an axis of the same name that was
    //    retired in v8; it scored how hard a call was to FORESEE, independently of whether it was
    //    right, so a confident wrong letter could score 5, and its novelty half overlapped
    //    Comprehensiveness. This is NOT that axis. SensorFM's Usefulness asks whether the response
    //    is a useful summary TO A PROVIDER — clinical coherence and decision-readiness — which no
    //    other axis in this set measures.
    key: 'usefulness',
    label: 'Usefulness',
    question:
      'To what extent does this response provide a useful summary to a healthcare provider regarding a patient?',
    howToScore:
      'Judge the response as a summary handed to a provider: is it **clinically coherent, organized, ' +
      'and something they could act on** for next steps?',
    example:
      'A response that names the area to watch, ties it to specific findings, and closes with what ' +
      'to raise at the next appointment gives a provider something to act on: Useful (4). A response ' +
      'that reports findings and closes "but these findings do not by themselves point to a specific ' +
      'additional future condition" leaves the provider without a next step: Useless (2).',
    anchors: [
      {
        value: 5,
        label: 'Very Useful',
        description:
          'Provides **highly actionable**, well-organized information that a provider can **directly** utilize for clinical decision-making and next steps.',
      },
      {
        value: 4,
        label: 'Useful',
        description:
          "Provides **clinically coherent and relevant** information that clearly communicates the patient's status to the provider.",
      },
      {
        value: 3,
        label: 'Neutral',
        description: 'Information is **split evenly** between being useful and irrelevant.',
      },
      {
        value: 2,
        label: 'Useless',
        description:
          'Provides **tangential or unactionable** information that offers **no** clinical value to the provider.',
      },
      {
        value: 1,
        label: 'Very Useless',
        description:
          'Provides **highly irrelevant or distracting** information that would waste clinical time or frustrate the provider.',
      },
    ],
  },
  {
    // RELEVANCE (key `relevance`) — REPLACES TRUSTWORTHINESS, v13 (2026-09-29, Chan). Last slot, as before.
    //
    // WHAT IT ASKS: whether the response puts the information that matters for THIS patient's
    //    future risk first, and keeps what does not bear on it out. SensorFM Survey ED.1 [Relevance]
    //    is the source: "How effectively does MODEL RESPONSE identify and prioritize the most
    //    clinically relevant indicators?" (docs/sensorfm_rubric_verbatim.md in the generation repo).
    //    Rewritten to the house stem ("To what extent ...", with an e.g. list like Comprehensiveness
    //    and Personalization) and to the house label ladder (Very X · X · Neutral · Not X · Not X At
    //    All). The anchors keep ED.1's own moves nearly word for word, so the scale stays recognisable:
    //      1 "Fails to address the core query, focusing entirely on unrelated data"
    //      2 "heavily diluted ... significant space to irrelevant data that distracts from the main
    //        clinical picture" (ED.1's "Mentions the correct issue" becomes "Addresses the question":
    //        correctness belongs to Accuracy)
    //      3 "Split evenly between relevant and irrelevant information"
    //      4 "Adequately covers the appropriate ... but includes some unnecessary filler ... or minor
    //        tangents that slightly obscure the core message"
    //      5 "Directly and concisely addresses the user's query ... most pertinent ... no distracting
    //        or unnecessary information"
    //    "Indicators" becomes "information (e.g., sleep findings, medical history, supporting studies)":
    //    the letters argue from studies as well as data, and whether a cited study fits this patient is
    //    part of what relevance means here (anchor 4 names it as a minor tangent).
    //
    // ⛔ THIS PROJECT HAS RETIRED A RELEVANCE AXIS BEFORE (v6, 2026-08-29): clinicians scored it
    //    BACKWARDS — reading the history is good practice to them, so history-heavy responses were
    //    rated as focused. The guard is the howToScore's reference point: relevance is judged against
    //    THE RISK THE RESPONSE RAISES, and history or findings restated without supporting, explaining or
    //    qualifying that risk count as filler, "however accurate". History that does one of those is
    //    relevant, so letters that use it well are not penalised.
    //
    // SEPARABLE FROM ITS NEIGHBOURS, by construction:
    //    - Accuracy grades whether what the response says is TRUE (a letter can be focused and wrong);
    //    - Comprehensiveness grades what it ADDS beyond the Ground-truth panels (restating a panel
    //      value can be relevant yet add nothing);
    //    - Usefulness grades whether a PROVIDER could act on it (ED.1 [Context]).
    //    Relevance grades FOCUS AND PRIORITY: what leads, and what dilutes.
    //
    // ⚠️ WHAT THE RETIRED AXIS CARRIED THAT NOW HAS NO HOME: Trustworthiness absorbed Safety at its
    //    anchor 1 ("advises a course that would be contraindicated given this patient's existing care
    //    or prior medical conditions"). Relevance cannot carry that without becoming two axes. Accuracy
    //    still faults a recommendation that "does not follow from its findings", but a contraindicated
    //    course is no longer named anywhere. Recorded so the loss is visible, not assumed.
    //
    // TRUSTWORTHINESS HISTORY (v10-v12), kept for readers of v10-v12 exports: it graded whether
    //    conclusions were substantiated by the reasoning the response presents, inverted once as v6's
    //    `justifiability` (BASE 4.00 > OURS 2.90 > TRUTH 2.30), and carried a stopping rule. Its full
    //    wording and rationale are in git history of this file and in docs/rubric/README.md (v10-v12).
    key: 'relevance',
    label: 'Relevance',
    question:
      "To what extent does this response identify and prioritize the most clinically relevant " +
      "information (e.g., sleep findings, medical history, supporting studies) for this patient's " +
      'future disease risk?',
    howToScore:
      'Ask of **each part** whether it bears on the **future risk the response raises** for this ' +
      'patient: findings, history or studies that **support, explain or qualify** that risk are relevant; ' +
      'those **restated without doing so** are filler, however accurate.',
    example:
      'Both responses are for the same patient and raise the same future risk. Response X opens on the ' +
      'two findings that carry it — fragmented sleep [SE 68.0%] and frequent breathing disturbance ' +
      '[RDI 42.6 events/hour] — ties them to that risk through a study of older men like this patient, ' +
      'and brings in the prior **Essential hypertension** only where it bears on that risk: Very ' +
      'Relevant (5). Response Y reaches the same conclusion, but restates each prior ' +
      'condition in the history, reviews sleep stages it never connects to that risk, and cites a ' +
      'study of a population unlike this patient; the core message is there, but diluted: Not ' +
      'Relevant (2), or Neutral (3) where about half of it bears on the risk.',
    anchors: [
      {
        value: 5,
        label: 'Very Relevant',
        description:
          "**Directly and concisely** addresses the patient's question. It leads with the findings and evidence **most pertinent** to the risk it raises, and each part bears on that risk, with **no** distracting or unnecessary information.",
      },
      {
        value: 4,
        label: 'Relevant',
        description:
          '**Adequately** covers the appropriate findings and evidence for the risk it raises, but includes **some** unnecessary detail or **minor** tangents (e.g. a prior condition restated without bearing on that risk, or a study of a population unlike this patient) that slightly obscure the core message.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          "**Split evenly** between information that bears on the patient's question and information that does not.",
      },
      {
        value: 2,
        label: 'Not Relevant',
        description:
          'Addresses the question, but the response is **heavily diluted**: it dedicates **significant** space to findings, history or studies that do not bear on the risk it raises, which distracts from the main clinical picture.',
      },
      {
        value: 1,
        label: 'Not Relevant At All',
        description:
          "**Fails to address** the patient's question, focusing **entirely** on information unrelated to their future disease risk.",
      },
    ],
  },

]

// DISEASE rubric v8 — the five Likert scales asked about the letter's FUTURE-DISEASE CALL.
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
// "the model", a specific arm), no naming of a condition or group, no "ground truth" / "oracle"
// anywhere in rater-facing text. The panel is called "Future risk" (renamed 2026-08-28, owner;
// previously "Future disease(s) patient developed in 6 years" — keep the howToScore strings
// below in step with it; the recorded-outcome meaning now lives in the panel's meta line).
import type { RubricDimensionDef } from './rubric-config'

// Stamped into every export row (rubric_version column) so a CSV identifies which wording —
// and which key vocabulary — produced it. Bump alongside SCHEMA_VERSION when axes change.
export const RUBRIC_VERSION = 'v8-20260902'

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // FIRST on purpose: it frames every later judgement as "what is NEW for this patient".
    // FAILURE PATTERN it grades: the letter repackages known conditions as future risks, or
    // tells the patient what anyone of their age and history would be told anyway.
    key: 'usefulness',
    label: 'Usefulness',
    question:
      'If this patient had read only their own chart, how much would this response add to what they could already have worked out?',
    howToScore:
      'This axis is about FORESEEABILITY, not correctness — whether the response was right is ' +
      'Factuality. Cover the Future risk panel. Read the Sleep panel and Prior medical history, ' +
      'and ask what a careful reader would already expect. Then read the response and score how ' +
      'far it goes beyond that expectation. A response can be wrong and still score 4 here if it ' +
      'raised something the chart gave no reason to raise. Score the reach of the call, not its ' +
      'outcome.',
    // Examples live in the rubric doc (owner 2026-09-01), not in the UI.
    anchors: [
      {
        value: 5,
        label: 'Very Useful',
        description:
          'Raises a risk in a body system the chart gives no reason to look at (e.g. calls a respiratory risk for a patient whose history is entirely cardiac and metabolic), and says what in this recording sent it there. The patient could not have reached this alone.',
      },
      {
        value: 4,
        label: 'Useful',
        description:
          'Sharpens a broad chart signal into something specific the patient could act on (e.g. from "poor sleep" to a named condition to watch for), or adds a concrete estimate the chart does not carry.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Names the risk a careful reader of the chart would already reach, but adds a reason or a detail they would not have had.',
      },
      {
        value: 2,
        label: 'Of Little Use',
        description:
          'Restates the obvious chart reading (e.g. "your apnea puts your heart at risk" for a patient with recorded apnea and cardiac history) with nothing added.',
      },
      {
        value: 1,
        label: 'Useless',
        description:
          'Tells the patient only what any adult would be told regardless of this recording, or nothing they could act on at all.',
      },
    ],
  },
  {
    // Two-tier by design: the NEW risk area is the entry, the named conditions the ceiling —
    // committing to the right area alone caps at 3. "New" is said out loud so the rater's frame
    // matches the patient query and the task strip word for word.
    key: 'factuality',
    label: 'Factuality',
    question:
      'Does this response identify the new health risk this patient actually went on to develop, and name the right conditions within it?',
    howToScore:
      'Open the "Future risk" panel. It lists the **future diseases** this patient newly ' +
      'developed in the six years after the study. Check two things against it: the risk area the response ' +
      'commits to in bold, and the conditions it names. Closely related variants of one ' +
      'problem count as one condition. The follow-up has already happened.',
    // TODO example (v6): quote from the final clinician batch.
    anchors: [
      {
        value: 5,
        label: 'Highly Accurate',
        description:
          'The right risk area, and the recorded conditions named. Anything else it raises is a recognised variant or complication of them, not a separate claim.',
      },
      {
        value: 4,
        label: 'Accurate',
        description:
          'The right risk area, and at least one recorded condition named, alongside one or two the patient did not develop.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'The right risk area, but the conditions inside it are wrong or missing, or diluted by as many the patient did not develop.',
      },
      {
        value: 2,
        label: 'Inaccurate',
        description:
          'The risk area is wrong, though something it names touches what the patient developed.',
      },
      {
        value: 1,
        label: 'Highly Inaccurate',
        description: 'Wrong risk area, and none of what the patient developed appears.',
      },
    ],
  },
  {
    // v7 (owner 2026-09-01): the coverage framing is retired — it rewarded
    // chart-tour letters and put the truth arm LOWEST, the reverse of the eval's purpose.
    // The name stays Comprehensiveness (owner 2026-09-01) but the axis now measures the
    // increment directly; "known information" is the exact wording
    // the panel's Known info tags carry, so the question and the screen point at each other.
    key: 'comprehensiveness',
    label: 'Comprehensiveness',
    question:
      'How much information does this response give the patient beyond the known information (e.g., the Sleep panel, Prior medical history)?',
    howToScore:
      'Set the response against the two panels tagged Known info — the Sleep panel and ' +
      'Prior medical history — and ask what it adds on top. Whether an addition is correct ' +
      "belongs to Factuality, not here.",
    // Examples live in the rubric doc (owner 2026-09-01), not in the UI.
    anchors: [
      {
        value: 5,
        label: 'Rich Addition',
        description:
          'Carries named content absent from both Known info panels — a condition the chart never mentions, an estimated value, a medication resemblance — and states what in this recording points there.',
      },
      {
        value: 4,
        label: 'Clear Addition',
        description:
          'Mostly information beyond the known information, with some space spent restating it.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Something new is in there, wrapped in about as much recital of the known information.',
      },
      {
        value: 2,
        label: 'Thin',
        description:
          'Mostly repackages the known information as future risk; little rests on this recording.',
      },
      {
        value: 1,
        label: 'Nothing New',
        description:
          'Every fact in it appears in the Sleep panel or Prior medical history. Delete the recording and the letter still writes itself.',
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
    question: "To what extent are this response's suggestions specific to this patient?",
    howToScore:
      'Score the SUGGESTIONS only — the "What this means for you" section — not the analysis ' +
      'above it. Ask one question of each suggestion: could it be lifted into another ' +
      "patient's letter unchanged? Suggestions that survive the swap are generic; those that " +
      'break because they name this ' +
      "patient's own findings are personalized. How valuable or novel the advice is belongs to " +
      'Usefulness; general wellness steps are not faulted here.',
    // TODO example (v6): quote from the final clinician batch.
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          "Suggestions join two or more distinct parts of this patient together (e.g. links a specific sleep finding to a named condition in their history, or to their medication or lab record) and turn that link into something to watch, raise, or do. Swapping in another patient's chart would make them read wrong.",
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          "At least one named finding of this patient's is tied to a specific suggestion (e.g. quotes their own N3% or AHI and says what to raise because of it). General advice sits alongside.",
      },
      {
        value: 3,
        label: 'Neutral',
        description: 'About half patient-specific, half generic.',
      },
      {
        value: 2,
        label: 'Generic',
        description:
          "Quotes the patient's numbers in the analysis, but the suggestions never refer back to them — the same advice would follow from any similar readout.",
      },
      {
        value: 1,
        label: 'Highly Generic',
        description:
          'One-size-fits-all advice. It ignores the data and reads like a health leaflet.',
      },
    ],
  },
  {
    // v7 (owner 2026-09-01): Justifiability retired — raters read "justified" as
    // justified-by-the-chart and scored any ground they could not see as ungrounded
    // ("can only use medical history"), no matter how the howToScore framed it. Relevance
    // asks a judgement clinicians make without a manual: is this letter about the future?
    key: 'relevance',
    label: 'Relevance',
    question:
      "How much of this response attaches to this patient's future health risks, not the conditions they already have?",
    howToScore:
      'Judge the analysis and the suggestions separately, then together. Existing conditions ' +
      'may appear as evidence for a future risk; count them against the score only where ' +
      'they are the point rather than the support.',
    // Examples live in the rubric doc (owner 2026-09-01), not in the UI.
    anchors: [
      {
        value: 5,
        label: 'Highly Relevant',
        description:
          'Both the analysis and the suggestions are about what could develop next. Existing conditions appear only as grounds for that.',
      },
      {
        value: 4,
        label: 'Relevant',
        description:
          'Mostly future-focused. Existing conditions appear only as evidence.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'One part looks forward, the other goes back over what the patient already has.',
      },
      {
        value: 2,
        label: 'Marginally Relevant',
        description:
          'The analysis or the suggestions mostly go over existing conditions. Future risk is an afterthought.',
      },
      {
        value: 1,
        label: 'Irrelevant',
        description:
          "Reads as a review of conditions the patient already has. Nothing in it looks forward.",
      },
    ],
  },
]

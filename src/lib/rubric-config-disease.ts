// DISEASE rubric v6 — the five Likert scales asked about the letter's FUTURE-DISEASE CALL.
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
export const RUBRIC_VERSION = 'v7-20260901'

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // FIRST on purpose: it frames every later judgement as "what is NEW for this patient".
    // FAILURE PATTERN it grades: the letter repackages known conditions as future risks, or
    // tells the patient what anyone of their age and history would be told anyway.
    key: 'usefulness',
    label: 'Usefulness',
    question:
      'How much does this response really tell this patient about what they went on to develop, especially where it was hard to foresee?',
    howToScore:
      'Open the Future risk panel and set the warning against what was recorded. Then ask ' +
      'whether the known information (Prior medical history, the Sleep panel) already points ' +
      'the same way: a correct call that was hard to identify from it is worth the most; one ' +
      'it already points to sits in the middle; a wrong direction scores low.',
    // Examples live in the rubric doc (owner 2026-09-01), not in the UI.
    anchors: [
      {
        value: 5,
        label: 'Very Useful',
        description:
          'Points to what the patient went on to develop, where it was hard to identify from the known information alone. The warning does real work.',
      },
      {
        value: 4,
        label: 'Useful',
        description:
          'Points to what they went on to develop. The known information partly hints at it.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Points to what they went on to develop, but it is easy to identify from the known information. Right, yet adds little.',
      },
      {
        value: 2,
        label: 'Of Little Use',
        description:
          'Points elsewhere, or flags only what is easy to identify from the known information.',
      },
      {
        value: 1,
        label: 'Useless',
        description:
          'Points away from what happened and would have misdirected attention.',
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
          'The right risk area, and the recorded conditions named — nothing added that the patient did not develop.',
      },
      {
        value: 4,
        label: 'Accurate',
        description:
          'The right risk area and most recorded conditions, with one or two named that the patient did not develop.',
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
          'The patient learns specific new concerns they could not take from the known information, and the response says what in this recording points there.',
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
          'Nothing here needed the recording: the whole message could be written from the known information alone.',
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
      'Read the "What this means for you" section. Check where its suggestions come from: ' +
      "this patient's own findings, or advice anyone with similar numbers could receive. " +
      'General wellness steps are not faulted. Score how much of the guidance is this ' +
      "patient's rather than anyone's.",
    // TODO example (v6): quote from the final clinician batch.
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          "Every suggestion is built from this patient's own findings. Each result is tied to something to watch, raise, or do. It reads as written for this person alone.",
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          'Specific findings are tied to specific suggestions. Some general advice sits alongside.',
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
          'Mentions a few of the patient\'s numbers, but the advice would fit anyone with similar values.',
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
        label: 'Fully On-Target',
        description:
          'Both the analysis and the suggestions work on future risks.',
      },
      {
        value: 4,
        label: 'On-Target',
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
        label: 'Off-Target',
        description:
          'The analysis or the suggestions mostly go over existing conditions. Future risk is an afterthought.',
      },
      {
        value: 1,
        label: 'Fully Off-Target',
        description:
          "Neither the analysis nor the suggestions engage the patient's future risk.",
      },
    ],
  },
]

// DISEASE rubric v5 — the five Likert scales asked about the letter's FUTURE-DISEASE CALL.
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
// WHAT IS FIXED and must not drift:
//   - the five KEYS (context / justifiability / personalization / relevance / harm) and the 1-5
//     anchor values are unchanged, so LikertKey, the completion gate, the reducer and the CSV
//     export keep working untouched. THE KEYS ARE NOT THE NAMES. Renaming them would break every
//     stored session and every exported CSV, so the mapping is documented instead:
//         context         -> Factuality
//         harm            -> Comprehensiveness   (v4: Safety; v33: Safe)
//         relevance       -> Trustworthiness
//         justifiability  -> Relevance
//         personalization -> Personalization
//     NOTE the `justifiability` key now carries RELEVANCE: v4 drops the Justifiability criterion
//     and restores Relevance, which needs a key, and this is the free one.
//   - higher is better on all five, including Safety.
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
// anywhere in rater-facing text. The panel is called "Future disease(s) patient developed in 6
// years" (renamed 2026-08-25; keep the howToScore strings below in step with it).
import type { RubricDimensionDef } from './rubric-config'

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // FAILURE PATTERN: the letter names conditions this patient never went on to develop, or
    // misses the ones they did. Observed hard in the base arm — in the v33 batch it answered for
    // the circulatory system on a patient whose recorded outcomes were entirely neurological.
    key: 'context',
    label: 'Factuality',
    question:
      'Does this response accurately highlight the conditions this patient later developed?',
    // SOFTENED 2026-08-25 (Zitao): the previous wording — "compare it with … Count several
    // recorded variants of one underlying condition as one condition" — turned this axis into an
    // arithmetic exercise. Two problems with that. It asked for a tally the rater then had to
    // convert into a 1-5 judgement with no stated conversion, and it CONTRADICTED its own
    // anchors, which are deliberately soft ("all / most / about half / few / none"). A rater
    // counting 2-of-4-plus-one-extra has no rule telling them whether that is 3 or 4, so the
    // instruction created false precision and then abandoned them at the point of decision.
    // The clinical-judgement framing now matches the other four axes, all of which say "Judge".
    // What is KEPT: which panel to open (the axis is meaningless without it), and the guidance
    // that closely-related recorded variants are one condition — reworded as how to READ the
    // panel rather than how to count it.
    howToScore:
      // Panel named exactly as the UI labels it (CaseContextPanel.tsx) — reworded 2026-08-25
      // when that header changed. An instruction pointing at a panel name that is not on screen
      // is worse than no instruction.
      'Open the "Future disease(s) patient developed in 6 years" panel and read it against the ' +
      'conditions the response highlights **in bold**. Where the panel records several closely ' +
      'related variants of ' +
      'one underlying problem, treat them as a single condition. Judge how well the response ' +
      'captures what this patient went on to develop, and how much it raises that they did not.',
    // EXAMPLES REWRITTEN 2026-08-25 (Zitao): the previous text described a hypothetical panel
    // in the abstract ("three of which are variants of one valvular finding") and gave the rater
    // nothing to pattern-match against. These are drawn from real letters in the v33.11 batch,
    // quoted, so the rater sees the shape of the thing they are scoring — the style Zitao
    // singled out as working on Trustworthiness.
    // NAMING (2026-08-25, Zitao): worked examples address responses the way the interface does
    // ("Response X"), rather than "a response" / "the first" / "the second".
    // X and Y deliberately, NOT A/B/C: the displayed letters are assigned per case after the
    // shuffle (see lib/types.ts), so "Response A" in a fixed example would read as a claim about
    // the Response A actually on screen. X and Y are unmistakably stand-ins.
    // Softened alongside howToScore (Zitao, 2026-08-25). The example previously resolved its
    // scores arithmetically ("one of two caught with two extras, so Neutral (3)"), which
    // reintroduced the counting rule the instruction had just dropped. It now shows the same two
    // responses and reasons to the same scores in the anchors' own language.
    example:
      'Response X opens "you should take the **circulatory** risk most seriously" and highlights ' +
      '**Coronary atherosclerosis**, **Ischemic Heart Disease** and **Congestive heart failure**, ' +
      'while the outcome panel for this patient records only **Insomnia** and **Sleep disorders**. ' +
      'It misses what actually happened entirely and points somewhere else — Highly Inaccurate (1). ' +
      'Response Y highlights **Insomnia** but surrounds it with conditions the patient never ' +
      'developed: the real finding is in there, diluted by as much that is not — Neutral (3).',
    anchors: [
      {
        value: 5,
        label: 'Highly Accurate',
        description:
          'Highlights all of the conditions this patient later developed, and adds none the patient did not.',
      },
      {
        value: 4,
        label: 'Accurate',
        description:
          'Highlights most conditions the patient later developed, and adds one or two the patient did not.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Highlights about half the conditions the patient later developed, or adds about as many the patient did not.',
      },
      {
        value: 2,
        label: 'Inaccurate',
        description:
          'Highlights few of the conditions the patient later developed, or adds many the patient did not.',
      },
      {
        value: 1,
        label: 'Highly Inaccurate',
        description: 'Highlights none of the conditions this patient later developed.',
      },
    ],
  },
  {
    // FAILURE PATTERN: the letter's analysis works a single corner of the chart — reads the
    // breathing indices and stops — or recites everything on file with none of it entering the
    // argument. The letters worth reading argued from several aspects of the patient at once.
    key: 'harm',
    label: 'Comprehensiveness',
    question:
      "To what extent does this response's analysis cover the pertinent aspects of this patient's health?",
    howToScore:
      // Section named exactly as the letters render it ("## Detailed analysis") — same rule as
      // the panel names: an instruction pointing at a heading that is not on screen is worse
      // than no instruction.
      'Read the "Detailed analysis" section against the Sleep panel, Prior medical history and ' +
      "demographics. Weigh two things: how broadly the analysis ranges across the pertinent " +
      "aspects of this patient's health (e.g. sleep, cardiovascular, metabolic, mental health, " +
      'lifestyle), and whether what it raises does work in the argument — interpreted and ' +
      'connected to the conclusion, not listed for volume. Score the analysis section only.',
    // TODO example (v5): must quote real letters from the batch that ships to clinicians
    // (2026-08-25 rule). The loaded v33.11 letters carry nothing that separates this axis;
    // write it when the final batch lands.
    anchors: [
      {
        value: 5,
        label: 'Highly Comprehensive',
        description:
          "Ranges across the breadth of this patient's pertinent health aspects, and everything it raises does work in the argument.",
      },
      {
        value: 4,
        label: 'Comprehensive',
        description:
          'Covers much of what matters for this patient, and most of what it raises does work in the argument.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Covers a limited part of what matters for this patient, or ranges wider but leaves much of it listed rather than argued.',
      },
      {
        value: 2,
        label: 'Narrow',
        description:
          "Confines the analysis to a narrow slice of this patient's health.",
      },
      {
        value: 1,
        label: 'Highly Narrow',
        description:
          'Barely goes beyond restating values, with almost no argument built on them.',
      },
    ],
  },
  {
    // FAILURE PATTERN: the letter states a conclusion far more firmly than its evidence carries —
    // or hedges so heavily that nothing is claimed. In the v33 batch the base arm asserted a firm
    // circulatory conclusion while its own text conceded the respiratory indices were normal.
    key: 'relevance',
    label: 'Trustworthiness',
    question: "To what extent is this response's confidence warranted by the patient's data?",
    howToScore:
      'Weigh how firmly the response states things against how much support it has in the Sleep ' +
      'panel and Prior medical history. Judge the fit between the two: a firm claim on strong ' +
      'evidence and a hedged claim on weak evidence both score well; overstating a thin case or ' +
      'hedging a clear one both score poorly. Score the fit, not whether you agree with the ' +
      'conclusions.',
    example:
      'Response X opens "the thing to take most seriously is **circulatory** risk" and the Sleep ' +
      'panel shows **severe obstructive sleep apnea**, so the firm claim is earned — Very ' +
      'Trustworthy (5). Response Y opens just as firmly but attributes it to **hypertension** ' +
      'and **kidney disease** that are nowhere in the Prior medical history panel, so full ' +
      'confidence rests on nothing — Very Untrustworthy (1).',
    anchors: [
      {
        value: 5,
        label: 'Very Trustworthy',
        description:
          "States its case as firmly as the evidence allows and no further. Where this patient's data is clear it is direct; where the data is weak it says so, and a reader could rely on it without checking behind it.",
      },
      {
        value: 4,
        label: 'Trustworthy',
        description:
          'Confidence broadly fits the evidence, with one claim pitched harder or more cautiously than its support warrants.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Confidence and evidence fit in places and not in others; a reader would need to check parts of it before relying on any of it.',
      },
      {
        value: 2,
        label: 'Untrustworthy',
        description:
          'States much of its case more firmly than the evidence supports, or hedges so heavily that a reader cannot tell what it is claiming.',
      },
      {
        value: 1,
        label: 'Very Untrustworthy',
        description:
          'Presents an unsupported case with full confidence, or commits to nothing at all. A reader relying on it would be misled about how much is known.',
      },
    ],
  },
  {
    // VERBATIM SensorFM "Relevance" (Survey ED.1). Focus / dilution against what the patient
    // asked — NOT correctness, which is Factuality's axis. A letter can be wrong yet focused, or
    // right yet padded. Carried on the `justifiability` key: v4 drops Justifiability, and this is
    // the free key. FAILURE PATTERN: the base arm names 8 conditions where 3 belong, several as
    // speculative asides, diluting the letter.
    key: 'justifiability',
    label: 'Relevance',
    question:
      'How effectively does this response identify and prioritize the most clinically relevant indicators?',
    // CROSS-REFERENCES REMOVED 2026-08-25 (Zitao): each criterion must stand alone and describe
    // only itself. The previous wording ended "being wrong is scored under Factuality", which
    // makes the rater hold two axes in mind at once. The distinction it was protecting — focus
    // vs correctness — is kept, stated positively as what THIS axis measures.
    howToScore:
      'Read the response against what the patient asked, shown in the Patient Query. Judge focus ' +
      'and proportion: how much of the letter earns its place, and how much is filler or tangent. ' +
      'Score dilution only — a tightly argued response scores well here even if you disagree with ' +
      'its conclusions, and a padded one scores poorly even if everything in it is defensible.',
    // EXAMPLE REWRITTEN 2026-08-25 (Zitao): the previous version showed only the FAILURE half
    // and described the good half abstractly ("built on the findings that matter"), which told
    // the rater nothing about what a pertinent indicator looks like. Both halves are now quoted
    // from real letters on the SAME patient, so the rater sees which specific indicators earn
    // their place and which sentences bury them.
    example:
      'Responses X and Y answer for the same patient — a short, badly fragmented night with ' +
      'normal breathing. Response X names the indicators that carry the answer and stops: ' +
      '"**very short total sleep time**, **low sleep efficiency** and **frequent arousals** … ' +
      'most strongly points toward future problems grouped as **sleep disorders**" — every ' +
      'clause is doing work, so Very Relevant (5). Response Y opens on the same night but spends ' +
      'the letter elsewhere: "[TST 176.5 minutes; SE 46.6 percent; ArI 31.3 events/hour] ' +
      'combined with **type 2 diabetes**, **hypertension**, **hyperlipidemia**, **obesity** and ' +
      '**ongoing tobacco use**", then lists five further conditions it might lead to. The ' +
      'pertinent indicators are in there, buried under a recital of the whole chart — ' +
      'Irrelevant (2).',
    anchors: [
      {
        value: 5,
        label: 'Very Relevant',
        description:
          "Directly and concisely addresses the patient's query. It focuses on the most pertinent clinical indicators and data, providing a high-yield response with no distracting or unnecessary information.",
      },
      {
        value: 4,
        label: 'Relevant',
        description:
          'Adequately covers the appropriate clinical indicators, but includes some unnecessary filler data or minor tangents that slightly obscure the core message.',
      },
      {
        value: 3,
        label: 'Neutral',
        description: 'Split evenly between relevant and irrelevant information.',
      },
      {
        value: 2,
        label: 'Irrelevant',
        description:
          'Mentions the correct issue but the response is heavily diluted. It dedicates significant space to irrelevant data that distracts from the main clinical picture.',
      },
      {
        value: 1,
        label: 'Very Irrelevant',
        description: 'Fails to address the core query, focusing entirely on unrelated data.',
      },
    ],
  },
  {
    // ADAPTED from SensorFM "Personalization" (Survey ED.1); v5 re-scopes it from the synthesis
    // to the RECOMMENDATIONS — whether the advice rests on this patient's own circumstances, and
    // says why THIS patient should take these steps. Anchors 4 and 1 were already about advice
    // and keep their ED.1 text verbatim; the "or Mistaken" suffix stays dropped (correctness is
    // Factuality's axis).
    // ⚠️ WATCH THIS AXIS. Under the v4 synthesis wording it did not discriminate in the
    //    2026-08-24 judge run (A 4.44 / B 4.50 / C 4.44, B-A = +0.06) — the format mandates
    //    quoting patient values, so every arm cleared the floor. The v5 advice re-scope is its
    //    second chance; if the clinician round still shows nothing, retire it on evidence.
    key: 'personalization',
    label: 'Personalization',
    question:
      'To what extent does this response personalize its recommendations to this specific patient?',
    howToScore:
      // Cross-reference to another criterion removed 2026-08-25 (Zitao): each criterion stands
      // alone. The correctness/tailoring distinction is kept, phrased as what THIS axis measures.
      'Check how much of this particular patient is in the recommendations: whether the advice ' +
      'rests on their own pattern, history and circumstances — drawn from the Sleep panel, Prior ' +
      'medical history and demographics together — or could have been sent to anyone with ' +
      'similar numbers. Judge how tailored the advice reads, and whether it says why this ' +
      'patient should take these steps — a letter whose advice is built closely around this ' +
      'patient scores well here whether or not you agree with where it lands.',
    // TODO example (v5): the v4 example contrasted two ANALYSIS sentences — right for the
    // synthesis wording, the wrong section for the advice re-scope. Rewrite it from real
    // recommendation passages when the batch that ships to clinicians is finalised
    // (2026-08-25 rule: examples quote the loaded batch).
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          "Deeply grounds its advice in multiple distinct aspects of the patient's profile (e.g. cardiovascular, mental health, metabolics). It delivers highly customized recommendations that feel uniquely written for this specific individual.",
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          "Goes beyond surface-level reporting by connecting specific aspects of the individual's profile (e.g., linking a unique biomarker to a distinct lifestyle habit). The response provides actively tailored, patient-specific advice.",
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'The advice is split evenly between generic and somewhat personalized recommendations.',
      },
      {
        value: 2,
        label: 'Generic',
        description:
          'Its recommendations rest on surface-level stats (e.g., basic demographics, standard daily averages, or isolated stats) and remain broad — they could easily apply to a wide population with similar baseline numbers.',
      },
      {
        value: 1,
        label: 'Highly Generic',
        description:
          'Provides one-size-fits-all, boilerplate advice. It completely ignores the provided data and reads like a generic health article.',
      },
    ],
  },
]

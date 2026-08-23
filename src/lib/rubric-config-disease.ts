// DISEASE rubric — the five Likert scales asked about the letter's FUTURE-DISEASE CALL.
//
// STATUS: owner-authored (2026-08-22 / 2026-08-23), still under review. The five dimensions and
// the core idea of every anchor come from the owner's design note; what is drafted here is the
// wording, the anchors the note left blank, the per-axis `scope`, and the tie-breaking cues.
//
// DESIGN PRINCIPLE (owner): every axis exists because of a failure pattern actually observed in
// the base and ours arms — not because it rounds out a radar chart. The failure each one targets
// is recorded above its definition, so an axis that stops catching anything can be retired on
// evidence instead of taste.
//
// WHAT IS FIXED and must not drift:
//   - the five KEYS (context / justifiability / personalization / relevance / harm) and the 1-5
//     anchor values are unchanged from rubric-config.ts, so LikertKey, the completion gate, the
//     reducer and the CSV export keep working untouched. The KEYS ARE NOT THE NAMES: `context`
//     now carries Factuality, `relevance` carries Trustworthy. Renaming the keys would break
//     every stored session and every exported CSV, so the mapping is documented instead:
//         context         -> Factuality
//         harm            -> Safe
//         personalization -> Personalization
//         relevance       -> Trustworthy
//         justifiability  -> Justifiability
//   - higher is better on all five, including Safe.
//
// THE LABEL IS THE RATER-FACING TEXT. LikertRubric renders `label` on each clickable row and puts
// `description` behind the "What 1-5 mean here" toggletip (owner, 2026-08-18). `label` states the
// option; `description` gives the cue that separates it from the option above and below; `scope`
// says where the axis stops.
//
// ANCHOR REGISTER (owner 2026-08-23), split across the two fields:
//   `label` — a SHORT GRADE WORD, as the v26 scales had ("Very Useful / Useful / Neutral / ..."),
//     built off the axis name so the good end is never in doubt: Very Accurate, Very Safe, Very
//     Trustworthy. Rows stay short on purpose. A row carrying a full sentence invites a rater to
//     pattern-match the letter against the option text instead of judging it, and the detail has
//     somewhere better to live.
//   `description` — the definition, written in the register of the source paper's own clinician
//     survey (the instrument these five criteria come from; verbatim copy in the generation repo
//     at docs/human-eval/"Clinician Rubrics — Supplementary Data (VERBATIM).md"). That register:
//       1. a plain declarative SENTENCE describing a state of affairs, not a quality judgement —
//          the source writes "There are a few references to nonrelevant user data", never
//          "somewhat useful";
//       2. one countable thing per axis, laddered none -> a few -> some -> many -> all, the five
//          options sharing a frame and changing the quantifier, so neighbours differ by amount
//          rather than by vocabulary;
//       3. a SEVERITY ladder where counting is the wrong unit — the source does this for harm
//          ("no information that could lead to harm" ... "would likely cause the User serious
//          harm"), and Safe follows it.
//     Each description then adds the cue that separates it from the option above and below.
//     Nothing else is shown to the rater: the criterion, the five options, and their definitions.
// ⛔ The source's DIRECTION is not adopted. Its defect items run 1 = none (good) -> 5 = all (bad).
//    Every axis here runs 5 = best, so the ladders are inverted relative to the source wording.
//    Copying an option across from that paper without flipping it would silently reverse an axis.
//
// WHAT "CORRECT" IS MEASURED AGAINST — settled 2026-08-23 by the Factuality rewording.
//    Nothing in this instrument is scored against the RECORDED OUTCOME. Factuality checks
//    statements against the patient data on screen; Justifiability asks whether the reasoning
//    holds, which is clinical judgement. That matters for more than tidiness: an axis scored
//    against the recorded outcome would let the ground-truth arm score perfectly every time and
//    be identified on sight, which would have forced that arm out of the human evaluation.
//    Hit / miss against the record is measured by script instead (precision, recall), where it
//    belongs — an answer-key lookup is not what a clinician's hour is for.
//
// ⛔ SCORES ARE NOT COMPARABLE with the health-management set in rubric-config.ts. Same keys,
//    different questions. Any batch scored under that wording is reported separately, never pooled.
//
// ⚠️ NOT MEASURED HERE, deliberately: whether an arm repeats the SAME diseases across patients.
//    That was in the owner's note under Personalization, and it is a real failure — across the
//    v28 batch every one of the 8 base letters named `circulatory`, whatever the patient. But it
//    is a CROSS-PATIENT property and a blinded rater holding one case cannot see it. It belongs in
//    a script over the batch, reported alongside the Likert means, not in a clinician's hands.
//
// BLINDING CONSTRAINTS carry over verbatim from rubric-config.ts and are unchanged: no reference
// to architecture (tools, ReAct, SleepFM, "the model", a specific arm), no naming of a condition
// or group, no "ground truth" / "oracle" anywhere.
import type { RubricDimensionDef } from './rubric-config'

export const RUBRIC_DIMENSIONS_DISEASE: RubricDimensionDef[] = [
  {
    // FAILURE PATTERN (owner): responses that state things about this patient that are not so —
    // a misquoted index, a severity band that does not match the number, a history item the
    // patient does not have, a general clinical claim that is simply wrong.
    // The owner's earlier draft of this stem also asked for a "useful summary"; dropped 2026-08-23
    // because a letter can summarise well and still be wrong on the facts, and one scale cannot
    // rank both.
    // SOFTENED 2026-08-23 (owner): the stem asked whether the response "identifies this patient's
    // future risk correctly", which is a hard call on an unverifiable claim — nobody can mark a
    // 6-year prediction true or false from the letter. It now asks whether the response's
    // STATEMENTS are factually correct, which a rater can actually check against the Patient
    // Panel in front of them.
    //   Two consequences worth keeping visible:
    //   (1) "was the risk the right one" leaves this axis. Whether the reasoning supports the risk
    //       is Justifiability; whether the named risks match the record is measured by script
    //       (precision / recall against the recorded outcome), which is the right tool for it —
    //       far better than asking a blinded clinician to do an answer-key lookup.
    //   (2) it dissolves the "correct against what" question that hung over the old wording. Facts
    //       are checked against the patient data on screen, not against the recorded outcome, so
    //       no arm can be identified by scoring perfectly on this axis.
    key: 'context',
    label: 'Factuality',
    question:
      "To what extent are this response's general statements and answers factually correct?",
    anchors: [
      {
        value: 5,
        label: 'Very Accurate',
        description:
          'Everything it states about this patient is correct. Values, units, severities, history and clinical claims all check out against the patient data on this page.',
      },
      {
        value: 4,
        label: 'Accurate',
        description:
          'There are a few incorrect statements. Substantially accurate, with one or two slips — a value quoted loosely, a severity band that does not match the number.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'There are some incorrect statements. Enough is wrong that a reader would have to check the letter against the data before trusting it.',
      },
      {
        value: 2,
        label: 'Inaccurate',
        description:
          'There are many incorrect statements. Most of what it asserts about this patient does not hold; the accurate parts are the exception.',
      },
      {
        value: 1,
        label: 'Very Inaccurate',
        description:
          'Almost nothing it states about this patient is correct. Misquoted values, history the patient does not have, clinical claims that are simply wrong.',
      },
    ],
  },
  {
    // FAILURE PATTERN (owner): a response manufactures a future risk — and an action to go with
    // it — for a patient whose data does not warrant one.
    // ⚠️ The owner's note framed this as "risk and action for the healthy group". Drafted instead
    //    as over-calling REGARDLESS OF GROUP: the sleep-issue group is not disease-free (its
    //    selection rule requires at least one sleep-condition onset in the window), so naming a
    //    risk for those patients can be exactly right, and a group-based rule would penalise a
    //    correct answer. Owner asked 2026-08-23 for "the degree of over-statement", which is what
    //    this measures.
    // NOTE the direction: the stem asks how much inaccurate risk is raised, while 5 is the good
    // end. The anchor LABELS carry the direction unambiguously so a rater follows the rows rather
    // than back-solving from the stem.
    key: 'harm',
    label: 'Safe',
    question:
      'To what extent does this response raise an inaccurate risk and prescribe action for it?',
    anchors: [
      {
        value: 5,
        label: 'Very Safe',
        description:
          'Every risk it raises is warranted by this patient\'s data. Nothing is asserted, or pitched, beyond what the data carries; any action follows a risk the patient really has.',
      },
      {
        value: 4,
        label: 'Safe',
        description:
          'One risk is pitched somewhat harder than the data supports. The risks are real for this patient; the wording overreaches on one of them.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'There are some overstated or unsupported risks. Part of what it raises is exaggerated, or one risk is not supported by this patient\'s data at all.',
      },
      {
        value: 2,
        label: 'Unsafe',
        description:
          'There are many overstated or unsupported risks. Enough is overstated or invented to prompt worry, or work-up, that this patient does not need.',
      },
      {
        value: 1,
        label: 'Very Unsafe',
        description:
          'It asserts serious future disease the patient has no reason to fear, and acts on it. A letter that would change this patient\'s care for the worse.',
      },
    ],
  },
  {
    // FAILURE PATTERN (owner): a differential that would read the same for any patient who had a
    // sleep study — the same conditions, the same sentences, whoever is in front of it.
    // Construct carried over from the health-management set (owner 2026-08-23: "use the current
    // one, trim it, adapt it to the disease setting"). Trimmed of its lifestyle/cardiovascular
    // examples and re-pointed from the plan onto the risk call.
    key: 'personalization',
    label: 'Personalization',
    question:
      "To what extent does this response correctly personalize its synthesis of this patient's health aspects?",
    anchors: [
      {
        value: 5,
        label: 'Highly Personalized',
        description:
          'It brings several parts of this patient\'s profile together into a reading that fits no one else. Measurements, history and demographics are synthesised, not just listed.',
      },
      {
        value: 4,
        label: 'Personalized',
        description:
          'It ties specific measurements to specific things about this patient. Goes past reporting numbers and connects one to something particular about them.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'It is part specific to this patient and part generic. Split about evenly between reasoning genuinely about this patient and reasoning that would fit anyone.',
      },
      {
        value: 2,
        label: 'Generic or Mistaken',
        description:
          'It cites only surface details that would fit many patients. Age, sex or a single index, and stops; the same letter would suit a wide population with similar numbers.',
      },
      {
        value: 1,
        label: 'Highly Generic or Mistaken',
        description:
          'It is generic advice that could have been written without this patient\'s record. One-size-fits-all text; the data on this page made no difference to it.',
      },
    ],
  },
  {
    // FAILURE PATTERN (owner): a bare verdict with nothing behind it — and its mirror, a
    // confident wrong verdict propped up with a lot of evidence.
    // The owner's five anchors are a 2x2 collapsed onto one scale, and the shape is the point:
    // EVIDENCE VOLUME AMPLIFIES CORRECTNESS. Shown correct and abundant is best (5), shown wrong
    // and abundant is worst (1) — the diagonal — and hedging so hard that neither can be assessed
    // sits in the middle (3).
    //         evidence sparse   evidence abundant
    //   right        4                 5
    //   hedged       3                 3
    //   wrong        2                 1
    // Anchor labels are the owner's own words, kept verbatim.
    key: 'relevance',
    label: 'Trustworthy',
    question: 'To what extent does this response show the evidence behind its answer?',
    anchors: [
      {
        value: 5,
        label: 'Very Trustworthy',
        description:
          'The evidence it shows is correct, and there is enough of it to carry the answer. A reader can see what the answer rests on, and what it rests on is right.',
      },
      {
        value: 4,
        label: 'Trustworthy',
        description:
          'The evidence it shows is correct, but there is too little of it. What it does cite holds up; it shows too little for a reader to see why the answer follows.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'It commits to little, so there is not much to be right or wrong about. Hedges rather than states. Little is asserted, so the answer cannot really be checked either way.',
      },
      {
        value: 2,
        label: 'Untrustworthy',
        description:
          'Some of the evidence it shows is wrong, though it shows little. What it cites is largely mistaken, but it cites little enough that the damage is limited.',
      },
      {
        value: 1,
        label: 'Very Untrustworthy',
        description:
          'It builds a substantial case out of evidence that is wrong. The most misleading letter of the five: the volume of support makes the error look considered.',
      },
    ],
  },
  {
    // FAILURE PATTERN (owner): "some arm produces diseases that are not correct, or not
    // interpreted correctly" — the risk does not follow from the evidence put beside it, or the
    // sleep study is read the wrong way round.
    // Where this stops and Trustworthy starts (the two overlapped in the design note and the split
    // is the owner's 2026-08-23 edit): Trustworthy = is evidence SHOWN, and how much.
    // Justifiability = does the evidence shown actually CARRY the answer.
    key: 'justifiability',
    label: 'Justifiability',
    question:
      'To what extent does this response support its answer with correctly interpreted evidence?',
    anchors: [
      {
        value: 5,
        label: 'Very Justifiable',
        description:
          'It reads this patient\'s data correctly, and the risk it names follows from that reading. Every step from the measurements and history to the named risk holds.',
      },
      {
        value: 4,
        label: 'Justifiable',
        description:
          'The reading is correct and the risk follows, with one small leap. Sound overall, with a single gap or a harmless slip along the way.',
      },
      {
        value: 3,
        label: 'Neutral',
        description:
          'Some of the reasoning from data to risk holds and about as much does not. The letter would need reworking before the risk it names could be relied on.',
      },
      {
        value: 2,
        label: 'Unjustifiable',
        description:
          'It rests the risk on incidental findings while stronger signals go unaddressed. The evidence it leans on is the weaker part of this patient\'s picture.',
      },
      {
        value: 1,
        label: 'Very Unjustifiable',
        description:
          'The evidence it cites cannot yield the risk it names. The reasoning does not connect, or a sleep measure is read the wrong way round.',
      },
    ],
  },
]

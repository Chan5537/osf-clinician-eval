# Clinical Evaluation Rubrics — V8

*Active 2026-09-02 · `rubric_version` v8-20260902 · SCHEMA_VERSION 18 · scores are NOT
comparable with V7 or earlier.*

You will read three responses per patient. For each response, score the five criteria below
on a 1–5 scale. The patient panel on the left is your reference: **Sleep panel** and **Prior
medical history** are tagged *Known info* (what was on record at the time of the study);
**Auxiliary information** shows EHR records where they exist; **Future risk** (tagged *New
onset risk*) is what the patient actually developed in the six years after the study.

> **The five criteria measure different things on purpose.** A response can be *wrong* yet
> score well on Usefulness (it reached somewhere the chart never pointed), and *right* yet
> score low (it only restated the chart). Score each axis on its own question — do not let
> one carry another.

---

## 1. Usefulness

**If this patient had read only their own chart, how much would this response add to what they could already have worked out?**

How to score: This axis is about FORESEEABILITY, not correctness — whether the response was right is Factuality. Cover the Future risk panel. Read the Sleep panel and Prior medical history, and ask what a careful reader would already expect. Then read the response and score how far it goes beyond that expectation. A response can be wrong and still score 4 here if it raised something the chart gave no reason to raise. Score the reach of the call, not its outcome.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Very Useful | Raises a risk in a body system the chart gives no reason to look at (e.g. calls a respiratory risk for a patient whose history is entirely cardiac and metabolic), and says what in this recording sent it there. The patient could not have reached this alone. |
| 4 | Useful | Sharpens a broad chart signal into something specific the patient could act on (e.g. from "poor sleep" to a named condition to watch for), or adds a concrete estimate the chart does not carry. |
| 3 | Neutral | Names the risk a careful reader of the chart would already reach, but adds a reason or a detail they would not have had. |
| 2 | Of Little Use | Restates the obvious chart reading (e.g. "your apnea puts your heart at risk" for a patient with recorded apnea and cardiac history) with nothing added. |
| 1 | Useless | Tells the patient only what any adult would be told regardless of this recording, or nothing they could act on at all. |

---

## 2. Factuality

**Does this response identify the new health risk this patient actually went on to develop, and name the right conditions within it?**

How to score: Open the "Future risk" panel. It lists the **future diseases** this patient newly developed in the six years after the study. Check two things against it: the risk area the response commits to in bold, and the conditions it names. Closely related variants of one problem count as one condition. The follow-up has already happened.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Accurate | The right risk area, and the recorded conditions named. Anything else it raises is a recognised variant or complication of them, not a separate claim. |
| 4 | Accurate | The right risk area, and at least one recorded condition named, alongside one or two the patient did not develop. |
| 3 | Neutral | The right risk area, but the conditions inside it are wrong or missing, or diluted by as many the patient did not develop. |
| 2 | Inaccurate | The risk area is wrong, though something it names touches what the patient developed. |
| 1 | Highly Inaccurate | Wrong risk area, and none of what the patient developed appears. |

---

## 3. Comprehensiveness

**How much information does this response give the patient beyond the known information (e.g., the Sleep panel, Prior medical history)?**

How to score: Set the response against the two panels tagged Known info — the Sleep panel and Prior medical history — and ask what it adds on top. Whether an addition is correct belongs to Factuality, not here.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Rich Addition | Carries named content absent from both Known info panels — a condition the chart never mentions, an estimated value, a medication resemblance — and states what in this recording points there. |
| 4 | Clear Addition | Mostly information beyond the known information, with some space spent restating it. |
| 3 | Neutral | Something new is in there, wrapped in about as much recital of the known information. |
| 2 | Thin | Mostly repackages the known information as future risk; little rests on this recording. |
| 1 | Nothing New | Every fact in it appears in the Sleep panel or Prior medical history. Delete the recording and the letter still writes itself. |

---

## 4. Personalization

**To what extent are this response's suggestions specific to this patient?**

How to score: Score the SUGGESTIONS only — the "What this means for you" section — not the analysis above it. Ask one question of each suggestion: could it be lifted into another patient's letter unchanged? Suggestions that survive the swap are generic; those that break because they name this patient's own findings are personalized. How valuable or novel the advice is belongs to Usefulness; general wellness steps are not faulted here.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Personalized | Suggestions join two or more distinct parts of this patient together (e.g. links a specific sleep finding to a named condition in their history, or to their medication or lab record) and turn that link into something to watch, raise, or do. Swapping in another patient's chart would make them read wrong. |
| 4 | Personalized | At least one named finding of this patient's is tied to a specific suggestion (e.g. quotes their own N3% or AHI and says what to raise because of it). General advice sits alongside. |
| 3 | Neutral | About half patient-specific, half generic. |
| 2 | Generic | Quotes the patient's numbers in the analysis, but the suggestions never refer back to them — the same advice would follow from any similar readout. |
| 1 | Highly Generic | One-size-fits-all advice. It ignores the data and reads like a health leaflet. |

---

## 5. Relevance

**How much of this response attaches to this patient's future health risks, not the conditions they already have?**

How to score: Judge the analysis and the suggestions separately, then together. Existing conditions may appear as evidence for a future risk; count them against the score only where they are the point rather than the support.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Relevant | Both the analysis and the suggestions are about what could develop next. Existing conditions appear only as grounds for that. |
| 4 | Relevant | Mostly future-focused. Existing conditions appear only as evidence. |
| 3 | Neutral | One part looks forward, the other goes back over what the patient already has. |
| 2 | Marginally Relevant | The analysis or the suggestions mostly go over existing conditions. Future risk is an afterthought. |
| 1 | Irrelevant | Reads as a review of conditions the patient already has. Nothing in it looks forward. |

---

*What changed from V7: **Usefulness is no longer nested inside Factuality.* Its V7 anchors
required a correct call to score 3+ and a wrong one to score 2-, so Factuality mechanically set
its floor and the two axes could not disagree. It now scores how far past the chart the response
reaches, independent of whether the reach was right. **Personalization is re-scoped to the
suggestions block** and judged by a swap test, because in the clinician round it correlated
r=0.80 with Usefulness — the rater was scoring one thing twice. **Anchors that demanded
perfection were replaced with observable moves**: Personalization was never once scored 5 across
30 responses because its top anchor asked for *every* suggestion to be patient-specific.*
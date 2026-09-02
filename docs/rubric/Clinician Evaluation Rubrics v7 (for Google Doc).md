# Clinical Evaluation Rubrics — V7

*Active 2026-09-01 · `rubric_version` v7-20260901 · SCHEMA_VERSION 17 · scores are NOT
comparable with V6 or earlier.*

You will read three responses per patient. For each response, score the five criteria below
on a 1–5 scale. The patient panel on the left is your reference: **Sleep panel** and **Prior
medical history** are tagged *Known info* (what was on record at the time of the study);
**Medication** and **Lab test** show EHR records where they exist (30 days and 90 days around
the study; most patients have none — "Not recorded in the EHR, but may be predictable");
**Future risk** (tagged *New onset risk*) is what the patient actually developed in the six
years after the study.

---

## 1. Usefulness

**How much does this response really tell this patient about what they went on to develop,
especially where it was hard to foresee?**

How to score: open the Future risk panel and set the warning against what was recorded. Then
ask whether the known information (Prior medical history, the Sleep panel) already points the
same way: a correct call that was hard to identify from it is worth the most; one it already
points to sits in the middle; a wrong direction scores low.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Very Useful | Points to what the patient went on to develop, where it was hard to identify from the known information alone. The warning does real work. |
| 4 | Useful | Points to what they went on to develop. The known information partly hints at it. |
| 3 | Neutral | Points to what they went on to develop, but it is easy to identify from the known information. Right, yet adds little. |
| 2 | Of Little Use | Points elsewhere, or flags only what is easy to identify from the known information. |
| 1 | Useless | Points away from what happened and would have misdirected attention. |

**Worked example.** Response X calls **respiratory** for a patient whose history is all
circulatory and metabolic and whose recording shows no breathing problem — and the outcome
panel records **Asthma**. Nothing in the known information pointed there: 5. Response Y calls
**circulatory** for a patient with a circulatory history, elevated AHI, and a recorded
circulatory outcome — correct, but easy to identify from the known information: 3.

---

## 2. Factuality

*(unchanged from V6)* **Does this response accurately highlight the new risk area, and name
the conditions this patient later developed?**

The area is the entry, the named conditions the ceiling: a response that gets the area right
but names none of the recorded conditions caps at 3.

**Worked example.** Response X opens "take the **circulatory** risk most seriously" and
highlights **Coronary atherosclerosis** and **Ischemic Heart Disease**, and the outcome panel
records ischemic heart disease: area right, conditions named — 5. Response Y calls the same
area for a patient whose outcome panel records only **Insomnia** and **Sleep disorders**: it
misses what happened entirely — 1.

---

## 3. Comprehensiveness

**How much information does this response give the patient beyond the known information
(e.g., the Sleep panel, Prior medical history)?**

How to score: set the response against the two panels tagged Known info and ask what it adds
on top. Whether an addition is correct belongs to Factuality, not here.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Rich Addition | The patient learns specific new concerns they could not take from the known information, and the response says what in this recording points there. |
| 4 | Clear Addition | Mostly information beyond the known information, with some space spent restating it. |
| 3 | Neutral | Something new is in there, wrapped in about as much recital of the known information. |
| 2 | Thin | Mostly repackages the known information as future risk; little rests on this recording. |
| 1 | Nothing New | Nothing here needed the recording: the whole message could be written from the known information alone. |

**Worked example.** Response X names two future conditions the chart never mentions, carries
a bolded chemistry estimate (**HbA1c 6.82 %**, outside range) and a medication resemblance
(**inhaled steroids**) — none of it available from the known information: 5. Response Y walks
through the AHI, the sleep efficiency and the patient's known conditions and concludes they
deserve attention: 2.

---

## 4. Personalization

*(question unchanged from V6)* **To what extent are this response's suggestions specific to
this patient?**

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Personalized | Every suggestion is built from this patient's own findings. Each result is tied to something to watch, raise, or do. It reads as written for this person alone. |
| 4 | Personalized | Specific findings are tied to specific suggestions. Some general advice sits alongside. |
| 3 | Neutral | About half patient-specific, half generic. |
| 2 | Generic | Mentions a few of the patient's numbers, but the advice would fit anyone with similar values. |
| 1 | Highly Generic | One-size-fits-all advice. It ignores the data and reads like a health leaflet. |

**Worked example.** Response X ties the patient's low deep sleep to a concrete thing to raise
at the next appointment and its medication resemblance to a records check: 5. Response Y
advises regular sleep, balanced meals and exercise, with no link to any finding: 1.

---

## 5. Relevance

**How much of this response attaches to this patient's future health risks, not the
conditions they already have?**

How to score: judge the analysis and the suggestions separately, then together. Existing
conditions may appear as evidence for a future risk; count them against the score only where
they are the point rather than the support.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Fully On-Target | Both the analysis and the suggestions work on future risks. |
| 4 | On-Target | Mostly future-focused. Existing conditions appear only as evidence. |
| 3 | Neutral | One part looks forward, the other goes back over what the patient already has. |
| 2 | Off-Target | The analysis or the suggestions mostly go over existing conditions. Future risk is an afterthought. |
| 1 | Fully Off-Target | Neither the analysis nor the suggestions engage the patient's future risk. |

**Worked example.** Response X argues from tonight's recording to a new condition to watch
and its advice is about staying ahead of that condition: 5. Response Y spends its analysis
reviewing the patient's existing hypertension and its advice on managing it: 2.

---

*What changed from V6: Usefulness now scores the warning against the recorded outcome,
weighted by how hard it was to foresee (its old "anything new?" question moved into
Comprehensiveness). Comprehensiveness keeps its name but measures the increment over the
known information (the coverage framing rewarded chart-tour letters and put the
ground-truth arm lowest). Justifiability is retired — raters read "justified" as
justified-by-the-chart, which punished any ground they could not see — and Relevance
returns in its place. Personalization anchors are trimmed; Factuality is unchanged.*

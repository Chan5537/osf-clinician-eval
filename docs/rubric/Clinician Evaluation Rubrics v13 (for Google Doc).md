# Clinical Evaluation Rubrics — V13

*Active 2026-09-29 · `rubric_version` v13-20260929 · SCHEMA_VERSION 25 · scores on the fifth criterion
are NOT comparable with V12 or earlier.*

Score each response on the five criteria below, 1–5, then rank the three responses at the
end of each case. The patient panel is your reference: **Sleep panel** and **Prior medical
history** are tagged *Ground-truth* (on record at the time of the study); **Future risk**
(*New onset risk*) is what the patient actually developed in the six years after.

> **WHAT CHANGED IN V13.** The fifth criterion is now **Relevance**, replacing Trustworthiness:
> to what extent the response identifies and prioritizes the information most relevant to this
> patient's future disease risk. Judge it against the risk the response raises: findings, history
> or studies that support, explain or qualify that risk are relevant; those restated without doing
> so are filler, however accurate. The other four criteria are unchanged, word for word.

> **The five axes are deliberately separable.** Each scores ONE property. Do not let one axis
> carry another — in particular, do not score Relevance down just because the risk a response
> raises turned out not to develop (that is Accuracy), and do not score Comprehensiveness up just
> because a response stays focused (focus is Relevance; new information is Comprehensiveness).

> **Judge each response on its own terms.** These responses draw on different sources, and
> some of their grounds are not visible to you in the panels. Do not mark a claim down merely
> because you cannot see where it came from — judge whether the response makes its own case.

> **Scale labels are uniform**: every criterion runs *Very X · X · Neutral · Not X · Not X At
> All*, where X is that criterion's own adjective. Accuracy keeps its own ladder
> (Accurate/Inaccurate).

---

## 1. Accuracy

**To what extent are this response's future disease-risk related statements (disease prediction, interpretation, references, and recommendations) factually accurate?**

How to score: Check the "Future risk" panel for the conditions this patient went on to develop, and the Sleep panel for the values the response interprets. **Each of the four categories is scored**: a response may identify the **correct condition** yet **misinterpret a value**, cite a source that **does not substantiate** the claim attached to it, or recommend a step that **does not follow** from its own findings. Closely related variants of a condition count as one condition.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Accurate | Accurate in **every category**: it identifies the risk area this patient went on to develop and names the recorded conditions, interprets their values correctly, recommends steps that follow from its findings, and any reference it provides substantiates the claim attached to it. |
| 4 | Accurate | Accurate in the prediction — the **correct** risk area, with the recorded conditions named — but inaccurate in **one other category**: a value misinterpreted, a reference that does not substantiate its claim, or a recommendation that does not follow from its findings. |
| 3 | Neutral | Accurate in **some** categories and **not others**: either the correct risk area with the conditions within it **incorrect or absent**, or the correct conditions accompanied by interpretations, references or recommendations that do not withstand scrutiny. |
| 2 | Inaccurate | Inaccurate in **most** of what it asserts. The risk area is **incorrect**, though something it names bears on what the patient developed, and its interpretations or recommendations contain further errors. |
| 1 | Highly Inaccurate | The risk area is **incorrect**, **none** of the conditions the patient developed appears, and its statements about their results and the actions it recommends are not borne out by the panels. |

**Worked example.** The "Future risk" panel for this patient records **Ischemic Heart Disease** and **Coronary atherosclerosis**. Response X identifies the **circulatory** area, names both conditions, interprets the recording correctly — "marked sleep fragmentation, with a high [ArI 26.1 events/hour] and poor [SE 63.8 percent]" — and its recommendations follow from those findings: Highly Accurate (5). Response Y also identifies **circulatory** and names both, but describes the same [SE 63.8 percent] as "within the normal range" and closes on a reference that nothing in the text relies upon: the prediction is accurate, the interpretation and the sourcing are not — Accurate (4), or Neutral (3) where more than one category is affected. A response identifying the **respiratory** area here would be Highly Inaccurate (1).

---

## 2. Comprehensiveness

**To what extent does this response give the patient information beyond the known information (e.g., the Sleep panel, Prior medical history)?**

How to score: Weigh what the response **adds** against what it **restates** from the Ground-truth panels. Information the patient could not have worked out from those panels counts for more than information they could.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Very Comprehensive | Carries named content **absent from both** Ground-truth panels — a condition neither panel points to, an estimated value such as a chemistry figure, a medication resemblance — and states what in this recording points there. The patient could not have reached it from the panels alone. |
| 4 | Comprehensive | **Mostly** information beyond the known information, though the panels **already hint** at where it lands. **Some** space spent restating them. |
| 3 | Neutral | **Something new** is in there, wrapped in **about as much** recital of the known information. |
| 2 | Not Comprehensive | **Mostly repackages** the known information as future risk; **little** rests on this recording. |
| 1 | Not Comprehensive At All | **Every** fact in it appears in the Sleep panel or Prior medical history. Delete the recording and the letter still writes itself. |

**Worked example.** Two responses for the same patient, both opening on the same recording [AHI 27.7 events/hour; ODI 27.5 events/hour]. One adds a chemistry estimate neither panel holds — **HbA1c 6.8 %**, outside the stated reference range, flagged as an estimate rather than a blood result — and names a specific condition to watch beyond what the panels list: Very Comprehensive (5). The other restates the same two indices, notes that the history already covers those areas, and concludes they are worth watching; a reader learns nothing the panels did not already give them: Not Comprehensive At All (1).

---

## 3. Personalization

**To what extent does this response personalize its synthesis of different health aspects (e.g., lifestyle, cardiovascular) to this patient?**

How to score: Judge the **whole response** — the analysis and the suggestions. Ask whether it could be **moved into another patient's letter unchanged**.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Highly Personalized | **Deeply synthesizes multiple** distinct aspects of this patient's profile (e.g. a specific sleep finding, a named condition in their history, their demographics), and carries that synthesis into what it tells them to watch, raise, or do. Reads as written for this person alone. |
| 4 | Personalized | **Goes beyond** surface-level reporting by connecting **specific** aspects of this patient's profile (e.g. linking one of their own findings to a condition in their history, or to a specific thing to raise). Some general advice sits alongside. |
| 3 | Neutral | **Split evenly** between generic and somewhat personalized health context. |
| 2 | Not Personalized | Mentions **surface-level** stats (e.g. basic demographics or isolated sleep numbers) that remain **broad** and could apply to a wide population with similar baseline values. |
| 1 | Not Personalized At All | **One-size-fits-all**, boilerplate content. It **ignores** the provided data and reads like a generic health article. |

**Worked example.** Both responses are for the same patient. Response X ties the recording to their own history in the analysis — "your history records prior conditions in the mental area without identifying this specific new condition" — and carries that into what to do: "notice persistent changes in worry, tension, mood, or sleep and bring them up at your next routine appointment." Analysis and suggestions are both built from this patient: Personalized (4); synthesizing a further aspect, such as tying a specific sleep finding in as well, would reach 5. Response Y reports numbers and closes "continue the routine preventive habits and follow-up already recommended for you" — surface-level stats plus advice that fits anyone: Not Personalized (2).

---

## 4. Usefulness

**To what extent does this response provide a useful summary to a healthcare provider regarding a patient?**

How to score: Judge the response as a summary handed to a provider: is it **clinically coherent, organized, and something they could act on** for next steps?

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Very Useful | Provides **highly actionable**, well-organized information that a provider can **directly** utilize for clinical decision-making and next steps. |
| 4 | Useful | Provides **clinically coherent and relevant** information that clearly communicates the patient's status to the provider. |
| 3 | Neutral | Information is **split evenly** between being useful and irrelevant. |
| 2 | Useless | Provides **tangential or unactionable** information that offers **no** clinical value to the provider. |
| 1 | Very Useless | Provides **highly irrelevant or distracting** information that would waste clinical time or frustrate the provider. |

**Worked example.** A response that names the area to watch, ties it to specific findings, and closes with what to raise at the next appointment gives a provider something to act on: Useful (4). A response that reports findings and closes "but these findings do not by themselves point to a specific additional future condition" leaves the provider without a next step: Useless (2).

---

## 5. Relevance

**To what extent does this response identify and prioritize the most clinically relevant information (e.g., sleep findings, medical history, supporting studies) for this patient's future disease risk?**

How to score: Ask of **each part** whether it bears on the **future risk the response raises** for this patient: findings, history or studies that **support, explain or qualify** that risk are relevant; those **restated without doing so** are filler, however accurate.

| Score | Anchor | Meaning |
|---|---|---|
| 5 | Very Relevant | **Directly and concisely** addresses the patient's question. It leads with the findings and evidence **most pertinent** to the risk it raises, and each part bears on that risk, with **no** distracting or unnecessary information. |
| 4 | Relevant | **Adequately** covers the appropriate findings and evidence for the risk it raises, but includes **some** unnecessary detail or **minor** tangents (e.g. a prior condition restated without bearing on that risk, or a study of a population unlike this patient) that slightly obscure the core message. |
| 3 | Neutral | **Split evenly** between information that bears on the patient's question and information that does not. |
| 2 | Not Relevant | Addresses the question, but the response is **heavily diluted**: it dedicates **significant** space to findings, history or studies that do not bear on the risk it raises, which distracts from the main clinical picture. |
| 1 | Not Relevant At All | **Fails to address** the patient's question, focusing **entirely** on information unrelated to their future disease risk. |

**Worked example.** Both responses are for the same patient and raise the same future risk. Response X opens on the two findings that carry it — fragmented sleep [SE 68.0%] and frequent breathing disturbance [RDI 42.6 events/hour] — ties them to that risk through a study of older men like this patient, and brings in the prior **Essential hypertension** only where it bears on that risk: Very Relevant (5). Response Y reaches the same conclusion, but restates each prior condition in the history, reviews sleep stages it never connects to that risk, and cites a study of a population unlike this patient; the core message is there, but diluted: Not Relevant (2), or Neutral (3) where about half of it bears on the risk.

---

## 6. Overall ranking (once per case)

**Taking everything together, rank these three responses from best to worst.**

Assign each response a place: 1st, 2nd or 3rd. Selecting a place already held by another
response exchanges the two, so every response ends on a different place.

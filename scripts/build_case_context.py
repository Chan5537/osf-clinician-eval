#!/usr/bin/env python3
"""Build the case-context sidecar consumed by the clinician-eval UI.

WHY A SIDECAR
-------------
`src/data/demo-cases.generated.json` is written by the upstream exporter
(osf-human-eval: scripts/export_calibrated_batch_to_ui.py) and is overwritten
whenever the case batch is re-exported. Rather than edit that file — which would
lose the additions on the next export — this script emits a SEPARATE file,
`src/data/case-context.generated.json`, keyed by `case_id`. The UI merges the two
at render time. demo-cases.generated.json is never touched.

WHAT IT ADDS
------------
  sleepIndex                 the 16 session-level sleep metrics (source of truth:
                             sleep_index.SLEEP_INDEX_FIELDS), joined by session id
  futureDiseaseGroundTruth   `Future disease -> Groundtruth labels` for the session
  diseaseCategoryByName      disease_name -> organ-system category, for the names
                             actually used by this batch (history + future GT)

`Predicted labels` is deliberately NOT emitted: it is model output and putting it
in the UI bundle would break source-blinding.

Medical history is NOT copied here. It already lives in demo-cases.generated.json
as `ehr_history`; duplicating it would create two sources that can drift. The UI
groups that existing list using `diseaseCategoryByName`.

JOIN — READ THIS BEFORE CHANGING ANYTHING
-----------------------------------------
The numeric suffix in a case_id (`HSP_circulatory_7`) is the EXPORTER's own
counter. It is NOT the index of the session inside its category in
human_eval.json — checked, and it does not line up. So the join is by CONTENT:
(sex, age, race) plus, when recorded, blood pressure. A case that does not resolve
to exactly one source session is a hard error, never a silent skip.

USAGE
-----
    python scripts/build_case_context.py                 # write the sidecar
    python scripts/build_case_context.py --check         # verify, write nothing
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]

# --- upstream sources (all read-only) -------------------------------------- #
SLEEPFM_ROOT = Path("/u/ztshuai/ondemand/sleepfmv2-final")

# The selected human-eval batch: demographics, medical history, future-disease GT.
HUMAN_EVAL_JSON = SLEEPFM_ROOT / "results/early_risk/new_human_eval_all/human_eval.json"

# Session-level sleep metrics. Same file sleep_index.py calls its single source of
# truth; join key is `session_id` == the session's nsrrid.
METRICS_CSV = Path(
    "/projects/besp/shared_data/sleep_demographics_covariates/"
    "session_gt_label_and_metrics.csv"
)

# phecode reference: disease_name -> organ-system category.
DISEASE_REF_CSV = SLEEPFM_ROOT / "data_pipelines/reference_csvs/hsp_disease_list_consolidated.csv"

CASES_JSON = REPO_ROOT / "src/data/demo-cases.generated.json"
OUT_JSON = REPO_ROOT / "src/data/case-context.generated.json"

# Mirrors sleep_index.SLEEP_INDEX_FIELDS, minus the `metric__` prefix. Kept in this
# order so the UI can render groups without re-sorting.
SLEEP_INDEX_FIELDS = [
    "ahi", "odi", "rdi",
    "tst_min", "trt_min", "se", "sol_min", "waso_min",
    "rem_pct", "n1_pct", "n2_pct", "n3_pct",
    "mean_spo2", "nadir_spo2",
    "plmi", "ari",
]

# Display order for organ-system groups. Categories present in the reference CSV
# but absent here would sort last; the assertion below stops that from going
# unnoticed.
CATEGORY_ORDER = [
    "circulatory system",
    "respiratory",
    "endocrine/metabolic",
    "neurological",
    "mental disorders",
    "musculoskeletal",
    "digestive",
    "genitourinary",
    "sense organs",
    "neoplasms",
    "hematopoietic",
    "dermatologic",
    "congenital anomalies",
]

SEX_TO_UI = {"female": "F", "male": "M"}


def load_disease_categories() -> Dict[str, str]:
    """disease_name -> category, from the consolidated phecode reference."""
    with DISEASE_REF_CSV.open() as fh:
        rows = list(csv.DictReader(fh))
    mapping = {r["disease_name"]: r["category"] for r in rows}
    unknown = sorted({r["category"] for r in rows} - set(CATEGORY_ORDER))
    if unknown:
        raise SystemExit(
            f"[build_case_context] reference CSV has categories missing from "
            f"CATEGORY_ORDER: {unknown} — add them before continuing."
        )
    return mapping


def load_sleep_metrics(session_ids: set[str]) -> Dict[str, Dict[str, Optional[float]]]:
    """session_id -> {field: float|None} for the requested sessions."""
    wanted = {f"metric__{f}": f for f in SLEEP_INDEX_FIELDS}
    out: Dict[str, Dict[str, Optional[float]]] = {}
    with METRICS_CSV.open(newline="") as fh:
        reader = csv.DictReader(fh)
        missing_cols = sorted(set(wanted) - set(reader.fieldnames or []))
        if missing_cols:
            raise SystemExit(
                f"[build_case_context] metrics CSV is missing columns {missing_cols}"
            )
        for row in reader:
            sid = row["session_id"]
            if sid not in session_ids:
                continue
            rec: Dict[str, Optional[float]] = {}
            for col, field in wanted.items():
                raw = row[col]
                if raw is None or raw == "" or raw.lower() in {"nan", "na"}:
                    rec[field] = None
                    continue
                rec[field] = float(raw)
            out[sid] = rec
    absent = sorted(session_ids - set(out))
    if absent:
        raise SystemExit(
            f"[build_case_context] {len(absent)} session(s) absent from the metrics "
            f"CSV: {absent} — cannot emit sleep indices for them."
        )
    return out


def resolve_source(case: dict, sources: List[dict]) -> int:
    """Index into human_eval.json for this case. Exactly one match, or raise.

    Matched on (sex, age, race) and — when the case records one — blood pressure.
    The case_id suffix is the exporter's counter and carries no index meaning.
    """
    demo = case["demographics"]
    hits: List[int] = []
    for i, entry in enumerate(sources):
        d = entry["Demo"]
        if SEX_TO_UI.get(d["sex"] or "") != demo["sex"]:
            continue
        if abs(float(d["age_years"] or 0) - float(demo["age"])) > 0.5:
            continue
        if (d["race"] or "") != demo["race"]:
            continue
        if demo.get("bp"):
            sys_bp, dia_bp = d["bp_systolic_mmhg"], d["bp_diastolic_mmhg"]
            if sys_bp is None or dia_bp is None:
                continue
            if f"{int(sys_bp)}/{int(dia_bp)}" != demo["bp"]:
                continue
        hits.append(i)
    if len(hits) != 1:
        raise SystemExit(
            f"[build_case_context] case {case['case_id']} resolved to {len(hits)} "
            f"source sessions {hits}; expected exactly 1. The join is by content — "
            f"inspect demographics before re-running."
        )
    return hits[0]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--check", action="store_true",
        help="resolve and validate everything, then report without writing",
    )
    args = ap.parse_args()

    cases = json.loads(CASES_JSON.read_text())
    sources = json.loads(HUMAN_EVAL_JSON.read_text())
    categories = load_disease_categories()

    resolved = {c["case_id"]: resolve_source(c, sources) for c in cases}
    session_ids = {sources[i]["ID"]["patient_id"] for i in resolved.values()}
    metrics = load_sleep_metrics(session_ids)

    out_cases: Dict[str, dict] = {}
    used_names: set[str] = set()
    for case in cases:
        cid = case["case_id"]
        entry = sources[resolved[cid]]
        session_id = entry["ID"]["patient_id"]
        gt = list(entry["Future disease"]["Groundtruth labels"])
        used_names.update(case["ehr_history"])
        used_names.update(gt)
        out_cases[cid] = {
            "sessionId": session_id,
            "sourceIndex": resolved[cid],
            "sleepIndex": metrics[session_id],
            "futureDiseaseGroundTruth": gt,
        }

    unmapped = sorted(n for n in used_names if n not in categories)
    if unmapped:
        raise SystemExit(
            f"[build_case_context] {len(unmapped)} disease name(s) are not in the "
            f"reference CSV and cannot be grouped: {unmapped}"
        )

    payload = {
        "categoryOrder": CATEGORY_ORDER,
        "sleepIndexFields": SLEEP_INDEX_FIELDS,
        "diseaseCategoryByName": {n: categories[n] for n in sorted(used_names)},
        "cases": out_cases,
    }

    for cid, rec in out_cases.items():
        n_present = sum(1 for v in rec["sleepIndex"].values() if v is not None)
        print(
            f"  {cid:28s} session={rec['sessionId']:26s} "
            f"sleepIndex={n_present}/{len(SLEEP_INDEX_FIELDS)} "
            f"futureGT={len(rec['futureDiseaseGroundTruth'])}"
        )
    print(f"  disease names used: {len(used_names)}, all mapped to a category")

    if args.check:
        print("[build_case_context] --check: nothing written")
        return 0

    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"[build_case_context] wrote {OUT_JSON.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

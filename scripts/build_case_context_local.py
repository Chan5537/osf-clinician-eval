#!/usr/bin/env python3
"""LOCAL case-context sidecar builder (no cluster dependencies).

Zitao's build_case_context.py joins three files that only exist on his cluster
(HUMAN_EVAL_JSON / METRICS_CSV / DISEASE_REF_CSV). This local variant rebuilds
case-context.generated.json from just the two files we have locally:

  1. src/data/demo-cases.generated.json   — the exported cases (gives case_id -> nsrrid)
  2. osf-human-eval/.../human_eval.json    — per-record SleepIndex + Future-disease GT + source idx

The STATIC reference data (categoryOrder, sleepIndexFields, diseaseCategoryByName) is carried over
verbatim from the EXISTING committed sidecar — it is a phecode reference map, independent of which
cases are selected, so it never needs regenerating locally.

Emits the exact CaseContextFile schema src/lib/case-context.ts expects.

Pass the SAME --prefix the exporter used so the case_id -> nsrrid resolution reads ONLY that batch's
results (case_ids like HSP_circulatory_7 collide across batches with different nsrrids, so resolving
against all result dirs picks the wrong session).

Usage: osf-human-eval/.venv/bin/python scripts/build_case_context_local.py --prefix q4_smoke_nofig
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]                     # app/
SLEEP_ROOT = REPO_ROOT.parents[1]                                   # sleep_foundation_model/
HUMAN_EVAL_JSON = (SLEEP_ROOT / "osf-human-eval" / "data" / "selected_inputs"
                   / "human_eval_cal_logits_18_65" / "human_eval.json")
CASES_JSON = REPO_ROOT / "src" / "data" / "demo-cases.generated.json"
OUT_JSON = REPO_ROOT / "src" / "data" / "case-context.generated.json"

SLEEP_INDEX_FIELDS = [
    "ahi", "odi", "rdi", "tst_min", "trt_min", "se", "sol_min", "waso_min",
    "rem_pct", "n1_pct", "n2_pct", "n3_pct", "mean_spo2", "nadir_spo2", "plmi", "ari",
]


def _nsrrid(rec: dict) -> str | None:
    idf = rec.get("ID")
    return idf.get("patient_id") if isinstance(idf, dict) else idf


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--prefix", default="q4_smoke_nofig",
                    help="results/<prefix>_{a,b,c}/ dirs to resolve case_id -> nsrrid from")
    args = ap.parse_args()

    cases = json.loads(CASES_JSON.read_text())
    src = json.loads(HUMAN_EVAL_JSON.read_text())
    ns_by_case, truth_by_case = _case_to_nsrrid(args.prefix)

    # index the human-eval records by nsrrid, remembering source order (sourceIndex)
    by_ns: dict[str, tuple[int, dict]] = {}
    for i, r in enumerate(src):
        ns = _nsrrid(r)
        if ns is not None:
            by_ns.setdefault(ns, (i, r))

    # carry over the STATIC reference blocks from the existing committed sidecar
    prior = json.loads(OUT_JSON.read_text()) if OUT_JSON.exists() else {}
    category_order = prior.get("categoryOrder", [])
    disease_category = dict(prior.get("diseaseCategoryByName", {}))

    out_cases: dict[str, dict] = {}
    missing = []
    for case in cases:
        cid = case["case_id"]
        # the exporter stamps the session on each response's arm record? no — join on nsrrid.
        # demo-cases carries no nsrrid, so resolve via the human_eval record whose case maps here.
        # The exporter wrote demographics; match on (age, sex, race) + medical history is fragile,
        # so instead we rely on the smoke result records having stamped case_id -> nsrrid. Fall back:
        ns = case.get("session_id") or case.get("nsrrid") or ns_by_case.get(cid)
        if ns is None or ns not in by_ns:
            missing.append(cid)
            continue
        idx, rec = by_ns[ns]
        si = rec.get("SleepIndex", {}) or {}
        sleep_index = {f: si.get(f"metric__{f}") for f in SLEEP_INDEX_FIELDS}
        # Future-disease DISPLAY list: use the ORGAN-SCOPED, condition-COLLAPSED `truth_positive_names`
        # from the result records (the same list the boolean questions key to) — NOT the raw
        # `human_eval.json` "Groundtruth labels", which is the UNSCOPED cross-system set (up to 24
        # entries) and disagreed with the scoped questions. Falls back to the raw list only if a case
        # has no result record (legacy). (Fix 4, 2026-08-08 — matches the panel display to the rubric.)
        raw_gt = (rec.get("Future disease", {}) or {}).get("Groundtruth labels", []) or []
        gt = truth_by_case.get(cid) or list(raw_gt)
        # NOTE: no baked sleep-vitals PNG. The sleep-vitals visualization is now a BROWSER-NATIVE SVG
        # chart (app/src/components/SleepVitalsChart.tsx) rendered from THIS `sleepIndex` (human_eval
        # source), so the chart and the numeric grid are always the same numbers — no npz/CSV source
        # mismatch. The old render_sleep_figure PNG (a different, disagreeing source) was removed.
        out_cases[cid] = {
            "sessionId": ns,
            "sourceIndex": idx,
            "sleepIndex": sleep_index,
            "futureDiseaseGroundTruth": list(gt),
        }
        # ensure any GT disease name has a category entry (fall back to the case's own category)
        for d in gt:
            disease_category.setdefault(d, case_category(case))

    result = {
        "categoryOrder": category_order,
        "sleepIndexFields": SLEEP_INDEX_FIELDS,
        "diseaseCategoryByName": disease_category,
        "cases": out_cases,
    }
    OUT_JSON.write_text(json.dumps(result, indent=1) + "\n")
    print(f"[build_case_context_local] wrote {OUT_JSON.relative_to(REPO_ROOT)} "
          f"({len(out_cases)} case(s))")
    if missing:
        print(f"[build_case_context_local] WARNING: no source row for: {missing}")
    return 1 if missing else 0


def _case_to_nsrrid(prefix: str) -> tuple[dict[str, str], dict[str, list]]:
    """case_id -> nsrrid AND case_id -> truth_positive_names, read ONLY from results/<prefix>_{a,b,c}/
    so batches don't collide. `truth_positive_names` is the organ-scoped, condition-collapsed GT list
    (identical across arms; carried on every result record) — used for the panel's future-disease
    display so it matches the boolean questions."""
    import glob
    root = SLEEP_ROOT / "osf-human-eval" / "results"
    ns_out: dict[str, str] = {}
    truth_out: dict[str, list] = {}
    for arm in ("a", "b", "c"):
        for f in sorted(glob.glob(str(root / f"{prefix}_{arm}" / "*.json"))):
            try:
                data = json.loads(Path(f).read_text())
            except Exception:
                continue
            recs = data if isinstance(data, list) else data.get("results", [])
            for r in recs:
                if isinstance(r, dict) and r.get("case_id") and r.get("nsrrid"):
                    ns_out.setdefault(r["case_id"], r["nsrrid"])
                    tp = r.get("truth_positive_names")
                    if tp and r["case_id"] not in truth_out:
                        truth_out[r["case_id"]] = list(tp)
    return ns_out, truth_out


def case_category(case: dict) -> str:
    # organ-system slug from case_id: HSP_circulatory_5 -> "circulatory system" best-effort
    cid = case.get("case_id", "")
    parts = cid.split("_")
    slug = parts[1] if len(parts) > 1 else ""
    return {"circulatory": "circulatory system", "respiratory": "respiratory",
            "endocrine": "endocrine/metabolic", "neurological": "neurological",
            "mental": "mental disorders"}.get(slug, slug)


if __name__ == "__main__":
    raise SystemExit(main())

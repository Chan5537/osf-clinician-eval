#!/usr/bin/env python3
"""Freeze the un-blinding key of a UI batch into a committed CSV.

WHY THIS EXISTS
---------------
The map from the blinded display letter a clinician sees (`label`) to the source
arm (`arm`) lives in exactly ONE place: the app's generated bundle,
`clinician_sleepfm_eval_interface/app/src/data/demo-cases.generated.json`.
Nothing else records it. Downstream analysis recovers arms by joining
(case_id, response_label) against that same mutable file, so REGENERATING IT
DESTROYS ATTRIBUTION for every score already collected.

`export.ts` has claimed since 2026-09-02 that a `<batch>_arm_key.csv` and a
`decode_review_csv.py` exist. They never did. This writes the first of them.

Run it BEFORE a round opens, commit the output, and tag the data commit.

    python3 scripts/data/freeze_arm_key.py         # writes supabase/<batch>_arm_key.csv
    python3 scripts/data/freeze_arm_key.py --check # verify the key still matches the bundle

`--check` exits non-zero on drift, so it can gate CI: it is the tripwire that
turns "the batch was regenerated mid-round" from silent corruption into a
build failure.

THE LEGEND (verified 2026-09-04, do not re-derive by guessing)
-------------------------------------------------------------
    A = BASE      B = OURS      C = TRUTH

In the v611_r10 batch `arm` is the literal 'A'/'B'/'C' — the SAME alphabet as
the display `label` — so the two are indistinguishable by inspection and the
legend cannot be read off the bundle. It was established by REPRODUCTION, not
by assumption:

  * osf-human-eval `scripts/export_v15_ui.py:66` and `scripts/export_v12_ui.py:49`
    both declare
        ARM_ID = {"base": "A", "ours": "B", "truth": "C"}   # unblinding key
  * Those exporters shuffle display order with `random.Random(f"{cid}-{seed}")`,
    default seed 7.
  * Replaying that shuffle with that ARM_ID reproduces the live label->arm
    permutation for ALL 10 v611_r10 cases exactly (and 2/2, 6/6, 5/5 on the
    v61_ui4, rubric-v4 and weighted-boolean batches). A wrong mapping would
    reproduce all ten by chance at odds of roughly 1 in 6^10.
  * The one branch carrying the older self-describing vocabulary
    (origin/rubric-v8, batch v60_gap60) writes BASE/OURS/TRUTH directly and
    agrees with the same mapping.

⚠️ Do NOT infer the legend from osf-human-eval configs/arm_{a,b,c}.yaml. Those are the OLDER
   single-letter arm configs; the v61 batch was built from
   configs/v61/gap60_3arm/arm_{base,ours,truth}.yaml. They happen to agree, but
   the agreement is a coincidence of ordering, not evidence.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

# scripts/data/freeze_arm_key.py -> app root is two levels up.
ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "src" / "data" / "demo-cases.generated.json"
OUT_DIR = ROOT / "supabase"

FIELDS = ["batch", "case_id", "case_position", "response_label", "arm", "arm_name",
          "query_id", "response_sha"]


def text_fingerprint(text: str) -> str:
    """FNV-1a over UTF-8 -> 8 hex chars.

    MIRRORS textFingerprint() in the app's src/lib/export.ts. The app stamps this
    on every exported row as `response_sha`; matching it here is what lets a
    returned review file be verified against the frozen key.
    """
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")


def build_rows(cases: list[dict], legend: dict[str, str]) -> list[dict]:
    rows: list[dict] = []
    for pos, case in enumerate(cases):
        for resp in case["responses"]:
            arm = resp["arm"]
            rows.append({
                "batch": case.get("batch", ""),
                "case_id": case["case_id"],
                "case_position": pos,
                "response_label": resp["label"],
                "arm": arm,
                "arm_name": legend.get(arm, ""),
                "query_id": case.get("query_id", ""),
                "response_sha": text_fingerprint(resp["markdown"]),
            })
    return rows


def parse_legend(spec: str | None) -> dict[str, str]:
    if not spec:
        return {}
    out: dict[str, str] = {}
    for pair in spec.split(","):
        k, _, v = pair.partition("=")
        if not k.strip() or not v.strip():
            raise SystemExit(f"bad --legend entry {pair!r}; expected ARM=NAME")
        out[k.strip()] = v.strip().upper()
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bundle", type=Path, default=BUNDLE,
                    help="demo-cases.generated.json to freeze (default: the app bundle)")
    ap.add_argument("--legend", default=None,
                    help="arm -> name map, e.g. A=BASE,B=OURS,C=TRUTH. Omit to leave blank.")
    ap.add_argument("--check", action="store_true",
                    help="compare against the existing key instead of writing; exit 1 on drift")
    args = ap.parse_args()

    if not args.bundle.exists():
        raise SystemExit(f"bundle not found: {args.bundle}")
    cases = json.loads(args.bundle.read_text())
    if not cases:
        raise SystemExit("bundle holds no cases")

    batches = {c.get("batch", "") for c in cases}
    if len(batches) != 1:
        raise SystemExit(f"bundle mixes batches {sorted(batches)}; refusing to freeze")
    batch = batches.pop()
    if not batch:
        raise SystemExit("bundle has no `batch` watermark; cannot name the key file")

    rows = build_rows(cases, parse_legend(args.legend))
    out_path = OUT_DIR / f"{batch}_arm_key.csv"

    if args.check:
        if not out_path.exists():
            print(f"MISSING: {out_path}", file=sys.stderr)
            return 1
        with out_path.open(newline="") as fh:
            existing = list(csv.DictReader(fh))
        # Compare only the identity+integrity columns; arm_name may be filled in later.
        key = lambda r: (r["batch"], r["case_id"], r["response_label"])
        cmp = lambda r: (r["arm"], r["response_sha"])
        now = {key(r): cmp({k: str(v) for k, v in r.items()}) for r in rows}
        was = {key(r): cmp(r) for r in existing}
        if now == was:
            print(f"OK: {out_path.name} still matches the bundle ({len(rows)} rows)")
            return 0
        print(f"DRIFT: {out_path.name} no longer matches the bundle.", file=sys.stderr)
        for k in sorted(set(now) | set(was)):
            if now.get(k) != was.get(k):
                print(f"  {k}: frozen={was.get(k)} bundle={now.get(k)}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)

    named = sum(1 for r in rows if r["arm_name"])
    print(f"wrote {len(rows)} rows -> {out_path}")
    print(f"  batch={batch}  cases={len(cases)}  arms={sorted({r['arm'] for r in rows})}")
    if not named:
        print("  ⚠️  arm_name is BLANK. Confirm the legend with whoever generated this batch,")
        print("      then re-run with --legend A=BASE,B=OURS,C=TRUTH (or the true mapping).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

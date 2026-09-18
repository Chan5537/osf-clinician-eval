#!/usr/bin/env python3
"""Seed public.batch_response from the app bundle — the arm-key snapshot.

Run ONCE per batch, BEFORE any rater scores anything, and never from CI.

    export SUPABASE_URL=https://<project>.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=<service role key>      # NOT the anon key
    python3 scripts/data/seed_batch.py                        # upsert
    python3 scripts/data/seed_batch.py --dry-run              # print, write nothing
    python3 scripts/data/seed_batch.py --verify               # compare DB vs bundle

WHY THE SERVICE ROLE KEY
    batch_response has no INSERT policy at all (002_rls.sql) — RLS default-denies
    every write. The service-role key bypasses RLS, which is exactly the blast
    radius an un-blinding key should have: one operator, one script, no app path.

⚠️ NEVER put the service-role key in .env, a Vite variable, or the bundle. It is
   a full-database credential. Export it in your shell for the length of this run.

Rows are built from the SAME source as supabase/<batch>_arm_key.csv, and the
script refuses to run if the two disagree — so the committed CSV and the database
can never quietly diverge.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "src" / "data" / "demo-cases.generated.json"
KEY_DIR = ROOT / "supabase"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from freeze_arm_key import text_fingerprint  # single source of truth for the sha


def build_rows(cases: list[dict]) -> list[dict]:
    rows = []
    for pos, case in enumerate(cases):
        for resp in case["responses"]:
            rows.append({
                "batch": case.get("batch", ""),
                "case_id": case["case_id"],
                "response_label": resp["label"],
                "arm": resp["arm"],
                "arm_name": None,  # filled from the committed key below
                "query_id": case.get("query_id"),
                "case_position": pos,
                "response_sha": text_fingerprint(resp["markdown"]),
                "response_text": resp["markdown"],
            })
    return rows


def apply_committed_legend(rows: list[dict], batch: str) -> None:
    """Take arm_name from the committed key, and assert the key still agrees."""
    key_path = KEY_DIR / f"{batch}_arm_key.csv"
    if not key_path.exists():
        raise SystemExit(
            f"missing {key_path}. Run scripts/data/freeze_arm_key.py first — the "
            f"committed key is what makes this seed reproducible."
        )
    with key_path.open(newline="") as fh:
        key = {(r["case_id"], r["response_label"]): r for r in csv.DictReader(fh)}

    drift = []
    for row in rows:
        k = (row["case_id"], row["response_label"])
        krow = key.get(k)
        if krow is None:
            drift.append(f"{k}: absent from the committed key")
            continue
        if krow["arm"] != row["arm"] or krow["response_sha"] != row["response_sha"]:
            drift.append(
                f"{k}: key=({krow['arm']},{krow['response_sha']}) "
                f"bundle=({row['arm']},{row['response_sha']})"
            )
        row["arm_name"] = krow.get("arm_name") or None

    if drift:
        print("REFUSING TO SEED — the bundle no longer matches the committed arm key:",
              file=sys.stderr)
        for d in drift[:10]:
            print("   ", d, file=sys.stderr)
        raise SystemExit(1)

    if any(r["arm_name"] is None for r in rows):
        print("⚠️  arm_name is blank in the committed key. Seeding anyway (arm is still "
              "recorded), but resolve the legend and re-run before analysis.")


def _request(method: str, url: str, key: str, payload=None, extra_headers=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    headers.update(extra_headers or {})
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body.strip() else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {url} -> {e.code}\n{e.read().decode()}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print rows, write nothing")
    ap.add_argument("--verify", action="store_true", help="compare the DB against the bundle")
    args = ap.parse_args()

    cases = json.loads(BUNDLE.read_text())
    batches = {c.get("batch", "") for c in cases}
    if len(batches) != 1 or not next(iter(batches)):
        raise SystemExit(f"bundle must carry exactly one non-empty batch; got {batches}")
    batch = batches.pop()

    rows = build_rows(cases)
    apply_committed_legend(rows, batch)
    print(f"batch={batch}  cases={len(cases)}  rows={len(rows)}")

    if args.dry_run:
        for r in rows[:6]:
            print(f"  {r['case_id']} {r['response_label']} -> arm={r['arm']} "
                  f"({r['arm_name']}) sha={r['response_sha']}")
        print(f"  ... {len(rows)} rows total (dry run; nothing written)")
        return 0

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise SystemExit("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment")
    endpoint = f"{url}/rest/v1/batch_response"

    if args.verify:
        status, got = _request(
            "GET",
            f"{endpoint}?batch=eq.{batch}&select=case_id,response_label,arm,response_sha",
            key,
        )
        db = {(r["case_id"], r["response_label"]): (r["arm"], r["response_sha"])
              for r in (got or [])}
        want = {(r["case_id"], r["response_label"]): (r["arm"], r["response_sha"])
                for r in rows}
        if db == want:
            print(f"OK: database matches the bundle ({len(want)} rows)")
            return 0
        print("DRIFT between database and bundle:", file=sys.stderr)
        for k in sorted(set(db) | set(want)):
            if db.get(k) != want.get(k):
                print(f"   {k}: db={db.get(k)} bundle={want.get(k)}", file=sys.stderr)
        return 1

    status, _ = _request(
        "POST", endpoint, key, payload=rows,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    print(f"upserted {len(rows)} rows -> batch_response (HTTP {status})")
    print("verify with: python3 scripts/data/seed_batch.py --verify")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

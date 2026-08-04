"""Cross-check tolerance-stack hardware against an assembly run's parts list.

READ-ONLY against ``data/runs/<run>/`` -- prints, for each hardware part number
a stack consumes, whether it appears in the extracted parts list and which
balloons (page + find-no) reference it.

Usage:
    venv-win\\Scripts\\python.exe tests\\debug_stack_hardware_crosscheck.py \\
        "C:/workspace/drawing-checker/data/runs/20260723_163810_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER"

IMPORTED from drawing-checker at tolstack's founding (see PROVENANCE.md), verbatim
apart from this note. The ``data/runs/<run>/`` it reads is **drawing-checker's**,
not this repo's -- pass an absolute path as the usage line shows. That read-only,
one-way dependency is how a stack element gets traced to a balloon; nothing here
writes into that repo.

Watch the key mismatch it exists to survive: those balloons JSON files key the
parts-list row as ``item_no`` under ``balloons`` but ``find_no`` under
``parts_list``. Joining on the wrong one silently yields "0 balloons" for every
part, which reads like a real finding.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# The hardware the 260729 grip-length workbook names, by stack.
STACK_HARDWARE = {
    "tan_link_to_pitch_plate": ["NAS1149V0332", "NAS1149V0363"],
    "vpa_output_to_pitch_plate": ["NAS77A4-015", "MS21299C4K"],
    "shared_parts": ["215197"],
}


def norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--extra", nargs="*", default=[], help="additional part numbers to look for")
    args = ap.parse_args()

    run = Path(args.run_dir)
    balloons_file = next(run.glob("*_balloons.json"), None)
    if balloons_file is None:
        print(f"no *_balloons.json in {run}")
        return 1
    data = json.loads(balloons_file.read_text(encoding="utf-8"))
    parts = data.get("parts_list", [])
    balloons = data.get("balloons", [])
    print(f"run: {run.name}")
    print(f"source_pdf: {data.get('source_pdf')}  pages: {data.get('page_count')}  "
          f"parts_list rows: {len(parts)}  balloons: {len(balloons)}\n")

    by_find = {p.get("find_no"): p for p in parts}
    wanted = [(stack, pn) for stack, pns in STACK_HARDWARE.items() for pn in pns]
    wanted += [("--extra", pn) for pn in args.extra]

    for stack, pn in wanted:
        key = norm(pn)
        rows = [p for p in parts
                if key in norm(p.get("part_number")) or key in norm(p.get("nomenclature"))]
        status = "PRESENT" if rows else "ABSENT "
        print(f"[{status}] {pn:<16} ({stack})")
        for r in rows:
            print(f"           find {r['find_no']:>3}  {r['part_number']:<18} qty={r.get('qty')}  "
                  f"{r.get('nomenclature')}")
            # balloons key the parts-list row as ``item_no`` (not ``find_no``)
            refs = [b for b in balloons if b.get("item_no") == r["find_no"]]
            where = sorted({(b.get("page"), b.get("view_id")) for b in refs})
            print(f"           balloons: {len(refs)} at {where}")

    print("\n--- parts-list rows that look like standard hardware (NAS/MS/AN/NASM) ---")
    for p in parts:
        blob = f"{p.get('part_number')} {p.get('nomenclature')}"
        if re.search(r"\b(NAS|NASM|MS\d|AN\d)", blob.upper()):
            print(f"  find {p['find_no']:>3}  {p['part_number']:<20} qty={p.get('qty')}  "
                  f"{p.get('nomenclature')}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())

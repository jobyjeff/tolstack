"""Build the viewer's results projection -- the ONLY place stack arithmetic runs.

``apps/viewer/`` is a dumb renderer: it never adds, subtracts or compares a
tolerance. Everything numeric it shows comes out of this file's output, which is
produced by :func:`tolerance_stack.fold` -- the repo's single arithmetic path
(``ARCHITECTURE.md``: "there is exactly one line where a sign can be wrong").
A second fold written in JavaScript would be a second place a sign can be wrong,
so there isn't one.

Output: ``<data-root>/projections/viewer/results.json``
(schema ``joby.tolerance_stack/viewer_projection/v0``). **Wipe-and-rebuild,
derived not authored** -- delete it and re-run and you get the same bytes apart
from ``built_at``. Its companion, ``crops.json`` + ``crops/``, is built
separately by ``build_viewer_crops.py``; each script owns its own files so
either can be re-run alone.

Each stack's authored JSON is embedded **verbatim** under ``stack``. The viewer
renders those values as transcribed; the derived blocks (``paths``, ``checks``,
``elements``, ``provenance_counts``, ``gaps``) sit beside them, never on top of
them. ``tests/test_viewer_projection.py`` pins the verbatim-ness.

Usage (from the repo's MAIN checkout -- ``data/`` exists only there):

    venv-win\\Scripts\\python.exe scripts\\build_viewer_projection.py

From a worktree, tracked input is read here but output must land in the main
checkout (``docs/prompts`` worktree-reality rule)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_viewer_projection.py --data-root C:\\workspace\\tolstack\\data

Stdlib only, plus this repo's own ``tolerance_stack`` package.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tolerance_stack.stack import (  # noqa: E402
    SCHEMA_HARDWARE,
    StackDefinition,
    load_stack,
)

SCHEMA_PROJECTION = "joby.tolerance_stack/viewer_projection/v0"

STACKS_DIR = Path("docs") / "tolerance_stacks"
PROJECTION_SUBDIR = Path("projections") / "viewer"
RESULTS_NAME = "results.json"

CONFIDENCE_ORDER = ["traced", "inferred", "untraced"]


# ---------------------------------------------------------------------------
# derived-flag helpers (no arithmetic on tolerances lives outside fold())
# ---------------------------------------------------------------------------


def is_incomplete(check_spec: Dict[str, Any]) -> bool:
    """Does this check announce itself as an INCOMPLETE budget?

    ``check_result/v0`` has **no** field for "this check is missing a term", so
    the flag is read off the authored prose, where the SOP's convention puts it:
    the word ``INCOMPLETE`` in the label or the guidance. That is a text
    convention, not a schema guarantee -- if a future stack says "incomplete" in
    lower case or invents another word, the viewer stops flagging it. Recorded as
    a design gap in this session's lesson; a real ``complete: false`` field on
    the check is the fix.
    """
    haystack = " ".join(
        str(check_spec.get(k) or "") for k in ("label", "guidance", "check_id")
    )
    return "INCOMPLETE" in haystack


def worst_confidence(counts: Dict[str, int]) -> Optional[str]:
    """The weakest confidence present, ``None`` if nothing was counted.

    Weakest wins: a check fed by four traced elements and one untraced one is an
    untraced result. ``no_source_ref`` is weaker still -- an element with no
    citation at all is worse than one that admits it is untraced.
    """
    if counts.get("no_source_ref"):
        return "no_source_ref"
    for name in reversed(CONFIDENCE_ORDER):
        if counts.get(name):
            return name
    return None


def confidence_of(element: Any) -> str:
    """``traced`` / ``inferred`` / ``untraced`` / ``no_source_ref`` for an element."""
    if element.source_ref is None:
        return "no_source_ref"
    return element.source_ref.confidence or "untraced"


def count_confidence(elements: List[Any]) -> Dict[str, int]:
    counts = {name: 0 for name in CONFIDENCE_ORDER}
    counts["no_source_ref"] = 0
    for element in elements:
        counts[confidence_of(element)] = counts.get(confidence_of(element), 0) + 1
    return counts


# ---------------------------------------------------------------------------
# gaps
# ---------------------------------------------------------------------------


def stack_gaps(
    raw: Dict[str, Any], stack_id: str, hardware: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """The gap list the viewer shows beside a stack.

    Two structured sources, deliberately no markdown scraping:

    1. **Terms excluded from the model** -- each check's
       ``configuration.excluded``. This is where an unsourced element that was
       *refused* rather than invented shows up (pitch-link stack: the spherical
       bearing / link-eye width, its ranked gap 1). A missing term is the most
       consequential kind of gap, so it is listed first.
    2. **Hardware-entry gaps** -- ``gaps`` from every ``hardware_entries.json``
       entry whose ``used_by`` names this stack.

    The worksheet's own ranked "Source gaps" table is *not* parsed: it is
    authored prose, and the viewer renders the whole worksheet beside the stack
    anyway. Scraping a markdown table would add a second, fragile copy.
    """
    gaps: List[Dict[str, Any]] = []
    seen_excluded = set()
    for check in raw.get("checks", []):
        excluded = (check.get("configuration") or {}).get("excluded")
        if not excluded or excluded in seen_excluded:
            continue
        seen_excluded.add(excluded)
        gaps.append(
            {
                "kind": "excluded_from_model",
                "label": "term excluded from the model",
                "text": excluded,
                "hardware_id": None,
            }
        )

    prefix = stack_id + ":"
    for entry in hardware.get("entries", []):
        used_here = any(
            str(u).startswith(prefix) for u in (entry.get("used_by") or [])
        )
        if not used_here:
            continue
        for text in entry.get("gaps") or []:
            gaps.append(
                {
                    "kind": "hardware_entry",
                    "label": "hardware entry " + str(entry.get("id")),
                    "text": text,
                    "hardware_id": entry.get("id"),
                }
            )
    return gaps


def hardware_gaps_for(element: Any, hardware: Dict[str, Any]) -> List[str]:
    """``gaps`` from the hardware entry this element's ``hardware_ref`` names."""
    if not element.hardware_ref:
        return []
    for entry in hardware.get("entries", []):
        if entry.get("id") == element.hardware_ref:
            return list(entry.get("gaps") or [])
    return []


# ---------------------------------------------------------------------------
# projection
# ---------------------------------------------------------------------------


def term_elements(stack: StackDefinition, spec: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Flatten a term list (paths expanded) to ``{element_id, sign}`` rows.

    Uses ``StackDefinition._expand``, i.e. the same expansion the fold uses, so
    the viewer's "what feeds this check" list can never disagree with the
    arithmetic it labels.
    """
    return [
        {"element_id": term.element.id, "sign": term.sign}
        for term in stack._expand(spec)
    ]


def project_stack(
    path: Path, raw: Dict[str, Any], stack: StackDefinition, hardware: Dict[str, Any]
) -> Dict[str, Any]:
    worksheet = path.parent / path.name.replace("stack_", "WORKSHEET_", 1).replace(
        ".json", ".md"
    )

    elements = []
    for element in stack.elements:
        elements.append(
            {
                "id": element.id,
                "confidence": confidence_of(element),
                "kind": element.source_ref.kind if element.source_ref else None,
                "has_source_ref": element.source_ref is not None,
                # min == max: no document gives this element a tolerance, so
                # every interval it feeds is a LOWER bound on the real spread.
                "zero_width": element.min == element.max,
                "hardware_gaps": hardware_gaps_for(element, hardware),
            }
        )

    paths = []
    for spec in raw.get("paths", []):
        rows = term_elements(stack, spec["terms"])
        counts = count_confidence([stack.element(r["element_id"]) for r in rows])
        paths.append(
            {
                "id": spec["id"],
                "label": spec.get("label", spec["id"]),
                "terms": spec["terms"],
                "element_terms": rows,
                "interval": stack.path(spec["id"]).as_dict(),
                "input_confidence": counts,
                "worst_confidence": worst_confidence(counts),
                "zero_width_inputs": [
                    r["element_id"]
                    for r in rows
                    if stack.element(r["element_id"]).min
                    == stack.element(r["element_id"]).max
                ],
            }
        )

    checks = []
    for spec in raw.get("checks", []):
        result = stack.check(spec["check_id"]).as_dict()
        rows = term_elements(stack, spec["terms"])
        counts = count_confidence([stack.element(r["element_id"]) for r in rows])
        result.update(
            {
                "terms": spec["terms"],
                "element_terms": rows,
                "incomplete": is_incomplete(spec),
                "input_confidence": counts,
                "worst_confidence": worst_confidence(counts),
                "zero_width_inputs": [
                    r["element_id"]
                    for r in rows
                    if stack.element(r["element_id"]).min
                    == stack.element(r["element_id"]).max
                ],
                "workbook_cells": spec.get("workbook_cells"),
            }
        )
        checks.append(result)

    counts = count_confidence(stack.elements)
    return {
        "id": stack.id,
        "title": stack.title,
        "units": stack.units,
        "source_file": as_posix_rel(path),
        "worksheet_file": as_posix_rel(worksheet) if worksheet.exists() else None,
        "stack": raw,
        "elements": elements,
        "paths": paths,
        "checks": checks,
        "provenance_counts": counts,
        "zero_width_count": sum(1 for e in elements if e["zero_width"]),
        "gaps": stack_gaps(raw, stack.id, hardware),
    }


def as_posix_rel(path: Path) -> str:
    """Repo-relative POSIX path, so the projection stays portable prose."""
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def build(stacks_dir: Path, hardware_path: Path) -> Dict[str, Any]:
    hardware: Dict[str, Any] = {"entries": []}
    if hardware_path.exists():
        hardware = json.loads(hardware_path.read_text(encoding="utf-8"))
        if hardware.get("schema") != SCHEMA_HARDWARE:
            raise ValueError(
                f"{hardware_path}: expected schema {SCHEMA_HARDWARE!r}, "
                f"got {hardware.get('schema')!r}"
            )

    stacks = []
    for path in sorted(stacks_dir.glob("stack_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        stacks.append(project_stack(path, raw, load_stack(path), hardware))

    return {
        "schema": SCHEMA_PROJECTION,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "built_by": "scripts/build_viewer_projection.py",
        "stacks_dir": stacks_dir.as_posix()
        if not stacks_dir.is_absolute()
        else as_posix_rel(stacks_dir),
        "stacks": stacks,
        "hardware_entries": hardware,
    }


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--data-root",
        default=str(REPO_ROOT / "data"),
        help="repo data/ dir (MAIN checkout's, if you are in a worktree)",
    )
    ap.add_argument(
        "--stacks-dir",
        default=str(REPO_ROOT / STACKS_DIR),
        help="directory holding stack_*.json + hardware_entries.json",
    )
    args = ap.parse_args(argv)

    stacks_dir = Path(args.stacks_dir)
    if not stacks_dir.is_dir():
        print(f"SKIP: no stacks dir at {stacks_dir}", file=sys.stderr)
        return 1

    out_dir = Path(args.data_root) / PROJECTION_SUBDIR
    projection = build(stacks_dir, stacks_dir / "hardware_entries.json")

    # Wipe-and-rebuild, but only this script's own file: crops.json + crops/
    # belong to build_viewer_crops.py and must survive a results rebuild.
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / RESULTS_NAME
    if out_path.exists():
        out_path.unlink()
    out_path.write_text(
        json.dumps(projection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"wrote {out_path}")
    for stack in projection["stacks"]:
        counts = stack["provenance_counts"]
        print(
            f"  {stack['id']:34s} {len(stack['elements']):2d} elements "
            f"({counts['traced']}T/{counts['inferred']}I/{counts['untraced']}U"
            + (f"/{counts['no_source_ref']}none" if counts["no_source_ref"] else "")
            + f"), {len(stack['paths'])} paths, {len(stack['checks'])} checks"
            + (
                f", {sum(1 for c in stack['checks'] if c['incomplete'])} INCOMPLETE"
                if any(c["incomplete"] for c in stack["checks"])
                else ""
            )
            + (
                f", {stack['zero_width_count']} zero-width"
                if stack["zero_width_count"]
                else ""
            )
            + ("" if stack["worksheet_file"] else ", NO WORKSHEET")
        )
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())

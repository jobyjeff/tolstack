"""Emit the markdown tables used by the docs/tolerance_stacks worksheets.

Keeps the worksheets' numbers generated rather than hand-typed, so a change to a
transcribed element value shows up in the worksheet on the next run instead of
silently disagreeing with it.

Usage:
    venv-win\\Scripts\\python.exe tests\\debug_report_tolerance_stacks.py [stack_id ...]
    venv-win\\Scripts\\python.exe tests\\debug_report_tolerance_stacks.py --compare
    venv-win\\Scripts\\python.exe tests\\debug_report_tolerance_stacks.py --ratio

``--compare`` prints the re-derivation table (Jeff's cached xlsx cells vs this
repo's fold, full precision) that both worksheets embed.

``--ratio`` prints the traced / inferred / untraced counts, per stack and
totalled, under the single definition in ``docs/SOP_TOLERANCE_STACK.md`` ("The
traced ratio"). Every document in this repo that quotes the ratio points at this
command; if a document and this output disagree, the document is wrong. Added
2026-08-06 after the headline figure sat wrong for a month (handoff
``traced_labels_and_ratio``).

IMPORTED from drawing-checker at tolstack's founding (see PROVENANCE.md), verbatim
apart from this note. Stdlib only, so it runs under this repo's venv-win as-is --
and it is the tool the SOP tells a stack author to run before writing a worksheet.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tolerance_stack import load_stack  # noqa: E402

STACKS_DIR = Path(__file__).resolve().parent.parent / "docs" / "tolerance_stacks"


def f(x: float) -> str:
    return f"{x:.4f}"


def report(path: Path) -> None:
    stack = load_stack(path)
    print(f"\n\n## {stack.title}  (`{stack.id}`)\n")

    print("### Elements\n")
    print("| # | element | role | nominal | min | max | source | conf |")
    print("|---|---------|------|---------|-----|-----|--------|------|")
    for i, e in enumerate(stack.elements, 1):
        r = e.source_ref
        where = r.document or "-"
        if r.sheet is not None and r.kind in ("drawing", "parts_list"):
            where += f" sh{r.sheet}"
        if r.zone:
            where += f" {r.zone}"
        elif r.view:
            where += f" {r.view}"
        elif r.cell:
            where += f" {r.cell}"
        print(f"| {i} | {e.name} | {e.role} | {f(e.nominal)} | {f(e.min)} | {f(e.max)} | "
              f"{where} | {r.confidence} |")

    print("\n### Paths\n")
    print("| path | workbook | nominal | WC min | WC max | RSS center | RSS ± | WC ± |")
    print("|------|----------|---------|--------|--------|------------|-------|------|")
    for pid, spec in stack.paths.items():
        iv = stack.path(pid)
        print(f"| {pid} | {spec.get('workbook_cells') or '-'} | {f(iv.nominal)} | {f(iv.min)} | "
              f"{f(iv.max)} | {f(iv.rss_center)} | {f(iv.rss_half)} | {f(iv.worst_case_half)} |")

    print("\n### Checks\n")
    print("| check | workbook | nominal | WC min | WC max | RSS min | RSS max | verdict |")
    print("|-------|----------|---------|--------|--------|---------|---------|---------|")
    for spec in stack.checks:
        c = stack.check(spec["check_id"])
        iv = c.interval
        print(f"| {c.check_id} | {spec.get('workbook_cells') or '**new**'} | {f(iv.nominal)} | "
              f"{f(iv.min)} | {f(iv.max)} | {f(iv.rss_min)} | {f(iv.rss_max)} | {c.verdict} |")


# Every result cell in the workbook, with the cached value Excel stored for it.
# (stack file stem, workbook cell, path|check id, attribute, Jeff's cached value)
WORKBOOK_CELLS = [
    ("stack_tan_link_to_pitch_plate", "E18", "path:bore_min_grip", "nominal", 20.484999999999996),
    ("stack_tan_link_to_pitch_plate", "G18", "path:bore_min_grip", "min", 19.921800000000001),
    ("stack_tan_link_to_pitch_plate", "H18", "path:bore_min_grip", "max", 20.736799999999999),
    ("stack_tan_link_to_pitch_plate", "E19", "path:bore_max_grip_thin", "nominal", 22.309799999999996),
    ("stack_tan_link_to_pitch_plate", "G19", "path:bore_max_grip_thin", "min", 21.819000000000003),
    ("stack_tan_link_to_pitch_plate", "H19", "path:bore_max_grip_thin", "max", 22.4892),
    ("stack_tan_link_to_pitch_plate", "E20", "path:bore_max_grip_thick", "nominal", 23.097199999999997),
    ("stack_tan_link_to_pitch_plate", "G20", "path:bore_max_grip_thick", "min", 22.555600000000002),
    ("stack_tan_link_to_pitch_plate", "H20", "path:bore_max_grip_thick", "max", 23.327400000000001),
    ("stack_tan_link_to_pitch_plate", "E30", "check:threads_in_bore__13", "nominal", 0.13980000000000459),
    ("stack_tan_link_to_pitch_plate", "G30", "check:threads_in_bore__13", "min", -0.36599999999999966),
    ("stack_tan_link_to_pitch_plate", "F30", "check:shank_out__13_thick", "nominal", 0.88489999999999824),
    ("stack_tan_link_to_pitch_plate", "H30", "check:shank_out__13_thick", "min", 8.9300000000001489e-2),
    ("stack_tan_link_to_pitch_plate", "E31", "check:threads_in_bore__14", "nominal", 1.740000000000002),
    ("stack_tan_link_to_pitch_plate", "G31", "check:threads_in_bore__14", "min", 1.2342000000000013),
    ("stack_tan_link_to_pitch_plate", "F31", "check:shank_out__14_thick", "nominal", -0.71529999999999916),
    ("stack_tan_link_to_pitch_plate", "H31", "check:shank_out__14_thick", "min", -1.5108999999999959),
    ("stack_tan_link_to_pitch_plate_take2", "E49", "path:total", "nominal", 20.484999999999999),
    ("stack_tan_link_to_pitch_plate_take2", "G49", "path:total", "min", 19.921799999999998),
    ("stack_tan_link_to_pitch_plate_take2", "H49", "path:total", "max", 20.736799999999999),
    ("stack_tan_link_to_pitch_plate_take2", "G54", "check:worst_case_protrusion", "min", -0.36599999999999966),
    ("stack_tan_link_to_pitch_plate_take2", "H54", "check:worst_case_protrusion", "max", 0.95700000000000429),
    ("stack_vpa_output_to_pitch_plate", "E69", "path:total", "nominal", 20.7072),
    ("stack_vpa_output_to_pitch_plate", "G69", "path:total", "min", 20.225600000000004),
    ("stack_vpa_output_to_pitch_plate", "H69", "path:total", "max", 21.007400000000001),
    ("stack_vpa_output_to_pitch_plate", "G75", "check:worst_case_shank_out", "min", -0.63660000000000139),
    ("stack_vpa_output_to_pitch_plate", "H75", "check:worst_case_shank_out", "max", 0.65319999999999823),
]


# The three stacks transcribed from 260729_sample_tol_stack.xlsx at founding.
# "The seeded stacks" / "slice 1" in every document that quotes a traced ratio
# means exactly these three -- naming the scope is half the definition.
SEEDED_STACK_FILES = [
    "stack_tan_link_to_pitch_plate.json",
    "stack_tan_link_to_pitch_plate_take2.json",
    "stack_vpa_output_to_pitch_plate.json",
]

CONFIDENCES = ("traced", "inferred", "untraced")


def _counts(paths) -> dict:
    out = {c: 0 for c in CONFIDENCES}
    out["instances"] = 0
    for p in paths:
        for e in load_stack(p).elements:
            out["instances"] += 1
            out[e.source_ref.confidence] += 1
    return out


def ratio() -> None:
    """Print the traced ratio, per the definition in docs/SOP_TOLERANCE_STACK.md.

    Denominator = **element instances**, not distinct element ids: an element
    that appears in two stacks is two instances, because each stack cites it
    separately and each citation can be right or wrong on its own. Numerator =
    instances whose ``source_ref.confidence`` is ``traced``.

    This is the command every document quoting the ratio points at. If a doc's
    number and this output disagree, the doc is wrong.
    """
    print("| stack | instances | traced | inferred | untraced |")
    print("|---|---|---|---|---|")
    for p in sorted(STACKS_DIR.glob("stack_*.json")):
        c = _counts([p])
        seeded = "*" if p.name in SEEDED_STACK_FILES else " "
        print(f"| {seeded}{p.stem.replace('stack_', '')} | {c['instances']} | "
              f"{c['traced']} | {c['inferred']} | {c['untraced']} |")

    seeded = _counts(STACKS_DIR / n for n in SEEDED_STACK_FILES)
    every = _counts(sorted(STACKS_DIR.glob("stack_*.json")))
    print("\n(* = a seeded slice-1 stack)\n")
    for label, c in (("seeded (slice 1, 3 stacks)", seeded), ("all stacks", every)):
        print(f"{label:28s} {c['traced']} traced / {c['inferred']} inferred / "
              f"{c['untraced']} untraced, out of {c['instances']} element instances")
    print(
        "\nHEADLINE (copy this shape into any doc that quotes it):\n"
        f"  {seeded['traced']} of {seeded['instances']} element instances across the three "
        f"seeded stacks are `traced`;\n"
        f"  {seeded['inferred']} are `inferred` and {seeded['untraced']} are `untraced`."
    )
    print(
        "\nNOT counted here: values a StackElement cannot hold -- material properties,\n"
        "temperature scenarios, stiffness ratios. Report those separately (SOP)."
    )


def compare() -> None:
    """Print the re-derivation table: Jeff's cached cell vs our fold, full precision."""
    print("| stack | cell | quantity | Jeff (xlsx cached) | re-derived | delta | |")
    print("|---|---|---|---|---|---|---|")
    worst = 0.0
    for stem, cell, target, attr, jeff in WORKBOOK_CELLS:
        stack = load_stack(STACKS_DIR / f"{stem}.json")
        kind, name = target.split(":", 1)
        iv = stack.path(name) if kind == "path" else stack.check(name).interval
        got = getattr(iv, attr)
        delta = abs(got - jeff)
        worst = max(worst, delta)
        mark = "OK" if delta < 1e-6 else "**MISMATCH**"
        print(f"| {stem.replace('stack_', '')} | {cell} | {name}.{attr} | "
              f"{jeff!r} | {got!r} | {delta:.2e} | {mark} |")
    print(f"\n{len(WORKBOOK_CELLS)} cells compared; largest delta {worst:.3e}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if args and args[0] == "--compare":
        compare()
    elif args and args[0] == "--ratio":
        ratio()
    else:
        for p in sorted(STACKS_DIR.glob("stack_*.json")):
            if not args or p.stem in args:
                report(p)

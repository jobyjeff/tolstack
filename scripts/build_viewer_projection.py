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
``elements``, ``materials``, ``provenance_counts``, ``gaps``) sit beside them,
never on top of them. ``tests/test_viewer_projection.py`` pins the verbatim-ness.

A stack whose ``archetype`` **generates** its checks is loaded by that
archetype's own loader (``ARCHETYPE_LOADERS``), so the generated term lists --
coefficients and all -- are produced once, here, by the same Python the tests
pin. The viewer never re-derives them.

Usage (from the repo's MAIN checkout -- ``data/`` exists only there):

    venv-win\\Scripts\\python.exe scripts\\build_viewer_projection.py

From a worktree, tracked input is read here but output must land in the main
checkout (``docs/prompts`` worktree-reality rule)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_viewer_projection.py --data-root C:\\workspace\\tolstack\\data

That output directory is **shared by every live worktree**, so this script
stamps which tree it built from and **refuses** to overwrite a projection built
from a tree this one does not contain -- ``scripts/projection_provenance.py``
holds both, and ``--allow-older-tree`` overrides the refusal.

Stdlib only, plus this repo's own ``tolerance_stack`` package.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
# This script's own directory, so `projection_provenance` imports whether we were
# started as a script (sys.path[0] is scripts/ already) or imported by a test.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import projection_provenance as prov  # noqa: E402
from tolerance_stack.stack import (  # noqa: E402
    SCHEMA_HARDWARE,
    StackDefinition,
    load_stack,
)
from tolerance_stack.thermal import load_thermal_fit_stack  # noqa: E402

SCHEMA_PROJECTION = "joby.tolerance_stack/viewer_projection/v0"

STACKS_DIR = Path("docs") / "tolerance_stacks"
PROJECTION_SUBDIR = Path("projections") / "viewer"
RESULTS_NAME = "results.json"
MATERIALS_NAME = "materials.json"

CONFIDENCE_ORDER = ["traced", "inferred", "untraced"]

#: Archetypes whose checks are **generated** by their own loader rather than
#: authored in the stack file, and the loader that generates them.
#:
#: This dispatch is the whole reason a ``thermal_fit`` stack reaches the viewer
#: with results at all: its ``checks`` array is empty *by design* and
#: ``thermal.load_thermal_fit_stack()`` refuses a hand-written one, so plain
#: ``load_stack()`` projects an elements table and nothing else (the defect
#: ``docs/issues/ISSUE_20260806_viewer_does_not_render_generated_checks.md``
#: records). The checks are generated exactly once, **here, in Python**, by the
#: same function ``tests/test_hub_bearing_thermal_fit.py`` pins -- never
#: re-derived in JS. ``apps/viewer/`` still adds and compares nothing; it renders
#: the term lists, coefficients included, that this script hands it.
ARCHETYPE_LOADERS = {"thermal_fit": load_thermal_fit_stack}

# Fold outputs are rounded here, on the Python side, where the arithmetic
# already lives. Element nominal/min/max are NEVER touched -- those are
# transcribed values and ride through verbatim. Rounding the derived floats is
# what lets the viewer print a number with `String(n)` and no rounding of its
# own: 1e-6 mm is a nanometre, and the alternative is JS deciding how to display
# `-8.193899999999999`, which is a small arithmetic decision in the one place
# this repo has decided not to make any.
INTERVAL_DECIMALS = 6

# A term's coefficient is rounded for display too, and for the same reason -- but
# with more places, because a coefficient is a *weight*, not a millimetre. Every
# weight the `thermal_fit` archetype generates is a small integer times a soak
# factor `1 + dT * alpha`, whose exact decimal expansion terminates inside 9
# places for every CTE in `materials.json`; so 9 removes the binary noise
# (`0.19999999999999996` for a plain `1 - k`) without touching a digit the
# arithmetic depended on. It also matches the `%.9f` column of
# `tests/debug_report_thermal_fit.py --terms`, so the two can be compared digit
# for digit. The fold itself always used the UNROUNDED weight; at 1e-9 relative
# that is far inside the 6 dp the intervals beside it are printed to, so a
# reviewer recomputing from the displayed weights lands on the displayed numbers.
COEFFICIENT_DECIMALS = 9


# ---------------------------------------------------------------------------
# derived-flag helpers (no arithmetic on tolerances lives outside fold())
# ---------------------------------------------------------------------------


def is_sensitivity(check_spec: Dict[str, Any]) -> bool:
    """Is this check a **sensitivity probe** rather than a result?

    Like completeness (and unlike the prose search that used to detect it), this
    is structured: the ``thermal_fit`` archetype writes
    ``configuration.sensitivity`` on the checks it generates at ``k = 0`` and
    ``k = 1``, whose own guidance opens "NOT A
    RESULT". They exist so a reader can see how much of stage 2 rests on an
    undocumented stiffness estimate -- and a probe rendered as an ordinary
    pass/fail card beside the results would be read as a second opinion about
    the joint, which is the opposite of what it is. So the flag rides through to
    the viewer and the card says so.
    """
    value = str((check_spec.get("configuration") or {}).get("sensitivity") or "")
    return value.strip().lower() not in ("", "false", "0", "no", "none")


def rounded(interval: Dict[str, float]) -> Dict[str, float]:
    """An :meth:`Interval.as_dict` with every float rounded for display."""
    return {k: round(v, INTERVAL_DECIMALS) for k, v in interval.items()}


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


def confidence_of_ref(source_ref: Any) -> str:
    """``traced`` / ``inferred`` / ``untraced`` / ``no_source_ref`` for a citation."""
    if source_ref is None:
        return "no_source_ref"
    return source_ref.confidence or "untraced"


def confidence_of(element: Any) -> str:
    """The same, for an element -- read off its own ``source_ref``."""
    return confidence_of_ref(element.source_ref)


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
    checks: List[Dict[str, Any]], stack_id: str, hardware: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """The gap list the viewer shows beside a stack.

    Two structured sources, deliberately no markdown scraping:

    1. **Terms excluded from the model** -- each check's ``excluded_terms``,
       the schema field (it was ``configuration.excluded``, a free-text value in
       a free-text dict, until 2026-08-13). This is where an unsourced element
       that was *refused* rather than invented shows up (pitch-link stack: the
       spherical bearing / link-eye width, its ranked gap 1). A missing term is
       the most consequential kind of gap, so it is listed first. ``checks`` is
       the *projected* check list, not ``raw["checks"]``: for a generated-check
       archetype the file's array is empty, and a gap its loader declared would
       otherwise be dropped. Reading the schema field also means the gap list
       and the striped card can no longer disagree -- both come from the one
       ``CheckResult`` invariant, which refuses a check that names an excluded
       term without declaring itself incomplete.
    2. **Hardware-entry gaps** -- ``gaps`` from every ``hardware_entries.json``
       entry whose ``used_by`` names this stack.

    The worksheet's own ranked "Source gaps" table is *not* parsed: it is
    authored prose, and the viewer renders the whole worksheet beside the stack
    anyway. Scraping a markdown table would add a second, fragile copy.
    """
    gaps: List[Dict[str, Any]] = []
    seen_excluded = set()
    for check in checks:
        for excluded in check.get("excluded_terms") or []:
            if excluded in seen_excluded:
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
    """Flatten a term list (paths expanded) to ``{element_id, sign, coefficient}``.

    Uses ``StackDefinition._expand``, i.e. the same expansion the fold uses, so
    the viewer's "what feeds this check" list can never disagree with the
    arithmetic it labels.

    ``coefficient`` is here because dropping it was **worse than showing
    nothing**: a ``thermal_fit`` check weights a sleeve wall by ``2k`` times a
    soak factor, and a term list that renders that as a bare ``+ sleeve_wall``
    looks readable and is wrong -- on the one surface whose job is letting a
    reviewer read every sign. ``sign`` stays the field direction lives in
    (``Term.coefficient`` is a positive magnitude), so the pair reads
    ``sign * coefficient`` exactly as ``Term.weight`` does.
    """
    return [
        {
            "element_id": term.element.id,
            "sign": term.sign,
            "coefficient": round(term.coefficient, COEFFICIENT_DECIMALS),
        }
        for term in stack._expand(spec)
    ]


def load_for_projection(path: Path, raw: Dict[str, Any]) -> StackDefinition:
    """Load a stack with the loader its ``archetype`` names, else ``load_stack``.

    An ``archetype`` this script has no loader for falls back to ``load_stack``
    and therefore projects whatever the file authored -- which for a
    generated-check archetype is nothing. That is reported rather than rendered
    as "no checks": see ``checks_generated_not_rendered`` in
    :func:`project_stack`.
    """
    loader = ARCHETYPE_LOADERS.get(raw.get("archetype"))
    return loader(path) if loader else load_stack(path)


def worksheet_for(path: Path, raw: Dict[str, Any]) -> tuple:
    """``(worksheet path | None, how)`` for a stack file.

    Two rules, in this order:

    1. **A declared worksheet wins.** ``provenance.worksheet`` in the stack file
       is an explicit statement by the author and overrides the naming
       convention. One worksheet serving several stacks is a real pattern:
       ``WORKSHEET_hub_bearing_thermal_fit.md`` covers both
       ``..._thermal_fit_m1`` and ``..._m2`` (they are one analysis, and the M1
       stack exists to be read against the M2 one), and both files already said
       so here -- so this honours the field they authored rather than inventing
       a second one.
    2. **Otherwise match by name**, ``stack_X.json`` -> ``WORKSHEET_X.md``, and
       report ``None`` when there is none. Declining to guess stays the default:
       ``tan_link_to_pitch_plate_take2`` gets no worksheet rather than take-1's.

    A declared path is resolved against the stack file's own directory and then
    the repo root, and **never against the process cwd** -- the same rule
    ``build_viewer_crops.export_pdf_path`` learned the hard way (a cwd-dependent
    resolution passes in a worktree and fails in the main checkout). A declared
    worksheet that resolves nowhere **raises**: the author asserted the file
    exists, and a silent fall-through would render as "no worksheet" while the
    JSON says otherwise.
    """
    declared = (raw.get("provenance") or {}).get("worksheet")
    if declared:
        candidate = Path(declared)
        tried = ([candidate] if candidate.is_absolute()
                 else [path.parent / candidate, REPO_ROOT / candidate])
        for resolved in tried:
            if resolved.exists():
                return resolved, "declared"
        raise FileNotFoundError(
            f"{path}: provenance.worksheet names {declared!r}, which is at none of "
            + ", ".join(str(t) for t in tried)
        )
    by_name = path.parent / path.name.replace("stack_", "WORKSHEET_", 1).replace(
        ".json", ".md"
    )
    return (by_name, "by_name") if by_name.exists() else (None, None)


def stack_materials(
    stack: StackDefinition, materials_raw: Dict[str, Any]
) -> tuple:
    """``(material rows, {element_id: material_id})`` for an archetype with materials.

    Empty for every stack that has none -- a linear grip stack has no material
    property in it, and an empty list is what tells the viewer not to draw the
    section.

    A thermal fit's answer is a function of a **CTE difference**, and until now
    not one CTE reached this surface: the elements table showed four diameters
    whose relative growth is the entire mechanism. Each row carries the authored
    ``materials.json`` entry verbatim (same discipline as the embedded stack)
    beside its derived sourcing flags, because the CTEs are the least-traced
    numbers in the stack -- ``ARCHETYPE_thermal_fit.md`` caveat 4 -- and a
    coefficient of ``2.0010712`` is only auditable by a reader who can see the
    ``alpha`` and the ``dT`` it came from.
    """
    spec = getattr(stack, "thermal_fit", None)
    entries = getattr(stack, "materials", None)
    if spec is None or not entries:
        return [], {}

    element_material: Dict[str, str] = {}
    used: Dict[str, List[str]] = {}
    for chain in spec.chains:
        for element_id, material_id in (
            (chain.hub_bore_element, chain.hub_material),
            (chain.sleeve_bore_element, chain.sleeve_material),
            (chain.sleeve_wall_element, chain.sleeve_material),
            (chain.bearing_od_element, chain.bearing_material),
        ):
            element_material[element_id] = material_id
            used.setdefault(material_id, [])
            if element_id not in used[material_id]:
                used[material_id].append(element_id)

    rows = []
    for material_id, element_ids in used.items():
        entry = entries[material_id]
        rows.append(
            {
                "id": material_id,
                "confidence": confidence_of_ref(entry.values_source),
                "kind": entry.values_source.kind if entry.values_source else None,
                "designation_confidence": confidence_of_ref(entry.designation_source),
                "used_by_elements": element_ids,
                "material": materials_raw.get(material_id),
            }
        )
    return rows, element_material


def project_stack(
    path: Path, raw: Dict[str, Any], hardware: Dict[str, Any],
    materials_raw: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    stack = load_for_projection(path, raw)
    generated = raw.get("archetype") in ARCHETYPE_LOADERS
    worksheet, worksheet_source = worksheet_for(path, raw)
    materials, element_material = stack_materials(stack, materials_raw or {})

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
                # Which material this element's feature is cut in -- null for
                # every stack whose archetype has no materials. The material is a
                # property of the CHAIN, not of the element, so it can only be
                # known here, after the archetype's loader has run.
                "material": element_material.get(element.id),
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
                "interval": rounded(stack.path(spec["id"]).as_dict()),
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
    # `stack.checks`, NOT `raw["checks"]`: for a generated-check archetype the
    # file's array is empty and the loader put the real one here. Authored stacks
    # are unaffected -- load_stack() sets stack.checks from the file.
    for spec in stack.checks:
        outcome = stack.check(spec["check_id"])
        result = outcome.as_dict()
        result.update(rounded(outcome.interval.as_dict()))
        rows = term_elements(stack, spec["terms"])
        counts = count_confidence([stack.element(r["element_id"]) for r in rows])
        result.update(
            {
                "terms": spec["terms"],
                "element_terms": rows,
                # `complete` / `excluded_terms` / `verdict_scope` are already in
                # `result` -- they come out of CheckResult.as_dict(), which is
                # the point: the viewer's striped card now keys off the same
                # validated field the arithmetic side carries, not off a string
                # this script went looking for in the prose.
                "sensitivity": is_sensitivity(spec),
                "generated": generated,
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
        "archetype": raw.get("archetype"),
        # Where these checks came from, at value level: `generated` means the
        # archetype's own loader built them from its block (their term lists are
        # NOT in the JSON, so the viewer labels them and points at the report
        # that prints the same table), `authored` means they were read from the
        # file as written.
        "checks_source": "generated" if generated else "authored",
        # The honesty guard, narrowed to what is still true. It used to fire for
        # `thermal_fit`, because this script called plain load_stack() and a
        # generated-check stack therefore projected zero checks -- and a viewer
        # rendering that as "no checks" would be lying by omission on the one
        # surface built to stop exactly that
        # (docs/issues/ISSUE_20260806_viewer_does_not_render_generated_checks.md).
        # ARCHETYPE_LOADERS closed that gap, so what remains is the case it
        # cannot: a stack declaring an archetype THIS script has no loader for.
        # That still projects nothing and must still say so rather than "none".
        "checks_generated_not_rendered": bool(raw.get("archetype") and not checks),
        "source_file": as_posix_rel(path),
        "worksheet_file": as_posix_rel(worksheet) if worksheet else None,
        # `declared` (provenance.worksheet) or `by_name`, so the viewer can say
        # which rule found the sheet it is showing beside the numbers.
        "worksheet_source": worksheet_source,
        "stack": raw,
        "elements": elements,
        "materials": materials,
        "paths": paths,
        "checks": checks,
        "provenance_counts": counts,
        "zero_width_count": sum(1 for e in elements if e["zero_width"]),
        "gaps": stack_gaps(checks, stack.id, hardware),
    }


def as_posix_rel(path: Path) -> str:
    """Repo-relative POSIX path, so the projection stays portable prose."""
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


BUILT_BY = "scripts/build_viewer_projection.py"


def build(
    stacks_dir: Path,
    hardware_path: Path,
    provenance: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    hardware: Dict[str, Any] = {"entries": []}
    if hardware_path.exists():
        hardware = json.loads(hardware_path.read_text(encoding="utf-8"))
        if hardware.get("schema") != SCHEMA_HARDWARE:
            raise ValueError(
                f"{hardware_path}: expected schema {SCHEMA_HARDWARE!r}, "
                f"got {hardware.get('schema')!r}"
            )

    # The authored material entries, by id, carried verbatim into the stacks that
    # cite them (the archetype's loader validates them; this is the display copy).
    materials_raw: Dict[str, Any] = {}
    materials_path = stacks_dir / MATERIALS_NAME
    if materials_path.exists():
        materials_raw = {
            entry["id"]: entry
            for entry in json.loads(materials_path.read_text(encoding="utf-8"))["materials"]
        }

    stacks = []
    for path in sorted(stacks_dir.glob("stack_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        stacks.append(project_stack(path, raw, hardware, materials_raw))

    if provenance is None:
        provenance = prov.stamp(REPO_ROOT, stacks_dir, BUILT_BY)

    return {
        "schema": SCHEMA_PROJECTION,
        # `built_at` here and `provenance.built_at` are the same instant, kept
        # both places on purpose: the top-level pair is what the viewer's banner
        # and every existing reader already reads, and renaming a field other
        # consumers read to tidy up a duplication would be a worse trade.
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        # Repo-RELATIVE, unchanged, and therefore useless for saying which tree
        # built this: `docs/tolerance_stacks` is the same string in every
        # worktree in existence. `provenance.stacks_dir` is the resolved
        # absolute one. Kept because it is a published field.
        "stacks_dir": stacks_dir.as_posix()
        if not stacks_dir.is_absolute()
        else as_posix_rel(stacks_dir),
        # Which TREE built this file -- see scripts/projection_provenance.py.
        prov.PROVENANCE_KEY: provenance,
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
    ap.add_argument(
        "--allow-older-tree",
        action="store_true",
        help="overwrite a projection built from a tree this one does not contain "
        "(the gate refuses by default -- see scripts/projection_provenance.py)",
    )
    args = ap.parse_args(argv)

    stacks_dir = Path(args.stacks_dir)
    if not stacks_dir.is_dir():
        print(f"SKIP: no stacks dir at {stacks_dir}", file=sys.stderr)
        return 1

    out_dir = Path(args.data_root) / PROJECTION_SUBDIR
    out_path = out_dir / RESULTS_NAME

    # The gate runs BEFORE the build, not before the write: refusing after a
    # minute of work would still be correct and would still read as a crash.
    provenance = prov.stamp(REPO_ROOT, stacks_dir, BUILT_BY)
    rebuild_command = (
        f"python scripts\\build_viewer_projection.py "
        f"--data-root {Path(args.data_root)}"
    )
    try:
        notes = prov.guard(
            out_path, provenance, REPO_ROOT, args.allow_older_tree, rebuild_command
        )
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3
    for line in notes:
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    projection = build(stacks_dir, stacks_dir / "hardware_entries.json", provenance)

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
                f" GENERATED from `{stack['archetype']}`"
                if stack["checks_source"] == "generated"
                else ""
            )
            + (
                f", {sum(1 for c in stack['checks'] if c['sensitivity'])} SENSITIVITY"
                if any(c["sensitivity"] for c in stack["checks"])
                else ""
            )
            + (
                f", {sum(1 for c in stack['checks'] if c['verdict_scope'] == 'budget')}"
                " BUDGET-SCOPE"
                if any(c["verdict_scope"] == "budget" for c in stack["checks"])
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

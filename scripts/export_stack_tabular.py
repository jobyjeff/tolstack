"""Export a stack (or a topology study) to a spreadsheet-shaped CSV.

Jeff sometimes needs a stack in Excel -- to share with others, for cert
documentation, or as insurance if the tolstack buildout stalls and he has to
fall back to spreadsheet review. This script is that export, built
**deterministically from the stack/study JSON and the one
:func:`~tolerance_stack.stack.fold`** -- never from the viewer's DOM, and never
by computing anything itself: every number in the output is either transcribed
verbatim from the authored file or came out of ``fold()``/``summarize()``, the
same functions ``apps/viewer/`` reads. See ARCHITECTURE.md, "Why one ``fold()``".

Format: **CSV, not xlsx.** This repo already made that call for spreadsheet
tooling (``tests/debug_dump_tol_stack_xlsx.py``'s header note, and
``requirements.txt``'s "deliberately nothing else"): stdlib ``csv`` opens
losslessly in Excel for this shape of data, and reaching for ``openpyxl`` is not
worth a new dependency unless something Jeff needs -- multiple real sheets,
cell number formatting for a cert artifact -- actually requires it. Written
``utf-8-sig`` (a BOM) so Excel reads ``⌀``/``±``/``µ`` without a mis-detected
codepage; a pinned test exercises the pitch-link stack's own ``±``/``⌀``
callouts.

One file, two blocks, never interleaved (the handoff's requirement): a small
key/value **provenance** header, a blank line, the **ELEMENTS** table (one row
per element/dimension), a blank line, and the **FOLD RESULTS** table (paths,
checks or the study total -- whichever the stack/study defines). A gap-bearing
or failing stack's ``untraced`` confidences and ``excluded_terms`` ride straight
through into those same two tables; nothing here hides them.

Column design, and the one judgment call in it
------------------------------------------------
The handoff asks for a ``sign``/``coefficient`` column on the element row, and a
raw :class:`~tolerance_stack.stack.StackElement` carries neither -- those live on
:class:`~tolerance_stack.stack.Term`, which exists only inside a path or a
check's term list. For a **study**, this is not a judgment call at all: a
topology chain (:func:`~tolerance_stack.topology.traverse`) uses every selected
edge's dimension exactly once, so its sign and transform ratio are unambiguous.

For a **stack**, an element can in principle appear in more than one check with
different signs (none of the seeded stacks do). This script resolves that by
scanning **checks first, in file order, then paths**, and takes the first
sign/coefficient pair found for each element id -- recorded in the
``term_context`` column so a reader can see which check or path it came from.
An element referenced by neither carries an empty sign/coefficient rather than
a guessed ``+1``, because inventing a direction nothing in the file states would
be exactly the thing this repo's one rule forbids.

Usage:
    venv-win\\Scripts\\python.exe scripts\\export_stack_tabular.py \\
        --stack pitch_link_to_pitch_plate --out out.csv

    venv-win\\Scripts\\python.exe scripts\\export_stack_tabular.py \\
        --study pitch_system_blade_angle_worst --out out.csv

    venv-win\\Scripts\\python.exe scripts\\export_stack_tabular.py \\
        --all --out-dir data/exports/tabular

``--stack``/``--study`` take either a path to the JSON file or a bare id
(resolved as ``stack_<id>.json`` / ``study_<id>.json`` under
``--stacks-dir``/``--topologies-dir``). Stdlib only.

Why no projection-provenance **guard** here, unlike the viewer builders
------------------------------------------------------------------------
``scripts/projection_provenance.py``'s refuse-to-overwrite gate exists because
``data/projections/viewer/*.json`` is **one file shared by every live
worktree**, wiped and rebuilt in place, so two sessions racing on it is a real
failure mode. This script reads the *committed* stack/topology JSON directly --
never a shared, gitignored projection -- and writes wherever ``--out``/
``--out-dir`` says, a new file per invocation rather than one canonical one
everyone reads. There is nothing here for the ancestry gate to protect. What
this script does take from that module is :func:`projection_provenance.stamp`,
purely to embed *which tree produced this artifact* in the provenance header,
which is deliverable 3's own requirement (a cert artifact must be traceable).
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import projection_provenance as prov  # noqa: E402
from tolerance_stack.stack import StackDefinition, load_stack  # noqa: E402
from tolerance_stack.thermal import load_thermal_fit_stack  # noqa: E402
from tolerance_stack.topology import load_study, load_topology, summarize  # noqa: E402

SCHEMA_EXPORT = "joby.tolerance_stack/tabular_export/v0"
BUILT_BY = "scripts/export_stack_tabular.py"

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"

#: Archetypes whose checks are GENERATED by their own loader, not authored in the
#: file -- the same dispatch `scripts/build_viewer_projection.py` uses, kept as
#: its own one-line copy here rather than importing that (viewer-specific)
#: module, so this script's only dependency on another script is
#: `projection_provenance`.
ARCHETYPE_LOADERS = {"thermal_fit": load_thermal_fit_stack}

#: The element/dimension table's columns, **in the order they are written**.
#: A module-level constant, never an inline literal -- the house rule
#: (CLAUDE.md, "a field vocabulary is a module-level constant").
ELEMENT_COLUMNS = (
    "context_kind",      # "stack" or "study"
    "context_id",        # the stack id or study id
    "element_id",
    "description",
    "kind",               # source_ref.kind, empty if uncited
    "part_drawing",       # source_ref.document
    "nominal",
    "min",
    "max",
    "sign",
    "coefficient",
    "term_context",       # where sign/coefficient came from: "check:<id>", "path:<id>", "study_chain", or empty
    "lmc",
    "mmc",
    "plus_minus",
    "confidence",         # source_ref.confidence, empty if uncited -- NEVER invented
    "source_ref",         # the whole citation, as compact JSON -- nothing lost in the trip
    "note",
)

#: The fold-results table's columns. One row per path, per check, or (for a
#: study export) one row for the study's own total.
FOLD_COLUMNS = (
    "row_kind",           # "path", "check", or "study"
    "id",
    "label",
    "units",
    "criterion",          # checks only
    "verdict",            # checks only
    "verdict_scope",      # checks only
    "complete",           # checks only
    "excluded_terms",     # checks only, ';'-joined
    "nominal",
    "worst_case_min",
    "worst_case_max",
    "worst_case_half",
    "rss_center",
    "rss_half",
    "rss_min",
    "rss_max",
)


# ---------------------------------------------------------------------------
# resolving CLI paths
# ---------------------------------------------------------------------------


def resolve_stack_path(spec: str, stacks_dir: Path) -> Path:
    path = Path(spec)
    if path.exists():
        return path
    candidate = stacks_dir / f"stack_{spec}.json"
    if candidate.exists():
        return candidate
    raise FileNotFoundError(
        f"--stack {spec!r} is not a path and {candidate} does not exist either"
    )


def resolve_study_path(spec: str, topologies_dir: Path) -> Path:
    path = Path(spec)
    if path.exists():
        return path
    candidate = topologies_dir / f"study_{spec}.json"
    if candidate.exists():
        return candidate
    raise FileNotFoundError(
        f"--study {spec!r} is not a path and {candidate} does not exist either"
    )


def as_posix_rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


# ---------------------------------------------------------------------------
# loading a stack (dispatching on its declared archetype)
# ---------------------------------------------------------------------------


def load_for_export(path: Path) -> StackDefinition:
    raw = json.loads(path.read_text(encoding="utf-8"))
    loader = ARCHETYPE_LOADERS.get(raw.get("archetype"))
    return loader(path) if loader else load_stack(path)


# ---------------------------------------------------------------------------
# element rows
# ---------------------------------------------------------------------------


def element_term_context(stack: StackDefinition) -> Dict[str, Tuple[int, float, str]]:
    """``{element_id: (sign, coefficient, "check:<id>" | "path:<id>")}``.

    Checks first, in file order, then paths -- the first hit wins. See the
    module docstring's "the one judgment call" for why.
    """
    context: Dict[str, Tuple[int, float, str]] = {}
    for check_spec in stack.checks:
        for term in stack._expand(check_spec["terms"]):
            context.setdefault(
                term.element.id,
                (term.sign, term.coefficient, f"check:{check_spec['check_id']}"),
            )
    for path_id, path_spec in stack.paths.items():
        for term in stack._expand(path_spec["terms"]):
            context.setdefault(
                term.element.id, (term.sign, term.coefficient, f"path:{path_id}")
            )
    return context


def source_ref_json(source_ref: Any) -> str:
    if source_ref is None:
        return ""
    d = {
        k: v for k, v in vars(source_ref).items()
        if v is not None and not (isinstance(v, tuple) and not v)
    }
    if "export" in d and d["export"] is not None:
        d["export"] = {k: v for k, v in vars(d["export"]).items() if v not in (None, ())}
        if d["export"].get("runs"):
            d["export"]["runs"] = [vars(r) for r in d["export"]["runs"]]
    return json.dumps(d, sort_keys=True, ensure_ascii=False)


def element_row(
    context_kind: str,
    context_id: str,
    element: Any,           # StackElement or topology.Dimension
    sign: Optional[int],
    coefficient: Optional[float],
    term_context: str,
) -> Dict[str, Any]:
    source_ref = element.source_ref
    return {
        "context_kind": context_kind,
        "context_id": context_id,
        "element_id": element.id,
        "description": element.name,
        "kind": source_ref.kind if source_ref else "",
        "part_drawing": source_ref.document if source_ref else "",
        "nominal": element.nominal,
        "min": element.min,
        "max": element.max,
        "sign": sign if sign is not None else "",
        "coefficient": coefficient if coefficient is not None else "",
        "term_context": term_context,
        "lmc": element.lmc if element.lmc is not None else "",
        "mmc": element.mmc if element.mmc is not None else "",
        "plus_minus": element.plus_minus if element.plus_minus is not None else "",
        "confidence": source_ref.confidence if source_ref else "",
        "source_ref": source_ref_json(source_ref),
        "note": element.note or "",
    }


def element_rows_for_stack(stack: StackDefinition) -> List[Dict[str, Any]]:
    context = element_term_context(stack)
    rows = []
    for element in stack.elements:
        sign, coefficient, term_context = context.get(element.id, (None, None, ""))
        rows.append(
            element_row("stack", stack.id, element, sign, coefficient, term_context)
        )
    return rows


def element_rows_for_study(study_id: str, chain: Sequence[Any]) -> List[Dict[str, Any]]:
    rows = []
    for contribution in chain:
        rows.append(
            element_row(
                "study", study_id, contribution.dimension, contribution.sign,
                contribution.transform.ratio,
                f"study_chain:{contribution.transform.id}",
            )
        )
    return rows


# ---------------------------------------------------------------------------
# fold-results rows
# ---------------------------------------------------------------------------


def fold_row(row_kind: str, row_id: str, label: str, units: str,
             interval_dict: Dict[str, float], **extra: Any) -> Dict[str, Any]:
    row = {
        "row_kind": row_kind, "id": row_id, "label": label, "units": units,
        "criterion": "", "verdict": "", "verdict_scope": "", "complete": "",
        "excluded_terms": "",
    }
    row.update(extra)
    row.update(interval_dict)
    return row


def fold_rows_for_stack(stack: StackDefinition) -> List[Dict[str, Any]]:
    rows = []
    for path_id, path_spec in stack.paths.items():
        interval = stack.path(path_id)
        rows.append(
            fold_row("path", path_id, path_spec.get("label", path_id), stack.units,
                     interval.as_dict())
        )
    for check_spec in stack.checks:
        result = stack.check(check_spec["check_id"])
        rows.append(
            fold_row(
                "check", result.check_id, result.label, result.units,
                result.interval.as_dict(),
                criterion=result.criterion, verdict=result.verdict,
                verdict_scope=result.verdict_scope, complete=result.complete,
                excluded_terms="; ".join(result.excluded_terms),
            )
        )
    return rows


def fold_rows_for_study(study_id: str, title: str, units: str,
                         interval_dict: Dict[str, float]) -> List[Dict[str, Any]]:
    return [fold_row("study", study_id, title, units, interval_dict)]


# ---------------------------------------------------------------------------
# writing
# ---------------------------------------------------------------------------


def provenance_header_rows(input_path: Path, provenance: Dict[str, Any]) -> List[List[str]]:
    return [
        ["schema", SCHEMA_EXPORT],
        ["exported_at", provenance["built_at"]],
        ["exported_by", BUILT_BY],
        ["source_file", as_posix_rel(input_path)],
        ["branch", str(provenance.get("branch"))],
        ["head_sha", str(provenance.get("head_sha"))],
        ["dirty", str(provenance.get("dirty"))],
    ]


def write_export(
    out_path: Path,
    input_path: Path,
    element_rows: List[Dict[str, Any]],
    fold_rows: List[Dict[str, Any]],
    provenance: Dict[str, Any],
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh)
        for row in provenance_header_rows(input_path, provenance):
            writer.writerow(row)
        writer.writerow([])
        writer.writerow(["ELEMENTS"])
        writer.writerow(ELEMENT_COLUMNS)
        for row in element_rows:
            writer.writerow([row[c] for c in ELEMENT_COLUMNS])
        writer.writerow([])
        writer.writerow(["FOLD RESULTS"])
        writer.writerow(FOLD_COLUMNS)
        for row in fold_rows:
            writer.writerow([row[c] for c in FOLD_COLUMNS])


# ---------------------------------------------------------------------------
# per-target export
# ---------------------------------------------------------------------------


def export_stack(path: Path, out_path: Path, provenance: Dict[str, Any]) -> StackDefinition:
    stack = load_for_export(path)
    element_rows = element_rows_for_stack(stack)
    fold_rows = fold_rows_for_stack(stack)
    write_export(out_path, path, element_rows, fold_rows, provenance)
    return stack


def export_study(
    path: Path, out_path: Path, provenance: Dict[str, Any], topologies_dir: Path
) -> None:
    study = load_study(path)
    topology_path = topologies_dir / f"topology_{study.topology}.json"
    if not topology_path.exists():
        raise FileNotFoundError(
            f"study {study.id!r} names topology {study.topology!r}, which is not "
            f"at {topology_path}"
        )
    topology = load_topology(topology_path, repo_root=REPO_ROOT)
    result = summarize(topology, study)
    element_rows = element_rows_for_study(study.id, result.chain)
    fold_rows = fold_rows_for_study(study.id, study.title, result.units,
                                     result.interval.as_dict())
    write_export(out_path, path, element_rows, fold_rows, provenance)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--stack", help="a stack JSON path, or a bare id under --stacks-dir")
    group.add_argument("--study", help="a study JSON path, or a bare id under --topologies-dir")
    group.add_argument("--all", action="store_true",
                        help="export every stack_*.json under --stacks-dir")
    ap.add_argument("--stacks-dir", default=str(STACKS_DIR),
                     help="directory holding stack_*.json (default: docs/tolerance_stacks)")
    ap.add_argument("--topologies-dir", default=str(TOPOLOGIES_DIR),
                     help="directory holding topology_*.json / study_*.json")
    ap.add_argument("--out", help="output CSV path (required for --stack / --study)")
    ap.add_argument("--out-dir", help="output directory, one <id>.csv per stack (required for --all)")
    args = ap.parse_args(argv)

    stacks_dir = Path(args.stacks_dir)
    topologies_dir = Path(args.topologies_dir)

    if args.all:
        if not args.out_dir:
            ap.error("--all requires --out-dir")
        out_dir = Path(args.out_dir)
        provenance = prov.stamp(REPO_ROOT, stacks_dir, BUILT_BY, source_key="stacks_dir")
        count = 0
        for path in sorted(stacks_dir.glob("stack_*.json")):
            stack = export_stack(path, out_dir / f"{path.stem[len('stack_'):]}.csv",
                                  provenance)
            print(f"wrote {out_dir / (path.stem[len('stack_'):] + '.csv')} "
                  f"({len(stack.elements)} elements)")
            count += 1
        if count == 0:
            print(f"SKIP: no stack_*.json under {stacks_dir}", file=sys.stderr)
            return 1
        return 0

    if not args.out:
        ap.error("--stack / --study requires --out")
    out_path = Path(args.out)

    if args.stack:
        path = resolve_stack_path(args.stack, stacks_dir)
        provenance = prov.stamp(REPO_ROOT, path, BUILT_BY, source_key="source_path")
        stack = export_stack(path, out_path, provenance)
        print(f"wrote {out_path} ({len(stack.elements)} elements, "
              f"{len(stack.paths)} paths, {len(stack.checks)} checks)")
        return 0

    path = resolve_study_path(args.study, topologies_dir)
    provenance = prov.stamp(REPO_ROOT, path, BUILT_BY, source_key="source_path")
    export_study(path, out_path, provenance, topologies_dir)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())

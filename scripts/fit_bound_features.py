"""Turn every committed binding into a fitted nominal -- local frame, and
assembly frame per occurrence.

    data/inbox/feature-identity/*.json          (the bindings a human ratified)
  + data/meshes/<sha>/                          (the geometry each one names)
  + <mesh>/provenance.json extraction.instances (where that part sits)
  -> data/projections/feature-geometry/fits.json

Built 2026-09-30 by handoff ``vpa_pitch_linkage_topology_and_feature_fits``, for
a consumer outside this repo: ``C:\\workspace\\linkage``, the pitch-linkage
solver, needs the two pitch-link spherical-bearing centres and the two expected
axes **in the assembly frame at 72 degrees pitch**, each with its provenance.

What this is, and what it is not
---------------------------------

**It is not a tolerance.** A fitted number is a *nominal read off a mesh*: it
carries no band, no min/max and no plus/minus, and a drawing callout wins over
it wherever one exists (``docs/ANNOTATION_SURFACE.md``, decision 6). This repo's
one rule -- cite or record a gap -- is untouched by it. What a fit supplies that
a drawing cannot is the thing drawings do not state: *where in the assembly* a
feature is. Nothing writes a fit into a stack or a topology yet, which is why
``tolerance_stack.stack.SOURCE_REF_KINDS`` still has no word for a mesh.

**It is not a solver** either. It applies declared placements and reports
coordinates. It computes no pose, resolves no redundancy and chooses no load
path -- ``docs/DAG_TOPOLOGY.md``'s fence, unchanged.

Placement is applied HERE, and nowhere else
---------------------------------------------

``apps/annotate/`` draws every part at its own local origin and applies no
assembly placement at all
(``ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md``), which
is why its face-relation table declares a gap rather than computing a
coplanarity it cannot support. This script is the one place in the repo that
multiplies a fitted point by a placement matrix, and it says which matrix it
used, per occurrence, in its own output.

Two sources of placement, in this order:

1. **rotorkit's full expansion** -- ``<rotorkit>/data/runs/<run-id>/placements.json``,
   where ``<run-id>`` is the mesh's own ``provenance.json``
   ``produced_by.run_id``. Read when it is there; it is the authority, because
   it is the whole instance tree rather than the slice one extraction recorded.
2. **the mesh's own ``provenance.json``** -- ``extraction.instances[]``, each
   with ``placement_world`` (3 rows of ``[r r r t]``). Present on every
   assembly-extracted mesh in the store today, and the fallback when (1) is
   absent -- which it is as of 2026-09-30.

A mesh with no ``extraction`` block at all (a single-part STEP export --
``blade_oml``, ``machined_213668``) has no occurrence to report and says so
rather than quietly emitting its local frame as if it were the assembly's.

Usage -- from the MAIN checkout, where ``data/`` is::

    venv-win/Scripts/python.exe scripts/fit_bound_features.py

From a worktree (one line; PowerShell runs here, not cmd)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe scripts/fit_bound_features.py --data-root C:\\workspace\\tolstack\\data

``--data-root`` alone is sufficient, and ``--events-dir`` follows it by default
for the reason ``build_feature_identity_projection.py``'s docstring gives: this
builder's *input* is gitignored ``data/`` too, not tracked ``docs/``, so a
``REPO_ROOT``-relative default would read the wrong tree's events while writing
into the right tree's projection
(``ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md``).

Gated like every shared projection writer here
(``scripts/projection_provenance.py``): it refuses to overwrite a file built
from a tree this one does not contain, exit 3, unless ``--allow-older-tree``.

Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import projection_provenance as prov  # noqa: E402 -- resolved from scripts/

from tolerance_stack import feature_geometry as fg  # noqa: E402
from tolerance_stack.feature_identity import (  # noqa: E402
    build_projection,
    load_events,
)

SCHEMA = "joby.tolerance_stack/feature-geometry-projection/v0"
PROJECTION_SUBDIR = Path("projections") / "feature-geometry"
PROJECTION_NAME = "fits.json"
BUILT_BY = "scripts/fit_bound_features.py"
REBUILD_COMMAND = "venv-win/Scripts/python.exe scripts/fit_bound_features.py"

#: Where rotorkit's run directories are. An absolute default because rotorkit is
#: a *sibling repo this one reads and never writes* -- the same one-way,
#: read-only dependency ``scripts/snapshot_drawing_checker.py`` exists to prove
#: for drawing-checker.
ROTORKIT_ROOT = Path("C:/workspace/rotorkit")

#: Which placement source an occurrence came from. **This tuple is the
#: definition**; the words are what the output carries per occurrence, so a
#: reader can tell a full-expansion placement from the slice one extraction
#: recorded without re-deriving which file was available on the day.
PLACEMENT_SOURCES = ("rotorkit_placements", "mesh_provenance")

#: What a fit can fail to produce, and why -- a first-class answer, never a
#: silently dropped binding. ``no_mesh``: the geometry key names a sha this
#: store does not have. ``no_face``: the mesh has no such face id.
#: ``unreadable``: the face is ``other``, no surface fitted it.
#: ``no_occurrence``: fitted fine, but nothing says where the part sits.
UNRESOLVED_REASONS = ("no_mesh", "no_face", "unreadable", "no_occurrence")

#: The unit a fit is reported in, when the mesh says what its unit is. A
#: tessellation records ``linear_deflection`` in ``manifest.json`` and the SAME
#: number as ``linear_deflection_mm`` in ``provenance.json`` -- so when the two
#: agree, the mesh has declared that its native unit is millimetres, and that is
#: a derivation rather than an assumption. When they do not agree (or either is
#: absent) the fit is reported in :data:`NATIVE_UNITS` and says so: a solver
#: handed a coordinate in the wrong unit gets a plausible number and a wrong
#: answer, which is this repo's whole objection to an uncited value.
MM = "mm"
NATIVE_UNITS = "mesh_native"


# ---------------------------------------------------------------------------
# meshes, placements, units
# ---------------------------------------------------------------------------


def mesh_units(manifest: Dict[str, Any], provenance: Dict[str, Any]) -> str:
    """:data:`MM` when the mesh itself declares millimetres, else
    :data:`NATIVE_UNITS`. See :data:`MM` for why this is a derivation."""
    declared = provenance.get("linear_deflection_mm")
    native = manifest.get("linear_deflection")
    if declared is None or native is None:
        return NATIVE_UNITS
    return MM if float(declared) == float(native) else NATIVE_UNITS


def load_mesh_provenance(mesh_dir: Path) -> Dict[str, Any]:
    path = mesh_dir / "provenance.json"
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def rotorkit_placements(run_id: Optional[str],
                        rotorkit_root: Path) -> Optional[Dict[str, Any]]:
    """``<rotorkit>/data/runs/<run-id>/placements.json``, or ``None``.

    Absent as of 2026-09-30 -- rotorkit's own
    ``ISSUE_20260914_extracted_placements_have_no_consumer.md`` is about exactly
    this file having had no reader. Read by path and never by import: this repo
    does not depend on rotorkit's code, only on files it leaves behind.
    """
    if not run_id:
        return None
    path = rotorkit_root / "data" / "runs" / run_id / "placements.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def occurrences_for(provenance: Dict[str, Any],
                    placements: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Every place this part sits in the assembly, as
    ``{instance_path, instance_name, placement, source}``.

    The full expansion wins when there is one, for the reason
    :data:`PLACEMENT_SOURCES` gives. Either way an entry with no usable
    ``placement_world`` is dropped here rather than carried forward as an
    identity transform -- an identity placement is a part at the assembly
    origin, which is a specific and usually wrong claim.
    """
    out: List[Dict[str, Any]] = []
    part_id = provenance.get("part_id")
    if placements:
        for entry in placements.get("instances", []):
            if part_id and entry.get("part_id") not in (None, part_id):
                continue
            matrix = entry.get("placement_world")
            if not matrix or len(matrix) != fg.PLACEMENT_VALUES:
                continue
            out.append({
                "instance_path": entry.get("instance_path"),
                "instance_name": entry.get("instance_name"),
                "placement": list(matrix),
                "source": "rotorkit_placements",
            })
        if out:
            return out
    for entry in (provenance.get("extraction") or {}).get("instances", []):
        matrix = entry.get("placement_world")
        if not matrix or len(matrix) != fg.PLACEMENT_VALUES:
            continue
        out.append({
            "instance_path": entry.get("instance_path"),
            "instance_name": entry.get("instance_name"),
            "placement": list(matrix),
            "source": "mesh_provenance",
        })
    return out


# ---------------------------------------------------------------------------
# a fit, moved into the assembly frame
# ---------------------------------------------------------------------------

#: Which of a fitted geometry's fields is a POINT (moved by the whole placement)
#: and which is a DIRECTION (rotated only). Declared rather than decided inside
#: the loop, because the one mistake this file can make that still looks right
#: is translating an axis direction: the result is a unit-ish vector pointing
#: somewhere believable, and nothing downstream can tell.
PLACED_POINTS = ("centre", "point", "axis_point")
PLACED_DIRECTIONS = ("axis", "normal")

#: Fields that mean something only in the frame they were fitted in, and are
#: therefore NOT carried into an assembly-frame row. ``offset`` is
#: ``normal . point`` in the mesh's own frame; re-stating it beside a placed
#: normal would be a number that reads like a plane's position and is not one.
LOCAL_ONLY_FIELDS = ("offset",)


def place_geometry(geometry: Dict[str, Any],
                   placement: List[float]) -> Dict[str, Any]:
    """One fitted geometry, moved into the assembly frame.

    Scalars (a radius, an arc) pass through unchanged: a placement is a rigid
    motion, so it moves a feature without resizing it. If a scaling placement
    ever arrives, this is the function that has to learn about it, and a radius
    silently carried through would be the bug.
    """
    out: Dict[str, Any] = {}
    for key, value in geometry.items():
        if key in LOCAL_ONLY_FIELDS:
            continue
        if key in PLACED_POINTS:
            out[key] = list(fg.apply_placement(placement, value))
        elif key in PLACED_DIRECTIONS:
            out[key] = list(fg.rotate_direction(placement, value))
        else:
            out[key] = value
    return out


def fit_one_binding(event, meshes_dir: Path, rotorkit_root: Path,
                    cache: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]],
                                                    Optional[Dict[str, Any]]]:
    """``(fit row, unresolved row)`` -- exactly one of the two is not ``None``."""
    key = event.geometry_key
    sha = key.source_step_sha256
    base = {
        "event_id": event.event_id,
        "stack_key": event.stack_key.as_dict(),
        "direction": event.direction,
        "geometry_key": key.as_dict(),
    }
    if event.owner_part:
        base["owner_part"] = event.owner_part

    mesh_dir = meshes_dir / sha
    if not (mesh_dir / "manifest.json").is_file():
        return None, dict(base, reason="no_mesh",
                          note=f"no mesh directory {sha[:12]} in {meshes_dir}")

    if sha not in cache:
        mesh = fg.read_mesh(mesh_dir)
        provenance = load_mesh_provenance(mesh_dir)
        placements = rotorkit_placements(
            (provenance.get("produced_by") or {}).get("run_id"), rotorkit_root)
        cache[sha] = {
            "mesh": mesh,
            "provenance": provenance,
            "units": mesh_units(mesh.manifest, provenance),
            "occurrences": occurrences_for(provenance, placements),
        }
    entry = cache[sha]
    mesh = entry["mesh"]

    try:
        fit = fg.fit_face(mesh, key.face_id)
    except fg.MeshError as exc:
        return None, dict(base, reason="no_face", note=str(exc))

    base["mesh"] = {
        "sha256": sha,
        "part_id": entry["provenance"].get("part_id"),
        "label": entry["provenance"].get("label"),
    }
    base["units"] = entry["units"]
    base["local"] = fit.as_dict()

    if fit.surface == "other":
        return None, dict(base, reason="unreadable",
                          note=f"face {key.face_id} is not a shape this reads: {fit.why}")

    occurrences = entry["occurrences"]
    if not occurrences:
        return None, dict(
            base, reason="no_occurrence",
            note="this mesh records no assembly placement, so the fit stands in "
                 "the part's own frame and nothing says where that is")

    base["occurrences"] = [
        {
            "instance_path": occurrence["instance_path"],
            "instance_name": occurrence["instance_name"],
            "placement_source": occurrence["source"],
            "placement": occurrence["placement"],
            "geometry": place_geometry(fit.geometry, occurrence["placement"]),
        }
        for occurrence in occurrences
    ]
    return base, None


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------


def build(events_dir: Path, meshes_dir: Path, out_dir: Path, *,
          rotorkit_root: Path = ROTORKIT_ROOT,
          allow_older: bool = False) -> Tuple[Path, Dict[str, Any]]:
    """Wipe and rebuild ``<data-root>/projections/feature-geometry/fits.json``."""
    out_dir = Path(out_dir)
    out_path = out_dir / PROJECTION_NAME
    provenance = prov.stamp(REPO_ROOT, Path(events_dir), BUILT_BY,
                            source_key="events_dir")
    for line in prov.guard(out_path, provenance, REPO_ROOT, allow_older, REBUILD_COMMAND):
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    events = load_events(events_dir)
    projection = build_projection(events)

    cache: Dict[str, Any] = {}
    fits: List[Dict[str, Any]] = []
    unresolved: List[Dict[str, Any]] = []
    for _key, record in sorted(projection.by_stack_key.items()):
        for binding in record.bindings:
            row, missing = fit_one_binding(binding, Path(meshes_dir),
                                           Path(rotorkit_root), cache)
            (fits if row is not None else unresolved).append(row or missing)

    data: Dict[str, Any] = {
        "schema": SCHEMA,
        prov.PROVENANCE_KEY: provenance,
        "built_from_events": projection.events,
        "meshes_dir": str(Path(meshes_dir)),
        "summary": {
            "bindings": sum(len(r.bindings) for r in projection.by_stack_key.values()),
            "fitted": len(fits),
            "unresolved": len(unresolved),
            "by_surface": _count(fits, lambda row: row["local"]["surface"]),
            "by_reason": _count(unresolved, lambda row: row["reason"]),
        },
        "fits": fits,
        "unresolved": unresolved,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return out_path, data


def _count(rows: List[Dict[str, Any]], of) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        counts[of(row)] = counts.get(of(row), 0) + 1
    return dict(sorted(counts.items()))


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="fit_bound_features.py",
        description="Fit every bound face and report it in the part's local "
                    "frame and, per occurrence, in the assembly frame.")
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (the MAIN checkout's, from a worktree)")
    ap.add_argument("--events-dir", default=None,
                    help="override the default (--data-root's "
                         "inbox/feature-identity/). Rarely needed outside tests.")
    ap.add_argument("--meshes-dir", default=None,
                    help="override the default (--data-root's meshes/)")
    ap.add_argument("--rotorkit-root", default=str(ROTORKIT_ROOT),
                    help="where rotorkit's data/runs/<run-id>/placements.json "
                         "lives, when it exists")
    ap.add_argument("--allow-older-tree", action="store_true")
    args = ap.parse_args(argv)

    data_root = Path(args.data_root)
    events_dir = Path(args.events_dir) if args.events_dir else data_root / "inbox" / "feature-identity"
    meshes_dir = Path(args.meshes_dir) if args.meshes_dir else data_root / "meshes"

    try:
        out, data = build(events_dir, meshes_dir, data_root / PROJECTION_SUBDIR,
                          rotorkit_root=Path(args.rotorkit_root),
                          allow_older=args.allow_older_tree)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3

    summary = data["summary"]
    print(f"wrote {out}")
    print(f"  {summary['fitted']} fitted, {summary['unresolved']} unresolved, "
          f"from {summary['bindings']} binding(s)")
    for word, count in summary["by_surface"].items():
        print(f"    {count:>4}  {word}")
    for reason, count in summary["by_reason"].items():
        print(f"    {count:>4}  unresolved: {reason}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

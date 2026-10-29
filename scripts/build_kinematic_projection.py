"""Build the kinematic-study projection -- every sweep point's fold, plus one plot.

``tolerance_stack/kinematic.py`` folds a published linkage sweep's Jacobian as
tolerance sensitivities; this script runs it over every
``docs/topologies/kinematic_study_*.json`` and writes what a renderer needs:

* ``<data-root>/projections/viewer/kinematic/kinematic_studies.json``
  (schema ``joby.tolerance_stack/kinematic_projection/v0``) -- per study the
  envelope (every point's driver value, nominal measure, worst case and RSS),
  each named stop's ranked contributor table, every contributor's coefficient
  at every point (``contributors[].by_point[]``), the check results, the
  sweep's ``run_id`` / ``pipeline_commit`` /
  ``max_finite_difference_disagreement``, and the gap rows with the drawings
  that would resolve them; plus, per topology, the published sweep runs that name it
  (``models``), newest first, so the viewer can offer a topology with no
  study yet its kinematic model;
* ``<data-root>/projections/viewer/kinematic/<study id>.svg`` -- the evidence
  plot: deviation from nominal versus driver value, worst-case band shaded, RSS
  band inside it, the stops marked with their worst-case numbers, the limit
  drawn where a check has one;
* ``<data-root>/projections/viewer/kinematic/annotate.json`` and
  ``.../kinematic/sweeps/<run>.json`` -- the annotator's served read set
  (schema ``joby.tolerance_stack/annotate_read_set/v0``): the installed meshes,
  the part-mesh alias table, the part names and the published runs as an
  index, and each run byte for byte -- what a page reading over HTTP cannot
  find by walking a folder (see ``SCHEMA_ANNOTATE_READ_SET``).

Where it lands, and who reads it
--------------------------------

Under ``projections/viewer/`` (moved there 2026-10-20 by handoff
``the_viewer_shows_a_kinematic_study``; it was ``projections/topology/kinematic/``
when nothing read it). That directory is the one drawing-checker serves as
``/tolstack/data/`` (``webui/analyses.py``: ``viewer_data_dir()``, walked by
``tolstack_mounts()``, which the hosted bake also copies), so the viewer reads
this file through the same transport and the same directory as
``topologies.json`` -- ``apps/viewer/views/kinematic.js`` renders it. A
subdirectory rather than the root because this script wipes its own ``*.svg``
on every run, and the root is shared with the other viewer builders.

Why a sibling builder and not a section of ``topologies.json``
--------------------------------------------------------------

``build_topology_projection.py`` reads tracked documents only, and the viewer's
``[real]`` tier pins its output. A kinematic study also reads a **gitignored**
input -- the sweep under ``data/inbox/linkage-sweeps/`` -- so folding it there
would make ``topologies.json`` depend on what happens to be in one checkout's
``data/`` and couple a rebuild of the rails to the presence of an 1 MB artifact
the viewer does not read yet. Its own file, gated on its own stamp, keeps the two
independent: either can be rebuilt without the other. Wipe-and-rebuild, derived
not authored, like every projection here.

The plot is hand-written SVG. matplotlib is not in ``venv-win`` and is not to
be added; the type scale and the colours are **read** from
``apps/viewer/style.css``'s ``:root`` at build time (:func:`viewer_tokens`),
never restated here, so the plot is set in the viewer's own six steps.

Usage, from a worktree (output must land in the main checkout's ``data/``)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_kinematic_projection.py --data-root C:\\workspace\\tolstack\\data

The output directory is shared by every worktree, so the JSON is stamped with
the tree that built it and the gate in ``scripts/projection_provenance.py``
refuses to overwrite one built from a tree this one does not contain
(``--allow-older-tree`` overrides, loudly).

A gap row's drawings say whether each one is **on file**: a PDF in
drawing-checker's ``data/inbox/drawings/`` whose name starts with the drawing
number, or with its base number where the export is named for the drawing and
not the dash number (``215177-A.pdf`` for 215177-001, never ``215177-002-A.pdf``).
The same directory ``build_viewer_crops.py`` resolves citations against; read
here for the names only, never opened.

Stdlib only, plus ``tolerance_stack`` and its sibling scripts
(``projection_provenance``; ``build_viewer_projection`` for the shared
check-rounding rule and confidence vocabulary).
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(REPO_ROOT))
import projection_provenance as prov  # noqa: E402
from build_viewer_projection import (  # noqa: E402
    count_confidence,
    rounded,
    rounded_check,
    worst_confidence,
)
from tolerance_stack.kinematic import (  # noqa: E402
    LINKAGE_SWEEPS_SUBDIR,
    SWEEP_SCHEMAS,
    KinematicStudyError,
    PointResult,
    check_at_stop,
    envelope,
    fold_at,
    load_kinematic_study,
    stop_index,
)

SCHEMA_PROJECTION = "joby.tolerance_stack/kinematic_projection/v0"
TOPOLOGIES_DIR = Path("docs") / "topologies"
STUDY_GLOB = "kinematic_study_*.json"
PROJECTION_SUBDIR = Path("projections") / "viewer" / "kinematic"
PROJECTION_NAME = "kinematic_studies.json"
STYLESHEET = REPO_ROOT / "apps" / "viewer" / "style.css"
BUILT_BY = "scripts/build_kinematic_projection.py"
DEFAULT_DRAWING_CHECKER_ROOT = Path(r"C:\workspace\drawing-checker")
DRAWINGS_SUBDIR = Path("data") / "inbox" / "drawings"

#: The annotator's served read set (handoff
#: ``the_scene_pane_is_one_flyout_that_reads_over_http``), written beside the
#: projection because this directory is the one drawing-checker serves (and
#: its hosted bake copies) as ``/tolstack/data/kinematic/``. A static mount
#: lists no directory, so what the annotator finds by WALKING a folder grant
#: -- the installed meshes, the published sweep runs -- has to be written down
#: for a page reading over HTTP; and what it reads from outside
#: ``projections/viewer/`` -- the alias table, the part names -- is carried in
#: the same index, since no mount reaches it. ``apps/annotate/storage/http.js``
#: is the one reader; ``apps/annotate/config.js`` names both paths, paired by
#: ``tests/test_kinematic.py``. Built here rather than by a builder of its own:
#: this is the one leg that already reads the sweep inbox, and it runs last on
#: the rebuild rail, after the part names it copies.
SCHEMA_ANNOTATE_READ_SET = "joby.tolerance_stack/annotate_read_set/v0"
ANNOTATE_READ_SET_NAME = "annotate.json"
ANNOTATE_SWEEPS_SUBDIR = "sweeps"
MESHES_SUBDIR = Path("meshes")
MESH_PROVENANCE_NAME = "provenance.json"
MESH_ALIASES_NAME = "part_mesh_aliases.json"
PART_NAMES_PROJECTION = Path("projections") / "parts" / "names.json"

#: A study row's outcome. An error is a **result**, exactly as in the topology
#: projection: a study that refuses to load (a missing run, a label the sweep
#: lacks, a disagreeing feature join) is carried with its message rather than
#: dropped, because the refusal is the finding.
STUDY_STATUSES = ("ok", "error")

#: How many decimals a reader is shown, decided HERE and carried in the
#: projection as ``display_decimals`` -- the viewer formats with it and never
#: picks a precision of its own (ARCHITECTURE.md: "the browser ... never decides
#: how a number reads"). Three, as the 2026-10-16 lesson pinned: the bands are
#: tenths and hundredths of a millimetre, so a fourth digit of a coefficient is
#: noise to a reader. The JSON keeps every figure unrounded beside it.
DISPLAY_DECIMALS = 3

#: The ``:root`` tokens the plot reads out of the viewer's stylesheet.
PLOT_TOKENS = ("--t-micro", "--t-meta", "--t-dense", "--bg", "--ink", "--muted",
               "--line", "--accent", "--fail")


def as_posix_rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


# ---------------------------------------------------------------------------
# the projection
# ---------------------------------------------------------------------------


def project_point(point: PointResult) -> Dict[str, Any]:
    """One envelope row: where the sweep is and what the fold says there."""
    return {
        "index": point.index,
        "driver_value": point.driver_value,
        # The sweep's own solved value here. Beside the fold, never added to
        # it: the fold is variation only, so its own `nominal` is the 0.0 the
        # bands are authored about.
        "nominal_measure": point.nominal,
        **rounded(point.interval.as_dict()),
    }


def project_stop(study, sweep, stop) -> Dict[str, Any]:
    point = fold_at(study, sweep, stop_index(study, sweep, stop.id))
    return {
        "id": stop.id,
        "label": stop.label,
        "target": stop.target,
        "context_ref": stop.context_ref,
        **project_point(point),
        "gap_count": point.gap_count,
        "rows": [row.as_dict() for row in point.rows],
        # A study_ref's leaves at this stop (`kinematic.study_ref_group`): each
        # a term of the one fold, never the sub-study's folded interval.
        "groups": [group.as_dict() for group in point.groups],
    }


def project_contributors(study, points: Sequence[PointResult]) -> List[Dict[str, Any]]:
    """Per contributor, in the study's own order, its row at EVERY sweep point.

    The stops' tables carry a contributor's coefficient at two points; this is
    the same field at all of them, so a reader can see a coefficient move
    across the sweep (``tan_link_mount_height`` changes sign on P2) instead of
    reading it in a lesson. Each entry is the point's own ``ContributorRow``
    fields, unrounded -- nothing is computed here that ``fold_at`` did not.
    """
    by_point: Dict[int, List[Dict[str, Any]]] = {id(c): [] for c in study.contributors}
    for point in points:
        for row in point.rows:
            by_point[id(row.contributor)].append({
                "index": point.index, "sign": row.sign,
                "coefficient": row.coefficient, "magnitude": row.magnitude})
    return [{"edge": c.edge, "by_point": by_point[id(c)]} for c in study.contributors]


def project_study_refs(study, points: Sequence[PointResult]) -> List[Dict[str, Any]]:
    """Per ``study_ref``, in document order: what it is, and every leaf's
    coefficient at EVERY sweep point (the curve a hover shows, as
    :func:`project_contributors` carries for a direct contributor).

    ``completeness`` is the sub-study's own, derived there; ``total`` is its
    own published interval, carried to be read beside the result and never
    folded here.
    """
    out = []
    for n, ref in enumerate(study.study_refs):
        children = []
        for m, sub in enumerate(ref.terms):
            children.append({
                "edge": sub.edge, "name": sub.name,
                "by_point": [{"index": p.index, "sign": p.groups[n].children[m].sign,
                              "coefficient": p.groups[n].children[m].coefficient,
                              "magnitude": p.groups[n].children[m].magnitude}
                             for p in points]})
        out.append({
            "study": ref.study_id, "topology": ref.topology, "title": ref.title,
            "parameter": ref.parameter, "units": ref.units, "note": ref.note,
            "source_file": ref.source_file, "completeness": ref.completeness,
            "total": rounded(ref.total.as_dict()),
            "entries": [{"index": p.index, "entry": p.groups[n].entry,
                         "sign": p.groups[n].sign} for p in points],
            "children": children})
    return out


def drawings_on_file(dc_root: Path) -> List[str]:
    """The PDF names in drawing-checker's drawing inbox; none where it is absent."""
    inbox = dc_root / DRAWINGS_SUBDIR
    if not inbox.is_dir():
        return []
    return sorted(p.name for p in inbox.iterdir() if p.suffix.lower() == ".pdf")


_DASH_NUMBER = re.compile(r"-\d{3}")


def drawing_on_file(drawing: str, names: Sequence[str]) -> bool:
    """Whether a PDF named for ``drawing`` is on file (the module docstring says how)."""
    base = drawing.split("-")[0]
    for name in names:
        if name.startswith(drawing):
            return True
        rest = name[len(base):]
        if name.startswith(base) and rest and not rest[0].isdigit() \
                and not _DASH_NUMBER.match(rest):
            return True
    return False


def gap_drawings(raw_topology: Optional[Dict[str, Any]], edge_id: str,
                 names: Sequence[str]) -> List[Dict[str, Any]]:
    """The drawing a gap edge's part names, and whether it is on file.

    A part that names no drawing is listed with ``drawing: None`` -- the reader
    is told there is nothing to read rather than shown nothing -- and an edge
    with no part (a clearance) lists none.
    """
    if not raw_topology:
        return []
    parts = {p.get("id"): p for p in raw_topology.get("parts") or []}
    edge = next((e for e in raw_topology.get("edges") or [] if e.get("id") == edge_id), None)
    if edge is None or not edge.get("part"):
        return []
    part = parts.get(edge["part"]) or {}
    drawing = part.get("drawing")
    return [{"part": edge["part"], "part_name": part.get("name"), "drawing": drawing,
             "on_file": bool(drawing) and drawing_on_file(drawing, names)}]


def project_study(path: Path, data_root: Path, topologies_dir: Path,
                  drawing_names: Sequence[str] = ()) -> Dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    row: Dict[str, Any] = {
        "id": raw.get("id"), "title": raw.get("title"),
        "description": raw.get("description"), "topology": raw.get("topology"),
        "measure": raw.get("measure"), "source_file": as_posix_rel(path),
        "status": "ok", "error": None,
    }
    try:
        study, sweep = load_kinematic_study(path, data_root, topologies_dir)
    except KinematicStudyError as failure:
        row["status"] = "error"
        row["error"] = {"type": type(failure).__name__, "message": str(failure)}
        return row

    raw_topology_path = topologies_dir / f"topology_{study.topology}.json"
    raw_topology = (json.loads(raw_topology_path.read_text(encoding="utf-8"))
                    if raw_topology_path.exists() else None)
    points = envelope(study, sweep)
    bands = [c.dimension for c in study.contributors if c.dimension is not None]
    bands += [t.source for ref in study.study_refs for t in ref.terms]
    checks = []
    for spec in study.checks:
        projected = rounded_check(check_at_stop(study, sweep, spec["check_id"]))
        counts = count_confidence(bands)
        projected.update({"stop": spec["configuration"]["stop"],
                          "limit": spec.get("limit"),
                          "context_ref": spec.get("context_ref"),
                          "input_confidence": counts,
                          "worst_confidence": worst_confidence(counts)})
        checks.append(projected)
    row.update({
        "units": sweep.units.get(study.measure),
        "sweep": {
            "run_id": sweep.run_id, "schema": sweep.schema,
            "pipeline_commit": sweep.pipeline_commit,
            "max_finite_difference_disagreement":
                sweep.max_finite_difference_disagreement,
            "driver": sweep.driver, "n_points": sweep.n_points,
            "features_in_artifact": sweep.features is not None,
        },
        "contributor_count": len(study.contributors),
        "study_ref_count": len(study.study_refs),
        "gap_count": sum(1 for c in study.contributors if c.is_gap),
        "gap_rows": [{"edge": c.edge, "gap": c.gap, "band_source": c.band_source,
                      "drawings": gap_drawings(raw_topology, c.edge, drawing_names)}
                     for c in study.contributors if c.is_gap],
        "envelope": [project_point(p) for p in points],
        "stops": [project_stop(study, sweep, s) for s in study.stops],
        "contributors": project_contributors(study, points),
        "study_refs": project_study_refs(study, points),
        "checks": checks,
        "no_checks_reason": study.no_checks_reason,
        "provenance": study.provenance,
        "notes": study.notes,
    })
    return row


def sweep_runs(data_root: Path) -> List[Dict[str, Any]]:
    """Every published sweep under ``data_root``, as the topologies it names.

    A run says which topology it models in its own artifact:
    ``geometry.features[].topology`` (linkage's 2026-10-16 republish; an older
    run carries no ``features`` and therefore names none, and is left out rather
    than guessed at -- the body part lists are tolstack part ids too, but a part
    id is shared by several topologies and is no evidence of which one a run
    models). A file whose ``schema`` this repo does not read is skipped the same
    way. Read raw rather than through ``load_sweep``: only the header is needed,
    and a run with no study is exactly the one nothing else has validated.
    """
    runs = []
    for path in sorted((data_root / LINKAGE_SWEEPS_SUBDIR).glob("*.json")):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if not isinstance(raw, dict) or raw.get("schema") not in SWEEP_SCHEMAS:
            continue
        features = (raw.get("geometry") or {}).get("features") or []
        topologies = sorted({f.get("topology") for f in features
                             if isinstance(f, dict) and f.get("topology")})
        mechanism = raw.get("mechanism") or {}
        runs.append({"run_id": raw.get("run_id"), "ts": raw.get("ts"),
                     "mechanism": mechanism.get("name"),
                     "driver": mechanism.get("driver"),
                     "topologies": topologies})
    return runs


def project_models(runs: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Per topology, its published runs, newest first (by ``ts``, never by id:
    the annotator's ``sweep latest`` sorted by id once and opened the wrong
    run -- ``DRAFT_kinematic_model_viewer.md``, 2026-10-14)."""
    by_topology: Dict[str, List[Dict[str, Any]]] = {}
    for run in runs:
        for topology in run["topologies"]:
            by_topology.setdefault(topology, []).append(
                {k: run[k] for k in ("run_id", "ts", "mechanism", "driver")})
    models = []
    for topology in sorted(by_topology):
        ordered = sorted(by_topology[topology], key=lambda r: r["ts"] or "",
                         reverse=True)
        models.append({"topology": topology, "newest_run_id": ordered[0]["run_id"],
                       "runs": ordered})
    return models


def build(topologies_dir: Path, data_root: Path,
          provenance: Optional[Dict[str, Any]] = None,
          drawing_checker_root: Path = DEFAULT_DRAWING_CHECKER_ROOT) -> Dict[str, Any]:
    if provenance is None:
        provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY, "topologies_dir")
    return {
        "schema": SCHEMA_PROJECTION,
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        prov.PROVENANCE_KEY: provenance,
        "study_statuses": list(STUDY_STATUSES),
        "display_decimals": DISPLAY_DECIMALS,
        "studies": [project_study(p, data_root, topologies_dir,
                                  drawings_on_file(Path(drawing_checker_root)))
                    for p in sorted(topologies_dir.glob(STUDY_GLOB))],
        "models": project_models(sweep_runs(data_root)),
    }


def _read_json_or_none(path: Path) -> Optional[Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def served_meshes(data_root: Path) -> List[Dict[str, Any]]:
    """Every ``data/meshes/<sha256>/`` directory, as the annotator's folder
    walk lists it (``apps/annotate/storage/fsa.js``'s ``listMeshes``): the
    directory name, and the provenance sidecar's ``label`` and ``part_id``
    where it has one -- the name and ``None`` where it does not, exactly as
    that walk answers, so the two transports list the same parts."""
    meshes_dir = data_root / MESHES_SUBDIR
    if not meshes_dir.is_dir():
        return []
    out = []
    for entry in sorted(meshes_dir.iterdir()):
        if not entry.is_dir():
            continue
        provenance = _read_json_or_none(entry / MESH_PROVENANCE_NAME)
        provenance = provenance if isinstance(provenance, dict) else None
        out.append({"sha256": entry.name,
                    "label": provenance.get("label") if provenance else entry.name,
                    "part_id": provenance.get("part_id") if provenance else None})
    return out


def served_sweep_runs(data_root: Path) -> List[Dict[str, Any]]:
    """Every ``data/inbox/linkage-sweeps/*.json`` that parses, as the
    annotator's run listing names it (``AA.sweepRunEntry``): the file's stem,
    and the run's own ``ts`` and mechanism name. Every schema, not only the
    ones this repo folds -- the annotator refuses a run it cannot read in its
    own words, and a folder grant lists them all."""
    runs = []
    for path in sorted((data_root / LINKAGE_SWEEPS_SUBDIR).glob("*.json")):
        raw = _read_json_or_none(path)
        if not isinstance(raw, dict):
            continue
        mechanism = raw.get("mechanism") if isinstance(raw.get("mechanism"), dict) else {}
        runs.append({"run_id": path.stem,
                     "ts": raw.get("ts") if isinstance(raw.get("ts"), str) else None,
                     "mechanism": mechanism.get("name") or None,
                     "source": path})
    return runs


def annotate_read_set(topologies_dir: Path, data_root: Path,
                      provenance: Dict[str, Any],
                      runs: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """The index the annotator reads over HTTP. Copies, never derivations:
    each field is what the folder grant would have read from its own file."""
    return {
        "schema": SCHEMA_ANNOTATE_READ_SET,
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        prov.PROVENANCE_KEY: provenance,
        "meshes": served_meshes(data_root),
        "mesh_aliases": _read_json_or_none(topologies_dir / MESH_ALIASES_NAME),
        "part_names": _read_json_or_none(data_root / PART_NAMES_PROJECTION),
        "sweep_runs": [{k: run[k] for k in ("run_id", "ts", "mechanism")} for run in runs],
    }


def write_annotate_read_set(out_dir: Path, topologies_dir: Path, data_root: Path,
                            provenance: Dict[str, Any]) -> List[Path]:
    """Wipe-and-write the read set: the index, and each run byte for byte
    under ``sweeps/`` (the annotator's schema reader checks it, as it does a
    run read through a folder grant). Returns what it wrote."""
    runs = served_sweep_runs(data_root)
    sweeps_dir = out_dir / ANNOTATE_SWEEPS_SUBDIR
    sweeps_dir.mkdir(parents=True, exist_ok=True)
    for old in sweeps_dir.glob("*.json"):
        old.unlink()
    written = []
    for run in runs:
        target = sweeps_dir / f"{run['run_id']}.json"
        shutil.copyfile(run["source"], target)
        written.append(target)
    index = out_dir / ANNOTATE_READ_SET_NAME
    index.write_text(json.dumps(annotate_read_set(topologies_dir, data_root, provenance, runs),
                                indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    written.insert(0, index)
    return written


def unbuilt_report(projection: Dict[str, Any]) -> List[str]:
    """The lines that END a build's output: how many studies built, and each
    one that did not, with its reason.

    Since 2026-10-21 (handoff ``the_kinematic_study_checks_its_run_its_units_
    and_shows_its_limit``). A study that refuses to load is a RESULT, carried
    in the projection as ``status: "error"`` -- and the build that wrote it
    exited 0 with a clean provenance stamp, so on the rebuild rail's own
    output it looked exactly like a good build. These lines are what makes
    the difference visible where the rebuild is read. The exit code stays 0
    (see :func:`main`).
    """
    studies = projection.get("studies") or []
    failed = [s for s in studies if s.get("status") != STUDY_STATUSES[0]]
    lines = [f"kinematic studies: {len(studies) - len(failed)} of {len(studies)} built"]
    for study in failed:
        error = study.get("error") or {}
        lines.append(f"  NOT BUILT {study.get('id')}: {error.get('type')}: "
                     f"{error.get('message')}")
    return lines


# ---------------------------------------------------------------------------
# the plot
# ---------------------------------------------------------------------------


_TOKEN = re.compile(r"(--[a-z0-9-]+)\s*:\s*([^;]+);")
_BODY_FONT = re.compile(r"body\s*\{[^}]*?font:\s*var\(--t-body\)/[0-9.]+\s*([^;]+);", re.S)


def viewer_tokens(stylesheet: Path = STYLESHEET) -> Dict[str, str]:
    """The ``:root`` custom properties of the viewer's stylesheet, plus its face."""
    text = stylesheet.read_text(encoding="utf-8")
    root = re.search(r":root\s*\{(.*?)\n\}", text, re.S)
    if root is None:
        raise LookupError(f"{stylesheet}: no :root block to read the plot's tokens from")
    body = re.sub(r"/\*.*?\*/", "", root.group(1), flags=re.S)
    tokens = {name: value.strip() for name, value in _TOKEN.findall(body)}
    missing = [t for t in PLOT_TOKENS if t not in tokens]
    if missing:
        raise LookupError(f"{stylesheet}: :root declares none of {missing}")
    face = _BODY_FONT.search(text)
    tokens["font-family"] = face.group(1).strip() if face else "sans-serif"
    return tokens


def _esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def _nice_step(span: float, target: int) -> float:
    raw = span / max(target, 1)
    magnitude = 10 ** math.floor(math.log10(raw))
    for m in (1, 2, 2.5, 5, 10):
        if raw <= m * magnitude:
            return m * magnitude
    return 10 * magnitude


def render_svg(row: Dict[str, Any], tokens: Dict[str, str]) -> str:
    """The envelope plot for one projected study (an ``ok`` row)."""
    W, H = 760, 380
    left, right, top, bottom = 64, 24, 40, 52
    pw, ph = W - left - right, H - top - bottom
    env = row["envelope"]
    units = row.get("units") or ""
    limits = sorted({float(c["limit"]["value"]) for c in row["checks"] if c.get("limit")})
    xs = [p["driver_value"] for p in env]
    x0, x1 = min(xs), max(xs)
    reach = max([abs(p["worst_case_min"]) for p in env]
                + [abs(p["worst_case_max"]) for p in env] + limits + [1e-9])
    y1 = reach * 1.15
    y0 = -y1

    def X(v: float) -> float:
        return left + (v - x0) / ((x1 - x0) or 1.0) * pw

    def Y(v: float) -> float:
        return top + (y1 - v) / (y1 - y0) * ph

    def band(lo: str, hi: str) -> str:
        upper = [f"{X(p['driver_value']):.2f},{Y(p[hi]):.2f}" for p in env]
        lower = [f"{X(p['driver_value']):.2f},{Y(p[lo]):.2f}" for p in reversed(env)]
        return " ".join(upper + lower)

    t = tokens
    out: List[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="{_esc(t["font-family"])}">',
        f'<title>{_esc(row["title"])}</title>',
        f'<rect width="{W}" height="{H}" fill="{t["--bg"]}"/>',
        f'<text x="{left}" y="22" fill="{t["--ink"]}" font-size="{t["--t-dense"]}">'
        f'{_esc(row["title"])}</text>',
    ]
    # gridlines + y ticks
    step = _nice_step(y1 - y0, 6)
    k = int(y0 // step)
    while k * step <= y1:
        v = k * step
        if v >= y0:
            out.append(f'<line x1="{left}" x2="{left + pw}" y1="{Y(v):.2f}" y2="{Y(v):.2f}" '
                       f'stroke="{t["--line"]}" stroke-width="1"/>')
            out.append(f'<text x="{left - 8}" y="{Y(v) + 4:.2f}" text-anchor="end" '
                       f'fill="{t["--muted"]}" font-size="{t["--t-micro"]}">{v:+.2f}</text>')
        k += 1
    xstep = _nice_step(x1 - x0, 7)
    k = int(x0 // xstep)
    while k * xstep <= x1 + 1e-9:
        v = k * xstep
        if v >= x0 - 1e-9:
            out.append(f'<text x="{X(v):.2f}" y="{top + ph + 16}" text-anchor="middle" '
                       f'fill="{t["--muted"]}" font-size="{t["--t-micro"]}">{v:g}</text>')
        k += 1
    driver = row["sweep"].get("driver") or {}
    out.append(f'<text x="{left + pw / 2:.2f}" y="{H - 14}" text-anchor="middle" '
               f'fill="{t["--muted"]}" font-size="{t["--t-meta"]}">'
               f'{_esc(driver.get("label", "driver"))}, {_esc(driver.get("unit", ""))}</text>')
    out.append(f'<text transform="translate(16 {top + ph / 2:.2f}) rotate(-90)" '
               f'text-anchor="middle" fill="{t["--muted"]}" font-size="{t["--t-meta"]}">'
               f'{_esc(row["measure"].replace("_", " "))} from nominal, {_esc(units)}</text>')
    # bands: worst case, then RSS inside it, then the nominal line
    out.append(f'<polygon points="{band("worst_case_min", "worst_case_max")}" '
               f'fill="{t["--accent"]}" fill-opacity="0.18" stroke="none"/>')
    out.append(f'<polygon points="{band("rss_min", "rss_max")}" '
               f'fill="{t["--accent"]}" fill-opacity="0.40" stroke="none"/>')
    out.append(f'<line x1="{left}" x2="{left + pw}" y1="{Y(0):.2f}" y2="{Y(0):.2f}" '
               f'stroke="{t["--ink"]}" stroke-width="1.5"/>')
    for v in limits:
        for s in (v, -v):
            out.append(f'<line x1="{left}" x2="{left + pw}" y1="{Y(s):.2f}" y2="{Y(s):.2f}" '
                       f'stroke="{t["--fail"]}" stroke-width="1" stroke-dasharray="6 4"/>')
        out.append(f'<text x="{left + pw / 2:.2f}" y="{Y(v) - 6:.2f}" text-anchor="middle" '
                   f'fill="{t["--fail"]}" font-size="{t["--t-micro"]}">'
                   f'limit ±{v:g} {_esc(units)}</text>')
    for stop in row["stops"]:
        x = X(stop["driver_value"])
        anchor = "start" if x < left + pw / 2 else "end"
        dx = 6 if anchor == "start" else -6
        out.append(f'<line x1="{x:.2f}" x2="{x:.2f}" y1="{top}" y2="{top + ph}" '
                   f'stroke="{t["--muted"]}" stroke-width="1"/>')
        label_y = Y(stop["worst_case_max"]) - 26
        for edge in ("worst_case_max", "worst_case_min"):
            out.append(f'<circle cx="{x:.2f}" cy="{Y(stop[edge]):.2f}" r="3.5" '
                       f'fill="{t["--ink"]}"/>')
        out.append(f'<text x="{x + dx:.2f}" y="{label_y:.2f}" text-anchor="{anchor}" '
                   f'fill="{t["--ink"]}" font-size="{t["--t-meta"]}">'
                   f'{_esc(stop["label"])}</text>')
        out.append(f'<text x="{x + dx:.2f}" y="{label_y + 15:.2f}" text-anchor="{anchor}" '
                   f'fill="{t["--muted"]}" font-size="{t["--t-micro"]}">'
                   f'±{stop["worst_case_half"]:.3f} worst · ±{stop["rss_half"]:.3f} RSS</text>')
    out.append(f'<rect x="{left}" y="{top}" width="{pw}" height="{ph}" fill="none" '
               f'stroke="{t["--line"]}"/>')
    out.append("</svg>")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (MAIN checkout's, if you are in a worktree)")
    ap.add_argument("--topologies-dir", default=str(REPO_ROOT / TOPOLOGIES_DIR),
                    help="directory holding kinematic_study_*.json")
    ap.add_argument("--drawing-checker-root", default=str(DEFAULT_DRAWING_CHECKER_ROOT),
                    help="drawing-checker checkout whose drawing inbox says which "
                    "of a gap row's drawings are on file")
    ap.add_argument("--allow-older-tree", action="store_true",
                    help="overwrite a projection built from a tree this one does not "
                    "contain (see scripts/projection_provenance.py)")
    ap.add_argument("--report", action="store_true",
                    help="build nothing: print which studies the projection already "
                    "on disk did and did not build (the rebuild rail's last lines)")
    args = ap.parse_args(argv)

    topologies_dir = Path(args.topologies_dir)
    data_root = Path(args.data_root)
    out_dir = data_root / PROJECTION_SUBDIR
    out_path = out_dir / PROJECTION_NAME

    if args.report:
        if not out_path.exists():
            print(f"kinematic studies: no projection at {out_path}")
            return 1
        for line in unbuilt_report(json.loads(out_path.read_text(encoding="utf-8"))):
            print(line)
        return 0

    provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY, "topologies_dir")
    rebuild_command = (f"python scripts\\build_kinematic_projection.py "
                       f"--data-root {data_root}")
    try:
        notes = prov.guard(out_path, provenance, REPO_ROOT, args.allow_older_tree,
                           rebuild_command)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3
    for line in notes + prov.note_lines(provenance):
        print(f"note: {line}", file=sys.stderr)

    projection = build(topologies_dir, data_root, provenance,
                       Path(args.drawing_checker_root))
    tokens = viewer_tokens()

    # Wipe-and-rebuild this script's own files only: the JSON and its SVGs
    # (and, below, the annotator's read set).
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.svg"):
        old.unlink()
    if out_path.exists():
        out_path.unlink()
    out_path.write_text(json.dumps(projection, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    print(f"wrote {out_path}")
    written = write_annotate_read_set(out_dir, topologies_dir, data_root, provenance)
    print(f"wrote {written[0]} (+{len(written) - 1} sweep run(s) under "
          f"{out_dir / ANNOTATE_SWEEPS_SUBDIR})")
    for row in projection["studies"]:
        if row["status"] != "ok":
            print(f"  {row['id']}: {row['error']['type']}: {row['error']['message']}")
            continue
        svg = out_dir / f"{row['id']}.svg"
        svg.write_text(render_svg(row, tokens), encoding="utf-8")
        print(f"wrote {svg}")
        for stop in row["stops"]:
            print(f"  {row['id']} @ {stop['id']}: nominal {stop['nominal_measure']:.3f} "
                  f"{row['units']}, ±{stop['worst_case_half']:.3f} worst case, "
                  f"±{stop['rss_half']:.3f} RSS, {stop['gap_count']} gap row(s)")
        for check in row["checks"]:
            print(f"    {check['check_id']}: {check['verdict']} "
                  f"({check['verdict_scope']}), margin {check['margin']:.3f}")
    # Exit 0 even when a study did not build. A worktree, or a batch-merge
    # candidate whose gitignored sweep inbox was not bridged, has no sweep to
    # fold, and that is a normal state of a checkout rather than a fault in
    # the tree: the study is carried as `error` and the viewer and the [real]
    # tier both say so. A non-zero exit would redden every such rebuild, and
    # the rail's next run would learn to ignore it. The lines below, which end
    # the output, are where the difference is made visible instead.
    for line in unbuilt_report(projection):
        print(line)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())

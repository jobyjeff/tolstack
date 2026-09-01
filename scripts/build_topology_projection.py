"""Build the topology viewer's projection -- rail layout AND every study's fold.

``apps/viewer/topology.html`` is a dumb renderer, exactly like its sibling
``apps/viewer/index.html``: it never adds, subtracts or compares a tolerance.
Everything numeric it shows comes out of this file's output, which is produced by
:func:`tolerance_stack.topology.summarize` -> :func:`tolerance_stack.stack.fold`
-- the repo's single arithmetic path (``ARCHITECTURE.md``: "there is exactly one
line where a sign can be wrong").

Output: ``<data-root>/projections/viewer/topologies.json``
(schema ``joby.tolerance_stack/topology_projection/v0``). **Wipe-and-rebuild,
derived not authored** -- delete it and re-run and you get the same bytes apart
from ``built_at``. It is its own file, owned by this script alone, so a
``results.json`` or ``crops.json`` rebuild leaves it alone and vice versa.

The layout is computed here, not in JavaScript, and that is a decision
-------------------------------------------------------------------------

The rail serialisation (:func:`serialize_topology`) is a **depth-first walk of
the graph**, not a styling choice: which rail an edge lands on is a claim about
the mechanism's branch structure, and the grid row it lines up with is the same
claim read the other way. Computing it in Python buys three things a JS
implementation would not:

* ``tests/test_topology_projection.py`` can pin it under ``pytest`` -- the
  properties that matter (every element gets exactly one row, a rail never
  overlaps itself, a branch node's rails all start at its row) are assertions,
  not something a reader eyeballs on a screenshot;
* the study chain layout and the whole-topology layout come out of **one**
  serialiser, so a row cannot line up with one and not the other;
* the viewer stays a renderer. It maps rows to pixels and nothing else.

What is *not* here: pixel sizes, colours, curve radii. Those are the page's, and
a column index is not a colour.

Usage (from the repo's MAIN checkout -- ``data/`` exists only there)::

    venv-win\\Scripts\\python.exe scripts\\build_topology_projection.py

From a worktree, tracked input is read here but output must land in the main
checkout (the worktree-reality rule)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_topology_projection.py --data-root C:\\workspace\\tolstack\\data

That output directory is **shared by every live worktree**, so this script stamps
which tree it built from and **refuses** to overwrite a projection built from a
tree this one does not contain -- ``scripts/projection_provenance.py`` holds
both, and ``--allow-older-tree`` overrides the refusal.

Stdlib only, plus this repo's own ``tolerance_stack`` package.
"""

from __future__ import annotations

import argparse
import dataclasses
import heapq
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
# This script's own directory, so `projection_provenance` imports whether we were
# started as a script (sys.path[0] is scripts/ already) or imported by a test.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import projection_provenance as prov  # noqa: E402
from tolerance_stack.topology import (  # noqa: E402
    Contribution,
    Edge,
    Node,
    Study,
    StudyError,
    Topology,
    TopologyError,
    load_study,
    load_topology,
    summarize,
    traverse,
)

SCHEMA_PROJECTION = "joby.tolerance_stack/topology_projection/v0"

TOPOLOGIES_DIR = Path("docs") / "topologies"
STACKS_DIR = Path("docs") / "tolerance_stacks"
PROJECTION_SUBDIR = Path("projections") / "viewer"
TOPOLOGIES_NAME = "topologies.json"

#: What a serialised row is. **This tuple is the definition** (the house rule
#: since ``three_field_vocabularies``, 2026-08-19: a field's domain is a
#: module-level constant, never an end-of-line comment) and
#: ``apps/viewer/topology.js``'s ``VA.TOPO_ROW_KINDS`` is its hand-copy, paired
#: word for word by ``tests/test_topology_projection.py``.
#:
#: The row mapping is the deliverable's own open question -- *"edges carry
#: values; nodes are the row boundaries -- decide the exact row mapping"* -- and
#: this is the decision: **one row per graph element, nodes and edges
#: interleaved.** A chain of n edges is 2n+1 rows. Jeff's reference image is a
#: dense git log where *every text row has its mark on a rail*, and the two
#: alternatives each drop half of that:
#:
#: * one row per **edge** only puts the interfaces between rows, so an interface
#:   -- the thing a chain's endpoints are named by, and the thing a 3D
#:   annotation surface will resolve -- has nowhere to be clicked;
#: * one row per **node** only puts the *numbers* between rows, and the numbers
#:   are what a tolerance reader came for.
#:
#: Interleaving costs vertical space and buys a page where every id in the
#: document has exactly one row, one y, and one rail mark.
ROW_KINDS = ("node", "edge")

#: What a link between two rails is. ``branch`` fans out of a branch node into a
#: freshly allocated column; ``close`` is the edge that lands back on a node the
#: walk has already emitted -- a grounded loop's closure. Both are drawn as
#: curves; neither is a third kind of edge.
LINK_KINDS = ("branch", "close")

#: Where an edge's value comes from, as the three cases ``docs/DAG_TOPOLOGY.md``
#: enumerates them ("Where an edge's value comes from"). Derived here, authored
#: nowhere: the document says which by *which key it wrote*, and the viewer needs
#: a word because the three states read differently -- a ``derived`` gap has no
#: value on purpose and must not render as a missing one.
VALUE_SOURCES = ("inline", "stack_ref", "derived")

#: How a study came out. A study that raises is a **real state the page shows**,
#: not a build failure: ``BranchAmbiguity``/``BrokenChain``/``CycleDetected``/
#: ``UnitMismatch`` all carry messages written for a human author, and an author
#: lassoing interactively will hit them constantly. Swallowing one here would
#: delete the archetype's most useful output.
STUDY_STATUSES = ("ok", "error")

# Fold outputs are rounded here, on the Python side, where the arithmetic already
# lives -- the same rule and the same two constants as
# `scripts/build_viewer_projection.py`, so a number printed on one page reads
# identically on the other. Dimension nominal/min/max are NEVER touched: those
# are transcribed values and ride through verbatim.
INTERVAL_DECIMALS = 6
COEFFICIENT_DECIMALS = 9


# ---------------------------------------------------------------------------
# The rail serialisation
# ---------------------------------------------------------------------------


class Layout:
    """A serialised graph: ordered rows, the rails they sit on, and the curves.

    Three lists, and the renderer needs nothing else:

    ``rows``
        In display order, top to bottom. Every row carries its ``column``, so a
        grid row and its rail mark share one y and one x by construction.
    ``rails``
        ``{column, start, end}`` spans, inclusive of both row indices. A rail is
        one continuous vertical line; a column may hold **several** disjoint
        rails once a branch has ended and its column been reused, which is why
        this is a list of spans and not a per-column extent.
    ``links``
        The two places a rail changes column: a ``branch`` fan-out at a branch
        node's row, and a ``close`` curve from a loop-closing edge back up to the
        node it lands on.
    """

    def __init__(self) -> None:
        self.rows: List[Dict[str, Any]] = []
        self.rails: List[Dict[str, int]] = []
        self.links: List[Dict[str, Any]] = []
        self.columns = 0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "columns": self.columns,
            "rows": self.rows,
            "rails": self.rails,
            "links": self.links,
        }


class _Serializer:
    """The column bookkeeping behind :func:`serialize_topology`.

    A class rather than a nest of closures because the free-column list, the
    open-rail table and the row list are one piece of state with four operations
    on it, and the invariant that matters -- *a column allocated at a branch node
    is not handed to anything inside the branch that runs first* -- is a
    statement about that state.
    """

    def __init__(self) -> None:
        self.layout = Layout()
        self._free: List[int] = []
        self._open: Dict[int, Dict[str, int]] = {}

    # -- columns ----------------------------------------------------------

    def allocate(self, start_row: int) -> int:
        """Open a rail in the lowest free column, starting at ``start_row``.

        ``start_row`` is the row of the node the branch fans out of, **not** the
        branch's first row: the rail has to be drawn from the fork downwards, or
        the reader cannot see where the branch left from. That is also why the
        allocation happens before the walk recurses -- see
        :func:`serialize_topology`.
        """
        if self._free:
            column = heapq.heappop(self._free)
        else:
            column = self.layout.columns
            self.layout.columns += 1
        rail = {"column": column, "start": start_row, "end": start_row}
        self.layout.rails.append(rail)
        self._open[column] = rail
        return column

    def release(self, column: int) -> None:
        """Close the rail in ``column``; the column becomes reusable.

        It does **not** touch the rail's ``end``: that was set by the last row
        actually emitted in this column, and extending it to "wherever the walk
        happens to be now" would draw a line past the branch it belongs to.
        """
        self._open.pop(column)
        heapq.heappush(self._free, column)

    def _extend(self, column: int) -> None:
        self._open[column]["end"] = len(self.layout.rows) - 1

    # -- rows -------------------------------------------------------------

    def node_row(self, node: Node, column: int, branch: bool) -> int:
        row = len(self.layout.rows)
        self.layout.rows.append({
            "row": row,
            "kind": "node",
            "id": node.id,
            "column": column,
            "branch": branch,
        })
        self._extend(column)
        return row

    def edge_row(self, edge: Edge, column: int, entered_at: str,
                 left_at: str, closes_row: Optional[int],
                 closes_column: Optional[int]) -> int:
        row = len(self.layout.rows)
        self.layout.rows.append({
            "row": row,
            "kind": "edge",
            "id": edge.id,
            "column": column,
            # Which way the WALK crossed it, which is not the same as the edge's
            # own orientation and is not a sign: a study's sign is its own, and
            # comes from `Contribution`. This pair is here so a row can say which
            # interface it left and which it reached, in the order the page reads.
            "entered_at": entered_at,
            "left_at": left_at,
            # The row/column of the already-emitted node this edge lands back on,
            # when it closes a loop. `null` for every edge that extends the walk.
            "closes_row": closes_row,
            "closes_column": closes_column,
        })
        self._extend(column)
        return row


def serialize_topology(topology: Topology) -> Layout:
    """Depth-first serialisation of a whole topology, with rail continuity.

    The rule, which is the brief's suggestion verified against the pitch system:
    **a branch keeps its column until it rejoins or ends.** Concretely --

    * the walk starts at the topology's **first node in document order**, and
      continues from any node still unvisited when that walk finishes (a
      topology with two components serialises as two blocks rather than
      silently dropping one). The author's node order is therefore the layout's
      spine: put the datum first and the page reads from it downwards. That is a
      deliberate refusal to be clever -- a heuristic root ("lowest degree",
      "most-cited") would move the whole picture when an unrelated edge is
      added, and the author already ordered the document.
    * at a node with k unwalked edges, the first continues in the node's own
      column and the other k-1 each get a fresh column, **all allocated before
      the recursion**. Allocating lazily is the bug that looks correct: branch 2
      would take a column branch 1's subtree had already used and released, and
      its rail -- which starts back up at the fork -- would be drawn straight
      through branch 1's rows.
    * an edge whose far node is already emitted is a **loop closure**. It gets a
      row and a ``close`` link back up to that node; it does not re-walk it.

    Every node and every edge of the topology gets exactly one row. That is what
    makes the grid an index of the document rather than a view of part of it.
    """
    ser = _Serializer()
    visited: Dict[str, int] = {}
    used: set = set()

    def walk(node: Node, column: int) -> None:
        pending = [e for e in topology.incident(node.id) if e.id not in used]
        # Claimed up front, all of them: a deeper walk that reaches one of these
        # edges from its far end must NOT consume it, or the branch this node
        # already allocated a column for would silently vanish from the page.
        for edge in pending:
            used.add(edge.id)
        fork_row = visited[node.id]
        columns = [column]
        for _ in pending[1:]:
            branch_column = ser.allocate(fork_row)
            ser.layout.links.append({
                "kind": "branch",
                "row": fork_row,
                "from_column": column,
                "to_row": fork_row,
                "to_column": branch_column,
            })
            columns.append(branch_column)

        for edge, edge_column in zip(pending, columns):
            far_id = edge.other_end(node.id)
            closing = far_id in visited
            row = ser.edge_row(
                edge, edge_column, entered_at=node.id, left_at=far_id,
                closes_row=visited.get(far_id) if closing else None,
                closes_column=(ser.layout.rows[visited[far_id]]["column"]
                               if closing else None),
            )
            if closing:
                ser.layout.links.append({
                    "kind": "close",
                    "row": row,
                    "from_column": edge_column,
                    "to_row": visited[far_id],
                    "to_column": ser.layout.rows[visited[far_id]]["column"],
                })
            else:
                far = topology.node(far_id)
                visited[far_id] = ser.node_row(
                    far, edge_column, branch=len(topology.incident(far_id)) > 2)
                walk(far, edge_column)
            if edge_column != column:
                ser.release(edge_column)

    for node in topology.nodes:
        if node.id in visited:
            continue
        column = ser.allocate(len(ser.layout.rows))
        visited[node.id] = ser.node_row(
            node, column, branch=len(topology.incident(node.id)) > 2)
        walk(node, column)
        ser.release(column)

    return ser.layout


def serialize_chain(chain: Sequence[Contribution]) -> Layout:
    """The same row model over one study's ordered chain: a single rail.

    A chain **is** linear -- that is what :func:`~tolerance_stack.topology.traverse`
    guarantees and what ``BranchAmbiguity`` exists to enforce -- so this is the
    degenerate case of :func:`serialize_topology` with one column, and it is
    written out rather than derived from it so the two cannot disagree about the
    row model. Rows come out ``node, edge, node, edge, ..., node``, in the order
    the sum runs, which is the order ``StudyResult.chain`` is in.
    """
    ser = _Serializer()
    layout = ser.layout
    if not chain:
        return layout
    column = ser.allocate(0)
    ser.layout.rows.append({
        "row": 0, "kind": "node", "id": chain[0].entered_at,
        "column": column, "branch": False,
    })
    ser._extend(column)
    for contribution in chain:
        ser.layout.rows.append({
            "row": len(layout.rows), "kind": "edge", "id": contribution.edge.id,
            "column": column, "entered_at": contribution.entered_at,
            "left_at": contribution.left_at,
            "closes_row": None, "closes_column": None,
        })
        ser._extend(column)
        ser.layout.rows.append({
            "row": len(layout.rows), "kind": "node", "id": contribution.left_at,
            "column": column, "branch": False,
        })
        ser._extend(column)
    ser.release(column)
    return layout


# ---------------------------------------------------------------------------
# serialising the model objects
# ---------------------------------------------------------------------------


def rounded(values: Dict[str, float], decimals: int = INTERVAL_DECIMALS
            ) -> Dict[str, float]:
    return {k: (round(v, decimals) if isinstance(v, float) else v)
            for k, v in values.items()}


def as_plain(obj: Any) -> Any:
    """A dataclass (``Dimension``, ``SourceRef``, ``SourceExport``) as JSON.

    ``dataclasses.asdict`` recurses, which is what is wanted here: a dimension's
    citation and that citation's export block come through with every field, so
    the preview pane reads the same ``source_ref`` shape ``results.json`` gives
    the stack viewer and reuses its renderers unchanged.
    """
    return None if obj is None else dataclasses.asdict(obj)


def value_source(edge: Edge) -> str:
    """One of :data:`VALUE_SOURCES`, from which key the document wrote."""
    if edge.dimension is None:
        return "derived"
    return "stack_ref" if edge.dimension_ref else "inline"


def crop_key(edge: Edge) -> Optional[Dict[str, str]]:
    """``{stack, element}`` addressing this edge's crop in ``crops.json``.

    Only a ``dimension_ref`` edge has one, and that is the honest answer rather
    than a limitation: ``crops.json`` is keyed by *stack id* and *element id*,
    and an edge that re-expresses a committed stack element **is** that element
    -- same id, same citation, same crop, no new plumbing (the topology handoff's
    lesson, section 6). An edge whose dimension is authored inline in the
    topology is in no stack, so no crop index covers it; the pane says that
    rather than reporting a stale index.

    The stack **id** is taken from the referenced file's own ``id`` field, not
    from its filename: ``crops.json``'s ``by_stack`` is keyed by ``raw["id"]``
    (``scripts/build_viewer_crops.py``), and the two agree today only by
    convention.
    """
    ref = edge.dimension_ref
    if not ref:
        return None
    stack_path = REPO_ROOT / ref["stack"]
    if not stack_path.exists():
        return None
    raw = json.loads(stack_path.read_text(encoding="utf-8"))
    return {"stack": raw["id"], "element": ref["element"]}


def confidence_of(dimension: Any) -> Optional[str]:
    """The citation's confidence, ``no_source_ref`` when there is none.

    ``None`` -- and only ``None`` -- for a **derived** gap, which carries no
    dimension at all. That is a different fact from "a dimension with no
    citation", and the two must not render alike: one is the answer a study
    computes, the other is an unsourced number.
    """
    if dimension is None:
        return None
    return dimension.source_ref.confidence if dimension.source_ref else "no_source_ref"


def project_node(topology: Topology, node: Node, branch_nodes: Sequence[str]
                 ) -> Dict[str, Any]:
    return {
        "id": node.id,
        "name": node.name,
        "kind": node.kind,
        "parts": list(node.parts),
        "note": node.note,
        "source_ref": as_plain(node.source_ref),
        "confidence": node.source_ref.confidence if node.source_ref else None,
        "degree": len(topology.incident(node.id)),
        "branch": node.id in branch_nodes,
    }


def project_edge(topology: Topology, edge: Edge) -> Dict[str, Any]:
    dimension = edge.dimension
    transform = topology.transform(edge.transform)
    return {
        "id": edge.id,
        "name": edge.name,
        "kind": edge.kind,
        "part": edge.part,
        "from": edge.from_node,
        "to": edge.to_node,
        "note": edge.note,
        "properties": edge.properties,
        "value_source": value_source(edge),
        "dimension_ref": edge.dimension_ref,
        # Resolved, not verbatim: `topology_vpa_output_to_pitch_plate.json`
        # contains no numbers at all, so the verbatim document cannot carry the
        # values this page renders. `load_topology` resolved them out of the
        # stack file, citation and role included, and this is that result.
        "dimension": as_plain(dimension),
        "confidence": confidence_of(dimension),
        # min == max: no document gives this dimension a tolerance, so every
        # interval it feeds is a LOWER bound on the real spread. Same axis, same
        # word and same colour as the stack viewer's.
        "zero_width": bool(dimension is not None and dimension.min == dimension.max),
        "crop_key": crop_key(edge),
        # The edge's DEFAULT transform, already unit-resolved. A study may
        # override it; the study's own chain rows carry what actually applied.
        "transform": {
            "id": transform.id,
            "kind": transform.kind,
            "ratio": transform.ratio,
            "units_in": transform.units_in,
            "units_out": transform.units_out,
        },
        "transform_declared": edge.transform,
    }


def project_contribution(contribution: Contribution) -> Dict[str, Any]:
    """``Contribution.as_dict()`` with the derived floats rounded for display.

    The transcribed ``value_*`` fields are **not** rounded -- they are the
    document's own numbers and ride through as written, exactly as the stack
    viewer prints an element's nominal. What is rounded is what the traversal
    computed: the signed, scaled contribution, and the weight it was scaled by.
    """
    row = contribution.as_dict()
    for key in ("nominal", "min", "max"):
        row[key] = round(row[key], INTERVAL_DECIMALS)
    for key in ("ratio", "weight"):
        row[key] = round(row[key], COEFFICIENT_DECIMALS)
    return row


def project_study(topology: Topology, study: Study, path: Path,
                  raw: Dict[str, Any]) -> Dict[str, Any]:
    """One study: its fold and its chain layout, or the error it raises.

    An error is a **result**, not a build failure. ``docs/DAG_TOPOLOGY.md``'s
    "Not a solver" is the whole reason the four exceptions exist and the reason
    their messages are written for a human author; a projection that dropped a
    study which raises would hide the archetype's most useful output behind a
    stack trace nobody reads.
    """
    row: Dict[str, Any] = {
        "id": study.id,
        "title": study.title,
        "topology": study.topology,
        "from": study.from_node,
        "to": study.to_node,
        "closes": study.closes,
        "selection": list(study.selection),
        "transforms": dict(study.transforms),
        "source_file": as_posix_rel(path),
        "notes": list(study.notes),
        "provenance": raw.get("provenance") or {},
        "status": "ok",
        "error": None,
        "result": None,
        "layout": None,
    }
    try:
        chain = traverse(topology, study)
        result = summarize(topology, study)
    except (StudyError, TopologyError) as failure:
        row["status"] = "error"
        row["error"] = {"type": type(failure).__name__, "message": str(failure)}
        return row

    projected = result.as_dict()
    projected["chain"] = [project_contribution(c) for c in result.chain]
    projected.update(rounded(result.interval.as_dict()))
    row["result"] = projected
    row["layout"] = serialize_chain(chain).as_dict()
    return row


def project_topology(path: Path, raw: Dict[str, Any], topology: Topology,
                     studies: Sequence[Tuple[Path, Dict[str, Any], Study]],
                     ) -> Dict[str, Any]:
    branch_nodes = topology.branch_nodes()
    counts: Dict[str, int] = {}
    for edge in topology.edges:
        confidence = confidence_of(edge.dimension)
        if confidence is not None:
            counts[confidence] = counts.get(confidence, 0) + 1
    return {
        "id": topology.id,
        "title": topology.title,
        "units": topology.units,
        "source_file": as_posix_rel(path),
        # The authored document, verbatim, exactly as `results.json` embeds a
        # stack. The derived blocks sit BESIDE it, never on top of it.
        "topology": raw,
        "parts": [dataclasses.asdict(p) for p in topology.parts],
        "nodes": [project_node(topology, n, branch_nodes) for n in topology.nodes],
        "edges": [project_edge(topology, e) for e in topology.edges],
        "transforms": [dataclasses.asdict(topology.transform(t.id))
                       for t in topology.transforms],
        "branch_nodes": branch_nodes,
        "layout": serialize_topology(topology).as_dict(),
        "confidence_counts": counts,
        "notes": list(topology.notes),
        "studies": [project_study(topology, s, p, r) for p, r, s in studies],
    }


def as_posix_rel(path: Path) -> str:
    """Repo-relative POSIX path, so the projection stays portable prose."""
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


BUILT_BY = "scripts/build_topology_projection.py"


def build(topologies_dir: Path,
          provenance: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    topologies: List[Tuple[Path, Dict[str, Any], Topology]] = []
    for path in sorted(topologies_dir.glob("topology_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        topologies.append((path, raw, load_topology(path)))

    studies: Dict[str, List[Tuple[Path, Dict[str, Any], Study]]] = {}
    orphans: List[Dict[str, str]] = []
    known = {t.id for _, _, t in topologies}
    for path in sorted(topologies_dir.glob("study_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        study = load_study(path)
        if study.topology not in known:
            # Named and carried, never dropped: a study pointing at a topology
            # that is not here is a finding about the documents, and the page
            # says so in the banner.
            orphans.append({"study": study.id, "topology": study.topology,
                            "source_file": as_posix_rel(path)})
            continue
        studies.setdefault(study.topology, []).append((path, raw, study))

    if provenance is None:
        provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY)

    return {
        "schema": SCHEMA_PROJECTION,
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        prov.PROVENANCE_KEY: provenance,
        "topologies_dir": as_posix_rel(topologies_dir),
        "row_kinds": list(ROW_KINDS),
        "link_kinds": list(LINK_KINDS),
        "value_sources": list(VALUE_SOURCES),
        "study_statuses": list(STUDY_STATUSES),
        "topologies": [
            project_topology(path, raw, topology, studies.get(topology.id, []))
            for path, raw, topology in topologies
        ],
        "orphan_studies": orphans,
    }


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--data-root",
        default=str(REPO_ROOT / "data"),
        help="repo data/ dir (MAIN checkout's, if you are in a worktree)",
    )
    ap.add_argument(
        "--topologies-dir",
        default=str(REPO_ROOT / TOPOLOGIES_DIR),
        help="directory holding topology_*.json + study_*.json",
    )
    ap.add_argument(
        "--allow-older-tree",
        action="store_true",
        help="overwrite a projection built from a tree this one does not contain "
        "(the gate refuses by default -- see scripts/projection_provenance.py)",
    )
    args = ap.parse_args(argv)

    topologies_dir = Path(args.topologies_dir)
    if not topologies_dir.is_dir():
        print(f"SKIP: no topologies dir at {topologies_dir}", file=sys.stderr)
        return 1

    out_dir = Path(args.data_root) / PROJECTION_SUBDIR
    out_path = out_dir / TOPOLOGIES_NAME

    # The gate runs BEFORE the build, not before the write: refusing after the
    # work would still be correct and would still read as a crash.
    provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY)
    rebuild_command = (
        f"python scripts\\build_topology_projection.py "
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

    projection = build(topologies_dir, provenance)

    # Wipe-and-rebuild, but only this script's own file.
    out_dir.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()
    out_path.write_text(
        json.dumps(projection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"wrote {out_path}")
    for topology in projection["topologies"]:
        layout = topology["layout"]
        print(
            f"  {topology['id']:28s} {len(topology['nodes']):2d} nodes, "
            f"{len(topology['edges']):2d} edges, "
            f"{len(topology['branch_nodes'])} branch point(s), "
            f"{len(layout['rows'])} rows over {layout['columns']} rail(s)"
        )
        for study in topology["studies"]:
            if study["status"] == "ok":
                result = study["result"]
                print(
                    f"    {study['id']:44s} {len(result['chain'])} contributions, "
                    f"±{result['worst_case_half']} {result['units']} worst case, "
                    f"±{result['rss_half']} RSS"
                )
            else:
                print(f"    {study['id']:44s} {study['error']['type']}: "
                      f"{study['error']['message'][:70]}")
    for orphan in projection["orphan_studies"]:
        print(f"  ORPHAN {orphan['study']}: no topology {orphan['topology']!r}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())

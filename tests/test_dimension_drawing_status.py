"""Where an open dimension's drawing stands, in the topology projection.

Handoff ``an_open_dimension_says_where_its_drawing_stands`` (2026-11-19): every
structural edge with no ``dimension`` carries ``drawing_status`` -- its part's
own drawing has a drawing-checker run (``read``), only another dash number or
the bare base has one (``other_dash_read``), the part names a drawing nothing
has read (``not_read``), or the part has no drawing number (``no_drawing``).
A drawing-checker root that cannot be read makes every one ``unknown``, never
``not_read``. Each model counts them and lists the drawings that are read and
still uncited, most waiting first.

The join is ``part_drawing_runs``' -- pinned there, value by value -- so what
is pinned here is the word each edge gets and what rides with it.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as B  # noqa: E402
from tolerance_stack.topology import load_topology  # noqa: E402

TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
V2_PATH = TOPOLOGIES_DIR / "topology_vpa_end_stop_v2.json"
DC_ROOT = B.DEFAULT_DC_ROOT


def _run(root: Path, name: str, number: str) -> None:
    run = root / "data" / "runs" / name
    run.mkdir(parents=True)
    (run / "run_meta.json").write_text(json.dumps({"run_id": name}), encoding="utf-8")
    stem = name.split("_", 2)[2]
    page = {"source_pdf": "x.pdf", "title_block": {"drawing_no": number, "revision": "A"},
            "drawing_no": number, "revision": "A"}
    (run / f"{stem}_p01.json").write_text(json.dumps(page), encoding="utf-8")


def _drawing_checker(tmp_path: Path) -> Path:
    root = tmp_path / "drawing-checker"
    _run(root, "20261001_100000_900001-001_A", "900001-001")
    _run(root, "20261101_100000_900001-001_B", "900001-001")
    _run(root, "20261002_100000_900003-001_A", "900003-001")
    return root


def _spec(kind: str = "spec") -> dict:
    return {"kind": kind, "document": "NAS0000 Rev 1.pdf", "confidence": "inferred"}


def _dimension(source_ref: dict) -> dict:
    return {"id": "d", "name": "d", "nominal": 1.0, "min": 0.9, "max": 1.1,
            "source_ref": source_ref}


def _topologies(tmp_path: Path) -> Path:
    """One part per status, each with one open dimension; plus a cited edge
    and a gap edge, neither of which is open."""
    parts = [
        {"id": "own", "name": "own drawing read", "drawing": "900001-001"},
        {"id": "other", "name": "another dash read", "drawing": "900003-002"},
        {"id": "unread", "name": "nothing read", "drawing": "900004-001"},
        {"id": "bolt", "name": "NAS0000 bolt"},
        {"id": "pin", "name": "a pin with no citation"},
    ]
    nodes = [{"id": f"{p['id']}_{end}", "name": f"{p['id']} {end}", "kind": "datum_feature",
              "parts": [p["id"]]} for p in parts for end in ("a", "b")]
    edges = [{"id": f"{p['id']}_open", "name": f"{p['id']} open", "kind": "structural",
              "part": p["id"], "from": f"{p['id']}_a", "to": f"{p['id']}_b"}
             for p in parts]
    edges.append({"id": "bolt_cited", "name": "bolt cited", "kind": "structural",
                  "part": "bolt", "from": "bolt_b", "to": "bolt_a",
                  "dimension": _dimension(_spec())})
    edges.append({"id": "own_cited", "name": "own cited", "kind": "structural",
                  "part": "own", "from": "own_b", "to": "own_a",
                  "dimension": _dimension({"kind": "workbook", "document": "w.xlsx",
                                           "confidence": "untraced"})})
    edges.append({"id": "gap", "name": "gap", "kind": "gap", "from": "own_b",
                  "to": "other_a"})
    doc = {"schema": "joby.tolerance_stack/topology/v0", "id": "statuses",
           "title": "one open dimension per drawing status",
           "description": "Fixture: nothing here is a real part.", "units": "mm",
           "parts": parts, "nodes": nodes, "edges": edges}
    out = tmp_path / "docs" / "topologies"
    out.mkdir(parents=True)
    (out / "topology_statuses.json").write_text(json.dumps(doc), encoding="utf-8")
    return out


def _model(tmp_path: Path, dc_root: Path) -> dict:
    projection = B.build(_topologies(tmp_path), {"built_at": "test"},
                         drawing_checker_root=dc_root)
    (model,) = projection["topologies"]
    return model


def _statuses(model: dict) -> dict:
    return {e["id"]: e["drawing_status"] for e in model["edges"]}


def test_each_open_dimension_gets_its_word_and_what_rides_with_it(tmp_path):
    got = _statuses(_model(tmp_path, _drawing_checker(tmp_path)))
    newest = {"run_dir": "20261101_100000_900001-001_B", "drawing": "900001-001",
              "revision": "A", "date": "2026-11-01"}
    assert got["own_open"] == {"status": "read", "drawing": "900001-001",
                               "run": newest, "spec": None}
    assert got["other_open"] == {
        "status": "other_dash_read", "drawing": "900003-002",
        "run": {"run_dir": "20261002_100000_900003-001_A", "drawing": "900003-001",
                "revision": "A", "date": "2026-10-02"},
        "spec": None}
    assert got["unread_open"] == {"status": "not_read", "drawing": "900004-001",
                                  "run": None, "spec": None}
    # The spec is the one the part's own cited row reads off, never its prose.
    assert got["bolt_open"] == {"status": "no_drawing", "drawing": None,
                                "run": None, "spec": "NAS0000 Rev 1.pdf"}
    assert got["pin_open"] == {"status": "no_drawing", "drawing": None,
                               "run": None, "spec": None}
    for status in got.values():
        if status is not None:
            assert tuple(status) == B.DRAWING_STATUS_FIELDS


def test_a_cited_edge_and_a_gap_edge_are_not_open(tmp_path):
    got = _statuses(_model(tmp_path, _drawing_checker(tmp_path)))
    # Cited, even at `untraced`: it has a value, so it is not waiting on a drawing.
    assert got["own_cited"] is None
    assert got["bolt_cited"] is None
    assert got["gap"] is None


def test_the_model_counts_every_word_and_lists_the_read_drawings_still_uncited(tmp_path):
    model = _model(tmp_path, _drawing_checker(tmp_path))
    assert model["drawing_status_counts"] == {
        "read": 1, "other_dash_read": 1, "not_read": 1, "no_drawing": 2, "unknown": 0}
    assert tuple(model["drawing_status_counts"]) == B.DRAWING_STATUSES
    assert model["drawings_read_uncited"] == [{
        "drawing": "900001-001",
        "run": {"run_dir": "20261101_100000_900001-001_B", "drawing": "900001-001",
                "revision": "A", "date": "2026-11-01"},
        "parts": ["own"], "edges": ["own_open"], "waiting": 1}]


def test_an_absent_drawing_checker_claims_nothing(tmp_path):
    model = _model(tmp_path, tmp_path / "absent")
    open_ = {k: v for k, v in _statuses(model).items() if v is not None}
    assert sorted(open_) == ["bolt_open", "other_open", "own_open", "pin_open", "unread_open"]
    for status in open_.values():
        assert status["status"] == "unknown"
        assert status["run"] is None and status["spec"] is None
    assert model["drawing_status_counts"] == {
        "read": 0, "other_dash_read": 0, "not_read": 0, "no_drawing": 0, "unknown": 5}
    assert model["drawings_read_uncited"] == []


def test_the_read_and_uncited_list_puts_the_most_waiting_first():
    def edge(eid, drawing):
        return {"id": eid, "part": "p" + drawing, "drawing_status": {
            "status": "read", "drawing": drawing, "spec": None,
            "run": {"run_dir": "r" + drawing, "drawing": drawing,
                    "revision": None, "date": "2026-01-01"}}}
    rows = B.drawings_read_uncited(
        [edge("a", "2"), edge("b", "1"), edge("c", "1"), edge("d", "3"),
         {"id": "e", "part": "x", "drawing_status": None}])
    assert [(r["drawing"], r["waiting"], r["edges"]) for r in rows] == [
        ("1", 2, ["b", "c"]), ("2", 1, ["a"]), ("3", 1, ["d"])]


# --------------------------------------------------------------------------- #
# [real] -- v2 against drawing-checker's own runs                             #
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def real_v2():
    if not (DC_ROOT / "data" / "runs").is_dir():
        pytest.skip(f"[real] no drawing-checker runs at {DC_ROOT / 'data' / 'runs'}")
    runs = B.drawing_checker_runs(DC_ROOT)
    models = {t.id: t for t in (load_topology(p) for p in
                                sorted(TOPOLOGIES_DIR.glob("topology_*.json")))}
    raw = json.loads(V2_PATH.read_text(encoding="utf-8"))
    topology = models[raw["id"]]
    # No studies: the statuses read the parts and edges, and nothing else.
    return topology, runs, B.project_topology(V2_PATH, raw, topology, [], runs=runs,
                                              models=models)


def test_real_v2_counts_are_the_parts_runs_counted_again(real_v2):
    """The counts, re-derived here from the same inputs by a second reading:
    each open dimension's part number against the run list, exact or by base."""
    topology, runs, model = real_v2
    numbers = {r["drawing"] for r in runs}
    bases = {n.split("-")[0] for n in numbers}
    drawings = {p.id: p.drawing for p in topology.parts}
    expected = {status: 0 for status in B.DRAWING_STATUSES}
    for edge in topology.edges:
        if edge.kind != "structural" or edge.dimension is not None:
            continue
        number = drawings[edge.part]
        if not number:
            expected["no_drawing"] += 1
        elif number in numbers:
            expected["read"] += 1
        elif number.split("-")[0] in bases:
            expected["other_dash_read"] += 1
        else:
            expected["not_read"] += 1
    assert model["drawing_status_counts"] == expected
    assert sum(expected.values()) > 0


def test_real_v2_every_read_link_is_an_existing_run_folder(real_v2):
    _, _, model = real_v2
    linked = [e["drawing_status"]["run"]["run_dir"] for e in model["edges"]
              if e["drawing_status"] and e["drawing_status"]["run"]]
    assert linked
    for run_dir in linked:
        assert (DC_ROOT / "data" / "runs" / run_dir).is_dir(), run_dir
    for row in model["drawings_read_uncited"]:
        assert (DC_ROOT / "data" / "runs" / row["run"]["run_dir"]).is_dir()

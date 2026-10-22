"""A study's completeness is derived from its terms, never authored.

``StudyResult.completeness()`` folds the *terms* of a study -- with or without
checks -- into ``{complete, reason, open_terms}``. These tests pin it on a
small in-memory topology (every case on purpose), then over the real studies
under ``docs/topologies/`` and through the projection the viewer reads.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from tolerance_stack.stack import SourceRef
from tolerance_stack.topology import (
    COMPLETENESS_NAMED,
    Dimension,
    Edge,
    Node,
    Part,
    Study,
    StudyError,
    Topology,
    load_study,
    load_topology,
    summarize,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
sys.path.insert(0, str(REPO_ROOT / "scripts"))

TRACED = SourceRef(kind="drawing", confidence="traced")
ASSUMED = SourceRef(kind="assumed", confidence="untraced", note="placeholder")


def _topology(refs: dict[str, SourceRef | None]) -> Topology:
    """A straight chain n0 - n1 - ... , one edge per entry of ``refs``."""
    ids = list(refs)
    nodes = [Node(id=f"n{i}", name=f"n{i}", parts=("p",), kind="datum_feature")
             for i in range(len(ids) + 1)]
    edges = [
        Edge(id=eid, name=eid, from_node=f"n{i}", to_node=f"n{i + 1}", part="p",
             dimension=Dimension(id=eid, name=eid, nominal=1.0, min=0.9, max=1.1,
                                 source_ref=refs[eid]))
        for i, eid in enumerate(ids)
    ]
    return Topology(id="t", title="t", units="mm", parts=[Part(id="p", name="p")],
                    nodes=nodes, edges=edges)


def _study(topology: Topology, **extra) -> Study:
    return Study(id="s", title="s", topology="t", from_node="n0",
                 to_node=f"n{len(topology.edges)}",
                 selection=[e.id for e in topology.edges], **extra)


def test_all_traced_is_complete():
    t = _topology({"a": TRACED, "b": TRACED})
    c = summarize(t, _study(t)).completeness()
    assert c == {"complete": True, "reason": None, "open_terms": []}


def test_one_assumed_term_is_incomplete_and_named():
    t = _topology({"a": TRACED, "b": ASSUMED, "c": TRACED})
    c = summarize(t, _study(t)).completeness()
    assert c["complete"] is False
    assert c["open_terms"] == ["b"]
    assert "1 of 3" in c["reason"] and "b" in c["reason"]


def test_an_untraced_term_is_incomplete_without_being_assumed():
    t = _topology({"a": SourceRef(kind="drawing", confidence="untraced")})
    assert summarize(t, _study(t)).completeness()["open_terms"] == ["a"]


def test_a_term_with_no_source_ref_is_open():
    t = _topology({"a": None})
    assert summarize(t, _study(t)).completeness()["open_terms"] == ["a"]


def test_a_gap_edge_with_a_value_is_open():
    t = _topology({"a": TRACED, "b": TRACED})
    t.edge("b").kind = "gap"
    t.edge("b").part = None
    assert summarize(t, _study(t)).completeness()["open_terms"] == ["b"]


def test_open_terms_follow_selection_order_and_the_reason_names_two():
    refs = {"a": ASSUMED, "b": ASSUMED, "c": ASSUMED}
    t = _topology(refs)
    study = _study(t)
    study.selection = ["c", "a", "b"]       # the walk reorders; the lasso does not
    c = summarize(t, study).completeness()
    assert c["open_terms"] == ["c", "a", "b"]
    named = c["reason"].split(": ")[1]
    assert named == "c, a and 1 more"
    assert COMPLETENESS_NAMED == 2          # the sentence's own "first two"


def test_a_study_with_no_checks_still_says_it_is_incomplete():
    t = _topology({"a": ASSUMED})
    study = _study(t, checks=[])
    assert not study.checks
    assert summarize(t, study).completeness()["complete"] is False


def test_a_hand_written_completeness_is_refused():
    doc = {"id": "s", "title": "s", "topology": "t", "from": "n0", "to": "n1",
           "selection": ["a"],
           "completeness": {"complete": True, "reason": None, "open_terms": []}}
    with pytest.raises(StudyError, match="derived"):
        Study.from_dict(doc)


def test_the_fold_carries_it_in_the_study_result_dict():
    t = _topology({"a": ASSUMED})
    assert summarize(t, _study(t)).as_dict()["completeness"]["open_terms"] == ["a"]


def _real():
    topologies = {}
    for path in TOPOLOGIES_DIR.glob("topology_*.json"):
        topology = load_topology(path)
        topologies[topology.id] = topology
    for path in sorted(TOPOLOGIES_DIR.glob("study_*.json")):
        study = load_study(path)
        yield study, topologies[study.topology]


def test_every_real_study_carries_a_derived_completeness():
    seen = 0
    for study, topology in _real():
        c = summarize(topology, study).as_dict()["completeness"]
        assert c["complete"] == (not c["open_terms"]), study.id
        assert set(c["open_terms"]) <= set(study.selection), study.id
        seen += 1
    assert seen > 20


def test_no_real_study_file_authors_a_completeness():
    for path in sorted(TOPOLOGIES_DIR.glob("study_*.json")):
        assert "completeness" not in json.loads(path.read_text(encoding="utf-8")), path


def test_the_travel_study_has_no_checks_and_still_reports_its_open_terms():
    study = load_study(
        TOPOLOGIES_DIR / "study_vpa_pitch_linkage_travel_between_end_stops.json")
    assert not study.checks
    topology = load_topology(TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json")
    c = summarize(topology, study).completeness()
    # Complete once every term cites a drawing or a band; open until then.
    assert c["complete"] == (not c["open_terms"])
    assert set(c["open_terms"]) <= set(study.selection)


def test_the_projection_row_carries_it():
    from build_topology_projection import project_study

    study = load_study(
        TOPOLOGIES_DIR / "study_vpa_pitch_linkage_travel_between_end_stops.json")
    topology = load_topology(TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json")
    path = TOPOLOGIES_DIR / "study_vpa_pitch_linkage_travel_between_end_stops.json"
    row = project_study(topology, study, path, json.loads(path.read_text("utf-8")))
    assert row["checks"] == []
    assert row["result"]["completeness"] == summarize(
        topology, study).completeness()

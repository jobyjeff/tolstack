"""The end-stop travel study, pinned against the real documents.

``study_vpa_pitch_linkage_travel_between_end_stops`` folds four terms to the travel
between the gas spring's end stops. Since 2026-10-20 two of them are read off their
drawings (214699-002 A, 214958-002 A) and two are mesh fits under a placeholder band
because 214698-002 A and 213668-002 A.1 carry no callout for them. Nothing else pins
those numbers: ``test_topology.py`` only checks that every study loads and sums.

Numbers are asserted to three decimals, value by value, so a re-cited edge that moves
the total is a red test and not a quiet change. The traced count the worksheet quotes
in prose is derived here from the topology, not written twice.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from tolerance_stack.topology import load_study, load_topology, summarize

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
TOPOLOGY_FILE = TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json"
STUDY_FILE = TOPOLOGIES_DIR / "study_vpa_pitch_linkage_travel_between_end_stops.json"

#: edge id -> (nominal, half band, source kind, confidence). The cited pair carries the
#: drawings' own bands; the other two carry the stand-in width.
TERMS = {
    "piston_head_upper_thickness": (6.556, 0.05, "assumed", "untraced"),
    "piston_head_lower_thickness": (2.491, 0.05, "drawing", "traced"),
    "piston_cover_flange_to_end_stop": (82.154, 0.02, "drawing", "traced"),
    "gas_spring_mount_flange_to_end_stop": (8.667, 0.05, "assumed", "untraced"),
}

#: The drawing runs the two cited terms read, by run id.
CITED_RUNS = {
    "piston_head_lower_thickness": "20261020_134300_214699-002-A",
    "piston_cover_flange_to_end_stop": "20261020_134315_214958-002-A",
}


@pytest.fixture(scope="module")
def topology():
    return load_topology(TOPOLOGY_FILE)


@pytest.fixture(scope="module")
def result(topology):
    return summarize(topology, load_study(STUDY_FILE))


def test_the_study_folds_to_the_pinned_travel(result):
    i = result.interval
    assert i.nominal == pytest.approx(64.440, abs=5e-4)
    assert i.min == pytest.approx(64.270, abs=5e-4)
    assert i.max == pytest.approx(64.610, abs=5e-4)
    assert i.rss_half == pytest.approx(0.0889, abs=5e-5)


def test_each_term_is_the_pinned_value_with_the_pinned_band(topology):
    for edge_id, (nominal, half, _kind, _conf) in TERMS.items():
        dim = topology.edge(edge_id).dimension
        assert dim.nominal == pytest.approx(nominal, abs=5e-4), edge_id
        assert dim.plus_minus == pytest.approx(half, abs=5e-4), edge_id
        assert dim.min == pytest.approx(nominal - half, abs=5e-4), edge_id
        assert dim.max == pytest.approx(nominal + half, abs=5e-4), edge_id


def test_each_term_is_cited_as_pinned(topology):
    for edge_id, (_n, _h, kind, conf) in TERMS.items():
        ref = topology.edge(edge_id).dimension.source_ref
        assert (ref.kind, ref.confidence) == (kind, conf), edge_id


def test_the_cited_terms_name_the_run_they_were_read_from(topology):
    for edge_id, run_id in CITED_RUNS.items():
        ref = topology.edge(edge_id).dimension.source_ref
        assert ref.export is not None and ref.export.established, edge_id
        assert ref.export.run_ids == [run_id], edge_id
        assert run_id in ref.note, edge_id


def test_the_traced_count_the_worksheet_quotes_is_the_topologys(topology):
    """Two of the chain's four instances are traced; the worksheet says so in prose."""
    refs = [topology.edge(e).dimension.source_ref for e in TERMS]
    assert sum(r.confidence == "traced" for r in refs) == 2
    assert len(refs) == 4
    sheet = (REPO_ROOT / "docs" / "tolerance_stacks"
             / "WORKSHEET_gas_spring_end_stop_travel.md").read_text(encoding="utf-8")
    assert "four element instances, **two** `traced`" in sheet


def test_the_study_runs_from_the_step_face_to_the_cover_shoulder(topology):
    study = load_study(STUDY_FILE)
    assert (study.from_node, study.to_node) == (
        "piston_head_upper_step_face", "piston_cover_end_stop_shoulder")
    gap = topology.edge(study.closes)
    assert (gap.from_node, gap.to_node) == (study.from_node, study.to_node)
    # the far stop is the cover's; the datum is the mount's surface under the heads
    assert topology.node("piston_cover_end_stop_shoulder").parts == (
        "piston_cover_214958_002",)
    assert "gas_spring_mount_213668_002" in topology.node("endstop_feather_contact").parts

"""The end-stop travel study, pinned against the real documents.

``study_vpa_pitch_linkage_travel_between_end_stops`` folds four terms to the travel
between the gas spring's end stops. Since 2026-10-20 two of them are read off
dimensions on their drawings (214699-002 A, 214958-002 A); since 2026-10-22 the other
two, which 214698-002 A and 213668-002 A.1 do not dimension, are banded by each
drawing's general profile note (the SOP's "What a term cites when its drawing does
not band it"). Nothing else pins those numbers: ``test_topology.py`` only checks that
every study loads and sums.

Numbers are asserted to three decimals, value by value, so a re-cited edge that moves
the total is a red test and not a quiet change. The traced count the worksheet quotes
in prose is derived here from the topology, not written twice.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from tolerance_stack.stack import GENERAL_NOTE_PHRASE
from tolerance_stack.topology import load_study, load_topology, summarize

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
TOPOLOGY_FILE = TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json"
STUDY_FILE = TOPOLOGIES_DIR / "study_vpa_pitch_linkage_travel_between_end_stops.json"

#: edge id -> (nominal, half band, source kind, confidence). Every band is the
#: drawing's: a dimension's, or half the general profile note's zone.
TERMS = {
    "piston_head_upper_thickness": (6.556, 0.25, "drawing", "traced"),
    "piston_head_lower_thickness": (2.491, 0.05, "drawing", "traced"),
    "piston_cover_flange_to_end_stop": (82.154, 0.02, "drawing", "traced"),
    "gas_spring_mount_flange_to_end_stop": (8.667, 0.5, "drawing", "traced"),
}

#: The drawing runs the cited terms read, by run id.
CITED_RUNS = {
    "piston_head_upper_thickness": "20261020_134240_214698-002-A",
    "piston_head_lower_thickness": "20261020_134300_214699-002-A",
    "piston_cover_flange_to_end_stop": "20261020_134315_214958-002-A",
    "gas_spring_mount_flange_to_end_stop":
        "20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER",
}

#: edge id -> (drawing, sheet, general-note number, profile zone width) for the two
#: terms a general note bands. The band is half the zone, bilateral.
GENERAL_NOTES = {
    "piston_head_upper_thickness": ("214698-002", 1, 6, 0.5),
    "gas_spring_mount_flange_to_end_stop": ("213668-002", 1, 12, 1.0),
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
    assert i.min == pytest.approx(63.620, abs=5e-4)
    assert i.max == pytest.approx(65.260, abs=5e-4)
    assert i.rss_half == pytest.approx(0.5616, abs=5e-5)


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


def test_the_two_general_note_terms_cite_the_note_not_a_dimension(topology):
    """A general-note band is half the note's zone and anchored to the note."""
    for edge_id, (document, sheet, number, zone) in GENERAL_NOTES.items():
        dim = topology.edge(edge_id).dimension
        ref = dim.source_ref
        assert (ref.document, ref.sheet, ref.note_number) == (document, sheet, number), edge_id
        assert ref.note.startswith(GENERAL_NOTE_PHRASE), edge_id
        assert dim.plus_minus == pytest.approx(zone / 2, abs=1e-9), edge_id
        assert "UNLESS OTHERWISE SPECIFIED" in ref.callout, edge_id
    # ...and the dimensioned two are not note-banded.
    for edge_id in set(TERMS) - set(GENERAL_NOTES):
        assert topology.edge(edge_id).dimension.source_ref.note_number is None, edge_id


def test_the_76_86_is_recorded_on_the_mount_and_not_folded(topology):
    """Jeff: constrain 8.667 directly; the datum-A height is a fact, not a term."""
    edge = topology.edge("gas_spring_mount_datum_a_to_end_stop")
    assert edge.part == "gas_spring_mount_213668_002"
    assert (edge.dimension.nominal, edge.dimension.plus_minus) == (76.86, 0.1)
    assert edge.dimension.source_ref.confidence == "traced"
    assert edge.id not in load_study(STUDY_FILE).selection


def test_the_traced_count_the_worksheet_quotes_is_the_topologys(topology):
    """All four of the chain's instances are traced; the worksheet says so in prose."""
    refs = [topology.edge(e).dimension.source_ref for e in TERMS]
    assert sum(r.confidence == "traced" for r in refs) == 4
    assert len(refs) == 4
    sheet = (REPO_ROOT / "docs" / "tolerance_stacks"
             / "WORKSHEET_gas_spring_end_stop_travel.md").read_text(encoding="utf-8")
    assert "four element instances, **four** `traced`" in sheet


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

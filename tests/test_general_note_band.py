"""What a term cites when its drawing does not band it -- the two load-time rules.

``docs/SOP_TOLERANCE_STACK.md``'s section of that name (2026-10-22) makes two
things machine-checked rather than conventions:

* a ``drawing`` citation banded by the drawing's general profile note carries the
  note's number on a named sheet, and its ``note`` opens with
  ``GENERAL_NOTE_PHRASE`` -- both or neither, so the field a consumer reads and the
  words a reader reads cannot disagree;
* the ±0.05 ``assumed`` stand-in is retired for a drawing-defined surface: a
  topology edge on a part that has a drawing refuses an ``assumed`` band unless
  the citation says why no drawing governs that quantity.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from tolerance_stack.stack import GENERAL_NOTE_PHRASE, SourceRef
from tolerance_stack.topology import (
    Edge, Node, Part, Topology, TopologyError, load_topology,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"


def _note_ref(**overrides):
    fields = dict(kind="drawing", document="214698-002", revision="A", sheet=1,
                  callout="6. ⌓0.5 UNLESS OTHERWISE SPECIFIED.",
                  confidence="traced", note=GENERAL_NOTE_PHRASE + ". why",
                  note_number=6)
    fields.update(overrides)
    return SourceRef(**fields)


def test_a_general_note_citation_names_its_note_on_a_sheet():
    ref = _note_ref()
    assert (ref.kind, ref.confidence, ref.note_number) == ("drawing", "traced", 6)


@pytest.mark.parametrize("overrides, needle", [
    ({"note_number": None}, "note_number"),
    ({"note": "a dimension, read off the view"}, "must open with"),
    ({"sheet": None}, "sheet"),
    ({"kind": "assumed", "confidence": "untraced"}, "`drawing` citation"),
])
def test_a_general_note_citation_missing_a_half_is_refused(overrides, needle):
    with pytest.raises(ValueError, match=needle):
        _note_ref(**overrides)


def test_no_drawing_governs_explains_only_an_assumed_band():
    with pytest.raises(ValueError, match="no_drawing_governs"):
        SourceRef(kind="drawing", confidence="traced", no_drawing_governs="x")
    SourceRef(kind="assumed", no_drawing_governs="the feature exists on no drawing")


def _topology_with(source_ref, drawing="214698-002"):
    return Topology(
        id="t", title="t", units="mm",
        parts=[Part(id="p", name="p", drawing=drawing)],
        nodes=[Node(id="a", name="a", parts=("p",), kind="datum_feature"),
               Node(id="b", name="b", parts=("p",), kind="datum_feature")],
        edges=[Edge.from_dict({
            "id": "e", "name": "e", "kind": "structural", "part": "p",
            "from": "a", "to": "b",
            "dimension": {"id": "e", "name": "e", "nominal": 1.0, "min": 0.95,
                          "max": 1.05, "plus_minus": 0.05,
                          "source_ref": source_ref}})],
    )


def test_an_assumed_band_on_a_drawing_defined_part_is_refused():
    with pytest.raises(TopologyError, match="governs it"):
        _topology_with({"kind": "assumed", "confidence": "untraced", "note": "PLACEHOLDER"})


def test_an_assumed_band_survives_where_no_drawing_governs_it():
    _topology_with({"kind": "assumed", "confidence": "untraced",
                    "no_drawing_governs": "a design-concept feature on no drawing"})
    _topology_with({"kind": "assumed", "confidence": "untraced"}, drawing=None)


def test_every_committed_assumed_band_on_a_drawn_part_says_why():
    """The live tree loads, and every exemption it uses is written out."""
    exempt = []
    for path in sorted(TOPOLOGIES_DIR.glob("topology_*.json")):
        topology = load_topology(path)
        for edge in topology.edges:
            ref = edge.dimension.source_ref if edge.dimension else None
            if ref is not None and ref.no_drawing_governs:
                assert ref.kind == "assumed"
                assert topology.part(edge.part).drawing
                exempt.append(edge.id)
    # The two pitch-system placeholders filed for re-shaping under the rule,
    # and the four the 2026-10-26 fold exposed when the pitch-system half met
    # the linkage half's part drawings (hub 214373-002, blade root 216332-001);
    # all six in ISSUE_20261022_two_pitch_system_placeholders_are_exempted_...
    # A seventh is a new decision, not a quiet addition.
    assert sorted(exempt) == ["blade_root_clocking_to_oml",
                              "hub_ring_gear_seat_position",
                              "hub_top_deck_to_brake_mount",
                              "hub_top_deck_to_vpa_mount",
                              "pitch_plate_flange_to_brake_attachment",
                              "vpa_mount_to_end_stop_feature"]

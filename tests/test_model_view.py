"""The model view (``tolerance_stack/model_view.py``), value by value.

Added 2026-11-10 by handoff ``the_model_is_derived_once_and_the_left_column_is_
its_tree``. Three things are pinned here and nowhere else:

* **the counts on model v2**, as the strategy session derived them by hand
  (``dispatch/docs/strategy/drafts/mockups/tolstack_shell_20261109/template.html``,
  ``buildModel``): 5 bodies, 15 parts, 34 features (25 nodes, 9 on two parts),
  22 dimensions, 17 interfaces (9 contacts + 8 gaps), 8 between two bodies and
  9 inside one (ground 5, pitch plate 3, blade 1);
* **that the view writes no membership rule of its own**: every ``body``,
  ``bodies`` and ``within`` it emits is re-derived here from ``Topology``'s
  ``body_of`` / ``node_bodies`` / ``edge_body`` and compared;
* **the part-label rule**, case by case, including the two spellings it has to
  put together (a number at the head of ``name``, a number at the tail of
  ``display_name``).

The projection carries the view (``topologies[].model``) and the label on every
part (``parts[].label``); the fixture tier's ``[real]`` shape check pairs the
viewer fixture against that, so this file asks only that the block is there and
is the function's own output.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from tolerance_stack.model_view import (
    CONTACT_KIND,
    INTERFACE_SOURCES,
    feature_id,
    model_view,
    part_label,
)
from tolerance_stack.topology import Part, load_topology

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
MODEL_V2 = TOPOLOGIES_DIR / "topology_vpa_end_stop_v2.json"
MODEL_V1 = TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json"

sys.path.insert(0, str(REPO_ROOT / "scripts"))
import build_topology_projection as B  # noqa: E402


@pytest.fixture(scope="module")
def v2():
    return load_topology(MODEL_V2)


@pytest.fixture(scope="module")
def v2_view(v2):
    return model_view(v2)


@pytest.fixture(scope="module")
def v1_view():
    return model_view(load_topology(MODEL_V1))


# --- the counts the strategy session derived by hand --------------------------

MODEL_V2_COUNTS = {
    "bodies": 5, "parts": 15, "features": 34, "dimensions": 22,
    "interfaces": 17, "contacts": 9, "gaps": 8,
    "between_bodies": 8, "within_bodies": 9, "joints": 15,
}

#: Interfaces inside one body, per body: ground 5, pitch plate 3, blade 1.
MODEL_V2_WITHIN = {"base": 5, "pitch_plate": 3, "blade": 1}


def test_model_v2_has_the_counts_the_strategy_session_derived(v2_view):
    assert v2_view["counts"] == MODEL_V2_COUNTS
    assert len(v2_view["bodies"]) == 5
    assert len(v2_view["parts"]) == 15
    assert len(v2_view["features"]) == 34
    assert sum(1 for f in v2_view["features"] if f["shared"]) == 18, \
        "9 nodes on two parts are 18 shared features, two each"
    assert len(v2_view["dimensions"]) == 22
    assert len(v2_view["interfaces"]) == 17


def test_model_v2_interfaces_inside_a_body_are_grounds_five_the_plates_three_the_blades_one(v2_view):
    within = {}
    for interface in v2_view["interfaces"]:
        if interface["within"] is not None:
            within[interface["within"]] = within.get(interface["within"], 0) + 1
    assert within == MODEL_V2_WITHIN
    between = [i["id"] for i in v2_view["interfaces"] if i["within"] is None]
    assert len(between) == 8
    for interface in v2_view["interfaces"]:
        if interface["within"] is None:
            assert len(interface["bodies"]) == 2, interface["id"]
        else:
            assert interface["bodies"] == [interface["within"]], interface["id"]


def test_the_tan_link_mount_on_the_hub_is_one_joint_with_three_constraints(v2_view):
    """Jeff, 2026-11-10: a seat, a pilot and a clocking are one joint."""
    compound = [j for j in v2_view["joints"] if len(j["constraints"]) > 1]
    assert len(compound) == 1
    joint = compound[0]
    assert joint["parts"] == ["hub", "tan_link_mount_215175_002"]
    assert joint["within"] == "base"
    assert set(joint["constraints"]) == {
        "tan_link_mount_hub_face", "tan_link_mount_fastener_clocking",
        "hub_boss_in_tan_link_mount_pilot"}
    # Every interface names the joint it belongs to, and every joint's
    # constraints are interfaces between exactly its two parts.
    by_id = {i["id"]: i for i in v2_view["interfaces"]}
    for j in v2_view["joints"]:
        for cid in j["constraints"]:
            assert by_id[cid]["joint"] == j["id"]
            assert sorted(by_id[cid]["parts"]) == j["parts"]


# --- no second membership rule ----------------------------------------------

@pytest.mark.parametrize("path", [MODEL_V2, MODEL_V1], ids=["v2", "v1"])
def test_every_membership_the_view_states_is_the_topologys_own(path):
    topology = load_topology(path)
    view = model_view(topology)
    body_of = {p.id: (topology.body_of(p.id).id if topology.body_of(p.id) else None)
               for p in topology.parts}
    for part in view["parts"]:
        assert part["body"] == body_of[part["id"]], part["id"]
    for feature in view["features"]:
        assert feature["body"] == body_of[feature["part"]], feature["id"]
        node = topology.node(feature["node"])
        assert feature["part"] in node.parts
        assert feature["shared"] == (len(node.parts) > 1)
    for dimension in view["dimensions"]:
        edge = topology.edge(dimension["id"])
        assert edge.kind == "structural"
        assert dimension["body"] == body_of[edge.part]
        assert dimension["from"] == feature_id(edge.part, edge.from_node)
        assert dimension["to"] == feature_id(edge.part, edge.to_node)
    for interface in view["interfaces"]:
        if interface["source"] == INTERFACE_SOURCES[0]:
            node = topology.node(interface["id"])
            assert interface["kind"] == CONTACT_KIND
            assert interface["parts"] == list(node.parts)
            bodies = list(topology.node_bodies(node.id))
            assert interface["bodies"] == bodies
            assert interface["within"] == (bodies[0] if len(bodies) == 1 else None)
        else:
            edge = topology.edge(interface["id"])
            assert edge.kind == "gap"
            assert interface["kind"] == edge.interface
            assert interface["within"] == topology.edge_body(edge)
            assert interface["parts"] == [topology.node(edge.from_node).parts[0],
                                          topology.node(edge.to_node).parts[0]]
        for end, part in zip(interface["ends"], interface["parts"]):
            assert end.startswith(part + "@")


def test_the_view_lists_bodies_and_their_parts_in_authored_order(v2, v2_view):
    assert [b["id"] for b in v2_view["bodies"]] == [b.id for b in v2.bodies]
    for body, row in zip(v2.bodies, v2_view["bodies"]):
        assert row["parts"] == list(body.parts)
        assert row["name"] == body.name
    assert [p["id"] for p in v2_view["parts"]] == [p.id for p in v2.parts]
    # A part's features are its nodes in document order, and only its own.
    for part in v2_view["parts"]:
        expected = [feature_id(part["id"], n.id) for n in v2.nodes if part["id"] in n.parts]
        assert part["features"] == expected, part["id"]
        assert part["dimensions"] == [e.id for e in v2.edges_on_part(part["id"])], part["id"]


def test_the_identity_ids_are_the_models_own_and_the_one_it_reuses(v2_view, v1_view):
    assert v2_view["identity_ids"] == ["vpa_end_stop_v2", "vpa_pitch_linkage"]
    assert v1_view["identity_ids"] == ["vpa_pitch_linkage"]


def test_a_view_of_a_topology_with_no_bodies_has_no_body_anywhere(tmp_path):
    raw = json.loads(MODEL_V2.read_text(encoding="utf-8"))
    raw["bodies"] = []
    path = tmp_path / "topology_no_bodies.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    view = model_view(load_topology(path, identity_path=None))
    assert view["bodies"] == []
    assert all(p["body"] is None for p in view["parts"])
    assert all(i["within"] is None and i["bodies"] == [] for i in view["interfaces"])
    assert view["counts"]["between_bodies"] == view["counts"]["interfaces"]


# --- the part-label rule -----------------------------------------------------

@pytest.mark.parametrize("part,expected", [
    (Part(id="m", name="213668-002 gas-spring mount", drawing="213668-002"),
     "213668-002 gas-spring mount"),
    (Part(id="a", name="pitch arm", drawing="215071-001"), "215071-001 pitch arm"),
    # A display_name carrying its number at the tail (v1's spelling): the
    # number is said once, by `drawing`.
    (Part(id="l", name="pitch link assembly", drawing="213862-002",
          display_name="Pitch link 213862-002"), "213862-002 Pitch link"),
    # The record's drawing wins over a title block naming another drawing.
    (Part(id="p", name="215177-001 pitch plate", drawing="215177-001",
          display_name="Pitch plate 215735-001/-002"), "215177-001 Pitch plate"),
    # No drawing: the everyday name alone, number-free.
    (Part(id="b", name="pitch-link spherical bearing"), "pitch-link spherical bearing"),
    (Part(id="s", name="NAS6403U11D hex-head bolt"), "hex-head bolt"),
    # Nothing but an id falls back to it rather than to an empty label.
    (Part(id="only_an_id", name=""), "only_an_id"),
], ids=["number-in-name", "plain", "display-tail", "display-other-drawing",
        "no-drawing", "standard-part", "id-only"])
def test_part_label_says_the_number_once_then_the_everyday_name(part, expected):
    assert part_label(part) == expected


def test_every_v2_part_with_a_drawing_is_labelled_number_then_name(v2, v2_view):
    for part, row in zip(v2.parts, v2_view["parts"]):
        assert row["label"] == part_label(part)
        if part.drawing:
            assert row["label"].startswith(part.drawing + " "), row["label"]
            assert row["label"].count(part.drawing) == 1, row["label"]
        else:
            assert not any(ch.isdigit() for ch in row["label"].split(" ")[0]), row["label"]
        assert row["number"] == part.drawing
        assert row["name"] == row["label"][len(part.drawing) + 1:] if part.drawing else row["label"]


# --- the projection carries it ------------------------------------------------

def test_the_projection_carries_the_view_and_the_label_on_every_part():
    projection = B.build(TOPOLOGIES_DIR, provenance={
        "schema": "joby.tolerance_stack/projection_provenance/v0",
        "built_at": "2026-11-10T00:00:00+00:00", "built_by": B.BUILT_BY,
        "branch": "test", "head_sha": "0" * 40, "dirty": False})
    for row in projection["topologies"]:
        assert "model" in row, row["id"]
        topology = load_topology(TOPOLOGIES_DIR / f"topology_{row['id']}.json")
        mesh = {p["id"]: p["mesh"] for p in row["parts"]}
        assert row["model"] == model_view(topology, lambda pid: mesh[pid]), row["id"]
        for part in row["parts"]:
            assert part["label"] == part_label(Part.from_dict(
                {k: v for k, v in part.items() if k not in ("mesh", "label")})), part["id"]
        # The model's parts carry the same mesh fact the part rows do.
        assert [p["mesh"] for p in row["model"]["parts"]] == [p["mesh"] for p in row["parts"]]

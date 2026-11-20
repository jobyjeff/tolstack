"""The model view (``tolerance_stack/model_view.py``), value by value.

Added 2026-11-10 by handoff ``the_model_is_derived_once_and_the_left_column_is_
its_tree``. Three things are pinned here and nowhere else:

* **the counts on model v2**, as the strategy session derived them by hand
  (``dispatch/docs/strategy/drafts/mockups/tolstack_shell_20261109/template.html``,
  ``buildModel``): 5 bodies, 15 parts, 34 features (25 nodes, 9 on two parts),
  22 dimensions, 17 interfaces (9 contacts + 8 gaps), 8 between two bodies and
  9 inside one (ground 5, pitch plate 3, blade 1) -- and, since 2026-11-17
  (handoff ``the_base_stack_joints_are_seat_boss_and_pattern``), the ground
  stack's two upper joints with their bosses and fastener patterns: 42
  features (31 nodes, 11 on two parts), 30 dimensions, 21 interfaces (11 + 10),
  13 inside one body (ground 9) -- and, since the same day (handoff
  ``the_blade_and_piston_joints_are_authored_as_what_the_parts_show``), the
  blade's and the pitch plate's joints as their meshes show them: 55 features
  (40 nodes, 15 on two parts), 43 dimensions, 28 interfaces (15 + 13), 20 inside
  one body (blade 3, pitch plate 8), 16 joints;
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
    end_feature,
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
    "bodies": 5, "parts": 31, "features": 83, "dimensions": 59,
    "interfaces": 44, "contacts": 15, "gaps": 29,
    "between_bodies": 8, "within_bodies": 36, "joints": 32,
    # The pilot of a_part_may_contain_parts (2026-11-14): the pitch link
    # assembly holds its bearing, the 212956-005 assembly its two; since
    # 2026-11-18 (the_pitch_plate_is_an_assembly_with_its_bushings) 215177
    # its plate and two flanged bushings, with two straight bushings beside
    # it: five parts, twelve features, six dimensions, eight fits. Since
    # 2026-11-19 (a_link_is_a_machined_part_and_two_bearings_each_two_races)
    # each link is a machined part and two bearings, each bearing two races:
    # eleven parts more (two machined links, the pitch link's second bearing,
    # eight races); sixteen features more (four bores on the machined links,
    # and per end the outer race's cylinder and the inner race's bore and
    # ball centre, the four sphere centres moved onto the outer races); v1's
    # four joints out and three gaps in per end (a press fit, the ball, a
    # pin), so eight more; ten dimensions more (one per machined link, two
    # per bearing); and each bearing an assembly.
    "assemblies": 7,
}

#: Interfaces inside one body, per body: ground 9 (its three joints of three
#: constraints each), pitch plate 8 (the plate on the piston body three, each
#: head on it two), blade 3 (since 2026-11-17, handoff ``the_blade_and_piston_
#: joints_are_authored_as_what_the_parts_show``; 3 and 1 before it). The
#: plate's 16 since 2026-11-18: the four bushings' fits and their bores' pins
#: to the attachment bores, eight more.
MODEL_V2_WITHIN = {"base": 10, "pitch_plate": 18, "blade": 4, "tan_link": 2, "pitch_link": 2}


def test_model_v2_has_the_counts_the_strategy_session_derived(v2_view):
    assert v2_view["counts"] == MODEL_V2_COUNTS
    assert len(v2_view["bodies"]) == 5
    assert len(v2_view["parts"]) == 31
    assert len(v2_view["features"]) == 83
    assert sum(1 for f in v2_view["features"] if f["shared"]) == 30, \
        "15 nodes on two parts are 30 shared features, two each"
    assert len(v2_view["dimensions"]) == 59
    assert len(v2_view["interfaces"]) == 44


#: The base's parts, (features, dimensions) each, since the gas-spring mount
#: moved onto the tangential link mount (2026-11-10, handoff ``the_gas_spring_
#: mount_sits_on_the_tan_link_mount_in_the_end_stop_model``): the hub gave up
#: the old seat and its dimension to it, so the totals above did not move.
#: Since 2026-11-17 the two upper joints carry a boss in a bore and a fastener
#: pattern each: the tangential link mount gains a bore, a pattern and two
#: dimensions (5, 4 -> 7, 6), the gas-spring mount two bosses, two patterns and
#: four (4, 3 -> 8, 7), the piston cover a bore, a pattern and two (2, 1 -> 4, 3).
MODEL_V2_BASE_PARTS = {
    "hub": (4, 3),
    "tan_link_mount_215175_002": (7, 6),
    "gas_spring_mount_213668_002": (8, 7),
    "piston_cover_214958_002": (4, 3),
}


def test_model_v2_base_parts_carry_their_features_and_dimensions(v2_view):
    parts = {p["id"]: p for p in v2_view["parts"]}
    assert {pid: (len(parts[pid]["features"]), len(parts[pid]["dimensions"]))
            for pid in MODEL_V2_BASE_PARTS} == MODEL_V2_BASE_PARTS
    assert "tan_link_mount_215175_002@tan_link_mount_gas_spring_seat" in \
        parts["tan_link_mount_215175_002"]["features"]
    assert not any("gas_spring_mount" in f for f in parts["hub"]["features"])


def test_model_v2_interfaces_inside_a_body_are_grounds_nine_the_plates_sixteen_the_blades_three(v2_view):
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


#: The ground stack's three joints, each a seat, a boss in a bore and a
#: fastener pattern (Jeff, 2026-11-10: "the same datum style with a flange,
#: central locating boss, and fastener pattern for clocking"; the two upper
#: ones since 2026-11-17).
MODEL_V2_STACK_JOINTS = {
    ("hub", "tan_link_mount_215175_002"): {
        "tan_link_mount_hub_face", "tan_link_mount_fastener_clocking",
        "hub_boss_in_tan_link_mount_pilot"},
    ("gas_spring_mount_213668_002", "tan_link_mount_215175_002"): {
        "tan_link_mount_gas_spring_seat", "gas_spring_mount_fastener_clocking",
        "gas_spring_mount_boss_in_tan_link_mount_pilot"},
    ("gas_spring_mount_213668_002", "piston_cover_214958_002"): {
        "piston_cover_mount_flange_seat", "piston_cover_fastener_clocking",
        "gas_spring_mount_boss_in_piston_cover_pilot"},
}

#: The blade's and the pitch plate's joints, each with the constraints its two
#: parts' meshes show (2026-11-17, handoff ``the_blade_and_piston_joints_are_
#: authored_as_what_the_parts_show``). The plate's on the piston body is a seat,
#: a boss and a pattern like the ground stack's; the blade's has a cross-pin
#: hole for its clocking; the lower head is a plain ring, so its joint has no
#: pattern; and the upper head is located and fastened on the piston body, not
#: on the lower head it seats on -- so that seat stays a joint of one.
MODEL_V2_INNER_JOINTS = {
    ("blade_root", "pitch_arm"): {
        "pitch_arm_root_seat", "pitch_arm_blade_root_clocking",
        "blade_root_boss_in_pitch_arm_bore"},
    ("gas_spring_piston_214700_002", "pitch_plate_215177_001"): {
        "piston_body_plate_flange_seat", "gas_spring_piston_fastener_clocking",
        "pitch_plate_pilot_in_piston"},
    ("gas_spring_piston_214700_002", "piston_head_lower_214699_002"): {
        "piston_body_head_seat", "piston_body_boss_in_lower_head_pilot"},
    ("gas_spring_piston_214700_002", "piston_head_upper_214698_002"): {
        "piston_head_upper_fastener_clocking", "piston_body_boss_in_upper_head_pilot"},
}

#: Which body each of those joints is inside.
MODEL_V2_INNER_JOINT_BODY = {"blade_root": "blade", "gas_spring_piston_214700_002": "pitch_plate"}


def test_the_ground_stack_is_three_joints_with_three_constraints_each(v2_view):
    """Jeff, 2026-11-10: a seat, a pilot and a clocking are one joint -- and
    every joint up the ground stack has all three."""
    compound = {tuple(j["parts"]): j for j in v2_view["joints"] if len(j["constraints"]) > 1}
    assert set(compound) == set(MODEL_V2_STACK_JOINTS) | set(MODEL_V2_INNER_JOINTS)
    for parts, constraints in MODEL_V2_STACK_JOINTS.items():
        assert compound[parts]["within"] == "base"
        assert set(compound[parts]["constraints"]) == constraints, parts
    for parts, constraints in MODEL_V2_INNER_JOINTS.items():
        assert compound[parts]["within"] == MODEL_V2_INNER_JOINT_BODY[parts[0]], parts
        assert set(compound[parts]["constraints"]) == constraints, parts
    heads = [j for j in v2_view["joints"]
             if j["parts"] == ["piston_head_lower_214699_002", "piston_head_upper_214698_002"]]
    assert [j["constraints"] for j in heads] == [["piston_heads_seat"]]
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
        # An assembly's dimension (since 2026-11-19 v2's two link lengths)
        # runs between its parts' features, in the one body they share.
        near, far = topology.dimension_ends(edge)
        assert dimension["body"] == topology.edge_body(edge)
        assert dimension["from"] == feature_id(near, edge.from_node)
        assert dimension["to"] == feature_id(far, edge.to_node)
        assert (near, far) == (edge.part, edge.part) or topology.children_of(edge.part)
    for interface in view["interfaces"]:
        if interface["source"] == INTERFACE_SOURCES[0]:
            node = topology.node(interface["id"])
            assert interface["kind"] == (node.interface or CONTACT_KIND)
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
        # A body's parts are those whose assembly is not in it (a top-level
        # part, or a race whose bearing is in no body); every part it carries
        # is `all_parts`, in the one tree order.
        assert row["parts"] == [p for p in v2.tree_order(body.parts)
                                if v2.part(p).parent is None or v2.part(p).parent not in body.parts]
        assert sorted(row["all_parts"]) == sorted(body.parts)
        assert row["name"] == body.name
    assert [p["id"] for p in v2_view["parts"]] == [p.id for p in v2.parts]
    # A part's features are its nodes in document order, and only its own.
    for part in v2_view["parts"]:
        expected = [feature_id(part["id"], n.id) for n in v2.nodes if part["id"] in n.parts]
        assert part["features"] == expected, part["id"]
        assert part["dimensions"] == [e.id for e in v2.edges_on_part(part["id"])], part["id"]


# --- a part may contain parts (a_part_may_contain_parts, 2026-11-14) -----------

def test_model_v2_puts_each_bearing_inside_its_link_assembly(v2_view):
    parts = {p["id"]: p for p in v2_view["parts"]}
    # 2026-11-19: each link assembly is its machined part and two bearings,
    # each bearing an outer and an inner race, and the assembly and its
    # bearings are in no body.
    assert parts["pitch_link"]["children"] == [
        "pitch_link_213861_002", "spherical_bearing_pitch_link", "spherical_bearing_pitch_link_upper"]
    assert parts["tan_link_212956_005"]["children"] == [
        "tan_link_213863_004", "spherical_bearing_tan_link", "spherical_bearing_tan_link_ms14103_3"]
    assert parts["spherical_bearing_pitch_link"]["parent"] == "pitch_link"
    assert parts["spherical_bearing_pitch_link"]["depth"] == 1
    assert parts["spherical_bearing_pitch_link"]["children"] == [
        "pitch_link_lower_outer_race", "pitch_link_lower_inner_race"]
    assert parts["pitch_link_lower_inner_race"]["depth"] == 2
    assert parts["pitch_link"]["parent"] is None and parts["pitch_link"]["depth"] == 0
    for assembly in ("pitch_link", "tan_link_212956_005", "spherical_bearing_pitch_link",
                     "spherical_bearing_pitch_link_upper", "spherical_bearing_tan_link",
                     "spherical_bearing_tan_link_ms14103_3"):
        assert parts[assembly]["body"] is None and parts[assembly]["features"] == [], assembly
    # 215177 holds its plate and the flanged bushings (2026-11-18); the
    # straight bushings are top-level beside it. 215175 stays a single part.
    assert parts["pitch_plate_215177_001"]["children"] == [
        "pitch_plate_215735_001", "flanged_bushing_nas77a3_015a",
        "flanged_bushing_nas77a3_015a_tan_link"]
    assert parts["flanged_bushing_nas77a3_015a"]["depth"] == 1
    assert parts["bushing_214820_002"]["parent"] is None
    assert parts["tan_link_mount_215175_002"]["children"] == []
    bodies = {b["id"]: b for b in v2_view["bodies"]}
    assert bodies["tan_link"]["parts"] == [
        "tan_link_213863_004", "tan_link_lower_outer_race", "tan_link_upper_outer_race"]
    assert bodies["tan_link"]["all_parts"] == bodies["tan_link"]["parts"]
    assert bodies["pitch_link"]["all_parts"] == [
        "pitch_link_213861_002", "pitch_link_lower_outer_race", "pitch_link_upper_outer_race"]
    assert bodies["blade"]["parts"][-1] == "pitch_link_lower_inner_race"


def test_the_tree_order_is_an_assembly_then_its_children_depth_first(tmp_path):
    raw = json.loads(MODEL_V2.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in raw["parts"]}
    # Nest one level deeper and list the deepest part first in the body, so
    # the order the view states is the tree's and not the authored list's.
    # (The pitch plate: since 2026-11-19 the links' bodies hold no assembly.)
    by_id["flanged_bushing_nas77a3_015a"]["parent"] = "pitch_plate_215735_001"
    body = [b for b in raw["bodies"] if b["id"] == "pitch_plate"][0]
    body["parts"] = list(reversed(body["parts"]))
    path = tmp_path / "topology_nested.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    view = model_view(load_topology(path, identity_path=None))
    row = [b for b in view["bodies"] if b["id"] == "pitch_plate"][0]
    assert "pitch_plate_215735_001" not in row["parts"] and "pitch_plate_215177_001" in row["parts"]
    at = row["all_parts"].index("pitch_plate_215177_001")
    assert row["all_parts"][at:at + 4] == ["pitch_plate_215177_001", "pitch_plate_215735_001",
                                          "flanged_bushing_nas77a3_015a",
                                          "flanged_bushing_nas77a3_015a_tan_link"]
    depth = {p["id"]: p["depth"] for p in view["parts"]}
    assert depth["flanged_bushing_nas77a3_015a"] == 2


def test_an_assembly_in_two_bodies_reads_as_a_tree_and_its_dimension_joins_its_parts():
    """The two-body fixture (tests/test_topology.py, "an assembly's parts
    may sit in two bodies"): an assembly in no body reads ``body: None`` with
    its tree as before; a part whose assembly is in no body is top-level in
    its own body; the assembly's dimension runs between its races' features,
    inside the link's body."""
    topology = load_topology(REPO_ROOT / "tests" / "fixtures" / "topology_assembly_in_two_bodies.json",
                             identity_path=None)
    view = model_view(topology)
    parts = {p["id"]: p for p in view["parts"]}
    assert parts["link_asm"]["body"] is None and parts["bearing_a"]["body"] is None
    assert parts["link_asm"]["children"] == ["link_body", "bearing_a", "bearing_b"]
    assert parts["link_asm"]["features"] == []
    assert parts["link_asm"]["dimensions"] == ["link_centres"]
    assert {p: parts[p]["depth"] for p in ("link_asm", "bearing_a", "inner_a")} == {
        "link_asm": 0, "bearing_a": 1, "inner_a": 2}
    bodies = {b["id"]: b for b in view["bodies"]}
    assert bodies["link"]["parts"] == ["link_body", "outer_a", "outer_b"]
    assert bodies["base"]["parts"] == ["base_asm", "inner_a"]
    assert bodies["base"]["all_parts"] == ["base_asm", "base", "spacer", "inner_a"]
    (centres,) = [d for d in view["dimensions"] if d["id"] == "link_centres"]
    assert (centres["part"], centres["from"], centres["to"], centres["body"]) == (
        "link_asm", "outer_a@ball_a", "outer_b@ball_b", "link")
    feature_ids = {f["id"] for f in view["features"]}
    assert {centres["from"], centres["to"]} <= feature_ids
    assert end_feature(topology, topology.edge("link_centres"), "to") == ("outer_b", "ball_b")
    assert view["counts"]["assemblies"] == 4


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
    models = {t.id: t for t in (load_topology(p) for p in sorted(TOPOLOGIES_DIR.glob("topology_*.json")))}
    for row in projection["topologies"]:
        assert "model" in row, row["id"]
        topology = models[row["id"]]
        mesh = {p["id"]: p["mesh"] for p in row["parts"]}
        assert row["model"] == model_view(topology, lambda pid: mesh[pid], models), row["id"]
        for part in row["parts"]:
            assert part["label"] == part_label(Part.from_dict(
                {k: v for k, v in part.items() if k not in ("mesh", "label")})), part["id"]
        # The model's parts carry the same mesh fact the part rows do.
        assert [p["mesh"] for p in row["model"]["parts"]] == [p["mesh"] for p in row["parts"]]

"""``scripts/build_contact_suggestions.py`` -- the projection the annotator
colours touching faces from.

Two halves. The synthetic half builds a tiny mesh store and topology on disk and
pins the projection's shape, every empty reason it can reach, the provenance
gate and the occurrence rule it shares with the annotator. The ``[real]`` half
reads the projection the rebuild rail wrote in the main checkout and holds the
linkage to what the 2026-10-28 measurement found: the four ball joints each
have a spherical candidate.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_contact_suggestions as builder  # noqa: E402

from tolerance_stack import interface_contact as ic  # noqa: E402

from tests.test_interface_contact import (  # noqa: E402
    IDENTITY, box_faces, cylinder_face, make_mesh, translate)

LIVE = Path("C:/workspace/tolstack/data") / builder.PROJECTION_SUBDIR / builder.PROJECTION_NAME
LIVE_CANDIDATES = (REPO_ROOT / "data" / builder.PROJECTION_SUBDIR / builder.PROJECTION_NAME, LIVE)

#: The four ball joints of the pitch linkage -- every gap edge whose interface
#: is `spherical` in docs/topologies/topology_vpa_pitch_linkage.json, read
#: rather than listed so a fifth is held to the same bar.
LINKAGE = REPO_ROOT / "docs" / "topologies" / "topology_vpa_pitch_linkage.json"


# ---------------------------------------------------------------------------
# a store on disk
# ---------------------------------------------------------------------------

def write_mesh(meshes: Path, sha: str, part_id: str, mesh, instances, mm=True):
    d = meshes / sha
    d.mkdir(parents=True)
    (d / "positions.f32").write_bytes(mesh.positions.tobytes())
    (d / "indices.u32").write_bytes(mesh.indices.tobytes())
    (d / "face_ids.u32").write_bytes(mesh.face_ids.tobytes())
    manifest = dict(mesh.manifest, linear_deflection=0.1)
    (d / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    provenance = {"part_id": part_id, "label": part_id + " label",
                  "linear_deflection_mm": 0.1 if mm else 0.004,
                  "source_step_sha256": sha}
    if instances is not None:
        provenance["extraction"] = {"product_name": part_id, "instances": instances}
    (d / "provenance.json").write_text(json.dumps(provenance), encoding="utf-8")


def instance(name, placement, path=None):
    return {"instance_name": name, "instance_path": path or ["asm", name],
            "placement_world": placement}


def gap_edge(edge_id, a, b, interface):
    return {"id": edge_id, "name": edge_id.replace("_", " "), "kind": "gap",
            "interface": interface, "from": a, "to": b,
            "dimension": {"id": edge_id, "name": edge_id, "nominal": 0.0, "min": 0.0,
                          "max": 0.0, "plus_minus": 0.0,
                          "source_ref": {"kind": "assumed", "confidence": "untraced",
                                         "note": "fixture"}}}


@pytest.fixture
def store(tmp_path):
    meshes = tmp_path / "data" / "meshes"
    pin = make_mesh([cylinder_face(5.0, 0, 10, convex=True)])
    bore = make_mesh([cylinder_face(5.05, 0, 10, convex=False)])
    write_mesh(meshes, "a" * 64, "pin_part", pin, [instance("pin.1", translate(50, 0, 0))])
    write_mesh(meshes, "b" * 64, "bore_part", bore, [instance("bore.1", translate(50, 0, 0))])
    write_mesh(meshes, "c" * 64, "loose_part", bore, None)            # no assembly position
    write_mesh(meshes, "d" * 64, "inch_part", bore, [instance("inch.1", IDENTITY)], mm=False)
    topologies = tmp_path / "topologies"
    topologies.mkdir()
    nodes = [{"id": n, "name": n, "kind": "datum_feature", "parts": [p]}
             for n, p in (("pin_n", "pin_part"), ("bore_n", "bore_part"),
                          ("loose_n", "loose_part"), ("inch_n", "inch_part"),
                          ("ghost_n", "no_such_part"))]
    topology = {
        "schema": "joby.tolerance_stack/topology/v0", "id": "fixture", "title": "Fixture",
        "units": "mm", "nodes": nodes,
        "parts": [{"id": p, "name": p} for p in ("pin_part", "bore_part", "loose_part",
                                                  "inch_part", "no_such_part")],
        "edges": [gap_edge("pin_joint", "pin_n", "bore_n", "pin_in_bore"),
                  gap_edge("loose_joint", "pin_n", "loose_n", "pin_in_bore"),
                  gap_edge("inch_joint", "pin_n", "inch_n", "pin_in_bore"),
                  gap_edge("ghost_joint", "pin_n", "ghost_n", "planar")],
    }
    (topologies / "topology_fixture.json").write_text(json.dumps(topology), encoding="utf-8")
    return tmp_path / "data", topologies


def build(store, **kw):
    data, topologies = store
    return builder.build(topologies, data / "meshes", data / builder.PROJECTION_SUBDIR, **kw)


def test_the_projection_ranks_the_pin_in_its_bore_with_the_evidence_and_the_occurrences(store):
    out, data = build(store)
    assert out.name == builder.PROJECTION_NAME
    assert data["schema"] == builder.SCHEMA
    assert data["tolerances"] == ic.CONTACT_TOLERANCES
    (topology,) = data["topologies"]
    rows = {r["edge"]: r for r in topology["edges"]}
    row = rows["pin_joint"]
    assert row["status"] == "ok"
    assert row["pairing"] == "cylinder_in_cylinder"
    assert row["from"]["mesh"]["sha256"] == "a" * 64
    assert row["occurrences"] == {"from": "asm/pin.1", "to": "asm/bore.1"}
    (top,) = row["candidates"]
    assert (top["rank"], top["relation"]) == (1, "contact")
    assert (top["from"]["faces"], top["to"]["faces"]) == ([0], [0])
    assert top["evidence"]["bore"] == "to"            # the module's a/b, said as the end
    assert top["evidence"]["clearance_mm"] == pytest.approx(0.05, abs=1e-4)
    assert top["box"]["min"][0] == pytest.approx(50 - 5.05, abs=1e-3)
    # Written as JSON the annotator reads, not just returned.
    assert json.loads(out.read_text(encoding="utf-8"))["topologies"][0]["edges"][0]["edge"] \
        == "pin_joint"


def test_every_empty_edge_says_why_and_none_is_dropped(store):
    _out, data = build(store)
    rows = {r["edge"]: r for r in data["topologies"][0]["edges"]}
    assert set(rows) == {"pin_joint", "loose_joint", "inch_joint", "ghost_joint"}
    assert rows["loose_joint"]["status"] == "no_occurrence"
    assert rows["inch_joint"]["status"] == "no_units"
    assert rows["ghost_joint"]["status"] == "no_mesh"
    assert "no_such_part" in rows["ghost_joint"]["note"]
    for reason in ("no_occurrence", "no_units", "no_mesh"):
        assert reason in ic.EMPTY_REASONS
    assert data["summary"]["by_status"] == {"no_mesh": 1, "no_occurrence": 1,
                                            "no_units": 1, "ok": 1}
    assert data["summary"]["single_clear_top"] == 1


def test_it_refuses_to_overwrite_a_projection_built_from_a_tree_it_does_not_contain(store):
    data, topologies = store
    out = data / builder.PROJECTION_SUBDIR / builder.PROJECTION_NAME
    out.parent.mkdir(parents=True)
    out.write_text(json.dumps({"provenance": {"head_sha": "0" * 40, "branch": "elsewhere"}}),
                   encoding="utf-8")
    argv = ["--data-root", str(data), "--topologies-dir", str(topologies)]
    assert builder.main(argv) == 3
    assert json.loads(out.read_text(encoding="utf-8"))["provenance"]["branch"] == "elsewhere"
    assert builder.main(argv + ["--allow-older-tree"]) == 0


def test_a_borrowed_occurrence_is_found_by_the_annotators_two_rules():
    """``AA.sweepCandidateOccurrences``: own occurrences, then another mesh's
    sharing an instance name, then one named ``<product>.<n>`` -- the arm that
    finds blade 1's pitch link on the instrumented variant's sidecar."""
    own = {"design": [{"key": "asm/link.2", "instance_name": "213862-002.2", "own": True}]}
    every = own["design"] + [
        {"key": "asm/link.1", "instance_name": "213862-002.1", "own": True},
        {"key": "asm/x/link.2", "instance_name": "213862-002.2", "own": True},
        {"key": "asm/other", "instance_name": "999.1", "own": True},
    ]
    found = builder.candidate_occurrences("design", own, every, "213862-002")
    assert [(o["key"], o["own"]) for o in found] == [
        ("asm/link.2", True), ("asm/link.1", False), ("asm/x/link.2", False)]


def test_the_occurrence_rule_is_the_annotators_rule():
    """The same two arms, in the JS this mirrors. A third arm added there and
    not here is a reader and a projection disagreeing about where a part is."""
    sweep = (REPO_ROOT / "apps" / "annotate" / "sweep.js").read_text(encoding="utf-8")
    body = re.search(r"AA\.sweepCandidateOccurrences = function[\s\S]*?\n  \};", sweep)
    assert body, "AA.sweepCandidateOccurrences moved -- this pairing has drifted"
    text = body.group(0)
    assert "var sameSlotName = !!names[o.instance_name];" in text
    assert 'String(o.instance_name).indexOf(productName + ".") === 0;' in text
    assert text.count("return;") == 2       # seen, and neither arm -- and nothing else


# ---------------------------------------------------------------------------
# [real] -- the projection the rebuild rail wrote
# ---------------------------------------------------------------------------

def live_projection():
    for path in LIVE_CANDIDATES:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    return None


needs_live = pytest.mark.skipif(
    live_projection() is None,
    reason="no contact_suggestions.json (data/ is gitignored, main checkout only; "
           "scripts/rebuild_projections.ps1 writes it)")


@needs_live
def test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge():
    data = live_projection()
    assert data["schema"] == builder.SCHEMA
    assert data["provenance"]["built_by"] == builder.BUILT_BY
    topology = json.loads(LINKAGE.read_text(encoding="utf-8"))
    gaps = [e["id"] for e in topology["edges"] if e.get("interface")]
    (row,) = [t for t in data["topologies"] if t["id"] == topology["id"]]
    assert [e["edge"] for e in row["edges"]] == gaps
    for edge in row["edges"]:
        assert edge["status"] == "ok" or edge["status"] in ic.EMPTY_REASONS
        assert bool(edge["candidates"]) == (edge["status"] == "ok")
        for c in edge["candidates"]:
            assert c["relation"] in ic.RELATIONS
            assert set(c["box"]) == {"min", "max"}
            assert c["from"]["faces"] and c["to"]["faces"]


@needs_live
def test_real_each_ball_joint_has_a_spherical_candidate():
    data = live_projection()
    topology = json.loads(LINKAGE.read_text(encoding="utf-8"))
    balls = [e["id"] for e in topology["edges"] if e.get("interface") == "spherical"]
    assert len(balls) >= 4
    rows = {e["edge"]: e for t in data["topologies"] for e in t["edges"]}
    for edge_id in balls:
        row = rows[edge_id]
        assert row["status"] == "ok", (edge_id, row.get("note"))
        assert any("spherical" in (c["from"]["surface"], c["to"]["surface"])
                   for c in row["candidates"]), edge_id


# ---------------------------------------------------------------------------
# 2026-10-29: the ends say what shape they are
# ---------------------------------------------------------------------------

@pytest.fixture
def shank_store(tmp_path):
    """A washer on a bolt shank, the "shank out" edge of the pitch-link joint
    in miniature, with node names worded as the linkage words them. The bolt
    mesh records no slot of its own: its one placement is another mesh's
    ``<product>.<n>`` slot, borrowed."""
    meshes = tmp_path / "data" / "meshes"
    washer = make_mesh(box_faces(-2, 2, -2, 2, 0, 1))
    shank = make_mesh([cylinder_face(1.0, -5.0, 1.5, convex=True)])
    write_mesh(meshes, "a" * 64, "washer_part", washer, [instance("washer.1", IDENTITY)])
    write_mesh(meshes, "b" * 64, "bolt_part", shank, [])
    write_mesh(meshes, "c" * 64, "bolt_variant", shank, [instance("bolt_part.1", IDENTITY)])
    topologies = tmp_path / "topologies"
    topologies.mkdir()
    nodes = [{"id": "washer_far", "name": "flat washer far face", "kind": "datum_feature",
              "parts": ["washer_part"]},
             {"id": "shank_end", "name": "end of the bolt's full cylindrical shank",
              "kind": "datum_feature", "parts": ["bolt_part"]}]
    edge = gap_edge("shank_out", "washer_far", "shank_end", "clearance")
    edge["name"] = "shank out -- full-diameter shank beyond the clamped stack"
    topology = {
        "schema": "joby.tolerance_stack/topology/v0", "id": "shank", "title": "Shank",
        "units": "mm", "nodes": nodes,
        "parts": [{"id": p, "name": p} for p in ("washer_part", "bolt_part")],
        "edges": [edge],
    }
    (topologies / "topology_shank.json").write_text(json.dumps(topology), encoding="utf-8")
    return tmp_path / "data", topologies


def test_the_ends_decide_the_pairing_and_every_face_passes_their_shape_rule(shank_store):
    """The word `clearance` alone paired the washer's BORE round the shank;
    the ends name a flat (the far face) and a cylinder (the shank), and every
    candidate's faces are of the class its end asks for -- the rule
    `scripts/propose_bindings.py` refuses a proposal by."""
    _out, data = build(shank_store)
    (row,) = data["topologies"][0]["edges"]
    assert ic.CONTACT_PAIRINGS[row["interface"]] == "cylinder_in_cylinder"
    assert (row["from"]["asks"], row["to"]["asks"]) == ("planar", "cylindrical")
    assert (row["pairing"], row["pairing_basis"]) == ("plane_across_axis", "ends")
    assert row["status"] == "ok"
    top = row["candidates"][0]
    assert (top["relation"], top["from"]["faces"], top["to"]["faces"]) == ("across", [1], [0])
    assert top["evidence"]["plane"] == "from"
    assert top["evidence"]["end_mm"] == pytest.approx(0.5, abs=1e-4)
    for c in row["candidates"]:
        assert (c["from"]["surface"], c["to"]["surface"]) == ("planar", "cylindrical")
    assert builder.clear_top(row)
    assert data["summary"]["single_clear_top"] == 1
    assert data["end_pairings"]["cylindrical+planar"] == "plane_across_axis"


def test_a_borrowed_slot_says_so_in_every_candidates_evidence(shank_store):
    _out, data = build(shank_store)
    (row,) = data["topologies"][0]["edges"]
    assert row["occurrences"] == {"from": "asm/washer.1", "to": "asm/bolt_part.1"}
    for c in row["candidates"]:
        assert c["evidence"]["own"] == {"from": True, "to": False}


def test_an_edge_whose_ends_name_nothing_is_paired_by_its_interface_word(store):
    """The fixture's nodes are named by bare ids. "pin joint" still asks for
    a cylinder through the edge's own name (``end_surface_class`` asks the
    dimension when the node is silent); "loose joint" asks nothing at all."""
    _out, data = build(store)
    rows = {r["edge"]: r for r in data["topologies"][0]["edges"]}
    row = rows["pin_joint"]
    assert (row["from"]["asks"], row["to"]["asks"]) == ("cylindrical", "cylindrical")
    assert (row["pairing"], row["pairing_basis"], row["axes"]) == (
        "cylinder_in_cylinder", "ends", False)
    assert row["candidates"][0]["evidence"]["own"] == {"from": True, "to": True}
    loose = rows["loose_joint"]
    assert (loose["from"]["asks"], loose["to"]["asks"]) == (None, None)
    assert (loose["pairing"], loose["pairing_basis"]) == ("cylinder_in_cylinder", "interface")


# ---------------------------------------------------------------------------
# [real] -- what the 2026-10-29 rebuild found, held
# ---------------------------------------------------------------------------

def live_rows():
    data = live_projection()
    return {e["edge"]: e for t in data["topologies"] for e in t["edges"]}


#: A projection built before the ends were asked carries no ``pairing_basis``;
#: these checks wait for the rebuild rather than reading that one as a failure.
needs_ends = pytest.mark.skipif(
    live_projection() is None or any("pairing_basis" not in e for e in live_rows().values()),
    reason="the live contact_suggestions.json predates the ends-first pairing "
           "(2026-10-29); scripts/rebuild_projections.ps1 rebuilds it")

#: Drawing 215735 rev A sheet 2, Section A-A: the lug holes are 5X dia 7.950
#: and 5X dia 8.520 (3X each for the tangential-link lugs).
PLATE_LUG_RADII = (7.950 / 2, 8.520 / 2)


@needs_live
@needs_ends
def test_real_no_candidate_names_a_face_its_end_would_refuse_for_its_shape():
    """The 2026-10-29 proposal pass found all four "clear" top pairs refused by
    the shape rule. Every candidate now names faces of its end's class."""
    for edge_id, row in live_rows().items():
        for c in row["candidates"]:
            for side in builder.SIDES:
                asks = row[side]["asks"]
                assert asks is None or c[side]["surface"] == asks, (edge_id, side, c["rank"])


@needs_live
@needs_ends
def test_real_the_pitch_plates_two_ball_joints_rank_a_lug_hole_the_drawing_calls_out_first():
    rows = live_rows()
    for edge_id in ("pitch_plate_link_joint", "tan_link_plate_joint"):
        top = rows[edge_id]["candidates"][0]
        assert top["evidence"]["seat"] == "cylindrical"
        radius = top["evidence"]["seat_radius_mm"]
        assert min(abs(radius - r) for r in PLATE_LUG_RADII) < 0.01, (edge_id, radius)


@needs_live
@needs_ends
def test_real_the_hub_and_pitch_plate_coaxiality_is_judged_as_axes():
    row = live_rows()["hub_to_pitch_plate_spindle_coaxiality"]
    assert row["axes"] is True
    assert row["status"] == "ok", row.get("note")
    top = row["candidates"][0]
    assert top["relation"] == "coaxial"
    assert top["evidence"]["axis_offset_mm"] <= ic.CONTACT_TOLERANCES["axis_offset_mm"]


@needs_live
@needs_ends
def test_real_every_candidate_says_whether_its_slots_are_its_meshes_own():
    rows = live_rows()
    for row in rows.values():
        for c in row["candidates"]:
            assert set(c["evidence"]["own"]) == set(builder.SIDES)
    # Blade 1's pitch link is placed at the instrumented variant's slot.
    lower = rows["pitch_link_lower_centre_is_this_bearing"]["candidates"][0]
    assert lower["evidence"]["own"] == {"from": True, "to": False}

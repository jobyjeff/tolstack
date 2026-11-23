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
    IDENTITY, RING, bearing, box_faces, cylinder_face, make_mesh, translate)

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
# 2026-11-21: two parts on one mesh, each at its own occurrence
# ---------------------------------------------------------------------------

#: v2's two plate lugs in miniature: one plate with a bore at each lug, and one
#: bushing mesh recorded at both. Lug A's bushing declares its occurrence;
#: lug B's is a race-like child of a bearing that declares lug B's.
LUG_A = ["asm", "lugA", "bush.1"]
LUG_B = ["asm", "lugB", "bush.1"]


@pytest.fixture
def lug_store(tmp_path):
    def make(declare_b=True):
        root = tmp_path / ("declared" if declare_b else "silent")
        meshes = root / "data" / "meshes"
        bush = make_mesh([cylinder_face(5.0, 0, 10, convex=True)])
        plate = make_mesh([cylinder_face(5.05, 0, 10, convex=False),
                           cylinder_face(5.05, 0, 10, convex=False, centre=(30.0, 0.0))])
        write_mesh(meshes, "a" * 64, "bushing", bush,
                   [instance("bush.1", IDENTITY, LUG_A), instance("bush.1", translate(30, 0, 0), LUG_B)])
        write_mesh(meshes, "b" * 64, "plate", plate, [instance("plate.1", IDENTITY)])
        topologies = root / "topologies"
        topologies.mkdir(parents=True)
        aliases = [{"topology_part": p, "mesh_part_id": "bushing"}
                   for p in ("lug_a_bushing", "lug_b_bearing", "lug_b_race", "lug_b_inner")]
        (topologies / "part_mesh_aliases.json").write_text(json.dumps({"aliases": aliases}),
                                                           encoding="utf-8")
        parts = [{"id": "plate", "name": "plate"},
                 {"id": "lug_a_bushing", "name": "lug A bushing", "occurrence": "/".join(LUG_A)},
                 {"id": "lug_b_bearing", "name": "lug B bearing"},
                 {"id": "lug_b_race", "name": "lug B race", "parent": "lug_b_bearing"},
                 {"id": "lug_b_inner", "name": "lug B inner race", "parent": "lug_b_bearing"}]
        if declare_b:
            parts[2]["occurrence"] = "/".join(LUG_B)
        nodes = [{"id": n, "name": n, "kind": "datum_feature", "parts": [p]}
                 for n, p in (("a_od", "lug_a_bushing"), ("a_bore", "plate"),
                              ("b_od", "lug_b_race"), ("b_bore", "plate"),
                              ("b_inner", "lug_b_inner"))]
        topology = {
            "schema": "joby.tolerance_stack/topology/v0", "id": "lugs", "title": "Lugs",
            "units": "mm", "nodes": nodes, "parts": parts,
            "edges": [gap_edge("lug_a_fit", "a_od", "a_bore", "pin_in_bore"),
                      gap_edge("lug_b_fit", "b_od", "b_bore", "pin_in_bore"),
                      gap_edge("lug_b_races", "b_inner", "b_od", "pin_in_bore")],
        }
        (topologies / "topology_lugs.json").write_text(json.dumps(topology), encoding="utf-8")
        _out, data = builder.build(topologies, root / "data" / "meshes",
                                   root / "data" / builder.PROJECTION_SUBDIR)
        return {r["edge"]: r for r in data["topologies"][0]["edges"]}, data
    return make


def test_two_parts_on_one_mesh_are_each_offered_their_own_lugs_faces(lug_store):
    """Ranked per MESH, both lugs tie and the first slot in key order wins
    both: lug B was offered lug A's bore. Each end is now measured at its
    part's own occurrence -- declared, or its same-mesh parent's."""
    rows, data = lug_store(declare_b=True)
    a, b = rows["lug_a_fit"], rows["lug_b_fit"]
    assert a["occurrences"]["from"] == "/".join(LUG_A)
    assert b["occurrences"]["from"] == "/".join(LUG_B)
    assert b["from"]["occurrence"] == "/".join(LUG_B)          # inherited from the bearing
    assert a["candidates"][0]["to"]["faces"] == [0]
    assert b["candidates"][0]["to"]["faces"] == [1]
    assert all(r[s]["placed"] for r in (a, b) for s in builder.SIDES)
    assert data["summary"]["unplaced"] == 0
    # Two races of one bearing: one mesh at one place, never compared with
    # itself -- said, rather than a crash on a nearest gap that was never measured.
    races = rows["lug_b_races"]
    assert (races["status"], races["nearest_gap_mm"]) == ("no_contact", None)
    assert "one 3D model at one place" in races["note"]


def test_a_shared_mesh_part_with_no_place_is_listed_but_never_a_take(lug_store):
    """Lug B declares nothing: it is still ranked, over every slot, and its row
    says its place is not known -- which the annotator shows with no Take."""
    rows, data = lug_store(declare_b=False)
    a, b = rows["lug_a_fit"], rows["lug_b_fit"]
    assert (b["from"]["occurrence"], b["from"]["placed"], b["to"]["placed"]) == (None, False, True)
    assert b["status"] == "ok" and b["candidates"]
    assert not builder.row_placed(b) and not builder.clear_top(b)
    assert builder.row_placed(a)
    assert data["summary"]["unplaced"] == 2            # lug B's fit and its two races


def test_a_declared_occurrence_no_mesh_records_says_so(lug_store, tmp_path):
    rows, _data = lug_store(declare_b=True)
    topology = json.loads((tmp_path / "declared" / "topologies" / "topology_lugs.json")
                          .read_text(encoding="utf-8"))
    topology["parts"][1]["occurrence"] = "asm/nowhere/bush.9"
    (tmp_path / "declared" / "topologies" / "topology_lugs.json").write_text(
        json.dumps(topology), encoding="utf-8")
    root = tmp_path / "declared"
    _out, data = builder.build(root / "topologies", root / "data" / "meshes",
                               root / "data" / builder.PROJECTION_SUBDIR, allow_older=True)
    row = {r["edge"]: r for r in data["topologies"][0]["edges"]}["lug_a_fit"]
    assert row["status"] == "no_occurrence"
    assert "asm/nowhere/bush.9" in row["note"]


def test_the_place_rule_is_the_annotators_rule():
    """``part_occurrence`` / ``Store.place`` and ``AA.partOccurrence`` /
    ``AA.partPlaced`` (apps/annotate/sweep.js): own occurrence, else the
    nearest same-mesh parent's; a part with neither is placed only when it is
    alone on its mesh. A reader and the projection disagreeing about which
    lug a part is, is the defect this pairs against."""
    sweep = (REPO_ROOT / "apps" / "annotate" / "sweep.js").read_text(encoding="utf-8")
    occ = re.search(r"AA\.partOccurrence = function[\s\S]*?\n  \};", sweep)
    placed = re.search(r"AA\.partPlaced = function[\s\S]*?\n  \};", sweep)
    assert occ and placed, "AA.partOccurrence / AA.partPlaced moved -- this pairing has drifted"
    assert "part.occurrence" in occ.group(0) and "part.parent" in occ.group(0)
    assert "shaOf(part.id) === sha" in occ.group(0)
    assert "< 2" in placed.group(0)


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


# ---------------------------------------------------------------------------
# 2026-11-22: a seat, a pattern and a ball get their faces too
# ---------------------------------------------------------------------------

def structural(edge_id, part, a, b):
    return {"id": edge_id, "name": edge_id.replace("_", " "), "kind": "structural",
            "part": part, "from": a, "to": b,
            "dimension": {"id": edge_id, "name": edge_id, "nominal": 0.0, "min": 0.0,
                          "max": 0.0, "plus_minus": 0.0,
                          "source_ref": {"kind": "assumed", "confidence": "untraced",
                                         "note": "fixture"}}}


@pytest.fixture
def shared_store(tmp_path):
    """Two blocks seated flat on each other, the same two blocks' twins 5 mm
    apart, two flanges whose three holes line up, and a bearing whose two
    races are one mesh -- each a node two parts share, or a ball joint."""
    def make(apart=False):
        root = tmp_path / ("apart" if apart else "seated")
        meshes = root / "data" / "meshes"
        gap = 5.0 if apart else 0.0
        write_mesh(meshes, "1" * 64, "lower", make_mesh(box_faces(0, 10, 0, 10, 0, 2)),
                   [instance("lower.1", IDENTITY)])
        write_mesh(meshes, "2" * 64, "upper", make_mesh(box_faces(2, 8, 2, 8, 2, 4)),
                   [instance("upper.1", translate(0, 0, gap))])
        write_mesh(meshes, "3" * 64, "body",
                   make_mesh([cylinder_face(2.45, 2.0, 5.0, convex=False, centre=c) for c in RING]),
                   [instance("body.1", translate(100, 0, gap))])
        write_mesh(meshes, "4" * 64, "plate",
                   make_mesh([cylinder_face(2.6, -3.0, 1.6, convex=False, centre=c) for c in RING]),
                   [instance("plate.1", translate(100, 0, 0))])
        write_mesh(meshes, "5" * 64, "bearing", bearing(ball_at=(0.5 if apart else 0.0, 0.0, 0.0)),
                   [instance("bearing.1", translate(200, 0, 0))])
        topologies = root / "topologies"
        topologies.mkdir(parents=True)
        aliases = [{"topology_part": p, "mesh_part_id": "bearing"} for p in ("inner", "outer")]
        (topologies / "part_mesh_aliases.json").write_text(json.dumps({"aliases": aliases}),
                                                           encoding="utf-8")
        parts = [{"id": p, "name": p} for p in ("lower", "upper", "body", "plate")]
        parts += [{"id": "bearing", "name": "bearing", "occurrence": "asm/bearing.1"},
                  {"id": "inner", "name": "inner race", "parent": "bearing"},
                  {"id": "outer", "name": "outer race", "parent": "bearing"}]
        sphere = {"surface": "spherical"}
        nodes = [{"id": "seat", "name": "clamp face", "kind": "mating_surface",
                  "parts": ["upper", "lower"]},
                 {"id": "lower_far", "name": "lower far face", "kind": "datum_feature",
                  "parts": ["lower"]},
                 {"id": "holes", "name": "fastener holes", "kind": "mating_surface",
                  "parts": ["body", "plate"], "interface": "fastener_pattern"},
                 {"id": "ball", "name": "ball centre", "kind": "datum_feature",
                  "parts": ["inner"], "face": dict(sphere, part="inner")},
                 {"id": "cup", "name": "bearing centre", "kind": "datum_feature",
                  "parts": ["outer"], "face": dict(sphere, part="outer")}]
        topology = {
            "schema": "joby.tolerance_stack/topology/v0", "id": "shared", "title": "Shared",
            "units": "mm", "nodes": nodes, "parts": parts,
            "edges": [structural("lower_height", "lower", "seat", "lower_far"),
                      gap_edge("ball_joint", "ball", "cup", "spherical")],
        }
        (topologies / "topology_shared.json").write_text(json.dumps(topology), encoding="utf-8")
        _out, data = builder.build(topologies, meshes, root / "data" / builder.PROJECTION_SUBDIR)
        (t,) = data["topologies"]
        return ({r["node"]: r for r in t["nodes"]}, {r["edge"]: r for r in t["edges"]}, data)
    return make


def test_a_seat_offers_each_part_the_flat_that_touches_the_other(shared_store):
    nodes, _edges, data = shared_store()
    seat = nodes["seat"]
    assert (seat["status"], seat["pairing"]) == ("ok", "plane_on_plane")
    assert (seat["from"]["part"], seat["to"]["part"]) == ("upper", "lower")
    top = seat["candidates"][0]
    assert top["relation"] == "contact"
    assert (top["from"]["faces"], top["to"]["faces"]) == ([0], [1])   # upper's bottom, lower's top
    assert top["evidence"]["gap_mm"] == pytest.approx(0.0, abs=1e-6)
    assert top["evidence"]["overlap_mm2"] == pytest.approx(36.0, rel=0.05)
    # Each side names its feature and the edge ends a Take writes through.
    assert seat["to"]["feature"] == {"topology_id": "shared", "part": "lower", "node": "seat"}
    assert seat["to"]["ends"] == [{"edge": "lower_height", "direction": "from"}]
    assert seat["from"]["ends"] == []
    assert data["summary"]["shared_nodes"] == 2
    assert data["summary"]["nodes_by_status"] == {"ok": 2}


def test_a_pattern_offers_each_part_every_hole_that_lines_up_as_one_row(shared_store):
    nodes, _edges, _data = shared_store()
    holes = nodes["holes"]
    assert (holes["status"], holes["pairing"]) == ("ok", ic.PATTERN_PAIRING)
    (top,) = holes["candidates"]
    assert (top["from"]["faces"], top["to"]["faces"]) == ([0, 1, 2], [0, 1, 2])
    assert top["evidence"]["holes"] == 3
    assert top["evidence"]["from_radius_mm"] == pytest.approx(2.45, abs=1e-3)
    assert top["evidence"]["to_radius_mm"] == pytest.approx(2.6, abs=1e-3)
    assert builder.clear_top(holes)


def test_a_ball_whose_races_are_one_mesh_is_offered_its_own_ball(shared_store):
    """The inner race and the outer race are solids of the bearing's mesh at
    the bearing's place: the ball centre end gets the convex sphere, the
    bearing centre end the race's seat."""
    _nodes, edges, _data = shared_store()
    joint = edges["ball_joint"]
    assert joint["status"] == "ok", joint.get("note")
    assert joint["from"]["occurrence"] == joint["to"]["occurrence"] == "asm/bearing.1"
    (top,) = joint["candidates"]
    assert (top["from"]["faces"], top["to"]["faces"]) == ([0], [1])
    assert top["evidence"]["ball"] == "from"


def test_parts_that_do_not_touch_are_offered_nothing(shared_store):
    """A wrong offer costs a wrong bind: the same seat, pattern and ball with
    the parts apart (a block lifted 5 mm, the body's flange lifted 5 mm, a
    ball 0.5 mm off its race's centre) offer no face at all."""
    nodes, edges, _data = shared_store(apart=True)
    for row in (nodes["seat"], nodes["holes"], edges["ball_joint"]):
        assert row["status"] == "no_contact", row.get("node") or row.get("edge")
        assert row["candidates"] == []


def test_a_ball_joint_whose_ends_do_not_say_which_is_the_ball_is_not_compared(shared_store, tmp_path):
    """Two races of one mesh, neither end named for the ball: either sphere
    could be either race's, so nothing is offered."""
    shared_store()
    root = tmp_path / "seated"
    path = root / "topologies" / "topology_shared.json"
    topology = json.loads(path.read_text(encoding="utf-8"))
    topology["nodes"][3]["name"] = "inner centre"
    path.write_text(json.dumps(topology), encoding="utf-8")
    _out, data = builder.build(root / "topologies", root / "data" / "meshes",
                               root / "data" / builder.PROJECTION_SUBDIR, allow_older=True)
    (joint,) = data["topologies"][0]["edges"]
    assert (joint["status"], joint["nearest_gap_mm"]) == ("no_contact", None)
    assert "one 3D model at one place" in joint["note"]


#: A projection built before 2026-11-22 carries no ``nodes``; these checks
#: wait for the rebuild rather than reading that one as a failure.
needs_nodes = pytest.mark.skipif(
    live_projection() is None or any("nodes" not in t for t in live_projection()["topologies"]),
    reason="the live contact_suggestions.json predates node rows (2026-11-22); "
           "scripts/rebuild_projections.ps1 rebuilds it")

V2 = REPO_ROOT / "docs" / "topologies" / "topology_vpa_end_stop_v2.json"

#: v2's shared nodes measured with nothing on 2026-11-22, and why: the
#: tangential link's MS14103-3 is modelled about 6 degrees off its bolt's
#: axis, so neither race face meets its bushing within the 2 degree margin
#: (``CONTACT_TOLERANCES["angle_deg"]``). The lesson has the numbers.
V2_NODES_WITH_NOTHING = ("tan_link_upper_inner_race_flange_seat",
                         "tan_link_upper_inner_race_clamp_seat")


@needs_live
@needs_nodes
def test_real_v2s_seats_and_patterns_have_faces_but_the_two_named():
    v2 = json.loads(V2.read_text(encoding="utf-8"))
    shared = [n["id"] for n in v2["nodes"] if len(n["parts"]) == 2]
    (topology,) = [t for t in live_projection()["topologies"] if t["id"] == v2["id"]]
    rows = {r["node"]: r for r in topology["nodes"]}
    assert sorted(rows) == sorted(shared)
    empty = sorted(n for n, r in rows.items() if r["status"] != "ok")
    assert empty == sorted(V2_NODES_WITH_NOTHING), [(n, rows[n]["note"]) for n in empty]
    for node_id, row in rows.items():
        node = next(n for n in v2["nodes"] if n["id"] == node_id)
        for c in row["candidates"]:
            assert c["from"]["faces"] and c["to"]["faces"]
        if node.get("interface") in ic.PATTERN_INTERFACES and row["status"] == "ok":
            assert row["pairing"] == ic.PATTERN_PAIRING
            assert row["candidates"][0]["evidence"]["holes"] >= 1


@needs_live
@needs_nodes
def test_real_v2s_inner_race_ball_centres_are_offered_their_ball():
    v2 = json.loads(V2.read_text(encoding="utf-8"))
    balls = [e["id"] for e in v2["edges"] if e.get("interface") == "spherical"
             and "inner_race" in json.dumps([n["parts"] for n in v2["nodes"] if n["id"] == e["from"]])]
    assert len(balls) == 4
    (topology,) = [t for t in live_projection()["topologies"] if t["id"] == v2["id"]]
    rows = {r["edge"]: r for r in topology["edges"]}
    for edge_id in balls:
        row = rows[edge_id]
        assert row["status"] == "ok", (edge_id, row.get("note"))
        top = row["candidates"][0]
        assert top["evidence"]["ball"] == "from" and top["from"]["surface"] == "spherical"

"""``scripts/propose_bindings.py`` -- an agent's one write path, and what it refuses.

A synthetic store on disk: a bolt mesh (one round shank face, then a box's six
flat faces) and a plate mesh, a topology naming a diameter on the bolt and a
thickness on the plate, and an inbox. Every refusal class is reached once;
the all-or-nothing report is held; and the fitter is run over the result, so
"a proposal never produces a fitted nominal; an accept does" is checked as a
value and not as a list membership.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import fit_bound_features as fbf  # noqa: E402
import propose_bindings as pb  # noqa: E402

from tolerance_stack import feature_identity as fi  # noqa: E402

from tests.test_contact_suggestions import gap_edge, instance, write_mesh  # noqa: E402
from tests.test_interface_contact import box_faces, cylinder_face, make_mesh, translate  # noqa: E402

ACTOR = "agent:an_agent_proposes_a_face_binding_and_a_human_ratifies_it"
BOLT = "a" * 64
PLATE = "b" * 64
SHANK_FACE = 0          # the bolt's one round face
BOLT_FLAT_FACE = 1      # a flat face of the bolt's box
PLATE_TOP_FACE = 1      # +Z face of the plate's box (box_faces' order: -Z, +Z, ...)


def _with_centroids(mesh):
    """``make_mesh`` writes areas; a binding's fingerprint needs a centroid too."""
    for face in mesh.manifest["faces"]:
        ids = [i for i, f in enumerate(mesh.face_ids) if f == face["face_id"]]
        verts = [mesh.indices[3 * t + k] for t in ids for k in range(3)]
        pts = [mesh.positions[3 * v:3 * v + 3] for v in verts]
        face["centroid_native"] = [sum(p[i] for p in pts) / len(pts) for i in range(3)]
    return mesh


@pytest.fixture
def store(tmp_path):
    data = tmp_path / "data"
    meshes = data / "meshes"
    bolt = _with_centroids(make_mesh([cylinder_face(3.0, 0, 20, convex=True)] + box_faces(-4, 4, -4, 4, 20, 24)))
    plate = _with_centroids(make_mesh(box_faces(-20, 20, -20, 20, 0, 5)))
    write_mesh(meshes, BOLT, "bolt_part", bolt, [instance("bolt.1", translate(0, 0, 0))])
    write_mesh(meshes, PLATE, "plate_part", plate, [instance("plate.1", translate(0, 0, 0))])
    topologies = tmp_path / "topologies"
    topologies.mkdir()
    nodes = [{"id": n, "name": name, "kind": "datum_feature", "parts": [p]}
             for n, name, p in (("shank_n", "bolt shank", "bolt_part"),
                                ("plate_bore_n", "plate clearance hole", "plate_part"),
                                ("plate_top_n", "plate top face", "plate_part"),
                                ("plate_bottom_n", "plate bottom face", "plate_part"))]
    topology = {
        "schema": "joby.tolerance_stack/topology/v0", "id": "fixture", "title": "Fixture",
        "units": "mm", "nodes": nodes,
        "parts": [{"id": p, "name": p} for p in ("bolt_part", "plate_part")],
        "edges": [gap_edge("shank_in_hole", "shank_n", "plate_bore_n", "clearance"),
                  dict(gap_edge("plate_thickness", "plate_top_n", "plate_bottom_n", None),
                       kind="structural", part="plate_part")],
    }
    (topologies / "topology_fixture.json").write_text(json.dumps(topology), encoding="utf-8")
    (data / "inbox" / "feature-identity").mkdir(parents=True)
    return data, topologies


def ctx(store):
    data, topologies = store
    return pb.Context(data, topologies)


def row(**overrides):
    base = dict(topology="fixture", edge="shank_in_hole", direction="from", sha256=BOLT,
                face_id=SHANK_FACE, confidence="high", basis="round face, the bolt's only one")
    base.update(overrides)
    return pb.Proposal(**base)


def events_in(store):
    data, _ = store
    return sorted(p.name for p in (data / "inbox" / "feature-identity").glob("*.json"))


def refusal_of(store, proposal, actor=ACTOR):
    with pytest.raises(pb.Refused) as caught:
        pb.propose_all([proposal], ctx(store), actor)
    return caught.value.refusal


# ---------------------------------------------------------------------------
# the write
# ---------------------------------------------------------------------------


def test_a_proposal_is_written_as_a_proposed_event_with_the_faces_fingerprint(store):
    ((filename, event),) = pb.propose_all([row()], ctx(store), ACTOR)
    assert filename == "0001_shank_in_hole_proposed.json"
    assert events_in(store) == [filename]
    data, _ = store
    on_disk = json.loads((data / "inbox" / "feature-identity" / filename).read_text(encoding="utf-8"))
    loaded = fi.FeatureIdentityEvent.from_dict(on_disk)
    assert loaded.verdict == "proposed"
    assert loaded.recorded_by == ACTOR
    assert (loaded.confidence, loaded.surface_class) == ("high", "cylindrical")
    manifest = json.loads((data / "meshes" / BOLT / "manifest.json").read_text(encoding="utf-8"))
    face = manifest["faces"][SHANK_FACE]
    assert loaded.geometry_key.area_native2 == pytest.approx(face["area_native2"])
    assert list(loaded.geometry_key.centroid_native) == pytest.approx(face["centroid_native"])


def test_the_second_proposal_takes_the_next_number_and_seq(store):
    pb.propose_all([row()], ctx(store), ACTOR)
    ((filename, event),) = pb.propose_all(
        [row(edge="plate_thickness", sha256=PLATE, face_id=PLATE_TOP_FACE)], ctx(store), ACTOR)
    assert filename.startswith("0002_") and event.seq == 2


def test_the_cli_writes_one_and_a_dry_run_writes_none(store, capsys):
    data, topologies = store
    argv = ["--data-root", str(data), "--actor", ACTOR, "--topology", "fixture",
            "--edge", "shank_in_hole", "--direction", "from", "--sha", BOLT,
            "--face", str(SHANK_FACE), "--confidence", "medium", "--basis", "the one round face"]
    argv += ["--topologies-dir", str(topologies)]
    assert pb.main(argv + ["--dry-run"]) == 0
    assert events_in(store) == []
    assert pb.main(argv) == 0
    assert len(events_in(store)) == 1


# ---------------------------------------------------------------------------
# what it refuses
# ---------------------------------------------------------------------------


def test_a_diameter_on_a_flat_face_is_refused(store):
    assert refusal_of(store, row(face_id=BOLT_FLAT_FACE)) == "wrong_shape"
    assert events_in(store) == []


def test_a_face_on_the_wrong_part_is_refused_before_its_shape_is_judged(store):
    # The plate has no round face, so ask the plate end with the bolt's shank
    # mesh -- the PART check answers first, which is the order wanted: a face on
    # the wrong part is never judged by its shape.
    assert refusal_of(store, row(edge="plate_thickness", sha256=BOLT)) == "wrong_part"


def test_an_unknown_sha_or_face_is_refused(store):
    assert refusal_of(store, row(sha256="c" * 64)) == "unknown_sha"
    assert refusal_of(store, row(face_id=999)) == "unknown_sha"


def test_no_such_key_is_refused(store):
    assert refusal_of(store, row(edge="no_such_edge")) == "no_such_key"
    assert refusal_of(store, row(topology="no_such_topology")) == "no_such_key"


def test_a_face_on_the_other_ends_part_is_refused(store):
    assert refusal_of(store, row(direction="to")) == "wrong_part"


def test_an_actor_that_is_not_an_agent_is_refused(store):
    assert refusal_of(store, row(), actor="annotate-app:jeff") == "bad_actor"
    assert refusal_of(store, row(), actor="agent:") == "bad_actor"


def test_the_same_face_cannot_be_proposed_twice_for_one_end(store):
    pb.propose_all([row()], ctx(store), ACTOR)
    assert refusal_of(store, row()) == "already_there"
    # ...nor twice inside one report, before either is written.
    with pytest.raises(pb.Refused):
        pb.propose_all([row(edge="plate_thickness", sha256=PLATE, face_id=PLATE_TOP_FACE)] * 2,
                       ctx(store), ACTOR)


def _human_answer(store, verdict, proposal_event, seq, filename):
    data, _ = store
    event = {
        "schema": fi.SCHEMA_EVENT, "event_id": f"human-{seq}", "seq": seq,
        "created_at": "2026-10-28T12:00:00Z", "recorded_by": "annotate-app:jeff",
        "stack_key": proposal_event.stack_key.as_dict(), "verdict": verdict,
    }
    if verdict == "rejected":
        event["rejects"] = proposal_event.event_id
    else:
        event.update(geometry_key=proposal_event.geometry_key.as_dict(),
                     direction=proposal_event.direction, ratifies=proposal_event.event_id)
    (data / "inbox" / "feature-identity" / filename).write_text(json.dumps(event), encoding="utf-8")


def test_a_rejected_face_is_never_proposed_again_for_that_key(store):
    ((_, proposal),) = pb.propose_all([row()], ctx(store), ACTOR)
    _human_answer(store, "rejected", proposal, 2, "0002_shank_in_hole_rejected.json")
    assert refusal_of(store, row()) == "rejected_before"
    # The other end of the same key is a different question, and stays open.
    assert refusal_of(store, row(direction="to", sha256=PLATE, face_id=PLATE_TOP_FACE)) == "wrong_shape"


def test_an_end_already_bound_is_not_proposed_for(store):
    ((_, proposal),) = pb.propose_all([row()], ctx(store), ACTOR)
    _human_answer(store, "bound", proposal, 2, "0002_shank_in_hole_bound.json")
    assert refusal_of(store, row()) == "already_there"


def test_a_report_is_all_or_nothing(store, tmp_path):
    data, topologies = store
    report = tmp_path / "report.json"
    rows = [dict(row().__dict__), dict(row(face_id=BOLT_FLAT_FACE).__dict__)]
    report.write_text(json.dumps({"proposals": rows}), encoding="utf-8")
    assert pb.main(["--data-root", str(data), "--actor", ACTOR, "--from-report", str(report),
                    "--topologies-dir", str(topologies)]) == 2
    assert events_in(store) == []


def test_every_refusal_word_is_reached_by_a_test_here():
    source = Path(__file__).read_text(encoding="utf-8")
    for word in pb.REFUSALS:
        assert f'== "{word}"' in source, f"no test here asserts the refusal {word!r}"


# ---------------------------------------------------------------------------
# value level: the fitter reads bindings, never proposals
# ---------------------------------------------------------------------------


def test_a_proposal_produces_no_fitted_nominal_and_its_accept_does(store, tmp_path):
    data, _ = store
    events_dir = data / "inbox" / "feature-identity"
    ((_, proposal),) = pb.propose_all([row()], ctx(store), ACTOR)

    _out, before = fbf.build(events_dir, data / "meshes", tmp_path / "fits_before")
    assert before["fits"] == [] and before["summary"]["bindings"] == 0

    _human_answer(store, "bound", proposal, 2, "0002_shank_in_hole_bound.json")
    _out, after = fbf.build(events_dir, data / "meshes", tmp_path / "fits_after")
    (fit,) = after["fits"]
    assert fit["event_id"] == "human-2"
    assert fit["local"]["surface"] == "cylindrical"
    assert fit["local"]["geometry"]["radius"] == pytest.approx(3.0, abs=1e-3)

"""A feature is bound once, to a set of faces (handoff
``a_feature_is_bound_once_to_a_set_of_faces``, 2026-11-12).

Value-level, on the committed models: an old edge-end event reads through to
the feature its end is, and where several land on one feature the three
collision outcomes come out by rule -- one face, one set on one surface, a
disagreement. The shared-surface threshold is held at its measured boundary,
and one fit through a set of faces is checked against a cylinder and a plane
built by hand.
"""

from __future__ import annotations

import array
import math
from pathlib import Path

import pytest

from tolerance_stack import feature_geometry as fg
from tolerance_stack.feature_identity import (
    FEATURE_OUTCOMES,
    FEATURE_STATES,
    ORPHAN_REASONS,
    PROPOSAL_CONFIDENCES,
    SCHEMA_EVENT_V1,
    FeatureIdentityEvent,
    FeatureKey,
    GeometryKey,
    StackKey,
    build_projection,
    load_models,
)

REPO = Path(__file__).resolve().parent.parent
MODELS = load_models(REPO / "docs" / "topologies")
V1, V2 = "vpa_pitch_linkage", "vpa_end_stop_v2"
SHA = "ab" * 32
HUMAN = "annotate-app:tester"
ONE, SET, DISAGREE = FEATURE_OUTCOMES


def face(face_id: int, sha: str = SHA) -> GeometryKey:
    return GeometryKey(sha, face_id, 1.0, (0.0, 0.0, 0.0))


def old(event_id, seq, topology, edge, direction, face_id, verdict="bound", **extra):
    if verdict == "proposed":
        extra = dict(dict(confidence=PROPOSAL_CONFIDENCES[0], basis="synthetic",
                          surface_class=fg.SURFACE_CLASSES[1]), **extra)
        extra.setdefault("by", "agent:tests")
    return FeatureIdentityEvent(
        event_id=event_id, seq=seq, created_at="2026-11-12T00:00:00Z", recorded_by=extra.pop("by", HUMAN),
        stack_key=StackKey(kind="topology_edge", topology_id=topology, edge_id=edge), verdict=verdict,
        geometry_key=face(face_id), direction=direction, **extra)


def new(event_id, seq, key: FeatureKey, verdict, face_ids=(), **extra):
    return FeatureIdentityEvent(
        event_id=event_id, seq=seq, created_at="2026-11-12T00:00:00Z", recorded_by=extra.pop("by", HUMAN),
        stack_key=None, feature_key=key, verdict=verdict,
        geometry_keys=tuple(face(f) for f in face_ids) if face_ids else None, **extra)


# A cylinder of radius 20 about z, as surface records: 1 and 2 are one
# surface (a split boss); 3 is the same axis at another radius; 4 is the
# same radius on a parallel axis 0.5 away (a second hole of a pattern).
SURFACES = {
    1: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 0], "radius": 20.0, "extent": 10},
    2: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 7], "radius": 20.0, "extent": 10},
    3: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 0], "radius": 16.5, "extent": 10},
    4: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0.5, 0, 0], "radius": 20.0, "extent": 10},
}


def surface_of(key: GeometryKey):
    return SURFACES.get(key.face_id)


HUB_AXIS = FeatureKey(V1, "hub", "hub_spindle_bore_axis")


# --- the event shape ---------------------------------------------------------


def test_a_v1_event_names_a_feature_and_a_list_of_faces_and_round_trips():
    event = new("n1", 1, HUB_AXIS, "bound", (1, 2))
    doc = event.as_dict()
    assert doc["schema"] == SCHEMA_EVENT_V1
    assert doc["feature_key"] == {"topology_id": V1, "part": "hub", "node": "hub_spindle_bore_axis"}
    assert [g["face_id"] for g in doc["geometry_keys"]] == [1, 2]
    assert "stack_key" not in doc and "direction" not in doc and "geometry_key" not in doc
    assert FeatureIdentityEvent.from_dict(doc).as_dict() == doc


@pytest.mark.parametrize("why, kwargs", [
    ("no faces", dict(face_ids=())),
    ("a face twice", dict(face_ids=(1, 1))),
])
def test_a_v1_face_verdict_refuses_a_bad_face_list(why, kwargs):
    with pytest.raises(ValueError):
        new("n1", 1, HUB_AXIS, "bound", **kwargs)


def test_a_v1_set_is_on_one_mesh():
    with pytest.raises(ValueError, match="more than one mesh"):
        FeatureIdentityEvent(event_id="n1", seq=1, created_at="t", recorded_by=HUMAN, stack_key=None,
                             feature_key=HUB_AXIS, verdict="bound",
                             geometry_keys=(face(1), face(2, "cd" * 32)))


def test_an_event_carries_exactly_one_subject():
    with pytest.raises(ValueError, match="exactly one"):
        FeatureIdentityEvent(event_id="n1", seq=1, created_at="t", recorded_by=HUMAN,
                             stack_key=StackKey(kind="topology_edge", topology_id=V1, edge_id="x"),
                             feature_key=HUB_AXIS, verdict="retracted", retracts="n0")


# --- the mapping -------------------------------------------------------------


def test_an_edge_end_reads_through_to_the_feature_it_is():
    """pitch_link_length is a dimension on the pitch link: its two ends are
    the link's two sphere centres. v2's pilot fit starts on the hub's
    locating boss, a node v2 shares with v1 on the same part, so it is keyed
    under v1 -- the same feature as v1's spindle coaxiality start."""
    projection = build_projection([
        old("a", 1, V1, "pitch_link_length", "from", 104),
        old("b", 2, V1, "pitch_link_length", "to", 140),
        old("c", 3, V2, "hub_boss_in_tan_link_mount_pilot", "from", 144),
        old("d", 4, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 144),
    ], MODELS, surface_of)
    assert projection.read_through == {
        "a": FeatureKey(V1, "pitch_link", "pitch_link_lower_sphere_centre"),
        "b": FeatureKey(V1, "pitch_link", "pitch_link_upper_sphere_centre"),
        "c": HUB_AXIS,
        "d": HUB_AXIS,
    }
    assert projection.orphans == {}


def test_an_event_whose_edge_or_model_is_gone_is_an_orphan_and_kept():
    projection = build_projection([
        old("gone", 1, V1, "no_such_edge", "from", 1),
        old("away", 2, "no_such_model", "x", "from", 1),
    ], MODELS, surface_of)
    assert projection.orphans == {"gone": ORPHAN_REASONS[1], "away": ORPHAN_REASONS[0]}
    assert projection.by_feature == {}
    assert len(projection.by_stack_key) == 2  # history keeps both


# --- the three collision outcomes --------------------------------------------


def _hub(events):
    projection = build_projection(events, MODELS, surface_of)
    return projection, projection.for_feature(HUB_AXIS)


def test_the_same_face_from_several_ends_is_one_binding():
    projection, hub = _hub([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        old("b", 2, V2, "hub_boss_in_tan_link_mount_pilot", "from", 1),
    ])
    assert (hub.state, hub.outcome) == ("bound", ONE)
    assert [f.face_id for f in hub.faces] == [1]
    assert [e.event_id for e in hub.bindings] == ["a", "b"]
    assert projection.summary()["features_bound"] == 1


def test_different_faces_on_one_surface_are_one_set():
    projection, hub = _hub([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        old("b", 2, V2, "hub_boss_in_tan_link_mount_pilot", "from", 2),
    ])
    assert (hub.state, hub.outcome) == ("bound", SET)
    assert [f.face_id for f in hub.faces] == [1, 2]
    assert projection.same_surface == [(face(1).token(), face(2).token())]
    assert projection.summary()["features_holding_a_set"] == 1


@pytest.mark.parametrize("other", [3, 4], ids=["another radius", "another axis"])
def test_different_faces_on_different_surfaces_disagree_and_nothing_is_chosen(other):
    projection, hub = _hub([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        old("b", 2, V2, "hub_boss_in_tan_link_mount_pilot", "from", other),
    ])
    assert (hub.state, hub.outcome) == (FEATURE_STATES[1], DISAGREE)
    assert [[f.face_id for f in g["faces"]] for g in hub.disagreement] == [[1], [other]]
    assert [g["events"] for g in hub.disagreement] == [["a"], ["b"]]
    assert projection.summary()["disagreements"] == 1
    assert projection.summary()["features_bound"] == 0


def test_without_fits_different_faces_disagree():
    projection = build_projection([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        old("b", 2, V2, "hub_boss_in_tan_link_mount_pilot", "from", 2),
    ], MODELS)
    assert projection.for_feature(HUB_AXIS).outcome == DISAGREE


def test_keep_settles_a_disagreement_with_a_feature_keyed_binding():
    """Keep writes a v1 bound on the feature naming the kept face; the old
    bindings read through are then replaced, and kept in history."""
    _, hub = _hub([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        old("b", 2, V2, "hub_boss_in_tan_link_mount_pilot", "from", 3),
        new("keep", 3, HUB_AXIS, "bound", (3,)),
    ])
    assert (hub.state, hub.outcome) == ("bound", ONE)
    assert [f.face_id for f in hub.faces] == [3]
    assert [e.event_id for e in hub.replaced] == ["a", "b"]
    assert hub.history == ["a", "b", "keep"]


def test_unbinding_a_feature_keyed_binding_does_not_bring_the_old_ones_back():
    _, hub = _hub([
        old("a", 1, V1, "hub_to_pitch_plate_spindle_coaxiality", "from", 1),
        new("n", 2, HUB_AXIS, "bound", (1, 2)),
        new("u", 3, HUB_AXIS, "retracted", retracts="n"),
    ])
    assert hub.state == "unbound"
    assert [e.event_id for e in hub.retracted] == ["n"]
    assert [e.event_id for e in hub.replaced] == ["a"]


def test_removing_a_face_from_a_set_supersedes_it_with_the_smaller_set():
    _, hub = _hub([
        new("n", 1, HUB_AXIS, "bound", (1, 2)),
        new("m", 2, HUB_AXIS, "bound", (1,), supersedes="n"),
    ])
    assert (hub.outcome, [f.face_id for f in hub.faces]) == (ONE, [1])
    assert [e.event_id for e in hub.superseded] == ["n"]


def test_two_standing_feature_bindings_with_different_sets_disagree():
    _, hub = _hub([new("n", 1, HUB_AXIS, "bound", (1,)), new("m", 2, HUB_AXIS, "bound", (1, 2))])
    assert hub.outcome == DISAGREE


# --- proposals ------------------------------------------------------------------


def test_an_open_edge_end_proposal_stays_open_on_its_feature_and_a_feature_accept_answers_it():
    events = [old("p", 1, V2, "hub_boss_in_tan_link_mount_pilot", "from", 1, verdict="proposed")]
    _, hub = _hub(events)
    assert hub.state == "proposed" and [e.event_id for e in hub.proposals] == ["p"]
    projection, hub = _hub(events + [new("ok", 2, HUB_AXIS, "bound", (1, 2), ratifies="p")])
    assert hub.state == "bound" and hub.proposals == [] and hub.accepted_proposals == ["p"]
    assert projection.for_stack_key(events[0].stack_key).accepted_proposals[0].event_id == "p"


def test_a_feature_accept_must_bind_the_proposed_face():
    events = [old("p", 1, V2, "hub_boss_in_tan_link_mount_pilot", "from", 1, verdict="proposed"),
              new("ok", 2, HUB_AXIS, "bound", (2,), ratifies="p")]
    with pytest.raises(ValueError, match="different face"):
        build_projection(events, MODELS, surface_of)


def test_a_feature_accept_of_another_features_proposal_is_refused():
    events = [old("p", 1, V1, "pitch_link_length", "from", 1, verdict="proposed"),
              new("ok", 2, HUB_AXIS, "bound", (1,), ratifies="p")]
    with pytest.raises(ValueError, match="different stack key"):
        build_projection(events, MODELS, surface_of)


# --- the shared-surface rule's threshold --------------------------------------


def _cyl(radius=20.0, point=(0.0, 0.0, 0.0), axis=(0.0, 0.0, 1.0)):
    return {"surface": "cylindrical", "axis": list(axis), "axis_point": list(point), "radius": radius}


def test_the_radius_threshold_sits_between_the_measured_populations():
    """One-surface pairs agree to <= 1.1e-5 of the radius; the nearest pair of
    two surfaces was 1.44e-4 apart (SAME_SURFACE_TOLERANCES' basis)."""
    tol = fg.SAME_SURFACE_TOLERANCES["radius_fraction"]
    assert 1.1e-5 < tol < 1.44e-4
    assert fg.same_surface(_cyl(100.0), _cyl(100.0 * (1 + 0.9 * tol)))
    assert not fg.same_surface(_cyl(100.0), _cyl(100.0 * (1 + 1.1 * tol)))
    assert not fg.same_surface(_cyl(111.997), _cyl(112.013))  # the link mount's two bands


def test_the_axis_thresholds_hold_a_split_boss_and_refuse_a_hole_pattern():
    tol = fg.SAME_SURFACE_TOLERANCES
    near = tol["axis_distance_fraction"] * 20.0
    assert fg.same_surface(_cyl(point=(0.9 * near, 0, 5)), _cyl())
    assert not fg.same_surface(_cyl(point=(1.1 * near, 0, 5)), _cyl())
    assert not fg.same_surface(_cyl(5.5, (0.18 * 5.5, 0, 0)), _cyl(5.5))  # the 5.5 bolt circle
    tilt = math.radians(0.9 * tol["axis_deg"])
    assert fg.same_surface(_cyl(axis=(math.sin(tilt), 0, math.cos(tilt))), _cyl())
    tilt = math.radians(1.1 * tol["axis_deg"])
    assert not fg.same_surface(_cyl(axis=(math.sin(tilt), 0, math.cos(tilt))), _cyl())
    assert fg.same_surface(_cyl(axis=(0, 0, -1)), _cyl()), "an axis is a line, either way round"


def test_the_plane_thresholds_need_one_plane_facing_one_way():
    tol = fg.SAME_SURFACE_TOLERANCES

    def plane(z, n=(0.0, 0.0, 1.0), extent=10.0):
        return {"surface": "planar", "normal": list(n), "point": [3.0, 4.0, z], "extent": extent}

    gap = tol["plane_offset_fraction"] * 10.0
    assert fg.same_surface(plane(0.0), plane(0.9 * gap))
    assert not fg.same_surface(plane(0.0), plane(1.1 * gap))
    assert not fg.same_surface(plane(0.0), plane(0.0, (0.0, 0.0, -1.0))), "two sides of a plate"
    assert not fg.same_surface(plane(0.0), _cyl()), "different classes never are"


def test_the_threshold_is_the_browsers():
    """The annotator sweeps a picked face's siblings by the same numbers."""
    import re
    source = (REPO / "apps" / "annotate" / "face_geometry.js").read_text(encoding="utf-8")
    block = source[source.index("AA.SAME_SURFACE = Object.freeze({"):]
    block = block[:block.index("});")]
    for py, js in fg.JS_SAME_SURFACE_NAMES.items():
        found = re.search(rf"\b{js}:\s*([0-9.eE+-]+)", block)
        assert found, f"AA.SAME_SURFACE has no {js}"
        assert float(found.group(1)) == fg.SAME_SURFACE_TOLERANCES[py], js
    assert set(fg.JS_SAME_SURFACE_NAMES) == set(fg.SAME_SURFACE_TOLERANCES)


# --- one fit through a set ------------------------------------------------------


def _mesh(faces):
    """A :class:`fg.Mesh` of several faces, each ``(points, triangles)``."""
    positions, indices, face_ids, manifest = [], [], [], []
    base = 0
    for fid, (points, triangles) in enumerate(faces):
        area = 0.0
        for a, b, c in triangles:
            area += 0.5 * fg._norm(fg._cross(fg._sub(points[b], points[a]), fg._sub(points[c], points[a])))
            indices.extend((base + a, base + b, base + c))
            face_ids.append(fid)
        positions.extend(c for p in points for c in p)
        manifest.append({"face_id": fid, "n_vertices": len(points), "n_triangles": len(triangles),
                         "area_native2": area})
        base += len(points)
    return fg.Mesh(sha256="0" * 64, directory=Path("."), manifest={"faces": manifest},
                   positions=array.array("f", positions), indices=array.array("I", indices),
                   face_ids=array.array("I", face_ids))


def _band(radius, z0, z1, a0, a1, rows=4, segments=24, centre=(5.0, -3.0)):
    points, triangles = [], []
    for r in range(rows):
        z = z0 + (z1 - z0) * r / (rows - 1)
        for s in range(segments + 1):
            t = math.radians(a0 + (a1 - a0) * s / segments)
            points.append((centre[0] + radius * math.cos(t), centre[1] + radius * math.sin(t), z))
    w = segments + 1
    for r in range(rows - 1):
        for s in range(segments):
            a, b, c, d = r * w + s, r * w + s + 1, (r + 1) * w + s, (r + 1) * w + s + 1
            triangles += [(a, b, d), (a, d, c)]
    return points, triangles


def _square(x0, y0, size, z, n=4):
    points = [(x0 + size * i / (n - 1), y0 + size * j / (n - 1), z) for j in range(n) for i in range(n)]
    triangles = []
    for j in range(n - 1):
        for i in range(n - 1):
            a, b, c, d = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1
            triangles += [(a, b, d), (a, d, c)]
    return points, triangles


def test_one_cylinder_through_two_seats():
    """Two coaxial seats of one bore, 30 mm apart, each a 120-degree arc: one
    cylinder through both, at the radius and on the axis they were built on."""
    mesh = _mesh([_band(8.0, 0.0, 6.0, 0, 120), _band(8.0, 36.0, 42.0, 0, 120), _square(0, 0, 5, 60)])
    each = [fg.fit_face(mesh, i) for i in (0, 1)]
    assert [f.surface for f in each] == ["cylindrical", "cylindrical"]
    assert fg.same_surface(fg.surface_record(each[0]), fg.surface_record(each[1]))
    fit = fg.fit_face_set(mesh, [0, 1])
    assert fit.surface == "cylindrical", fit.why
    assert fit.geometry["radius"] == pytest.approx(8.0, abs=1e-4)
    assert abs(fit.geometry["axis"][2]) == pytest.approx(1.0, abs=1e-7)
    axis_point = fit.geometry["axis_point"]
    assert axis_point[:2] == pytest.approx([5.0, -3.0], abs=1e-4)
    assert fit.extent > 2 * max(f.extent for f in each), "the fit spans both seats"
    assert fit.area == pytest.approx(each[0].area + each[1].area)


def test_one_plane_through_three_feet():
    mesh = _mesh([_square(0, 0, 4, 7.25), _square(20, 0, 4, 7.25), _square(10, 15, 4, 7.25)])
    fit = fg.fit_face_set(mesh, [0, 1, 2])
    assert fit.surface == "planar", fit.why
    assert abs(fit.geometry["normal"][2]) == pytest.approx(1.0, abs=1e-9)
    assert abs(fit.geometry["offset"]) == pytest.approx(7.25, abs=1e-5)


def test_a_set_of_different_kinds_of_surface_is_other_and_says_so():
    mesh = _mesh([_band(8.0, 0.0, 6.0, 0, 120), _square(0, 0, 5, 60)])
    fit = fg.fit_face_set(mesh, [0, 1])
    assert fit.surface == "other"
    assert fit.why.startswith("the faces are not one kind of surface")

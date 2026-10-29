"""``tolerance_stack.interface_contact`` -- which faces of two parts touch,
pinned value by value on meshes built here by hand.

Every mesh below is tessellated the way OCC tessellates a STEP face: the nodes
lie exactly on the surface, each face's nodes are a contiguous run of the
vertex buffer, and every triangle is wound so its normal points OUT of the
material (``_orient``). That last property is what tells a pin from a bore and
a ball from its race, so the builders here set it on purpose rather than by
accident.
"""

from __future__ import annotations

import array
import math
from pathlib import Path

import pytest

from tolerance_stack import feature_geometry as fg
from tolerance_stack import interface_contact as ic
from tolerance_stack.topology import INTERFACE_KINDS

IDENTITY = [1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0]


def translate(x, y, z, base=IDENTITY):
    out = list(base)
    out[3], out[7], out[11] = x, y, z
    return out


# ---------------------------------------------------------------------------
# hand-built meshes
# ---------------------------------------------------------------------------

def _orient(tri, outward):
    """Wind ``tri`` so its normal points along ``outward(centroid)``."""
    a, b, c = tri
    n = ic._cross(ic._sub(b, a), ic._sub(c, a))
    centroid = tuple((a[i] + b[i] + c[i]) / 3 for i in range(3))
    return (a, b, c) if ic._dot(n, outward(centroid)) >= 0 else (a, c, b)


def _grid_face(rows, outward):
    """A face from a grid of nodes (``rows`` of equal length), as triangles."""
    tris = []
    for r in range(len(rows) - 1):
        for k in range(len(rows[r]) - 1):
            p, q = rows[r][k], rows[r][k + 1]
            s, t = rows[r + 1][k], rows[r + 1][k + 1]
            tris.append(_orient((p, q, s), outward))
            tris.append(_orient((q, t, s), outward))
    return tris


def make_mesh(faces, sha="0" * 64):
    """``faces`` is a list of triangle lists; each face gets its own nodes."""
    positions = array.array("f")
    indices = array.array("I")
    face_ids = array.array("I")
    manifest_faces = []
    for face_id, tris in enumerate(faces):
        nodes = []
        index = {}
        for tri in tris:
            for v in tri:
                if v not in index:
                    index[v] = len(nodes)
                    nodes.append(v)
        base = len(positions) // 3
        for v in nodes:
            positions.extend(v)
        for tri in tris:
            indices.extend(base + index[v] for v in tri)
            face_ids.append(face_id)
        area = sum(ic._norm(ic._cross(ic._sub(b, a), ic._sub(c, a))) / 2 for a, b, c in tris)
        manifest_faces.append({"face_id": face_id, "solid_id": 0,
                               "n_triangles": len(tris), "n_vertices": len(nodes),
                               "area_native2": area})
    return fg.Mesh(sha256=sha, directory=Path("."), manifest={"faces": manifest_faces},
                   positions=positions, indices=indices, face_ids=face_ids)


def box_faces(x0, x1, y0, y1, z0, z1, steps=2):
    """The six faces of a box, normals out, each a ``steps`` x ``steps`` grid."""
    centre = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)

    def span(a, b):
        return [a + (b - a) * i / steps for i in range(steps + 1)]

    def outward(n):
        return lambda _c: n

    faces = []
    for z, n in ((z0, (0, 0, -1)), (z1, (0, 0, 1))):
        faces.append(_grid_face([[(x, y, z) for x in span(x0, x1)] for y in span(y0, y1)], outward(n)))
    for y, n in ((y0, (0, -1, 0)), (y1, (0, 1, 0))):
        faces.append(_grid_face([[(x, y, z) for x in span(x0, x1)] for z in span(z0, z1)], outward(n)))
    for x, n in ((x0, (-1, 0, 0)), (x1, (1, 0, 0))):
        faces.append(_grid_face([[(x, y, z) for y in span(y0, y1)] for z in span(z0, z1)], outward(n)))
    assert centre  # the box's own centre is never needed: each face says its side
    return faces


def cylinder_face(radius, z0, z1, convex, centre=(0.0, 0.0), segments=24, rows=4):
    """A full cylinder about +Z: a pin's wall (``convex``) or a bore's."""
    grid = []
    for r in range(rows):
        z = z0 + (z1 - z0) * r / (rows - 1)
        grid.append([(centre[0] + radius * math.cos(2 * math.pi * k / segments),
                      centre[1] + radius * math.sin(2 * math.pi * k / segments), z)
                     for k in range(segments + 1)])
    sign = 1.0 if convex else -1.0
    return _grid_face(grid, lambda c: (sign * (c[0] - centre[0]), sign * (c[1] - centre[1]), 0.0))


def sphere_face(radius, convex, lat=60.0, rows=7, segments=16):
    """A spherical band about the origin from -``lat`` to +``lat``: a ball
    (``convex``) or the race it turns in."""
    grid = []
    for r in range(rows):
        phi = math.radians(-lat + 2 * lat * r / (rows - 1))
        grid.append([(radius * math.cos(phi) * math.cos(2 * math.pi * k / segments),
                      radius * math.cos(phi) * math.sin(2 * math.pi * k / segments),
                      radius * math.sin(phi))
                     for k in range(segments + 1)])
    sign = 1.0 if convex else -1.0
    return _grid_face(grid, lambda c: tuple(sign * x for x in c))


def occ(key, placement=IDENTITY):
    return {"key": key, "placement": placement}


def candidates(kind, mesh_a, mesh_b, occ_a=None, occ_b=None, **tol):
    return ic.edge_candidates(kind, ic.part_faces(mesh_a), ic.part_faces(mesh_b),
                              occ_a or [occ("a")], occ_b or [occ("b")], tol or None)


# ---------------------------------------------------------------------------
# the vocabulary
# ---------------------------------------------------------------------------

def test_every_interface_word_has_a_pairing_rule():
    """A new interface word with no rule would answer `no_contact` for every
    edge that uses it -- silently, and wrongly."""
    assert set(ic.CONTACT_PAIRINGS) == set(INTERFACE_KINDS)
    assert set(ic.CONTACT_PAIRINGS.values()) == set(ic.PAIRING_KINDS)


# ---------------------------------------------------------------------------
# plane on plane
# ---------------------------------------------------------------------------

def test_two_plates_in_contact_pair_the_faces_that_touch_with_their_overlap():
    lower = make_mesh(box_faces(0, 10, 0, 10, 0, 2), sha="a" * 64)
    upper = make_mesh(box_faces(2, 8, 2, 8, 2, 4), sha="b" * 64)
    found = candidates("plane_on_plane", lower, upper)
    assert found["status"] == "ok"
    top = found["candidates"][0]
    assert (top["a_faces"], top["b_faces"]) == ([1], [0])     # lower's top, upper's bottom
    assert top["relation"] == "contact"
    assert top["evidence"]["gap_mm"] == pytest.approx(0.0, abs=1e-6)
    assert top["evidence"]["angle_deg"] == pytest.approx(0.0, abs=1e-3)
    # The upper plate's whole 6 x 6 footprint sits on the lower one.
    assert top["evidence"]["overlap_mm2"] == pytest.approx(36.0, rel=0.02)
    assert top["evidence"]["overlap_fraction"] == pytest.approx(1.0, rel=0.02)
    assert top["box"] == {"min": pytest.approx([0, 0, 2], abs=1e-6),
                          "max": pytest.approx([10, 10, 2], abs=1e-6)}
    # Faces facing the SAME way are never a contact, however coplanar: the
    # side walls of the two boxes do not pair with each other.
    assert all(c["evidence"]["angle_deg"] <= ic.CONTACT_TOLERANCES["angle_deg"]
               for c in found["candidates"])
    assert len(found["candidates"]) == 1


def test_a_plate_two_mm_away_is_a_near_miss_and_says_so():
    lower = make_mesh(box_faces(0, 10, 0, 10, 0, 2), sha="a" * 64)
    hovering = make_mesh(box_faces(2, 8, 2, 8, 4, 6), sha="b" * 64)
    found = candidates("plane_on_plane", lower, hovering)
    assert found["status"] == "no_contact"
    assert found["pairs_in_reach"] == 0
    assert found["nearest_gap_mm"] == pytest.approx(2.0, abs=1e-6)
    # With the reach opened far enough to compare the faces at all, the gap is
    # what refuses them -- 2 mm is forty times the plane margin.
    wide = candidates("plane_on_plane", lower, hovering, reach_mm=5.0)
    assert wide["status"] == "no_contact" and wide["pairs_in_reach"] == 1
    loose = candidates("plane_on_plane", lower, hovering, reach_mm=5.0, plane_gap_mm=3.0)
    assert loose["candidates"][0]["evidence"]["gap_mm"] == pytest.approx(2.0, abs=1e-6)


def test_a_footprint_that_misses_the_other_face_is_not_a_contact():
    """Coplanar and facing, but side by side: no overlap, no candidate."""
    left = make_mesh(box_faces(0, 4, 0, 4, 0, 2), sha="a" * 64)
    right = make_mesh(box_faces(4.5, 8, 0, 4, 2, 4), sha="b" * 64)
    found = candidates("plane_on_plane", left, right)
    assert found["status"] == "no_contact"


# ---------------------------------------------------------------------------
# pin in bore
# ---------------------------------------------------------------------------

def test_a_pin_in_a_bore_with_point_zero_five_clearance_reads_that_clearance():
    pin = make_mesh([cylinder_face(5.0, 0, 10, convex=True)], sha="a" * 64)
    bore = make_mesh([cylinder_face(5.05, 0, 10, convex=False)], sha="b" * 64)
    found = candidates("cylinder_in_cylinder", pin, bore)
    assert found["status"] == "ok"
    (top,) = found["candidates"]
    assert top["relation"] == "contact"
    e = top["evidence"]
    assert e["bore"] == "b"
    # A polygon with its nodes on the circle fits the circle exactly.
    assert e["pin_radius_mm"] == pytest.approx(5.0, abs=1e-4)
    assert e["bore_radius_mm"] == pytest.approx(5.05, abs=1e-4)
    assert e["clearance_mm"] == pytest.approx(0.05, abs=1e-4)
    assert e["axis_offset_mm"] == pytest.approx(0.0, abs=1e-4)
    assert e["axial_overlap_mm"] == pytest.approx(10.0, abs=1e-4)


def test_the_pairing_is_read_in_the_assembly_frame_through_each_placement():
    """The bore is modelled at its own origin and placed upside down (180
    degrees about X) and moved; the pin is moved to meet it. Neither part's
    own coordinates say they touch -- only the placements do."""
    pin = make_mesh([cylinder_face(5.0, 0, 10, convex=True)], sha="a" * 64)
    bore = make_mesh([cylinder_face(5.05, 0, 10, convex=False)], sha="b" * 64)
    flipped = [1.0, 0.0, 0.0, 50.0,
               0.0, -1.0, 0.0, 20.0,
               0.0, 0.0, -1.0, 10.0]
    found = candidates("cylinder_in_cylinder", pin, bore,
                       [occ("pin", translate(50, 20, 0))],
                       [occ("far", translate(500, 0, 0)), occ("bore", flipped)])
    assert found["status"] == "ok"
    assert found["occurrences"] == {"a": "pin", "b": "bore"}
    assert found["pairs_in_reach"] == 1      # the far occurrence is never compared
    e = found["candidates"][0]["evidence"]
    assert e["clearance_mm"] == pytest.approx(0.05, abs=1e-4)
    assert e["axial_overlap_mm"] == pytest.approx(10.0, abs=1e-4)
    box = found["candidates"][0]["box"]
    assert box["min"][2] == pytest.approx(0.0, abs=1e-4)
    assert box["max"][2] == pytest.approx(10.0, abs=1e-4)
    assert (box["min"][0] + box["max"][0]) / 2 == pytest.approx(50.0, abs=1e-3)


def test_two_pins_or_two_bores_are_coaxial_never_a_contact():
    """A coaxiality edge between two bores has no contact to offer, and gets
    the coaxial pair as its fallback, saying so."""
    one = make_mesh([cylinder_face(5.0, 0, 10, convex=False)], sha="a" * 64)
    two = make_mesh([cylinder_face(8.0, 10.5, 20, convex=False)], sha="b" * 64)
    found = candidates("cylinder_in_cylinder", one, two)
    (top,) = found["candidates"]
    assert top["relation"] == "coaxial"
    assert top["evidence"]["axis_offset_mm"] == pytest.approx(0.0, abs=1e-4)
    assert (top["evidence"]["a_radius_mm"], top["evidence"]["b_radius_mm"]) == \
        (pytest.approx(5.0, abs=1e-4), pytest.approx(8.0, abs=1e-4))


def test_a_pin_much_smaller_than_its_hole_is_not_a_contact():
    pin = make_mesh([cylinder_face(2.0, 0, 10, convex=True)], sha="a" * 64)
    bore = make_mesh([cylinder_face(5.0, 0, 10, convex=False)], sha="b" * 64)
    found = candidates("cylinder_in_cylinder", pin, bore)
    assert [c["relation"] for c in found["candidates"]] == ["coaxial"]


def test_a_link_with_a_bearing_at_each_end_is_ambiguous_and_names_the_other_end():
    """One link occurrence, two bearing occurrences: both ends touch, at
    different faces of the link. Geometry cannot say which end an edge means."""
    link = make_mesh([cylinder_face(5.05, 0, 10, convex=False, centre=(0, 0)),
                      cylinder_face(5.05, 0, 10, convex=False, centre=(100, 0))], sha="a" * 64)
    bearing = make_mesh([cylinder_face(5.0, 0, 10, convex=True)], sha="b" * 64)
    found = candidates("cylinder_in_cylinder", link, bearing,
                       [occ("link")], [occ("lower"), occ("upper", translate(100, 0, 0))])
    assert found["status"] == "ok"
    assert found["occurrences"] == {"a": "link", "b": "lower"}
    assert found["candidates"][0]["a_faces"] == [0]
    assert [(a["b"], a["a_faces"]) for a in found["ambiguous_with"]] == [("upper", [1])]


def test_the_same_joint_on_every_blade_is_not_ambiguous():
    """Five copies of one joint, each pair of occurrences touching at the same
    faces: that is a rotor, not a question."""
    link = make_mesh([cylinder_face(5.05, 0, 10, convex=False)], sha="a" * 64)
    bearing = make_mesh([cylinder_face(5.0, 0, 10, convex=True)], sha="b" * 64)
    blades = [translate(200 * k, 0, 0) for k in range(5)]
    found = candidates("cylinder_in_cylinder", link, bearing,
                       [occ(f"link{k}", p) for k, p in enumerate(blades)],
                       [occ(f"bearing{k}", p) for k, p in enumerate(blades)])
    assert found["pairs_in_reach"] == 5
    assert found["occurrences"] == {"a": "link0", "b": "bearing0"}
    assert found["ambiguous_with"] == []


def test_the_halves_of_a_split_bore_are_one_feature():
    """A STEP exporter splits a full cylinder into halves; a candidate names
    every face of the feature, once."""
    def half(radius, start, convex):
        grid = [[(radius * math.cos(math.pi * (start + k / 12)),
                  radius * math.sin(math.pi * (start + k / 12)), z) for k in range(13)]
                for z in (0.0, 5.0, 10.0)]
        sign = 1.0 if convex else -1.0
        return _grid_face(grid, lambda c: (sign * c[0], sign * c[1], 0.0))
    pin = make_mesh([half(5.0, 0, True), half(5.0, 1, True)], sha="a" * 64)
    bore = make_mesh([half(5.05, 0, False), half(5.05, 1, False)], sha="b" * 64)
    (top,) = candidates("cylinder_in_cylinder", pin, bore)["candidates"]
    assert (top["a_faces"], top["b_faces"]) == ([0, 1], [0, 1])


# ---------------------------------------------------------------------------
# ball in its seat
# ---------------------------------------------------------------------------

def test_a_ball_in_its_socket_shares_the_socket_centre():
    ball = make_mesh([sphere_face(6.0, convex=True)], sha="a" * 64)
    socket = make_mesh([sphere_face(6.0, convex=False, lat=30.0, rows=5)], sha="b" * 64)
    found = candidates("ball_in_seat", ball, socket, [occ("ball", translate(3, 4, 5))],
                       [occ("socket", translate(3, 4, 5))])
    assert found["status"] == "ok"
    top = found["candidates"][0]
    assert top["a_surface"] == "spherical" and top["b_surface"] == "spherical"
    e = top["evidence"]
    assert (e["ball"], e["seat"]) == ("a", "spherical")
    assert e["centre_mm"] == pytest.approx(0.0, abs=1e-4)
    assert e["ball_radius_mm"] == pytest.approx(6.0, abs=1e-4)
    assert e["seat_radius_mm"] == pytest.approx(6.0, abs=1e-4)


def test_a_ball_pinned_through_a_bore_ranks_the_lug_beside_it_first():
    """No race on the other part, only the bores a bolt runs through: the
    ball's centre is on their axis, and the nearer lug ranks first."""
    ball = make_mesh([sphere_face(6.0, convex=True)], sha="a" * 64)
    lugs = make_mesh([cylinder_face(2.4, 6.5, 9.0, convex=False),
                      cylinder_face(2.4, 12.0, 14.0, convex=False)], sha="b" * 64)
    found = candidates("ball_in_seat", ball, lugs, reach_mm=10.0)
    seats = [(c["b_faces"], c["evidence"]["seat"]) for c in found["candidates"]]
    assert seats[0] == ([0, 1], "cylindrical") or seats[0] == ([0], "cylindrical")
    first = found["candidates"][0]["evidence"]
    assert first["centre_mm"] == pytest.approx(0.0, abs=1e-4)


def test_a_ball_off_its_seat_by_more_than_the_margin_is_not_seated():
    ball = make_mesh([sphere_face(6.0, convex=True)], sha="a" * 64)
    socket = make_mesh([sphere_face(6.0, convex=False, lat=30.0, rows=5)], sha="b" * 64)
    found = candidates("ball_in_seat", ball, socket, [occ("ball")],
                       [occ("socket", translate(0.3, 0, 0))])
    assert found["status"] == "no_contact"


def test_a_part_with_no_face_of_the_asked_kind_is_no_fit():
    plate = make_mesh(box_faces(0, 10, 0, 10, 0, 2), sha="a" * 64)
    ball = make_mesh([sphere_face(6.0, convex=True)], sha="b" * 64)
    found = candidates("cylinder_in_cylinder", plate, ball,
                       [occ("plate")], [occ("ball", translate(5, 5, 8))])
    assert found["status"] == "no_fit"

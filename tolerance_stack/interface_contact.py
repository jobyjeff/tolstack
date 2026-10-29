"""Which faces of two parts touch, in the assembly frame -- the candidates a gap
edge's interface suggests.

A topology gap edge names two parts (its end nodes' ``parts[0]``) and an
``interface`` word (``tolerance_stack.topology.INTERFACE_KINDS``). That is
enough to narrow a few thousand faces to a handful: a ``planar`` interface is
two flat faces facing each other, touching, with footprints that overlap; a pin
in a bore is two coaxial cylinders, one convex and one concave, the bore no
smaller than the pin; a spherical joint is a ball whose centre sits on its
seat's. Jeff, 2026-10-28: *"If you know there's an interface between two parts,
it's very easy to narrow down by filtering planar surfaces on each body that
are coplanar, or even better contacting each other (within some narrow
margin). Same for cylindrical surfaces (coaxial)."*

This module is that narrowing, as geometry and nothing else: it takes two
parts' meshes and one placement each, and returns ranked face pairs with their
evidence. ``scripts/build_contact_suggestions.py`` resolves a topology's edges
to meshes and occurrences and writes the projection the annotator colours from.

**A candidate is a suggestion, never a binding and never a value.** It names
two ``(sha256, face id)`` pairs and the evidence that put them together (a gap,
an angle, an overlap, two radii). Nothing here selects a face, writes an event
or produces a tolerance; the pick stays a human's (or a proposing agent's,
ratified by one) -- ``docs/ANNOTATION_SURFACE.md``, "Contact suggestions".

Every length here is in the mesh's own unit, which the builder only accepts
when the mesh declares it is millimetres (``fit_bound_features.mesh_units``),
because every margin below is a millimetre figure measured on this assembly.

Stdlib only.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from tolerance_stack import feature_geometry as fg

Vec = Tuple[float, float, float]

#: How a gap edge's ``interface`` word pairs faces. **This mapping is the
#: definition**; its keys are paired against
#: ``tolerance_stack.topology.INTERFACE_KINDS`` by ``tests/test_interface_contact.py``,
#: so a new interface word without a pairing rule is a red test, not a silent
#: ``no_contact``.
#:
#: ``thread`` and ``clearance`` pair cylinders because that is what they are on
#: a fastener: a thread is tessellated as its major-diameter cylinder, and every
#: ``clearance`` edge in the linkage is a shank through a washer or a bushing.
CONTACT_PAIRINGS: Dict[str, str] = {
    "planar": "plane_on_plane",
    "pin_in_bore": "cylinder_in_cylinder",
    "cylindrical_slide": "cylinder_in_cylinder",
    "thread": "cylinder_in_cylinder",
    "clearance": "cylinder_in_cylinder",
    "spherical": "ball_in_seat",
}

#: The pairing families :data:`CONTACT_PAIRINGS` maps onto, in the order the
#: evidence fields are documented.
PAIRING_KINDS = ("plane_on_plane", "cylinder_in_cylinder", "ball_in_seat")

#: What a ball can sit in. A ball's centre is the joint; its seat is another
#: sphere (a race), a bore it is centred on, or a flat it rests against.
SEAT_SURFACES = ("spherical", "cylindrical", "planar")

#: Why an edge has no candidate. **This tuple is the definition.**
#:
#: ``no_mesh``        an end part resolves to no installed mesh.
#: ``no_occurrence``  a mesh records no place in the assembly, so it cannot be
#:                    compared with anything.
#: ``no_units``       a mesh does not declare millimetres, and every margin here
#:                    is a millimetre figure.
#: ``no_fit``         the two parts are near each other but no face of the kind
#:                    the interface asks for fits on one of them.
#: ``no_contact``     faces of the right kinds exist, near each other, and no
#:                    pair passes the margins.
EMPTY_REASONS = ("no_mesh", "no_occurrence", "no_units", "no_fit", "no_contact")

#: Every margin, in one block, so a run prints them beside what they decided.
#: Lengths are millimetres, angles degrees. The populations each was chosen
#: against are measured over every gap edge of
#: ``docs/topologies/topology_vpa_pitch_linkage.json`` and recorded in
#: ``docs/sessions/lessons/LESSONS_20261028_an_interface_suggests_the_faces_that_touch.md``.
CONTACT_TOLERANCES: Dict[str, float] = {
    # Two faces are only compared when their bounding spheres come this close,
    # and two occurrences only when their boxes do. A REACH, not a margin: it
    # decides what is looked at, never what passes. Widening it to 150 mm on
    # the one coaxiality edge that finds nothing (hub to pitch plate) took five
    # minutes and found one pair 2.6 mm off-axis -- so the edge says
    # `no_contact` and the reach stays where contact is.
    "reach_mm": 1.0,
    # Antiparallel planes / parallel axes. Measured contacts: cylinders at
    # 0.000-0.015 deg except the tangential link's MS14101-3, whose separately
    # extracted bearing sits 1.01 deg off its own bore; planes (clevis lug on a
    # ball's flat) at 1.07-1.76 deg, because the balls are modelled
    # articulated. Angle alone separates nothing among the planes -- near
    # misses run 1.64-4.8 deg -- so the GAP is the plane test, and this is set
    # to take the articulated flats.
    "angle_deg": 2.0,
    # Plane to plane, along the normal. Measured: contacts -0.001 to 0.017 mm;
    # the nearest non-contact 1.48 mm. Clean.
    "plane_gap_mm": 0.05,
    # The smaller footprint's share that has to lie over the other face.
    # Measured: contacts 0.56-0.99; the near misses that pass the gap are 0.0.
    "overlap_fraction": 0.05,
    # Axis to axis, perpendicular distance. Measured: contacts 0.000-0.001 mm,
    # and 0.026-0.075 mm for the tilted bearing above; nothing else within 3 mm
    # (the next coaxial-looking pair found anywhere is 2.6 mm off). Clean.
    "axis_offset_mm": 0.1,
    # Bore radius minus pin radius: how loose, and how tight (a press fit).
    # Measured contacts 0.0005-0.17 mm (the largest is a washer bore on a bolt
    # shank); the coaxial non-contacts are -4.7 mm and below (a race on a
    # bolt's hole). Clean on both sides.
    "max_clearance_mm": 0.5,
    "max_interference_mm": 0.05,
    # Shared length along the axis, as a fraction of the shorter face's.
    # Measured: contacts share 0.8-8.3 mm; the coaxial faces that do not touch
    # share less than nothing (-0.05 and -0.49 mm, a shank beside a washer).
    "axial_overlap_fraction": 0.05,
    # Ball centre to seat centre / seat axis. Measured: 0.000 mm for three of
    # the four ball joints and 0.050-0.053 mm at the tangential link mount (the
    # tilted bearing again); next 0.128 mm, which is the same tilt read on a
    # bigger, farther bore. THIN, and it is thin for a known reason, not noise.
    "centre_mm": 0.1,
    # Ball resting on a flat: |distance - radius|. Measured -0.0007 and
    # -0.019 mm; next 0.23 mm.
    "seat_gap_mm": 0.05,
}

#: How many candidates an edge carries. The annotator shows three; the rest are
#: the proposal handoff's to argue with.
MAX_CANDIDATES = 10


# ---------------------------------------------------------------------------
# vectors
# ---------------------------------------------------------------------------

def _sub(a, b) -> Vec:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _add(a, b) -> Vec:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _scale(a, k) -> Vec:
    return (a[0] * k, a[1] * k, a[2] * k)


def _dot(a, b) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a, b) -> Vec:
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def _norm(a) -> float:
    return math.sqrt(_dot(a, a))


def _angle_deg(a, b) -> float:
    c = _dot(a, b) / ((_norm(a) * _norm(b)) or 1.0)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def _line_distance(point, axis_point, axis) -> float:
    """Perpendicular distance from ``point`` to a line (``axis`` unit)."""
    rel = _sub(point, axis_point)
    along = _dot(rel, axis)
    return _norm(_sub(rel, _scale(axis, along)))


# ---------------------------------------------------------------------------
# a part's faces, fitted once in its own frame
# ---------------------------------------------------------------------------

@dataclass
class LocalFace:
    """One face of one mesh, fitted in the part's own frame.

    ``convex`` is the side the material is on, read off the facet normals
    (which point out of the material): ``True`` for a pin or a ball, ``False``
    for a bore or a race, ``None`` for a plane or when the facets disagree.
    """

    face_id: int
    surface: str
    area: float
    centre: Vec            # vertex centroid
    extent: float          # farthest vertex from it
    geometry: Dict[str, Any] = field(default_factory=dict)
    convex: Optional[bool] = None
    vertices: List[Vec] = field(default_factory=list)
    triangles: List[Tuple[Vec, Vec, Vec]] = field(default_factory=list)


@dataclass
class PartFaces:
    """A mesh's faces, as far as they have been read.

    Fitting a whole part costs up to a minute in pure Python (the hub), and a
    contact only ever involves the faces near the other part, so faces are
    *bounded* for all and *fitted* on demand, once each.
    """

    mesh: fg.Mesh
    bounds: Dict[int, Tuple[Vec, float]]            # face id -> (centre, radius)
    box: Tuple[Vec, Vec]                            # local AABB of the whole part
    fitted: Dict[int, Optional[LocalFace]] = field(default_factory=dict)

    @property
    def sha256(self) -> str:
        return self.mesh.sha256


def part_faces(mesh: fg.Mesh) -> PartFaces:
    """Bound every face of a mesh -- one pass over its vertices, no fitting."""
    positions = mesh.positions
    bounds: Dict[int, Tuple[Vec, float]] = {}
    lo = [math.inf] * 3
    hi = [-math.inf] * 3
    for face_id, (start, count) in mesh.vertex_ranges.items():
        if count <= 0:
            continue
        xs = positions[start * 3:(start + count) * 3:3]
        ys = positions[start * 3 + 1:(start + count) * 3:3]
        zs = positions[start * 3 + 2:(start + count) * 3:3]
        fx = (min(xs), max(xs))
        fy = (min(ys), max(ys))
        fz = (min(zs), max(zs))
        centre = ((fx[0] + fx[1]) / 2, (fy[0] + fy[1]) / 2, (fz[0] + fz[1]) / 2)
        radius = _norm((fx[1] - centre[0], fy[1] - centre[1], fz[1] - centre[2]))
        bounds[face_id] = (centre, radius)
        for axis, (a, b) in enumerate((fx, fy, fz)):
            lo[axis] = min(lo[axis], a)
            hi[axis] = max(hi[axis], b)
    return PartFaces(mesh=mesh, bounds=bounds, box=(tuple(lo), tuple(hi)))


def _facets_for(mesh: fg.Mesh, wanted: Iterable[int]) -> Dict[int, List[Tuple[Vec, Vec, Vec]]]:
    """The triangles of the wanted faces only, in one pass over the face ids."""
    want = set(int(w) for w in wanted)
    out: Dict[int, List[Tuple[Vec, Vec, Vec]]] = {w: [] for w in want}
    positions, indices, face_ids = mesh.positions, mesh.indices, mesh.face_ids
    for t in range(len(face_ids)):
        fid = face_ids[t]
        if fid not in want:
            continue
        tri = []
        for k in range(3):
            i = indices[t * 3 + k] * 3
            tri.append((positions[i], positions[i + 1], positions[i + 2]))
        out[fid].append(tuple(tri))
    return out


def _convexity(surface: str, geometry: Dict[str, Any],
               triangles: Sequence[Tuple[Vec, Vec, Vec]]) -> Optional[bool]:
    """Which side of a round face the material is on, by area-weighted vote.

    A facet normal points out of the material, so on a pin it points away from
    the axis and in a bore towards it. ``None`` when the vote is not at least
    nine to one -- a face that does not say which side it is on is not paired
    as either.
    """
    if surface not in ("cylindrical", "spherical"):
        return None
    out_vote = in_vote = 0.0
    for a, b, c in triangles:
        n = _cross(_sub(b, a), _sub(c, a))
        area2 = _norm(n)
        if not area2 > 0:
            continue
        centroid = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3,
                    (a[2] + b[2] + c[2]) / 3)
        if surface == "spherical":
            radial = _sub(centroid, geometry["centre"])
        else:
            axis = geometry["axis"]
            rel = _sub(centroid, geometry["axis_point"])
            radial = _sub(rel, _scale(axis, _dot(rel, axis)))
        if _dot(n, radial) > 0:
            out_vote += area2
        else:
            in_vote += area2
    total = out_vote + in_vote
    if not total > 0:
        return None
    if out_vote >= 0.9 * total:
        return True
    if in_vote >= 0.9 * total:
        return False
    return None


def fit_faces(part: PartFaces, face_ids: Iterable[int]) -> None:
    """Fit the named faces of a part that are not fitted yet."""
    todo = [f for f in face_ids if f not in part.fitted]
    if not todo:
        return
    triangles = _facets_for(part.mesh, todo)
    for face_id in todo:
        fit = fg.fit_face(part.mesh, face_id)
        if fit.surface == "other":
            part.fitted[face_id] = None
            continue
        centre, extent = part.bounds[face_id]
        tris = triangles.get(face_id, [])
        part.fitted[face_id] = LocalFace(
            face_id=face_id, surface=fit.surface, area=fit.area,
            centre=centre, extent=extent, geometry=dict(fit.geometry),
            convex=_convexity(fit.surface, fit.geometry, tris),
            vertices=fg.face_vertices(part.mesh, face_id),
            triangles=list(tris))


# ---------------------------------------------------------------------------
# placed
# ---------------------------------------------------------------------------

@dataclass
class PlacedFace:
    """A :class:`LocalFace` moved into the assembly frame by one placement."""

    local: LocalFace
    centre: Vec
    geometry: Dict[str, Any]
    _placement: Sequence[float]
    _vertices: Optional[List[Vec]] = None
    _triangles: Optional[List[Tuple[Vec, Vec, Vec]]] = None

    @property
    def face_id(self) -> int:
        return self.local.face_id

    @property
    def surface(self) -> str:
        return self.local.surface

    @property
    def vertices(self) -> List[Vec]:
        if self._vertices is None:
            self._vertices = [fg.apply_placement(self._placement, v)
                              for v in self.local.vertices]
        return self._vertices

    @property
    def triangles(self) -> List[Tuple[Vec, Vec, Vec]]:
        if self._triangles is None:
            p = self._placement
            self._triangles = [tuple(fg.apply_placement(p, v) for v in tri)
                               for tri in self.local.triangles]
        return self._triangles


_POINTS = ("centre", "point", "axis_point")
_DIRECTIONS = ("axis", "normal")


def place(face: LocalFace, placement: Sequence[float]) -> PlacedFace:
    geometry: Dict[str, Any] = {}
    for key, value in face.geometry.items():
        if key in _POINTS:
            geometry[key] = fg.apply_placement(placement, value)
        elif key in _DIRECTIONS:
            geometry[key] = fg.rotate_direction(placement, value)
        elif key != "offset":
            geometry[key] = value
    return PlacedFace(local=face, centre=fg.apply_placement(placement, face.centre),
                      geometry=geometry, _placement=placement)


def placed_box(box: Tuple[Vec, Vec], placement: Sequence[float]) -> Tuple[Vec, Vec]:
    """The assembly-frame AABB of a local AABB's eight corners."""
    (x0, y0, z0), (x1, y1, z1) = box
    corners = [fg.apply_placement(placement, (x, y, z))
               for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    return (tuple(min(c[i] for c in corners) for i in range(3)),
            tuple(max(c[i] for c in corners) for i in range(3)))


def box_gap(a: Tuple[Vec, Vec], b: Tuple[Vec, Vec]) -> float:
    """Distance between two AABBs; 0 when they overlap."""
    d = [max(0.0, a[0][i] - b[1][i], b[0][i] - a[1][i]) for i in range(3)]
    return _norm(d)


def faces_within(part: PartFaces, placement: Sequence[float],
                 other_box: Tuple[Vec, Vec], reach: float) -> List[int]:
    """Face ids of ``part`` (placed) whose bounding sphere reaches ``other_box``."""
    lo, hi = other_box
    out = []
    for face_id, (centre, radius) in part.bounds.items():
        c = fg.apply_placement(placement, centre)
        d = [max(0.0, lo[i] - c[i], c[i] - hi[i]) for i in range(3)]
        if _norm(d) <= radius + reach:
            out.append(face_id)
    return out


# ---------------------------------------------------------------------------
# evidence, one pairing family at a time
# ---------------------------------------------------------------------------

def _plane_basis(normal: Vec) -> Tuple[Vec, Vec]:
    seed = (1.0, 0.0, 0.0) if abs(normal[0]) < 0.9 else (0.0, 1.0, 0.0)
    u = _cross(normal, seed)
    u = _scale(u, 1.0 / _norm(u))
    return u, _cross(normal, u)


def _point_in_triangle(p, a, b, c) -> bool:
    d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1])
    d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1])
    d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1])
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)


#: Barycentric samples per triangle for the footprint overlap: a triangle is
#: split into this many rows of sub-triangles and each one's centroid is a
#: sample carrying its share of the area.
_OVERLAP_ROWS = 4


def footprint_overlap(small: PlacedFace, large: PlacedFace, normal: Vec) -> float:
    """Area of ``small``'s footprint that lies over ``large``'s, both projected
    onto the plane perpendicular to ``normal``.

    Estimated by sampling ``small``'s triangles (``_OVERLAP_ROWS``^2 samples
    each, area-weighted) and testing each sample against ``large``'s projected
    triangles through a coarse grid. Exact in the limit, and within a few
    percent at this sampling on the faces measured -- an overlap is evidence for
    a rank, not a value anything stores.
    """
    u, v = _plane_basis(normal)

    def proj(p):
        return (_dot(p, u), _dot(p, v))

    targets = [tuple(proj(p) for p in tri) for tri in large.triangles]
    if not targets:
        return 0.0
    xs = [p[0] for t in targets for p in t]
    ys = [p[1] for t in targets for p in t]
    x0, y0 = min(xs), min(ys)
    span = max(max(xs) - x0, max(ys) - y0) or 1.0
    cells = max(1, int(math.sqrt(len(targets))))
    size = span / cells
    grid: Dict[Tuple[int, int], List[int]] = {}
    for idx, (a, b, c) in enumerate(targets):
        i0 = int((min(a[0], b[0], c[0]) - x0) / size)
        i1 = int((max(a[0], b[0], c[0]) - x0) / size)
        j0 = int((min(a[1], b[1], c[1]) - y0) / size)
        j1 = int((max(a[1], b[1], c[1]) - y0) / size)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                grid.setdefault((i, j), []).append(idx)

    covered = 0.0
    n = _OVERLAP_ROWS
    for tri in small.triangles:
        a, b, c = (proj(p) for p in tri)
        area = abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
        if not area > 0:
            continue
        share = area / (n * n)
        for i in range(n):
            for j in range(n - i):
                for upright in (True, False):
                    if not upright and j == n - i - 1:
                        continue
                    if upright:
                        w = ((i + 1 / 3) / n, (j + 1 / 3) / n)
                    else:
                        w = ((i + 2 / 3) / n, (j + 2 / 3) / n)
                    s = (a[0] + w[0] * (b[0] - a[0]) + w[1] * (c[0] - a[0]),
                         a[1] + w[0] * (b[1] - a[1]) + w[1] * (c[1] - a[1]))
                    key = (int((s[0] - x0) / size), int((s[1] - y0) / size))
                    for idx in grid.get(key, ()):
                        if _point_in_triangle(s, *targets[idx]):
                            covered += share
                            break
    return covered


def _interval(points: Sequence[Vec], origin: Vec, axis: Vec) -> Tuple[float, float]:
    values = [_dot(_sub(p, origin), axis) for p in points]
    return min(values), max(values)


def plane_on_plane(a: PlacedFace, b: PlacedFace, tol: Dict[str, float]
                   ) -> Optional[Dict[str, Any]]:
    """Two flat faces facing each other and touching, or ``None``."""
    na, nb = a.geometry["normal"], b.geometry["normal"]
    angle = _angle_deg(na, _scale(nb, -1.0))
    if angle > tol["angle_deg"]:
        return None
    gap = _dot(_sub(b.geometry["point"], a.geometry["point"]), na)
    if abs(gap) > tol["plane_gap_mm"]:
        return None
    small, large = (a, b) if a.local.area <= b.local.area else (b, a)
    overlap = footprint_overlap(small, large, na)
    smaller = min(a.local.area, b.local.area) or 1.0
    if overlap < tol["overlap_fraction"] * smaller:
        return None
    return {"relation": "contact", "gap_mm": gap, "angle_deg": angle,
            "overlap_mm2": overlap, "overlap_fraction": overlap / smaller}


def _axial_overlap(a: PlacedFace, b: PlacedFace, axis: Vec, origin: Vec) -> Tuple[float, float]:
    """``(shared length, shorter face's length)`` along ``axis``."""
    ia = _interval(a.vertices, origin, axis)
    ib = _interval(b.vertices, origin, axis)
    shared = min(ia[1], ib[1]) - max(ia[0], ib[0])
    return shared, min(ia[1] - ia[0], ib[1] - ib[0])


def cylinder_in_cylinder(a: PlacedFace, b: PlacedFace, tol: Dict[str, float]
                         ) -> Optional[Dict[str, Any]]:
    """Two coaxial cylinders, or ``None``.

    ``relation`` says which of two things they are. ``contact``: one convex and
    one concave, the bore no smaller than the pin past the interference margin
    and no looser than the clearance margin, sharing length along the axis -- a
    pin in its bore. ``coaxial``: on one axis and nothing more (two bores, two
    pins, or a pin and a bore that do not overlap) -- which is what a
    coaxiality edge between two bores is about, and is offered only when
    nothing on the edge touches (:func:`edge_candidates`).
    """
    ax_a, ax_b = a.geometry["axis"], b.geometry["axis"]
    angle = _angle_deg(ax_a, ax_b)
    angle = min(angle, 180.0 - angle)
    if angle > tol["angle_deg"]:
        return None
    offset = _line_distance(a.geometry["axis_point"], b.geometry["axis_point"], ax_b)
    if offset > tol["axis_offset_mm"]:
        return None
    shared, shorter = _axial_overlap(a, b, ax_b, b.geometry["axis_point"])
    evidence: Dict[str, Any] = {"angle_deg": angle, "axis_offset_mm": offset,
                                "axial_overlap_mm": shared}
    handed = (a.local.convex is not None and b.local.convex is not None
              and a.local.convex != b.local.convex)
    if handed:
        pin, bore = (a, b) if a.local.convex else (b, a)
        clearance = bore.geometry["radius"] - pin.geometry["radius"]
        evidence.update({"bore": "a" if bore is a else "b",
                         "pin_radius_mm": pin.geometry["radius"],
                         "bore_radius_mm": bore.geometry["radius"],
                         "clearance_mm": clearance})
        if (-tol["max_interference_mm"] <= clearance <= tol["max_clearance_mm"]
                and shared >= tol["axial_overlap_fraction"] * (shorter or 1.0)):
            evidence["relation"] = "contact"
            return evidence
    else:
        evidence.update({"a_radius_mm": a.geometry["radius"],
                         "b_radius_mm": b.geometry["radius"]})
    evidence["relation"] = "coaxial"
    return evidence


def ball_in_seat(a: PlacedFace, b: PlacedFace, tol: Dict[str, float]
                 ) -> Optional[Dict[str, Any]]:
    """A ball and what it sits in, or ``None``.

    The ball is a convex sphere. Its seat is a concave sphere sharing its centre
    (a race), a cylinder whose axis passes through the centre (a lug bore the
    ball is pinned in), or a flat it rests on at its own radius.
    """
    for ball, seat in ((a, b), (b, a)):
        if ball.surface != "spherical" or ball.local.convex is not True:
            continue
        centre, radius = ball.geometry["centre"], ball.geometry["radius"]
        side = "a" if ball is a else "b"
        if seat.surface == "spherical" and seat.local.convex is False:
            d = _norm(_sub(seat.geometry["centre"], centre))
            if d <= tol["centre_mm"]:
                return {"relation": "contact", "ball": side, "seat": "spherical",
                        "centre_mm": d, "ball_radius_mm": radius,
                        "seat_radius_mm": seat.geometry["radius"]}
        elif seat.surface == "cylindrical":
            axis, origin = seat.geometry["axis"], seat.geometry["axis_point"]
            d = _line_distance(centre, origin, axis)
            if d <= tol["centre_mm"]:
                lo, hi = _interval(seat.vertices, origin, axis)
                at = _dot(_sub(centre, origin), axis)
                return {"relation": "contact", "ball": side, "seat": "cylindrical",
                        "centre_mm": d, "ball_radius_mm": radius,
                        "seat_radius_mm": seat.geometry["radius"],
                        # How far along the bore's axis the centre is from the
                        # bore itself: a clevis lug right beside the ball is
                        # nearer than a counterbore on the far side.
                        "along_axis_mm": max(0.0, lo - at, at - hi)}
        elif seat.surface == "planar":
            d = abs(_dot(_sub(centre, seat.geometry["point"]), seat.geometry["normal"]))
            if abs(d - radius) <= tol["seat_gap_mm"]:
                return {"relation": "contact", "ball": side, "seat": "planar",
                        "seat_gap_mm": d - radius, "ball_radius_mm": radius}
    return None


_PAIRERS = {
    "plane_on_plane": (("planar",), plane_on_plane),
    "cylinder_in_cylinder": (("cylindrical",), cylinder_in_cylinder),
    "ball_in_seat": (("spherical",) + SEAT_SURFACES, ball_in_seat),
}

#: What a pair can be. ``contact`` is what an interface is; ``coaxial`` is the
#: fallback a cylinder pairing offers when nothing on the edge touches.
RELATIONS = ("contact", "coaxial")

#: The ball-in-seat ranking: a shared centre is the joint, a bore through it is
#: next, a flat it rests on last.
_SEAT_ORDER = {"spherical": 0.0, "cylindrical": 1.0, "planar": 2.0}


def rank_score(kind: str, evidence: Dict[str, Any], tol: Dict[str, float]) -> float:
    """Smaller is better.

    Each term is the share of one margin a pair uses up, so a perfect pair
    scores zero and one exactly on every margin scores the number of terms; a
    shared length or area subtracts, so of two equally tight pairs the one that
    shares more surface wins.
    """
    if kind == "plane_on_plane":
        return (abs(evidence["gap_mm"]) / tol["plane_gap_mm"]
                + evidence["angle_deg"] / tol["angle_deg"]
                - evidence["overlap_fraction"])
    if kind == "cylinder_in_cylinder":
        score = (evidence["axis_offset_mm"] / tol["axis_offset_mm"]
                 + evidence["angle_deg"] / tol["angle_deg"])
        if "clearance_mm" not in evidence or evidence.get("relation", "contact") != "contact":
            return score
        clearance = evidence["clearance_mm"]
        allowed = tol["max_clearance_mm"] if clearance >= 0 else tol["max_interference_mm"]
        return (score + abs(clearance) / allowed
                - min(1.0, evidence["axial_overlap_mm"] / max(evidence["pin_radius_mm"], 1e-9)))
    if evidence["seat"] == "planar":
        return _SEAT_ORDER["planar"] + abs(evidence["seat_gap_mm"]) / tol["seat_gap_mm"]
    score = _SEAT_ORDER[evidence["seat"]] + evidence["centre_mm"] / tol["centre_mm"]
    if evidence["seat"] == "cylindrical":
        score += min(1.0, evidence["along_axis_mm"] / max(evidence["ball_radius_mm"], 1e-9))
    return score


# ---------------------------------------------------------------------------
# a feature is often several faces
# ---------------------------------------------------------------------------

def same_feature(a: PlacedFace, b: PlacedFace, tol: Dict[str, float]) -> bool:
    """Do two faces of ONE part lie on one surface, the same way round?

    A STEP exporter splits a full cylinder into two half-faces, and a groove
    splits a bore into more; a sphere comes as two hemispheres. A reader binds
    one face but is looking for the feature, so a candidate names every face
    of it.
    """
    if a.surface != b.surface or a.local.convex != b.local.convex:
        return False
    g, h = a.geometry, b.geometry
    if a.surface == "planar":
        return (_angle_deg(g["normal"], h["normal"]) <= tol["angle_deg"]
                and abs(_dot(_sub(h["point"], g["point"]), g["normal"])) <= tol["plane_gap_mm"])
    if abs(g["radius"] - h["radius"]) > tol["axis_offset_mm"]:
        return False
    if a.surface == "spherical":
        return _norm(_sub(g["centre"], h["centre"])) <= tol["centre_mm"]
    angle = _angle_deg(g["axis"], h["axis"])
    return (min(angle, 180.0 - angle) <= tol["angle_deg"]
            and _line_distance(g["axis_point"], h["axis_point"], h["axis"]) <= tol["axis_offset_mm"])


def feature_groups(faces: Sequence[PlacedFace], tol: Dict[str, float]) -> Dict[int, int]:
    """``face id -> group id`` (the group's smallest face id)."""
    parent = {f.face_id: f.face_id for f in faces}

    def root(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    ordered = sorted(faces, key=lambda f: f.face_id)
    for i, fa in enumerate(ordered):
        for fb in ordered[i + 1:]:
            ra, rb = root(fa.face_id), root(fb.face_id)
            if ra != rb and same_feature(fa, fb, tol):
                parent[max(ra, rb)] = min(ra, rb)
    return {f.face_id: root(f.face_id) for f in faces}


def pair_faces(kind: str, faces_a: Sequence[PlacedFace], faces_b: Sequence[PlacedFace],
               tolerances: Optional[Dict[str, float]] = None) -> List[Dict[str, Any]]:
    """Every pair of features (one per part) that ``kind`` pairs, best first.

    A candidate is ``{a_faces, b_faces, a_surface, b_surface, relation,
    evidence, score}``: the faces of the feature on each side, and the evidence
    of the best face pair between the two features.
    """
    tol = dict(CONTACT_TOLERANCES)
    tol.update(tolerances or {})
    surfaces, test = _PAIRERS[kind]
    reach = tol["reach_mm"]
    faces_a = [f for f in faces_a if f.surface in surfaces]
    faces_b = [f for f in faces_b if f.surface in surfaces]
    groups_a = feature_groups(faces_a, tol)
    groups_b = feature_groups(faces_b, tol)
    best: Dict[Tuple[int, int], Dict[str, Any]] = {}
    for fa in faces_a:
        for fb in faces_b:
            if _norm(_sub(fa.centre, fb.centre)) > fa.local.extent + fb.local.extent + reach:
                continue
            evidence = test(fa, fb, tol)
            if evidence is None:
                continue
            key = (groups_a[fa.face_id], groups_b[fb.face_id])
            relation = evidence.pop("relation")
            score = rank_score(kind, dict(evidence, relation=relation), tol)
            held = best.get(key)
            if held is None or (RELATIONS.index(relation), score) < (
                    RELATIONS.index(held["relation"]), held["score"]):
                best[key] = {"a_surface": fa.surface, "b_surface": fb.surface,
                             "relation": relation, "evidence": evidence,
                             "score": score}
    out = []
    for (ga, gb), row in best.items():
        row["a_faces"] = sorted(f for f, g in groups_a.items() if g == ga)
        row["b_faces"] = sorted(f for f, g in groups_b.items() if g == gb)
        out.append(row)
    out.sort(key=lambda c: (RELATIONS.index(c["relation"]), c["score"],
                            c["a_faces"], c["b_faces"]))
    return out


def feature_box(faces: Sequence[PlacedFace]) -> Dict[str, List[float]]:
    """The assembly-frame box around some placed faces' vertices -- what a
    reader's camera frames to look at a candidate."""
    points = [v for f in faces for v in f.vertices]
    return {"min": [min(p[i] for p in points) for i in range(3)],
            "max": [max(p[i] for p in points) for i in range(3)]}


# ---------------------------------------------------------------------------
# one edge: which occurrences, which features
# ---------------------------------------------------------------------------

def edge_candidates(kind: str, part_a: PartFaces, part_b: PartFaces,
                    occurrences_a: Sequence[Dict[str, Any]],
                    occurrences_b: Sequence[Dict[str, Any]],
                    tolerances: Optional[Dict[str, float]] = None,
                    limit: int = MAX_CANDIDATES) -> Dict[str, Any]:
    """The ranked candidates for one edge, over every occurrence pair in reach.

    An occurrence is ``{"key", "placement", ...}``. Every pair of occurrences
    whose placed bounding boxes come within ``reach_mm`` is paired; the pair
    whose best candidate ranks best wins, and ties go to the first in key
    order -- on a five-bladed rotor the same joint is in reach five times over,
    with the same faces. What is *not* a tie is a second pair sharing one of
    the winner's occurrences and touching different faces: a link with a
    bearing at each end, asked which end. That is ``ambiguous_with``, and only
    the edge's own words can settle it.

    Returns ``{"status": "ok" | one of EMPTY_REASONS, "occurrences",
    "pairs_in_reach", "nearest_gap_mm", "candidates", "ambiguous_with"}``.
    """
    tol = dict(CONTACT_TOLERANCES)
    tol.update(tolerances or {})
    reach = tol["reach_mm"]
    needed = _PAIRERS[kind][0]
    in_reach = []
    nearest = math.inf
    boxes_b = [(ob, placed_box(part_b.box, ob["placement"])) for ob in occurrences_b]
    for oa in occurrences_a:
        box_a = placed_box(part_a.box, oa["placement"])
        for ob, box_b in boxes_b:
            if part_a.sha256 == part_b.sha256 and oa["key"] == ob["key"]:
                continue
            gap = box_gap(box_a, box_b)
            nearest = min(nearest, gap)
            if gap <= reach:
                in_reach.append((oa, ob, box_a, box_b))
    result: Dict[str, Any] = {
        "status": "no_contact", "occurrences": None, "pairs_in_reach": len(in_reach),
        "nearest_gap_mm": None if nearest == math.inf else nearest,
        "candidates": [], "ambiguous_with": []}
    if not in_reach:
        return result

    fitted = [False, False]
    scored = []
    for oa, ob, box_a, box_b in sorted(in_reach, key=lambda r: (r[0]["key"], r[1]["key"])):
        ids_a = faces_within(part_a, oa["placement"], box_b, reach)
        ids_b = faces_within(part_b, ob["placement"], box_a, reach)
        fit_faces(part_a, ids_a)
        fit_faces(part_b, ids_b)
        faces_a = [place(part_a.fitted[f], oa["placement"]) for f in ids_a if part_a.fitted.get(f)]
        faces_b = [place(part_b.fitted[f], ob["placement"]) for f in ids_b if part_b.fitted.get(f)]
        fitted[0] = fitted[0] or any(f.surface in needed for f in faces_a)
        fitted[1] = fitted[1] or any(f.surface in needed for f in faces_b)
        candidates = pair_faces(kind, faces_a, faces_b, tol)
        if candidates:
            scored.append((oa, ob, candidates,
                           ({f.face_id: f for f in faces_a}, {f.face_id: f for f in faces_b})))
    if not scored:
        result["status"] = "no_contact" if all(fitted) else "no_fit"
        return result

    def best_of(row):
        top = row[2][0]
        return (RELATIONS.index(top["relation"]), top["score"])

    oa, ob, candidates, placed = min(scored, key=best_of)   # min keeps the first of a tie
    # Coaxial is the fallback: offered only when the winning pair has no contact.
    if candidates[0]["relation"] == "contact":
        candidates = [c for c in candidates if c["relation"] == "contact"]
    top = candidates[0]
    ambiguous = []
    for other_a, other_b, other, _placed in scored:
        if other_a is oa and other_b is ob:
            continue
        if other_a["key"] != oa["key"] and other_b["key"] != ob["key"]:
            continue
        rival = other[0]
        if rival["relation"] != top["relation"]:
            continue
        if (rival["a_faces"], rival["b_faces"]) == (top["a_faces"], top["b_faces"]):
            continue
        ambiguous.append({"a": other_a["key"], "b": other_b["key"],
                          "a_faces": rival["a_faces"], "b_faces": rival["b_faces"],
                          "score": rival["score"]})
    candidates = candidates[:limit]
    for rank, c in enumerate(candidates, start=1):
        c["rank"] = rank
        c["box"] = feature_box([placed[0][f] for f in c["a_faces"]]
                               + [placed[1][f] for f in c["b_faces"]])
    result.update({
        "status": "ok",
        "occurrences": {"a": oa["key"], "b": ob["key"]},
        "candidates": candidates,
        "ambiguous_with": ambiguous,
    })
    return result

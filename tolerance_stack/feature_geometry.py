"""What shape a tessellated STEP face is, fitted in Python -- the other half of
``apps/annotate/face_geometry.js``.

That file reads a face's shape in the browser so the annotator can *colour* the
faces that could be the feature a human is about to bind. This one reads the
same shape out of the same buffers so a committed binding can be turned into a
**fitted nominal** -- a sphere centre, a bore axis -- for a consumer outside
this repo (``C:\\workspace\\linkage``, the pitch-linkage solver, 2026-09-30).
``scripts/fit_bound_features.py`` is that consumer's entry point; this module is
geometry and nothing else: no event stream, no projection, no placement, no
vocabulary of the stack.

Why two implementations and what keeps them honest
---------------------------------------------------

The browser cannot call Python and the solver's inputs cannot be produced in a
browser, so the arithmetic exists twice. What is NOT duplicated is the
*vocabulary*: :data:`SURFACE_CLASSES` is defined here and rendered into
``apps/viewer/vocab.gen.js`` by ``scripts/generate_js_vocabulary.py``, so
``AA.SURFACE_CLASSES`` is this tuple and a word added on one side without the
other is a red test (``tests/test_js_vocabulary_is_generated.py``). The
thresholds are paired the same way, by assertion rather than by copy:
``tests/test_feature_geometry.py`` reads the literals out of
``apps/annotate/face_geometry.js``'s own ``AA.FACE_CLASSIFY`` block and compares
them with :data:`FIT_TOLERANCES`, so the two readers cannot drift into
disagreeing about what a cylinder is.

**This module measures a mesh. It is not a value source for a tolerance.**
Nothing here produces a band, a min/max or a plus/minus, and a drawing callout
still wins wherever one exists (``docs/ANNOTATION_SURFACE.md``, decision 6).
The repo's one rule -- cite or record a gap -- is untouched: a fit is a
*nominal* read off geometry, whose provenance is the mesh sha, the face id and
the residual it came with. Note what follows for anyone writing one into a
document: ``tolerance_stack.stack.SOURCE_REF_KINDS`` has no word for a mesh, on
purpose, because no document carries a fitted value today. The first handoff
that writes one adds the word -- and the SOP's Step 5b list it is paired
against.

Fit all three, report all three, name one
-------------------------------------------

The browser's job is a yes/no per class, so it stops at the first word that
fits. This module's job is a number plus its uncertainty, so it fits **all
three** surfaces to every face it is asked about and reports every residual --
a caller that wants to know how firmly a face is a sphere rather than a
cylinder reads both numbers instead of inferring it from which word came back.

What it does **not** do is let the smallest residual decide, which is what the
handoff that added the sphere asked for and what measuring the installed meshes
refused. :data:`FITTED_SURFACE_CLASSES` carries that measurement; the short
version is that a face tessellated as one band of quads lies on a cylinder, a
cone and a sphere at once, to machine precision, so its residuals rank nothing.
The order of that tuple decides, and a face no surface fits is ``other``, with
its reason, exactly as in the browser.

The one thing to know before touching a threshold is the same thing that file
says: OCC puts triangulation **nodes** exactly on the underlying surface, so
every tolerance below is slack for float32 noise and for irregular triangles at
a trimmed boundary -- never for a tessellation error that grows with the
deflection setting.

Stdlib only, like every other module here.
"""

from __future__ import annotations

import array
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

#: What kind of surface a face is. **This tuple is the definition**, for both
#: languages: ``apps/annotate/face_geometry.js`` reads it out of the generated
#: vocabulary module rather than holding a copy (``scripts/js_vocabulary.py``'s
#: ``annotate.SURFACE_CLASSES`` row).
#:
#: ``other`` is a first-class answer and not a failure, the same posture
#: ``tolerance_stack.spec_library`` takes for an unreadable value: a cone, a
#: torus, a swept blade surface and a face whose triangles are too degenerate to
#: read all land there, and a face there is suggested for nothing and fitted to
#: nothing. ``spherical`` joined the set on 2026-09-30 (handoff
#: ``vpa_pitch_linkage_topology_and_feature_fits``): a pitch link's length is the
#: distance between two spherical-bearing **centres**, and until a sphere could
#: be read it was an ``other`` with no centre to offer.
SURFACE_CLASSES = ("planar", "cylindrical", "spherical", "other")

#: The fitted classes, in the order :func:`fit_face` asks them. ``other`` is
#: excluded by construction -- it is what is left, not something that is fitted.
#:
#: **The order is the answer, not the residuals**, and it is the same order
#: ``apps/annotate/face_geometry.js`` asks in. The handoff that added the sphere
#: asked for the smallest residual to win; measuring the installed meshes
#: refused that rule, and this is why: a face tessellated as a single band of
#: quads lies on a cylinder, a cone AND a sphere to machine precision at once
#: (two coaxial circles determine a sphere exactly), so on the MS14101-3
#: bearing's own faces the sphere's residual and the cylinder's are 3.1e-8
#: against 3.4e-8 -- a coin toss deciding whether a bore is reported to a
#: solver as a sphere centre. Asked in this order, the **more constrained**
#: shape answers first: a cylinder has to put every facet normal perpendicular
#: to one axis, which a sphere band cannot do, and a plane has to put them all
#: parallel. Every residual is still reported (:attr:`FaceFit.fits`), so a
#: reader can see how firmly the winner won; it is just not what decides.
FITTED_SURFACE_CLASSES = tuple(c for c in SURFACE_CLASSES if c != "other")

#: Every threshold this module applies, in one block so a run can print them
#: beside the residuals they produced. All of them are **angles or fractions**:
#: nothing here is a length, so the module never assumes what a mesh's native
#: unit is -- the same reason ``area_native2``/``centroid_native`` are named the
#: way they are.
#:
#: Each one that also exists in the browser carries the browser's own spelling
#: in :data:`JS_TOLERANCE_NAMES` and is paired against it by
#: ``tests/test_feature_geometry.py``.
FIT_TOLERANCES: Dict[str, float] = {
    # A planar face's facet normals are parallel to machine precision.
    "planar_normal_deg": 1.0,
    # ...and its vertices sit in that plane, to a fraction of the face's own
    # extent.
    "planar_flatness_fraction": 0.002,
    # A cylinder's facet normals are perpendicular to its axis.
    "cylinder_axis_deg": 2.0,
    # ...and its vertices are all at one radius, to this fraction of it. Two
    # percent and not one, for the reason the browser's own comment gives:
    # float32 positions carry an ABSOLUTE error set by the part's coordinate
    # magnitude, and this test divides it by the radius.
    "cylinder_radial_fraction": 0.02,
    # A cylinder read from too narrow an arc has a well-determined axis
    # DIRECTION and a badly-determined axis POSITION.
    "cylinder_min_arc_deg": 10.0,
    # A sphere's vertices are all at one radius from one centre, to the same
    # fraction a cylinder's are: the error source is identical and a second
    # number would be a second thing to argue about.
    "sphere_radial_fraction": 0.02,
    # ...and the face has to be a PATCH and not a single band of quads. This is
    # the sphere's equivalent of cylinder_min_arc_deg and it is the load-bearing
    # one: a band whose nodes sit in exactly TWO rows is two coaxial circles,
    # and any two coaxial circles lie on one sphere **exactly**, whatever the
    # surface between them is. Measured: a synthetic cylinder band, a 30-degree
    # cone band and a real spherical band all fit a sphere to 1e-16 relative,
    # so no residual threshold can tell them apart and no facet-normal
    # threshold can either (6.8, 6.2 and 7.6 degrees respectively).
    #
    # The test is therefore on the NODE ROWS, and this ratio counts them. For a
    # face of R rows over S segments the triangle count is 2S(R-1) and the node
    # count is RS when the face closes all the way round and R(S+1) when it does
    # not, so
    #
    #     closed:  triangles/nodes = 2(R-1)/R          -> 1 at R=2, 4/3 at R=3
    #     open:    triangles/nodes = 2S(R-1)/(R(S+1))  -> below 1 at R=2
    #
    # **Two rows sit AT this value, never above it**, and three rows are above
    # it for any S a real tessellation produces. So the comparison is strict
    # (`>`), and that is a derivation rather than a tuned margin.
    #
    # It was `>=` until 2026-09-30, written from the OPEN band alone ("a patch
    # has at least as many triangles as nodes; a band has exactly two fewer"),
    # which is true of an open band and false of a closed one -- a closed band
    # lands exactly on 1.0 and was accepted. That let 139 faces store-wide
    # answer `spherical`, 18 of them on the hub, offering a solver "ball" radii
    # of 62 to 65 mm that are fillet bands (found in review).
    #
    # The measured values either side, for a reader checking this: the
    # MS14101-3 bearing's four spherical faces are 1.4783 twice (the race seat)
    # and 1.5714 twice (the ball); MS14103-3's four are 1.2609, which is also
    # the lowest on any accepted spherical face store-wide. Its own bands are
    # 0.9286, and a closed band is 1.0 exactly.
    "sphere_min_triangles_per_vertex": 1.0,
    # ...and its facet normals point at least roughly along the RADIUS at that
    # facet. Deliberately LOOSE, and a sanity check rather than a discriminator:
    # a facet's normal differs from the radius at its own centroid by about half
    # the facet's angular width, which is set by the tessellation deflection, so
    # a tight value here would be absorbing exactly the deflection-dependent
    # error this module refuses to absorb. Twenty degrees covers a facet half
    # angle at any deflection this store could plausibly carry (acos(1 - 0.5/5)
    # = 18 degrees at ten times the installed tier's); the real spherical faces
    # measure 3.8 and 4.1, and the swept faces it is there to reject measure 85.
    "sphere_normal_deg": 20.0,
    # ...and the patch has to be big enough to PLACE that centre. A face whose
    # own extent is this small a fraction of the radius it fits is a nearly-flat
    # cap: the radius is plausible and the centre is wherever the noise put it.
    "sphere_min_extent_fraction": 0.20,
    # A triangle this much smaller than its face's largest is a sliver at a
    # trimmed boundary: it keeps its area weight but may not fail a
    # normal-direction check on its own.
    "sliver_area_fraction": 1e-4,
    # ...and a whole FACE this much smaller than the part's largest is a
    # tessellation artefact, not a feature. A ratio, so it needs no unit.
    "degenerate_area_fraction": 1e-6,
}

#: ``FIT_TOLERANCES`` key -> the ``AA.FACE_CLASSIFY`` key that must hold the
#: same number. Only the thresholds BOTH readers apply are here; a reader with a
#: threshold the other has no use for is not drift.
JS_TOLERANCE_NAMES = {
    "planar_normal_deg": "planarNormalDeg",
    "planar_flatness_fraction": "planarFlatnessFraction",
    "cylinder_axis_deg": "cylinderAxisDeg",
    "cylinder_radial_fraction": "cylinderRadialFraction",
    "cylinder_min_arc_deg": "cylinderMinArcDeg",
    "sphere_radial_fraction": "sphereRadialFraction",
    "sphere_min_triangles_per_vertex": "sphereMinTrianglesPerVertex",
    "sphere_normal_deg": "sphereNormalDeg",
    "sphere_min_extent_fraction": "sphereMinExtentFraction",
    "sliver_area_fraction": "sliverAreaFraction",
    "degenerate_area_fraction": "degenerateAreaFraction",
}


class MeshError(ValueError):
    """A mesh directory that does not describe a readable part."""


# ---------------------------------------------------------------------------
# small vector helpers -- local, because nothing here may grow a dependency
# ---------------------------------------------------------------------------

Vec = Tuple[float, float, float]


def _sub(a: Sequence[float], b: Sequence[float]) -> Vec:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _dot(a: Sequence[float], b: Sequence[float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a: Sequence[float], b: Sequence[float]) -> Vec:
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def _norm(a: Sequence[float]) -> float:
    return math.sqrt(_dot(a, a))


def _scale(a: Sequence[float], k: float) -> Vec:
    return (a[0] * k, a[1] * k, a[2] * k)


def _unit(a: Sequence[float]) -> Vec:
    n = _norm(a)
    return _scale(a, 1.0 / n) if n > 0 else (0.0, 0.0, 0.0)


def _angle_between_deg(a: Sequence[float], b: Sequence[float]) -> float:
    """Clamped: a dot product of 1.0000000002 is an ordinary float32 artefact,
    and ``acos`` of it raises where the browser's would answer ``NaN``."""
    c = max(-1.0, min(1.0, _dot(_unit(a), _unit(b))))
    return math.degrees(math.acos(c))


def eigen_symmetric3(m: Sequence[float]) -> Tuple[List[float], List[Vec]]:
    """Jacobi eigendecomposition of a symmetric 3x3 given as
    ``[m00, m01, m02, m11, m12, m22]``, sorted by **descending** eigenvalue.

    Written out rather than solved by the closed-form cubic for the reason
    ``AA.eigenSymmetric3`` is: the cubic loses most of its precision on exactly
    the near-degenerate matrix this is used on (a plane's normal covariance has
    two eigenvalues at ~0), and the eigenVECTOR of the smallest eigenvalue is the
    answer the cylinder fit depends on.
    """
    a = [[m[0], m[1], m[2]], [m[1], m[3], m[4]], [m[2], m[4], m[5]]]
    v = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
    for _sweep in range(32):
        off = abs(a[0][1]) + abs(a[0][2]) + abs(a[1][2])
        if off < 1e-16:
            break
        for p in range(2):
            for q in range(p + 1, 3):
                if abs(a[p][q]) < 1e-20:
                    continue
                theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
                sign = 1.0 if theta >= 0 else -1.0
                t = sign / (abs(theta) + math.sqrt(theta * theta + 1))
                c = 1 / math.sqrt(t * t + 1)
                s = t * c
                for k in range(3):
                    akp, akq = a[k][p], a[k][q]
                    a[k][p] = c * akp - s * akq
                    a[k][q] = s * akp + c * akq
                for k in range(3):
                    apk, aqk = a[p][k], a[q][k]
                    a[p][k] = c * apk - s * aqk
                    a[q][k] = s * apk + c * aqk
                for k in range(3):
                    vkp, vkq = v[k][p], v[k][q]
                    v[k][p] = c * vkp - s * vkq
                    v[k][q] = s * vkp + c * vkq
    order = sorted(range(3), key=lambda i: -a[i][i])
    return ([a[i][i] for i in order],
            [(v[0][i], v[1][i], v[2][i]) for i in order])


def _solve(matrix: List[List[float]], rhs: List[float]) -> Optional[List[float]]:
    """Gaussian elimination with partial pivoting; ``None`` when singular.

    ``None`` is the answer, never a least-squares pseudo-solution: a singular
    normal-equation system means the points do not determine the shape, and a
    guessed centre there is a guessed axis -- the same refusal
    ``AA.fitCircle2`` makes.
    """
    n = len(rhs)
    aug = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    scale = max((abs(x) for row in matrix for x in row), default=0.0)
    if not scale:
        return None
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-12 * scale:
            return None
        aug[col], aug[pivot] = aug[pivot], aug[col]
        for r in range(col + 1, n):
            factor = aug[r][col] / aug[col][col]
            for c in range(col, n + 1):
                aug[r][c] -= factor * aug[col][c]
    out = [0.0] * n
    for r in range(n - 1, -1, -1):
        total = aug[r][n] - sum(aug[r][c] * out[c] for c in range(r + 1, n))
        out[r] = total / aug[r][r]
    return out


def fit_circle2(xs: Sequence[float], ys: Sequence[float]) -> Optional[Dict[str, float]]:
    """Algebraic (Kasa) circle fit: minimise ``x^2 + y^2 + Dx + Ey + F = 0``.

    The same fit ``AA.fitCircle2`` makes, with the same refusal: ``None`` when
    the normal equations are singular -- collinear projections, which is what a
    too-narrow cylindrical arc looks like.
    """
    n = len(xs)
    if n < 3:
        return None
    sxx = sxy = sx = syy = sy = 0.0
    bx = by = bn = 0.0
    for x, y in zip(xs, ys):
        z = x * x + y * y
        sxx += x * x
        sxy += x * y
        sx += x
        syy += y * y
        sy += y
        bx -= z * x
        by -= z * y
        bn -= z
    solved = _solve([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, float(n)]], [bx, by, bn])
    if solved is None:
        return None
    d, e, f = solved
    cx, cy = -d / 2, -e / 2
    r2 = cx * cx + cy * cy - f
    if not r2 > 0:
        return None
    return {"cx": cx, "cy": cy, "r": math.sqrt(r2)}


def angular_spread_deg(angles: Sequence[float]) -> float:
    """How much of a full turn a set of angles covers: the turn minus its widest
    empty wedge. The browser's ``AA.angularSpreadDeg``, including its one quirk
    -- a CLOSED loop answers 360 minus one station spacing, because with no
    duplicate station at the seam the wrap-around gap is a real gap as far as
    this can tell."""
    if not angles or len(angles) < 2:
        return 0.0
    ordered = sorted(angles)
    widest = (ordered[0] + 2 * math.pi) - ordered[-1]
    for i in range(1, len(ordered)):
        gap = ordered[i] - ordered[i - 1]
        if gap > widest:
            widest = gap
    return max(0.0, math.degrees(2 * math.pi - widest))


# ---------------------------------------------------------------------------
# the mesh
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Mesh:
    """One ``data/meshes/<sha>/`` directory, read.

    ``positions``/``indices``/``face_ids`` are the raw little-endian typed
    arrays the tessellation writes; ``manifest`` is its own face table, and the
    manifest -- never the buffers -- is what decides how many faces there are.
    """

    sha256: str
    directory: Path
    manifest: Dict[str, Any]
    positions: Sequence[float]
    indices: Sequence[int]
    face_ids: Sequence[int]
    #: Per-MESH facts the per-FACE work needs. Memoised here because both of
    #: them were being recomputed once per face: on the 2376-face tangential
    #: link mount that is 5.6 million generator calls for the largest area and
    #: a rebuilt range table for every one of them, 15 seconds of a 27-second
    #: part. Mutable on a frozen dataclass, which is what a cache should be --
    #: it is derived from the fields, never part of the identity.
    _derived: Dict[str, Any] = field(default_factory=dict, compare=False, repr=False)

    @property
    def faces(self) -> List[Dict[str, Any]]:
        """The manifest's face table. Cached, and the SAME list every call: it
        was a fresh copy per access, which the per-face work reads several times
        a face."""
        if "faces" not in self._derived:
            self._derived["faces"] = list(self.manifest.get("faces", []))
        return self._derived["faces"]

    @property
    def largest_face_area(self) -> float:
        """The biggest ``area_native2`` in the manifest -- what the degenerate
        test is a fraction of."""
        if "largest_face_area" not in self._derived:
            self._derived["largest_face_area"] = max(
                (float(f.get("area_native2") or 0.0)
                 for f in self.manifest.get("faces", [])), default=0.0)
        return self._derived["largest_face_area"]

    @property
    def vertex_ranges(self) -> Dict[int, Tuple[int, int]]:
        """``face_id -> (start vertex, count)``, built once per mesh."""
        if "vertex_ranges" not in self._derived:
            self._derived["vertex_ranges"] = face_vertex_ranges(
                self.manifest.get("faces", []))
        return self._derived["vertex_ranges"]

    def face(self, face_id: int) -> Dict[str, Any]:
        """One face's manifest entry, by id.

        Indexed rather than scanned: a linear search here is O(faces^2) over a
        whole part, which on the 3473-face hub was 4.9 of its 55 seconds.
        """
        if "by_id" not in self._derived:
            self._derived["by_id"] = {int(e["face_id"]): e for e in self.faces}
        try:
            return self._derived["by_id"][int(face_id)]
        except KeyError:
            raise MeshError(
                f"mesh {self.sha256[:12]} has no face {face_id} -- its manifest "
                f"declares {len(self.faces)} face(s)") from None


def _typed(path: Path, typecode: str) -> array.array:
    values = array.array(typecode)
    data = path.read_bytes()
    if len(data) % values.itemsize:
        raise MeshError(
            f"{path.name} is {len(data)} bytes, not a whole number of "
            f"{values.itemsize}-byte {typecode!r} values")
    values.frombytes(data)
    # The format is little-endian by declaration (data/meshes/README.md), and
    # this reader does not get to assume it is running on the machine that
    # wrote it.
    if sys.byteorder != "little":
        values.byteswap()
    return values


def read_mesh(directory: str | Path) -> Mesh:
    """Read ``data/meshes/<sha>/`` -- manifest plus the three buffers.

    The directory NAME is the ``source_step_sha256`` this store is keyed by
    (``data/meshes/README.md``), which is also the geometry half of a binding's
    key, so it is carried rather than re-derived from ``provenance.json``.
    """
    directory = Path(directory)
    manifest_path = directory / "manifest.json"
    if not manifest_path.is_file():
        raise MeshError(f"{directory} has no manifest.json -- not a mesh directory")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return Mesh(
        sha256=directory.name,
        directory=directory,
        manifest=manifest,
        positions=_typed(directory / manifest.get("positions_file", "positions.f32"), "f"),
        indices=_typed(directory / manifest.get("indices_file", "indices.u32"), "I"),
        face_ids=_typed(directory / manifest.get("face_ids_file", "face_ids.u32"), "I"),
    )


def face_vertex_ranges(manifest_faces: Sequence[Dict[str, Any]]) -> Dict[int, Tuple[int, int]]:
    """``face_id -> (start vertex, count)``.

    Faces are appended in ``face_id`` order and each face's triangulation nodes
    occupy a contiguous run of the flat vertex buffer, so a cumulative sum over
    the manifest gives every face's range with no index scan -- the traversal
    contract ``rotorkit/stepgeom/tessellate.py`` documents and
    ``AA.faceVertexRanges`` already relies on.
    """
    ranges: Dict[int, Tuple[int, int]] = {}
    offset = 0
    for entry in manifest_faces:
        count = int(entry["n_vertices"])
        ranges[int(entry["face_id"])] = (offset, count)
        offset += count
    return ranges


def face_vertices(mesh: Mesh, face_id: int) -> List[Vec]:
    """One face's own triangulation nodes, in buffer order."""
    start, count = mesh.vertex_ranges[int(face_id)]
    positions = mesh.positions
    return [(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
            for i in range(start, start + count)]


@dataclass(frozen=True)
class Facet:
    """One triangle of a face: its area, its unit normal and its own centroid.

    The centroid is carried because the sphere test needs it -- "this facet's
    normal points along the radius **at this facet**" is a question about where
    the facet is, not only about which way it faces.
    """

    area: float
    normal: Vec
    centroid: Vec


def _triangle(positions: Sequence[float], indices: Sequence[int],
              t: int) -> Optional[Facet]:
    i0, i1, i2 = indices[t * 3] * 3, indices[t * 3 + 1] * 3, indices[t * 3 + 2] * 3
    e1 = (positions[i1] - positions[i0],
          positions[i1 + 1] - positions[i0 + 1],
          positions[i1 + 2] - positions[i0 + 2])
    e2 = (positions[i2] - positions[i0],
          positions[i2 + 1] - positions[i0 + 1],
          positions[i2 + 2] - positions[i0 + 2])
    c = _cross(e1, e2)
    twice_area = _norm(c)
    if not twice_area > 0:
        return None
    centroid = ((positions[i0] + positions[i1] + positions[i2]) / 3.0,
                (positions[i0 + 1] + positions[i1 + 1] + positions[i2 + 1]) / 3.0,
                (positions[i0 + 2] + positions[i1 + 2] + positions[i2 + 2]) / 3.0)
    return Facet(area=twice_area / 2.0,
                 normal=(c[0] / twice_area, c[1] / twice_area, c[2] / twice_area),
                 centroid=centroid)


def face_facets(mesh: Mesh, face_id: int) -> Tuple[List[Facet], int]:
    """``([facet, ...], triangles seen)`` for ONE face.

    The count is separate from the list because a degenerate triangle has no
    normal to read and drops out of the list while still being a triangle the
    face has -- the same distinction ``accumulateTriangles`` makes in the
    browser.

    This scans the whole triangle buffer to find one face's share, which is the
    right shape for the one face a binding names and the wrong shape for a whole
    part: use :func:`all_face_facets` there, for the reason
    ``AA.classifyPartFaces``'s own comment gives (O(faces x triangles) is 192
    million iterations on the 2376-face pitch plate).
    """
    positions, indices, face_ids = mesh.positions, mesh.indices, mesh.face_ids
    wanted = int(face_id)
    facets: List[Facet] = []
    seen = 0
    for t in range(len(face_ids)):
        if int(face_ids[t]) != wanted:
            continue
        seen += 1
        facet = _triangle(positions, indices, t)
        if facet is not None:
            facets.append(facet)
    return facets, seen


def all_face_facets(mesh: Mesh) -> Dict[int, Tuple[List[Facet], int]]:
    """Every face's facets, bucketed in ONE pass over the triangle buffer."""
    positions, indices, face_ids = mesh.positions, mesh.indices, mesh.face_ids
    buckets: Dict[int, Tuple[List[Facet], int]] = {
        int(entry["face_id"]): ([], 0) for entry in mesh.faces}
    for t in range(len(face_ids)):
        bucket = buckets.get(int(face_ids[t]))
        if bucket is None:
            continue  # a face id outside the manifest: the manifest wins
        facets, seen = bucket
        facet = _triangle(positions, indices, t)
        if facet is not None:
            facets.append(facet)
        buckets[int(face_ids[t])] = (facets, seen + 1)
    return buckets


#: How a facet normal is compared with the direction its shape predicts. Three
#: words because the three shapes genuinely differ:
#:
#: * ``same`` -- the normal equals the direction, sign included. A plane's
#:   facets all wind the same way, so a flip here would be a real defect and is
#:   not absorbed.
#: * ``across`` -- the normal is perpendicular to it (a cylinder's axis).
#: * ``radial`` -- the normal is along it **either way round**. A sphere is
#:   convex on a ball and concave on the seat it turns in, and the MS14101-3
#:   bearing carries both; the race seat's outward normal points at the centre.
FACET_COMPARISONS = ("same", "across", "radial")


def worst_deviation_deg(facets: Sequence[Facet], direction, comparison: str,
                        sliver_area_fraction: float) -> float:
    """The widest angle any non-sliver facet's normal makes with the direction
    a shape says it should.

    ``direction`` is either that direction -- a face's mean normal for a plane,
    its axis for a cylinder -- or a **callable** taking a facet and returning
    one, which is what a sphere needs (the radius differs at every facet).
    ``comparison`` is one of :data:`FACET_COMPARISONS`. One function for all
    three, because three near-identical loops is three places a sliver rule can
    differ.

    A fixed direction is normalised **once**, and facet normals are taken as
    already unit -- which they are, by construction in :func:`_triangle`. Both
    matter: this is the hot loop of a whole-part fit, and normalising three
    vectors per facet instead of none was half of it.
    """
    if comparison not in FACET_COMPARISONS:
        raise ValueError(
            f"comparison must be one of {FACET_COMPARISONS}, got {comparison!r}")
    if not facets:
        return 0.0
    per_facet = callable(direction)
    fixed = None
    if not per_facet:
        if direction is None or not _norm(direction) > 0:
            return 0.0
        fixed = _unit(direction)
    largest = max(f.area for f in facets)
    floor = largest * sliver_area_fraction
    worst = 0.0
    degrees, acos = math.degrees, math.acos
    for facet in facets:
        if facet.area < floor:
            continue
        if per_facet:
            towards = direction(facet)
            if towards is None:
                continue
            length = _norm(towards)
            if not length > 0:
                continue
            towards = (towards[0] / length, towards[1] / length, towards[2] / length)
        else:
            towards = fixed
        normal = facet.normal
        # Clamped: a dot product of 1.0000000002 is an ordinary float32
        # artefact, and acos of it raises.
        cosine = normal[0] * towards[0] + normal[1] * towards[1] + normal[2] * towards[2]
        if cosine > 1.0:
            cosine = 1.0
        elif cosine < -1.0:
            cosine = -1.0
        angle = degrees(acos(cosine))
        if comparison == "across":
            off = abs(90 - angle)
        elif comparison == "radial":
            off = angle if angle <= 90 else 180 - angle
        else:
            off = angle
        if off > worst:
            worst = off
    return worst


@dataclass
class FaceTriangleStats:
    """One face's triangle sums: the area-weighted normal, the normal
    covariance whose least eigenvector is a cylinder's axis, and the widest
    deviation of any non-sliver facet from each."""

    area: float = 0.0
    triangles: int = 0
    facets: List[Facet] = field(default_factory=list)
    mean_normal: Optional[Vec] = None
    axis: Optional[Vec] = None
    worst_normal_deg: float = 0.0
    worst_axis_deg: float = 0.0


def face_triangle_stats(mesh: Mesh, face_id: int,
                        tolerances: Optional[Dict[str, float]] = None,
                        bucket: Optional[Tuple[List[Facet], int]] = None,
                        ) -> FaceTriangleStats:
    """:class:`FaceTriangleStats` for one face, in two passes over its triangles.

    Two passes and not one for the same reason ``accumulateDeviations`` is a
    second pass in the browser: the deviations are measured against answers the
    first pass produces. ``bucket`` is this face's entry from
    :func:`all_face_facets` when the caller already has one -- the whole-part
    path, which must not re-scan the buffer per face.
    """
    tol = dict(FIT_TOLERANCES)
    tol.update(tolerances or {})
    facets, seen = bucket if bucket is not None else face_facets(mesh, face_id)

    stats = FaceTriangleStats(triangles=seen, facets=facets)
    acc_n = [0.0, 0.0, 0.0]
    acc_m = [0.0] * 6
    for facet in facets:
        w, n = facet.area, facet.normal
        stats.area += w
        acc_n[0] += w * n[0]
        acc_n[1] += w * n[1]
        acc_n[2] += w * n[2]
        acc_m[0] += w * n[0] * n[0]
        acc_m[1] += w * n[0] * n[1]
        acc_m[2] += w * n[0] * n[2]
        acc_m[3] += w * n[1] * n[1]
        acc_m[4] += w * n[1] * n[2]
        acc_m[5] += w * n[2] * n[2]
    if stats.area <= 0:
        return stats

    stats.mean_normal = _unit(acc_n)
    _values, vectors = eigen_symmetric3([v / stats.area for v in acc_m])
    stats.axis = _unit(vectors[2])
    sliver = tol["sliver_area_fraction"]
    stats.worst_normal_deg = worst_deviation_deg(
        facets, stats.mean_normal, "same", sliver)
    stats.worst_axis_deg = worst_deviation_deg(
        facets, stats.axis, "across", sliver)
    return stats


# ---------------------------------------------------------------------------
# the three fits
# ---------------------------------------------------------------------------


def _centroid_and_extent(vertices: Sequence[Vec]) -> Tuple[Vec, float]:
    n = len(vertices)
    centroid = (sum(v[0] for v in vertices) / n,
                sum(v[1] for v in vertices) / n,
                sum(v[2] for v in vertices) / n)
    extent = max((_norm(_sub(v, centroid)) for v in vertices), default=0.0)
    return centroid, extent


def _rms(residuals: Sequence[float]) -> float:
    if not residuals:
        return math.inf
    return math.sqrt(sum(r * r for r in residuals) / len(residuals))


def fit_plane(vertices: Sequence[Vec], normal: Optional[Vec] = None,
              centroid_extent: Optional[Tuple[Vec, float]] = None,
              ) -> Optional[Dict[str, Any]]:
    """Plane through the vertices' centroid.

    ``normal`` is the face's own area-weighted facet normal when the caller has
    it (the browser's ``meanNormal``); without one the plane's normal is the
    least eigenvector of the vertex covariance, which is the same answer for a
    real planar face and a defined one for a point set that has no facets.
    """
    if len(vertices) < 3:
        return None
    centroid, extent = centroid_extent or _centroid_and_extent(vertices)
    if normal is None:
        m = [0.0] * 6
        for v in vertices:
            d = _sub(v, centroid)
            m[0] += d[0] * d[0]
            m[1] += d[0] * d[1]
            m[2] += d[0] * d[2]
            m[3] += d[1] * d[1]
            m[4] += d[1] * d[2]
            m[5] += d[2] * d[2]
        _values, vectors = eigen_symmetric3(m)
        normal = _unit(vectors[2])
    normal = _unit(normal)
    if not _norm(normal) > 0:
        return None
    residuals = [_dot(_sub(v, centroid), normal) for v in vertices]
    return {
        "surface": "planar",
        "point": list(centroid),
        "normal": list(normal),
        # The plane as (normal, offset): two planes in ONE mesh's frame are
        # coplanar when their offsets agree.
        "offset": _dot(normal, centroid),
        "rms": _rms(residuals),
        "max_residual": max((abs(r) for r in residuals), default=0.0),
        "extent": extent,
    }


def fit_cylinder(vertices: Sequence[Vec], axis: Optional[Vec] = None,
                 centroid_extent: Optional[Tuple[Vec, float]] = None,
                 ) -> Optional[Dict[str, Any]]:
    """Cylinder about ``axis``, by projecting into the plane perpendicular to it
    and fitting a circle -- ``AA.classifyPartFaces``'s cylindrical branch.

    ``axis`` is the face's facet-normal covariance's least eigenvector when the
    caller has it: for a cylinder the facet normals span the plane perpendicular
    to the axis, so the direction they never point in IS the axis. Without one
    the vertex covariance's **largest** eigenvector stands in, which is right for
    a long thin band and is why the caller should pass the facet answer when it
    has it.
    """
    if len(vertices) < 3:
        return None
    centroid, extent = centroid_extent or _centroid_and_extent(vertices)
    if axis is None:
        m = [0.0] * 6
        for v in vertices:
            d = _sub(v, centroid)
            m[0] += d[0] * d[0]
            m[1] += d[0] * d[1]
            m[2] += d[0] * d[2]
            m[3] += d[1] * d[1]
            m[4] += d[1] * d[2]
            m[5] += d[2] * d[2]
        _values, vectors = eigen_symmetric3(m)
        axis = vectors[0]
    axis = _unit(axis)
    if not _norm(axis) > 0:
        return None
    # The basis is arbitrary but must be stable: build it off the axis's own
    # smallest component, so `u` is never near-parallel to it.
    abs_axis = [abs(c) for c in axis]
    smallest = abs_axis.index(min(abs_axis))
    seed = [0.0, 0.0, 0.0]
    seed[smallest] = 1.0
    u = _unit(_cross(axis, tuple(seed)))
    v = _unit(_cross(axis, u))
    xs, ys = [], []
    for point in vertices:
        rel = _sub(point, centroid)
        xs.append(_dot(rel, u))
        ys.append(_dot(rel, v))
    fit = fit_circle2(xs, ys)
    if not fit or not fit["r"] > 0:
        return None
    residuals = []
    angles = []
    for x, y in zip(xs, ys):
        dx, dy = x - fit["cx"], y - fit["cy"]
        residuals.append(math.hypot(dx, dy) - fit["r"])
        angles.append(math.atan2(dy, dx))
    axis_point = (centroid[0] + u[0] * fit["cx"] + v[0] * fit["cy"],
                  centroid[1] + u[1] * fit["cx"] + v[1] * fit["cy"],
                  centroid[2] + u[2] * fit["cx"] + v[2] * fit["cy"])
    return {
        "surface": "cylindrical",
        "axis": list(axis),
        # A point ON the axis, in this mesh's own frame.
        "axis_point": list(axis_point),
        "radius": fit["r"],
        "arc_deg": angular_spread_deg(angles),
        "rms": _rms(residuals),
        "max_residual": max((abs(r) for r in residuals), default=0.0),
        "extent": extent,
    }


def fit_sphere(vertices: Sequence[Vec],
               centroid_extent: Optional[Tuple[Vec, float]] = None,
               ) -> Optional[Dict[str, Any]]:
    """Sphere through the vertices, by linear least squares on
    ``|p - c|^2 = r^2``.

    Expanded, that is ``|p|^2 = 2 p.c + (r^2 - |c|^2)``, which is **linear** in
    the four unknowns ``(cx, cy, cz, r^2 - |c|^2)`` -- so this is one 4x4 normal
    system and no iteration, the same shape as the Kasa circle fit one dimension
    up. (The algebraic fit minimises the residual of the squared radius rather
    than of the radius; over a real tessellated patch, whose points sit on the
    surface to float32, the difference is far below every threshold here. A
    geometric refit would be the thing to add if a patch ever arrived noisy.)

    ``None`` when the system is singular -- a planar point set, which has no
    centre, and where a guessed one would be a guessed centre reported to a
    solver as a nominal.
    """
    if len(vertices) < 4:
        return None
    centroid, extent = centroid_extent or _centroid_and_extent(vertices)
    # Solved about the centroid rather than about the mesh origin: the normal
    # equations of a patch 100 mm from the origin and 3 mm across are otherwise
    # dominated by the offset, and the conditioning decides the answer.
    local = [_sub(v, centroid) for v in vertices]
    # The normal equations, accumulated over the SYMMETRIC half: ten sums
    # rather than sixteen, and no inner loop. This is the hot arithmetic of a
    # whole-part fit -- 363681 triangles on the hub alone -- and the nested
    # `for i: for j:` version was most of it.
    a = b = c = d = 0.0
    aa = ab = ac = ad = bb = bc = bd = cc = cd = dd = 0.0
    ra = rb = rc = rd = 0.0
    for px, py, pz in local:
        a, b, c, d = 2 * px, 2 * py, 2 * pz, 1.0
        value = px * px + py * py + pz * pz
        aa += a * a; ab += a * b; ac += a * c; ad += a
        bb += b * b; bc += b * c; bd += b
        cc += c * c; cd += c
        dd += 1.0
        ra += a * value; rb += b * value; rc += c * value; rd += value
    solved = _solve([[aa, ab, ac, ad],
                     [ab, bb, bc, bd],
                     [ac, bc, cc, cd],
                     [ad, bd, cd, dd]], [ra, rb, rc, rd])
    if solved is None:
        return None
    cx, cy, cz, k = solved
    centre_local = (cx, cy, cz)
    r2 = k + _dot(centre_local, centre_local)
    if not r2 > 0:
        return None
    radius = math.sqrt(r2)
    centre = (centroid[0] + cx, centroid[1] + cy, centroid[2] + cz)
    residuals = [_norm(_sub(v, centre)) - radius for v in vertices]
    return {
        "surface": "spherical",
        "centre": list(centre),
        "radius": radius,
        "rms": _rms(residuals),
        "max_residual": max((abs(r) for r in residuals), default=0.0),
        "extent": extent,
    }


# ---------------------------------------------------------------------------
# fit, then rank
# ---------------------------------------------------------------------------


@dataclass
class FaceFit:
    """What one face is, with every residual that decided it.

    ``surface`` is the winning word (one of :data:`SURFACE_CLASSES`); ``fits``
    carries all three attempts, so a caller can see how firmly the winner won
    instead of inferring it from the word alone. ``why`` is this module's own
    sentence when nothing fitted -- the same first-class ``other`` the browser
    reports, never a silent miss.
    """

    face_id: int
    surface: str
    triangles: int
    area: float
    extent: float
    geometry: Dict[str, Any] = field(default_factory=dict)
    fits: Dict[str, Any] = field(default_factory=dict)
    why: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "face_id": self.face_id,
            "surface": self.surface,
            "triangles": self.triangles,
            "area_native2": self.area,
            "extent_native": self.extent,
            "residuals": {
                name: {"rms": fit["rms"], "max": fit["max_residual"]}
                for name, fit in sorted(self.fits.items())
            },
        }
        if self.geometry:
            out["geometry"] = dict(self.geometry)
        if self.why:
            out["why"] = self.why
        return out


def fit_face(mesh: Mesh, face_id: int,
             tolerances: Optional[Dict[str, float]] = None,
             bucket: Optional[Tuple[List[Facet], int]] = None) -> FaceFit:
    """Fit plane, cylinder and sphere to one face; report all three, name one.

    Which one is named is :data:`FITTED_SURFACE_CLASSES`'s order, and the
    control flow below is ``apps/annotate/face_geometry.js``'s ``classifyOne``
    **statement for statement** -- including that a shape's own sub-test failing
    *ends* the classification rather than passing the face to the next shape.
    That constant carries the measurement that ruled out ranking by residual;
    ``tests/test_feature_geometry.py``'s ``[real]`` pairing is what holds the two
    readers to the same answer on every face of every installed mesh.

    Every residual is still in :attr:`FaceFit.fits` whatever is named, which is
    the one thing this reader offers that the browser's does not.

    ``bucket`` is this face's entry from :func:`all_face_facets`, for the
    whole-part caller; one face on its own needs nothing.
    """
    tol = dict(FIT_TOLERANCES)
    tol.update(tolerances or {})
    face_id = int(face_id)
    entry = mesh.face(face_id)
    stats = face_triangle_stats(mesh, face_id, tol, bucket)
    vertices = face_vertices(mesh, face_id)
    # Once, and handed to all three fits: each of them needs it, and computing
    # it per fit was four passes over every vertex of every face.
    centroid_extent = _centroid_and_extent(vertices) if vertices else ((0.0, 0.0, 0.0), 0.0)
    extent = centroid_extent[1]

    area = float(entry.get("area_native2") or 0.0)
    result = FaceFit(face_id=face_id, surface="other", triangles=stats.triangles,
                     area=area, extent=extent)
    largest_face_area = mesh.largest_face_area
    if largest_face_area > 0 and area < tol["degenerate_area_fraction"] * largest_face_area:
        result.why = "a sliver too small to be a feature"
        return result
    if len(vertices) < 3 or stats.area <= 0 or stats.mean_normal is None:
        result.why = "no readable triangles"
        return result

    fits: Dict[str, Any] = {}
    plane = fit_plane(vertices, stats.mean_normal, centroid_extent)
    if plane:
        fits["planar"] = plane
    cylinder = fit_cylinder(vertices, stats.axis, centroid_extent)
    if cylinder:
        fits["cylindrical"] = cylinder
    sphere = fit_sphere(vertices, centroid_extent)
    if sphere:
        centre = tuple(sphere["centre"])
        sphere["normal_spread_deg"] = worst_deviation_deg(
            stats.facets, lambda f: _sub(f.centroid, centre), "radial",
            tol["sliver_area_fraction"])
        # A patch, or a single band of quads? See sphere_min_triangles_per_vertex.
        sphere["triangles_per_vertex"] = (
            stats.triangles / len(vertices) if vertices else 0.0)
        fits["spherical"] = sphere
    result.fits = fits

    def answer(word: str) -> FaceFit:
        result.surface = word
        result.geometry = {k: v for k, v in fits[word].items()
                           if k not in ("surface", "rms", "max_residual", "extent")}
        return result

    def refuse(why: str) -> FaceFit:
        result.why = why
        return result

    # --- planar -------------------------------------------------------------
    # Entering this branch is a COMMITMENT, not an attempt: facet normals that
    # are parallel to a degree say the face is flat, and vertices that then are
    # not in one plane say it is unreadable. Falling through to try a cylinder
    # or a sphere on a face whose own normals already answered is how the two
    # readers came to disagree on ten faces of the three blade meshes, and on
    # two of those Python answered with a 75 mm "sphere" at an RMS of 0.68 --
    # accepted only because the gate is relative to a radius the bad fit chose
    # (found in review, 2026-09-30).
    if plane and stats.worst_normal_deg <= tol["planar_normal_deg"]:
        if extent <= 0 or plane["max_residual"] <= tol["planar_flatness_fraction"] * extent:
            return answer("planar")
        return refuse("parallel facet normals but the vertices are not in one plane")

    # --- cylindrical --------------------------------------------------------
    if stats.axis is None:
        return refuse("no axis could be read")
    if stats.worst_axis_deg > tol["cylinder_axis_deg"]:
        # Not a plane and not a cylinder: a sphere is the last shape asked, and
        # this is the only branch that reaches it. A sphere's facet normals span
        # two dimensions, so there is no axis they all stand perpendicular to.
        return _sphere_or_other(result, answer, refuse, sphere, extent, tol)
    if not cylinder:
        return refuse("the cross-section is too flat to be a circle")
    if cylinder["max_residual"] > tol["cylinder_radial_fraction"] * cylinder["radius"]:
        return refuse("the cross-section is not one circle")
    if cylinder["arc_deg"] < tol["cylinder_min_arc_deg"]:
        return refuse("too narrow an arc to place an axis")
    return answer("cylindrical")


def _sphere_or_other(result: "FaceFit", answer, refuse, sphere, extent: float,
                     tol: Dict[str, float]) -> "FaceFit":
    """The sphere branch and its four refusals, word for word with the browser's.

    Each refusal is a sentence ``apps/annotate/face_geometry.js`` prints too, and
    ``tests/test_feature_geometry.py`` pairs the two sets -- a reason that exists
    on one side only is a reader and a solver being told different things about
    the same face.
    """
    if not sphere:
        return refuse("neither a plane, a cylinder nor a sphere")
    if sphere["max_residual"] > tol["sphere_radial_fraction"] * sphere["radius"]:
        return refuse("neither a plane, a cylinder nor a sphere")
    if sphere["normal_spread_deg"] > tol["sphere_normal_deg"]:
        return refuse("neither a plane, a cylinder nor a sphere")
    # Not strict here, because the threshold IS the band's own value: a closed
    # band of quads lands exactly on it.
    if sphere["triangles_per_vertex"] <= tol["sphere_min_triangles_per_vertex"]:
        return refuse("one band of quads, which lies on a sphere whatever shape it is")
    if extent < tol["sphere_min_extent_fraction"] * sphere["radius"]:
        return refuse("too small a patch of its own sphere to place a centre")
    return answer("spherical")


def fit_part_faces(mesh: Mesh,
                   tolerances: Optional[Dict[str, float]] = None) -> List[FaceFit]:
    """Every face of one part, fitted -- bucketing the triangle buffer ONCE.

    ``scripts/fit_bound_features.py`` does not use this: a binding names one
    face, and :func:`fit_face` on its own is the cheaper path for one. This is
    for a reader looking at a whole part, and for the tests that measure the
    fitter over the installed store.
    """
    buckets = all_face_facets(mesh)
    return [fit_face(mesh, int(entry["face_id"]), tolerances,
                     buckets.get(int(entry["face_id"])))
            for entry in mesh.faces]


# ---------------------------------------------------------------------------
# placement -- a 3x4 row-major matrix, as provenance.json records one
# ---------------------------------------------------------------------------

#: How many numbers a placement matrix has, and the layout they are in:
#: ``[r00 r01 r02 tx  r10 r11 r12 ty  r20 r21 r22 tz]`` -- rotation rows each
#: followed by that row's translation, which is what rotorkit's
#: ``stepgeom.assembly`` writes into ``provenance.json``'s
#: ``placement_local``/``placement_world`` and what
#: ``C:\\workspace\\rotorkit\\data\\runs/<run>/placements.json`` carries.
PLACEMENT_VALUES = 12


def apply_placement(placement: Sequence[float], point: Sequence[float]) -> Vec:
    """Transform a point by a 3x4 placement. The one arithmetic that turns a
    local-frame fit into an assembly-frame nominal."""
    if len(placement) != PLACEMENT_VALUES:
        raise ValueError(
            f"a placement is {PLACEMENT_VALUES} numbers (3 rows of [r r r t]), "
            f"got {len(placement)}")
    return tuple(
        placement[row * 4 + 0] * point[0]
        + placement[row * 4 + 1] * point[1]
        + placement[row * 4 + 2] * point[2]
        + placement[row * 4 + 3]
        for row in range(3)
    )  # type: ignore[return-value]


def rotate_direction(placement: Sequence[float], direction: Sequence[float]) -> Vec:
    """Transform a **direction** by a placement -- rotation only, no translation.

    Separate from :func:`apply_placement` and not a flag on it: an axis
    direction moved by a translation is the single most plausible-looking wrong
    answer this file can produce, and it would still be a unit-ish vector
    pointing somewhere believable.
    """
    if len(placement) != PLACEMENT_VALUES:
        raise ValueError(
            f"a placement is {PLACEMENT_VALUES} numbers (3 rows of [r r r t]), "
            f"got {len(placement)}")
    return _unit(tuple(
        placement[row * 4 + 0] * direction[0]
        + placement[row * 4 + 1] * direction[1]
        + placement[row * 4 + 2] * direction[2]
        for row in range(3)
    ))

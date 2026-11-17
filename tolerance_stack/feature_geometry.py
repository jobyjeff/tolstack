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
import re
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

#: Which surface class an element's NAME asks for -- the shape rule the
#: annotator's suggestions colour by (``apps/annotate/suggestions.js``,
#: ``AA.SUGGESTION_RULES``) and ``scripts/propose_bindings.py`` refuses a
#: proposal by ("a diameter on a flat face"). **These three tuples are the
#: definition, for both languages**: they moved here from the JS on 2026-10-28
#: so the refusal and the colouring cannot disagree, and they reach the browser
#: through ``apps/viewer/vocab.gen.js`` like every other word Python owns. The
#: reader-facing sentence for each rule stays in JS, keyed by these keys.
#:
#: One entry per rule, the three tuples in the same order, matched in ORDER --
#: the first rule with a word hit wins, so the specific feature words beat the
#: generic ones. **The sphere rule is last on purpose**: three live interfaces
#: are named "spherical bearing face against ..." and "spherical bearing width"
#: -- flat faces and a width on a part that happens to be a spherical bearing --
#: and asked earlier it would take all three on the word "spherical".
#: Ambiguous words ("seat": a bore on a bearing, a flat on a spring) are left
#: out rather than guessed; widen this from a real miss, not from imagination.
SUGGESTION_RULE_KEYS = ("diametral", "between_faces", "spherical_centre")
SUGGESTION_RULE_SURFACES = ("cylindrical", "planar", "spherical")
#: Each rule's words, space-separated (the generated module carries flat lists
#: of strings, ``LINKAGE_JOINT_ROW_SIGNATURES``'s precedent). Matched on word
#: boundaries, case-insensitively, a hyphen counting as one: "dia" never fires
#: on "diagonal", and "cotter-pin" hits "pin".
SUGGESTION_RULE_WORDS = (
    "diameter dia bore hole od id shank shaft journal barrel thread pin cylindrical",
    "thickness length width height depth grip flange face shoulder gap protrusion step land",
    "sphere spherical ball centre center",
)


#: The joint kinds a node's stated ``interface`` word asks a CYLINDER for
#: (``tolerance_stack.topology.SHARED_NODE_INTERFACES``; 2026-11-17, handoff
#: ``a_joint_says_what_kind_it_is``): a rotary joint is a journal in a bore and
#: a fastener pattern is its holes, so a pick ranks the faces coaxial with the
#: bound mate and a hole of a pattern offers the whole pattern. Only the words
#: added with that handoff are here; the older words leave the question to the
#: element's name, as they did. **This tuple is the definition, for both
#: languages** (``AA.endSurfaceClass`` reads it through the generated
#: vocabulary).
CYLINDRICAL_INTERFACE_KINDS = ("revolute", "fastener_pattern")

#: The class :data:`CYLINDRICAL_INTERFACE_KINDS` asks for.
CYLINDRICAL = "cylindrical"


def required_surface_class(text: Optional[str]) -> Optional[Dict[str, str]]:
    """The class a string of words asks for, or ``None`` -- ``AA.requiredSurfaceClass``.

    ``{"surface", "rule", "word"}``. Python's ``\\b`` and the browser's agree on
    the ASCII names this reads; ``tests/test_feature_geometry.py`` runs the same
    cases through both.
    """
    words = str(text or "")
    if not words:
        return None
    for key, surface, rule_words in zip(SUGGESTION_RULE_KEYS, SUGGESTION_RULE_SURFACES,
                                        SUGGESTION_RULE_WORDS):
        for word in rule_words.split(" "):
            if re.search(r"\b" + re.escape(word) + r"\b", words, re.IGNORECASE):
                return {"surface": surface, "rule": key, "word": word}
    return None


def end_surface_class(edge_name: Optional[str], node_name: Optional[str],
                      declared: Optional[str] = None,
                      interface: Optional[str] = None) -> Optional[Dict[str, str]]:
    """The class for ONE END of a dimension -- ``AA.endSurfaceClass``.

    A class the node DECLARES (its ``face.surface``, ``tolerance_stack.topology``
    ``NODE_FACE_FIELDS``) answers before any word does: the words are a guess at
    the shape, the declaration is the author saying it. The node's stated
    joint kind (its ``interface``, :data:`CYLINDRICAL_INTERFACE_KINDS`) answers
    next, for the same reason. Otherwise the interface's own name is asked
    first and the dimension's second, because the thing being bound IS the
    interface; ``where`` says which answered.
    """
    if declared:
        return {"surface": declared, "rule": None, "word": None, "where": "declared"}
    if interface in CYLINDRICAL_INTERFACE_KINDS:
        return {"surface": CYLINDRICAL, "rule": None, "word": interface, "where": "joint"}
    found = required_surface_class(node_name)
    if found:
        return dict(found, where="interface")
    found = required_surface_class(edge_name)
    if found:
        return dict(found, where="dimension")
    return None

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
    # A face whose facet normals FAIL cylinder_axis_deg can still be a cylinder:
    # a facet's normal tilts off the axis by its own chord sagitta, and short
    # fan triangles at a trimmed boundary tilt by degrees (the pitch plate's
    # Ø41.04 pilot boss, faces 487/521: 3.46, on nodes that are on one cylinder
    # to 1e-6 mm). That tilt is set by the deflection; the NODES are on the
    # surface exactly. So after the sphere has refused such a face, the
    # cylinder is asked again of the nodes alone (refine_cylinder), and it
    # answers only when they sit on it to the float32 resolution of the face's
    # own coordinates -- this many units of |p|max * 2^-23, a count with no
    # length in it.
    #
    # Measured 2026-11-05 over every face the facet test refuses (16434 of
    # 36294 store-wide; LESSONS_20261105_a_two_row_cylinder_band_fits_as_a_cylinder):
    # exact nodes rounded to float32 put a cylinder at ~0.7 units by the
    # arithmetic, observed 0.06-0.6 on the clearly-round faces, and the
    # design-round radii (8.000, 36.500, 61.090) reach 2.51. From 3 up the
    # radii stop being round (12.914, 38.015, 4.070 ...) -- surfaces NEAR a
    # cylinder, which is what "other" is for. The distribution has no gap, so
    # this is a judgement on named faces rather than a derivation, and it is
    # the strict side of it.
    "cylinder_node_ulps": 3.0,
    # ...and the nodes have to OVER-determine it: a cylinder has five degrees
    # of freedom, so six nodes always sit on one to almost nothing. Eight
    # leaves three to disagree; the smallest face the rule admits has eight.
    "cylinder_node_min_vertices": 8,
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
    # **The margin is thin by design, and it is not a margin.** Measured over
    # the whole store after the fix: the lowest ratio on any ACCEPTED spherical
    # face is 1.0357 (a ~1 mm spherical feature on the instrumented blade, 29
    # triangles over 28 nodes), and the accepted distribution runs on up from
    # there -- 1.04, 1.05, 1.06 ... So there is no comfortable gap to sit in,
    # and none is wanted: the boundary is EXACT for the degenerate case this
    # refuses, because a regular two-row band is at or below 1 by the arithmetic
    # above whatever S is. Anything above it has a third row somewhere.
    #
    # The bearing's own numbers, for a reader checking the derivation by hand:
    # the MS14101-3's four spherical faces are 1.4783 twice (the race seat) and
    # 1.5714 twice (the ball), MS14103-3's four are 1.2609, and its own refused
    # bands are 0.9286.
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
    "cylinder_node_ulps": "cylinderNodeUlps",
    "cylinder_node_min_vertices": "cylinderNodeMinVertices",
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


#: How many Gauss-Newton steps :func:`refine_cylinder` takes at most. Not a
#: tolerance -- the steps converge in two or three from a facet axis, and the
#: best step is kept whatever the count -- so it is not in FIT_TOLERANCES.
CYLINDER_REFINE_STEPS = 6


def refine_cylinder(vertices: Sequence[Vec], axis: Vec,
                    centroid_extent: Optional[Tuple[Vec, float]] = None,
                    ) -> Optional[Dict[str, Any]]:
    """The cylinder through the VERTICES, starting from ``axis`` and tilting it
    until the nodes sit at one radius -- a geometric fit, where
    :func:`fit_cylinder` takes the axis it is handed as given.

    Why a second axis: the facet axis is the direction the facet NORMALS never
    point in, and a facet's normal is tilted off the true axis by its own chord
    sagitta, which the tessellation deflection sets. Where a trimmed boundary
    leaves short fan triangles, that tilt reaches degrees (the pitch plate's
    pilot boss, faces 487/521: 3.46 degrees on a face whose nodes are on one
    cylinder to 1e-6 mm). The NODES are on the surface exactly, so an axis read
    from them is deflection-independent.

    Each step is one linearised solve in the circle's centre, its radius and
    two small tilts of the axis, then a fresh :func:`fit_cylinder` about the
    tilted axis; the step with the smallest worst residual is returned. ``None``
    when the start does not fit or a step's system is singular (a flat ring has
    no axial spread to tilt against).
    """
    centroid_extent = centroid_extent or _centroid_and_extent(vertices)
    centroid = centroid_extent[0]
    best = fit_cylinder(vertices, axis, centroid_extent)
    current = best
    for _ in range(CYLINDER_REFINE_STEPS):
        if current is None:
            break
        a = tuple(current["axis"])
        abs_axis = [abs(c) for c in a]
        seed = [0.0, 0.0, 0.0]
        seed[abs_axis.index(min(abs_axis))] = 1.0
        u = _unit(_cross(a, tuple(seed)))
        v = _unit(_cross(a, u))
        p = _sub(tuple(current["axis_point"]), centroid)
        cx, cy, r = _dot(p, u), _dot(p, v), current["radius"]
        jtj = [[0.0] * 5 for _ in range(5)]
        jtd = [0.0] * 5
        for point in vertices:
            rel = _sub(point, centroid)
            dx, dy, h = _dot(rel, u) - cx, _dot(rel, v) - cy, _dot(rel, a)
            dist = math.hypot(dx, dy)
            if not dist > 0:
                continue
            ex, ey = dx / dist, dy / dist
            row = (-ex, -ey, -1.0, -ex * h, -ey * h)
            d = dist - r
            for i in range(5):
                jtd[i] -= row[i] * d
                for j in range(i, 5):
                    jtj[i][j] += row[i] * row[j]
        for i in range(5):
            for j in range(i):
                jtj[i][j] = jtj[j][i]
        step = _solve(jtj, jtd)
        if step is None:
            break
        tilted = _unit(tuple(a[k] + step[3] * u[k] + step[4] * v[k] for k in range(3)))
        current = fit_cylinder(vertices, tilted, centroid_extent)
        if current and current["max_residual"] < best["max_residual"]:
            best = current
        if math.hypot(step[3], step[4]) < 1e-12:
            break
    return best


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
        # Not a plane and not a cylinder by its facets: a sphere is asked next,
        # and this is the only branch that reaches it. A sphere's facet normals
        # span two dimensions, so there is no axis they all stand perpendicular
        # to. The sphere answers FIRST, so no face that is a sphere today can
        # become a cylinder by the node test after it.
        verdict = _sphere_or_other(result, answer, refuse, sphere, extent, tol)
        if verdict.surface == "spherical":
            return verdict
        exact = _cylinder_by_nodes(vertices, cylinder, stats.axis, centroid_extent, tol)
        if exact is None:
            return verdict
        fits["cylindrical"] = exact
        result.why = None
        return answer("cylindrical")
    if not cylinder:
        return refuse("the cross-section is too flat to be a circle")
    if cylinder["max_residual"] > tol["cylinder_radial_fraction"] * cylinder["radius"]:
        return refuse("the cross-section is not one circle")
    if cylinder["arc_deg"] < tol["cylinder_min_arc_deg"]:
        return refuse("too narrow an arc to place an axis")
    return answer("cylindrical")


#: One unit of float32 resolution at a coordinate of magnitude 1: a stored
#: position ``p`` is within half of ``|p| * FLOAT32_RESOLUTION`` of the double
#: OCC computed. What ``cylinder_node_ulps`` counts in.
FLOAT32_RESOLUTION = 2.0 ** -23


def _cylinder_by_nodes(vertices: Sequence[Vec], facet_cylinder: Optional[Dict[str, Any]],
                       axis: Vec, centroid_extent: Tuple[Vec, float],
                       tol: Dict[str, float]) -> Optional[Dict[str, Any]]:
    """The cylinder the nodes sit on, or ``None`` -- asked only of a face whose
    facets failed ``cylinder_axis_deg`` and whose sphere was refused. See
    ``cylinder_node_ulps`` for the measurement; no reason sentence of its own,
    because a face it does not answer keeps the sphere's.

    The cylinder about the FACET axis has to pass the ordinary radial test
    first, so the facet-normal test is the only one this ever overrides -- and
    the refinement runs on a third of the faces it otherwise would (every face
    it admits passes it, the worst at 1.8 percent)."""
    if len(vertices) < tol["cylinder_node_min_vertices"]:
        return None
    if (not facet_cylinder or facet_cylinder["max_residual"]
            > tol["cylinder_radial_fraction"] * facet_cylinder["radius"]):
        return None
    fit = refine_cylinder(vertices, axis, centroid_extent)
    if not fit:
        return None
    magnitude = max(abs(c) for v in vertices for c in v)
    if fit["max_residual"] > tol["cylinder_node_ulps"] * magnitude * FLOAT32_RESOLUTION:
        return None
    if fit["arc_deg"] < tol["cylinder_min_arc_deg"]:
        return None
    return fit


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
# one surface, several faces (handoff a_feature_is_bound_once_to_a_set_of_faces)
# ---------------------------------------------------------------------------

#: When two faces of ONE mesh are one underlying surface: a cylinder a STEP
#: export split into arcs, two coaxial seats of one bore, coplanar feet. Each
#: is a fraction of the face's own size or an angle, so none assumes a unit.
#:
#: Measured 2026-11-12 over every same-class face pair of six installed meshes
#: (pitch plate 215177-001, gas-spring mount 213668-002, bushing 214820-002,
#: hub 214373-002, piston 214700-002, tangential link mount 215175-001; 10838
#: cylinder pairs and 3992 plane pairs within a loose window):
#:
#: * ``radius_fraction``: cylinder pairs that are one surface agree on radius
#:   to <= 1.1e-5 of it (the split pilot boss of the pitch plate, faces
#:   487/521: 1.2e-15; the hub's 43.405 bands: 1.0e-6); the nearest pair that
#:   is two surfaces is 1.44e-4 apart (the link mount's 111.997/112.013 bands,
#:   a 0.016 mm step), and 1375/1458 on the pitch plate (3.975 against 3.983)
#:   are 1.94e-3 apart. 5e-5 sits between, x4.5 above the one and x2.9 below
#:   the other.
#: * ``axis_distance_fraction`` (the two axis lines' separation, of the
#:   radius): one-surface pairs are <= 1e-4 (the dense population), with a thin
#:   tail to 1.2e-3 on narrow fillet arcs whose axis position is poorly
#:   determined; different holes of one radius are >= 2.4e-2 apart (the 5.5
#:   bolt circle: 0.18). 2e-3 keeps the tail and refuses every hole pattern.
#: * ``axis_deg``: well-conditioned pairs agree to 1e-4 degrees; the narrow
#:   arcs to 0.17. 0.2 degrees.
#: * ``plane_offset_fraction`` (offset difference, of the larger face's
#:   extent): coplanar pairs are <= 1e-5, then the population thins to 13 pairs
#:   at 1e-4 and rises again at 1e-3 (real steps of a few hundredths of a mm).
#:   1e-4.
#: * ``plane_normal_deg``: coplanar pairs are <= 3e-4 degrees apart, the next
#:   population is at 1 degree. 0.1. Same SENSE: two faces of a plate's two
#:   sides face apart and are not one surface.
#: * ``sphere_centre_fraction``: no installed part carries a split ball to
#:   measure; the cylinder's axis-distance number, for the same reason (a
#:   centre is located as well as an axis line is).
SAME_SURFACE_TOLERANCES: Dict[str, float] = {
    "radius_fraction": 5e-5,
    "axis_distance_fraction": 2e-3,
    "axis_deg": 0.2,
    "plane_offset_fraction": 1e-4,
    "plane_normal_deg": 0.1,
    "sphere_centre_fraction": 2e-3,
}

#: ``SAME_SURFACE_TOLERANCES`` key -> the ``AA.SAME_SURFACE`` key that holds the
#: same number in the annotator, which sweeps a picked face's siblings by it.
JS_SAME_SURFACE_NAMES = {
    "radius_fraction": "radiusFraction",
    "axis_distance_fraction": "axisDistanceFraction",
    "axis_deg": "axisDeg",
    "plane_offset_fraction": "planeOffsetFraction",
    "plane_normal_deg": "planeNormalDeg",
    "sphere_centre_fraction": "sphereCentreFraction",
}


def surface_record(fit: FaceFit) -> Optional[Dict[str, Any]]:
    """A fitted face as :func:`same_surface` reads it: the class, the face's
    extent and its geometry -- or ``None`` for an ``other`` face, which is one
    surface with nothing."""
    if fit.surface not in FITTED_SURFACE_CLASSES:
        return None
    return dict(fit.geometry, surface=fit.surface, extent=fit.extent)


def same_surface(a: Dict[str, Any], b: Dict[str, Any],
                 tolerances: Optional[Dict[str, float]] = None) -> bool:
    """Are two fitted faces of one mesh (:func:`surface_record`) one surface?

    Coaxial with equal radius (cylinders), coplanar facing the same way
    (planes), concentric with equal radius (spheres), each within
    :data:`SAME_SURFACE_TOLERANCES`. Different classes never are.
    """
    tol = dict(SAME_SURFACE_TOLERANCES)
    tol.update(tolerances or {})
    if not a or not b or a.get("surface") != b.get("surface"):
        return False
    kind = a["surface"]
    if kind == "planar":
        if _angle_between_deg(a["normal"], b["normal"]) > tol["plane_normal_deg"]:
            return False
        normal = _unit(a["normal"])
        gap = abs(_dot(normal, _sub(b["point"], a["point"])))
        return gap <= tol["plane_offset_fraction"] * max(a.get("extent") or 0.0, b.get("extent") or 0.0)
    radius = max(a["radius"], b["radius"])
    if abs(a["radius"] - b["radius"]) > tol["radius_fraction"] * radius:
        return False
    if kind == "spherical":
        return _norm(_sub(a["centre"], b["centre"])) <= tol["sphere_centre_fraction"] * radius
    if kind != "cylindrical":
        return False
    angle = _angle_between_deg(a["axis"], b["axis"])
    if min(angle, 180.0 - angle) > tol["axis_deg"]:
        return False
    direction = _unit(a["axis"])
    delta = _sub(b["axis_point"], a["axis_point"])
    perpendicular = _norm(_sub(delta, _scale(direction, _dot(delta, direction))))
    return perpendicular <= tol["axis_distance_fraction"] * radius


# ---------------------------------------------------------------------------
# a hole pattern: N like holes on one plane (handoff
# a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added, 2026-11-15)
# ---------------------------------------------------------------------------

#: When two cylindrical faces of ONE mesh are holes of one pattern: the same
#: radius, parallel axes, NOT one surface (:func:`same_surface` -- that is the
#: same hole), and their axis points on one plane normal to the axis (Jeff:
#: "located axially on the same plane (or nearly the same plane)"). Each hole
#: must also be WHOLE -- its faces on that surface go round.
#:
#: Measured 2026-11-15 over every cylindrical face of v2's fifteen installed
#: meshes, holes grouped by :func:`same_surface` (the table is in
#: ``docs/sessions/lessons/LESSONS_20261115_a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added.md``):
#:
#: * ``radius_fraction``: holes of one pattern agree to <= 3.2e-5 of the radius
#:   (the tangential link mount's 2.4998/2.4999 holes, whose axes also wobble);
#:   the nearest parallel coplanar whole hole that is NOT a member is 0.0999 off
#:   (the tangential link's 7.94 bores against 7.14). 1e-3: x31 above the one,
#:   x100 below the other. SAME_SURFACE's 5e-5 would sit x1.6 above members.
#: * ``axis_deg``: members are parallel to <= 0.185 degrees (the same mount --
#:   its holes' fitted axes, not the part); the nearest same-radius coplanar
#:   whole hole that is not parallel is 9.3 degrees off. 1.0.
#: * ``axial_offset_fraction`` (the two axis points' separation ALONG the mean
#:   axis, of the radius): members are <= 0.0085 (the mount again); the nearest
#:   same-radius parallel whole hole on another plane is 0.106 off (two 1.85
#:   holes of the hub, 0.195 mm apart axially). 0.03.
#: * ``whole_arc_deg``: a hole's faces on its surface sum to 360 degrees (two
#:   halves) or 720 (two seats); the largest arc of a cylinder that is not
#:   round is 273 (a pitch-link clevis). 300. Without it the tier joins
#:   fillets -- 90-degree arcs of one radius at one height are everywhere.
#: * ``circle_fraction`` (the hole centres' worst distance off their fitted
#:   circle, of its radius) and ``circle_max_spread``: see :func:`hole_pattern`.
PATTERN_TOLERANCES: Dict[str, float] = {
    "radius_fraction": 1e-3,
    "axis_deg": 1.0,
    "axial_offset_fraction": 0.03,
    "whole_arc_deg": 300.0,
    "circle_fraction": 1e-3,
    "circle_max_spread": 10.0,
}

#: ``PATTERN_TOLERANCES`` key -> the ``AA.PATTERN`` key holding the same number
#: in the annotator, which offers a picked hole's pattern by it.
JS_PATTERN_NAMES = {
    "radius_fraction": "radiusFraction",
    "axis_deg": "axisDeg",
    "axial_offset_fraction": "axialOffsetFraction",
    "whole_arc_deg": "wholeArcDeg",
    "circle_fraction": "circleFraction",
    "circle_max_spread": "circleMaxSpread",
}

#: The word a face set's fit carries when it is a hole pattern rather than one
#: surface. Not a face class (:data:`SURFACE_CLASSES` is unchanged): no single
#: face is a pattern, and a consumer that reads ``surface == "cylindrical"`` and
#: then an ``axis_point`` must never be handed N holes as one cylinder.
PATTERN_SURFACE = "hole_pattern"


def _aligned_axes(a: Sequence[float], b: Sequence[float]) -> Tuple[Vec, Vec]:
    """Both axes as unit vectors pointing the same way (an axis is a line)."""
    ua, ub = _unit(a), _unit(b)
    if _dot(ua, ub) < 0:
        ub = _scale(ub, -1.0)
    return ua, ub


def like_holes(a: Dict[str, Any], b: Dict[str, Any],
               tolerances: Optional[Dict[str, float]] = None) -> bool:
    """Are two cylindrical faces of one mesh (:func:`surface_record`) holes of
    one pattern? Same radius, parallel, not one surface, axis points on one
    plane normal to the mean axis -- each within :data:`PATTERN_TOLERANCES` --
    and not overlapping (axes more than a diameter apart).
    ``AA.likeHoles``, statement for statement. Wholeness is the set's, not the
    pair's (:func:`pattern_siblings`)."""
    tol = dict(PATTERN_TOLERANCES)
    tol.update(tolerances or {})
    if not a or not b or a.get("surface") != "cylindrical" or b.get("surface") != "cylindrical":
        return False
    radius = max(a["radius"], b["radius"])
    if not radius > 0 or abs(a["radius"] - b["radius"]) > tol["radius_fraction"] * radius:
        return False
    ua, ub = _aligned_axes(a["axis"], b["axis"])
    if _angle_between_deg(ua, ub) > tol["axis_deg"]:
        return False
    if same_surface(a, b):
        return False
    mean = _unit(_sub(ua, _scale(ub, -1.0)))
    delta = _sub(b["axis_point"], a["axis_point"])
    along = _dot(mean, delta)
    if abs(along) > tol["axial_offset_fraction"] * radius:
        return False
    # Two holes do not overlap: their axes are more than a diameter apart.
    # A fact rather than a threshold -- and the hub's offset bores (two 80 mm
    # cylinders 0.8 mm apart, on one plane) are what it refuses.
    return _norm(_sub(delta, _scale(mean, along))) > 2.0 * radius


def pattern_siblings(records: Dict[int, Dict[str, Any]], picked: int,
                     tolerances: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """The holes of a picked hole's pattern: ``AA.surfaceSiblings``' third tier,
    without the touch sweep (which only decides swept against offered, and a
    pattern takes both). ``records`` is a part's :func:`surface_record` by face
    id (``other`` faces as ``None`` or absent).

    The picked hole is the pick and every face :func:`same_surface` with it; it
    must be whole. Another hole joins when one of its faces is
    :func:`like_holes` with the pick, and comes as all of its faces on its
    surface, and only if whole. Returns ``{"faces": [ids, ascending, the picked
    hole's excluded], "holes": N including the picked}`` -- ``holes`` 0 when
    there is no pattern."""
    tol = dict(PATTERN_TOLERANCES)
    tol.update(tolerances or {})
    out: Dict[str, Any] = {"faces": [], "holes": 0}
    a = records.get(picked)
    if not a or a.get("surface") != "cylindrical":
        return out
    cylinders = {fid: r for fid, r in records.items() if r and r.get("surface") == "cylindrical"}

    def hole(seed: int) -> List[int]:
        return sorted(fid for fid, r in cylinders.items()
                      if fid == seed or same_surface(cylinders[seed], r))

    def whole(faces: Sequence[int]) -> bool:
        return sum(cylinders[f].get("arc_deg", 0.0) for f in faces) >= tol["whole_arc_deg"]

    own = hole(picked)
    if not whole(own):
        return out
    taken = set(own)
    faces: List[int] = []
    holes = 1
    for fid in sorted(cylinders):
        if fid in taken or not like_holes(a, cylinders[fid], tol):
            continue
        members = hole(fid)
        taken.update(members)
        if whole(members):
            faces.extend(members)
            holes += 1
    if holes < 2:
        return out
    return {"faces": sorted(faces), "holes": holes}


def surface_groups(records: Sequence[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    """Fitted faces of one mesh, grouped into surfaces by :func:`same_surface`
    (a face joins the first group holding a face it is one surface with), in
    first-seen order. Two seats of a bore are one group; two holes are two."""
    groups: List[List[Dict[str, Any]]] = []
    for r in records:
        for g in groups:
            if any(same_surface(r, other) for other in g):
                g.append(r)
                break
        else:
            groups.append([r])
    return groups


def hole_pattern(records: Sequence[Dict[str, Any]],
                 tolerances: Optional[Dict[str, float]] = None) -> Optional[Dict[str, Any]]:
    """What a set of cylindrical faces is when it is a hole pattern, else
    ``None``. ``AA.holePattern``, step for step, on :func:`surface_record`\\ s.

    The faces are grouped into holes by :func:`same_surface`; it is a pattern
    when there are two or more holes, each whole (its faces' arcs sum to
    ``whole_arc_deg``), and every hole is :func:`like_holes` with the first
    (some face of it with some face of the first). Then:

    * ``holes`` -- the count; ``radius`` -- the mean of the faces' radii;
    * ``axis`` -- the mean direction, sign-aligned to the first face's;
    * ``centres`` -- each hole's centre: the mean of its faces' axis points
      (each on the axis at its own face's mid-height);
    * ``on_circle`` and, when it is, ``circle_centre`` / ``circle_radius`` /
      ``circle_residual``: a circle fitted to the centres in the plane normal
      to the axis. On it when there are three or more holes, the fit exists,
      every centre is within ``circle_fraction`` of the circle's radius, and
      that radius is at most ``circle_max_spread`` times the largest distance
      between two centres -- a straight row fits a circle the size of the
      noise, and "on a circle" there would be a number about nothing. Three
      holes always lie on one circle; it is reported, and it is a fact.

    A measurement of a mesh, never a tolerance (``CLAUDE.md``).
    """
    tol = dict(PATTERN_TOLERANCES)
    tol.update(tolerances or {})
    if len(records) < 2 or any(not r or r.get("surface") != "cylindrical" for r in records):
        return None
    holes = surface_groups(records)
    if len(holes) < 2:
        return None
    # Every hole whole, as the offer requires (pattern_siblings): two half
    # holes Shift-clicked together are two arcs, not a pattern of two.
    if any(sum(r.get("arc_deg", 0.0) for r in h) < tol["whole_arc_deg"] for h in holes):
        return None
    first = holes[0]
    for h in holes[1:]:
        if not any(like_holes(x, y, tol) for x in first for y in h):
            return None
    reference = _unit(first[0]["axis"])
    total = [0.0, 0.0, 0.0]
    for r in records:
        u = _unit(r["axis"])
        if _dot(u, reference) < 0:
            u = _scale(u, -1.0)
        total = [t + c for t, c in zip(total, u)]
    axis = _unit(total)
    radius = sum(r["radius"] for r in records) / len(records)
    centres: List[Vec] = []
    for h in holes:
        s = [0.0, 0.0, 0.0]
        for r in h:
            s = [t + c for t, c in zip(s, r["axis_point"])]
        centres.append(tuple(c / len(h) for c in s))  # type: ignore[arg-type]
    out: Dict[str, Any] = {"holes": len(holes), "radius": radius, "axis": list(axis),
                           "centres": [list(c) for c in centres], "on_circle": False}
    if len(centres) < 3:
        return out
    mean = tuple(sum(c[k] for c in centres) / len(centres) for k in range(3))
    abs_axis = [abs(c) for c in axis]
    seed = [0.0, 0.0, 0.0]
    seed[abs_axis.index(min(abs_axis))] = 1.0
    u = _unit(_cross(axis, tuple(seed)))
    v = _unit(_cross(axis, u))
    xs = [_dot(_sub(c, mean), u) for c in centres]
    ys = [_dot(_sub(c, mean), v) for c in centres]
    fit = fit_circle2(xs, ys)
    if not fit:
        return out
    residual = max(abs(math.hypot(x - fit["cx"], y - fit["cy"]) - fit["r"]) for x, y in zip(xs, ys))
    spread = max(_norm(_sub(p, q)) for p in centres for q in centres)
    if residual > tol["circle_fraction"] * fit["r"] or fit["r"] > tol["circle_max_spread"] * spread:
        return out
    out["on_circle"] = True
    out["circle_centre"] = [mean[k] + u[k] * fit["cx"] + v[k] * fit["cy"] for k in range(3)]
    out["circle_radius"] = fit["r"]
    out["circle_residual"] = residual
    return out


def fit_face_set(mesh: Mesh, face_ids: Sequence[int],
                 tolerances: Optional[Dict[str, float]] = None) -> FaceFit:
    """ONE nominal through several faces of one feature: one cylinder through
    both seats of a bore, one plane through all the feet.

    Each face is classified on its own first (:func:`fit_face`). They must all
    be one class; then that class is fitted to the union of their vertices --
    a plane about the area-weighted normal of the faces, a cylinder refined
    from the first face's axis (:func:`refine_cylinder`), a sphere outright.
    A set whose faces disagree on class, or include an ``other``, is ``other``
    with the reason. One face is :func:`fit_face` itself.

    Faces of one class on more than one surface (:func:`surface_groups`) are
    not fitted as one: a hole pattern (:func:`hole_pattern`) comes back as
    surface :data:`PATTERN_SURFACE` with the pattern as its ``geometry`` --
    hole count, hole radius, axis, centres and, when they are on one, the
    circle -- and any other mix is ``other`` with the reason.

    The result is a :class:`FaceFit` whose ``face_id`` is the first face's,
    whose ``area`` is the sum, and whose ``geometry`` is the shape
    :func:`fit_face` gives, so a consumer reads one fit or a set's the same way.
    """
    ids = [int(f) for f in face_ids]
    if not ids:
        raise MeshError("a face set needs at least one face")
    singles = [fit_face(mesh, fid, tolerances) for fid in ids]
    if len(ids) == 1:
        return singles[0]
    first = singles[0]
    combined = FaceFit(face_id=first.face_id, surface="other",
                     triangles=sum(s.triangles for s in singles),
                     area=sum(s.area for s in singles), extent=0.0)
    classes = {s.surface for s in singles}
    if len(classes) != 1 or first.surface not in FITTED_SURFACE_CLASSES:
        combined.why = ("the faces are not one kind of surface: "
                      + ", ".join(f"{s.face_id} {s.surface}" for s in singles))
        return combined
    vertices: List[Vec] = []
    for fid in ids:
        vertices.extend(face_vertices(mesh, fid))
    centroid_extent = _centroid_and_extent(vertices)
    combined.extent = centroid_extent[1]
    kind = first.surface
    records = [surface_record(s) for s in singles]
    if len(surface_groups(records)) > 1:
        # Faces of more than one surface: a hole pattern says what it is; any
        # other mix is no one shape, and one surface through it would be a
        # plausible number about nothing (the 2026-11-13 issue's refusal).
        pattern = hole_pattern(records) if kind == "cylindrical" else None
        if not pattern:
            combined.why = (f"the faces are not one {kind} surface"
                            + (" and not one pattern of like holes" if kind == "cylindrical" else ""))
            return combined
        combined.surface = PATTERN_SURFACE
        combined.geometry = pattern
        return combined
    if kind == "planar":
        weighted = [0.0, 0.0, 0.0]
        for s in singles:
            n = _unit(s.geometry["normal"])
            weighted = [w + c * s.area for w, c in zip(weighted, n)]
        fit = fit_plane(vertices, tuple(weighted), centroid_extent)
    elif kind == "cylindrical":
        fit = refine_cylinder(vertices, tuple(first.geometry["axis"]), centroid_extent)
    else:
        fit = fit_sphere(vertices, centroid_extent)
    if not fit:
        combined.why = f"no single {kind} surface fits the faces together"
        return combined
    combined.fits = {kind: fit}
    combined.surface = kind
    combined.geometry = {k: v for k, v in fit.items() if k not in ("surface", "rms", "max_residual", "extent")}
    return combined


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

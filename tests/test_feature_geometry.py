"""``tolerance_stack.feature_geometry``: the three fits, and the pairing that
keeps them agreeing with the browser's half.

Two kinds of check here, and the second is the one that earns its keep.

**The fits themselves**, against shapes built by hand, so a residual can be
checked against a shape whose answer is known by construction rather than only
ever seen through a classification.

**The pairing with ``apps/annotate/face_geometry.js``.** The arithmetic exists
twice because the browser cannot call Python and a solver's inputs cannot be
produced in a browser (that module's own docstring argues it). What must NOT
exist twice is the vocabulary or the thresholds, so both are read out of their
one definition here: the words through ``scripts/js_vocabulary.py``'s generated
module, and the numbers out of the JS source's own ``AA.FACE_CLASSIFY`` block.
A threshold tightened on one side and not the other is a reader being shown one
answer in the annotator and a solver being handed a different one, with nothing
on either screen saying so.
"""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from tolerance_stack import feature_geometry as fg

REPO_ROOT = Path(__file__).resolve().parent.parent
FACE_GEOMETRY_JS = REPO_ROOT / "apps" / "annotate" / "face_geometry.js"
SUGGESTIONS_JS = REPO_ROOT / "apps" / "annotate" / "suggestions.js"

#: Where installed meshes may live, in resolution order -- the repo-relative
#: path (main checkout), then the main checkout absolute (a worktree's own
#: ``data/`` is empty by design). The same two candidates
#: ``tests/test_part_mesh_aliases.py`` resolves, for the same reason.
MESHES_DIR_CANDIDATES = (
    REPO_ROOT / "data" / "meshes",
    Path("C:/workspace/tolstack/data/meshes"),
)

#: The pitch-link bearing, `MS14101-3` as installed under `213862-002.1`. Keyed
#: by ``part_id`` and never by sha, so a re-tessellation under the same part
#: identity keeps this suite working -- the same rule the alias table follows.
BEARING_PART_ID = "asm217755_MS14101_3_815597cb"


#: A mesh directory is named for its ``source_step_sha256``. Matched rather
#: than merely counting children, because ``data/meshes/README.md`` is TRACKED
#: and is therefore present in every worktree -- a directory that is "not
#: empty" there holds one markdown file and no geometry.
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def meshes_dir() -> Path | None:
    for candidate in MESHES_DIR_CANDIDATES:
        if not candidate.is_dir():
            continue
        if any(SHA256_RE.match(child.name) for child in candidate.iterdir()):
            return candidate
    return None


def mesh_dir_for(part_id: str) -> Path | None:
    root = meshes_dir()
    if root is None:
        return None
    for child in sorted(root.iterdir()):
        provenance = child / "provenance.json"
        if not provenance.is_file():
            continue
        if json.loads(provenance.read_text(encoding="utf-8")).get("part_id") == part_id:
            return child
    return None


# ---------------------------------------------------------------------------
# shapes built by hand
# ---------------------------------------------------------------------------


def sphere_patch(radius, segments, centre=(0.0, 0.0, 0.0)):
    """A lat/long patch, many rows -- what a real spherical face looks like."""
    points = []
    for i in range(segments + 1):
        phi = math.pi / 3 * (i / segments) + math.pi / 6
        for j in range(segments + 1):
            theta = math.pi / 2 * (j / segments)
            points.append((
                centre[0] + radius * math.sin(phi) * math.cos(theta),
                centre[1] + radius * math.sin(phi) * math.sin(theta),
                centre[2] + radius * math.cos(phi),
            ))
    return points


def revolved_band(r0, r1, height, segments, arc_deg=180.0):
    """One band of quads about +Z: two rows of nodes, nothing more."""
    points = []
    span = math.radians(arc_deg)
    for i in range(segments + 1):
        theta = span * i / segments
        for k, r in enumerate((r0, r1)):
            points.append((r * math.cos(theta), r * math.sin(theta), k * height))
    return points


def test_fit_sphere_recovers_a_patch_exactly():
    points = sphere_patch(7.0, 6, centre=(2.0, -3.0, 11.0))
    fit = fg.fit_sphere(points)
    assert fit is not None
    assert fit["radius"] == pytest.approx(7.0, abs=1e-9)
    assert fit["centre"] == pytest.approx([2.0, -3.0, 11.0], abs=1e-9)
    assert fit["max_residual"] < 1e-9


def test_fit_sphere_refuses_a_point_set_that_does_not_determine_one():
    """``None``, never a pseudo-solution: a guessed centre reaches a solver as a
    joint location, and nothing downstream can tell it was guessed."""
    flat = [(float(i), float(j), 5.0) for i in range(4) for j in range(4)]
    assert fg.fit_sphere(flat) is None
    assert fg.fit_sphere([(0, 0, 0), (1, 0, 0), (0, 1, 0)]) is None


def test_two_coaxial_circles_lie_on_a_sphere_whatever_they_bound():
    """The measurement :data:`fg.FITTED_SURFACE_CLASSES` rests on.

    A cylinder band, a cone band and a spherical band all fit a sphere to
    machine precision, because two coaxial circles determine one exactly. So no
    residual threshold can separate them, which is why the order the shapes are
    asked in is the answer and ``sphere_min_triangles_per_vertex`` is the test
    that refuses a band.
    """
    for label, points in (
        ("cylinder", revolved_band(3.0, 3.0, 2.0, 13)),
        ("30-degree cone", revolved_band(3.0, 4.1547, 2.0, 13)),
        ("shallow cone", revolved_band(3.0, 3.2, 2.0, 13)),
    ):
        fit = fg.fit_sphere(points)
        assert fit is not None, label
        assert fit["max_residual"] / fit["radius"] < 1e-12, (
            f"a {label} band did not fit a sphere to machine precision, which is "
            "the premise the shape order rests on -- if this is now false, the "
            "band rule may be replaceable by a residual threshold"
        )


def closed_band(r0, r1, height, segments):
    """A band of quads that closes all the way round.

    ``S`` segments gives ``2S`` nodes and ``2S`` triangles, so
    ``triangles / nodes`` is **exactly 1.0** -- the value an *open* band sits
    below, and the reason the patch gate's comparison is strict.
    """
    points = []
    triangles = []
    for i in range(segments):
        theta = 2 * math.pi * i / segments
        for k, r in enumerate((r0, r1)):
            points.append((r * math.cos(theta), r * math.sin(theta), k * height))
    for i in range(segments):
        a, b = i * 2, i * 2 + 1
        c, d = ((i + 1) % segments) * 2, ((i + 1) % segments) * 2 + 1
        triangles.append((a, c, d))
        triangles.append((a, d, b))
    return points, triangles


def test_a_closed_band_lands_exactly_on_the_patch_threshold():
    """The boundary the gate's comparison has to be strict about.

    A face of ``R`` rows over ``S`` segments has ``2S(R-1)`` triangles over
    ``RS`` nodes closed and ``R(S+1)`` open, so two rows land **at** 1.0 closed
    and below it open, and three rows land above. The gate was written from the
    open case alone and compared ``>=``; a closed cone band therefore fitted a
    sphere to machine precision, passed, and offered an invented centre on its
    axis -- 139 faces store-wide, 18 of them on the hub (found in review,
    2026-09-30).
    """
    points, triangles = closed_band(3.0, 3.0 + 2 * math.tan(math.radians(30)),
                                    2.0, 24)
    assert len(triangles) / len(points) == 1.0, (
        "the fixture is not a closed band -- its triangles/nodes must be exactly 1"
    )
    fit = fg.fit_sphere(points)
    assert fit is not None
    assert fit["max_residual"] / fit["radius"] < 1e-12, (
        "a closed cone band no longer fits a sphere to machine precision, which "
        "is the premise this gate exists for"
    )
    threshold = fg.FIT_TOLERANCES["sphere_min_triangles_per_vertex"]
    assert not (len(triangles) / len(points) > threshold), (
        f"a closed band's ratio must not be above the threshold {threshold}; if "
        "the threshold moved, the derivation in FIT_TOLERANCES moved with it"
    )
    # ...and a three-row patch is above it, so strictness has not refused
    # everything round.
    patch = sphere_patch(5.0, 3)
    rows = 4  # sphere_patch(radius, n) lays down (n + 1) rows of (n + 1) nodes
    assert len(patch) == rows * rows
    assert 2 * (rows - 1) * (rows - 1) / len(patch) > threshold


def test_fit_plane_and_fit_cylinder_agree_with_their_own_shapes():
    plane = fg.fit_plane([(x, y, 5.0) for x in range(4) for y in range(4)])
    assert plane["surface"] == "planar"
    assert abs(abs(plane["normal"][2]) - 1.0) < 1e-9
    assert abs(abs(plane["offset"]) - 5.0) < 1e-9
    assert plane["max_residual"] < 1e-9

    cylinder = fg.fit_cylinder(revolved_band(3.0, 3.0, 2.0, 13), axis=(0.0, 0.0, 1.0))
    assert cylinder["radius"] == pytest.approx(3.0, abs=1e-9)
    assert cylinder["arc_deg"] == pytest.approx(180.0, abs=1.0)


def test_fit_circle2_refuses_collinear_points():
    xs = [math.cos(2 * math.pi * i / 12) * 7 + 4 for i in range(12)]
    ys = [math.sin(2 * math.pi * i / 12) * 7 - 2 for i in range(12)]
    fit = fg.fit_circle2(xs, ys)
    assert fit["r"] == pytest.approx(7.0, abs=1e-9)
    assert fg.fit_circle2([0, 1, 2, 3], [0, 1, 2, 3]) is None


# ---------------------------------------------------------------------------
# placement
# ---------------------------------------------------------------------------


def test_a_direction_is_rotated_and_never_translated():
    """The one mistake this module can make that still looks right.

    A translated axis direction comes back a unit-ish vector pointing somewhere
    believable, and no consumer can tell. Two functions rather than a flag, and
    this is the check that says why.
    """
    placement = [0.0, -1.0, 0.0, 100.0,
                 1.0, 0.0, 0.0, -50.0,
                 0.0, 0.0, 1.0, 7.0]
    assert fg.apply_placement(placement, (1.0, 0.0, 0.0)) == pytest.approx((100.0, -49.0, 7.0))
    assert fg.rotate_direction(placement, (1.0, 0.0, 0.0)) == pytest.approx((0.0, 1.0, 0.0))
    assert fg.rotate_direction(placement, (0.0, 0.0, 1.0)) == pytest.approx((0.0, 0.0, 1.0))


def test_a_placement_of_the_wrong_length_raises_rather_than_guessing():
    with pytest.raises(ValueError):
        fg.apply_placement([1.0, 0.0, 0.0], (1.0, 2.0, 3.0))
    with pytest.raises(ValueError):
        fg.rotate_direction([1.0, 0.0, 0.0], (1.0, 2.0, 3.0))


# ---------------------------------------------------------------------------
# the pairing with the browser's half
# ---------------------------------------------------------------------------


def js_face_classify() -> dict[str, float]:
    """``AA.FACE_CLASSIFY``'s numbers, read out of the JS source."""
    source = FACE_GEOMETRY_JS.read_text(encoding="utf-8")
    match = re.search(r"AA\.FACE_CLASSIFY = Object\.freeze\(\{(.*?)\n  \}\);",
                      source, re.S)
    assert match, (
        "could not find AA.FACE_CLASSIFY in apps/annotate/face_geometry.js -- the "
        "block moved or was renamed; this pairing is the only thing keeping the "
        "two readers' thresholds together, so repoint it rather than drop it"
    )
    return {name: float(value)
            for name, value in re.findall(r"^\s*(\w+):\s*([\d.e+-]+),\s*$",
                                          match.group(1), re.M)}


def test_the_js_threshold_block_is_readable_and_not_empty():
    """The anti-vacuity guard: a scan that silently finds nothing makes the
    pairing below pass against anything."""
    assert len(js_face_classify()) >= len(fg.JS_TOLERANCE_NAMES)


def test_every_shared_threshold_holds_the_same_number_in_both_readers():
    browser = js_face_classify()
    drifted = []
    for python_name, js_name in sorted(fg.JS_TOLERANCE_NAMES.items()):
        assert python_name in fg.FIT_TOLERANCES, (
            f"JS_TOLERANCE_NAMES maps {python_name!r}, which FIT_TOLERANCES does "
            "not declare"
        )
        assert js_name in browser, (
            f"apps/annotate/face_geometry.js has no AA.FACE_CLASSIFY.{js_name} -- "
            f"it is the browser's half of FIT_TOLERANCES[{python_name!r}]"
        )
        if browser[js_name] != fg.FIT_TOLERANCES[python_name]:
            drifted.append(
                f"{python_name}={fg.FIT_TOLERANCES[python_name]} vs "
                f"AA.FACE_CLASSIFY.{js_name}={browser[js_name]}")
    assert drifted == [], (
        "a threshold means one thing in the annotator and another in the fitter: "
        f"{drifted}. The annotator would colour a face the fitter refuses, or the "
        "reverse, with nothing on either surface saying so."
    )


def test_the_surface_class_vocabulary_is_generated_from_this_module():
    """The words, like the numbers, live once. ``apps/viewer/vocab.gen.js`` is
    rendered from :data:`fg.SURFACE_CLASSES` and the annotator reads them from
    there -- so this checks the registry row still points here, which is what
    makes ``tests/test_js_vocabulary_is_generated.py``'s own check cover them."""
    import sys

    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import js_vocabulary  # noqa: PLC0415 -- resolved from scripts/

    assert js_vocabulary.words_for("annotate", "SURFACE_CLASSES") == fg.SURFACE_CLASSES
    source = FACE_GEOMETRY_JS.read_text(encoding="utf-8")
    assert 'AA.SURFACE_CLASSES = VOCAB.list("SURFACE_CLASSES");' in source, (
        "apps/annotate/face_geometry.js declares its own surface classes again -- "
        "a class name spelled twice is this repo's most-repeated defect"
    )


def test_other_is_the_last_word_and_is_never_fitted():
    assert fg.SURFACE_CLASSES[-1] == "other"
    assert "other" not in fg.FITTED_SURFACE_CLASSES
    assert fg.FITTED_SURFACE_CLASSES == ("planar", "cylindrical", "spherical"), (
        "the order the shapes are asked in moved -- it is the answer, not a "
        "preference (see FITTED_SURFACE_CLASSES' own comment)"
    )


def test_the_suggestion_rule_for_a_sphere_is_asked_last():
    """The rule order is load-bearing and lives in JS; this is the Python-side
    reader that says so where a changed order would otherwise only be caught by
    a browser suite nobody runs in a worktree.

    Three live interface names contain "spherical" and are not spheres -- two
    flat faces and a width. Asked before the planar row, the sphere rule takes
    all three.
    """
    source = SUGGESTIONS_JS.read_text(encoding="utf-8")
    block = re.search(r"AA\.SUGGESTION_RULES = Object\.freeze\(\[(.*?)\n  \]\);",
                      source, re.S)
    assert block, (
        "could not find AA.SUGGESTION_RULES in apps/annotate/suggestions.js -- "
        "the table moved or was renamed; repoint this rather than drop it"
    )
    keys = re.findall(r'key: "(\w+)",', block.group(1))
    assert keys, "could not read AA.SUGGESTION_RULES' keys out of suggestions.js"
    assert keys[-1] == "spherical_centre", (
        f"the suggestion rules are asked in the order {keys}; the sphere row must "
        "be last, or `spherical bearing face against the flanged bushing's "
        "flange` -- a FLAT face -- reads as a ball"
    )


# ---------------------------------------------------------------------------
# [real] the installed bearing
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    mesh_dir_for(BEARING_PART_ID) is None,
    reason="no installed MS14101-3 mesh (data/ is gitignored, main checkout "
           "only -- see data/meshes/README.md); this needs real geometry",
)
def test_real_the_pitch_link_bearing_reads_as_its_own_catalog_page():
    """[real] tier: the geometry reader against a part this repo has read a
    document for.

    The numbers are ``docs/spec_library/events/0006`` (RBC Aerospace plain
    bearings p. 21, MS14101 grooved dash -3). **This is not a measurement of a
    part and it supplies no stack value** -- a number here that disagrees with
    the catalog means the fitter is broken, and that is the only thing it is
    allowed to mean.

    The second half is the one the solver depends on: both spherical faces are
    centred on the part's own origin, which is what makes a joint centre
    computable from an assembly placement with no face bound at all.
    """
    mesh = fg.read_mesh(mesh_dir_for(BEARING_PART_ID))
    fits = fg.fit_part_faces(mesh)

    diameters = sorted({round(2 * f.geometry["radius"], 4)
                        for f in fits if f.surface == "cylindrical"})
    assert diameters == [4.8200, 14.2820], (
        f"the bearing's diameters read {diameters}, not the .1900 bore and the "
        ".5625 OD the catalog prints"
    )
    assert 4.813 <= diameters[0] <= 4.826, "the bore is outside the catalog band"
    assert 14.275 <= diameters[1] <= 14.288, "the OD is outside the catalog band"

    spheres = [f for f in fits if f.surface == "spherical"]
    assert [round(f.geometry["radius"], 3) for f in spheres] == [5.198, 5.198, 5.147, 5.147], (
        "the ball and the race seat it turns in are not the two spherical radii"
    )
    for fit in spheres:
        assert fit.geometry["centre"] == pytest.approx([0.0, 0.0, 0.0], abs=1e-3), (
            "a spherical centre is off the part's own origin -- the whole reason "
            "the two pitch-link joint centres can be read off the placements"
        )
    assert spheres[0].geometry["radius"] > spheres[-1].geometry["radius"], (
        "the race seat is not larger than the ball it holds"
    )


@pytest.mark.skipif(
    mesh_dir_for(BEARING_PART_ID) is None,
    reason="no installed MS14101-3 mesh (data/ is gitignored, main checkout only)",
)
def test_real_every_band_of_quads_on_the_bearing_is_refused_with_its_own_reason():
    """[real] tier: 20 of the bearing's 36 faces are single bands, every one of
    which fits a sphere to 1e-8 relative. Each is ``other`` **with the band
    reason**, not with a residual reason -- which is the difference between a
    rule that happens to hold today and the one that is actually doing the work.
    """
    mesh = fg.read_mesh(mesh_dir_for(BEARING_PART_ID))
    bands = [f for f in fg.fit_part_faces(mesh)
             if f.surface == "other"
             and f.fits.get("spherical")
             and f.fits["spherical"]["triangles_per_vertex"]
             < fg.FIT_TOLERANCES["sphere_min_triangles_per_vertex"]]
    assert len(bands) >= 10, (
        "the bearing's single-quad-band faces have gone -- re-tessellated at a "
        "different deflection? The band rule is still right; this count is not"
    )
    for band in bands:
        assert band.why == "one band of quads, which lies on a sphere whatever shape it is"
        assert band.fits["spherical"]["max_residual"] / band.fits["spherical"]["radius"] < 1e-6, (
            "a band refused by the band rule has a LARGE sphere residual, so the "
            "residual would have refused it anyway -- if that is true of all of "
            "them, the band rule has stopped being load-bearing and this test "
            "should say so rather than pass quietly"
        )


# ---------------------------------------------------------------------------
# the two readers, held to the same answer
# ---------------------------------------------------------------------------


def python_refusal_reasons() -> set[str]:
    """Every sentence this module can answer ``other`` with."""
    source = (REPO_ROOT / "tolerance_stack" / "feature_geometry.py").read_text(
        encoding="utf-8")
    return set(re.findall(r'(?:refuse|result\.why =) ?\(?"([^"]+)"', source))


def js_refusal_reasons() -> set[str]:
    """Every sentence ``apps/annotate/face_geometry.js`` can answer ``other``
    with -- the `other(faceId, "...")` calls, which is the only way it builds
    one."""
    source = FACE_GEOMETRY_JS.read_text(encoding="utf-8")
    return set(re.findall(r'other\(faceId,\s*\n?\s*"([^"]+)"', source))


def test_both_readers_refuse_a_face_in_the_same_words():
    """A reason that exists on one side only is a reader and a solver being told
    different things about the same face.

    The sentences are user-visible on one side (the annotator prints them) and
    diagnostic on the other (they reach ``fits.json``), so they are the one part
    of this pairing a human actually reads.
    """
    python, browser = python_refusal_reasons(), js_refusal_reasons()
    assert python, "found no refusal sentences in feature_geometry.py -- vacuous"
    assert browser, "found no other(faceId, ...) calls in face_geometry.js -- vacuous"
    assert python == browser, (
        "the two readers' refusal vocabularies differ.\n"
        f"  only in Python: {sorted(python - browser)}\n"
        f"  only in JS:     {sorted(browser - python)}"
    )


CLASSIFY_WITH_NODE = r"""
global.window = {};
require(process.argv[2]);
require(process.argv[3]);
const AA = window.AnnotateApp, fs = require("fs"), path = require("path");
const out = {};
for (const name of fs.readdirSync(process.argv[4])) {
  const dir = path.join(process.argv[4], name);
  if (!fs.existsSync(path.join(dir, "manifest.json"))) continue;
  const mf = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const typed = (n, K) => {
    const r = fs.readFileSync(path.join(dir, n));
    return new K(r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength));
  };
  out[name] = AA.classifyPartFaces(mf.faces, typed(mf.positions_file, Float32Array),
    typed(mf.indices_file, Uint32Array), typed(mf.face_ids_file, Uint32Array))
    .map((c) => (c ? c.surface : null));
}
fs.writeFileSync(process.argv[5], JSON.stringify(out));
"""


@pytest.mark.skipif(meshes_dir() is None,
                    reason="no installed mesh (data/ is gitignored, main checkout "
                           "only); pairing the two readers needs real geometry")
@pytest.mark.skipif(shutil.which("node") is None,
                    reason="node is not on PATH, so the browser's half cannot be run")
def test_real_both_readers_classify_every_installed_face_the_same(tmp_path):
    """[real] tier: the claim, held rather than asserted in prose.

    The lesson said the two readers "agree face for face" and they did not: ten
    faces of the three blade meshes differed, because this module tried each
    shape on its merits where the browser **stops** when a shape's own sub-test
    fails. On two of them Python answered with a 75 mm sphere at an RMS of 0.68
    -- a fit the relative gate accepted only because the bad fit chose the
    radius it was measured against (found in review, 2026-09-30).

    That matters past the claim: ``scripts/fit_bound_features.py`` reads with
    this module and a human picks with the browser's, so a face the surface
    offered can be fitted differently from the way it was shown -- and the ten
    were on meshes Jeff is being sent to click.

    **It is the most expensive check in this suite: about 90 seconds**, and all
    of it is this module -- the browser's pass over the same 35635 faces is
    under a second. Four rounds of optimisation took it from 165s (an indexed
    face table, a memoised range table, one centroid pass shared by the three
    fits, and the facet loop not re-normalising unit vectors); what is left is
    pure-Python float arithmetic over a million triangles, which stdlib-only
    does not make cheaper. Scoping it to fewer meshes is the obvious saving and
    it is the wrong one: the ten divergent faces were on the three blade meshes,
    which are exactly the ones a subset chosen for speed would drop.
    """
    script = tmp_path / "classify.cjs"
    script.write_text(CLASSIFY_WITH_NODE, encoding="utf-8")
    dump = tmp_path / "js_classes.json"
    proc = subprocess.run(
        ["node", str(script),
         str(REPO_ROOT / "apps" / "viewer" / "vocab.gen.js"),
         str(FACE_GEOMETRY_JS), str(meshes_dir()), str(dump)],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    assert proc.returncode == 0, (
        "the browser-side classifier did not run:\n" + proc.stdout + proc.stderr)

    browser = json.loads(dump.read_text(encoding="utf-8"))
    assert browser, "the JS pass classified no mesh -- this would pass vacuously"

    divergent = []
    faces = 0
    for sha, js_classes in browser.items():
        mesh = fg.read_mesh(meshes_dir() / sha)
        for fit in fg.fit_part_faces(mesh):
            faces += 1
            if js_classes[fit.face_id] != fit.surface:
                divergent.append(
                    f"{sha[:12]} face {fit.face_id}: python={fit.surface} "
                    f"js={js_classes[fit.face_id]}")
    assert faces > 1000, f"only {faces} faces compared -- the store looks empty"
    assert divergent == [], (
        f"{len(divergent)} of {faces} faces are classified differently by the two "
        f"readers: {divergent[:10]}. apps/annotate/face_geometry.js's classifyOne "
        "and this module's fit_face are the same control flow on purpose; one of "
        "them has moved."
    )

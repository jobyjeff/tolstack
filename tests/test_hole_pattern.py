"""A hole pattern is offered and fitted as N like holes (handoff
``a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added``, 2026-11-15).

Value-level. The sibling tier and the pattern fit answer on the faces of
``tests/fixtures/hole_pattern_cases.json`` -- the same faces
``apps/annotate/run_tests.cjs`` hands the browser's half -- with every expected
value stated from how the faces were built. The thresholds are held at their
measured boundaries and paired against the browser's block; one set fit is run
through a mesh built by hand; and on the installed hub the two readers offer
face 744's pattern identically and the fit reads it back.
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

REPO = Path(__file__).resolve().parent.parent
CASES = json.loads((REPO / "tests" / "fixtures" / "hole_pattern_cases.json").read_text(encoding="utf-8"))
RECORDS = {int(k): v for k, v in CASES["records"].items()}
FACE_GEOMETRY_JS = REPO / "apps" / "annotate" / "face_geometry.js"


# --- the fixture: the Python half's answers ------------------------------------


@pytest.mark.parametrize("case", CASES["siblings"], ids=lambda c: f"pick {c['pick']}")
def test_a_picked_hole_offers_its_pattern(case):
    got = fg.pattern_siblings(RECORDS, case["pick"])
    assert got == {"faces": case["faces"], "holes": case["holes"]}, case["why"]


@pytest.mark.parametrize("case", CASES["patterns"], ids=lambda c: ",".join(map(str, c["faces"][:3])))
def test_a_set_of_faces_is_a_pattern_or_says_why_not(case):
    got = fg.hole_pattern([RECORDS[f] for f in case["faces"]])
    expect = case["expect"]
    if expect is None:
        assert got is None, case["why"]
        return
    assert got["holes"] == expect["holes"]
    assert got["radius"] == pytest.approx(expect["radius"], rel=1e-12)
    assert [abs(c) for c in got["axis"]] == pytest.approx(expect["axis"], abs=1e-12)
    assert len(got["centres"]) == expect["holes"]
    assert got["on_circle"] is expect["on_circle"]
    if expect["on_circle"]:
        assert got["circle_radius"] == pytest.approx(expect["circle_radius"], rel=1e-9)
        assert got["circle_centre"] == pytest.approx(expect["circle_centre"], abs=1e-9)
    else:
        assert "circle_radius" not in got and "circle_centre" not in got


def test_two_holes_never_overlap():
    """Holes 0 and the offset cylinder 1.0 apart (radius 2.75) are refused as a
    pair whatever else agrees; hole 1, a pattern's width away, is not."""
    assert not fg.like_holes(RECORDS[0], RECORDS[19])
    assert fg.like_holes(RECORDS[2], RECORDS[19])


# --- the thresholds, at the boundaries they were measured between -------------


def _hole(radius=2.75, x=0.0, z=0.0, axis=(0.0, 0.0, 1.0)):
    return {"surface": "cylindrical", "axis": list(axis), "axis_point": [x, 0.0, z],
            "radius": radius, "arc_deg": 180.0}


def test_the_thresholds_sit_between_the_measured_populations():
    """Each number between v2's members and its nearest non-member (the
    table is ``PATTERN_TOLERANCES``' comment and the lesson)."""
    tol = fg.PATTERN_TOLERANCES
    assert 3.2e-5 < tol["radius_fraction"] < 0.0999
    assert 0.185 < tol["axis_deg"] < 9.3
    assert 0.0085 < tol["axial_offset_fraction"] < 0.106
    assert 273 < tol["whole_arc_deg"] <= 360
    assert 8.1e-5 < tol["circle_fraction"] < 1.9e-2
    # ...and each one bites where it says, on a pair 20 apart.
    r = 2.75
    assert fg.like_holes(_hole(), _hole(r * (1 + 0.9 * tol["radius_fraction"]), 20))
    assert not fg.like_holes(_hole(), _hole(r * (1 + 1.1 * tol["radius_fraction"]), 20))
    assert fg.like_holes(_hole(), _hole(x=20, z=0.9 * tol["axial_offset_fraction"] * r))
    assert not fg.like_holes(_hole(), _hole(x=20, z=1.1 * tol["axial_offset_fraction"] * r))
    tilt = math.radians(0.9 * tol["axis_deg"])
    # Tilted across the offset, so the tilt alone is what is tested.
    assert fg.like_holes(_hole(), _hole(x=20, axis=(0, math.sin(tilt), math.cos(tilt))))
    tilt = math.radians(1.1 * tol["axis_deg"])
    assert not fg.like_holes(_hole(), _hole(x=20, axis=(0, math.sin(tilt), math.cos(tilt))))
    assert fg.like_holes(_hole(), _hole(x=20, axis=(0, 0, -1))), "an axis is a line"
    assert not fg.like_holes(_hole(), _hole(x=2 * r)), "touching holes overlap"
    assert not fg.like_holes(_hole(), _hole()), "one hole is one surface, not a pattern"


def test_the_pattern_thresholds_are_the_browsers():
    """The annotator offers a picked hole's pattern by the same numbers."""
    source = FACE_GEOMETRY_JS.read_text(encoding="utf-8")
    block = source[source.index("AA.PATTERN = Object.freeze({"):]
    block = block[:block.index("});")]
    for py, js in fg.JS_PATTERN_NAMES.items():
        found = re.search(rf"\b{js}:\s*([0-9.eE+-]+)", block)
        assert found, f"AA.PATTERN has no {js}"
        assert float(found.group(1)) == fg.PATTERN_TOLERANCES[py], js
    assert set(fg.JS_PATTERN_NAMES) == set(fg.PATTERN_TOLERANCES)


# --- fit_face_set on a mesh built by hand -----------------------------------------


def _mesh(faces):
    import array
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


def _half(radius, centre, z0, z1, a0, rows=4, segments=24):
    points, triangles = [], []
    for r in range(rows):
        z = z0 + (z1 - z0) * r / (rows - 1)
        for s in range(segments + 1):
            t = math.radians(a0 + 180.0 * s / segments)
            points.append((centre[0] + radius * math.cos(t), centre[1] + radius * math.sin(t), z))
    w = segments + 1
    for r in range(rows - 1):
        for s in range(segments):
            a, b, c, d = r * w + s, r * w + s + 1, (r + 1) * w + s, (r + 1) * w + s + 1
            triangles += [(a, b, d), (a, d, c)]
    return points, triangles


def _square(z, size=4.0, n=4):
    points = [(size * i / (n - 1), size * j / (n - 1), z) for j in range(n) for i in range(n)]
    triangles = []
    for j in range(n - 1):
        for i in range(n - 1):
            a, b, c, d = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1
            triangles += [(a, b, d), (a, d, c)]
    return points, triangles


def test_a_set_of_holes_fits_as_a_pattern_not_one_cylinder():
    """Four 2.75 holes, each two halves, on a 48 circle about (5, -3): the set
    is a pattern of four on a 96 circle, never one bad cylinder."""
    faces = []
    for k in range(4):
        t = math.radians(90 * k + 10)
        centre = (5 + 48 * math.cos(t), -3 + 48 * math.sin(t))
        faces += [_half(2.75, centre, 0.0, 6.0, 0), _half(2.75, centre, 0.0, 6.0, 180)]
    mesh = _mesh(faces)
    fit = fg.fit_face_set(mesh, range(8))
    assert fit.surface == fg.PATTERN_SURFACE, fit.why
    g = fit.geometry
    assert g["holes"] == 4
    assert g["radius"] == pytest.approx(2.75, rel=1e-4)
    assert abs(g["axis"][2]) == pytest.approx(1.0, abs=1e-6)
    assert g["on_circle"] and g["circle_radius"] == pytest.approx(48.0, rel=1e-5)
    assert g["circle_centre"][:2] == pytest.approx([5.0, -3.0], abs=1e-3)
    assert "axis_point" not in g, "a pattern is never handed on as one cylinder"
    one_hole = fg.fit_face_set(mesh, [0, 1])
    assert one_hole.surface == "cylindrical" and one_hole.geometry["radius"] == pytest.approx(2.75, rel=1e-4)


def test_faces_on_several_surfaces_that_are_no_pattern_are_refused():
    """Two planes at different heights are not one plane through both (the
    2026-11-13 issue's refusal, made now that a set can be bound)."""
    fit = fg.fit_face_set(_mesh([_square(0.0), _square(3.0)]), [0, 1])
    assert fit.surface == "other"
    assert fit.why == "the faces are not one planar surface"


def test_a_placed_pattern_moves_every_centre():
    import importlib.util
    spec = importlib.util.spec_from_file_location("fbf", REPO / "scripts" / "fit_bound_features.py")
    fbf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fbf)
    shift = [1, 0, 0, 10, 0, 1, 0, 20, 0, 0, 1, 30]
    placed = fbf.place_geometry({"holes": 2, "radius": 1.0, "axis": [0, 0, 1], "on_circle": False,
                                 "centres": [[0, 0, 0], [5, 0, 0]], "circle_centre": [1, 1, 1]}, shift)
    assert placed["centres"] == [[10, 20, 30], [15, 20, 30]]
    assert placed["circle_centre"] == [11, 21, 31]
    assert placed["axis"] == [0, 0, 1] and placed["radius"] == 1.0


# --- [real]: the installed hub, both readers ---------------------------------------

MESHES = [p for p in (REPO / "data" / "meshes", Path("C:/workspace/tolstack/data/meshes")) if p.is_dir()]
HUB = "e28285d1e6c934504d7c1dd0b86814cda6e256c3a18b2bbc4b6ee26cf6ceab6b"
HUB_DIR = next((m / HUB for m in MESHES if (m / HUB / "manifest.json").is_file()), None)

SIBLINGS_WITH_NODE = r"""
global.window = {};
require(process.argv[2]);
require(process.argv[3]);
const AA = window.AnnotateApp, fs = require("fs"), path = require("path");
const dir = process.argv[4];
const mf = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const typed = (n, K) => {
  const r = fs.readFileSync(path.join(dir, n));
  return new K(r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength));
};
const positions = typed(mf.positions_file, Float32Array);
const classes = AA.classifyPartFaces(mf.faces, positions, typed(mf.indices_file, Uint32Array),
  typed(mf.face_ids_file, Uint32Array));
const ranges = AA.faceVertexRanges(mf.faces);
const sib = AA.surfaceSiblings(classes, Number(process.argv[5]), (a, b) => AA.facesTouch(positions, ranges, a, b));
const faces = [Number(process.argv[5])].concat(sib.swept, sib.offered, sib.pattern);
const pattern = AA.holePattern(faces.map((f) => classes[f]));
fs.writeFileSync(process.argv[6], JSON.stringify({ sib, words: AA.patternWords(pattern) }));
"""


@pytest.mark.skipif(HUB_DIR is None, reason="the hub mesh is not installed (data/ is gitignored, main checkout only)")
@pytest.mark.skipif(shutil.which("node") is None, reason="node is not on PATH, so the browser's half cannot be run")
def test_real_the_hub_fastener_hole_offers_ten_holes_and_both_readers_agree(tmp_path):
    """[real] Jeff's 11-15 pick, face 744 (with its other half 743): the ten
    Ø5.5 holes of the hub's bolt circle, offered the same way by both readers,
    and fitted back as "10 holes Ø5.5 on a Ø240 circle"."""
    script = tmp_path / "siblings.cjs"
    script.write_text(SIBLINGS_WITH_NODE, encoding="utf-8")
    dump = tmp_path / "js.json"
    proc = subprocess.run(["node", str(script), str(REPO / "apps" / "viewer" / "vocab.gen.js"),
                           str(FACE_GEOMETRY_JS), str(HUB_DIR), "744", str(dump)],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    js = json.loads(dump.read_text(encoding="utf-8"))
    mesh = fg.read_mesh(HUB_DIR)
    records = {f.face_id: fg.surface_record(f) for f in fg.fit_part_faces(mesh)}
    py = fg.pattern_siblings(records, 744)
    assert js["sib"]["swept"] == [743]
    assert py == {"faces": sorted(js["sib"]["pattern"]), "holes": js["sib"]["holes"]}
    assert py["holes"] == 10 and len(py["faces"]) == 18
    fit = fg.fit_face_set(mesh, [744, 743] + py["faces"])
    assert fit.surface == fg.PATTERN_SURFACE, fit.why
    assert fit.geometry["holes"] == 10
    assert 2 * fit.geometry["radius"] == pytest.approx(5.5, abs=1e-3)
    assert fit.geometry["on_circle"] and 2 * fit.geometry["circle_radius"] == pytest.approx(240.0, abs=1e-2)
    assert js["words"] == "10 holes \u00d85.5 on a \u00d8240 circle"


# --- Add a face: the shell asks for the arm mode the pane knows ----------------


def test_the_add_a_face_mode_is_the_panes():
    """The body's Add a face posts ``arm ... add`` (``VA.ARM_ADD``); the pane
    takes exactly the modes in ``AA.ARM_PICK_MODES`` and refuses any other."""
    nav = (REPO / "apps" / "viewer" / "views" / "nav.js").read_text(encoding="utf-8")
    sweep = (REPO / "apps" / "annotate" / "sweep.js").read_text(encoding="utf-8")
    shell = re.search(r'VA\.ARM_ADD = "([a-z]+)";', nav)
    pane = re.search(r"AA\.ARM_PICK_MODES = Object\.freeze\(\[([^\]]*)\]\);", sweep)
    assert shell and pane
    assert [w.strip().strip('"') for w in pane.group(1).split(",")] == [shell.group(1)]

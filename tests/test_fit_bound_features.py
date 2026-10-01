"""``scripts/fit_bound_features.py``: a bound face becomes a nominal, in the
part's own frame and in the assembly's.

**The headline this suite exists to hold.** The pitch link's two joint centres
are the two instances of one MS14101-3, whose ball is centred on its own part
origin -- so fitting that one face and applying the two placements the mesh
already records puts the two centres in the assembly frame with nothing bound at
the other end of the link. Their distance is the pitch link's length, and the
3DX sweep sheet states that length independently
(``docs/topologies/topology_vpa_pitch_linkage.json``'s one cited edge). The two
agree to under a micron, which is well inside the sheet's own three-decimal
rounding -- so the fit and the sheet are two measurements of one link and this
test is what keeps saying so.

**What is synthetic here, and what is not.** The *bindings* are synthetic: this
suite writes `feature-identity/v0` events naming faces it picked by inspection,
because no human has sat at the annotator and bound this topology yet. The
*geometry* is entirely real -- the installed meshes, their own recorded
placements, and a number off a sheet in another repo. So a failure here means
the fitter or a mesh moved, never that someone's binding was wrong.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from tolerance_stack.topology import load_topology  # noqa: E402

import fit_bound_features as fbf  # noqa: E402

TOPOLOGY_FILE = REPO_ROOT / "docs" / "topologies" / "topology_vpa_pitch_linkage.json"

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
MESHES_DIR_CANDIDATES = (
    REPO_ROOT / "data" / "meshes",
    Path("C:/workspace/tolstack/data/meshes"),
)

BEARING_PART_ID = "asm217755_MS14101_3_9bfdb344"
PLATE_PART_ID = "asm217755_215735_001"
BLADE_PART_ID = "blade_oml"

#: A face of the blade OML that DOES fit -- the `no_occurrence` outcome is
#: "fitted fine, but nothing says where this part sits", so an unreadable face
#: would reach a different branch and the check would pass for the wrong reason.
BLADE_READABLE_FACE = 17

#: Faces picked by inspection on the installed meshes -- which is exactly what a
#: human does at the annotator, done here in a comment instead of in a UI.
BEARING_BORE_FACE = 30        # the .1900 in bore through the ball
BEARING_BALL_FACE = 26        # one half of the ball's spherical surface
BEARING_BAND_FACE = 2         # a single band of quads: fits a sphere, means nothing
PLATE_SPINDLE_FACES = (439, 465)   # the two halves of the plate's central bore


def meshes_dir() -> Path | None:
    for candidate in MESHES_DIR_CANDIDATES:
        if not candidate.is_dir():
            continue
        if any(SHA256_RE.match(child.name) for child in candidate.iterdir()):
            return candidate
    return None


def sha_for(part_id: str) -> str | None:
    root = meshes_dir()
    if root is None:
        return None
    for child in sorted(root.iterdir()):
        provenance = child / "provenance.json"
        if not provenance.is_file():
            continue
        if json.loads(provenance.read_text(encoding="utf-8")).get("part_id") == part_id:
            return child.name
    return None


needs_meshes = pytest.mark.skipif(
    sha_for(BEARING_PART_ID) is None,
    reason="no installed MS14101-3 mesh (data/ is gitignored, main checkout "
           "only -- see data/meshes/README.md); this needs real geometry",
)


def write_event(events_dir: Path, seq: int, edge: str, direction: str,
                sha: str, face_id: int, owner: str) -> None:
    """One synthetic ``bound`` event, with a real face fingerprint.

    The fingerprint is copied off the live manifest exactly as the annotator
    copies it at binding time -- a hand-written one would make this suite pass
    against a mesh that no longer has the face.
    """
    manifest = json.loads((meshes_dir() / sha / "manifest.json").read_text(encoding="utf-8"))
    face = next(f for f in manifest["faces"] if f["face_id"] == face_id)
    (events_dir / f"{seq:04d}.json").write_text(json.dumps({
        "schema": "joby.tolerance_stack/feature-identity/v0",
        "event_id": f"synthetic-{seq:04d}",
        "seq": seq,
        "created_at": "2026-09-30T00:00:00Z",
        "recorded_by": "tests/test_fit_bound_features.py (synthetic)",
        "stack_key": {"kind": "topology_edge", "topology_id": "vpa_pitch_linkage",
                      "edge_id": edge},
        "verdict": "bound",
        "direction": direction,
        "owner_part": owner,
        "geometry_key": {"source_step_sha256": sha, "face_id": face_id,
                         "area_native2": face["area_native2"],
                         "centroid_native": face["centroid_native"]},
    }, indent=2), encoding="utf-8")


@pytest.fixture
def built(tmp_path):
    """The projection, built from a synthetic inbox against the real store."""
    events = tmp_path / "inbox" / "feature-identity"
    events.mkdir(parents=True)
    bearing = sha_for(BEARING_PART_ID)
    plate = sha_for(PLATE_PART_ID)
    write_event(events, 1, "pitch_link_bearing_bore_to_ball_centre", "from",
                bearing, BEARING_BORE_FACE, "spherical_bearing_pitch_link")
    write_event(events, 2, "pitch_link_bearing_bore_to_ball_centre", "to",
                bearing, BEARING_BALL_FACE, "spherical_bearing_pitch_link")
    if plate:
        for seq, face in enumerate(PLATE_SPINDLE_FACES, start=3):
            write_event(events, seq, "pitch_plate_attach_radius", "from",
                        plate, face, "pitch_plate_215177_001")
    _out, data = fbf.build(events, meshes_dir(), tmp_path / "projections")
    return data


def rows_for(data, edge, direction=None):
    return [r for r in data["fits"]
            if r["stack_key"]["edge_id"] == edge
            and (direction is None or r["direction"] == direction)]


@needs_meshes
def test_the_bearing_bore_and_ball_fit_the_shapes_they_are(built):
    bore = rows_for(built, "pitch_link_bearing_bore_to_ball_centre", "from")[0]
    assert bore["local"]["surface"] == "cylindrical"
    assert bore["units"] == fbf.MM, (
        "the mesh did not declare millimetres -- see fit_bound_features.MM for "
        "how that is derived, and do not assume it"
    )
    assert round(2 * bore["local"]["geometry"]["radius"], 3) == 4.820

    ball = rows_for(built, "pitch_link_bearing_bore_to_ball_centre", "to")[0]
    assert ball["local"]["surface"] == "spherical"
    assert ball["local"]["geometry"]["centre"] == pytest.approx([0, 0, 0], abs=1e-3)
    # Every residual is reported, not only the winner's -- which is what lets a
    # reader see how firmly the winner won.
    assert set(ball["local"]["residuals"]) == {"planar", "cylindrical", "spherical"}
    assert ball["local"]["residuals"]["spherical"]["rms"] < \
        ball["local"]["residuals"]["cylindrical"]["rms"]


@needs_meshes
def test_the_two_pitch_link_joint_centres_land_where_the_sweep_sheet_puts_them(built):
    """**The headline.** Two occurrences of one bearing, two assembly-frame
    centres, and their distance is the pitch link's length.

    The expected length is read out of the topology document's own cited edge
    rather than written here, so there is one place that number lives and the
    citation travels with it.
    """
    ball = rows_for(built, "pitch_link_bearing_bore_to_ball_centre", "to")[0]
    occurrences = ball["occurrences"]
    assert len(occurrences) == 2, (
        "the pitch link's bearing is installed twice in 213862-002.1; this mesh "
        f"now records {len(occurrences)} occurrence(s)"
    )
    paths = sorted("/".join(o["instance_path"]) for o in occurrences)
    assert paths == [
        "217755-001/prd-e-03478612.1/213862-002.1/MS14101-3.1",
        "217755-001/prd-e-03478612.1/213862-002.1/MS14101-3.2",
    ]
    for occurrence in occurrences:
        assert occurrence["placement_source"] in fbf.PLACEMENT_SOURCES

    centres = [o["geometry"]["centre"] for o in occurrences]
    assert centres[0] != pytest.approx(centres[1], abs=1.0), (
        "the two occurrences landed on the same point -- the placement was not "
        "applied, which is the failure this whole script exists to prevent"
    )

    topology = load_topology(TOPOLOGY_FILE)
    sheet_length = topology.edge("pitch_link_length").dimension.nominal
    fitted = math.dist(centres[0], centres[1])
    assert fitted == pytest.approx(sheet_length, abs=0.001), (
        f"the fitted pitch-link length is {fitted:.6f} mm and the sweep sheet's "
        f"is {sheet_length} mm. These are two independent measurements of one "
        "rigid link -- the mesh's own placements against a 3DX sweep at 72 "
        "degrees -- and they agreed to 0.00023 mm on 2026-09-30."
    )


@needs_meshes
def test_a_direction_is_rotated_into_the_assembly_frame_and_a_point_is_moved(built):
    """A bore's axis DIRECTION must survive the placement as a direction.

    The bearing's bore is along its own local +Z; in the assembly it is along
    the assembly's X, which is a 90-degree rotation and therefore the case that
    tells a rotation from a translation. A direction run through the full
    placement would come back near the part's position instead, with a
    plausible magnitude and nothing to flag it.
    """
    bore = rows_for(built, "pitch_link_bearing_bore_to_ball_centre", "from")[0]
    assert abs(abs(bore["local"]["geometry"]["axis"][2]) - 1.0) < 0.05, (
        "the bearing's bore is no longer along its own local Z"
    )
    for occurrence in bore["occurrences"]:
        axis = occurrence["geometry"]["axis"]
        assert math.isclose(math.sqrt(sum(c * c for c in axis)), 1.0, abs_tol=1e-6), (
            "an assembly-frame axis is not a unit vector -- a direction was "
            "translated"
        )
        assert abs(abs(axis[0]) - 1.0) < 0.05, (
            f"the bearing's bore axis in the assembly frame is {axis}, not along "
            "the assembly X it was measured along on 2026-09-30"
        )
        # ...and the radius is carried through unchanged: a placement is a rigid
        # motion, so it moves a feature without resizing it.
        assert occurrence["geometry"]["radius"] == bore["local"]["geometry"]["radius"]


@needs_meshes
@pytest.mark.skipif(sha_for(PLATE_PART_ID) is None,
                    reason="the 215735-001 pitch-plate detail is not installed")
def test_the_pitch_plates_spindle_bore_is_the_assembly_z_axis(built):
    """The question the topology's hub and plate nodes both carry as *expected*.

    One of the two is answerable today: the pitch plate's own central bore is
    installed, and in the assembly frame it comes out along Z. The HUB's spindle
    bore is the other half of Jeff's question and has no mesh yet -- this test
    says nothing about it, deliberately.
    """
    rows = rows_for(built, "pitch_plate_attach_radius", "from")
    assert len(rows) == len(PLATE_SPINDLE_FACES)
    axes = []
    for row in rows:
        assert row["local"]["surface"] == "cylindrical"
        assert row["local"]["geometry"]["radius"] == pytest.approx(16.5, abs=0.01)
        assert len(row["occurrences"]) == 1, (
            "215735-001 is installed once in the assembly; this mesh now records "
            f"{len(row['occurrences'])} occurrence(s)"
        )
        axes.append(row["occurrences"][0]["geometry"]["axis"])
    for axis in axes:
        assert abs(abs(axis[2]) - 1.0) < 0.01, (
            f"the pitch plate's spindle bore axis is {axis} in the assembly "
            "frame, not the Z it was measured along on 2026-09-30"
        )


@needs_meshes
def test_a_binding_that_cannot_be_fitted_is_reported_with_its_reason(tmp_path):
    """Four first-class outcomes, never a silently dropped binding.

    A binding that produces no fit is the thing a reader most needs told: it
    means the stack-side key still has nothing behind it, and a projection that
    merely omitted the row would read as "nobody has bound this yet".
    """
    events = tmp_path / "inbox" / "feature-identity"
    events.mkdir(parents=True)
    bearing = sha_for(BEARING_PART_ID)
    # ...a face that is `other`: a band of quads, which fits a sphere and means
    # nothing by it.
    write_event(events, 1, "pitch_link_bearing_bore_to_ball_centre", "from",
                bearing, BEARING_BAND_FACE, "spherical_bearing_pitch_link")
    # ...and a mesh that is not in the store at all.
    write_event(events, 2, "pitch_link_bearing_bore_to_ball_centre", "to",
                bearing, BEARING_BALL_FACE, "spherical_bearing_pitch_link")
    absent = json.loads((events / "0002.json").read_text(encoding="utf-8"))
    absent["geometry_key"]["source_step_sha256"] = "0" * 64
    (events / "0002.json").write_text(json.dumps(absent, indent=2), encoding="utf-8")
    # ...and a face id the mesh does not have.
    write_event(events, 3, "pitch_arm_radius", "from", bearing,
                BEARING_BALL_FACE, "pitch_arm")
    missing = json.loads((events / "0003.json").read_text(encoding="utf-8"))
    missing["geometry_key"]["face_id"] = 10_000
    (events / "0003.json").write_text(json.dumps(missing, indent=2), encoding="utf-8")

    seq = 4
    blade = sha_for(BLADE_PART_ID)
    if blade:
        # ...and a mesh that was tessellated from a single-part STEP, so nothing
        # records where it sits in any assembly.
        write_event(events, seq, "pitch_arm_radius", "to", blade,
                    BLADE_READABLE_FACE, "blade_root")
        seq += 1

    _out, data = fbf.build(events, meshes_dir(), tmp_path / "projections")
    assert data["fits"] == [], "a binding that cannot be fitted produced a fit"
    reasons = sorted(row["reason"] for row in data["unresolved"])
    expected = ["no_face", "no_mesh", "unreadable"]
    if blade:
        expected.append("no_occurrence")
    assert reasons == sorted(expected)
    for row in data["unresolved"]:
        assert row["reason"] in fbf.UNRESOLVED_REASONS
        assert row["note"], f"{row['reason']} was reported with no reason attached"
    assert data["summary"]["by_reason"] == {r: 1 for r in expected}


@needs_meshes
def test_the_projection_carries_its_own_provenance_stamp(built):
    """Gated and stamped like every shared projection writer here
    (``scripts/projection_provenance.py``) -- the tie-break that stops one
    worktree's build clobbering a newer one's."""
    import projection_provenance as prov  # noqa: PLC0415 -- resolved from scripts/

    stamp = built[prov.PROVENANCE_KEY]
    assert stamp["schema"] == prov.SCHEMA_PROVENANCE
    assert stamp["built_by"] == fbf.BUILT_BY
    assert built["schema"] == fbf.SCHEMA

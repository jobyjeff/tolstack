"""The kinematic study: a published sweep's Jacobian folded as tolerance sensitivities.

Added 2026-10-16 by handoff ``a_kinematic_study_folds_the_sweeps_jacobian``.
Value-level against a committed synthetic sweep (``tests/fixtures/kinematic/``:
three points, two measures, four parameters, hand-chosen entries) whose expected
intervals are derived by hand below, plus a ``[real]`` pin of the first study
against linkage run P2 by absolute path, skipped where that file is absent.
"""

from __future__ import annotations

import json
import math
import shutil
import sys
from pathlib import Path

import pytest

from tests.test_thermal_exception_list import combining_sites, element_value_fields
from tolerance_stack.topology import load_topology
from tolerance_stack.kinematic import (
    DIRECTION_UNITS,
    LINKAGE_LENGTH_UNITS,
    PARAMETER_KINDS,
    ROW_KINDS,
    KinematicStudyError,
    STOP_STACK_HANDOFF,
    check_at_stop,
    contributor_term,
    envelope,
    fold_at,
    fold_at_stop,
    load_kinematic_study,
    parameter_unit,
    range_between_stops,
    rss_check_at_stop,
    stop_index,
    zone_coefficient,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURE = REPO_ROOT / "tests" / "fixtures" / "kinematic"
FIXTURE_TOPOLOGIES = FIXTURE / "topologies"
FIXTURE_STUDY = FIXTURE_TOPOLOGIES / "kinematic_study_fixture.json"
FIXTURE_DATA = FIXTURE / "data_root"
FIXTURE_RUN = FIXTURE_DATA / "inbox" / "linkage-sweeps" / "kin-fixture-run.json"
KINEMATIC_PY = REPO_ROOT / "tolerance_stack" / "kinematic.py"
sys.path.insert(0, str(REPO_ROOT / "scripts"))
import build_kinematic_projection as builder  # noqa: E402

REAL_STUDY = (REPO_ROOT / "docs" / "topologies"
              / "kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json")
REAL_DATA = Path(r"C:\workspace\tolstack\data")
REAL_RUN = REAL_DATA / "inbox" / "linkage-sweeps" / "vpa-pitch-p2-20261016-235852.json"


def load_fixture():
    return load_kinematic_study(FIXTURE_STUDY, FIXTURE_DATA, FIXTURE_TOPOLOGIES)


def copy_fixture(tmp_path: Path, study_edit=None, sweep_edit=None):
    """A writable copy of the fixture tree, with optional edits to its two JSONs."""
    root = tmp_path / "kinematic"
    shutil.copytree(FIXTURE, root)
    study_path = root / "topologies" / FIXTURE_STUDY.name
    run_path = root / "data_root" / "inbox" / "linkage-sweeps" / FIXTURE_RUN.name
    for path, edit in ((study_path, study_edit), (run_path, sweep_edit)):
        if edit is not None:
            data = json.loads(path.read_text(encoding="utf-8"))
            edit(data)
            path.write_text(json.dumps(data), encoding="utf-8")
    return study_path, root / "data_root", root / "topologies"


# --------------------------------------------------------------------------- #
# 1. the fold, by hand                                                        #
# --------------------------------------------------------------------------- #

#: Per point: the band contributor ``link_length`` (min -0.1, max +0.3,
#: asymmetric on purpose so the sign is visible in the interval) weighted by
#: J_length, and the sphere contributor (radius 0.02) weighted by the norm of
#: J over link.point_a[0..2].
#:
#:   point 0: J_len = 2    -> [-0.2, 0.6], mid 0.1 x 2 = 0.2, half 0.4
#:            J_pt = (3,4,0), norm 5 -> +-0.1
#:            worst [-0.3, 0.7]; RSS centre 0.2, half sqrt(0.4^2 + 0.1^2)
#:   point 1: J_len = -1   -> [-0.3, 0.1] (the sign swaps which end is which)
#:            J_pt = (0,0,2), norm 2 -> +-0.04
#:            worst [-0.34, 0.14]; RSS centre -0.1, half sqrt(0.2^2 + 0.04^2)
#:   point 2: J_len = 0.5  -> [-0.05, 0.15]
#:            J_pt = (2,4,4), norm 6 -> +-0.12
#:            worst [-0.17, 0.27]; RSS centre 0.05, half sqrt(0.1^2 + 0.12^2)
HAND = {
    0: (-0.3, 0.7, 0.2, math.sqrt(0.4 ** 2 + 0.1 ** 2)),
    1: (-0.34, 0.14, -0.1, math.sqrt(0.2 ** 2 + 0.04 ** 2)),
    2: (-0.17, 0.27, 0.05, math.sqrt(0.1 ** 2 + 0.12 ** 2)),
}


@pytest.mark.parametrize("point", sorted(HAND))
def test_the_fixture_folds_to_the_hand_derived_interval_at_every_point(point):
    study, sweep = load_fixture()
    result = fold_at(study, sweep, point)
    lo, hi, centre, half = HAND[point]
    assert result.interval.nominal == pytest.approx(0.0, abs=1e-12)
    assert result.interval.min == pytest.approx(lo, abs=1e-12)
    assert result.interval.max == pytest.approx(hi, abs=1e-12)
    assert result.interval.rss_center == pytest.approx(centre, abs=1e-12)
    assert result.interval.rss_half == pytest.approx(half, abs=1e-12)
    assert result.nominal == sweep.measure_values["angle"][point]
    assert result.driver_value == sweep.driver_values[point]


def test_the_envelope_is_one_fold_per_point_in_artifact_order():
    study, sweep = load_fixture()
    env = envelope(study, sweep)
    assert [p.index for p in env] == [0, 1, 2]
    assert [p.interval.max for p in env] == pytest.approx([HAND[i][1] for i in range(3)])


def test_the_table_ranks_by_coefficient_times_half_band():
    """Point 2 is where the sphere (6 x 0.02 = 0.12) overtakes the band
    (0.5 x 0.2 = 0.1); points 0 and 1 rank the other way round."""
    study, sweep = load_fixture()
    order = {i: [r.contributor.edge for r in fold_at(study, sweep, i).rows] for i in range(3)}
    assert order[0] == ["link_length", "plate_attach_position"]
    assert order[2] == ["plate_attach_position", "link_length"]
    top = fold_at(study, sweep, 2).rows[0]
    assert top.magnitude == pytest.approx(0.12)


# --------------------------------------------------------------------------- #
# 2. the zones                                                                #
# --------------------------------------------------------------------------- #

def test_a_sphere_coefficient_is_the_norm_and_a_band_sign_follows_the_jacobian():
    assert zone_coefficient("sphere", (3.0, 4.0, 0.0)) == (1, 5.0)
    assert zone_coefficient("sphere", (-3.0, -4.0, 0.0)) == (1, 5.0)
    assert zone_coefficient("disk", (-6.0, 8.0)) == (1, 10.0)
    assert zone_coefficient("band", (2.5,)) == (1, 2.5)
    assert zone_coefficient("band", (-2.5,)) == (-1, 2.5)

    study, sweep = load_fixture()
    band, sphere = study.contributors
    for point, expected_sign in ((0, 1), (1, -1), (2, 1)):
        entries = sweep.entries("angle", band.parameters, point)
        term = contributor_term(band, entries)
        assert term.sign == expected_sign
        assert term.weight == pytest.approx(entries[0])
        assert term.element is band.dimension      # the cited band, unchanged
    sphere_term = contributor_term(sphere, sweep.entries("angle", sphere.parameters, 0))
    assert (sphere_term.sign, sphere_term.coefficient) == (1, pytest.approx(5.0))


def test_a_zone_with_zero_sensitivity_enters_no_term_and_says_so(tmp_path):
    def zero_the_sphere_at_point_1(data):
        rows = data["sensitivity"]["by_measure"]["angle"]
        rows[3][1] = 0.0
    study_path, data_root, topologies = copy_fixture(tmp_path, sweep_edit=zero_the_sphere_at_point_1)
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    rows = {r.contributor.edge: r for r in fold_at(study, sweep, 1).rows}
    assert rows["plate_attach_position"].kind == "zero_sensitivity"
    assert rows["plate_attach_position"].term is None
    assert fold_at(study, sweep, 1).interval.max == pytest.approx(0.1)
    assert {r.kind for r in rows.values()} <= set(ROW_KINDS)


# --------------------------------------------------------------------------- #
# 3. cite or gap                                                              #
# --------------------------------------------------------------------------- #

def test_an_unresolvable_band_is_a_gap_row_and_contributes_no_term(tmp_path):
    def point_the_sphere_at_an_unbanded_edge(data):
        data["contributors"][1]["dimension_ref"]["edge"] = "plate_attach_unbanded"
    study_path, data_root, topologies = copy_fixture(
        tmp_path, study_edit=point_the_sphere_at_an_unbanded_edge)
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    result = fold_at(study, sweep, 0)
    gap = [r for r in result.rows if r.kind == "gap"]
    assert [r.contributor.edge for r in gap] == ["plate_attach_position"]
    assert gap[0].term is None and gap[0].magnitude is None
    assert gap[0].coefficient == pytest.approx(5.0)      # its sensitivity still shows
    assert result.rows[-1] is gap[0]                    # gaps rank last
    assert result.gap_count == 1
    assert (result.interval.min, result.interval.max) == pytest.approx((-0.2, 0.6))


def test_a_contributor_with_no_band_and_no_gap_reason_is_refused(tmp_path):
    def drop_the_ref(data):
        del data["contributors"][1]["dimension_ref"]
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=drop_the_ref)
    with pytest.raises(KinematicStudyError, match="no `gap` saying why"):
        load_kinematic_study(study_path, data_root, topologies)

    def authored_gap(data):
        del data["contributors"][1]["dimension_ref"]
        data["contributors"][1]["gap"] = "no drawing read yet"
    study_path, data_root, topologies = copy_fixture(tmp_path / "b", study_edit=authored_gap)
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    assert study.contributors[1].is_gap


def test_a_band_that_is_not_variation_only_is_refused(tmp_path):
    def inline_full_value(data):
        c = data["contributors"][0]
        del c["dimension_ref"]
        c["dimension"] = {"id": "len", "name": "len", "nominal": 100.0, "min": 99.9,
                          "max": 100.1, "source_ref": {"kind": "assumed", "confidence": "untraced"}}
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=inline_full_value)
    with pytest.raises(KinematicStudyError, match="variation about the sweep's own nominal"):
        load_kinematic_study(study_path, data_root, topologies)


# --------------------------------------------------------------------------- #
# 4. labels and features                                                      #
# --------------------------------------------------------------------------- #

def test_a_label_the_artifact_lacks_refuses_to_load_and_names_it(tmp_path):
    def misspell(data):
        data["contributors"][0]["parameters"] = ["link.Length"]
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=misspell)
    with pytest.raises(KinematicStudyError, match=r"no parameter 'link\.Length'"):
        load_kinematic_study(study_path, data_root, topologies)


def _features(data, plate_node="plate_attach"):
    data["geometry"]["features"] = [
        {"label": "link.length", "topology": "kin_fixture", "edge": "link_length",
         "component": None, "body": None},
        *({"label": f"link.point_a[{k}]", "topology": "kin_fixture", "node": plate_node,
           "component": "xyz"[k], "body": "plate"} for k in range(3)),
    ]


def test_geometry_features_when_present_and_agreeing_are_read(tmp_path):
    study_path, data_root, topologies = copy_fixture(tmp_path, sweep_edit=_features)
    study, _ = load_kinematic_study(study_path, data_root, topologies)
    assert [c.feature_source for c in study.contributors] == ["artifact", "artifact"]
    study, _ = load_fixture()
    assert [c.feature_source for c in study.contributors] == ["authored", "authored"]


def test_geometry_features_disagreeing_with_an_authored_label_refuses(tmp_path):
    study_path, data_root, topologies = copy_fixture(
        tmp_path, sweep_edit=lambda d: _features(d, plate_node="plate_bore"))
    with pytest.raises(KinematicStudyError, match=r"label 'link\.point_a\[0\]'"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_missing_run_is_a_refusal_naming_the_path(tmp_path):
    def other_run(data):
        data["sweep"]["run_id"] = "no-such-run"
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=other_run)
    with pytest.raises(KinematicStudyError, match="no-such-run.json"):
        load_kinematic_study(study_path, data_root, topologies)


# --------------------------------------------------------------------------- #
# 4b. a band's units against the column it scales                             #
# --------------------------------------------------------------------------- #

def _extra_parameters(*labels):
    """A sweep edit appending ``labels`` to the sensitivity table, entry 1.0."""
    def edit(data):
        for label in labels:
            data["sensitivity"]["parameters"].append(label)
            for rows in data["sensitivity"]["by_measure"].values():
                rows.append([1.0, 1.0, 1.0])
    return edit


def _inline(units, half=0.01):
    """An inline band about 0.0, cited, in ``units`` (``None``: no `units` key)."""
    dim = {"id": "b", "name": "b", "nominal": 0.0, "min": -half, "max": half,
           "source_ref": {"kind": "drawing", "document": "fixture.pdf",
                          "confidence": "traced"}}
    out = {"dimension": dim}
    if units is not None:
        out["units"] = units
    return out


def _added_contributor(zone, parameters, band):
    def edit(data):
        data["contributors"].append({
            "edge": "plate_attach_unbanded", "parameters": list(parameters),
            "feature": {"node": "plate_attach"}, "zone": zone, **band})
    return edit


def test_every_parameter_kind_has_a_unit_and_a_label_that_reads_as_it():
    study, sweep = load_fixture()
    assert parameter_unit(sweep, "link.point_a[2]") == ("length", LINKAGE_LENGTH_UNITS)
    assert parameter_unit(sweep, "link.length") == ("length", LINKAGE_LENGTH_UNITS)
    assert parameter_unit(sweep, "link.axis_a[0]") == ("direction", DIRECTION_UNITS)
    assert parameter_unit(sweep, "link.w_b[1]") == ("direction", DIRECTION_UNITS)
    assert parameter_unit(sweep, "drive.value") == ("driver", "mm")
    assert parameter_unit(sweep, "link.spring_rate") == (None, None)
    assert {parameter_unit(sweep, label)[0] for label in
            ("link.length", "link.axis_a[0]", "drive.value")} == set(PARAMETER_KINDS)
    # The fixture's own bands are mm on mm columns, so it loads as before.
    assert [c.band_units for c in study.contributors] == ["mm", "mm"]


def test_an_inch_band_on_a_millimetre_column_is_refused_naming_the_contributor(tmp_path):
    def inch_band(data):
        c = data["contributors"][0]
        del c["dimension_ref"]
        c.update(_inline("in"))
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=inch_band)
    with pytest.raises(KinematicStudyError,
                       match=r"contributor 'link_length'.s band is in 'in', but label "
                             r"'link\.length' is a length parameter in 'mm'"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_millimetre_band_on_direction_components_is_refused_and_names_the_length_it_needs(
        tmp_path):
    """The bushing-tipping case: a disk on an axis's components, banded by a
    clearance borrowed from an mm topology."""
    study_path, data_root, topologies = copy_fixture(
        tmp_path,
        study_edit=_added_contributor(
            "disk", ["link.axis_a[0]", "link.axis_a[1]"],
            {"dimension_ref": {"topology": "kin_fixture", "edge": "plate_attach_position"}}),
        sweep_edit=_extra_parameters("link.axis_a[0]", "link.axis_a[1]"))
    with pytest.raises(KinematicStudyError) as refused:
        load_kinematic_study(study_path, data_root, topologies)
    message = str(refused.value)
    assert "contributor 'plate_attach_unbanded'" in message
    assert "label 'link.axis_a[0]' is a direction parameter in 'rad'" in message
    assert "becomes a tilt only over a cited length" in message


def test_a_tilt_band_in_radians_on_direction_components_loads_and_folds(tmp_path):
    """The positive control for the refusal above: the same disk, its band a tilt."""
    study_path, data_root, topologies = copy_fixture(
        tmp_path,
        study_edit=_added_contributor("disk", ["link.axis_a[0]", "link.axis_a[1]"],
                                      _inline("rad", half=0.002)),
        sweep_edit=_extra_parameters("link.axis_a[0]", "link.axis_a[1]"))
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    rows = {r.contributor.edge: r for r in fold_at(study, sweep, 0).rows}
    disk = rows["plate_attach_unbanded"]
    assert disk.kind == "term"
    assert disk.magnitude == pytest.approx(math.sqrt(2) * 0.002)
    # ...and in degrees it is the same quantity off by 57.3, so it is refused.
    study_path, data_root, topologies = copy_fixture(
        tmp_path / "deg",
        study_edit=_added_contributor("disk", ["link.axis_a[0]", "link.axis_a[1]"],
                                      _inline("deg", half=0.1)),
        sweep_edit=_extra_parameters("link.axis_a[0]", "link.axis_a[1]"))
    with pytest.raises(KinematicStudyError, match=r"band is in 'deg'"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_band_on_the_driver_is_in_the_drivers_own_declared_unit(tmp_path):
    study_path, data_root, topologies = copy_fixture(
        tmp_path, study_edit=_added_contributor("band", ["drive.value"], _inline("mm")),
        sweep_edit=_extra_parameters("drive.value"))
    study, _ = load_kinematic_study(study_path, data_root, topologies)
    assert study.contributors[-1].band_units == "mm"
    study_path, data_root, topologies = copy_fixture(
        tmp_path / "deg", study_edit=_added_contributor("band", ["drive.value"], _inline("deg")),
        sweep_edit=_extra_parameters("drive.value"))
    with pytest.raises(KinematicStudyError,
                       match=r"label 'drive\.value' is a driver parameter in 'mm'"):
        load_kinematic_study(study_path, data_root, topologies)


def test_an_inline_band_with_no_units_is_refused(tmp_path):
    def unitless(data):
        c = data["contributors"][0]
        del c["dimension_ref"]
        c.update(_inline(None))
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=unitless)
    with pytest.raises(KinematicStudyError,
                       match=r"contributor 'link_length'.s band states no units"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_band_on_a_label_with_no_known_unit_is_refused_not_assumed(tmp_path):
    study_path, data_root, topologies = copy_fixture(
        tmp_path, study_edit=_added_contributor("band", ["link.spring_rate"], _inline("mm")),
        sweep_edit=_extra_parameters("link.spring_rate"))
    with pytest.raises(KinematicStudyError, match=r"knows no unit for that label"):
        load_kinematic_study(study_path, data_root, topologies)
    # A gap row on the same label needs no unit: it has no band to scale.
    study_path, data_root, topologies = copy_fixture(
        tmp_path / "gap",
        study_edit=_added_contributor("band", ["link.spring_rate"], {"gap": "no band cited"}),
        sweep_edit=_extra_parameters("link.spring_rate"))
    study, _ = load_kinematic_study(study_path, data_root, topologies)
    assert study.contributors[-1].is_gap


# --------------------------------------------------------------------------- #
# 5. stops and checks                                                         #
# --------------------------------------------------------------------------- #

def test_a_stop_is_found_by_measure_value_never_by_index():
    """The fixture's angles are 20, 9.6, 30.2 -- the low stop is point 1."""
    study, sweep = load_fixture()
    assert stop_index(study, sweep, "low") == 1
    assert stop_index(study, sweep, "high") == 2


def test_a_check_folds_its_limit_against_the_stop_total():
    """0.5 - [-0.34, 0.14] = [0.36, 0.84], at the low stop only."""
    study, sweep = load_fixture()
    check = check_at_stop(study, sweep, "low_margin")
    assert check.interval.min == pytest.approx(0.36)
    assert check.interval.max == pytest.approx(0.84)
    assert check.verdict == "pass" and check.margin == pytest.approx(0.36)


# --------------------------------------------------------------------------- #
# 6. the one-fold rule                                                        #
# --------------------------------------------------------------------------- #

def test_kinematic_py_combines_no_element_values_outside_fold():
    """The walker that holds thermal.py to the declared exception list, run here.

    A kinematic study derives coefficients (a norm, a sign) and hands one term
    per contributor to ``fold()``; it declares no exception, so the walker must
    find nothing -- and must find the planted site, so the empty answer means
    something.
    """
    fields = element_value_fields()
    source = KINEMATIC_PY.read_text(encoding="utf-8")
    assert combining_sites(source, fields) == ()
    planted = source + "\n\ndef planted(a, b):\n    return a.min + b.max\n"
    assert [s.function for s in combining_sites(planted, fields)] == ["planted"]


# --------------------------------------------------------------------------- #
# 7. the projection builder                                                   #
# --------------------------------------------------------------------------- #

def test_the_builder_projects_the_fixture_and_draws_its_plot():
    projection = builder.build(FIXTURE_TOPOLOGIES, FIXTURE_DATA,
                               provenance={"built_at": "fixture"})
    (row,) = projection["studies"]
    assert row["status"] == "ok", row["error"]
    assert [p["worst_case_max"] for p in row["envelope"]] == pytest.approx(
        [HAND[i][1] for i in range(3)])
    assert [p["nominal_measure"] for p in row["envelope"]] == [20.0, 9.6, 30.2]
    assert [s["index"] for s in row["stops"]] == [1, 2]
    assert row["sweep"]["run_id"] == "kin-fixture-run"
    assert row["checks"][0]["stop"] == "low" and row["checks"][0]["margin"] == 0.36
    tokens = builder.viewer_tokens()
    svg = builder.render_svg(row, tokens)
    assert svg.startswith("<svg") and "low stop" in svg and "limit ±0.5" in svg
    assert f'font-size="{tokens["--t-micro"]}"' in svg


# --------------------------------------------------------------------------- #
# 8. [real] the first study against P2                                        #
# --------------------------------------------------------------------------- #

#: Per stop: index, nominal blade pitch, the linkage terms' worst-case and RSS
#: halves there (the six direct contributors -- the envelope's own fold), the
#: stop's own worst-case and RSS halves (the linkage plus its axial stack), the
#: S461-261 reach margin and verdict, and the direct contributors' ranked table
#: as (edge, kind, sign, coefficient). Since each_stop_is_its_own_stack
#: (2026-11-03) every stop carries the chain to its own contact face, and the
#: check is one-sided reach: from the 10-29 figures (-7: 1.707/0.985, margin
#: -1.207 against the misapplied +/-0.5; +72: 0.315/0.169, +0.185) to these.
REAL = {
    "minus7": (0, -6.992, (0.290, 0.169), (2.355, 1.034), -0.363, "marginal", [
        ("pitch_plate_attach_height", "term", -1, 1.555),
        ("pitch_link_length", "term", 1, 1.574),
        ("pitch_plate_tan_link_attach_radius", "term", 1, 0.311),
        ("pitch_arm_radius", "term", 1, 1.574),
        ("tan_link_mount_height", "term", 1, 0.172),
        ("tan_link_length", "term", 1, 0.311),
    ]),
    "plus72": (79, 72.001, (0.315, 0.169), (0.784, 0.283), 1.217, "pass", [
        ("pitch_plate_attach_height", "term", -1, 1.489),
        ("pitch_plate_tan_link_attach_radius", "term", 1, 0.487),
        ("pitch_link_length", "term", 1, 1.542),
        ("tan_link_length", "term", 1, 0.487),
        ("tan_link_mount_height", "term", -1, 0.241),
        ("pitch_arm_radius", "term", 1, 1.542),
    ]),
}

#: Per stop: the axial stack's own halves in degrees, its position halves in
#: mm (worst, RSS), J there, and the RSS reach margin beside the worst one.
REAL_STACKS = {
    "minus7": ((2.065, 1.020), (1.195, 0.590), -1.728, 0.958),
    "plus72": ((0.468, 0.227), (0.375, 0.182), -1.249, 1.718),
}

#: The feather stop's axial stack, in walk order: (edge, sign, half-band mm).
FEATHER_STACK = [
    ("tan_link_mount_overall_height", -1, 0.1),
    ("gas_spring_mount_datum_a_to_end_stop", 1, 0.1),
    ("piston_head_lower_face_flatness", 1, 0.025),
    ("piston_body_shoulder_to_top", 1, 0.05),
    ("piston_body_flange_to_top", -1, 0.1),
]


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
@pytest.mark.parametrize("stop", sorted(REAL))
def test_real_the_first_study_pins_both_stops_against_p2(stop):
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    index, nominal, linkage, total, margin, verdict, table = REAL[stop]
    assert stop_index(study, sweep, stop) == index
    result = fold_at(study, sweep, index)
    assert round(result.nominal, 3) == nominal
    assert (round(result.interval.worst_case_half, 3),
            round(result.interval.rss_half, 3)) == linkage
    assert result.gap_count == 0
    assert result.groups == ()
    assert [(r.contributor.edge, r.kind, r.sign, round(r.coefficient, 3))
            for r in result.rows] == table
    at_stop = fold_at_stop(study, sweep, stop)
    assert at_stop.point.interval == result.interval
    assert (round(at_stop.interval.worst_case_half, 3),
            round(at_stop.interval.rss_half, 3)) == total
    stack, position, entry, rss_margin = REAL_STACKS[stop]
    assert (round(at_stop.stack.interval.worst_case_half, 3),
            round(at_stop.stack.interval.rss_half, 3)) == stack
    assert (round(at_stop.stack.position.worst_case_half, 3),
            round(at_stop.stack.position.rss_half, 3)) == position
    assert round(at_stop.stack.entry, 3) == entry
    # worst case is the two sub-stacks' sum; RSS is one quadrature over both
    assert at_stop.interval.worst_case_half == pytest.approx(
        result.interval.worst_case_half + at_stop.stack.interval.worst_case_half, abs=1e-12)
    assert at_stop.interval.rss_half == pytest.approx(math.hypot(
        result.interval.rss_half, at_stop.stack.interval.rss_half), abs=1e-12)
    check = check_at_stop(study, sweep, f"s461_261_reach_at_{stop}")
    assert round(check.margin, 3) == margin
    assert round(rss_check_at_stop(study, sweep, check.check_id).min, 3) == rss_margin
    assert (check.verdict, check.verdict_scope) == (verdict, "budget")
    assert check.complete is False
    assert any("vpa_pitch_linkage_hub_to_feather_stop" in t
               and "anchored to the blade-root bores" in t for t in check.excluded_terms)


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_the_reach_checks_are_one_sided_against_s461_261():
    """+72: worst-case MINIMUM pitch >= +70; -7: worst-case MAXIMUM <= -5. The
    margin is the signed distance to the bound, read off the stop's own pitch
    (the sweep's nominal plus the fold), and S461-607 is checked nowhere."""
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    assert {(c["check_id"], c["bound"], c["limit"]["value"], c["limit"]["source_ref"]["cell"])
            for c in study.checks} == {
        ("s461_261_reach_at_plus72", "at_least", 70, "S461-261"),
        ("s461_261_reach_at_minus7", "at_most", -5, "S461-261")}
    assert "S461-607" not in json.dumps(study.checks)
    for stop, sign, limit in (("plus72", 1, 70.0), ("minus7", -1, -5.0)):
        at_stop = fold_at_stop(study, sweep, stop)
        edge = at_stop.interval.min if sign > 0 else at_stop.interval.max
        expected = sign * (at_stop.point.nominal + edge - limit)
        assert check_at_stop(study, sweep, f"s461_261_reach_at_{stop}").margin == (
            pytest.approx(expected, abs=1e-12))


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_each_stop_carries_the_chain_to_its_own_contact_face():
    """The feather stop's stack is the mounts and the piston body (no head);
    the low stop's is the same chain plus the travel, where the heads are
    (Jeff, 2026-11-03); the hub anchor is a declared gap at both. The feather
    chain is one ref shared by both stops, so its terms are the shared ones.
    The datum is still where the driver is 0, and zeroes nothing."""
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    assert study.datum["stop"] == "plus72"
    assert sweep.driver_values[stop_index(study, sweep, "plus72")] == 0.0
    feather, travel, anchor = study.study_refs
    assert [r.study_id for r in study.stop("plus72").axial_stack] == [
        feather.study_id, anchor.study_id]
    assert [r.study_id for r in study.stop("minus7").axial_stack] == [
        feather.study_id, travel.study_id, anchor.study_id]
    assert feather.study_id == "vpa_pitch_linkage_feather_stop_axial_position"
    assert travel.study_id == "vpa_pitch_linkage_travel_between_end_stops"
    assert (feather.stops, travel.stops, anchor.stops) == (
        ("minus7", "plus72"), ("minus7",), ("minus7", "plus72"))
    assert [(t.edge, t.sign, round(t.dimension.half_range, 3)) for t in feather.terms] == (
        FEATHER_STACK)
    assert feather.completeness["complete"] is True
    assert not {t.edge for t in feather.terms} & {
        "piston_head_lower_thickness", "piston_head_upper_thickness"}
    assert (anchor.gap is not None, anchor.terms, anchor.total) == (True, (), None)
    for stop in ("plus72", "minus7"):
        assert fold_at_stop(study, sweep, stop).stack.shared == tuple(e for e, *_ in FEATHER_STACK)
    assert study.point_refs == []


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_the_range_between_the_stops_cancels_what_both_stops_share():
    """Feather less low: 72.001 - (-6.992) = 78.992 nominal, +/-1.730 worst
    case, +/-0.977 RSS. The shared terms -- the feather stack's five and the
    six linkage terms -- enter once at the difference of their two weights;
    the travel's four remain at the low stop's."""
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    result = range_between_stops(study, sweep)
    assert (result.high.stop.id, result.low.stop.id) == ("plus72", "minus7")
    assert round(result.nominal.nominal, 3) == 78.992
    assert (round(result.interval.worst_case_half, 3),
            round(result.interval.rss_half, 3)) == (1.730, 0.977)
    by_kind = {}
    for t in result.terms:
        by_kind.setdefault((t.kind, t.shared), []).append(t)
    assert len(by_kind[("linkage", True)]) == 6
    assert [t.edge for t in by_kind[("stop_position", True)]] == [e for e, *_ in FEATHER_STACK]
    assert [t.edge for t in by_kind[("stop_position", False)]] == [
        t.edge for t in study.stop("minus7").axial_stack[1].terms]
    shared = by_kind[("stop_position", True)]
    assert round(sum(abs(t.high) * t.half for t in shared), 3) == 0.468
    assert round(sum(abs(t.low) * t.half for t in shared), 3) == 0.648
    assert round(sum(t.magnitude for t in shared), 3) == 0.180
    for t in shared:
        assert t.coefficient == pytest.approx(t.high - t.low, abs=1e-12)
    for t in by_kind[("stop_position", False)]:
        assert t.coefficient == pytest.approx(-t.low, abs=1e-12)


def gap_claims_naming_a_banded_contributor(excluded_terms, term_edges):
    """The excluded rows that call a contributor a gap (no cited band) while
    naming one whose projected row is a ``term`` -- a list that outlived its
    gap (the 2026-10-26 banding of the tangential link left two)."""
    return [text for text in excluded_terms
            if ("no cited band" in text or "gap row" in text)
            and any(edge in text for edge in term_edges)]


def test_an_excluded_row_that_claims_a_gap_names_no_banded_contributor():
    assert gap_claims_naming_a_banded_contributor(
        ["tan_link_length -- contributors with a sensitivity and no cited band (the gap rows)",
         "temperature"], {"tan_link_length"}) == [
        "tan_link_length -- contributors with a sensitivity and no cited band (the gap rows)"]
    assert gap_claims_naming_a_banded_contributor(
        ["tan_link_length -- no cited band"], {"pitch_link_length"}) == []


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
@pytest.mark.parametrize("stop", sorted(REAL))
def test_real_no_excluded_row_calls_a_banded_contributor_a_gap(stop):
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    term_edges = {r.contributor.edge for r in fold_at(study, sweep, REAL[stop][0]).rows
                  if r.kind == "term"}
    assert term_edges, "no term rows -- the check below would be vacuous"
    for spec in study.checks:
        assert gap_claims_naming_a_banded_contributor(
            spec.get("excluded_terms", ()), term_edges) == [], spec["check_id"]


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_the_projection_carries_every_coefficient_across_p2():
    """The by-point field, value-level on P2: 80 points per contributor, the
    stop values the table pins at its ends, and the sign change of the
    tangential-link mount height between points 44 and 45 (actuator travel
    30.505 -> 29.613 mm) that the per-stop tables could only state."""
    row = builder.project_study(REAL_STUDY, REAL_DATA, REAL_STUDY.parent)
    assert row["status"] == "ok", row["error"]
    by_edge = {c["edge"]: c["by_point"] for c in row["contributors"]}
    assert sorted(by_edge) == sorted(edge for edge, *_ in REAL["minus7"][6])
    assert {len(points) for points in by_edge.values()} == {80}
    for stop in REAL:
        index, table = REAL[stop][0], REAL[stop][6]
        assert [(edge, by_edge[edge][index]["sign"],
                 round(by_edge[edge][index]["coefficient"], 3))
                for edge, _, _, _ in table] == [(e, s, c) for e, _, s, c in table]
    mount = by_edge["tan_link_mount_height"]
    assert [p["sign"] for p in mount] == [1] * 45 + [-1] * 35
    assert (round(mount[44]["coefficient"], 4), round(mount[45]["coefficient"], 4)) == (
        0.0006, 0.0033)
    assert round(max(p["magnitude"] for p in by_edge["pitch_plate_attach_height"]), 3) == 0.156


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_every_authored_feature_join_reconciles_against_the_runs_own_features():
    """The study folds the run that names its features (2026-10-21): every
    label every contributor perturbs has a ``geometry.features[]`` entry, and
    the load's own reconciliation agreed with each one."""
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    assert sweep.run_id == REAL_RUN.stem == study.sweep_ref["run_id"]
    assert sweep.features is not None
    unlisted = [(c.edge, label) for c in study.contributors for label in c.parameters
                if label not in sweep.features]
    assert unlisted == []
    assert [c.feature_source for c in study.contributors] == ["artifact"] * 6
    assert {c.band_units for c in study.contributors if not c.is_gap} == {"mm"}


# --------------------------------------------------------------------------- #
# 9. where the viewer reads it (handoff the_viewer_shows_a_kinematic_study)   #
# --------------------------------------------------------------------------- #

def test_the_projection_lands_inside_the_directory_the_viewer_is_served_from():
    """``projections/viewer/`` is the directory drawing-checker mounts as
    ``/tolstack/data/`` and the hosted bake copies; a kinematic projection
    anywhere else is a file the served viewer cannot fetch. Paired against the
    topology builder's own constant rather than a path written here, and
    against the two JS readers that name the file: the viewer's config and the
    freshness check's input list."""
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import build_topology_projection  # noqa: PLC0415

    assert builder.PROJECTION_SUBDIR.parent == build_topology_projection.PROJECTION_SUBDIR
    rel = f"{builder.PROJECTION_SUBDIR.name}/{builder.PROJECTION_NAME}"
    config = (REPO_ROOT / "apps" / "viewer" / "config.js").read_text(encoding="utf-8")
    assert (f'kinematicProjection: ["{builder.PROJECTION_SUBDIR.name}", '
            f'"{builder.PROJECTION_NAME}"]') in config
    freshness = (REPO_ROOT / "scripts" / "projection_freshness.cjs").read_text(
        encoding="utf-8")
    assert f'"{rel}"' in freshness
    # ...and the annotator's, which reads the same file for its sweep rail's
    # contributor rows (handoff the_sweep_rail_shows_the_mechanism) and names
    # it from the repo root, as every path in its config does.
    annotate = (REPO_ROOT / "apps" / "annotate" / "config.js").read_text(encoding="utf-8")
    parts = ("data",) + builder.PROJECTION_SUBDIR.parts + (builder.PROJECTION_NAME,)
    assert ("kinematicProjection: [" + ", ".join(f'"{x}"' for x in parts) + "]") in annotate


def _sweep(path: Path, run_id: str, ts: str, topologies, schema="linkage-sweep/v1"):
    features = [{"label": f"x{i}", "topology": t} for i, t in enumerate(topologies or [])]
    path.write_text(json.dumps({
        "schema": schema, "run_id": run_id, "ts": ts,
        "mechanism": {"name": f"mech_{run_id}", "driver": {"label": "travel", "unit": "mm"}},
        "geometry": {"features": features} if topologies is not None else {},
    }), encoding="utf-8")


def test_models_list_each_topologys_runs_newest_first_by_timestamp(tmp_path):
    sweeps = tmp_path / "inbox" / "linkage-sweeps"
    sweeps.mkdir(parents=True)
    # "a-..." sorts first by id and is the OLDER run -- the sort the annotator
    # once got wrong.
    _sweep(sweeps / "a-new.json", "a-new", "2026-10-02T00:00:00Z", ["topo_a"])
    _sweep(sweeps / "z-old.json", "z-old", "2026-10-01T00:00:00Z", ["topo_a", "topo_b"])
    _sweep(sweeps / "bare.json", "bare", "2026-10-03T00:00:00Z", None)
    _sweep(sweeps / "future.json", "future", "2026-10-04T00:00:00Z", ["topo_a"],
           schema="linkage-sweep/v9")
    (sweeps / "broken.json").write_text("{not json", encoding="utf-8")
    models = builder.project_models(builder.sweep_runs(tmp_path))
    assert [(m["topology"], m["newest_run_id"], [r["run_id"] for r in m["runs"]])
            for m in models] == [("topo_a", "a-new", ["a-new", "z-old"]),
                                 ("topo_b", "z-old", ["z-old"])]
    assert models[0]["runs"][0]["mechanism"] == "mech_a-new"


def test_a_study_that_did_not_build_is_named_on_the_builds_last_lines(tmp_path, capsys):
    """2026-10-21: with its sweep absent the study was written as `error`, the
    rebuild exited 0 and its stamp read clean -- the same output as a good
    build. The report ends the output and names the study and its reason."""
    ok = builder.build(FIXTURE_TOPOLOGIES, FIXTURE_DATA, provenance={"built_at": "f"})
    assert builder.unbuilt_report(ok) == ["kinematic studies: 1 of 1 built"]

    empty = tmp_path / "data"
    (empty / "inbox" / "linkage-sweeps").mkdir(parents=True)
    broken = builder.build(FIXTURE_TOPOLOGIES, empty, provenance={"built_at": "f"})
    lines = builder.unbuilt_report(broken)
    assert lines[0] == "kinematic studies: 0 of 1 built"
    assert lines[1].startswith("  NOT BUILT fixture: KinematicStudyError: no sweep artifact at ")
    assert "kin-fixture-run.json" in lines[1]

    # --report reads the projection already on disk and builds nothing.
    out = empty / builder.PROJECTION_SUBDIR / builder.PROJECTION_NAME
    out.parent.mkdir(parents=True)
    out.write_text(json.dumps(broken), encoding="utf-8")
    assert builder.main(["--report", "--data-root", str(empty)]) == 0
    assert capsys.readouterr().out.splitlines() == lines
    assert builder.main(["--report", "--data-root", str(tmp_path / "nowhere")]) == 1


def test_the_projection_states_its_display_precision():
    """The viewer formats with this and picks no precision of its own."""
    projection = builder.build(FIXTURE_TOPOLOGIES, FIXTURE_DATA,
                               provenance={"built_at": "fixture"})
    assert projection["display_decimals"] == builder.DISPLAY_DECIMALS == 3
    assert projection["models"] == []      # the fixture sweep names no topology


def test_every_contributor_carries_its_row_at_every_point_in_study_order():
    """`contributors[].by_point[]` (2026-10-26): the stops' coefficient field at
    every sweep point, so the page can draw a coefficient's curve. The stop
    tables are two of its points, and they must agree with it."""
    projection = builder.build(FIXTURE_TOPOLOGIES, FIXTURE_DATA,
                               provenance={"built_at": "fixture"})
    (row,) = projection["studies"]
    assert [c["edge"] for c in row["contributors"]] == [
        "link_length", "plate_attach_position"]
    link = row["contributors"][0]["by_point"]
    assert [p["index"] for p in link] == [0, 1, 2]
    # J_len = 2, -1, 0.5 (HAND above): the sign follows the Jacobian.
    assert [(p["sign"], p["coefficient"]) for p in link] == [(1, 2.0), (-1, 1.0), (1, 0.5)]
    assert [p["magnitude"] for p in link] == pytest.approx([0.4, 0.2, 0.1])
    sphere = row["contributors"][1]["by_point"]
    assert [p["coefficient"] for p in sphere] == pytest.approx([5.0, 2.0, 6.0])
    for stop in row["stops"]:
        for stop_row in stop["rows"]:
            point = next(c for c in row["contributors"]
                         if c["edge"] == stop_row["edge"])["by_point"][stop["index"]]
            assert (point["sign"], point["coefficient"], point["magnitude"]) == (
                stop_row["sign"], stop_row["coefficient"], stop_row["magnitude"])


@pytest.mark.parametrize("drawing, names, on_file", [
    ("213863-004", ["213863-004-A.pdf"], True),
    ("215177-001", ["215177-A.pdf"], True),          # exported under the base number
    ("215177-001", ["215177-002-A.pdf"], False),     # a different dash number
    ("215177-001", ["2151770-A.pdf"], False),        # a different drawing
    ("216332-001", [], False),
])
def test_a_drawing_is_on_file_when_a_pdf_is_named_for_it(drawing, names, on_file):
    assert builder.drawing_on_file(drawing, names) is on_file


def test_a_gap_row_names_the_drawing_that_would_resolve_it_and_whether_it_is_on_file(tmp_path):
    def point_the_sphere_at_an_unbanded_edge(data):
        data["contributors"][1]["dimension_ref"]["edge"] = "plate_attach_unbanded"
    _, data_root, topologies = copy_fixture(
        tmp_path, study_edit=point_the_sphere_at_an_unbanded_edge)
    topology_path = topologies / "topology_kin_fixture.json"
    topology = json.loads(topology_path.read_text(encoding="utf-8"))
    topology["parts"][1]["drawing"] = "900100-001"
    topology_path.write_text(json.dumps(topology), encoding="utf-8")
    dc_root = tmp_path / "drawing-checker"

    def gap_drawings():
        (row,) = builder.build(topologies, data_root, provenance={"built_at": "fixture"},
                               drawing_checker_root=dc_root)["studies"]
        (gap,) = row["gap_rows"]
        assert gap["edge"] == "plate_attach_position"
        return gap["drawings"]

    assert gap_drawings() == [{"part": "plate", "part_name": "Plate",
                               "drawing": "900100-001", "on_file": False}]
    inbox = dc_root / "data" / "inbox" / "drawings"
    inbox.mkdir(parents=True)
    (inbox / "900100-B.pdf").write_bytes(b"%PDF-")
    assert gap_drawings()[0]["on_file"] is True


# --------------------------------------------------------------------------- #
# linkage's joint types, read off a run's own residual rows                    #
# --------------------------------------------------------------------------- #

#: The sibling solver's joint classes. Read when it is on disk (this machine's
#: workspace); a checkout without the sibling skips, and says so.
LINKAGE_JOINTS_PY = Path(r"C:\workspace\linkage\linkage\joints.py")
REAL_SWEEPS = REAL_DATA / "inbox" / "linkage-sweeps"


def _linkage_joint_rows(source: str) -> dict:
    """``{TYPE: ROW_NAMES}`` for every class in ``linkage/joints.py`` that
    declares both, read with ``ast`` -- the sibling is never imported."""
    import ast

    out = {}
    for node in ast.parse(source).body:
        if not isinstance(node, ast.ClassDef):
            continue
        fields = {}
        for statement in node.body:
            if (isinstance(statement, ast.Assign) and len(statement.targets) == 1
                    and isinstance(statement.targets[0], ast.Name)
                    and statement.targets[0].id in ("TYPE", "ROW_NAMES")):
                fields[statement.targets[0].id] = ast.literal_eval(statement.value)
        if "TYPE" in fields and "ROW_NAMES" in fields:
            out[fields["TYPE"]] = tuple(fields["ROW_NAMES"])
    return out


def test_every_joint_type_has_its_own_row_set():
    """The reading is unambiguous only while no two types share a row tuple."""
    from tolerance_stack.kinematic import (
        LINKAGE_JOINT_ROW_NAMES, LINKAGE_JOINT_ROW_SIGNATURES, LINKAGE_JOINT_TYPES)

    rows = list(LINKAGE_JOINT_ROW_NAMES.values())
    assert len(set(rows)) == len(rows)
    assert LINKAGE_JOINT_TYPES == tuple(LINKAGE_JOINT_ROW_NAMES)
    assert [tuple(s.split(" ")) for s in LINKAGE_JOINT_ROW_SIGNATURES] == rows


@pytest.mark.skipif(not LINKAGE_JOINTS_PY.exists(),
                    reason=f"the linkage repo is not at {LINKAGE_JOINTS_PY}")
def test_the_joint_row_table_is_linkages_own():
    """A copy of the sibling's TYPE/ROW_NAMES pairs, compared whole."""
    from tolerance_stack.kinematic import LINKAGE_JOINT_ROW_NAMES

    theirs = _linkage_joint_rows(LINKAGE_JOINTS_PY.read_text(encoding="utf-8"))
    assert theirs, "no TYPE/ROW_NAMES pair read out of linkage/joints.py"
    assert dict(LINKAGE_JOINT_ROW_NAMES) == theirs


@pytest.mark.skipif(not REAL_SWEEPS.exists(), reason=f"[real] no runs at {REAL_SWEEPS}")
def test_real_every_published_joint_reads_as_exactly_one_type():
    """Every joint of every published v1 run, typed by its own rows."""
    from tolerance_stack.kinematic import LINKAGE_JOINT_ROW_NAMES

    by_rows = {rows: name for name, rows in LINKAGE_JOINT_ROW_NAMES.items()}
    seen = 0
    for path in sorted(REAL_SWEEPS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if doc.get("schema") != "linkage-sweep/v1":
            continue
        joints: dict = {}
        for label in doc["mechanism"]["row_labels"]:
            joint, _, row = label.partition(".")
            joints.setdefault(joint, []).append(row)
        for joint, rows in joints.items():
            assert tuple(rows) in by_rows, f"{path.name}: {joint} rows {rows}"
            seen += 1
    assert seen


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_the_tangential_link_length_band_is_the_topology_edges_citation_about_zero():
    """The study's inline band is authored about 0 (a contributor requires it);
    the topology edge carries the same citation about the drawn 61.40. One
    citation, two spellings: half-width and source_ref must agree."""
    study, _ = load_kinematic_study(REAL_STUDY, REAL_DATA)
    band = next(c for c in study.contributors if c.edge == "tan_link_length").dimension
    topo = load_topology(REAL_STUDY.parent / "topology_vpa_pitch_linkage.json")
    edge = topo.edge("tan_link_length").dimension
    assert (band.nominal, edge.nominal) == (0.0, 61.40)
    assert band.max == pytest.approx(0.05)
    assert edge.max - edge.nominal == pytest.approx(band.max)
    assert edge.nominal - edge.min == pytest.approx(band.max)
    assert band.source_ref == edge.source_ref
    assert edge.source_ref.confidence == "traced"


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_every_contributor_carries_the_body_its_part_moves_with():
    """Each contributor's ``body`` is read off the topology's own ``bodies``
    (2026-10-26), and where the run names a body for the contributor's feature
    the two agree -- the topology's grouping and the solver's, met on one row."""
    study, _ = load_kinematic_study(REAL_STUDY, REAL_DATA)
    topo = load_topology(REAL_STUDY.parent / "topology_vpa_pitch_linkage.json")
    for c in study.contributors:
        part = topo.edge(c.edge).part
        assert c.body == topo.body_of(part).id, c.edge
        if c.feature.get("body") is not None:
            assert c.feature["body"] == c.body, (
                f"{c.edge}: the run says {c.feature['body']!r}, the topology "
                f"puts {part!r} in {c.body!r}")
    assert {c.body for c in study.contributors} == {
        "pitch_link", "blade", "pitch_plate", "tan_link", "base"}


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
def test_real_every_borrowed_band_is_an_edge_of_the_studys_own_topology():
    """Since the 2026-10-26 fold the kinematic study's bands come from inside the
    one topology: no contributor names a second model (the cross-topology ref
    stays legal in the schema, for a document that has one to borrow from)."""
    study, _ = load_kinematic_study(REAL_STUDY, REAL_DATA)
    raw = json.loads(REAL_STUDY.read_text(encoding="utf-8"))
    refs = [c["dimension_ref"] for c in raw["contributors"] if "dimension_ref" in c]
    assert len(refs) == 5
    assert {r["topology"] for r in refs} == {study.topology}


# --------------------------------------------------------------------------- #
# 10. a contributor that is itself a study (a_contributor_may_be_a_study)     #
# --------------------------------------------------------------------------- #

#: The driver's Jacobian column for the fixture sweep, added by the edit below:
#: d(angle)/d(drive) at the three points (and a zero column for ``travel``).
#: The stops are points 1 (``low``) and 2 (``high``), so the hand cases live
#: there: J = 1.5 at ``low``, and a sign change to -2.0 at ``high``.
DRIVE_J = [0.7, 1.5, -2.0]

#: A chain study of the fixture topology, two terms: ``link_length`` walked
#: with its authored direction (+1, band -0.1..+0.3 about 0) and ``link_back``
#: walked AGAINST it (-1, band 2.8..3.4 about a nominal of 3.0 -- so about
#: zero it is -0.2..+0.4, asymmetric on purpose).
CHAIN_STUDY = {
    "schema": "joby.tolerance_stack/study/v0", "id": "fixture_chain", "title": "Fixture chain",
    "topology": "kin_fixture", "from": "link_end_a", "to": "link_end_c",
    "selection": ["link_length", "link_back"], "no_checks_reason": "fixture",
}


def copy_fixture_with_a_chain(tmp_path, driver_unit=None, stacks=("low", "high"),
                              ref_edit=None, as_contributor=False):
    """A fixture copy whose sweep carries a driver column, whose topology carries
    the two-term chain, and whose study puts a ``study_ref`` on ``drive.value``
    (the driver) into the ``axial_stack`` of each stop in ``stacks`` (the
    others get a declared gap, so every stop has a stack). ``as_contributor``
    puts the ref among the contributors instead. ``ref_edit`` edits the ref
    before it is written."""

    def sweep_edit(data):
        data["sensitivity"]["parameters"].append("drive.value")
        data["sensitivity"]["by_measure"]["angle"].append(list(DRIVE_J))
        data["sensitivity"]["by_measure"]["travel"].append([0.0, 0.0, 0.0])
        if driver_unit is not None:
            data["mechanism"]["driver"]["unit"] = driver_unit

    def study_edit(data):
        ref = {"study_ref": {
            "topology": "kin_fixture", "study_id": "fixture_chain", "parameter": "drive.value"}}
        if ref_edit is not None:
            ref_edit(ref)
        if as_contributor:
            data["contributors"].append(ref)
            return
        for stop in data["stops"]:
            stop["axial_stack"] = [ref] if stop["id"] in stacks else [dict(
                FIXTURE_UNPLACED)]

    study_path, data_root, topologies = copy_fixture(
        tmp_path, study_edit=study_edit, sweep_edit=sweep_edit)
    topology_path = topologies / "topology_kin_fixture.json"
    data = json.loads(topology_path.read_text(encoding="utf-8"))
    data["nodes"].append({"id": "link_end_c", "name": "Link end C", "parts": ["link"],
                          "kind": "datum_feature"})
    data["edges"].append({
        "id": "link_back", "name": "Link back", "from": "link_end_c", "to": "link_end_b",
        "kind": "structural", "part": "link",
        "dimension": {"id": "link_back", "name": "Link back", "nominal": 3.0, "min": 2.8,
                      "max": 3.4, "source_ref": {"kind": "spec", "document": "FIXTURE-2.pdf",
                                                 "sheet": 1, "confidence": "untraced"}}})
    topology_path.write_text(json.dumps(data), encoding="utf-8")
    (topologies / "study_fixture_chain.json").write_text(
        json.dumps(CHAIN_STUDY), encoding="utf-8")
    return study_path, data_root, topologies


#: The declared gap a stop with no chain of its own carries in these fixtures.
FIXTURE_UNPLACED = {
    "study_ref": {"topology": "kin_fixture", "study_id": "fixture_unplaced",
                  "parameter": "drive.value"},
    "title": "Fixture unplaced", "gap": "This stop's contact is not authored"}

#: The fixture's stops: id -> sweep point.
FIXTURE_STOPS = {"low": 1, "high": 2}


def test_a_stack_study_ref_enters_no_points_fold(tmp_path):
    """A ref in a stop's axial stack is where that stop is, never a term of the
    envelope: every point folds the direct contributors alone, to the hand values."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    for point in range(3):
        result = fold_at(study, sweep, point)
        assert result.groups == ()
        assert (result.interval.min, result.interval.max) == pytest.approx(HAND[point][:2])
        assert result.interval.rss_half == pytest.approx(HAND[point][3])


def test_a_study_ref_enters_its_terms_scaled_by_the_jacobian_with_signs_multiplied(tmp_path):
    """At each stop whose stack holds it, parent coefficient k = |J|; the leaves
    are k x 1 each, and the sign is sign(J) x the term's own sign (link_back is
    walked against). One ref, named by both stops."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    (ref,) = study.study_refs
    assert (ref.study_id, ref.parameter, ref.units) == ("fixture_chain", "drive.value", "mm")
    assert ref.stops == ("low", "high")
    assert [t.edge for t in ref.terms] == ["link_length", "link_back"]
    assert [t.sign for t in ref.terms] == [1, -1]
    back = ref.terms[1]
    # the leaf's band is read about zero: link_back's 2.8..3.4 about 3.0 ...
    assert (back.dimension.nominal, back.dimension.min, back.dimension.max) == (
        0.0, pytest.approx(-0.2), pytest.approx(0.4))
    # ... and its citation is the sub-study edge's own, untouched
    assert back.dimension.source_ref is back.source.source_ref
    for stop, point in FIXTURE_STOPS.items():
        j = DRIVE_J[point]
        stack = fold_at_stop(study, sweep, stop).stack
        (group,) = stack.groups
        assert group.ref is ref
        assert stack.entry == group.entry == j
        assert [c.coefficient for c in group.children] == pytest.approx([abs(j), abs(j)])
        own = (1 if j > 0 else -1)
        assert [c.sign for c in group.children] == [own * 1, own * -1]
        assert stack.shared == ("link_length", "link_back")


def test_a_stops_position_is_its_stacks_leaves_folded_once_in_the_drivers_unit(tmp_path):
    """link_length (-0.1..+0.3, ratio 1, +1) and link_back (-0.2..+0.4 about
    zero, ratio 1, walked against): position worst case [-0.1 - 0.4, 0.3 +
    0.2] = [-0.5, +0.5], half 0.5; RSS half sqrt(0.2^2 + 0.3^2) -- in mm, no J."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    for stop in FIXTURE_STOPS:
        x = fold_at_stop(study, sweep, stop).stack.position
        assert (x.min, x.max) == (pytest.approx(-0.5), pytest.approx(0.5))
        assert x.rss_half == pytest.approx(math.sqrt(0.2 ** 2 + 0.3 ** 2))


def test_worst_case_is_the_sum_over_leaves_and_rss_is_one_quadrature(tmp_path):
    """The low stop (point 1, J = 1.5), by hand. The direct contributors are
    the fixture's own [-0.34, 0.14] (RSS centre -0.1, half sqrt(0.2^2 +
    0.04^2)). The leaves are link_length (half 0.2, mid +0.1, weight +1.5) and
    link_back (half 0.3, mid +0.1, weight -1.5): worst case 1.5 x (0.2 + 0.3)
    = 0.75 each way about a centre of 1.5 x 0.1 - 1.5 x 0.1 = 0; RSS one
    quadrature over ALL FOUR terms."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    at_stop = fold_at_stop(study, sweep, "low")
    interval = at_stop.interval
    assert interval.min == pytest.approx(-0.34 - 0.75)
    assert interval.max == pytest.approx(0.14 + 0.75)
    assert interval.rss_center == pytest.approx(-0.1)
    assert interval.rss_half == pytest.approx(
        math.sqrt(0.2 ** 2 + 0.04 ** 2 + (1.5 * 0.2) ** 2 + (1.5 * 0.3) ** 2))
    assert at_stop.stack.interval.worst_case_half == pytest.approx(0.75)


def test_a_stops_band_is_the_linkage_there_plus_its_stack_at_the_slope(tmp_path):
    """|J| x the position half + the linkage half at the stop, at both stops
    (J = 1.5 and -2.0, half 0.5)."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    for stop, point in FIXTURE_STOPS.items():
        at_stop = fold_at_stop(study, sweep, stop)
        direct = (HAND[point][1] - HAND[point][0]) / 2
        assert at_stop.point.interval.worst_case_half == pytest.approx(direct)
        assert at_stop.interval.worst_case_half == pytest.approx(
            abs(DRIVE_J[point]) * 0.5 + direct)


def test_a_stop_whose_stack_is_a_gap_is_its_linkage_band_and_incomplete(tmp_path):
    """stacks ["high"]: the low stop's stack is a declared gap, so its band is
    the linkage terms' own there and its check is incomplete, naming the gap;
    the high stop still carries the chain, now in its stack alone."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, stacks=["high"]))
    low = fold_at_stop(study, sweep, "low")
    assert [r.study_id for r in low.stack.refs] == ["fixture_unplaced"]
    assert low.stack.position.worst_case_half == 0.0
    assert low.interval == low.point.interval
    assert low.stack.shared == ()
    check = check_at_stop(study, sweep, "low_margin")
    assert check.margin == pytest.approx(0.5 - HAND[1][1])      # the limit less the max
    assert check.complete is False
    assert any("fixture_unplaced" in t for t in check.excluded_terms)
    high = fold_at_stop(study, sweep, "high")
    assert high.stack.position.worst_case_half == pytest.approx(0.5)
    assert high.stack.shared == ()


def test_the_retired_applies_to_form_is_refused_naming_the_handoff(tmp_path):
    """The 2026-10-29 shape -- a driver ref among the contributors, saying which
    stops it moves -- is refused, and the message names the handoff that moved
    it into each stop's axial stack."""
    def old_form(ref):
        ref["applies_to"] = ["low"]
    with pytest.raises(KinematicStudyError, match="`applies_to`, the form retired by handoff"
                       ) as refusal:
        load_kinematic_study(*copy_fixture_with_a_chain(
            tmp_path, ref_edit=old_form, as_contributor=True))
    assert STOP_STACK_HANDOFF == "each_stop_is_its_own_stack"
    assert STOP_STACK_HANDOFF in str(refusal.value)
    with pytest.raises(KinematicStudyError, match="it goes in the `axial_stack` of each stop"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path / "bare", as_contributor=True))
    with pytest.raises(KinematicStudyError, match="form retired by handoff"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path / "stacked", ref_edit=old_form))


def test_a_stop_with_no_stack_is_refused_beside_one_that_has_one(tmp_path):
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path)
    data = json.loads(study_path.read_text(encoding="utf-8"))
    del data["stops"][1]["axial_stack"]
    study_path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(KinematicStudyError, match=r"stop\(s\) \['high'\] have no `axial_stack`"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_stop_with_no_stack_is_refused_in_a_study_with_a_datum(tmp_path):
    def datum(data):
        data["datum"] = {"stop": "low", "basis": "fixture"}
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=datum)
    with pytest.raises(KinematicStudyError, match=r"have no `axial_stack`"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_stack_ref_off_the_driver_or_named_twice_is_refused(tmp_path):
    def on_length(ref):
        ref["study_ref"]["parameter"] = "link.length"
    with pytest.raises(KinematicStudyError, match="every entry is on the sweep's driver"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=on_length))
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path / "twice")
    data = json.loads(study_path.read_text(encoding="utf-8"))
    data["stops"][0]["axial_stack"].append(data["stops"][0]["axial_stack"][0])
    study_path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(KinematicStudyError, match="twice in its axial_stack"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_ref_off_the_driver_still_folds_at_every_point(tmp_path):
    """Among the contributors, on link.length (J = 2, -1, 0.5): the leaves enter
    every point's fold at |J| -- the chain rule as a y-term, unchanged."""
    def on_length(ref):
        ref["study_ref"]["parameter"] = "link.length"
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(
        tmp_path, ref_edit=on_length, as_contributor=True))
    for point, j in enumerate((2.0, -1.0, 0.5)):
        result = fold_at(study, sweep, point)
        (group,) = result.groups
        assert group.entry == j
        assert result.interval.worst_case_half == pytest.approx(
            (HAND[point][1] - HAND[point][0]) / 2 + abs(j) * 0.5)


def test_the_range_enters_a_shared_term_once_at_the_difference_of_its_weights(tmp_path):
    """high (point 2) less low (point 1), by hand. Nominal 30.2 - 9.6 = 20.6.
    The linkage: link_length's J goes -1 -> 0.5, a difference of 1.5 on a 0.2
    half-band (0.3); the sphere's entries (0,0,2) -> (2,4,4) differ by (2,4,2),
    norm sqrt(24), on r = 0.02. The stack's two leaves are in both stops:
    link_length's weight goes 1.5 -> -2.0 (difference -3.5, on 0.2) and
    link_back's -1.5 -> 2.0 (3.5, on 0.3). Worst half 0.3 + sqrt(24) x 0.02 +
    0.7 + 1.05; the stack's leaves would have reached 0.75 at low and 1.0 at
    high if the range had added the two stops instead."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    result = range_between_stops(study, sweep)
    assert (result.high.stop.id, result.low.stop.id) == ("high", "low")
    assert result.nominal.nominal == pytest.approx(20.6)
    assert result.interval.nominal == pytest.approx(0.0, abs=1e-12)
    assert result.interval.worst_case_half == pytest.approx(
        0.3 + math.sqrt(24) * 0.02 + 0.7 + 1.05)
    leaves = [t for t in result.terms if t.kind == "stop_position"]
    assert [(t.edge, t.shared) for t in leaves] == [("link_length", True), ("link_back", True)]
    assert [t.coefficient for t in leaves] == pytest.approx([-3.5, 3.5])
    assert [round(abs(t.high) * t.half, 6) for t in leaves] == [0.4, 0.6]
    assert [round(abs(t.low) * t.half, 6) for t in leaves] == [0.3, 0.45]


def test_the_range_is_none_unless_the_study_has_two_stops(tmp_path):
    study, sweep = load_fixture()
    assert range_between_stops(study, sweep) is not None
    def three(data):
        data["stops"].append({"id": "mid", "label": "mid", "target": 20.0})
    study_path, data_root, topologies = copy_fixture(tmp_path, study_edit=three)
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    assert range_between_stops(study, sweep) is None


def test_a_reach_check_reads_the_stops_own_measure_on_the_side_its_bound_names(tmp_path):
    """The low stop: nominal 9.6, fold [-0.34, 0.14]. at_least 9.0 -> 9.6 -
    0.34 - 9.0 = 0.26; at_most 9.5 -> 9.5 - 9.6 - 0.14 = -0.24 (nominal
    already past it: fail). RSS beside: half sqrt(0.2^2 + 0.04^2) about -0.1."""
    rss = math.sqrt(0.2 ** 2 + 0.04 ** 2)

    def reach(bound, value):
        def edit(data):
            data["checks"][0]["bound"] = bound
            data["checks"][0]["limit"]["value"] = value
        return edit
    for bound, value, margin, rss_margin, verdict in (
            ("at_least", 9.0, 0.26, 9.6 - 0.1 - rss - 9.0, "pass"),
            ("at_most", 9.5, -0.24, 9.5 - 9.6 + 0.1 - rss, "fail")):
        study_path, data_root, topologies = copy_fixture(
            tmp_path / bound, study_edit=reach(bound, value))
        study, sweep = load_kinematic_study(study_path, data_root, topologies)
        check = check_at_stop(study, sweep, "low_margin")
        assert check.margin == pytest.approx(margin)
        assert check.verdict == verdict
        assert rss_check_at_stop(study, sweep, "low_margin").min == pytest.approx(rss_margin)
    study_path, data_root, topologies = copy_fixture(
        tmp_path / "bad", study_edit=reach("above", 9.0))
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    with pytest.raises(KinematicStudyError, match="a bound is one of"):
        check_at_stop(study, sweep, "low_margin")


def gap_ref(ref):
    ref["study_ref"]["study_id"] = "fixture_anchor"
    ref["title"] = "Fixture anchor"
    ref["gap"] = "Neither stop is anchored yet"


def test_a_declared_gap_ref_has_no_band_and_leaves_every_stop_it_reaches_incomplete(tmp_path):
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=gap_ref))
    (ref,) = study.study_refs
    assert (ref.study_id, ref.title, ref.terms, ref.total, ref.units) == (
        "fixture_anchor", "Fixture anchor", (), None, "mm")
    low = fold_at_stop(study, sweep, "low")
    assert low.stack.position.worst_case_half == 0.0
    assert low.interval == low.point.interval
    check = check_at_stop(study, sweep, "low_margin")
    assert check.complete is False
    assert any("fixture_anchor" in t and "Neither stop is anchored yet" in t
               and "not authored yet" in t for t in check.excluded_terms)


def test_a_declared_gap_whose_study_exists_is_refused(tmp_path):
    def stale(ref):
        ref["title"] = "Fixture chain"
        ref["gap"] = "not authored"
    with pytest.raises(KinematicStudyError, match="declared a gap, but a document"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=stale))


def test_a_declared_gap_needs_its_title(tmp_path):
    def untitled(ref):
        gap_ref(ref)
        del ref["title"]
    with pytest.raises(KinematicStudyError, match="both `gap`"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=untitled))


def test_a_datum_stop_is_where_the_driver_is_zero(tmp_path):
    """The fixture's low stop sits at drive 5.0, so it cannot be the datum."""
    def datum(data):
        data["datum"] = {"stop": "low", "basis": "fixture"}
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path)
    data = json.loads(study_path.read_text(encoding="utf-8"))
    datum(data)
    study_path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(KinematicStudyError, match="datum stop 'low' sits at driver 5.0"):
        load_kinematic_study(study_path, data_root, topologies)


def test_the_chain_rule_differs_from_the_folded_interval_routes_by_a_stated_amount(tmp_path):
    """The sub-study's own total is [-0.5, +0.5] about zero (worst half 0.5, RSS
    half sqrt(0.2^2 + 0.3^2) = 0.3606). Folded first and used as one band times
    J = 1.5 (the low stop), the worst case is the same 0.75 (the chain is
    linear, so worst case cannot tell the two routes apart) but the RSS half
    would be 1.5 x 0.5 = 0.75 -- a worst-case half read as one variate --
    against the chain rule's 1.5 x 0.3606 = 0.5408: 0.2092 too wide. The
    unscaled reading, "the direct fold +/- the sub-study's interval", misses
    the motion ratio entirely: its worst case is [-0.34 - 0.5, 0.14 + 0.5],
    0.25 short each way of the chain rule's [-1.09, 0.89]."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    (ref,) = study.study_refs
    assert ref.total.worst_case_half == pytest.approx(0.5)
    assert ref.total.rss_half == pytest.approx(math.sqrt(0.2 ** 2 + 0.3 ** 2))
    at_stop = fold_at_stop(study, sweep, "low")
    (group,) = at_stop.stack.groups
    assert group.reach == pytest.approx(1.5 * ref.total.worst_case_half)
    chain_rss = math.sqrt(sum((c.coefficient * c.sub.dimension.half_range) ** 2
                              for c in group.children))
    assert chain_rss == pytest.approx(1.5 * ref.total.rss_half)
    assert 1.5 * ref.total.worst_case_half - chain_rss == pytest.approx(0.2092, abs=1e-4)
    assert at_stop.interval.min - (-0.34 - 0.5) == pytest.approx(-0.25)
    assert (0.14 + 0.5) - at_stop.interval.max == pytest.approx(-0.25)


def test_a_zero_sensitivity_parameter_enters_no_leaf(tmp_path):
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path)
    run = data_root / "inbox" / "linkage-sweeps" / "kin-fixture-run.json"
    data = json.loads(run.read_text(encoding="utf-8"))
    data["sensitivity"]["by_measure"]["angle"][-1][1] = 0.0
    run.write_text(json.dumps(data), encoding="utf-8")
    study, sweep = load_kinematic_study(study_path, data_root, topologies)
    result = fold_at_stop(study, sweep, "low")
    assert [c["kind"] for c in result.stack.groups[0].as_dict()["children"]] == (
        ["zero_sensitivity"] * 2)
    assert result.interval.max == pytest.approx(HAND[1][1])      # the direct fold alone


def test_a_study_ref_names_the_unit_mismatch_in_the_existing_words(tmp_path):
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path, driver_unit="in")
    with pytest.raises(KinematicStudyError) as refusal:
        load_kinematic_study(study_path, data_root, topologies)
    message = str(refusal.value)
    assert "contributor 'fixture_chain'" in message
    assert "is in 'mm'" in message and "'drive.value' is a driver parameter in 'in'" in message
    assert "dimensionally wrong" in message


def test_a_study_ref_on_a_label_the_sweep_lacks_is_refused_naming_it(tmp_path):
    def nope(ref):
        ref["study_ref"]["parameter"] = "actuator.nope"
    with pytest.raises(KinematicStudyError, match="actuator.nope"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=nope))


def test_a_study_ref_that_names_a_study_holding_a_study_ref_is_refused_as_nesting(tmp_path):
    study_path, data_root, topologies = copy_fixture_with_a_chain(tmp_path)
    inner = json.loads(study_path.read_text(encoding="utf-8"))
    inner["id"] = "inner"
    inner["contributors"].append(inner["stops"][0]["axial_stack"][0] | {
        "study_ref": inner["stops"][0]["axial_stack"][0]["study_ref"] | {
            "parameter": "link.length"}})
    (topologies / "kinematic_study_inner.json").write_text(json.dumps(inner), encoding="utf-8")
    outer = json.loads(study_path.read_text(encoding="utf-8"))
    outer["stops"][0]["axial_stack"][0]["study_ref"]["study_id"] = "inner"
    study_path.write_text(json.dumps(outer), encoding="utf-8")
    with pytest.raises(KinematicStudyError, match="nested study_refs are not supported in v0"):
        load_kinematic_study(study_path, data_root, topologies)


def test_a_study_ref_with_an_edge_of_its_own_is_refused(tmp_path):
    def edged(ref):
        ref["edge"] = "link_length"
    with pytest.raises(KinematicStudyError, match="carries no edge, parameters or band"):
        load_kinematic_study(*copy_fixture_with_a_chain(tmp_path, ref_edit=edged))


def test_a_check_is_incomplete_while_a_study_ref_leaf_is_open_and_says_which(tmp_path):
    """``link_back`` cites ``confidence: untraced`` in the fixture: it is open in the
    sub-study, so it is open here -- and the check's own ``complete: true``
    cannot paper over it."""
    study, sweep = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    (ref,) = study.study_refs
    assert ref.completeness["open_terms"] == ["link_back"]
    check = check_at_stop(study, sweep, "low_margin")
    assert check.complete is False
    assert any("fixture_chain" in t and "link_back" in t for t in check.excluded_terms)


def test_the_projection_carries_the_group_and_every_leaf_at_every_point(tmp_path):
    _, data_root, topologies = copy_fixture_with_a_chain(tmp_path)
    projection = builder.build(topologies, data_root, provenance={"built_at": "fixture"})
    (row,) = projection["studies"]
    assert row["status"] == "ok", row["error"]
    assert (row["contributor_count"], row["study_ref_count"]) == (2, 1)
    (ref,) = row["study_refs"]
    assert ref["study"] == "fixture_chain" and ref["completeness"]["open_terms"] == ["link_back"]
    assert [c["edge"] for c in ref["children"]] == ["link_length", "link_back"]
    assert {len(c["by_point"]) for c in ref["children"]} == {3}
    assert [e["entry"] for e in ref["entries"]] == DRIVE_J
    assert ref["stops"] == ["low", "high"] and ref["gap"] is None
    assert "x_interval" not in json.dumps(row) and "applies_to" not in json.dumps(row)
    for stop in row["stops"]:
        (group,) = stop["groups"]
        assert group["study"] == "fixture_chain" and len(group["children"]) == 2
        assert group["stop_position"] is True
        assert [c["shared_with_other_stop"] for c in group["children"]] == [True, True]
        assert group["entry"] == stop["driver_entry"] == DRIVE_J[stop["index"]]
        linkage, position = stop["sub_stacks"]
        assert (linkage["kind"], position["kind"]) == builder.SUB_STACK_KINDS
        envelope_row = row["envelope"][stop["index"]]
        assert linkage["worst_case_half"] == envelope_row["worst_case_half"]
        assert position["position"]["worst_case_half"] == pytest.approx(0.5)
        assert position["shared"] == ["link_length", "link_back"]
        assert stop["worst_case_half"] == pytest.approx(
            linkage["worst_case_half"] + position["worst_case_half"], abs=1e-6)
    assert row["range"]["high"] == "high" and row["range"]["nominal_measure"] == pytest.approx(
        20.6)
    assert [c["kind"] for c in row["range"]["cancelled"]] == ["linkage", "stop_position"]


def test_the_projection_puts_a_declared_gap_ref_on_the_gap_list(tmp_path):
    _, data_root, topologies = copy_fixture_with_a_chain(tmp_path, ref_edit=gap_ref)
    projection = builder.build(topologies, data_root, provenance={"built_at": "fixture"})
    (row,) = projection["studies"]
    assert row["status"] == "ok", row["error"]
    gaps = [g for g in row["gap_rows"] if g.get("study")]
    assert gaps == [{"edge": None, "study": "fixture_anchor", "title": "Fixture anchor",
                     "gap": "Neither stop is anchored yet", "stops": ["low", "high"],
                     "band_source": {"kind": "gap"}, "drawings": []}]
    assert row["gap_count"] == len(row["gap_rows"])
    (ref,) = row["study_refs"]
    assert (ref["total"], ref["children"], ref["gap"]) == (
        None, [], "Neither stop is anchored yet")
    for stop in row["stops"]:
        (group,) = stop["groups"]
        assert (group["gap"], group["children"], group["stop_position"]) == (
            "Neither stop is anchored yet", [], True)


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
@pytest.mark.parametrize("stop, index, entry, children", [
    ("minus7", 0, -1.728, [("piston_head_upper_thickness", 1, 1.728, 0.432),
                           ("piston_head_lower_thickness", 1, 1.728, 0.086),
                           ("gas_spring_mount_flange_to_end_stop", 1, 1.728, 0.864),
                           ("piston_cover_flange_to_end_stop", -1, 1.728, 0.035)]),
])
def test_real_the_travel_study_enters_the_low_stop_by_its_terms(
        stop, index, entry, children):
    """The motion ratio at the low stop and the travel's four leaves it scales:
    the low stop's contact is the feather contact moved by the travel. The
    feather stop's stack does not hold it."""
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    ref = next(r for r in study.study_refs
               if r.study_id == "vpa_pitch_linkage_travel_between_end_stops")
    assert (ref.parameter, ref.units, ref.stops) == ("actuator.value", "mm", ("minus7",))
    assert stop_index(study, sweep, stop) == index
    group = fold_at_stop(study, sweep, stop).stack.groups[1]
    assert group.ref is ref
    assert round(group.entry, 3) == entry
    assert [(c.sub.edge, c.sign, round(c.coefficient, 3), round(c.magnitude, 3))
            for c in group.children] == children
    assert ref.completeness["open_terms"] == []
    assert round(group.reach, 3) == round(abs(entry) * ref.total.worst_case_half, 3)
    assert ref not in study.stop("plus72").axial_stack


def test_a_band_about_nominal_keeps_its_asymmetry_and_its_citation(tmp_path):
    """``Dimension.about_nominal``: the sub-study term's band as a variation."""
    study, _ = load_kinematic_study(*copy_fixture_with_a_chain(tmp_path))
    source = study.study_refs[0].terms[1].source          # 2.8 .. 3.4 about 3.0
    shifted = source.about_nominal()
    assert (shifted.nominal, shifted.min, shifted.max) == (
        0.0, pytest.approx(-0.2), pytest.approx(0.4))
    assert shifted.half_range == pytest.approx(source.half_range)
    assert shifted.source_ref is source.source_ref


# --------------------------------------------------------------------------- #
# 10. the annotator's served read set (handoff                                #
#     the_scene_pane_is_one_flyout_that_reads_over_http)                      #
# --------------------------------------------------------------------------- #

def _read_set_tree(tmp_path: Path):
    data = tmp_path / "data"
    sweeps = data / "inbox" / "linkage-sweeps"
    sweeps.mkdir(parents=True)
    _sweep(sweeps / "run-old.json", "run-old", "2026-10-01T00:00:00Z", ["topo_a"])
    _sweep(sweeps / "run-new.json", "run-new", "2026-10-02T00:00:00Z", None,
           schema="linkage-sweep/v9")
    (sweeps / "broken.json").write_text("{not json", encoding="utf-8")
    meshes = data / "meshes"
    (meshes / "bb").mkdir(parents=True)
    (meshes / "bb" / "provenance.json").write_text(
        json.dumps({"label": "Bolt", "part_id": "bolt_1"}), encoding="utf-8")
    (meshes / "aa").mkdir()               # no sidecar: listed as itself
    names = data / builder.PART_NAMES_PROJECTION
    names.parent.mkdir(parents=True)
    names.write_text(json.dumps({"parts": {"123": "bolt"}}), encoding="utf-8")
    contacts = data / builder.CONTACT_SUGGESTIONS_PROJECTION
    contacts.parent.mkdir(parents=True)
    contacts.write_text(json.dumps({"topologies": []}), encoding="utf-8")
    topologies = tmp_path / "topologies"
    topologies.mkdir()
    (topologies / builder.MESH_ALIASES_NAME).write_text(
        json.dumps({"aliases": [{"part": "x", "part_id": "bolt_1"}]}), encoding="utf-8")
    return data, topologies


def test_the_read_set_lists_what_a_folder_walk_finds_and_copies_each_run_byte_for_byte(tmp_path):
    """A static mount lists no directory, so the annotator reading over HTTP
    gets the mesh list and the run list from this index -- answered the way
    apps/annotate/storage/fsa.js's walk answers (every mesh directory, its
    sidecar's label or its own name; every run file that parses, by its stem,
    whatever its schema) -- and each run's bytes from the copy beside it."""
    data, topologies = _read_set_tree(tmp_path)
    out_dir = data / builder.PROJECTION_SUBDIR
    stale = out_dir / builder.ANNOTATE_SWEEPS_SUBDIR / "gone.json"
    stale.parent.mkdir(parents=True)
    stale.write_text("{}", encoding="utf-8")
    written = builder.write_annotate_read_set(out_dir, topologies, data,
                                              {"built_at": "fixture"})
    index = json.loads((out_dir / builder.ANNOTATE_READ_SET_NAME).read_text(encoding="utf-8"))
    assert written[0] == out_dir / builder.ANNOTATE_READ_SET_NAME
    assert index["schema"] == builder.SCHEMA_ANNOTATE_READ_SET
    assert index["meshes"] == [{"sha256": "aa", "label": "aa", "part_id": None},
                               {"sha256": "bb", "label": "Bolt", "part_id": "bolt_1"}]
    assert index["mesh_aliases"] == {"aliases": [{"part": "x", "part_id": "bolt_1"}]}
    assert index["part_names"] == {"parts": {"123": "bolt"}}
    assert index["contact_suggestions"] == {"topologies": []}
    assert index["sweep_runs"] == [
        {"run_id": "run-new", "ts": "2026-10-02T00:00:00Z", "mechanism": "mech_run-new"},
        {"run_id": "run-old", "ts": "2026-10-01T00:00:00Z", "mechanism": "mech_run-old"},
    ]
    copies = sorted(p.name for p in (out_dir / builder.ANNOTATE_SWEEPS_SUBDIR).glob("*.json"))
    assert copies == ["run-new.json", "run-old.json"]      # the stale copy is wiped
    src = data / "inbox" / "linkage-sweeps" / "run-old.json"
    assert (out_dir / builder.ANNOTATE_SWEEPS_SUBDIR / "run-old.json").read_bytes() == src.read_bytes()


def test_an_empty_data_root_publishes_an_empty_read_set(tmp_path):
    """No meshes, no runs, no names: the ordinary first-run state, written as
    such rather than refused -- the annotator then reads no parts and no runs."""
    out_dir = tmp_path / "data" / builder.PROJECTION_SUBDIR
    builder.write_annotate_read_set(out_dir, tmp_path / "none", tmp_path / "data",
                                    {"built_at": "fixture"})
    index = json.loads((out_dir / builder.ANNOTATE_READ_SET_NAME).read_text(encoding="utf-8"))
    assert (index["meshes"], index["sweep_runs"], index["mesh_aliases"],
            index["part_names"], index["contact_suggestions"]) == ([], [], None, None, None)


def test_the_annotators_config_names_the_read_set_the_builder_writes():
    """apps/annotate/storage/http.js reads the read set at the paths its config
    names, relative to the directory the served mount publishes -- which is the
    builder's projection dir's parent, the one drawing-checker serves."""
    annotate = (REPO_ROOT / "apps" / "annotate" / "config.js").read_text(encoding="utf-8")

    def line(key, parts):
        return f"{key}: [" + ", ".join(f'"{x}"' for x in parts) + "]"

    served = ("data",) + builder.PROJECTION_SUBDIR.parent.parts
    assert line("servedDataDir", served) in annotate
    kin = ("data",) + builder.PROJECTION_SUBDIR.parts
    assert line("annotateReadSet", kin + (builder.ANNOTATE_READ_SET_NAME,)) in annotate
    assert line("annotateSweepsDir", kin + (builder.ANNOTATE_SWEEPS_SUBDIR,)) in annotate
    # The names the index copies are the files the folder walk reads.
    assert line("partNamesProjection", ("data",) + builder.PART_NAMES_PROJECTION.parts) in annotate
    assert line("contactSuggestions",
                ("data",) + builder.CONTACT_SUGGESTIONS_PROJECTION.parts) in annotate
    assert f'"{builder.MESH_ALIASES_NAME}"]' in annotate

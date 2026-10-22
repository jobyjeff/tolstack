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
from tolerance_stack.kinematic import (
    DIRECTION_UNITS,
    LINKAGE_LENGTH_UNITS,
    PARAMETER_KINDS,
    ROW_KINDS,
    KinematicStudyError,
    check_at_stop,
    contributor_term,
    envelope,
    fold_at,
    load_kinematic_study,
    parameter_unit,
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

#: Per stop, from the lesson: index, nominal blade pitch, worst-case half, RSS
#: half, S461-607 margin, and the ranked table as (edge, kind, sign, coefficient).
REAL = {
    "minus7": (0, -6.992, 0.244, 0.165, 0.256, [
        ("pitch_plate_attach_height", "term", -1, 1.555),
        ("pitch_link_length", "term", 1, 1.574),
        ("pitch_arm_radius", "term", 1, 1.574),
        ("tan_link_mount_height", "term", 1, 0.172),
        ("tan_link_length", "gap", 1, 0.311),
        ("pitch_plate_tan_link_attach_radius", "gap", 1, 0.311),
    ]),
    "plus72": (79, 72.001, 0.242, 0.159, 0.258, [
        ("pitch_plate_attach_height", "term", -1, 1.489),
        ("pitch_link_length", "term", 1, 1.542),
        ("tan_link_mount_height", "term", -1, 0.241),
        ("pitch_arm_radius", "term", 1, 1.542),
        ("tan_link_length", "gap", 1, 0.487),
        ("pitch_plate_tan_link_attach_radius", "gap", 1, 0.487),
    ]),
}


@pytest.mark.skipif(not REAL_RUN.exists(), reason=f"[real] P2 not at {REAL_RUN}")
@pytest.mark.parametrize("stop", sorted(REAL))
def test_real_the_first_study_pins_both_stops_against_p2(stop):
    study, sweep = load_kinematic_study(REAL_STUDY, REAL_DATA)
    index, nominal, worst, rss, margin, table = REAL[stop]
    assert stop_index(study, sweep, stop) == index
    result = fold_at(study, sweep, index)
    assert round(result.nominal, 3) == nominal
    assert round(result.interval.worst_case_half, 3) == worst
    assert round(result.interval.rss_half, 3) == rss
    assert result.gap_count == 2
    assert [(r.contributor.edge, r.kind, r.sign, round(r.coefficient, 3))
            for r in result.rows] == table
    check = check_at_stop(study, sweep, f"s461_607_margin_at_{stop}")
    assert round(check.margin, 3) == margin
    assert (check.verdict, check.verdict_scope) == ("pass", "budget")


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


def test_the_projection_states_its_display_precision():
    """The viewer formats with this and picks no precision of its own."""
    projection = builder.build(FIXTURE_TOPOLOGIES, FIXTURE_DATA,
                               provenance={"built_at": "fixture"})
    assert projection["display_decimals"] == builder.DISPLAY_DECIMALS == 3
    assert projection["models"] == []      # the fixture sweep names no topology


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

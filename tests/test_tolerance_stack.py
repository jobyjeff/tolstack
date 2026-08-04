"""Value-level tests for the tolerance-stack shapes and the worst-case/RSS fold.

Every number marked ``JEFF`` below is a *cached formula result* read straight out
of ``260729_sample_tol_stack.xlsx`` -- Excel's own arithmetic, not something this
repo produced. Re-deriving them from the transcribed element values alone is what
validates the JSON shapes: if a shape drops an element, mislabels an LMC/MMC, or
gets a sign backwards, one of these fails.

Handoff: tolerance_stack_slice1 (2026-07-29).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack import StackElement, Term, fold, load_stack

STACKS_DIR = Path(__file__).resolve().parent.parent / "docs" / "tolerance_stacks"
TOL = 1e-6  # the workbook's cached values are full-precision floats


@pytest.fixture(scope="module")
def tan_link():
    return load_stack(STACKS_DIR / "stack_tan_link_to_pitch_plate.json")


@pytest.fixture(scope="module")
def take2():
    return load_stack(STACKS_DIR / "stack_tan_link_to_pitch_plate_take2.json")


@pytest.fixture(scope="module")
def vpa():
    return load_stack(STACKS_DIR / "stack_vpa_output_to_pitch_plate.json")


# ---------------------------------------------------------------------------
# The fold primitive
# ---------------------------------------------------------------------------


def _el(id_, nominal, lo, hi):
    return StackElement(id=id_, name=id_, role="test", nominal=nominal, min=lo, max=hi)


def test_fold_adds_max_to_max_and_min_to_min():
    got = fold([Term(_el("a", 10.0, 9.0, 11.0)), Term(_el("b", 2.0, 1.5, 2.5))])
    assert got.nominal == 12.0
    assert got.min == 10.5
    assert got.max == 13.5


def test_fold_negative_sign_swaps_the_extremes():
    """A subtracted element's MAX drives the result's MIN -- the sign bug that
    would otherwise pass every 'looks about right' eyeball check."""
    got = fold([Term(_el("a", 10.0, 9.0, 11.0)), Term(_el("c", 1.0, 0.5, 2.0), sign=-1)])
    assert got.nominal == 9.0
    assert got.min == 9.0 - 2.0
    assert got.max == 11.0 - 0.5


def test_fold_rss_is_quadrature_of_half_ranges_about_the_midpoint():
    got = fold([Term(_el("a", 10.0, 9.0, 11.0)), Term(_el("b", 2.0, 1.7, 2.3))])
    assert got.rss_center == pytest.approx(12.0)          # midpoints 10.0 + 2.0, not the nominals
    assert got.rss_half == pytest.approx((1.0 ** 2 + 0.3 ** 2) ** 0.5)
    assert got.rss_half < got.worst_case_half


def test_fold_rss_ignores_sign_for_the_half_range():
    plus = fold([Term(_el("a", 10.0, 9.0, 11.0)), Term(_el("b", 2.0, 1.7, 2.3))])
    minus = fold([Term(_el("a", 10.0, 9.0, 11.0)), Term(_el("b", 2.0, 1.7, 2.3), sign=-1)])
    assert minus.rss_half == pytest.approx(plus.rss_half)
    assert minus.rss_center == pytest.approx(8.0)


def test_element_rejects_inverted_limits():
    with pytest.raises(ValueError, match="min .* > max"):
        StackElement(id="bad", name="bad", role="test", nominal=1.0, min=2.0, max=1.0)


def test_term_rejects_a_non_unit_sign():
    with pytest.raises(ValueError, match=r"\+1 or -1"):
        Term(_el("a", 1.0, 1.0, 1.0), sign=2)


# ---------------------------------------------------------------------------
# Tan link to pitch plate -- paths (JEFF: E18/G18/H18, E19/.., E20/..)
# ---------------------------------------------------------------------------


def test_tan_link_bore_min_grip_matches_workbook(tan_link):
    got = tan_link.path("bore_min_grip")
    assert got.nominal == pytest.approx(20.484999999999996, abs=TOL)   # JEFF E18
    assert got.min == pytest.approx(19.921800000000001, abs=TOL)       # JEFF G18
    assert got.max == pytest.approx(20.736799999999999, abs=TOL)       # JEFF H18


def test_tan_link_bore_max_grip_thin_matches_workbook(tan_link):
    got = tan_link.path("bore_max_grip_thin")
    assert got.nominal == pytest.approx(22.309799999999996, abs=TOL)   # JEFF E19
    assert got.min == pytest.approx(21.819000000000003, abs=TOL)       # JEFF G19
    assert got.max == pytest.approx(22.4892, abs=TOL)                  # JEFF H19


def test_tan_link_bore_max_grip_thick_matches_workbook(tan_link):
    got = tan_link.path("bore_max_grip_thick")
    assert got.nominal == pytest.approx(23.097199999999997, abs=TOL)   # JEFF E20
    assert got.min == pytest.approx(22.555600000000002, abs=TOL)       # JEFF G20
    assert got.max == pytest.approx(23.327400000000001, abs=TOL)       # JEFF H20


def test_tan_link_chamfer_is_subtracted_not_added(tan_link):
    """Guards the one place the workbook's LMC column exceeds its MMC column."""
    chamfer = tan_link.element("bushing_chamfer")
    assert chamfer.lmc == 0.889 and chamfer.mmc == 0.635
    assert (chamfer.min, chamfer.max) == (0.635, 0.889)
    terms = tan_link.terms(tan_link.paths["bore_min_grip"]["terms"])
    assert [t.sign for t in terms if t.element.id == "bushing_chamfer"] == [-1]


# ---------------------------------------------------------------------------
# Tan link to pitch plate -- checks (JEFF: E30/F30/G30/H30, E31/F31/G31/H31)
# ---------------------------------------------------------------------------


def test_threads_in_bore_13_matches_workbook(tan_link):
    got = tan_link.check("threads_in_bore__13")
    assert got.interval.nominal == pytest.approx(0.13980000000000459, abs=TOL)   # JEFF E30
    assert got.interval.min == pytest.approx(-0.36599999999999966, abs=TOL)      # JEFF G30
    assert got.verdict == "marginal"


def test_threads_in_bore_14_matches_workbook(tan_link):
    got = tan_link.check("threads_in_bore__14")
    assert got.interval.nominal == pytest.approx(1.740000000000002, abs=TOL)     # JEFF E31
    assert got.interval.min == pytest.approx(1.2342000000000013, abs=TOL)        # JEFF G31
    assert got.verdict == "pass"


def test_shank_out_13_thick_matches_workbook(tan_link):
    got = tan_link.check("shank_out__13_thick")
    assert got.interval.nominal == pytest.approx(0.88489999999999824, abs=TOL)   # JEFF F30
    assert got.interval.min == pytest.approx(8.9300000000001489e-2, abs=TOL)     # JEFF H30
    assert got.verdict == "pass"


def test_shank_out_14_thick_matches_workbook(tan_link):
    got = tan_link.check("shank_out__14_thick")
    assert got.interval.nominal == pytest.approx(-0.71529999999999916, abs=TOL)  # JEFF F31
    assert got.interval.min == pytest.approx(-1.5108999999999959, abs=TOL)       # JEFF H31
    assert got.verdict == "fail"


def test_no_fastener_passes_both_checks_with_the_thick_washer(tan_link):
    """The workbook's actual conclusion: -13 fails threads-in-bore at worst case,
    -14 fails shank-out outright. That is the 'no clean analytical answer' case."""
    verdicts = {c.check_id: c.verdict for c in tan_link.all_checks()}
    assert verdicts["threads_in_bore__13"] != "pass"
    assert verdicts["shank_out__14_thick"] != "pass"


def test_thin_washer_checks_are_marked_as_not_in_the_workbook(tan_link):
    """The .032 washer is the one ballooned in DETAIL B; the workbook left its
    block blank. These two checks are the re-derivation's addition, and they must
    stay flagged as such so nobody reads them back as Jeff's numbers."""
    for check_id in ("shank_out__13_thin", "shank_out__14_thin"):
        spec = next(c for c in tan_link.checks if c["check_id"] == check_id)
        assert spec["workbook_cells"] is None
        assert "NOT IN WORKBOOK" in spec["label"]
    assert tan_link.check("shank_out__13_thin").interval.min < 0
    assert tan_link.check("shank_out__14_thin").interval.nominal < 0


# ---------------------------------------------------------------------------
# Take 2 (JEFF: E49/G49/H49, G54/H54)
# ---------------------------------------------------------------------------


def test_take2_total_matches_workbook(take2):
    got = take2.path("total")
    assert got.nominal == pytest.approx(20.484999999999999, abs=TOL)   # JEFF E49
    assert got.min == pytest.approx(19.921799999999998, abs=TOL)       # JEFF G49
    assert got.max == pytest.approx(20.736799999999999, abs=TOL)       # JEFF H49


def test_take2_reaches_the_same_total_as_take1_bore_min_grip(take2, tan_link):
    """Take 1 leaves cell E13 blank so its bushing sub-total excludes the flange;
    take 2 folds the flange in explicitly. Same joint, same number."""
    a, b = take2.path("total"), tan_link.path("bore_min_grip")
    assert a.nominal == pytest.approx(b.nominal, abs=TOL)
    assert a.min == pytest.approx(b.min, abs=TOL)
    assert a.max == pytest.approx(b.max, abs=TOL)


def test_take2_worst_case_matches_workbook(take2):
    got = take2.check("worst_case_protrusion")
    assert got.interval.min == pytest.approx(-0.36599999999999966, abs=TOL)   # JEFF G54
    assert got.interval.max == pytest.approx(0.95700000000000429, abs=TOL)    # JEFF H54


def test_take2_nut_geometry_is_transcribed_but_unused(take2):
    """The workbook computes a nut chamfer depth and never folds it into a check."""
    referenced = {t["element"] for c in take2.checks for t in c["terms"] if "element" in t}
    referenced |= {t["element"] for p in take2.paths.values() for t in p["terms"] if "element" in t}
    for element_id in ("nut_minor_diameter", "nut_cbore_diameter", "nut_chamfer_depth"):
        assert take2.element(element_id) is not None
        assert element_id not in referenced


def test_take2_nut_bore_is_an_internal_feature_so_mmc_is_the_smaller(take2):
    minor = take2.element("nut_minor_diameter")
    assert minor.mmc == 4.05 and minor.lmc == 4.25
    assert (minor.min, minor.max) == (4.05, 4.25)


# ---------------------------------------------------------------------------
# VPA output to pitch plate (JEFF: E69/G69/H69, G75/H75)
# ---------------------------------------------------------------------------


def test_vpa_total_matches_workbook(vpa):
    got = vpa.path("total")
    assert got.nominal == pytest.approx(20.7072, abs=TOL)              # JEFF E69
    assert got.min == pytest.approx(20.225600000000004, abs=TOL)       # JEFF G69
    assert got.max == pytest.approx(21.007400000000001, abs=TOL)       # JEFF H69


def test_vpa_worst_case_matches_workbook(vpa):
    got = vpa.check("worst_case_shank_out")
    assert got.interval.min == pytest.approx(-0.63660000000000139, abs=TOL)   # JEFF G75
    assert got.interval.max == pytest.approx(0.65319999999999823, abs=TOL)    # JEFF H75
    # Not in the workbook: it computes only the two worst-case columns for this
    # stack. At NOMINAL the grip is already 0.08 mm short of the stack, so the
    # verdict is "fail", not the "marginal" the two-sided range suggests.
    assert got.interval.nominal == pytest.approx(20.6248 - 20.7072, abs=TOL)
    assert got.verdict == "fail"


def test_vpa_and_tan_link_use_different_pitch_plate_tolerances(vpa, tan_link):
    """Both read 4.06 nominal, but +/-0.10 vs +/-0.08 -- and BOTH callouts exist
    on 215197. This is a real design fact, not a transcription slip."""
    a = tan_link.element("pitch_plate_flange")
    b = vpa.element("pitch_flange_thickness")
    assert a.nominal == b.nominal == 4.06
    assert (a.min, a.max) == (3.98, 4.14)
    assert (b.min, b.max) == (3.96, 4.16)


# ---------------------------------------------------------------------------
# Schema hygiene across all three stacks
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "filename",
    [
        "stack_tan_link_to_pitch_plate.json",
        "stack_tan_link_to_pitch_plate_take2.json",
        "stack_vpa_output_to_pitch_plate.json",
    ],
)
def test_every_element_carries_a_source_ref_with_a_confidence(filename):
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        assert element.source_ref is not None, f"{stack.id}:{element.id} has no source_ref"
        assert element.source_ref.confidence in ("traced", "inferred", "untraced")


@pytest.mark.parametrize(
    "filename",
    [
        "stack_tan_link_to_pitch_plate.json",
        "stack_tan_link_to_pitch_plate_take2.json",
        "stack_vpa_output_to_pitch_plate.json",
    ],
)
def test_source_ref_leaves_the_feature_identity_slot_open_and_empty(filename):
    """Slice 1 cites human readings only. When extraction addresses dimensions
    stably, element_id/run_id get filled -- until then they must be None, so a
    later consumer can tell 'not yet wired' from 'wired to nothing'."""
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        ref = element.source_ref
        assert ref.element_id is None and ref.run_id is None
        assert ref.kind in ("drawing", "parts_list", "workbook", "pipeline_element", "assumed")


def test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange(tan_link):
    """215197 is the one part drawing this repo holds for these joints, and
    exactly one element traces to it. Everything else is a fastener-library gap."""
    traced = [e.id for e in tan_link.elements if e.source_ref.confidence == "traced"]
    assert "pitch_plate_flange" in traced
    ref = tan_link.element("pitch_plate_flange").source_ref
    assert (ref.document, ref.sheet, ref.zone) == ("215197", 2, "B4")
    assert ref.callout == "3X 4.06 ±0.08"


def test_hardware_entries_flag_the_two_parts_missing_from_the_assembly():
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    absent = {e["id"] for e in data["entries"] if not e["assembly_status"].get("present")}
    assert absent == {"NAS1149V0363", "NAS77A4-015"}


def test_every_hardware_entry_has_an_empty_library_ref_and_a_gap_list():
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    for entry in data["entries"]:
        assert entry["library_ref"] is None
        assert entry["gaps"], f"{entry['id']} claims no source gaps"
        assert entry["values_status"] in ("inline", "library", "not_transcribed")


def test_every_hardware_ref_on_a_stack_element_resolves():
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    known = {e["id"] for e in data["entries"]}
    for filename in STACKS_DIR.glob("stack_*.json"):
        stack = load_stack(filename)
        for element in stack.elements:
            if element.hardware_ref:
                assert element.hardware_ref in known, (
                    f"{stack.id}:{element.id} references unknown hardware {element.hardware_ref}"
                )

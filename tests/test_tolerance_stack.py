"""Value-level tests for the tolerance-stack shapes and the worst-case/RSS fold.

Every number marked ``JEFF`` below is a *cached formula result* read straight out
of ``260729_sample_tol_stack.xlsx`` -- Excel's own arithmetic, not something this
repo produced. Re-deriving them from the transcribed element values alone is what
validates the JSON shapes: if a shape drops an element, mislabels an LMC/MMC, or
gets a sign backwards, one of these fails.

Handoff: tolerance_stack_slice1 (2026-07-29).
"""

from __future__ import annotations

import ast
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import pytest

from tolerance_stack import (
    CONFIDENCES, ELEMENT_ROLES, SOURCE_REF_KINDS, VERDICT_SCOPES, CheckResult,
    ExportRun, SourceExport, SourceRef, StackDefinition, StackElement, Term, fold,
    load_stack,
)
from tolerance_stack.stack import EXPORT_STATUSES

from tests.test_js_python_vocabulary import python_values_statuses

STACKS_DIR = Path(__file__).resolve().parent.parent / "docs" / "tolerance_stacks"
TOLERANCE_STACK_PACKAGE = Path(__file__).resolve().parent.parent / "tolerance_stack"
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


@pytest.fixture(scope="module")
def pitch_link():
    return load_stack(STACKS_DIR / "stack_pitch_link_to_pitch_plate.json")


@pytest.fixture(scope="module")
def rotor_fastener():
    return load_stack(STACKS_DIR / "stack_rotor_fastener_length.json")


# Every stack file in docs/tolerance_stacks/. The schema-hygiene tests below are
# parametrized over this so a new stack cannot be added without them applying.
ALL_STACK_FILES = [
    "stack_tan_link_to_pitch_plate.json",
    "stack_tan_link_to_pitch_plate_take2.json",
    "stack_vpa_output_to_pitch_plate.json",
    "stack_pitch_link_to_pitch_plate.json",
    "stack_rotor_fastener_length.json",
    # thermal_fit archetype (hub_bearing_thermal_stack, 2026-08-05). These load
    # through load_stack() for the schema-hygiene tests below, which is all those
    # need; their checks are GENERATED, so their values are pinned in
    # tests/test_hub_bearing_thermal_fit.py via load_thermal_fit_stack().
    "stack_hub_bearing_thermal_fit_m2.json",
    "stack_hub_bearing_thermal_fit_m1.json",
]


def test_the_stack_file_list_is_complete():
    """The parametrized lists below are hand-written; this catches a new stack
    JSON that was added without being wired into them."""
    on_disk = sorted(p.name for p in STACKS_DIR.glob("stack_*.json"))
    assert on_disk == sorted(ALL_STACK_FILES)


# ---------------------------------------------------------------------------
# The fold primitive
# ---------------------------------------------------------------------------


def _el(id_, nominal, lo, hi):
    # `role="test"` until 2026-08-19, when `ELEMENT_ROLES` became enforced rather
    # than documented. These elements are arithmetic fixtures and their role is
    # irrelevant to every assertion below -- but "a role no stack may carry" is
    # exactly what the constructor now refuses, and a test helper is not a reason
    # to punch a hole in it. `clamped_member` is the most ordinary word in the
    # vocabulary: it adds, it is not hardware, and it carries no caveat.
    return StackElement(id=id_, name=id_, role="clamped_member",
                        nominal=nominal, min=lo, max=hi)


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
        StackElement(id="bad", name="bad", role="clamped_member",
                     nominal=1.0, min=2.0, max=1.0)


def test_term_rejects_a_non_unit_sign():
    with pytest.raises(ValueError, match=r"\+1 or -1"):
        Term(_el("a", 1.0, 1.0, 1.0), sign=2)


# --- Term.coefficient (added 2026-08-05, handoff hub_bearing_thermal_stack) ---


def test_term_coefficient_defaults_to_one_so_every_older_stack_is_unchanged():
    t = Term(_el("a", 1.0, 1.0, 1.0))
    assert t.coefficient == 1.0
    assert t.weight == 1.0
    assert Term(_el("a", 1.0, 1.0, 1.0), sign=-1).weight == -1.0


def test_term_rejects_a_non_positive_coefficient():
    """Direction lives in ``sign``, magnitude in ``coefficient``.

    Allowing a negative coefficient would give a term two places to be
    backwards, which is precisely the property the one-fold design exists to
    prevent.
    """
    for bad in (0.0, -1.0, -2.5):
        with pytest.raises(ValueError, match="coefficient must be > 0"):
            Term(_el("a", 1.0, 1.0, 1.0), coefficient=bad)


def test_fold_coefficient_scales_the_extremes_and_the_nominal():
    got = fold([Term(_el("a", 10.0, 9.0, 11.0)),
                Term(_el("b", 2.0, 1.5, 2.5), coefficient=2.0)])
    assert got.nominal == 14.0            # 10 + 2*2
    assert got.min == 9.0 + 2 * 1.5       # 12.0
    assert got.max == 11.0 + 2 * 2.5      # 16.0


def test_fold_coefficient_with_a_negative_sign_still_swaps_the_extremes():
    got = fold([Term(_el("a", 10.0, 9.0, 11.0)),
                Term(_el("c", 1.0, 0.5, 2.0), sign=-1, coefficient=3.0)])
    assert got.nominal == 10.0 - 3 * 1.0
    assert got.min == 9.0 - 3 * 2.0       # the subtracted term's MAX drives the min
    assert got.max == 11.0 - 3 * 0.5


def test_fold_coefficient_scales_the_rss_half_range_linearly():
    """A scaled variate has a scaled spread -- and this is why a diametral term
    is ``coefficient=2`` rather than the same element listed twice.

    Twice one wall and two independent walls give the same worst case and
    *different* RSS: 2*h against sqrt(2)*h. The two walls of a sleeve are one
    turned dimension, so ``coefficient=2`` is the correct, fully-correlated
    treatment and duplicating the term would understate the half-range by 29%.
    """
    half = 0.5
    doubled = fold([Term(_el("w", 1.0, 1.0 - half, 1.0 + half), coefficient=2.0)])
    twice = fold([Term(_el("w", 1.0, 1.0 - half, 1.0 + half)),
                  Term(_el("w", 1.0, 1.0 - half, 1.0 + half))])
    assert doubled.min == twice.min and doubled.max == twice.max
    assert doubled.rss_half == pytest.approx(2 * half)
    assert twice.rss_half == pytest.approx(2 ** 0.5 * half)
    assert doubled.rss_half > twice.rss_half


def test_fold_is_still_the_only_arithmetic_and_still_never_reads_lmc_or_mmc():
    """``fold()`` reads ``min``/``max`` lengths. Coefficients did not change that."""
    source = Path(__file__).resolve().parent.parent / "tolerance_stack" / "stack.py"
    body = source.read_text(encoding="utf-8")
    fold_src = body.split("def fold(", 1)[1].split("\n# ---", 1)[0]
    assert ".lmc" not in fold_src and ".mmc" not in fold_src


# ---------------------------------------------------------------------------
# Completeness -- a schema field, and a BIDIRECTIONAL invariant
# (2026-08-13, handoff check_completeness_schema; replaces the INCOMPLETE
# prose convention that ISSUE_20260805_check_result_has_no_complete_flag filed)
# ---------------------------------------------------------------------------


def _check(**kwargs) -> CheckResult:
    """A CheckResult over a throwaway interval -- completeness reads no numbers."""
    kwargs.setdefault("check_id", "c")
    kwargs.setdefault("label", "a check")
    kwargs.setdefault("configuration", {})
    kwargs.setdefault("interval", fold([Term(_el("e", 1.0, 0.9, 1.1))]))
    return CheckResult(**kwargs)


def test_a_check_is_complete_and_joint_scoped_by_default():
    """The defaults are what let this extend ``check_result/v0`` in place: every
    stack authored before the fields existed keeps producing the same result."""
    got = _check()
    assert got.complete is True
    assert got.excluded_terms == ()
    assert got.verdict_scope == "joint"


def test_an_incomplete_check_is_budget_scoped_and_its_verdict_domain_is_unchanged():
    """``verdict`` still reads pass/marginal/fail -- the honesty is in the SCOPE.

    This is the design decision the brief asked for and the reason no consumer
    of ``verdict`` had to change: a `fail` on an incomplete check is true of the
    model and false of the hardware, so what needed saying was what the verdict
    is *about*, not a fourth value of it.
    """
    got = _check(complete=False, excluded_terms=["link eye width -- no document"])
    assert got.verdict_scope == "budget"
    assert got.verdict in ("pass", "marginal", "fail")
    assert got.verdict_scope in VERDICT_SCOPES


def test_an_incomplete_check_that_names_nothing_excluded_is_refused():
    """Half the invariant: a hole announced without saying what fell in it."""
    with pytest.raises(ValueError, match="names no excluded_terms"):
        _check(complete=False)
    with pytest.raises(ValueError, match="names no excluded_terms"):
        _check(complete=False, excluded_terms=[])


def test_a_complete_check_that_names_an_excluded_term_is_refused():
    """The other half, and the direction prose could never enforce: a term that
    is named as missing while the check claims to be whole."""
    with pytest.raises(ValueError, match="complete: true"):
        _check(excluded_terms=["link eye width -- no document"])


def test_an_excluded_term_must_actually_say_something():
    """An empty string satisfies "non-empty list" and says nothing at all."""
    for empty in ([""], ["   "], [None]):
        with pytest.raises(ValueError, match="non-empty string"):
            _check(complete=False, excluded_terms=empty)


def test_a_bare_string_is_not_a_list_of_one_excluded_term():
    """Added in `review/check_completeness_schema`.

    ``"excluded_terms": "the eye -- no document"`` instead of ``[...]`` is the
    likeliest way to mis-author a field the SOP describes as "one free string
    per term", and ``tuple()`` turns a string into one entry per CHARACTER --
    every one of which is a non-empty string, so the loop below it passed. The
    check then rendered 27 excluded terms on its card and expanded 27 rows into
    the gap list. A spaced string happened to raise (on the ``' '``) with a
    message about the wrong thing; a hyphenated one sailed through.
    """
    for bare in ("link-eye-width--no-document", "the eye -- no document"):
        with pytest.raises(ValueError, match="LIST of strings"):
            _check(complete=False, excluded_terms=bare)


def test_completeness_rides_through_the_check_spec_with_safe_defaults():
    """``StackDefinition.check`` reads both keys off the spec dict -- which is
    the same dict an archetype loader builds, so a GENERATED check declares
    completeness through the identical two keys (see the thermal test)."""
    stack = StackDefinition(
        id="s", title="t", units="mm",
        elements=[_el("e", 1.0, 0.9, 1.1)],
        checks=[
            {"check_id": "quiet", "terms": [{"element": "e"}]},
            {"check_id": "budgeted", "terms": [{"element": "e"}],
             "complete": False, "excluded_terms": ["the eye -- no document"]},
        ],
    )
    assert stack.check("quiet").verdict_scope == "joint"
    budgeted = stack.check("budgeted")
    assert budgeted.verdict_scope == "budget"
    assert budgeted.excluded_terms == ("the eye -- no document",)


def test_the_check_result_dict_carries_the_field_and_the_derived_scope():
    """Both, on purpose: a validator reads ``complete``, a renderer reads
    ``verdict_scope``, and neither has to know the other's rule."""
    got = _check(complete=False, excluded_terms=["the eye -- no document"]).as_dict()
    assert got["complete"] is False
    assert got["excluded_terms"] == ["the eye -- no document"]
    assert got["verdict_scope"] == "budget"
    assert got["verdict"] in ("pass", "marginal", "fail")


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
# Pitch link to pitch plate -- built from scratch, so there are no workbook
# cells to cite. Every number below carries the DOCUMENT AND ADDRESS it came
# from instead (SOP Step 5b), which is what makes this a provenance check
# rather than a self-consistency check.
# ---------------------------------------------------------------------------


def test_pitch_link_bolt_grip_is_the_traced_nas6403_value(pitch_link):
    """NAS6403-NAS6420 Rev 4 sh3: 'Grip Dash No. 11' -> Grip .688, column header
    'Grip +/-.010'. Slice 1's ranked gap 1, closed from the spec pile."""
    grip = pitch_link.element("bolt_grip_11")
    assert grip.nominal == pytest.approx(0.688 * 25.4, abs=TOL)    # NAS6403 sh3 dash 11
    assert grip.min == pytest.approx(17.2212, abs=TOL)             # .688 - .010 in
    assert grip.max == pytest.approx(17.7292, abs=TOL)             # .688 + .010 in
    assert grip.source_ref.kind == "spec"
    assert grip.source_ref.confidence == "traced"
    assert grip.source_ref.document == "NAS6403-NAS6420 Rev 4.pdf"
    assert grip.source_ref.sheet == 3
    # External additive feature: most material is the LONGEST grip.
    assert (grip.lmc, grip.mmc) == (grip.min, grip.max)


def test_pitch_link_bolt_length_minus_grip_reproduces_the_specs_own_T_ref(pitch_link):
    """Cross-check between two independently-read parts of the same photocopy:
    sh3 gives dash-11 grip .688 and length 1.011; sh1's table gives T (Ref)
    = .323 for NAS6403, and sh3's closing note says length = grip + T. If the
    vision read of either column were wrong this would not land on .323."""
    got = pitch_link.path("thread_region_T")
    assert got.nominal == pytest.approx(0.323 * 25.4, abs=TOL)     # NAS6403 sh1 "T (Ref)" = .323
    assert got.nominal == pytest.approx(8.2042, abs=TOL)
    # ...and the worst case of that path is NOT a real spread: T is a reference
    # dimension (sh2 note (b)), so grip and length are not independent. F5.
    assert got.worst_case_half == pytest.approx(0.254 + 0.381, abs=TOL)


def test_pitch_link_cotter_hole_position_is_traced_and_carries_no_material_condition(pitch_link):
    """NAS6403-NAS6420 Rev 4 sh1, table column M, NAS6403 row: .174/.154 from the
    bolt point. A LOCATION, so lmc/mmc are deliberately null -- 'most material'
    has no meaning for where a hole sits."""
    m = pitch_link.element("cotter_hole_from_point")
    assert m.max == pytest.approx(0.174 * 25.4, abs=TOL)           # NAS6403 sh1 M max
    assert m.min == pytest.approx(0.154 * 25.4, abs=TOL)           # NAS6403 sh1 M min
    assert m.lmc is None and m.mmc is None
    assert m.source_ref.sheet == 1 and m.source_ref.confidence == "traced"


def test_pitch_link_pitch_plate_lug_is_the_5X_group_not_the_3X_or_1X(pitch_link, tan_link):
    """215197 carries three distinct 4.06 callouts. Only the COUNT ties one to a
    joint: 5X for the five pitch links (five blades), 3X for the three
    tangential links, 1X for the VPA. Matching on 4.06 alone gets you nowhere."""
    mine = pitch_link.element("pitch_plate_flange")
    theirs = tan_link.element("pitch_plate_flange")
    assert mine.nominal == theirs.nominal == 4.06
    assert (mine.min, mine.max) == (3.96, 4.16)                    # 215197 sh2 D10 "5X 4.06 +-0.10"
    assert (theirs.min, theirs.max) == (3.98, 4.14)                # 215197 sh2 B4  "3X 4.06 +-0.08"
    assert mine.source_ref.callout == "5X 4.06 ±0.10"
    assert (mine.source_ref.document, mine.source_ref.sheet, mine.source_ref.zone) == (
        "215197", 2, "D10",
    )
    assert mine.source_ref.confidence == "traced"


def test_pitch_link_clamped_stack_excludes_the_unsourced_link_eye(pitch_link):
    """The sourced part of the clamped column only. The pitch-link eye /
    spherical bearing is NOT an element: no document gives its width, and the
    neighbouring tan-link stack's 11.05/11.10 is an untraced workbook value for
    a different link."""
    assert "spherical_bearing" not in {e.id for e in pitch_link.elements}
    got = pitch_link.path("clamped_stack_sourced")
    assert got.nominal == pytest.approx(4.7625 + 4.06 + 0.8128, abs=TOL)
    assert got.min == pytest.approx(9.5353, abs=TOL)               # lug at 3.96
    assert got.max == pytest.approx(9.7353, abs=TOL)               # lug at 4.16
    # The lug is the ONLY term with a band, so the whole spread is its +-0.10.
    assert got.worst_case_half == pytest.approx(0.10, abs=TOL)


def test_pitch_link_shank_out_deficit_is_the_required_link_eye_width(pitch_link):
    """This check 'fails' by construction -- the eye is missing from the column.
    Its magnitude is the useful output: the eye width the joint requires for
    JPS00094 Rev C section 5.5.5 ('the nut ... shall not engage any incomplete
    threads of the bolt shank')."""
    got = pitch_link.check("shank_out__11_sourced_only")
    assert got.interval.nominal == pytest.approx(-7.8399, abs=TOL)
    assert got.interval.min == pytest.approx(-8.1939, abs=TOL)
    assert got.interval.max == pytest.approx(-7.4859, abs=TOL)
    assert got.verdict == "fail"
    # The 'by construction' half is a SCHEMA claim since 2026-08-13, not a word
    # in the label: `fail` here is true of the model and false of the hardware,
    # and `verdict_scope` is where that gets said. The label used to shout
    # `-- INCOMPLETE: pitch-link eye width unsourced` and the projection went
    # looking for that string; it says neither now.
    assert got.complete is False
    assert got.verdict_scope == "budget"
    assert got.excluded_terms == (
        "pitch-link eye / spherical bearing width -- no document",)
    assert "INCOMPLETE" not in got.label


def test_pitch_link_the_binding_link_eye_requirement_is_the_worst_case_end(pitch_link):
    """Added by review/pitch_link_stack. The deficit interval is symmetric-looking
    and its two ends mean opposite things, so which one the worksheet quotes as
    "the requirement" matters: a reader who takes the SMALLER magnitude accepts an
    eye that fails worst case. Pinned so the prose cannot drift back.

      >= 8.1939  eye needed to PASS worst case  (grip MAX - column MIN) <- binding
      >= 7.8399  eye needed to pass nominal; 7.8399..8.1939 is `marginal`
      <  7.4859  fails even at grip MIN - column MAX, the favourable end
    """
    got = pitch_link.check("shank_out__11_sourced_only")
    grip = pitch_link.element("bolt_grip_11")
    column = pitch_link.path("clamped_stack_sourced")

    binding = grip.max - column.min
    assert binding == pytest.approx(8.1939, abs=TOL)
    assert binding == pytest.approx(-got.interval.min, abs=TOL)

    at_nominal = grip.nominal - column.nominal
    assert at_nominal == pytest.approx(7.8399, abs=TOL)
    assert at_nominal == pytest.approx(-got.interval.nominal, abs=TOL)

    favourable = grip.min - column.max
    assert favourable == pytest.approx(7.4859, abs=TOL)
    assert favourable == pytest.approx(-got.interval.max, abs=TOL)

    # The binding requirement is the LARGEST of the three, which is the whole point.
    assert binding > at_nominal > favourable


def test_pitch_link_cotter_hole_budget(pitch_link):
    """Head-to-cotter-hole minus the sourced column: the budget left for the
    pitch-link eye PLUS the MS9363-09 nut's thread-start-to-castellation
    distance. Passes, and settles nothing -- see the worksheet."""
    got = pitch_link.check("cotter_hole_clear_of_sourced_stack")
    assert got.interval.nominal == pytest.approx(11.8785, abs=TOL)
    assert got.interval.min == pytest.approx(11.1435, abs=TOL)
    assert got.interval.max == pytest.approx(12.6135, abs=TOL)
    assert got.verdict == "pass"


def test_pitch_link_declares_its_zero_width_bands_rather_than_inventing_one(pitch_link):
    """Two elements have min == max == nominal because NO document gives a
    tolerance. The workbook-derived bands in hardware_entries.json (4.63/4.76
    and +-.004 in) are untraced, so SOP Step 5b forbids them here. Guards
    against a later 'tidy-up' quietly filling them in."""
    zero_width = {e.id for e in pitch_link.elements if e.min == e.max}
    assert zero_width == {"bushing_214820", "washer_nas1149v0332"}
    for eid in zero_width:
        e = pitch_link.element(eid)
        assert e.source_ref.confidence == "inferred"
        assert e.source_ref.kind == "parts_list"
        assert "ZERO-WIDTH BAND" in e.note


def test_pitch_link_has_no_workbook_source_and_no_untraced_value(pitch_link):
    """SOP Step 5b: a from-scratch stack cites no workbook. And with no workbook
    to supply a number, `untraced` has nothing to attach to -- every unsourced
    value is a listed gap instead of a quiet element."""
    kinds = {e.source_ref.kind for e in pitch_link.elements}
    assert "workbook" not in kinds
    confidences = [e.source_ref.confidence for e in pitch_link.elements]
    assert confidences.count("traced") == 4
    assert confidences.count("inferred") == 2
    assert confidences.count("untraced") == 0


def test_pitch_link_carries_no_invented_thread_transition_allowance(pitch_link):
    """Slice 1's `thread_transition` (1/16 in) is `kind: assumed`, 'rule-of-thumb
    allowance, no cited standard'. NAS6403 was opened specifically to close it
    and does not dimension the run-out, so no allowance element exists here."""
    assert "allowance" not in {e.role for e in pitch_link.elements}
    assert not any("transition" in e.id for e in pitch_link.elements)


def test_pitch_link_checks_are_original_so_they_carry_no_workbook_markers(pitch_link):
    """The inverse of slice 1's convention: there, an added check needed
    `workbook_cells: null` + '[NOT IN WORKBOOK]' to distinguish it from Jeff's.
    Here EVERY check is new, so the markers would be noise on all of them --
    SOP Step 5b says drop them and say so in the worksheet instead."""
    for spec in pitch_link.checks:
        assert spec.get("workbook_cells") is None
        assert "[NOT IN WORKBOOK]" not in spec["label"]
    assert pitch_link.provenance["transcribed_from"] is None


def test_pitch_link_no_stack_element_is_folded_from_lmc_or_mmc(pitch_link):
    """fold() must read min/max only. With no subtracted feature in this joint
    every element that carries lmc/mmc has max == mmc, which is the review
    checklist's smell -- so assert the reason: nothing here is subtracted at the
    element level, and the two negative signs are on whole terms."""
    for e in pitch_link.elements:
        if e.mmc is not None:
            assert e.max == e.mmc and e.min == e.lmc
    negatives = [
        (p["id"], t.get("element") or t.get("path"))
        for p in pitch_link.paths.values()
        for t in p["terms"]
        if t.get("sign") == -1
    ]
    assert negatives == [
        ("head_to_cotter_hole", "cotter_hole_from_point"),
        ("thread_region_T", "bolt_grip_11"),
    ]


# ---------------------------------------------------------------------------
# rotor_fastener_length -- the fifth stack (fastener_stack_shadow, 2026-08-25)
# ---------------------------------------------------------------------------


def test_rotor_fastener_grip_family_spans_nine_dash_numbers(rotor_fastener):
    """217755 sheet 8 SECTION T-T, general note 24: 'SELECT ONE FASTENER FROM
    PROVIDED OPTIONS AS REQUIRED FOR CORRECT GRIP LENGTH'. Unlike the other
    three 217755 joints, this one is a genuine nine-way family, not one fixed
    dash -- NAS6403-NAS6420 Rev 4 sh3, dash 2 through dash 10."""
    grips = {e.id: e for e in rotor_fastener.elements if e.role == "fastener"}
    assert set(grips) == {
        "fastener_grip_u2h", "fastener_grip_u3h", "fastener_grip_u4h",
        "fastener_grip_u5h", "fastener_grip_u6h", "fastener_grip_u7h",
        "fastener_grip_u8h", "fastener_grip_u9h", "fastener_grip_u10h",
    }
    for e in grips.values():
        assert e.source_ref.kind == "spec"
        assert e.source_ref.confidence == "traced"
        assert e.source_ref.document == "NAS6403-NAS6420 Rev 4.pdf"
        assert e.source_ref.sheet == 3
        # additive external length: mmc is the longest grip
        assert (e.lmc, e.mmc) == (e.min, e.max)
    # NAS6403-NAS6420 sh3 footnote: nominal grip = dash number x .0625 in
    assert grips["fastener_grip_u2h"].nominal == pytest.approx(0.125 * 25.4, abs=TOL)   # dash 2
    assert grips["fastener_grip_u10h"].nominal == pytest.approx(0.625 * 25.4, abs=TOL)  # dash 10
    assert grips["fastener_grip_u2h"].min == pytest.approx(2.921, abs=TOL)   # .125 - .010 in
    assert grips["fastener_grip_u2h"].max == pytest.approx(3.429, abs=TOL)   # .125 + .010 in


def test_rotor_fastener_sourced_clamped_stack_is_the_two_washers_only(rotor_fastener):
    """Both washers carry a zero-width band (SOP Step 5b: NAS1149 and MS21299
    are both absent from data/inbox/specs/), so the path is zero-width too --
    the balancing mass(es) and the receiving-structure thickness are OMITTED,
    not folded with an invented number (Step 5c)."""
    assert "balancing_mass" not in {e.id for e in rotor_fastener.elements}
    got = rotor_fastener.path("sourced_clamped_stack")
    assert got.nominal == pytest.approx(0.8128 + 1.6002, abs=TOL)  # NAS1149V0332H + MS21299C3
    assert got.min == got.max == pytest.approx(2.413, abs=TOL)
    assert got.worst_case_half == pytest.approx(0.0, abs=TOL)


def test_rotor_fastener_grip_budgets_span_shortest_to_longest_option(rotor_fastener):
    """Every one of the nine checks 'fails' by construction -- see
    test_pitch_link_shank_out_deficit_is_the_required_link_eye_width for the
    same shape. The magnitude is the combined mass+structure thickness budget
    each dash can accommodate; it must strictly widen from the shortest grip
    (dash 2) to the longest (dash 10)."""
    ids = ["u2h", "u3h", "u4h", "u5h", "u6h", "u7h", "u8h", "u9h", "u10h"]
    checks = [rotor_fastener.check(f"grip_budget__{i}") for i in ids]
    for c in checks:
        assert c.complete is False
        assert c.verdict == "fail"
        assert c.verdict_scope == "budget"
        assert len(c.excluded_terms) == 2
    magnitudes = [-c.interval.nominal for c in checks]
    assert magnitudes == sorted(magnitudes)          # strictly widening budget
    assert magnitudes[0] == pytest.approx(0.762, abs=TOL)     # dash 2, smallest
    assert magnitudes[-1] == pytest.approx(13.462, abs=TOL)   # dash 10, largest
    # worst-case budget (grip MAX vs the zero-width sourced column)
    assert -checks[0].interval.min == pytest.approx(1.016, abs=TOL)
    assert -checks[-1].interval.min == pytest.approx(13.716, abs=TOL)


def test_rotor_fastener_has_no_workbook_source_and_declares_its_zero_width_bands(rotor_fastener):
    """SOP Step 5b: no workbook citation anywhere in a from-scratch stack. Both
    washers are zero-width by declaration, not by omission."""
    kinds = {e.source_ref.kind for e in rotor_fastener.elements}
    assert "workbook" not in kinds
    zero_width = {e.id for e in rotor_fastener.elements if e.min == e.max}
    assert zero_width == {"washer_ms21299c3", "washer_nas1149v0332_tt"}
    for eid in zero_width:
        e = rotor_fastener.element(eid)
        assert e.source_ref.kind == "parts_list"
        assert e.source_ref.confidence == "inferred"
    confidences = [e.source_ref.confidence for e in rotor_fastener.elements]
    assert confidences.count("traced") == 9
    assert confidences.count("inferred") == 2
    assert confidences.count("untraced") == 0


def test_rotor_fastener_has_no_castellated_retention(rotor_fastener):
    """Unlike the other three 217755 joints, this one is a blind tapped hole --
    no MS9363 nut, no MS24665 cotter pin, so the castellated-grip quantisation
    caveat (review checklist check 6) does not apply here."""
    refs = {e.hardware_ref for e in rotor_fastener.elements if e.hardware_ref}
    assert not any(r.startswith("MS9363") or r.startswith("MS24665") for r in refs)
    assert "nut_geometry" not in {e.role for e in rotor_fastener.elements}


# ---------------------------------------------------------------------------
# Schema hygiene across all four stacks
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_every_element_carries_a_source_ref_with_a_confidence(filename):
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        assert element.source_ref is not None, f"{stack.id}:{element.id} has no source_ref"
        # Read out of the definition rather than re-listed. Since 2026-08-17
        # `SourceRef.__post_init__` enforces this too, so what is left here is the
        # `source_ref is not None` half; the membership line stays because a
        # future loader that bypasses the dataclass would still have to pass it.
        assert element.source_ref.confidence in CONFIDENCES


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_source_ref_leaves_the_feature_identity_slot_open_and_empty(filename):
    """Slice 1 cites human readings only. When extraction addresses dimensions
    stably, element_id/run_id get filled -- until then they must be None, so a
    later consumer can tell 'not yet wired' from 'wired to nothing'."""
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        ref = element.source_ref
        assert ref.element_id is None and ref.run_id is None
        # Read out of the definition rather than re-listed. This line used to be
        # a hand-copy of the six words -- the copy that "spec" reached late,
        # breaking the suite for the first from-scratch stack to cite a spec
        # file. Since 2026-08-19 `SourceRef.__post_init__` enforces membership
        # too; what is left here is the same residual value as the confidence
        # line above (a future loader bypassing the dataclass still has to pass).
        assert ref.kind in SOURCE_REF_KINDS


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_every_drawing_citation_says_which_export_it_was_read_from(filename):
    """The third place the ``export`` shape lives (SOP prose + ``SourceExport``'s
    docstring are the other two).

    A drawing number and a printed zone are not an address: ``217755`` has six
    exports on disk and DETAIL B of sheet 4 prints at ``I6`` on one and ``H3`` on
    another, same revision. Before 2026-08-06 every stack in the repo shipped
    citations that named no export at all -- not a legacy defect, what the SOP
    produced by default -- so this test is what stops the next from-scratch stack
    reproducing it. ``spec`` is exempt: ``data/inbox/specs/`` is append-only, so
    the filename already identifies the bytes.
    """
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        ref = element.source_ref
        if ref.kind not in ("drawing", "parts_list"):
            continue
        assert ref.export is not None, (
            f"{stack.id}:{element.id} cites {ref.document} sheet {ref.sheet} "
            f"zone {ref.zone} but names no export -- unresolvable, and a tool that "
            f"guessed would crop the wrong revision's geometry"
        )
        assert ref.export.status in ("established", "unestablished")


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_no_unestablished_export_is_written_as_a_concrete_one(filename):
    """An unresolvable citation is honest; a wrong one is not.

    ``SourceExport.__post_init__`` raises on the contradiction, so a stack file
    carrying it cannot even load -- this asserts the guard is live on the real
    files rather than only in the unit test below.
    """
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        export = element.source_ref.export
        if export is None:
            continue
        if export.established:
            assert export.pdf and len(export.sha256) == 64
        else:
            assert not export.pdf and not export.sha256 and not list(export.runs)
            assert export.why, f"{stack.id}:{element.id} does not say why"


def test_an_unestablished_export_cannot_carry_a_pdf_or_a_sha():
    """The guard, from the other side: constructing the lie raises."""
    with pytest.raises(ValueError, match="must not name a pdf"):
        SourceExport(status="unestablished", pdf="d.pdf", why="unknown")
    with pytest.raises(ValueError, match="must not name a sha256"):
        SourceExport(status="unestablished", sha256="a" * 64, why="unknown")
    with pytest.raises(ValueError, match="must not name runs"):
        SourceExport(
            status="unestablished",
            runs=[ExportRun(run_id="20260804_114000", ts="2026-08-04T18:40:27Z")],
            why="unknown",
        )
    with pytest.raises(ValueError, match="must say why"):
        SourceExport(status="unestablished")
    # ...and the honest form is constructible.
    assert not SourceExport(status="unestablished", why="three candidates").established


def test_an_established_export_must_carry_a_real_sha256():
    """A filename is not an export: Jeff re-exports over the same name."""
    with pytest.raises(ValueError, match="must name a pdf"):
        SourceExport(status="established", sha256="a" * 64)
    for bad in (None, "", "deadbeef", "z" * 64, "A" * 63):
        with pytest.raises(ValueError, match="64-hex sha256"):
            SourceExport(status="established", pdf="d.pdf", sha256=bad)
    assert SourceExport(status="established", pdf="d.pdf", sha256="A" * 64).established
    with pytest.raises(ValueError, match="status must be one of"):
        SourceExport(status="probably", pdf="d.pdf", sha256="a" * 64)


def test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in():
    """``run_id`` still means "the run that produced the extracted element".

    Backfilling exports could have been done by writing a run id into
    ``source_ref.run_id``, and that would have been wrong twice over: it means a
    different thing, and it would have destroyed the "not yet wired" vs "wired to
    nothing" signal the test above pins. So exports landed as their own field and
    the slot stays empty.

    **Count went 25 -> 23 in the merge of `review/traced_labels_and_ratio`**
    (2026-08-06), and this is the only place either branch's suite could have
    noticed. `citation_export_provenance` backfilled 25 `drawing`/`parts_list`
    citations; the sibling handoff `traced_labels_and_ratio`, running in parallel,
    re-cited `tan_link:fastener_grip_14` and `vpa_output:fastener_grip` from the
    217755 parts list to `NAS6403-NAS6420 Rev 4.pdf`, making them `kind: "spec"` —
    which is *exempt* from the export requirement, because `data/inbox/specs/` is
    append-only so the filename already identifies the bytes. So two export blocks
    were correctly dropped rather than lost, and each element's `source_ref.note`
    records the sha256 that was on it. **A hard-coded total over all stacks is a
    cross-handoff coupling**: it moves whenever any handoff changes a citation's
    `kind`, in either direction. If it churns again, assert the invariant
    (every `drawing`/`parts_list` ref has an export, which
    `test_every_drawing_citation_says_which_export_it_was_read_from` already does)
    rather than the total.

    **It churned again on 2026-08-10** (`fastener_citations_and_confidence`,
    23 -> 22: `tan_link:fastener_grip_13` re-cited to the same standard, its
    export block dropped for the same reason), so the total is gone and the
    instruction above is taken. What is left is the invariant this test was
    always about -- an export is a SIBLING of the feature-identity slot, so
    filling one must never fill the other -- checked in both directions, which
    the total never was: no `export` implies a filled `run_id`, and no
    `element_id`/`run_id` is filled at all. The count is not lost; it is
    derivable and is printed by
    `tests/debug_report_tolerance_stacks.py` if anyone wants it.
    """
    for filename in ALL_STACK_FILES:
        for element in load_stack(STACKS_DIR / filename).elements:
            ref = element.source_ref
            if ref.export is None:
                continue
            assert ref.run_id is None, (
                f"{filename}:{element.id} has an export AND a run_id -- the "
                f"export is a sibling of the identity slot, not a filling-in"
            )
    for filename in ALL_STACK_FILES:
        for element in load_stack(STACKS_DIR / filename).elements:
            ref = element.source_ref
            assert ref.element_id is None and ref.run_id is None


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_every_cited_run_carries_the_ts_from_its_own_run_meta(filename):
    """A run id is a name; a run id plus its ``ts`` is an identity.

    The question a cited drawing-checker run raises is *did this session produce
    it?* -- and the check the review checklist prescribed for that, ``git status``
    in drawing-checker, cannot answer it: ``data/runs/*`` is gitignored there, so
    a session that ran the pipeline leaves that status completely clean
    (``ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth``). With the
    ``ts`` in the citation, the check is arithmetic against the session's own
    commit dates instead of an inference about someone else's commit log.
    """
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        export = element.source_ref.export
        for run in (export.runs if export else ()):
            assert run.run_id, f"{stack.id}:{element.id} names a run with no id"
            assert run.ts, (
                f"{stack.id}:{element.id} cites run {run.run_id} with no ts -- "
                f"copy it from that run's run_meta.json"
            )
            # Parseable, and tz-aware: a naive stamp cannot be compared with a
            # commit time, which is the only use this field has.
            parsed = datetime.fromisoformat(run.ts)
            assert parsed.tzinfo is not None, f"{run.ts} has no timezone"


def test_a_bare_run_id_is_refused_because_a_name_is_not_an_identity():
    """The old shape, from both sides. Accepting it would let the next stack
    write a run id with no ``ts`` and leave the invariant uncheckable again --
    which is how the previous vacuous check survived two sessions asserting it
    held."""
    with pytest.raises(ValueError, match="bare run id"):
        ExportRun.from_dict("20260804_114000")
    with pytest.raises(ValueError, match="needs a run id"):
        ExportRun(run_id="")
    assert SourceExport.from_dict({
        "status": "established", "pdf": "d.pdf", "sha256": "a" * 64,
        "runs": [{"run_id": "20260804_114000", "ts": "2026-08-04T18:40:27.959980+00:00"}],
    }).run_ids == ["20260804_114000"]


def test_a_source_ref_refuses_a_confidence_outside_the_vocabulary():
    """The vocabulary is now **checked**, not documented.

    Until 2026-08-17 ``SourceRef.confidence``'s three words lived in an end-of-line
    comment and nothing enforced them, so ``confidence="banana"`` constructed, rode
    into ``data/projections/viewer/results.json`` and surfaced as ``conf--unknown``
    -- the viewer telling a reader it has no branch for a value, when the truth is
    that the stack file has a typo. Two words are refused here for two reasons:

    * ``"banana"`` -- an outright misspelling, the case the whitelist exists for.
    * ``"no_source_ref"`` -- the case a reader is likeliest to think is legal,
      because the *viewer* renders it. It is minted by the projection for an element
      that has no ``source_ref`` at all
      (``build_viewer_projection.NO_SOURCE_REF``), so a ``SourceRef`` spelling it
      would be a citation asserting that it does not exist.

    And the default is checked from the other side: it must be a member, or every
    ``SourceRef`` written without one would raise.
    """
    for bad in ("banana", "no_source_ref", "", "UNTRACED"):
        with pytest.raises(ValueError, match="confidence must be one of"):
            SourceRef(kind="drawing", document="217755", confidence=bad)
    for good in CONFIDENCES:
        assert SourceRef(kind="drawing", document="217755",
                         confidence=good).confidence == good
    assert SourceRef.__dataclass_fields__["confidence"].default in CONFIDENCES
    # `from_dict` is the path every stack file takes, and it must refuse too --
    # the whole point is that a typo cannot reach the viewer.
    with pytest.raises(ValueError, match="confidence must be one of"):
        SourceRef.from_dict({"kind": "drawing", "document": "217755",
                             "confidence": "traced "})


def test_a_source_ref_refuses_a_kind_outside_the_vocabulary():
    """`SOURCE_REF_KINDS` reaches the constructor, and nothing else does.

    Two documents in this repo asserted that this check existed before it did --
    `docs/SOP_TOLERANCE_STACK.md` Step 5b told authors that *"a new kind must be
    added to all three, or the SOP is describing something the suite rejects"*,
    and `SourceRef` had no `__post_init__` at all until 2026-08-17. The prose was
    describing a check nobody had written; this is it (2026-08-19).

    Both directions are pinned, which is what makes the constant and the
    validator one thing rather than two:

    * every word in `SOURCE_REF_KINDS` constructs -- add a word to the tuple
      without the validator reading the tuple and this half reddens;
    * a word outside it raises -- widen the validator past the tuple and this
      half reddens.
    """
    for good in SOURCE_REF_KINDS:
        assert SourceRef(kind=good, document="217755").kind == good
    for bad in ("Drawing", "drawings", "parts list", "", "spec_library", "banana"):
        assert bad not in SOURCE_REF_KINDS      # anti-vacuity: these must be outside
        with pytest.raises(ValueError, match="kind must be one of"):
            SourceRef(kind=bad, document="217755")
    # `from_dict` is the path every stack file and every `values_source` block
    # takes; a typo must not survive the loader either.
    with pytest.raises(ValueError, match="kind must be one of"):
        SourceRef.from_dict({"kind": "drawing ", "document": "217755"})


def test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit():
    """**The invariant, verified rather than asserted** -- the first time.

    ``pitch_link_stack``'s review found ``data/runs/20260804_114000_217755_A.1_...``
    dated the same day that handoff was worked, cited by this stack, and could get
    no further than "almost certainly not the session's": ``run_meta.json`` says
    ``purpose: test`` with a ``+dirty`` ``pipeline_commit`` and drawing-checker had
    three of its own handoffs merging that afternoon. All true, all inference about
    another repo's commit log.

    The run's ``ts`` settles it directly. Both runs this stack cites predate
    ``d6829f2`` -- ``pitch_link_stack``'s first commit, 2026-08-04T22:42:57Z, and
    the earliest commit that session could have made -- so neither can be its
    output. ``20260803_145243`` predates tolstack's root commit ``e7bd996``
    (2026-08-03T23:05:08Z) as well: it existed before this repo did.

    The constants are git history, which does not move. If this test ever fails,
    either a citation gained a run that postdates the session (the finding this
    exists to surface) or history was rewritten.
    """
    # git -C C:\workspace\tolstack log --format='%h %ad' --date=iso-strict
    PITCH_LINK_FIRST_COMMIT = datetime(2026, 8, 4, 22, 42, 57, tzinfo=timezone.utc)  # d6829f2
    TOLSTACK_ROOT_COMMIT = datetime(2026, 8, 3, 23, 5, 8, tzinfo=timezone.utc)       # e7bd996

    stack = load_stack(STACKS_DIR / "stack_pitch_link_to_pitch_plate.json")
    cited = {
        run.run_id: datetime.fromisoformat(run.ts)
        for element in stack.elements
        for run in (element.source_ref.export.runs if element.source_ref.export else ())
    }
    assert "20260804_114000" in cited, "the run the review could not attribute"
    for run_id, ts in cited.items():
        assert ts < PITCH_LINK_FIRST_COMMIT, (
            f"run {run_id} ({ts.isoformat()}) postdates the session's first commit -- "
            f"it may be this repo's own write into a read-only dependency"
        )
    assert cited["20260803_145243"] < TOLSTACK_ROOT_COMMIT


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_element_role_comes_from_the_documented_vocabulary(filename):
    """The `role` list is the repo's original vocabulary-drift case: the SOP and
    `StackElement.role`'s comment both omitted `nut_geometry`, which the seeded
    take-2 uses three times, and nothing enforced either list. `kind` then drifted
    the same way and broke the suite.

    This test used to say "a vocabulary lives in three places (SOP prose, the
    dataclass comment, and this test); this is the third" -- and being the third
    copy was the defect, not the guard. Since 2026-08-19 there is one definition
    (`ELEMENT_ROLES`), the constructor enforces it, `tests/test_sop_vocabulary.py`
    pairs the SOP's list against it, and this test reads it."""
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        assert element.role in ELEMENT_ROLES, (
            f"{stack.id}:{element.id} has undocumented role {element.role!r}")


def test_a_stack_element_refuses_a_role_outside_the_vocabulary():
    """`ELEMENT_ROLES` reaches the constructor, and nothing else does.

    The test above walks the stacks on disk, so it can only ever say that the
    four files happen to be clean; it says nothing about the fifth stack somebody
    writes tomorrow. This says what the constructor accepts, in both directions
    (see `test_a_source_ref_refuses_a_kind_outside_the_vocabulary` for why both
    halves are needed to keep the constant and the validator a single fact).
    """
    for good in ELEMENT_ROLES:
        assert StackElement(id="e", name="n", role=good,
                            nominal=1.0, min=0.9, max=1.1).role == good
    for bad in ("Bushing", "bushings", "clamped member", "nut", "", "spacer"):
        assert bad not in ELEMENT_ROLES         # anti-vacuity: these must be outside
        with pytest.raises(ValueError, match="role must be one of"):
            StackElement(id="e", name="n", role=bad, nominal=1.0, min=0.9, max=1.1)
    # `from_dict` is the path `load_stack` takes for every element in every file.
    with pytest.raises(ValueError, match="role must be one of"):
        StackElement.from_dict({"id": "e", "name": "n", "role": "washer ",
                                "nominal": 1.0, "min": 0.9, "max": 1.1})


# ---------------------------------------------------------------------------
# The `traced` label, and the ratio built out of it
#
# Added by handoff traced_labels_and_ratio (2026-08-06). Three seeded elements
# carried `confidence: "traced"` on a `kind: "parts_list"` citation while their
# own `note` admitted the band was untraced -- honest prose, wrong machine field,
# and the field is what every downstream consumer reads.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_no_traced_element_cites_a_parts_list(filename):
    """A parts list can never support `traced`, and there is no exception.

    A parts-list row gives a part number and a nomenclature string. The
    nomenclature carries a NOMINAL (`.875" GRIP`, `.063"`) and never a tolerance
    band -- so the best a `kind: "parts_list"` citation can honestly claim is
    `inferred`, exactly as the SOP's table and REVIEW_AGENT check 1 say. This is
    a shape test, not a spot check: it fails for any future element that reaches
    for the label the same way.

    The SOP considered keeping an exception for "parts-list nominal, band
    documented elsewhere" and rejected it: that case is two citations, not one,
    and a single `source_ref` cannot hold both. Cite the document with the band
    and name the parts list in the `note` -- which is what the two re-cited
    fastener grips below now do.
    """
    stack = load_stack(STACKS_DIR / filename)
    offenders = [
        e.id for e in stack.elements
        if e.source_ref.kind == "parts_list" and e.source_ref.confidence == "traced"
    ]
    assert offenders == [], (
        f"{stack.id}: {offenders} claim `traced` from a parts list. A parts list "
        f"gives a nominal, never a band -- see docs/SOP_TOLERANCE_STACK.md."
    )


#: The one place in the repo where `kind: "workbook"` may carry something other
#: than `untraced`, with the argument, so that adding a second one is a
#: deliberate act someone has to write down rather than a label that slips past.
#:
#: `hub_bearing_thermal_fit_m1`'s two hub bores transcribe the 260209 workbook,
#: but their support is NOT workbook-only: 212966-006 rev A -- a later revision
#: of the same part drawing, in hand -- prints the identical value AND the
#: identical band at sheet 3 DETAIL E/D, and both notes say so, name the
#: weakness ("the bore could have changed at -005 and changed back"), and
#: pre-authorise the downgrade to `untraced` if the inference is not accepted.
#: That is a stated judgement resting on a second document, which is exactly
#: what `inferred` is for.
_WORKBOOK_INFERRED_ALLOWED = {
    ("hub_bearing_thermal_fit_m1", "hub_bore_lower"),
    ("hub_bearing_thermal_fit_m1", "hub_bore_upper"),
}


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered(filename):
    """The SOP's other hard rule, mechanised one corner at a time.

    > "a value whose only support is 'the source workbook says so' is `untraced`
    > -- no matter how reasonable it looks."

    ``test_no_traced_element_cites_a_parts_list`` closes the ``traced`` +
    ``parts_list`` corner. This closes the notch below it, which nothing guarded:
    three seeded elements sat at ``kind: "workbook"`` / ``inferred`` for a month,
    including one whose own note ended *"the +/-.004 is untraced"*, and the
    sharpest case was the same bolt labelled ``parts_list``/``inferred`` in one
    stack and ``workbook``/``inferred`` in a restatement of that same stack.
    ``inferred`` is a weaker claim than ``traced``, so the cost is lower -- but
    the SOP's one hard rule is that ``untraced`` must appear on the gap list, and
    an element ``inferred`` on workbook-only support has quietly left it.

    **Written as an allowlist, not as an implication, because the implication is
    false.** ``kind`` records which document the numbers were transcribed FROM,
    and corroboration can arrive from a different document named only in the
    ``note`` -- see ``_WORKBOOK_INFERRED_ALLOWED``. Stating the rule as
    ``kind == "workbook" => confidence == "untraced"`` would have failed on two
    correct elements; refining it to "unless the note names another document"
    would be a grep whose pattern matches the thing under test, which is this
    repo's named vacuous-check failure. An allowlist costs one line per exception
    and makes each one reviewable.

    **What this does NOT cover**, and cannot: whether the ``note`` agrees with
    the field. A ``kind: "workbook"`` element correctly marked ``untraced`` whose
    note claims a standard supports it passes here. That half stays a human
    check -- ``docs/prompts/REVIEW_AGENT.md`` check 1.
    """
    stack = load_stack(STACKS_DIR / filename)
    offenders = sorted(
        (e.id, e.source_ref.confidence) for e in stack.elements
        if e.source_ref.kind == "workbook"
        and e.source_ref.confidence != "untraced"
        and (stack.id, e.id) not in _WORKBOOK_INFERRED_ALLOWED
    )
    assert offenders == [], (
        f"{stack.id}: {offenders} cite a workbook and claim better than "
        f"`untraced`. Either the support is really another document -- then cite "
        f"THAT document -- or it is the workbook alone, which the SOP makes "
        f"`untraced` and puts on the gap list. If it is a stated judgement "
        f"resting on a second document, register it in "
        f"_WORKBOOK_INFERRED_ALLOWED with the argument."
    )


def test_the_workbook_allowlist_has_no_dead_entries():
    """An allowlist that outlives its exceptions silently unguards them.

    The registered pairs must still exist and must still be the shape the
    allowlist exists to permit; otherwise a future element inheriting one of
    these ids gets a free pass nobody granted it.
    """
    live = {
        (stack.id, e.id): e.source_ref
        for stack in (load_stack(STACKS_DIR / f) for f in ALL_STACK_FILES)
        for e in stack.elements
    }
    for key in _WORKBOOK_INFERRED_ALLOWED:
        assert key in live, f"{key} is registered but no longer exists"
        ref = live[key]
        assert (ref.kind, ref.confidence) == ("workbook", "inferred"), (
            f"{key} is registered as a workbook/inferred exception but is now "
            f"{ref.kind}/{ref.confidence} -- drop it from the allowlist"
        )


def test_no_traced_hardware_entry_cites_a_parts_list():
    """Same rule, the other file that carries a ``confidence``.

    ``hardware_entries.json`` is the leak the SOP already warns about (trap 17):
    it looks like a source. If the parts-list rule only held for stacks, an
    entry could launder the label and a stack could then cite the entry.
    """
    entries = json.loads(
        (STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8")
    )["entries"]
    offenders = [
        e["id"] for e in entries
        if (e.get("values_source") or {}).get("kind") == "parts_list"
        and (e.get("values_source") or {}).get("confidence") == "traced"
    ]
    assert offenders == []


def test_every_re_cited_fastener_grip_traces_to_nas6403_sheet_3(tan_link, take2, vpa):
    """Every grip now cites the standard that prints the band, not the parts list.

    Sheet 3 of ``NAS6403-NAS6420 Rev 4.pdf`` is one table for the whole family:
    a shared ``Grip ±.010`` column, then one LENGTH column per basic number. The
    band lives in the column HEADER, which is why the value and its tolerance
    come off the same page -- the thing a parts list can never do. Read by vision
    from a crop (the scan has no text layer); the crop commands are in
    ``docs/sessions/lessons/LESSONS_20260810_fastener_citations_and_confidence.md``.

    Values pinned here are the printed cells, not the mm the elements carry, so
    a unit-conversion slip cannot hide behind a matching label.

    Grew from two rows to four on 2026-08-10 (``fastener_citations_and_confidence``).
    The last two are the SAME BOLT in two stacks of one joint -- it was
    ``parts_list``/``inferred`` in take 1 and ``workbook``/``inferred`` in take 2,
    so one of the two was necessarily wrong about where the number came from.
    Asserting both rows here is what stops that pair drifting apart again: a
    change to one instance that is not made to the other fails.
    """
    for stack, element_id, dash, inch_grip, printed in (
        (tan_link, "fastener_grip_14", 14, 0.875, "NAS6403 .1900-32 = 1.198"),
        (vpa, "fastener_grip", 13, 0.812, "NAS6404 .2500-28 = 1.182"),
        (tan_link, "fastener_grip_13", 13, 0.812, "NAS6403 .1900-32 = 1.135"),
        (take2, "fastener_grip_13", 13, 0.812, "NAS6403 .1900-32 = 1.135"),
    ):
        ref = stack.element(element_id).source_ref
        assert ref.kind == "spec", f"{stack.id}:{element_id}"
        assert ref.document == "NAS6403-NAS6420 Rev 4.pdf"
        assert ref.sheet == 3
        assert ref.confidence == "traced"
        assert f"Grip Dash No. {dash}" in ref.callout
        assert printed in ref.callout
        # dash number x .0625, rounded to 3 places (sheet 2 CODE block, and the
        # sheet 3 closing note) -- and that is the nominal the element carries.
        assert round(dash * 0.0625, 3) == inch_grip
        element = stack.element(element_id)
        assert element.nominal == pytest.approx(inch_grip * 25.4, abs=1e-9)
        assert element.plus_minus == pytest.approx(0.010 * 25.4, abs=1e-9)

    # ...and the same bolt is cited the same way in both stacks of the one joint.
    # Take 2 is a restatement of take 1, so a provenance difference between these
    # two is a defect by construction, whatever either one says on its own.
    one, two = (tan_link.element("fastener_grip_13").source_ref,
                take2.element("fastener_grip_13").source_ref)
    shape = lambda r: (r.kind, r.document, r.sheet, r.cell, r.callout, r.confidence)
    assert shape(one) == shape(two), (
        "tan_link and take2 disagree about where NAS6403U13H's grip came from"
    )


def test_the_ms21299_washer_is_inferred_because_the_standard_is_not_here(vpa):
    """The one of the three that could not be rescued.

    MS21299 is absent from ``data/inbox/specs/``, so the ±.006 in band has no
    document. The parts list gives the .063 nominal and that is all -- `inferred`,
    with the band staying on the gap list rather than being quietly dropped.
    """
    ref = vpa.element("under_head_chamfer_washer").source_ref
    assert ref.confidence == "inferred"
    assert ref.kind == "parts_list" and ref.document == "217755"


def test_the_seeded_traced_ratio_is_the_number_every_document_quotes():
    """The repo's headline calibration figure, pinned to the stacks themselves.

    It was quoted as "1 of 17" from 2026-07-29 to 2026-08-06 and neither half
    reproduced: the denominator silently dropped ``take2`` (11 + 6 = 17 of 26),
    and the numerator counted only the value traced to a *part drawing* while the
    JSON said four elements were ``traced``. Both halves were defensible readings
    and neither was written down, so nothing could catch the drift.

    The definition now lives in exactly one place -- docs/SOP_TOLERANCE_STACK.md,
    "The traced ratio" -- and the counting lives in exactly one place,
    ``debug_report_tolerance_stacks.ratio()``. This test is what makes a document
    quoting a stale number fail the suite instead of merely being wrong.
    """
    from tests.debug_report_tolerance_stacks import SEEDED_STACK_FILES, _counts

    # scope is half the definition: "the seeded stacks" means these three
    assert SEEDED_STACK_FILES == [
        "stack_tan_link_to_pitch_plate.json",
        "stack_tan_link_to_pitch_plate_take2.json",
        "stack_vpa_output_to_pitch_plate.json",
    ]
    seeded = _counts(STACKS_DIR / n for n in SEEDED_STACK_FILES)
    assert seeded == {"instances": 26, "traced": 5, "inferred": 3, "untraced": 18}

    every = _counts(sorted(STACKS_DIR.glob("stack_*.json")))
    # Moved 2026-08-25 (fastener_stack_shadow): "21 of 48" -> "30 of 59". The new
    # rotor_fastener_length stack adds 11 element instances -- 9 traced (the
    # NAS6403 grip family) and 2 inferred (both washers, zero-width bands, same
    # treatment as the other from-scratch joints) -- so traced and instances both
    # rose and untraced did not move.
    assert every == {"instances": 59, "traced": 30, "inferred": 9, "untraced": 20}

    # Instances, not distinct ids, and not "elements that carry a hardware_ref".
    # Those are the two denominators a reader reaches for by mistake; recording
    # them here is what makes the choice legible rather than arbitrary.
    stacks = [load_stack(STACKS_DIR / n) for n in SEEDED_STACK_FILES]
    elements = [e for s in stacks for e in s.elements]
    assert len({e.id for e in elements}) == 18
    assert sum(1 for e in elements if e.hardware_ref) == 10


# --- what counts as a QUOTATION -- shared by both doc-level scans ------------
#
# Two guards in this file read prose for a number that has gone stale: the
# traced ratio, immediately below, and hardware-entry counts, in the section
# further down. Both need the same exemption and until 2026-08-12 they had two
# different ones -- this one knew only about blockquotes, which is exactly why
# the second superseded ratio could not be added to it (see the list below).
# One definition, two callers.

def _quoted_spans(text: str) -> list[tuple[int, int]]:
    """Where a superseded number is allowed to survive: inside a quotation.

    This repo corrects a number a review already read by leaving the old one
    visible rather than overwriting it -- as a markdown blockquote line, or
    quoted inline (`that clause read "The other twelve entries..."`, which is how
    the correction inside `NAS6403U11D`'s `library_ref_note` is written, where
    JSON gives you no blockquote). A quoted number is a report, not a claim.
    """
    spans = [(m.start(), m.end()) for m in re.finditer(r'"[^"\n]{0,300}"', text)]
    spans += [(m.start(), m.end()) for m in re.finditer(r"(?m)^\s*>.*$", text)]
    return spans


def _retired_ratio_pattern(figure: str) -> re.Pattern:
    """``3 of 26`` is also written ``3 traced of 26`` and ``3 traced out of 26``.

    Anchored on **both** numbers, which the bare ``"of 17"`` substring this
    replaced was not: reading the denominator alone flags a perfectly correct
    ``4 of 17`` and cannot see any figure that shares its denominator with the
    live one -- and ``3 of 26`` shares 26 with the current figure. That is a
    second reason the list below could not grow past one entry.

    The numerator must be **the traced count**, not any number that happens to
    sit within reach of the denominator, so the wildcard span is only reachable
    behind the literal word ``traced``. A free ``\\b<n>\\b[^.\\n]{0,40}?of <m>``
    reads the repo's own long form -- ``N traced / M inferred / K untraced, out
    of T element instances``, the shape the review checklist asks every report to
    state -- and matches on the *inferred* column: the **current** figure written
    out long (``5 traced / 3 inferred / 18 untraced, out of 26``) was flagged as
    the retired ``3 of 26``, i.e. the guard fired on the one number it exists to
    protect, and the natural repair is to delete a correct figure. Narrowed
    during `review/traced_ratio_guard_freshness`; the retired figure in that same
    long form is still caught, because there the retired numerator *is* the
    traced column.
    """
    traced, instances = figure.split(" of ")
    return re.compile(
        rf"\b{traced}\s+of\s+{instances}\b"
        rf"|\b{traced}\s+traced\b[^.\n]{{0,40}}?\bof\s+{instances}\b"
    )


# Every traced ratio this repo has retired, oldest first. This is history and
# history does not move, so it is not the cached-copy-of-a-live-number mistake
# the guard below exists against. The one manual step: **the handoff that moves
# the ratio appends the figure it retires here.** That handoff is forced to look
# -- moving the ratio fails the `missing` half against every live doc -- and that
# failure message says so.
_RETIRED_TRACED_RATIOS = tuple(
    (figure, _retired_ratio_pattern(figure), why) for figure, why in (
        ("1 of 17", "founding 2026-07-29 -> 2026-08-06 (`traced_labels_and_ratio`); "
                    "wrong in both halves rather than merely superseded"),
        ("3 of 26", "2026-08-06 -> 2026-08-10 (`fastener_citations_and_confidence`), "
                    "which re-cited two grips up and pushed two elements down"),
    ))


def _current_traced_ratio() -> str:
    """The live figure, recomputed from the stacks -- never a literal, and in
    this file least of all: a cached copy of this number beside the code that
    computes it is the exact defect the guard below exists against, and it is
    what an inline comment here had been for two days."""
    from tests.debug_report_tolerance_stacks import SEEDED_STACK_FILES, _counts

    c = _counts(STACKS_DIR / n for n in SEEDED_STACK_FILES)
    return f"{c['traced']} of {c['instances']}"


def retired_traced_ratio_claims(text: str) -> list[tuple[str, int]]:
    """``(figure, offset)`` for every retired ratio ``text`` states as a claim.

    A figure inside a quotation -- a blockquote line or a double-quoted phrase,
    see ``_quoted_spans`` -- is a report of what a document used to say, not an
    assertion about now. That exemption is what lets this list hold more than one
    entry: the dated corrections in `ARCHITECTURE.md` and the four worksheets
    legitimately state ``3 of 26``, and deleting them to get the suite green
    would destroy the evidence the correction rests on.
    """
    quoted = _quoted_spans(text)
    return [(figure, m.start())
            for figure, pattern, _ in _RETIRED_TRACED_RATIOS
            for m in pattern.finditer(text)
            if not any(a <= m.start() < b for a, b in quoted)]


def test_every_document_quoting_the_traced_ratio_quotes_the_current_number():
    """The stale-number bug this repo keeps having, caught at the doc level.

    ``1 of 17`` reached eleven files and survived three reviews. Prose cannot be
    parsed, but two mechanical rules cover the failure that actually happened:

    1. every live doc that discusses the ratio states the **current** figure; and
    2. **every** retired figure appears only inside a quotation -- a dated
       correction note, never an assertion. That is the repo's rule for a number
       a review already read: correct it in place and leave the old one visible,
       don't silently overwrite it.

    Rule 2 said *the* superseded figure and meant ``1 of 17`` alone until
    2026-08-12, so ``3 of 26`` -- retired on 2026-08-10 and still written in six
    live docs -- was unguarded. It is on the list now because the exemption is
    "inside a quotation" rather than "inside a blockquote"; the blockquote-only
    rule would have made a correction note written inline (the SOP's *"took it
    from `3 of 26` to 5"*) impossible to write truthfully.

    Historical records are deliberately out of scope: `docs/sessions/reviews/`
    and `docs/sessions/completed/` are what someone believed on a date, and
    rewriting them would destroy the evidence this correction rests on.
    """
    repo_root = STACKS_DIR.parent.parent
    live_docs = [
        repo_root / "ARCHITECTURE.md",
        repo_root / "docs" / "SOP_TOLERANCE_STACK.md",
        repo_root / "docs" / "prompts" / "REVIEW_AGENT.md",
        repo_root / "data" / "inbox" / "specs" / "README.md",
        *sorted((repo_root / "docs" / "tolerance_stacks").glob("WORKSHEET_*.md")),
    ]

    current = _current_traced_ratio()

    retired = {figure for figure, _, _ in _RETIRED_TRACED_RATIOS}
    assert current not in retired, (
        f"the live traced ratio {current!r} is registered as retired in "
        f"_RETIRED_TRACED_RATIOS -- the ratio moved back, or an entry was added "
        f"one handoff early"
    )

    missing, asserted_stale = [], []
    for p in live_docs:
        if not p.exists():          # data/ is gitignored; absent in a worktree
            continue
        text = p.read_text(encoding="utf-8")
        if current not in text:
            missing.append(str(p.relative_to(repo_root)))
        for figure, offset in retired_traced_ratio_claims(text):
            line = text[:offset].count("\n") + 1
            asserted_stale.append(f"{p.relative_to(repo_root)}:{line}: {figure}")

    assert missing == [], (
        f"traced ratio not stated as {current!r} in {missing}. If the ratio just "
        f"moved, the figure it replaced is now retired and unguarded: append it "
        f"to _RETIRED_TRACED_RATIOS in this file as you update these documents."
    )
    assert asserted_stale == [], (
        f"retired traced ratio asserted outside a quotation at {asserted_stale}. "
        f"A dated correction may state it -- as a blockquote line or inside "
        f"double quotes; a live sentence may not."
    )


def test_the_traced_ratio_guard_can_fail():
    """A guard nobody has watched fail is not yet a guard.

    The scan above is worth its lines only if it tells a claim from a quotation,
    so the newly-covered figure is put through all three shapes here. The bare
    sentence is `docs/SOP_TOLERANCE_STACK.md`'s own, as it read from 2026-08-10
    until this handoff quoted its retired figure.
    """
    stale = ("The 2026-08-10 change took it from 3 of 26 to 5 by re-citing two "
             "elements up to a standard")
    assert [f for f, _ in retired_traced_ratio_claims(stale)] == ["3 of 26"]

    # ...and the same sentence as a quotation is silent, in both of the two forms
    # this repo writes a correction in -- blockquote for markdown, inline double
    # quotes for JSON, which has no blockquote.
    assert retired_traced_ratio_claims(f"> {stale}") == []
    assert retired_traced_ratio_claims(f'it read "{stale}" until 2026-08-12') == []

    # The older figure, in the wordier form the worksheets use for it.
    assert [f for f, _ in retired_traced_ratio_claims(
        "Slice 1 scored 1 traced out of 17 across three stacks")] == ["1 of 17"]

    # Not flagged: the live figure, and the arithmetic that explains the
    # denominator -- "17 of 26" is how the founding count's omission is shown.
    assert retired_traced_ratio_claims(
        f"**{_current_traced_ratio()} element instances** are `traced`, and the "
        f"founding denominator silently omitted take2 (11 + 6 = 17 of 26)") == []

    # The repo's long form, both ways round, added during
    # `review/traced_ratio_guard_freshness`. This is the shape the review
    # checklist asks every report to state, so both directions need pinning: a
    # RETIRED figure written long is still a claim...
    assert [f for f, _ in retired_traced_ratio_claims(
        "3 traced / 7 inferred / 16 untraced, out of 26 element instances"
    )] == ["3 of 26"]
    # ...and a *current* figure written long is not, even when a retired
    # numerator sits in its `inferred` column within reach of the denominator.
    # An unanchored wildcard flagged exactly that -- the guard firing on the one
    # number it exists to protect. Built from the list itself, so this case can
    # neither go vacuous nor go stale as the list grows.
    for figure, _, _ in _RETIRED_TRACED_RATIOS:
        numerator, instances = figure.split(" of ")
        assert retired_traced_ratio_claims(
            f"9 traced / {numerator} inferred / 4 untraced, out of {instances} "
            f"element instances") == [], figure


def test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange(tan_link):
    """215197 is the one part drawing this repo holds for these joints, and
    exactly one element traces to it. Everything else is a fastener-library gap."""
    traced = [e.id for e in tan_link.elements if e.source_ref.confidence == "traced"]
    assert "pitch_plate_flange" in traced
    ref = tan_link.element("pitch_plate_flange").source_ref
    assert (ref.document, ref.sheet, ref.zone) == ("215197", 2, "B4")
    assert ref.callout == "3X 4.06 ±0.08"


def test_hardware_entry_values_source_counts_match_the_description():
    """``description`` asserts counts in prose. Prose goes stale silently.

    This is the repo's named recurring bug (stale inventory numbers in docs), and
    it bit this very field **twice in one day**: the description said "all but one
    entry transcribes the 260729 workbook" and stayed that way when
    ``hub_bearing_thermal_stack`` added two drawing-traced bearing entries, and the
    replacement said ``("inline", "spec")`` where ``spec_library_v0`` had promoted
    ``NAS6403U11D`` to ``library`` on the same branch point. Recount, don't read.

    The distinction the counts preserve is the one that matters for reuse: a
    ``kind: "workbook"`` source is forbidden in a from-scratch stack however clean
    the citing element looks (SOP Step 5b, trap 17), and ``values_status`` is
    orthogonal to it -- a promoted entry keeps saying where its inline numbers came
    from.
    """
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entries = data["entries"]
    assert len(entries) == 25
    counted = {}
    for entry in entries:
        src = entry.get("values_source") or {}
        counted[(entry["values_status"], src.get("kind"))] = counted.get(
            (entry["values_status"], src.get("kind")), 0) + 1
    assert counted == {
        ("inline", "workbook"): 5,     # forbidden as a source in a from-scratch stack
        ("inline", "spec"): 12,        # the three bolts re-sourced 2026-08-10, plus nine
                                        # NAS6403U2H..U10H added 2026-08-25 (rotor_fastener_length)
        ("library", "spec"): 1,        # NAS6403U11D, promoted by spec_library_v0
        ("inline", "drawing"): 2,      # 214589-002, 214588-002 -- source control drawings
        ("inline", "parts_list"): 1,   # MS21299C3, added 2026-08-25 (rotor_fastener_length)
        ("not_transcribed", None): 4,
    }
    # traced-ness is a property of values_source, not of values_status: the three
    # bolts re-sourced by `fastener_citations_and_confidence` are `traced` and
    # still `inline`, because being printed in the standard is not the same fact
    # as the spec library owning the numbers.
    traced = {e["id"] for e in entries
              if (e.get("values_source") or {}).get("confidence") == "traced"}
    assert traced == {"NAS6403U11D", "NAS6403U13H", "NAS6403U14D", "NAS6404U13D",
                      "214589-002", "214588-002",
                      "NAS6403U2H", "NAS6403U3H", "NAS6403U4H", "NAS6403U5H",
                      "NAS6403U6H", "NAS6403U7H", "NAS6403U8H", "NAS6403U9H",
                      "NAS6403U10H"}
    text = data["description"]
    for phrase in ("five of the 25", "FIFTEEN entries are traced",
                   "Four entries are `not_transcribed`"):
        assert phrase in text, f"description no longer says {phrase!r}"


# --- the doc-level guard on hardware-entry counts ----------------------------
#
# ``test_hardware_entry_values_source_counts_match_the_description`` above pins
# ONE file's copy of these counts. The counts kept going stale in the OTHER
# copies: docs/tolerance_stacks/README.md said "eight of the eleven inline
# entries" from 2026-08-10 (when three bolts were re-sourced to the NAS standard)
# to 2026-08-12, and that same sentence ended by telling the reader a test
# asserted its numbers -- it did, against a different file. Everything below is
# the same doc-level scan ``test_every_document_quoting_the_traced_ratio_...``
# uses, applied to these counts: find the claim wherever it lives, recount it
# against hardware_entries.json, name the document and line when it disagrees.

_NUMBER_WORDS = {
    w: i for i, w in enumerate(
        "zero one two three four five six seven eight nine ten eleven twelve "
        "thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
        .split())
}

# longest-first so "sixteen" is not matched as "six"; \b so the 6403 in NAS6403
# is not read as a number
_NUM = r"\b(?:\d{1,3}|" + "|".join(
    sorted(_NUMBER_WORDS, key=len, reverse=True)) + r")\b"


def _stated_number(token: str) -> int:
    t = token.lower()
    return int(t) if t.isdigit() else _NUMBER_WORDS[t]


def hardware_entry_counts() -> dict[str, int]:
    """Every count this repo's prose has ever quoted, recounted from the file."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entries = data["entries"]
    src = lambda e: e.get("values_source") or {}                     # noqa: E731
    n = lambda pred: sum(1 for e in entries if pred(e))              # noqa: E731
    c = {
        "total": len(entries),
        "sourced": n(lambda e: bool(src(e))),
        "workbook": n(lambda e: src(e).get("kind") == "workbook"),
        "spec": n(lambda e: src(e).get("kind") == "spec"),
        "drawing": n(lambda e: src(e).get("kind") == "drawing"),
        "traced": n(lambda e: src(e).get("confidence") == "traced"),
        "inline": n(lambda e: e["values_status"] == "inline"),
        "library": n(lambda e: e["values_status"] == "library"),
        "not_transcribed": n(lambda e: e["values_status"] == "not_transcribed"),
    }
    c["safe"] = c["sourced"] - c["workbook"]
    c["not_library"] = c["total"] - c["library"]
    return c


# (label, pattern, the count key each capture group must equal). A key may be a
# tuple, which means "either denominator is legitimate": the JSON description
# counts all fifteen entries, the README sentence counted only the eleven that
# carry a values_source, and both readings are correct. `[^.]{0,N}?` keeps a
# match inside roughly one sentence.
_COUNT_CLAIMS = [
    ("entries sourced kind=workbook, out of",
     rf"({_NUM})\s+of\s+the\s+({_NUM})[^.]{{0,100}}?\bentries\b[^.]{{0,200}}?workbook",
     ("workbook", ("total", "sourced"))),
    ("entries whose values_source is not the workbook",
     rf"other\s+({_NUM})\s+are\s+safe", ("safe",)),
    ("entries with a traced values_source",
     rf"({_NUM})\s+entries\s+are\s+traced", ("traced",)),
    ("entries traced to the NAS standard",
     rf"({_NUM})\s+traced\s+to\s+the\s+NAS", ("spec",)),
    ("entries traced to the NAS standard",
     rf"the\s+({_NUM})\s+NAS\s+bolts", ("spec",)),
    ("entries traced to a source-control drawing",
     rf"({_NUM})\s+(?:traced\s+)?to\s+(?:their\s+own\s+)?source.control\s+drawings",
     ("drawing",)),
    ("entries with values_status not_transcribed",
     rf"({_NUM})\s+entries\s+are\s+`?not_transcribed", ("not_transcribed",)),
    ("entries that do not defer to the spec library",
     rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
    ("entries with values_status inline / not_transcribed",
     rf"\(({_NUM})\s+`?inline`?,\s+({_NUM})\s+`?not_transcribed",
     ("inline", "not_transcribed")),
]
_COUNT_CLAIMS = [(lbl, re.compile(p, re.I | re.S), keys)
                 for lbl, p, keys in _COUNT_CLAIMS]

# Records of what someone believed on a date, not statements of what is true
# now. Rewriting them would destroy the evidence the corrections rest on --
# the same scope call test_every_document_quoting_the_traced_ratio_... makes.
# PROVENANCE.md is on this list for the same reason: every row in it is a dated
# "this is what changed and what the counts moved from and to".
#
# CLAUDE.md was on this list until 2026-09-01 (handoff `claude_md_tracked`) with
# the note "gitignored, per-session". It is tracked now, and it is not a dated
# record -- it states what is true today -- so it is a live document and these
# scans read it like any other.
_HISTORICAL_DIRS = ("docs/sessions", "docs/issues", "docs/reference")
_HISTORICAL_NAMES = {"PROVENANCE.md"}
_SKIP_DIR_NAMES = {".git", ".dispatch", ".pytest_cache", "__pycache__",
                   "node_modules", "venv", "venv-win", ".venv", "storage", "vendor"}
_SKIP_REL_DIRS = {"data/runs", "data/projections"}   # run output, not documents


def live_documents(repo_root: Path) -> list[Path]:
    """Every live `.md` in the repo, plus the `.json` under `docs/` -- those hold
    prose in fields (`description`, `library_ref_note`) and have gone stale there.

    Deliberately a walk rather than a hand-kept list: a count copied into a
    document nobody thought to enumerate is exactly how this bug recurs.
    """
    found = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        here = Path(dirpath)
        rel_dir = here.relative_to(repo_root).as_posix()
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in _SKIP_DIR_NAMES
            and f"{rel_dir}/{d}".lstrip("./") not in _SKIP_REL_DIRS)
        if rel_dir.startswith(_HISTORICAL_DIRS):
            continue
        for name in sorted(filenames):
            if name in _HISTORICAL_NAMES:
                continue
            if name.endswith(".md") or (
                    name.endswith(".json") and rel_dir.split("/")[0] == "docs"):
                found.append(here / name)
    return found


def _prose_blocks(path: Path, repo_root: Path) -> list[tuple[str, str]]:
    """``(location, text)`` -- a markdown file is one block; a JSON file is one
    block per string value, since that is where its prose lives."""
    rel = path.relative_to(repo_root).as_posix()
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".md":
        return [(rel, text)]
    blocks: list[tuple[str, str]] = []

    def walk(node, trail):
        if isinstance(node, str):
            blocks.append((f"{rel} [{trail}]", node))
        elif isinstance(node, dict):
            for k, v in node.items():
                walk(v, f"{trail}.{k}" if trail else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{trail}[{i}]")

    try:
        walk(json.loads(text), "")
    except json.JSONDecodeError:      # not our problem to diagnose here
        return []
    return blocks


def hardware_entry_count_claims(text: str) -> list[tuple[str, str, int, int]]:
    """``(label, count_key, stated, offset)`` for every count claim in ``text``."""
    quoted = _quoted_spans(text)
    claims = []
    for label, pattern, keys in _COUNT_CLAIMS:
        for m in pattern.finditer(text):
            for group, key in enumerate(keys, 1):
                start = m.start(group)
                if any(a <= start < b for a, b in quoted):
                    continue
                claims.append((label, key, _stated_number(m.group(group)), start))
    return claims


def test_no_live_document_states_an_unguarded_hardware_entry_count():
    """The stale-count bug caught wherever the count lives, not where it was last.

    Prose cannot be parsed, so this scans for the claim *shapes* that have
    actually appeared in this repo ("N of the M entries ... workbook", "N entries
    are traced", "the other N are safe", ...) and recounts each one against
    ``hardware_entries.json``. Two consequences worth knowing before you edit a
    doc:

    * a live document may state these counts -- it just cannot state them wrongly,
      and it will be named with a line number when it does; and
    * a shape not listed in ``_COUNT_CLAIMS`` is not caught. If you invent new
      phrasing for one of these counts, add the shape. The honest reading of this
      test is "the ways this repo has gone stale before are now mechanical", not
      "prose is now safe".

    ``docs/tolerance_stacks/README.md`` chose the other way out and states no
    count at all; this test is what makes that choice stick.
    """
    repo_root = STACKS_DIR.parent.parent
    counts = hardware_entry_counts()

    wrong = []
    for path in live_documents(repo_root):
        for location, text in _prose_blocks(path, repo_root):
            for label, key, stated, offset in hardware_entry_count_claims(text):
                expected = ({counts[k] for k in key} if isinstance(key, tuple)
                            else {counts[key]})
                if stated in expected:
                    continue
                where = (f"{location}:{text[:offset].count(chr(10)) + 1}"
                         if path.suffix == ".md" else location)
                wrong.append(
                    f"{where}: says {stated} {label}; hardware_entries.json has "
                    f"{'/'.join(str(e) for e in sorted(expected))}")

    assert wrong == [], (
        "live documents state hardware-entry counts that disagree with "
        "docs/tolerance_stacks/hardware_entries.json:\n  " + "\n  ".join(wrong))


def test_the_hardware_entry_count_guard_can_fail():
    """A guard nobody has watched fail is not yet a guard.

    The scan above is only worth its lines if it catches the exact sentence that
    went stale, so that sentence is replayed here -- README.md's, verbatim as it
    read from 2026-08-10 to 2026-08-12 -- along with the correction convention it
    must NOT flag.
    """
    stale = ('**Eight of the eleven inline entries say `kind: "workbook"`**, '
             "which is the point: those numbers are slice-1 transcriptions. The "
             "other three are safe -- one traced to the NAS6403 standard, two to "
             "their own source-control drawings")
    claims = hardware_entry_count_claims(stale)
    assert [(str(k), s) for _, k, s, _ in claims] == [
        ("workbook", 8), ("('total', 'sourced')", 11), ("safe", 3),
        ("spec", 1), ("drawing", 2)]

    # Asserted by count KEY, not by the stale digits: which of those digits still
    # disagrees depends on the size of hardware_entries.json, and that file changes
    # with every new stack (PROVENANCE.md says so). Pinning the digits made adding
    # one drawing-sourced entry fail this test with a bare ``[8, 11, 3, 1, 2] ==
    # [8, 3, 1]`` -- the same hard-coded-live-total coupling
    # ``test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in``
    # already had to give up. The durable claim is about the three NUMERATORS the
    # sentence got wrong; the denominator ("eleven") was legitimate in 2026-08-12's
    # file and may not stay so. Narrowed during review/hardware_counts_doc_guard.
    counts = hardware_entry_counts()
    flagged = {str(k) for _, k, s, _ in claims
               if s not in ({counts[x] for x in k} if isinstance(k, tuple)
                            else {counts[k]})}
    assert {"workbook", "safe", "spec"} <= flagged, (
        "the scan no longer flags the numerators the 2026-08-10 README sentence "
        f"got wrong; it flags {sorted(flagged)}")

    # ... and the same numbers quoted as a correction are silent, which is what
    # keeps a dated "this used to say X" from being a permanent test failure.
    assert hardware_entry_count_claims(f'> {stale}') == []
    assert hardware_entry_count_claims(f'it read "{stale}" until 2026-08-12') == []


# --------------------------------------------------------------------------- #
# The enumerated-state doc guard (review/enumerated_state_doc_guard,         #
# 2026-08-19) -- closes ISSUE_20260812_the_doc_scan_guards_cannot_fail_       #
# on_a_deleted_section.md.                                                   #
# --------------------------------------------------------------------------- #
#
# That issue's design question, decided here: a doc-scan guard built to catch
# a stale *number* cannot catch a *deleted* section, because "states nothing"
# disagrees with nothing. BRIEF_20260817_doc_scan_deletion_guards weighed four
# shapes; this is shape 2, picked over the others for reasons worth keeping
# next to the code that embodies the choice:
#
#   1. A required-heading manifest -- explicit, but hand-kept, and prose gets
#      restructured legitimately, so it goes stale exactly like a hand-kept
#      state list would (`live_documents()`'s own docstring names that trap).
#   3. A stored baseline of how many claims `hardware_entry_count_claims()`
#      finds -- catches deletion generically, but the baseline is itself a
#      number nobody re-derives, i.e. its own staleness surface.
#   4. Do nothing here; treat this as working-tree hygiene (the 2026-08-12
#      cause really was a stale editor buffer, not an author). Real, but it
#      leaves the *documentation* gap unguarded even when the cause next time
#      is an author, not an editor.
#
# Shape 2 -- derive the requirement from the data instead of from a list of
# sections -- is what is built below: every state `VA.EXPORT_STATUSES` and the
# `values_status` check can produce must be *mentioned by name* in the README
# of the surface that renders it. Add a state to either enum and this guard
# demands it be named before it can pass; delete the passage that names an
# existing state (by cutting a heading, a table row, or the whole file) and
# this guard goes red where the stale-count guards above stay green, because
# "the value is X" and "X exists" are different claims and only the second
# survives a deletion with nothing rewritten in its place.
#
# The surface -> README pairing below IS a small hand-kept map, and that looks
# like exactly the thing shape 1 was rejected for. It is not the same trap:
# shape 1 hand-keeps *which headings must exist*, which drifts every time
# prose is restructured (headings get renamed and reworded often). This map
# hand-keeps *which file documents a branch table the viewer owns*, which
# changes only when the surface itself moves -- rare enough, and load-bearing
# enough, that going quiet instead of loud on that move would be the worse
# failure. Read through `live_documents()` rather than by a bare `Path()`
# open, so that if the surface's README ever stops being a *live* document
# (renamed into `docs/sessions/`, or the file deleted outright) this guard
# raises instead of silently reading nothing.
#
# The states themselves are NOT hand-kept: each vocabulary is read the same
# way tests/test_js_python_vocabulary.py already reads it for the JS/Python
# pairing -- from the check or the enum itself, never a copy -- so a state
# this guard misses is a state that vocabulary-pairing test would also miss.
#
# The deliberate boundary: this protects sections that document an ENUMERATED
# CODE STATE, and nothing else. A "how to launch this" paragraph, an
# architecture rationale, a worked example -- all real prose this repo would
# also lose to a bad edit -- carry no enumerated state and so are NOT covered.
# That is intentional, not an oversight: there is no code-derived ground truth
# for "this paragraph must keep existing" the way there is for "this code
# value must be named somewhere", so guarding it would mean going back to a
# hand-kept heading manifest (shape 1) one level down. That prose stays the
# review checklist's job (REVIEW_AGENT.md, "a doc-scan guard cannot fail on a
# deleted section") plus working-tree hygiene (shape 4) -- not a test.
#
# Why the search is scoped to the owning README rather than "anywhere in
# `live_documents()`": every stack/materials JSON under docs/ carries these
# same words as literal FIELD VALUES (`"status": "established"` on a
# `source_ref.export`), which `_prose_blocks` walks like any other string --
# so a corpus-wide search never goes empty and the guard could never fail.
# Scoping to one Markdown file sidesteps that: a `.md` file has exactly one
# prose block (its own text), no embedded data values to confuse with prose.
_ENUMERATED_STATE_VOCABULARIES = [
    ("VA.EXPORT_STATUSES (tolerance_stack/stack.py: EXPORT_STATUSES)",
     lambda: EXPORT_STATUSES,
     "apps/viewer/README.md"),
    ("VA.VALUES_STATUSES (tolerance_stack/thermal.py: the values_status check "
     "in MaterialEntry.__post_init__)",
     python_values_statuses,
     "apps/viewer/README.md"),
]


def _state_mention_pattern(state: str) -> re.Pattern:
    """Match ``state`` by name: case-insensitive, and with its underscores
    allowed to read as spaces, because that is how the same name is rendered on
    screen -- ``not_transcribed`` the code value is ``NOT TRANSCRIBED`` the
    legend row, and that is one name, not two."""
    return re.compile(r"\b" + re.escape(state).replace("_", "[_ ]") + r"\b", re.I)


def _surface_readme_text(repo_root: Path, surface: str) -> str:
    """The current text of ``surface`` (a repo-relative path), read through
    ``live_documents()`` so a surface README that stops being live raises here
    instead of this guard silently checking nothing."""
    match = next(
        (p for p in live_documents(repo_root)
         if p.relative_to(repo_root).as_posix() == surface), None)
    if match is None:
        raise LookupError(
            f"{surface} is not a live document -- it was renamed, deleted, or "
            "moved under a directory live_documents() skips. Update the surface "
            "in _ENUMERATED_STATE_VOCABULARIES to wherever it documents these "
            "states now."
        )
    return match.read_text(encoding="utf-8")


def _missing_enumerated_state_mentions(
        repo_root: Path, overrides: dict[str, str] | None = None,
) -> list[tuple[str, str, str]]:
    """``(state, vocabulary, surface)`` for every enumerated state not named in
    its surface's README. ``overrides`` substitutes a surface's text (used by
    the replay test below) without touching the file on disk."""
    overrides = overrides or {}
    missing = []
    cache: dict[str, str] = {}
    for vocabulary, states_fn, surface in _ENUMERATED_STATE_VOCABULARIES:
        if surface in overrides:
            text = overrides[surface]
        else:
            text = cache.setdefault(surface, _surface_readme_text(repo_root, surface))
        for state in states_fn():
            if not _state_mention_pattern(state).search(text):
                missing.append((state, vocabulary, surface))
    return missing


def test_every_enumerated_viewer_state_is_named_in_a_live_document():
    """Every state `VA.EXPORT_STATUSES` and the `values_status` check can
    produce must be named in `apps/viewer/README.md` -- the one file that
    documents both branch tables today, found by walking `live_documents()`
    rather than by a bare path open (see the module comment above).
    """
    repo_root = STACKS_DIR.parent.parent
    missing = _missing_enumerated_state_mentions(repo_root)
    assert missing == [], (
        "enumerated code states with no mention in their owning surface's "
        "README -- add a state to VA.EXPORT_STATUSES or the values_status "
        "check and this fails until that surface's README says its name:\n  " +
        "\n  ".join(f"{state!r} ({vocabulary}) -- expected in {surface}"
                     for state, vocabulary, surface in missing))


def test_the_enumerated_state_doc_guard_catches_the_08_12_deletion():
    """The replay `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`
    demands: cut `## Which bytes the number was read off` out of
    `apps/viewer/README.md`, plus the `EXPORT UNESTABLISHED` and
    `CTE NOT TRANSCRIBED` legend rows -- the exact edit that left the suite at
    `350 passed, 0 failed` on 2026-08-12, because the stale-count guards above
    only recount numbers that are still present. With that section and both
    rows gone, nothing left in the README names `established` or
    `unestablished` by their code spelling, so the guard above must go red.

    Done on an in-memory copy of the README's text, never by writing a broken
    README to disk -- this handoff's scope is explicit that the live documents
    are not to be restructured beyond what this demonstration needs.
    """
    repo_root = STACKS_DIR.parent.parent
    surface = "apps/viewer/README.md"
    original = _surface_readme_text(repo_root, surface)

    section = re.compile(
        r"\n## Which bytes the number was read off\n.*?(?=\n## )", re.S)
    mutated, n = section.subn("\n", original)
    assert n == 1, (
        "the section this test replays deleting has moved or been renamed in "
        "apps/viewer/README.md -- update the replay, not the assertion below")

    lines = mutated.splitlines(keepends=True)
    kept = [ln for ln in lines if "EXPORT UNESTABLISHED" not in ln]
    assert len(kept) == len(lines) - 1, (
        "the EXPORT UNESTABLISHED legend row has moved or been renamed")
    lines = kept
    kept = [ln for ln in lines if "CTE NOT TRANSCRIBED" not in ln]
    assert len(kept) == len(lines) - 1, (
        "the CTE NOT TRANSCRIBED legend row has moved or been renamed")
    mutated = "".join(kept)

    before = _missing_enumerated_state_mentions(repo_root)
    assert before == [], (
        "sanity check failed before the replay even starts -- the guard "
        f"above should already be catching this: {before}")

    after = _missing_enumerated_state_mentions(
        repo_root, overrides={surface: mutated})
    after_states = {state for state, _, _ in after}
    assert {"established", "unestablished"} <= after_states, (
        "the 08-12 deletion no longer removes every mention of the export "
        f"states this guard exists to protect; it now flags {sorted(after_states)}")


def test_hardware_entries_flag_the_two_parts_missing_from_the_assembly():
    """``present`` is three-valued and the three values mean different things.

    ``False`` is a **finding** -- the part is not in 217755's parts list, which is
    how slice 1 discovered that every evaluated check used a `.063` washer the
    assembly does not contain. ``None`` is **not checked**, which is a gap on the
    author, not on the design. Collapsing them (``if not entry[...]["present"]``)
    reads a null as a finding and manufactures one; this test was written that way
    and ``hub_bearing_thermal_stack`` was the first handoff to add a
    deliberately-null entry, which exposed it.
    """
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    states = {}
    for entry in data["entries"]:
        states.setdefault(entry["assembly_status"].get("present"), set()).add(entry["id"])
    assert states[False] == {"NAS1149V0363", "NAS77A4-015"}, "absent-from-assembly findings"
    assert states[None] == {"214589-002", "214588-002"}, "assembly presence not yet checked"
    for entry_id in states[None]:
        entry = next(e for e in data["entries"] if e["id"] == entry_id)
        assert any("not checked" in g.lower() for g in entry["gaps"]), (
            f"{entry_id}: a null `present` must be listed as a gap, not left silent")


def test_the_nas6403_entry_cites_the_standard_its_inline_values_came_from():
    """The one entry in this file whose inline numbers come from an actual
    standard rather than from the 260729 workbook or a parts list. `values_source`
    is an additive extension proposed by handoff pitch_link_stack --
    `hardware_entry/v0` had nowhere to say where inline values came from, which
    is a hole in a repo whose whole point is provenance. This is the `spec`-kind
    half of that field's coverage; the `workbook`-kind half is the 214820-002
    test below."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["id"] == "NAS6403U11D")
    src = entry["values_source"]
    assert src["kind"] == "spec"
    assert src["document"] == "NAS6403-NAS6420 Rev 4.pdf"
    assert src["sheet"] == [1, 2, 3]    # NAS6403 sheets read; `sheet`, not `sheets`
    assert src["confidence"] == "traced"
    assert entry["dimensions_in"]["grip"] == 0.688          # NAS6403 sh3 dash 11
    assert entry["dimensions_in"]["grip_tol"] == 0.010      # NAS6403 sh3 column header
    assert entry["dimensions_in"]["length"] == 1.011        # NAS6403 sh3 dash 11
    assert entry["dimensions_in"]["T_ref"] == 0.323         # NAS6403 sh1 "T (Ref)"
    assert entry["dimensions_in"]["length"] - entry["dimensions_in"]["grip"] == pytest.approx(
        entry["dimensions_in"]["T_ref"], abs=1e-9
    )
    # `values_source` stays on the entry after the promotion below: it records
    # where the INLINE numbers came from, which is still a true and useful fact
    # once those numbers are a cross-check rather than the source.
    #
    # This entry's `values_status` was "inline" with a null `library_ref` until
    # 2026-08-05, when handoff spec_library_v0 built the library and promoted it
    # to "library". The promotion, and the cross-check that the inline numbers
    # still agree with the library value by value, are asserted in
    # tests/test_spec_library.py::test_the_nas6403_hardware_entry_defers_to_the_library.
    assert entry["values_status"] == "library"
    assert entry["library_ref"] == "spec_library:NAS6403U11D"


def test_the_214820_entry_says_its_band_is_a_workbook_transcription():
    """The `workbook`-kind counterpart to the NAS6403 test, and the entry the
    laundering trap is named after: its .1900/.1875 in nominals are the 217755
    parts list, but the 4.63/4.76 mm LIMITS are two hand-typed workbook cells.
    Before `values_source` existed, citing this entry produced a `parts_list`
    source_ref with zero workbook references and an untraced band inside it."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["id"] == "214820-002")
    src = entry["values_source"]
    assert src["kind"] == "workbook"
    assert src["document"] == "260729_sample_tol_stack.xlsx"
    assert src["sheet"] == "grip length tols old"
    assert src["cell"].startswith("E7/G7/H7")
    assert src["confidence"] == "untraced"
    # 260729 'grip length tols old' G7 / H7 -- literals, no formula behind them
    assert entry["dimensions_mm"]["length_min"] == 4.63
    assert entry["dimensions_mm"]["length_max"] == 4.76
    # ... while the nominal is the parts-list .1875 in converted exactly, which
    # is NOT what the workbook's own E7 says (4.762). Both numbers are kept.
    assert entry["dimensions_in"]["length"] == 0.1875
    assert entry["dimensions_mm"]["length"] == pytest.approx(0.1875 * 25.4, abs=1e-9)


def test_every_inline_hardware_entry_cites_where_its_values_came_from():
    """SOP Step 4: `values_source` is mandatory whenever `values_status` is
    `inline`, and explicitly null when it is `not_transcribed` -- the same
    convention as `library_ref`, so "nothing to cite" reads differently from
    "nobody filled it in". It is source_ref-shaped, which is what lets a reader
    apply Step 5b's transitive workbook ban to a hardware entry."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    for entry in data["entries"]:
        assert "values_source" in entry, f"{entry['id']} has no values_source key"
        src = entry["values_source"]
        # Only `not_transcribed` means "no inline values, nothing to cite". A
        # `library` entry still HAS inline numbers -- they are demoted to a
        # cross-check, not deleted -- so where they came from stays a true and
        # useful fact and `values_source` stays filled. This guard read
        # `!= "inline"` when sop_edits_apply wrote it, which was equivalent
        # while no entry was `library`; spec_library_v0 promoted NAS6403U11D
        # the same day and the two rules collided at the merge. Narrowed to
        # match this test's own docstring. (review/spec_library_v0, 2026-08-05)
        if entry["values_status"] == "not_transcribed":
            assert src is None, f"{entry['id']} has no inline values but cites a source"
            continue
        assert src, f"{entry['id']} has inline values and does not say where they came from"
        assert set(src) <= set(SourceRef.__dataclass_fields__), (
            f"{entry['id']}: values_source is not source_ref-shaped: "
            f"{sorted(set(src) - set(SourceRef.__dataclass_fields__))}"
        )
        assert src["kind"] in SOURCE_REF_KINDS
        # The raw JSON, so this one is NOT redundant with SourceRef's own check:
        # `hardware_entries.json` is read as a dict here, never constructed.
        assert src["confidence"] in CONFIDENCES
        assert src["document"], f"{entry['id']}: values_source names no document"
    # The file's whole provenance story in one line: the thirteen NAS bolts
    # traced to the one standard in the spec pile, and five entries still
    # transcribing the 260729 workbook. Was `== ["NAS6403U11D"]` and `== 8`
    # until 2026-08-10, when `fastener_citations_and_confidence` re-sourced the
    # other three bolts -- all of which had been sourceable since the day that
    # PDF landed. Moved from four to thirteen 2026-08-25 (fastener_stack_shadow),
    # which added NAS6403U2H through NAS6403U10H for the rotor balance-mass
    # joint's grip-selection family, off the same sheet-3 table.
    by_kind = {}
    for entry in data["entries"]:
        if entry["values_source"]:
            by_kind.setdefault(entry["values_source"]["kind"], []).append(entry["id"])
    assert sorted(by_kind["spec"]) == [
        "NAS6403U10H", "NAS6403U11D", "NAS6403U13H", "NAS6403U14D",
        "NAS6403U2H", "NAS6403U3H", "NAS6403U4H", "NAS6403U5H", "NAS6403U6H",
        "NAS6403U7H", "NAS6403U8H", "NAS6403U9H", "NAS6404U13D"]
    assert len(by_kind["workbook"]) == 5
    assert len(by_kind["parts_list"]) == 1


def test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry(pitch_link):
    """SOP Step 5b's workbook ban is TRANSITIVE, and `values_source` is what
    makes it checkable. Where pitch_link_to_pitch_plate points at a hardware
    entry whose inline values are a workbook transcription, it may take the
    parts-list nominal but NOT the band -- so the element is zero-width. Without
    this test the ban is prose, and the laundered value passes everything."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entries = {e["id"]: e for e in data["entries"]}
    laundered = []
    for element in pitch_link.elements:
        if not element.hardware_ref:
            continue
        src = entries[element.hardware_ref]["values_source"]
        if src and src["kind"] == "workbook" and element.min != element.max:
            laundered.append(element.id)
    assert not laundered, f"workbook-derived band reused via hardware_ref: {laundered}"
    # And the two that do point at workbook-sourced entries are exactly the two
    # zero-width elements -- i.e. this test is not passing vacuously.
    refs = {e.id: e.hardware_ref for e in pitch_link.elements if e.hardware_ref}
    workbook_backed = {
        eid for eid, ref in refs.items()
        # `or {}` because a not_transcribed entry's values_source is null, and a
        # future hardware_ref to one (MS9363 is the named next document) should
        # fail this test cleanly rather than TypeError out of it.
        if (entries[ref]["values_source"] or {}).get("kind") == "workbook"
    }
    assert workbook_backed == {"bushing_214820", "washer_nas1149v0332"}


def hardware_entry_problems(entry: dict) -> list[str]:
    """Every way one `hardware_entry` breaks SOP Step 4's structural rules.

    A function returning complaints rather than a test asserting them, for one
    reason: `tests/test_sop_vocabulary.py` runs the SOP's own worked examples of
    this shape through **this** code, so the document that teaches the shape is
    checked by the same rules as the data. That is the mechanised half of the
    answer to the third sighting of "the SOP documents a vocabulary the repo no
    longer implements" (`sop_library_ref_pairing`, 2026-08-11).

    The `library_ref` rule is the **pairing** and has been since 2026-08-05: a
    filled ref ⟺ `values_status == "library"`. Nullness is not the rule; it was,
    until the spec library existed and `NAS6403U11D` was promoted.

    `values_status` itself is one vocabulary, not two: `hardware_entry` and
    `MaterialEntry` mean the same three words by it, so this reads the domain
    through `python_values_statuses()` (the same AST-read `MaterialEntry`'s own
    `__post_init__` check is compared against in
    `tests/test_js_python_vocabulary.py`) instead of re-spelling the tuple --
    `hardware_entry` is a dict, not a dataclass, so this is the shared-source-
    of-truth the two schemas can have without `hardware_entry` becoming one.
    """
    eid = entry.get("id", "<no id>")
    out: list[str] = []
    if not entry.get("gaps"):
        out.append(f"{eid} claims no source gaps")
    status = entry.get("values_status")
    if status not in python_values_statuses():
        out.append(f"{eid} has undocumented values_status {status!r}")
    if "library_ref" not in entry:
        # Explicitly null, never absent -- the same convention as `values_source`,
        # so "nothing to cite" reads differently from "nobody filled it in".
        out.append(f"{eid} has no library_ref key at all")
    elif entry["library_ref"] is None:
        if status == "library":
            out.append(f"{eid} says values_status 'library' with a null library_ref")
    else:
        if status != "library":
            out.append(
                f"{eid} has a filled library_ref with values_status {status!r} -- "
                f"a filled ref and 'library' are one decision"
            )
        if not entry["library_ref"].startswith("spec_library:"):
            out.append(
                f"{eid} library_ref {entry['library_ref']!r} does not name a "
                f"spec_library subject"
            )
    if "values_source" not in entry:
        out.append(f"{eid} has no values_source key")
    elif status == "not_transcribed":
        if entry["values_source"] is not None:
            out.append(f"{eid} has no inline values but cites a source")
    elif not entry["values_source"]:
        # Note `library` is on this side of the branch: a promotion demotes the
        # inline numbers to a cross-check rather than deleting them, so where they
        # came from stays a true fact. (review/spec_library_v0 narrowed the guard
        # from `!= "inline"` to exactly `not_transcribed`.)
        out.append(f"{eid} has inline values and does not say where they came from")
    return out


def test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status():
    """The pairing invariant over the seeded file.

    `library_ref` was null on every entry until 2026-08-05, when the spec library
    was built and `NAS6403U11D` was promoted; the invariant that survives that is
    the **pairing** -- a filled ref means `values_status == "library"`, a null ref
    means it does not. How many entries are currently promoted is deliberately not
    asserted here: `test_only_the_one_entry_was_promoted` in
    `tests/test_spec_library.py` owns that count, and a second copy of it is the
    stale-inventory-number bug this repo keeps having.
    """
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    problems = [p for entry in data["entries"] for p in hardware_entry_problems(entry)]
    assert problems == [], "hardware_entries.json breaks SOP Step 4:\n" + "\n".join(
        f"  {p}" for p in problems
    )


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


def _inline_field_vocabulary_literals(package_dir: Path) -> list[str]:
    """Every ``self.<attr> {in,not in} (...)`` check under ``package_dir`` whose
    right-hand side is an inline literal of two or more string constants, rather
    than a name resolving to a module-level constant.

    This is the generalized form of the question ``three_field_vocabularies``
    (2026-08-19) and ``material_values_status_vocabulary`` (2026-08-26) each
    answered by hand -- "is there a[nother] field vocabulary with no importable
    name?" -- turned into a scan instead of a fifth grep, per
    ``docs/sessions/lessons/LESSONS_20260819_three_field_vocabularies.md``.

    Scoped to ``self.<attr>``, not any ``Name`` (unlike
    ``tests.test_js_python_vocabulary._values_statuses_from_source``, which
    already knows which single check it is reading and can afford to be
    generic about the comparator): a **persisted field's** domain is the thing
    this guard protects, and a bare local or a function parameter -- e.g.
    ``thermal.py``'s ``corner not in ("nom", "lmc", "mmc")``, a label argument
    that produces a value rather than storing one -- is deliberately not one.
    That distinction is exactly what the previous lesson worked out by hand for
    ``corner``/``stage``/``group``; encoding it as ``self.`` rather than as a
    per-name allowlist is what keeps this a scan instead of a fourth hand
    review.
    """
    problems: list[str] = []
    for path in sorted(package_dir.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Compare) or len(node.ops) != 1:
                continue
            if not isinstance(node.ops[0], (ast.In, ast.NotIn)):
                continue
            left = node.left
            if not (isinstance(left, ast.Attribute) and isinstance(left.value, ast.Name)
                    and left.value.id == "self"):
                continue
            comparator = node.comparators[0]
            if not isinstance(comparator, (ast.Tuple, ast.List, ast.Set)):
                continue
            elts = comparator.elts
            if len(elts) < 2 or not all(
                    isinstance(e, ast.Constant) and isinstance(e.value, str) for e in elts):
                continue
            op = "not in" if isinstance(node.ops[0], ast.NotIn) else "in"
            words = tuple(e.value for e in elts)
            problems.append(
                f"{path.relative_to(package_dir.parent)}:{node.lineno}: "
                f"self.{left.attr} {op} {words!r}"
            )
    return problems


def test_no_persisted_field_vocabulary_is_an_inline_literal():
    """No ``self.<attr>`` membership check in ``tolerance_stack/`` spells its
    vocabulary as a bare tuple/list/set of strings -- every one must read a
    module-level constant instead, so it has a name the next schema (or the
    next reader) can import rather than re-spell.

    Mutate any of the constants this currently passes because of --
    ``MATERIAL_VALUES_STATUSES``, ``CONFIDENCES``, ``SUBJECT_KINDS``,
    ``EVENT_MODES``, ``EXPORT_STATUSES``, ``SOURCE_REF_KINDS``,
    ``ELEMENT_ROLES`` -- back into an inline tuple on the ``if`` line, and this
    goes red on that line specifically, which is the demonstration that it is
    not vacuous.
    """
    problems = _inline_field_vocabulary_literals(TOLERANCE_STACK_PACKAGE)
    assert problems == [], (
        "field vocabulary spelled as an inline literal instead of a named "
        "module-level constant (see MaterialEntry.values_status / "
        "MATERIAL_VALUES_STATUSES for the fix shape):\n  " + "\n  ".join(problems)
    )

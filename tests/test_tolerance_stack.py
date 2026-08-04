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


@pytest.fixture(scope="module")
def pitch_link():
    return load_stack(STACKS_DIR / "stack_pitch_link_to_pitch_plate.json")


# Every stack file in docs/tolerance_stacks/. The schema-hygiene tests below are
# parametrized over this so a new stack cannot be added without them applying.
ALL_STACK_FILES = [
    "stack_tan_link_to_pitch_plate.json",
    "stack_tan_link_to_pitch_plate_take2.json",
    "stack_vpa_output_to_pitch_plate.json",
    "stack_pitch_link_to_pitch_plate.json",
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
    assert "INCOMPLETE" in got.label


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
# Schema hygiene across all four stacks
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_every_element_carries_a_source_ref_with_a_confidence(filename):
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        assert element.source_ref is not None, f"{stack.id}:{element.id} has no source_ref"
        assert element.source_ref.confidence in ("traced", "inferred", "untraced")


@pytest.mark.parametrize("filename", ALL_STACK_FILES)
def test_source_ref_leaves_the_feature_identity_slot_open_and_empty(filename):
    """Slice 1 cites human readings only. When extraction addresses dimensions
    stably, element_id/run_id get filled -- until then they must be None, so a
    later consumer can tell 'not yet wired' from 'wired to nothing'."""
    stack = load_stack(STACKS_DIR / filename)
    for element in stack.elements:
        ref = element.source_ref
        assert ref.element_id is None and ref.run_id is None
        # "spec" is the SOP's kind for a file in data/inbox/specs/. It was
        # missing from this whitelist (and from SourceRef's docstring) because
        # slice 1 had no spec to cite; pitch_link_to_pitch_plate cites three.
        assert ref.kind in (
            "drawing", "parts_list", "workbook", "spec", "pipeline_element", "assumed",
        )


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


def test_the_nas6403_entry_cites_the_standard_its_inline_values_came_from():
    """The first entry in this file whose inline numbers come from an actual
    standard rather than from the 260729 workbook or a parts list. `values_source`
    is an additive extension proposed by handoff pitch_link_stack --
    `hardware_entry/v0` has nowhere to say where inline values came from, which
    is a hole in a repo whose whole point is provenance."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["id"] == "NAS6403U11D")
    src = entry["values_source"]
    assert src["kind"] == "spec"
    assert src["document"] == "NAS6403-NAS6420 Rev 4.pdf"
    assert src["confidence"] == "traced"
    assert entry["dimensions_in"]["grip"] == 0.688          # NAS6403 sh3 dash 11
    assert entry["dimensions_in"]["grip_tol"] == 0.010      # NAS6403 sh3 column header
    assert entry["dimensions_in"]["length"] == 1.011        # NAS6403 sh3 dash 11
    assert entry["dimensions_in"]["T_ref"] == 0.323         # NAS6403 sh1 "T (Ref)"
    assert entry["dimensions_in"]["length"] - entry["dimensions_in"]["grip"] == pytest.approx(
        entry["dimensions_in"]["T_ref"], abs=1e-9
    )
    # values_status stays "inline" and library_ref stays null even though these
    # numbers are now traced: "library" means a fastener library owns them, and
    # no such library exists yet.
    assert entry["values_status"] == "inline" and entry["library_ref"] is None


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

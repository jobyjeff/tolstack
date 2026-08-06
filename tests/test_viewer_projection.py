"""Tests for the viewer's results projection (``scripts/build_viewer_projection.py``).

Two things are being defended:

1. **Verbatim.** The projection embeds each stack's authored JSON unchanged. If
   a future "helpful" normalisation ever rewrites a value on the way through,
   the viewer would be showing a number nobody authored, and the whole
   provenance story would be a lie. ``test_stack_block_is_byte_identical`` is
   the guard.
2. **One fold.** Every interval and verdict in the projection is the one
   :func:`tolerance_stack.fold` produces. The tests re-assert the ground-truth
   numbers already pinned in ``test_tolerance_stack.py`` *through the
   projection*, so a projection that quietly re-computed anything would show up
   here rather than in the browser.

Handoff: stack_viewer_v0 (2026-08-05).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_viewer_projection as bvp  # noqa: E402

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
TOL = 1e-6


@pytest.fixture(scope="module")
def projection():
    return bvp.build(STACKS_DIR, STACKS_DIR / "hardware_entries.json")


@pytest.fixture(scope="module")
def pitch_link(projection):
    return by_id(projection, "pitch_link_to_pitch_plate")


def by_id(projection, stack_id):
    for stack in projection["stacks"]:
        if stack["id"] == stack_id:
            return stack
    raise AssertionError(f"no stack {stack_id!r} in the projection")


def check_by_id(stack, check_id):
    for check in stack["checks"]:
        if check["check_id"] == check_id:
            return check
    raise AssertionError(f"no check {check_id!r}")


# --- shape ----------------------------------------------------------------


def test_every_stack_file_is_projected(projection):
    on_disk = sorted(p.name for p in STACKS_DIR.glob("stack_*.json"))
    assert len(projection["stacks"]) == len(on_disk)
    assert projection["schema"] == bvp.SCHEMA_PROJECTION


def test_stack_block_is_byte_identical(projection):
    """The embedded stack must round-trip the authored file exactly."""
    for stack in projection["stacks"]:
        authored = json.loads((REPO_ROOT / stack["source_file"]).read_text(encoding="utf-8"))
        assert stack["stack"] == authored, stack["id"]


def test_worksheet_is_matched_by_name_and_absence_is_reported(projection):
    assert by_id(projection, "pitch_link_to_pitch_plate")["worksheet_file"] == (
        "docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md"
    )
    # take-2 has no worksheet of its own; the projection says so rather than
    # pointing the viewer at the take-1 sheet.
    assert by_id(projection, "tan_link_to_pitch_plate_take2")["worksheet_file"] is None


def test_hardware_entries_are_carried_verbatim(projection):
    authored = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    assert projection["hardware_entries"] == authored


# --- the fold comes through unchanged -------------------------------------


def test_pitch_link_shank_out_matches_the_pinned_ground_truth(pitch_link):
    """Same numbers ``test_tolerance_stack.py`` pins, seen through the projection."""
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert check["verdict"] == "fail"
    assert check["worst_case_min"] == pytest.approx(-8.1939, abs=TOL)
    assert check["worst_case_max"] == pytest.approx(-7.4859, abs=TOL)
    assert check["nominal"] == pytest.approx(-7.8399, abs=TOL)


def test_pitch_link_cotter_hole_budget_passes(pitch_link):
    check = check_by_id(pitch_link, "cotter_hole_clear_of_sourced_stack")
    assert check["verdict"] == "pass"
    assert check["worst_case_min"] == pytest.approx(11.1435, abs=TOL)


def test_thread_region_T_path_reproduces_the_standards_own_T_ref(pitch_link):
    path = next(p for p in pitch_link["paths"] if p["id"] == "thread_region_T")
    assert path["interval"]["nominal"] == pytest.approx(8.2042, abs=TOL)


# --- provenance, the point of the viewer ----------------------------------


def test_pitch_link_provenance_counts_match_its_worksheet(pitch_link):
    """The worksheet claims 4 traced / 2 inferred / 0 untraced out of 6."""
    assert pitch_link["provenance_counts"] == {
        "traced": 4,
        "inferred": 2,
        "untraced": 0,
        "no_source_ref": 0,
    }


def test_zero_width_bands_are_flagged(pitch_link):
    flagged = {e["id"] for e in pitch_link["elements"] if e["zero_width"]}
    assert flagged == {"bushing_214820", "washer_nas1149v0332"}
    assert pitch_link["zero_width_count"] == 2


def test_both_pitch_link_checks_are_flagged_incomplete(pitch_link):
    assert [c["incomplete"] for c in pitch_link["checks"]] == [True, True]


def test_a_complete_check_is_not_flagged_incomplete(projection):
    tan_link = by_id(projection, "tan_link_to_pitch_plate")
    assert not any(c["incomplete"] for c in tan_link["checks"])


def test_a_generated_check_archetype_says_so_rather_than_showing_no_checks(projection):
    """A `thermal_fit` stack projects zero checks; that must not read as "none".

    Its checks are generated by ``thermal.build_checks``, not authored, and this
    script calls plain ``load_stack``. Zero rendered checks is therefore true and
    "this stack has no checks" is false -- the viewer must be able to tell them
    apart. Added during review/stack_viewer_v0 after `hub_bearing_thermal_stack`
    landed on master mid-review.
    """
    for stack_id in ("hub_bearing_thermal_fit_m1", "hub_bearing_thermal_fit_m2"):
        stack = by_id(projection, stack_id)
        assert stack["archetype"] == "thermal_fit"
        assert stack["checks"] == []
        assert stack["checks_generated_not_rendered"] is True

    # ...and an ordinary authored stack is not tarred with it.
    pitch_link = by_id(projection, "pitch_link_to_pitch_plate")
    assert pitch_link["archetype"] is None
    assert pitch_link["checks_generated_not_rendered"] is False
    assert pitch_link["checks"]


def test_worst_confidence_takes_the_weakest_input(projection):
    """A check is only as sourced as its weakest term."""
    tan_link = by_id(projection, "tan_link_to_pitch_plate")
    check = check_by_id(tan_link, "shank_out__14_thick")
    assert check["worst_confidence"] == "untraced"
    assert check["input_confidence"]["untraced"] >= 1
    # pitch_link has no untraced element at all, so its weakest is `inferred`.
    assert check_by_id(
        by_id(projection, "pitch_link_to_pitch_plate"),
        "shank_out__11_sourced_only",
    )["worst_confidence"] == "inferred"


def test_worst_confidence_ranks_a_missing_citation_below_untraced():
    assert bvp.worst_confidence({"traced": 3, "no_source_ref": 1}) == "no_source_ref"
    assert bvp.worst_confidence({"traced": 3, "untraced": 1}) == "untraced"
    assert bvp.worst_confidence({"traced": 3}) == "traced"
    assert bvp.worst_confidence({}) is None


def test_checks_carry_their_zero_width_inputs(pitch_link):
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert set(check["zero_width_inputs"]) == {"bushing_214820", "washer_nas1149v0332"}


def test_element_terms_expand_nested_paths(pitch_link):
    """A check citing a path must list that path's own elements, signs included."""
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert check["element_terms"] == [
        {"element_id": "bushing_214820", "sign": 1},
        {"element_id": "pitch_plate_flange", "sign": 1},
        {"element_id": "washer_nas1149v0332", "sign": 1},
        {"element_id": "bolt_grip_11", "sign": -1},
    ]


# --- gaps -----------------------------------------------------------------


def test_the_excluded_link_eye_is_the_first_gap(pitch_link):
    """Gap 1 of the worksheet -- the term that was refused rather than invented."""
    first = pitch_link["gaps"][0]
    assert first["kind"] == "excluded_from_model"
    assert "spherical bearing" in first["text"]


def test_excluded_terms_are_deduped_across_checks(pitch_link):
    excluded = [g for g in pitch_link["gaps"] if g["kind"] == "excluded_from_model"]
    assert len(excluded) == 1  # both checks exclude the same thing


def test_hardware_gaps_reach_the_stack_that_uses_the_entry(pitch_link):
    ids = {g["hardware_id"] for g in pitch_link["gaps"] if g["kind"] == "hardware_entry"}
    assert {"NAS6403U11D", "214820-002", "NAS1149V0332"} <= ids
    # ...and not entries used only by other stacks.
    assert "NAS6404U13D" not in ids


def test_element_carries_the_gaps_of_its_own_hardware_entry(pitch_link):
    element = next(e for e in pitch_link["elements"] if e["id"] == "bolt_grip_11")
    assert any("MIL-S-8879" in g for g in element["hardware_gaps"])


# --- the INCOMPLETE heuristic, stated honestly ----------------------------


def test_incomplete_is_detected_from_authored_prose_not_a_schema_field():
    assert bvp.is_incomplete({"label": "x -- INCOMPLETE: y"})
    assert bvp.is_incomplete({"label": "x", "guidance": "This check is INCOMPLETE."})
    # Lower case is NOT detected: check_result/v0 has no `complete` field, so the
    # flag rides on a prose convention. Documented in the session lesson.
    assert not bvp.is_incomplete({"label": "x -- incomplete: y"})

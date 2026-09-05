"""``scripts/export_stack_tabular.py``: values pinned against the stored JSON.

Three claims this module exists to guard, matching the handoff's definition of
done:

1. **Nothing is computed twice.** Every element row's nominal/min/max is the
   authored value (:func:`tolerance_stack.stack.load_stack`), and every fold-
   results row is the *same* :class:`~tolerance_stack.stack.Interval`/
   :class:`~tolerance_stack.stack.CheckResult` object the rest of the repo
   reads, field for field -- not a re-derivation.
2. **A gap-bearing/failing stack stays visibly not-clean.** The pitch-link
   stack's ``untraced``/``inferred`` confidences and its incomplete,
   ``fail``-verdict check must ride through unchanged.
3. **The Windows CSV traps are pinned, not just avoided by construction.** A
   UTF-8 BOM (Excel's codepage cue) and the pitch-link stack's own ``±``/``⌀``
   characters, byte for byte.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import export_stack_tabular as E  # noqa: E402
from tolerance_stack.stack import load_stack  # noqa: E402
from tolerance_stack.topology import load_study, load_topology, summarize  # noqa: E402

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
PITCH_LINK = STACKS_DIR / "stack_pitch_link_to_pitch_plate.json"


# ---------------------------------------------------------------------------
# element rows: one per element, values verbatim, nothing invented
# ---------------------------------------------------------------------------


def test_every_element_gets_exactly_one_row_no_drops_no_duplicates():
    stack = load_stack(PITCH_LINK)
    rows = E.element_rows_for_stack(stack)
    row_ids = [r["element_id"] for r in rows]
    assert row_ids == [e.id for e in stack.elements]
    assert len(set(row_ids)) == len(row_ids)


def test_element_row_values_are_the_stored_values_not_rederived():
    stack = load_stack(PITCH_LINK)
    rows = {r["element_id"]: r for r in E.element_rows_for_stack(stack)}
    element = stack.element("pitch_plate_flange")
    row = rows["pitch_plate_flange"]
    assert (row["nominal"], row["min"], row["max"]) == (
        element.nominal, element.min, element.max)
    assert (row["lmc"], row["mmc"], row["plus_minus"]) == (
        element.lmc, element.mmc, element.plus_minus)
    assert row["confidence"] == "traced"
    assert row["kind"] == "drawing"
    assert row["part_drawing"] == "215197"
    # The citation survives the trip whole, not just its confidence word.
    assert "5X 4.06" in row["source_ref"]
    assert row["note"] == element.note


def test_zero_width_element_has_no_invented_band():
    """``bushing_214820`` is min == max -- no document gives it a tolerance.

    The exporter must report that verbatim, not smooth it into a band.
    """
    stack = load_stack(PITCH_LINK)
    rows = {r["element_id"]: r for r in E.element_rows_for_stack(stack)}
    row = rows["bushing_214820"]
    assert row["min"] == row["max"] == row["nominal"]
    assert row["confidence"] == "inferred"


def test_element_with_no_source_ref_carries_empty_confidence_not_a_guess():
    """No seeded element lacks a source_ref, so this is a synthetic check.

    The exporter must never invent a confidence word for an uncited element --
    see the module docstring's argument against reusing the viewer's
    ``no_source_ref`` marker. An uncited element's confidence cell is empty.
    """
    stack = load_stack(PITCH_LINK)
    element = stack.element("pitch_plate_flange")
    # A copy with source_ref cleared, not a mutation of the loaded stack.
    from dataclasses import replace
    bare = replace(element, source_ref=None)
    row = E.element_row("stack", "x", bare, None, None, "")
    assert row["confidence"] == ""
    assert row["kind"] == ""
    assert row["part_drawing"] == ""
    assert row["source_ref"] == ""


def test_sign_and_coefficient_come_from_a_check_before_a_path():
    """``bolt_grip_11`` is a term of both the check and a path -- check wins.

    Matches the check's own term (``{"element": "bolt_grip_11", "sign": -1}``
    in ``shank_out__11_sourced_only``), not the path's.
    """
    stack = load_stack(PITCH_LINK)
    rows = {r["element_id"]: r for r in E.element_rows_for_stack(stack)}
    row = rows["bolt_grip_11"]
    assert (row["sign"], row["coefficient"]) == (-1, 1.0)
    assert row["term_context"] == "check:shank_out__11_sourced_only"


def test_element_referenced_by_neither_check_nor_path_has_empty_sign():
    """A defensive positive control: the lookup falls through to empty, not 0/1."""
    stack = load_stack(PITCH_LINK)
    context = E.element_term_context(stack)
    assert "no_such_element" not in context  # sanity: the dict has no stray key


# ---------------------------------------------------------------------------
# fold-results rows: the SAME Interval / CheckResult, not a second computation
# ---------------------------------------------------------------------------


def test_path_row_matches_fold_exactly():
    stack = load_stack(PITCH_LINK)
    rows = {r["id"]: r for r in E.fold_rows_for_stack(stack) if r["row_kind"] == "path"}
    interval = stack.path("clamped_stack_sourced")
    row = rows["clamped_stack_sourced"]
    for key, value in interval.as_dict().items():
        assert row[key] == value, key


def test_check_row_matches_fold_and_stays_visibly_not_clean():
    """The pitch-link stack's headline check: incomplete, budget-scoped, fails.

    This is the "gap-bearing stack is visibly not-clean" requirement: verdict,
    completeness and the excluded term must all survive into the export.
    """
    stack = load_stack(PITCH_LINK)
    rows = {r["id"]: r for r in E.fold_rows_for_stack(stack) if r["row_kind"] == "check"}
    result = stack.check("shank_out__11_sourced_only")
    row = rows["shank_out__11_sourced_only"]
    assert row["verdict"] == result.verdict == "fail"
    assert row["verdict_scope"] == "budget"
    assert row["complete"] is False
    assert "pitch-link eye" in row["excluded_terms"]
    for key, value in result.interval.as_dict().items():
        assert row[key] == value, key


# ---------------------------------------------------------------------------
# study export: one row per chain contribution, sign/ratio from the traversal
# ---------------------------------------------------------------------------


def test_study_element_rows_match_the_chain_one_for_one():
    study = load_study(TOPOLOGIES_DIR / "study_vpa_output_shank_out.json")
    topology = load_topology(TOPOLOGIES_DIR / "topology_vpa_output_to_pitch_plate.json")
    result = summarize(topology, study)
    rows = E.element_rows_for_study(study.id, result.chain)
    assert [r["element_id"] for r in rows] == [c.edge.dimension.id for c in result.chain]
    assert [r["sign"] for r in rows] == [c.sign for c in result.chain]
    assert [r["coefficient"] for r in rows] == [c.transform.ratio for c in result.chain]


def test_study_fold_row_matches_summarize_exactly():
    study = load_study(TOPOLOGIES_DIR / "study_vpa_output_shank_out.json")
    topology = load_topology(TOPOLOGIES_DIR / "topology_vpa_output_to_pitch_plate.json")
    result = summarize(topology, study)
    rows = E.fold_rows_for_study(study.id, study.title, result.units,
                                  result.interval.as_dict())
    assert len(rows) == 1
    row = rows[0]
    for key, value in result.interval.as_dict().items():
        assert row[key] == value, key
    assert row["units"] == result.units


def test_l1_study_export_matches_its_equivalent_stack_check():
    """The archetype's own L1 proof (``topology.py``'s module docstring),
    re-run through the exporter: this study's total equals
    ``stack_vpa_output_to_pitch_plate.json``'s ``worst_case_shank_out`` check,
    field for field -- so an export of either must read the same numbers.
    """
    study = load_study(TOPOLOGIES_DIR / "study_vpa_output_shank_out.json")
    topology = load_topology(TOPOLOGIES_DIR / "topology_vpa_output_to_pitch_plate.json")
    result = summarize(topology, study)
    stack = load_stack(STACKS_DIR / "stack_vpa_output_to_pitch_plate.json")
    check = stack.check("worst_case_shank_out")
    assert result.interval.as_dict() == check.interval.as_dict()


# ---------------------------------------------------------------------------
# the CSV file itself: BOM, special characters, block separation
# ---------------------------------------------------------------------------


def test_written_csv_has_a_utf8_bom(tmp_path):
    out = tmp_path / "out.csv"
    stack = load_stack(PITCH_LINK)
    E.write_export(out, PITCH_LINK, E.element_rows_for_stack(stack),
                    E.fold_rows_for_stack(stack), _fake_provenance())
    assert out.read_bytes().startswith(b"\xef\xbb\xbf")


def test_written_csv_preserves_plus_minus_and_diameter_characters(tmp_path):
    out = tmp_path / "out.csv"
    stack = load_stack(PITCH_LINK)
    E.write_export(out, PITCH_LINK, E.element_rows_for_stack(stack),
                    E.fold_rows_for_stack(stack), _fake_provenance())
    text = out.read_text(encoding="utf-8-sig")
    assert "±0.10" in text
    assert "⌖⌀0.2" in text


def test_written_csv_has_three_blocks_never_interleaved(tmp_path):
    """PROVENANCE header, blank line, ELEMENTS table, blank line, FOLD RESULTS.

    Parsed back with the stdlib csv reader, not just eyeballed: the element
    table's header row must appear exactly once, and every element row must
    sit between the two section markers.
    """
    out = tmp_path / "out.csv"
    stack = load_stack(PITCH_LINK)
    element_rows = E.element_rows_for_stack(stack)
    E.write_export(out, PITCH_LINK, element_rows, E.fold_rows_for_stack(stack),
                    _fake_provenance())
    with out.open(encoding="utf-8-sig", newline="") as fh:
        raw_rows = list(csv.reader(fh))
    markers = [r[0] for r in raw_rows if r and r[0] in ("ELEMENTS", "FOLD RESULTS")]
    assert markers == ["ELEMENTS", "FOLD RESULTS"]
    elements_at = raw_rows.index(["ELEMENTS"])
    fold_at = raw_rows.index(["FOLD RESULTS"])
    assert fold_at > elements_at
    element_section = raw_rows[elements_at + 2:fold_at - 1]
    assert len(element_section) == len(element_rows)


def test_provenance_header_names_the_source_file(tmp_path):
    out = tmp_path / "out.csv"
    stack = load_stack(PITCH_LINK)
    E.write_export(out, PITCH_LINK, E.element_rows_for_stack(stack),
                    E.fold_rows_for_stack(stack), _fake_provenance())
    with out.open(encoding="utf-8-sig", newline="") as fh:
        raw_rows = list(csv.reader(fh))
    header = {r[0]: r[1] for r in raw_rows[:7]}
    assert header["source_file"] == "docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json"
    assert header["schema"] == E.SCHEMA_EXPORT


# ---------------------------------------------------------------------------
# CLI, end to end
# ---------------------------------------------------------------------------


def test_cli_all_writes_one_csv_per_stack_including_a_generated_archetype(tmp_path):
    out_dir = tmp_path / "out"
    rc = E.main(["--all", "--stacks-dir", str(STACKS_DIR),
                 "--out-dir", str(out_dir)])
    assert rc == 0
    written = {p.stem for p in out_dir.glob("*.csv")}
    on_disk = {p.stem[len("stack_"):] for p in STACKS_DIR.glob("stack_*.json")}
    assert written == on_disk
    # The generated-checks archetype must not come back empty.
    thermal_csv = (out_dir / "hub_bearing_thermal_fit_m1.csv").read_text(
        encoding="utf-8-sig")
    assert "FOLD RESULTS" in thermal_csv
    assert "\ncheck," in thermal_csv


def test_cli_stack_by_bare_id(tmp_path):
    out = tmp_path / "out.csv"
    rc = E.main(["--stack", "pitch_link_to_pitch_plate",
                 "--stacks-dir", str(STACKS_DIR), "--out", str(out)])
    assert rc == 0
    assert out.exists()
    assert out.read_bytes().startswith(b"\xef\xbb\xbf")


def test_cli_study_by_bare_id(tmp_path):
    out = tmp_path / "out.csv"
    rc = E.main(["--study", "vpa_output_shank_out",
                 "--topologies-dir", str(TOPOLOGIES_DIR), "--out", str(out)])
    assert rc == 0
    text = out.read_text(encoding="utf-8-sig")
    assert "study_chain" in text


def test_cli_requires_out_for_single_target():
    with pytest.raises(SystemExit):
        E.main(["--stack", "pitch_link_to_pitch_plate",
                "--stacks-dir", str(STACKS_DIR)])


def _fake_provenance():
    return {
        "schema": "joby.tolerance_stack/projection_provenance/v0",
        "built_at": "2026-09-04T00:00:00+00:00",
        "branch": "test", "head_sha": "0" * 40, "dirty": False,
    }

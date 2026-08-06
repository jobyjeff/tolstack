"""Tests for the crop projection's **resolution rules** (``scripts/build_viewer_crops.py``).

Rendering needs PyMuPDF and a drawing PDF; the *rules* -- which citation pins a
document and which is honestly unresolvable -- need neither, and they are where
the damage would be. A rule that guesses an export renders a crop of the wrong
revision's geometry and looks perfectly fine on screen. So every branch of
:func:`build_viewer_crops.resolve_pdf` is exercised here under this repo's own
stdlib-only venv; ``fitz`` is imported lazily by the script for exactly this
reason.

Handoff: stack_viewer_v0 (2026-08-05).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_viewer_crops as bvc  # noqa: E402

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"


@pytest.fixture(scope="module")
def pitch_link_raw():
    return json.loads(
        (STACKS_DIR / "stack_pitch_link_to_pitch_plate.json").read_text(encoding="utf-8")
    )


@pytest.fixture(scope="module")
def tan_link_raw():
    return json.loads(
        (STACKS_DIR / "stack_tan_link_to_pitch_plate.json").read_text(encoding="utf-8")
    )


def element(raw, element_id):
    return next(e for e in raw["elements"] if e["id"] == element_id)


# --- sheet -> page --------------------------------------------------------


def test_a_workbook_sheet_name_is_not_a_page_number():
    with pytest.raises(bvc.Unresolvable, match="not a page number"):
        bvc.page_number({"sheet": "grip length tols old"})


def test_a_missing_sheet_is_unresolvable():
    with pytest.raises(bvc.Unresolvable, match="no sheet"):
        bvc.page_number({"sheet": None})


def test_an_integer_or_a_digit_string_is_a_page():
    assert bvc.page_number({"sheet": 4}) == 4
    assert bvc.page_number({"sheet": "4"}) == 4


# --- kinds that name no page ---------------------------------------------


@pytest.mark.parametrize(
    "kind, fragment",
    [
        ("workbook", "spreadsheet"),
        ("assumed", "no source document"),
        ("pipeline_element", "extracted pipeline element"),
    ],
)
def test_kinds_with_no_document_are_unresolvable(kind, fragment, tmp_path):
    with pytest.raises(bvc.Unresolvable, match=fragment):
        bvc.resolve_pdf({}, {"kind": kind, "document": "x"}, tmp_path, tmp_path, [])


def test_a_source_ref_with_no_document_is_unresolvable(tmp_path):
    with pytest.raises(bvc.Unresolvable, match="names no document"):
        bvc.resolve_pdf({}, {"kind": "drawing"}, tmp_path, tmp_path, [])


# --- the spec pile --------------------------------------------------------


def test_a_spec_citation_resolves_by_filename(tmp_path):
    specs = tmp_path / "specs"
    specs.mkdir()
    (specs / "NAS6403-NAS6420 Rev 4.pdf").write_bytes(b"%PDF-1.4\n")
    got = bvc.resolve_pdf(
        {}, {"kind": "spec", "document": "NAS6403-NAS6420 Rev 4.pdf"},
        specs, tmp_path, [],
    )
    assert got["resolved_by"] == "spec_pile"
    assert got["pdf"].name == "NAS6403-NAS6420 Rev 4.pdf"


def test_a_spec_not_in_the_pile_is_unresolvable(tmp_path):
    with pytest.raises(bvc.Unresolvable, match="not in data/inbox/specs"):
        bvc.resolve_pdf({}, {"kind": "spec", "document": "MS9363.pdf"},
                        tmp_path, tmp_path, [])


# --- provenance.sources_used, the one fallback ----------------------------


def test_sources_used_path_must_start_the_entry():
    entry = "C:/x/[PRELIM 2025-MAY-22] 215197 A.1.pdf -- sheet 2 SECTION A-A (read-only)"
    assert bvc.pdf_paths_in(entry) == "C:/x/[PRELIM 2025-MAY-22] 215197 A.1.pdf"
    # A prose mention of "the 2026-AUG-3 PDF" carries no path and must not match.
    assert bvc.pdf_paths_in("...balloons.json and the 2026-AUG-3 PDF (read-only)") is None


def test_sources_used_resolves_the_215197_fixture(tmp_path):
    pdf = tmp_path / "215197.pdf"
    pdf.write_bytes(b"%PDF-1.4\n")
    got = bvc.pdf_from_sources_used(
        [f"{pdf.as_posix()} -- sheet 2 SECTION A-A (read-only)"], "215197", []
    )
    assert got == pdf


def test_two_different_pdfs_for_one_document_is_ambiguous_not_a_coin_flip(tmp_path):
    a, b = tmp_path / "215197 a.pdf", tmp_path / "215197 b.pdf"
    for p in (a, b):
        p.write_bytes(b"%PDF-1.4\n")
    with pytest.raises(bvc.Unresolvable, match="ambiguous"):
        bvc.pdf_from_sources_used(
            [f"{a.as_posix()} -- one", f"{b.as_posix()} -- two"], "215197", []
        )


def test_a_relative_sources_used_path_is_tried_against_the_given_roots(tmp_path):
    (tmp_path / "data" / "inbox" / "specs").mkdir(parents=True)
    pdf = tmp_path / "data" / "inbox" / "specs" / "X.pdf"
    pdf.write_bytes(b"%PDF-1.4\n")
    got = bvc.pdf_from_sources_used(
        ["data/inbox/specs/X.pdf -- sheets 1, 2"], "X.pdf", [tmp_path]
    )
    assert got == pdf


def test_a_cited_pdf_that_is_not_on_disk_is_unresolvable(tmp_path):
    with pytest.raises(bvc.Unresolvable, match="not on disk"):
        bvc.pdf_from_sources_used(
            [f"{(tmp_path / 'gone.pdf').as_posix()} -- x"], "gone", []
        )


# --- the joint block is what pins an export -------------------------------


def test_a_stack_whose_joint_names_no_export_cannot_be_crop_resolved(tan_link_raw, tmp_path):
    """The finding this session exists to surface.

    Only ``pitch_link_to_pitch_plate`` fills ``joint.assembly_export``. Every
    drawing/parts-list citation in the three slice-1 stacks therefore resolves to
    nothing -- not because the drawing is missing, but because the citation never
    says *which export* it read. Stable element addresses are the cure.

    Cited element changed 2026-08-06 (handoff ``traced_labels_and_ratio``): this
    used to use ``fastener_grip_14``, which was re-cited from the 217755 parts
    list to ``NAS6403-NAS6420 Rev 4.pdf`` and now resolves down the *spec* branch
    instead. ``straight_bushing`` is the same shape of citation the test was
    always about -- a parts-list row on a stack with no export.
    """
    assert (tan_link_raw.get("joint") or {}).get("assembly_export") in (None, "")
    ref = element(tan_link_raw, "straight_bushing")["source_ref"]
    assert ref["kind"] == "parts_list"
    with pytest.raises(bvc.Unresolvable, match="citation names no export"):
        bvc.resolve_pdf(tan_link_raw, ref, tmp_path, tmp_path, [])


def test_the_pitch_link_joint_export_names_two_runs(pitch_link_raw):
    export = pitch_link_raw["joint"]["assembly_export"]
    assert bvc._RUN_ID_RE.findall(export) == ["20260804_114000", "20260803_145243"]


def test_a_run_directory_that_is_absent_is_named_in_the_reason(pitch_link_raw, tmp_path):
    (tmp_path / "data" / "runs").mkdir(parents=True)
    with pytest.raises(bvc.Unresolvable, match="no drawing-checker run directory"):
        bvc.resolve_pdf(
            pitch_link_raw, element(pitch_link_raw, "bushing_214820")["source_ref"],
            tmp_path, tmp_path, [],
        )


def test_a_pdf_whose_sha_does_not_match_the_run_is_refused(tmp_path):
    run = tmp_path / "data" / "runs" / "20260804_114000_x"
    run.mkdir(parents=True)
    (run / "run_meta.json").write_text(
        json.dumps({"inputs": [{"name": "d.pdf", "sha256": "0" * 64}]}), encoding="utf-8"
    )
    drawings = tmp_path / "data" / "inbox" / "drawings"
    drawings.mkdir(parents=True)
    (drawings / "d.pdf").write_bytes(b"not the export the stack cited")
    with pytest.raises(bvc.Unresolvable, match="does not match the sha256"):
        bvc.pdf_from_run(tmp_path, "20260804_114000")


def test_a_matching_sha_resolves_and_reports_it_verified(tmp_path):
    payload = b"%PDF-1.4\nthe real export\n"
    drawings = tmp_path / "data" / "inbox" / "drawings"
    drawings.mkdir(parents=True)
    (drawings / "d.pdf").write_bytes(payload)
    run = tmp_path / "data" / "runs" / "20260804_114000_x"
    run.mkdir(parents=True)
    (run / "run_meta.json").write_text(
        json.dumps({"inputs": [{"name": "d.pdf", "sha256": bvc.sha256_of(drawings / "d.pdf")}]}),
        encoding="utf-8",
    )
    pdf, run_dir, verified = bvc.pdf_from_run(tmp_path, "20260804_114000")
    assert pdf.name == "d.pdf" and run_dir.name == "20260804_114000_x" and verified


# --- zone geometry --------------------------------------------------------


def test_median_spacing_ignores_one_misread_tick():
    assert bvc.median_spacing([0, 100, 200, 300, 999]) == 100


def test_zone_cell_is_centred_on_the_printed_label():
    cols = {1: 300.0, 2: 200.0, 3: 100.0}   # numbered right-to-left, as 217755 is
    rows = {"A": 300.0, "B": 200.0, "C": 100.0}
    assert bvc.zone_cell(cols, rows, "B2") == (150.0, 150.0, 250.0, 250.0)


def test_an_unlabelled_or_malformed_zone_yields_no_cell():
    cols, rows = {1: 10.0, 2: 20.0}, {"A": 10.0, "B": 20.0}
    assert bvc.zone_cell(cols, rows, "Z9") is None      # letter not on the sheet
    assert bvc.zone_cell(cols, rows, "B99") is None     # number not on the sheet
    assert bvc.zone_cell(cols, rows, "") is None
    assert bvc.zone_cell({}, rows, "B2") is None        # grid unreadable


def test_zone_cell_tolerates_case_and_spacing():
    cols, rows = {3: 100.0, 4: 200.0}, {"H": 50.0, "I": 150.0}
    assert bvc.zone_cell(cols, rows, " h3 ") == bvc.zone_cell(cols, rows, "H3")


# --- needles --------------------------------------------------------------


def test_needles_come_from_the_callout_not_the_view_name(pitch_link_raw):
    ref = element(pitch_link_raw, "pitch_plate_flange")["source_ref"]
    needles = bvc.callout_needles(ref, None)
    assert "4.06" in needles
    # "SECTION A-A" is where the caption is, not where the dimension is.
    assert "SECTION A-A" not in needles


def test_the_part_number_is_a_needle_when_the_element_names_hardware(pitch_link_raw):
    ref = element(pitch_link_raw, "bushing_214820")["source_ref"]
    assert "214820-002" in bvc.callout_needles(ref, "214820-002")


def test_needles_are_longest_first_and_deduped():
    needles = bvc.callout_needles({"callout": "5X 4.06 4.06"}, "4.06")
    assert needles == sorted(set(needles), key=len, reverse=True)
    assert len(needles) == len(set(needles))


def test_center_in_is_the_cell_membership_test():
    assert bvc.center_in((0, 0, 10, 10), (4, 4, 6, 6))
    assert not bvc.center_in((0, 0, 10, 10), (20, 20, 22, 22))

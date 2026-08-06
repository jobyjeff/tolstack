"""Tests for the crop projection's **resolution rules** (``scripts/build_viewer_crops.py``).

Rendering needs PyMuPDF and a drawing PDF; the *rules* -- which citation pins a
document and which is honestly unresolvable -- need neither, and they are where
the damage would be. A rule that guesses an export renders a crop of the wrong
revision's geometry and looks perfectly fine on screen. So every branch of
:func:`build_viewer_crops.resolve_pdf` is exercised here under this repo's own
stdlib-only venv; ``fitz`` is imported lazily by the script for exactly this
reason.

Handoff: stack_viewer_v0 (2026-08-05); the ``source_ref.export`` rules and the
removal of the ``provenance.sources_used`` prose fallback are
citation_export_provenance (2026-08-06).
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


# --- source_ref.export: the structured per-citation export -----------------
#
# Rule 1, and the reason this module was rewritten on 2026-08-06. The sha256 is
# the export's identity: a filename gets re-exported over, and a printed zone is
# not stable between exports of the same revision, so cropping a same-named file
# without checking its bytes renders the wrong revision's geometry and looks
# perfectly correct on screen.


def established(on_disk: Path, **over) -> dict:
    """An established export of the file at ``on_disk`` -- override ``pdf`` to
    cite it by some other path (repo-relative, or absolute on another machine)."""
    export = {"status": "established", "pdf": on_disk.as_posix(),
              "sha256": bvc.sha256_of(on_disk), "runs": []}
    export.update(over)
    return export


def write_pdf(path: Path, payload: bytes = b"%PDF-1.4\nthe real export\n") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return path


def test_an_established_export_resolves_and_is_always_sha_verified(tmp_path):
    pdf = write_pdf(tmp_path / "d.pdf")
    got = bvc.resolve_pdf(
        {}, {"kind": "drawing", "document": "215197", "export": established(pdf)},
        tmp_path, tmp_path, [tmp_path],
    )
    assert got["resolved_by"] == "source_ref_export"
    assert got["pdf"] == pdf
    # Not "None because nobody checked" -- this rule cannot resolve without checking.
    assert got["sha256_verified"] is True


def test_an_export_whose_sha_does_not_match_the_file_is_refused(tmp_path):
    pdf = write_pdf(tmp_path / "d.pdf")
    export = established(pdf, sha256="0" * 64)
    with pytest.raises(bvc.Unresolvable, match="not the export this citation was read from"):
        bvc.resolve_pdf({"joint": {"assembly_drawing": "215197",
                                   "assembly_export": "run 20260804_114000"}},
                        {"kind": "drawing", "document": "215197", "export": export},
                        tmp_path, tmp_path, [tmp_path])


def test_an_export_with_no_sha_is_refused_because_a_filename_is_not_an_export(tmp_path):
    pdf = write_pdf(tmp_path / "d.pdf")
    for bad in (None, "", "deadbeef", "z" * 64):
        export = established(pdf, sha256=bad)
        with pytest.raises(bvc.Unresolvable, match="no usable sha256"):
            bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                            tmp_path, tmp_path, [tmp_path])


def test_an_unestablished_export_is_unresolvable_and_reports_why(tmp_path):
    """The honest answer, and it must not be routed around.

    A citation that says its export cannot be established is a *statement*. Any
    weaker rule that then resolved it would contradict the stack file, so this
    short-circuits -- note the joint block here would otherwise have matched.
    """
    export = {"status": "unestablished", "pdf": None, "sha256": None, "runs": [],
              "why": "three candidate exports, nothing records which was read"}
    with pytest.raises(bvc.Unresolvable, match="unestablished: three candidate exports"):
        bvc.resolve_pdf(
            {"joint": {"assembly_drawing": "217755", "assembly_export": "run 20260804_114000"}},
            {"kind": "drawing", "document": "217755", "export": export},
            tmp_path, tmp_path, [tmp_path],
        )


def test_an_unestablished_export_that_names_a_pdf_is_a_self_contradiction(tmp_path):
    """The guard the handoff asked for: no unestablished export is ever cropped.

    ``SourceExport.__post_init__`` refuses to construct this, but the crop script
    reads raw JSON and never the dataclass, so it re-checks rather than trusting
    that something upstream did.
    """
    pdf = write_pdf(tmp_path / "d.pdf")
    export = {"status": "unestablished", "pdf": pdf.as_posix(),
              "sha256": bvc.sha256_of(pdf), "runs": [], "why": "..."}
    with pytest.raises(bvc.Unresolvable, match="contradicts itself"):
        bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                        tmp_path, tmp_path, [tmp_path])


def test_an_unknown_export_status_is_unresolvable_not_best_effort(tmp_path):
    pdf = write_pdf(tmp_path / "d.pdf")
    export = established(pdf, status="probably")
    with pytest.raises(bvc.Unresolvable, match="not one of established/unestablished"):
        bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                        tmp_path, tmp_path, [tmp_path])


def test_a_repo_relative_export_path_resolves_against_the_main_checkout(tmp_path):
    pdf = write_pdf(tmp_path / "data" / "inbox" / "drawings" / "212966-006-A.pdf")
    export = established(pdf, pdf="data/inbox/drawings/212966-006-A.pdf")
    got = bvc.resolve_pdf({}, {"kind": "drawing", "document": "212966-006", "export": export},
                          tmp_path, tmp_path, [tmp_path])
    assert got["pdf"] == pdf


def test_a_repo_relative_export_path_ignores_the_process_cwd(tmp_path, monkeypatch):
    """The given roots decide, never wherever the script was invoked from.

    Regression, `review/citation_export_provenance` 2026-08-06: `export_pdf_path`
    tried the bare relative path first, so running from the MAIN checkout (where
    `data/inbox/drawings/212966-006-A.pdf` really exists) found that file instead
    of the one the roots name -- and the sha check then reported "the file on disk
    is not the export this citation was read from", a provenance alarm for what
    was a cwd accident. The test above was green in a worktree, whose `data/` is
    gitignored and empty, and red in the main checkout. Here both files exist and
    differ, so only the roots can produce the right one.
    """
    cwd = tmp_path / "cwd"
    decoy = write_pdf(cwd / "data" / "inbox" / "drawings" / "d.pdf", b"%PDF-1.4\nthe decoy\n")
    real = write_pdf(tmp_path / "main" / "data" / "inbox" / "drawings" / "d.pdf")
    assert bvc.sha256_of(decoy) != bvc.sha256_of(real)
    monkeypatch.chdir(cwd)
    export = established(real, pdf="data/inbox/drawings/d.pdf")
    got = bvc.resolve_pdf({}, {"kind": "drawing", "document": "d", "export": export},
                          tmp_path, tmp_path, [tmp_path / "main"])
    assert got["pdf"] == real and got["sha256_verified"] is True


def test_an_absolute_drawing_checker_path_is_rerooted_at_the_given_dc_root(tmp_path):
    """So a stack file still reads on a machine that keeps drawing-checker elsewhere."""
    dc_root = tmp_path / "elsewhere" / "drawing-checker"
    pdf = write_pdf(dc_root / "data" / "inbox" / "drawings" / "d.pdf")
    export = established(
        pdf, pdf="C:/workspace/drawing-checker/data/inbox/drawings/d.pdf")
    got = bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                          tmp_path, dc_root, [tmp_path])
    assert got["pdf"] == pdf


def test_an_export_naming_a_file_that_is_not_on_disk_is_unresolvable(tmp_path):
    export = {"status": "established", "pdf": "data/inbox/drawings/gone.pdf",
              "sha256": "a" * 64, "runs": []}
    with pytest.raises(bvc.Unresolvable, match="not on disk"):
        bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                        tmp_path, tmp_path, [tmp_path])


def test_the_first_named_run_is_reported_but_is_not_what_resolved_the_crop(tmp_path):
    """``runs`` is corroboration and a pointer to extracted JSON, never identity.

    One export legitimately feeds several runs and some feed none at all (no
    drawing-checker run has ever consumed the five hub-bearing part drawings), so
    an absent run directory cannot make an export unresolvable.
    """
    pdf = write_pdf(tmp_path / "d.pdf")
    export = established(pdf, runs=["20260723_163810", "20260727_153847"])
    got = bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                          tmp_path, tmp_path, [tmp_path])
    assert got["run_id"] == "20260723_163810" and got["run_dir"] is None
    assert got["sha256_verified"] is True


# --- there is no prose fallback any more -----------------------------------


def test_the_provenance_sources_used_prose_scan_is_gone():
    """Removed 2026-08-06, deliberately.

    It resolved exactly one crop, could not sha-verify it, and landed on a copy
    of 215197 under drawing-checker's ``tests/fixtures/`` rather than the export
    the stack meant. A resolved count that rises because a rule got looser is a
    regression; this test exists so the rule cannot quietly come back.
    """
    assert not hasattr(bvc, "pdf_from_sources_used")
    assert not hasattr(bvc, "pdf_paths_in")


def test_a_citation_naming_no_export_at_all_is_unresolvable(tmp_path):
    """Even when ``provenance.sources_used`` spells the PDF out in full."""
    pdf = write_pdf(tmp_path / "215197.pdf")
    raw = {"provenance": {"sources_used": [f"{pdf.as_posix()} -- sheet 2 SECTION A-A"]}}
    with pytest.raises(bvc.Unresolvable, match="citation names no export"):
        bvc.resolve_pdf(raw, {"kind": "drawing", "document": "215197", "sheet": 2},
                        tmp_path, tmp_path, [tmp_path])


# --- the legacy joint block, kept so a pre-2026-08-06 stack still resolves --


def test_the_pitch_link_joint_export_names_two_runs(pitch_link_raw):
    export = pitch_link_raw["joint"]["assembly_export"]
    assert bvc._RUN_ID_RE.findall(export) == ["20260804_114000", "20260803_145243"]


def test_a_run_directory_that_is_absent_is_named_in_the_reason(tmp_path):
    (tmp_path / "data" / "runs").mkdir(parents=True)
    raw = {"joint": {"assembly_drawing": "217755",
                     "assembly_export": "x.pdf (drawing-checker run 20260804_114000)"}}
    with pytest.raises(bvc.Unresolvable, match="no drawing-checker run directory"):
        bvc.resolve_pdf(raw, {"kind": "parts_list", "document": "217755"},
                        tmp_path, tmp_path, [])


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


# --- the summary: which rule, and was the sha checked ----------------------


def test_the_summary_breaks_the_resolved_count_down_by_rule_and_by_sha():
    """"6 of 48 resolve" got read as six trustworthy crops when two were verified.

    Both facts already sat in every entry and both were easy to skip past, so
    they are rolled up here: a rise in the resolved count has to be attributable
    to a rule, and an unverified crop is countable rather than merely inferable.
    """
    summary = bvc.resolution_summary(
        [
            {"resolved_by": "source_ref_export", "sha256_verified": True},
            {"resolved_by": "source_ref_export", "sha256_verified": True},
            {"resolved_by": "spec_pile", "sha256_verified": None},
            {"resolved_by": "joint_export_run", "sha256_verified": False},
        ],
        [{"reason": "citation names no export"}],
    )
    assert summary["citations"] == 5
    assert summary["resolved"] == 4 and summary["unresolvable"] == 1
    assert summary["by_resolved_by"] == {
        "joint_export_run": 1, "source_ref_export": 2, "spec_pile": 1}
    assert summary["sha256_verified"] == {"true": 2, "false": 1, "unverified": 1}


def test_the_viewers_two_summary_keys_survive_the_breakdown():
    """``apps/viewer/viewer.js`` reads ``summary.resolved``/``.unresolvable``.

    That app is another handoff's; the new keys are additions, not a rename.
    """
    summary = bvc.resolution_summary([], [])
    assert summary["resolved"] == 0 and summary["unresolvable"] == 0


def test_a_sha_mismatch_is_shouted_in_the_printed_report():
    lines = bvc.summary_lines(bvc.resolution_summary(
        [{"resolved_by": "source_ref_export", "sha256_verified": False}], []))
    assert any("MISMATCHED" in line for line in lines)
    assert any("1  source_ref_export" in line for line in lines)

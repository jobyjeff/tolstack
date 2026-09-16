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
import types
from pathlib import Path
from typing import NamedTuple

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_viewer_crops as bvc  # noqa: E402

from tolerance_stack import spec_crop_regions as scr  # noqa: E402

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
    export = established(pdf, runs=[
        {"run_id": "20260723_163810", "ts": "2026-07-23T16:38:10+00:00"},
        {"run_id": "20260727_153847", "ts": "2026-07-27T15:38:47+00:00"},
    ])
    got = bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                          tmp_path, tmp_path, [tmp_path])
    assert got["run_id"] == "20260723_163810" and got["run_dir"] is None
    assert got["sha256_verified"] is True


def test_a_run_named_without_its_ts_is_unresolvable_rather_than_cropped(tmp_path):
    """The pre-2026-08-07 shape, refused here as well as in ``ExportRun``.

    This script re-checks rather than trusting the dataclass (it reads raw JSON),
    and the reason to refuse rather than shrug is that a bare run id is exactly
    the state the read-only invariant could not be checked from: the citation
    names a run and says nothing about *when* it happened, so a reviewer cannot
    tell a run Jeff produced from one the citing session produced.
    """
    pdf = write_pdf(tmp_path / "d.pdf")
    export = established(pdf, runs=["20260723_163810"])
    with pytest.raises(bvc.Unresolvable, match="does not say when the run happened"):
        bvc.resolve_pdf({}, {"kind": "drawing", "document": "x", "export": export},
                        tmp_path, tmp_path, [tmp_path])


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


# --- the topology scan: a separate space -----------------------------------
#
# Handoff inline_edge_crops (2026-09-08). A topology's inline edges get their
# own by_topology/unresolved_topology/summary_topology, kept apart from
# by_stack/unresolved/summary because a topology's own id can equal a stack's
# (`vpa_output_to_pitch_plate` names both today) -- merging the spaces would
# let an edge id collide with that stack's own element ids.


def test_the_topology_scan_does_not_touch_the_stack_summary():
    """`build_index` folds the topology census in beside the stack one, never
    into it -- passing (or not passing) the three topology arguments must
    leave by_stack/unresolved/summary exactly as the caller built them."""
    stamp = {"schema": "x", "built_at": "t", "built_by": "b"}
    by_stack = {"s": {"e": {"status": "resolved"}}}
    unresolved = [{"stack": "s", "element": "e2", "reason": "nope"}]
    summary = bvc.resolution_summary(
        [{"resolved_by": "spec_pile", "sha256_verified": None}], [])

    bare = bvc.build_index(stamp, Path("dc"), True, summary, by_stack, unresolved)
    with_topology = bvc.build_index(
        stamp, Path("dc"), True, summary, by_stack, unresolved,
        by_topology={"t": {"e3": {"status": "resolved"}}},
        unresolved_topology=[{"topology": "t", "edge": "e4", "reason": "nope"}],
        summary_topology=bvc.resolution_summary(
            [{"resolved_by": "source_ref_export", "sha256_verified": True}], []),
    )
    for key in ("by_stack", "unresolved", "summary"):
        assert bare[key] == with_topology[key] == locals()[key]
    # And a caller that names no topology census gets an empty one back, not
    # an absent key -- so a reader can iterate `by_topology` unconditionally.
    assert bare["by_topology"] == {} and bare["unresolved_topology"] == []
    assert bare["summary_topology"]["citations"] == 0
    assert with_topology["by_topology"] == {"t": {"e3": {"status": "resolved"}}}
    assert with_topology["summary_topology"]["citations"] == 1


def test_an_empty_raw_still_resolves_rule_1_the_way_a_topology_document_would(tmp_path):
    """``crop_topology_edge`` always calls :func:`bvc.resolve_pdf` with ``raw={}``,
    because a topology document carries no ``joint`` block for rule 3 to read.
    Rule 1 (``source_ref.export``) reads only the citation itself, so an empty
    ``raw`` must resolve exactly as it would for a stack element."""
    pdf = tmp_path / "d.pdf"
    pdf.write_bytes(b"%PDF-1.4\nthe real export\n")
    export = {"status": "established", "pdf": pdf.as_posix(),
              "sha256": bvc.sha256_of(pdf), "runs": []}
    got = bvc.resolve_pdf(
        {}, {"kind": "drawing", "document": "212966-006-A", "export": export},
        tmp_path, tmp_path, [tmp_path],
    )
    assert got["resolved_by"] == "source_ref_export" and got["sha256_verified"] is True


# --- declared crop regions (handoff spec_crop_region_registry, 2026-09-14) ---
#
# The placement half of the same discipline: a spec-pile citation names a
# document and a sheet and nothing finer, so its crop was the whole photocopy.
# The registry says which rect the cited row is -- and a citation with no region
# must keep the whole sheet it would have had anyway, because a rect nobody
# recorded is a rect nobody looked at. The matching rules themselves live in
# tests/test_spec_crop_regions.py; these are the crop script's use of them.


class FakeRect(NamedTuple):
    """``page.rect``: read by name in the zone-grid scan and by position when the
    whole sheet becomes the crop, so it has to be both."""

    x0: float
    y0: float
    x1: float
    y1: float


class FakePage:
    """The little of a ``fitz.Page`` that :func:`bvc.locate` touches.

    Rendering needs PyMuPDF; deciding *where* the crop goes does not, and that is
    where a wrong rect would be -- the same split the rest of this module runs on.
    """

    def __init__(self, text="", words=(), hits=None):
        self.rect = FakeRect(0.0, 0.0, 610.56, 842.4)
        self._text = text
        self._words = list(words)
        self._hits = hits or {}

    def get_text(self, kind):
        return self._words if kind == "words" else self._text

    def search_for(self, needle):
        return self._hits.get(needle, [])

    def get_pixmap(self, matrix=None, clip=None):
        # The renderer's own scaling, applied to the clip it was handed -- so a
        # crop entry's width/height say which rect was rendered.
        zoom = (matrix or (1.0, 1.0))[0]
        return FakePixmap(int(clip.width * zoom), int(clip.height * zoom))


def a_region(label="Grip Dash No. 13 row", match=("Grip Dash No. 13",)):
    return scr.CropRegion(
        document="NAS6403-NAS6420 Rev 4.pdf", page=3, label=label,
        rect=(84.5, 196.25, 191.6, 204.25), match=match,
        shows="the dash-13 row of sheet 3's grip/length table",
        recorded="2026-09-14", recorded_by="a test",
    )


def test_a_declared_region_is_where_the_crop_goes():
    registry = scr.CropRegionRegistry(regions=(a_region(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3,
                         "row 'Grip Dash No. 13'")
    placement = bvc.locate(FakePage(), {"zone": None}, "NAS6403U13H", 1.0, 200.0,
                           answer)
    assert placement["located_by"] == "declared_region"
    assert placement["rect"] == (84.5, 196.25, 191.6, 204.25)
    assert placement["region_label"] == "Grip Dash No. 13 row"
    assert placement["region_match"] == "Grip Dash No. 13"


def test_a_citation_with_no_region_keeps_the_whole_sheet_and_says_why():
    answer = scr.resolve(scr.CropRegionRegistry(), "NAS6403-NAS6420 Rev 4.pdf", 3, "")
    placement = bvc.locate(FakePage(), {"zone": None}, None, 1.0, 200.0, answer)
    assert placement["located_by"] == "sheet_full"
    assert placement["rect"] == (0.0, 0.0, 610.56, 842.4)
    # The note carries the region's own reason too: "no text layer" alone never
    # tells a reader that recording a region is the thing that fixes this.
    assert "no crop region is declared" in placement["note"]


def test_a_cited_zone_still_beats_a_declared_region():
    """A zone is what this citation said about itself; a region is declared for
    the document. The more specific statement wins, and no existing zone crop
    may move because a region was recorded on that document's sheet."""
    words = [(x, 5.0, x + 6.0, 12.0, str(n), 0, 0, 0)
             for n, x in ((1, 100.0), (2, 200.0), (3, 300.0))]
    words += [(5.0, y, 12.0, y + 6.0, letter, 0, 0, 0)
              for letter, y in (("A", 100.0), ("B", 200.0), ("C", 300.0))]
    page = FakePage(text="a sheet with a grid", words=words)
    registry = scr.CropRegionRegistry(regions=(a_region(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3,
                         "row 'Grip Dash No. 13'")
    placement = bvc.locate(page, {"zone": "B2"}, None, 0.0, 200.0, answer)
    assert placement["located_by"] == "zone_cell"
    assert placement["region_label"] is None


def test_a_declared_region_beats_a_unique_callout_match():
    """A rect somebody looked at beats a needle that happened to match once."""
    page = FakePage(text="a sheet with a text layer",
                    hits={"NAS6403U13H": [(10.0, 10.0, 60.0, 20.0)]})
    registry = scr.CropRegionRegistry(regions=(a_region(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3,
                         "row 'Grip Dash No. 13'")
    placement = bvc.locate(page, {"zone": None}, "NAS6403U13H", 1.0, 200.0, answer)
    assert placement["located_by"] == "declared_region"


def test_every_placement_carries_the_region_keys():
    """One shape per crop entry: "no region" and "built before regions existed"
    must not look the same to a consumer."""
    page = FakePage(text="a sheet", hits={"NAS6403U13H": [(1.0, 1.0, 2.0, 2.0)]})
    for placement in (
        bvc.locate(page, {"zone": None}, "NAS6403U13H", 1.0, 200.0, None),
        bvc.locate(FakePage(), {"zone": None}, None, 1.0, 200.0, None),
    ):
        assert placement["region_label"] is None
        assert placement["region_match"] is None


# --- which citations the registry may touch --------------------------------


def test_only_a_document_in_the_pile_gets_a_region(tmp_path):
    """The registry is a fact about the BYTES in data/inbox/specs/, so it applies
    whichever rule named them -- but never to a drawing export, which has zones
    and a text layer and its own two placement rules."""
    specs = tmp_path / "inbox" / "specs"
    specs.mkdir(parents=True)
    pile_doc = specs / "NAS6403-NAS6420 Rev 4.pdf"
    pile_doc.write_bytes(b"%PDF")
    drawing = tmp_path / "inbox" / "drawings" / "217755.pdf"
    drawing.parent.mkdir(parents=True)
    drawing.write_bytes(b"%PDF")
    registry = scr.CropRegionRegistry(regions=(a_region(),))
    ref = {"cell": "row 'Grip Dash No. 13'"}

    answer = bvc.region_for(registry, pile_doc, specs, 3, ref, None)
    assert answer is not None and answer.region is not None
    # A drawing gets None -- not a resolution that found nothing, which is the
    # state that would have put "no region declared" in every drawing's note.
    assert bvc.region_for(registry, drawing, specs, 3, ref, None) is None


def test_no_registry_at_all_means_no_region_anywhere(tmp_path):
    specs = tmp_path / "inbox" / "specs"
    specs.mkdir(parents=True)
    pile_doc = specs / "NAS6403-NAS6420 Rev 4.pdf"
    pile_doc.write_bytes(b"%PDF")
    assert bvc.region_for(None, pile_doc, specs, 3, {}, None) is None


# --- the WIRING: does the builder actually consult the registry? ------------
#
# Everything above enters at `bvc.locate` or `bvc.region_for`, which leaves the
# join between them untested: `region = None` in `_crop_from_citation` reverts
# the whole deliverable -- spec-pile citations back to whole photocopied sheets
# -- with every tier green. `registry` is threaded by hand as a trailing
# positional through main() -> crop_element/crop_topology_edge ->
# _crop_from_citation -> region_for -> locate, and a refactor that drops the
# thread, or transposes region_for's `pdf`/`specs_dir` (which fails the pile
# check and returns None, silently), would say nothing. Found in
# review/spec_crop_region_registry, B1. These two tests are the seam that goes
# red for all of it.
#
# `fitz` is imported lazily and at function scope (the module docstring says
# why), so a stand-in in sys.modules drives the real entry points -- rendering
# and all -- under this repo's own stdlib-only venv.


class FakePixmap:
    def __init__(self, width, height):
        self.width, self.height = width, height

    def save(self, path):
        Path(path).write_bytes(b"not a PNG, and nothing here reads one")


class FakeClip:
    """What ``fitz.Rect(*rect) & page.rect`` returns: only width/height are read."""

    def __init__(self, *values):
        self.values = tuple(float(v) for v in values)

    def __and__(self, _other):
        return self

    @property
    def width(self):
        return self.values[2] - self.values[0]

    @property
    def height(self):
        return self.values[3] - self.values[1]


class FakeDoc:
    def __init__(self, page, page_count=4):
        self._page = page
        self.page_count = page_count

    def __getitem__(self, index):
        return self._page


@pytest.fixture()
def fake_fitz(monkeypatch):
    """Install a ``fitz`` stand-in and hand back the page every open() returns."""
    page = FakePage(text="a photocopy with no text layer")
    module = types.SimpleNamespace(
        open=lambda _path: FakeDoc(page),
        Rect=FakeClip,
        Matrix=lambda zx, zy: (zx, zy),
    )
    monkeypatch.setitem(sys.modules, "fitz", module)
    return page


def crop_args():
    return types.SimpleNamespace(zone_pad=1.0, text_pad=200.0, zoom=3.0, max_px=2400)


@pytest.fixture()
def pile(tmp_path):
    """A spec pile holding the document the shipped registry declares regions on."""
    specs = tmp_path / "inbox" / "specs"
    specs.mkdir(parents=True)
    (specs / "NAS6403-NAS6420 Rev 4.pdf").write_bytes(b"%PDF-1.4 a photocopy")
    return specs


PILE_CITATION = {
    "kind": "spec",
    "document": "NAS6403-NAS6420 Rev 4.pdf",
    "sheet": 3,
    "zone": None,
    "cell": "row 'Grip Dash No. 13', column 'NAS6403 .1900-32'",
}


def test_crop_element_crops_a_pile_citation_to_its_declared_region(
        tmp_path, pile, fake_fitz):
    entry = bvc.crop_element(
        {"id": "a_stack"},
        {"id": "fastener_grip_13", "hardware_ref": "NAS6403U13H",
         "source_ref": dict(PILE_CITATION)},
        pile, tmp_path / "dc", [tmp_path], tmp_path / "crops", {}, crop_args(),
        scr.CropRegionRegistry(regions=(a_region(),)),
    )
    assert entry["status"] == "resolved"
    assert entry["resolved_by"] == "spec_pile", "the document rule is unchanged"
    assert entry["located_by"] == "declared_region"
    assert entry["region_label"] == "Grip Dash No. 13 row"
    assert entry["region_match"] == "Grip Dash No. 13"
    assert entry["rect_pt"] == [84.5, 196.25, 191.6, 204.25]
    # And the PNG is the region, not the sheet: a whole-sheet crop of this
    # document is 610 x 842 points.
    assert (entry["width"], entry["height"]) == (321, 24)


def test_the_same_citation_without_a_registry_gets_the_whole_sheet(
        tmp_path, pile, fake_fitz):
    """The before picture, through the same entry point -- so the test above is
    measuring the registry and not something the builder did anyway."""
    entry = bvc.crop_element(
        {"id": "a_stack"},
        {"id": "fastener_grip_13", "hardware_ref": "NAS6403U13H",
         "source_ref": dict(PILE_CITATION)},
        pile, tmp_path / "dc", [tmp_path], tmp_path / "crops", {}, crop_args(),
        scr.CropRegionRegistry(),
    )
    assert entry["located_by"] == "sheet_full"
    assert entry["region_label"] is None
    assert entry["rect_pt"] == [0.0, 0.0, 610.56, 842.4]


def test_crop_topology_edge_consults_the_registry_too(tmp_path, pile, fake_fitz):
    """The second thread through the same join: an inline topology edge citing a
    pile document is the same citation shape and gets the same region."""
    entry = bvc.crop_topology_edge(
        "a_topology", "an_edge",
        {"hardware_ref": "NAS6403U13H", "source_ref": dict(PILE_CITATION)},
        pile, tmp_path / "dc", [tmp_path], tmp_path / "crops", {}, crop_args(),
        scr.CropRegionRegistry(regions=(a_region(),)),
    )
    assert entry["located_by"] == "declared_region"
    assert entry["region_label"] == "Grip Dash No. 13 row"


def test_a_drawing_citation_is_untouched_by_the_registry(tmp_path, pile, fake_fitz):
    """A region is a fact about bytes in the pile. An export-resolved drawing
    living anywhere else keeps the placement rules it always had -- including
    when the registry happens to declare a region on the sheet it cites."""
    drawing = tmp_path / "inbox" / "drawings" / "217755.pdf"
    drawing.parent.mkdir(parents=True)
    drawing.write_bytes(b"%PDF-1.4 a drawing export")
    entry = bvc.crop_element(
        {"id": "a_stack"},
        {"id": "a_flange", "hardware_ref": None,
         "source_ref": {
             "kind": "drawing", "document": "217755", "sheet": 3, "zone": None,
             "cell": "row 'Grip Dash No. 13'",
             "export": {"status": "established", "pdf": drawing.as_posix(),
                        "sha256": bvc.sha256_of(drawing), "runs": []},
         }},
        pile, tmp_path / "dc", [tmp_path], tmp_path / "crops", {}, crop_args(),
        scr.CropRegionRegistry(regions=(a_region(),)),
    )
    assert entry["status"] == "resolved"
    assert entry["located_by"] == "sheet_full"
    assert entry["region_label"] is None


# --- the three live cases, pinned value for value --------------------------
#
# Handoff ``viewer_reference_crops_in_context`` (2026-09-15), from Jeff's review
# of the pitch-link topology. Three crops were wrong in three different ways and
# the fix for each is a RECT, so each is pinned as a rect here rather than as a
# shape:
#
#   * the bolt grip -- a 322x20px strip of one table row, "just four numbers
#     with no context for what they mean": now the sheet's declared page CONTEXT
#     (headers, figure, closing note) with the row as a highlight box;
#   * the bushing -- the zone of the DETAIL B *caption*, with the balloon the
#     citation is about off the top edge: now framed on the balloon itself;
#   * the pitch-plate lug -- "just shows dimensions floating in space, the part
#     itself is cropped out of the view": now widened along the callout's leader
#     to the feature it dimensions.
#
# The geometry comes from tracked fixtures in ``tests/fixtures/viewer_crops/``,
# recorded off the real export and the real drawing-checker run. It is copied
# rather than read live for one reason: ``data/`` and drawing-checker's
# ``data/runs/`` are BOTH gitignored, so a test that opened them would be green
# in the main checkout and red in every worktree -- which trains people to
# ignore red suites (the same reasoning ``test_viewer_js_suite.py`` gives for
# skipping rather than failing). Each fixture records where it came from.

FIXTURES = REPO_ROOT / "tests" / "fixtures" / "viewer_crops"


def load_fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def plate_fixture():
    return load_fixture("plate_flange_zone_d10.json")


@pytest.fixture(scope="module")
def balloon_fixture():
    return load_fixture("detail_b_balloons.json")


class RecordedPage(FakePage):
    """A :class:`FakePage` whose hits, vector paths and grid come off a fixture.

    The one thing it adds over ``FakePage`` is ``get_drawings``: the attachment
    walk (:func:`bvc.attachment_rect`) is the only placement rule that reads a
    page's vector content, and it is the rule the pitch-plate case turns on.
    """

    def __init__(self, page_rect, hits=None, paths=(), words=(), text=""):
        super().__init__(text=text, words=words, hits=hits)
        self.rect = FakeRect(*page_rect)
        self._paths = [tuple(p) for p in paths]

    def get_drawings(self):
        return [{"rect": rect} for rect in self._paths]


# --- case 3: the dimension crop that has to contain the geometry ------------


def test_the_attachment_walk_follows_the_callouts_leader_to_the_feature(plate_fixture):
    """The pitch-plate lug, value for value off the real sheet.

    ``expected_attachment_rect`` was recorded from the live page, so this is the
    number the builder writes today and not a near miss: the walk reaches the
    leader, then the edge its arrowhead lands on, then stops.
    """
    page = RecordedPage(
        plate_fixture["page_rect"],
        paths=plate_fixture["paths_reached"] + plate_fixture["paths_not_reached"],
    )
    got = bvc.attachment_rect(page, plate_fixture["callout_hit"])
    assert got is not None
    assert [round(v, 4) for v in got] == plate_fixture["expected_attachment_rect"]


def test_the_widened_zone_crop_is_the_rect_the_live_projection_carries(plate_fixture):
    """The whole placement, through :func:`bvc.locate`: zone D10 padded by one
    cell, unioned with what the leader reaches. Before this handoff the crop
    stopped at the zone and the lug was outside it."""
    words = zone_words(plate_fixture["zone_cell"], "D", 10)
    page = RecordedPage(
        plate_fixture["page_rect"],
        hits={plate_fixture["needle"]: [plate_fixture["callout_hit"]]},
        paths=plate_fixture["paths_reached"] + plate_fixture["paths_not_reached"],
        words=words, text="a sheet with a text layer",
    )
    placement = bvc.locate(page, {"zone": "D10", "callout": "5X 4.06 \u00b10.10"},
                           None, 1.0, 200.0)
    assert placement["located_by"] == "zone_cell"
    assert placement["callout_text_in_zone"] is True
    assert [round(v, 2) for v in placement["rect"]] == \
        plate_fixture["expected_crop_rect_rounded"]
    # And the callout itself is boxed, SOLID, because it was found there.
    assert [(h["kind"], h["rect_pt"]) for h in placement["highlights"]] == [
        ("verified_match", [round(v, 2) for v in plate_fixture["callout_hit"]])
    ]


def test_a_zone_crop_whose_callout_is_absent_keeps_its_old_rect_and_a_dashed_box(
        plate_fixture):
    """Declared-region honesty, in the picture (deliverable 4). Nothing on the
    page corroborated the citation, so the crop does NOT widen -- there is no
    leader to follow -- and the box round the zone says as much by being the
    `declared_region` kind, which the viewer draws dashed."""
    words = zone_words(plate_fixture["zone_cell"], "D", 10)
    page = RecordedPage(plate_fixture["page_rect"], hits={}, words=words,
                        paths=plate_fixture["paths_reached"],
                        text="a sheet with a text layer")
    placement = bvc.locate(page, {"zone": "D10", "callout": "5X 4.06 \u00b10.10"},
                           None, 1.0, 200.0)
    assert placement["callout_text_in_zone"] is False
    cell = plate_fixture["zone_cell"]
    width, height = cell[2] - cell[0], cell[3] - cell[1]
    assert [round(v, 2) for v in placement["rect"]] == [
        round(v, 2) for v in bvc.pad_rect(tuple(cell), width, height)]
    assert [h["kind"] for h in placement["highlights"]] == ["declared_region"]


def test_the_attachment_walk_refuses_scenery_and_stops_at_two_hops():
    """A path big enough to be a view outline or the drawing frame is not
    followed: one connected edge would otherwise walk the crop out to the whole
    sheet, which is the failure the two-hop rule and
    :data:`bvc.ATTACHMENT_MAX_PATH_PT` exist to prevent."""
    hit = (100.0, 100.0, 140.0, 112.0)
    frame = (0.0, 0.0, 2000.0, 1400.0)
    page = RecordedPage((0.0, 0.0, 2000.0, 1400.0), paths=[frame])
    assert bvc.attachment_rect(page, hit) is None
    # A leader of a sane size IS followed, and reaches exactly what touches its
    # far end -- not what touches that.
    leader = (150.0, 60.0, 250.0, 104.0)
    feature = (252.0, 40.0, 290.0, 80.0)
    far = (400.0, 40.0, 430.0, 80.0)
    page = RecordedPage((0.0, 0.0, 2000.0, 1400.0),
                        paths=[frame, leader, feature, far])
    got = bvc.attachment_rect(page, hit)
    assert got == bvc.pad_rect(
        bvc.union_rect(bvc.union_rect(hit, leader), feature),
        bvc.ATTACHMENT_PAD_PT, bvc.ATTACHMENT_PAD_PT)


def test_a_page_with_no_vector_content_yields_no_attachment():
    """A scan, and a page object that does not expose drawings at all, are the
    same answer: keep the rect you had. The NAS standard is a photocopy."""
    assert bvc.attachment_rect(RecordedPage((0, 0, 610, 842)), (1, 1, 2, 2)) is None
    assert bvc.attachment_rect(FakePage(), (1, 1, 2, 2)) is None


def zone_words(cell, letter, number):
    """Border words that make :func:`bvc.zone_cell` return ``cell`` exactly.

    ``page_native_grid`` reads the printed grid off words near a page edge and
    ``zone_cell`` sizes a cell from the MEDIAN spacing of what it read, so three
    labels a cell-width apart on each axis reproduce one known cell. Derived
    from the cell rather than hard-coded, so the fixture stays the only place a
    number lives.
    """
    width, height = cell[2] - cell[0], cell[3] - cell[1]
    cx, cy = (cell[0] + cell[2]) / 2, (cell[1] + cell[3]) / 2
    words = []
    for index, offset in enumerate((-1, 0, 1)):
        x = cx + offset * width
        words.append((x - 3.0, 5.0, x + 3.0, 12.0, str(number + offset), 0, 0, 0))
        y = cy + offset * height
        words.append((5.0, y - 3.0, 12.0, y + 3.0,
                      chr(ord(letter) + offset), 0, 0, 0))
    return words


# --- case 1: the location reference, framed on its own balloon --------------


def test_a_parts_list_citation_is_located_by_its_own_balloon(balloon_fixture):
    """The bushing. Its citation names zone H3, which is where the DETAIL B
    CAPTION is printed -- balloon 34 sits 200pt above that cell, so the old crop
    showed the view with the item off the top edge."""
    answer = bvc.balloon_answer(
        {"parts_list": balloon_fixture["parts_list"],
         "balloons": balloon_fixture["balloons_sheet4_detail_b"],
         "pl_page": balloon_fixture["pl_page"]},
        4,
        {"kind": "parts_list", "view": "DETAIL B",
         "callout": "214820-002  BUSHING, PLAIN, ALUMINUM BRONZE"},
        "214820-002",
    )
    assert answer["find_no"] == 34
    assert answer["part_number"] == "214820-002"
    assert answer["view_matched"] is True
    assert len(answer["rects"]) == 1
    # The item's balloon, and the extent of the view it is in -- the frame when
    # a citation names no zone.
    assert len(answer["view_rects"]) == len(
        balloon_fixture["balloons_sheet4_detail_b"])


def test_the_balloon_crop_contains_the_balloon_and_the_cited_zone(balloon_fixture):
    balloon = bvc.balloon_answer(
        {"parts_list": balloon_fixture["parts_list"],
         "balloons": balloon_fixture["balloons_sheet4_detail_b"],
         "pl_page": balloon_fixture["pl_page"]},
        4, {"kind": "parts_list", "view": "DETAIL B",
            "callout": "214820-002  BUSHING"}, "214820-002")
    cell = (1936.95, 561.26, 2085.94, 701.59)   # printed zone H3, from the export
    page = RecordedPage((0.0, 0.0, 2383.94, 1683.78),
                        words=zone_words(cell, "H", 3),
                        text="a drawing with a text layer")
    placement = bvc.locate(page, {"zone": "H3", "view": "DETAIL B",
                                  "callout": "214820-002  BUSHING"},
                           "214820-002", 1.0, 200.0, None, balloon)
    assert placement["located_by"] == "balloon_view"
    assert placement["find_no"] == 34
    item = balloon["rects"][0]
    # The balloon is inside the crop, which is the whole point -- it was not
    # before. And so is the cited zone, which carries the view's caption.
    assert bvc.rect_contains(placement["rect"], item)
    assert bvc.rect_contains(placement["rect"], cell)
    assert [(h["kind"], h["label"]) for h in placement["highlights"]] == [
        ("verified_match", "balloon 34")]


def test_a_balloon_beats_the_cited_zone_because_the_caption_is_not_the_item(
        balloon_fixture):
    """The one precedence this handoff changed, and the reason: a zone citation
    for a parts-list item names the view's caption cell, and this repo has
    already watched such a zone MOVE between two exports of one revision
    (pitch_link worksheet, finding F4). The balloon is the item itself."""
    balloon = bvc.balloon_answer(
        {"parts_list": balloon_fixture["parts_list"],
         "balloons": balloon_fixture["balloons_sheet4_detail_b"],
         "pl_page": balloon_fixture["pl_page"]},
        4, {"view": "DETAIL B", "callout": "214820-002  BUSHING"}, "214820-002")
    cell = (1936.95, 561.26, 2085.94, 701.59)
    page = RecordedPage((0.0, 0.0, 2383.94, 1683.78),
                        words=zone_words(cell, "H", 3), text="a drawing")
    with_balloon = bvc.locate(page, {"zone": "H3", "view": "DETAIL B"},
                              "214820-002", 1.0, 200.0, None, balloon)
    without = bvc.locate(page, {"zone": "H3", "view": "DETAIL B"},
                         "214820-002", 1.0, 200.0, None, None)
    assert with_balloon["located_by"] == "balloon_view"
    assert without["located_by"] == "zone_cell"
    assert not bvc.rect_contains(without["rect"], balloon["rects"][0]), (
        "the zone crop did not contain the item's balloon -- which is the "
        "defect this rule exists to fix; if this ever passes, the fixture "
        "moved and the rest of this case is measuring nothing"
    )


def test_a_part_number_is_matched_exactly_never_by_prefix(balloon_fixture):
    """``NAS1149V0332`` (the element's ``hardware_ref``) and ``NAS1149V0332H``
    (its parts-list row) are two part numbers. The row is reached through the
    CALLOUT's first token, which is the full number; nothing is prefix-matched,
    because accepting one part number for another is the whole class of error
    this repo exists to prevent."""
    balloons = {"parts_list": balloon_fixture["parts_list"],
                "balloons": balloon_fixture["balloons_sheet4_detail_b"],
                "pl_page": balloon_fixture["pl_page"]}
    row = bvc.parts_list_row_for(
        balloons,
        {"callout": "NAS1149V0332H  WASHER, FLAT, 6Al-4V  (find 32, qty 9)"},
        "NAS1149V0332")
    assert row["part_number"] == "NAS1149V0332H"
    assert row["find_no"] == 32
    # The truncated number alone reaches nothing.
    assert bvc.parts_list_row_for(balloons, {}, "NAS1149V0332") is None
    assert bvc.candidate_part_numbers({"callout": "214820-002 BUSHING"}, None) == \
        ["214820-002"]


def test_a_citation_naming_no_ballooned_item_gets_no_balloon_answer(balloon_fixture):
    """Every missing link short-circuits to ``None``, and the caller then places
    the crop exactly as it did before -- so this rule can only ever ADD a
    located crop, never move one it does not understand."""
    balloons = {"parts_list": balloon_fixture["parts_list"],
                "balloons": balloon_fixture["balloons_sheet4_detail_b"],
                "pl_page": balloon_fixture["pl_page"]}
    # no balloon file at all
    assert bvc.balloon_answer(None, 4, {}, "214820-002") is None
    # a part number no row carries
    assert bvc.balloon_answer(balloons, 4, {}, "999999-001") is None
    # the right item, the wrong sheet
    assert bvc.balloon_answer(balloons, 7, {}, "214820-002") is None


def test_a_view_the_balloons_do_not_name_shows_every_balloon_of_the_item(
        balloon_fixture):
    """Filtering to nothing would throw away the only evidence there is, so a
    cited view no ``view_id`` names falls back to every balloon of the item on
    the sheet -- and says so through ``view_matched``."""
    answer = bvc.balloon_answer(
        {"parts_list": balloon_fixture["parts_list"],
         "balloons": balloon_fixture["balloons_sheet4_detail_b"],
         "pl_page": balloon_fixture["pl_page"]},
        4, {"view": "SECTION ZZ-ZZ"}, "214820-002")
    assert answer["view_matched"] is False
    assert len(answer["rects"]) == 1


def test_the_parts_list_row_band_is_the_cited_rows_own_column_block(balloon_fixture):
    """The companion image. The band spans the printed block the row is in --
    delimited by the ``FIND`` headers, because a Joby parts list prints as
    several side-by-side blocks and a band across the whole table would carry
    two unrelated rows' columns."""
    hits = balloon_fixture["part_number_hits_on_sheet1"]
    page = RecordedPage(
        (0.0, 0.0, 2383.94, 1683.78),
        hits={**hits,
              bvc.PARTS_LIST_BLOCK_HEADER: [(x, 1588.9, x + 22.0, 1605.1)
                                            for x in balloon_fixture["find_header_x"]]},
    )
    band, hit = bvc.parts_list_row_rect(
        page, balloon_fixture["parts_list_table_rect"], "214820-002")
    assert [round(v, 4) for v in band] == \
        balloon_fixture["expected_parts_list_band"]
    assert [round(v, 4) for v in hit] == balloon_fixture["expected_parts_list_hit"]
    # The block, not the table: the table runs to x=1473.96 and the next FIND
    # header starts at 714.33.
    assert band[2] < balloon_fixture["parts_list_table_rect"][2]


def test_one_part_number_on_two_rows_is_resolved_by_its_find_number():
    """217755's parts list carries ``NAS1149V0332H`` as BOTH find 13 and find
    32, and the citation is about one of them. The tie is broken the way a
    reader breaks it -- by the number printed in the ``FIND`` column to the left
    of the part number, on the same row. Two of the four live balloon crops had
    no parts-list companion at all until this rule existed."""
    table = (0.0, 0.0, 800.0, 1600.0)
    page = RecordedPage((0.0, 0.0, 800.0, 1600.0), hits={
        "X-1": [(60.0, 100.0, 110.0, 116.0), (60.0, 300.0, 110.0, 316.0)],
        "13": [(10.0, 100.0, 22.0, 116.0)],
        "32": [(10.0, 300.0, 22.0, 316.0)],
        bvc.PARTS_LIST_BLOCK_HEADER: [(8.0, 1580.0, 30.0, 1596.0)],
    })
    band, hit = bvc.parts_list_row_rect(page, table, "X-1", 32)
    assert hit == (60.0, 300.0, 110.0, 316.0)
    assert band[1] == 300.0 - bvc.PARTS_LIST_CONTEXT_PT
    # The other find number picks the other row, which is the whole point.
    assert bvc.parts_list_row_rect(page, table, "X-1", 13)[1][1] == 100.0


def test_a_part_number_on_two_rows_with_no_find_number_yields_no_row():
    """Two hits is two rows, and this function will not pick one -- not by
    taking the first, and not by taking the one nearest anything."""
    table = (0.0, 0.0, 800.0, 1600.0)
    page = RecordedPage((0.0, 0.0, 800.0, 1600.0), hits={
        "X-1": [(10.0, 100.0, 60.0, 116.0), (10.0, 300.0, 60.0, 316.0)],
    })
    assert bvc.parts_list_row_rect(page, table, "X-1") is None
    assert bvc.parts_list_row_rect(page, table, "not-on-the-sheet") is None
    # A find number that is printed on NEITHER row leaves it unresolved too:
    # the tie-break has to actually break the tie, not narrow it to zero and
    # then fall back to guessing.
    assert bvc.parts_list_row_rect(page, table, "X-1", 99) is None


# --- case 2: the datasheet crop, with the used cell boxed -------------------


def a_context(label="Sheet 3, the whole grip/length table with its headers"):
    return scr.CropContext(
        document="NAS6403-NAS6420 Rev 4.pdf", page=3, label=label,
        rect=(82.0, 76.0, 540.0, 598.0),
        shows="the whole table, its headers and its closing note",
        recorded="2026-09-15", recorded_by="a test",
    )


def test_a_declared_context_becomes_the_crop_and_the_region_becomes_a_box():
    """Deliverable 2. The crop is the whole table; the cited row is one box in
    it. Before this, the crop WAS the row band -- 322x20 pixels, "just four
    numbers with no context for what they mean"."""
    registry = scr.CropRegionRegistry(regions=(a_region(),),
                                      contexts=(a_context(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3,
                         "row 'Grip Dash No. 13'")
    placement = bvc.locate(FakePage(), {"zone": None}, "NAS6403U13H", 1.0, 200.0,
                           answer)
    assert placement["located_by"] == "declared_region"
    assert placement["rect"] == (82.0, 76.0, 540.0, 598.0)
    assert placement["context_label"] == a_context().label
    assert placement["region_label"] == "Grip Dash No. 13 row"
    # DASHED: a human recorded the rect; nothing on this photocopy corroborated
    # it, and it has no text layer to corroborate with.
    assert [(h["kind"], h["rect_pt"]) for h in placement["highlights"]] == [
        ("declared_region", [84.5, 196.25, 191.6, 204.25])]


def test_the_shipped_registry_declares_a_context_for_both_cited_nas_sheets():
    """The live case, read out of the tracked registry: sheet 3 (the grip/length
    table the bolt's grip and length are read from) and sheet 1 (the figure and
    dimension table the cotter-hole dimension M is read from) each declare one,
    and every region on those sheets falls INSIDE it -- a region outside its
    sheet's context would be highlighted off the edge of the crop."""
    registry = scr.load(REPO_ROOT / scr.REGISTRY_RELPATH)
    for page in (1, 3):
        context = registry.context_for("NAS6403-NAS6420 Rev 4.pdf", page)
        assert context is not None, f"sheet {page} declares no crop context"
        for region in registry.for_page("NAS6403-NAS6420 Rev 4.pdf", page):
            assert bvc.rect_contains(context.rect, region.rect), (
                f"{region.label!r} is outside the context {context.label!r}"
            )


def test_a_page_context_with_no_matching_region_is_the_crop_and_says_so():
    """Honest middle state: the sheet's context beats the whole sheet, and it
    highlights nothing rather than guessing which row was meant."""
    registry = scr.CropRegionRegistry(
        regions=(a_region(), a_region(label="Grip Dash No. 14 row",
                                      match=("Grip Dash No. 14",))),
        contexts=(a_context(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3, "no row named")
    assert answer.how == "no_match"
    placement = bvc.locate(FakePage(), {"zone": None}, None, 1.0, 200.0, answer)
    assert placement["located_by"] == "page_context"
    assert placement["rect"] == (82.0, 76.0, 540.0, 598.0)
    assert placement["highlights"] == []
    assert "no declared region matched" in placement["note"]


def test_a_unique_callout_match_still_beats_the_page_context():
    """A context is the sheet-wide answer and a text hit is a place. The
    specific one wins -- and it is widened along its leader like any other
    located callout."""
    registry = scr.CropRegionRegistry(contexts=(a_context(),))
    answer = scr.resolve(registry, "NAS6403-NAS6420 Rev 4.pdf", 3, "")
    page = FakePage(text="a sheet with a text layer",
                    hits={"NAS6403U13H": [(10.0, 10.0, 60.0, 20.0)]})
    placement = bvc.locate(page, {"zone": None}, "NAS6403U13H", 1.0, 200.0, answer)
    assert placement["located_by"] == "callout_text"
    assert [h["kind"] for h in placement["highlights"]] == ["verified_match"]


# --- the shape every consumer reads ----------------------------------------


def test_every_placement_carries_highlights_and_the_new_keys():
    """One shape per entry, highlights included: "nothing was marked on this
    sheet" and "this index is older than highlights" must not look the same to
    the viewer, which is why an empty list is written rather than no key."""
    page = FakePage(text="a sheet", hits={"NAS6403U13H": [(1.0, 1.0, 2.0, 2.0)]})
    for placement in (
        bvc.locate(page, {"zone": None}, "NAS6403U13H", 1.0, 200.0, None),
        bvc.locate(FakePage(), {"zone": None}, None, 1.0, 200.0, None),
    ):
        assert placement["highlights"] == [] or all(
            box["kind"] in bvc.HIGHLIGHT_KINDS for box in placement["highlights"])
        for key in ("context_label", "find_no", "region_label", "region_match"):
            assert key in placement


def test_a_highlight_kind_outside_the_vocabulary_is_refused_at_the_source():
    """The vocabulary is a module-level constant and the constructor is the one
    gate: a new word reaches ``crops.json`` only by being added to
    :data:`bvc.HIGHLIGHT_KINDS`, where
    ``tests/test_js_python_vocabulary.py`` pairs it against the viewer's copy."""
    assert bvc.HIGHLIGHT_KINDS == ("verified_match", "declared_region")
    with pytest.raises(ValueError, match="not one of"):
        bvc.highlight("glowing", "a label", (0, 0, 1, 1))


def test_highlight_fractions_are_measured_against_the_crop_and_clamped():
    """The viewer holds a PNG and no idea what scale it was rendered at, so a
    box in points is unusable there. Clamped because a padded zone cell trimmed
    by the page border legitimately runs off the crop, and a box drawn outside
    its frame points at nothing."""
    rect = (100.0, 200.0, 300.0, 400.0)
    boxes = bvc.with_fracs(rect, [
        bvc.highlight("verified_match", "inside", (150.0, 250.0, 200.0, 300.0)),
        bvc.highlight("declared_region", "hanging off", (50.0, 150.0, 400.0, 500.0)),
    ])
    assert boxes[0]["frac"] == [0.25, 0.25, 0.5, 0.5]
    assert boxes[1]["frac"] == [0.0, 0.0, 1.0, 1.0]
    # The rect in points is kept beside it: the fraction is for drawing, the
    # points are what a reviewer checks against the sheet.
    assert boxes[0]["rect_pt"] == [150.0, 250.0, 200.0, 300.0]


def test_a_zero_width_crop_does_not_divide_by_zero():
    """A degenerate rect is not a crash. It cannot arise from `locate` today,
    but `with_fracs` is called on a rect clamped to the page and a citation
    naming a rect entirely off-page would clamp to nothing."""
    boxes = bvc.with_fracs((10.0, 10.0, 10.0, 10.0),
                           [bvc.highlight("verified_match", None, (0, 0, 5, 5))])
    assert boxes[0]["frac"] == [0.0, 0.0, 0.0, 0.0]


# --- the parts-list row identity: (part_number, find_no), never part_number --
# 217755's parts list carries NAS1149V0332H twice -- find 13 (qty 15) and find
# 32 (qty 9). Keyed by part number alone, one of those two real rows is deleted
# by whichever the export wrote second, and the survivor is then answered for a
# citation naming the other. The fixture records BOTH rows, in the array order
# the 2026-AUG-19 export wrote them.


def _colliding_balloons(balloon_fixture, reverse=False):
    rows = list(balloon_fixture["parts_list"])
    return {"parts_list": list(reversed(rows)) if reverse else rows,
            "balloons": balloon_fixture["balloons_sheet4_detail_b"],
            "pl_page": balloon_fixture["pl_page"]}


#: The rotor washer's real citation, verbatim from
#: ``stack_rotor_fastener_length.json::washer_nas1149v0332_tt``. It names the
#: row it means -- find 32 -- in its own prose.
_FIND_32_CITATION = {
    "kind": "parts_list", "view": "SECTION T-T",
    "callout": ("NAS1149V0332H  WASHER, FLAT, 6Al-4V, .203\" X .438\" X .032\""
                "  (find 32, qty 9 across the assembly; balloon at SECTION T-T)"),
}


def test_the_cited_parts_list_row_wins_over_the_one_sharing_its_part_number(
        balloon_fixture):
    """Two real rows, one part number. The citation states which row it means,
    so that is the row -- and the find-13 row's presence does not change the
    answer."""
    row = bvc.parts_list_row_for(_colliding_balloons(balloon_fixture),
                                 _FIND_32_CITATION, "NAS1149V0332")
    assert row["find_no"] == 32
    assert row["qty"] == 9
    # The row that must NOT be answered for this citation. Its only page-8
    # balloon is in SECTION R-R, and the citation names SECTION T-T -- so the
    # wrong row here does not fail, it frames the crop on another view of the
    # cited sheet and titles it "balloon 13" under this element's own name.
    other = bvc.parts_list_row_for(
        _colliding_balloons(balloon_fixture),
        {**_FIND_32_CITATION,
         "callout": "NAS1149V0332H  WASHER, FLAT, 6Al-4V  (find 13, qty 15)"},
        "NAS1149V0332")
    assert other["find_no"] == 13


def test_the_parts_list_row_answer_does_not_depend_on_the_export_row_order(
        balloon_fixture):
    """The assertion that catches keying by part number alone. A dict keyed on
    the part number keeps whichever colliding row was inserted LAST, so the
    answer is a property of the array order drawing-checker happened to write
    rather than of the citation. Reversed, this returned find 13."""
    forward = bvc.parts_list_row_for(_colliding_balloons(balloon_fixture),
                                     _FIND_32_CITATION, "NAS1149V0332")
    reversed_ = bvc.parts_list_row_for(
        _colliding_balloons(balloon_fixture, reverse=True),
        _FIND_32_CITATION, "NAS1149V0332")
    assert forward == reversed_
    assert reversed_["find_no"] == 32


def test_two_rows_colliding_with_no_cited_find_number_are_refused_not_guessed(
        balloon_fixture):
    """A citation that names the full part number and NO find number cannot
    say which of the two rows it means, so the answer is a refusal. ``None``
    here places the crop exactly as it did before (``balloon_answer``'s
    contract), which is honest; the last row written is not."""
    balloons = _colliding_balloons(balloon_fixture)
    ambiguous = {"kind": "parts_list",
                 "callout": "NAS1149V0332H  WASHER, FLAT, 6Al-4V"}
    assert bvc.parts_list_row_for(balloons, ambiguous, "NAS1149V0332") is None
    # ...and reversing the rows does not turn the refusal into an answer.
    assert bvc.parts_list_row_for(_colliding_balloons(balloon_fixture,
                                                      reverse=True),
                                  ambiguous, "NAS1149V0332") is None
    # A refused row is a refused balloon: no crop is moved onto the wrong item.
    assert bvc.balloon_answer(balloons, 4, ambiguous, "NAS1149V0332") is None
    # The uncontested row next to it is unaffected -- refusal is per part
    # number, not a general loss of nerve.
    assert bvc.parts_list_row_for(
        balloons, {"callout": "214820-002  BUSHING"}, "214820-002"
    )["find_no"] == 34


def test_the_cited_find_number_is_read_from_the_callout_by_a_named_pattern():
    """The find number lives in the callout's prose, and the pattern that reads
    it is a module-level constant (repo CLAUDE.md: a field vocabulary is never
    an inline literal). All four live parts-list citations state it."""
    live_callouts = {
        "214820-002  BUSHING, PLAIN  (find 34)": 34,
        _FIND_32_CITATION["callout"]: 32,
        "MS21299C3  WASHER  (find 60, qty AR; balloon at SECTION T-T)": 60,
        "NAS1149V0332H  WASHER  (find 29, qty 1)": 29,
    }
    for callout, expected in live_callouts.items():
        match = bvc.CALLOUT_FIND_NO_RE.search(callout)
        assert match is not None, callout
        assert int(match.group(1)) == expected
    # A callout stating none is not a match -- it is the refusal case above.
    assert bvc.CALLOUT_FIND_NO_RE.search("214820-002  BUSHING, PLAIN") is None

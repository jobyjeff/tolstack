"""The recording verb (``scripts/record_spec_crop_region.py``).

The registry is tracked config, which means it is reviewed -- but review is not
what catches a rect that hangs off the page or a sheet number the document does
not have. This is: everything the verb refuses is something a hand-edit would
have shipped, and the crop it produced would have looked perfectly fine.

PyMuPDF is needed to read a page's size, so it is injected here
(``page_geometry_fn``) and the tests run under this repo's own stdlib-only venv --
the same split ``tests/test_viewer_crops.py`` uses for the crop builder.

Handoff: ``spec_crop_region_registry`` (2026-09-14).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from tolerance_stack import spec_crop_regions as scr

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import record_spec_crop_region as verb  # noqa: E402

A4 = (1, (0.0, 0.0, 610.56, 842.4))


def geometry(_pdf, _page):
    return A4


@pytest.fixture()
def bench(tmp_path):
    """A registry file, a pile with one document in it, and the argv prefix that
    points the verb at both."""
    specs = tmp_path / "data" / "inbox" / "specs"
    specs.mkdir(parents=True)
    (specs / "STD.pdf").write_bytes(b"%PDF-1.4 not really, the verb never parses it")
    registry = tmp_path / "crop_regions.json"
    registry.write_text(scr.dumps(scr.CropRegionRegistry()), encoding="utf-8")
    return {
        "registry": registry,
        "argv": ["--data-root", str(tmp_path / "data"), "--registry", str(registry)],
    }


def record(bench, argv, geometry_fn=geometry):
    return verb.main(bench["argv"] + argv, page_geometry_fn=geometry_fn)


def entry(**overrides):
    args = {
        "--document": "STD.pdf", "--page": "1", "--label": "a row",
        "--shows": "the cited row, read off a render",
        "--recorded": "2026-09-14", "--recorded-by": "a test",
    }
    args.update(overrides)
    out = []
    for flag, value in args.items():
        out += [flag, value]
    return out + ["--rect", "10", "20", "100", "40"]


def test_a_good_entry_is_recorded_and_reads_back(bench):
    assert record(bench, entry()) == 0
    registry = scr.load(bench["registry"])
    assert len(registry.regions) == 1
    recorded = registry.regions[0]
    assert recorded.document == "STD.pdf"
    assert recorded.rect == (10.0, 20.0, 100.0, 40.0)
    # `match` defaults to the label: the common case is a region named after the
    # row a citation already spells out, and an optional field nobody fills in is
    # a field that quietly does nothing.
    assert recorded.match == ("a row",)


def test_match_strings_may_be_given_and_repeated(bench):
    assert record(bench, entry() + ["--match", "Dash No. 4", "--match", "NAS6403U4H"]) == 0
    assert scr.load(bench["registry"]).regions[0].match == ("Dash No. 4", "NAS6403U4H")


def test_a_document_that_is_not_in_the_pile_is_refused(bench, capsys):
    assert record(bench, entry(**{"--document": "NOT_IN_THE_PILE.pdf"})) == 2
    assert "is not in" in capsys.readouterr().err
    assert scr.load(bench["registry"]).regions == ()


def test_the_refusal_says_where_the_pile_actually_lives(bench, capsys):
    # The mistake this catches is the one every worktree session makes: data/ is
    # gitignored, so the pile looks empty from a worktree and is not.
    record(bench, entry(**{"--document": "NOT_IN_THE_PILE.pdf"}))
    assert "--data-root" in capsys.readouterr().err


def test_a_sheet_the_document_does_not_have_is_refused(bench, capsys):
    assert record(bench, entry(**{"--page": "7"})) == 2
    assert "sheet(s); you named sheet 7" in capsys.readouterr().err


def test_a_rect_hanging_off_the_page_is_refused(bench, capsys):
    argv = entry()[:-5] + ["--rect", "10", "20", "100", "9000"]
    assert record(bench, argv) == 2
    assert "not on the page" in capsys.readouterr().err


def test_an_inverted_rect_is_refused_by_the_shape_not_by_the_page(bench, capsys):
    argv = entry()[:-5] + ["--rect", "100", "20", "10", "40"]
    assert record(bench, argv) == 2
    assert "empty or inverted" in capsys.readouterr().err


def test_a_label_already_recorded_on_that_sheet_is_refused(bench, capsys):
    assert record(bench, entry()) == 0
    assert record(bench, entry(**{"--match": "something else"})) == 2
    assert "both labelled" in capsys.readouterr().err
    assert len(scr.load(bench["registry"]).regions) == 1


def test_a_match_string_another_region_already_answers_to_is_refused(bench, capsys):
    assert record(bench, entry() + ["--match", "the row"]) == 0
    assert record(bench, entry(**{"--label": "another row"}) + ["--match", "the row"]) == 2
    assert "could ever resolve" in capsys.readouterr().err


def test_recording_is_append_only_and_keeps_what_was_there(bench):
    assert record(bench, entry()) == 0
    assert record(bench, entry(**{"--label": "a second row", "--page": "1"})) == 0
    labels = [r.label for r in scr.load(bench["registry"]).regions]
    assert labels == ["a row", "a second row"]


def test_a_dry_run_validates_and_writes_nothing(bench, capsys):
    assert record(bench, entry() + ["--dry-run"]) == 0
    assert "nothing written" in capsys.readouterr().out
    assert scr.load(bench["registry"]).regions == ()


def test_a_missing_pymupdf_names_the_interpreter_to_use(bench, capsys):
    def no_fitz(_pdf, _page):
        raise ImportError("No module named 'fitz'")

    assert record(bench, entry(), geometry_fn=no_fitz) == 2
    assert "drawing-checker" in capsys.readouterr().err

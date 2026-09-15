"""The declared crop-region registry: its shape, its matching rules, and the
live citations it answers.

``tolerance_stack/spec_crop_regions.py`` decides **where on a spec-pile sheet** a
citation's crop is taken. Getting that wrong is quiet: the crop still renders,
still says it came from the cited document and sheet, and shows the wrong row.
So the rules are pinned here branch by branch, and -- the half that would
actually catch a bad edit to the shipped file -- every live pile citation is
resolved against the real registry and asserted to land on the row it cites, by
name.

Handoff: ``spec_crop_region_registry`` (2026-09-14).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack import spec_crop_regions as scr

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = REPO_ROOT / scr.REGISTRY_RELPATH
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"

NAS6403 = "NAS6403-NAS6420 Rev 4.pdf"


@pytest.fixture(scope="module")
def registry() -> scr.CropRegionRegistry:
    return scr.load(REGISTRY_PATH)


def region(**overrides) -> scr.CropRegion:
    """A valid region, for tests that vary one field."""
    base = dict(
        document="X.pdf", page=1, label="a row", rect=(1.0, 2.0, 3.0, 4.0),
        match=("a row",), shows="what is in the rect", recorded="2026-09-14",
        recorded_by="a test",
    )
    base.update(overrides)
    return scr.CropRegion(**base)  # type: ignore[arg-type]


# --- the shipped file ------------------------------------------------------


def test_the_shipped_registry_loads_and_declares_regions(registry):
    assert registry.regions, "the registry ships with the regions this handoff recorded"
    assert registry.notes, "the file says why it exists, or the next reader guesses"


def test_every_shipped_region_carries_its_own_evidence(registry):
    # `shows` is the entry's evidence in the same sense a source_ref is a value's:
    # it is what somebody saw inside the rect. A region with a label and no
    # reading is an assertion about a page nobody can check.
    for entry in registry.regions:
        assert len(entry.shows) > 40, f"{entry.label}: `shows` says almost nothing"
        assert entry.recorded and entry.recorded_by


def test_the_shipped_registry_is_written_by_the_verb_not_by_hand(registry):
    # Formatting is `dumps`'s, so a hand-edit that adds an entry shows up as a
    # whole-file diff rather than slipping in looking like the verb's output.
    assert REGISTRY_PATH.read_text(encoding="utf-8") == scr.dumps(registry)


# --- what the constructor refuses -----------------------------------------


def test_an_inverted_or_empty_rect_is_refused():
    with pytest.raises(scr.RegistryError, match="empty or inverted"):
        region(rect=(3.0, 2.0, 1.0, 4.0))
    with pytest.raises(scr.RegistryError, match="empty or inverted"):
        region(rect=(1.0, 2.0, 1.0, 4.0))


def test_a_region_with_no_match_string_is_refused():
    with pytest.raises(scr.RegistryError, match="may not be empty"):
        region(match=())


def test_an_empty_match_string_is_refused_because_it_matches_everything():
    with pytest.raises(scr.RegistryError, match="matches everything"):
        region(match=("  ",))


def test_a_sheet_number_below_one_is_not_a_sheet():
    with pytest.raises(scr.RegistryError, match="not a sheet number"):
        region(page=0)


def test_two_regions_on_one_sheet_may_not_share_a_label():
    with pytest.raises(scr.RegistryError, match="both labelled"):
        scr.CropRegionRegistry(regions=(region(), region(match=("other",))))


def test_two_regions_on_one_sheet_may_not_share_a_match_string():
    # The collision is permanent: every citation carrying that string would
    # resolve ambiguously forever, which reads on screen as "no region declared".
    with pytest.raises(scr.RegistryError, match="could ever resolve"):
        scr.CropRegionRegistry(regions=(
            region(label="first", match=("shared",)),
            region(label="second", match=("shared",)),
        ))


def test_the_same_label_on_a_different_sheet_is_fine():
    scr.CropRegionRegistry(regions=(region(page=1), region(page=2)))


def test_an_unknown_field_is_refused_rather_than_dropped():
    with pytest.raises(scr.RegistryError, match="unknown field"):
        scr.CropRegion.from_dict({
            "document": "X.pdf", "page": 1, "label": "a row",
            "rect": [1, 2, 3, 4], "match": ["a row"], "shows": "x",
            "recorded": "2026-09-14", "recorded_by": "t", "confidence": "traced",
        })


def test_a_file_declaring_another_schema_is_refused(tmp_path):
    path = tmp_path / "crop_regions.json"
    path.write_text(json.dumps({"schema": "something/else", "regions": []}),
                    encoding="utf-8")
    with pytest.raises(scr.RegistryError, match="declares schema"):
        scr.load(path)


def test_a_registry_round_trips_through_the_file_format(tmp_path):
    original = scr.CropRegionRegistry(regions=(region(),), title="t", notes=("n",))
    path = tmp_path / "crop_regions.json"
    path.write_text(scr.dumps(original), encoding="utf-8")
    assert scr.load(path) == original


# --- the where-ref text a match is tested against --------------------------


def test_where_ref_text_carries_the_locating_fields_and_the_part_number():
    text = scr.where_ref_text(
        {"cell": "row 'Grip Dash No. 13'", "view": "grip/length table",
         "callout": "Grip Dash No. 13 | .812", "note": "a paragraph of argument"},
        "NAS6403U13H",
    )
    assert "row 'Grip Dash No. 13'" in text
    assert "grip/length table" in text
    assert "NAS6403U13H" in text
    # Deliberately NOT the note: it runs to paragraphs, and a region matching
    # against a paragraph starts answering to citations nobody meant it for.
    assert "argument" not in text


def test_where_ref_text_survives_a_citation_that_carries_almost_nothing():
    assert scr.where_ref_text(None, "NAS6403U13H") == "NAS6403U13H"
    assert scr.where_ref_text({}, None) == ""


# --- the matching rules ----------------------------------------------------


def test_a_declared_match_wins_and_says_what_matched():
    reg = scr.CropRegionRegistry(regions=(region(match=("Dash No. 13",)),))
    answer = scr.resolve(reg, "X.pdf", 1, "row 'Dash No. 13', column NAS6403")
    assert answer.how == "declared_match"
    assert answer.region is not None and answer.matched == "Dash No. 13"


def test_matching_ignores_case_because_a_transcription_is_not_a_key():
    reg = scr.CropRegionRegistry(regions=(region(match=("dash no. 13",)),))
    assert scr.resolve(reg, "X.pdf", 1, "ROW 'DASH NO. 13'").how == "declared_match"


def test_the_longest_declared_match_wins():
    # The trap this closes: "Grip Dash No. 1" is a substring of a citation about
    # dash 13, so a shorter declared string can hit a row it does not name.
    reg = scr.CropRegionRegistry(regions=(
        region(label="dash 1", match=("Grip Dash No. 1",)),
        region(label="dash 13", match=("Grip Dash No. 13",)),
    ))
    answer = scr.resolve(reg, "X.pdf", 1, "row 'Grip Dash No. 13'")
    assert answer.region is not None and answer.region.label == "dash 13"


def test_a_tie_between_two_regions_is_ambiguous_and_crops_nothing():
    reg = scr.CropRegionRegistry(regions=(
        region(label="left", match=("table",)),
        region(label="right", match=("chart",)),
    ))
    answer = scr.resolve(reg, "X.pdf", 1, "the table and the chart")
    assert answer.how == "ambiguous_match"
    assert answer.region is None
    assert "left" in answer.why and "right" in answer.why


def test_a_sheet_with_one_region_uses_it_even_when_nothing_matched():
    reg = scr.CropRegionRegistry(regions=(region(match=("nothing like this",)),))
    answer = scr.resolve(reg, "X.pdf", 1, "a citation naming none of it")
    assert answer.how == "sole_region"
    assert answer.region is not None and answer.matched is None


def test_several_regions_and_no_match_is_an_honest_miss():
    reg = scr.CropRegionRegistry(regions=(
        region(label="a", match=("aaa",)), region(label="b", match=("bbb",)),
    ))
    answer = scr.resolve(reg, "X.pdf", 1, "neither")
    assert answer.how == "no_match"
    assert answer.region is None
    assert "declared" in answer.why


def test_a_region_never_crosses_a_document_or_a_sheet():
    reg = scr.CropRegionRegistry(regions=(region(page=3, match=("the row",)),))
    assert scr.resolve(reg, "X.pdf", 1, "the row").how == "no_region"
    assert scr.resolve(reg, "Y.pdf", 3, "the row").how == "no_region"
    assert scr.resolve(reg, "X.pdf", 3, "the row").how == "declared_match"


def test_an_empty_registry_says_no_region_rather_than_raising():
    answer = scr.resolve(scr.CropRegionRegistry(), "X.pdf", 1, "anything")
    assert answer.how == "no_region" and answer.region is None


def test_every_resolution_names_a_known_outcome():
    # The vocabulary is a constant so a consumer can switch on it totally --
    # the constructor is what keeps a stray sixth value out.
    with pytest.raises(scr.RegistryError):
        scr.RegionResolution(how="nearly_matched")


# --- the live citations ----------------------------------------------------
#
# The half that bites on a bad edit to the shipped file. Every one of these is a
# real citation in a committed stack, and the label it must resolve to is the row
# the citation says it read. Both sides are tracked, so this runs everywhere --
# `data/` is not needed to check that a citation about dash 13 lands on dash 13.

EXPECTED = {
    ("pitch_link_to_pitch_plate", "bolt_grip_11"): "Grip Dash No. 11 row",
    ("pitch_link_to_pitch_plate", "bolt_length_11"): "Grip Dash No. 11 row",
    ("pitch_link_to_pitch_plate", "cotter_hole_from_point"):
        "NAS6403 row of the sheet-1 dimension table",
    ("rotor_fastener_length", "fastener_grip_u2h"): "Grip Dash No. 2 row",
    ("rotor_fastener_length", "fastener_grip_u3h"): "Grip Dash No. 3 row",
    ("rotor_fastener_length", "fastener_grip_u4h"): "Grip Dash No. 4 row",
    ("rotor_fastener_length", "fastener_grip_u5h"): "Grip Dash No. 5 row",
    ("rotor_fastener_length", "fastener_grip_u6h"): "Grip Dash No. 6 row",
    ("rotor_fastener_length", "fastener_grip_u7h"): "Grip Dash No. 7 row",
    ("rotor_fastener_length", "fastener_grip_u8h"): "Grip Dash No. 8 row",
    ("rotor_fastener_length", "fastener_grip_u9h"): "Grip Dash No. 9 row",
    ("rotor_fastener_length", "fastener_grip_u10h"): "Grip Dash No. 10 row",
    ("tan_link_to_pitch_plate", "fastener_grip_13"): "Grip Dash No. 13 row",
    ("tan_link_to_pitch_plate", "fastener_grip_14"): "Grip Dash No. 14 row",
    ("tan_link_to_pitch_plate_take2", "fastener_grip_13"): "Grip Dash No. 13 row",
    ("vpa_output_to_pitch_plate", "fastener_grip"): "Grip Dash No. 13 row",
}


def live_pile_citations():
    """Every committed element whose citation names a document the registry
    knows, read from the tree rather than listed.

    Keys on ``source_ref.document``, which is a **proxy** for what production
    keys on: ``scripts/build_viewer_crops.py`` resolves the citation to a file
    first and passes ``pdf.name``. They agree for every live citation -- each
    export block points at the pile file under its own name -- and this scan is
    deliberately the cheap one, because it needs no ``data/`` and so runs from a
    worktree. What it cannot see is a citation whose ``document`` and whose
    resolved filename differ; the crop builder's own end-to-end tests
    (``tests/test_viewer_crops.py``) enter at ``crop_element`` and do read the
    resolved file.
    """
    out = []
    for path in sorted(STACKS_DIR.glob("stack_*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        for element in raw.get("elements", []):
            ref = element.get("source_ref") or {}
            if ref.get("document") == NAS6403:
                out.append((raw["id"], element["id"], ref, element.get("hardware_ref")))
    return out


def test_the_live_citation_scan_finds_something():
    # A scan that silently finds nothing is a guard that passes against anything.
    assert live_pile_citations()


def test_every_live_pile_citation_resolves_to_the_row_it_cites(registry):
    answers = {}
    for stack_id, element_id, ref, hardware_ref in live_pile_citations():
        answer = scr.resolve(registry, ref["document"], int(ref["sheet"]),
                             scr.where_ref_text(ref, hardware_ref))
        assert answer.region is not None, (
            f"{stack_id}:{element_id} lands on no declared region ({answer.why}) -- "
            f"its crop is the whole photocopied sheet again"
        )
        answers[(stack_id, element_id)] = answer.region.label
    assert answers == EXPECTED


def test_no_live_pile_citation_resolves_ambiguously(registry):
    # Ambiguity is the failure mode a new region introduces silently: recording
    # one whose match string is carried by an existing citation turns that
    # citation's crop back into a whole sheet, and nothing else says so.
    for stack_id, element_id, ref, hardware_ref in live_pile_citations():
        answer = scr.resolve(registry, ref["document"], int(ref["sheet"]),
                             scr.where_ref_text(ref, hardware_ref))
        assert answer.how != "ambiguous_match", f"{stack_id}:{element_id}: {answer.why}"


def test_the_grip_rows_are_ordered_down_the_sheet(registry):
    # Geometry sanity on the shipped rects: the dash rows are one table read top
    # to bottom, so a transposed or mistyped rect shows up as a row out of order.
    rows = [(int(r.label.split()[3]), r.rect) for r in registry.regions
            if r.page == 3 and r.label.startswith("Grip Dash No.")]
    rows.sort()
    tops = [rect[1] for _, rect in rows]
    assert tops == sorted(tops), "a dash row's rect sits above a lower-numbered row"
    assert len({(rect[0], rect[2]) for _, rect in rows}) == 1, (
        "the dash rows span one set of columns, so their x range is one value"
    )

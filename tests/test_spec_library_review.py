"""Independent re-reading of the source PDFs, by the review of spec_library_v0.

Every number below was read by the reviewer off its own render of the document
in ``C:\\workspace\\tolstack\\data\\inbox\\specs\\`` -- NOT copied from the parse
events under review. That is the whole point: ``tests/test_spec_library.py``
pins the library against the events, which makes it a self-consistency check.
This file pins the library against the *documents*, which is the only thing that
can catch a value the parse event invented or mis-registered.

Renders used (PyMuPDF from drawing-checker's venv-win, the repo's standing
precedent for a fitz dependency it deliberately does not carry):

* ``NAS6403-NAS6420 Rev 4.pdf`` -- sheets 1-4 at Matrix(2.2), the point-end
  figure at Matrix(9) on pt rect [300,105,420,230].
* ``MS9363 Rev C.pdf`` -- both sheets at Matrix(2.2), the axial section at
  Matrix(8) on pt rect [330,120,500,325], sheet-2 REQUIREMENTS at Matrix(4.16).
* ``JPS00094 ... .pdf`` -- text layer, no render needed.

Where a value here disagrees with the library, the library is wrong until a
third reader breaks the tie. Where it agrees, the value has been read twice by
two agents off the same document, which is the standard this repo's founding
rule sets: *every tolerance traces to an actual specification callout.*
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack.spec_library import IntakeQueue, build_library, load_events

REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = REPO_ROOT / "docs" / "spec_library" / "events"
INTAKE_PATH = REPO_ROOT / "docs" / "spec_library" / "intake_queue.json"


@pytest.fixture(scope="module")
def library():
    return build_library(load_events(EVENTS_DIR))


# ---------------------------------------------------------------------------
# MS9363 Rev C, sheet 1, TABLE I -- read at Matrix(2.2), block -08/-09/-10
# ---------------------------------------------------------------------------

# Columns as the sheet prints them, left to right:
#   DASH NUMBER | THREAD T | A | B MIN | oC | oD | G | H | S | APPROX MASS LB/100
MS9363_TABLE_I = {
    "MS9363-09": {
        "width_across_flats": (0.367, 0.376),      # A   367- 376
        "width_across_corners_min": (0.419, None),  # B MIN  419
        "countersink_dia": (0.190, 0.210),          # oC  190- 210
        "chamfer_dia": (0.365, 0.385),              # oD  365- 385
        "unslotted_height": (0.084, 0.104),         # G   084- 104
        "nut_height": (0.178, 0.198),               # H   178- 198
        "slot_width": (0.073, 0.088),               # S   073- 088
    },
    "MS9363-10": {
        "width_across_flats": (0.430, 0.439),       # A   430- 439
        "width_across_corners_min": (0.491, None),  # B MIN  491
        "countersink_dia": (0.250, 0.270),          # oC  250- 270
        "chamfer_dia": (0.428, 0.448),              # oD  428- 448
        "unslotted_height": (0.084, 0.104),         # G   084- 104
        "nut_height": (0.178, 0.198),               # H   178- 198
        "slot_width": (0.073, 0.088),               # S   073- 088
    },
}


@pytest.mark.parametrize("subject", sorted(MS9363_TABLE_I))
def test_ms9363_table_i_limits_match_the_reviewers_own_reading(library, subject):
    for name, (lo, hi) in MS9363_TABLE_I[subject].items():
        value = library.value(subject, name).value
        assert value.min == pytest.approx(lo, abs=1e-9), f"{subject}.{name} min"
        assert value.max == (None if hi is None else pytest.approx(hi, abs=1e-9)), (
            f"{subject}.{name} max"
        )


def test_ms9363_dash_09_and_10_differ_only_where_the_table_says_they_do(library):
    """-09 and -10 share G, H and S exactly and differ on A, B, C, D and mass.

    This is the row-mis-registration trap the event's own note calls out: the
    two rows are adjacent and three of their columns are identical, so reading
    the wrong row is invisible in G/H/S. Pinning both the sameness and the
    difference is what makes a slipped row detectable.
    """
    same = ("unslotted_height", "nut_height", "slot_width")
    for name in same:
        a = library.value("MS9363-09", name).value
        b = library.value("MS9363-10", name).value
        assert (a.min, a.max) == (b.min, b.max), name
    differ = ("width_across_flats", "width_across_corners_min", "countersink_dia", "chamfer_dia")
    for name in differ:
        a = library.value("MS9363-09", name).value
        b = library.value("MS9363-10", name).value
        assert (a.min, a.max) != (b.min, b.max), name
    assert library.value("MS9363-09", "approx_mass_lb_per_100").value.nominal == pytest.approx(0.37)
    assert library.value("MS9363-10", "approx_mass_lb_per_100").value.nominal == pytest.approx(0.51)


def test_ms9363_threads_read_off_table_i_column_T(library):
    assert library.value("MS9363-09", "thread").value.text == ".190-32 UNJF-3B"
    assert library.value("MS9363-10", "thread").value.text == ".250-28 UNJF-3B"


def test_ms9363_has_six_slots_on_both_dash_numbers(library):
    """The hex-face view carries "6 PLACES" on the slot position callout and
    "-K- 3 PLACES" on the slot-axis datum -- three axes, six slots. Counted six
    slots in the view directly at Matrix(2.2)."""
    for subject in ("MS9363-09", "MS9363-10"):
        assert library.value(subject, "slot_count").value.count == 6


def test_ms9363_slot_depth_is_H_minus_G_and_is_labelled_inferred(library):
    """Slot depth is not printed anywhere on either sheet. It is derived, and
    the library must say so rather than presenting it as a tabulated band."""
    for subject in ("MS9363-09", "MS9363-10"):
        depth = library.value(subject, "slot_depth").value
        H = library.value(subject, "nut_height").value
        G = library.value(subject, "unslotted_height").value
        assert depth.confidence == "inferred", subject
        assert depth.min == pytest.approx(H.min - G.max, abs=1e-9)
        assert depth.max == pytest.approx(H.max - G.min, abs=1e-9)


def test_ms9363_does_not_control_thread_start_to_castellation_spacing(library):
    """Sheet 2 requirement 10 is the ONLY slot-position control on the document:
    "OPPOSITE SLOTS SHALL COINCIDE WITHIN .005 AND SLOT AXIS SHALL BE WITHIN
    .005 OF THREAD PD AXIS". Nothing on either sheet relates a slot to the
    thread START. Verified by the reviewer against a Matrix(4.16) render of the
    full REQUIREMENTS block, requirements 1 through 11.

    This is the load-bearing absence for every cotter-retained joint in the
    repo, and it must stay an absence -- not quietly become a value.
    """
    names = [a["name"] for a in library.subject("MS9363").absences]
    assert "thread_start_to_castellation_spacing" in names
    for subject in ("MS9363-09", "MS9363-10"):
        per_dash = [a["name"] for a in library.subject(subject).absences]
        assert "thread_start_to_castellation_spacing" in per_dash, subject
        assert "thread_start_to_castellation_spacing" not in library.subject(subject).values


def test_ms9363_default_linear_tolerance_is_plus_minus_ten_thou(library):
    """Requirement 9, verbatim off the render. It is what makes H .178/.198
    read as .188 +/-.010 rather than an arbitrary band."""
    text = library.value("MS9363", "default_tolerances").value.text
    assert "+/-.010" in text and "angular" in text.lower()
    H = library.value("MS9363-09", "nut_height").value
    assert H.max - H.min == pytest.approx(0.020, abs=1e-9)


def test_ms9363_primary_material_spec_stays_unreadable(library):
    """Requirement 1 reads "... IN ACCORDANCE WITH AMS <blob> OR AMS 5737". The
    reviewer rendered the same token at the sheet's 300-dpi ceiling and could
    not resolve the blob either. It must not acquire a number."""
    unreadable = {u["name"] for u in library.subject("MS9363").unreadable}
    assert "material_spec_primary" in unreadable
    assert "material_spec_primary" not in library.subject("MS9363").values
    assert library.value("MS9363", "material_secondary").value.text == "AMS 5737"


# ---------------------------------------------------------------------------
# NAS6403-NAS6420 Rev 4 -- sheet 1 dimension tables, sheet 3 grip/length
# ---------------------------------------------------------------------------

# Sheet 1, BASIC NUMBER row, columns C | D Dia Unplated | E Dia Min | H | K Dia
# | M | P | R Rad | T (Ref) | TD, and the second table's U Max | W Min.
NAS_SHEET_1 = {
    "NAS6403U11D": {
        "head_across_flats": (0.367, 0.376),         # C    .376 / .367
        "shank_dia": (0.1890, 0.1895),               # D Dia Unplated
        "washer_face_dia_min": (0.335, None),        # E Dia Min
        "head_height": (0.110, 0.125),               # H    .125 / .110
        "lockwire_hole_dia": (0.046, 0.056),         # K Dia
        "cotter_hole_to_point": (0.154, 0.174),      # M    .174 / .154
        "cotter_hole_dia": (0.070, 0.080),           # P    .080 / .070
        "thread_major_dia_reduced": (0.1810, 0.1840),  # TD
        "head_across_corners_min": (0.410, None),    # W Min
        "point_chamfer_U_max": (None, 0.039),        # U Max
    },
    "NAS6404U13D": {
        "head_across_flats": (0.429, 0.439),
        "shank_dia": (0.2490, 0.2495),
        "washer_face_dia_min": (0.398, None),
        "head_height": (0.125, 0.140),
        "cotter_hole_to_point": (0.160, 0.180),      # M    .180 / .160
        "cotter_hole_dia": (0.076, 0.086),           # P, merged 6404/6405 cell
        "thread_major_dia_reduced": (0.2410, 0.2440),
        "head_across_corners_min": (0.480, None),
        "point_chamfer_U_max": (None, 0.045),
        "head_fillet_radius": (0.010, 0.020),        # R Rad, merged 6404/6405
    },
}


@pytest.mark.parametrize("subject", sorted(NAS_SHEET_1))
def test_nas6403_sheet_1_limits_match_the_reviewers_own_reading(library, subject):
    for name, (lo, hi) in NAS_SHEET_1[subject].items():
        value = library.value(subject, name).value
        assert value.min == (None if lo is None else pytest.approx(lo, abs=1e-9)), (
            f"{subject}.{name} min"
        )
        assert value.max == (None if hi is None else pytest.approx(hi, abs=1e-9)), (
            f"{subject}.{name} max"
        )


def test_nas6403_row_has_no_fillet_radius_because_the_cell_is_blank(library):
    """R Rad .020/.010 is a cell MERGED across the NAS6404 and NAS6405 rows; the
    NAS6403 row's R Rad cell is empty. Confirmed at Matrix(2.2). Reading the
    merged value up into NAS6403 is the exact mis-registration this pins
    against -- an absent value must stay absent."""
    assert "head_fillet_radius" not in library.subject("NAS6403U11D").values
    assert "head_fillet_radius" in library.subject("NAS6404U13D").values


def test_nas6403_unplated_shank_column_not_a_plated_one(library):
    """The D Dia block has three columns: Unplated .1895/.1890, Plated Before
    .1887/.1881, Plated After .1895/.1885. The "U" in NAS6403U11D selects the
    first. Citing "After" gives the same max and a min 0.5 thou low, which is
    silent; citing "Before" is 0.8 thou low on both."""
    d = library.value("NAS6403U11D", "shank_dia").value
    assert (d.min, d.max) == (pytest.approx(0.1890), pytest.approx(0.1895))
    assert d.min != pytest.approx(0.1885) and d.min != pytest.approx(0.1881)


# Sheet 3, "LENGTH +/-.015 (See Note Below)" against "Grip +/-.010".
# Row 11 -> grip .688, NAS6403 (.1900-32) length 1.011.
# Row 13 -> grip .812, NAS6404 (.2500-28) length 1.182.
NAS_SHEET_3 = {
    "NAS6403U11D": (0.688, 1.011, 0.323),
    "NAS6404U13D": (0.812, 1.182, 0.370),
}


@pytest.mark.parametrize("subject", sorted(NAS_SHEET_3))
def test_nas6403_grip_length_and_T_are_the_printed_cells(library, subject):
    grip_in, length_in, t_in = NAS_SHEET_3[subject]
    grip = library.value(subject, "grip").value
    length = library.value(subject, "length").value
    t_ref = library.value(subject, "T_ref").value

    assert grip.nominal == pytest.approx(grip_in, abs=1e-9)
    assert length.nominal == pytest.approx(length_in, abs=1e-9)
    assert t_ref.nominal == pytest.approx(t_in, abs=1e-9)

    # The tolerances are printed COLUMN HEADERS, not computed from limits.
    assert grip.plus_minus == pytest.approx(0.010, abs=1e-9)
    assert length.plus_minus == pytest.approx(0.015, abs=1e-9)
    assert grip.min is None and grip.max is None

    # Sheet 3's footnote: "Nominal length equals nominal grip plus 'T'".
    assert length.nominal - grip.nominal == pytest.approx(t_ref.nominal, abs=1e-9)

    # And the grip itself is the dash number times .0625, rounded to 3 places.
    dash = int(subject[len("NAS640X") : -1].lstrip("U"))
    assert round(dash * 0.0625, 3) == pytest.approx(grip_in, abs=1e-9)


def test_nas6403_thread_runout_is_an_absence_on_all_four_sheets(library):
    """Sheets 1-4 were re-read by the reviewer. Sheet 1 dimensions the bolt but
    carries no thread-length or run-out column; sheet 2's X and Y are locking-
    element regions (notes (g) and (h)), not thread length; sheet 3 is the
    grip/length table; sheet 4 is the RESTRICTED USAGE oversize-shank sheet.
    The transition from full shank to full thread is nowhere dimensioned.

    Slice 1 filled this hole with an uncited 1/16 in rule of thumb. It must
    stay a recorded absence naming the document that would close it."""
    family = {a["name"]: a for a in library.subject("NAS6403 thru NAS6420").absences}
    assert "thread_runout_length" in family
    assert "MIL-S-8879" in family["thread_runout_length"]["closed_by"]
    for subject in ("NAS6403U11D", "NAS6404U13D"):
        names = {a["name"] for a in library.subject(subject).absences}
        assert "thread_runout_length" in names, subject
        assert "thread_runout_length" not in library.subject(subject).values


def test_nas6403_sheet_5_is_missing_from_the_file(library):
    """Sheet 1's LIST OF CURRENT SHEETS names five sheets at revisions
    4/2/NEW/2/3; the PDF holds four pages. Verified by the reviewer directly:
    fitz reports page_count == 4 and the sheet-1 table lists 1..5."""
    meta = library.documents["NAS6403-NAS6420 Rev 4.pdf"]
    assert meta["sheets_named_by_the_document"] == [1, 2, 3, 4, 5]
    assert meta["sheets_present_in_the_file"] == [1, 2, 3, 4]
    assert meta["sheet_revisions_per_sheet_1_LIST_OF_CURRENT_SHEETS"] == {
        "1": "4", "2": "2", "3": "NEW", "4": "2", "5": "3",
    }


def test_nas6403_undefined_columns_J_and_N_were_not_extracted(library):
    """Sheet 1 prints J and N against every basic number and defines neither
    anywhere. N is additionally printed smallest-value-on-top (.18 over .20 for
    NAS6403), inverting every other two-value column on the sheet. Confirmed at
    Matrix(2.2). Extracting either would be a guess wearing a citation."""
    for subject in ("NAS6403U11D", "NAS6404U13D"):
        names = library.subject(subject).values.keys()
        assert not any(n.startswith(("J_", "N_")) for n in names), subject
        assert "column_J" not in names and "column_N" not in names


# ---------------------------------------------------------------------------
# JPS00094 Rev C -- text layer, quoted verbatim
# ---------------------------------------------------------------------------

# Pulled by the reviewer straight from page.get_text() on the pdf pages cited.
JPS_QUOTES = {
    ("JPS00094 5.5.3.a", "criterion", 15): (
        "The number of washers used on a fastener shall be limited to three: one "
        "washer under the head and two under the nut, or two under the head and one "
        "under the nut. Any identification mark on the washer used under the nut "
        "shall be placed opposite the face of the nut."
    ),
    ("JPS00094 5.5.4", "criterion", 15): (
        "All fastener connections which involve self-locking or plain nuts should "
        "have at least one thread of the bolt protruding through the nut and any "
        "locking element."
    ),
    ("JPS00094 5.5.5", "criterion", 15): (
        "The nut, nutplate, insert, part body, etc., shall not engage any incomplete "
        "threads of the bolt shank."
    ),
    ("JPS00094 5.7.6.a", "criterion", 17): (
        "Unless otherwise specified by the engineering drawing, cotter pins (split) "
        "shall conform to NASM24665 and this specification."
    ),
    ("JPS00094 5.9.7", "footnote_a", 19): (
        "Different nuts likely have different manufactured thread-start to "
        "castellation-hole spacing."
    ),
}


@pytest.mark.parametrize("key", sorted(JPS_QUOTES))
def test_jps00094_criteria_are_verbatim_and_correctly_addressed(library, key):
    subject, name, pdf_page = key
    value = library.value(subject, name).value
    assert value.text == JPS_QUOTES[key], subject
    assert value.at.pdf_page == pdf_page, f"{subject} pdf page"
    assert value.at.section == subject.split(" ", 1)[1], f"{subject} section"


def test_jps00094_5_9_7_is_quoted_with_the_footnote_marker_stripped_not_dropped(library):
    """The text layer runs the footnote marker into the word ("a different
    nut^a"). The quote must read as prose without the stray letter, and the
    footnote itself must survive as its own value rather than being swallowed."""
    criterion = library.value("JPS00094 5.9.7", "criterion").value.text
    assert "a different nut, and try again" in criterion
    assert "nuta" not in criterion
    assert library.value("JPS00094 5.9.7", "footnote_a").value.text


def test_the_washer_cap_is_three(library):
    """5.5.3.a's number, pulled out so a check can fold it. It is the arithmetic
    bound on 5.9.7's castellation-alignment remedy."""
    assert library.value("JPS00094 5.5.3.a", "washer_count_max").value.count == 3


# ---------------------------------------------------------------------------
# Cross-document consistency the reviewer checked by hand
# ---------------------------------------------------------------------------


def test_neither_the_slot_nor_the_bolt_hole_governs_the_cotter_pin_outright(library):
    """intake_queue.json rank 12 argues MS24665 is low value because "MS9363's
    slot at .073/.088 is wider than the hole, so the bolt hole governs".

    At worst case that is not true of either pair. The slot band and the hole
    band OVERLAP on both joints, so a slot at its minimum is narrower than a
    hole at its maximum and the slot is then the governing feature:

        MS9363-09 slot .073/.088  vs  NAS6403 hole .070/.080
        MS9363-10 slot .073/.088  vs  NAS6404 hole .076/.086

    The rank-12 CONCLUSION survives -- a .063 pin clears both minima -- but the
    stated reason does not, and this file exists to keep reasons honest. Pinned
    so that a stack cannot later lean on "the hole governs" as though a test
    had checked it.
    """
    for nut, bolt in (("MS9363-09", "NAS6403U11D"), ("MS9363-10", "NAS6404U13D")):
        slot = library.value(nut, "slot_width").value
        hole = library.value(bolt, "cotter_hole_dia").value
        assert slot.min < hole.max, (nut, bolt, "bands overlap; neither governs outright")
        assert slot.min > 0.063, (nut, "a .063 MS24665 pin still clears the slot")
        assert hole.min > 0.063, (bolt, "a .063 MS24665 pin still clears the hole")


def test_both_halves_of_the_joint_invoke_the_same_thread_standard(library):
    """NAS6403 sheet 1 invokes MIL-S-8879 for the bolt; MS9363 sheet 2
    requirement 2 invokes it for the nut. That is the intake queue's argument
    for promoting MIL-S-8879, so it should be checkable, not just asserted."""
    assert "MIL-S-8879" in library.value("NAS6403 thru NAS6420", "thread_form").value.text
    assert "MIL-S-8879" in library.value("MS9363", "thread_spec").value.text
    row = IntakeQueue.load(INTAKE_PATH).row("MIL-S-8879")
    assert row.in_pile is False


def test_every_intake_row_that_claims_the_pile_names_a_file_that_is_there(library):
    """`in_pile` is a human assertion about the MAIN checkout, which a worktree
    cannot see -- so this asserts the weaker invariant the repo CAN check: a row
    claiming the pile must name the filename, and a row not in the pile must
    not. The reviewer checked the filenames themselves against
    C:\\workspace\\tolstack\\data\\inbox\\specs\\ by hand."""
    for row in IntakeQueue.load(INTAKE_PATH).rows:
        if row.in_pile:
            assert row.pile_filename, row.document
        else:
            assert row.pile_filename is None, row.document


def test_the_documents_the_library_holds_are_exactly_the_ones_it_was_read_from(library):
    assert set(library.documents) == {
        "NAS6403-NAS6420 Rev 4.pdf",
        "MS9363 Rev C.pdf",
        "JPS00094 Process Specification — Installation of Bolts and Nuts.pdf",
        "NAS1151- NAS1158.PDF",
        "trelleborg_aerospace_gb_en.pdf",
    }


def test_the_hardware_entry_cross_check_is_value_for_value(library):
    """The seam demonstration: NAS6403U11D's inline numbers are now a
    cross-check. Re-derived here from the reviewer's own reading rather than
    from the library, so a library value that drifted would not drag the
    hardware entry along with it silently."""
    entries = json.loads(
        (REPO_ROOT / "docs" / "tolerance_stacks" / "hardware_entries.json").read_text(
            encoding="utf-8"
        )
    )["entries"]
    entry = next(e for e in entries if e["id"] == "NAS6403U11D")
    assert entry["values_status"] == "library"
    assert entry["library_ref"] == "spec_library:NAS6403U11D"
    dims = entry["dimensions_in"]
    assert dims["grip"] == pytest.approx(0.688, abs=1e-9)
    assert dims["length"] == pytest.approx(1.011, abs=1e-9)
    assert dims["T_ref"] == pytest.approx(0.323, abs=1e-9)

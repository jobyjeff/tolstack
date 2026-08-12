"""Value-level tests for the spec library: the event shapes, the fold, the queue.

Every number asserted below was read off a page render of a document in
``data/inbox/specs/`` during handoff ``spec_library_v0`` (2026-08-05) and is
quoted here **with the cell it came from**, so a reader checking this suite
against the PDF knows where to look. That is the same contract the stack tests
have with the 260729 workbook: the test file is the second copy of the reading,
and a transcription that drifts between the event JSON and here fails loudly.

The fixture events under ``tests/fixtures/spec_events/`` are synthetic and say
so in their own ``document_meta``. They exist because the committed log holds no
correction event -- re-reading every value the pitch_link session had
transcribed found no error -- and an untested correction path is exactly what
you do not want under the first real correction.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tolerance_stack import IntakeQueue, ParseEvent, build_library, load_events

REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = REPO_ROOT / "docs" / "spec_library" / "events"
INTAKE_PATH = REPO_ROOT / "docs" / "spec_library" / "intake_queue.json"
FIXTURE_EVENTS = Path(__file__).resolve().parent / "fixtures" / "spec_events"
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"

# Hand-written so a new event cannot be added without this list noticing --
# same guard as ALL_STACK_FILES in test_tolerance_stack.py.
ALL_EVENT_FILES = [
    "0001_nas6403_nas6420_rev4_agent_manual_v0.json",
    "0002_ms9363_rev_c_agent_manual_v0.json",
    "0003_jps00094_rev_c_agent_manual_v0.json",
]


@pytest.fixture(scope="module")
def library():
    return build_library(load_events(EVENTS_DIR))


@pytest.fixture(scope="module")
def queue():
    return IntakeQueue.load(INTAKE_PATH)


def test_the_event_file_list_is_complete():
    on_disk = sorted(p.name for p in EVENTS_DIR.glob("*.json"))
    assert on_disk == sorted(ALL_EVENT_FILES)


def test_the_library_rebuilds_from_the_event_log(library):
    assert library.events == [
        "20260805-nas6403-nas6420-rev4-agentmanual-v0",
        "20260805-ms9363-revc-agentmanual-v0",
        "20260805-jps00094-revc-agentmanual-v0",
    ]
    assert set(library.subjects) == {
        "NAS6403 thru NAS6420",
        "NAS6403U11D",
        "NAS6404U13D",
        "MS9363",
        "MS9363-09",
        "MS9363-10",
        "JPS00094 5.5.3.a",
        "JPS00094 5.5.4",
        "JPS00094 5.5.5",
        "JPS00094 5.9.7",
        "JPS00094 5.7.6.a",
    }


def test_every_event_names_a_document_that_is_in_the_pile():
    """The pile is gitignored and invisible from a worktree, so this checks the
    weaker thing it can: that the filename an event cites is one the intake
    queue also vouches for, or the document the queue's own rows point at."""
    queue = IntakeQueue.load(INTAKE_PATH)
    vouched = {row.pile_filename for row in queue.rows if row.pile_filename}
    documents = {ParseEvent.from_dict(json.loads(p.read_text(encoding="utf-8"))).document
                 for p in EVENTS_DIR.glob("*.json")}
    assert vouched <= documents  # everything the queue calls entered was read
    assert "MS9363 Rev C.pdf" in documents
    assert "NAS6403-NAS6420 Rev 4.pdf" in documents


# ---------------------------------------------------------------------------
# NAS6403 / NAS6404 -- the documents already consumed
# ---------------------------------------------------------------------------


def test_nas6403u11d_grip_carries_the_printed_column_header_as_its_tolerance(library):
    """NAS6403 sheet 3, grip dash row 11. The +/-.010 is the column header the
    pitch_link session found ("Grip +/-.010"), not a computed midpoint -- which
    is the distinction the SOP's "nominal is not the midpoint" turns on."""
    grip = library.value("NAS6403U11D", "grip").value
    assert grip.nominal == 0.688
    assert grip.plus_minus == 0.010
    assert grip.min is None and grip.max is None   # the source prints no limits
    assert (grip.at.sheet, grip.at.row, grip.at.column) == (3, "grip dash no. 11", "Grip +/-.010")
    assert grip.confidence == "traced"


def test_nas6403u11d_cotter_hole_position_is_traced_to_sheet_1_column_M(library):
    m = library.value("NAS6403U11D", "cotter_hole_to_point").value
    assert (m.max, m.min) == (0.174, 0.154)
    assert (m.at.sheet, m.at.row, m.at.column) == (1, "NAS6403", "M")
    assert m.at.callout == ".174 / .154"
    p = library.value("NAS6403U11D", "cotter_hole_dia").value
    assert (p.max, p.min) == (0.080, 0.070)
    assert (p.at.sheet, p.at.row, p.at.column) == (1, "NAS6403", "P")


def test_the_meaning_of_M_was_confirmed_by_a_second_reader(library):
    """The pitch_link session could only mark M's meaning as read off the
    figure and asked for a second reader; this event is that reader. The note
    has to say what was actually looked at, because "confirmed" without the
    method is worth nothing."""
    m = library.value("NAS6403U11D", "cotter_hole_to_point").value
    assert "CONFIRMED" in m.note
    assert "extension lines" in m.note and "point end face" in m.note


def test_nas6403u11d_shank_diameter_comes_from_the_unplated_column(library):
    """The "U" in the part number selects the column. Plated-before on the same
    row reads .1887/.1881 -- citing it is a silent 0.6 thou error that no
    downstream check would catch."""
    d = library.value("NAS6403U11D", "shank_dia").value
    assert (d.max, d.min) == (0.1895, 0.1890)
    assert d.at.column == "D Dia / Unplated"
    assert ".1887/.1881" in d.note


def test_nas6404u13d_is_the_row_that_was_free_all_along(library):
    """Intake queue row 9: same file as NAS6403, four rows down the sheet-3
    table. Grip .812 / length 1.182 / M .180-.160 / P .086-.076."""
    assert library.value("NAS6404U13D", "grip").value.nominal == 0.812
    assert library.value("NAS6404U13D", "grip").value.plus_minus == 0.010
    length = library.value("NAS6404U13D", "length").value
    assert length.nominal == 1.182
    assert length.plus_minus == 0.015
    assert (length.at.sheet, length.at.row, length.at.column) == (
        3, "grip dash no. 13", "NAS6404 .2500-28",
    )
    m = library.value("NAS6404U13D", "cotter_hole_to_point").value
    assert (m.max, m.min) == (0.180, 0.160)
    p = library.value("NAS6404U13D", "cotter_hole_dia").value
    assert (p.max, p.min) == (0.086, 0.076)
    assert "MERGED" in p.note   # the cell spans the NAS6404 and NAS6405 rows


@pytest.mark.parametrize(
    "subject, grip, length, t_ref",
    [("NAS6403U11D", 0.688, 1.011, 0.323), ("NAS6404U13D", 0.812, 1.182, 0.370)],
)
def test_nominal_length_is_nominal_grip_plus_T_exactly(library, subject, grip, length, t_ref):
    """Sheet 3's own footnote: "Nominal length equals nominal grip plus T".
    New in this reading -- the pitch_link session inferred the relation from
    F5's arithmetic and did not have the sentence. It is the document text
    behind that finding: grip and length are NOT independent at nominal, so a
    fold that varies both overstates the spread."""
    assert library.value(subject, "grip").value.nominal == grip
    assert library.value(subject, "length").value.nominal == length
    assert library.value(subject, "T_ref").value.nominal == pytest.approx(t_ref, abs=1e-9)
    assert length - grip == pytest.approx(t_ref, abs=1e-9)
    rule = library.value("NAS6403 thru NAS6420", "nominal_length_rule").value
    assert "Nominal length equals nominal grip plus" in rule.text


def test_the_part_number_decode_settles_the_joint_from_the_part_number_alone(library):
    code = library.value("NAS6403 thru NAS6420", "part_number_code").value
    assert 'Add "D" after dash number for drilled shank.' in code.text
    assert 'Add "U" after basic part number for unplated bolts.' in code.text
    assert code.at.note == "CODE block" and code.at.sheet == 2
    increment = library.value("NAS6403 thru NAS6420", "grip_increment").value
    assert increment.nominal == 0.0625
    assert 11 * 0.0625 == pytest.approx(0.6875)   # -> .688 tabulated
    assert 13 * 0.0625 == pytest.approx(0.8125)   # -> .812 tabulated


def test_the_grip_definition_is_recorded_because_a_length_needs_its_endpoints(library):
    grip_def = library.value("NAS6403 thru NAS6420", "grip_definition").value
    assert grip_def.text == (
        "Grip-length of bolts shall be measured from the underside of head to "
        "the end of the full cylindrical portion of the shank."
    )
    assert grip_def.at.note == "note (a)"


def test_thread_runout_is_recorded_as_an_absence_on_both_bolts(library):
    """Absences are the point: the SOP's gap discipline consumes them, and a
    recorded absence is what stops the next agent re-opening the same PDF."""
    for subject in ("NAS6403U11D", "NAS6404U13D", "NAS6403 thru NAS6420"):
        entry = library.subject(subject)
        assert "thread_runout_length" not in entry.values
        absence = next(a for a in entry.absences if a["name"] == "thread_runout_length")
        assert absence["closed_by"].startswith("MIL-S-8879")
        assert absence["from_document"] == "NAS6403-NAS6420 Rev 4.pdf"


# ---------------------------------------------------------------------------
# MS9363 -- intake rank 1, in the pile since 2026-08-05
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("subject", ["MS9363-09", "MS9363-10"])
def test_ms9363_nut_height_and_slot_geometry(library, subject):
    """TABLE I, sheet 1. -09 and -10 carry IDENTICAL G, H and S cells, which is
    why a row mis-registration is invisible in exactly the three columns this
    document was acquired for."""
    h = library.value(subject, "nut_height").value
    assert (h.nominal, h.min, h.max) == (0.188, 0.178, 0.198)
    assert (h.at.column, h.at.callout) == ("H", "178- 198")
    g = library.value(subject, "unslotted_height").value
    assert (g.nominal, g.min, g.max) == (0.094, 0.084, 0.104)
    assert g.at.column == "G"
    s = library.value(subject, "slot_width").value
    assert (s.min, s.max) == (0.073, 0.088)
    assert library.value(subject, "slot_count").value.count == 6


@pytest.mark.parametrize("subject", ["MS9363-09", "MS9363-10"])
def test_ms9363_slot_depth_is_H_minus_G_and_says_so(library, subject):
    """Slot depth is not printed. It is H (whole nut, end face to datum -J-)
    minus G (datum -J- to the slot root), and G's meaning is a figure reading,
    so the whole derivation rests on that crop. Marked `inferred`, with the
    non-independence of H and G stated -- both are dimensioned from the same
    datum face, so the worst-case band is an upper bound on the real spread."""
    depth = library.value(subject, "slot_depth").value
    h = library.value(subject, "nut_height").value
    g = library.value(subject, "unslotted_height").value
    assert depth.confidence == "inferred"
    assert depth.nominal == pytest.approx(h.nominal - g.nominal, abs=1e-9)
    assert depth.min == pytest.approx(h.min - g.max, abs=1e-9)
    assert depth.max == pytest.approx(h.max - g.min, abs=1e-9)
    assert depth.at.column == "H minus G"
    assert "independen" in depth.note.lower()   # the caveat is stated, not implied
    assert g.confidence == "traced"
    assert "slot root" in g.note.lower()   # G's meaning is a figure reading, and says so


def test_the_six_slots_index_every_sixty_degrees(library):
    """Three independent readings agree, which is what makes the count usable:
    the printed "6 PLACES" on the slot position callout, the "-K- 3 PLACES"
    datum labelling (three slot axes = three opposite pairs), and counting six
    slots in the hex-face view."""
    count = library.value("MS9363-09", "slot_count").value
    assert count.count == 6
    assert count.at.figure == "hex-face view"
    assert "6 PLACES" in count.at.callout and "3 PLACES" in count.at.callout
    assert 360 / count.count == 60


def test_the_castellation_phase_is_an_absence_that_no_document_closes(library):
    """The headline finding of reading MS9363, and the one that changes what
    the repo should do next. MS9363 requirement 10 relates slots to each other
    and to the thread PD axis; nothing relates a slot to the thread START. So
    the quantity the pitch_link lesson called "the governing check on every
    cotter-retained joint here" is not merely absent from this document -- it
    is uncontrolled, and `closed_by` must NOT name a document to go and find."""
    for subject in ("MS9363", "MS9363-09", "MS9363-10"):
        absence = next(
            a for a in library.subject(subject).absences
            if a["name"] == "thread_start_to_castellation_spacing"
        )
        assert absence["closed_by"].startswith("nothing")
        assert "JPS00094 5.9.7" in absence["closed_by"]
    footnote = library.value("JPS00094 5.9.7", "footnote_a").value
    assert footnote.text == (
        "Different nuts likely have different manufactured thread-start to "
        "castellation-hole spacing."
    )


def test_the_illegible_material_spec_is_recorded_with_the_crop_not_guessed(library):
    """An illegible photocopy is an ACQUISITION gap, not a licence to infer.
    The record carries what was tried and the scan's own resolution ceiling, so
    the next reader does not re-derive that renders above it are interpolation."""
    unreadable = next(
        u for u in library.subject("MS9363").unreadable if u["name"] == "material_spec_primary"
    )
    assert "NOT GUESSED" in unreadable["what_it_looks_like"]
    assert unreadable["crop"]["pdf_page"] == 2
    assert unreadable["crop"]["rect"] == [315, 178, 380, 189]
    assert "4.16" in unreadable["ceiling"]
    assert "assist.dla.mil" in unreadable["resolution"]
    # and the value it could not read is NOT in values under a hedged name
    assert "material_spec_primary" not in library.subject("MS9363").values


def test_ms9363_invokes_the_same_thread_standard_as_the_bolt(library):
    """Why MIL-S-8879 was promoted in the intake queue: one acquisition closes
    the thread form on both halves of every cotter-retained joint here."""
    nut = library.value("MS9363", "thread_spec").value
    bolt = library.value("NAS6403 thru NAS6420", "thread_form").value
    assert "MIL-S-8879" in nut.text and "MIL-S-8879" in bolt.text
    assert nut.at.note == "requirement 2"


# ---------------------------------------------------------------------------
# JPS00094 -- criteria, not dimensions
# ---------------------------------------------------------------------------


def test_the_shank_out_criterion_is_quoted_verbatim(library):
    criterion = library.value("JPS00094 5.5.5", "criterion").value
    assert criterion.text == (
        "The nut, nutplate, insert, part body, etc., shall not engage any "
        "incomplete threads of the bolt shank."
    )
    assert (criterion.at.section, criterion.at.pdf_page) == ("5.5.5", 15)
    assert criterion.at.sheet == "3 of 14"   # the document's own page numbering
    absence = library.subject("JPS00094 5.5.5").absences[0]
    assert absence["name"] == "incomplete_thread_length"
    assert absence["closed_by"].startswith("MIL-S-8879")


def test_the_washer_remedy_is_capped_at_three_and_the_number_is_foldable(library):
    assert library.value("JPS00094 5.5.3.a", "washer_count_max").value.count == 3
    text = library.value("JPS00094 5.5.3.a", "criterion").value.text
    assert "shall be limited to three" in text


def test_the_protrusion_criterion_records_that_it_is_a_should_not_a_shall(library):
    criterion = library.value("JPS00094 5.5.4", "criterion").value
    assert "should have at least one thread of the bolt protruding" in criterion.text
    assert '"should"' in criterion.note and '"shall"' in criterion.note


def test_the_cotter_pin_prefix_disagreement_is_now_a_query_not_a_footnote(library):
    criterion = library.value("JPS00094 5.7.6.a", "criterion").value
    assert "NASM24665" in criterion.text
    assert "MS24665" in criterion.note   # what 217755's parts list calls it


# ---------------------------------------------------------------------------
# The fold
# ---------------------------------------------------------------------------


def test_a_correction_event_wins_the_fold_and_keeps_what_it_displaced():
    """The whole reason parses are events. The correction overlays field by
    field -- it does not restate the document -- and the value it displaced
    stays visible with the reason it lost."""
    lib = build_library(load_events(FIXTURE_EVENTS))
    resolved = lib.value("FIXTURE-0001-09", "nut_height")
    assert resolved.value.nominal == 0.161                    # the correction's
    assert resolved.event_id == "fixture-0002-correction"
    assert len(resolved.superseded) == 1
    displaced = resolved.superseded[0]
    assert displaced["value"]["nominal"] == 0.188             # the first read's
    assert displaced["from_event"] == "fixture-0001-full"
    assert displaced["corrected_by"] == "fixture-0002-correction"
    assert "registered one row low" in displaced["reason"]

    # untouched values survive the correction unchanged, still crediting seq 1
    slot = lib.value("FIXTURE-0001-09", "slot_width")
    assert slot.value.max == 0.088
    assert slot.event_id == "fixture-0001-full"
    assert slot.superseded == []


def test_a_correction_that_supplies_a_value_withdraws_the_absence_it_fills():
    """The case that is easy to get wrong: promoting an absence to a value has
    to stop the absence being reported, or the library says both at once."""
    lib = build_library(load_events(FIXTURE_EVENTS))
    entry = lib.subject("FIXTURE-0001-09")
    assert entry.values["slot_phase"].value.nominal == 60.0
    assert [a["name"] for a in entry.absences] == []
    # the unreadable, which nothing corrected, is still reported
    assert [u["name"] for u in entry.unreadable] == ["material_spec"]


def _event(**kw):
    base = {
        "schema": "joby.tolstack/spec-parse/v0",
        "event_id": "e1",
        "seq": 1,
        "mode": "full",
        "document": "D.pdf",
        "parsed_at": "2026-08-05",
        "parser": {"name": "agent-manual", "version": "v0"},
        "entries": [],
    }
    base.update(kw)
    return ParseEvent.from_dict(base)


def _entry(subject="S", **values):
    return {
        "subject": subject,
        "subject_kind": "part_number",
        "values": {k: {"nominal": v, "at": {"sheet": 1}} for k, v in values.items()},
    }


def test_a_correction_must_name_what_it_supersedes_and_why():
    with pytest.raises(ValueError, match="supersedes and why"):
        _event(mode="correction", supersedes="e0")
    with pytest.raises(ValueError, match="supersedes and why"):
        _event(mode="correction", reason="because")


def test_two_events_cannot_share_a_seq(tmp_path):
    for name, event_id in (("a.json", "ea"), ("b.json", "eb")):
        (tmp_path / name).write_text(
            json.dumps({
                "schema": "joby.tolstack/spec-parse/v0", "event_id": event_id, "seq": 7,
                "mode": "full", "document": "D.pdf", "parsed_at": "x",
                "parser": {"name": "agent-manual", "version": "v0"}, "entries": [],
            }),
            encoding="utf-8",
        )
    with pytest.raises(ValueError, match="share seq 7"):
        load_events(tmp_path)


def test_a_subject_supplied_by_two_documents_is_an_error_not_a_merge():
    """Silently preferring one file's number over another's is the laundering
    the SOP bans. Two documents describing the same subject is a real editorial
    decision and has to be made by a person, in an event."""
    a = _event(event_id="a", seq=1, document="A.pdf", entries=[_entry(h=1.0)])
    b = _event(event_id="b", seq=2, document="B.pdf", entries=[_entry(h=2.0)])
    with pytest.raises(ValueError, match="supplied by both"):
        build_library([a, b])


def test_a_correction_cannot_invent_a_subject_no_earlier_event_established():
    first = _event(event_id="a", seq=1, entries=[_entry("S", h=1.0)])
    bad = _event(
        event_id="b", seq=2, mode="correction", supersedes="a", reason="r",
        entries=[_entry("OTHER", h=2.0)],
    )
    with pytest.raises(ValueError, match="no earlier event"):
        build_library([first, bad])


def test_a_full_event_replaces_everything_the_document_previously_said():
    """A re-read is not a patch. If parser v1 reads the same document and does
    not report a value v0 reported, the library must stop reporting it."""
    first = _event(event_id="a", seq=1, entries=[_entry("S", h=1.0, g=2.0)])
    reread = _event(event_id="b", seq=2, entries=[_entry("S", h=1.5)])
    lib = build_library([first, reread])
    assert lib.value("S", "h").value.nominal == 1.5
    assert "g" not in lib.subject("S").values


def test_the_shapes_reject_a_value_that_carries_no_value():
    with pytest.raises(ValueError, match="carries no value at all"):
        _event(entries=[{"subject": "S", "subject_kind": "part_number",
                         "values": {"x": {"at": {"sheet": 1}, "confidence": "traced"}}}])


def test_the_shapes_reject_inverted_limits_and_an_unknown_confidence():
    with pytest.raises(ValueError, match="min .* > max"):
        _event(entries=[{"subject": "S", "subject_kind": "part_number",
                         "values": {"x": {"min": 2.0, "max": 1.0, "at": {}}}}])
    with pytest.raises(ValueError, match="confidence"):
        _event(entries=[{"subject": "S", "subject_kind": "part_number",
                         "values": {"x": {"nominal": 1.0, "at": {}, "confidence": "vibes"}}}])


def test_an_event_cannot_name_a_subject_twice():
    with pytest.raises(ValueError, match="names a subject twice"):
        _event(entries=[_entry("S", h=1.0), _entry("S", g=2.0)])


def test_the_wrong_schema_is_refused():
    with pytest.raises(ValueError, match="expected schema"):
        ParseEvent.from_dict({"schema": "joby.tolstack/something_else/v0"})


# ---------------------------------------------------------------------------
# The intake queue
# ---------------------------------------------------------------------------


def test_the_queue_holds_every_row_the_pitch_link_lesson_ranked(queue):
    assert [row.rank for row in queue.rows] == list(range(1, 13))
    assert queue.row("MS9363").rank == 1
    assert queue.row("MIL-S-8879").kind == "MIL standard"


def test_the_intake_state_is_derived_and_ms9363_reads_in_pile_then_entered(queue, library):
    """The definition of done for this handoff, in one assertion. MS9363
    arrived in the pile on 2026-08-05 and was read the same day; NAS1149,
    MIL-S-8879 and MS21299 are still not in the pile at all."""
    state = queue.state(library)
    assert state["MS9363"] == "entered"
    assert state["NAS6404"] == "entered"
    assert state["NAS1149"] == "missing"
    assert state["MIL-S-8879"] == "missing"
    assert state["MS21299"] == "missing"
    assert queue.row("MS9363").in_pile is True          # the "in pile" half
    assert queue.row("NAS1149").in_pile is False


def test_a_row_cannot_claim_entered_while_the_library_lacks_what_it_promised(queue, library):
    """Status is derived, not stored, precisely so this cannot drift. NAS1149's
    row promises to close the NAS1149V0332 subject; the library has no such
    subject, so no amount of editing the queue can make it read `entered`."""
    row = queue.row("NAS1149")
    assert row.closes == ["NAS1149V0332"]
    assert not library.has_subject("NAS1149V0332")
    assert queue.status(row, library) == "missing"


def test_the_queue_answers_what_still_blocks_a_named_stack(queue, library):
    """The query the lesson could not be: "what document closes which gap"."""
    blocking = [row.document for row in queue.blocking(library, stack="vpa")]
    assert "NAS6404" not in blocking                     # closed 2026-08-05
    assert "MS21299" in blocking and "MIL-S-8879" in blocking
    assert queue.blocking(library, stack="pitch_link")[0].document == (
        "Pitch-link assembly drawing"
    )   # rank 2, and now the top open item for that stack


def test_a_document_in_the_pile_that_no_event_has_read_still_reads_in_pile(library):
    """The third state has to be reachable, or `in pile` is decoration. The
    real queue has none right now -- both piled rows are entered -- so this
    builds one."""
    from tolerance_stack import IntakeRow

    queue = IntakeQueue(rows=[IntakeRow(
        rank=1, document="JPS00078", kind="Joby process spec", in_pile=True,
        pile_filename="JPS00078 Installation of Bearings and Bushings.pdf",
        closes=["JPS00078 5.1"], unblocks="bearing/bushing installation practice",
    )])
    assert queue.state(library) == {"JPS00078": "in pile"}


# ---------------------------------------------------------------------------
# The consumer seam (deliverable 4)
# ---------------------------------------------------------------------------


def test_the_nas6403_hardware_entry_defers_to_the_library(library):
    """The seam the slice-1 lesson designed and this handoff demonstrates on
    exactly one entry: `library_ref` filled, `values_status` moved from
    `inline` to `library`, and the inline numbers demoted to a CROSS-CHECK --
    which is this test. Every assertion below re-derives an inline number from
    the library; a drift in either direction fails here.

    Nothing on the stack side changed. That is the point."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["id"] == "NAS6403U11D")
    assert entry["values_status"] == "library"
    assert entry["library_ref"] == "spec_library:NAS6403U11D"

    subject = entry["library_ref"].split(":", 1)[1]
    inline = entry["dimensions_in"]
    value = lambda name: library.value(subject, name).value   # noqa: E731

    assert inline["grip"] == value("grip").nominal
    assert inline["grip_tol"] == value("grip").plus_minus
    assert inline["length"] == value("length").nominal
    assert inline["length_tol"] == value("length").plus_minus
    assert inline["T_ref"] == value("T_ref").nominal
    assert inline["cotter_hole_to_point_max"] == value("cotter_hole_to_point").max
    assert inline["cotter_hole_to_point_min"] == value("cotter_hole_to_point").min
    assert inline["cotter_hole_dia_max"] == value("cotter_hole_dia").max
    assert inline["cotter_hole_dia_min"] == value("cotter_hole_dia").min
    assert inline["shank_dia_max"] == value("shank_dia").max
    assert inline["shank_dia_min"] == value("shank_dia").min
    assert inline["thread_major_dia_max"] == value("thread_major_dia_reduced").max
    assert inline["thread_major_dia_min"] == value("thread_major_dia_reduced").min
    assert inline["head_height_max"] == value("head_height").max
    assert inline["head_height_min"] == value("head_height").min
    assert inline["washer_face_dia_min"] == value("washer_face_dia_min").min
    assert inline["point_chamfer_max"] == value("point_chamfer_U_max").max


def test_only_the_one_entry_was_promoted(library):
    """The rest of the backfill belongs to handoff sop_edits_apply. A quiet
    sweep here would collide with it and would also claim library coverage the
    library does not have -- there is no MS9363-09 hardware-entry promotion
    yet even though the library now holds MS9363-09, because that entry's
    `used_by` is empty and no stack consumes it."""
    data = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    promoted = [e["id"] for e in data["entries"] if e["library_ref"] is not None]
    assert promoted == ["NAS6403U11D"]


def test_the_projection_can_be_wiped_and_rebuilt(tmp_path):
    """Forge's data convention: projections are derived and disposable. This
    also pins that a rebuild is a pure function of the event log.

    ``provenance`` is the one block that is *not* a function of the event log --
    it names the tree and the instant -- so the equality is asserted with it
    removed. That the rest of the file is unchanged by stamping is a separate
    claim about bytes and is checked separately, by
    ``test_the_stamp_is_additive_and_the_rest_of_the_file_is_untouched``.
    """
    from tolerance_stack import rebuild

    out = rebuild(events_dir=EVENTS_DIR, out_dir=tmp_path / "spec_library")
    first = out.read_text(encoding="utf-8")
    out.unlink()
    again = rebuild(events_dir=EVENTS_DIR, out_dir=tmp_path / "spec_library")
    second = again.read_text(encoding="utf-8")

    built = json.loads(first)
    assert list(built)[:2] == ["schema", "provenance"], (
        "provenance goes second, under schema -- it is the first thing a reader "
        "of a 60 kB derived file needs"
    )
    assert without_provenance(second) == without_provenance(first)
    assert built["schema"] == "joby.tolstack/spec_library/v0"
    grip = built["subjects"]["NAS6403U11D"]["values"]["grip"]
    assert grip["nominal"] == 0.688
    assert grip["at"]["row"] == "grip dash no. 11"
    assert grip["from_document"] == "NAS6403-NAS6420 Rev 4.pdf"


# ---------------------------------------------------------------------------
# The shared-artifact half: --data-root, the stamp, and the ancestry gate
#
# `data/projections/spec_library/` is one directory shared by every live
# worktree, and this writer was the third member of that class -- the only one
# that could not be pointed at the main checkout and the only one whose output
# carried no provenance at all
# (ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer).
# ---------------------------------------------------------------------------


def without_provenance(text: str) -> dict:
    """The projection minus its stamp -- the part that IS a function of the log."""
    data = json.loads(text)
    data.pop("provenance", None)
    return data


def run_git(cwd: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    assert proc.returncode == 0, f"git {' '.join(args)}: {proc.stderr}"
    return proc.stdout.strip()


def dangling_commit(repo: Path) -> str:
    """A real commit in this repo that is **not** an ancestor of HEAD.

    ``commit-tree`` with no parent writes a loose object and touches no ref, no
    index and no working tree -- so the real repo is unchanged, but the sha is
    one ``git cat-file`` finds and ``merge-base --is-ancestor`` rejects. Same
    trick as ``tests/test_projection_provenance.py``, kept local rather than
    imported: that module belongs to the viewer projections and this one to the
    library, and a shared helper across the two is a merge conflict waiting for
    the next concurrent handoff.
    """
    tree = run_git(repo, "rev-parse", "HEAD^{tree}")
    return run_git(repo, "commit-tree", tree, "-m", "throwaway tree for a gate test")


needs_git = pytest.mark.skipif(shutil.which("git") is None, reason="git is not on PATH")


@needs_git
def test_the_stamp_names_the_tree_that_built_the_library(tmp_path):
    """Branch, sha, and the events dir resolved ABSOLUTE.

    Absolute is the whole point: ``docs/spec_library/events`` is the same 26
    characters in every worktree in existence and therefore names no tree at all
    -- the trap `viewer_projection_provenance` found in ``results.json``'s
    repo-relative ``stacks_dir``. And the key is ``events_dir``, not
    ``stacks_dir``: this projection is not built from a stacks dir, and a
    provenance field that misnames its own subject is one a reader stops
    trusting.
    """
    from tolerance_stack import rebuild

    out = rebuild(events_dir=EVENTS_DIR, out_dir=tmp_path / "spec_library")
    block = json.loads(out.read_text(encoding="utf-8"))["provenance"]

    assert block["built_by"] == "tolerance_stack/spec_library.py"
    assert block["events_dir"] == EVENTS_DIR.resolve().as_posix()
    assert Path(block["events_dir"]).is_absolute()
    assert "stacks_dir" not in block
    assert len(block["head_sha"]) == 40
    assert block["branch"]
    assert block["built_at"].endswith("+00:00")
    assert block["repo_root"] == REPO_ROOT.resolve().as_posix()
    assert block["dirty"] in (True, False)
    # There is exactly ONE timestamp. results.json carries a top-level `built_at`
    # beside `provenance.built_at` only because consumers already read it by that
    # name; library.json never had one and has no such consumer, so a second copy
    # would be a field that can only ever disagree with the one next to it.
    assert "built_at" not in json.loads(out.read_text(encoding="utf-8"))


@needs_git
def test_the_rebuild_is_REFUSED_from_a_tree_that_does_not_contain_the_last_one(tmp_path):
    """The definition of done: ``main()`` refuses, and leaves the file alone.

    Not the predicate -- the entry point. A gate whose predicate is right and
    whose caller warns and carries on is occurrence 1 of
    ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection
    again. Driven through ``--data-root``, which is also the flag whose absence
    meant a worktree's rebuild could only ever land in its own throwaway
    ``data/``.
    """
    from tolerance_stack.spec_library import main

    data_root = tmp_path / "data"
    out_path = data_root / "projections" / "spec_library" / "library.json"
    argv = ["--data-root", str(data_root)]

    assert main(argv) == 0
    assert out_path.exists(), "a worktree can now write to a data root it was given"

    # Re-stamp what is on disk as the work of a tree this one does not contain,
    # exactly as a neighbouring worktree's build would have left it.
    projection = json.loads(out_path.read_text(encoding="utf-8"))
    projection["provenance"]["head_sha"] = dangling_commit(REPO_ROOT)
    projection["provenance"]["branch"] = "handoff/somebody_else"
    projection["marker"] = "written by the other worktree"
    out_path.write_text(json.dumps(projection), encoding="utf-8")
    before = out_path.read_bytes()

    assert main(argv) == 3
    # Refusing means not writing. A refusal that still overwrites is the bug.
    assert out_path.read_bytes() == before

    # ...and the override gets through, because a deliberate rebuild from an
    # older tree is a real thing that has to remain possible.
    assert main(argv + ["--allow-older-tree"]) == 0
    assert json.loads(out_path.read_text(encoding="utf-8")).get("marker") is None


@needs_git
def test_the_stamp_is_additive_and_the_rest_of_the_file_is_untouched(tmp_path):
    """The stamped file is the old one plus a block, and nothing else moved.

    The definition of done asked for this against the copy sitting in the main
    checkout's ``data/``, which is gitignored and therefore absent from every
    worktree -- so the comparison is made against the exact bytes the *previous*
    writer produced, reconstructed here as ``json.dumps(as_dict(), indent=2)``,
    which is the whole of what ``rebuild()`` wrote before this handoff. Equal
    means: same keys, same order, same numbers, same separators. Run against the
    real 2026-08-05 file in the main checkout as well, once, by hand
    (``git diff`` is no use on a gitignored path) -- identical.
    """
    from tolerance_stack import build_library, load_events, rebuild

    as_it_was = json.dumps(build_library(load_events(EVENTS_DIR)).as_dict(), indent=2) + "\n"

    out = rebuild(events_dir=EVENTS_DIR, out_dir=tmp_path / "spec_library")
    stamped = json.loads(out.read_text(encoding="utf-8"))
    assert stamped.pop("provenance")["schema"].endswith("/projection_provenance/v0")
    assert json.dumps(stamped, indent=2) + "\n" == as_it_was


@needs_git
def test_rebuilding_over_this_trees_own_build_is_allowed(tmp_path):
    """The gate must not refuse the ordinary case: same tree, twice."""
    from tolerance_stack import rebuild

    out_dir = tmp_path / "spec_library"
    first = rebuild(events_dir=EVENTS_DIR, out_dir=out_dir)
    second = rebuild(events_dir=EVENTS_DIR, out_dir=out_dir)
    assert without_provenance(second.read_text(encoding="utf-8")) == without_provenance(
        first.read_text(encoding="utf-8")
    )


@needs_git
def test_an_unstamped_library_is_overwritten_because_there_is_nothing_to_compare(tmp_path):
    """Every ``library.json`` in existence before this handoff is unstamped.

    Including the one sitting in the main checkout since 2026-08-05. The gate has
    to overwrite those -- refusing would mean nobody could ever rebuild again --
    and the first stamped rebuild is what starts the chain.
    """
    from tolerance_stack import rebuild

    out_dir = tmp_path / "spec_library"
    out_dir.mkdir(parents=True)
    (out_dir / "library.json").write_text(
        json.dumps({"schema": "joby.tolstack/spec_library/v0", "subjects": {}}),
        encoding="utf-8",
    )
    out = rebuild(events_dir=EVENTS_DIR, out_dir=out_dir)
    assert json.loads(out.read_text(encoding="utf-8"))["provenance"]["branch"]

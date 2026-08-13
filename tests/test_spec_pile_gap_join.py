"""Value-level tests for the spec-pile gap join (`debug_report_spec_pile_gaps.py`).

Two things in that tool can be wrong in a way nobody notices, and both have
already happened in this repo *without* the tool:

* **the range parse.** ``NAS6404`` sits inside ``NAS6403-NAS6420 Rev 4.pdf`` and
  a substring match does not find it. That miss cost seven days and ten
  citations (``ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps``).
  So the parse is pinned on real filenames from the pile, from both sides:
  in-range, out-of-range, and the near-misses that must NOT parse as ranges.
* **the worktree skip.** ``data/inbox/specs/`` is gitignored, so a worktree sees
  an empty directory. A tool that answers "nothing in the pile closes anything"
  from a worktree reproduces the exact false negative it was written to catch.
  ``resolve_pile`` must return *skip*, never *empty*, and say where the pile is.

Handoff: spec_pile_gap_join (2026-08-13).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.debug_report_spec_pile_gaps import (
    EXTRA_COVERAGE, KNOWN_NON_MATCHES, SKIP_BANNER, Designator, Gap,
    PileDocument, coverage_of, designators_in, hardware_gaps, join,
    main_checkout, open_questions, parse_coverage, render, resolve_pile,
    stack_gaps,
)

REPO_ROOT = Path(__file__).resolve().parent.parent

# Filenames copied verbatim from `data/inbox/specs/` (main checkout, gitignored).
# They are test *data*, not a directory listing, so these run in a worktree.
NAS_RANGE = "NAS6403-NAS6420 Rev 4.pdf"
NAS_THRU = "NAS1121 THRU 1128_REV_14.pdf"
MS9363 = "MS9363 Rev C.pdf"
JB_NAS77 = "JB_NAS77.pdf"
RBC = "RBC - Plain bearings (NAS77 p92).pdf"
JPS = "JPS00094 Process Specification - Installation of Bolts and Nuts.pdf"


def covers(filename: str, text: str) -> bool:
    """Does ``filename`` cover the single designator written in ``text``?"""
    (wanted,) = designators_in(text)
    return any(c.contains(wanted) for c in parse_coverage(filename))


# --------------------------------------------------------------------------- #
# the range parse -- the whole point of the tool                              #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("designator", ["NAS6403", "NAS6404", "NAS6411", "NAS6420"])
def test_a_dash_range_filename_covers_every_basic_number_inside_it(designator):
    """The seven-day miss, from the closing side.

    ``NAS6404U13D``'s gap said "NAS6404 absent" while this file was in the pile.
    Both endpoints are included -- it is a closed interval, and NAS6403 (the low
    end, which a naive `startswith` would find) and NAS6420 (the high end, which
    nothing would) have to behave the same way.
    """
    assert covers(NAS_RANGE, designator)


@pytest.mark.parametrize("designator", ["NAS6402", "NAS6421", "NAS6440", "NAS640"])
def test_a_dash_range_filename_covers_nothing_outside_it(designator):
    """The other half. A range that matches too much is worse than no range:
    it manufactures a candidate, someone opens the file, and the tool loses the
    reader it needed for the true rows."""
    assert not covers(NAS_RANGE, designator)


def test_the_range_does_not_leak_across_prefixes():
    """6404 is inside 6403..6420 numerically and is a different standard."""
    assert not covers(NAS_RANGE, "MS6404")
    assert not covers(NAS_RANGE, "NASM6404")


def test_a_thru_range_parses_the_same_way_with_the_prefix_printed_once():
    """`NAS1121 THRU 1128_REV_14.pdf` -- the pile's other range, written in a
    different dialect. The second endpoint carries no prefix at all."""
    assert covers(NAS_THRU, "NAS1125")
    assert covers(NAS_THRU, "NAS1121") and covers(NAS_THRU, "NAS1128")
    assert not covers(NAS_THRU, "NAS1129")
    assert not covers(NAS_THRU, "NAS1120")


def test_a_single_designator_filename_covers_exactly_itself():
    assert covers(MS9363, "MS9363")
    assert covers(MS9363, "MS9363-09")      # the dash number is not the standard
    assert covers(MS9363, "MS9363-10")
    assert not covers(MS9363, "MS9364")
    assert not covers(MS9363, "MS936")


def test_zero_padding_does_not_split_a_designator_in_two():
    """`JPS00094` and `JPS94` are one document. Equality is on the number, and
    the printed width only comes back out in the report."""
    assert covers(JPS, "JPS00094")
    assert covers(JPS, "JPS94")
    assert Designator("JPS", 94, 5) == Designator("JPS", 94, 2)
    assert str(Designator("JPS", 94, 5)) == "JPS00094"
    assert str(Designator("MIL-S", 8879, 4)) == "MIL-S-8879"


# --- malformed / not-a-range filenames -------------------------------------- #

@pytest.mark.parametrize("filename", [
    "desktop.ini",
    "README.md",
    "AC_43.13-1B_w-chg1.pdf",
    "216231 A.1 jcsA2-1 pth-46652 9-29-2025.pdf",
    "213456 A.1_In Work_V1_08-29-2025.pdf",
    "",
    ".pdf",
])
def test_a_filename_with_no_standard_in_it_parses_to_no_standard(filename):
    """Most of the pile is drawings, process specs and junk. Parsing to nothing
    is the correct answer and must not raise -- the tool walks the whole
    directory, so one unparseable name cannot be allowed to take the run down."""
    assert [c for c in parse_coverage(filename) if c.prefix] == []


def test_a_dash_number_in_a_filename_is_not_read_as_a_range():
    """`MS9363-09.pdf` would be one dash number, not MS9363 through MS9(3)63-09.
    The digit-count guard is what makes this fall out."""
    assert [str(c) for c in parse_coverage("MS9363-09 Rev C.pdf")] == ["MS9363"]
    assert not covers("MS9363-09 Rev C.pdf", "MS9400")


def test_a_revision_suffix_and_a_year_are_not_read_as_a_range():
    """`MIL-STD-889D-2021-Release (1).pdf`: 889 and 2021 are adjacent numbers
    with a dash between them and are three and four digits, so the digit-count
    guard rejects the span. Without it this file would claim to cover more than
    a thousand MIL-STDs."""
    covered = parse_coverage("MIL-STD-889D-2021-Release (1).pdf")
    assert [str(c) for c in covered if c.prefix == "MIL-STD"] == ["MIL-STD-889"]
    assert not covers("MIL-STD-889D-2021-Release (1).pdf", "MIL-STD-1500")


def test_a_backwards_range_is_not_a_range():
    assert not covers("NAS6420-NAS6403 Rev 4.pdf", "NAS6410")


def test_a_workbook_stem_is_not_read_as_a_joby_drawing_number():
    """Joby drawing numbers and this repo's workbook stems are both six digits.
    The 21xxxx restriction is what separates them; `260729_sample_tol_stack` is
    named in nearly every gap note in the repo."""
    assert designators_in("260729_sample_tol_stack.xlsx") == []
    assert designators_in("260209_Hub Bearing Fits.xlsx") == []
    assert designators_in("the 217755 parts list") == [Designator("", 217755, 6)]


# --------------------------------------------------------------------------- #
# reading designators out of gap prose                                        #
# --------------------------------------------------------------------------- #

def test_a_range_named_in_prose_is_one_document_not_two_standards():
    """Gap notes cite the answering file by name. Splitting
    `NAS6403-NAS6420 Rev 4.pdf` into two designators put a NAS6420 candidate row
    in front of a reader for a gap that has nothing to do with NAS6420."""
    named = designators_in("closed by NAS6403-NAS6420 Rev 4.pdf sheet 3")
    assert named == [Designator("NAS", 6403, 4)]


def test_a_dash_number_in_prose_reads_as_its_basic_number():
    assert designators_in("MS9363-09 retains the joint") == [Designator("MS", 9363, 4)]
    assert designators_in("NAS6404U13D") == [Designator("NAS", 6404, 4)]
    assert designators_in("threads per MIL-S-8879") == [Designator("MIL-S", 8879, 4)]


def test_prose_naming_nothing_yields_nothing():
    assert designators_in("no bearing balloon in DETAIL B") == []
    assert designators_in("") == []
    assert designators_in(None) == []


# --------------------------------------------------------------------------- #
# the worktree skip -- 'I could not look' must not read as 'nothing found'    #
# --------------------------------------------------------------------------- #

def _fake_worktree(tmp_path: Path, main: Path) -> Path:
    wt = tmp_path / "tolstack-worktrees" / "slug"
    wt.mkdir(parents=True)
    (wt / ".git").write_text(f"gitdir: {main}/.git/worktrees/slug\n", encoding="utf-8")
    (wt / "data" / "inbox" / "specs").mkdir(parents=True)      # tracked skeleton only
    return wt


def test_a_worktree_skips_loudly_and_names_the_main_checkout(tmp_path):
    """The failure this repo would otherwise ship: every worktree agent runs the
    tool, sees an empty `data/inbox/specs/`, and is told authoritatively that
    the pile closes nothing.

    The skip is asserted three ways, because "it printed something" is not the
    property that matters: no pile directory comes back, the message names the
    main checkout, and it hands over a command that would actually work.
    """
    main = tmp_path / "tolstack"
    (main / ".git").mkdir(parents=True)
    wt = _fake_worktree(tmp_path, main)

    pile, message = resolve_pile(wt)
    assert pile is None, "a worktree must not hand back a pile directory at all"
    assert SKIP_BANNER in message
    assert str(main) in message
    assert "--pile" in message
    assert "no candidate" not in message.lower().replace("having no\n", "having ")


def test_the_main_checkout_is_recognised_and_its_pile_used(tmp_path):
    main = tmp_path / "tolstack"
    (main / ".git").mkdir(parents=True)
    (main / "data" / "inbox" / "specs").mkdir(parents=True)

    assert main_checkout(main) is None                 # not a linked worktree
    pile, message = resolve_pile(main)
    assert pile == main / "data" / "inbox" / "specs"
    assert SKIP_BANNER not in message


def test_an_explicit_pile_override_beats_the_worktree_skip(tmp_path):
    """The escape hatch, and the reason it is safe: it is explicit. A worktree
    agent may point the tool at the main checkout's pile by saying so; what it
    may not do is get an empty answer without noticing."""
    main = tmp_path / "tolstack"
    (main / ".git").mkdir(parents=True)
    real_pile = main / "data" / "inbox" / "specs"
    real_pile.mkdir(parents=True)
    wt = _fake_worktree(tmp_path, main)

    pile, message = resolve_pile(wt, override=real_pile)
    assert pile == real_pile
    assert SKIP_BANNER not in message


def test_an_override_that_does_not_exist_skips_rather_than_reporting_empty(tmp_path):
    pile, message = resolve_pile(tmp_path, override=tmp_path / "nope")
    assert pile is None
    assert SKIP_BANNER in message


def test_this_very_checkout_resolves_to_a_skip_or_to_a_real_pile():
    """Whichever side the suite is running on, the answer is never 'empty'.

    In a worktree this asserts the skip; in the main checkout it asserts the
    pile is really there. Both are the same claim: the tool never silently
    reports on a directory it cannot see.
    """
    pile, message = resolve_pile(REPO_ROOT)
    if pile is None:
        assert SKIP_BANNER in message
    else:
        assert pile.is_dir()


# --------------------------------------------------------------------------- #
# the join                                                                    #
# --------------------------------------------------------------------------- #

def _gap(gid: str, *names: str) -> Gap:
    return Gap(id=gid, where="test", confidence="untraced",
               designators=tuple(designators_in(" ".join(names))), summary=gid)


def _doc(name: str) -> PileDocument:
    return PileDocument(name, tuple(coverage_of(name)))


# --------------------------------------------------------------------------- #
# coverage a filename does not admit to                                       #
# --------------------------------------------------------------------------- #

def test_a_catalogue_covers_the_standard_on_the_page_nobody_named_it_after():
    """The second false negative in this family. `RBC - Plain bearings (NAS77
    p92).pdf` carries NAS76 on page 91, and the report listed NAS76 as "nothing
    in the pile" on the afternoon somebody read it out of that very file."""
    assert not any(c.contains(Designator("NAS", 76)) for c in parse_coverage(RBC))
    assert any(c.contains(Designator("NAS", 76)) for c in coverage_of(RBC))


def test_a_catalogue_whose_filename_names_no_standard_still_covers_what_it_holds():
    web = "RBC_Aerospace_Plain_Bearings_Web.pdf"
    assert [c for c in parse_coverage(web) if c.prefix] == []
    covered = coverage_of(web)
    assert any(c.contains(Designator("NAS", 76)) for c in covered)
    assert any(c.contains(Designator("NAS", 77)) for c in covered)


def test_every_extra_coverage_row_says_which_page_it_was_read_on():
    """A row here is a claim that somebody opened the file, and it is the only
    evidence a later reader gets. One designator per row, so an entry cannot
    quietly widen; a page, so the claim is checkable."""
    for filename, rows in EXTRA_COVERAGE.items():
        assert filename.strip() == filename and filename
        for text, why in rows:
            assert len(designators_in(text)) == 1, f"{filename}: {text!r}"
            assert "page" in why.lower(), f"{filename}/{text} names no page"
            assert "202" in why, f"{filename}/{text} does not say when it was read"


def test_the_join_finds_the_citation_that_sat_open_for_seven_days():
    """The regression, end to end: the gap says NAS6404, the pile holds a file
    whose name never contains that string, and the join has to connect them."""
    result = join([_gap("hardware_entries.json:NAS6404U13D", "NAS6404")],
                  [_doc(NAS_RANGE), _doc(MS9363)])
    assert [(h.gap.id, str(h.designator), h.document.name) for h in result.hits] == [
        ("hardware_entries.json:NAS6404U13D", "NAS6404", NAS_RANGE)
    ]
    assert result.absent == {}


def test_a_gap_with_no_document_in_the_pile_lands_in_the_intake_queue():
    """The other half of the answer. "Still nothing here for NAS1149" is what a
    spec-intake priority list is made of, and a tool that only printed matches
    would throw it away."""
    gap = _gap("hardware_entries.json:NAS1149V0332", "NAS1149")
    result = join([gap], [_doc(NAS_RANGE)])
    assert result.hits == []
    assert result.absent == {Designator("NAS", 1149): [gap]}


def test_a_gap_naming_no_document_is_reported_separately_from_one_with_no_match():
    """`spherical_bearing` names no standard at all. Folding it into the intake
    queue would invent a document to go and buy."""
    gap = _gap("tan_link_to_pitch_plate:spherical_bearing", "no balloon in DETAIL B")
    result = join([gap], [_doc(NAS_RANGE)])
    assert result.silent == [gap] and result.hits == [] and result.absent == {}


def test_an_allowlisted_pair_is_reported_as_checked_and_never_as_a_candidate():
    """The caveat that keeps this a reporter and not yet a check: NAS6403 IS in
    the pile, `thread_transition`'s gap DOES name it, and NAS6403 does not
    dimension the thread run-out. A row that reads as closable here is a demand
    for a re-citation that would be wrong."""
    gap = _gap("tan_link_to_pitch_plate:thread_transition", "NAS6403 sheet 1")
    result = join([gap], [_doc(NAS_RANGE)])
    assert result.hits == []
    assert [(h.gap.id, str(h.designator)) for h in result.checked] == [
        ("tan_link_to_pitch_plate:thread_transition", "NAS6403")
    ]
    assert result.checked[0].allowlisted.startswith("NAS6403 does NOT dimension")


# --------------------------------------------------------------------------- #
# the allowlist cannot rot                                                    #
# --------------------------------------------------------------------------- #

def test_the_allowlist_has_no_dead_entries():
    """An allowlist is a list of suppressions, so a stale one silently unguards
    a row -- the same failure shape as `test_the_workbook_allowlist_has_no_dead_entries`
    in test_tolerance_stack.py. Every key must still name a live gap, and that
    gap must still name that designator; otherwise the entry is either a typo or
    a decision whose subject has moved on.
    """
    named = {}
    for gap in open_questions():
        named[gap.id] = {str(d) for d in gap.designators}
    dead = []
    for gap_id, designator in KNOWN_NON_MATCHES:
        if gap_id not in named:
            dead.append(f"{gap_id!r} is not an open question any more")
        elif designator not in named[gap_id]:
            dead.append(f"{gap_id} no longer names {designator}")
    assert dead == [], (
        "KNOWN_NON_MATCHES in tests/debug_report_spec_pile_gaps.py has entries "
        "that no longer suppress anything:\n" + "\n".join(f"  {d}" for d in dead)
    )


def test_every_allowlist_reason_is_an_argument_and_not_a_shrug():
    """The entry has to carry the reading that proves it, because the next agent
    will be deciding whether to re-open the row on the strength of this string
    alone."""
    for key, reason in KNOWN_NON_MATCHES.items():
        assert len(reason) > 120, f"{key} is allowlisted without a reason"
        assert "202" in reason, f"{key}'s reason does not say when it was decided"


# --------------------------------------------------------------------------- #
# the collectors, against the real files                                      #
# --------------------------------------------------------------------------- #

def test_the_collectors_pick_up_exactly_the_untraced_and_inferred_instances():
    """The gap side is derived, not hand-listed, so this pins that the derivation
    agrees with the same rule read straight off the JSON."""
    stacks = REPO_ROOT / "docs" / "tolerance_stacks"
    expected = set()
    for path in stacks.glob("stack_*.json"):
        stack = json.loads(path.read_text(encoding="utf-8"))
        for element in stack["elements"]:
            if element["source_ref"]["confidence"] in ("untraced", "inferred"):
                expected.add(f"{stack['id']}:{element['id']}")
    assert {g.id for g in stack_gaps()} == expected

    entries = json.loads((stacks / "hardware_entries.json").read_text(encoding="utf-8"))
    expected = {
        f"hardware_entries.json:{e['id']}" for e in entries["entries"]
        if (e.get("values_source") or {}).get("confidence") != "traced"
    }
    assert {g.id for g in hardware_gaps()} == expected


def test_a_not_transcribed_entry_counts_as_an_open_question():
    """`values_source: null` is the strongest form of open question, not an
    absent one -- MS9363-09 is the entry the whole issue was filed over."""
    ids = {g.id for g in hardware_gaps()}
    assert "hardware_entries.json:MS9363-09" in ids
    assert "hardware_entries.json:MS9363-10" in ids


def test_the_report_renders_every_section_even_when_a_section_is_empty():
    """An empty section is a finding ("the backlog is clear"), and a report that
    dropped it would read as a shorter report rather than as an answer."""
    text = render(join([], []), "header")
    for heading in ("1. CANDIDATES", "2. CHECKED, NOT CLOSABLE",
                    "3. NO CANDIDATE", "4. NAMES NO DOCUMENT"):
        assert heading in text
    assert text.count("*(none)*") >= 4

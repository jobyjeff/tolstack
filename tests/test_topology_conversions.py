"""The linear-stack-conversions acid tests: three more L1-shaped proofs.

Handoff ``linear_stack_conversions`` (2026-09-08) re-expresses three more
reviewed, committed linear stacks as topologies --
``pitch_link_to_pitch_plate``, ``rotor_fastener_length``,
``tan_link_to_pitch_plate_take2`` -- the same claim
``tests/test_topology.py``'s L1 section makes about
``vpa_output_to_pitch_plate``: every edge is a ``dimension_ref`` into the
stack it re-expresses, so a study's fold is not a second, independently
maintained arithmetic path, it is that stack's own numbers walked through a
graph. Two things are pinned per conversion, for the reason ``test_topology.py``
pins them for L1: the totals must match **exactly** (no ``pytest.approx``),
and the topology must carry no copied value, or the first assertion would be
comparing a number against itself.

``tan_link_to_pitch_plate`` (take 1) is **not** converted -- its six checks
reference named paths in a way ``docs/DAG_TOPOLOGY.md``'s "A study, in
outline" section fences (deliverable 4 of handoff ``topology_schema_v1``, its
own lesson). See ``docs/sessions/lessons/LESSONS_20260908_linear_stack_conversions.md``.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as TB  # noqa: E402
import build_viewer_projection as VB  # noqa: E402

from tolerance_stack import load_stack  # noqa: E402
from tolerance_stack.topology import (  # noqa: E402
    check_study,
    load_study,
    load_topology,
    summarize,
)

TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
VIEWER_TOPOLOGY_JS = REPO_ROOT / "apps" / "viewer" / "topology.js"


# --------------------------------------------------------------------------- #
# 1. every converted check, reproduced exactly                               #
# --------------------------------------------------------------------------- #

#: ``(topology stem, stack stem, study stem, check_id, equivalent_to substring)``.
#: One row per authored study `checks` entry across the three conversions.
CONVERTED_CHECKS = (
    ("pitch_link_to_pitch_plate", "pitch_link_to_pitch_plate",
     "study_pitch_link_shank_out", "shank_out__11_sourced_only"),
    ("pitch_link_to_pitch_plate", "pitch_link_to_pitch_plate",
     "study_pitch_link_cotter_hole_clearance", "cotter_hole_clear_of_sourced_stack"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u2h", "grip_budget__u2h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u3h", "grip_budget__u3h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u4h", "grip_budget__u4h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u5h", "grip_budget__u5h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u6h", "grip_budget__u6h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u7h", "grip_budget__u7h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u8h", "grip_budget__u8h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u9h", "grip_budget__u9h"),
    ("rotor_fastener_length", "rotor_fastener_length",
     "study_rotor_fastener_grip_u10h", "grip_budget__u10h"),
    ("tan_link_to_pitch_plate_take2", "tan_link_to_pitch_plate_take2",
     "study_tan_link_take2_worst_case_protrusion", "worst_case_protrusion"),
)


def _topology(stem: str):
    return load_topology(TOPOLOGIES_DIR / f"topology_{stem}.json")


def _stack(stem: str):
    return load_stack(STACKS_DIR / f"stack_{stem}.json")


def _study(stem: str):
    return load_study(TOPOLOGIES_DIR / f"{stem}.json")


@pytest.mark.parametrize(
    "topology_stem, stack_stem, study_stem, check_id", CONVERTED_CHECKS,
    ids=[f"{row[3]}" for row in CONVERTED_CHECKS],
)
def test_a_converted_check_folds_to_the_stacks_own_published_check(
        topology_stem, stack_stem, study_stem, check_id):
    """The acid test, once per converted check: every field, exactly equal.

    Exact equality, not ``pytest.approx``, for the same reason
    ``test_topology.py``'s L1 proof uses it: both sides reach ``fold()`` with
    the same float objects (the topology resolves its dimensions out of the
    very stack file being compared against), and every study's transform here
    is the identity, so nothing legitimately introduces rounding.
    """
    topology = _topology(topology_stem)
    study = _study(study_stem)
    stack = _stack(stack_stem)

    computed = check_study(topology, study, check_id)
    published = stack.check(check_id)

    assert computed.interval.as_dict() == published.interval.as_dict(), (
        f"{study_stem}.json's check {check_id!r} no longer folds to the "
        f"numbers stack_{stack_stem}.json publishes for it. Either the "
        f"topology's structure changed (an edge's orientation, the selection, "
        f"a transform), or the stack's values did -- the topology REFERENCES "
        f"those values, so a stack edit legitimately moves both sides "
        f"together; check which side moved before editing either.")
    assert computed.verdict == published.verdict
    assert computed.criterion == published.criterion
    assert computed.complete == published.complete
    assert computed.excluded_terms == published.excluded_terms


def test_the_pitch_link_thread_region_cross_check_reproduces_its_path():
    """The one converted quantity with no check: path `thread_region_T`.

    `study_pitch_link_thread_region_t.json` carries no `checks` entry --
    the referenced stack has none over this path either, only the path
    itself -- so this pins the study's own fold against `StackDefinition.path`
    instead of against `StackDefinition.check`.
    """
    topology = _topology("pitch_link_to_pitch_plate")
    study = _study("study_pitch_link_thread_region_t")
    stack = _stack("pitch_link_to_pitch_plate")

    computed = summarize(topology, study).interval
    published = stack.path("thread_region_T")
    assert computed.as_dict() == published.as_dict()


# --------------------------------------------------------------------------- #
# 2. no copied values                                                         #
# --------------------------------------------------------------------------- #

#: ``{topology stem: stack stem}`` -- every edge in the topology either
#: references this exact stack file or carries no dimension at all (derived).
CONVERTED_TOPOLOGIES = {
    "pitch_link_to_pitch_plate": "pitch_link_to_pitch_plate",
    "rotor_fastener_length": "rotor_fastener_length",
    "tan_link_to_pitch_plate_take2": "tan_link_to_pitch_plate_take2",
}


@pytest.mark.parametrize("topology_stem, stack_stem",
                          CONVERTED_TOPOLOGIES.items(),
                          ids=list(CONVERTED_TOPOLOGIES))
def test_a_converted_topology_copies_no_value(topology_stem, stack_stem):
    """The guarantee behind every acid test above: no inline `dimension`.

    Without this, someone inlining the values would leave the check-folding
    test above green while the two files were free to drift apart on the
    next stack edit -- the pinned number would be pinning a copy against
    itself, exactly the failure `test_topology.py`'s own L1 no-copy test
    guards against.
    """
    path = TOPOLOGIES_DIR / f"topology_{topology_stem}.json"
    expected_stack_path = f"docs/tolerance_stacks/stack_{stack_stem}.json"
    raw = json.loads(path.read_text(encoding="utf-8"))

    for edge in raw["edges"]:
        assert "dimension" not in edge, (
            f"edge {edge['id']!r} in {path.name} carries an inline dimension. "
            f"Every value must be a `dimension_ref` into the stack it "
            f"re-expresses, or the value-level test compares a number "
            f"against itself.")
        if "dimension_ref" not in edge:
            continue      # a derived edge -- the quantity a study computes
        assert edge["dimension_ref"]["stack"] == expected_stack_path

    # And the resolved dimensions really are the stack's own, citation
    # included -- not merely a `dimension_ref` pointing at the right file.
    topology = load_topology(path)
    stack = load_stack(REPO_ROOT / expected_stack_path)
    for edge in topology.edges:
        if edge.derived:
            continue
        element = stack.element(edge.dimension.id)
        assert edge.dimension.source_ref == element.source_ref
        assert edge.dimension.role == element.role
        assert (edge.dimension.min, edge.dimension.max, edge.dimension.nominal) == (
            element.min, element.max, element.nominal)


# --------------------------------------------------------------------------- #
# 3. tan_link_to_pitch_plate (take 1) gets no topology, and no nav row        #
# --------------------------------------------------------------------------- #

def test_tan_link_to_pitch_plate_take_1_has_no_topology():
    """The fenced verdict, checked rather than only stated in the lesson.

    `docs/sessions/lessons/LESSONS_20260908_topology_schema_v1.md` found that
    this stack's checks mix a `path` term with individually-signed elements,
    which `docs/DAG_TOPOLOGY.md` fences rather than builds a topology
    equivalent for. This asserts the fence actually held: no
    `topology_tan_link_to_pitch_plate.json` (without `_take2`) exists.

    Since handoff ``viewer_nav_wedge_and_classic_retirement`` (2026-09-15) the
    take-1 document is also off the viewer's nav rail -- superseded by take 2,
    kept on disk as history. The document staying is what keeps this test from
    being vacuous, and ``VA.SUPERSEDED_STACKS`` (paired below) is what keeps
    "superseded" from meaning "quietly deleted".
    """
    assert not (TOPOLOGIES_DIR / "topology_tan_link_to_pitch_plate.json").exists()
    assert (STACKS_DIR / "stack_tan_link_to_pitch_plate.json").exists(), (
        "the take-1 stack document must still be on disk -- it is the source "
        "take 2 was read against, and this test would be vacuous without it")


# --------------------------------------------------------------------------- #
# 4. what the nav dropped, and what a reader loses by it: nothing             #
# --------------------------------------------------------------------------- #
#
# ``viewer_nav_wedge_and_classic_retirement`` (2026-09-15) removed the nested
# "classic view" row every topology carried for the stack it re-expresses.
# Jeff's review: "Why is this still here? I had you completely delete that
# page, and now it's sneaking back into this page."
#
# That row was kept alive for a reason, and the reason is a checkable claim
# rather than a judgement: the elements table was the only place a stack's
# verdicts, gaps and excluded terms could be read
# (``LESSONS_20260904_viewer_consolidation.md`` section 1) until
# ``viewer_study_verdicts_and_gaps`` put all of it on the graph. So this
# section pins the claim the removal RESTS on -- every statement the table made
# about a covered stack is on its topology too. If a later edit to either
# builder breaks that, the nav row was load-bearing after all, and this fails
# rather than a reader silently losing a gap list.


@pytest.fixture(scope="module")
def projections() -> tuple[dict, dict]:
    """The two viewer projections, built from the committed documents.

    Built rather than read from ``data/projections/viewer/``: that directory is
    gitignored, exists only in the main checkout and is shared by every
    worktree, so a test reading it would be testing whichever tree last ran the
    scripts (``test_topology_projection.py``'s own fixture, same reason).
    """
    provenance = {
        "schema": "joby.tolerance_stack/projection_provenance/v0",
        "built_at": "2026-09-15T00:00:00+00:00",
        "built_by": "tests/test_topology_conversions.py",
        "branch": "test", "head_sha": "0" * 40, "dirty": False,
    }
    stacks = VB.build(STACKS_DIR, STACKS_DIR / "hardware_entries.json",
                      provenance=provenance)
    topologies = TB.build(TOPOLOGIES_DIR, provenance=provenance)
    return stacks, topologies


def covered_pairs(projections: tuple[dict, dict]) -> list[tuple[dict, dict]]:
    """``(stack projection, topology projection)`` for every covered stack.

    Covered is read exactly the way the viewer reads it
    (``VA.stacksCoveredByTopology``, apps/viewer/topology.js): an edge that
    re-expresses a stack element carries ``crop_key.stack``, and that IS the
    linkage -- no schema field says "this stack has a topology".
    """
    stacks, topologies = projections
    by_id = {s["id"]: s for s in stacks["stacks"]}
    pairs = []
    for topology in topologies["topologies"]:
        seen = []
        for edge in topology.get("edges", []):
            stack_id = (edge.get("crop_key") or {}).get("stack")
            if stack_id and stack_id not in seen:
                seen.append(stack_id)
        for stack_id in seen:
            assert stack_id in by_id, (
                f"{topology['id']} names stack {stack_id!r} in a crop_key and "
                f"no stack projection has that id")
            pairs.append((by_id[stack_id], topology))
    return pairs


def test_a_stack_is_covered_by_at_most_one_topology(projections):
    """Anti-vacuity, and the assumption every test below quantifies over."""
    pairs = covered_pairs(projections)
    assert len(pairs) >= 4, (
        f"expected the four live conversions, found {len(pairs)} -- if a "
        f"conversion was removed, the removal is what needs reviewing")
    ids = [stack["id"] for stack, _ in pairs]
    assert len(ids) == len(set(ids)), f"a stack covered twice over: {ids}"


def test_every_gap_a_covered_stack_states_is_stated_by_its_topology(projections):
    """The gap list, which the elements table used to be the only home for.

    Compared on the gap ``text`` -- the sentence a reader actually reads. The
    topology carries MORE (one row per unverified or zero-width edge, which a
    stack states as a chip on the row instead), and that is fine; what must not
    happen is a transcription note reaching only the table.
    """
    for stack, topology in covered_pairs(projections):
        assert stack.get("gaps"), (
            f"{stack['id']} states no gaps at all -- this comparison would be "
            f"vacuous, so either the stack lost its gap list or the builder did")
        theirs = {gap["text"] for gap in topology.get("gaps", [])}
        missing = [gap for gap in stack.get("gaps", [])
                   if gap["text"] not in theirs]
        assert not missing, (
            f"{stack['id']} states {len(missing)} gap(s) its topology "
            f"{topology['id']} does not, and the nav no longer offers the "
            f"elements table that stated them:\n" +
            "\n".join(f"  [{g['kind']}] {g['text'][:120]}" for g in missing))


def test_every_check_a_covered_stack_publishes_is_published_by_its_topology(
        projections):
    """The verdict, its criterion and what the chain left out, per check.

    Four fields rather than the whole dict: the two projections wrap a check in
    different envelopes (a stack's is per-path, a topology's per-study), and
    what a reader must not lose is *which* check, *what it required*, *whether
    it passed* and *what was excluded from the answer* -- the last because an
    unqualified verdict on a chain knowingly short a term is the exact lie this
    repo exists to prevent.
    """
    def identity(check: dict) -> tuple:
        return (check.get("label"), check.get("verdict"), check.get("criterion"),
                tuple(check.get("excluded_terms") or ()))

    for stack, topology in covered_pairs(projections):
        assert stack.get("checks"), (
            f"{stack['id']} publishes no checks at all -- a covered stack with "
            f"nothing to compare makes this test vacuous")
        theirs = {
            identity(check)
            for study in topology.get("studies", [])
            for check in (study.get("checks") or [])
        }
        missing = [check for check in stack.get("checks", [])
                   if identity(check) not in theirs]
        assert not missing, (
            f"{stack['id']} publishes {len(missing)} check(s) no study of "
            f"{topology['id']} publishes:\n" +
            "\n".join(f"  {c.get('label')} ({c.get('verdict')})"
                       for c in missing))


def test_every_missing_tolerance_a_covered_stack_flags_is_a_gap_row(projections):
    """The zero-width warnings, which the table drew as a dashed row.

    The graph says it in words instead (``no_tolerance_recorded``, rendered as
    "no tolerance recorded"), so the two counts must agree -- a stack flagging
    two bands against a topology listing one is a reader losing one.
    """
    for stack, topology in covered_pairs(projections):
        rows = [gap for gap in topology.get("gaps", [])
                if gap["kind"] == "no_tolerance_recorded"]
        assert len(rows) == stack["zero_width_count"], (
            f"{stack['id']} flags {stack['zero_width_count']} element(s) with "
            f"no tolerance recorded; {topology['id']} lists {len(rows)} gap "
            f"row(s) for them")


def superseded_stacks() -> dict:
    """``VA.SUPERSEDED_STACKS`` (apps/viewer/topology.js), key -> value.

    Read out of the JS rather than restated here: a copy of the table in this
    file would agree with itself forever.
    """
    source = VIEWER_TOPOLOGY_JS.read_text(encoding="utf-8")
    match = re.search(r"VA\.SUPERSEDED_STACKS\s*=\s*\{(.*?)\};", source, re.S)
    assert match, (
        "no `VA.SUPERSEDED_STACKS = {` table in apps/viewer/topology.js -- if "
        "it was renamed, this pairing is meaningless until the name here is "
        "updated")
    body = re.sub(r"//[^\n]*", "", match.group(1))
    pairs = re.findall(r"""["']?([A-Za-z0-9_]+)["']?\s*:\s*["']([^"']+)["']""",
                       body)
    assert pairs, (
        "the table parsed as empty -- an empty table agrees with everything")
    return dict(pairs)


def test_every_superseded_stack_the_viewer_hides_is_real_and_so_is_its_successor():
    """What "superseded" is allowed to mean: replaced, not deleted.

    A row vanishing from the nav is cheap to write and hard to notice, so the
    table that does it names the replacement, and this checks the whole claim
    against the documents: the hidden stack is still committed (history is
    kept), it really has no topology (or hiding it would hide a graph too), and
    the artifact named as its successor really exists in both forms.
    """
    for hidden, successor in superseded_stacks().items():
        assert (STACKS_DIR / f"stack_{hidden}.json").exists(), (
            f"the viewer hides stack {hidden!r} as superseded, but no "
            f"stack_{hidden}.json is committed -- hiding a document that is "
            f"gone is hiding nothing, and the table is stale")
        assert not (TOPOLOGIES_DIR / f"topology_{hidden}.json").exists(), (
            f"{hidden!r} is hidden from the nav as superseded, yet it HAS a "
            f"topology -- hiding it would drop a graph from the page")
        assert (STACKS_DIR / f"stack_{successor}.json").exists(), (
            f"{hidden!r} is hidden in favour of {successor!r}, which is not a "
            f"committed stack")
        assert (TOPOLOGIES_DIR / f"topology_{successor}.json").exists(), (
            f"{hidden!r} is hidden in favour of {successor!r}, which has no "
            f"topology -- the reader would be left with neither")

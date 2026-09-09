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
from pathlib import Path

import pytest

from tolerance_stack import load_stack
from tolerance_stack.topology import check_study, load_study, load_topology, summarize

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"


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
# 3. tan_link_to_pitch_plate (take 1) stays classic-rendered                  #
# --------------------------------------------------------------------------- #

def test_tan_link_to_pitch_plate_take_1_has_no_topology():
    """The fenced verdict, checked rather than only stated in the lesson.

    `docs/sessions/lessons/LESSONS_20260908_topology_schema_v1.md` found that
    this stack's checks mix a `path` term with individually-signed elements,
    which `docs/DAG_TOPOLOGY.md` fences rather than builds a topology
    equivalent for. This asserts the fence actually held: no
    `topology_tan_link_to_pitch_plate.json` (without `_take2`) exists.
    """
    assert not (TOPOLOGIES_DIR / "topology_tan_link_to_pitch_plate.json").exists()
    assert (STACKS_DIR / "stack_tan_link_to_pitch_plate.json").exists(), (
        "the take-1 stack itself must still be the classic-rendered source "
        "of truth -- this test would be vacuous if it had been removed")

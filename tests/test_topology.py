"""The topology archetype: the L1 value proof, the traversal, and the guards.

Structure of this module, and what each part is for:

1. **The L1 value proof.** ``study_vpa_output_shank_out`` must fold to the
   *identical* numbers ``stack_vpa_output_to_pitch_plate.json``'s own
   ``worst_case_shank_out`` check publishes -- field for field, exactly, not to a
   tolerance. That is the whole claim this archetype makes about itself: a
   reviewed stack re-expressed as a graph is the same stack.

   The claim is strong because the topology holds **no copied numbers**: every
   edge is a ``dimension_ref`` into that stack file. So there are two things to
   pin, and both are here -- that the totals match, and that the topology really
   does reference rather than copy (``test_the_l1_topology_copies_no_value``),
   because if a later edit inlined the values the equality test would still pass
   while the guarantee behind it was gone.

2. **The traversal, and the four ways it refuses.** Branch ambiguity is the
   named one -- the not-a-solver rule made executable -- and each of the four
   error classes is exercised against the **real** pitch-system topology rather
   than a synthetic three-node fixture, so a refusal is demonstrated on the graph
   an author will actually be holding.

3. **The vocabulary pairings.** ``NODE_KINDS``, ``EDGE_KINDS`` and
   ``TRANSFORM_KINDS`` are paired word-for-word against ``docs/DAG_TOPOLOGY.md``,
   the same shape ``tests/test_sop_vocabulary.py`` uses for the SOP: the constant
   is the definition, the document is what an author reads, and neither may drift.

4. **The duck-type guard.** ``Dimension`` is not a ``StackElement`` and is fed to
   ``fold()`` anyway (see the module docstring in ``topology.py``). What makes
   that safe is not a sentence -- it is
   ``test_dimension_exposes_every_attribute_fold_reads``, which reads ``fold``'s
   own source for every ``element.<attr>`` it touches and asserts ``Dimension``
   has each one. Add a field to ``fold``'s view of an element and this goes red
   naming it, instead of a topology study raising ``AttributeError`` at the far
   end of a projection build.
"""

from __future__ import annotations

import ast
import inspect
import json
import random
import re
from dataclasses import replace
from pathlib import Path

import pytest

from tolerance_stack import load_stack
from tolerance_stack.stack import ELEMENT_ROLES, SOURCE_REF_KINDS, fold
from tolerance_stack.topology import (
    EDGE_KINDS,
    IDENTITY,
    NODE_KINDS,
    TRANSFORM_KINDS,
    BranchAmbiguity,
    BrokenChain,
    CycleDetected,
    Dimension,
    Edge,
    Node,
    StudyError,
    TopologyError,
    Transform,
    UnitMismatch,
    check_study,
    load_study,
    load_topology,
    summarize,
    traverse,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
DOC = REPO_ROOT / "docs" / "DAG_TOPOLOGY.md"

L1_TOPOLOGY = TOPOLOGIES_DIR / "topology_vpa_output_to_pitch_plate.json"
L1_STUDY = TOPOLOGIES_DIR / "study_vpa_output_shank_out.json"
L1_STACK = STACKS_DIR / "stack_vpa_output_to_pitch_plate.json"
L2_TOPOLOGY = TOPOLOGIES_DIR / "topology_pitch_system.json"


# --------------------------------------------------------------------------- #
# 0. the corpus, and that it is not empty                                     #
# --------------------------------------------------------------------------- #

def topology_files() -> list[Path]:
    return sorted(TOPOLOGIES_DIR.glob("topology_*.json"))


def study_files() -> list[Path]:
    return sorted(TOPOLOGIES_DIR.glob("study_*.json"))


def test_the_corpus_is_what_this_module_thinks_it_is():
    """Anti-vacuity for every parametrized test below.

    A ``glob`` that matches nothing turns a parametrized suite into zero tests
    that all pass. Named files rather than a count, so a new document does not
    have to touch a number -- but the two the rest of this module reasons about
    by name must be there.
    """
    names = {p.name for p in topology_files()}
    assert {L1_TOPOLOGY.name, L2_TOPOLOGY.name} <= names, (
        f"docs/topologies/ holds {sorted(names)} -- this module's L1 proof and L2 "
        f"traversal tests read two specific documents and cannot find them")
    assert study_files(), "docs/topologies/ holds no study_*.json at all"


@pytest.mark.parametrize("path", topology_files(), ids=lambda p: p.stem)
def test_every_committed_topology_loads(path):
    """Every validation in ``Topology`` runs here: kinds, part membership,
    structural-vs-gap, transform units, dangling references."""
    topology = load_topology(path)
    assert topology.nodes and topology.edges


@pytest.mark.parametrize("path", study_files(), ids=lambda p: p.stem)
def test_every_committed_study_resolves_and_sums(path):
    study = load_study(path)
    topology = load_topology(TOPOLOGIES_DIR / f"topology_{study.topology}.json")
    result = summarize(topology, study)
    assert len(result.chain) == len(study.selection)
    assert result.units


# --------------------------------------------------------------------------- #
# 1. the L1 value proof                                                       #
# --------------------------------------------------------------------------- #

def test_the_l1_study_folds_to_the_stacks_own_published_check():
    """**The L1 proof.** Every field, exactly equal -- no ``pytest.approx``.

    Exact equality is available and is the right assertion because both sides
    reach ``fold()`` with the *same float objects*: the topology resolves its
    dimensions out of this very stack file, and the traversal's coefficients are
    all ``1.0``. Anything that made this need a tolerance would mean a second
    arithmetic path had appeared, which is the thing the design forbids.
    """
    topology = load_topology(L1_TOPOLOGY)
    study = load_study(L1_STUDY)
    stack = load_stack(L1_STACK)

    published = stack.check("worst_case_shank_out").interval
    computed = summarize(topology, study).interval

    assert computed.as_dict() == published.as_dict(), (
        "the L1 topology study no longer folds to the numbers "
        "stack_vpa_output_to_pitch_plate.json publishes for "
        "`worst_case_shank_out`. Either the topology's structure changed (an "
        "edge's orientation, the selection, a transform), or the stack's values "
        "did. The topology REFERENCES those values, so a stack edit legitimately "
        "moves both sides together -- check which side moved before editing "
        "either."
    )
    # And the study says which check it reproduces, so the pairing above is not
    # two files that happen to agree.
    assert "worst_case_shank_out" in study.provenance["equivalent_to"]


def test_the_l1_chain_is_the_joint_in_physical_order_with_derived_signs():
    """The chain order and every sign, spelled out once.

    Written down because it is the mechanism the whole archetype rests on and it
    is invisible in the JSON: not one sign is authored anywhere in either L1
    document. They come from the edges' orientation and the direction the walk
    crosses them -- five clamped members traversed against their authored
    direction, then the fastener grip with it.
    """
    chain = traverse(load_topology(L1_TOPOLOGY), load_study(L1_STUDY))
    assert [(c.edge.id, c.sign) for c in chain] == [
        ("straight_bushing", -1),
        ("spherical_bearing", -1),
        ("bushing_flange_thickness", -1),
        ("pitch_flange_thickness", -1),
        ("under_head_chamfer_washer", -1),
        ("fastener_grip", +1),
    ]
    assert all(c.transform.ratio == 1.0 for c in chain), (
        "L1 means every transform is the identity -- that is what lets this "
        "study be checked against a stack authored before transforms existed")
    # Each step leaves the node the next one enters: the chain is connected, and
    # `entered_at`/`left_at` are what a grid row aligns against.
    for earlier, later in zip(chain, chain[1:]):
        assert earlier.left_at == later.entered_at


def test_the_l1_study_is_a_lasso_not_a_path():
    """The selection's file order is not trusted, and this proves it.

    If ``traverse`` were quietly using the order the human happened to tick the
    edges off in, the branch-ambiguity check would be dead code: a shuffled
    selection would still fold correctly and a genuine fork would be resolved by
    accident of authoring order.
    """
    topology = load_topology(L1_TOPOLOGY)
    study = load_study(L1_STUDY)
    baseline = summarize(topology, study).interval

    rng = random.Random(20260831)
    for _ in range(8):
        shuffled = list(study.selection)
        rng.shuffle(shuffled)
        result = summarize(topology, replace(study, selection=shuffled))
        assert result.interval.as_dict() == baseline.as_dict()
        assert [c.edge.id for c in result.chain] == [
            "straight_bushing", "spherical_bearing", "bushing_flange_thickness",
            "pitch_flange_thickness", "under_head_chamfer_washer", "fastener_grip",
        ]


def test_the_l1_topology_copies_no_value():
    """The guarantee *behind* the proof: the L1 document holds no numbers.

    Without this, someone inlining the values would leave
    ``test_the_l1_study_folds_to_the_stacks_own_published_check`` green while the
    two files were free to drift apart on the next stack edit -- the pinned
    number would be pinning a copy against itself.
    """
    raw = json.loads(L1_TOPOLOGY.read_text(encoding="utf-8"))
    for edge in raw["edges"]:
        assert "dimension" not in edge, (
            f"edge {edge['id']!r} in {L1_TOPOLOGY.name} carries an inline "
            f"dimension. The L1 proof requires every value to be a "
            f"`dimension_ref` into the stack it re-expresses -- an inlined copy "
            f"makes the value-level test compare a number against itself.")
        if edge.get("kind") == "gap":
            assert "dimension_ref" not in edge      # the derived residual
            continue
        assert edge["dimension_ref"]["stack"] == (
            "docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json")

    # And the resolved dimensions really are the stack's own, citation included.
    topology = load_topology(L1_TOPOLOGY)
    stack = load_stack(L1_STACK)
    for edge in topology.edges:
        if edge.derived:
            continue
        element = stack.element(edge.dimension.id)
        assert edge.dimension.source_ref == element.source_ref
        assert edge.dimension.role == element.role
        assert (edge.dimension.min, edge.dimension.max, edge.dimension.nominal) == (
            element.min, element.max, element.nominal)


def test_a_dimension_ref_that_does_not_resolve_is_refused():
    """Both halves of the reference, and the reason the message names the path.

    A ref is the L1 proof's load-bearing mechanism; a silently-skipped one would
    leave an edge valueless and turn it into a "derived gap", which a study then
    refuses for the wrong reason.
    """
    raw = json.loads(L1_TOPOLOGY.read_text(encoding="utf-8"))
    original = raw["edges"][0]["dimension_ref"]["element"]
    raw["edges"][0]["dimension_ref"]["element"] = "no_such_element"
    with pytest.raises(TopologyError, match="has no element"):
        _write_and_load(raw)

    raw["edges"][0]["dimension_ref"] = {
        "stack": "docs/tolerance_stacks/stack_no_such_file.json",
        "element": original,
    }
    with pytest.raises(TopologyError, match="not in the tree"):
        _write_and_load(raw)


def _write_and_load(raw: dict):
    """Load a mutated topology document without writing into the repo.

    ``load_topology`` takes a path, so a mutation has to become a file. A
    module-level helper rather than a fixture, so the error-case tests read as
    single assertions -- and a temporary directory rather than the repo, because
    an invalid topology committed under ``docs/topologies/`` would fail the
    corpus tests at the top of this module.
    """
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "topology_mutated.json"
        path.write_text(json.dumps(raw), encoding="utf-8")
        return load_topology(path, repo_root=REPO_ROOT)


# --------------------------------------------------------------------------- #
# 2. the traversal: the L2 branch structure, and the four refusals            #
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def pitch_system():
    return load_topology(L2_TOPOLOGY)


def test_the_pitch_system_has_the_branch_structure_the_brief_describes(pitch_system):
    """The L2 structural claim, read off the graph rather than off the prose.

    The brief names three branches -- the gas spring (or hydraulic brake) off the
    pitch plate connection, the pitch links, and the ring gear off the blade
    roots. Each has to show up as a node where a study must choose, and the
    pitch-plate connection has to be one of them or the topology is a chain
    wearing a DAG's name.
    """
    branches = set(pitch_system.branch_nodes())
    assert "piston_rod_end_bore" in branches, (
        "the pitch plate connection is not a branch point -- the brief's branch 1 "
        "(gas spring / hydraulic brake) and branch 2 (pitch links) both leave "
        "from it")
    assert "pitch_arm_blade_root_clocking" in branches, (
        "the blade-root clocking interface is not a branch point -- the brief's "
        "further branch to the ring gear leaves from there")

    # The three ways out of the pitch plate connection, by the part each reaches.
    out_of_pitch_plate = {
        e.id for e in pitch_system.incident("piston_rod_end_bore")
        if e.part == "pitch_plate_215177_001"}
    assert out_of_pitch_plate == {
        "pitch_plate_flange_to_link_hole",
        "pitch_plate_flange_to_gas_spring_bushing",
        "pitch_plate_flange_to_brake_attachment",
    }

    # And the ring-gear branch really reaches the ring gear.
    assert [e.id for e in pitch_system.edges_on_part("ring_gear")] == [
        "ring_gear_mesh_to_hub_seat"]


def test_a_study_that_spans_a_branch_point_without_choosing_is_an_error(pitch_system):
    """**The named error of this archetype**, and the not-a-solver rule executable.

    Two branches off the pitch plate connection are selected and neither is
    withdrawn. The tool must stop and say where, because which of two
    statically-redundant paths binds is a mechanics decision.
    """
    study = load_study(TOPOLOGIES_DIR / "study_pitch_system_blade_angle_worst.json")
    ambiguous = replace(
        study,
        selection=list(study.selection) + ["pitch_plate_flange_to_gas_spring_bushing"],
        transforms=dict(study.transforms),
    )
    with pytest.raises(BranchAmbiguity) as excinfo:
        traverse(pitch_system, ambiguous)

    message = str(excinfo.value)
    assert "piston_rod_end_bore" in message, "the error must name the branch node"
    for candidate in ("pitch_plate_flange_to_link_hole",
                      "pitch_plate_flange_to_gas_spring_bushing"):
        assert candidate in message, "the error must name both candidate edges"
    assert "mechanics" in message, (
        "the message is the place a reader learns this is not a bug in their "
        "file but a decision the tool will not make")


def test_a_selection_that_is_not_a_chain_is_an_error(pitch_system):
    """Both shapes of :class:`BrokenChain`: a hole, and a stub.

    They are one class and two messages on purpose -- "the chain stops here" and
    "the chain finished with these left over" are found at different points in
    the walk and a reader needs to be told which.
    """
    study = load_study(
        TOPOLOGIES_DIR / "study_pitch_system_vertical_hub_to_pitch_arm.json")

    holed = [e for e in study.selection if e != "piston_length"]
    with pytest.raises(BrokenChain, match="no selected edge left to cross"):
        traverse(pitch_system, replace(study, selection=holed))

    stubbed = list(study.selection) + ["blade_root_clocking_to_hub_seat"]
    with pytest.raises(BrokenChain, match="never crossed"):
        traverse(pitch_system, replace(study, selection=stubbed))


def test_a_selection_that_closes_a_loop_is_an_error_before_the_walk(pitch_system):
    """The cycle guard, on a real loop of the real graph -- and its ordering.

    The pitch-link path out to the blade root and the hub's own blade-root seat
    close a ring, so this selection is a circuit rather than a chain. The walk
    would have reported it as a fork (at the hub A datum, where the ring's two
    arms both leave), which is true and unhelpful: the fix is not to choose a
    branch, it is to stop selecting the closure. So the loop is caught up front
    and the message names the edge whose removal makes the selection a chain.
    """
    study = load_study(
        TOPOLOGIES_DIR / "study_pitch_system_vertical_hub_to_pitch_arm.json")
    looping = replace(
        study,
        to_node="blade_root_oml",
        selection=list(study.selection) + [
            "pitch_arm_link_hole_to_clocking_hole",
            "blade_root_clocking_to_hub_seat",
            "hub_blade_root_seat_position",
        ],
    )
    with pytest.raises(CycleDetected) as excinfo:
        traverse(pitch_system, looping)
    message = str(excinfo.value)
    assert "hub_blade_root_seat_position" in message, (
        "the closing edge -- the last of the ring's edges the study lists -- is "
        "the one a reader can remove, so it is the one to name")
    assert "closes" in message, (
        "the message should point at `closes`, since a loop closure IS a "
        "legitimate quantity to ask for; it is just not a term")


def test_a_millimetre_study_that_crosses_the_coupling_is_refused(pitch_system):
    """The unit check, at the one place in the repo where units change.

    Extending the millimetre vertical chain across the pitch-arm coupling would
    add degrees to millimetres. The source workbook's own raw-millimetre total is
    a real instance of that class of number
    (``WORKSHEET_end_stop_graft.md`` section 2f), which is why this refuses
    instead of summing.
    """
    study = load_study(
        TOPOLOGIES_DIR / "study_pitch_system_vertical_hub_to_pitch_arm.json")
    crossing = replace(
        study,
        to_node="pitch_arm_blade_root_clocking",
        selection=list(study.selection) + ["pitch_arm_link_hole_to_clocking_hole"],
    )
    # The chain itself is fine -- it is the summation that cannot proceed.
    assert len(traverse(pitch_system, crossing)) == 9
    with pytest.raises(UnitMismatch) as excinfo:
        summarize(pitch_system, crossing)
    message = str(excinfo.value)
    assert "'mm'" in message and "'deg'" in message
    assert "pitch_arm_link_hole_to_clocking_hole" in message


def test_the_derived_gap_cannot_be_summed_and_must_be_named_in_closes():
    """``shank_out`` is the answer, so it is refused as a term.

    And the other direction: ``closes`` has to name the gap between the study's
    own two endpoints, or it is decoration.
    """
    topology = load_topology(L1_TOPOLOGY)
    study = load_study(L1_STUDY)

    with pytest.raises(StudyError, match="carries no dimension"):
        traverse(topology, replace(
            study, selection=list(study.selection) + ["shank_out"]))

    with pytest.raises(StudyError, match="also in the selection"):
        traverse(topology, replace(
            study, closes="fastener_grip"))

    with pytest.raises(StudyError, match="not this study's"):
        traverse(topology, replace(
            study, to_node="head_bearing_face",
            selection=["fastener_grip", "under_head_chamfer_washer",
                       "pitch_flange_thickness", "bushing_flange_thickness",
                       "spherical_bearing", "straight_bushing"]))


def test_the_two_sensitivity_studies_differ_only_by_their_transform_set():
    """One topology, one selection, two transform sets -- the ``transforms`` map.

    The case that shaped the schema: the source workbook runs two parallel
    sensitivity columns over one set of rows. If those had to be two topologies,
    every structural edit would have to be made twice.
    """
    topology = load_topology(L2_TOPOLOGY)
    worst = load_study(TOPOLOGIES_DIR / "study_pitch_system_blade_angle_worst.json")
    average = load_study(
        TOPOLOGIES_DIR / "study_pitch_system_blade_angle_average.json")

    assert worst.selection == average.selection
    assert (worst.from_node, worst.to_node) == (average.from_node, average.to_node)
    assert worst.transforms != average.transforms

    a, b = summarize(topology, worst), summarize(topology, average)
    assert [c.edge.id for c in a.chain] == [c.edge.id for c in b.chain]
    assert a.units == b.units == "deg"
    # The worst-case condition is the larger sensitivity at every edge, so it is
    # the wider band -- the only relationship between the two that is a fact
    # about the ratios rather than about the placeholder values.
    for x, y in zip(a.chain, b.chain):
        assert x.transform.ratio > y.transform.ratio
    assert a.interval.worst_case_half > b.interval.worst_case_half


def test_the_coupling_edge_is_the_only_declared_non_identity_default():
    """The design rule, checked rather than only written down.

    A sensitivity is a property of the study's *output quantity* and belongs in a
    study's map -- except where the conversion is intrinsic to the part, which in
    this repo is the pitch arm and nowhere else. If a second edge acquires a
    default transform, that argument needs re-making, so this fails and asks for
    it.
    """
    carriers = {}
    for path in topology_files():
        for edge in load_topology(path).edges:
            if edge.transform is not None:
                carriers[f"{path.stem}:{edge.id}"] = edge.transform
    assert carriers == {
        "topology_pitch_system:pitch_arm_link_hole_to_clocking_hole":
            "blade_root_tangential_to_rotary",
    }, (
        f"edges carrying a default transform: {carriers}. Only the pitch-arm "
        f"coupling should -- everywhere else the sensitivity depends on what a "
        f"study is measuring, so it belongs in that study's `transforms` map. See "
        f"the note on that edge.")


# --------------------------------------------------------------------------- #
# 3. the invariants, each shown failing                                       #
# --------------------------------------------------------------------------- #

def test_structural_and_gap_are_checked_against_the_part_membership():
    """The brief's definition of an edge, both directions.

    ``structural`` = a dimension of one part between two of that part's own
    interfaces; ``gap`` = between interfaces that share no part. Both are
    derivable from the graph, which is exactly why a document that mislabels one
    must fail rather than render a wrong lane.
    """
    raw = json.loads(L1_TOPOLOGY.read_text(encoding="utf-8"))

    # A structural dimension of a part that is not on both its interfaces.
    mislabelled = json.loads(json.dumps(raw))
    edge = next(e for e in mislabelled["edges"] if e["id"] == "fastener_grip")
    edge["part"] = "washer_ms21299c4k"
    with pytest.raises(TopologyError, match="not on both of its interfaces"):
        _write_and_load(mislabelled)

    # A gap between two interfaces that do share a part.
    as_gap = json.loads(json.dumps(raw))
    edge = next(e for e in as_gap["edges"] if e["id"] == "fastener_grip")
    edge["kind"] = "gap"
    edge.pop("part")
    with pytest.raises(TopologyError, match="share part"):
        _write_and_load(as_gap)

    # A structural edge that names no part at all.
    partless = json.loads(json.dumps(raw))
    next(e for e in partless["edges"]
         if e["id"] == "fastener_grip").pop("part")
    with pytest.raises(TopologyError, match="names the part it is a dimension of"):
        _write_and_load(partless)


def test_a_node_kind_must_agree_with_how_many_parts_meet_there():
    node = Node(id="n", name="n", parts=("a", "b"))
    assert node.kind == "mating_surface"
    with pytest.raises(TopologyError, match="disagrees with its parts"):
        Node(id="n", name="n", parts=("a",))
    with pytest.raises(TopologyError, match="disagrees with its parts"):
        Node(id="n", name="n", parts=("a", "b"), kind="datum_feature")
    with pytest.raises(TopologyError, match="at most two parts"):
        Node(id="n", name="n", parts=("a", "b", "c"))
    with pytest.raises(TopologyError, match="at least one part"):
        Node(id="n", name="n", parts=())
    with pytest.raises(TopologyError, match="lists a part twice"):
        Node(id="n", name="n", parts=("a", "a"))


def test_a_transform_ratio_is_a_positive_magnitude_like_a_coefficient():
    """The same rule ``Term.coefficient`` follows, for the same reason.

    Direction comes from the traversal here, so a negative ratio would give the
    arithmetic a second place to be backwards -- the property the one-``fold()``
    design exists to remove.
    """
    for bad in (-1.67, 0.0, float("nan"), float("inf")):
        with pytest.raises(TopologyError, match="finite number > 0"):
            Transform(id="t", kind="ratio", ratio=bad)

    with pytest.raises(TopologyError, match="means ratio 1.0"):
        Transform(id="t", kind="identity", ratio=2.0)
    with pytest.raises(TopologyError, match="cannot change units"):
        Transform(id="t", kind="identity", units_out="deg").resolved("mm")
    with pytest.raises(TopologyError, match="units_out must differ"):
        Transform(id="t", kind="linear_to_rotary", ratio=1.67).resolved("mm")
    with pytest.raises(TopologyError, match="is not the topology's units"):
        Transform(id="t", kind="ratio", units_in="in").resolved("mm")
    with pytest.raises(TopologyError, match="one of"):
        Transform(id="t", kind="scale_factor")

    # And the shape the documents use, which must go through.
    resolved = Transform(
        id="t", kind="linear_to_rotary", ratio=1.67, units_out="deg").resolved("mm")
    assert (resolved.units_in, resolved.units_out) == ("mm", "deg")


def test_a_dimension_keeps_the_stacks_role_vocabulary_and_refuses_a_new_word():
    """``role`` is optional here and shared, not forked.

    The alternative -- a topology-local role vocabulary -- is the fork the
    brief's watch item exists to prevent, so an unknown word must be refused
    rather than accepted as topology-native.
    """
    assert Dimension(id="d", name="d", nominal=0.0, min=0.0, max=0.0).role is None
    for role in ELEMENT_ROLES:
        assert Dimension(id="d", name="d", nominal=0.0, min=0.0, max=0.0,
                         role=role).role == role
    with pytest.raises(TopologyError, match="must be one of"):
        Dimension(id="d", name="d", nominal=0.0, min=0.0, max=0.0, role="pitch_link")
    with pytest.raises(TopologyError, match="min .* > max"):
        Dimension(id="d", name="d", nominal=0.0, min=1.0, max=0.0)


def test_dimension_exposes_every_attribute_fold_reads():
    """The duck-type guard: read out of ``fold``'s source, not written here.

    ``Term.element`` is annotated ``StackElement`` and ``Dimension`` is fed to it
    anyway. Nothing at runtime checks that, so what makes it safe is this: every
    ``<term>.element.<attr>`` in ``fold``'s body must be an attribute
    ``Dimension`` has. Widen ``fold``'s view of an element and this names the
    field, instead of a projection build raising ``AttributeError`` days later.
    """
    tree = ast.parse(inspect.getsource(fold))
    wanted = {
        node.attr
        for node in ast.walk(tree)
        if isinstance(node, ast.Attribute)
        and isinstance(node.value, ast.Attribute)
        and node.value.attr == "element"
    }
    assert wanted, (
        "no `<x>.element.<attr>` access found in fold()'s source -- this reader "
        "has drifted from the function it reads, and the guard below is vacuous")
    missing = sorted(w for w in wanted if not hasattr(
        Dimension(id="d", name="d", nominal=0.0, min=0.0, max=0.0), w))
    assert missing == [], (
        f"fold() reads element attributes {missing} that Dimension does not have. "
        f"Either add them to Dimension, or Dimension can no longer be a term's "
        f"element and the topology needs a real StackElement.")


def test_a_topology_refuses_a_reference_it_cannot_resolve():
    """Every id in a topology document resolves, or the document does not load.

    A dangling reference in a graph format is the failure that renders: a node
    the layout cannot place, an edge with one end, a lane with no colour.
    """
    raw = json.loads(L1_TOPOLOGY.read_text(encoding="utf-8"))

    def mutate(fn):
        copy = json.loads(json.dumps(raw))
        fn(copy)
        return copy

    with pytest.raises(TopologyError, match="does not declare"):
        # One entry replaced, not the whole list: swapping a two-part mate for a
        # one-part list would trip the node-kind check first and this would pass
        # for the wrong reason.
        _write_and_load(mutate(
            lambda d: d["nodes"][0]["parts"].__setitem__(0, "no_such_part")))
    with pytest.raises(TopologyError, match="does not declare"):
        _write_and_load(mutate(
            lambda d: d["edges"][0].__setitem__("from", "no_such_node")))
    with pytest.raises(TopologyError, match="does not declare"):
        _write_and_load(mutate(
            lambda d: d["edges"][0].__setitem__("transform", "no_such_transform")))
    with pytest.raises(TopologyError, match="duplicate node id"):
        _write_and_load(mutate(lambda d: d["nodes"].append(d["nodes"][0])))
    with pytest.raises(TopologyError, match="reserved id"):
        _write_and_load(mutate(
            lambda d: d.setdefault("transforms", []).append({"id": "identity"})))
    with pytest.raises(TopologyError, match="expected schema"):
        _write_and_load(mutate(lambda d: d.__setitem__("schema", "something/else")))


def test_a_study_refuses_a_shape_that_would_sum_something_unintended():
    topology = load_topology(L1_TOPOLOGY)
    study = load_study(L1_STUDY)

    with pytest.raises(StudyError, match="selection is empty"):
        replace(study, selection=[])
    with pytest.raises(StudyError, match="more than once"):
        replace(study, selection=list(study.selection) + ["fastener_grip"])
    with pytest.raises(StudyError, match="not a node of topology"):
        traverse(topology, replace(study, from_node="no_such_node"))
    with pytest.raises(StudyError, match="sums between two locations"):
        traverse(topology, replace(study, from_node=study.to_node))
    with pytest.raises(StudyError, match="is a study of topology"):
        traverse(topology, replace(study, topology="pitch_system"))
    with pytest.raises(StudyError, match="not in the selection"):
        traverse(topology, replace(study, transforms={"shank_out": "identity"}))


# --------------------------------------------------------------------------- #
# 4. the citation discipline the repo's one rule requires                     #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("path", topology_files(), ids=lambda p: p.stem)
def test_every_value_in_a_topology_carries_a_source_ref(path):
    """SOP "The one rule", applied to this archetype: nothing is invented.

    A ``dimension_ref``'s citation is whatever the referenced stack element
    carries, so this is one check over both authoring modes -- and it is the
    reason ``Dimension`` reuses ``SourceRef`` rather than declaring its own.
    """
    topology = load_topology(path)
    missing = [e.id for e in topology.edges
               if not e.derived and e.dimension.source_ref is None]
    assert missing == [], (
        f"{path.name}: edges {missing} carry a value with no source_ref. Every "
        f"value cites something -- a workbook cell, a drawing, or `assumed` with "
        f"the reason in its note.")
    for edge in topology.edges:
        if edge.derived:
            continue
        assert edge.dimension.source_ref.kind in SOURCE_REF_KINDS


#: The edges handoff ``endstop_location_stack`` (2026-09-06) re-cited off real
#: drawings instead of the founding workbook -- ``{edge id: confidence}``, so a
#: fifth edge silently claiming better than `untraced` still fails below. Every
#: one of these is a disposition ``WORKSHEET_endstop_vision_baseline.md``
#: (§3/§8b) scored `traced` or `convention-traced` -- never a `candidate` or
#: `mismatch` row, which stay `untraced` on purpose (identity unresolved is not
#: a licence to claim better than the source workbook, which is exactly the
#: overclaiming this test used to refuse outright).
_RETRACED_CONFIDENCES = {
    "pitch_plate_flange_to_link_hole": "traced",
    "hub_blade_root_seat_position": "traced",
    "gas_spring_body_height": "traced",
    "piston_length": "inferred",
}


def test_every_placeholder_in_the_pitch_system_says_so(pitch_system):
    """The L2 honesty check: an ``assumed`` band names itself a placeholder.

    The brief authorised placeholder values -- "the topology is the deliverable,
    values arrive later" -- which makes *marking* them the whole of the
    obligation. ``kind: "assumed"`` is the repo's word for a value with no
    document behind it; this asserts each one also tells a reader in prose, since
    the viewer will show the note long before it shows the kind.
    """
    assumed = [(e.id, e.dimension.source_ref)
               for e in pitch_system.edges
               if not e.derived and e.dimension.source_ref.kind == "assumed"]
    assert assumed, (
        "the pitch-system topology has no `assumed` values at all -- either "
        "every band got sourced (excellent, delete this test) or the "
        "placeholders stopped declaring themselves")
    for edge_id, ref in assumed:
        assert ref.confidence == "untraced", (
            f"{edge_id}: an `assumed` value cannot be traced or inferred")
        assert "PLACEHOLDER" in (ref.note or ""), (
            f"{edge_id}: an `assumed` band must say in its note that it is a "
            f"placeholder and why no source exists. A reader meets the note "
            f"before the kind.")

    # Founding claim: this topology's only value source was a workbook that
    # traces nothing (WORKSHEET_end_stop_graft.md, 0 of 43). That stopped being
    # true of the whole document on 2026-09-06, when handoff
    # `endstop_location_stack` re-cited a handful of edges against drawings the
    # `endstop_vision_baseline`/`endstop_retrace_acquired_docs` sessions had
    # actually read -- so the overclaiming check is now an ALLOWLIST, named and
    # pinned, rather than a blanket refusal. Anything claiming better than
    # `untraced` that is not in `_RETRACED_CONFIDENCES` is still overclaiming.
    claiming = {e.id: e.dimension.source_ref.confidence
                for e in pitch_system.edges
                if not e.derived and e.dimension.source_ref.confidence != "untraced"}
    assert claiming == _RETRACED_CONFIDENCES, (
        f"edges claiming better than `untraced`: {claiming}; expected exactly "
        f"{_RETRACED_CONFIDENCES}. A new entry here must be a real disposition in "
        f"WORKSHEET_endstop_vision_baseline.md, not an inline upgrade -- and a "
        f"missing one means a citation this handoff traced quietly regressed.")
    for edge_id, ref in ((e.id, e.dimension.source_ref) for e in pitch_system.edges
                         if not e.derived and e.id in _RETRACED_CONFIDENCES):
        assert ref.kind in ("drawing", "spec"), (
            f"{edge_id}: claims {ref.confidence!r} but cites kind {ref.kind!r} -- "
            f"only a real document backs a claim above `untraced`")
        assert ref.export is not None and ref.export.sha256, (
            f"{edge_id}: a `drawing` citation above `untraced` must carry an "
            f"established export (SOP Step 5b)")

@pytest.mark.parametrize("path", topology_files(), ids=lambda p: p.stem)
def test_every_declared_transform_cites_where_its_ratio_came_from(path):
    """A ratio is a value, and this repo's one rule does not exempt it.

    ``test_every_value_in_a_topology_carries_a_source_ref`` walks edges, which is
    where a *length* lives -- but a transform's ``ratio`` multiplies every one of
    them, so an uncited ratio launders further than an uncited band does. The
    four in the tree are the source sheet's D10/F10/D11/F11 and every one is an
    unsourced CAD constant, so they must say ``untraced`` and say ``PLACEHOLDER``
    in the note, exactly as an ``assumed`` band does. Added in review of
    ``dag_topology_format`` (2026-09-01): the shape was already right in both
    documents, and nothing held it there.

    ``identity`` is exempt because it asserts nothing -- ratio 1.0, units
    unchanged -- and because the default one is a module constant no document
    declares.
    """
    topology = load_topology(path)
    for transform in topology.transforms:
        if transform.kind == "identity":
            continue
        assert transform.source_ref is not None, (
            f"{path.name}: transform {transform.id!r} scales every edge that "
            f"carries it and cites nothing. A ratio is a value.")
        assert transform.source_ref.kind in SOURCE_REF_KINDS
        assert transform.source_ref.confidence == "untraced", (
            f"{path.name}: transform {transform.id!r} claims "
            f"{transform.source_ref.confidence!r}. Every ratio in the tree is an "
            f"unsourced constant in a workbook that traces nothing -- if one has "
            f"become traceable, this assertion is the place to say so.")
        assert "PLACEHOLDER" in (transform.source_ref.note or ""), (
            f"{path.name}: transform {transform.id!r} does not say in its note "
            f"that its ratio is a placeholder. A reader meets the note before "
            f"the confidence, and this ratio converts millimetres into the "
            f"degrees a study reports.")


def test_the_pitch_system_dimensions_are_variation_only(pitch_system):
    """Every band is centred on zero, and the document says why.

    A single nominal-carrying dimension among them would make a study's
    ``nominal`` total read as a position sum when the rest are variations about
    an unstated nominal -- a plausible-looking number with no meaning, which is
    this repo's characteristic failure mode.
    """
    for edge in pitch_system.edges:
        if edge.derived:
            continue
        assert edge.dimension.nominal == 0.0, (
            f"{edge.id}: nominal {edge.dimension.nominal} in a variation-only "
            f"topology. See its provenance.variation_only.")
        assert edge.dimension.min == -edge.dimension.max
    assert "variation_only" in pitch_system.provenance


# --------------------------------------------------------------------------- #
# 5. the vocabularies, paired with the document an author reads               #
# --------------------------------------------------------------------------- #

#: ``(what, anchor, constant)`` -- the same pairing shape
#: ``tests/test_sop_vocabulary.py`` uses, for the same reason: the constant is
#: the definition and the document is what an author reads, and a word must
#: reach both.
_DOC_VOCABULARIES = (
    ("Node.kind", "\n`kind` on a node is one of ", NODE_KINDS),
    ("Edge.kind", "\n`kind` on an edge is one of ", EDGE_KINDS),
    ("Transform.kind", "\n`kind` on a transform is one of ", TRANSFORM_KINDS),
)


def doc_pipe_list(anchor: str, text: str | None = None) -> tuple[str, ...]:
    body = text if text is not None else DOC.read_text(encoding="utf-8")
    at = body.find(anchor)
    assert at >= 0, (
        f"docs/DAG_TOPOLOGY.md no longer contains {anchor!r}, so this pairing "
        f"reads nothing. Re-anchor it on the sentence that now carries the list "
        f"-- do not delete the check.")
    assert body.find(anchor, at + 1) < 0, (
        f"{anchor!r} appears twice in docs/DAG_TOPOLOGY.md; the pairing would "
        f"silently read whichever came first")
    start = body.index("`", at + len(anchor))
    end = body.index("`", start + 1)
    return tuple(w.strip()
                 for w in re.sub(r"\s+", " ", body[start + 1:end]).split("|"))


@pytest.mark.parametrize("what, anchor, constant", _DOC_VOCABULARIES,
                         ids=[row[0] for row in _DOC_VOCABULARIES])
def test_the_doc_spells_the_same_vocabularies_the_code_enforces(what, anchor, constant):
    spelled = doc_pipe_list(anchor)
    assert set(spelled) == set(constant), (
        f"docs/DAG_TOPOLOGY.md and `{what}` disagree about the vocabulary:\n"
        f"  the doc teaches, the code refuses: {sorted(set(spelled) - set(constant))}\n"
        f"  the code accepts, the doc omits:   {sorted(set(constant) - set(spelled))}\n"
        f"A word must reach both. The constant is the definition; the doc's list "
        f"is what an author reads.")
    assert spelled == tuple(constant), (
        f"same words, different order: doc {spelled} vs {tuple(constant)}")


def test_the_vocabulary_pairing_can_fail():
    """A pairing demonstrated only by passing has not shown it reads anything."""
    live = DOC.read_text(encoding="utf-8")
    for _what, anchor, constant in _DOC_VOCABULARIES:
        spelled = doc_pipe_list(anchor, live)
        assert spelled == tuple(constant)          # anti-vacuity, on the real text

        span = " | ".join(constant)
        widened = live.replace(f"{anchor}`{span}`", f"{anchor}`{span} | invented`")
        assert widened != live, f"could not rewrite the {anchor!r} list in place"
        assert doc_pipe_list(anchor, widened) != tuple(constant)

        narrowed = live.replace(
            f"{anchor}`{span}`",
            f"{anchor}`{' | '.join(constant[:-1])}`")
        assert doc_pipe_list(anchor, narrowed) != tuple(constant)


def test_the_doc_states_the_not_a_solver_rule():
    """The brief's locked decision 2: *"Write this into the repo docs so nobody
    drifts into constraint solving."* This is that instruction, mechanised at the
    level a doc-scan guard can reach -- the words have to be there.
    """
    text = DOC.read_text(encoding="utf-8")
    for phrase in ("not a solver", "statically redundant", "human"):
        assert re.search(re.escape(phrase), text, re.I), (
            f"docs/DAG_TOPOLOGY.md does not say {phrase!r}. The locked brief's "
            f"decision 2 requires the not-a-solver rule to be written down where "
            f"an author reads it, so nobody drifts into constraint solving.")


def test_the_doc_names_every_committed_document():
    """A format doc that does not name its own examples sends a reader hunting."""
    text = DOC.read_text(encoding="utf-8")
    missing = [p.name for p in topology_files() + study_files()
               if p.name not in text]
    assert missing == [], (
        f"docs/DAG_TOPOLOGY.md does not name {missing}. Every committed topology "
        f"and study is an example the doc should point at.")


def test_the_default_transform_is_the_identity_and_is_safe_to_share():
    """``IDENTITY`` is a module-level constant handed to every transformless edge.

    That is only safe because ``Transform`` is frozen and ``resolved()`` returns a
    new object: otherwise one topology's units would leak into the next one's
    default. Both halves are asserted, because the second is the non-obvious one.
    """
    assert (IDENTITY.kind, IDENTITY.ratio) == ("identity", 1.0)
    assert (IDENTITY.units_in, IDENTITY.units_out) == (None, None)

    mm = IDENTITY.resolved("mm")
    assert (mm.units_in, mm.units_out) == ("mm", "mm")
    inch = IDENTITY.resolved("in")
    assert (inch.units_in, inch.units_out) == ("in", "in")
    assert (IDENTITY.units_in, IDENTITY.units_out) == (None, None), (
        "resolved() mutated the shared default instead of returning a new one")

    with pytest.raises(Exception):
        IDENTITY.ratio = 2.0            # frozen

    # An edge that declares no transform gets it, rather than carrying a copy.
    edge = Edge(id="e", name="e", from_node="a", to_node="b", part="p")
    assert edge.transform is None


# --------------------------------------------------------------------------- #
# 6. the structural inventory: the counts a document states, derived          #
# --------------------------------------------------------------------------- #

#: ``label stem -> how the graph computes it``. These are the six numbers a
#: reader of ``docs/DAG_TOPOLOGY.md``, or of a topology's own notes, is given
#: about the shape of a graph they are not holding -- and every one is a one-line
#: derivation, which is why none of them may be maintained by hand. Added in
#: review of ``dag_topology_format`` (2026-09-01) after two of the six shipped
#: wrong: the pitch system was introduced as having "three grounded loops" where
#: its cycle rank is 4 (the hydraulic-brake path, modelled in the same document,
#: is the fourth), and the L1 topology as having "six interfaces" where it has 7.
_COUNTABLES = {
    "part": lambda t: len(t.parts),
    "interface": lambda t: len(t.nodes),
    "edge": lambda t: len(t.edges),
    "branch point": lambda t: len(t.branch_nodes()),
    "grounded loop": lambda t: _cycle_rank(t),
    "gap edge": lambda t: sum(1 for e in t.edges if e.kind == "gap"),
}

#: Number *words* count, because they age exactly like digits -- "twenty-three
#: edges" is how one of the two wrong figures above was spelled. Zero is
#: deliberately absent: ``no`` is a determiner far more often than a count ("it
#: names no part"), and admitting it would make this scanner fire on prose.
#: Spell a zero as ``0``, which the digit branch reads.
_NUMBER_WORDS = {
    w: i for i, w in enumerate(
        "zero one two three four five six seven eight nine ten eleven twelve "
        "thirteen fourteen fifteen sixteen seventeen eighteen nineteen "
        "twenty".split())
}
_NUMBER_WORDS.update({"twenty-" + w: 20 + i for i, w in enumerate(
    "one two three four five six seven eight nine".split(), start=1)})
del _NUMBER_WORDS["zero"]


def _cycle_rank(topology) -> int:
    """Independent cycles: ``edges - nodes + components``.

    "Grounded loop" is what this repo's prose calls a member of a cycle basis --
    a return path to ground that closes a ring with another one. Computed rather
    than enumerated, so an added branch cannot be described away.
    """
    parent = {}

    def find(node: str) -> str:
        parent.setdefault(node, node)
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    for edge in topology.edges:
        parent[find(edge.from_node)] = find(edge.to_node)
    components = len({find(n.id) for n in topology.nodes})
    return len(topology.edges) - len(topology.nodes) + components


def stated_counts(sentence: str) -> dict:
    """Every ``<number> <label>`` in one sentence, as ``{label stem: [values]}``."""
    words = "|".join(sorted(_NUMBER_WORDS, key=len, reverse=True))
    found = {}
    for stem in _COUNTABLES:
        pattern = (r"\b(\d+|" + words + r")\s+"
                   + stem.replace(" ", r"\s+") + r"s?\b")
        for token in re.findall(pattern, sentence, re.IGNORECASE):
            value = (int(token) if token.isdigit()
                     else _NUMBER_WORDS[token.lower()])
            found.setdefault(stem, []).append(value)
    return found


def inventory_sentences(text: str) -> list:
    """The sentences of ``text`` that count **two or more** different labels.

    That threshold is the whole discrimination this scanner makes, and it is
    worth stating plainly because it is also its blind spot. A sentence counting
    one label is nearly always a claim about a *subset* -- "modelled here as two
    parts because the referenced element names no part for the flange" -- and
    reading those as inventory claims produced a false positive on the first run
    of this guard. A sentence counting two or more is describing the graph. So a
    single-label restatement of a whole-graph count is **not** caught here; the
    review overlay carries that as a reviewer's item.
    """
    flat = re.sub(r"\s+", " ", text)
    return [s for s in re.split(r"(?<=[.;:])\s", flat)
            if len(stated_counts(s)) >= 2]


def doc_section_for(topology_file: Path) -> str:
    """The ``###`` section of ``docs/DAG_TOPOLOGY.md`` that names this document.

    Anchored on the file name rather than on a heading level or an ordinal, so
    the pairing survives the document being reorganised.
    """
    text = DOC.read_text(encoding="utf-8")
    sections = [s for s in re.split(r"^### ", text, flags=re.M)[1:]
                if topology_file.name in s.split("\n", 1)[0]]
    assert len(sections) == 1, (
        f"docs/DAG_TOPOLOGY.md has {len(sections)} `###` sections whose heading "
        f"names {topology_file.name}; this pairing needs exactly one. Every "
        f"committed topology gets a section that introduces it -- do not delete "
        f"the check, re-anchor it.")
    return sections[0]


@pytest.mark.parametrize("path", topology_files(), ids=lambda p: p.stem)
def test_the_doc_states_this_graphs_whole_shape_and_states_it_right(path):
    """``docs/DAG_TOPOLOGY.md`` introduces each topology with a **complete**,
    derived inventory -- all six counts, in one sentence, each one the graph's.

    Completeness is asserted, not just correctness, because the failure a
    doc-scan guard is otherwise blind to is a *deleted* number rather than a
    wrong one (the overlay's 2026-08-12 entry). Requiring every label means
    dropping four of the six goes red instead of silently reducing the guard's
    reach.
    """
    topology = load_topology(path)
    expected = {stem: how(topology) for stem, how in _COUNTABLES.items()}

    sentences = inventory_sentences(doc_section_for(path))
    assert len(sentences) == 1, (
        f"docs/DAG_TOPOLOGY.md's {path.name} section has {len(sentences)} "
        f"sentences counting the graph, and this pairing wants exactly one: "
        f"{sentences}")
    stated = stated_counts(sentences[0])
    assert sorted(stated) == sorted(_COUNTABLES), (
        f"docs/DAG_TOPOLOGY.md's inventory of {path.name} states "
        f"{sorted(stated)}; it must state all of {sorted(_COUNTABLES)}, because "
        f"a count that is simply absent is the one this guard cannot see.")
    assert {k: v[0] for k, v in stated.items()} == expected, (
        f"docs/DAG_TOPOLOGY.md's inventory of {path.name} says "
        f"{ {k: v[0] for k, v in stated.items()} }; the graph is {expected}. Do "
        f"not retype these -- `_COUNTABLES` in this module computes every one.")


@pytest.mark.parametrize("path", topology_files(), ids=lambda p: p.stem)
def test_a_topologys_own_notes_count_the_graph_they_describe(path):
    """The same check where the second copy lives: the document's own prose.

    A topology's ``notes``/``provenance`` restate its shape for a reader who has
    the file open, which is a hand-copy of something derivable and therefore ages
    the way every other hand-copy in this repo has.
    """
    topology = load_topology(path)
    expected = {stem: how(topology) for stem, how in _COUNTABLES.items()}
    raw = json.loads(path.read_text(encoding="utf-8"))
    prose = json.dumps({k: v for k, v in raw.items()
                        if k in ("title", "notes", "provenance")})

    for sentence in inventory_sentences(prose):
        for stem, values in stated_counts(sentence).items():
            wrong = sorted({v for v in values if v != expected[stem]})
            assert not wrong, (
                f"{path.name} states {wrong} {stem}(s); the graph has "
                f"{expected[stem]}. In: {sentence!r}")


def test_the_structural_count_pairing_can_fail():
    """The scanner reads; and the two figures it was written for come back wrong.

    Both halves matter. A pairing shown only by passing has not shown it parses
    anything, and this one has a regex, a number-word table and a sentence
    splitter between it and the text.
    """
    # It parses digits and words the same way, and does not match a label
    # through an intervening word.
    assert stated_counts("23 edges and 1 gap edge") == {
        "edge": [23], "gap edge": [1]}
    assert stated_counts("twenty-three edges")["edge"] == [23]
    assert stated_counts("no node has three incident edges") == {}
    # One label is a subset claim and is skipped; two or more is an inventory.
    assert inventory_sentences("Modelled here as two parts because.") == []
    assert len(inventory_sentences("It has 2 parts and 3 edges.")) == 1

    # The two figures that shipped wrong on 2026-08-31, replayed verbatim.
    l2_as_shipped = ("Twelve parts, twenty interfaces, twenty-three edges, four "
                     "branch points, three grounded loops (pitch links, gas "
                     "spring, ring gear), one gap edge (the end stop).")
    assert stated_counts(l2_as_shipped)["grounded loop"] == [3]
    assert _cycle_rank(load_topology(L2_TOPOLOGY)) == 4, (
        "the pitch system's cycle rank -- 4, not the 3 the document shipped")
    assert stated_counts(l2_as_shipped)["interface"] == [20]     # this one was right

    l1_as_shipped = ("graph: six interfaces, five clamped members in series, the "
                     "fastener grip in parallel with them, and 1 gap edge.")
    assert stated_counts(l1_as_shipped)["interface"] == [6]
    assert len(load_topology(L1_TOPOLOGY).nodes) == 7, (
        "the L1 topology's interface count -- 7, not the 6 the document shipped")

    # And the live text really is read by the completeness assertion above: the
    # inventory sentence exists and every label reaches it.
    for path in topology_files():
        sentences = inventory_sentences(doc_section_for(path))
        assert len(sentences) == 1
        assert sorted(stated_counts(sentences[0])) == sorted(_COUNTABLES)


# --------------------------------------------------------------------------- #
# 7. a row's own numbers are the fold's, not a second arithmetic              #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("path", study_files(), ids=lambda p: p.stem)
def test_a_contributions_own_numbers_sum_to_the_fold_it_lands_in(path):
    """``Contribution.nominal``/``min``/``max`` are a *display* of ``fold``'s rule.

    They restate, per term, the worst-case convention ``fold`` applies to the
    whole list -- a positive weight contributes its ``max`` to the maximum, a
    negative one its ``min`` -- and a grid row is what a reader checks the total
    against. Nothing paired the two until this test: change ``fold``'s convention
    and every row would keep rendering the old one, silently disagreeing with the
    total printed beside it. Added in review of ``dag_topology_format``
    (2026-09-01). ``Contribution`` gets no arithmetic of its own to be right or
    wrong about, and that is the property pinned here.
    """
    study = load_study(path)
    topology = load_topology(TOPOLOGIES_DIR / f"topology_{study.topology}.json")
    result = summarize(topology, study)
    published = result.interval.as_dict()

    assert sum(c.nominal for c in result.chain) == pytest.approx(
        published["nominal"], abs=1e-12)
    assert sum(c.min for c in result.chain) == pytest.approx(
        published["worst_case_min"], abs=1e-12)
    assert sum(c.max for c in result.chain) == pytest.approx(
        published["worst_case_max"], abs=1e-12)

    # And the row a viewer projects carries the weight it was scaled by, so a
    # non-unity transform cannot be drawn as a bare +/- term (ARCHITECTURE.md,
    # "a term rendered without its coefficient is a wrong term list").
    for contribution, row in zip(result.chain, result.as_dict()["chain"]):
        assert row["weight"] == contribution.sign * contribution.transform.ratio
        assert row["ratio"] > 0 and row["sign"] in (1, -1)


# --------------------------------------------------------------------------- #
# 8. a study's own errors are one class                                       #
# --------------------------------------------------------------------------- #

def test_a_study_naming_an_id_its_topology_lacks_raises_a_study_error():
    """The likeliest authoring slip must not escape ``StudyError``.

    A typo'd edge id used to surface as a bare ``KeyError`` naming only the
    topology. Everything else a study can get wrong is a ``StudyError``, and that
    is the class this module tells its consumers to catch and render -- so the
    one error an author will actually hit was the one arriving as an unhandled
    exception. Fixed in review of ``dag_topology_format`` (2026-09-01).
    """
    topology = load_topology(L1_TOPOLOGY)
    study = load_study(L1_STUDY)

    typo = [e if e != "straight_bushing" else "straigt_bushing"
            for e in study.selection]
    cases = (
        (replace(study, selection=typo), "selection names edge"),
        (replace(study, closes="shank_ot"), "`closes` names edge"),
        (replace(study, transforms={"fastener_grip": "no_such_transform"}),
         "does not declare"),
    )
    for bad, phrase in cases:
        with pytest.raises(StudyError) as excinfo:
            traverse(topology, bad)
        message = str(excinfo.value)
        assert phrase in message
        # Named, so a build over many studies says which one is wrong.
        assert study.id in message


# --------------------------------------------------------------------------- #
# 9. requirement-cited checks: the -7/+72 end-stop studies                    #
# --------------------------------------------------------------------------- #

#: ``(path, check_id, expected total worst_case_half in degrees)``. The third
#: field is pinned literally -- not recomputed and compared against itself --
#: so a structural edit that quietly changes either study's chain (an added
#: edge, a swapped transform) reddens this test instead of silently reproducing
#: whatever the new number happens to be. Recomputed once, by hand, from
#: `summarize()` and never re-derived: -7 deg borrows the worst-case
#: sensitivity (larger ratios, wider band); +72 deg the full-sweep-average one.
END_STOP_STUDIES = (
    (TOPOLOGIES_DIR / "study_pitch_system_end_stop_minus7.json",
     "s461_607_margin_at_minus7", 1.091240625),
    (TOPOLOGIES_DIR / "study_pitch_system_end_stop_plus72.json",
     "s461_607_margin_at_plus72", 0.816796875),
)

#: The main checkout's copy of the requirements pull, gitignored (`data/` is
#: shared and absent in a worktree, per this repo's standing environment
#: rules) -- absent on another machine or in CI. Read when present, skipped
#: when not, the same shape `test_tolerance_stack.py`'s traced-ratio-publisher
#: check uses for the identical reason.
REQUIREMENTS_PULL = Path(
    r"C:\workspace\tolstack\data\inbox\requirements"
    r"\S461_equipmentrequirements_20260906.json")


def _stripped_c_description(item: dict) -> str:
    """``c_description`` with its ``text/html:`` prefix and tags stripped.

    The exact transform the handoff's item 1 requires of every citation of this
    artifact: ``c_description`` is HTML-ish, so a citation quotes the *text*,
    never the markup.
    """
    text = item["c_description"]
    if text.startswith("text/html:"):
        text = text[len("text/html:"):]
    return re.sub(r"<[^>]+>", "", text).strip()


@pytest.mark.parametrize("path, check_id, expected_half", END_STOP_STUDIES,
                          ids=lambda v: v if isinstance(v, str) else
                          (v.stem if isinstance(v, Path) else str(v)))
def test_an_end_stop_study_loads_its_check_and_folds_a_real_margin(
        path, check_id, expected_half):
    """``check_study`` computes -- the L1 grip-check pattern, over a real study.

    Not a synthetic fixture: this is the actual committed L2 topology and the
    actual committed study, so the numbers pinned here are the numbers a reader
    of the file would get. ``expected_half`` is pinned literally in
    ``END_STOP_STUDIES``, not recomputed and compared against itself.
    """
    topology = load_topology(TOPOLOGIES_DIR / "topology_pitch_system.json")
    study = load_study(path)
    assert study.checks and study.checks[0]["check_id"] == check_id

    total = summarize(topology, study).interval
    assert total.nominal == 0.0
    assert total.worst_case_half == pytest.approx(expected_half)

    result = check_study(topology, study, check_id)
    assert result.check_id == check_id
    assert result.units == "deg"
    assert result.complete is False
    assert result.verdict_scope == "budget", (
        "a check crossing untraced/assumed edges and a borrowed sensitivity "
        "condition must never render as a hardware verdict -- the standing "
        "CheckResult rule")
    assert result.excluded_terms, (
        "complete: false with no excluded_terms is refused by CheckResult "
        "itself; this asserts the spec actually named something")

    # The margin really is `limit - study_total`, not a second arithmetic path:
    # recompute it by hand from summarize()'s own interval and compare exactly.
    assert result.interval.nominal == pytest.approx(0.5 - total.nominal)
    assert result.interval.min == pytest.approx(0.5 - total.max)
    assert result.interval.max == pytest.approx(0.5 - total.min)


def test_check_study_refuses_an_unknown_check_id():
    topology = load_topology(TOPOLOGIES_DIR / "topology_pitch_system.json")
    study = load_study(TOPOLOGIES_DIR / "study_pitch_system_end_stop_minus7.json")
    with pytest.raises(StudyError, match="has no check"):
        check_study(topology, study, "no_such_check")


@pytest.mark.parametrize("path, check_id, _expected_half", END_STOP_STUDIES,
                          ids=lambda v: v if isinstance(v, str) else
                          (v.stem if isinstance(v, Path) else str(v)))
def test_an_end_stop_checks_requirement_citations_are_shaped_correctly(
        path, check_id, _expected_half):
    """The shape every citation must have, checkable with no external file:
    kind, the pull artifact's filename, the requirement id, and `c_status` in
    the note -- deliverable 2's "id + verbatim text + c_status + the pull
    artifact's filename", minus the text itself (pinned separately below,
    against the live artifact, when it is present to pin against).
    """
    raw = json.loads(path.read_text(encoding="utf-8"))
    check = raw["checks"][0]
    assert check["check_id"] == check_id
    limit_ref = check["limit"]["source_ref"]
    context_ref = check["context_ref"]
    for ref, c_id in ((limit_ref, "S461-607"), (context_ref, "S461-241")):
        assert ref["kind"] == "requirement"
        assert ref["kind"] in SOURCE_REF_KINDS
        assert ref["cell"] == c_id
        assert ref["document"] == "S461_equipmentrequirements_20260906.json"
        assert "c_status: draft" in ref["note"]
    assert limit_ref["confidence"] == "traced"
    # excluded_terms must name the S461-805 TBD gap and the borrowed-sensitivity
    # mismatch this study's own provenance argues for -- not just say `complete:
    # false` and leave a reader to re-derive why.
    joined = " ".join(check["excluded_terms"])
    assert "S461-805" in joined and "TBD" in joined
    assert "end_stop_clearance" in joined, (
        "the end stop itself -- the row this repo is least willing to "
        "overclaim -- must be named, not just implied by `complete: false`")


def test_the_end_stop_checks_quote_the_pulled_requirements_artifact_verbatim():
    """Deliverable 2's value-level pairing, against the artifact itself: the
    quoted text, the status, the id set. Skipped, not failed, where the
    gitignored pull is absent (another worktree, another machine, CI) -- the
    same shape `test_tolerance_stack.py`'s traced-ratio-publisher check uses.
    """
    if not REQUIREMENTS_PULL.exists():
        pytest.skip(f"{REQUIREMENTS_PULL} is gitignored and not present here")
    items = json.loads(REQUIREMENTS_PULL.read_text(encoding="utf-8"))["items"]
    by_id = {i["c_id"]: i for i in items}
    assert {"S461-241", "S461-607", "S461-805"} <= set(by_id)

    for path, _check_id, _expected_half in END_STOP_STUDIES:
        raw = json.loads(path.read_text(encoding="utf-8"))
        check = raw["checks"][0]
        limit_ref = check["limit"]["source_ref"]
        context_ref = check["context_ref"]
        for ref, c_id in ((limit_ref, "S461-607"), (context_ref, "S461-241")):
            item = by_id[c_id]
            assert ref["callout"] == _stripped_c_description(item), (
                f"{path.name}: the quoted text for {c_id} has drifted from the "
                f"pulled artifact")
            assert item["c_status"] == "draft", (
                f"{c_id}'s c_status moved off `draft` in the live pull -- the "
                f"citation's `c_status: draft` note is now stale")

        # The TBD gap named in excluded_terms is the requirement's own words,
        # not this session's paraphrase of them.
        assert "TBD deg" in _stripped_c_description(by_id["S461-805"])
        joined = " ".join(check["excluded_terms"])
        assert "S461-805" in joined

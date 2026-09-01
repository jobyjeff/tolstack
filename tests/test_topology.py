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
    Study,
    StudyError,
    TopologyError,
    Transform,
    UnitMismatch,
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

    # Nothing in this topology may claim to be traced: its one source is a
    # workbook that traces nothing (WORKSHEET_end_stop_graft.md, 0 of 43).
    overclaiming = [e.id for e in pitch_system.edges
                    if not e.derived
                    and e.dimension.source_ref.confidence != "untraced"]
    assert overclaiming == [], (
        f"{overclaiming} claim better than `untraced` in a topology whose only "
        f"value source is the end-stop workbook, which traces nothing")


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

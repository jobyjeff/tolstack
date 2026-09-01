"""Tolerance **topology**: interfaces as nodes, dimensions and gaps as edges.

The third archetype's data model, added 2026-08-31 by handoff
``dag_topology_format`` from the locked brief
``dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md``. Jeff's
statement of the model, which every decision below serves:

    nodes = mating surfaces/interfaces; edges = either **structural dimensions**
    (connecting two interfaces on the same physical part) or **gaps**
    (interfaces between parts). Summing a stack = applying transforms and
    summing the elements along a chain between two locations; a full analysis =
    multiple **studies** that each lasso a different portion of one global
    topology.

Not a solver -- read this before adding anything
------------------------------------------------

Parallel load paths are statically redundant. **Which path binds is a mechanics
question this module does not answer and must never guess at.** A study is a
*human-lassoed* subset of one topology; the code's whole job is to order that
selection, apply the declared transforms, and hand the result to the one
:func:`~tolerance_stack.stack.fold`. So:

* a selection that reaches a branch point with two unconsumed edges raises
  :class:`BranchAmbiguity`, naming the node and both candidates. It does not
  pick the shorter one, the first one, or the stiffer one.
* a selection whose edges do not form a single chain between the study's two
  endpoints raises :class:`BrokenChain`. It does not path-find the missing
  edges into place.
* nothing here reads ``properties`` (see :class:`Transform`), computes a
  stiffness, or resolves a redundancy.

If a future layer wants to *propose* a binding path, it belongs above this
module and it writes a study document a human then owns. Constraint solving is
out of scope by decision, not by omission.

One ``fold()``, still
---------------------

A study's total is :func:`~tolerance_stack.stack.fold` over
:class:`~tolerance_stack.stack.Term` objects, exactly like a stack's path or
check. The two things a traversal produces map onto ``Term``'s two existing
fields and introduce no third:

* **direction** -> ``sign``. An edge traversed from its ``from`` node to its
  ``to`` node enters ``+1``; against its own orientation, ``-1``. That is the
  same one-place-a-sign-can-be-wrong property ARCHITECTURE.md's "Why one
  ``fold()``" argues for, and it is now *derived from the graph* rather than
  authored, which is the one arithmetic thing this archetype makes safer.
* **transform** -> ``coefficient``. A transform's ``ratio`` is a positive
  magnitude and nothing else, so it is a per-term weight of exactly the kind
  ``hub_bearing_thermal_stack`` established on 2026-08-05 (a diametral 2, a
  thermal ``1 + dT*alpha``, a stiffness split ``k``). No element values are
  combined here. See ARCHITECTURE.md, "Where computation may live".

Why edges carry a ``Dimension`` and not a ``StackElement``
----------------------------------------------------------

:class:`Dimension` is ``StackElement`` minus one field: ``role`` is optional
here instead of mandatory. Everything else -- the ``nominal``/``min``/``max``
lengths, ``lmc``/``mmc`` as transcribed, ``plus_minus``, ``hardware_ref``, and
above all the ``source_ref`` with its ``kind``/``confidence`` vocabularies --
is the same object, imported from ``stack.py``, not re-declared. That is the
brief's watch item honoured: the identity and citation vocabulary is *shared*,
so the 3D-annotation surface resolving a feature identity resolves the same keys
either tool cites.

``role`` had to give, because ``ELEMENT_ROLES`` is the **grip-stack** vocabulary
(``bushing``, ``washer``, ``clamped_member``, ``fastener``, ...) and a pitch
link's length or a gas-spring body height is none of those words. The two ways
out that were *not* taken:

* adding ``link``/``plate``/``piston`` to ``ELEMENT_ROLES`` -- that pollutes a
  vocabulary the SOP teaches to grip-stack authors, and the SOP is explicitly
  out of this handoff's scope;
* a second, parallel value shape with its own citation fields -- which is the
  vocabulary fork the brief's watch item exists to prevent.

What a topology edge does not need a ``role`` for is the thing ``role`` was
carrying: *which part this dimension belongs to* is now structural, read off the
edge's two nodes and their ``part``. A ``role`` that **is** one of
``ELEMENT_ROLES`` is still accepted and preserved -- a grip-stack element
re-expressed as an edge keeps its own word -- and validated against the same
tuple, so no third spelling of that vocabulary exists.

Where the value lives: inline, or a reference
---------------------------------------------

An edge may hold its dimension inline (``dimension``), or **reference an element
of a committed stack** (``dimension_ref``), which :func:`load_topology` resolves
out of the stack JSON at load time. The reference form is what makes the L1
proof mean something: ``topology_vpa_output_to_pitch_plate.json`` re-expresses
``stack_vpa_output_to_pitch_plate.json`` as a graph and holds **no copied
numbers at all**, so "the study's totals match the stack's published numbers" is
structural rather than a coincidence that could drift on the next edit.

An edge with *neither* is a **derived gap**: the quantity a study computes
(``shank_out`` -- how far the bolt's full shank protrudes past the clamped
stack). It is a first-class edge because it is a real interface pair, and it is
refused inside a study's ``selection``, because a study cannot sum the answer it
is being asked for.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from tolerance_stack.stack import (
    ELEMENT_ROLES,
    Interval,
    SourceRef,
    StackElement,
    Term,
    fold,
    load_stack,
)

SCHEMA_TOPOLOGY = "joby.tolerance_stack/topology/v0"
SCHEMA_STUDY = "joby.tolerance_stack/study/v0"

#: What a node is. Both words name *a location on a part*; the difference is
#: whether a second part is there. **This tuple is the definition** -- the house
#: rule since ``three_field_vocabularies`` (2026-08-19) is that a field's domain
#: is a module-level constant the constructor reads, never an end-of-line comment
#: and never an inline literal. Paired against ``docs/DAG_TOPOLOGY.md`` by
#: ``tests/test_topology.py``.
#:
#: ``mating_surface`` = an interface where two parts touch, the brief's canonical
#: node, and it belongs to **both** of them (:attr:`Node.parts` has two entries).
#: ``datum_feature`` = a located feature on one part that nothing mates to -- the
#: end of a bolt's full-diameter shank (NAS6403 sheet 2 note (a)), a datum face, a
#: gear pitch line. A chain has to be able to *end* somewhere that is not a mate,
#: which is what the second word buys; a topology of nothing but
#: ``mating_surface`` cannot express "how far does the shank stick out".
#:
#: Both words are therefore **derivable** from ``len(parts)``, and so checkable:
#: :class:`Topology` refuses a node whose kind disagrees with its part list. The
#: word is carried anyway rather than derived silently, for the reason
#: :data:`EDGE_KINDS` is -- see the comment beside that check.
NODE_KINDS = ("mating_surface", "datum_feature")

#: What an edge is, and it is **checkable, not declarative**:
#:
#: * ``structural`` -- a dimension on ONE part, between two of that part's
#:   interfaces. It names its ``part``, and both endpoint nodes must list that
#:   part: a dimension cannot span two interfaces the part does not have.
#: * ``gap`` -- a distance between two interfaces that share **no** part. It
#:   names no part. (Two interfaces that do share one are a structural dimension
#:   on it, not a gap.)
#:
#: :class:`Topology` enforces all of that, so the word cannot disagree with the
#: graph it labels. This is the one place the brief's definition of an edge
#: becomes an invariant rather than a convention.
#:
#: Note what is *not* here: a hard face-to-face contact between two clamped
#: members is **one node**, not a zero-length gap edge. The interface is the
#: shared surface; a ``gap`` edge is for a distance across a clearance, which is
#: exactly the ``shank_out`` residual an L1 study computes.
EDGE_KINDS = ("structural", "gap")

#: How an edge's value enters a sum. ``ratio`` is the only arithmetic v0 has, and
#: the three words differ in what they *claim*, not in what they compute:
#:
#: * ``identity`` -- ratio 1.0, units unchanged. The default, and what makes
#:   every L1 chain fold to the numbers its stack already published.
#: * ``ratio`` -- a constant scalar within one unit (a lever arm, a 2:1 wedge).
#: * ``linear_to_rotary`` -- a constant sensitivity that converts a length into
#:   an angle. Units must differ; this is the word the pitch-arm coupling wears.
#:
#: Richer kinematics (a ratio that varies with position -- pitch-link swing
#: angle, the tangential/anti-rotation link effects the brief defers by name)
#: arrive as a fourth word plus a reader for :attr:`Transform.properties`. That
#: is why ``kind`` exists at all in a version where every transform is a
#: constant: the schema break is pre-paid.
TRANSFORM_KINDS = ("identity", "ratio", "linear_to_rotary")


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class TopologyError(ValueError):
    """A topology document that does not describe a graph."""


class StudyError(ValueError):
    """A study that cannot be resolved against its topology."""


class BranchAmbiguity(StudyError):
    """The selection reaches a branch point without choosing a branch.

    The named error of this archetype. A study standing at a node with two
    unconsumed selected edges is a *human's* unfinished decision -- which load
    path binds -- and the tool's contract is to say so and stop.
    """


class BrokenChain(StudyError):
    """The selection is not a single chain between the study's two endpoints."""


class CycleDetected(StudyError):
    """The selection walks back onto a node the chain already passed through."""


class UnitMismatch(StudyError):
    """The selected edges' transforms do not agree on an output unit."""


# ---------------------------------------------------------------------------
# Parts, nodes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Part:
    """One physical part -- the grouping a rail/swim-lane renderer colours by.

    Present so that ``structural`` vs ``gap`` is decidable (see
    :data:`EDGE_KINDS`) and so the viewer has a lane per part without inferring
    one. ``drawing``/``revision`` are the part's source-control identity where it
    has one; a part whose identity is *not* established says so in ``note``
    rather than borrowing a plausible drawing number.
    """

    id: str
    name: str
    drawing: Optional[str] = None
    revision: Optional[str] = None
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Part":
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**known)


@dataclass(frozen=True)
class Node:
    """One interface: a mating surface, or a located feature on a single part.

    ``parts`` is the interface's membership, **not** an owner: a mating surface
    is one surface belonging to the two parts that meet there, so it carries
    both ids, and that is what lets a structural edge assert "this dimension is
    on part X, between two of X's own interfaces".
    """

    id: str
    name: str
    parts: Tuple[str, ...] = ()      # 2 ids for a mate, 1 for a datum feature
    kind: str = "mating_surface"     # one of NODE_KINDS, above -- and checked
    source_ref: Optional[SourceRef] = None
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.kind not in NODE_KINDS:
            raise TopologyError(
                f"node {self.id!r}: kind must be one of {NODE_KINDS}, got "
                f"{self.kind!r}")
        object.__setattr__(self, "parts", tuple(self.parts))
        if not self.parts:
            raise TopologyError(
                f"node {self.id!r}: an interface is on at least one part")
        if len(set(self.parts)) != len(self.parts):
            raise TopologyError(
                f"node {self.id!r}: parts {list(self.parts)} lists a part twice")
        expected = "mating_surface" if len(self.parts) == 2 else "datum_feature"
        if len(self.parts) > 2:
            raise TopologyError(
                f"node {self.id!r}: an interface joins at most two parts, got "
                f"{list(self.parts)}. Three parts meeting at one nominal surface "
                f"is two interfaces plus whatever dimension separates them; say "
                f"which two this one is.")
        if self.kind != expected:
            raise TopologyError(
                f"node {self.id!r}: kind {self.kind!r} disagrees with its parts "
                f"{list(self.parts)} -- {len(self.parts)} part(s) makes this a "
                f"{expected!r}")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Node":
        d = dict(d)
        src = d.pop("source_ref", None)
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(source_ref=SourceRef.from_dict(src) if src else None, **known)


# ---------------------------------------------------------------------------
# The value an edge carries
# ---------------------------------------------------------------------------


@dataclass
class Dimension:
    """The dimension an edge carries: a ``StackElement`` with ``role`` freed.

    Field-for-field the stack's element, and deliberately so -- the module
    docstring's "Why edges carry a ``Dimension``" says why the one difference
    exists and why the two alternatives were refused. The value fields and the
    two derived properties are the entire surface
    :func:`~tolerance_stack.stack.fold` reads off a term's element, which
    ``tests/test_topology.py`` asserts by reading ``fold``'s own source rather
    than trusting this sentence.
    """

    id: str
    name: str
    nominal: float
    min: float
    max: float
    role: Optional[str] = None       # one of ELEMENT_ROLES when present
    lmc: Optional[float] = None      # as transcribed, for column-for-column checking
    mmc: Optional[float] = None
    plus_minus: Optional[float] = None
    hardware_ref: Optional[str] = None
    source_ref: Optional[SourceRef] = None
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.role is not None and self.role not in ELEMENT_ROLES:
            raise TopologyError(
                f"dimension {self.id!r}: role, when given, must be one of "
                f"{ELEMENT_ROLES}, got {self.role!r}. A topology edge does not "
                f"need one -- which part the dimension belongs to is read off the "
                f"edge's nodes -- so leave it out rather than stretching a "
                f"grip-stack word to fit")
        if self.min > self.max:
            raise TopologyError(
                f"dimension {self.id!r}: min {self.min} > max {self.max}")

    @property
    def mid(self) -> float:
        return (self.min + self.max) / 2.0

    @property
    def half_range(self) -> float:
        return (self.max - self.min) / 2.0

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Dimension":
        d = dict(d)
        src = d.pop("source_ref", None)
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(source_ref=SourceRef.from_dict(src) if src else None, **known)

    @classmethod
    def from_element(cls, element: StackElement) -> "Dimension":
        """The same dimension, carried over from a committed stack element.

        Everything transfers, ``role`` and ``source_ref`` included: a
        re-expressed element keeps its own citation and its own grip-stack word.
        """
        return cls(
            id=element.id, name=element.name, nominal=element.nominal,
            min=element.min, max=element.max, role=element.role,
            lmc=element.lmc, mmc=element.mmc, plus_minus=element.plus_minus,
            hardware_ref=element.hardware_ref, source_ref=element.source_ref,
            note=element.note,
        )


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Transform:
    """A constant sensitivity: what one unit of an edge's value is worth.

    ``ratio`` is a **positive magnitude**, for the reason ``Term.coefficient``
    is: direction belongs in the sign, and the sign here comes from the
    traversal, so a negative ratio would give the arithmetic two places to be
    backwards. A transform that means "this edge subtracts" is an edge oriented
    the other way round, not a negative number.

    ``units_in`` is the unit the edge's dimension is stored in (the topology's
    ``units``); ``units_out`` is the unit the contribution lands in. A study sums
    contributions only when every one of them agrees on ``units_out`` -- see
    :func:`summarize`.

    ``properties`` is the typed bag the brief names and does not build: edge
    stiffness/strength/mass, and the position-dependent kinematics (pitch-link
    swing angle, tangential-link effects) deferred by name. **Nothing in this
    module reads it.** It is here so that arriving at the real thing is an added
    reader rather than a schema break, and so the geometry behind a placeholder
    ratio can be written down where the ratio is (``pitch_arm_radius_mm``,
    ``blade_root_radius_mm``) instead of only in prose.
    """

    id: str
    kind: str = "identity"           # one of TRANSFORM_KINDS, above
    ratio: float = 1.0
    units_in: Optional[str] = None   # defaults to the topology's units
    units_out: Optional[str] = None  # defaults to units_in
    source_ref: Optional[SourceRef] = None
    properties: Dict[str, Any] = field(default_factory=dict)
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.kind not in TRANSFORM_KINDS:
            raise TopologyError(
                f"transform {self.id!r}: kind must be one of {TRANSFORM_KINDS}, "
                f"got {self.kind!r}")
        if not self.ratio > 0 or not math.isfinite(self.ratio):
            raise TopologyError(
                f"transform {self.id!r}: ratio must be a finite number > 0 -- "
                f"direction belongs to the traversal's sign, not to the ratio (the "
                f"same rule `Term.coefficient` follows) -- got {self.ratio!r}")
        if self.kind == "identity" and self.ratio != 1.0:
            raise TopologyError(
                f"transform {self.id!r}: kind 'identity' means ratio 1.0, got "
                f"{self.ratio!r}. Say kind 'ratio' if it scales.")

    def resolved(self, units: str) -> "Transform":
        """This transform with its unit defaults filled in from ``units``.

        Unit checks that need both ends live here rather than in the constructor,
        because a transform authored with neither unit spelled out is the common,
        correct case and only the topology knows what ``units`` is.
        """
        units_in = self.units_in or units
        units_out = self.units_out or units_in
        if units_in != units:
            raise TopologyError(
                f"transform {self.id!r}: units_in {units_in!r} is not the "
                f"topology's units {units!r}. A transform scales the edge's stored "
                f"value, so its input unit is the unit those values are in.")
        if self.kind == "identity" and units_out != units_in:
            raise TopologyError(
                f"transform {self.id!r}: kind 'identity' cannot change units "
                f"({units_in!r} -> {units_out!r})")
        if self.kind == "linear_to_rotary" and units_out == units_in:
            raise TopologyError(
                f"transform {self.id!r}: kind 'linear_to_rotary' converts a length "
                f"into an angle, so units_out must differ from units_in (both "
                f"{units_in!r}). Use kind 'ratio' for a scalar within one unit.")
        return Transform(
            id=self.id, kind=self.kind, ratio=self.ratio, units_in=units_in,
            units_out=units_out, source_ref=self.source_ref,
            properties=self.properties, note=self.note,
        )

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Transform":
        d = dict(d)
        src = d.pop("source_ref", None)
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(source_ref=SourceRef.from_dict(src) if src else None, **known)


#: The transform an edge that declares none gets. Its units are filled from the
#: topology by :meth:`Transform.resolved`, which is why they are ``None`` here
#: and why this constant is safe to share -- ``Transform`` is frozen and
#: ``resolved()`` returns a new one.
IDENTITY = Transform(id="identity", kind="identity", ratio=1.0)


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------


@dataclass
class Edge:
    """A structural dimension or a gap, between two nodes.

    ``from_node``/``to_node`` are spelled ``from``/``to`` in JSON, where they
    read as the graph terms they are; ``from`` is a Python keyword, so the
    dataclass cannot use it. The orientation is not a claim about which way the
    joint is assembled -- it is what fixes the **sign** a traversal gives this
    edge (module docstring, "One ``fold()``, still").
    """

    id: str
    name: str
    from_node: str
    to_node: str
    kind: str = "structural"         # one of EDGE_KINDS, above -- and checked
    part: Optional[str] = None       # required iff structural; the lane it draws in
    dimension: Optional[Dimension] = None
    dimension_ref: Optional[Dict[str, str]] = None
    transform: Optional[str] = None  # a Transform id declared by the topology
    properties: Dict[str, Any] = field(default_factory=dict)
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.kind not in EDGE_KINDS:
            raise TopologyError(
                f"edge {self.id!r}: kind must be one of {EDGE_KINDS}, got "
                f"{self.kind!r}")
        if self.kind == "structural" and not self.part:
            raise TopologyError(
                f"edge {self.id!r}: a structural dimension names the part it is a "
                f"dimension of")
        if self.kind == "gap" and self.part:
            raise TopologyError(
                f"edge {self.id!r}: kind 'gap' crosses between parts, so it names "
                f"no single part -- got {self.part!r}")
        if self.from_node == self.to_node:
            raise TopologyError(
                f"edge {self.id!r}: from and to are both {self.from_node!r} -- an "
                f"edge is a dimension between two interfaces")
        if self.dimension is not None and self.dimension_ref is not None:
            raise TopologyError(
                f"edge {self.id!r}: has both an inline dimension and a "
                f"dimension_ref. One value, one place it comes from.")

    @property
    def derived(self) -> bool:
        """True when this edge carries no value -- the quantity a study computes."""
        return self.dimension is None

    def other_end(self, node_id: str) -> str:
        if node_id == self.from_node:
            return self.to_node
        if node_id == self.to_node:
            return self.from_node
        raise KeyError(f"edge {self.id!r} does not touch node {node_id!r}")

    def sign_from(self, node_id: str) -> int:
        """``+1`` when entered at ``from``, ``-1`` when entered at ``to``."""
        if node_id == self.from_node:
            return 1
        if node_id == self.to_node:
            return -1
        raise KeyError(f"edge {self.id!r} does not touch node {node_id!r}")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Edge":
        d = dict(d)
        if "from" in d:
            d["from_node"] = d.pop("from")
        if "to" in d:
            d["to_node"] = d.pop("to")
        dim = d.pop("dimension", None)
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(dimension=Dimension.from_dict(dim) if dim else None, **known)


# ---------------------------------------------------------------------------
# The topology
# ---------------------------------------------------------------------------


@dataclass
class Topology:
    """One system's global topology: parts, nodes, edges, named transforms.

    ``units`` is the unit **every edge's stored dimension is in** -- a topology
    does not mix them, and :meth:`Transform.resolved` refuses a transform whose
    ``units_in`` says otherwise. What a study's *output* unit is depends on the
    transforms it crosses, which is the whole point of them.
    """

    id: str
    title: str
    units: str
    parts: List[Part] = field(default_factory=list)
    nodes: List[Node] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    transforms: List[Transform] = field(default_factory=list)
    provenance: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._parts = _unique("part", self.parts)
        self._nodes = _unique("node", self.nodes)
        self._edges = _unique("edge", self.edges)
        self._transforms = _unique("transform", self.transforms)
        if "identity" in self._transforms:
            raise TopologyError(
                f"topology {self.id!r}: 'identity' is the reserved id of the "
                f"default transform (topology.IDENTITY); name a declared one "
                f"after what it does")

        for node in self.nodes:
            for part_id in node.parts:
                if part_id not in self._parts:
                    raise TopologyError(
                        f"topology {self.id!r}: node {node.id!r} is on part "
                        f"{part_id!r}, which the document does not declare")

        # Every named transform is unit-checked here rather than lazily, so a
        # document with an impossible transform fails at load even if no study
        # in the tree happens to select the edge that carries it.
        self._resolved = {t.id: t.resolved(self.units) for t in self.transforms}

        self._incident: Dict[str, List[Edge]] = {n.id: [] for n in self.nodes}
        for edge in self.edges:
            for end in (edge.from_node, edge.to_node):
                if end not in self._nodes:
                    raise TopologyError(
                        f"topology {self.id!r}: edge {edge.id!r} names node "
                        f"{end!r}, which the document does not declare")
            if edge.transform is not None and edge.transform not in self._resolved:
                raise TopologyError(
                    f"topology {self.id!r}: edge {edge.id!r} names transform "
                    f"{edge.transform!r}, which the document does not declare")
            # The brief's definition of an edge, as an invariant. A `structural`
            # edge is BY DEFINITION a dimension on one part between two of that
            # part's interfaces, and a `gap` BY DEFINITION crosses between
            # parts, so both labels are derivable -- and therefore checkable.
            # Carrying them explicitly and checking is worth more than deriving
            # silently: the author writes down what they think the edge is, and a
            # mis-assigned interface surfaces here, with a message, instead of as
            # a wrong colour on a rail three handoffs later.
            shared = (set(self.node(edge.from_node).parts)
                      & set(self.node(edge.to_node).parts))
            if edge.kind == "structural":
                if edge.part not in self._parts:
                    raise TopologyError(
                        f"topology {self.id!r}: edge {edge.id!r} is a dimension of "
                        f"part {edge.part!r}, which the document does not declare")
                if edge.part not in shared:
                    raise TopologyError(
                        f"topology {self.id!r}: edge {edge.id!r} is a dimension of "
                        f"part {edge.part!r}, but that part is not on both of its "
                        f"interfaces ({edge.from_node!r} is on "
                        f"{list(self.node(edge.from_node).parts)}, "
                        f"{edge.to_node!r} is on "
                        f"{list(self.node(edge.to_node).parts)}). A structural "
                        f"dimension spans two interfaces the part actually has.")
            elif shared:
                raise TopologyError(
                    f"topology {self.id!r}: edge {edge.id!r} is kind 'gap' but its "
                    f"two interfaces share part(s) {sorted(shared)}. Two "
                    f"interfaces of one part are separated by a structural "
                    f"dimension of it, not by a gap.")
            self._incident[edge.from_node].append(edge)
            self._incident[edge.to_node].append(edge)

    # -- lookups ----------------------------------------------------------

    def part(self, part_id: str) -> Part:
        return _get("part", self._parts, part_id, self.id)

    def node(self, node_id: str) -> Node:
        return _get("node", self._nodes, node_id, self.id)

    def edge(self, edge_id: str) -> Edge:
        return _get("edge", self._edges, edge_id, self.id)

    def transform(self, transform_id: Optional[str]) -> Transform:
        """The resolved transform for ``transform_id``; ``None`` -> :data:`IDENTITY`."""
        if transform_id is None:
            return IDENTITY.resolved(self.units)
        return _get("transform", self._resolved, transform_id, self.id)

    def incident(self, node_id: str) -> List[Edge]:
        """Every edge touching ``node_id``, in document order."""
        if node_id not in self._nodes:
            raise KeyError(f"topology {self.id!r} has no node {node_id!r}")
        return list(self._incident[node_id])

    def edges_on_part(self, part_id: str) -> List[Edge]:
        """Every structural edge that is a dimension of ``part_id``.

        The per-part grouping a rail/swim-lane renderer needs, read off the graph
        rather than re-authored beside it: a part's lane is its structural edges,
        and a ``gap`` edge is what crosses between two lanes.
        """
        self.part(part_id)
        return [e for e in self.edges if e.part == part_id]

    def nodes_on_part(self, part_id: str) -> List[Node]:
        """Every interface ``part_id`` has -- the ends of its lane."""
        self.part(part_id)
        return [n for n in self.nodes if part_id in n.parts]

    def branch_nodes(self) -> List[str]:
        """Node ids with three or more edges -- where a study must choose.

        Reported, never resolved. This is the navigation aid the viewer wants
        (mark the fork) and the list a study author reads before lassoing.
        """
        return [n.id for n in self.nodes if len(self._incident[n.id]) > 2]


# ---------------------------------------------------------------------------
# Studies
# ---------------------------------------------------------------------------


@dataclass
class Study:
    """A human-lassoed chain through one topology.

    ``selection`` is the lasso: the edge ids the human chose, in any order --
    :func:`traverse` puts them in chain order, and the order in the file is not
    trusted for anything, because a selection whose file order happened to be a
    valid chain would hide exactly the branch ambiguity this archetype exists to
    report.

    ``transforms`` is a per-study override map, ``{edge id: transform id}``,
    layered over each edge's own default. It exists because the same topology is
    summed under different sensitivities: Jeff's end-stop workbook runs **two**
    parallel result columns over one set of rows -- the error at blade pitch -5
    degrees (worst case) and the error at the full-sweep-average motion ratio --
    and those are one topology with two transform sets, not two topologies.

    ``closes`` names the derived gap edge this study computes, when there is one.
    It is the bridge to the stack vocabulary: a stack's *check* ("fastener grip
    minus the clamped stack") is topologically the closure of a loop, and the
    residual is a gap edge. Naming it makes the study's total comparable to a
    published check result instead of merely numerically equal to one.
    """

    id: str
    title: str
    topology: str
    from_node: str
    to_node: str
    selection: List[str] = field(default_factory=list)
    transforms: Dict[str, str] = field(default_factory=dict)
    closes: Optional[str] = None
    provenance: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.selection:
            raise StudyError(f"study {self.id!r}: the selection is empty")
        seen = set()
        duplicated = sorted({e for e in self.selection
                             if e in seen or seen.add(e)})
        if duplicated:
            raise StudyError(
                f"study {self.id!r}: selection lists {duplicated} more than once. "
                f"An edge is one dimension; a chain crosses it once.")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Study":
        d = dict(d)
        if "from" in d:
            d["from_node"] = d.pop("from")
        if "to" in d:
            d["to_node"] = d.pop("to")
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**known)


@dataclass(frozen=True)
class Contribution:
    """One edge's entry in a study's chain: the edge, its sign, its transform.

    ``term`` is the :class:`~tolerance_stack.stack.Term` this becomes, and it is
    the only thing the arithmetic uses. Everything else on this class is for a
    reader (or a grid row): ``nominal``/``min``/``max`` are this edge's own
    signed, scaled contribution, so a row can show what it added without the
    reader re-deriving ``value x transform``.
    """

    edge: Edge
    sign: int
    transform: Transform
    entered_at: str                  # the node the chain was standing on
    left_at: str                     # the node it moved to

    @property
    def dimension(self) -> Dimension:
        assert self.edge.dimension is not None    # guaranteed by traverse()
        return self.edge.dimension

    @property
    def weight(self) -> float:
        """``sign * ratio`` -- what this edge's value is multiplied by."""
        return self.sign * self.transform.ratio

    @property
    def term(self) -> Term:
        return Term(self.dimension, self.sign, self.transform.ratio)

    @property
    def nominal(self) -> float:
        return self.weight * self.dimension.nominal

    @property
    def min(self) -> float:
        w = self.weight
        return w * (self.dimension.min if w > 0 else self.dimension.max)

    @property
    def max(self) -> float:
        w = self.weight
        return w * (self.dimension.max if w > 0 else self.dimension.min)

    @property
    def units(self) -> str:
        assert self.transform.units_out is not None      # resolved()
        return self.transform.units_out

    def as_dict(self) -> Dict[str, Any]:
        return {
            "edge": self.edge.id,
            "name": self.edge.name,
            "edge_kind": self.edge.kind,
            "from": self.entered_at,
            "to": self.left_at,
            "dimension": self.dimension.id,
            "sign": self.sign,
            "transform": self.transform.id,
            "ratio": self.transform.ratio,
            "weight": self.weight,
            "value_nominal": self.dimension.nominal,
            "value_min": self.dimension.min,
            "value_max": self.dimension.max,
            "nominal": self.nominal,
            "min": self.min,
            "max": self.max,
            "units": self.units,
        }


@dataclass(frozen=True)
class StudyResult:
    """A study's ordered chain plus the one fold over it."""

    study: Study
    chain: Tuple[Contribution, ...]
    interval: Interval
    units: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "study": self.study.id,
            "title": self.study.title,
            "topology": self.study.topology,
            "from": self.study.from_node,
            "to": self.study.to_node,
            "closes": self.study.closes,
            "units": self.units,
            "chain": [c.as_dict() for c in self.chain],
            **self.interval.as_dict(),
        }


# ---------------------------------------------------------------------------
# Traversal + summation
# ---------------------------------------------------------------------------


def traverse(topology: Topology, study: Study) -> List[Contribution]:
    """Order ``study``'s selection into a chain from ``from_node`` to ``to_node``.

    The walk is deliberately the dumbest one that cannot guess: stand on a node,
    look at the selected edges touching it that have not been consumed, and

    * exactly one -> cross it, sign from the orientation, move on;
    * two or more -> :class:`BranchAmbiguity`, naming the node and the
      candidates. **This is the whole not-a-solver rule in three lines of
      code**: the human chose a set of edges that still contains a fork, and
      resolving it needs mechanics the tool does not have;
    * none, and not yet at ``to_node`` -> :class:`BrokenChain`.

    A selected edge left unconsumed when the chain arrives is also a
    :class:`BrokenChain`: it is a stub hanging off the chain or a disconnected
    second component, and either way the total would silently omit it.
    """
    if study.topology != topology.id:
        raise StudyError(
            f"study {study.id!r} is a study of topology {study.topology!r}, not "
            f"{topology.id!r}")
    for end in (study.from_node, study.to_node):
        if end not in {n.id for n in topology.nodes}:
            raise StudyError(
                f"study {study.id!r}: endpoint {end!r} is not a node of topology "
                f"{topology.id!r}")
    if study.from_node == study.to_node:
        raise StudyError(
            f"study {study.id!r}: from and to are both {study.from_node!r} -- a "
            f"study sums between two locations")

    remaining: Dict[str, Edge] = {}
    for edge_id in study.selection:
        edge = topology.edge(edge_id)
        if edge.derived:
            raise StudyError(
                f"study {study.id!r}: edge {edge_id!r} carries no dimension -- it "
                f"is the gap a study computes, not a term it sums. Name it in "
                f"`closes` instead.")
        remaining[edge_id] = edge
    for edge_id in study.transforms:
        if edge_id not in remaining:
            raise StudyError(
                f"study {study.id!r}: the transforms map overrides edge "
                f"{edge_id!r}, which is not in the selection")
        topology.transform(study.transforms[edge_id])

    if study.closes is not None:
        closing = topology.edge(study.closes)
        if study.closes in remaining:
            raise StudyError(
                f"study {study.id!r}: `closes` names {study.closes!r}, which is "
                f"also in the selection. A study cannot sum the gap it closes.")
        if {closing.from_node, closing.to_node} != {study.from_node, study.to_node}:
            raise StudyError(
                f"study {study.id!r}: `closes` names edge {study.closes!r}, whose "
                f"ends are {closing.from_node!r}/{closing.to_node!r} -- not this "
                f"study's {study.from_node!r}/{study.to_node!r}. The gap a study "
                f"closes is the one between its two endpoints.")

    chain: List[Contribution] = []
    node = study.from_node
    visited = [node]
    while node != study.to_node:
        options = [e for e in topology.incident(node) if e.id in remaining]
        if len(options) > 1:
            raise BranchAmbiguity(
                f"study {study.id!r} reaches node {node!r} "
                f"({topology.node(node).name!r}) with "
                f"{len(options)} selected edges still unused: "
                + ", ".join(f"{e.id!r} ({e.name!r})" for e in options)
                + ". That is a branch point, and which path binds is a mechanics "
                  "decision this tool does not make. Drop the branches this study "
                  "is not about from `selection`, or split it into one study per "
                  "path."
            )
        if not options:
            raise BrokenChain(
                f"study {study.id!r} stops at node {node!r} "
                f"({topology.node(node).name!r}) with no selected edge left to "
                f"cross, and that is not its `to` node ({study.to_node!r}). The "
                f"selection is not a chain between the two endpoints: "
                + (f"still unused: {sorted(remaining)}" if remaining
                   else "every selected edge is used, so the chain is short")
            )
        edge = options[0]
        del remaining[edge.id]
        nxt = edge.other_end(node)
        if nxt in visited:
            raise CycleDetected(
                f"study {study.id!r}: crossing edge {edge.id!r} returns to node "
                f"{nxt!r}, which this chain already passed through "
                f"({' -> '.join(visited)}). A study is a chain, not a loop; the "
                f"loop closure is the gap it computes (`closes`)."
            )
        transform_id = study.transforms.get(edge.id, edge.transform)
        chain.append(Contribution(
            edge=edge, sign=edge.sign_from(node),
            transform=topology.transform(transform_id),
            entered_at=node, left_at=nxt,
        ))
        visited.append(nxt)
        node = nxt

    if remaining:
        raise BrokenChain(
            f"study {study.id!r} reached its `to` node {study.to_node!r} with "
            f"selected edges never crossed: {sorted(remaining)}. Those hang off "
            f"the chain (a stub, or a disconnected second component) and their "
            f"values would be silently dropped from the total. Remove them from "
            f"`selection`, or make them part of the chain."
        )
    return chain


def summarize(topology: Topology, study: Study) -> StudyResult:
    """The ordered chain and the one :func:`~tolerance_stack.stack.fold` over it.

    The unit check is the honest half of this function. Every contribution lands
    in its transform's ``units_out``, and contributions in different units are
    **not summed** -- they raise :class:`UnitMismatch`. That is the mechanised
    form of a finding this repo already wrote down by hand: the end-stop
    workbook's raw-millimetre total (``WORKSHEET_end_stop_graft.md`` section 2f)
    sums vertical and tangential contributors in one column and is not a
    physically meaningful number. Converting every contributor into one common
    output quantity, which is what that workbook's own result columns do, is the
    author's job -- and refusing to add millimetres to degrees is the least this
    can do about it.
    """
    chain = traverse(topology, study)
    units = {c.units for c in chain}
    if len(units) > 1:
        by_unit = {}
        for c in chain:
            by_unit.setdefault(c.units, []).append(c.edge.id)
        raise UnitMismatch(
            f"study {study.id!r} mixes output units: "
            + "; ".join(f"{u!r} from {sorted(ids)}" for u, ids in sorted(by_unit.items()))
            + ". A total is only a number when every contributor is in the same "
              "quantity: give each selected edge a transform into the common "
              "output unit (which is what the end-stop workbook's result columns "
              "do), or split the study at the coupling."
        )
    return StudyResult(
        study=study,
        chain=tuple(chain),
        interval=fold(c.term for c in chain),
        units=units.pop() if units else topology.units,
    )


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------


#: Where a ``dimension_ref``'s repo-relative ``stack`` path is resolved from when
#: :func:`load_topology` is not told otherwise: this package's parent, i.e. the
#: repo root. Named so a caller working against a copy of the tree (a test, a
#: projection builder run from elsewhere) can point it somewhere else.
REPO_ROOT = Path(__file__).resolve().parent.parent


def load_topology(path: str | Path, repo_root: str | Path | None = None) -> Topology:
    """Load a topology JSON, resolving every ``dimension_ref`` as it goes.

    A ref is ``{"stack": "<repo-relative path>", "element": "<element id>"}``,
    read through :func:`~tolerance_stack.stack.load_stack` so the referenced file
    gets its own schema check, and each stack file is read once per call.
    """
    root = Path(repo_root) if repo_root is not None else REPO_ROOT
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA_TOPOLOGY:
        raise TopologyError(
            f"{path}: expected schema {SCHEMA_TOPOLOGY!r}, got "
            f"{data.get('schema')!r}")

    edges = [Edge.from_dict(e) for e in data.get("edges", [])]
    cache: Dict[str, Any] = {}
    for edge in edges:
        if edge.dimension_ref is None:
            continue
        ref = edge.dimension_ref
        for key in ("stack", "element"):
            if not ref.get(key):
                raise TopologyError(
                    f"{path}: edge {edge.id!r}: dimension_ref needs a {key!r}, got "
                    f"{ref!r}")
        stack_path = root / ref["stack"]
        if ref["stack"] not in cache:
            if not stack_path.exists():
                raise TopologyError(
                    f"{path}: edge {edge.id!r} references {ref['stack']}, which is "
                    f"not in the tree at {stack_path}. A dimension_ref is a "
                    f"repo-relative path to a committed stack file.")
            cache[ref["stack"]] = load_stack(stack_path)
        stack = cache[ref["stack"]]
        try:
            element = stack.element(ref["element"])
        except KeyError as exc:
            raise TopologyError(
                f"{path}: edge {edge.id!r}: {ref['stack']} has no element "
                f"{ref['element']!r}") from exc
        edge.dimension = Dimension.from_element(element)

    return Topology(
        id=data["id"],
        title=data["title"],
        units=data["units"],
        parts=[Part.from_dict(p) for p in data.get("parts", [])],
        nodes=[Node.from_dict(n) for n in data.get("nodes", [])],
        edges=edges,
        transforms=[Transform.from_dict(t) for t in data.get("transforms", [])],
        provenance=data.get("provenance", {}),
        notes=data.get("notes", []),
    )


def load_study(path: str | Path) -> Study:
    """Load a study JSON file."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA_STUDY:
        raise StudyError(
            f"{path}: expected schema {SCHEMA_STUDY!r}, got {data.get('schema')!r}")
    return Study.from_dict(data)


# ---------------------------------------------------------------------------
# Small shared helpers
# ---------------------------------------------------------------------------


def _unique(what: str, items: Iterable[Any]) -> Dict[str, Any]:
    """``{id: item}``, refusing a duplicate id by name rather than by count."""
    out: Dict[str, Any] = {}
    for item in items:
        if item.id in out:
            raise TopologyError(f"duplicate {what} id {item.id!r}")
        out[item.id] = item
    return out


def _get(what: str, table: Dict[str, Any], key: str, owner: str) -> Any:
    try:
        return table[key]
    except KeyError:
        raise KeyError(f"{owner!r} has no {what} {key!r}") from None

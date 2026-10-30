"""The feature-identity stream: immutable bindings, and the projection that folds them.

Of 43 endstop ground-truth rows (the baseline behind handoff
``annotation_surface_mvp``, 2026-09-06), measurement blocked 0 and **identity
blocked 15**: a dimension's value extracts losslessly from a drawing, but
nothing states *which physical feature* a stack element or topology edge
means. This module is the schema and fold for the surface that resolves that
-- ``apps/annotate/`` selects geometry and writes one event per binding; it
never measures, sums, or proposes a value. See
``docs/tolerance_stacks/annotation_surface/README.md`` for the app-facing
picture and ``docs/DAG_TOPOLOGY.md`` for the stack-side key vocabulary this
module reuses rather than forks.

Binding is identity, not a value source
----------------------------------------
A released 2D drawing face always wins (the brief's decision 6). Nothing here
ever supplies a dimension: a ``FeatureIdentityEvent`` names a face, not a
number, and a consumer that finds both a drawing citation and a binding for
the same stack-side key must say the drawing wins, in the UI, in plain words.

One identity namespace with the DAG topology model
----------------------------------------------------
The stack-side key ("which stack element or topology edge does this binding
mean") is deliberately **not** a new vocabulary: it is either a
``topology_edge`` (``topology_id`` + ``edge_id``, ``tolerance_stack.topology``'s
own ids) or a ``stack_element`` (``stack_id`` + ``element_id``,
``tolerance_stack.stack``'s own ids) -- the brief's decision 4, "the
annotation surface's feature-identity keys ARE the DAG's node/edge keys."

Many-to-many, with direction and composition
----------------------------------------------
One callout can feed three stack rows in different directions, and one row
can sum two callouts -- both observed in the endstop rows that *succeeded*, so
a 1:1 tag model was ruled out by evidence before this was written. A
``bound`` event's ``direction`` records which of the stack-side key's two
ends (``"from"``/``"to"``, the same words ``topology.Edge`` uses) the face
plays for *this* binding, and an optional ``composition_note`` records how it
combines with sibling bindings -- prose, because how two callouts sum is an
author's finding, not something this schema computes.

Per-part attribution, owner-not-in-set, and path provenance
--------------------------------------------------------------
The fastener_stack_shadow finding (brief decision 3): the deciding quantity
for a stack element sometimes lives in *another part's* file. So a binding
records ``owner_part`` when the owning part is known, and a first-class
``verdict: "owner_not_in_set"`` -- carrying no geometry at all -- for "the
loaded part set does not contain the owner". ``owner_path`` says *how* the
owner was reached: ``"direct"`` (the part set's own BOM) or ``"hypothesis"``
(a lateral hop through another configuration's assembly, per the baseline's
hub case) -- a hypothesis about identity is not a fact and must not print like
one.

GD&T modifier and general-tolerance regime are identity (decision 5)
------------------------------------------------------------------------
A drawing's Ⓛ against a workbook's "MMC", or a part whose general-tolerance
block is ISO-2768-mK while three siblings print a decimal-place block instead
-- both change what a dimension *means*, not just what it says, so both are
optional identity fields on the binding rather than left to be inferred later.

Face identity is a fingerprint, not a bare index
----------------------------------------------------
The step_tessellation spike found ``face_id`` to be traversal-order,
empirically stable across an *unedited* re-export and untested across a real
geometry edit. So a ``geometry_key`` carries the face's ``area_native2`` +
``centroid_native`` alongside ``face_id`` -- copied from
``data/meshes/<sha>/manifest.json`` at binding time -- and :func:`revalidate`
re-checks a stored binding against a **replacement** mesh's manifest by that
fingerprint, never by index alone. A non-match is ``needs_re_confirmation``,
never silently re-bound and never dropped -- the same three-outcome posture
``tolerance_stack.spec_library`` uses for a value/absence/unreadable.

An agent proposes; a human ratifies (2026-10-28)
--------------------------------------------------
A ``proposed`` event names a face exactly as a ``bound`` one does, written by
``scripts/propose_bindings.py`` with ``recorded_by: "agent:<handoff-slug>"``,
a ``confidence``, a one-line ``basis`` and the face's ``surface_class``. The
fold never lets it stand: it is listed under ``proposals``, and everything that
reads ``bindings`` -- the fitter, the scene's anchors, a row's state -- is blind
to it. A human answers in the annotator: **Accept** writes an ordinary
``bound`` event with ``ratifies: <proposal id>`` (the same face, the same end,
checked), **Reject** writes ``rejected`` with ``rejects: <proposal id>``, and a
rejected face is never proposed for that key again. An ``agent:`` actor can
write neither.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from tolerance_stack.feature_geometry import SURFACE_CLASSES

SCHEMA_EVENT = "joby.tolerance_stack/feature-identity/v0"
SCHEMA_PROJECTION = "joby.tolerance_stack/feature-identity-projection/v0"

# What kind of thing a stack-side key names. **This tuple is the definition.**
# `topology_edge` reuses `tolerance_stack.topology.Topology`/`Edge` ids;
# `stack_element` reuses `tolerance_stack.stack.StackDefinition`/`StackElement`
# ids. No third kind exists because there is no third place in this repo an
# author declares a dimension.
STACK_KEY_KINDS = ("topology_edge", "stack_element")

# The outcome of one binding attempt. `bound` names a face; `owner_not_in_set`
# names why it cannot yet -- the loaded part set doesn't contain the owner --
# and carries no geometry_key at all, because there is no face to cite.
#
# Since 2026-10-28 (handoff an_agent_proposes_a_face_binding_and_a_human_
# ratifies_it) two more: `proposed` names a face the way `bound` does, but
# NEVER STANDS -- the fold keeps it apart from `bindings`, so no fitted
# nominal, no anchor and no rail state reads it as a binding; and `rejected`
# names the proposal a human turned down (`rejects`), carrying no face. A human
# accepting a proposal writes an ordinary `bound` event naming it in
# `ratifies`. Agents propose; only a human binds or rejects (`AGENT_ACTOR`).
VERDICTS = ("bound", "owner_not_in_set", "proposed", "rejected")
# The verdicts that name a face (a geometry_key and a direction), and the ones
# only a human may write. Subsets of VERDICTS, named so the checks below never
# spell a verdict set inline.
FACE_VERDICTS = ("bound", "proposed")
HUMAN_ONLY_VERDICTS = ("bound", "rejected")

# How sure the proposing agent is. `high`: the contact engine's one clear top
# pair, or a shape class plus a drawing crop that leave one face. `medium`: a
# discriminating fact (stated in `basis`) chose between close candidates.
# `low`: a best guess a human should look at hardest.
PROPOSAL_CONFIDENCES = ("high", "medium", "low")

# Who wrote an event, as the prefix of `recorded_by` ("<kind>:<who>"):
# `annotate-app:<reviewer>` from the annotator, `agent:<handoff-slug>` from
# scripts/propose_bindings.py. Events written before 2026-10-28 carry a bare
# "annotate-app" (or a test's own string) and still load -- the prefix is read,
# never required, except that an `agent:` actor may not bind or reject.
ACTOR_KINDS = ("annotate-app", "agent")
AGENT_ACTOR = "agent"

# How the owner part named by a binding was reached. `direct`: the part set's
# own BOM/assembly names it. `hypothesis`: a lateral hop through another
# configuration's assembly -- the baseline's hub case -- which is a guess
# about identity and must be carried as one, never printed like a direct hit.
PATH_KINDS = ("direct", "hypothesis")

# Which end of the stack-side key's dimension the bound face plays. Reuses
# `topology.Edge`'s own `from`/`to` words rather than inventing a second pair,
# since a topology_edge key already has ends named exactly this; a
# stack_element key borrows the same two words for the same question (which
# side of the element's length this face closes).
DIRECTIONS = ("from", "to")

# ASME Y14.5 material-condition modifiers as printed on a drawing. `None`
# (the field simply absent) means no modifier is printed -- RFS is the
# default under Y14.5-2018 and is not a fourth word here, it is the absence
# of one, the same "absence is not a value" posture the spec library uses.
GDT_MODIFIERS = ("M", "L")

#: Matching tolerance for :func:`revalidate`, in the STEP's native units
#: (mm^2 for area, mm for a centroid coordinate on a CATIA export) -- the same
#: threshold `rotorkit.stepgeom.tessellate`'s own re-export stability check
#: uses (`tessellate_parts.py::identity_investigation`), so a binding is held
#: to no looser a standard than the spike's own proof was.
FACE_AREA_TOLERANCE = 1e-3
FACE_CENTROID_TOLERANCE = 1e-3


def actor_kind(recorded_by: str) -> Optional[str]:
    """The :data:`ACTOR_KINDS` word ``recorded_by`` starts with, or ``None``."""
    text = str(recorded_by or "")
    head = text.split(":", 1)[0]
    return head if ":" in text and head in ACTOR_KINDS else None


# ---------------------------------------------------------------------------
# Keys
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class StackKey:
    """Which stack element or topology edge a binding names.

    Exactly one of the two id pairs is set, matched to ``kind`` -- validated
    rather than left to a reader to notice a ``stack_element`` carrying a
    ``topology_id``.
    """

    kind: str
    topology_id: Optional[str] = None
    edge_id: Optional[str] = None
    stack_id: Optional[str] = None
    element_id: Optional[str] = None

    def __post_init__(self) -> None:
        if self.kind not in STACK_KEY_KINDS:
            raise ValueError(f"stack_key kind must be one of {STACK_KEY_KINDS}, got {self.kind!r}")
        if self.kind == "topology_edge":
            if not (self.topology_id and self.edge_id):
                raise ValueError("stack_key kind=topology_edge requires topology_id and edge_id")
            if self.stack_id or self.element_id:
                raise ValueError("stack_key kind=topology_edge must not carry stack_id/element_id")
        else:  # stack_element
            if not (self.stack_id and self.element_id):
                raise ValueError("stack_key kind=stack_element requires stack_id and element_id")
            if self.topology_id or self.edge_id:
                raise ValueError("stack_key kind=stack_element must not carry topology_id/edge_id")

    def as_key(self) -> Tuple[str, str, str]:
        """A hashable, total-ordering-friendly identity for fold grouping."""
        if self.kind == "topology_edge":
            return (self.kind, self.topology_id, self.edge_id)
        return (self.kind, self.stack_id, self.element_id)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "StackKey":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass(frozen=True)
class GeometryKey:
    """A mesh face, plus the fingerprint that lets a consumer detect drift.

    ``face_id`` alone is traversal-order and only proven stable across an
    *unedited* re-export (the step_tessellation spike) -- ``area_native2`` +
    ``centroid_native`` are copied from ``data/meshes/<sha>/manifest.json`` at
    binding time precisely so :func:`revalidate` never has to trust the index
    blind.
    """

    source_step_sha256: str
    face_id: int
    area_native2: float
    centroid_native: Tuple[float, float, float]

    def __post_init__(self) -> None:
        if len(self.source_step_sha256) != 64:
            raise ValueError(f"source_step_sha256 must be a 64-char hex sha256, got {self.source_step_sha256!r}")
        if len(self.centroid_native) != 3:
            raise ValueError("centroid_native must have exactly 3 components")

    def as_key(self) -> Tuple[str, int]:
        return (self.source_step_sha256, self.face_id)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "GeometryKey":
        return cls(
            source_step_sha256=d["source_step_sha256"],
            face_id=int(d["face_id"]),
            area_native2=float(d["area_native2"]),
            centroid_native=tuple(float(c) for c in d["centroid_native"]),
        )

    def as_dict(self) -> Dict[str, Any]:
        return {
            "source_step_sha256": self.source_step_sha256,
            "face_id": self.face_id,
            "area_native2": self.area_native2,
            "centroid_native": list(self.centroid_native),
        }


@dataclass(frozen=True)
class OwnerPath:
    """How the owner part named by a binding was reached."""

    kind: str
    via: Optional[str] = None
    note: Optional[str] = None

    def __post_init__(self) -> None:
        if self.kind not in PATH_KINDS:
            raise ValueError(f"owner_path kind must be one of {PATH_KINDS}, got {self.kind!r}")
        if self.kind == "hypothesis" and not (self.via or self.note):
            raise ValueError("owner_path kind=hypothesis must say what the lateral hop was, via or note")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "OwnerPath":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ---------------------------------------------------------------------------
# The event
# ---------------------------------------------------------------------------


@dataclass
class FeatureIdentityEvent:
    """One immutable binding (or owner-not-in-set finding), as written by
    ``apps/annotate/``."""

    event_id: str
    seq: int
    created_at: str
    recorded_by: str
    stack_key: StackKey
    verdict: str
    geometry_key: Optional[GeometryKey] = None
    direction: Optional[str] = None
    composition_note: Optional[str] = None
    owner_part: Optional[str] = None
    owner_path: Optional[OwnerPath] = None
    gdt_modifier: Optional[str] = None
    general_tol_regime: Optional[str] = None
    note: Optional[str] = None
    # The id of an earlier event on the SAME stack key that this one corrects.
    # Optional and additive; the fold hides the named event and keeps it.
    supersedes: Optional[str] = None
    # A proposal's own fields (verdict=proposed only): how sure, why, the
    # face's surface class as tolerance_stack.feature_geometry.fit_face reads
    # it, and -- when the contact engine ranked it -- that rank.
    confidence: Optional[str] = None
    basis: Optional[str] = None
    surface_class: Optional[str] = None
    contact_rank: Optional[int] = None
    # The proposal a `bound` event accepts, or a `rejected` event turns down.
    ratifies: Optional[str] = None
    rejects: Optional[str] = None

    def __post_init__(self) -> None:
        if self.verdict not in VERDICTS:
            raise ValueError(f"event {self.event_id!r}: verdict must be one of {VERDICTS}, got {self.verdict!r}")
        if self.verdict in FACE_VERDICTS:
            if self.geometry_key is None:
                raise ValueError(f"event {self.event_id!r}: verdict={self.verdict} requires a geometry_key")
            if self.direction not in DIRECTIONS:
                raise ValueError(
                    f"event {self.event_id!r}: verdict={self.verdict} requires direction in {DIRECTIONS}, "
                    f"got {self.direction!r}"
                )
        else:  # owner_not_in_set, rejected
            if self.geometry_key is not None:
                raise ValueError(f"event {self.event_id!r}: verdict={self.verdict} must carry no geometry_key")
            if self.direction is not None:
                raise ValueError(f"event {self.event_id!r}: verdict={self.verdict} must carry no direction")
        self._check_proposal_fields()
        if self.supersedes is not None:
            if self.verdict != "bound":
                raise ValueError(f"event {self.event_id!r}: only a bound event may carry supersedes")
            if self.supersedes == self.event_id:
                raise ValueError(f"event {self.event_id!r}: supersedes names itself")
        if self.gdt_modifier is not None and self.gdt_modifier not in GDT_MODIFIERS:
            raise ValueError(
                f"event {self.event_id!r}: gdt_modifier must be one of {GDT_MODIFIERS} or absent, "
                f"got {self.gdt_modifier!r}"
            )

    def _check_proposal_fields(self) -> None:
        """The proposal lane's invariants: an agent proposes, a human answers."""
        name = f"event {self.event_id!r}"
        if self.verdict == "proposed":
            if self.confidence not in PROPOSAL_CONFIDENCES:
                raise ValueError(
                    f"{name}: verdict=proposed requires confidence in {PROPOSAL_CONFIDENCES}, "
                    f"got {self.confidence!r}")
            if not (self.basis and str(self.basis).strip()):
                raise ValueError(f"{name}: verdict=proposed requires a one-line basis")
            if "\n" in str(self.basis):
                raise ValueError(f"{name}: a proposal's basis is one line")
            if self.surface_class not in SURFACE_CLASSES:
                raise ValueError(
                    f"{name}: verdict=proposed requires surface_class in {SURFACE_CLASSES}, "
                    f"got {self.surface_class!r}")
            if self.contact_rank is not None and int(self.contact_rank) < 1:
                raise ValueError(f"{name}: contact_rank is a rank, counted from 1")
        else:
            for key in ("confidence", "basis", "surface_class", "contact_rank"):
                if getattr(self, key) is not None:
                    raise ValueError(f"{name}: only a proposed event may carry {key}")
        if self.ratifies is not None and self.verdict != "bound":
            raise ValueError(f"{name}: only a bound event may carry ratifies")
        if self.verdict == "rejected":
            if not self.rejects:
                raise ValueError(f"{name}: verdict=rejected requires rejects, the proposal it turns down")
        elif self.rejects is not None:
            raise ValueError(f"{name}: only a rejected event may carry rejects")
        if self.verdict in HUMAN_ONLY_VERDICTS and actor_kind(self.recorded_by) == AGENT_ACTOR:
            raise ValueError(
                f"{name}: recorded_by {self.recorded_by!r} is an agent, and an agent only proposes -- "
                f"a human binds or rejects")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "FeatureIdentityEvent":
        if d.get("schema") != SCHEMA_EVENT:
            raise ValueError(f"expected schema {SCHEMA_EVENT!r}, got {d.get('schema')!r}")
        geometry_key = d.get("geometry_key")
        owner_path = d.get("owner_path")
        return cls(
            event_id=d["event_id"],
            seq=int(d["seq"]),
            created_at=d["created_at"],
            recorded_by=d["recorded_by"],
            stack_key=StackKey.from_dict(d["stack_key"]),
            verdict=d["verdict"],
            geometry_key=GeometryKey.from_dict(geometry_key) if geometry_key else None,
            direction=d.get("direction"),
            composition_note=d.get("composition_note"),
            owner_part=d.get("owner_part"),
            owner_path=OwnerPath.from_dict(owner_path) if owner_path else None,
            gdt_modifier=d.get("gdt_modifier"),
            general_tol_regime=d.get("general_tol_regime"),
            note=d.get("note"),
            supersedes=d.get("supersedes"),
            confidence=d.get("confidence"),
            basis=d.get("basis"),
            surface_class=d.get("surface_class"),
            contact_rank=int(d["contact_rank"]) if d.get("contact_rank") is not None else None,
            ratifies=d.get("ratifies"),
            rejects=d.get("rejects"),
        )

    def as_dict(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "schema": SCHEMA_EVENT,
            "event_id": self.event_id,
            "seq": self.seq,
            "created_at": self.created_at,
            "recorded_by": self.recorded_by,
            "stack_key": self.stack_key.as_dict(),
            "verdict": self.verdict,
        }
        if self.geometry_key is not None:
            out["geometry_key"] = self.geometry_key.as_dict()
        if self.direction is not None:
            out["direction"] = self.direction
        for key in ("composition_note", "owner_part", "gdt_modifier", "general_tol_regime", "note", "supersedes",
                    "confidence", "basis", "surface_class", "contact_rank", "ratifies", "rejects"):
            value = getattr(self, key)
            if value is not None:
                out[key] = value
        if self.owner_path is not None:
            out["owner_path"] = self.owner_path.as_dict()
        return out


def load_event(path: str | Path) -> FeatureIdentityEvent:
    return FeatureIdentityEvent.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def load_events(directory: str | Path) -> List[FeatureIdentityEvent]:
    """Every event in ``directory``, in log order.

    ``seq`` is the total order and must be unique across the log, the same
    guard ``spec_library.load_events`` uses.
    """
    events = [load_event(p) for p in sorted(Path(directory).glob("*.json"))]
    by_seq: Dict[int, str] = {}
    for event in events:
        if event.seq in by_seq:
            raise ValueError(f"events {by_seq[event.seq]!r} and {event.event_id!r} share seq {event.seq}")
        by_seq[event.seq] = event.event_id
    return sorted(events, key=lambda e: e.seq)


# ---------------------------------------------------------------------------
# The fold
# ---------------------------------------------------------------------------


@dataclass
class StackKeyBindings:
    """Everything the event log says about one stack-side key.

    ``bindings`` is every ``bound`` event naming this key -- many-to-many by
    design (decision 4), so this is a list, not a single winner.
    ``owner_not_in_set`` is every event recording that finding for this key.
    ``history`` is both, in the order they were written -- append-only, so
    nothing here is ever dropped or overwritten, only added to.
    """

    stack_key: StackKey
    bindings: List[FeatureIdentityEvent] = field(default_factory=list)
    owner_not_in_set: List[FeatureIdentityEvent] = field(default_factory=list)
    history: List[FeatureIdentityEvent] = field(default_factory=list)
    # `bound` events another event supersedes: hidden from `bindings`, kept here.
    superseded: List[FeatureIdentityEvent] = field(default_factory=list)
    # `proposed` events nobody has answered yet. NEVER standing: nothing that
    # reads `bindings` (the fitter, the scene's anchors, the rail's state)
    # sees these, which is the whole point of keeping them in a list of their own.
    proposals: List[FeatureIdentityEvent] = field(default_factory=list)
    # Proposals a human turned down -- kept, so the same face cannot be
    # proposed for this key again (:meth:`rejected_faces`).
    rejected_proposals: List[FeatureIdentityEvent] = field(default_factory=list)
    # Proposals a `bound` event ratified; the binding itself is in `bindings`.
    accepted_proposals: List[FeatureIdentityEvent] = field(default_factory=list)

    @property
    def state(self) -> str:
        """``bound`` / ``owner_not_in_set`` / ``proposed`` / ``unbound`` -- the
        coarse state a UI shows, in that order of precedence.

        A key no event names has no :class:`StackKeyBindings` at all, and that
        absence is ``unbound`` for a consumer that knows the full set of keys
        (a topology's edges, a stack's elements) -- the same "absence is the
        consumer's to notice" posture ``IntakeQueue.status`` uses. Since
        2026-10-28 a record can say it too: a key whose only events are
        proposals a human turned down stands exactly where a key with no
        events does.
        """
        if self.bindings:
            return "bound"
        if self.owner_not_in_set:
            return "owner_not_in_set"
        if self.proposals:
            return "proposed"
        return "unbound"

    def rejected_faces(self) -> set:
        """``(sha256, face_id)`` of every face a human rejected for this key."""
        return {e.geometry_key.as_key() for e in self.rejected_proposals}

    def as_dict(self) -> Dict[str, Any]:
        return {
            "stack_key": self.stack_key.as_dict(),
            "state": self.state,
            "bindings": [e.as_dict() for e in self.bindings],
            "owner_not_in_set": [e.as_dict() for e in self.owner_not_in_set],
            "history": [e.event_id for e in self.history],
            "superseded": [e.as_dict() for e in self.superseded],
            "proposals": [e.as_dict() for e in self.proposals],
            "rejected_proposals": [e.as_dict() for e in self.rejected_proposals],
            "accepted_proposals": [e.event_id for e in self.accepted_proposals],
        }


@dataclass
class FeatureIdentityProjection:
    by_stack_key: Dict[Tuple[str, str, str], StackKeyBindings] = field(default_factory=dict)
    events: List[str] = field(default_factory=list)

    def for_stack_key(self, key: StackKey) -> Optional[StackKeyBindings]:
        return self.by_stack_key.get(key.as_key())

    def counts(self) -> Dict[str, int]:
        """Events by verdict, plus the proposals still open -- a proposal is
        counted apart from a binding wherever the log is summarised."""
        out = {verdict: 0 for verdict in VERDICTS}
        for record in self.by_stack_key.values():
            for event in record.history:
                out[event.verdict] += 1
        out["open_proposals"] = sum(len(r.proposals) for r in self.by_stack_key.values())
        return out

    def as_dict(self) -> Dict[str, Any]:
        return {
            "schema": SCHEMA_PROJECTION,
            "built_from_events": self.events,
            "counts": self.counts(),
            "stack_keys": [v.as_dict() for _, v in sorted(self.by_stack_key.items())],
        }


def build_projection(events: Iterable[FeatureIdentityEvent]) -> FeatureIdentityProjection:
    """Fold the event log: per stack-side key, current bindings + full history.

    A group-by on ``stack_key.as_key()`` in ``seq`` order. An event another
    event names in ``supersedes`` leaves ``bindings`` and goes to ``superseded``
    (still in ``history``): folds hide, history keeps. A ``supersedes`` naming
    an id that does not exist, or one on a different key, is a load error
    naming both ids.
    """
    events = sorted(events, key=lambda e: e.seq)
    seen_ids: Dict[str, FeatureIdentityEvent] = {}
    projection = FeatureIdentityProjection(events=[e.event_id for e in events])
    for event in events:
        if event.event_id in seen_ids:
            raise ValueError(f"duplicate event_id {event.event_id!r}")
        seen_ids[event.event_id] = event
    hidden: Dict[str, str] = {}
    for event in events:
        if event.supersedes is None:
            continue
        target = seen_ids.get(event.supersedes)
        if target is None:
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not in the log")
        if target.stack_key.as_key() != event.stack_key.as_key():
            raise ValueError(
                f"event {event.event_id!r} supersedes {event.supersedes!r}, which is on a different stack key"
            )
        if target.verdict != "bound":
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not a bound event")
        if target.seq >= event.seq:
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not earlier")
        hidden[target.event_id] = event.event_id
    answered = _answered_proposals(events, seen_ids)
    for event in events:
        key = event.stack_key.as_key()
        record = projection.by_stack_key.get(key)
        if record is None:
            record = StackKeyBindings(stack_key=event.stack_key)
            projection.by_stack_key[key] = record
        record.history.append(event)
        if event.verdict == "bound":
            (record.superseded if event.event_id in hidden else record.bindings).append(event)
        elif event.verdict == "proposed":
            answer = answered.get(event.event_id)
            if answer is None:
                record.proposals.append(event)
            elif answer.verdict == "rejected":
                record.rejected_proposals.append(event)
            else:
                record.accepted_proposals.append(event)
        elif event.verdict == "owner_not_in_set":
            record.owner_not_in_set.append(event)
        # a `rejected` event lives in history; what it does is to its proposal
    return projection


def _answered_proposals(events: List[FeatureIdentityEvent],
                        seen_ids: Dict[str, FeatureIdentityEvent]) -> Dict[str, FeatureIdentityEvent]:
    """``{proposal id: the event that answered it}`` -- a ``ratifies`` or a ``rejects``.

    An answer must name an earlier ``proposed`` event on the same key, and a
    ratification must bind exactly the proposed face at the proposed end: an
    accept that names a proposal and binds something else would record a human
    agreeing to a face nobody proposed. A proposal answered twice is a load
    error naming both answers -- accepted-then-rejected is not a state.
    """
    answered: Dict[str, FeatureIdentityEvent] = {}
    for event in events:
        target_id = event.ratifies or event.rejects
        if target_id is None:
            continue
        verb = "ratifies" if event.ratifies else "rejects"
        target = seen_ids.get(target_id)
        if target is None:
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not in the log")
        if target.stack_key.as_key() != event.stack_key.as_key():
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is on a different stack key")
        if target.verdict != "proposed":
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not a proposal")
        if target.seq >= event.seq:
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not earlier")
        if event.ratifies and (event.geometry_key.as_key() != target.geometry_key.as_key()
                               or event.direction != target.direction):
            raise ValueError(
                f"event {event.event_id!r} ratifies {target_id!r} but binds a different face or end "
                f"than the one proposed")
        if target_id in answered:
            raise ValueError(
                f"proposal {target_id!r} is answered twice, by {answered[target_id].event_id!r} "
                f"and {event.event_id!r}")
        answered[target_id] = event
    return answered


# ---------------------------------------------------------------------------
# Staleness: re-validating a stored face_id against a replacement manifest
# ---------------------------------------------------------------------------


def face_matches(geometry_key: GeometryKey, manifest_face: Dict[str, Any]) -> bool:
    """Does ``manifest_face`` (one entry of a ``manifest.json``'s ``faces``
    list) still look like the face ``geometry_key`` was bound to?

    By fingerprint (area + centroid) within :data:`FACE_AREA_TOLERANCE` /
    :data:`FACE_CENTROID_TOLERANCE`, never by ``face_id`` alone -- the
    spike's own re-export stability check (``tessellate_parts.py::
    identity_investigation``) is exactly this comparison, at the same
    tolerance.
    """
    if abs(geometry_key.area_native2 - float(manifest_face["area_native2"])) >= FACE_AREA_TOLERANCE:
        return False
    return all(
        abs(a - float(b)) < FACE_CENTROID_TOLERANCE
        for a, b in zip(geometry_key.centroid_native, manifest_face["centroid_native"])
    )


def revalidate(event: FeatureIdentityEvent, new_manifest: Dict[str, Any]) -> str:
    """``"confirmed"`` / ``"needs_re_confirmation"`` for one ``bound`` event,
    against ``new_manifest`` -- the ``manifest.json`` dict of the mesh that
    replaced the STEP ``event.geometry_key`` was bound against.

    A face that no longer exists at that id, or exists with a fingerprint
    outside tolerance, is ``needs_re_confirmation`` -- **never** silently
    re-bound to the new face and never dropped from the projection. This
    function takes plain dicts (no OCP, no filesystem) so it is exercisable
    against a synthetic fixture manifest with no rotorkit dependency.
    """
    if event.verdict != "bound" or event.geometry_key is None:
        raise ValueError(f"event {event.event_id!r} has no geometry_key to revalidate")
    faces_by_id = {int(f["face_id"]): f for f in new_manifest.get("faces", [])}
    new_face = faces_by_id.get(event.geometry_key.face_id)
    if new_face is None or not face_matches(event.geometry_key, new_face):
        return "needs_re_confirmation"
    return "confirmed"


def revalidate_projection(
    projection: FeatureIdentityProjection,
    replacements: Dict[str, Dict[str, Any]],
) -> Dict[str, str]:
    """Every ``bound`` event whose ``source_step_sha256`` has a replacement
    manifest in ``replacements`` (``{old_sha256: manifest_dict}``), mapped to
    its :func:`revalidate` result. An event naming a sha with no entry in
    ``replacements`` is not included -- "nothing is known to have changed" is
    not the same claim as "confirmed unchanged", so it is left out rather
    than defaulted either way.
    """
    results: Dict[str, str] = {}
    for record in projection.by_stack_key.values():
        for event in record.bindings:
            new_manifest = replacements.get(event.geometry_key.source_step_sha256)
            if new_manifest is not None:
                results[event.event_id] = revalidate(event, new_manifest)
    return results


# ---------------------------------------------------------------------------
# Rebuild -- data/projections/feature-identity/, gated like every shared
# projection writer (scripts/projection_provenance.py)
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = REPO_ROOT / "data" / "inbox" / "feature-identity"
PROJECTION_SUBDIR = Path("projections") / "feature-identity"
PROJECTION_DIR = REPO_ROOT / "data" / PROJECTION_SUBDIR
PROJECTION_NAME = "bindings.json"

BUILT_BY = "tolerance_stack/feature_identity.py"


def _provenance():
    """``scripts/projection_provenance.py``, imported lazily -- same reason
    ``spec_library._provenance`` does it lazily: only the writer needs git."""
    scripts = str(REPO_ROOT / "scripts")
    if scripts not in sys.path:
        sys.path.insert(0, scripts)
    import projection_provenance

    return projection_provenance


def rebuild(
    events_dir: Path = EVENTS_DIR,
    out_dir: Path = PROJECTION_DIR,
    *,
    replacements: Optional[Dict[str, Dict[str, Any]]] = None,
    allow_older: bool = False,
) -> Path:
    """Wipe and rebuild ``<data-root>/projections/feature-identity/bindings.json``.

    Same gate every shared projection writer in this repo uses -- refuses to
    overwrite a file built from a tree this one does not contain, unless
    ``allow_older`` (``scripts/projection_provenance.py``).
    """
    prov = _provenance()
    out_dir = Path(out_dir)
    out_path = out_dir / PROJECTION_NAME
    provenance = prov.stamp(REPO_ROOT, Path(events_dir), BUILT_BY, source_key="events_dir",
                            data_root=out_dir.parents[1])
    rebuild_command = "venv-win/Scripts/python.exe scripts/build_feature_identity_projection.py"

    for line in prov.guard(out_path, provenance, REPO_ROOT, allow_older, rebuild_command):
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    events = load_events(events_dir)
    projection = build_projection(events)
    data = projection.as_dict()
    if replacements:
        data["staleness"] = revalidate_projection(projection, replacements)

    stamped = {"schema": data["schema"], prov.PROVENANCE_KEY: provenance}
    stamped.update({k: v for k, v in data.items() if k != "schema"})

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(stamped, indent=2) + "\n", encoding="utf-8")
    return out_path


def main(argv: Optional[List[str]] = None) -> int:
    prov = _provenance()
    ap = argparse.ArgumentParser(
        prog="build_feature_identity_projection.py",
        description="Fold data/inbox/feature-identity/ into data/projections/feature-identity/bindings.json.",
    )
    ap.add_argument(
        "--data-root",
        default=str(REPO_ROOT / "data"),
        help="repo data/ dir (the MAIN checkout's, if you are in a worktree)",
    )
    ap.add_argument(
        "--events-dir",
        default=None,
        help="override the default (--data-root's inbox/feature-identity/). "
        "Rarely needed outside tests.",
    )
    ap.add_argument(
        "--mesh-replacements",
        default=None,
        help="JSON file mapping an old source_step_sha256 to the manifest.json "
        "path of the mesh that replaced it, for the staleness re-check",
    )
    ap.add_argument("--allow-older-tree", action="store_true")
    args = ap.parse_args(argv)

    replacements: Optional[Dict[str, Dict[str, Any]]] = None
    if args.mesh_replacements:
        mapping = json.loads(Path(args.mesh_replacements).read_text(encoding="utf-8"))
        replacements = {
            old_sha: json.loads(Path(manifest_path).read_text(encoding="utf-8"))
            for old_sha, manifest_path in mapping.items()
        }

    # `--events-dir` MUST follow `--data-root` when not explicitly overridden.
    # This input, unlike every other projection builder's, lives under
    # gitignored `data/` -- not tracked `docs/` -- so it is NOT identical
    # between a worktree and the main checkout, exactly like the output. A
    # bare `REPO_ROOT`-relative default (this module's own tree) would read
    # the WRONG tree's (usually empty) events directory while writing output
    # into whatever `--data-root` names, silently producing a stamped, gated,
    # plausible-looking projection claiming zero bindings
    # (ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md,
    # found in review -- reproduced there against the main checkout).
    data_root = Path(args.data_root)
    events_dir = Path(args.events_dir) if args.events_dir else data_root / "inbox" / "feature-identity"

    out_dir = data_root / PROJECTION_SUBDIR
    try:
        out = rebuild(events_dir, out_dir, replacements=replacements, allow_older=args.allow_older_tree)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3

    events = load_events(events_dir)
    projection = build_projection(events)
    print(f"wrote {out}")
    counts = projection.counts()
    print(f"  {len(projection.by_stack_key)} stack key(s) from {len(projection.events)} event(s): "
          + ", ".join(f"{counts[v]} {v}" for v in VERDICTS)
          + f"; {counts['open_proposals']} proposal(s) still open")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

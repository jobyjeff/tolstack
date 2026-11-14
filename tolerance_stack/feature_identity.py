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
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from tolerance_stack.feature_geometry import SURFACE_CLASSES, same_surface

SCHEMA_EVENT = "joby.tolerance_stack/feature-identity/v0"
SCHEMA_PROJECTION = "joby.tolerance_stack/feature-identity-projection/v0"

# A binding is about a FEATURE, and a feature may be several faces (handoff
# a_feature_is_bound_once_to_a_set_of_faces, 2026-11-12; Jeff, 2026-11-10:
# "agreed, once per feature"). A v1 event's subject is a `feature_key` --
# {topology_id, part, node}, the model's own feature (tolerance_stack.
# model_view) -- and its face side is `geometry_keys`, a list of the v0
# `geometry_key` shape. No `direction`: a feature is not an end of anything.
# Every v0 event still loads and is never rewritten; the fold reads it
# through to its feature (`read_through`). New events are written as v1.
SCHEMA_EVENT_V1 = "joby.tolerance_stack/feature-identity/v1"
EVENT_SCHEMAS = (SCHEMA_EVENT, SCHEMA_EVENT_V1)

# What the fold says about a feature's standing faces when more than one event
# stands on it. `one`: one face. `set`: several faces of one feature -- a v1
# event that names them, or old edge-end events whose faces share a surface
# (feature_geometry.same_surface). `disagreement`: faces that are not one
# surface, or two v1 events naming different sets; nothing is chosen until a
# human keeps one (a v1 `bound` event on the feature), and until then the
# feature is not bound.
FEATURE_OUTCOMES = ("one", "set", "disagreement")

# A feature record's coarse state, in order of precedence. `disagreement`
# stands where `bound` would, and a surface shows it as a suggestion.
FEATURE_STATES = ("bound", "disagreement", "owner_not_in_set", "proposed", "unbound")

# Why an old edge-end event reads through to no feature: its model is not
# loaded, its edge is gone, or it names no end (an `owner_not_in_set` names a
# key, not an end; a `stack_element` key is no model's).
ORPHAN_REASONS = ("no_model", "no_edge", "no_end")

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
#
# Since 2026-11-12 (handoff a_binding_shows_the_moment_it_is_made_and_is_
# corrected_where_it_is_shown) one more: `retracted` is an unbind. It names
# the standing `bound` event it takes back (`retracts`) and carries no face;
# the fold hides that binding and history keeps both, as a `supersedes` does.
VERDICTS = ("bound", "owner_not_in_set", "proposed", "rejected", "retracted")
# The verdicts that name a face (a geometry_key and a direction), and the ones
# only a human may write. Subsets of VERDICTS, named so the checks below never
# spell a verdict set inline.
FACE_VERDICTS = ("bound", "proposed")
HUMAN_ONLY_VERDICTS = ("bound", "rejected", "retracted")

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
class FeatureKey:
    """Which feature a v1 event names: node ``node`` as seen on part ``part``,
    in model ``topology_id`` -- the model view's ``<part>@<node>``, under the
    model whose ids it is keyed by (:func:`tolerance_stack.topology.
    feature_identity_topology_id`)."""

    topology_id: str
    part: str
    node: str

    def __post_init__(self) -> None:
        if not (self.topology_id and self.part and self.node):
            raise ValueError("feature_key requires topology_id, part and node")

    def as_key(self) -> Tuple[str, str, str, str]:
        return ("feature", self.topology_id, self.part, self.node)

    def token(self) -> str:
        """One string per feature, for a JSON object key: ``<topology>:<part>@<node>``."""
        return f"{self.topology_id}:{self.part}@{self.node}"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "FeatureKey":
        return cls(topology_id=d["topology_id"], part=d["part"], node=d["node"])

    def as_dict(self) -> Dict[str, Any]:
        return {"topology_id": self.topology_id, "part": self.part, "node": self.node}


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

    def token(self) -> str:
        """``<sha256>:<face id>``, for a JSON object key."""
        return f"{self.source_step_sha256}:{self.face_id}"

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
    ``apps/annotate/``.

    Two shapes (:data:`EVENT_SCHEMAS`). v0 names an edge end: ``stack_key`` +
    ``direction``, one ``geometry_key``. v1 names a feature: ``feature_key``,
    and a face verdict's ``geometry_keys`` (one or more faces of one mesh). An
    event carries exactly one subject, and :attr:`schema` follows from which.
    """

    event_id: str
    seq: int
    created_at: str
    recorded_by: str
    stack_key: Optional[StackKey]
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
    # The standing `bound` event a `retracted` event takes back (an unbind).
    retracts: Optional[str] = None
    # v1 only: the feature, and the faces a face verdict names.
    feature_key: Optional[FeatureKey] = None
    geometry_keys: Optional[Tuple[GeometryKey, ...]] = None

    @property
    def schema(self) -> str:
        return SCHEMA_EVENT_V1 if self.feature_key is not None else SCHEMA_EVENT

    @property
    def subject(self) -> Tuple[str, ...]:
        """The key the per-subject fold groups on: an edge's (v0) or a
        feature's (v1). A correction, an unbind and an answer stay on one."""
        return self.feature_key.as_key() if self.feature_key is not None else self.stack_key.as_key()

    @property
    def faces(self) -> Tuple[GeometryKey, ...]:
        """Every face the event names, whichever shape: ``()`` for none."""
        if self.geometry_keys is not None:
            return tuple(self.geometry_keys)
        return (self.geometry_key,) if self.geometry_key is not None else ()

    def __post_init__(self) -> None:
        if self.verdict not in VERDICTS:
            raise ValueError(f"event {self.event_id!r}: verdict must be one of {VERDICTS}, got {self.verdict!r}")
        if (self.stack_key is None) == (self.feature_key is None):
            raise ValueError(f"event {self.event_id!r}: carries exactly one of stack_key (v0) and feature_key (v1)")
        if self.feature_key is not None:
            self._check_v1_faces()
        elif self.geometry_keys is not None:
            raise ValueError(f"event {self.event_id!r}: geometry_keys is a v1 field; a v0 event names one geometry_key")
        elif self.verdict in FACE_VERDICTS:
            if self.geometry_key is None:
                raise ValueError(f"event {self.event_id!r}: verdict={self.verdict} requires a geometry_key")
            if self.direction not in DIRECTIONS:
                raise ValueError(
                    f"event {self.event_id!r}: verdict={self.verdict} requires direction in {DIRECTIONS}, "
                    f"got {self.direction!r}"
                )
        else:  # a v0 owner_not_in_set, rejected, retracted
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

    def _check_v1_faces(self) -> None:
        """A v1 face verdict names one or more distinct faces of ONE mesh (a
        feature is on one part), and no edge-end field; any other v1 verdict
        names no face."""
        name = f"event {self.event_id!r}"
        if self.geometry_key is not None or self.direction is not None:
            raise ValueError(f"{name}: a v1 event names faces in geometry_keys and no direction")
        faces = tuple(self.geometry_keys or ())
        if self.verdict not in FACE_VERDICTS:
            if faces:
                raise ValueError(f"{name}: verdict={self.verdict} must carry no geometry_keys")
            return
        if not faces:
            raise ValueError(f"{name}: verdict={self.verdict} requires at least one face in geometry_keys")
        if len({f.as_key() for f in faces}) != len(faces):
            raise ValueError(f"{name}: geometry_keys names a face twice")
        if len({f.source_step_sha256 for f in faces}) != 1:
            raise ValueError(f"{name}: geometry_keys spans more than one mesh; a feature is on one part")
        object.__setattr__(self, "geometry_keys", faces)

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
        if self.verdict == "retracted":
            if not self.retracts:
                raise ValueError(f"{name}: verdict=retracted requires retracts, the binding it takes back")
            if self.retracts == self.event_id:
                raise ValueError(f"{name}: retracts names itself")
        elif self.retracts is not None:
            raise ValueError(f"{name}: only a retracted event may carry retracts")
        if self.verdict in HUMAN_ONLY_VERDICTS and actor_kind(self.recorded_by) == AGENT_ACTOR:
            raise ValueError(
                f"{name}: recorded_by {self.recorded_by!r} is an agent, and an agent only proposes -- "
                f"a human binds or rejects")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "FeatureIdentityEvent":
        if d.get("schema") not in EVENT_SCHEMAS:
            raise ValueError(f"expected schema in {EVENT_SCHEMAS!r}, got {d.get('schema')!r}")
        v1 = d["schema"] == SCHEMA_EVENT_V1
        if v1 and "stack_key" in d:
            raise ValueError(f"event {d.get('event_id')!r}: a v1 event names a feature_key, not a stack_key")
        geometry_key = d.get("geometry_key")
        owner_path = d.get("owner_path")
        geometry_keys = d.get("geometry_keys")
        return cls(
            event_id=d["event_id"],
            seq=int(d["seq"]),
            created_at=d["created_at"],
            recorded_by=d["recorded_by"],
            stack_key=None if v1 else StackKey.from_dict(d["stack_key"]),
            feature_key=FeatureKey.from_dict(d["feature_key"]) if v1 else None,
            geometry_keys=(tuple(GeometryKey.from_dict(g) for g in geometry_keys)
                           if geometry_keys is not None else None),
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
            retracts=d.get("retracts"),
        )

    def as_dict(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "schema": self.schema,
            "event_id": self.event_id,
            "seq": self.seq,
            "created_at": self.created_at,
            "recorded_by": self.recorded_by,
        }
        if self.feature_key is not None:
            out["feature_key"] = self.feature_key.as_dict()
        else:
            out["stack_key"] = self.stack_key.as_dict()
        out["verdict"] = self.verdict
        if self.geometry_key is not None:
            out["geometry_key"] = self.geometry_key.as_dict()
        if self.geometry_keys is not None:
            out["geometry_keys"] = [g.as_dict() for g in self.geometry_keys]
        if self.direction is not None:
            out["direction"] = self.direction
        for key in ("composition_note", "owner_part", "gdt_modifier", "general_tol_regime", "note", "supersedes",
                    "confidence", "basis", "surface_class", "contact_rank", "ratifies", "rejects", "retracts"):
            value = getattr(self, key)
            if value is not None:
                out[key] = value
        if self.owner_path is not None:
            out["owner_path"] = self.owner_path.as_dict()
        return out


def load_event(path: str | Path) -> FeatureIdentityEvent:
    return FeatureIdentityEvent.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def log_order(event: FeatureIdentityEvent) -> Tuple[int, str, str]:
    """The fold's total order: ``seq``, then ``created_at``, then ``event_id``.

    ``seq`` is meant to be unique, and every writer numbers past the folder
    (``AA.nextEventSeq``, ``propose_bindings._next_numbers``). But four of
    Jeff's 2026-11-06 accepts took seqs 56-59 that agent proposals already
    held -- the annotator numbered off a stale projection -- and the log is
    append-only, so those pairs are on disk for good (handoff
    ``the_bindings_projection_folds_the_events_jeff_accepted``). Two events
    claiming one seq were each numbered without knowing of the other, so
    ``seq`` cannot say which came first; ``created_at`` can, because it is when
    each was actually written (UTC, the same ISO shape from both writers), and
    folding in the order things happened is what a log means. ``event_id`` is
    unique, so it makes the order total even on an equal timestamp, and the
    order never depends on a filename or on the order a directory lists.
    """
    return (event.seq, event.created_at, event.event_id)


def seq_collisions(events: Iterable[FeatureIdentityEvent]) -> List[Tuple[int, List[str]]]:
    """``[(seq, [event ids in fold order])]`` for every seq more than one event
    claims -- resolved by :func:`log_order`, and printed by :func:`rebuild`,
    never swallowed."""
    by_seq: Dict[int, List[FeatureIdentityEvent]] = {}
    for event in events:
        by_seq.setdefault(event.seq, []).append(event)
    return [(seq, [e.event_id for e in sorted(group, key=log_order)])
            for seq, group in sorted(by_seq.items()) if len(group) > 1]


def load_events(directory: str | Path) -> List[FeatureIdentityEvent]:
    """Every event in ``directory``, in log order (:func:`log_order`).

    Two events sharing a ``seq`` do not refuse the log: they are ordered by
    when they were written, and :func:`seq_collisions` names them.
    """
    events = [load_event(p) for p in sorted(Path(directory).glob("*.json"))]
    return sorted(events, key=log_order)


# ---------------------------------------------------------------------------
# The fold
# ---------------------------------------------------------------------------


@dataclass
class StackKeyBindings:
    """Everything the event log says about one subject: an edge's stack-side
    key (a v0 event's) or a feature (a v1 event's, :attr:`feature_key` set).

    ``bindings`` is every ``bound`` event naming this key -- many-to-many by
    design (decision 4), so this is a list, not a single winner.
    ``owner_not_in_set`` is every event recording that finding for this key.
    ``history`` is both, in the order they were written -- append-only, so
    nothing here is ever dropped or overwritten, only added to.
    """

    stack_key: Optional[StackKey]
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
    # `bound` events a `retracted` event took back (an unbind): hidden from
    # `bindings`, kept here, as `superseded` keeps a corrected one.
    retracted: List[FeatureIdentityEvent] = field(default_factory=list)
    # The feature, for a v1 subject; None for an edge's.
    feature_key: Optional[FeatureKey] = None

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
        return {f.as_key() for e in self.rejected_proposals for f in e.faces}

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
            "retracted": [e.as_dict() for e in self.retracted],
        }


@dataclass
class FeatureBindings:
    """Everything the log says about one FEATURE, old events read through.

    The fold's answer to "is this feature bound, and to which faces". Two
    sources land here: v1 events naming the feature, and v0 edge-end events
    whose end IS this feature (:func:`read_through`). Which of them stands:

    * once any v1 ``bound`` or ``retracted`` event names the feature, the v1
      events alone decide it, and every v0 binding read through to it is in
      ``replaced`` (a new-shape event is written by someone who saw the old
      ones through the fold -- a Keep, a Correct, an Unbind);
    * otherwise the v0 bindings read through stand, and their faces collide
      by rule (:func:`_outcome`): one face, one set on one surface, or a
      disagreement nothing settles but a human.

    ``faces`` is the set the feature holds (every standing face, in log
    order, once each); ``disagreement`` is one group per distinct face (v0)
    or per distinct face set (v1) when the outcome is ``disagreement``.
    """

    feature_key: FeatureKey
    bindings: List[FeatureIdentityEvent] = field(default_factory=list)
    outcome: Optional[str] = None
    faces: List[GeometryKey] = field(default_factory=list)
    disagreement: List[Dict[str, Any]] = field(default_factory=list)
    proposals: List[FeatureIdentityEvent] = field(default_factory=list)
    rejected_proposals: List[FeatureIdentityEvent] = field(default_factory=list)
    accepted_proposals: List[str] = field(default_factory=list)
    superseded: List[FeatureIdentityEvent] = field(default_factory=list)
    retracted: List[FeatureIdentityEvent] = field(default_factory=list)
    replaced: List[FeatureIdentityEvent] = field(default_factory=list)
    owner_not_in_set: List[FeatureIdentityEvent] = field(default_factory=list)
    read_through: List[str] = field(default_factory=list)
    history: List[str] = field(default_factory=list)

    @property
    def state(self) -> str:
        """One of :data:`FEATURE_STATES`, in that order of precedence."""
        if self.bindings:
            return "disagreement" if self.outcome == "disagreement" else "bound"
        if self.owner_not_in_set:
            return "owner_not_in_set"
        if self.proposals:
            return "proposed"
        return "unbound"

    def as_dict(self) -> Dict[str, Any]:
        return {
            "feature_key": self.feature_key.as_dict(),
            "state": self.state,
            "outcome": self.outcome,
            "faces": [f.as_dict() for f in self.faces],
            "bindings": [e.as_dict() for e in self.bindings],
            "disagreement": [{"faces": [f.as_dict() for f in g["faces"]], "events": list(g["events"])}
                             for g in self.disagreement],
            "proposals": [e.as_dict() for e in self.proposals],
            "rejected_proposals": [e.as_dict() for e in self.rejected_proposals],
            "accepted_proposals": list(self.accepted_proposals),
            "superseded": [e.as_dict() for e in self.superseded],
            "retracted": [e.as_dict() for e in self.retracted],
            "replaced": [e.as_dict() for e in self.replaced],
            "owner_not_in_set": [e.as_dict() for e in self.owner_not_in_set],
            "read_through": list(self.read_through),
            "history": list(self.history),
        }


@dataclass
class FeatureIdentityProjection:
    by_stack_key: Dict[Tuple[str, str, str], StackKeyBindings] = field(default_factory=dict)
    events: List[str] = field(default_factory=list)
    # {later answer id: the earlier answer it repeats} -- a proposal answered
    # twice the same way (_answered_proposals). The repeat is in its record's
    # history and nowhere else; rebuild() prints each pair.
    restated: Dict[str, str] = field(default_factory=dict)
    # Per-subject records of v1 events, keyed by FeatureKey.as_key().
    by_feature_subject: Dict[Tuple[str, str, str, str], StackKeyBindings] = field(default_factory=dict)
    # The feature fold: one record per feature any event names or reads
    # through to. Empty when the fold was given no models.
    by_feature: Dict[Tuple[str, str, str, str], FeatureBindings] = field(default_factory=dict)
    # {v0 event id: its feature, or None} and {v0 event id: why it has none}.
    read_through: Dict[str, Optional[FeatureKey]] = field(default_factory=dict)
    orphans: Dict[str, str] = field(default_factory=dict)
    # Face pairs read through to one feature that share a surface, as sorted
    # (token, token) -- what the browser's fold reads instead of a mesh.
    same_surface: List[Tuple[str, str]] = field(default_factory=list)
    # Was the fold given the models? Only then is there a feature fold to
    # report -- an empty one and none at all are different answers.
    featured: bool = False

    def for_stack_key(self, key: StackKey) -> Optional[StackKeyBindings]:
        return self.by_stack_key.get(key.as_key())

    def for_feature(self, key: FeatureKey) -> Optional[FeatureBindings]:
        return self.by_feature.get(key.as_key())

    def counts(self) -> Dict[str, int]:
        """Events by verdict, plus the proposals still open -- a proposal is
        counted apart from a binding wherever the log is summarised."""
        out = {verdict: 0 for verdict in VERDICTS}
        records = list(self.by_stack_key.values()) + list(self.by_feature_subject.values())
        for record in records:
            for event in record.history:
                out[event.verdict] += 1
        out["open_proposals"] = sum(len(r.proposals) for r in records)
        return out

    def summary(self) -> Dict[str, int]:
        """The feature fold in four numbers (and the old events it read
        through): what the summary line says, from these and nothing else."""
        records = list(self.by_feature.values())
        return {
            "features_bound": sum(1 for r in records if r.state == "bound"),
            "features_holding_a_set": sum(1 for r in records if r.state == "bound" and r.outcome == "set"),
            "disagreements": sum(1 for r in records if r.state == "disagreement"),
            "orphans": len(self.orphans),
            "read_through": sum(1 for f in self.read_through.values() if f is not None),
        }

    def summary_line(self) -> str:
        s = self.summary()
        return (f"{s['features_bound']} feature(s) bound, {s['features_holding_a_set']} holding a set, "
                f"{s['disagreements']} disagreement(s), {s['orphans']} orphan(s); "
                f"{s['read_through']} old event(s) read through")

    def as_dict(self) -> Dict[str, Any]:
        out = {
            "schema": SCHEMA_PROJECTION,
            "built_from_events": self.events,
            "counts": self.counts(),
            "stack_keys": [v.as_dict() for _, v in sorted(self.by_stack_key.items())],
        }
        if self.featured:
            out["features"] = [v.as_dict() for _, v in sorted(self.by_feature.items())]
            out["orphans"] = [{"event_id": k, "reason": v} for k, v in sorted(self.orphans.items())]
            out["summary"] = self.summary()
        return out


def build_projection(events: Iterable[FeatureIdentityEvent],
                     topologies: Optional[Dict[str, Any]] = None,
                     surface_of: Optional[Callable[[GeometryKey], Optional[Dict[str, Any]]]] = None,
                     ) -> FeatureIdentityProjection:
    """Fold the event log: per subject, current bindings + full history; and,
    given the models, per feature (:class:`FeatureBindings`).

    A group-by on :attr:`FeatureIdentityEvent.subject` in :func:`log_order`.
    An event another event names in ``supersedes`` leaves ``bindings`` and goes
    to ``superseded`` (still in ``history``): folds hide, history keeps. A
    ``supersedes`` naming an id that does not exist, or one on a different
    subject, is a load error naming both ids. "Earlier" everywhere below means
    earlier in that order.

    A proposal answered twice with the same answer stands once: the repeat is
    in ``history`` and nowhere else, and superseding either supersedes the
    answer (:attr:`FeatureIdentityProjection.restated`).

    A ``retracted`` event (an unbind) takes back the binding it names in
    ``retracts``: that binding leaves ``bindings`` for ``retracted`` and stays
    in ``history`` (:func:`_retracted_bindings` says what it may name).

    ``topologies`` (``{id: Topology}``, every model the log may name) turns
    on the feature fold: each v0 event is read through to the feature its end
    is (:func:`read_through`), and a v1 answer may then name a v0 proposal of
    the same feature. ``surface_of`` fits a face for the shared-surface rule;
    without it, different faces read through to one feature disagree.
    """
    events = sorted(events, key=log_order)
    seen_ids: Dict[str, FeatureIdentityEvent] = {}
    position: Dict[str, int] = {}
    projection = FeatureIdentityProjection(events=[e.event_id for e in events])
    for index, event in enumerate(events):
        if event.event_id in seen_ids:
            raise ValueError(f"duplicate event_id {event.event_id!r}")
        seen_ids[event.event_id] = event
        position[event.event_id] = index
    if topologies is not None:
        projection.read_through, projection.orphans = read_through(events, topologies)
    answered, restated = _answered_proposals(events, seen_ids, position, projection.read_through)
    projection.restated = restated
    hidden: Dict[str, str] = {}
    for event in events:
        if event.supersedes is None:
            continue
        target = seen_ids.get(event.supersedes)
        if target is None:
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not in the log")
        if not _same_thing(event, target, projection.read_through):
            raise ValueError(
                f"event {event.event_id!r} supersedes {event.supersedes!r}, which is on a different stack key"
            )
        if target.verdict != "bound":
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not a bound event")
        if position[target.event_id] >= position[event.event_id]:
            raise ValueError(f"event {event.event_id!r} supersedes {event.supersedes!r}, which is not earlier")
        hidden[restated.get(target.event_id, target.event_id)] = event.event_id
    retracted = _retracted_bindings(events, seen_ids, position, restated, hidden, projection.read_through)
    for event in events:
        key = event.subject
        records = projection.by_feature_subject if event.feature_key is not None else projection.by_stack_key
        record = records.get(key)
        if record is None:
            record = StackKeyBindings(stack_key=event.stack_key, feature_key=event.feature_key)
            records[key] = record
        record.history.append(event)
        if event.event_id in restated:
            continue  # the answer it repeats is already folded, once
        if event.verdict == "bound":
            if event.event_id in hidden:
                record.superseded.append(event)
            elif event.event_id in retracted:
                record.retracted.append(event)
            else:
                record.bindings.append(event)
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
        # a `rejected` or `retracted` event lives in history; what it does is
        # to the event it names
    if topologies is not None:
        _fold_features(projection, surface_of)
        projection.featured = True
    return projection


# ---------------------------------------------------------------------------
# Reading old events through to their feature
# ---------------------------------------------------------------------------


def edge_end_feature(topologies: Dict[str, Any], stack_key: StackKey,
                     direction: Optional[str]) -> Tuple[Optional[FeatureKey], Optional[str]]:
    """``(feature, None)`` for the feature an edge end IS, or ``(None, reason)``.

    The rule is the model view's (:func:`tolerance_stack.model_view.
    end_feature`): the end's node, on the edge's part -- a dimension's own
    part, a gap edge's end node's first part -- keyed under the model whose
    ids it is (:func:`tolerance_stack.topology.feature_identity_topology_id`).
    """
    from tolerance_stack.model_view import end_feature  # noqa: PLC0415 -- model_view imports nothing of ours
    from tolerance_stack.topology import feature_identity_topology_id  # noqa: PLC0415

    if stack_key.kind != "topology_edge" or direction not in DIRECTIONS:
        return None, ORPHAN_REASONS[2]
    topology = topologies.get(stack_key.topology_id)
    if topology is None:
        return None, ORPHAN_REASONS[0]
    try:
        edge = topology.edge(stack_key.edge_id)
    except Exception:  # noqa: BLE001 -- topology raises its own error for a missing id
        return None, ORPHAN_REASONS[1]
    part, node = end_feature(topology, edge, direction)
    return FeatureKey(feature_identity_topology_id(topology, part, node, topologies), part, node), None


def read_through(events: Iterable[FeatureIdentityEvent], topologies: Dict[str, Any]
                 ) -> Tuple[Dict[str, Optional[FeatureKey]], Dict[str, str]]:
    """``({v0 event id: its feature or None}, {v0 event id: orphan reason})``.

    A face verdict reads through by its end (:func:`edge_end_feature`); a
    ``rejected`` or ``retracted`` event goes where the event it names went.
    An ``owner_not_in_set`` names a key, not an end, so it reads through to
    nothing. Nothing here edits an event: this is the mapping the fold
    reads old events through, and new events are written as v1.
    """
    by_id = {e.event_id: e for e in events}
    out: Dict[str, Optional[FeatureKey]] = {}
    orphans: Dict[str, str] = {}
    for event in sorted(events, key=log_order):
        if event.feature_key is not None:
            continue
        if event.verdict in FACE_VERDICTS:
            feature, reason = edge_end_feature(topologies, event.stack_key, event.direction)
        else:
            named = by_id.get(event.rejects or event.retracts or "")
            if named is not None and named.feature_key is None and named.event_id in out:
                feature = out[named.event_id]
                reason = orphans.get(named.event_id)
            else:
                feature, reason = None, ORPHAN_REASONS[2]
        out[event.event_id] = feature
        if feature is None:
            orphans[event.event_id] = reason or ORPHAN_REASONS[2]
    return out, orphans


def _faces_share_a_surface(a: GeometryKey, b: GeometryKey,
                           surface_of: Optional[Callable[[GeometryKey], Optional[Dict[str, Any]]]]) -> bool:
    """Two different faces of one mesh that :func:`feature_geometry.same_surface`
    calls one surface. A face that cannot be fitted shares nothing."""
    if surface_of is None or a.source_step_sha256 != b.source_step_sha256:
        return False
    fa, fb = surface_of(a), surface_of(b)
    return fa is not None and fb is not None and same_surface(fa, fb)


def _outcome(standing: List[FeatureIdentityEvent], new_shape: bool,
             share: Callable[[GeometryKey, GeometryKey], bool]
             ) -> Tuple[Optional[str], List[GeometryKey], List[Dict[str, Any]]]:
    """``(outcome, faces held, disagreement groups)`` for a feature's
    standing bindings -- the three collision outcomes.

    Old (v0) bindings, one face each: the same face stands once (``one``);
    different faces that pairwise ``share`` a surface stand together as one
    set (``set``); anything else is a ``disagreement``, one group per face.
    New (v1) bindings each name a whole set, so they are compared as sets:
    one distinct set stands (``one`` or ``set`` by its size); two differ.
    """
    if not standing:
        return None, [], []
    groups: List[Dict[str, Any]] = []
    for event in standing:
        faces = list(event.faces)
        unit = [faces] if new_shape else [[f] for f in faces]
        for group_faces in unit:
            names = sorted(f.as_key() for f in group_faces)
            for group in groups:
                if sorted(f.as_key() for f in group["faces"]) == names:
                    group["events"].append(event.event_id)
                    break
            else:
                groups.append({"faces": group_faces, "events": [event.event_id]})
    held: List[GeometryKey] = []
    for group in groups:
        for face in group["faces"]:
            if face.as_key() not in {h.as_key() for h in held}:
                held.append(face)
    if len(groups) == 1:
        return ("set" if len(held) > 1 else "one"), held, []
    if not new_shape and all(share(a, b) for i, a in enumerate(held) for b in held[i + 1:]):
        return "set", held, []
    return "disagreement", held, groups


def _fold_features(projection: FeatureIdentityProjection,
                   surface_of: Optional[Callable[[GeometryKey], Optional[Dict[str, Any]]]]) -> None:
    """Fill ``projection.by_feature`` from the per-subject records (the
    read-through for v0, as they are for v1) -- :class:`FeatureBindings`."""
    cache: Dict[Tuple[str, int], Optional[Dict[str, Any]]] = {}

    def fitted(key: GeometryKey) -> Optional[Dict[str, Any]]:
        if key.as_key() not in cache:
            cache[key.as_key()] = surface_of(key) if surface_of else None
        return cache[key.as_key()]

    shared: set = set()

    def share(a: GeometryKey, b: GeometryKey) -> bool:
        if not _faces_share_a_surface(a, b, fitted if surface_of else None):
            return False
        shared.add(tuple(sorted((a.token(), b.token()))))
        return True

    out: Dict[Tuple[str, str, str, str], FeatureBindings] = {}
    inherited: Dict[Tuple[str, str, str, str], List[FeatureIdentityEvent]] = {}
    written: Dict[Tuple[str, str, str, str], bool] = {}
    order: Dict[str, int] = {eid: i for i, eid in enumerate(projection.events)}

    def record_for(key: FeatureKey) -> FeatureBindings:
        if key.as_key() not in out:
            out[key.as_key()] = FeatureBindings(feature_key=key)
        return out[key.as_key()]

    for record in projection.by_stack_key.values():
        for event in record.history:
            feature = projection.read_through.get(event.event_id)
            if feature is None:
                continue
            target = record_for(feature)
            target.read_through.append(event.event_id)
            target.history.append(event.event_id)
        for event in record.bindings:
            feature = projection.read_through.get(event.event_id)
            if feature is not None:
                inherited.setdefault(feature.as_key(), []).append(event)
        for name, into in (("proposals", "proposals"), ("rejected_proposals", "rejected_proposals")):
            for event in getattr(record, name):
                feature = projection.read_through.get(event.event_id)
                if feature is not None:
                    getattr(record_for(feature), into).append(event)
        for event in record.accepted_proposals:
            feature = projection.read_through.get(event.event_id)
            if feature is not None:
                record_for(feature).accepted_proposals.append(event.event_id)
    for record in projection.by_feature_subject.values():
        target = record_for(record.feature_key)
        target.history.extend(e.event_id for e in record.history)
        target.proposals.extend(record.proposals)
        target.rejected_proposals.extend(record.rejected_proposals)
        target.accepted_proposals.extend(e.event_id for e in record.accepted_proposals)
        target.superseded.extend(record.superseded)
        target.retracted.extend(record.retracted)
        target.owner_not_in_set.extend(record.owner_not_in_set)
        target.bindings.extend(record.bindings)
        written[record.feature_key.as_key()] = any(e.verdict in ("bound", "retracted") for e in record.history)
    for key, target in out.items():
        old = sorted(inherited.get(key, []), key=lambda e: order[e.event_id])
        if written.get(key):
            target.replaced = old
            new_shape = True
        else:
            target.bindings = old
            new_shape = False
        target.history.sort(key=lambda eid: order[eid])
        target.read_through.sort(key=lambda eid: order[eid])
        target.accepted_proposals.sort(key=lambda eid: order[eid])
        for name in ("rejected_proposals", "superseded", "retracted"):
            getattr(target, name).sort(key=lambda e: order[e.event_id])
        target.proposals.sort(key=lambda e: order[e.event_id])
        target.outcome, target.faces, target.disagreement = _outcome(target.bindings, new_shape, share)
    projection.by_feature = out
    projection.same_surface = sorted(shared)


def _same_thing(event: FeatureIdentityEvent, target: FeatureIdentityEvent,
                read: Dict[str, Optional[FeatureKey]]) -> bool:
    """Is ``target`` about what ``event`` is about? The same subject; or --
    a feature's correction or unbind of an old edge-end binding, the one
    cross-shape pointer -- the feature that binding reads through to."""
    if target.subject == event.subject:
        return True
    return (event.feature_key is not None and target.feature_key is None
            and read.get(target.event_id) == event.feature_key)


def _retracted_bindings(events: List[FeatureIdentityEvent],
                        seen_ids: Dict[str, FeatureIdentityEvent],
                        position: Dict[str, int],
                        restated: Dict[str, str],
                        hidden: Dict[str, str],
                        read: Optional[Dict[str, Optional[FeatureKey]]] = None) -> Dict[str, str]:
    """``{binding id: the retracted event that took it back}``.

    Only a standing binding can be taken back: a ``retracts`` naming an id
    that is not in the log, one on a different key, one that is not a
    ``bound`` event, one that is not earlier, or one a ``supersedes`` or an
    earlier retraction already hid, is a load error naming both ids -- the
    posture a bad ``supersedes`` has. A binding taken back is not corrected
    afterwards either: a later pick binds afresh, so a ``supersedes`` naming a
    retracted binding is refused the same way.
    """
    read = read or {}
    out: Dict[str, str] = {}
    for event in events:
        if event.verdict != "retracted":
            continue
        target = seen_ids.get(event.retracts)
        what = f"event {event.event_id!r} retracts {event.retracts!r}"
        if target is None:
            raise ValueError(f"{what}, which is not in the log")
        if not _same_thing(event, target, read):
            raise ValueError(f"{what}, which is on a different stack key")
        if target.verdict != "bound":
            raise ValueError(f"{what}, which is not a bound event")
        if position[target.event_id] >= position[event.event_id]:
            raise ValueError(f"{what}, which is not earlier")
        standing = restated.get(target.event_id, target.event_id)
        if standing in hidden:
            raise ValueError(f"{what}, which {hidden[standing]!r} already superseded")
        if standing in out:
            raise ValueError(f"{what}, which {out[standing]!r} already retracted")
        out[standing] = event.event_id
    return out


# What two answers to one proposal may differ in and still be the same answer:
# which event, where in the log, and when. Everything else -- the verdict, the
# face, the end, who answered, every note and identity field -- must match.
ANSWER_IDENTITY_FIELDS = ("event_id", "seq", "created_at")


def _same_answer(a: FeatureIdentityEvent, b: FeatureIdentityEvent) -> bool:
    def body(e: FeatureIdentityEvent) -> Dict[str, Any]:
        return {k: v for k, v in e.as_dict().items() if k not in ANSWER_IDENTITY_FIELDS}
    return body(a) == body(b)


def _answer_names_its_proposal(event: FeatureIdentityEvent, target: FeatureIdentityEvent,
                               verb: str, read: Dict[str, Optional[FeatureKey]]) -> None:
    """An answer and its proposal are about one thing: the same subject, or --
    a v1 answer to a v0 proposal -- the feature that proposal reads through
    to. Refuses naming both ids otherwise."""
    if target.subject == event.subject:
        return
    if event.feature_key is not None and target.feature_key is None:
        if read.get(target.event_id) == event.feature_key:
            return
        if target.event_id not in read:
            raise ValueError(
                f"event {event.event_id!r} {verb} {target.event_id!r}, an edge-end proposal; folding a "
                f"feature's answer to it needs the models (build_projection's topologies)")
    raise ValueError(f"event {event.event_id!r} {verb} {target.event_id!r}, which is on a different stack key")


def _answered_proposals(events: List[FeatureIdentityEvent],
                        seen_ids: Dict[str, FeatureIdentityEvent],
                        position: Dict[str, int],
                        read: Optional[Dict[str, Optional[FeatureKey]]] = None,
                        ) -> Tuple[Dict[str, FeatureIdentityEvent], Dict[str, str]]:
    """``({proposal id: the event that answered it}, {repeat id: first answer id})``.

    An answer is a ``ratifies`` or a ``rejects``. It must name an earlier
    ``proposed`` event on the same key (or, a v1 answer, a v0 proposal read
    through to its feature), and a ratification must bind the proposed face:
    at the proposed end (v0), or among the faces it binds (v1 -- an accept
    may take the face's siblings with it). An accept that names a proposal
    and binds something else would record a human agreeing to a face nobody
    proposed.

    A proposal answered twice with the **same** answer (:func:`_same_answer`)
    folds as one, idempotently: the first answer stands, and the repeat is in
    the second dict. Jeff accepted four proposals on 2026-11-06 and again on
    2026-11-08, because the first accepts were gone after a reload (the
    projection was never rebuilt). Answered twice **differently** --
    accepted-then-rejected, or a second accept that adds a note -- is still a
    load error naming both: which answer stands is the reviewer's call, never
    the fold's.
    """
    read = read or {}
    answered: Dict[str, FeatureIdentityEvent] = {}
    restated: Dict[str, str] = {}
    for event in events:
        target_id = event.ratifies or event.rejects
        if target_id is None:
            continue
        verb = "ratifies" if event.ratifies else "rejects"
        target = seen_ids.get(target_id)
        if target is None:
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not in the log")
        _answer_names_its_proposal(event, target, verb, read)
        if target.verdict != "proposed":
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not a proposal")
        if position[target_id] >= position[event.event_id]:
            raise ValueError(f"event {event.event_id!r} {verb} {target_id!r}, which is not earlier")
        if event.ratifies:
            bound = {f.as_key() for f in event.faces}
            proposed = {f.as_key() for f in target.faces}
            same_end = event.feature_key is not None or event.direction == target.direction
            exact = event.feature_key is not None or bound == proposed
            if not (proposed <= bound and same_end and exact):
                raise ValueError(
                    f"event {event.event_id!r} ratifies {target_id!r} but binds a different face or end "
                    f"than the one proposed")
        if target_id in answered:
            first = answered[target_id]
            if _same_answer(first, event):
                restated[event.event_id] = first.event_id
                continue
            raise ValueError(
                f"proposal {target_id!r} is answered twice, differently, by {first.event_id!r} "
                f"and {event.event_id!r}")
        answered[target_id] = event
    return answered, restated


def resolution_notes(events: Iterable[FeatureIdentityEvent],
                     projection: FeatureIdentityProjection) -> List[str]:
    """One line per irregularity the fold resolved rather than refused: a seq
    two events claim, and a proposal answered twice the same way. Printed by
    :func:`rebuild` -- a collision the builder resolves is never silent."""
    lines = [f"seq {seq} is claimed by {len(ids)} events; folded in the order they were "
             f"written: {', '.join(ids)}" for seq, ids in seq_collisions(events)]
    lines += [f"{repeat} repeats the answer {first} already gave; folded as one"
              for repeat, first in sorted(projection.restated.items())]
    return lines


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
    if event.verdict != "bound" or not event.faces:
        raise ValueError(f"event {event.event_id!r} has no geometry_key to revalidate")
    faces_by_id = {int(f["face_id"]): f for f in new_manifest.get("faces", [])}
    for key in event.faces:  # a v1 set is confirmed only when every face is
        new_face = faces_by_id.get(key.face_id)
        if new_face is None or not face_matches(key, new_face):
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
    for record in list(projection.by_stack_key.values()) + list(projection.by_feature_subject.values()):
        for event in record.bindings:
            new_manifest = replacements.get(event.faces[0].source_step_sha256)
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

#: The served copy of the log (handoff a_binding_shows_the_moment_it_is_made_
#: and_is_corrected_where_it_is_shown). No mount serves
#: ``data/inbox/feature-identity/`` or ``projections/feature-identity/`` --
#: drawing-checker serves ``projections/viewer/`` as ``/tolstack/data/`` and
#: nothing else -- and a static mount lists no directory, so a page reading
#: with no folder grant reads the log HERE: every event, verbatim, in log
#: order, plus the installed meshes' sha256 (what a binding's face is checked
#: against). The pages fold it themselves (``apps/viewer/identity_fold.js``),
#: and the annotator rewrites it through its folder grant after every event
#: it writes, so a reload shows the write with no rebuild. A copy of inputs,
#: not a derivation: it carries no tree provenance and needs no gate.
SCHEMA_SERVED_LOG = "joby.tolerance_stack/feature-identity-log/v0"
SERVED_LOG_SUBDIR = Path("projections") / "viewer" / "feature-identity"
SERVED_LOG_NAME = "log.json"
MESHES_SUBDIR = Path("meshes")
MESH_PROVENANCE_NAME = "provenance.json"


def installed_mesh_shas(data_root: Path) -> List[str]:
    """Every ``data/meshes/<sha256>/`` with a ``provenance.json``, sorted."""
    meshes = Path(data_root) / MESHES_SUBDIR
    if not meshes.is_dir():
        return []
    return sorted(d.name for d in meshes.iterdir() if (d / MESH_PROVENANCE_NAME).is_file())


def served_log(events: Iterable[FeatureIdentityEvent], installed: List[str],
               projection: Optional[FeatureIdentityProjection] = None) -> Dict[str, Any]:
    """The served log's document: the events in log order, and the meshes.

    With the folded ``projection`` (built with the models) it also carries
    what the browser cannot work out alone, because it has neither the other
    models nor the meshes' fits (handoff a_feature_is_bound_once_to_a_set_of_
    faces): ``same_surface``, the face pairs read through to one feature that
    are one surface. It is a fact about old events, which are never written
    again, so a page that rewrites the log carries it over unchanged. Which
    feature an old event reads through to the page works out itself, from the
    topology projection's own feature identities.
    """
    doc: Dict[str, Any] = {
        "schema": SCHEMA_SERVED_LOG,
        "events": [e.as_dict() for e in sorted(events, key=log_order)],
        "installed_meshes": list(installed),
    }
    if projection is not None:
        doc["same_surface"] = [list(pair) for pair in projection.same_surface]
    return doc


def write_served_log(events_dir: Path, data_root: Path,
                     projection: Optional[FeatureIdentityProjection] = None) -> Path:
    """Write ``<data-root>/projections/viewer/feature-identity/log.json``."""
    out = Path(data_root) / SERVED_LOG_SUBDIR / SERVED_LOG_NAME
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = served_log(load_events(events_dir), installed_mesh_shas(data_root), projection)
    out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"


def load_models(topologies_dir: Path = TOPOLOGIES_DIR) -> Dict[str, Any]:
    """Every committed model by id -- what an old event is read through by."""
    from tolerance_stack.topology import load_topology  # noqa: PLC0415 -- the fold itself needs no topology

    out: Dict[str, Any] = {}
    for path in sorted(Path(topologies_dir).glob("topology_*.json")):
        topology = load_topology(path)
        out[topology.id] = topology
    return out


def mesh_surface_of(meshes_dir: Path) -> Callable[[GeometryKey], Optional[Dict[str, Any]]]:
    """A face's fitted surface (:func:`feature_geometry.surface_record`), read
    from ``<meshes_dir>/<sha>/`` -- or ``None`` where the mesh or the face is
    not there, which the shared-surface rule reads as "not one surface"."""
    from tolerance_stack import feature_geometry as fg  # noqa: PLC0415

    meshes: Dict[str, Any] = {}

    def surface_of(key: GeometryKey) -> Optional[Dict[str, Any]]:
        sha = key.source_step_sha256
        if sha not in meshes:
            directory = Path(meshes_dir) / sha
            meshes[sha] = fg.read_mesh(directory) if (directory / "manifest.json").is_file() else None
        mesh = meshes[sha]
        if mesh is None:
            return None
        try:
            return fg.surface_record(fg.fit_face(mesh, key.face_id))
        except fg.MeshError:
            return None

    return surface_of


def fold_with_models(events_dir: Path, data_root: Path,
                     topologies_dir: Path = TOPOLOGIES_DIR,
                     meshes_dir: Optional[Path] = None,
                     ) -> Tuple[List[FeatureIdentityEvent], FeatureIdentityProjection]:
    """The log at ``events_dir``, folded with every model and the meshes under
    ``data_root`` (or ``meshes_dir``) -- the feature fold every builder and
    reader runs."""
    events = load_events(events_dir)
    meshes = Path(meshes_dir) if meshes_dir is not None else Path(data_root) / MESHES_SUBDIR
    projection = build_projection(events, load_models(topologies_dir), mesh_surface_of(meshes))
    return events, projection


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
    topologies_dir: Path = TOPOLOGIES_DIR,
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

    events, projection = fold_with_models(events_dir, out_dir.parents[1], topologies_dir)
    for line in resolution_notes(events, projection):
        print(f"note: {line}", file=sys.stderr)
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

    events, projection = fold_with_models(events_dir, data_root)
    print(f"wrote {out}")
    print(f"wrote {write_served_log(events_dir, data_root, projection)}")
    counts = projection.counts()
    print(f"  {len(projection.by_stack_key) + len(projection.by_feature_subject)} key(s) from "
          f"{len(projection.events)} event(s): "
          + ", ".join(f"{counts[v]} {v}" for v in VERDICTS)
          + f"; {counts['open_proposals']} proposal(s) still open")
    print(f"  features: {projection.summary_line()}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

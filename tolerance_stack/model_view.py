"""The model view: one topology, read as the entities a reader navigates by.

Added 2026-11-10 (handoff ``the_model_is_derived_once_and_the_left_column_is_
its_tree``). The viewer and the 3D pane used to answer "which part is in which
body, which rows are one part, which part owns a face two parts share" with
nine rules of their own, each reading the raw ``nodes[].parts`` /
``edges[].part`` / ``bodies[].parts`` arrays again (the strategy session's
2026-11-09 read, ``dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_
the_kinematic_model.md``). This module derives the answer **once**, from
:class:`~tolerance_stack.topology.Topology`'s own membership methods
(``body_of`` / ``node_bodies`` / ``edge_body``), and the topology projection
carries the result beside the authored document so no surface computes
membership again. Jeff's direction, 2026-11-09: *a model is the set of entities
in the workspace; studies scope a subset of it.*

The entities, and what each is:

* **bodies** -- the authored rigid bodies, in authored order, each listing
  its parts in authored order.
* **parts** -- every authored part, with the body it moves with (``None`` when
  the document declares no bodies), its :func:`part_label`, its features and
  its dimensions.
* **features** -- a node *as seen on one part*. A node on two parts (a mating
  surface) is two features, one per part, so a part's features are its own and
  a face two parts share is a pin on each. A feature's id is
  ``<part>@<node>``; nothing else in this repo spells it, and it is a view id,
  not a feature-identity key (bindings stay keyed by edge end).
* **dimensions** -- the structural edges, each on one part between two of its
  features.
* **interfaces** -- the two authored shapes for "two parts meet", in one list:
  a node on two parts (``source: "node"``, kind ``contact``) and a gap edge
  (``source: "edge"``, kind = the edge's ``interface`` word). Each names its
  two ends as features, the two parts, the bodies those parts move with, and
  ``within`` -- the one body it sits inside, or ``None`` for a joint between
  two bodies (``Topology.edge_body`` is the rule; a contact is inside a body
  when ``node_bodies`` names one).
* **joints** -- interfaces between the same two parts, grouped: one joint with
  several constraints (the tan-link mount on the hub is a seat, a pilot and a
  clocking). Jeff, 2026-11-10: most joints in this mechanism are that compound
  style and the map he wants draws them as parallel paths.

A gap edge's end is a feature on the end node's first-listed part. Neither
committed model has a gap edge ending on a node two parts share (measured
2026-11-10), so the question of which part such an end would belong to is
left open rather than answered by a rule nothing exercises.

Pure: no I/O, stdlib only, nothing here folds or sums. What a *value* is
belongs to ``fold()`` (``ARCHITECTURE.md``, "Where computation may live").
"""

from __future__ import annotations

import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from .topology import Edge, Node, Part, Topology

__all__ = [
    "CONTACT_KIND",
    "INTERFACE_SOURCES",
    "feature_id",
    "part_label",
    "model_view",
]

#: The interface kind a two-part node is: the parts touch there. A gap edge's
#: kind is its own ``interface`` word (:data:`~tolerance_stack.topology.
#: INTERFACE_KINDS`); this is the one word the view adds.
CONTACT_KIND = "contact"

#: Which authored shape an interface came from. A module-level constant, never
#: an inline literal (repo rule).
INTERFACE_SOURCES = ("node", "edge")

#: A drawing or standard-part number at the head or tail of a part's name:
#: ``213668-002 gas-spring mount``, ``Pitch link 213862-002``,
#: ``NAS6403U11D hex-head bolt``. The label rule strips it so the number is
#: said once, by ``drawing``. Two or more digit-or-dash-or-slash characters
#: after a leading letter-or-digit run, with at least one digit -- the same
#: shape the viewer's part-column split reads (``VA.partColumns``).
_NUMBER_TOKEN = r"[A-Za-z]*\d[\w/\-]*"
_LEADING_NUMBER = re.compile(r"^(" + _NUMBER_TOKEN + r")\s+(.+)$")
_TRAILING_NUMBER = re.compile(r"^(.+?)\s+(" + _NUMBER_TOKEN + r")$")


def feature_id(part_id: str, node_id: str) -> str:
    """The view id of node ``node_id`` as seen on part ``part_id``."""
    return f"{part_id}@{node_id}"


def _everyday_name(part: Part) -> str:
    """The part's everyday name with no number in it: ``display_name`` where
    the drawing's title block gave one, else ``name``, either stripped of a
    number at its head or its tail."""
    text = (part.display_name or part.name or part.id).strip()
    lead = _LEADING_NUMBER.match(text)
    if lead and not _only_letters(lead.group(1)):
        text = lead.group(2).strip()
    tail = _TRAILING_NUMBER.match(text)
    if tail and not _only_letters(tail.group(2)):
        text = tail.group(1).strip()
    return text or part.id


def _only_letters(token: str) -> bool:
    return not any(ch.isdigit() for ch in token)


def part_label(part: Part) -> str:
    """The one way a part is named on a surface: its number, then its everyday
    name -- ``214698-002 upper piston head`` -- or the everyday name alone for
    a part with no drawing (a bearing, a gas spring).

    Jeff, 2026-10-20: a label that identifies a thing carries its everyday name
    beside its number, because numbers get renumbered and nobody memorises
    them. Before 2026-11-10 three v2 parts carried a ``display_name`` and
    twelve did not, so a block read ``214373-002`` beside one reading
    ``Pitch plate…``; this is the rule both read now, and the projection
    writes it on every part (``parts[].label`` and ``model.parts[].label``)
    so no surface composes it again.
    """
    everyday = _everyday_name(part)
    if part.drawing:
        return f"{part.drawing} {everyday}"
    return everyday


def _end_part(topology: Topology, node: Node) -> str:
    """The part a gap edge's end is a feature of: the node's first part."""
    return node.parts[0]


def model_view(topology: Topology,
               mesh_of: Optional[Callable[[str], Any]] = None) -> Dict[str, Any]:
    """The entity view of ``topology`` (module docstring), as plain JSON.

    ``mesh_of(part_id)`` is the projection's own resolution of a part's
    installed mesh (``build_topology_projection.mesh_fact``); ``None`` writes
    ``mesh: None`` on every part, which is what a tree with no meshes reads.
    """
    body_of: Dict[str, Optional[str]] = {}
    for part in topology.parts:
        body = topology.body_of(part.id)
        body_of[part.id] = body.id if body is not None else None

    features: List[Dict[str, Any]] = []
    feature_ids_of_part: Dict[str, List[str]] = {p.id: [] for p in topology.parts}
    for node in topology.nodes:
        shared = len(node.parts) > 1
        for part_id in node.parts:
            fid = feature_id(part_id, node.id)
            features.append({
                "id": fid,
                "part": part_id,
                "node": node.id,
                "name": node.name,
                "kind": node.kind,
                "shared": shared,
                "body": body_of[part_id],
            })
            feature_ids_of_part[part_id].append(fid)

    dimensions: List[Dict[str, Any]] = []
    dimension_ids_of_part: Dict[str, List[str]] = {p.id: [] for p in topology.parts}
    for edge in topology.edges:
        if edge.kind != "structural":
            continue
        row = {
            "id": edge.id,
            "part": edge.part,
            "name": edge.name,
            "from": feature_id(edge.part, edge.from_node),
            "to": feature_id(edge.part, edge.to_node),
            "body": body_of[edge.part],
        }
        dimensions.append(row)
        dimension_ids_of_part[edge.part].append(edge.id)

    interfaces: List[Dict[str, Any]] = []
    for node in topology.nodes:
        if len(node.parts) < 2:
            continue
        bodies = list(topology.node_bodies(node.id))
        interfaces.append(_interface(
            node.id, node.name, CONTACT_KIND, INTERFACE_SOURCES[0],
            [feature_id(p, node.id) for p in node.parts], list(node.parts),
            bodies, bodies[0] if len(bodies) == 1 else None))
    for edge in topology.edges:
        if edge.kind != "gap":
            continue
        near, far = topology.node(edge.from_node), topology.node(edge.to_node)
        parts = [_end_part(topology, near), _end_part(topology, far)]
        bodies: List[str] = []
        for node_id in (near.id, far.id):
            for body_id in topology.node_bodies(node_id):
                if body_id not in bodies:
                    bodies.append(body_id)
        interfaces.append(_interface(
            edge.id, edge.name, edge.interface or "", INTERFACE_SOURCES[1],
            [feature_id(parts[0], near.id), feature_id(parts[1], far.id)], parts,
            bodies, topology.edge_body(edge)))

    joints = _joints(interfaces)

    parts = []
    for part in topology.parts:
        parts.append({
            "id": part.id,
            "label": part_label(part),
            "number": part.drawing,
            "name": _everyday_name(part),
            "body": body_of[part.id],
            "features": list(feature_ids_of_part[part.id]),
            "dimensions": list(dimension_ids_of_part[part.id]),
            "occurrence": part.occurrence,
            "mesh": mesh_of(part.id) if mesh_of is not None else None,
        })

    bodies_out = [{
        "id": body.id,
        "name": body.name,
        "kind": body.kind,
        "parts": list(body.parts),
    } for body in topology.bodies]

    # The topology ids a feature-identity record about this model may be
    # keyed under: its own, and the model whose ids it reuses
    # (``ids_from``, docs/DAG_TOPOLOGY.md "Models" -- the same read-through
    # the annotator does). A reader iterates the list; nothing downstream
    # has to ask whether the model reuses ids.
    identity_ids = [topology.id]
    if topology.ids_from:
        identity_ids.append(topology.ids_from)

    return {
        "id": topology.id,
        "title": topology.title,
        "identity_ids": identity_ids,
        "bodies": bodies_out,
        "parts": parts,
        "features": features,
        "dimensions": dimensions,
        "interfaces": interfaces,
        "joints": joints,
        "counts": {
            "bodies": len(bodies_out),
            "parts": len(parts),
            "features": len(features),
            "dimensions": len(dimensions),
            "interfaces": len(interfaces),
            "contacts": sum(1 for i in interfaces if i["source"] == INTERFACE_SOURCES[0]),
            "gaps": sum(1 for i in interfaces if i["source"] == INTERFACE_SOURCES[1]),
            "between_bodies": sum(1 for i in interfaces if i["within"] is None),
            "within_bodies": sum(1 for i in interfaces if i["within"] is not None),
            "joints": len(joints),
        },
    }


def _interface(ident: str, name: str, kind: str, source: str, ends: List[str],
               parts: List[str], bodies: List[str], within: Optional[str]
               ) -> Dict[str, Any]:
    return {
        "id": ident,
        "name": name,
        "kind": kind,
        "source": source,
        "ends": ends,
        "parts": parts,
        "bodies": bodies,
        "within": within,
        "joint": _joint_id(parts),
    }


def _joint_id(parts: List[str]) -> str:
    """One id for a part pair whichever way round an interface names it."""
    return "+".join(sorted(parts))


def _joints(interfaces: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Interfaces grouped by part pair, in first-seen order: one joint with
    its constraints. A joint's name is its one constraint's name where it has
    one, and the two parts' ids are what a renderer labels it by otherwise
    (the view carries no label rule for a pair; the parts' labels are
    beside it)."""
    by_pair: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    for interface in interfaces:
        key = interface["joint"]
        if key not in by_pair:
            by_pair[key] = {
                "id": key,
                "parts": sorted(interface["parts"]),
                "bodies": list(interface["bodies"]),
                "within": interface["within"],
                "constraints": [],
            }
            order.append(key)
        by_pair[key]["constraints"].append(interface["id"])
    return [by_pair[key] for key in order]

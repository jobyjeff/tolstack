"""An agent's one write path into the feature-identity stream: a PROPOSAL.

    docs/topologies/topology_*.json          (the key: an edge, its two ends)
  + data/meshes/<sha>/                       (the face, its shape)
  + data/inbox/feature-identity/*.json       (what is bound, proposed, rejected)
  -> data/inbox/feature-identity/<NNNN>_<edge>_proposed.json

Built 2026-10-28 by handoff ``an_agent_proposes_a_face_binding_and_a_human_ratifies_it``.
Seven weeks after the annotator could bind a face, none was bound -- and every
DAG node in the 3D scene sat on a fallback anchor because of it. Jeff: agents
propose, he ratifies. This script is the proposing half; the annotator is the
ratifying half (``docs/ANNOTATION_SURFACE.md``, "Proposals").

**It writes ``verdict: "proposed"`` and nothing else.** The fold never lets a
proposal stand (``tolerance_stack.feature_identity``): the fitter, the scene's
anchors and a row's state all read ``bindings``, which a proposal never enters.
A human's Accept writes the ``bound`` event. An ``agent:`` actor cannot write
``bound`` or ``rejected`` at all -- the schema refuses it, so this is not a
convention this script happens to follow.

What it refuses, before anything is written
-------------------------------------------

* **no such key** -- the topology or the edge does not exist;
* **unknown sha** -- no installed mesh by that sha, or no such face on it;
* **wrong part** -- the face's mesh is not the part the end's interface names;
* **wrong shape** -- the end asks for a surface class (the annotator's own
  suggestion rule, ``tolerance_stack.feature_geometry.end_surface_class``) and
  the face is another (``fit_face``): a diameter on a flat face;
* **rejected before** -- a human turned this face down for this key;
* **already there** -- the end is already bound, or the same face is already
  proposed for it.

``--from-report`` is all-or-nothing: every row is checked, against the log and
against the rows before it, and one refusal writes none.

Usage -- from a worktree the inbox is the MAIN checkout's::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe scripts/propose_bindings.py \\
        --data-root C:\\workspace\\tolstack\\data --actor agent:<handoff-slug> \\
        --topology vpa_pitch_linkage --edge <edge> --direction from \\
        --sha <sha256> --face <id> --confidence high --basis "<one line>"

    ... --actor agent:<slug> --from-report proposals.json [--dry-run]

A report is ``{"proposals": [{"topology", "edge", "direction", "sha256",
"face_id", "confidence", "basis", "contact_rank"?, "note"?}, ...]}``.

Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as btp  # noqa: E402 -- resolved from scripts/

from tolerance_stack import feature_geometry as fg  # noqa: E402
from tolerance_stack import feature_identity as fi  # noqa: E402
from tolerance_stack.topology import load_topology  # noqa: E402

TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
EVENTS_SUBDIR = Path("inbox") / "feature-identity"
MESHES_SUBDIR = Path("meshes")

#: The refusal classes, one word each -- what a test asserts on, and what a
#: report row's refusal starts with.
REFUSALS = ("no_such_key", "unknown_sha", "wrong_part", "wrong_shape",
            "rejected_before", "already_there", "bad_actor")

_NUMBERED = re.compile(r"^(\d{4})_")


class Refused(ValueError):
    """One proposal this script will not write, and which rule said so."""

    def __init__(self, refusal: str, message: str):
        assert refusal in REFUSALS, refusal
        super().__init__(f"{refusal}: {message}")
        self.refusal = refusal


@dataclass
class Proposal:
    """One row to write, as given."""

    topology: str
    edge: str
    direction: str
    sha256: str
    face_id: int
    confidence: str
    basis: str
    contact_rank: Optional[int] = None
    note: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Proposal":
        return cls(
            topology=d["topology"], edge=d["edge"], direction=d["direction"],
            sha256=d["sha256"], face_id=int(d["face_id"]), confidence=d["confidence"],
            basis=d["basis"],
            contact_rank=int(d["contact_rank"]) if d.get("contact_rank") is not None else None,
            note=d.get("note"),
        )


class Context:
    """The topologies, the installed meshes and the log, read once."""

    def __init__(self, data_root: Path, topologies_dir: Path = TOPOLOGIES_DIR):
        self.data_root = Path(data_root)
        self.events_dir = self.data_root / EVENTS_SUBDIR
        self.meshes_dir = self.data_root / MESHES_SUBDIR
        self.topologies = {}
        for path in sorted(Path(topologies_dir).glob("topology_*.json")):
            topology = load_topology(path, repo_root=REPO_ROOT)
            self.topologies[topology.id] = topology
        self.meshes = btp.installed_meshes(self.meshes_dir)
        self.aliases = btp.load_mesh_aliases(Path(topologies_dir))
        self.events = fi.load_events(self.events_dir) if self.events_dir.is_dir() else []
        self.projection = fi.build_projection(self.events)
        self._manifests: Dict[str, Dict[str, Any]] = {}
        self._meshes: Dict[str, fg.Mesh] = {}

    def manifest(self, sha: str) -> Optional[Dict[str, Any]]:
        if sha not in self._manifests:
            path = self.meshes_dir / sha / "manifest.json"
            self._manifests[sha] = (json.loads(path.read_text(encoding="utf-8"))
                                    if path.is_file() else None)
        return self._manifests[sha]

    def surface_class(self, sha: str, face_id: int) -> str:
        if sha not in self._meshes:
            self._meshes[sha] = fg.read_mesh(self.meshes_dir / sha)
        return fg.fit_face(self._meshes[sha], face_id).surface


def check(proposal: Proposal, ctx: Context, planned: Sequence[fi.FeatureIdentityEvent] = ()) -> Dict[str, Any]:
    """Everything a proposal must pass, or :class:`Refused` naming the rule.

    Returns what the event needs that the row does not carry: the face's
    fingerprint and surface class, and the rule that judged its shape.
    """
    topology = ctx.topologies.get(proposal.topology)
    if topology is None:
        raise Refused("no_such_key", f"no topology {proposal.topology!r}")
    edge = next((e for e in topology.edges if e.id == proposal.edge), None)
    if edge is None:
        raise Refused("no_such_key", f"topology {proposal.topology!r} has no edge {proposal.edge!r}")
    if proposal.direction not in fi.DIRECTIONS:
        raise Refused("no_such_key", f"direction must be one of {fi.DIRECTIONS}, got {proposal.direction!r}")
    node_id = edge.from_node if proposal.direction == "from" else edge.to_node
    node = next(n for n in topology.nodes if n.id == node_id)

    manifest = ctx.manifest(proposal.sha256)
    if manifest is None:
        raise Refused("unknown_sha", f"no installed mesh {proposal.sha256!r}")
    face = next((f for f in manifest.get("faces", []) if int(f["face_id"]) == proposal.face_id), None)
    if face is None:
        raise Refused("unknown_sha", f"mesh {proposal.sha256[:12]} has no face {proposal.face_id}")

    meshes_for_end = {m["sha256"] for m in (btp.resolve_mesh(ctx.meshes, part, ctx.aliases)
                                            for part in (node.parts or [])) if m}
    if proposal.sha256 not in meshes_for_end:
        raise Refused("wrong_part", f"face {proposal.face_id} is on mesh {proposal.sha256[:12]}, and "
                      f"{node_id!r} is an interface of {list(node.parts or [])}")

    surface = ctx.surface_class(proposal.sha256, proposal.face_id)
    rule = fg.end_surface_class(edge.name or edge.id, node.name or node.id)
    if rule and surface != rule["surface"]:
        raise Refused("wrong_shape", f"{node_id!r} asks for a {rule['surface']} face "
                      f"(the word {rule['word']!r}), and face {proposal.face_id} is {surface}")

    key = fi.StackKey(kind="topology_edge", topology_id=proposal.topology, edge_id=proposal.edge)
    record = ctx.projection.for_stack_key(key)
    face_key = (proposal.sha256, proposal.face_id)
    if record and face_key in record.rejected_faces():
        raise Refused("rejected_before", f"face {proposal.face_id} was rejected for {proposal.edge!r}")
    standing = list(record.bindings) if record else []
    if any(b.direction == proposal.direction for b in standing):
        raise Refused("already_there", f"{proposal.edge!r} is already bound at {proposal.direction!r}")
    open_proposals = (list(record.proposals) if record else []) + [
        p for p in planned if p.stack_key.as_key() == key.as_key()]
    if any(p.direction == proposal.direction and p.geometry_key.as_key() == face_key for p in open_proposals):
        raise Refused("already_there", f"face {proposal.face_id} is already proposed for "
                      f"{proposal.edge!r} at {proposal.direction!r}")
    return {"key": key, "face": face, "surface": surface, "rule": rule}


def _next_numbers(ctx: Context, planned: int) -> tuple:
    names = [p.name for p in ctx.events_dir.glob("*.json")] if ctx.events_dir.is_dir() else []
    numbers = [int(m.group(1)) for m in (_NUMBERED.match(n) for n in names) if m]
    file_no = max(numbers, default=0) + 1 + planned
    seq = max((e.seq for e in ctx.events), default=0) + 1 + planned
    return file_no, seq


def build_event(proposal: Proposal, ctx: Context, actor: str,
                planned: Sequence[fi.FeatureIdentityEvent] = (),
                created_at: Optional[str] = None) -> tuple:
    """``(filename, event)`` for one checked proposal."""
    if fi.actor_kind(actor) != fi.AGENT_ACTOR or not actor.split(":", 1)[1]:
        raise Refused("bad_actor", f"an agent writes as 'agent:<handoff-slug>', got {actor!r}")
    found = check(proposal, ctx, planned)
    file_no, seq = _next_numbers(ctx, len(planned))
    filename = f"{file_no:04d}_{proposal.edge}_proposed.json"
    event = fi.FeatureIdentityEvent(
        event_id=f"proposal-{file_no:04d}-{proposal.edge}-{proposal.direction}",
        seq=seq,
        created_at=created_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        recorded_by=actor,
        stack_key=found["key"],
        verdict="proposed",
        geometry_key=fi.GeometryKey(
            source_step_sha256=proposal.sha256, face_id=proposal.face_id,
            area_native2=float(found["face"]["area_native2"]),
            centroid_native=tuple(float(c) for c in found["face"]["centroid_native"])),
        direction=proposal.direction,
        confidence=proposal.confidence,
        basis=proposal.basis,
        surface_class=found["surface"],
        contact_rank=proposal.contact_rank,
        note=proposal.note,
    )
    return filename, event


def propose_all(proposals: Sequence[Proposal], ctx: Context, actor: str, *,
                write: bool = True) -> List[tuple]:
    """Check every row, then write every row -- or raise and write none."""
    planned: List[fi.FeatureIdentityEvent] = []
    out: List[tuple] = []
    for i, proposal in enumerate(proposals):
        try:
            filename, event = build_event(proposal, ctx, actor, planned)
        except Refused as refusal:
            raise Refused(refusal.refusal, f"row {i + 1} ({proposal.edge} {proposal.direction}): "
                          + str(refusal).split(": ", 1)[1]) from None
        planned.append(event)
        out.append((filename, event))
    if write:
        ctx.events_dir.mkdir(parents=True, exist_ok=True)
        for filename, event in out:
            path = ctx.events_dir / filename
            if path.exists():
                raise FileExistsError(f"{path} exists -- the inbox is append-only")
            path.write_text(json.dumps(event.as_dict(), indent=2) + "\n", encoding="utf-8")
    return out


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="propose_bindings.py",
        description="Write proposed feature-identity events -- an agent's only write path.")
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (the MAIN checkout's, if you are in a worktree)")
    ap.add_argument("--actor", required=True, help="agent:<handoff-slug>")
    ap.add_argument("--from-report", help="a JSON file of proposals; all are written or none")
    ap.add_argument("--topology")
    ap.add_argument("--edge")
    ap.add_argument("--direction", choices=fi.DIRECTIONS)
    ap.add_argument("--sha")
    ap.add_argument("--face", type=int)
    ap.add_argument("--confidence", choices=fi.PROPOSAL_CONFIDENCES)
    ap.add_argument("--basis")
    ap.add_argument("--contact-rank", type=int)
    ap.add_argument("--note")
    ap.add_argument("--dry-run", action="store_true", help="check everything, write nothing")
    ap.add_argument("--topologies-dir", default=str(TOPOLOGIES_DIR),
                    help="override docs/topologies/. Rarely needed outside tests.")
    args = ap.parse_args(argv)

    if args.from_report:
        raw = json.loads(Path(args.from_report).read_text(encoding="utf-8"))
        proposals = [Proposal.from_dict(row) for row in raw["proposals"]]
    else:
        needed = ("topology", "edge", "direction", "sha", "face", "confidence", "basis")
        missing = [n for n in needed if getattr(args, n) is None]
        if missing:
            ap.error("a single proposal needs --" + ", --".join(missing) + " (or use --from-report)")
        proposals = [Proposal(args.topology, args.edge, args.direction, args.sha, args.face,
                              args.confidence, args.basis, args.contact_rank, args.note)]

    try:
        ctx = Context(Path(args.data_root), Path(args.topologies_dir))
        written = propose_all(proposals, ctx, args.actor, write=not args.dry_run)
    except (Refused, ValueError) as refusal:
        print(f"refused: {refusal}", file=sys.stderr)
        return 2
    verb = "would write" if args.dry_run else "wrote"
    for filename, event in written:
        print(f"{verb} {filename}: {event.stack_key.edge_id} {event.direction} face "
              f"{event.geometry_key.face_id} ({event.surface_class}, {event.confidence})")
    print(f"{len(written)} proposal(s); nothing is bound until a human accepts one in the annotator")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

"""Which faces could be each gap edge's interface -- ranked, with evidence.

    docs/topologies/topology_*.json          (gap edges: two parts + an interface word)
  + docs/topologies/part_mesh_aliases.json   (topology part -> installed mesh)
  + data/meshes/<sha>/                       (faces, and where each part sits)
  -> data/projections/feature-identity/contact_suggestions.json

Built 2026-10-28 by handoff ``an_interface_suggests_the_faces_that_touch``.
Jeff: *"If you know there's an interface between two parts, it's very easy to
narrow down by filtering planar surfaces on each body that are coplanar, or
even better contacting each other (within some narrow margin). Same for
cylindrical surfaces (coaxial)."* The geometry is
``tolerance_stack.interface_contact``; this script resolves the edges to meshes
and occurrences and writes what it found, edge by edge, including the edges it
found nothing for and why.

**It suggests; it never binds.** The projection names face pairs and the
evidence for them. The annotator colours the top pair and lists the top three;
the pick is still a human's, written through the one write path
(``docs/ANNOTATION_SURFACE.md``, "Contact suggestions"). Nothing here is a
value: a gap or a clearance read off a mesh is evidence for a rank, and a
drawing callout still wins wherever one exists.

Which occurrences
-----------------

A part's occurrences are its own sidecar's (``fit_bound_features.occurrences_for``)
plus the two arms ``apps/annotate/sweep.js``'s ``AA.sweepCandidateOccurrences``
adds: an occurrence of another mesh sharing one of this mesh's instance names,
and one named ``<this mesh's product>.<n>``. The second arm is what finds blade
1's pitch link, whose slot is recorded on the *instrumented* variant's sidecar
(``docs/topologies/part_mesh_aliases.json``'s notes say why the frames agree).
The same rule in two languages is paired by
``tests/test_contact_suggestions.py`` against the JS source.

Usage -- from the MAIN checkout, where ``data/`` is::

    venv-win/Scripts/python.exe scripts/build_contact_suggestions.py

From a worktree::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe scripts/build_contact_suggestions.py --data-root C:\\workspace\\tolstack\\data

``--print-tolerances`` prints the margins it would apply. Gated like every
shared projection writer here (``scripts/projection_provenance.py``): it refuses
to overwrite a file built from a tree this one does not contain, exit 3, unless
``--allow-older-tree``.

Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as btp  # noqa: E402 -- resolved from scripts/
import fit_bound_features as fbf  # noqa: E402
import projection_provenance as prov  # noqa: E402

from tolerance_stack import feature_geometry as fg  # noqa: E402
from tolerance_stack import interface_contact as ic  # noqa: E402
from tolerance_stack.topology import load_topology  # noqa: E402

SCHEMA = "joby.tolerance_stack/contact-suggestions/v0"
PROJECTION_SUBDIR = Path("projections") / "feature-identity"
PROJECTION_NAME = "contact_suggestions.json"
BUILT_BY = "scripts/build_contact_suggestions.py"
REBUILD_COMMAND = "venv-win/Scripts/python.exe scripts/build_contact_suggestions.py"
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"

#: The two ends of an edge, in the order the projection writes them. ``from``
#: is the edge's ``from_node``, and a candidate's ``from`` side is a face of
#: that node's part.
SIDES = ("from", "to")


# ---------------------------------------------------------------------------
# occurrences
# ---------------------------------------------------------------------------

def occurrence_rows(provenance_by_sha: Dict[str, Dict[str, Any]]
                    ) -> Tuple[Dict[str, List[Dict[str, Any]]], List[Dict[str, Any]]]:
    """``(own occurrences per sha, every occurrence)`` -- ``AA.readMeshOccurrences``.

    The key is the instance path joined by ``/``, the same key the annotator
    gives an occurrence, so a reader can match one to a drawn part.
    """
    own: Dict[str, List[Dict[str, Any]]] = {}
    every: List[Dict[str, Any]] = []
    for sha, provenance in sorted(provenance_by_sha.items()):
        own[sha] = []
        for occurrence in fbf.occurrences_for(provenance):
            path = occurrence["instance_path"] or [occurrence["instance_name"]]
            row = dict(occurrence, key="/".join(path), mesh=sha, own=True)
            own[sha].append(row)
            every.append(row)
    return own, every


def candidate_occurrences(sha: str, own: Dict[str, List[Dict[str, Any]]],
                          every: Sequence[Dict[str, Any]],
                          product: Optional[str]) -> List[Dict[str, Any]]:
    """``AA.sweepCandidateOccurrences``: this mesh's own occurrences, then any
    other occurrence sharing one of their instance names or named
    ``<product>.<n>``."""
    out = list(own.get(sha, []))
    seen = {o["key"] for o in out}
    names = {o["instance_name"] for o in out}
    for o in every:
        if o["key"] in seen:
            continue
        same_slot_name = o["instance_name"] in names
        same_product_slot = bool(product) and str(o["instance_name"]).startswith(product + ".")
        if not same_slot_name and not same_product_slot:
            continue
        seen.add(o["key"])
        out.append(dict(o, own=False))   # another mesh's slot: not drawn there
    return out


# ---------------------------------------------------------------------------
# one edge
# ---------------------------------------------------------------------------

class Store:
    """The installed meshes, read lazily and once each."""

    def __init__(self, meshes_dir: Path, topologies_dir: Path):
        self.meshes_dir = Path(meshes_dir)
        self.meshes = btp.installed_meshes(self.meshes_dir)
        self.aliases = btp.load_mesh_aliases(Path(topologies_dir))
        self.provenance = {m["sha256"]: fbf.load_mesh_provenance(self.meshes_dir / m["sha256"])
                           for m in self.meshes}
        self.own, self.every = occurrence_rows(self.provenance)
        self._parts: Dict[str, ic.PartFaces] = {}

    def resolve(self, part: Optional[str]) -> Optional[Dict[str, str]]:
        return btp.resolve_mesh(self.meshes, part, self.aliases)

    def part_faces(self, sha: str) -> ic.PartFaces:
        if sha not in self._parts:
            self._parts[sha] = ic.part_faces(fg.read_mesh(self.meshes_dir / sha))
        return self._parts[sha]

    def units(self, sha: str) -> str:
        manifest_path = self.meshes_dir / sha / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        return fbf.mesh_units(manifest, self.provenance.get(sha, {}))

    def occurrences(self, sha: str) -> List[Dict[str, Any]]:
        product = (self.provenance.get(sha, {}).get("extraction") or {}).get("product_name")
        return candidate_occurrences(sha, self.own, self.every, product)


def _end(topology, node_id: str, store: Store) -> Dict[str, Any]:
    node = next(n for n in topology.nodes if n.id == node_id)
    part = node.parts[0] if node.parts else None
    mesh = store.resolve(part)
    row: Dict[str, Any] = {"node": node_id, "part": part, "mesh": None}
    if mesh:
        provenance = store.provenance.get(mesh["sha256"], {})
        row["mesh"] = {"sha256": mesh["sha256"], "part_id": mesh["part_id"],
                       "label": provenance.get("label")}
    return row


def _side(word: str) -> str:
    """The module says ``a``/``b``; the projection says which END."""
    return {"a": "from", "b": "to"}[word]


def _candidate_row(candidate: Dict[str, Any], sha_from: str, sha_to: str) -> Dict[str, Any]:
    evidence = dict(candidate["evidence"])
    for key in ("bore", "ball"):
        if key in evidence:
            evidence[key] = _side(evidence[key])
    for old, new in (("a_radius_mm", "from_radius_mm"), ("b_radius_mm", "to_radius_mm")):
        if old in evidence:
            evidence[new] = evidence.pop(old)
    return {
        "rank": candidate["rank"],
        "relation": candidate["relation"],
        "score": round(candidate["score"], 6),
        "from": {"sha256": sha_from, "surface": candidate["a_surface"],
                 "faces": candidate["a_faces"]},
        "to": {"sha256": sha_to, "surface": candidate["b_surface"],
               "faces": candidate["b_faces"]},
        "evidence": evidence,
        "box": candidate["box"],
    }


def edge_row(topology, edge, store: Store) -> Dict[str, Any]:
    """One gap edge's row: its two ends, and its candidates or its reason."""
    pairing = ic.CONTACT_PAIRINGS[edge.interface]
    row: Dict[str, Any] = {
        "edge": edge.id, "name": edge.name, "interface": edge.interface,
        "pairing": pairing,
        "from": _end(topology, edge.from_node, store),
        "to": _end(topology, edge.to_node, store),
        "status": None, "candidates": [],
    }

    def empty(reason: str, note: str, **extra) -> Dict[str, Any]:
        row.update(status=reason, note=note, **extra)
        return row

    ends = [row["from"], row["to"]]
    missing = [e["part"] or e["node"] for e in ends if not e["mesh"]]
    if missing:
        return empty("no_mesh", "no installed 3D model for " + ", ".join(map(str, missing)))
    shas = [e["mesh"]["sha256"] for e in ends]
    not_mm = [s for s in shas if store.units(s) != fbf.MM]
    if not_mm:
        return empty("no_units", "the mesh does not declare millimetres: "
                     + ", ".join(s[:12] for s in not_mm))
    occurrences = [store.occurrences(s) for s in shas]
    if not all(occurrences):
        return empty("no_occurrence", "no place in the assembly is recorded for "
                     + ", ".join(str(e["part"]) for e, o in zip(ends, occurrences) if not o))

    found = ic.edge_candidates(pairing, store.part_faces(shas[0]), store.part_faces(shas[1]),
                               occurrences[0], occurrences[1])
    row["pairs_in_reach"] = found["pairs_in_reach"]
    row["nearest_gap_mm"] = found["nearest_gap_mm"]
    if found["status"] != "ok":
        reach = ic.CONTACT_TOLERANCES["reach_mm"]
        if found["status"] == "no_fit":
            note = "no face of the kind this interface asks for fits near the other part"
        elif not found["pairs_in_reach"]:
            note = (f"the two parts never come within {reach} mm of each other; "
                    f"nearest {found['nearest_gap_mm']:.2f} mm")
        else:
            note = "the parts meet, but no pair of faces passes the margins"
        return empty(found["status"], note)
    row["status"] = "ok"
    row["occurrences"] = {"from": found["occurrences"]["a"], "to": found["occurrences"]["b"]}
    row["candidates"] = [_candidate_row(c, shas[0], shas[1]) for c in found["candidates"]]
    row["ambiguous_with"] = [
        {"occurrences": {"from": a["a"], "to": a["b"]},
         "from_faces": a["a_faces"], "to_faces": a["b_faces"]}
        for a in found["ambiguous_with"]]
    return row


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

def gap_edges(topology) -> List[Any]:
    return [e for e in topology.edges if e.interface]


def build(topologies_dir: Path, meshes_dir: Path, out_dir: Path, *,
          allow_older: bool = False) -> Tuple[Path, Dict[str, Any]]:
    """Wipe and rebuild ``<data-root>/projections/feature-identity/contact_suggestions.json``."""
    out_dir = Path(out_dir)
    out_path = out_dir / PROJECTION_NAME
    provenance = prov.stamp(REPO_ROOT, Path(topologies_dir), BUILT_BY,
                            source_key="topologies_dir")
    for line in prov.guard(out_path, provenance, REPO_ROOT, allow_older, REBUILD_COMMAND):
        print(f"note: {line}", file=sys.stderr)
    for line in prov.note_lines(provenance):
        print(line, file=sys.stderr)

    store = Store(meshes_dir, topologies_dir)
    topologies = []
    for path in sorted(Path(topologies_dir).glob("topology_*.json")):
        topology = load_topology(path, repo_root=REPO_ROOT)
        topologies.append({
            "id": topology.id,
            "title": topology.title,
            "edges": [edge_row(topology, edge, store) for edge in gap_edges(topology)],
        })

    rows = [e for t in topologies for e in t["edges"]]
    by_status: Dict[str, int] = {}
    for e in rows:
        by_status[e["status"]] = by_status.get(e["status"], 0) + 1
    data: Dict[str, Any] = {
        "schema": SCHEMA,
        prov.PROVENANCE_KEY: provenance,
        "meshes_dir": str(Path(meshes_dir)),
        "tolerances": dict(ic.CONTACT_TOLERANCES),
        "pairings": dict(ic.CONTACT_PAIRINGS),
        "summary": {
            "gap_edges": len(rows),
            "by_status": dict(sorted(by_status.items())),
            "single_clear_top": sum(1 for e in rows if clear_top(e)),
        },
        "topologies": topologies,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return out_path, data


def clear_top(row: Dict[str, Any]) -> bool:
    """Exactly one clear top pair: a contact, no rival occurrence pair that
    touches different faces, and the runner-up scoring visibly worse."""
    candidates = row.get("candidates") or []
    if row.get("status") != "ok" or row.get("ambiguous_with"):
        return False
    if candidates[0]["relation"] != "contact":
        return False
    if len(candidates) == 1:
        return True
    return candidates[1]["score"] - candidates[0]["score"] >= CLEAR_MARGIN


#: How much worse the runner-up has to score for a top pair to count as clear
#: in the summary -- a quarter of one margin's share (``rank_score``'s units).
#: Reporting only: nothing is hidden or chosen by it.
CLEAR_MARGIN = 0.25


def report_lines(data: Dict[str, Any]) -> List[str]:
    out = []
    for topology in data["topologies"]:
        for e in topology["edges"]:
            head = f"  {e['edge']:<44} {e['interface']:<18}"
            if e["status"] != "ok":
                out.append(f"{head} {e['status']}: {e.get('note', '')}")
                continue
            top = e["candidates"][0]
            flag = "" if clear_top(e) else "  (not clear)"
            out.append(f"{head} {len(e['candidates'])} candidate(s), top "
                       f"{top['relation']} {top['from']['surface']}/{top['to']['surface']} "
                       f"{json.dumps({k: round(v, 4) if isinstance(v, float) else v for k, v in top['evidence'].items()})}"
                       f"{flag}")
    return out


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        prog="build_contact_suggestions.py",
        description="Rank the face pairs that could be each gap edge's interface.")
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (the MAIN checkout's, from a worktree)")
    ap.add_argument("--topologies-dir", default=str(TOPOLOGIES_DIR))
    ap.add_argument("--meshes-dir", default=None,
                    help="override the default (--data-root's meshes/)")
    ap.add_argument("--allow-older-tree", action="store_true")
    ap.add_argument("--print-tolerances", action="store_true",
                    help="print the margins and exit")
    args = ap.parse_args(argv)

    if args.print_tolerances:
        for name, value in ic.CONTACT_TOLERANCES.items():
            print(f"{name:<24} {value}")
        return 0

    data_root = Path(args.data_root)
    meshes_dir = Path(args.meshes_dir) if args.meshes_dir else data_root / "meshes"
    try:
        out, data = build(Path(args.topologies_dir), meshes_dir,
                          data_root / PROJECTION_SUBDIR, allow_older=args.allow_older_tree)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3

    summary = data["summary"]
    print(f"wrote {out}")
    print(f"  {summary['gap_edges']} gap edge(s); {summary['single_clear_top']} with "
          f"one clear top pair")
    for status, count in summary["by_status"].items():
        print(f"    {count:>4}  {status}")
    for line in report_lines(data):
        print(line)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

"""Build the part-names projection -- a part number's everyday name.

The annotator's parts panel used to name a part by number alone, and Jeff
renumbers parts often enough that nobody memorises them. This writes the one
lookup the panel reads: ``{part_number: {name, source}}``.

Output: ``<data-root>/projections/parts/names.json``
(schema ``joby.tolerance_stack/part_names_projection/v0``). **Wipe-and-rebuild,
derived not authored.** Names are display text -- never a value any stack or
fold reads, so nothing here can move a number.

Sources, in precedence order (the first source with a name for a number wins):

1. **drawing-checker's extracted title blocks** --
   ``<drawing-checker>/data/runs/*/*_p01.json``: ``title_block.drawing_no`` and
   ``title_block.nomenclature``. When several runs extracted the same drawing,
   the newest run (by its timestamped directory name) wins. A title block that
   lost its ``drawing_no`` to the extractor falls back to the number the PDF's
   own file name opens with (``source_pdf``), which is the drawing's number as
   its author wrote it.
2. **The topologies' parts** -- ``docs/topologies/*.json`` ``parts[]``: ``drawing``
   and ``name``, with a leading number stripped when the name repeats it.
3. **Nothing.** A number with no entry is simply absent; the annotator shows the
   number alone and says "no name on file" on hover.

Usage, from a worktree (output must land in the main checkout's ``data/``)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_part_names_projection.py --data-root C:\\workspace\\tolstack\\data

The output directory is shared by every worktree, so the JSON is stamped with the
tree that built it and ``scripts/projection_provenance.py`` refuses to overwrite
one built from a tree this one does not contain (``--allow-older-tree``
overrides, loudly).

Stdlib only, plus its sibling script ``projection_provenance``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import projection_provenance as prov  # noqa: E402

SCHEMA_PROJECTION = "joby.tolerance_stack/part_names_projection/v0"
TOPOLOGIES_DIR = Path("docs") / "topologies"
PROJECTION_SUBDIR = Path("projections") / "parts"
PROJECTION_NAME = "names.json"
BUILT_BY = "scripts/build_part_names_projection.py"
DEFAULT_DRAWING_CHECKER_ROOT = Path("C:/workspace/drawing-checker")

#: Where a name came from, in precedence order. The vocabulary of ``source``'s
#: prefix: a row's ``source`` is ``"<kind>: <where>"``.
SOURCE_KINDS = ("drawing", "topology")

#: A part number as this repo writes one: six digits, optionally ``-NNN``.
PART_NUMBER = re.compile(r"^\d{6}(?:-\d{3})?$")
_NUMBER_PREFIX = re.compile(r"^\s*(\d{6}(?:-\d{3})?)(?![0-9])")


def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None
    return value if isinstance(value, dict) else None


def drawing_number(doc: Dict[str, Any]) -> Optional[str]:
    """The drawing number of one extracted page-1 document, or ``None``."""
    block = doc.get("title_block") or {}
    for candidate in (block.get("drawing_no"), doc.get("drawing_no")):
        if isinstance(candidate, str) and PART_NUMBER.match(candidate.strip()):
            return candidate.strip()
    source = doc.get("source_pdf")
    if isinstance(source, str):
        match = _NUMBER_PREFIX.match(Path(source).name)
        if match:
            return match.group(1)
    return None


def drawing_names(drawing_checker_root: Path) -> Dict[str, Dict[str, str]]:
    """Source 1: ``{number: {name, source}}``, the newest run per number."""
    runs = drawing_checker_root / "data" / "runs"
    out: Dict[str, Dict[str, str]] = {}
    # Directory names open with a sortable timestamp, so ascending order lets a
    # later run overwrite an earlier one.
    for path in sorted(runs.glob("*/*_p01.json"), key=lambda p: (p.parent.name, p.name)):
        doc = _read_json(path)
        if doc is None:
            continue
        number = drawing_number(doc)
        nomenclature = (doc.get("title_block") or {}).get("nomenclature")
        if not number or not isinstance(nomenclature, str) or not nomenclature.strip():
            continue
        out[number] = {"name": nomenclature.strip(),
                       "source": f"drawing: {path.parent.name}"}
    return out


def strip_leading_number(name: str, number: str) -> str:
    """``"214698-002 piston head"`` -> ``"piston head"`` when the name repeats it."""
    text = name.strip()
    for prefix in (number, number.split("-")[0]):
        if text.startswith(prefix):
            rest = text[len(prefix):].lstrip(" -:\u2013\u2014")
            if rest:
                return rest
    return text


def topology_names(topologies_dir: Path) -> Dict[str, Dict[str, str]]:
    """Source 2: every topology part that names a drawing and carries a name."""
    out: Dict[str, Dict[str, str]] = {}
    for path in sorted(topologies_dir.glob("*.json")):
        doc = _read_json(path)
        if doc is None or not isinstance(doc.get("parts"), list):
            continue
        for part in doc["parts"]:
            if not isinstance(part, dict):
                continue
            number, name = part.get("drawing"), part.get("name")
            if (not isinstance(number, str) or not PART_NUMBER.match(number)
                    or not isinstance(name, str) or not name.strip()):
                continue
            out.setdefault(number, {
                "name": strip_leading_number(name, number),
                "source": f"topology: {doc.get('id') or path.stem}",
            })
    return out


def build(topologies_dir: Path, drawing_checker_root: Path,
          provenance: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if provenance is None:
        provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY, "topologies_dir")
    names: Dict[str, Dict[str, str]] = dict(topology_names(topologies_dir))
    names.update(drawing_names(drawing_checker_root))   # drawing-checker wins
    ordered = {number: names[number] for number in sorted(names)}
    counts = {kind: sum(1 for row in ordered.values()
                        if row["source"].startswith(kind + ":"))
              for kind in SOURCE_KINDS}
    return {
        "schema": SCHEMA_PROJECTION,
        "built_at": provenance["built_at"],
        "built_by": BUILT_BY,
        prov.PROVENANCE_KEY: provenance,
        "source_kinds": list(SOURCE_KINDS),
        "counts": counts,
        "names": ordered,
    }


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data-root", default=str(REPO_ROOT / "data"),
                    help="repo data/ dir (MAIN checkout's, if you are in a worktree)")
    ap.add_argument("--topologies-dir", default=str(REPO_ROOT / TOPOLOGIES_DIR),
                    help="directory holding the topology documents")
    ap.add_argument("--drawing-checker-root", default=str(DEFAULT_DRAWING_CHECKER_ROOT),
                    help="drawing-checker's repo root (its data/runs/ is read)")
    ap.add_argument("--allow-older-tree", action="store_true",
                    help="overwrite a projection built from a tree this one does not "
                    "contain (see scripts/projection_provenance.py)")
    args = ap.parse_args(argv)

    topologies_dir = Path(args.topologies_dir)
    out_path = Path(args.data_root) / PROJECTION_SUBDIR / PROJECTION_NAME

    provenance = prov.stamp(REPO_ROOT, topologies_dir, BUILT_BY, "topologies_dir")
    rebuild_command = (f"python scripts\\build_part_names_projection.py "
                       f"--data-root {args.data_root}")
    try:
        notes = prov.guard(out_path, provenance, REPO_ROOT, args.allow_older_tree,
                           rebuild_command)
    except prov.RebuildRefused as refusal:
        print(str(refusal), file=sys.stderr)
        return 3
    for line in notes + prov.note_lines(provenance):
        print(f"note: {line}", file=sys.stderr)

    projection = build(topologies_dir, Path(args.drawing_checker_root), provenance)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()
    out_path.write_text(json.dumps(projection, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    print(f"wrote {out_path}")
    counts = projection["counts"]
    print(f"  {len(projection['names'])} names: {counts['drawing']} from a drawing, "
          f"{counts['topology']} from a topology")
    return 0


if __name__ == "__main__":
    sys.exit(main())

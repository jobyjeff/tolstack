"""Evidence for the claim "nothing was written into drawing-checker".

tolstack's dependency on ``C:\\workspace\\drawing-checker`` is **read-only and
one-way**, and the review checklist used to prove it with ``git status`` there.
That check is vacuous: everything the pipeline produces is gitignored in that
repo (``.gitignore:49:data/runs/*``), so a session that ran the pipeline, created
a run directory, re-rendered page images or dropped a PDF into
``data/inbox/drawings/`` leaves ``git status`` **completely clean**. Two lessons
in this repo assert the invariant held and neither assertion was falsifiable by
the method it cites
(``docs/issues/ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md``).

So: snapshot the two directories that a write would land in, at session start and
again at session end, and diff the two. Mechanical, needs **no change to
drawing-checker**, and turns "nothing was written" from an assertion into a
statement with evidence behind it.

    venv-win\\Scripts\\python.exe scripts\\snapshot_drawing_checker.py take before.json
    ... do the session ...
    venv-win\\Scripts\\python.exe scripts\\snapshot_drawing_checker.py take after.json
    venv-win\\Scripts\\python.exe scripts\\snapshot_drawing_checker.py diff before.json after.json

**A non-empty diff is not automatically a violation.** Jeff runs the pipeline
too, and his runs land in the same directory while a session is working. What a
non-empty diff means is that the session now *owes the reader an explanation*:
name the entries, say whose they are, and say how you know
(``run_meta.json``'s ``purpose`` and ``pipeline_commit``, its ``ts`` against your
own commit times). An unexplained diff is the finding; an explained one is
provenance. An **empty** diff is the only thing that closes the question without
argument, which is why it is worth the two commands.

This script is itself strictly read-only: it stats and lists, and never opens,
moves or writes anything under drawing-checker. Its snapshots are written
wherever you point them -- never inside the tree being watched, which would make
the second snapshot record the first one.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

#: The two directories a write from this repo would land in. Absolute by
#: necessity: they are gitignored over there, so they exist only in the main
#: checkout and a worktree-relative path would find nothing (and "nothing" would
#: read as "clean", which is the exact failure this script exists to end).
DEFAULT_ROOTS: Tuple[Path, ...] = (
    Path(r"C:\workspace\drawing-checker\data\runs"),
    Path(r"C:\workspace\drawing-checker\data\inbox\drawings"),
)

SCHEMA = "joby.tolerance_stack/dc_snapshot/v0"


def _iso(ns: int) -> str:
    """A whole-second UTC stamp, for a human reading the JSON."""
    return (
        datetime.fromtimestamp(ns / 1_000_000_000, tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def scan_root(root: Path) -> Dict[str, Any]:
    """Every entry under ``root``, keyed by absolute path with ``/`` separators.

    Directories are recorded as well as files. A pipeline run that creates an
    empty directory and fills it later is still a write, and a directory's own
    mtime moves when a child is added -- so it is signal, not noise.

    Comparison is on ``mtime_ns`` and ``size``; ``mtime`` is the same instant
    spelled for a reader. A file this process cannot stat is recorded with its
    ``error`` rather than skipped: an entry that disappears from a listing
    because of a permission error must not read as an entry that is not there.
    """
    entries: Dict[str, Any] = {}
    if not root.exists():
        return {"present": False, "entries": entries}
    for path in sorted(root.rglob("*")):
        key = path.as_posix()
        try:
            st = path.stat()
            is_dir = path.is_dir()
            entries[key] = {
                "kind": "dir" if is_dir else "file",
                "size": None if is_dir else st.st_size,
                "mtime_ns": st.st_mtime_ns,
                "mtime": _iso(st.st_mtime_ns),
            }
        except OSError as err:  # pragma: no cover - platform-dependent
            entries[key] = {"kind": "unreadable", "error": str(err)}
    return {"present": True, "entries": entries}


def take_snapshot(roots: Sequence[Path] = DEFAULT_ROOTS) -> Dict[str, Any]:
    """One snapshot: what is in each root, right now."""
    roots_out = {}
    for root in roots:
        roots_out[Path(root).as_posix()] = scan_root(Path(root))
    return {
        "schema": SCHEMA,
        "taken_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "roots": roots_out,
        "entry_count": sum(len(r["entries"]) for r in roots_out.values()),
    }


def _flatten(snapshot: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    flat: Dict[str, Dict[str, Any]] = {}
    for root in snapshot.get("roots", {}).values():
        flat.update(root.get("entries", {}))
    return flat


def diff_snapshots(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
    """What changed between two snapshots, in three lists plus root-level notes.

    ``modified`` names the fields that moved, so "the mtime changed but the bytes
    did not" is distinguishable from "the file grew" without re-reading either
    snapshot.
    """
    b, a = _flatten(before), _flatten(after)
    added = [{"path": k, **a[k]} for k in sorted(set(a) - set(b))]
    removed = [{"path": k, **b[k]} for k in sorted(set(b) - set(a))]
    modified: List[Dict[str, Any]] = []
    for k in sorted(set(a) & set(b)):
        fields = [f for f in ("kind", "size", "mtime_ns") if a[k].get(f) != b[k].get(f)]
        if fields:
            modified.append({"path": k, "fields": fields, "before": b[k], "after": a[k]})

    roots: List[Dict[str, Any]] = []
    for key in sorted(set(before.get("roots", {})) | set(after.get("roots", {}))):
        was = before.get("roots", {}).get(key)
        now = after.get("roots", {}).get(key)
        if was is None or now is None:
            roots.append({"root": key, "note": "root is in only one of the two snapshots"})
        elif was.get("present") != now.get("present"):
            roots.append({"root": key,
                          "note": f"root present={was.get('present')} -> present={now.get('present')}"})
    return {
        "added": added,
        "removed": removed,
        "modified": modified,
        "root_notes": roots,
        "changed": bool(added or removed or modified or roots),
        "before_taken_at": before.get("taken_at"),
        "after_taken_at": after.get("taken_at"),
    }


def format_diff(result: Dict[str, Any]) -> str:
    """The report a lesson pastes."""
    lines = [
        f"drawing-checker snapshot diff: {result.get('before_taken_at')} -> "
        f"{result.get('after_taken_at')}"
    ]
    if not result["changed"]:
        lines.append("  EMPTY -- no entry added, removed or modified.")
        return "\n".join(lines)
    for note in result["root_notes"]:
        lines.append(f"  ROOT     {note['root']}: {note['note']}")
    for e in result["added"]:
        lines.append(f"  ADDED    {e['path']}  ({e.get('kind')}, mtime {e.get('mtime')})")
    for e in result["removed"]:
        lines.append(f"  REMOVED  {e['path']}  ({e.get('kind')}, mtime {e.get('mtime')})")
    for e in result["modified"]:
        lines.append(f"  MODIFIED {e['path']}  ({', '.join(e['fields'])})")
    lines.append(
        f"  {len(result['added'])} added, {len(result['removed'])} removed, "
        f"{len(result['modified'])} modified."
    )
    lines.append(
        "  A non-empty diff is a fact to explain, not automatically a violation: "
        "say whose these entries are and how you know (run_meta.json purpose / "
        "pipeline_commit / ts against your own commit times)."
    )
    return "\n".join(lines)


def _load(path: Path) -> Dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    take = sub.add_parser("take", help="write a snapshot of the watched directories")
    take.add_argument("out", type=Path, help="where to write the snapshot JSON")
    take.add_argument(
        "--root", type=Path, action="append", dest="roots", default=None,
        help="override the watched directory (repeatable; defaults to drawing-checker's "
             "data/runs and data/inbox/drawings)",
    )

    dif = sub.add_parser("diff", help="diff two snapshots")
    dif.add_argument("before", type=Path)
    dif.add_argument("after", type=Path)
    dif.add_argument("--json", action="store_true", help="emit the diff as JSON")

    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "take":
        snapshot = take_snapshot(args.roots or DEFAULT_ROOTS)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
        print(f"{args.out}: {snapshot['entry_count']} entries at {snapshot['taken_at']}")
        for key, root in snapshot["roots"].items():
            if not root["present"]:
                print(f"  WARNING: {key} does not exist")
        return 0

    result = diff_snapshots(_load(args.before), _load(args.after))
    print(json.dumps(result, indent=2) if args.json else format_diff(result))
    # 1 means "there is something to explain", not "you did something wrong".
    return 1 if result["changed"] else 0


if __name__ == "__main__":
    sys.exit(main())

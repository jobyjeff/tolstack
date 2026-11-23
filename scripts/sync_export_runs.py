"""Bring every established export citation's ``runs`` up to drawing-checker's run log.

``tests/test_export_runs_match_the_run_log.py`` is red whenever a drawing-checker
run consumes an export a committed topology or stack already cites -- by design:
``runs`` means every consuming run. This is the one-command fix::

    venv-win/Scripts/python.exe scripts/sync_export_runs.py

For each established export (matched on its ``sha256``) it appends one
``{"run_id", "ts"}`` entry per logged run the list does not yet cover, the ``ts``
copied verbatim from that run's own ``run_meta.json`` (the SOP, "Which export").
Entries already there are never touched, so a second run is a no-op. The edit is
a text splice into the ``runs`` array: no other byte of the JSON moves.

A listed run the log does not record (an *extra*) is reported and left for a
human, and the exit code is 1 -- removing a citation is a judgement, adding one
is a transcription. The pairing helpers live here and the guard imports them, so
the two cannot drift.

``--log`` / ``--runs-dir`` / ``--repo`` exist for the test's fixture log; the
defaults are drawing-checker's, read-only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
#: Committed JSON that can carry a ``source_ref.export`` / ``assembly_export_ref``.
CITING_GLOBS = ("docs/topologies/*.json", "docs/tolerance_stacks/stack_*.json")
RUN_LOG = Path(r"C:\workspace\drawing-checker\data\runs.jsonl")


def consuming_runs(log_text: str) -> dict[str, set[str]]:
    """``{input sha256: {run ids}}`` from the log's recorded ``inputs``."""
    by_sha: dict[str, set[str]] = {}
    for line in log_text.splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        for item in row.get("inputs") or ():
            sha = (item.get("sha256") or "").lower()
            if sha:
                by_sha.setdefault(sha, set()).add(row["run_id"])
    return by_sha


def established_exports(node, where="$"):
    """``(where, export dict)`` for every established export block, any depth."""
    if isinstance(node, dict):
        if node.get("status") == "established" and node.get("sha256"):
            yield where, node
        for key, value in node.items():
            yield from established_exports(value, f"{where}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from established_exports(value, f"{where}[{i}]")


def resolve(listed: str, wanted: set[str]) -> set[str]:
    """The logged runs a listed id names: itself, or -- for the short
    ``YYYYMMDD_HHMMSS`` spelling the 2026-08 stacks use and other tests key on --
    the logged ids that begin ``<listed>_``."""
    return {w for w in wanted if w == listed or w.startswith(listed + "_")}


#: An export block's ``sha256`` line followed directly by its ``runs`` array.
BLOCK = re.compile(r'("sha256":\s*"(?P<sha>[0-9A-Fa-f]+)",\s*"runs":\s*\[)(?P<body>.*?)\]',
                   re.DOTALL)


def run_ts(run_id: str, runs_dir: Path, log_text: str) -> str:
    """The run's ``ts``: its ``run_meta.json``'s, else the log row's."""
    meta = runs_dir / run_id / "run_meta.json"
    if meta.is_file():
        ts = json.loads(meta.read_text(encoding="utf-8")).get("ts")
        if ts:
            return ts
    for line in log_text.splitlines():
        if line.strip():
            row = json.loads(line)
            if row.get("run_id") == run_id and row.get("ts"):
                print(f"  note: {run_id} has no run_meta.json ts; used the log's",
                      file=sys.stderr)
                return row["ts"]
    raise SystemExit(f"no ts for run {run_id} in {meta} or the log")


def sync_text(text: str, log_text: str, runs_dir: Path) -> tuple[str, list[str], list[str]]:
    """``(new text, added run ids, extras)`` for one citing document's text."""
    by_sha = consuming_runs(log_text)
    doc = json.loads(text)
    found = sum(1 for _ in established_exports(doc))
    seen = 0
    added: list[str] = []
    extras: list[str] = []

    def splice(m: re.Match) -> str:
        nonlocal seen
        wanted = by_sha.get(m["sha"].lower(), set())
        body = m["body"]
        listed = [r["run_id"] for r in json.loads("[" + body + "]")]
        seen += 1
        extras.extend(i for i in listed if not resolve(i, wanted))
        covered = set().union(*(resolve(i, wanted) for i in listed)) if listed else set()
        missing = sorted(wanted - covered)
        if not missing:
            return m.group(0)
        added.extend(missing)
        # Match the existing entries' layout: the indent of the first `{`, or, for
        # an empty list, two spaces deeper than the `"runs"` key.
        if listed:
            indent = re.search(r"\n([ \t]*)\{", body)[1]
            tail = re.search(r"\n([ \t]*)$", body)[1]
        else:
            key = re.search(r"\n([ \t]*)\"runs\"", m.group(0))[1]
            indent, tail = key + "  ", key
        entries = [
            f'{{\n{indent}  "run_id": {json.dumps(i)},\n'
            f'{indent}  "ts": {json.dumps(run_ts(i, runs_dir, log_text))}\n{indent}}}'
            for i in missing]
        head = body.rstrip() if listed else ""
        sep = "," if listed else ""
        return (m.group(1) + head + sep + "\n" + indent
                + (",\n" + indent).join(entries) + "\n" + tail + "]")

    new = BLOCK.sub(splice, text)
    if seen != found:
        raise SystemExit(f"{found} established export(s) but {seen} spliceable "
                         "`sha256` + `runs` block(s): a layout this script does not read")
    return new, added, extras


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--log", type=Path, default=RUN_LOG)
    ap.add_argument("--runs-dir", type=Path, default=None)
    ap.add_argument("--repo", type=Path, default=REPO)
    ap.add_argument("--check", action="store_true", help="report, write nothing")
    args = ap.parse_args(argv)
    if not args.log.is_file():
        print(f"run log not readable at {args.log}", file=sys.stderr)
        return 2
    log_text = args.log.read_text(encoding="utf-8")
    runs_dir = args.runs_dir or args.log.parent / "runs"
    rc = 0
    changed = 0
    for pattern in CITING_GLOBS:
        for path in sorted(args.repo.glob(pattern)):
            text = path.read_bytes().decode("utf-8")
            new, added, extras = sync_text(text, log_text, runs_dir)
            name = path.relative_to(args.repo).as_posix()
            for i in extras:
                print(f"{name}: lists {i}, which the log does not record for that sha256 "
                      "-- left for a human", file=sys.stderr)
                rc = 1
            if new != text:
                changed += 1
                print(f"{name}: added {len(added)} run(s): {', '.join(added)}")
                if not args.check:
                    path.write_bytes(new.encode("utf-8"))
    if not changed:
        print("every established export already lists the runs the log records")
    return rc


if __name__ == "__main__":
    sys.exit(main())

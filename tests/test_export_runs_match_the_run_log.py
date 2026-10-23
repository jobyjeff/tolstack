"""An export citation's ``runs`` is paired with drawing-checker's run log.

``SourceExport.runs`` means *the drawing-checker runs whose recorded input
sha256 equals this export's* (``tolerance_stack/stack.py``, the SOP, "Which
export"). That list was a hand copy nothing checked against its source -- the
``unpaired_hand_copy`` shape -- so a citation listing one of five consuming runs,
or ``[]`` for an export five runs read, was green
(``docs/issues/ISSUE_20261022_two_213668_export_citations_list_one_of_five_runs_that_consumed_the_export.md``).

The source is ``drawing-checker/data/runs.jsonl``, **not** each run's own
``run_meta.json``: every run before ``20260730_161157`` records no ``inputs``
there, and the log does record them for those. It is read-only here.

A listed id matches a logged run by equality or by the short
``YYYYMMDD_HHMMSS`` prefix (:func:`resolve`); every logged run must be covered
and every listed id must name one.

It is a ``[real]`` check: the log is gitignored in another repo, so an unreadable
log is a skip naming the path and never a failure.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

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


def mismatches(by_sha: dict[str, set[str]], documents: dict[str, object]) -> list[str]:
    out = []
    for name, doc in documents.items():
        for where, export in established_exports(doc):
            listed = {r["run_id"] for r in export.get("runs") or ()}
            wanted = by_sha.get(export["sha256"].lower(), set())
            covered = set().union(*(resolve(i, wanted) for i in listed))
            extra = {i for i in listed if not resolve(i, wanted)}
            if covered != wanted or extra:
                out.append(
                    f"{name} {where}: lists {len(listed)} run(s), the log records "
                    f"{len(wanted)} for sha256 {export['sha256'][:8]}... "
                    f"missing {sorted(wanted - covered)} extra {sorted(extra)}"
                )
    return out


def _documents() -> dict[str, object]:
    docs = {}
    for pattern in CITING_GLOBS:
        for path in sorted(REPO.glob(pattern)):
            docs[path.relative_to(REPO).as_posix()] = json.loads(
                path.read_text(encoding="utf-8"))
    return docs


def test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha():
    if not RUN_LOG.is_file():
        pytest.skip(f"drawing-checker's run log is not readable at {RUN_LOG}")
    by_sha = consuming_runs(RUN_LOG.read_text(encoding="utf-8"))
    documents = _documents()
    assert sum(1 for d in documents.values() for _ in established_exports(d)), (
        "no established export found in any committed topology or stack -- "
        "this guard would pass vacuously")
    bad = mismatches(by_sha, documents)
    assert not bad, (
        "an export's `runs` must be every run whose recorded input sha256 equals "
        "its own (copy each ts from that run's run_meta.json):\n  " + "\n  ".join(bad))


def test_the_pairing_names_a_missing_run_an_extra_run_and_an_empty_list():
    """The checker itself, on synthetic rows: each of the three defects reddens."""
    log = "\n".join(json.dumps({"run_id": r, "inputs": [{"sha256": "AB" * 32}]})
                    for r in ("r1", "r2"))
    by_sha = consuming_runs(log)
    sha = "ab" * 32

    def doc(*ids):
        return {"e": {"status": "established", "pdf": "p", "sha256": sha,
                      "runs": [{"run_id": i, "ts": "t"} for i in ids]}}

    assert mismatches(by_sha, {"d": doc("r1", "r2")}) == []
    assert "missing ['r2']" in mismatches(by_sha, {"d": doc("r1")})[0]
    assert "extra ['r3']" in mismatches(by_sha, {"d": doc("r1", "r2", "r3")})[0]
    assert mismatches(by_sha, {"d": doc()})

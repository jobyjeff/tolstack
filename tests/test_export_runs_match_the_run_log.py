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
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from sync_export_runs import (  # noqa: E402  (the pairing's one home)
    CITING_GLOBS, REPO, RUN_LOG, consuming_runs, established_exports, resolve)


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
        "its own. For a missing run, `venv-win/Scripts/python.exe "
        "scripts/sync_export_runs.py` appends it (ts copied from the run's "
        "run_meta.json); an extra run is removed by hand:\n  " + "\n  ".join(bad))


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

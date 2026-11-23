"""``scripts/sync_export_runs.py`` on a fixture log and fixture documents."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path[:0] = [str(Path(__file__).resolve().parent.parent / "scripts"), str(Path(__file__).resolve().parent)]
import sync_export_runs as sync  # noqa: E402
from sync_export_runs import consuming_runs  # noqa: E402
from test_export_runs_match_the_run_log import mismatches  # noqa: E402

SHA = "ab" * 32
OTHER = "cd" * 32


def _export(sha, runs, indent="        "):
    body = ",\n".join(
        f'{indent}  {{\n{indent}    "run_id": "{r}",\n{indent}    "ts": "T{r}"\n{indent}  }}'
        for r in runs)
    arr = f"[\n{body}\n{indent}]" if runs else "[]"
    return (f'{indent}"export": {{\n{indent}  "status": "established",\n'
            f'{indent}  "pdf": "p.pdf",\n{indent}  "sha256": "{sha}",\n'
            f'{indent}  "runs": {arr},\n{indent}  "note": "n"\n{indent}}}')


def _setup(tmp_path, listed_a, listed_b=()):
    rows = [{"run_id": r, "inputs": [{"sha256": SHA}]} for r in ("r1", "r2", "r3")]
    rows.append({"run_id": "r9", "inputs": [{"sha256": OTHER}]})
    log = tmp_path / "runs.jsonl"
    log.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    runs = tmp_path / "runs"
    for r in ("r1", "r2", "r3", "r9"):
        (runs / r).mkdir(parents=True)
        (runs / r / "run_meta.json").write_text(
            json.dumps({"run_id": r, "ts": f"2026-01-0{r[1]}T00:00:00.123456+00:00"}),
            encoding="utf-8")
    repo = tmp_path / "repo"
    (repo / "docs" / "topologies").mkdir(parents=True)
    doc = repo / "docs" / "topologies" / "t.json"
    doc.write_text('{\n  "a": {\n' + _export(SHA, listed_a) + '\n  },\n  "b": {\n'
                   + _export(OTHER, listed_b) + '\n  }\n}\n', encoding="utf-8")
    return log, repo, doc


def _run(log, repo, *extra):
    return sync.main(["--log", str(log), "--repo", str(repo), *extra])


def test_a_missing_run_is_appended_with_its_run_meta_ts_and_nothing_else_moves(tmp_path):
    log, repo, doc = _setup(tmp_path, ["r1"], ["r9"])
    before = doc.read_text(encoding="utf-8")
    assert _run(log, repo) == 0
    after = doc.read_text(encoding="utf-8")
    runs = {r["run_id"]: r["ts"] for r in json.loads(after)["a"]["export"]["runs"]}
    assert runs == {"r1": "Tr1", "r2": "2026-01-02T00:00:00.123456+00:00",
                    "r3": "2026-01-03T00:00:00.123456+00:00"}
    # Only insertions: every line of the old text is still there, in order.
    it = iter(after.splitlines())
    assert all(line in it for line in before.splitlines())
    assert json.loads(before)["b"] == json.loads(after)["b"]
    assert mismatches(consuming_runs(log.read_text(encoding="utf-8")),
                      {"d": json.loads(after)}) == []


def test_an_empty_list_is_filled_and_a_second_run_is_a_no_op(tmp_path):
    log, repo, doc = _setup(tmp_path, [], ["r9"])
    assert _run(log, repo) == 0
    first = doc.read_bytes()
    assert len(json.loads(first)["a"]["export"]["runs"]) == 3
    assert _run(log, repo) == 0
    assert doc.read_bytes() == first


def test_an_extra_run_is_reported_not_removed(tmp_path, capsys):
    log, repo, doc = _setup(tmp_path, ["r1", "r2", "r3", "ghost"], ["r9"])
    before = doc.read_bytes()
    assert _run(log, repo) == 1
    assert doc.read_bytes() == before
    assert "ghost" in capsys.readouterr().err


def test_check_writes_nothing(tmp_path):
    log, repo, doc = _setup(tmp_path, ["r1"], ["r9"])
    before = doc.read_bytes()
    assert _run(log, repo, "--check") == 0
    assert doc.read_bytes() == before

"""Tests for ``scripts/snapshot_drawing_checker.py``.

Every one of these runs against a **fixture directory under ``tmp_path``**, never
against ``C:\\workspace\\drawing-checker``. That is a deliberate constraint, not
an accident of style: this script exists to prove that a tolstack session wrote
nothing into drawing-checker, and a test suite that created a run directory there
to have something to detect would falsify the very invariant the script measures.
The real directories are exercised by *taking* two snapshots and diffing them,
which writes nothing (see the session lesson).
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import snapshot_drawing_checker as sds  # noqa: E402


@pytest.fixture()
def watched(tmp_path):
    """A stand-in for ``data/runs/``: one run dir with two artifacts."""
    root = tmp_path / "runs"
    run = root / "20260804_114000_217755_A.1"
    run.mkdir(parents=True)
    (run / "run_meta.json").write_text('{"purpose": "test"}', encoding="utf-8")
    (run / "217755_A_p01.json").write_text("{}", encoding="utf-8")
    return root


def test_an_untouched_directory_diffs_to_empty(watched):
    """The empty diff is the whole point: it is what closes the question."""
    before = sds.take_snapshot([watched])
    after = sds.take_snapshot([watched])
    result = sds.diff_snapshots(before, after)
    assert result["changed"] is False
    assert result["added"] == [] and result["removed"] == [] and result["modified"] == []
    assert "EMPTY" in sds.format_diff(result)


def test_a_synthetic_added_file_diffs_to_exactly_that_file(watched):
    """A dropped-in PDF is the write ``git status`` over there cannot see."""
    before = sds.take_snapshot([watched])
    added = watched / "217755_A.1.pdf"
    added.write_bytes(b"%PDF-1.7 not really")
    result = sds.diff_snapshots(before, sds.take_snapshot([watched]))

    assert result["changed"] is True
    assert [e["path"] for e in result["added"]] == [added.as_posix()]
    assert result["removed"] == [] and result["modified"] == []
    assert result["added"][0]["kind"] == "file"
    assert result["added"][0]["size"] == len(b"%PDF-1.7 not really")
    assert added.as_posix() in sds.format_diff(result)


def test_a_new_run_directory_shows_the_directory_its_files_and_its_parent(watched):
    """The realistic shape of a pipeline write, and the reason directories are
    entries too: a run dir is created first and filled after, so a snapshot that
    listed files only could catch it mid-flight and see nothing."""
    before = sds.take_snapshot([watched])
    run = watched / "20260807_090000_217755_A.1"
    run.mkdir()
    (run / "run_meta.json").write_text('{"purpose": "user"}', encoding="utf-8")
    result = sds.diff_snapshots(before, sds.take_snapshot([watched]))

    added = {e["path"]: e["kind"] for e in result["added"]}
    assert added == {run.as_posix(): "dir", (run / "run_meta.json").as_posix(): "file"}
    assert result["removed"] == []


def test_a_removed_entry_is_reported_as_removed(watched):
    before = sds.take_snapshot([watched])
    victim = watched / "20260804_114000_217755_A.1" / "217755_A_p01.json"
    victim.unlink()
    result = sds.diff_snapshots(before, sds.take_snapshot([watched]))

    assert [e["path"] for e in result["removed"]] == [victim.as_posix()]
    # ...and its parent moved, which is how a re-render shows up.
    assert [e["path"] for e in result["modified"]] == [victim.parent.as_posix()]


def test_a_rewritten_file_is_modified_with_the_fields_that_moved(watched):
    """A re-rendered page image keeps its name. Size and mtime are what betray
    it, so the diff names which of them moved rather than only that something
    did."""
    before = sds.take_snapshot([watched])
    meta = watched / "20260804_114000_217755_A.1" / "run_meta.json"
    meta.write_text('{"purpose": "test", "rerendered": true}', encoding="utf-8")
    result = sds.diff_snapshots(before, sds.take_snapshot([watched]))

    modified = {e["path"]: e["fields"] for e in result["modified"]}
    assert "size" in modified[meta.as_posix()]
    assert result["added"] == [] and result["removed"] == []


def test_an_absent_root_is_recorded_as_absent_not_as_empty(tmp_path):
    """"Empty in my worktree" is never evidence of "absent" in this workspace,
    and the inverse matters here: a root that is missing must not snapshot as a
    clean, empty one -- that would read as "nothing there, nothing written"."""
    missing = tmp_path / "not_here"
    snapshot = sds.take_snapshot([missing])
    root = snapshot["roots"][missing.as_posix()]
    assert root["present"] is False and root["entries"] == {}

    missing.mkdir()
    result = sds.diff_snapshots(snapshot, sds.take_snapshot([missing]))
    assert result["changed"] is True
    assert result["root_notes"][0]["root"] == missing.as_posix()


def test_taking_a_snapshot_writes_nothing_into_the_directory_it_watches(watched):
    """The script is read-only over drawing-checker, and this is the assertion
    that keeps it that way."""
    listing = sorted(p.as_posix() for p in watched.rglob("*"))
    stamps = {p.as_posix(): p.stat().st_mtime_ns for p in watched.rglob("*")}
    sds.take_snapshot([watched])
    sds.take_snapshot([watched])
    assert sorted(p.as_posix() for p in watched.rglob("*")) == listing
    assert {p.as_posix(): p.stat().st_mtime_ns for p in watched.rglob("*")} == stamps


def test_the_defaults_are_the_two_directories_a_write_would_land_in():
    """Not a tautology: these are absolute main-checkout paths on purpose. Both
    are gitignored in drawing-checker, so a repo-relative path resolves to
    nothing from a worktree and the snapshot would be vacuously clean -- the same
    failure mode as the ``git status`` check this script replaces."""
    assert [p.as_posix() for p in sds.DEFAULT_ROOTS] == [
        "C:/workspace/drawing-checker/data/runs",
        "C:/workspace/drawing-checker/data/inbox/drawings",
    ]
    assert all(p.is_absolute() for p in sds.DEFAULT_ROOTS)


def test_the_cli_round_trips_and_its_exit_code_answers_the_question(tmp_path, watched, capsys):
    """0 = empty diff = the invariant held with evidence. 1 = something to
    explain. A session can gate on it without reading the report."""
    before, after = tmp_path / "s" / "before.json", tmp_path / "s" / "after.json"
    assert sds.main(["take", str(before), "--root", str(watched)]) == 0
    assert sds.main(["take", str(after), "--root", str(watched)]) == 0
    assert json.loads(before.read_text(encoding="utf-8"))["schema"] == sds.SCHEMA
    assert sds.main(["diff", str(before), str(after)]) == 0

    (watched / "dropped_in.pdf").write_bytes(b"%PDF")
    later = tmp_path / "s" / "later.json"
    assert sds.main(["take", str(later), "--root", str(watched)]) == 0
    assert sds.main(["diff", str(before), str(later)]) == 1
    assert "dropped_in.pdf" in capsys.readouterr().out

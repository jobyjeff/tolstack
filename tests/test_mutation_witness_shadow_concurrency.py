"""Two overlapping ``scripts/run_mutation_witness_tests.mjs`` runs, driven for real.

Before 2026-10-01 the tier built its shadow at one fixed path shared by every run
against a repo, with no lock and no per-run directory. A second run started
against the same worktree wiped and re-copied the tree the first was mid-patch
on, and **neither failure said anything about concurrency**: the run that was
mid-flight died on an ``ENOENT`` naming a file that *was* there, and the run
that started second died on an ``EPERM`` trying to remove a shadow the first
run's spawned tier still held open
(``ISSUE_20261001_two_mutation_witness_runs_on_one_worktree_corrupt_each_others_shadow``).

This module drives the real script -- not a reimplementation of its locking --
against real entries, because the thing worth proving is behaviour under actual
concurrent node processes, not that a mocked version of the logic agrees with
itself. Each test picks a cheap ``fast``-tier entry (a couple of seconds, not
the tens of minutes a browser entry costs) so two full runs still finish in a
few seconds.

Assertions are on **behaviour**, not on an exact sentence: a named refusal is
identified by containing ``REFUSED`` and naming a pid, never by matching the
whole message verbatim, so a copy-edit to the refusal text does not retire
this coverage.

**2026-10-01 review finding, and what changed here because of it.** The first
version of ``acquireLock``'s lock claim was a plain exclusive
``writeFileSync(LOCK, json, { flag: "wx" })`` -- which IS an atomic *create*,
but not an atomic *create-with-this-content*: it is `open()` then a separate
`write()`, and a second process reading `LOCK` in the gap between them saw a
file that existed but was still empty, failed to parse it, and -- because
"could not parse" and "the pid inside it is dead" were the same branch --
concluded it was abandoned and reclaimed it. **Both** processes then
proceeded with no refusal from either. Review measured this at **3 failures in
10 back-to-back runs** of ``test_two_concurrent_runs_against_one_repo_produce_a_
named_refusal`` on the unfixed code -- a single passing run was not evidence it
was closed, which is why that test now loops rather than running once, and why
a second, fully deterministic test below exercises the "corrupt, not stale"
branch directly rather than hoping to catch the race by timing.

The fix: the lock's content is written complete to a private temp file first,
then published at `LOCK` by `linkSync` -- one atomic, exclusive operation, so
a reader that observes `LOCK` at all always sees it fully written. "Unparseable"
and "parsed, pid confirmed dead" are now two different code paths with two
different messages, and only the latter is reported as *stale*.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
WITNESS_RUNNER = REPO_ROOT / "scripts" / "run_mutation_witness_tests.mjs"
LOCK_PATH = REPO_ROOT / "tmp" / "mutation-witness.lock"

#: A ``fast``-tier entry (apps/viewer's own fast runner, not a browser) --
#: cheap enough (~2s for a clean-plus-mutated pair) that two full runs still
#: finish in a few seconds. Matched by substring, the same way ``--only``
#: itself matches, so a future rename of the guard's prose does not retire
#: this id as long as some entry still contains it.
CHEAP_ENTRY = "fast__a-ready-banner"


def _node() -> str:
    node = shutil.which("node")
    if not node:
        pytest.fail(
            "node is not on PATH, so scripts/run_mutation_witness_tests.mjs was "
            "never run -- which is not the same as passing. node is already a "
            "hard requirement of tests/test_viewer_js_suite.py."
        )
    return node


def _run(repo: Path, extra_args: list[str] | None = None) -> subprocess.Popen:
    """Starts (does not wait for) a real witness run against `repo`."""
    return subprocess.Popen(
        [_node(), str(repo / "scripts" / "run_mutation_witness_tests.mjs"),
         "--only", CHEAP_ENTRY, *(extra_args or [])],
        cwd=str(repo),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _communicate(proc: subprocess.Popen, timeout: float = 120) -> tuple[int, str, str]:
    out, err = proc.communicate(timeout=timeout)
    return proc.returncode, out, err


def _assert_no_crash(combined: str) -> None:
    """Neither of the two crash SHAPES the issue reported, by shape not text.

    `node`'s own uncaught-exception printer formats an error as ``Error: <code>,
    <message>`` and ends with a ``Node.js vX.Y.Z`` version banner -- both
    distinct from this script's own deliberate ``note: ...`` diagnostics, which
    may legitimately *mention* ``ENOENT``/``EPERM`` while reporting a handled,
    non-fatal condition (the stale-shadow sweep does exactly this: it logs the
    code of a reap it skipped). Matching the raw-crash SHAPE rather than the
    bare substring is what lets this assertion tell the two apart.
    """
    assert "Node.js v" not in combined, (
        "a run printed node's uncaught-exception banner -- a crash, not a "
        "clean outcome:\n" + combined
    )
    assert "Error: ENOENT" not in combined and "Error: EPERM" not in combined, (
        "a run crashed with the raw ENOENT/EPERM shape the issue reported, "
        "instead of being cleanly refused or handling it:\n" + combined
    )


@pytest.fixture(autouse=True)
def _clean_lock():
    """No leftover lock from a prior (possibly crashed) run biases a test.

    Safe to remove unconditionally here: this is this session's own worktree,
    not a shared checkout, and a clean lock is exactly the state a fresh run
    would find if the prior one exited and released it as designed.
    """
    if LOCK_PATH.exists():
        LOCK_PATH.unlink()
    yield


#: Review measured the pre-fix race at 3 failures in 10 back-to-back pairs.
#: A single passing round is not evidence it's closed; this many rounds, all
#: required to pass, is -- see the module docstring for why.
CONCURRENT_ROUNDS = 10


def test_two_concurrent_runs_against_one_repo_produce_a_named_refusal() -> None:
    """The collision the issue reported, reproduced and now refused cleanly,
    every round rather than just the lucky ones."""
    for round_ in range(CONCURRENT_ROUNDS):
        p1 = _run(REPO_ROOT)
        p2 = _run(REPO_ROOT)
        code1, out1, err1 = _communicate(p1)
        code2, out2, err2 = _communicate(p2)

        results = [(code1, out1, err1), (code2, out2, err2)]
        combined = out1 + err1 + out2 + err2
        context = f"round {round_ + 1}/{CONCURRENT_ROUNDS}"
        _assert_no_crash(combined)

        refused = [(c, o, e) for c, o, e in results if "REFUSED" in o]
        clean = [(c, o, e) for c, o, e in results if "REFUSED" not in o]
        assert len(refused) == 1, (
            f"{context}: expected exactly one of the two concurrent runs to be "
            f"refused, got {len(refused)}:\n--- run 1 ---\n{out1}\n--- run 2 ---\n{out2}"
        )
        assert len(clean) == 1, context

        refused_code, refused_out, _ = refused[0]
        assert refused_code != 0, f"{context}: a refused run must not exit 0"
        # Identifiable by BEHAVIOUR -- it names a pid -- not by a verbatim sentence.
        assert "REFUSED: another witness run (pid " in refused_out, f"{context}:\n{refused_out}"
        # The exact conflation the review finding was: a corrupt-looking read
        # of the WINNER's lock, during this very race, being treated as a dead
        # pid instead of being left ambiguous. It must never appear here.
        assert "clearing an unreadable lock" not in refused_out, (
            f"{context}: the loser treated a (mid-race) unparseable lock as "
            "abandoned instead of refusing -- the exact conflation this fix "
            f"closes:\n{refused_out}"
        )

        clean_code, clean_out, _ = clean[0]
        assert clean_code == 0, (
            f"{context}: the run that was NOT refused must still succeed cleanly:\n{clean_out}"
        )
        assert "declared mutations witnessed" in clean_out, f"{context}:\n{clean_out}"


def test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale() -> None:
    """The specific conflation the review found, forced directly rather than
    hoped for by timing: a lock file that cannot be parsed at all -- the exact
    shape a reader caught mid-write used to produce -- must be reported as
    corrupt, never folded into "pid confirmed dead". No second process is
    started to race against; the file is simply malformed on disk already.
    """
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCK_PATH.write_text("", encoding="utf-8")

    proc = _run(REPO_ROOT)
    code, out, err = _communicate(proc)

    assert "REFUSED" not in out, out
    assert "clearing an unreadable lock" in out, out
    assert "clearing a stale lock" not in out, (
        "a corrupt/unreadable lock must not be reported as a confirmed-dead-pid "
        "stale one -- that conflation is exactly the bug this fix closes:\n" + out
    )
    assert code == 0, out
    assert "declared mutations witnessed" in out, out
    assert not LOCK_PATH.exists(), "the lock this run took should be released on exit"


def test_two_different_repo_roots_both_still_succeed(tmp_path: Path) -> None:
    """The case the merge gate depends on: unrelated repos never contend.

    The lock is scoped to the REPO the running script's own copy lives in, so
    a second checkout of this tree -- standing in for "the main checkout and a
    worktree running at once", the actual shape in ordinary use -- must get its
    own lock and its own shadow, not collide with this one.
    """
    second_repo = tmp_path / "second_repo"
    shutil.copytree(
        REPO_ROOT, second_repo,
        ignore=shutil.ignore_patterns(".git", "tmp", "data", "node_modules", "__pycache__"),
    )

    p1 = _run(REPO_ROOT)
    p2 = _run(second_repo)
    code1, out1, err1 = _communicate(p1)
    code2, out2, err2 = _communicate(p2)

    for label, code, out, err in (("this repo", code1, out1, err1),
                                   ("the second repo", code2, out2, err2)):
        combined = out + err
        assert "REFUSED" not in out, (
            f"{label}'s run was refused even though the two repos are unrelated:\n" + out
        )
        _assert_no_crash(combined)
        assert code == 0, f"{label}'s run did not succeed:\n" + out
        assert "declared mutations witnessed" in out, out


def test_a_stale_lock_pid_dead_is_cleared_with_a_message() -> None:
    """A lock whose pid is no longer running must not wedge the tier forever."""
    dead_proc = subprocess.Popen(
        [_node(), "-e", "process.exit(0)"], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    dead_proc.wait(timeout=30)
    # Waited, so the child has already exited and its pid is available as a
    # known-dead one -- the liveness check this lock depends on
    # (`process.kill(pid, 0)`) has the same honest limit any pidfile does, pid
    # reuse, and this is the narrowest way to get a pid this test KNOWS is dead
    # rather than guessing a large unused number.
    dead_pid = dead_proc.pid
    assert dead_pid, "could not obtain the dead child's pid to seed a stale lock"

    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCK_PATH.write_text(json.dumps({
        "pid": dead_pid,
        "startedAt": "2026-01-01T00:00:00.000Z",
    }), encoding="utf-8")

    proc = _run(REPO_ROOT)
    code, out, err = _communicate(proc)

    assert "REFUSED" not in out, (
        "a dead-pid lock must be cleared, not treated as a live refusal:\n" + out
    )
    assert f"clearing a stale lock (pid {dead_pid}" in out, out
    assert code == 0, "the run must proceed normally once the stale lock is cleared:\n" + out
    assert "declared mutations witnessed" in out, out
    # Released on the way out, same as any other successful run -- a stale
    # lock being cleared is not a reason to leave the NEW one behind either.
    assert not LOCK_PATH.exists(), "the lock this run took should be released on exit"

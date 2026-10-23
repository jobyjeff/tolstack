"""A browser runner queues for the machine's slot and leaves no Chrome behind.

Two halves (handoff browser_runners_take_the_slot_and_free_the_box):

* **pytest takes the slot only for a browser test.** ``tests/browser_slot.py``'s
  ``browser_slot`` fixture is what queues; these tests run a pytest of their own
  against a stand-in for ``dispatch slot run`` that records each time it is
  called, and require it called never for a run with no browser test and once
  for a session with several.
* **a runner that ends closes its Chrome.** ``tests/browser_runner_witness.mjs``
  launches Chrome through ``scripts/browser_runner.mjs`` exactly as the real
  runners do, and each test ends it one way and then looks for its Chrome by
  the profile directory on that Chrome's command line. Path alone cannot tell
  this Chrome from Jeff's: the runners use the installed one (``channel:
  'chrome'``).

WHAT MAKES THE SECOND HALF A WITNESS. Chrome also quits by itself once the node
that drove it is gone -- its DevTools pipe closes -- 50 to 365 ms later
(measured 2026-10-21). So "no Chrome a few seconds later" would be green with
every close in the runner deleted. What only the runner's own close produces is
**the browser process already gone at the instant node exits**, so that is
asserted, from handles opened before the run is ended. And because the helper's
exit handler kills (exit code 1) whatever a ``finally`` or a signal handler
failed to close, the two graceful paths also require exit code 0 -- otherwise
the backstop would hide a missing close.
"""
from __future__ import annotations

import ctypes
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import textwrap
import time
import warnings
from ctypes import wintypes
from pathlib import Path

import pytest

from tests import browser_slot

REPO_ROOT = Path(__file__).resolve().parent.parent
WITNESS = REPO_ROOT / "tests" / "browser_runner_witness.mjs"
PROFILE = re.compile(r'--user-data-dir="?([^"\s]+)')
#: How long after node exits every Chrome process of its profile must be gone.
SETTLE_S = 5.0
#: How long the runner gets to start Chrome, and to finish once told to stop. The
#: stop has to outlast the runner's own bound (KILL_WAIT_BOUND_MS) on a kill that
#: is waiting for a slow teardown, or the test times out on a runner that is
#: behaving as designed.
START_S = 60
STOP_S = 150
#: What the runner prints when its kill wait ran out with Chrome un-signalled.
LEFT_RUNNING_RE = re.compile(
    r"^BROWSER LEFT RUNNING: Chrome process\(es\) ([\d, ]+) were", re.M)
TRACE_ENV = "TOLSTACK_BROWSER_RUNNER_TRACE"


# --------------------------------------------------------------------------- #
# pytest takes the slot only when a browser test is selected                  #
# --------------------------------------------------------------------------- #

#: Stands in for ``dispatch slot run``: one line in the log per call, then runs
#: the command after ``--`` as the real one would, slot held.
FAKE_SLOT = textwrap.dedent("""
    import os, subprocess, sys
    with open(sys.argv[1], "a", encoding="utf-8") as log:
        log.write("taken\\n")
    argv = sys.argv[sys.argv.index("--") + 1:]
    code = subprocess.call(argv, env={**os.environ, "DISPATCH_SLOT_HELD": "browser"})
    with open(sys.argv[1], "a", encoding="utf-8") as log:
        log.write("released\\n")
    sys.exit(code)
""")

CONFTEST = textwrap.dedent("""
    import sys
    from tests import browser_slot as bs
    bs.SLOT_RUN = [sys.executable, {fake!r}, {log!r}, "--"]
    from tests.browser_slot import browser_slot  # noqa: F401
""")

TESTS = textwrap.dedent("""
    import os

    def test_no_browser():
        pass

    def test_a_browser(browser_slot):
        assert os.environ.get("DISPATCH_SLOT_HELD") == "browser"

    def test_another_browser(browser_slot):
        assert os.environ.get("DISPATCH_SLOT_HELD") == "browser"

    def test_plain_after_browser():
        # The stand-in's holder has exited (it logs "released"), and the env is clear.
        assert "DISPATCH_SLOT_HELD" not in os.environ
        assert open({log!r}, encoding="utf-8").read().count("released") == 1
""")


def _inner_pytest(tmp_path: Path, *select: str) -> int:
    """How many times a pytest selecting ``select`` took the (stand-in) slot."""
    log = tmp_path / "slot.log"
    fake = tmp_path / "fake_slot.py"
    fake.write_text(FAKE_SLOT, encoding="utf-8")
    (tmp_path / "conftest.py").write_text(
        CONFTEST.format(fake=str(fake), log=str(log)), encoding="utf-8")
    (tmp_path / "test_inner.py").write_text(TESTS.replace("{log!r}", repr(str(log))), encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if k != browser_slot.HELD_ENV}
    env["PYTHONPATH"] = str(REPO_ROOT)
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider",
         "--rootdir", str(tmp_path), *(f"test_inner.py::{name}" for name in select)],
        cwd=str(tmp_path), env=env, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=120)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return log.read_text(encoding="utf-8").count("taken") if log.exists() else 0


def test_a_run_that_selects_no_browser_test_never_touches_the_slot(tmp_path):
    assert _inner_pytest(tmp_path, "test_no_browser") == 0


def test_a_session_takes_the_slot_once_however_many_browser_tests_it_runs(tmp_path):
    # The other arm, so the one above cannot pass by the stand-in never working.
    assert _inner_pytest(tmp_path, "test_no_browser", "test_a_browser",
                         "test_another_browser") == 1


def test_the_slot_is_released_before_a_plain_test_that_follows_the_last_browser_test(tmp_path):
    # Selection order is file order: the browser tests, then the plain test behind them.
    assert _inner_pytest(tmp_path, "test_a_browser", "test_another_browser",
                         "test_plain_after_browser") == 1


def test_a_held_slot_is_not_taken_again(monkeypatch):
    """Under ``dispatch slot run`` already, the fixture does not queue on itself."""
    monkeypatch.setenv(browser_slot.HELD_ENV, "browser")
    # Absent, so reaching past the held check would warn "no dispatch at ...".
    monkeypatch.setattr(browser_slot, "SLOT_RUN", [str(REPO_ROOT / "no-such-dispatch")])
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        with browser_slot.holding_the_browser_slot():
            assert os.environ[browser_slot.HELD_ENV] == "browser"


# --------------------------------------------------------------------------- #
# a runner that ends leaves no Chrome                                          #
# --------------------------------------------------------------------------- #

SYNCHRONIZE = 0x00100000
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
STILL_ACTIVE = 259


def _kernel32():
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    k32.OpenProcess.restype = wintypes.HANDLE
    return k32


def _processes() -> list[dict]:
    """Every chrome.exe with its parent and command line."""
    ps = ("Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | "
          "Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress")
    out = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                         capture_output=True, text=True, encoding="utf-8",
                         errors="replace", timeout=60).stdout.strip()
    if not out:
        return []
    rows = json.loads(out, strict=False)
    return rows if isinstance(rows, list) else [rows]


def _profile_of(node_pid: int) -> tuple[str, int]:
    """The profile dir and pid of the Chrome ``node_pid`` started."""
    for row in _processes():
        if row["ParentProcessId"] == node_pid:
            found = PROFILE.search(row["CommandLine"] or "")
            if found:
                return found[1], row["ProcessId"]
    raise AssertionError(f"no Chrome under node pid {node_pid}")


def _with_profile(profile: str) -> list[int]:
    return [row["ProcessId"] for row in _processes() if profile in (row["CommandLine"] or "")]


def _exit_code(k32, handle) -> int:
    code = wintypes.DWORD()
    k32.GetExitCodeProcess(handle, ctypes.byref(code))
    return code.value


def _left_reported(stderr: str) -> list[int]:
    """The pids the runner named on its BROWSER LEFT RUNNING line."""
    return sorted({int(p) for m in LEFT_RUNNING_RE.finditer(stderr)
                   for p in m.group(1).split(",") if p.strip()})


def unexplained_survivors(seen: dict) -> list[int]:
    """Chrome pids the runner left running that it did not account for.

    A killed Chrome on this box has stayed un-signalled for over a minute after
    taskkill (exit code set, so it runs no code, but not yet torn down --
    measured 2026-10-22 in drawing-checker, which found and fixed the same red).
    The runner waits KILL_WAIT_BOUND_MS for that and then exits SAYING SO on its
    BROWSER LEFT RUNNING line. So a pid un-signalled at node's exit is accounted
    for only when its exit code was set AND the runner named it -- the runner's
    stated bound, read at node's exit, never "gone a few seconds later". With the
    exit handler deleted, Playwright's own exit hook still taskkills Chrome
    silently: exit code set, nobody named, red. A pid still listed after the
    settle wait must likewise be one the runner named."""
    named = set(seen["left_reported"])
    late = [pid for pid in seen["alive_at_exit"]
            if not (pid in seen["exit_code_set"] and pid in named)]
    return sorted(set(late) | {pid for pid in seen["survivors"] if pid not in named})


def _assert_gone_or_named(how: str, seen: dict) -> None:
    bad = unexplained_survivors(seen)
    assert not bad, (
        f"ended by {how}: Chrome {bad} (profile {seen['profile']}) was running when "
        f"its node exited, or {SETTLE_S:g} s later, and the runner did not name it "
        f"on a BROWSER LEFT RUNNING line -- nothing in the runner killed it and waited "
        f"for it, and only the DevTools pipe closing would have\n"
        f"alive at exit {seen['alive_at_exit']}, exit code set {seen['exit_code_set']}, "
        f"named {seen['left_reported']}\n{seen['stderr']}")
    if seen["alive_at_exit"] or seen["survivors"]:
        warnings.warn(f"{how}: the runner's kill wait ran out and said so: "
                      f"{seen['left_reported']}\n{seen['stderr']}")


def _end_a_runner(how: str) -> dict:
    """Starts the witness runner, ends it ``how``, and says what its Chrome did."""
    node = shutil.which("node")
    assert node, "node is not on PATH, so no runner was started -- not a pass"
    proc = subprocess.Popen(
        [node, str(WITNESS), how], cwd=str(REPO_ROOT),
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="replace",
        env={**os.environ, TRACE_ENV: "1"},
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    k32 = _kernel32()
    handles: dict = {}
    try:
        deadline = time.monotonic() + START_S
        line = ""
        while line != "READY" and time.monotonic() < deadline and proc.poll() is None:
            line = proc.stdout.readline().strip()
        assert line == "READY", f"the runner never got its Chrome up:\n{proc.stderr.read()}"
        profile, top = _profile_of(proc.pid)
        pids = _with_profile(profile)
        handles = {pid: k32.OpenProcess(SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION,
                                        False, pid) for pid in pids}
        if how == "signal":
            os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
        else:
            proc.stdin.write("go\n")
            proc.stdin.flush()
        proc.wait(timeout=STOP_S)
        at_exit = [pid for pid, h in handles.items() if k32.WaitForSingleObject(h, 0) != 0]
        # Un-signalled is not "running code": a killed Chrome sits between the two
        # for 0.3 s to over a minute here. Which survivors had at least stopped?
        exit_code_set = [pid for pid in at_exit if _exit_code(k32, handles[pid]) != STILL_ACTIVE]
        top_code = _exit_code(k32, handles[top])
        deadline = time.monotonic() + SETTLE_S
        for h in handles.values():
            k32.WaitForSingleObject(h, max(0, int((deadline - time.monotonic()) * 1000)))
        stderr = proc.stderr.read()
        return {"profile": profile, "top": top, "alive_at_exit": at_exit,
                "exit_code_set": exit_code_set,
                "top_code": top_code, "node_code": proc.returncode,
                "survivors": _with_profile(profile), "stderr": stderr,
                "left_reported": _left_reported(stderr)}
    finally:
        if proc.poll() is None:
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                           capture_output=True)
        for h in handles.values():
            k32.CloseHandle(h)


needs_windows = pytest.mark.skipif(sys.platform != "win32",
                                   reason="the runners and this check are Windows-native")


@needs_windows
@pytest.mark.parametrize("how, graceful", [
    # Ctrl-Break: the handler kills the recorded tree and waits until every handle
    # is signalled (the pass the exit event runs), so Chrome is KILLED, not closed:
    # there is no graceful close on this path any more.
    ("signal", False),
    # A throw inside the runner's try: its `finally` closes the browser.
    ("throw", True),
    # process.exit() with the browser open skips every `finally`: the helper's
    # exit handler is all that is left, and it kills the tree.
    ("exit", False),
])
def test_a_runner_that_ends_leaves_no_chrome(browser_slot, how, graceful):
    seen = _end_a_runner(how)
    _assert_gone_or_named(how, seen)
    if graceful:
        assert seen["top_code"] == 0, (
            f"ended by {how}: Chrome {seen['top']} exited {seen['top_code']}, so it was "
            "killed by the exit handler rather than closed -- the close this path "
            f"owns did not happen\n{seen['stderr']}")


def _ended(alive, exit_code_set=(), left_reported=(), survivors=()):
    return {"profile": "p", "top": 1, "alive_at_exit": list(alive),
            "exit_code_set": list(exit_code_set), "left_reported": list(left_reported),
            "survivors": list(survivors), "top_code": 0, "node_code": 0, "stderr": ""}


@pytest.mark.parametrize("alive,exit_code_set,left_reported,survivors,unexplained", [
    ([], [], [], [], []),                       # all gone at node's exit
    ([2], [2], [2], [], []),                    # killed and named: the stated bound ran out
    ([2], [2], [], [], [2]),                    # killed but NOT named: a silent kill
    ([2], [], [2], [], [2]),                    # named but still running code
    ([2, 3], [2, 3], [2], [], [3]),             # one named, one not
    ([], [], [], [5], [5]),                     # unnamed and still listed after the settle wait
    ([2], [2], [2], [2], []),                   # named, still listed: accounted for
])
def test_the_witness_verdict_accepts_only_a_killed_and_named_survivor(
        alive, exit_code_set, left_reported, survivors, unexplained):
    """The rule the Chrome witness asserts, pinned without a browser."""
    assert unexplained_survivors(
        _ended(alive, exit_code_set, left_reported, survivors)) == unexplained


def test_a_named_survivor_passes_with_a_warning_and_an_unnamed_one_fails():
    with pytest.warns(UserWarning, match="kill wait ran out and said so"):
        _assert_gone_or_named("signal", _ended([2], [2], [2]))
    with pytest.raises(AssertionError):
        _assert_gone_or_named("signal", _ended([2], [2], []))


def test_the_left_running_line_is_the_one_the_witness_reads():
    """The runner's loud line and the witness's parser are one format."""
    src = (REPO_ROOT / "scripts" / "browser_runner.mjs").read_text(encoding="utf-8-sig")
    assert 'export const LEFT_RUNNING = "BROWSER LEFT RUNNING";' in src
    assert "${LEFT_RUNNING}: Chrome process(es) ${left.join(\", \")} were" in src
    line = "BROWSER LEFT RUNNING: Chrome process(es) 12, 345 were still running 60000 ms"
    assert _left_reported(line) == [12, 345]


def test_the_stop_wait_outlasts_the_runners_kill_bound():
    """A witness that gives up before the runner's own bound reddens a runner
    that is waiting, as designed, on a slow teardown."""
    src = (REPO_ROOT / "scripts" / "browser_runner.mjs").read_text(encoding="utf-8-sig")
    bound_ms = int(re.search(r"export const KILL_WAIT_BOUND_MS = (\d+);", src)[1])
    assert STOP_S * 1000 > bound_ms + 30_000

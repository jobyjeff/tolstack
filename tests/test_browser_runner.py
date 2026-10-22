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
#: How long the runner gets to start Chrome, and to finish once told to stop.
START_S = 60
STOP_S = 30


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
    sys.exit(subprocess.call(argv, env={**os.environ, "DISPATCH_SLOT_HELD": "browser"}))
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
""")


def _inner_pytest(tmp_path: Path, *select: str) -> int:
    """How many times a pytest selecting ``select`` took the (stand-in) slot."""
    log = tmp_path / "slot.log"
    fake = tmp_path / "fake_slot.py"
    fake.write_text(FAKE_SLOT, encoding="utf-8")
    (tmp_path / "conftest.py").write_text(
        CONFTEST.format(fake=str(fake), log=str(log)), encoding="utf-8")
    (tmp_path / "test_inner.py").write_text(TESTS, encoding="utf-8")
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


def _end_a_runner(how: str) -> dict:
    """Starts the witness runner, ends it ``how``, and says what its Chrome did."""
    node = shutil.which("node")
    assert node, "node is not on PATH, so no runner was started -- not a pass"
    proc = subprocess.Popen(
        [node, str(WITNESS), how], cwd=str(REPO_ROOT),
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="replace",
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
        top_code = _exit_code(k32, handles[top])
        deadline = time.monotonic() + SETTLE_S
        for h in handles.values():
            k32.WaitForSingleObject(h, max(0, int((deadline - time.monotonic()) * 1000)))
        return {"profile": profile, "top": top, "alive_at_exit": at_exit,
                "top_code": top_code, "node_code": proc.returncode,
                "survivors": _with_profile(profile), "stderr": proc.stderr.read()}
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
    # Ctrl-Break: the helper's signal handler closes the browser, then exits.
    ("signal", True),
    # A throw inside the runner's try: its `finally` closes the browser.
    ("throw", True),
    # process.exit() with the browser open skips every `finally`: the helper's
    # exit handler is all that is left, and it kills the tree.
    ("exit", False),
])
def test_a_runner_that_ends_leaves_no_chrome(browser_slot, how, graceful):
    seen = _end_a_runner(how)
    assert not seen["alive_at_exit"], (
        f"ended by {how}: Chrome {seen['alive_at_exit']} (profile {seen['profile']}) "
        f"was still running when its node exited -- nothing in the runner closed it, "
        f"and only the DevTools pipe closing would have\n{seen['stderr']}")
    assert not seen["survivors"], (
        f"ended by {how}: Chrome {seen['survivors']} still running {SETTLE_S:g} s "
        f"later\n{seen['stderr']}")
    if graceful:
        assert seen["top_code"] == 0, (
            f"ended by {how}: Chrome {seen['top']} exited {seen['top_code']}, so it was "
            "killed by the exit handler rather than closed -- the close this path "
            f"owns did not happen\n{seen['stderr']}")

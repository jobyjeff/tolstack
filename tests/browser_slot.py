"""The machine's browser slot, for a pytest run: taken when a browser test needs it.

A test that starts a Chrome asks for the ``browser_slot`` fixture
(``tests/conftest.py`` makes it visible everywhere under ``tests/``). The first
such test to be set up takes dispatch's browser slot, and the session holds it
until it ends; every browser test after that runs at once. A run that selects no
browser test never asks, so it never queues -- wrapping the whole ``pytest``
command instead would hold the one slot through minutes of tests that start no
browser (handoff browser_runners_take_the_slot_and_free_the_box).

HOW IT HOLDS IT. ``dispatch slot run --class browser -- <argv>`` is the only
public way in (dispatch/dispatch/slot.py), and it runs a command rather than
handing out a lock: it waits, runs ``argv`` under the slot, and releases the slot
when ``argv`` exits. So the command it runs here is a holder -- this interpreter
waiting on its stdin -- and the fixture ends it by closing that pipe. Importing
``dispatch.slot`` in-process was the other option and is worse: it needs
dispatch's own venv on this one's path, and its lock-taking helpers are private.

While it is held, ``DISPATCH_SLOT_HELD=browser`` is set in this process's
environment, which is what dispatch itself hands a child: any browser runner a
test starts (``scripts/browser_runner.mjs``) sees it and runs nested instead of
queueing behind its own session.
"""
from __future__ import annotations

import contextlib
import os
import subprocess
import sys
import warnings
from pathlib import Path

import pytest

DISPATCH_PYTHON = "C:/workspace/dispatch/.venv/Scripts/python.exe"
HELD_ENV = "DISPATCH_SLOT_HELD"
SLOT_CLASS = "browser"
#: Everything before the command dispatch runs under the slot.
SLOT_RUN = [DISPATCH_PYTHON, "-m", "dispatch.cli", "slot", "run", "--class", SLOT_CLASS, "--"]
#: What runs under it: says so on stdout, then waits for stdin to close.
HOLDER = "import sys; print('held', flush=True); sys.stdin.read()"
#: The holder's one line, once it is running under the slot.
HELD_LINE = "held"


def slot_held(env=os.environ) -> bool:
    """True when an ancestor already holds the browser slot for this process."""
    return SLOT_CLASS in str(env.get(HELD_ENV, "")).replace(",", " ").split()


@contextlib.contextmanager
def holding_the_browser_slot():
    """Holds the machine's browser slot for the ``with`` block (at once if held)."""
    if slot_held():
        yield
        return
    if not Path(SLOT_RUN[0]).exists():
        warnings.warn(f"no dispatch at {SLOT_RUN[0]}; browser tests run unqueued")
        yield
        return
    # stderr is left alone: dispatch's "waiting for browser slot held by ..." line
    # is the one thing a person watching a stalled run needs to see.
    holder = subprocess.Popen(
        [*SLOT_RUN, sys.executable, "-c", HOLDER],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
    line = holder.stdout.readline().strip()
    if line != HELD_LINE:
        holder.stdin.close()
        code = holder.wait()
        pytest.fail(f"could not take the browser slot: dispatch exited {code} "
                    f"(75 is --max-wait running out) and printed {line!r}")
    before = os.environ.get(HELD_ENV)
    os.environ[HELD_ENV] = SLOT_CLASS
    try:
        yield
    finally:
        if before is None:
            os.environ.pop(HELD_ENV, None)
        else:
            os.environ[HELD_ENV] = before
        holder.stdin.close()
        holder.wait(timeout=60)


@pytest.fixture(scope="session")
def browser_slot():
    """Holds the machine's browser slot from first use to the end of the session."""
    with holding_the_browser_slot():
        yield

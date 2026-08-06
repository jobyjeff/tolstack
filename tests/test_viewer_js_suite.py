"""Run the viewer's JS fast tier from pytest, so `pytest -q` is the whole suite.

The viewer is build-free classic scripts (forge CONVENTIONS.md §7): its fast
tier is node running the same files a browser loads, under a DOM shim. Wiring it
in here means one command covers Python and JS, and a JS regression cannot hide
behind "nobody ran the other runner".

Skipped, not failed, when node is absent or when the projection has not been
built -- neither is a defect in the code under test, and a red suite that means
"you are in a worktree" trains people to ignore red suites. The projection's own
correctness is pinned by ``test_viewer_projection.py``, which needs no node.

The TRUTH tier (a real Chrome over file:// and http, via playwright-core) is
deliberately NOT run from pytest: it needs `npm install` first, and forge's
convention keeps it a separate, explicit command --

    node scripts\\run_viewer_browser_tests.mjs

Handoff: stack_viewer_v0 (2026-08-05).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "apps" / "viewer" / "run_tests.cjs"


def test_viewer_js_suite_is_green():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH; run `node apps/viewer/run_tests.cjs` by hand")

    proc = subprocess.run(
        [node, str(RUNNER)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )
    assert proc.returncode == 0, (
        "the viewer's JS suite failed:\n" + proc.stdout + proc.stderr
    )
    # The node-fs tier reports itself skipped from a worktree (data/ lives only
    # in the main checkout). Say so out loud rather than quietly passing a
    # thinner suite than the name promises.
    if "SKIP  node-fs tier" in proc.stdout:
        pytest.skip(
            "fixture tier green, but the node-fs tier had no projection to read "
            "(you are probably in a worktree; run "
            "`node apps/viewer/run_tests.cjs --repo C:\\workspace\\tolstack`)"
        )

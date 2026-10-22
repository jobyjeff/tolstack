"""Run the annotator's node suite from pytest, so `pytest -q` covers it too.

`apps/annotate/run_tests.cjs` held 205 checks that nothing ran: no gate, no
`package.json` script, no mention in CLAUDE.md -- green only for as long as
somebody typed the command
(ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate). This is the viewer's
wrapper (``test_viewer_js_suite.py``) one app over, and it answers the same
question the same way: **a tier that cannot run is not a tier that passed.**
Node absent is a failure, not a skip, and so is a ``SKIP`` line from the runner
-- both for the reason ``test_viewer_js_suite.py`` gives at length.

One difference is the runner's, not this wrapper's. The viewer's runner reads
``data/`` from the checkout it runs in and needs ``--repo`` from a worktree, so
it reports SKIP there and the wrapper is red. The annotator's `[real]` checks
resolve their inputs themselves -- repo-relative first, then the main checkout
-- so from a worktree they read the main checkout's data and report no SKIP.
The rule applied here is identical; what differs is whether the runner reaches
the rule.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from tests.test_viewer_js_suite import _main_checkout, _skipped_tiers

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "apps" / "annotate" / "run_tests.cjs"


def test_annotate_js_suite_is_green():
    node = shutil.which("node")
    assert node, (
        "node is not on PATH, so the annotator's JS tier did not run -- which "
        "is not the same as passing. Install node, or run "
        "`node apps/annotate/run_tests.cjs` wherever it is available."
    )

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
        "the annotator's JS suite failed:\n" + proc.stdout + proc.stderr
    )

    skipped = _skipped_tiers(proc.stdout)
    assert not skipped, (
        "the annotator's JS suite reported "
        + f"{len(skipped)} tier(s) SKIPPED, so it did not run in full:\n  "
        + "\n  ".join(skipped)
        + "\n\nThe [real] checks read gitignored data/ (projections, published "
        + "sweep runs), which lives only in the main checkout, "
        + str(_main_checkout())
        + ". Build it there, or run the suite in that checkout:\n\n"
        + "    node apps/annotate/run_tests.cjs\n\n"
        + "It is a failure rather than a skip for the reason the viewer's "
        + "wrapper gives: a skipped tier read as a green suite once already."
    )

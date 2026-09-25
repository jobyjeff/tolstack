"""Run the viewer's JS fast tier from pytest, so `pytest -q` is the whole suite.

The viewer is build-free classic scripts (forge CONVENTIONS.md §7): its fast
tier is node running the same files a browser loads, under a DOM shim. Wiring it
in here means one command covers Python and JS, and a JS regression cannot hide
behind "nobody ran the other runner".

**A TIER THAT CANNOT RUN IS NOT A TIER THAT PASSED.** This module skipped, and
said so one line above the total, until 2026-09-18. On that day a batch merge
was tested in a throwaway candidate worktree, which has no ``data/`` (gitignored,
main-checkout only), so the runner's node-fs tier -- the ``[real]`` tier, 86 of
455 checks -- reported itself skipped, the runner exited 0, this module turned
that into one ``skipped``, and the merge went to trunk reading
``1203 passed, 1 skipped``. Two ``[real]`` assertions were red the whole time
(ISSUE_20260918_real_tier_red_on_trunk_after_the_batch_merge_and_projection_rebuild).

So a skipped tier is a FAILURE here now, and the distinction lands in pytest's
own summary line (``1 failed, N passed``) rather than in a ``SKIPPED`` line a
``| tail -4`` reads straight past. The cost is real and is the point: from a
worktree this test is red until you run the JS tier against the checkout that
holds the projection, and the message below names that command. Red because the
suite could not be run is a different fact from green, and only one of them may
be mistaken for the other.

**AND A STALE TIER IS THE SAME DEFECT WEARING A GREEN** (2026-09-24). The
``[real]`` checks compare a checkout's ``fixtures.js`` and views against
``data/projections/viewer/``, which is gitignored, shared by every worktree and
rebuilt by hand -- so the two can be from different trees, and when they are the
comparison agrees with itself. The batch merge of 2026-09-24 ran the tier at
514/514 against a projection built before the merge and got 513/514 out of the
same code once it was rebuilt, after the merge was on trunk
(ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_projection_is_rebuilt).
The runner now pairs each projection's provenance stamp against the tree under
test before the tier is trusted, so that case arrives here as a non-zero exit
whose stdout names the file, the commit and the rebuild -- caught by the
``returncode`` assertion below rather than by the skip one, and carried into the
message by the same ``proc.stdout``.

The projection's own correctness is pinned by ``test_viewer_projection.py``,
which needs no node.

The TRUTH tier (a real Chrome over file:// and http, via playwright-core) is
deliberately NOT run from pytest: it needs `npm install` first, and forge's
convention keeps it a separate, explicit command --

    node scripts\\run_viewer_browser_tests.mjs

Handoff: stack_viewer_v0 (2026-08-05); skip-is-a-failure added by
real_tier_red_and_the_skipping_tier (2026-09-18).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "apps" / "viewer" / "run_tests.cjs"

# The runner prints `SKIP  <tier>` and then the reason, indented, on the next
# line -- two spaces after the verb, matching its PASS/FAIL lines.
SKIP_PREFIX = "SKIP  "


def _skipped_tiers(stdout: str) -> list[str]:
    """Every tier the runner reported as skipped, with the reason it gave."""
    lines = stdout.splitlines()
    found = []
    for at, line in enumerate(lines):
        if not line.startswith(SKIP_PREFIX):
            continue
        reason = lines[at + 1].strip() if at + 1 < len(lines) else "(no reason given)"
        found.append(f"{line[len(SKIP_PREFIX):].strip()} -- {reason}")
    return found


def _main_checkout() -> Path:
    """The checkout that owns ``data/``.

    A worktree's ``.git`` is a file pointing into the main checkout's git dir,
    and ``--git-common-dir`` resolves to that dir wherever it is run -- so this
    names the one place the shared projection lives without hardcoding a path.
    Only ever used to write a REMEDY into a failure message: which projection a
    run reads is a decision with consequences (the runner calls ``--repo`` its
    "worktree escape hatch" and warns that it is a seam), so this module
    reports it and does not take it.
    """
    try:
        common = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=30,
        )
    except OSError:
        return REPO_ROOT
    if common.returncode != 0 or not common.stdout.strip():
        return REPO_ROOT
    return Path(common.stdout.strip()).parent


def test_viewer_js_suite_is_green():
    node = shutil.which("node")
    assert node, (
        "node is not on PATH, so the viewer's JS tier did not run -- which is "
        "not the same as passing. Install node, or run "
        "`node apps/viewer/run_tests.cjs` wherever it is available."
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
        "the viewer's JS suite failed:\n" + proc.stdout + proc.stderr
    )

    skipped = _skipped_tiers(proc.stdout)
    assert not skipped, (
        "the viewer's JS suite reported "
        + f"{len(skipped)} tier(s) SKIPPED, so it did not run in full:\n  "
        + "\n  ".join(skipped)
        + "\n\nThis is almost always a worktree: data/ is gitignored and lives "
        + "only in the main checkout, so the [real] tier has no projection to "
        + "read and silently drops ~86 checks. Run the tier against the "
        + "checkout that has one:\n\n    node apps/viewer/run_tests.cjs --repo "
        + str(_main_checkout())
        + "\n\nIt is a failure rather than a skip because a batch merge read "
        + "exactly this skip as a green suite on 2026-09-18 and put two red "
        + "[real] assertions on trunk."
    )

"""``scripts/rebuild_projections.ps1`` -- the kill-a-leg test.

The handoff's definition of done is explicit: with drawing-checker's
interpreter path made unreachable (a test seam, not a real rename), the
script must exit non-zero and name what's missing, and it must do so
**before** building anything -- a rebuild that quietly skips crops and
leaves crops.json stale is the exact failure this script exists to prevent
(``docs/sessions/lessons/LESSONS_20260908_projections_rebuild_script.md``).

This drives the real script with real ``powershell.exe`` rather than parsing
it, the same "the script, not the predicate" rule
``tests/test_projection_provenance.py`` uses for the provenance gate. ``
-RepoRoot`` is pinned at the MAIN checkout so the *first* preflight check
(tolstack's own interpreter) passes and the failure exercised is specifically
the drawing-checker leg, not an artifact of running from a worktree copy of
this script (which has no ``venv-win`` of its own and would fail the first
check instead).

Handoff: projections_rebuild_script (2026-09-08).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = REPO_ROOT / "scripts" / "rebuild_projections.ps1"
MAIN_CHECKOUT = Path(r"C:\workspace\tolstack")

pytestmark = pytest.mark.skipif(
    shutil.which("powershell") is None, reason="powershell is not on PATH"
)


def run_script(*extra_args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(SCRIPT),
            "-RepoRoot",
            str(MAIN_CHECKOUT),
            *extra_args,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


@pytest.mark.skipif(
    not (MAIN_CHECKOUT / "venv-win" / "Scripts" / "python.exe").exists(),
    reason="the main checkout's venv-win is not present on this machine",
)
def test_a_missing_drawing_checker_interpreter_is_refused_and_named():
    bogus = MAIN_CHECKOUT / "venv-win" / "Scripts" / "does_not_exist.exe"
    assert not bogus.exists()
    proc = run_script("-DrawingCheckerPython", str(bogus))
    combined = proc.stdout + proc.stderr
    assert proc.returncode != 0
    assert str(bogus) in combined
    # It refused before building anything -- neither topology projection step
    # (the first real step, run before the crops leg) printed its header.
    assert "topology projection" not in combined


def test_the_script_itself_declares_no_cmdletbinding():
    """Regression pin for the bug this script was authored around.

    ``[CmdletBinding()]`` makes Windows PowerShell 5.1 evaluate a parameter
    default expression referencing ``$PSScriptRoot`` before the automatic
    variable is populated, so ``-RepoRoot``'s default silently binds to ``""``
    instead of the script's own directory. Discovered empirically while
    writing this script (no public doc found describing it); this test is
    the guard against a future edit re-adding the attribute.
    """
    lines = SCRIPT.read_text(encoding="utf-8").splitlines()
    assert not any(line.strip() == "[CmdletBinding()]" for line in lines)

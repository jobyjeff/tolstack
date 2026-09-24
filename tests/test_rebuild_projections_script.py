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

import re
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
    # It refused before building anything, and "anything" includes the two
    # steps that need neither drawing-checker nor PyMuPDF: the vocabulary
    # generation (step 0, which writes a TRACKED file) and the topology
    # projection. A preflight that lets the cheap steps through first is a
    # preflight that leaves the tree half-rebuilt when it refuses.
    assert "js vocabulary" not in combined
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


def test_the_js_vocabulary_is_regenerated_on_this_rail_and_first():
    """Step 0, and its order, read out of the script rather than from prose.

    ``apps/viewer/vocab.gen.js`` is the other thing Python derives for the
    viewer, and it is on this rail rather than a second one for the reason the
    script's own ``.DESCRIPTION`` gives: a second rail for one command is how
    two rails come to disagree about which tree they were run against.

    Its order is load-bearing in one direction only: it is cheap, it reads
    nothing under ``data/``, and it writes a tracked file -- so a run that stops
    at the crops leg has still left the vocabulary correct. Running it after a
    projection would throw that away for nothing.

    Read as a step invocation, not as a mention: the script names the file in
    its docstring too, and a scan that matched prose would pass on a rail that
    only *talks* about the generator. Driving the real script is not an option
    here the way it is for the kill-a-leg test above -- a successful run would
    rebuild the main checkout's projections as a side effect of a test.
    """
    text = SCRIPT.read_text(encoding="utf-8")
    steps = re.findall(r'Invoke-Step -Name "([^"]+)" -Exe (\$\w+) -Arguments @\(\s*'
                       r'\(Join-Path \$ScriptsDir "([^"]+)"\)', text)
    assert steps, "no Invoke-Step calls found -- this reader has drifted"
    names = [name for name, _, _ in steps]
    scripts = {name: script for name, _, script in steps}
    interpreters = {name: exe for name, exe, _ in steps}

    assert names[0] == "js vocabulary", (
        f"the vocabulary generation must be the first step; the rail runs {names}"
    )
    assert scripts["js vocabulary"] == "generate_js_vocabulary.py"
    # tolstack's own interpreter, not drawing-checker's: the generator is
    # stdlib-only and must not acquire a dependency on the venv that exists for
    # PyMuPDF.
    assert interpreters["js vocabulary"] == "$TolstackPython"

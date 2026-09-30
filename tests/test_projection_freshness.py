"""``scripts/projection_freshness.cjs``, driven against synthetic trees.

**Why a synthetic tree and not this one.** The check answers "was the projection
this tier is about to read built from this tree?", and the interesting answers
are all *negative* -- an untracked file in a globbed input directory, a stamp
that says the builder's tree was dirty, an edit to a module the builder imports.
Producing any of those in this checkout means dirtying it, and producing them in
``data/projections/viewer/`` means overwriting the artifact **every live worktree
shares**. So each test below builds a four-file git repo in ``tmp_path``, writes
a provenance stamp into it by hand, and asks the real check about it. The cost is
that the fixture is a model of this repo rather than this repo; the model's one
load-bearing property -- that the builder's import closure is walked out of the
tree rather than listed -- is asserted directly
(``test_the_input_set_is_the_stamp_plus_the_builders_import_closure``).

**What each test here is a witness for.** The check bit and was believed to
subsume more than it measured: its comment, its lesson and its issue all said the
one question "are the inputs it was built from still what is on disk here?"
covered "a stale projection, a newer one, a divergent branch and an uncommitted
edit", while ``git diff <sha> -- <paths>`` answers only *do the TRACKED files at
`<sha>` still have the same content in the work tree?*
(``ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only``,
three arms, each of which reported **fresh** while the tier ran ~93 ``[real]``
comparisons against a projection that did not describe the tree). Every arm has a
test below, and each is paired with its **quiet** twin -- a gitignored file, an
edit to a module nothing imports -- because the constraint on widening this check
is not coverage but direction: an alarm that is always on is the failure
``scripts/projection_provenance.py`` already wrote down.

The mutation shadow's coupling gets the last test, and it is the one that is not
about a synthetic tree: the check runs under
``scripts/run_mutation_witness_tests.mjs`` with ``--work-tree=<shadow>``, and a
path the input set names that the shadow does not hold reads as a *deletion* --
red on the clean run, with every ``fast`` witness then reporting
``TIER_ALREADY_RED`` for a reason absent from its own output.

Handoff: ``projection_freshness_pairs_with_the_tree`` (2026-09-30).
"""

from __future__ import annotations

import io
import json
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
CHECK = REPO_ROOT / "scripts" / "projection_freshness.cjs"
WITNESS_RUNNER = REPO_ROOT / "scripts" / "run_mutation_witness_tests.mjs"

#: The builder the synthetic stamp names, and the two repo-local modules it
#: imports. Written in the FIXTURE, which is the one place a module list is
#: legitimate: these files are the model tree's contents, not a claim about this
#: repo's.
BUILDER = "scripts/build_viewer_projection.py"

TREE = {
    # Only the patterns the fence needs. The real .gitignore is 80 lines; what
    # matters to this check is that `--exclude-standard` has something to read.
    ".gitignore": "__pycache__/\n*.pyc\ndata/\n",
    "docs/tolerance_stacks/stack_a.json": '{"schema": "stack/v0"}\n',
    # The import forms the real builders use, including the parenthesised one
    # that the closure walker has to follow past its opening paren.
    BUILDER: (
        "import sys\n"
        "import projection_provenance as prov\n"
        "from tolerance_stack.stack import (\n"
        "    fold,\n"
        "    Term,\n"
        ")\n"
    ),
    "scripts/projection_provenance.py": 'SCHEMA = "provenance/v0"\n',
    # Present, committed, and imported by nothing -- the quiet twin for the
    # import-closure arm.
    "scripts/unrelated.py": "VALUE = 1\n",
    "tolerance_stack/__init__.py": "from tolerance_stack.stack import fold\n",
    "tolerance_stack/stack.py": "def fold():\n    return 0\n\n\nTerm = tuple\n",
}


def _node() -> str:
    node = shutil.which("node")
    if not node:
        pytest.fail(
            "node is not on PATH, so scripts/projection_freshness.cjs was never "
            "run -- which is not the same as passing. node is already a hard "
            "requirement of tests/test_viewer_js_suite.py."
        )
    return node


def _git(cwd: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )
    assert proc.returncode == 0, f"git {' '.join(args)} failed:\n{proc.stderr}"
    return proc.stdout.strip()


def _write(root: Path, rel: str, text: str) -> Path:
    full = root / rel
    full.parent.mkdir(parents=True, exist_ok=True)
    # LF, explicitly: the fixture's content must not depend on the checkout's
    # autocrlf setting, and a stray CRLF here would show up as content drift.
    with io.open(full, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)
    return full


def _stamp(root: Path, head_sha: str, **overrides: object) -> dict:
    """A provenance stamp of the shape ``projection_provenance.stamp`` writes."""
    posix = root.resolve().as_posix()
    block = {
        "schema": "joby.tolerance_stack/projection_provenance/v0",
        "built_at": "2026-09-30T00:00:00+00:00",
        "built_by": BUILDER,
        "repo_root": posix,
        "stacks_dir": posix + "/docs/tolerance_stacks",
        "branch": "handoff/synthetic",
        "head_sha": head_sha,
        "dirty": False,
        "trunk": "master",
        "trunk_sha": head_sha,
        "behind_trunk": 0,
    }
    block.update(overrides)
    return block


def _project(root: Path, stamp: dict) -> None:
    """Write ``data/projections/viewer/results.json`` carrying ``stamp``."""
    _write(
        root,
        "data/projections/viewer/results.json",
        json.dumps({"stacks": [], "provenance": stamp}, indent=1) + "\n",
    )


@pytest.fixture()
def tree(tmp_path: Path) -> Path:
    """A committed synthetic repo with a projection stamped from its own HEAD."""
    root = tmp_path / "model"
    root.mkdir()
    for rel, text in TREE.items():
        _write(root, rel, text)
    _git(root, "init", "--quiet")
    _git(root, "config", "user.email", "agent@example.invalid")
    _git(root, "config", "user.name", "synthetic tree")
    _git(root, "add", "--all")
    _git(root, "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "the model tree")
    _project(root, _stamp(root, _git(root, "rev-parse", "HEAD")))
    return root


def _verdict(root: Path) -> dict:
    proc = subprocess.run(
        [_node(), str(CHECK), "--repo", str(root), "--tree", str(root), "--json"],
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    assert proc.stdout, f"the check printed nothing (stderr:\n{proc.stderr})"
    verdict = json.loads(proc.stdout)
    # The exit code and the verdict are one fact; a caller that reads only one
    # of them must not be able to disagree with a caller that reads the other.
    assert (proc.returncode == 0) is bool(verdict["fresh"]), (
        f"exit {proc.returncode} against fresh={verdict['fresh']!r}"
    )
    return verdict


def _inputs(root: Path) -> list[str]:
    proc = subprocess.run(
        [_node(), str(CHECK), "--repo", str(root), "--tree", str(root), "--inputs"],
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


# --------------------------------------------------------------------------- #
# the clean tree, and what the input set is derived from                      #
# --------------------------------------------------------------------------- #

def test_a_projection_built_from_this_tree_is_paired(tree: Path) -> None:
    verdict = _verdict(tree)
    assert verdict["fresh"], verdict["why"]
    assert verdict["paired"] == [
        "results.json @ " + _git(tree, "rev-parse", "HEAD")[:12]
    ]


def test_the_input_set_is_the_stamp_plus_the_builders_import_closure(tree: Path) -> None:
    # The stamp's source directory, the script it names, the two repo-local
    # modules that script imports -- one reached through a parenthesised
    # multi-line `from ... import (`, so the walker is not just reading the
    # single-line form -- and the PACKAGE directory rather than the one module
    # inside it that resolved. `scripts/unrelated.py` is committed and imported
    # by nothing, so it is not here; `sys` is not in the tree, so it is not
    # here either.
    assert _inputs(tree) == [
        "docs/tolerance_stacks",
        BUILDER,
        "scripts/projection_provenance.py",
        "tolerance_stack",
    ]


# --------------------------------------------------------------------------- #
# arm 1: an untracked file in a globbed input directory                       #
# --------------------------------------------------------------------------- #

def test_an_untracked_file_in_a_globbed_input_directory_is_drift(tree: Path) -> None:
    # Measured in the 2026-09-24 review against the real tree: dropping
    # `docs/tolerance_stacks/ZZZ_probe.json` in left the banner reading
    # "projection paired with this tree" and the total at 516/516. The builder
    # globs the directory (`stacks_dir.glob("stack_*.json")`), so this file is
    # an input the projection was built without.
    _write(tree, "docs/tolerance_stacks/stack_zzz_probe.json", '{"schema": "x"}\n')
    verdict = _verdict(tree)
    assert not verdict["fresh"], "an untracked input file read as paired"
    assert "untracked" in verdict["why"]
    assert "stack_zzz_probe.json" in verdict["why"]


def test_a_gitignored_file_in_an_input_directory_is_not_drift(tree: Path) -> None:
    # The fence. `dirty` counted untracked files once and lit the viewer's alarm
    # box on every build from the documented invocation, which is why this arm
    # is asked with `--exclude-standard` rather than by listing the directory.
    _write(tree, "docs/tolerance_stacks/__pycache__/cached.pyc", "not source\n")
    verdict = _verdict(tree)
    assert verdict["fresh"], verdict["why"]


# --------------------------------------------------------------------------- #
# arm 2: a stamp that says the tree that built it was dirty                   #
# --------------------------------------------------------------------------- #

def test_a_dirty_stamp_is_not_paired(tree: Path) -> None:
    # `projection_provenance.stamp` records `dirty` precisely because
    # "head_sha does not identify the code that ran"; the 2026-09-24 reader read
    # every other field of the stamp and not this one, so a projection built out
    # of uncommitted edits, read later from a clean tree at the same sha,
    # diffed empty and reported fresh.
    _project(tree, _stamp(tree, _git(tree, "rev-parse", "HEAD"), dirty=True))
    verdict = _verdict(tree)
    assert not verdict["fresh"], "a dirty-tree build read as paired"
    assert "dirty: true" in verdict["why"]


def test_a_dirty_field_of_null_is_not_by_itself_drift(tree: Path) -> None:
    # `null` is "git could not be asked", and it only ever arrives alongside a
    # `head_sha` of null -- which the unstamped arm already refuses. Treating it
    # as drift here would redden a stamp whose other half already answers.
    _project(tree, _stamp(tree, _git(tree, "rev-parse", "HEAD"), dirty=None))
    verdict = _verdict(tree)
    assert verdict["fresh"], verdict["why"]


# --------------------------------------------------------------------------- #
# arm 3: a module the builder imports, which no stamp names                   #
# --------------------------------------------------------------------------- #

def test_an_edit_to_a_module_the_builder_imports_is_drift(tree: Path) -> None:
    # The measured instance: `scripts/build_topology_projection.py` imports
    # `projection_provenance`, `build_viewer_projection` and
    # `build_viewer_crops`, and none of those is in any stamp. An edit to one
    # changes what a rebuild writes into `topologies.json` and used to leave it
    # reading fresh.
    _write(tree, "scripts/projection_provenance.py", 'SCHEMA = "provenance/v1"\n')
    verdict = _verdict(tree)
    assert not verdict["fresh"], "an edit to an imported module read as paired"
    assert "scripts/projection_provenance.py" in verdict["why"]


def test_an_edit_to_a_module_nothing_imports_is_not_drift(tree: Path) -> None:
    # The fence, again, and the reason the input set is an import closure rather
    # than `scripts/`: a tracked file in the same directory that no builder
    # reaches cannot change what a rebuild writes.
    _write(tree, "scripts/unrelated.py", "VALUE = 2\n")
    verdict = _verdict(tree)
    assert verdict["fresh"], verdict["why"]


def test_an_edit_to_a_tracked_input_file_is_drift(tree: Path) -> None:
    # The arm the check was written for in the first place, kept here so the
    # widening above cannot quietly cost it.
    _write(tree, "docs/tolerance_stacks/stack_a.json", '{"schema": "stack/v1"}\n')
    verdict = _verdict(tree)
    assert not verdict["fresh"], "an edited tracked input read as paired"
    assert "stack_a.json" in verdict["why"]


def test_an_input_absent_from_the_work_tree_names_the_shadow(tree: Path) -> None:
    # A partial work tree -- which is what the mutation shadow is. The message
    # has to say so, because the alternative is an unexplained "1 of its input
    # file(s) differ" naming a file the reader can see is simply not there.
    #
    # The path removed here is one the STAMP names. A path the closure derives
    # cannot arrive at this arm -- the closure is walked in the work tree under
    # test, so removing `tolerance_stack/` removes it from the input set rather
    # than from the tree it names. That is a silent narrowing, not a false red,
    # and the thing that covers it is the preflight in the test below: it
    # computes the input set from the FULL checkout and holds it against
    # SHADOWED, so a derived input the shadow would not hold is refused before
    # any tier runs.
    shutil.rmtree(tree / "docs" / "tolerance_stacks")
    verdict = _verdict(tree)
    assert not verdict["fresh"]
    assert "not in this work tree at all" in verdict["why"]
    assert "SHADOWED" in verdict["why"]


# --------------------------------------------------------------------------- #
# the coupling: SHADOWED against the input set this tree actually produces    #
# --------------------------------------------------------------------------- #

def _main_checkout() -> Path:
    """The checkout that owns ``data/`` -- a worktree's projections live there.

    ``--git-common-dir`` resolves to the main checkout's git dir wherever it is
    run, so this names that one place without hardcoding a path (the same
    derivation ``tests/test_viewer_js_suite.py`` uses).
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


def test_the_mutation_shadow_covers_every_input_the_freshness_check_names() -> None:
    data_root = _main_checkout()
    proc = subprocess.run(
        [_node(), str(WITNESS_RUNNER),
         "--check-shadow-covers-projection-inputs", "--repo", str(data_root)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )
    assert proc.returncode == 0, (
        "the mutation shadow would not hold every path the viewer tier's "
        "freshness check names, so that tier would be red on its CLEAN run and "
        "every `fast` witness would report TIER_ALREADY_RED:\n"
        + proc.stdout + proc.stderr
    )
    stamped = (data_root / "data" / "projections" / "viewer" / "results.json").exists()
    if stamped:
        assert "SHADOWED covers all" in proc.stdout, proc.stdout
    else:
        # Said out loud rather than passed over: with no projection under
        # `data_root` the input set is empty and this test asserted nothing
        # about SHADOWED. It is not a failure -- `data/` is gitignored by design
        # -- but it is not coverage either.
        assert "no stamped projection" in proc.stdout, proc.stdout

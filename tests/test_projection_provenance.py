"""Tests for the projection provenance stamp and the rebuild gate.

``scripts/projection_provenance.py`` exists because ``data/projections/viewer/``
is one directory shared by every live worktree
(``docs/issues/ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md``).
Two claims are defended, and they are different claims:

1. **The stamp says which tree.** Branch, HEAD sha, and the ``--stacks-dir``
   resolved absolute, in both projection files. The absolute part is not
   decoration: ``results.json`` recorded ``stacks_dir`` as ``docs/tolerance_stacks``
   from the day it was written, which is the same string in every worktree that
   has ever existed and therefore identifies nothing.

2. **The script refuses.** Not the predicate -- the script. A gate whose
   predicate is right and whose caller warns and carries on is occurrence 1
   again, so :func:`test_the_script_refuses_a_rebuild_from_a_non_ancestor_tree`
   drives ``build_viewer_projection.main()`` and asserts both the exit code and
   that the file on disk was left alone.

The ancestry cases run against a **throwaway git repo** built in ``tmp_path``,
so "not an ancestor" is a real pair of commits and not a mocked predicate.

Handoff: viewer_projection_provenance (2026-08-10).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_viewer_crops as bvc  # noqa: E402
import build_viewer_projection as bvp  # noqa: E402
import projection_provenance as prov  # noqa: E402

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"

pytestmark = pytest.mark.skipif(
    shutil.which("git") is None, reason="git is not on PATH"
)


# ---------------------------------------------------------------------------
# a throwaway repo with a real fork in it
# ---------------------------------------------------------------------------


def run_git(cwd: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    assert proc.returncode == 0, f"git {' '.join(args)}: {proc.stderr}"
    return proc.stdout.strip()


def commit(repo: Path, text: str) -> str:
    (repo / "file.txt").write_text(text, encoding="utf-8")
    run_git(repo, "add", "-A")
    run_git(repo, "commit", "-q", "-m", text)
    return run_git(repo, "rev-parse", "HEAD")


@pytest.fixture(scope="module")
def forked_repo(tmp_path_factory):
    """A repo whose HEAD has an ancestor, a descendant-of-nothing sibling, and a self.

    ``(repo, base_sha, head_sha, sibling_sha)``: ``base`` is an ancestor of
    ``head``; ``sibling`` forks off ``base`` and so is **not** an ancestor of
    ``head``, which is precisely the two-live-worktrees situation.
    """
    repo = tmp_path_factory.mktemp("forked_repo")
    run_git(repo, "init", "-q")
    run_git(repo, "config", "user.email", "test@example.invalid")
    run_git(repo, "config", "user.name", "provenance test")
    base = commit(repo, "base")
    head = commit(repo, "head")
    run_git(repo, "checkout", "-q", "-b", "sibling", base)
    sibling = commit(repo, "sibling")
    run_git(repo, "checkout", "-q", "-")
    assert run_git(repo, "rev-parse", "HEAD") == head
    return repo, base, head, sibling


def write_stamped(path: Path, **overrides) -> Path:
    """A projection file carrying nothing but a provenance stamp."""
    block = {
        "schema": prov.SCHEMA_PROVENANCE,
        "built_at": "2026-08-06T22:26:00+00:00",
        "built_by": "scripts/build_viewer_projection.py",
        "repo_root": "C:/workspace/tolstack-worktrees/somebody_else",
        "stacks_dir": "C:/workspace/tolstack-worktrees/somebody_else/docs/tolerance_stacks",
        "branch": "handoff/somebody_else",
        "head_sha": None,
        "dirty": False,
    }
    block.update(overrides)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"schema": "x", "provenance": block}), encoding="utf-8")
    return path


def guard(out_path, repo, sha, allow_older=False):
    return prov.guard(
        out_path,
        {"head_sha": sha, "branch": "handoff/mine", "built_at": "2026-08-07T00:24:00+00:00"},
        repo,
        allow_older,
        "python scripts\\build_viewer_projection.py",
    )


# --- the stamp -------------------------------------------------------------


def test_the_stamp_names_this_tree_not_the_data_root():
    """branch + HEAD sha + an ABSOLUTE stacks-dir, all of the script's own repo."""
    stamp = prov.stamp(REPO_ROOT, STACKS_DIR, "scripts/build_viewer_projection.py")
    assert stamp["schema"] == prov.SCHEMA_PROVENANCE
    assert len(stamp["head_sha"]) == 40
    assert stamp["branch"]
    assert stamp["built_at"].endswith("+00:00")
    # The point of the whole exercise: a path that identifies THIS worktree.
    assert Path(stamp["stacks_dir"]).is_absolute()
    assert stamp["stacks_dir"] == STACKS_DIR.resolve().as_posix()
    assert stamp["repo_root"] == REPO_ROOT.resolve().as_posix()
    assert stamp["dirty"] in (True, False)


def test_an_untracked_file_alone_does_not_make_a_tree_dirty(tmp_path):
    """``dirty`` is about tracked content, and the distinction is not academic.

    The MAIN checkout permanently carries an untracked ``.dispatch.toml``, so a
    ``dirty`` that counted untracked files was ``true`` on **every** build from
    the documented canonical invocation -- two standing alarms in the viewer's
    banner on a tree where nothing was wrong. Added in
    ``review/viewer_projection_provenance``; both directions are pinned, because
    the fix must not have turned the flag off altogether.
    """
    repo = tmp_path / "repo"
    repo.mkdir()
    run_git(repo, "init", "-q")
    run_git(repo, "config", "user.email", "test@example.invalid")
    run_git(repo, "config", "user.name", "provenance test")
    commit(repo, "committed")

    (repo / ".dispatch.toml").write_text("untracked, and always there\n", encoding="utf-8")
    assert prov.stamp(repo, repo, "x")["dirty"] is False

    # ...and a real edit to a tracked file still is dirty, which is the point.
    (repo / "file.txt").write_text("edited, not committed\n", encoding="utf-8")
    assert prov.stamp(repo, repo, "x")["dirty"] is True


def test_the_stamp_survives_a_directory_that_is_not_a_repo(tmp_path):
    """No git, no crash -- ``None`` is an honest answer and the gate handles it."""
    stamp = prov.stamp(tmp_path, tmp_path, "scripts/build_viewer_projection.py")
    assert stamp["head_sha"] is None
    assert stamp["branch"] is None
    assert stamp["built_at"]
    assert stamp["stacks_dir"] == tmp_path.resolve().as_posix()


def test_the_results_projection_carries_the_four_facts():
    projection = bvp.build(STACKS_DIR, STACKS_DIR / "hardware_entries.json")
    block = projection["provenance"]
    assert block["stacks_dir"] == STACKS_DIR.resolve().as_posix()
    assert len(block["head_sha"]) == 40
    assert block["branch"]
    # results.json's own top-level built_at is the same instant, not a second one.
    assert projection["built_at"] == block["built_at"]
    assert projection["built_by"] == bvp.BUILT_BY


def test_the_crop_index_carries_the_four_facts():
    """crops.json recorded no stacks-dir at all before this handoff."""
    stamp = prov.stamp(REPO_ROOT, STACKS_DIR, bvc.BUILT_BY)
    index = bvc.build_index(stamp, Path("C:/workspace/drawing-checker"), True,
                            {"citations": 0}, {}, [])
    block = index["provenance"]
    assert block["stacks_dir"] == STACKS_DIR.resolve().as_posix()
    assert len(block["head_sha"]) == 40
    assert block["branch"]
    assert index["built_at"] == block["built_at"]
    assert index["built_by"] == bvc.BUILT_BY
    # The two fields other consumers already read keep their names.
    assert index["crops_dir"] == "crops"
    assert index["drawing_checker_available"] is True


# --- the gate --------------------------------------------------------------


def test_nothing_there_is_not_a_conflict(tmp_path, forked_repo):
    repo, _base, head, _sibling = forked_repo
    assert guard(tmp_path / "results.json", repo, head) == []


def test_an_unstamped_file_is_overwritten_with_a_note(tmp_path, forked_repo):
    """A file from before this handoff. Nothing to compare -- proceed, and say so."""
    repo, _base, head, _sibling = forked_repo
    out = tmp_path / "results.json"
    out.write_text(json.dumps({"schema": "x", "built_at": "2026-08-06T22:26:00+00:00"}),
                   encoding="utf-8")
    notes = guard(out, repo, head)
    assert any("no provenance stamp" in note for note in notes)


def test_rebuilding_over_your_own_build_is_silent(tmp_path, forked_repo):
    repo, _base, head, _sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha=head)
    assert guard(out, repo, head) == []


def test_an_ancestor_build_is_overwritten_with_a_note(tmp_path, forked_repo):
    """The review-worktree tie-break: the newest tree is always allowed."""
    repo, base, head, _sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha=base)
    notes = guard(out, repo, head)
    assert any("already contains" in note for note in notes)


def test_a_sibling_branch_build_is_REFUSED(tmp_path, forked_repo):
    """Two live worktrees, forked from a common base. This is occurrence 1."""
    repo, _base, head, sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha=sibling,
                        branch="handoff/somebody_else")
    with pytest.raises(prov.RebuildRefused) as excinfo:
        guard(out, repo, head)
    message = str(excinfo.value)
    assert "REFUSED" in message
    assert "NOT an ancestor" in message
    # The refusal has to name the tree that wrote the file and say what to run --
    # a refusal a reader cannot act on just gets overridden.
    assert "handoff/somebody_else" in message
    assert sibling[:12] in message
    assert "C:/workspace/tolstack-worktrees/somebody_else" in message
    assert "--allow-older-tree" in message


def test_a_commit_this_repo_has_never_heard_of_is_REFUSED(tmp_path, forked_repo):
    """Fails closed: an unprovable ancestry is not an innocent one."""
    repo, _base, head, _sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha="0" * 40)
    with pytest.raises(prov.RebuildRefused, match="not in this repo at all"):
        guard(out, repo, head)


def test_allow_older_tree_overrides_loudly(tmp_path, forked_repo):
    repo, _base, head, sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha=sibling)
    notes = guard(out, repo, head, allow_older=True)
    assert any("OVERWRITING" in note for note in notes)


def test_an_unstamped_rebuilding_tree_cannot_check_but_says_so(tmp_path, forked_repo):
    """No git in the *rebuilding* tree: proceed, but never silently."""
    repo, _base, _head, sibling = forked_repo
    out = write_stamped(tmp_path / "results.json", head_sha=sibling)
    notes = guard(out, repo, None)
    assert any("ancestry not checked" in note for note in notes)


def test_behind_trunk_and_dirty_are_warned_about():
    lines = prov.note_lines({
        "branch": "handoff/x", "head_sha": "a" * 40, "built_at": "2026-08-07T00:24:00+00:00",
        "trunk": "master", "behind_trunk": 3, "dirty": True,
    })
    joined = "\n".join(lines)
    assert "3 commit(s) behind master" in joined
    assert "uncommitted changes" in joined


# --- the script, not the predicate -----------------------------------------


def dangling_commit(repo: Path) -> str:
    """A real commit in this repo that is **not** an ancestor of HEAD.

    ``commit-tree`` with no parent writes a loose object and touches no ref, no
    index and no working tree -- so the real repo is unchanged, but the sha is
    one ``git cat-file`` can find and ``merge-base --is-ancestor`` rejects.
    """
    tree = run_git(repo, "rev-parse", "HEAD^{tree}")
    return run_git(repo, "commit-tree", tree, "-m", "throwaway tree for a gate test")


def test_the_script_refuses_a_rebuild_from_a_non_ancestor_tree(tmp_path):
    """The definition of done: the SCRIPT refuses, and leaves the file alone."""
    data_root = tmp_path / "data"
    out_path = data_root / "projections" / "viewer" / "results.json"
    argv = ["--data-root", str(data_root), "--stacks-dir", str(STACKS_DIR)]

    assert bvp.main(argv) == 0
    assert out_path.exists()

    # Re-stamp what is on disk as the work of a tree this one does not contain,
    # exactly as a neighbouring worktree's build would have left it.
    projection = json.loads(out_path.read_text(encoding="utf-8"))
    projection["provenance"]["head_sha"] = dangling_commit(REPO_ROOT)
    projection["provenance"]["branch"] = "handoff/somebody_else"
    projection["marker"] = "written by the other worktree"
    out_path.write_text(json.dumps(projection), encoding="utf-8")
    before = out_path.read_bytes()

    assert bvp.main(argv) == 3
    # Refusing means not writing. A refusal that still overwrites is the bug.
    assert out_path.read_bytes() == before

    # ...and the override gets through, because a deliberate rebuild from an
    # older tree is a real thing that has to remain possible.
    assert bvp.main(argv + ["--allow-older-tree"]) == 0
    assert json.loads(out_path.read_text(encoding="utf-8")).get("marker") is None

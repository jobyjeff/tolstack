"""Which tree built this projection -- the stamp, and the gate that reads it.

``data/projections/viewer/`` is **one directory shared by every live worktree**.
``data/`` exists only in the main checkout, so every worktree's build script is
told to write there by absolute path, and both scripts wipe-and-rebuild their own
file in it. Whoever runs last wins, and "last" is whichever agent happens to
finish first (``docs/issues/ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md``,
three recorded occurrences). Two things are needed and this module holds both:

1. **A stamp** -- :func:`stamp` -- saying which tree produced the file: branch,
   HEAD sha, whether that tree was dirty, and the ``--stacks-dir`` **resolved
   absolute**. Resolved absolute is the whole point: ``results.json`` has always
   recorded ``stacks_dir`` as the repo-relative ``docs/tolerance_stacks``, which
   is the same six characters in every worktree in existence and therefore names
   no tree at all.

2. **A gate** -- :func:`guard` -- that **refuses** a rebuild when the file
   already there was built from a commit that is not an ancestor of this tree's
   HEAD. Refuses, not warns: in occurrence 1 *both* sessions rebuilt and the
   loser was whoever ran first, so a warning would have been printed to the
   winner and read by nobody.

Ancestry (``git merge-base --is-ancestor``) is the test because it encodes
exactly the tie-break that worked in occurrence 3: **a review worktree holds
master + the handoff, which is the newest tree in existence**, so its build can
never be an older one clobbering a newer. The newest tree is always allowed; an
older one is refused. That makes the convention machine-checked instead of
remembered.

What the gate deliberately does **not** do:

* It does not compare *content*. Two worktrees sitting on the same sha with
  different uncommitted edits both pass; ``dirty`` in the stamp is what tells a
  reader that happened, and there is nothing cheaper that would catch it.
* Each script gates **its own** file only (``build_viewer_projection.py`` on
  ``results.json``, ``build_viewer_crops.py`` on ``crops.json``). Gating on the
  neighbour's file would refuse the perfectly ordinary sequence "rebuild crops
  from the newest tree, then rebuild results from an older one on purpose" --
  and the pair-disagreement it would be trying to catch is a *reader's* problem,
  which the viewer's banner reports from these same two stamps.

Stdlib only, and it stays that way: ``build_viewer_crops.py`` runs under
drawing-checker's venv, not this repo's.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

SCHEMA_PROVENANCE = "joby.tolerance_stack/projection_provenance/v0"

#: The branch a projection is measured against. ``behind_trunk`` is recorded so
#: a reader (and the viewer, which cannot run git) can see that a projection was
#: built from a tree that predates commits already on trunk -- occurrence 2 in
#: one number.
TRUNK = "master"

#: The key both projection files carry the stamp under.
PROVENANCE_KEY = "provenance"


class RebuildRefused(Exception):
    """This tree may not overwrite the projection that is already there."""


# ---------------------------------------------------------------------------
# git, defensively
# ---------------------------------------------------------------------------


def git(repo_root: Path, *args: str) -> Optional[str]:
    """``git *args`` in ``repo_root``, stripped -- or ``None`` if it failed.

    ``None`` covers every "we cannot know" case with one value: git not on PATH,
    the directory not a repo, a ref that does not exist. None of those is an
    error here -- a stamp with ``branch: null`` is honest, and the gate treats an
    unknowable ancestry as "cannot prove this is safe" separately.
    """
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except (OSError, ValueError):
        return None
    return proc.stdout.strip() if proc.returncode == 0 else None


def git_ok(repo_root: Path, *args: str) -> bool:
    """Did ``git *args`` exit 0? For the predicate commands that answer by code."""
    try:
        proc = subprocess.run(
            ["git", *args], cwd=str(repo_root), capture_output=True, text=True
        )
    except (OSError, ValueError):
        return False
    return proc.returncode == 0


def short(sha: Optional[str]) -> str:
    return (sha or "?")[:12]


# ---------------------------------------------------------------------------
# the stamp
# ---------------------------------------------------------------------------


def stamp(repo_root: Path, stacks_dir: Path, built_by: str) -> Dict[str, Any]:
    """The provenance block to write into a projection file.

    ``repo_root`` is the **script's own** repo root, never ``--data-root``: the
    question this answers is which *tree* built the file, and the data root is
    the main checkout's for every worktree that ever writes here.
    """
    head = git(repo_root, "rev-parse", "HEAD")
    branch = git(repo_root, "rev-parse", "--abbrev-ref", "HEAD")
    status = git(repo_root, "status", "--porcelain")
    trunk_sha = git(repo_root, "rev-parse", "--verify", "--quiet", TRUNK)
    behind = None
    if trunk_sha:
        count = git(repo_root, "rev-list", "--count", f"HEAD..{TRUNK}")
        behind = int(count) if count and count.isdigit() else None
    return {
        "schema": SCHEMA_PROVENANCE,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "built_by": built_by,
        # Absolute, both of them. A relative path here would be the bug this
        # module exists to fix.
        "repo_root": Path(repo_root).resolve().as_posix(),
        "stacks_dir": Path(stacks_dir).resolve().as_posix(),
        "branch": branch,
        "head_sha": head,
        # The tree had uncommitted changes, so `head_sha` does not identify the
        # code that ran. The gate cannot see this (two dirty trees on one sha
        # look identical to it); a reader can.
        "dirty": bool(status) if status is not None else None,
        "trunk": TRUNK,
        "trunk_sha": trunk_sha,
        # Commits on trunk that this tree does not have, at build time. > 0 is
        # occurrence 2: a projection built from a tree that predates labels
        # already merged.
        "behind_trunk": behind,
    }


def recorded(path: Path) -> Optional[Dict[str, Any]]:
    """The provenance block of the projection already at ``path``.

    ``None`` for absent, unreadable, unparseable, or written by a script that
    predates this stamp. All four mean the same thing to the gate: there is
    nothing here to compare against.
    """
    if not path.exists():
        return None
    try:
        existing = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    block = existing.get(PROVENANCE_KEY) if isinstance(existing, dict) else None
    return block if isinstance(block, dict) else None


# ---------------------------------------------------------------------------
# the gate
# ---------------------------------------------------------------------------


def describe(block: Optional[Dict[str, Any]]) -> str:
    """``<branch> @ <sha12>`` for a stamp, for use in messages."""
    if not block:
        return "an unstamped tree"
    text = f"{block.get('branch') or '(detached)'} @ {short(block.get('head_sha'))}"
    if block.get("dirty"):
        text += " (dirty)"
    if block.get("built_at"):
        text += f", built {block['built_at']}"
    return text


def guard(
    out_path: Path,
    current: Dict[str, Any],
    repo_root: Path,
    allow_older: bool,
    rebuild_command: str,
) -> List[str]:
    """Refuse if the file at ``out_path`` came from a tree this one predates.

    Returns the notes to print when the rebuild is allowed; raises
    :class:`RebuildRefused` -- whose message names the tree that wrote the file
    and what to run instead -- when it is not.

    Allowed, with a note, when there is nothing to compare: no file, no stamp in
    it, or this tree has no git at all. Refused when the recorded commit is not
    an ancestor of HEAD, **and** when the recorded commit is not in this repo's
    object database at all -- an unknown commit is unprovable, not innocent, and
    this gate fails closed.
    """
    notes: List[str] = []
    previous = recorded(out_path)
    if previous is None:
        if out_path.exists():
            notes.append(
                f"{out_path.name} carries no provenance stamp (built before "
                f"provenance stamping, or hand-edited) -- overwriting it, "
                f"because there is nothing to compare against."
            )
        return notes

    theirs = previous.get("head_sha")
    ours = current.get("head_sha")
    if not theirs or not ours:
        notes.append(
            f"{out_path.name} was built by {describe(previous)}; ancestry not "
            f"checked because one of the two commits is unknown."
        )
        return notes

    if theirs == ours:
        return notes

    known = git_ok(repo_root, "cat-file", "-e", theirs + "^{commit}")
    ancestor = known and git_ok(repo_root, "merge-base", "--is-ancestor", theirs, ours)
    if ancestor:
        notes.append(
            f"{out_path.name} was built by {describe(previous)}, which this tree "
            f"already contains -- overwriting it with a newer build."
        )
        return notes

    why = (
        f"commit {short(theirs)} is not in this repo at all"
        if not known
        else f"commit {short(theirs)} is NOT an ancestor of this tree's HEAD"
    )
    if allow_older:
        # The override is loud on purpose. The legitimate case -- a deliberate
        # rebuild from an older tree -- is real, but it is also exactly what
        # occurrences 1 and 2 look like from the inside, so it leaves a line in
        # the log saying what was overwritten.
        notes.append(
            f"--allow-older-tree: OVERWRITING {out_path.name}, which was built "
            f"by {describe(previous)} ({why})."
        )
        return notes

    raise RebuildRefused(
        "\n".join(
            [
                f"REFUSED: {out_path} was built by {describe(previous)}",
                f"         and this tree is {describe(current)}.",
                f"         {why}, so rebuilding here would overwrite a projection",
                "         built from a tree this one does not contain. That is",
                "         ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection,",
                "         which has happened three times.",
                "",
                "What to do, best first:",
                f"  1. Rebuild from the newer tree instead. It was at:",
                f"       {previous.get('repo_root') or '(not recorded)'}",
                f"     (`git worktree list` if it has moved), and run:",
                f"       {rebuild_command}",
                "  2. Or bring this branch up to date (merge/rebase onto that",
                "     commit) and re-run here, which makes it an ancestor.",
                "  3. Or, if overwriting a newer projection is deliberate, re-run",
                "     this exact command with --allow-older-tree.",
            ]
        )
    )


def note_lines(current: Dict[str, Any]) -> List[str]:
    """The one-or-two lines a build prints about the tree it is building from."""
    lines = [f"built from {describe(current)}"]
    behind = current.get("behind_trunk")
    if behind:
        lines.append(
            f"WARNING: this tree is {behind} commit(s) behind {current.get('trunk')} "
            f"-- the projection will show labels that trunk has already moved past."
        )
    if current.get("dirty"):
        lines.append(
            "WARNING: this tree has uncommitted changes, so the recorded sha does "
            "not identify the code that ran."
        )
    return lines

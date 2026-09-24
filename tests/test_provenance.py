"""PROVENANCE.md's claims, asserted instead of read.

``PROVENANCE.md`` records which files were copied out of drawing-checker at this
repo's founding and, per file, whether they have been amended since. A row whose
Amended cell says *no* is a **claim about the bytes**: this file is still what was
imported. That claim went false five times between 2026-08-04 and 2026-08-06 --
every time because a handoff changed such a file for a perfectly good reason and
did not amend the row -- and **all five were caught by a reviewer, none by the
author**:

===  ===================================  ================================================
 #   handoff                              rows falsified
===  ===================================  ================================================
 1   ``pitch_link_stack`` (08-04)         ``stack.py``, ``test_tolerance_stack.py``,
                                          ``hardware_entries.json``, worksheets README
 2   ``spec_library_v0`` (08-05)          ``tolerance_stack/__init__.py`` -- a *package*
                                          row nobody watched
 3   ``hub_bearing_thermal_stack``        the phrase had escaped PROVENANCE entirely into
     (08-05)                              a stack note, a worksheet headline, two comments
 4   ``citation_export_provenance``       both seeded stack JSONs; three Amended rows stale
     (08-06)
 5   ``traced_labels_and_ratio`` (08-06)  the same two stack JSONs, both seeded worksheets,
                                          ``debug_report_tolerance_stacks.py``, the
                                          ``docs/reference/`` section
===  ===================================  ================================================

Sightings 4 and 5 were parallel handoffs on the same day, and each review
independently wrote "fourth sighting" in the checklist without knowing about the
other -- so the checklist itself demonstrated that **a human-executed check does
not compose across concurrent work.** That is the argument for this file rather
than a sixth amendment to the checklist. Sighting 4 was a handoff whose entire
subject was provenance and sighting 5 was one whose entire purpose was correcting
a false provenance claim, so caring about provenance demonstrably does not catch
it either. Only running the diff does.

Three things are checked, in increasing order of how much they cost:

1. **This branch.** Every imported path the branch changed must have had its
   PROVENANCE row edited *in the same branch*. This is the one that catches the
   author in the act, and it covers both failure shapes: a *no* row that just
   went false, and a *yes* row whose Amended clause now describes an older state
   (sighting 4's "three Amended rows stale").
2. **This repo's whole history.** Nothing claimed byte-identical has changed
   since the import commit. Catches drift that merged without being caught.
3. **drawing-checker.** Each byte-identical file's blob hash equals the blob at
   the recorded source sha. This is the claim itself, and until now it was a
   manual ``sha256sum`` step in the review checklist.

Everything is **derived from the document**: the rows, the paths, the source repo
and the two commit shas are parsed out of ``PROVENANCE.md``, never listed here. A
hardcoded list of watched files reproduces the bug -- the rows that go false are
whichever ones had never moved before, which is exactly why nobody watches them.

The parse makes the table format load-bearing; see the vocabulary in
:func:`claim_of` and ``test_every_amended_cell_uses_the_documented_vocabulary``.
"""

from __future__ import annotations

import datetime
import difflib
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
PROVENANCE_PATH = REPO_ROOT / "PROVENANCE.md"
TRUNK = "master"

# The one path that is deliberately not scanned by the "claims name their
# verification" test below: this file, whose every occurrence of the phrase is a
# pattern or a docstring rather than a claim about an artifact. Narrow and named
# on purpose -- an exclusion by directory would be a place to hide a claim.
_SELF = "tests/test_provenance.py"


# --------------------------------------------------------------------------- #
# git, read-only                                                              #
# --------------------------------------------------------------------------- #

def _git(*args: str, repo: Path | str = REPO_ROOT, check: bool = True) -> str:
    """Run a read-only git command and return stdout.

    ``encoding`` is explicit: PROVENANCE.md is full of em dashes and Windows'
    locale codec turns them into mojibake, which would silently break the parse.
    """
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    if check and proc.returncode != 0:
        raise AssertionError(
            f"git {' '.join(args)} failed in {repo}: {proc.stderr.strip()}"
        )
    return proc.stdout


def _blob(repo: Path | str, rev_path: str) -> str | None:
    """``git cat-file blob <rev>:<path>``, or None if it is not there."""
    proc = subprocess.run(
        ["git", "-C", str(repo), "cat-file", "blob", rev_path],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    return proc.stdout if proc.returncode == 0 else None


def _blob_hash(repo: Path | str, rev_path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--verify", rev_path],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    return proc.stdout.strip() if proc.returncode == 0 else None


def _changed(base: str, paths: list[str] | None = None) -> set[str]:
    """Paths differing between ``base`` and the **working tree**.

    Deliberately not ``base..HEAD``: one command then covers the commits on the
    branch *and* the edit the author has not committed yet, so the test fails
    while they are still in the file rather than after they have pushed.
    """
    args = ["diff", "--name-only", base]
    if paths:
        args += ["--", *paths]
    return {p.strip() for p in _git(*args).splitlines() if p.strip()}


# --------------------------------------------------------------------------- #
# parsing PROVENANCE.md                                                       #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Row:
    """One row of one PROVENANCE table that carries an import claim."""

    section: str        # the "## ..." heading it sits under
    line: int           # 1-based line number in PROVENANCE.md
    source: str         # source cell, as written
    destination: str    # destination cell, as written
    amended: str        # Amended cell, as written ("" for tables without one)
    claim: str          # see claim_of()
    paths: tuple[str, ...]


def _md(cell: str) -> str:
    """Cell text with markdown emphasis and backticks removed."""
    return re.sub(r"[*`_]", "", cell).strip()


def _cells(line: str, ncols: int | None = None) -> list[str]:
    s = line.strip()
    s = s[1:] if s.startswith("|") else s
    s = s[:-1] if s.endswith("|") else s
    parts = s.split("|") if ncols is None else s.split("|", ncols - 1)
    return [p.strip() for p in parts]


def _is_separator(cells: list[str]) -> bool:
    return all(set(c) <= set("-: ") and c for c in cells)


def _paths_in(cell: str) -> tuple[str, ...]:
    """Backticked, repo-relative-looking paths in a cell, in order."""
    return tuple(m for m in re.findall(r"`([^`]+)`", cell) if "/" in m)


def claim_of(amended_cell: str) -> str:
    """Classify an Amended cell. **This vocabulary is load-bearing.**

    * ``"identical"``    -- the cell begins ``no`` (``no -- byte-identical``,
      ``no -- empty, both``): the file is still what was imported.
    * ``"amended"``      -- the cell begins ``yes``: it changed, and the cell
      says when and why.
    * ``"not-imported"`` -- the cell begins ``not imported``: authored here, so
      there is no import claim to falsify.

    Anything else is ``"unparseable"`` and fails the format test rather than
    being silently skipped -- a row this function cannot read is a row nothing
    guards, which is the bug this module exists to end.
    """
    t = _md(amended_cell).lower()
    if t.startswith("not imported"):
        return "not-imported"
    if re.match(r"yes\b", t):
        return "amended"
    if re.match(r"no\b", t):
        return "identical"
    return "unparseable"


def parse_rows(text: str) -> list[Row]:
    """Every row of every PROVENANCE table that names a destination.

    Tables with an *Amended* column carry a per-file claim; the two-column
    ``source | destination`` table (the imported reference lesson) carries its
    claim in the prose of its section instead, and is returned with
    ``amended=""`` / ``claim="section-prose"`` so callers can treat it
    accordingly. Key/value tables (``| Source repo | ... |``) have neither
    header and are skipped.
    """
    rows: list[Row] = []
    section = ""
    header: list[str] | None | bool = None
    ncols = 0
    i_amended = -1
    for n, raw in enumerate(text.splitlines(), 1):
        s = raw.strip()
        if s.startswith("#"):
            section, header = s.lstrip("#").strip(), None
            continue
        if not s.startswith("|"):
            header = None
            continue
        if header is None:
            low = [_md(c).lower() for c in _cells(s)]
            if "destination" in low or any(c.startswith("destination") for c in low):
                header, ncols = low, len(low)
                i_amended = low.index("amended") if "amended" in low else -1
            else:
                header = False
            continue
        if header is False:
            continue
        cells = _cells(s, ncols)
        if _is_separator(cells):
            continue
        if len(cells) < ncols:
            cells = cells + [""] * (ncols - len(cells))
        source, destination = cells[0], cells[1]
        amended = cells[i_amended] if i_amended >= 0 else ""
        dest_md = _md(destination).lower()
        if dest_md.startswith("same path"):
            paths = _paths_in(source)
        else:
            paths = _paths_in(destination) or _paths_in(source)
        rows.append(Row(
            section=section, line=n, source=source, destination=destination,
            amended=amended,
            claim=claim_of(amended) if i_amended >= 0 else "section-prose",
            paths=paths,
        ))
    return rows


def parse_facts(text: str) -> dict[str, str]:
    """The key/value rows (``| Source repo | \\`C:\\workspace\\...\\` |``)."""
    facts: dict[str, str] = {}
    for raw in text.splitlines():
        s = raw.strip()
        if not s.startswith("|"):
            continue
        cells = _cells(s, 2)
        if len(cells) == 2 and cells[0] and cells[1] and not _is_separator(cells):
            facts.setdefault(_md(cells[0]).lower(), cells[1])
    return facts


def section_text(text: str, heading_starts_with: str) -> str:
    """The body of the first ``## `` section whose heading starts with a prefix."""
    out, inside = [], False
    for raw in text.splitlines():
        if raw.startswith("## "):
            if inside:
                break
            inside = raw[3:].strip().lower().startswith(heading_starts_with.lower())
            continue
        if inside:
            out.append(raw)
    return "\n".join(out)


def _sha(facts: dict[str, str]) -> str | None:
    for key, value in facts.items():
        if key.startswith("source repo") and "at time of copy" in key:
            m = re.search(r"[0-9a-f]{40}", _md(value))
            return m.group(0) if m else None
    return None


def _source_repo(facts: dict[str, str]) -> Path | None:
    value = facts.get("source repo")
    return Path(_md(value)) if value else None


def _import_commit(facts: dict[str, str]) -> str | None:
    value = facts.get("import commit in this repo")
    if not value:
        return None
    m = re.search(r"[0-9a-f]{7,40}", _md(value))
    return m.group(0) if m else None


# --------------------------------------------------------------------------- #
# the check, as a pure function over two documents and a set of paths          #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Unamended:
    path: str
    claim: str          # the claim the row made at ``base``
    line: int           # line of the row in the *new* document
    cell: str           # the Amended cell, unchanged since ``base``

    def __str__(self) -> str:
        return f"{self.path}  (PROVENANCE.md:{self.line}, claim={self.claim!r})"


def unamended_rows(before: str, after: str, changed: set[str]) -> list[Unamended]:
    """Imported paths in ``changed`` whose PROVENANCE row did not move.

    Pure, so the same function that guards the branch can be replayed against a
    recorded historical diff -- see
    ``test_the_check_catches_the_reconstructed_sightings_four_and_five``.

    ``before`` / ``after`` are the two texts of PROVENANCE.md. A row counts as
    amended if its Amended cell text differs at all; for the two-column table
    whose claim lives in prose, the row counts as amended if its *section* text
    differs. Not exempted: a row whose claim is ``not-imported`` (nothing was
    imported, so nothing can go false).
    """
    rows_before = {p: r for r in parse_rows(before) for p in r.paths}
    rows_after = {p: r for r in parse_rows(after) for p in r.paths}
    out: list[Unamended] = []
    for path in sorted(changed):
        old, new = rows_before.get(path), rows_after.get(path)
        if old is None or new is None or old.claim == "not-imported":
            continue
        if old.claim == "section-prose":
            moved = (section_text(before, old.section[:24])
                     != section_text(after, new.section[:24]))
        else:
            moved = _md(old.amended) != _md(new.amended)
        if not moved:
            out.append(Unamended(path, old.claim, new.line, new.amended))
    return out


def _prescription(items: list[Unamended]) -> str:
    """What to write, per row. The message is as much the deliverable as the
    assertion is: the whole point is for the author to fix it here rather than
    for a reviewer to fix it later."""
    branch = _git("rev-parse", "--abbrev-ref", "HEAD").strip() or "HEAD"
    slug = branch.split("/", 1)[-1]
    today = datetime.date.today().isoformat()
    lines = [
        "",
        f"{len(items)} file(s) changed on this branch whose PROVENANCE.md row still",
        "describes the state before the change, so the provenance record is making a",
        "false claim -- this repo's worst class of defect. Fix it in THIS commit.",
        "",
    ]
    for it in items:
        lines.append(f"  * {it.path}")
        lines.append(f"      PROVENANCE.md:{it.line}  Amended cell reads:")
        lines.append(f"        {it.cell[:180]}")
        if it.claim == "identical":
            lines.append("      That cell claims the file is still what was imported. Replace it with:")
            lines.append(f"        **yes, since {today}** (`{slug}`) -- was byte-identical at import. "
                         "<what changed, and say **additive only** if nothing existing moved>")
        elif it.claim == "section-prose":
            lines.append("      This row's claim lives in its section's prose. Amend that prose with a")
            lines.append(f"        dated note: **... since {today}** (`{slug}`) -- <what changed>")
        else:
            lines.append("      That cell was already amended, but for an older change. Append:")
            lines.append(f"        **Amended again {today}** (`{slug}`) -- <what changed this time>")
        lines.append("")
    lines += [
        "A purely additive change still falsifies the row: \"no value changed\" is not",
        "\"no edit happened\" (sighting 4). If a change genuinely must not be recorded,",
        "the row is wrong, not this test -- fix the row.",
        "",
    ]
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# fixtures                                                                    #
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def text() -> str:
    return PROVENANCE_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def rows(text: str) -> list[Row]:
    return parse_rows(text)


@pytest.fixture(scope="module")
def facts(text: str) -> dict[str, str]:
    return parse_facts(text)


@pytest.fixture(scope="module")
def source_repo(facts: dict[str, str]) -> Path:
    repo = _source_repo(facts)
    if repo is None or not (repo / ".git").exists():
        pytest.skip(f"source repo {repo} not present on this machine")
    return repo


# --------------------------------------------------------------------------- #
# 0. the parse itself                                                         #
# --------------------------------------------------------------------------- #

def test_every_amended_cell_uses_the_documented_vocabulary(rows):
    """The format guard, and the anti-vacuity guard in the same test.

    Everything else here is derived from the tables, so a parse that quietly
    stops matching would turn every other assertion green while guarding
    nothing -- the vacuous-check failure this repo has already been bitten by
    (``ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth``). So this
    also pins that the three claim-bearing tables were found and that each
    claim value is actually in use.
    """
    sections = {r.section for r in rows}
    assert len([s for s in sections if s.lower().startswith("copied")]) >= 4, (
        f"PROVENANCE.md's Copied tables were not found -- parsed sections: {sections}"
    )
    assert len(rows) >= 18, f"only {len(rows)} rows parsed; the table format moved"

    unparseable = [r for r in rows if r.claim == "unparseable"]
    assert unparseable == [], (
        "PROVENANCE.md's Amended column is parsed by tests/test_provenance.py, so its "
        "wording is load-bearing. A cell must begin with `no` (still byte-identical), "
        "`yes` (amended -- say when and why) or `not imported` (authored here). "
        "Unreadable cells:\n" + "\n".join(
            f"  PROVENANCE.md:{r.line}  {r.amended[:120]!r}" for r in unparseable
        )
    )

    pathless = [r for r in rows if not r.paths]
    assert pathless == [], (
        "every row must name at least one backticked path in its source or destination "
        "cell (that is how the watched set is derived rather than hardcoded); rows "
        "without one:\n" + "\n".join(f"  PROVENANCE.md:{r.line}" for r in pathless)
    )

    claims = {r.claim for r in rows}
    assert {"identical", "amended", "not-imported", "section-prose"} <= claims, (
        f"expected all four claim kinds to be in use, got {claims}"
    )

    missing = [
        f"PROVENANCE.md:{r.line} -> {p}"
        for r in rows for p in r.paths
        if r.claim != "not-imported" and not (REPO_ROOT / p).exists()
    ]
    assert missing == [], f"PROVENANCE names paths that are not here: {missing}"


def test_provenance_records_where_the_import_landed_in_this_repos_history(facts):
    """The absolute check below needs a commit in *this* repo to diff against.

    The document recorded drawing-checker's sha but not tolstack's own import
    commit, so there was no in-repo baseline to compare anything to. Both are
    git history: they do not move.
    """
    assert _sha(facts), "PROVENANCE.md must record the source repo's sha at copy time"
    commit = _import_commit(facts)
    assert commit, (
        "PROVENANCE.md must record `Import commit in this repo` -- the commit that "
        "added the imported files here. Without it the byte-identical rows have no "
        "in-repo baseline to be diffed against."
    )
    subject = _git("log", "-1", "--format=%s", commit).strip()
    assert "mport" in subject, f"{commit} is not the import commit ({subject!r})"


# --------------------------------------------------------------------------- #
# 1. this branch -- the author caught in the act                              #
# --------------------------------------------------------------------------- #

def test_this_branch_amended_the_row_of_every_imported_file_it_changed(text):
    """The five sightings, mechanised.

    Both shapes in one assertion, because both happened: a *no* row that the
    branch just falsified, and a *yes* row whose Amended clause the branch made
    stale. The comparison is against the merge-base, so on ``master`` there is
    nothing to check and on a handoff branch it is exactly
    ``git diff $(git merge-base HEAD master)..HEAD`` -- the command five reviews
    ran by hand and no author ran.
    """
    base = _git("merge-base", "HEAD", TRUNK, check=False).strip()
    if not base:
        pytest.skip(f"no merge-base with {TRUNK} (shallow or detached checkout)")
    before = _blob(REPO_ROOT, f"{base}:PROVENANCE.md")
    assert before is not None, f"PROVENANCE.md is not in {base}"
    offenders = unamended_rows(before, text, _changed(base))
    assert offenders == [], _prescription(offenders)


# --------------------------------------------------------------------------- #
# 2. the whole history -- drift that merged without being caught              #
# --------------------------------------------------------------------------- #

def test_no_file_claimed_byte_identical_has_changed_since_the_import(rows, facts):
    """The absolute form: not "not on this branch" but "not ever".

    ``git diff <import-commit> -- <path>`` compares the import to the **working
    tree**, so this covers merged drift and an uncommitted edit in one command.
    """
    commit = _import_commit(facts)
    if not commit:
        pytest.skip("PROVENANCE.md records no in-repo import commit")
    claimed = {p: r for r in rows if r.claim == "identical" for p in r.paths}
    assert claimed, "no byte-identical rows parsed -- the check would be vacuous"
    changed = _changed(commit, sorted(claimed))
    offenders = [
        Unamended(p, "identical", claimed[p].line, claimed[p].amended)
        for p in sorted(changed) if p in claimed
    ]
    assert offenders == [], (
        f"changed since the import commit {commit} while still claiming byte-identity:"
        + _prescription(offenders)
    )


# --------------------------------------------------------------------------- #
# 3. drawing-checker -- the claim itself                                      #
# --------------------------------------------------------------------------- #

def test_every_file_claimed_byte_identical_matches_drawing_checkers_blob(
    rows, facts, source_repo
):
    """"Byte-identical" verified against the bytes, not against this repo's log.

    Blob-hash equality *is* byte equality (git hashes content), and this is the
    ``sha256sum`` step the review checklist has been asking reviewers to do by
    hand since founding. Read-only: ``rev-parse`` and ``cat-file`` never write,
    which matters because drawing-checker is one-way.

    Skipped where drawing-checker is not on the machine -- an absent source repo
    must not turn into a passing byte-identity claim.
    """
    sha = _sha(facts)
    assert sha, "PROVENANCE.md records no source sha"
    mismatched, absent = [], []
    checked = 0
    for row in rows:
        if row.claim != "identical":
            continue
        sources = _paths_in(row.source)
        dests = row.paths if not _md(row.destination).lower().startswith("same path") else sources
        for src, dest in zip(sources, dests):
            there = _blob_hash(source_repo, f"{sha}:{src}")
            if there is None:
                absent.append(f"PROVENANCE.md:{row.line}  {src} not in {sha[:7]}")
                continue
            here = _git("hash-object", "--", dest).strip()
            checked += 1
            if here != there:
                mismatched.append(
                    f"  {dest}\n"
                    f"      PROVENANCE.md:{row.line} claims byte-identical to\n"
                    f"      {source_repo}\\{src} at {sha[:7]}\n"
                    f"      that blob {there}, this file {here}"
                )
    assert absent == [], "source paths missing from the recorded sha:\n" + "\n".join(absent)
    assert checked, "no byte-identity claim was actually compared -- vacuous"
    assert mismatched == [], (
        "these files are not byte-identical to the originals PROVENANCE.md names:\n"
        + "\n".join(mismatched)
        + "\n\nEither amend the row (see the Amended column's vocabulary) or restore "
          "the file. Note this compares git blobs, so a pure line-ending change is "
          "not what you are looking at."
    )


# --------------------------------------------------------------------------- #
# 4. docs/reference/ -- the same claim, in prose                              #
# --------------------------------------------------------------------------- #

def test_docs_reference_imports_are_insert_only(rows, facts, source_repo):
    """``docs/reference/`` is insert-only: see ARCHITECTURE.md, "Imported material".

    The rule (settled 2026-08-10, ``provenance_byte_identical_test``) is
    *additive dated corrections only, original text intact* -- not byte-identity,
    which the directory had already stopped satisfying, and not "no edits", which
    would have meant reverting a true correction to satisfy a rule. So the
    machine-checkable form is: **against the imported original, the diff contains
    insertions and nothing else**, and every insertion is either the import
    header or a dated blockquote.

    That is strictly stronger than "the original text is a contiguous
    subsequence": a reworded line inside an otherwise-intact file is a *replace*
    opcode, and this fails on it.
    """
    sha = _sha(facts)
    pairs = []
    for row in rows:
        sources = _paths_in(row.source)
        for src, dest in zip(sources, row.paths):
            if dest.startswith("docs/reference/"):
                pairs.append((src, dest))
    assert pairs, "PROVENANCE.md names no docs/reference/ import -- nothing checked"
    on_disk = sorted(
        str(p.relative_to(REPO_ROOT)).replace("\\", "/")
        for p in (REPO_ROOT / "docs" / "reference").glob("*")
        if p.is_file()
    )
    assert sorted(d for _, d in pairs) == on_disk, (
        f"docs/reference/ holds {on_disk} but PROVENANCE.md records "
        f"{sorted(d for _, d in pairs)} -- every file here is an import and must have "
        "a row"
    )

    problems: list[str] = []
    for src, dest in pairs:
        original = _blob(source_repo, f"{sha}:{src}")
        assert original is not None, f"{src} not in {sha[:7]} of {source_repo}"
        a = original.splitlines()
        b = (REPO_ROOT / dest).read_text(encoding="utf-8").splitlines()
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
            None, a, b, autojunk=False
        ).get_opcodes():
            if tag == "equal":
                continue
            if tag != "insert":
                problems.append(
                    f"  {dest}: imported text was {tag}d at original line {i1 + 1}"
                    f"-{i2} -- only insertions are permitted:\n"
                    + "\n".join(f"        - {line}" for line in a[i1:i2][:4])
                )
                continue
            block = [line for line in b[j1:j2] if line.strip()]
            quoted = all(line.lstrip().startswith(">") for line in block)
            dated = any(re.search(r"20\d\d-\d\d-\d\d", line) for line in block)
            if not (quoted and dated):
                problems.append(
                    f"  {dest}:{j1 + 1}-{j2}: an insertion into an import must be a "
                    "dated blockquote (the import header or a `> **CORRECTION, "
                    "<date>** ...` note)"
                    + ("" if quoted else "; this block is not a blockquote")
                    + ("" if dated else "; this block carries no ISO date")
                )
    assert problems == [], (
        "docs/reference/ holds imported reference material and is insert-only:\n"
        + "\n".join(problems)
    )


# --------------------------------------------------------------------------- #
# 5. byte identity outside PROVENANCE -- DECLARED, and actually compared      #
# --------------------------------------------------------------------------- #
#
# Sighting 3 was the phrase escaping PROVENANCE.md into prose nobody diffed: a
# stack note, a worksheet headline and two test comments all said two workbook
# sheets were "byte-identical" over rows 31-44 while the test compared only the
# NUMERIC cells. Four cells differed and one was the hub part number the whole
# identity argument rested on. Nothing was lying; the claim was simply stronger
# than its evidence.
#
# What stood here from 2026-08-10 to 2026-09-23 was a grep: every tracked file
# outside dated history, scanned for `byte[- ]identical|byte[- ]for[- ]byte`,
# each hit required to name a `sha256`, a `git diff`, a blob, a test or
# PROVENANCE.md **in the same block of prose**. Two things were wrong with it,
# and they are the two halves of this repo's whole prose-guard problem:
#
#   * it read English, so it reddened on sentences that were not claims -- a
#     triage brief describing the viewer's *behaviour* with the byte idiom gated
#     a 129-commit batch merge and was filed as its own issue by eight sessions
#     (`ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md`);
#     and
#   * what it checked was a POINTER, one step short of the comparison. A claim
#     was discharged by naming something that might check it. That is how the
#     enclosing `def test_...` line came to satisfy the search all by itself and
#     needed `_DEFINITION_RE` to exclude it -- a check that a test's own name
#     discharges the claim inside it is the vacuous check in a new costume.
#
# A byte-identity claim is a declaration now, and the declaration names both
# sides, so the guard **does the comparison** instead of trusting that something
# else did. `tests/claims_registry.py`'s `byte_identity` metric resolves each
# side to bytes -- a tracked path, a `<rev>:<path>` git blob, or a
# `<path>#/<json pointer>` region -- and compares them. Prose may use the phrase
# however it likes; nothing reads it.
#
# PROVENANCE.md's own byte-identical rows are not in this: they are checked from
# the other end, by `unamended_rows` and the sighting replays below, against the
# import commit. That was always the arrangement -- `_HISTORICAL` excluded them
# from the grep too -- and it is why the file is out of the claim corpus.

#: Floor for the declared byte-identity claims. A floor, for the reason
#: `assert_coverage_set` gives everywhere else in this suite: the set may grow
#: without an edit here, and what has to be caught is it coming back empty --
#: the guard scanning nothing and reporting green.
_DECLARED_BYTE_IDENTITY_FLOOR = 4


def test_every_declared_byte_identity_claim_is_verified_by_comparing_bytes():
    """The claim, and the bytes, in the same assertion.

    The declarations live where the claim is made -- today the two end-stop
    studies, whose notes say their `selection` and `transforms` are
    byte-for-byte their source study's and which are now compared rather than
    cross-referenced to the test that compares them.
    """
    from tests.claims_registry import check, declared_claims
    from tests.test_tolerance_stack import assert_coverage_set

    declared = [c for c in declared_claims(REPO_ROOT)
                if c.metric == "byte_identity"]
    assert_coverage_set("declared byte-identity claims", declared,
                        _DECLARED_BYTE_IDENTITY_FLOOR)

    broken = [f"{c.location}: {check(c, REPO_ROOT).detail}"
              for c in declared if not check(c, REPO_ROOT).ok]
    assert broken == [], (
        "declared byte identities that do not hold:\n  " + "\n  ".join(broken)
        + "\n\nEither the two artifacts diverged -- in which case the claim is "
          "the thing that is now false and the document has to say what is "
          "actually true -- or a side was renamed out from under the "
          "declaration."
    )


def test_the_byte_identity_check_can_fail():
    """A guard nobody has watched fail is not yet a guard.

    Sighting 3's shape, replayed as a declaration: two artifacts asserted
    identical that are not. The old scan could only ever ask whether a
    *verification was named*; this asks the question the claim actually makes.
    """
    from tests.claims_registry import Claim, DISAGREES, check

    study = "docs/topologies/study_pitch_system_end_stop_minus7.json"
    outcome = check(Claim("d.md", 1, "byte_identity", {
        "subject": f"{study}#/selection",
        "against": f"{study}#/transforms",
    }), REPO_ROOT)
    assert outcome.status == DISAGREES, outcome
    assert "not identical" in outcome.detail, outcome



# --------------------------------------------------------------------------- #
# 6. the five sightings, replayed out of git                                  #
# --------------------------------------------------------------------------- #

# Sightings 4 and 5 were parallel handoffs off the same master commit, and both
# merged, so their trees are permanent git history and the falsifying diff can be
# replayed exactly rather than mimicked. Constants are commits: they do not move.
_SIGHTING_BASE = "2097d59"          # board: traced_labels_and_ratio staged -> active
_SIGHTINGS = {
    # slug: (author's tip before review, review commit that fixed PROVENANCE,
    #        paths the row of which the author left unamended)
    "citation_export_provenance": ("fbc9bab", "8a88b71", {
        "docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json": "identical",
        "docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json": "identical",
        "tolerance_stack/stack.py": "amended",
        "tolerance_stack/__init__.py": "amended",
        "tests/test_tolerance_stack.py": "amended",
    }),
    "traced_labels_and_ratio": ("455b210", "e6f8ef5", {
        "docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json": "identical",
        "docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json": "identical",
        "docs/tolerance_stacks/WORKSHEET_tan_link_to_pitch_plate.md": "identical",
        "docs/tolerance_stacks/WORKSHEET_vpa_output_to_pitch_plate.md": "identical",
        "docs/reference/LESSONS_20260729_tolerance_stack_slice1.md": "section-prose",
        "tests/debug_report_tolerance_stacks.py": "amended",
        "tests/test_tolerance_stack.py": "amended",
    }),
}


@pytest.mark.parametrize("slug", sorted(_SIGHTINGS))
def test_the_check_catches_the_reconstructed_sightings_four_and_five(slug):
    """Red against the recurrence it was written for, green after the fix.

    A test for a five-time recurrence demonstrated only against a synthetic case
    has not earned its priority. This replays each sighting's real tree: the
    author's own tip (before the reviewer touched PROVENANCE.md) must be caught
    on exactly the rows that review caught, and the review commit that amended
    them must come back clean. The second half is the part that makes the first
    half mean something -- a check that fires on everything catches nothing.
    """
    tip, review, expected = _SIGHTINGS[slug]
    before = _blob(REPO_ROOT, f"{_SIGHTING_BASE}:PROVENANCE.md")
    assert before, f"{_SIGHTING_BASE} is not in this repo's history"

    changed = {p for p in _git(
        "diff", "--name-only", f"{_SIGHTING_BASE}..{tip}"
    ).splitlines() if p.strip()}
    caught = unamended_rows(before, _blob(REPO_ROOT, f"{tip}:PROVENANCE.md"), changed)
    assert {c.path: c.claim for c in caught} == expected, (
        f"replaying {slug} at {tip}: expected the check to name\n"
        f"  {expected}\nbut it named\n  {({c.path: c.claim for c in caught})}"
    )

    fixed = {p for p in _git(
        "diff", "--name-only", f"{_SIGHTING_BASE}..{review}"
    ).splitlines() if p.strip()}
    still = unamended_rows(before, _blob(REPO_ROOT, f"{review}:PROVENANCE.md"), fixed)
    assert still == [], (
        f"the review commit {review} amended every row {slug} falsified, so the "
        f"check must be clean there; it still names {[str(s) for s in still]}"
    )



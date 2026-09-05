"""``ARCHITECTURE.md``'s module inventory, paired with the tree it inventories.

The ``## Package layout`` block is a **list of every module with a sentence about
each**, and every sentence in it is a claim about the tree. Three of those claims
are quantities, which is the shape this repo has already gone stale on twice:

* ``stack.py  ... ~330 lines`` was written at founding and read **728** by
  2026-08-19 -- better than 2x wrong for a month, and nothing was red
  (``ISSUE_20260818_architecture_module_inventory_line_count_is_stale``);
* ``projection_provenance.py ... imported by all three projection writers`` said
  **two** until ``spec_library_projection_provenance`` corrected it (2026-08-12);
* ``thermal.py ... no arithmetic of its own beyond thermal_factor()`` was simply
  false -- ``workbook_corner`` combines two element values on purpose -- and no
  reader had noticed.

So the rule this module enforces is the one the handoff
(``architecture_inventory_quantifiers``, 2026-08-19) settled on: **a quantifier
in that block is either deleted or read out of the tree here.** The line count
was deleted, because it carried no decision. What survives is registered in
``PINNED_CLAIMS`` below and asserted against the code; anything else that looks
like a quantity makes ``test_no_unpinned_quantifier_survives_in_the_block`` red,
naming the token.

Precedent and its rule
----------------------

``tests/test_js_python_vocabulary.py`` and ``tests/test_sop_vocabulary.py`` pair a
document against the code it describes, and
``test_no_live_document_states_an_unguarded_hardware_entry_count`` in
``tests/test_tolerance_stack.py`` is the count-claim scanner. What is borrowed
is their rule: **never restate the thing being guarded.** No import list, no
importer list and no module list is written out below -- each is read from the
tree, and every extraction is asserted non-empty before anything is compared,
because a scan that silently finds nothing is a guard that passes against
anything.

What this does not do
---------------------

* It reads the **module inventory block only** -- the fenced listing under
  ``## Package layout``. The rest of ``ARCHITECTURE.md`` carries quantifiers of
  its own (the traced ratio and its two dated corrections, ``6.4e-15``, ``29%``);
  the ratio is guarded by
  ``test_every_document_quoting_the_traced_ratio_quotes_the_current_number`` and
  the others are not in this block's scope.
* The quantifier scan matches **shapes**, not English: digits and the number
  words below. "A few hundred lines" spelled without a digit or a listed word
  passes. Add the word rather than widening the regex into prose.
* A claim inside a ``"..."`` span is exempt, the same rule the hardware-count
  guard uses, so the block can preserve a superseded figure as a quotation
  (``snapshot_drawing_checker.py``'s *"nothing was written there"* is the only
  live instance).
* Dates are exempt outright. A dated claim is history and reads as history --
  that is option 2 of the handoff, and ``Added 2026-08-05`` is its instance.
"""

from __future__ import annotations

import ast
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCHITECTURE = REPO_ROOT / "ARCHITECTURE.md"
HEADING = "## Package layout"

#: The directories the block inventories, in the order it lists them. Read as
#: "these directory headers must appear"; the *contents* of each are read off
#: the disk, never listed here.
INVENTORIED = ("tolerance_stack/", "scripts/", "apps/")

#: Import name -> the name the block spells it by. A third-party import of a
#: module this map does not know **raises**: the block's dependency claim cannot
#: be checked against a distribution nobody has named, and skipping it would let
#: a new dependency arrive unmentioned.
DISTRIBUTIONS = {"fitz": "PyMuPDF", "pymupdf": "PyMuPDF"}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}

#: Every quantifier the block is allowed to contain, and the test that reads it
#: out of the tree. A pinned claim that matches **zero** times is a failure too
#: (``test_every_pinned_claim_is_still_in_the_block``): reword the claim and the
#: test that pins it stops describing anything, which is how "a test asserts
#: this" becomes untrue while still being written down.
PINNED_CLAIMS = (
    (re.compile(r"stdlib only"),
     "test_every_row_claiming_stdlib_only_imports_only_the_stdlib"),
    (re.compile(r"needs PyMuPDF"),
     "test_the_block_names_a_dependency_for_exactly_the_modules_that_have_one"),
    (re.compile(r"all five projection writers"),
     "test_the_projection_provenance_row_counts_and_names_its_importers"),
    (re.compile(r"the three above"),
     "test_the_projection_provenance_row_counts_and_names_its_importers"),
)

_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_QUOTED = re.compile(r'"[^"\n]*"')
_QUANTIFIER = re.compile(
    r"~?\d+(?:[.,]\d+)*|\b(?:" + "|".join(NUMBER_WORDS)
    + r"|dozen|hundred|thousand|all|both|every|each|only|none|nothing|"
    r"several|many|most|half|twice|double)\b",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- #
# 1. the document side: the fenced listing, row by row                        #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Row:
    directory: str          # the header this row sits under, e.g. "scripts/"
    name: str               # "build_viewer_crops.py", or "viewer/" for a dir
    text: str               # the prose, continuation lines joined with a space
    line: int               # 1-based line of the row's first line

    @property
    def path(self) -> str:
        return self.directory + self.name


_ENTRY = re.compile(r"^ {2}(?P<name>\S+)(?:\s+(?P<text>\S.*?))?\s*$")
_CONTINUATION = re.compile(r"^ {3,}(?P<text>\S.*?)\s*$")
_HEADER = re.compile(r"^(?P<name>\S+/)\s*$")
# What a row's first token may look like. Two-space-indented prose would
# otherwise parse as a row named after its first word -- and the block's rows are
# not column-aligned (`run_viewer_browser_tests.mjs` has a single space before
# its sentence), so the alignment cannot be the test.
_NAME = re.compile(r"^(?:[\w.\-]+\.[A-Za-z0-9]+|[\w.\-]+/)$")
# A name-shaped first token on a continuation line means the indent convention
# this parser reads (rows at exactly two spaces) has changed, and a row would be
# swallowed into its predecessor's prose. Refuse rather than guess.
_NAME_TOKEN = re.compile(r"^(?:[\w.\-]+\.[A-Za-z0-9]+|[\w.\-]+/)(?:\s+|$)")


def inventory_block(markdown: str) -> tuple[int, list[str]]:
    """The fenced listing under ``## Package layout``: its first line and lines.

    Raises rather than returning nothing when the heading or the fence is not
    where this module expects it: an empty block would make every comparison
    below pass.
    """
    lines = markdown.splitlines()
    anchors = [i for i, line in enumerate(lines) if line.strip() == HEADING]
    if len(anchors) != 1:
        raise LookupError(
            f"expected exactly one {HEADING!r} heading in ARCHITECTURE.md, found "
            f"{len(anchors)}. If the section was renamed, point this module at it "
            f"-- the pairing below is meaningless until it reads the real block."
        )
    i = anchors[0] + 1
    while i < len(lines) and not lines[i].startswith("```"):
        if lines[i].startswith("#"):
            raise LookupError(
                f"no fenced block between {HEADING!r} and the next heading "
                f"(line {i + 1}) -- the module inventory is not where this module "
                f"reads it."
            )
        i += 1
    if i >= len(lines):
        raise LookupError(f"{HEADING!r} is not followed by a fenced block at all")
    start = i + 1
    end = start
    while end < len(lines) and not lines[end].startswith("```"):
        end += 1
    if end >= len(lines):
        raise ValueError("the module inventory's fence is never closed")
    return start + 1, lines[start:end]


def parse_rows(markdown: str) -> tuple[Row, ...]:
    """One :class:`Row` per module (or app directory) the block lists."""
    first_line, lines = inventory_block(markdown)
    rows: list[Row] = []
    directory = ""
    pending: list[str] = []

    def flush() -> None:
        if rows and pending:
            joined = " ".join([rows[-1].text] + pending).strip()
            rows[-1] = Row(rows[-1].directory, rows[-1].name, joined, rows[-1].line)
        pending.clear()

    for offset, raw in enumerate(lines):
        line_no = first_line + offset
        if not raw.strip():
            continue
        header = _HEADER.match(raw)
        if header:
            flush()
            directory = header.group("name")
            continue
        entry = _ENTRY.match(raw)
        if entry:
            if not _NAME.match(entry.group("name")):
                raise ValueError(
                    f"ARCHITECTURE.md:{line_no}: a row at two spaces must start with "
                    f"a file or directory name; got {entry.group('name')!r}. Prose "
                    f"continuing the row above belongs at three spaces or more, or "
                    f"this row's name would be that word."
                )
            flush()
            if not directory:
                raise ValueError(
                    f"ARCHITECTURE.md:{line_no}: {entry.group('name')!r} is listed "
                    f"before any directory header"
                )
            rows.append(Row(directory, entry.group("name"),
                            (entry.group("text") or "").strip(), line_no))
            continue
        continuation = _CONTINUATION.match(raw)
        if continuation:
            if not rows:
                raise ValueError(
                    f"ARCHITECTURE.md:{line_no}: indented prose before any row")
            if _NAME_TOKEN.match(continuation.group("text")):
                raise ValueError(
                    f"ARCHITECTURE.md:{line_no}: {continuation.group('text')[:40]!r} "
                    f"is indented deeper than two spaces but reads like a row. This "
                    f"parser takes a row at exactly two spaces and anything deeper "
                    f"as continuation prose, so this row would be swallowed into its "
                    f"predecessor's sentence and stop being checked. Re-indent it, or "
                    f"teach the parser the new shape."
                )
            pending.append(continuation.group("text"))
            continue
        raise ValueError(
            f"ARCHITECTURE.md:{line_no}: {raw!r} is neither a directory header, a "
            f"row, nor continuation prose"
        )
    flush()
    return tuple(rows)


# --------------------------------------------------------------------------- #
# 2. the tree side, read out of the tree                                      #
# --------------------------------------------------------------------------- #

def on_disk(directory: str) -> set[str]:
    """What ``directory`` actually holds, spelled the way the block spells it."""
    root = REPO_ROOT / directory.rstrip("/")
    out = set()
    for child in root.iterdir():
        if child.name.startswith(".") or child.name == "__pycache__":
            continue
        out.add(child.name + "/" if child.is_dir() else child.name)
    return out


def first_party_names() -> frozenset[str]:
    """Module names that are this repo's own, so not a dependency.

    ``scripts/`` is not a package: its modules import each other by bare name
    (``import projection_provenance``) after putting the directory on
    ``sys.path``, so a sibling's stem is first-party even though it looks like a
    top-level distribution.
    """
    names = {"tolerance_stack"}
    names |= {path.stem for path in (REPO_ROOT / "scripts").glob("*.py")}
    return frozenset(names)


def top_level_imports(source: str) -> frozenset[str]:
    """Every module ``source`` imports, by top-level name.

    ``ast.walk``, not the module body, on purpose: three of the imports that
    matter here are **inside functions** -- ``fitz`` in ``build_viewer_crops``
    and ``projection_provenance`` in ``spec_library.rebuild`` -- and a lazy
    import is exactly as much of a dependency as an eager one.
    """
    out: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            out |= {alias.name.split(".")[0] for alias in node.names}
        elif isinstance(node, ast.ImportFrom):
            if node.level:                      # a relative import is first-party
                continue
            if node.module:
                out.add(node.module.split(".")[0])
    return frozenset(out)


def third_party_imports(path: Path) -> frozenset[str]:
    imports = top_level_imports(path.read_text(encoding="utf-8"))
    return frozenset(
        name for name in imports
        if name not in sys.stdlib_module_names and name not in first_party_names()
    )


def modules_importing(target: str) -> set[str]:
    """Repo-relative paths of the modules that import ``target``."""
    candidates = sorted(
        list((REPO_ROOT / "tolerance_stack").glob("*.py"))
        + list((REPO_ROOT / "scripts").glob("*.py"))
    )
    return {
        path.relative_to(REPO_ROOT).as_posix()
        for path in candidates
        if path.stem != target and target in top_level_imports(
            path.read_text(encoding="utf-8"))
    }


@pytest.fixture(scope="module")
def rows() -> tuple[Row, ...]:
    return parse_rows(ARCHITECTURE.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- #
# 3. the extraction, asserted before anything is compared                     #
# --------------------------------------------------------------------------- #

def test_the_parser_found_the_block_and_every_row_it_names_exists(rows):
    """Anti-vacuity. Everything below compares against ``rows``."""
    assert len(rows) >= 8, (
        f"the module inventory parsed to {len(rows)} rows, which is fewer than the "
        f"repo has modules -- the parser has drifted from the block's shape and "
        f"every comparison in this module is now weaker than it reads"
    )
    assert {row.directory for row in rows} == set(INVENTORIED)
    for row in rows:
        assert row.text, (
            f"ARCHITECTURE.md:{row.line}: {row.path} is listed with no sentence"
        )
        assert (REPO_ROOT / row.path).exists(), (
            f"ARCHITECTURE.md:{row.line}: the inventory lists {row.path}, which is "
            f"not in the tree"
        )


def test_the_parser_refuses_a_shape_it_would_otherwise_misread():
    """The parser's own failure modes, made loud.

    A silent misparse here is worse than a stale number: it drops a row out of
    every check below while the block still reads complete.
    """
    with pytest.raises(LookupError, match="exactly one"):
        parse_rows("# no such heading\n")

    with pytest.raises(LookupError, match="no fenced block"):
        parse_rows(f"{HEADING}\n\nprose, then\n\n## the next section\n")

    with pytest.raises(ValueError, match="never closed"):
        parse_rows(f"{HEADING}\n\n```\nscripts/\n  a.py   a thing\n")

    # A row indented deeper than two spaces would be read as its predecessor's
    # prose -- the one misparse that hides a module rather than reporting it.
    with pytest.raises(ValueError, match="reads like a row"):
        parse_rows(f"{HEADING}\n\n```\nscripts/\n  a.py   a thing\n"
                   f"     b.py   another thing\n```\n")

    with pytest.raises(ValueError, match="before any directory header"):
        parse_rows(f"{HEADING}\n\n```\n  a.py   a thing\n```\n")

    # And the positive control: the shape the real block is written in.
    parsed = parse_rows(
        f"{HEADING}\n\n```\nscripts/\n  a.py   a thing\n"
        f"  b.py   another thing,\n         continued\napps/\n  v/   an app\n```\n")
    assert [(row.path, row.text) for row in parsed] == [
        ("scripts/a.py", "a thing"),
        ("scripts/b.py", "another thing, continued"),
        ("apps/v/", "an app"),
    ]


def test_every_pinned_claim_is_still_in_the_block(rows):
    """A registered claim that matches nothing means its test guards nothing.

    This is the failure the hardware-count sweep named: *"a test asserts this"*
    is not a guard unless the test asserts **this**. Reword ``stdlib only`` to
    ``no third-party imports`` and the pairing below keeps passing while checking
    a phrase the document no longer contains -- so the phrase itself is pinned.
    """
    text = " ".join(row.text for row in rows)
    for pattern, pinned_by in PINNED_CLAIMS:
        assert pattern.search(text), (
            f"{pattern.pattern!r} is registered in PINNED_CLAIMS as guarded by "
            f"{pinned_by}, but the module inventory no longer contains it. Either "
            f"the claim was reworded -- update the pattern -- or it was deleted, in "
            f"which case drop the row from PINNED_CLAIMS."
        )


# --------------------------------------------------------------------------- #
# 4. the pairings                                                             #
# --------------------------------------------------------------------------- #

def test_the_block_inventories_every_module_in_the_directories_it_lists(rows):
    """The inventory's own implicit quantifier: *these are the modules*.

    This is the check the review checklist keeps asking a human to do by eye
    ("did this handoff owe the inventory a row?"). A module added without a row
    is invisible to a reader who trusts the block, and a row left behind after a
    delete sends them looking for a file that is gone.
    """
    for directory in INVENTORIED:
        listed = {row.name for row in rows if row.directory == directory}
        actual = on_disk(directory)
        assert listed == actual, (
            f"ARCHITECTURE.md's module inventory disagrees with {directory}:\n"
            f"  in the tree, not in the block: {sorted(actual - listed)}\n"
            f"  in the block, not in the tree: {sorted(listed - actual)}\n"
            f"Add the row (with the sentence it earns) or delete it."
        )


def test_every_row_claiming_stdlib_only_imports_only_the_stdlib(rows):
    """*"stdlib only"* -- the one claim in that block worth guarding.

    It is the reason the block says anything about imports at all: this repo's
    modules are meant to be readable and runnable without an install, and
    ``build_viewer_crops.py`` is the deliberate exception. So the claim is read
    off ``sys.stdlib_module_names`` plus this repo's own names, and a
    first-party import does not falsify it -- ``spec_library`` importing
    ``tolerance_stack.stack`` is not a dependency.
    """
    claimants = [row for row in rows if "stdlib only" in row.text]
    assert len(claimants) >= 3, (
        f"only {len(claimants)} rows claim `stdlib only`; the block has carried "
        f"the claim on four modules since 2026-08-10, so this test is now "
        f"checking less than it reads"
    )
    problems = []
    for row in claimants:
        path = REPO_ROOT / row.path
        assert path.suffix == ".py", f"{row.path} claims `stdlib only` and is not Python"
        imports = top_level_imports(path.read_text(encoding="utf-8"))
        assert imports, f"{row.path}: no imports extracted at all -- the reader drifted"
        outside = sorted(third_party_imports(path))
        if outside:
            problems.append(f"ARCHITECTURE.md:{row.line} {row.path} imports {outside}")
    assert problems == [], (
        "these rows say `stdlib only` and the module imports something else:\n"
        + "\n".join(f"  {p}" for p in problems)
        + "\nEither the dependency is wanted -- then say so in the row, as "
          "build_viewer_crops.py's does -- or it is not."
    )


def test_the_block_names_a_dependency_for_exactly_the_modules_that_have_one(rows):
    """Both directions of the dependency claim, for every Python row.

    A module that grows a dependency and says nothing reads as installable-free
    to the next author; a row that names a dependency the module no longer
    imports sends them to install it for nothing. ``build_viewer_crops.py`` is
    the only module in the block with a third-party import today, and that is
    read from the tree rather than written here.
    """
    named_anywhere = set(DISTRIBUTIONS.values())
    problems = []
    for row in rows:
        path = REPO_ROOT / row.path
        if path.suffix != ".py":
            continue
        outside = third_party_imports(path)
        unknown = sorted(name for name in outside if name not in DISTRIBUTIONS)
        assert not unknown, (
            f"{row.path} imports {unknown}, which DISTRIBUTIONS does not know. Add "
            f"the import name and the name the block should spell it by -- an "
            f"unmapped dependency cannot be checked against the row."
        )
        expected = {DISTRIBUTIONS[name] for name in outside}
        actual = {name for name in named_anywhere if name in row.text}
        if expected != actual:
            problems.append(
                f"ARCHITECTURE.md:{row.line} {row.path}: imports name "
                f"{sorted(expected)}, row names {sorted(actual)}"
            )
    assert problems == [], (
        "the inventory's dependency claims disagree with the imports:\n"
        + "\n".join(f"  {p}" for p in problems)
    )


def test_the_projection_provenance_row_counts_and_names_its_importers(rows):
    """*"Imported by all three projection writers (the two above and ...)"*.

    Both quantifiers in one sentence, and this row has already been wrong twice:
    it said **two** until ``spec_library.rebuild`` became the third writer
    (``spec_library_projection_provenance``, 2026-08-12), and **three** until
    ``build_topology_projection.py`` became the fourth (``dag_viewer_poc``,
    2026-08-31). *"the three above"* is resolved **positionally** -- the three
    rows preceding this one -- so inserting a row between them also reddens this
    test, which is the point: the phrase means something different the moment the
    block is reordered.
    """
    matches = [row for row in rows if row.name == "projection_provenance.py"]
    assert len(matches) == 1, "expected exactly one projection_provenance.py row"
    row = matches[0]

    total = re.search(r"all (\w+) projection writers", row.text)
    assert total, f"ARCHITECTURE.md:{row.line}: the row no longer says how many"
    claimed_total = NUMBER_WORDS[total.group(1).lower()]

    above = re.search(r"the (\w+) above", row.text)
    assert above, f"ARCHITECTURE.md:{row.line}: the row no longer says 'the N above'"
    claimed_above = NUMBER_WORDS[above.group(1).lower()]

    siblings = [r for r in rows if r.directory == row.directory]
    index = siblings.index(row)
    assert index >= claimed_above, (
        f"ARCHITECTURE.md:{row.line}: the row claims {claimed_above} rows above it "
        f"in {row.directory} and there are {index}"
    )
    named = {r.path for r in siblings[index - claimed_above:index]}
    named |= {m for m in re.findall(r"`([^`]+)`", row.text) if "/" in m}

    actual = modules_importing("projection_provenance")
    assert actual, "no module imports projection_provenance -- the reader drifted"
    assert len(named) == claimed_total, (
        f"ARCHITECTURE.md:{row.line}: the row says {claimed_total} writers and names "
        f"{len(named)}: {sorted(named)}"
    )
    assert named == actual, (
        f"ARCHITECTURE.md:{row.line}: the row's importers disagree with the tree:\n"
        f"  imports it, not named in the row: {sorted(actual - named)}\n"
        f"  named in the row, does not import it: {sorted(named - actual)}"
    )


# --------------------------------------------------------------------------- #
# 5. the residue: no quantifier the tests above do not read                   #
# --------------------------------------------------------------------------- #

def unpinned_quantifiers(text: str) -> list[str]:
    """Quantity-shaped tokens in ``text`` that no test above reads from the tree.

    Removals, in order: ``"..."`` spans (a quoted figure is a preserved
    correction, the house convention), ISO dates (a dated claim is history), and
    every pattern in ``PINNED_CLAIMS``.
    """
    stripped = _QUOTED.sub(" ", text)
    stripped = _DATE.sub(" ", stripped)
    for pattern, _ in PINNED_CLAIMS:
        stripped = pattern.sub(" ", stripped)
    return [m.group(0) for m in _QUANTIFIER.finditer(stripped)]


def test_no_unpinned_quantifier_survives_in_the_block(rows):
    """The rule, rather than one more instance of it.

    ``~330 lines`` is deleted; what stops the next author writing ``~730`` is
    this test. A number in prose that nothing checks is the same defect wearing a
    different value, so the block may carry a quantity only when a test above
    reads it out of the tree -- and then the phrase goes in ``PINNED_CLAIMS``.
    """
    problems = []
    for row in rows:
        found = unpinned_quantifiers(row.text)
        if found:
            problems.append(
                f"ARCHITECTURE.md:{row.line} {row.path}: {found} in {row.text!r}")
    assert problems == [], (
        "the module inventory carries quantifiers no test reads from the tree:\n"
        + "\n".join(f"  {p}" for p in problems)
        + "\nDelete the figure (it usually carries no decision), or state it as a "
          "dated band, or pin it with a test here and register the phrase in "
          "PINNED_CLAIMS."
    )


def test_the_quantifier_scan_can_fail():
    """A guard nobody has watched fail is not a guard.

    Replays the stale row verbatim, and both exemptions, so the test above is
    known to be doing something.
    """
    assert unpinned_quantifiers(
        "the stack shapes + the fold. ~330 lines, stdlib only.") == ["~330"]
    assert unpinned_quantifiers("the stack shapes + the fold. stdlib only.") == []
    # The two exemptions.
    assert unpinned_quantifiers('read "~330 lines" until 2026-08-19') == []
    assert unpinned_quantifiers("Added 2026-08-05.") == []
    # A word, not a digit -- the shape the deleted figure could come back as.
    assert unpinned_quantifiers("about a thousand lines") == ["thousand"]
    # And the pinned phrases, which must not be flagged.
    assert unpinned_quantifiers(
        "Imported by all five projection writers (the three above and "
        "`tolerance_stack/spec_library.py`, 2026-08-12).") == []
    assert unpinned_quantifiers("source_ref -> a crop PNG (needs PyMuPDF)") == []


def test_the_stdlib_only_reader_can_fail():
    """The import reader, shown catching the dependency it exists to catch."""
    assert third_party_imports(REPO_ROOT / "scripts" / "build_viewer_crops.py") \
        == frozenset({"fitz"})
    assert top_level_imports("def f():\n    import fitz\n") == frozenset({"fitz"})
    assert top_level_imports("from . import sibling\n") == frozenset()
    assert top_level_imports(
        "from tolerance_stack.stack import fold\nimport json\n") \
        == frozenset({"tolerance_stack", "json"})

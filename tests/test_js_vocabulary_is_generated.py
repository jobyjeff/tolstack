"""``apps/viewer/vocab.gen.js`` is what the generator would write, to the byte.

This is the whole pairing between the repo's Python vocabularies and the two
JavaScript apps that render them. It replaced twenty-six hand copies and three
pairing modules on 2026-09-23 (the bug pareto's R2): instead of reading each JS
table with a character scanner and comparing sets, the words are **rendered from
Python** and this module regenerates and compares text.

Two failures, one test, and they are the two that matter:

* **Python moved and nobody regenerated.** A word renamed in
  ``tolerance_stack/stack.py`` and a generated file still carrying the old one is
  a diff here. Under the old pairing this was also caught -- but only for the
  vocabularies somebody had written a row for, and only if the scanner could
  anchor on the table.
* **Somebody hand-edited the generated file.** There was no analogue of this
  before, because there was nothing structurally wrong with editing a hand copy;
  it was only wrong once it disagreed with Python. Now the file says
  ``GENERATED -- DO NOT EDIT`` at the top and an edit to it is red on its own.

What this module deliberately does NOT do is check that each JS *table* has an
entry per word. That is not a test's job any more: ``VOCAB.table()`` in the
generated module compares the key set **when the app loads** and throws, which is
earlier than any test and covers the one shape the retired scanner admitted it
could not see (a key attached from outside the literal, via ``Object.assign``).
``apps/viewer/tests.js`` and ``apps/annotate/run_tests.cjs`` each carry one guard
that watches that refusal happen.

What is checked here beside the comparison is everything that would make the
comparison *vacuous*: a registry entry that reads back empty, a vocabulary
declared twice, and -- the failure this repo has actually had, twice, with
``<script>`` tags -- a page or a runner that never loads the module at all.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import generate_js_vocabulary as G  # noqa: E402 -- resolved from scripts/
import js_vocabulary as V  # noqa: E402 -- resolved from scripts/

GENERATED = REPO_ROOT / "apps" / "viewer" / "vocab.gen.js"


# --------------------------------------------------------------------------- #
# 1. the comparison                                                           #
# --------------------------------------------------------------------------- #

def test_the_generated_vocabulary_module_is_up_to_date():
    """``apps/viewer/vocab.gen.js`` is exactly what the generator writes today.

    Red in both directions, and the diff says which:

    * a Python definition moved and nobody ran the generator -- the regenerated
      side carries the new word and the file on disk does not;
    * somebody edited the generated file -- the file on disk carries something
      the generator would never write.

    Compared as text with line endings normalised, because this tree is checked
    out with ``core.autocrlf=true`` and git stores LF; everything inside a line,
    trailing whitespace included, is compared exactly.
    """
    drift = G.check(GENERATED)
    assert not drift, (
        "apps/viewer/vocab.gen.js is not what scripts/generate_js_vocabulary.py "
        "would write.\n\n" + drift + "\n"
        "If a Python vocabulary moved, regenerate:\n"
        "  venv-win/Scripts/python.exe scripts/generate_js_vocabulary.py\n"
        "If the diff shows a hand edit to the generated file, revert it and make "
        "the change in the Python definition named beside that vocabulary -- the "
        "file says GENERATED at the top and both apps read it."
    )


def test_the_comparison_sees_a_python_edit_nobody_regenerated(monkeypatch):
    """The first failure direction, watched biting.

    The registry is made to read one extra word out of ``tolerance_stack``
    without the file on disk changing -- which is exactly the state the tree is
    in the moment somebody adds a verdict and commits. A comparison that could
    not see this would be the whole guard missing.
    """
    moved = tuple(
        V.Vocabulary(v.app, v.name, v.where,
                     (lambda: ("pass", "marginal", "fail", "indeterminate"))
                     if (v.app, v.name) == ("viewer", "VERDICTS") else v.read)
        for v in V.VOCABULARIES
    )
    monkeypatch.setattr(V, "VOCABULARIES", moved)
    drift = G.check(GENERATED)
    assert "indeterminate" in drift, (
        "a Python vocabulary grew a word and the comparison stayed green:\n" + drift)


def test_the_comparison_sees_a_hand_edit_to_the_generated_file(tmp_path):
    """The second failure direction, watched biting.

    A copy of the live file with one word misspelled is what a hand edit looks
    like, and it must not pass. ``check()`` takes the path so this needs no
    write into the real tree.
    """
    edited = tmp_path / "vocab.gen.js"
    text = GENERATED.read_text(encoding="utf-8")
    assert '"budget"' in text, "the fixture edit below no longer bites"
    edited.write_text(text.replace('"budget"', '"budgets"'), encoding="utf-8")

    drift = G.check(edited)
    assert "budgets" in drift, (
        "a hand edit to the generated file left the comparison green:\n" + drift)


def test_a_missing_generated_file_is_reported_rather_than_skipped(tmp_path):
    """The vacuity case: no file at all must not read as "nothing to compare"."""
    assert "does not exist" in G.check(tmp_path / "not_here.js")


# --------------------------------------------------------------------------- #
# 2. the registry cannot be vacuous                                           #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "vocabulary", V.VOCABULARIES,
    ids=[f"{v.app}.{v.name}" for v in V.VOCABULARIES])
def test_every_registered_vocabulary_reads_back_words(vocabulary):
    """Each reader returns a non-empty tuple of plain strings.

    An empty one would render as ``NAME: []`` and make every ``VOCAB.table()``
    that names it throw for every key -- loud, but only once the app loads. This
    says which reader went blind, and in under a second.
    """
    words = vocabulary.read()
    assert words, (
        f"{vocabulary.app}.{vocabulary.name} read back empty from "
        f"{vocabulary.where}"
    )
    assert all(isinstance(word, str) and word for word in words), words
    assert len(set(words)) == len(words), f"a word twice: {words}"


def test_no_vocabulary_is_registered_twice_and_both_apps_are_covered():
    """The registry's own shape: one entry per (app, name), and nothing stranded.

    An app in :data:`js_vocabulary.APPS` with no vocabularies would render an
    empty ``namespace()`` block and every ``VOCAB.list`` call in it would throw --
    which is a real state to be in mid-refactor and not one to discover in a
    browser.
    """
    keys = [(v.app, v.name) for v in V.VOCABULARIES]
    assert len(keys) == len(set(keys)), "a vocabulary is registered twice"
    assert {v.app for v in V.VOCABULARIES} == set(V.APPS)
    for app in V.APPS:
        assert V.for_app(app), f"no vocabularies registered for {app!r}"


# --------------------------------------------------------------------------- #
# 3. every surface that reads a vocabulary loads the module                   #
# --------------------------------------------------------------------------- #

#: Each consumer of the generated module, and the reference it must carry. A
#: page or a runner that does not load it does not fail *later* -- it throws on
#: the first ``VOCAB.list`` call, which is at load, so this is belt and braces.
#: It is here because the repo has twice shipped a module one tier loaded and
#: another did not (``apps/viewer/tests.js``'s lightbox check is the other
#: instance), and that is a whole tier passing over code it never ran.
LOADERS = (
    ("apps/viewer/topology.html", '<script src="./vocab.gen.js"></script>'),
    ("apps/viewer/test.html", '<script src="./vocab.gen.js"></script>'),
    ("apps/viewer/run_tests.cjs", '"vocab.gen.js"'),
    ("apps/annotate/index.html", '<script src="../viewer/vocab.gen.js"></script>'),
    ("apps/annotate/run_tests.cjs", '"..", "viewer", "vocab.gen.js"'),
)


@pytest.mark.parametrize("relpath,reference", LOADERS, ids=[p[0] for p in LOADERS])
def test_every_page_and_runner_loads_the_generated_module(relpath, reference):
    text = (REPO_ROOT / relpath).read_text(encoding="utf-8")
    assert reference in text, (
        f"{relpath} does not load apps/viewer/vocab.gen.js. Both apps read every "
        "vocabulary out of it, so a surface that skips it throws on the first "
        f"VOCAB.list call. Expected to find: {reference}"
    )


def test_the_generated_module_is_loaded_before_the_files_that_read_it():
    """Order, in the two lists that have one.

    A classic script reading ``window.TolstackVocab`` at load time gets
    ``undefined`` if it runs first. The two HTML pages and the viewer's runner
    list their scripts in load order, so the check is an index comparison.
    """
    pairs = (
        ("apps/viewer/topology.html", "./vocab.gen.js", "./viewer.js"),
        ("apps/viewer/test.html", "./vocab.gen.js", "./viewer.js"),
        ("apps/viewer/run_tests.cjs", '"vocab.gen.js"', '"viewer.js"'),
        ("apps/annotate/index.html", "../viewer/vocab.gen.js", "./binding_state.js"),
    )
    for relpath, first, second in pairs:
        text = (REPO_ROOT / relpath).read_text(encoding="utf-8")
        assert 0 <= text.index(first) < text.index(second), (
            f"{relpath} loads {second} before {first}; the vocabularies must be "
            "defined before anything reads them"
        )


# --------------------------------------------------------------------------- #
# 4. the readers that are more than an attribute lookup                       #
# --------------------------------------------------------------------------- #
#
# Six of the twenty-six vocabularies have no Python constant to import -- they
# are literals in the branches of a function that MINTS the value. Those readers
# walk an AST, and an AST reader that silently follows nothing is the one thing
# that would make the generated file quietly short. These are the shapes they
# must follow and the shapes they must refuse, exercised without a file on disk.


def test_the_worksheet_source_reader_follows_a_conditional_return():
    """The arm that made this reader more than four lines, watched working.

    Both live builders spell their by-name rule as a conditional expression, and a
    reader blind to ``ast.IfExp`` comes back with ``("declared",)`` -- which does
    not redden, it *shrinks the generated vocabulary*, the one direction every
    reader in ``scripts/js_vocabulary.py`` refuses.
    """
    both_rules = (
        "def worksheet_for(path, raw):\n"
        "    if declared:\n"
        "        return resolved, 'declared'\n"
        "    return (by_name, 'by_name') if by_name.exists() else (None, None)\n"
    )
    assert set(V.worksheet_sources_from_source(both_rules, "<test>")) == {
        "declared", "by_name", V.JS_NULL_KEY}

    # A `how` that is not a literal at all: a forwarded value is a vocabulary word
    # this reader cannot resolve, and dropping it quietly is the whole failure mode.
    with pytest.raises(LookupError):
        V.worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None, how\n", "<test>")
    # The pair growing a third element -- the shape a refactor would take.
    with pytest.raises(LookupError):
        V.worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None, 'by_name', 1\n", "<test>")
    # No `worksheet_for` at all, and two of them: both are "the rule moved", and
    # both must raise rather than generate an empty vocabulary.
    with pytest.raises(LookupError):
        V.worksheet_sources_from_source("x = 1\n", "<test>")
    with pytest.raises(LookupError):
        V.worksheet_sources_from_source(both_rules + both_rules, "<test>")
    # A `worksheet_for` that returns nothing this reader recognises.
    with pytest.raises(LookupError):
        V.worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None\n", "<test>")


def test_both_viewer_builders_mint_the_same_worksheet_source_vocabulary():
    """The half :func:`js_vocabulary.worksheet_sources` cannot assert by union.

    Two stdlib-only builders writing one field is a deliberate duplication
    (CLAUDE.md: each viewer builder is self-contained), and the cost of that choice
    is exactly this: the two ``worksheet_for`` rules can drift from each other
    without the viewer noticing, because a topology's projection and a stack's are
    read by the same renderer. The union would absorb the drift silently -- the
    generated file would still be up to date, with the viewer holding a branch for
    a value only one of the two builders can write.
    """
    stack_side = set(V.worksheet_sources_of(V.PROJECTION_SCRIPT))
    topology_side = set(V.worksheet_sources_of(V.TOPOLOGY_PROJECTION_SCRIPT))
    assert stack_side == topology_side, (
        "scripts/build_viewer_projection.py and scripts/build_topology_projection.py "
        "mint different worksheet_source vocabularies:\n"
        f"  only the stack builder: {sorted(stack_side - topology_side)}\n"
        f"  only the topology builder: {sorted(topology_side - stack_side)}\n"
        "They are two copies of one rule on purpose; keep them one rule."
    )


def test_the_values_status_reader_handles_both_spellings_of_the_check():
    """The Python-side branch the live file does not exercise.

    ``thermal.py`` reads its vocabulary out of ``MATERIAL_VALUES_STATUSES`` today,
    so the ``ast.Tuple`` branch of ``_values_statuses_from_source`` -- the shape it
    takes if someone inlines the tuple back into the check -- is never run against
    the real file. Run both here rather than shipping an untested path that only
    wakes up during someone else's refactor.
    """
    via_constant = (
        "VALUES_STATUSES = ('inline', 'library')\n"
        "class MaterialEntry:\n"
        "    def __post_init__(self):\n"
        "        if self.values_status not in VALUES_STATUSES:\n"
        "            raise ValueError('no')\n"
    )
    assert V._values_statuses_from_source(
        via_constant,
        resolve=lambda n: {"VALUES_STATUSES": ("inline", "library")}[n],
    ) == ("inline", "library")

    inline = (
        "class MaterialEntry:\n"
        "    def __post_init__(self):\n"
        "        if self.values_status not in ('inline', 'library'):\n"
        "            raise ValueError('no')\n"
    )
    assert V._values_statuses_from_source(
        inline, resolve=lambda n: ()) == ("inline", "library")

    # No check at all, and two of them: both mean the vocabulary moved, and both
    # must raise rather than generate an empty one.
    with pytest.raises(LookupError):
        V._values_statuses_from_source("x = 1\n", resolve=lambda n: ())
    with pytest.raises(LookupError):
        V._values_statuses_from_source(inline + inline, resolve=lambda n: ())


def test_the_study_error_reader_finds_the_subclasses_and_not_the_base():
    """``VA.STUDY_ERRORS``' domain is introspected, so its scan is asserted.

    ``StudyError`` itself is not a value -- it is never raised -- and a reader
    that included it would put a key on the page's table that no study can ever
    produce. A reader that found nothing would let the table accept anything.
    """
    from tolerance_stack import topology

    names = V.study_error_names()
    assert "StudyError" not in names
    assert names, "the introspection found no StudyError subclasses"
    for name in names:
        cls = getattr(topology, name)
        assert issubclass(cls, topology.StudyError) and cls is not topology.StudyError

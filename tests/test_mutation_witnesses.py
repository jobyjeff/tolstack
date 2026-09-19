"""``scripts/mutation_witnesses.json``, paired with the code it declares mutations in.

The mutation-witness tier (``scripts/run_mutation_witness_tests.mjs``) answers the
question a green suite cannot answer about itself -- *would this guard notice if
the app stopped behaving?* -- by patching a shadow copy of the tree and requiring
the owning tier to go red on a named check. That is the real tier, and it needs a
browser, several minutes and ``--repo`` pointed at the main checkout.

This module is its **cheap half**, and the half that runs on every pytest run: it
never patches anything and never starts a browser. It asks only whether each
declared mutation still *describes a place in the tree*.

Why that is worth its own module. An entry whose ``find`` no longer resolves is
not a failing guard -- it is a guard that quietly stopped being checked, which is
the exact failure mode the whole tier exists to kill, reproduced one level up. A
rename in ``apps/viewer/topology_app.js`` can rot four anchors at once, and
nothing about it looks like a test change; without this module the first symptom
would be a browser run somebody makes time for weeks later.

**An entry couples to the tree with more than its ``find``.** ``expect_red`` names
the sub-check the owning tier must print, and (for a browser entry) ``suite`` names
the registry key that tier's ``--only`` dispatches on. Rewording a sub-check name
or a suite label is a normal, correct edit -- exactly the "the app changed
correctly" change this whole tier was built around -- and it rots those two
strings the same way a rename rots an anchor, with the same silence. Measured
2026-09-15: an ``expect_red`` replaced with ``"a check name nobody prints"`` left
this module at six passed in 0.03s, and the only symptom was a ``NOT WITNESSED``
from a seven-minute browser sweep. So all three strings are paired here, and the
reason is one reason.

What this module does **not** do: it never asserts that a mutation actually
reddens anything. That claim can only be earned by running the tier, and pytest
is not where a 3-minute browser sweep belongs. So a green pytest run means *every
entry still points at real code*, never *every guard still bites*.

Line endings: anchors are authored with ``\\n`` and matched against LF-normalised
source, the same normalisation ``run_mutation_witness_tests.mjs`` does and for the
same reason -- this repo is checked out with git's CRLF translation on, so a
multi-line anchor authored as LF matches nothing on disk.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
TABLE = REPO_ROOT / "scripts" / "mutation_witnesses.json"

#: Every key an entry must carry, and the runner's own ``tier`` vocabulary. Both
#: are stated here rather than inferred, because a typo in a key name is
#: otherwise a silently-ignored field: ``run_mutation_witness_tests.mjs`` reads
#: ``mutation.suite`` and would see ``undefined``, not an error.
REQUIRED_KEYS = frozenset(
    {"id", "contract", "issue", "note", "file", "find", "replace",
     "tier", "suite", "expect_red"}
)
#: ``tier`` names a HARNESS, not a speed -- ``fast`` is the *viewer's* fast
#: runner specifically, which is why the annotate app's own fast runner needed a
#: third word rather than a second meaning for that one
#: (``ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness``,
#: closed 2026-09-16). The two runners are separate harnesses: separate
#: check-name sources, and no suite registry in common.
#: ``python`` is the fourth word (2026-09-18,
#: ``ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard``):
#: the venv interpreter plus ``-m pytest``, handed ONE test file. It is the only
#: tier whose harness is *this* suite, which is why the two constants below
#: exist.
TIERS = frozenset({"fast", "annotate", "browser", "python"})

#: The tiers whose entries carry a ``suite``, and what a ``suite`` MEANS in each:
#: for ``browser`` it is a key the runner's ``--only`` dispatches on, for
#: ``python`` it is the test file pytest is pointed at. Two different things
#: wearing one field name, which is worth stating rather than inferring -- and
#: paired against the runner's own ``suites: true`` flags below, so a tier that
#: grows or loses suites on one side is red on the other.
TIERS_WITH_SUITES = frozenset({"browser", "python"})

#: The one pytest suite a ``python`` entry may never name. This module runs
#: inside the shadow tree when a python entry is witnessed, and with a mutation
#: applied its own ``test_every_anchor_resolves_to_exactly_one_place`` reddens --
#: correctly, because the shadow's copy of the table declares a ``find`` the
#: shadow's mutated file no longer holds. An entry pointing here would be
#: "witnessed" by that, for any mutation whatsoever, and would read as coverage
#: for a guard nothing had exercised. ``run_mutation_witness_tests.mjs`` refuses
#: it too (``SELF_PAIRING_SUITE``); this half says so in a second, with no
#: browser and no shadow.
SELF_PAIRING_SUITE = "tests/test_mutation_witnesses.py"

#: Where each tier's sub-check NAMES are written -- which ``expect_red`` copies
#: verbatim. Note what the fast tier's entry is *not*: the tier is invoked as
#: ``apps/viewer/run_tests.cjs``, but that file is only the harness; the names
#: live in the suite it loads. A vocabulary like this is a module-level constant
#: and never an inline literal (``CLAUDE.md``, and ``docs/prompts/REVIEW_AGENT.md``
#: on documented vocabularies drifting from the data they describe).
CHECK_SOURCE = {
    "fast": "apps/viewer/tests.js",
    # ...and note what the annotate row IS: that runner is both the harness and
    # the file its check names are written in, because it has no separate suite
    # to load -- the asymmetry with the row above is real, not a mistake.
    "annotate": "apps/annotate/run_tests.cjs",
    "browser": "scripts/run_viewer_browser_tests.mjs",
    # ``None`` is a statement, not an omission: pytest has no one file its check
    # names live in -- each python entry's ``suite`` IS that file, and
    # ``check_source_of()`` is where that is read. Keeping the row (rather than
    # leaving ``python`` out of this map) is what keeps
    # ``test_the_check_source_map_covers_the_tier_vocabulary`` able to catch a
    # fifth tier added with no thought about where its names come from.
    "python": None,
}

#: A ``python`` entry's ``expect_red`` is a test FUNCTION name, off pytest's
#: ``FAILED <file>::<name>`` summary line -- an exact identifier rather than a
#: prose sub-check. This is how it is looked for in the suite file: the ``def``
#: that defines it, which is also what makes "declared twice" and "not there at
#: all" distinguishable.
PYTEST_DEF = "def {name}("

#: The runner's own copy of the tier vocabulary: one ``TIER_HARNESS`` object
#: keyed by tier word, holding the script to spawn, the regex its failure lines
#: match and whether it takes a ``--only <suite>``. Paired against ``TIERS``
#: below, because a word that exists on one side and not the other is the
#: failure this whole tier was built to kill, one level up: the runner would
#: throw ``unknown tier`` several minutes into a browser sweep, or a tier word
#: would sit in ``TIERS`` with nothing able to run it.
RUNNER = "scripts/run_mutation_witness_tests.mjs"

#: One ``<word>: {`` key of that object, at its one indentation level.
TIER_HARNESS_KEY = re.compile(r"^  (\w+): \{$", re.MULTILINE)

#: The file holding the ``SUITES`` registry a browser entry's ``suite`` filters
#: on. Its keys are the labels the suites print; ``--only`` matches a substring
#: of one, and ``mutation_witnesses.json`` holds whole ones.
SUITE_REGISTRY = "scripts/run_viewer_browser_tests.mjs"

#: A sub-check name too long for one source line is written as adjacent string
#: literals -- ``"the bar carries that one sentence " +\n  "and nothing else"`` --
#: so a naive substring search for the joined name finds nothing. Closing the
#: seam before searching is what makes this scan work at all.
CONCATENATION_SEAM = re.compile(r'"\s*\+\s*"')

#: One ``["<label>", (label) => ...]`` row of the ``SUITES`` registry.
SUITE_ROW = re.compile(r'^\s*\["((?:[^"\\]|\\.)*)",', re.MULTILINE)


@pytest.fixture(scope="module")
def mutations() -> tuple[dict, ...]:
    table = json.loads(TABLE.read_text(encoding="utf-8"))
    entries = tuple(table["mutations"])
    # A scan that silently finds nothing is a guard that passes against
    # anything -- the rule test_architecture_inventory.py states and this
    # borrows.
    assert entries, f"{TABLE.name} declares no mutations at all"
    return entries


def source_of(relative: str) -> str:
    return (REPO_ROOT / relative).read_text(encoding="utf-8").replace("\r\n", "\n")


def joined_source(relative: str) -> str:
    """``source_of`` with every ``" + "`` seam between string literals closed.

    Only for searching for a *name*, never for anchors: it deliberately
    misrepresents the file's text, joining literals that the JS engine joins too.
    """
    return CONCATENATION_SEAM.sub("", source_of(relative))


def check_source_of(entry: dict) -> str:
    """The file whose text holds this entry's ``expect_red``.

    One file per tier for the three node tiers; for ``python`` it is the entry's
    own ``suite``, because that is what "where the check names are written"
    means for pytest.
    """
    return CHECK_SOURCE[entry["tier"]] or entry["suite"]


def expect_red_hits(entry: dict) -> int:
    """How many places in that file declare this entry's ``expect_red``."""
    relative = check_source_of(entry)
    if entry["tier"] == "python":
        return source_of(relative).count(PYTEST_DEF.format(name=entry["expect_red"]))
    return joined_source(relative).count(entry["expect_red"])


def runner_tier_harness() -> dict[str, bool]:
    """The runner's ``TIER_HARNESS``, as ``{tier word: takes a suite}``.

    Read out of the source for the same reason the suite registry is: a copy
    here would be the duplication the pairing exists to catch.
    """
    source = source_of(RUNNER)
    start = source.index("const TIER_HARNESS = {")
    block = source[start:source.index("\n};", start)]
    bounds = [m.start() for m in TIER_HARNESS_KEY.finditer(block)] + [len(block)]
    keys = TIER_HARNESS_KEY.findall(block)
    return {
        key: "suites: true" in block[bounds[i]:bounds[i + 1]]
        for i, key in enumerate(keys)
    }


def suite_registry_keys() -> tuple[str, ...]:
    """The labels ``SUITES`` in the browser runner dispatches on.

    Read out of the source rather than restated here: a copy in this file would
    be the very duplication the registry was single-sourced to remove.
    """
    source = source_of(SUITE_REGISTRY)
    start = source.index("const SUITES = [")
    end = source.index("\n    ];", start)
    return tuple(SUITE_ROW.findall(source[start:end]))


def test_every_entry_carries_the_whole_shape(mutations):
    """A missing key is a field the runner reads as ``undefined``, not an error."""
    for entry in mutations:
        assert set(entry) == REQUIRED_KEYS, (
            f"{entry.get('id', '<no id>')}: keys are {sorted(entry)}, "
            f"expected {sorted(REQUIRED_KEYS)}"
        )
        assert entry["tier"] in TIERS, (
            f"{entry['id']}: tier {entry['tier']!r} is not one of {sorted(TIERS)}"
        )
        # A `suite` is the browser runner's --only filter, or the pytest tier's
        # test file; neither fast tier has one.
        if entry["tier"] in TIERS_WITH_SUITES:
            assert entry["suite"], (
                f"{entry['id']}: a {entry['tier']} entry must name a suite"
            )
        else:
            assert entry["suite"] is None, (
                f"{entry['id']}: tier {entry['tier']!r} takes no suite"
            )


def test_every_id_is_unique(mutations):
    """``--only`` matches on a substring of the id, and the summary lists ids."""
    ids = [entry["id"] for entry in mutations]
    assert len(set(ids)) == len(ids), f"duplicate ids in {TABLE.name}: {sorted(ids)}"


def test_every_anchor_resolves_to_exactly_one_place(mutations):
    """The whole point of this module.

    Zero matches means the entry is checking nothing; two means the patch would
    land somewhere the author did not mean. Either is a defect in the table, not
    in the app.
    """
    for entry in mutations:
        path = REPO_ROOT / entry["file"]
        assert path.is_file(), f"{entry['id']}: {entry['file']} is not in the tree"
        hits = source_of(entry["file"]).count(entry["find"])
        assert hits == 1, (
            f"{entry['id']}: its `find` matches {hits} places in {entry['file']} "
            f"(expected exactly 1). The anchor has rotted -- re-point it at the "
            f"code the entry means, or retire the entry. Anchor:\n"
            f"{entry['find']}"
        )


def test_the_runner_and_this_module_hold_the_same_tier_vocabulary():
    """``TIER_HARNESS``'s keys are the words the runner can actually spawn."""
    harness = runner_tier_harness()
    assert harness, (
        f"no TIER_HARNESS keys found in {RUNNER} -- the reader has rotted, so "
        f"this pairing is passing against nothing"
    )
    assert set(harness) == set(TIERS), (
        f"{RUNNER}'s TIER_HARNESS covers {sorted(harness)}, TIERS is "
        f"{sorted(TIERS)}. A tier word in one and not the other is either an "
        f"entry nothing can run, or a harness no entry may name."
    )


def test_the_two_sides_agree_on_which_tiers_take_a_suite():
    """``suites: true`` over there, ``TIERS_WITH_SUITES`` here.

    Disagreement is silent in both directions and neither is a red anywhere
    else: a tier this module lets carry a ``suite`` that the runner does not
    pass on runs the whole harness and attributes the wrong red, and a tier the
    runner filters by a ``suite`` this module requires to be ``null`` is handed
    ``undefined``.
    """
    takes_a_suite = {tier for tier, suited in runner_tier_harness().items() if suited}
    assert takes_a_suite == set(TIERS_WITH_SUITES), (
        f"{RUNNER} passes a suite for {sorted(takes_a_suite)}, "
        f"TIERS_WITH_SUITES is {sorted(TIERS_WITH_SUITES)}"
    )


def test_the_check_source_map_covers_the_tier_vocabulary():
    """A tier with no entry here would silently skip the ``expect_red`` pairing."""
    assert set(CHECK_SOURCE) == set(TIERS), (
        f"CHECK_SOURCE covers {sorted(CHECK_SOURCE)}, TIERS is {sorted(TIERS)}"
    )
    for tier, relative in CHECK_SOURCE.items():
        # `None` is the pytest tier's honest answer -- its names are per entry.
        if relative is None:
            assert tier in TIERS_WITH_SUITES, (
                f"CHECK_SOURCE[{tier!r}] is None, which means 'the entry's own "
                f"suite names the file' -- but {tier!r} carries no suite"
            )
            continue
        assert (REPO_ROOT / relative).is_file(), (
            f"CHECK_SOURCE[{tier!r}] names {relative}, which is not in the tree"
        )


def test_every_expect_red_resolves_to_exactly_one_place(mutations):
    """``find``'s other half: the sub-check name the tier must PRINT.

    Zero matches means the entry can never be witnessed -- the runner will find
    the tier red on some other check and report a miss, but only after a browser
    sweep. Two means the runner cannot attribute the red either, which is the
    same defect one step along, so uniqueness is asserted in the SOURCE and not
    per entry: three of the preference siblings deliberately share one sub-check.

    A ``python`` entry declares a test function name rather than a prose
    sub-check, so what is counted is the ``def`` in the entry's own suite file --
    see ``expect_red_hits``. Same question, same two failure modes.
    """
    for entry in mutations:
        relative = check_source_of(entry)
        hits = expect_red_hits(entry)
        assert hits == 1, (
            f"{entry['id']}: its `expect_red` matches {hits} places in {relative} "
            f"(expected exactly 1). A reworded sub-check name leaves the entry "
            f"declaring a red nothing can produce -- re-copy the name verbatim off "
            f"the tier's output, or retire the entry. Declared:\n"
            f"{entry['expect_red']}"
        )


def test_every_browser_entry_names_a_suite_the_registry_dispatches_on(mutations):
    """``suite`` is passed straight to the browser runner's ``--only``.

    The registry keys are the labels the suites print, and they are what ``--only``
    matches a substring of. A reworded label leaves this table holding the old one,
    and the runner answers ``--only "<stale key>"`` with *matches no suite* -- an
    honest red, several minutes in, on a run somebody had to make time for.
    """
    keys = suite_registry_keys()
    assert keys, f"no SUITES rows found in {SUITE_REGISTRY} -- the reader has rotted"
    assert len(set(keys)) == len(keys), (
        f"duplicate SUITES keys in {SUITE_REGISTRY}: {sorted(keys)}"
    )
    for entry in mutations:
        if entry["tier"] != "browser":
            continue
        assert entry["suite"] in keys, (
            f"{entry['id']}: names suite {entry['suite']!r}, which no longer matches "
            f"a SUITES key in {SUITE_REGISTRY}. The keys are:\n  "
            + "\n  ".join(keys)
        )


def test_every_python_entry_names_a_test_file_the_shadow_can_run(mutations):
    """``suite`` is the path pytest is handed, resolved inside the shadow tree.

    Three things have to hold and none of them is checkable from the entry
    alone: the file is in the tree, it is under ``tests/`` (which is what
    ``SHADOWED`` copies), and it is not this module (``SELF_PAIRING_SUITE`` --
    the re-entrancy that would witness every mutation and prove none).
    """
    for entry in mutations:
        if entry["tier"] != "python":
            continue
        suite = entry["suite"]
        assert (REPO_ROOT / suite).is_file(), (
            f"{entry['id']}: names suite {suite!r}, which is not in the tree"
        )
        assert suite.startswith("tests/"), (
            f"{entry['id']}: names suite {suite!r}, outside tests/ -- the shadow "
            f"tree copies tests/ and tolerance_stack/, so pytest would be handed "
            f"a path that is not there"
        )
        assert suite != SELF_PAIRING_SUITE, (
            f"{entry['id']}: names {SELF_PAIRING_SUITE}, which no entry may -- "
            f"with a mutation applied, that module's anchor check reddens for "
            f"every entry, so the witness would pass against anything"
        )


def test_no_mutation_is_a_no_op(mutations):
    """``find == replace`` would patch a file into itself and witness nothing."""
    for entry in mutations:
        assert entry["find"] != entry["replace"], (
            f"{entry['id']}: `find` and `replace` are the same text"
        )


def test_the_issue_each_entry_cites_is_in_the_tree(mutations):
    """A cited issue that has been renamed sends the next reader nowhere.

    ``issue: null`` is the honest value for an entry nobody filed a bug about --
    the guards that were already sound when they were entered.
    """
    for entry in mutations:
        if entry["issue"] is None:
            continue
        assert (REPO_ROOT / entry["issue"]).is_file(), (
            f"{entry['id']}: cites {entry['issue']}, which is not in the tree"
        )


def test_the_anchor_reader_can_fail():
    """The scanner itself, proven falsifiable on a string nothing contains."""
    assert source_of("scripts/mutation_witnesses.json").count(
        "this text is in no file in this repo, by construction") == 0
    for relative in CHECK_SOURCE.values():
        if relative is None:  # the pytest tier: its names are per entry
            continue
        assert joined_source(relative).count(
            "this text is in no file in this repo, by construction") == 0


def test_closing_the_concatenation_seam_is_load_bearing(mutations):
    """At least one declared name only resolves once the ``" + "`` seams are closed.

    Without this, a ``CONCATENATION_SEAM`` that had stopped matching anything
    would leave the pairing above green purely because every name in the table
    happened to fit on one line -- and the next long one would be unpaired with
    nothing to say so.
    """
    joined_only = [
        entry["id"] for entry in mutations
        # A python entry's name is an identifier on one line, so the seam
        # question does not arise for it -- and it must not be allowed to
        # satisfy this check either way.
        if entry["tier"] != "python"
        and source_of(CHECK_SOURCE[entry["tier"]]).count(entry["expect_red"]) == 0
        and joined_source(CHECK_SOURCE[entry["tier"]]).count(entry["expect_red"]) == 1
    ]
    assert joined_only, (
        "no declared `expect_red` needs the seams closed to resolve, so this "
        "module cannot tell a working CONCATENATION_SEAM from a dead one. Either "
        "the sub-check names are all short now -- in which case say so and drop "
        "the joining -- or the regex has stopped matching."
    )

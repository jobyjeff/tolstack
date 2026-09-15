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
TIERS = frozenset({"fast", "browser"})

#: Where each tier's sub-check NAMES are written -- which ``expect_red`` copies
#: verbatim. Note what the fast tier's entry is *not*: the tier is invoked as
#: ``apps/viewer/run_tests.cjs``, but that file is only the harness; the names
#: live in the suite it loads. A vocabulary like this is a module-level constant
#: and never an inline literal (``CLAUDE.md``, and ``docs/prompts/REVIEW_AGENT.md``
#: on documented vocabularies drifting from the data they describe).
CHECK_SOURCE = {
    "fast": "apps/viewer/tests.js",
    "browser": "scripts/run_viewer_browser_tests.mjs",
}

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
        # The browser runner's --only filter; the fast tier has no suites.
        if entry["tier"] == "browser":
            assert entry["suite"], f"{entry['id']}: a browser entry must name a suite"
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


def test_the_check_source_map_covers_the_tier_vocabulary():
    """A tier with no entry here would silently skip the ``expect_red`` pairing."""
    assert set(CHECK_SOURCE) == set(TIERS), (
        f"CHECK_SOURCE covers {sorted(CHECK_SOURCE)}, TIERS is {sorted(TIERS)}"
    )
    for tier, relative in CHECK_SOURCE.items():
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
    """
    for entry in mutations:
        relative = CHECK_SOURCE[entry["tier"]]
        hits = joined_source(relative).count(entry["expect_red"])
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
        if source_of(CHECK_SOURCE[entry["tier"]]).count(entry["expect_red"]) == 0
        and joined_source(CHECK_SOURCE[entry["tier"]]).count(entry["expect_red"]) == 1
    ]
    assert joined_only, (
        "no declared `expect_red` needs the seams closed to resolve, so this "
        "module cannot tell a working CONCATENATION_SEAM from a dead one. Either "
        "the sub-check names are all short now -- in which case say so and drop "
        "the joining -- or the regex has stopped matching."
    )

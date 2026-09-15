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

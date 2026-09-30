"""``scripts/mutation_witnesses/``, paired with the guards it declares mutations for.

The mutation-witness tier (``scripts/run_mutation_witness_tests.mjs``) answers the
question a green suite cannot answer about itself -- *would this guard notice if
the app stopped behaving?* -- by patching a shadow copy of the tree and requiring
the owning tier to go red on a named check. That is the real tier, and it needs a
browser, several minutes and ``--repo`` pointed at the main checkout.

This module is its **cheap half**, and the half that runs on every pytest run: it
never patches anything and never starts a browser. It asks three questions; the
second arrived 2026-09-23 and the third 2026-09-30.

**Does every mutation still describe a place in the tree?** A spec whose ``find``
no longer resolves is not a failing guard -- it is a guard that quietly stopped
being checked, which is the exact failure mode the whole tier exists to kill,
reproduced one level up. A rename in ``apps/viewer/topology_app.js`` can rot four
anchors at once, and nothing about it looks like a test change; without this
module the first symptom would be a browser run somebody makes time for weeks
later.

**And does the enrollment census still hold?** Until 2026-09-23 a guard and its
witness were two hand-kept lists joined by a hand-written id, so *"this guard has
no witness"* was a fact nobody could compute: it could only be noticed, one guard
at a time, by a reviewer, and written into an issue. Fourteen of those were open
at once and six enrollment handoffs in eight days did not move the arrival rate
(``docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md``). Now the guard
declarations in the tree ARE the enumeration
(``scripts/guard_enumeration.mjs``), a spec is named for the guard it witnesses,
and the guard SET per source is pinned -- so a guard added without a spec moves
a pin and is red here in under a second, naming the file to write.

**And does the scan agree with what the tiers actually run?** The pins above all
say how many guards ``scripts/guard_enumeration.mjs`` FOUND; none of them says
whether it found them all. A guard written in a shape its regex does not match
-- ``test('…')`` in single quotes, a name handed in by a helper -- runs, passes,
and is invisible to the census in both directions at once: not counted, so not
enrollable, so never reported as needing a spec. So the two fast tiers are
spawned (``--executed``, a couple of seconds) and the names they print are
paired against the names the scan read. A reviewer did that pairing by hand on
2026-09-23 and got exact agreement twice; this is that measurement made to
happen on every run. The browser tier is the one source pairable neither
cheaply nor in principle -- ``UNPAIRED_TIER`` below says why -- and what remains
uncovered after all of this is emitted by ``CENSUS_LIMITS`` rather than left in
a review report (``ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent``).

Three couplings follow from deriving the name, and each replaces something
weaker:

* **A renamed guard is a loud orphan.** Its spec's derived file name stops
  matching, and ``test_every_spec_is_named_for_the_guard_it_witnesses`` prints
  the name to rename it to. Before, a reworded sub-check left the spec declaring
  a red nothing could produce, and the only symptom was a ``NOT WITNESSED`` from
  a seven-minute browser sweep (measured 2026-09-15).
* **``expect_red`` is checked for MEMBERSHIP, not for a substring.** The old
  pairing counted occurrences of the name in the check source, so a name that
  happened to sit in a comment resolved, and a name cut short resolved too --
  the prefix case needed a test of its own
  (``test_no_expect_red_is_a_truncated_check_name``, 2026-09-18, retired here
  because equality against the enumeration cannot be satisfied by a prefix;
  ``ISSUE_20260922_the_truncated_check_name_guard_crashes_instead_of_reporting_when_the_name_is_absent``
  went with it).
* **Two specs cannot collide on one guard.** The file name is derived, so a
  guard has at most one spec file -- holding a LIST of mutations, because a
  guard worth witnessing is often worth witnessing from more than one
  direction.

A ``python`` spec (2026-09-18) is the one that cannot be censused: pytest has no
single file its guards are written in, and whether a given test file is one the
shadow could even run is not cheaply decidable. Its ``suite`` is the test file
pytest is handed and its ``expect_red`` is a test FUNCTION's name, looked for as
a ``def`` in that file.

What this module does **not** do: it never asserts that a mutation actually
reddens anything. That claim can only be earned by running the tier, and pytest
is not where a 3-minute browser sweep belongs. So a green pytest run means
*every spec still points at real code and no guard arrived unenrolled*, never
*every guard still bites*.

Line endings: anchors are authored with ``\\n`` and matched against LF-normalised
source, the same normalisation ``run_mutation_witness_tests.mjs`` does and for the
same reason -- this repo is checked out with git's CRLF translation on, so a
multi-line anchor authored as LF matches nothing on disk.

Node: this module spawns ``scripts/guard_enumeration.mjs`` rather than
reimplementing its scanners in Python. Two scanners that agree today is the same
defect as two hand-kept lists that agree today, and the runner -- which needs the
same answer -- cannot call the venv interpreter, because ``venv-win/`` exists
only in the main checkout. ``node`` is already a hard requirement of this suite
through ``tests/test_viewer_js_suite.py``.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
#: The enumeration, and the only thing this module shells out for.
ENUMERATION = REPO_ROOT / "scripts" / "guard_enumeration.mjs"
#: One file per witnessed guard, named for the guard.
SPEC_DIR = REPO_ROOT / "scripts" / "mutation_witnesses"
#: The prose that used to be the table's ``about`` block, and the one document
#: under ``SPEC_DIR`` that is not a spec.
SPEC_README = SPEC_DIR / "README.md"

#: Every key a spec must carry, and every key one of its mutations must. Both
#: are stated here rather than inferred, because a typo in a key name is
#: otherwise a silently-ignored field: ``run_mutation_witness_tests.mjs`` reads
#: ``spec.suite`` and would see ``undefined``, not an error.
SPEC_KEYS = frozenset({"tier", "suite", "expect_red", "mutations"})
MUTATION_KEYS = frozenset({"contract", "issue", "note", "file", "find", "replace"})

#: ``tier`` names a HARNESS, not a speed -- ``fast`` is the *viewer's* fast
#: runner specifically, which is why the annotate app's own fast runner needed a
#: third word rather than a second meaning for that one
#: (``ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness``,
#: closed 2026-09-16). The two runners are separate harnesses: separate
#: check-name sources, and no suite registry in common.
#: ``python`` is the fourth word (2026-09-18,
#: ``ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard``):
#: the venv interpreter plus ``-m pytest``, handed ONE test file.
#:
#: The word is now written in FOUR places and all four are paired against this
#: one on every pytest run: ``TIER_HARNESS`` (how to run the tier),
#: ``GUARD_SOURCES`` (where to read its guard names), the spec README's tier
#: list (what to tell an author) and this constant. The README used to be an
#: unpaired copy that said the words lived "in exactly two places"
#: (``ISSUE_20260918_the_witness_tables_about_block_is_a_third_unpaired_copy_of_the_tier_vocabulary``).
TIERS = frozenset({"fast", "annotate", "browser", "python"})

#: The tiers whose specs carry a ``suite``, and what a ``suite`` MEANS in each:
#: for ``browser`` it is a key the runner's ``--only`` dispatches on, for
#: ``python`` it is the test file pytest is pointed at. Two different things
#: wearing one field name, which is worth stating rather than inferring -- and
#: paired against the runner's own ``suites: true`` flags below, so a tier that
#: grows or loses suites on one side is red on the other.
TIERS_WITH_SUITES = frozenset({"browser", "python"})

#: The one tier the enumeration deliberately does not cover, and therefore the
#: one whose ``expect_red`` is paired against the spec's own ``suite`` file.
UNCENSUSED_TIER = "python"

#: The one CENSUSED tier whose scan is never paired against a run of it. The
#: browser tier needs a real Chrome and several minutes, and -- the reason that
#: actually decides it -- one declared name may be run by two suites while most
#: of its template names interpolate a live number, so ``declared == executed``
#: is false there by construction rather than by cost. Its pins still hold;
#: only the evidence that the SCANNER is right is missing, which is
#: ``CENSUS_LIMITS.browser_scan_unverified``.
UNPAIRED_TIER = "browser"

#: Every value ``DECLARED_GUARDS`` pins per source, and every value
#: ``test_the_enrollment_census_holds`` reads. Paired, so a fourth pin cannot
#: be added on the JS side with nothing here asserting on it.
PINS = frozenset({"declared", "enrollable", "names"})

#: What the census states it cannot see, paired key-for-key against
#: ``CENSUS_LIMITS`` (``scripts/guard_enumeration.mjs``). The limits are the
#: deliverable, not a comment: every one of the three arrivals closed on
#: 2026-09-30 had been sitting in the mechanism unnamed until a reviewer went
#: looking, so what is STILL uncovered is emitted by the tooling on every
#: census run. Pairing the keys here is what stops one being quietly dropped
#: (a gate that grew a bypass) or added without anyone weighing it.
CENSUS_LIMIT_KEYS = frozenset({
    "python_not_censused",
    "browser_scan_unverified",
    "incomplete_run_pairs_one_way",
    "digest_names_no_name",
    "pin_raised_without_a_spec",
})

#: The one pytest suite a ``python`` spec may never name. This module runs
#: inside the shadow tree when a python spec is witnessed, and with a mutation
#: applied its own ``test_every_anchor_resolves_to_exactly_one_place`` reddens --
#: correctly, because the shadow's copy of the spec declares a ``find`` the
#: shadow's mutated file no longer holds. A spec pointing here would be
#: "witnessed" by that, for any mutation whatsoever, and would read as coverage
#: for a guard nothing had exercised. ``run_mutation_witness_tests.mjs`` refuses
#: it too (``SELF_PAIRING_SUITE``); this half says so in a second, with no
#: browser and no shadow.
SELF_PAIRING_SUITE = "tests/test_mutation_witnesses.py"

#: A ``python`` spec's ``expect_red`` is a test FUNCTION name, off pytest's
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

#: One entry's ``script:`` -- the path array the harness spawns, or ``null``
#: for the tier whose command is an interpreter. Paired against
#: ``GUARD_SOURCES[tier].runner``, which is the other side's name for the same
#: file: the census cannot pair a scan against a run of the WRONG runner.
TIER_HARNESS_SCRIPT = re.compile(r"script: (\[[^\]]*\]|null),")
SCRIPT_SEGMENT = re.compile(r'"([^"]+)"')

#: The file holding the ``SUITES`` registry a browser spec's ``suite`` filters
#: on. Its keys are the labels the suites print; ``--only`` matches a substring
#: of one, and a spec holds a whole one.
SUITE_REGISTRY = "scripts/run_viewer_browser_tests.mjs"

#: A sub-check name too long for one source line is written as adjacent string
#: literals -- ``"the bar carries that one sentence " +\n  "and nothing else"`` --
#: so a naive substring search for the joined name finds nothing. The
#: enumeration closes these seams before it scans; this copy exists only so
#: ``test_closing_the_concatenation_seam_is_load_bearing`` can prove the
#: enumeration's copy is doing something.
CONCATENATION_SEAM = re.compile(r'"\s*\+\s*"')

#: One ``["<label>", (label) => ...]`` row of the ``SUITES`` registry.
SUITE_ROW = re.compile(r'^\s*\["((?:[^"\\]|\\.)*)",', re.MULTILINE)

#: One bullet of the spec README's tier list: ``  - `fast` -- ...``. Anchored on
#: the list's own column and on the backticks, because every tier word also
#: appears inside the prose of the bullets around it.
README_TIER_BULLET = re.compile(r"^  - `(\w+)` — ", re.MULTILINE)

#: A ``skip(...)`` arm carrying the same words as its ``test(...)`` one. Not a
#: declaration -- only the test arm can print the ``FAIL  <name>`` line a red is
#: attributed to -- so the enumeration passes it over, and
#: ``test_passing_over_the_skip_arm_is_load_bearing`` proves it still does.
SKIP_DECLARATION = 'skip("'


def _enumerate(*extra: str) -> dict:
    """``scripts/guard_enumeration.mjs --json``, with whatever else is asked."""
    node = shutil.which("node")
    assert node, (
        "node is not on PATH, so the guard enumeration did not run -- which is "
        "not the same as passing. Install node, or run "
        "`node scripts/guard_enumeration.mjs` wherever it is available."
    )
    proc = subprocess.run(
        [node, str(ENUMERATION), "--json", *extra],
        cwd=REPO_ROOT, capture_output=True, text=True, encoding="utf-8",
        timeout=600,
    )
    assert proc.returncode == 0, (
        f"{ENUMERATION.name} --json exited {proc.returncode}:\n{proc.stderr}"
    )
    return json.loads(proc.stdout)


@pytest.fixture(scope="module")
def enumeration() -> dict:
    """``scripts/guard_enumeration.mjs --json``: the guards the tree declares."""
    return _enumerate()


@pytest.fixture(scope="module")
def pairing() -> tuple[dict, ...]:
    """...and what the two fast tiers ACTUALLY RAN, with ``--executed``.

    A second spawn rather than a field on the fixture above, because this one
    runs two node test suites (a couple of seconds) and every other test in
    this module wants only the scan.
    """
    return tuple(_enumerate("--executed")["pairs"])


@pytest.fixture(scope="module")
def specs() -> tuple[tuple[str, dict], ...]:
    """Every spec on disk, as ``(file name, spec)``."""
    found = tuple(
        (path.name, json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(SPEC_DIR.glob("*.json"))
    )
    # A scan that silently finds nothing is a guard that passes against
    # anything -- the rule test_architecture_inventory.py states and this
    # borrows.
    assert found, f"{SPEC_DIR.name}/ holds no mutation specs at all"
    return found


@pytest.fixture(scope="module")
def mutations(specs) -> tuple[tuple[str, dict, dict], ...]:
    """Every mutation, carrying the spec and file name it was written under."""
    return tuple((name, spec, mutation)
                 for name, spec in specs for mutation in spec["mutations"])


def source_of(relative: str) -> str:
    return (REPO_ROOT / relative).read_text(encoding="utf-8").replace("\r\n", "\n")


def joined_source(relative: str) -> str:
    """``source_of`` with every ``" + "`` seam between string literals closed."""
    return CONCATENATION_SEAM.sub("", source_of(relative))


def runner_tier_blocks() -> dict[str, str]:
    """The runner's ``TIER_HARNESS``, as ``{tier word: that entry's source}``.

    Read out of the source for the same reason the suite registry is: a copy
    here would be the duplication the pairing exists to catch.
    """
    source = source_of(RUNNER)
    start = source.index("const TIER_HARNESS = {")
    block = source[start:source.index("\n};", start)]
    bounds = [m.start() for m in TIER_HARNESS_KEY.finditer(block)] + [len(block)]
    keys = TIER_HARNESS_KEY.findall(block)
    return {key: block[bounds[i]:bounds[i + 1]] for i, key in enumerate(keys)}


def runner_tier_harness() -> dict[str, bool]:
    """``{tier word: takes a suite}``."""
    return {key: "suites: true" in body
            for key, body in runner_tier_blocks().items()}


def runner_tier_scripts() -> dict[str, str | None]:
    """``{tier word: the repo-relative script that harness spawns}``.

    ``python`` has none: its command is the venv interpreter plus ``-m
    pytest``, which is why its ``script`` is written ``null`` rather than left
    out.
    """
    out: dict[str, str | None] = {}
    for key, body in runner_tier_blocks().items():
        found = TIER_HARNESS_SCRIPT.search(body)
        out[key] = None if not found or found[1] == "null" else "/".join(
            SCRIPT_SEGMENT.findall(found[1]))
    return out


def suite_registry_keys() -> tuple[str, ...]:
    """The labels ``SUITES`` in the browser runner dispatches on.

    Read out of the source rather than restated here: a copy in this file would
    be the very duplication the registry was single-sourced to remove.
    """
    source = source_of(SUITE_REGISTRY)
    start = source.index("const SUITES = [")
    end = source.index("\n    ];", start)
    return tuple(SUITE_ROW.findall(source[start:end]))


def declared_names(enumeration: dict) -> dict[str, set[str]]:
    """``{tier: every guard name that tier declares}``."""
    out: dict[str, set[str]] = {tier: set() for tier in enumeration["sources"]}
    for guard in enumeration["guards"]:
        out[guard["tier"]].add(guard["name"])
    return out


def test_every_spec_carries_the_whole_shape(specs):
    """A missing key is a field the runner reads as ``undefined``, not an error."""
    for name, spec in specs:
        assert set(spec) == SPEC_KEYS, (
            f"{name}: keys are {sorted(spec)}, expected {sorted(SPEC_KEYS)}"
        )
        assert spec["tier"] in TIERS, (
            f"{name}: tier {spec['tier']!r} is not one of {sorted(TIERS)}"
        )
        # A `suite` is the browser runner's --only filter, or the pytest tier's
        # test file; neither fast tier has one.
        if spec["tier"] in TIERS_WITH_SUITES:
            assert spec["suite"], (
                f"{name}: a {spec['tier']} spec must name a suite"
            )
        else:
            assert spec["suite"] is None, (
                f"{name}: tier {spec['tier']!r} takes no suite"
            )
        assert spec["mutations"], (
            f"{name}: declares no mutation, so it witnesses nothing. A spec "
            f"with an empty `mutations` list reads as enrollment and is not."
        )
        for mutation in spec["mutations"]:
            assert set(mutation) == MUTATION_KEYS, (
                f"{name}: a mutation's keys are {sorted(mutation)}, "
                f"expected {sorted(MUTATION_KEYS)}"
            )


def test_every_spec_is_named_for_the_guard_it_witnesses(specs, enumeration):
    """The derived name IS the join, so a spec at the wrong one joins nothing.

    This is what makes a renamed guard loud. The name is derived from the tier
    and the guard's own name (``specFileName`` in ``scripts/guard_enumeration.mjs``
    -- derived there and only there, so there is one implementation to be wrong),
    which means a reworded check leaves its spec sitting at a name nothing can
    reach, and this test says so in under a second with the new name to use.
    """
    expected = enumeration["specNames"]
    for name, _spec in specs:
        assert name in expected, (
            f"{name}: the enumeration did not read this file, so it is not a "
            f"spec the runner will run. Is it valid JSON in {SPEC_DIR.name}/?"
        )
        assert expected[name] == name, (
            f"{name}: is named for a guard it does not witness. Rename it to\n"
            f"  {expected[name]}\n"
            f"A spec's file name is derived from its tier and its `expect_red`, "
            f"so this is what a reworded guard looks like from the spec's side: "
            f"re-copy the name verbatim off the tier's output, then rename."
        )


def test_no_spec_names_a_guard_the_tree_does_not_declare(enumeration):
    """The same rename, seen from the enumeration's side.

    A spec can be correctly named for a guard that no longer exists at all --
    the guard deleted, the whole check retired -- and then its file name is
    self-consistent and joins nothing. Only the enumeration can see that.
    """
    orphans = enumeration["orphans"]
    assert not orphans, (
        "these specs name a guard no source in the tree declares:\n" +
        "\n".join(f"  {o['specFile']}\n    {o['tier']}: {o['expect_red']}"
                  for o in orphans) +
        "\nEither the guard was renamed -- re-copy the name and rename the "
        "spec -- or it was retired, in which case delete the spec and lower "
        "that source's number in DECLARED_GUARDS."
    )


def test_every_expect_red_names_a_guard_the_enumeration_found(specs, enumeration):
    """``find``'s other half: the check name the tier must PRINT.

    Membership rather than a substring count, which is what closed the prefix
    hole: the runner compares the declared name to the printed one for EQUALITY,
    so a name cut short can never be witnessed, and a name that resolves only
    because it sits inside a comment never could either.

    A ``python`` spec declares a test function rather than a prose sub-check, so
    what is counted is the ``def`` in the spec's own suite file. Same question,
    same two failure modes -- absent, or declared twice.
    """
    names = declared_names(enumeration)
    for name, spec in specs:
        if spec["tier"] == UNCENSUSED_TIER:
            hits = source_of(spec["suite"]).count(
                PYTEST_DEF.format(name=spec["expect_red"]))
            assert hits == 1, (
                f"{name}: its `expect_red` is defined {hits} times in "
                f"{spec['suite']} (expected exactly 1). A python spec names a "
                f"test FUNCTION, off pytest's `FAILED <file>::<name>` line.\n"
                f"Declared: {spec['expect_red']}"
            )
            continue
        assert spec["expect_red"] in names[spec["tier"]], (
            f"{name}: its `expect_red` is not a guard "
            f"{enumeration['sources'][spec['tier']]['file']} declares. The "
            f"runner compares the declared name to the printed one for "
            f"EQUALITY, so this spec can only ever report NOT WITNESSED. Copy "
            f"the whole name; a long one is split across a `\" + \"` seam and "
            f"the enumeration closes it for you.\n"
            f"Declared:\n{spec['expect_red']}"
        )


def test_every_anchor_resolves_to_exactly_one_place(mutations):
    """The oldest question this module asks.

    Zero matches means the mutation is checking nothing; two means the patch
    would land somewhere the author did not mean. Either is a defect in the
    spec, not in the app.
    """
    for name, _spec, mutation in mutations:
        path = REPO_ROOT / mutation["file"]
        assert path.is_file(), f"{name}: {mutation['file']} is not in the tree"
        hits = source_of(mutation["file"]).count(mutation["find"])
        assert hits == 1, (
            f"{name}: a `find` matches {hits} places in {mutation['file']} "
            f"(expected exactly 1). The anchor has rotted -- re-point it at the "
            f"code the mutation means, or retire it. Anchor:\n"
            f"{mutation['find']}"
        )


def test_the_enrollment_census_holds(enumeration):
    """A guard added without a mutation spec, caught in under a second.

    This is the gate the whole 2026-09-23 rework exists for. Every other test
    here asks whether the specs that EXIST are still true; this one asks whether
    a guard arrived without one. Before it, that question had no cheap answer at
    all -- it was answered by reviewers, one guard at a time, into
    ``docs/issues/``, fourteen of them open at once.

    **Three pins per source, not one** (2026-09-30). A bare cardinality is a
    proxy for a SET, and two of the three ways of arriving unenrolled move no
    cardinality at all -- one guard deleted and one added in the same change
    leaves ``declared`` exactly where it was, and a second declaration of an
    existing NAME is folded into one row, so ``declared`` holds still while an
    enrolled guard slides into the population no spec can witness
    (``ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent``).
    ``PINS`` below is every value the JS side pins and every value this asserts
    on; the third one, ``names``, is what makes the pin a set.
    """
    moved = []
    for row in enumeration["rows"]:
        for stated, against, what in (
            ("declared", "pinned", "{n} declared"),
            ("enrollable", "pinnedEnrollable",
             "{n} enrollable -- a guard has moved into or out of the "
             "population no spec can name, which `declared` alone does not show"),
            ("names", "pinnedNames",
             "the guard NAME SET is {n} -- if `declared` did not also move, "
             "this is a guard swapped for another, or a guard renamed"),
        ):
            if row[stated] != row[against]:
                moved.append(
                    f"  {row['source']}: " + what.format(n=row[stated]) +
                    f", pinned at {row[against]}")
    assert not moved, (
        "the guard census has moved:\n" + "\n".join(moved) +
        "\nIf you added a guard, enrol it in this same change -- that is the "
        "whole of the rule, and it is cheap only while you still remember what "
        "the guard is for. `node scripts/run_mutation_witness_tests.mjs "
        "--unenrolled` prints the file name to write under "
        f"{SPEC_DIR.name}/ and the shape to put in it; "
        "scripts/mutation_witnesses/README.md is the one-page version. Then "
        "write these lines back into DECLARED_GUARDS "
        "(scripts/guard_enumeration.mjs):\n" +
        "\n".join(row["pinLine"] for row in enumeration["rows"]) + "\n"
        "Raising a pin WITHOUT writing a spec is allowed and sometimes "
        "correct -- a guard whose name is interpolated cannot be witnessed at "
        "all -- but it is now a line in a diff somebody reads."
    )


def test_the_census_pins_exactly_the_values_this_module_checks(enumeration):
    """``PINS``, paired against ``DECLARED_GUARDS``'s own value keys.

    The test above reads three values per source by name. A fourth pinned on
    the JS side and not read here would be a pin nothing enforces -- pinned,
    diffed, reviewed, and asserted on by nothing -- which is the shape of
    defect this whole module exists to make loud.
    """
    for tier, pin in enumeration["pinned"].items():
        assert set(pin) == PINS, (
            f"DECLARED_GUARDS[{tier!r}] pins {sorted(pin)}; this module checks "
            f"{sorted(PINS)}"
        )


def _paired(pairing) -> tuple[dict, ...]:
    """The rows a run was actually obtained for."""
    return tuple(row for row in pairing if row["runner"])


def test_the_scan_and_the_run_agree_on_which_guards_exist(pairing):
    """The scanner, made falsifiable -- and arrival (3) closed.

    Every pin in this module says how many guards the SCAN found. None of them
    says whether the scan is *right*, and a guard the scan cannot see is
    invisible in both directions at once: not censused, so not enrollable, so
    never printed by ``--unenrolled``. ``declarationsIn`` requires a ``"…"`` or
    ``` `…` ``` first argument, so ``test('…')`` in single quotes -- or a name
    handed in by a helper or a loop -- runs, prints its name, fails nothing
    here, and enrols in nothing. Zero such declarations existed on 2026-09-23,
    which is a measurement with a shelf life rather than a property.

    A reviewer paired these by hand that day (516/516 and 151/151, exact
    agreement twice). This is that measurement, made to happen every run.

    Two directions, and one of them survives an incomplete run:

    * **ran, and the scan never found it** -- always checked. A tier that
      skipped a sub-tier ran a SUBSET, and a subset still cannot contain a name
      the scan missed.
    * **the scan found it and the tier never ran it** -- checked only when the
      tier reported no ``SKIP``. From a worktree the viewer's ``[real]`` tier
      has no projection and ~94 checks do not run at all, so this direction
      would say nothing there except "you are in a worktree", which
      ``tests/test_viewer_js_suite.py`` already says once and loudly.
    """
    faults = []
    for row in _paired(pairing):
        for name in row["ranNotDeclared"]:
            faults.append(
                f"  {row['runner']} ran {name!r}\n    ...and "
                f"{row['source']}'s scan never found it. Either the guard is "
                f"written in a shape GUARD_SOURCES[{row['tier']!r}] does not "
                f"match -- single quotes, or a name from a helper -- or the "
                f"scanner has rotted. A guard the scan cannot see can never "
                f"be reported unenrolled.")
        for name in row["declaredNotRun"]:
            faults.append(
                f"  {row['source']} declares {name!r}\n    ...and "
                f"{row['runner']} ran no such check. The scan is counting "
                f"something that is not a guard -- a name in dead code, or a "
                f"call the regex matched that is not a declaration -- so the "
                f"census is pinned above the truth.")
        if row["failure"]:
            faults.append(f"  {row['source']}: {row['failure']}")
    assert not faults, (
        "the guard scan and the tier that runs those guards disagree:\n" +
        "\n".join(faults))


def test_no_fast_tier_runs_one_guard_name_twice(pairing):
    """Arrival (2), seen from the run rather than from the pin.

    ``enumerateGuards`` folds two declarations of one name into a single
    unattributable guard, so a second ``test("<an existing name>")`` leaves
    ``declared`` where it was; the ``enrollable`` pin is what catches it in the
    scan. This is the independent half: the tier RUNS both, prints the name
    twice, and a red against that name cannot be attributed to either.
    """
    twice = [(row["runner"], name)
             for row in _paired(pairing) for name in row["ranTwice"]]
    assert not twice, (
        "a fast tier runs one guard name more than once:\n" +
        "\n".join(f"  {runner}: {name!r}" for runner, name in twice) +
        "\nTwo checks under one name are one guard nothing can witness -- a "
        "red names the string, not the check that produced it. Reword one."
    )


def test_the_pairing_actually_ran_something(pairing):
    """A pairing that found no names passes both directions against nothing.

    The rule ``test_architecture_inventory.py`` states and this module borrows
    everywhere else: a scan that silently finds zero is not a check. Here the
    "scan" is a spawned test runner, so the way it finds zero is a runner that
    fails to start -- and a subset check over an empty set is green.
    """
    ran = _paired(pairing)
    assert ran, "no guard source names a runner to pair against at all"
    for row in ran:
        assert row["paired"], (
            f"{row['runner']} produced no usable output, so "
            f"{row['source']}'s scan was paired against nothing: "
            f"{row['failure']}"
        )
        assert row["executed"] > 0, (
            f"{row['runner']} ran no checks at all, so {row['source']}'s scan "
            f"was paired against an empty set"
        )


def test_each_source_pairs_against_the_runner_its_harness_spawns(enumeration):
    """``GUARD_SOURCES[tier].runner`` against ``TIER_HARNESS[tier].script``.

    Two objects now name the same file: one says how to READ a tier's guard
    names out of the tree and how to RUN that tier for the pairing, the other
    how to run it for a mutation. Pointing the pairing at the wrong runner
    would compare one tier's scan against another tier's output -- every name
    on both sides wrong at once, which reads exactly like a rotted scanner.
    """
    spawned = runner_tier_scripts()
    assert spawned, (
        f"no TIER_HARNESS scripts found in {RUNNER} -- the reader has rotted, "
        f"so this pairing is passing against nothing"
    )
    for tier, source in enumeration["sources"].items():
        if source["runner"] is None:
            continue
        assert source["runner"] == spawned.get(tier), (
            f"GUARD_SOURCES[{tier!r}] pairs its scan against "
            f"{source['runner']}, and {RUNNER}'s TIER_HARNESS spawns "
            f"{spawned.get(tier)!r} for that tier"
        )


def test_the_pairing_covers_every_censused_source_but_the_one_it_says_it_cannot(
        enumeration, pairing):
    """``UNPAIRED_TIER``, the way ``UNCENSUSED_TIER`` is handled one test over.

    A source that stops being pair-checked is a scanner that stops being
    falsifiable, and the browser tier already shows how quietly that happens:
    it is exempt for a stated, structural reason (its names interpolate and one
    name may be run by two suites), not because nobody got to it. A second
    source joining it silently is the failure this pairs against.
    """
    unpaired = {row["tier"] for row in pairing if not row["runner"]}
    assert unpaired == {UNPAIRED_TIER}, (
        f"the censused sources with no run to pair against are "
        f"{sorted(unpaired)}; {UNPAIRED_TIER!r} is the one stated to be "
        f"unpairable. A source dropping out of the pairing is a scan nothing "
        f"checks -- state the reason in GUARD_SOURCES and in CENSUS_LIMITS, "
        f"or give it a runner."
    )
    assert enumeration["sources"][UNPAIRED_TIER]["runner"] is None


def test_the_census_emits_what_it_cannot_see(enumeration):
    """The honest-limits paragraph, made a thing the tooling prints.

    Deliverable of ``guard_census_pins_the_set_not_the_count`` (2026-09-30) and
    the reason this test exists at all: the three arrivals that pass closed had
    every one of them been sitting in the mechanism since it was built, and the
    only thing that found them was a reviewer reading the code with the
    question in mind. A gate with known bypasses is worth having; an
    undocumented one grows a fourth.
    """
    limits = enumeration["limits"]
    assert set(limits) == CENSUS_LIMIT_KEYS, (
        f"CENSUS_LIMITS states {sorted(limits)}; this module expects "
        f"{sorted(CENSUS_LIMIT_KEYS)}. A limit removed is a bypass that stopped "
        f"being printed -- which is only correct if something now covers it."
    )
    for key, why in limits.items():
        assert len(why.split()) >= 12, (
            f"CENSUS_LIMITS[{key!r}] is {why!r} -- a limit nobody can act on "
            f"is the review-report paragraph this replaced"
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
        f"{sorted(TIERS)}. A tier word in one and not the other is either a "
        f"spec nothing can run, or a harness no spec may name."
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


def test_the_enumeration_covers_every_tier_but_the_one_it_says_it_cannot(enumeration):
    """``GUARD_SOURCES`` is the third place the tier words are written.

    A tier with no source there is a tier whose guards cannot be enumerated, so
    nothing could ever say one of them arrived unenrolled -- which is the exact
    hole ``python`` is IN, named and reasoned rather than accidental. A fifth
    tier added with no thought about where its names come from would otherwise
    join it silently.
    """
    sources = enumeration["sources"]
    assert set(sources) | {UNCENSUSED_TIER} == set(TIERS), (
        f"GUARD_SOURCES covers {sorted(sources)}, and {UNCENSUSED_TIER!r} is "
        f"the one tier stated to be uncensusable -- TIERS is {sorted(TIERS)}"
    )
    assert UNCENSUSED_TIER not in sources, (
        f"{UNCENSUSED_TIER!r} has a guard source now, so it can be censused -- "
        f"drop UNCENSUSED_TIER and pin it like the others"
    )
    for tier, source in sources.items():
        assert (REPO_ROOT / source["file"]).is_file(), (
            f"GUARD_SOURCES[{tier!r}] names {source['file']}, not in the tree"
        )


def test_the_spec_readme_lists_the_tier_vocabulary_and_nothing_else(enumeration):
    """The fourth copy of the tier words, paired.

    The document an author reads to enrol a guard spells every tier word out
    with a paragraph each. Its predecessor -- the table's ``about`` block -- did
    the same and said, immediately underneath, that the words lived "in exactly
    two places"; a fourth bullet was added under that sentence in 2026-09-18
    without anyone noticing
    (``ISSUE_20260918_the_witness_tables_about_block_is_a_third_unpaired_copy_of_the_tier_vocabulary``).
    Rewording the sentence would have fixed that day and nothing else.
    """
    listed = README_TIER_BULLET.findall(
        SPEC_README.read_text(encoding="utf-8").replace("\r\n", "\n"))
    assert listed, (
        f"no tier bullets found in {SPEC_README.name} -- the reader has rotted, "
        f"so this pairing is passing against nothing"
    )
    assert set(listed) == set(TIERS), (
        f"{SPEC_README.name} documents tiers {sorted(listed)}, TIERS is "
        f"{sorted(TIERS)}. The document an author enrols a guard from is the "
        f"one place a missing tier costs the most."
    )


def test_every_browser_spec_names_a_suite_the_registry_dispatches_on(specs):
    """``suite`` is passed straight to the browser runner's ``--only``.

    The registry keys are the labels the suites print, and they are what ``--only``
    matches a substring of. A reworded label leaves a spec holding the old one,
    and the runner answers ``--only "<stale key>"`` with *matches no suite* -- an
    honest red, several minutes in, on a run somebody had to make time for.
    """
    keys = suite_registry_keys()
    assert keys, f"no SUITES rows found in {SUITE_REGISTRY} -- the reader has rotted"
    assert len(set(keys)) == len(keys), (
        f"duplicate SUITES keys in {SUITE_REGISTRY}: {sorted(keys)}"
    )
    for name, spec in specs:
        if spec["tier"] != "browser":
            continue
        assert spec["suite"] in keys, (
            f"{name}: names suite {spec['suite']!r}, which no longer matches "
            f"a SUITES key in {SUITE_REGISTRY}. The keys are:\n  "
            + "\n  ".join(keys)
        )


def test_passing_over_the_skip_arm_is_load_bearing(specs, enumeration):
    """At least one enrolled name is ALSO written in a ``skip(...)`` beside it.

    A viewer guard with a ``skip(...)`` arm beside its ``test(...)`` one carries
    the same words in both, deliberately, so a reader of either output sees the
    same title -- and only the test arm can ever print the ``FAIL  <name>`` line
    a red is attributed to. Counting both left every such guard permanently
    unenrollable, measured twice
    (``LESSONS_20260921_mutation_witness_enrollment_backlog.md`` excluded the
    markup-scan twin for exactly this;
    ``ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry.md``
    proposed a row with the same shape).

    Without this, a ``skip`` rule in the enumeration that had stopped matching --
    the call reworded, the argument moved to its own line -- would quietly count
    both arms again, and the only symptom would be the next such guard being
    called unattributable by a scanner that used to let it through.
    """
    sources = enumeration["sources"]
    both_arms = [
        name for name, spec in specs
        if spec["tier"] in sources
        and SKIP_DECLARATION + spec["expect_red"]
        in joined_source(sources[spec["tier"]]["file"])
    ]
    assert both_arms, (
        "no enrolled guard is written in a `skip(...)` arm as well as a "
        "`test(...)` one, so nothing here can tell a working skip rule from a "
        "dead one. Either no enrolled guard has a skip arm any more -- in which "
        "case say so and drop the passing-over in scripts/guard_enumeration.mjs "
        "-- or the rule has stopped matching."
    )


def test_closing_the_concatenation_seam_is_load_bearing(specs, enumeration):
    """At least one enrolled name only resolves once the ``" + "`` seams are closed.

    Without this, a seam rule in the enumeration that had stopped matching
    anything would leave the pairing green purely because every name happened to
    fit on one source line -- and the next long one would be unpaired with
    nothing to say so.
    """
    sources = enumeration["sources"]
    joined_only = [
        name for name, spec in specs
        # A python spec's name is an identifier on one line, so the seam
        # question does not arise for it -- and it must not be allowed to
        # satisfy this check either way.
        if spec["tier"] in sources
        and source_of(sources[spec["tier"]]["file"]).count(spec["expect_red"]) == 0
        and joined_source(sources[spec["tier"]]["file"]).count(spec["expect_red"]) == 1
    ]
    assert joined_only, (
        "no enrolled `expect_red` needs the seams closed to resolve, so nothing "
        "here can tell a working seam rule from a dead one. Either the check "
        "names are all short now -- in which case say so and drop the joining "
        "in scripts/guard_enumeration.mjs -- or the regex has stopped matching."
    )


def test_every_python_spec_names_a_test_file_the_shadow_can_run(specs):
    """``suite`` is the path pytest is handed, resolved inside the shadow tree.

    Three things have to hold and none of them is checkable from the spec
    alone: the file is in the tree, it is under ``tests/`` (which is what
    ``SHADOWED`` copies), and it is not this module (``SELF_PAIRING_SUITE`` --
    the re-entrancy that would witness every mutation and prove none).
    """
    for name, spec in specs:
        if spec["tier"] != UNCENSUSED_TIER:
            continue
        suite = spec["suite"]
        assert (REPO_ROOT / suite).is_file(), (
            f"{name}: names suite {suite!r}, which is not in the tree"
        )
        assert suite.startswith("tests/"), (
            f"{name}: names suite {suite!r}, outside tests/ -- the shadow "
            f"tree copies tests/ and tolerance_stack/, so pytest would be handed "
            f"a path that is not there"
        )
        assert suite != SELF_PAIRING_SUITE, (
            f"{name}: names {SELF_PAIRING_SUITE}, which no spec may -- "
            f"with a mutation applied, that module's anchor check reddens for "
            f"every spec, so the witness would pass against anything"
        )


def test_no_mutation_is_a_no_op(mutations):
    """``find == replace`` would patch a file into itself and witness nothing."""
    for name, _spec, mutation in mutations:
        assert mutation["find"] != mutation["replace"], (
            f"{name}: a mutation's `find` and `replace` are the same text"
        )


def test_the_issue_each_mutation_cites_is_in_the_tree(mutations):
    """A cited issue that has been renamed sends the next reader nowhere.

    ``issue: null`` is the honest value for a mutation nobody filed a bug about
    -- the guards that were already sound when they were entered.
    """
    for name, _spec, mutation in mutations:
        if mutation["issue"] is None:
            continue
        assert (REPO_ROOT / mutation["issue"]).is_file(), (
            f"{name}: cites {mutation['issue']}, which is not in the tree"
        )


def test_the_anchor_reader_can_fail(enumeration):
    """The scanners themselves, proven falsifiable on a string nothing contains."""
    absent = "this text is in no file in this repo, by construction"
    assert source_of(f"scripts/{ENUMERATION.name}").count(absent) == 0
    for source in enumeration["sources"].values():
        assert joined_source(source["file"]).count(absent) == 0
    for names in declared_names(enumeration).values():
        assert absent not in names


def test_the_enumeration_finds_guards_in_every_source_it_names(enumeration):
    """A source that scans to nothing is a pin of zero nobody would notice.

    The census gate is only as honest as the scan under it: a ``call`` word that
    stopped matching would leave that source at 0 declared, and the pin would be
    lowered to 0 by whoever next saw the red -- a guard source silently dropped
    out of the enumeration, which is this whole mechanism failing quietly in the
    one way it was built to make impossible.
    """
    counts = {row["source"]: row["declared"] for row in enumeration["rows"]}
    assert counts, "the enumeration reported no guard sources at all"
    for source, declared in counts.items():
        assert declared > 0, (
            f"{source} declares no guards at all, so its census pin certifies "
            f"nothing. The scanner's `call` word in GUARD_SOURCES has stopped "
            f"matching."
        )

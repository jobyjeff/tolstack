"""``apps/viewer/README.md``'s deep-link table, paired with ``VA.DEEP_LINK_PARAMS``.

``apps/viewer/README.md``'s ``## Deep links in -- the URL contract`` section is the
one document a **sibling repo** consumes without reading this repo's code:
drawing-checker's ``analyses_viewer_deep_link`` is told to read the contract from
exactly there. The params themselves live in one constant --
``VA.DEEP_LINK_PARAMS`` in ``apps/viewer/viewer.js`` -- and the section's table
hand-copies it, one row per param.

``apps/viewer/tests.js`` pins the constant to its literal six, so a rename or an
addition fails the fast tier and forces a deliberate edit of *that* test. Nothing
forced the README's table to move with it: a seventh param added to the constant
and to ``tests.js`` shipped a contract document that did not name it, and the
cross-repo consumer read a stale contract wearing a green suite
(``ISSUE_20260911_deep_link_contract_readme_table_unpaired``). This module is
that missing pairing.

Why not the existing states-named-in-README guard
-------------------------------------------------

``tests/test_tolerance_stack.py``'s ``_ENUMERATED_STATE_VOCABULARIES`` matches a
code value **by name, anywhere in the surface README**. That shape is *vacuous*
here and would have been the easy wrong answer: ``stack``, ``edge``, ``node``,
``element`` and ``topology`` are ordinary words in this README, each appearing
throughout prose that has nothing to do with the URL contract. A name-anywhere
scan over this README can never fail, for any of the six.

So this scan is scoped two ways, and both are load-bearing:

* **To the section.** Heading to the next ``## ``. A param named in the nav
  chapter, or in ``## The topology mode``, does not satisfy the contract table --
  ``test_the_section_scoping_is_not_vacuous`` proves that by moving a deleted row
  to just past the section's end and watching the scan stay red.
* **To the table's own claim shape**, `` `<param>=<id>` ``. Not the bare name:
  the section's prose says `` `topology` `` and `` `stack` `` in rules about
  giving one and not both, so a bare-name match *inside* the section would still
  be satisfied for two of the six by prose documenting no row at all.

The claim shape also draws the ``mock`` line for free, in the direction that
matters. ``?mock=1`` is in this section, deliberately **not** in the constant (it
picks the dataset, not a selection) -- and it is written ``mock=1``, never
``mock=<id>``, so it is not a phantom param to the reverse check. That is an
exemption the shapes make, rather than a list someone has to keep.

What this does not do
---------------------

* It does not read the *descriptions*. That a row's "opens" sentence still
  describes what the code does is a reviewer's job; this pairs the **vocabulary**.
* It does not check the "Requires ``topology``" / "Requires ``stack``" dependency
  claims, the degradation rules, or the examples fence against the code. Those
  are prose about behaviour, with no constant to pair against.
* It reads the **section only**, so it says nothing about the rest of the
  README -- see ``docs/prompts/REVIEW_AGENT.md``, "a doc-scan guard cannot fail
  on a deleted section". For *this* section it can: a missing or duplicated
  heading raises ``LookupError`` rather than scanning an empty string, which is
  the shape every extraction in this repo's doc scans is required to have.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from tests.test_js_python_vocabulary import js_array_strings

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_JS = REPO_ROOT / "apps" / "viewer" / "viewer.js"
VIEWER_README = REPO_ROOT / "apps" / "viewer" / "README.md"

#: The constant the table copies. Named once; its values are never restated here.
CONSTANT = "DEEP_LINK_PARAMS"

#: The section that IS the contract. Matched on its opening words only -- the
#: heading's trailing "-- the URL contract" is editorial, and pinning the em dash
#: in it would make a punctuation edit look like a contract change.
_SECTION_HEADING = re.compile(r"^##[ \t]+Deep links in\b[^\n]*$", re.M)
_H2 = re.compile(r"^##[ \t]", re.M)

#: The table's own claim shape: a backticked `<param>=<id>` cell. Both directions
#: of the pairing read this one pattern, so the document cannot satisfy one
#: direction in a shape the other cannot see.
_PARAM_CLAIM = re.compile(r"`([A-Za-z_$][A-Za-z0-9_$]*)=<id>`")

#: Number words the section might spell its param count with. Digits match too;
#: the words are listed because "answers six selection params" is how the section
#: actually writes it.
_NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}

#: "<n> params", with at most ONE word between. Kept to one optional word on
#: purpose: a wide wildcard here would be a second matcher for shapes nobody
#: enumerated (REVIEW_AGENT.md, "a doc-scan guard's false positive"). The
#: section's other numbers -- "one constant", "both repos" -- are not followed by
#: `params` and so are not claims about this count.
_COUNT_CLAIM = re.compile(
    r"\b(\d+|" + "|".join(_NUMBER_WORDS)
    + r")[ \t]+(?:[A-Za-z][A-Za-z-]*[ \t]+)?params\b",
    re.I,
)


# --------------------------------------------------------------------------- #
# extraction                                                                   #
# --------------------------------------------------------------------------- #

def contract_section(readme_text: str) -> str:
    """The ``## Deep links in`` section of ``readme_text``, heading to next ``## ``.

    Raises rather than returning ``""`` when the heading is missing or doubled: an
    empty section would make every check below pass against anything, which is the
    one failure mode a pairing scan must not have.
    """
    headings = list(_SECTION_HEADING.finditer(readme_text))
    if len(headings) != 1:
        raise LookupError(
            "expected exactly one `## Deep links in ...` heading in "
            f"apps/viewer/README.md, found {len(headings)}. That section IS the "
            "deep-link contract a sibling repo reads (drawing-checker's "
            "analyses_viewer_deep_link); if it moved or was renamed, point "
            "_SECTION_HEADING at where it lives now -- this pairing is "
            "meaningless until it does."
        )
    start = headings[0].end()
    nxt = _H2.search(readme_text, start)
    return readme_text[start:nxt.start() if nxt else len(readme_text)]


def documented_params(section: str) -> set[str]:
    """Every param the section claims a row for, written `` `<param>=<id>` ``."""
    return {m.group(1) for m in _PARAM_CLAIM.finditer(section)}


def documented_counts(section: str) -> list[str]:
    """Every "<n> params" claim in the section, as written."""
    return [m.group(1) for m in _COUNT_CLAIM.finditer(section)]


def code_params(viewer_js_text: str) -> frozenset[str]:
    """``VA.DEEP_LINK_PARAMS``, read out of ``viewer.js`` -- never restated."""
    return js_array_strings(viewer_js_text, CONSTANT).keys


def contract_problems(viewer_js_text: str, readme_text: str) -> list[str]:
    """Every disagreement between the constant and the contract section.

    One function, all three checks, so a replay can feed it a mutated README and
    read back exactly what the live pairing would report.
    """
    params = code_params(viewer_js_text)
    section = contract_section(readme_text)
    documented = documented_params(section)
    problems = []
    for param in sorted(params - documented):
        problems.append(
            f"VA.{CONSTANT} carries {param!r}, and the `## Deep links in` section "
            f"of apps/viewer/README.md has no `{param}=<id>` row for it -- add the "
            "row; a sibling repo reads the contract from that section and nothing "
            "else tells it the param exists."
        )
    for param in sorted(documented - params):
        problems.append(
            f"the `## Deep links in` section documents a `{param}=<id>` row and "
            f"VA.{CONSTANT} has no such param -- the page ignores that query key, "
            "so the row promises a consumer something the code drops."
        )
    for written in documented_counts(section):
        stated = _NUMBER_WORDS.get(written.lower())
        if stated is None:
            stated = int(written)
        if stated != len(params):
            problems.append(
                f"the section says {written!r} params and VA.{CONSTANT} carries "
                f"{len(params)} -- restate the count or drop it."
            )
    return problems


# --------------------------------------------------------------------------- #
# fixtures                                                                     #
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def viewer_js() -> str:
    return VIEWER_JS.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def readme() -> str:
    return VIEWER_README.read_text(encoding="utf-8")


# --------------------------------------------------------------------------- #
# the pairing                                                                  #
# --------------------------------------------------------------------------- #

def test_the_readme_contract_table_names_exactly_the_constants_params(viewer_js, readme):
    """The pairing itself, both directions and the count, in one report."""
    problems = contract_problems(viewer_js, readme)
    assert problems == [], (
        "apps/viewer/README.md's deep-link contract disagrees with "
        f"VA.{CONSTANT}:\n  " + "\n  ".join(problems))


def test_neither_side_of_the_pairing_is_empty(viewer_js, readme):
    """A scan that finds nothing passes against anything, so both extractions are
    asserted non-empty before the comparison above is believed."""
    params = code_params(viewer_js)
    section = contract_section(readme)
    documented = documented_params(section)
    assert params, f"VA.{CONSTANT} came back empty -- suspect the extractor"
    assert documented, (
        "no `<param>=<id>` row found in the `## Deep links in` section. Either the "
        "table stopped writing its params in backticked `<param>=<id>` form -- in "
        "which case teach _PARAM_CLAIM the new shape rather than leaving this scan "
        "matching nothing -- or the rows are gone.")
    assert documented_counts(section), (
        "the section states no param count. It said 'answers six selection "
        "params'; if that sentence went on purpose, delete this assertion "
        "deliberately rather than leaving a count claim silently unpaired.")
    assert len(section) < len(readme), "the section scoping read the whole file"


def test_mock_is_documented_in_the_section_and_absent_from_the_constant(viewer_js, readme):
    """``?mock=1`` picks the DATASET, not a selection, and is deliberately not in
    the constant -- so the reverse direction must not read it as a phantom param.
    Pinned because it is the one live value the two sides legitimately disagree
    about, and what keeps it out is the claim shape (``mock=1``, never
    ``mock=<id>``) rather than an exemption someone has to maintain."""
    section = contract_section(readme)
    assert "mock=1" in section
    assert "mock" not in documented_params(section)
    assert "mock" not in code_params(viewer_js)


# --------------------------------------------------------------------------- #
# can-fail replays -- the scan is worth its lines only if it goes red          #
# --------------------------------------------------------------------------- #

def _cut_row(readme_text: str, param: str) -> str:
    """Delete the contract table's row for ``param`` -- "somebody added a param and
    never touched the README", run backwards."""
    row = re.compile(rf"^\|[ \t]*`{re.escape(param)}=<id>`.*\n", re.M)
    mutated, n = row.subn("", readme_text)
    assert n == 1, f"expected exactly one `{param}=<id>` table row to cut, cut {n}"
    return mutated


def test_the_scan_goes_red_when_a_table_row_is_cut(viewer_js, readme):
    problems = contract_problems(viewer_js, _cut_row(readme, "element"))
    assert len(problems) == 1, problems
    assert "carries 'element'" in problems[0]
    assert "no `element=<id>` row" in problems[0]


def test_every_one_of_the_constants_params_is_individually_load_bearing(viewer_js, readme):
    """Each param's row cut one at a time, read from the constant rather than
    listed here, so the replay above cannot be passing on a row-position accident
    and a seventh param joins this replay for free."""
    for param in sorted(code_params(viewer_js)):
        problems = contract_problems(viewer_js, _cut_row(readme, param))
        assert any(f"no `{param}=<id>` row" in p for p in problems), (
            f"cutting the {param!r} row left the pairing green")


def test_the_scan_goes_red_on_a_phantom_row(viewer_js, readme):
    """The other direction: a row naming a param the constant lacks."""
    phantom = readme.replace(
        "| `element=<id>` |",
        "| `revision=<id>` | at that drawing revision |\n| `element=<id>` |",
        1,
    )
    assert phantom != readme
    problems = contract_problems(viewer_js, phantom)
    assert len(problems) == 1, problems
    assert "documents a `revision=<id>` row" in problems[0]


def test_the_section_scoping_is_not_vacuous(viewer_js, readme):
    """The point the existing states-named-in-README guard misses: a param named
    OUTSIDE the contract section does not satisfy the table. Cut the ``element``
    row, then write that very claim one line past the section's end -- a
    whole-README scan goes green here; this must not."""
    cut = _cut_row(readme, "element")
    # Past the section's end means past the NEXT heading, not just before it:
    # the section runs heading-to-heading, so text sitting above the next `## `
    # is still inside it.
    next_heading = _H2.search(cut, _SECTION_HEADING.search(cut).end())
    after_heading = cut.index("\n", next_heading.start()) + 1
    later = (cut[:after_heading]
             + "\nElsewhere entirely: `element=<id>`.\n"
             + cut[after_heading:])
    assert later != cut and "`element=<id>`" in later
    problems = contract_problems(viewer_js, later)
    assert any("no `element=<id>` row" in p for p in problems), (
        "a param claim outside the section satisfied the contract scan -- the "
        "section scoping is not doing anything")


def test_the_scan_goes_red_when_the_stated_count_drifts(viewer_js, readme):
    stale = readme.replace("answers six selection params",
                           "answers seven selection params", 1)
    assert stale != readme
    problems = contract_problems(viewer_js, stale)
    assert len(problems) == 1, problems
    assert "says 'seven' params" in problems[0]


def test_the_extraction_raises_rather_than_scanning_a_deleted_section(readme):
    """``docs/prompts/REVIEW_AGENT.md``, "a doc-scan guard cannot fail on a deleted
    section" -- for this section it can, because the heading lookup *is* the
    extraction. Both shapes: the section cut out, and the section duplicated."""
    heading = _SECTION_HEADING.search(readme)
    nxt = _H2.search(readme, heading.end())
    section_with_heading = readme[heading.start():nxt.start()]
    without = readme[:heading.start()] + readme[nxt.start():]
    assert "Deep links in" not in without
    with pytest.raises(LookupError, match="exactly one"):
        contract_section(without)
    with pytest.raises(LookupError, match="exactly one"):
        contract_section(readme + section_with_heading)

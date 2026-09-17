"""The type scale both web apps are written against, paired with the
stylesheets that use it.

Written by handoff ``design_pass_typography`` (2026-09-17). Before that pass
the three stylesheets declared **nine** distinct ``font-size`` values --
10, 11, 12, 13, 14, 15, 16, 17 and 18px -- for six kinds of text, and two of
them had arrived by accident rather than by decision: ``apps/annotate`` set no
base size at all, so its element rail inherited the browser's 16px and was the
largest type on the page, and its detail-pane ``h3`` landed on 15.2px via the
browser's own ``1.17em`` default. A scale nobody can enumerate is not a scale,
and "different emphasis, font/font size, line spacing" (Jeff's 2026-09-16
note, the source of that handoff) cannot be tuned against one.

So the pass declared six steps as custom properties in
``apps/viewer/style.css``'s ``:root`` -- **the one home for the numbers** --
and rewrote every ``font-size`` in both apps to ``var(--t-*)``. This module is
what keeps that true. It is the repo's standing shape for a vocabulary, applied
to CSS: one named set of values, and a test pairing everything that uses them
against it (``CLAUDE.md``: *"a field vocabulary is a module-level constant,
never an inline literal"*; ``docs/prompts/REVIEW_AGENT.md``'s "Documented
vocabularies drifting from the seeded data" keeps the sighting count).

Why the scale is COPIED into ``apps/annotate/style.css`` rather than imported
-------------------------------------------------------------------------------
Because the two apps deliberately share no stylesheet -- that file's own header
says so, and the reason is that their layouts and their colour vocabularies are
genuinely different. A type scale is neither: it is a house convention. Rather
than couple the two files to make one convention shared, the convention is
written twice and **this module is the coupling**: it compares the two blocks
name for name and value for value, so a step added or moved in one app is red
rather than a silent divergence.

What this does NOT do
---------------------
* It does not pin the spacing scale. Padding and margin on these pages are
  load-bearing *geometry* -- ``--tv-row`` is the same number as
  ``VA.RAIL_METRICS.rowHeight``, ``.tvgrip``'s width is paired against
  ``VA.TOPO_GRIP``, and ``scripts/run_viewer_browser_tests.mjs`` measures row
  heights and grip pixels directly. A blanket spacing vocabulary would fight
  guards that already exist and own those numbers.
* It does not police colour. The colour *roles* are prose, in
  ``apps/viewer/style.css``'s header and ``docs/DESIGN_TYPE_AND_COLOUR.md``;
  what the 2026-09-17 pass added there was a rule about FILL ("filled is
  provenance at its two worst states, and a verdict"), and that is a judgement
  about which claim is loudest, not a set of tokens.
* The uppercase check below matches a **shape**: a rule that declares both a
  ``font-size`` and ``text-transform: uppercase``. A rule that inherits its
  size from elsewhere is invisible to it, which is why ``.verdict`` (uppercase,
  size from ``.chip``) is not a finding. It exists to catch the specific
  regression the pass fixed -- ``h3`` at 15px ALL-CAPS carrying a sentence --
  not to be a complete audit of every capital letter.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

#: The stylesheet that OWNS the scale, and the one that copies it.
SCALE_OWNER = "apps/viewer/style.css"
SCALE_COPY = "apps/annotate/style.css"

#: Every stylesheet in either app. Every ``font-size`` in every one of them is
#: checked against the scale; read from the tree rather than listed, so a new
#: stylesheet is covered the day it lands instead of the day someone remembers
#: this list.
APP_CSS_GLOBS = ("apps/*/*.css",)

#: The step names, in the order they must be declared. Only the NAMES are
#: written here -- the values live in the stylesheet and are read from it, which
#: is the whole point of the module. A seventh name is a design decision and
#: belongs in this tuple and in docs/DESIGN_TYPE_AND_COLOUR.md, not in a rule.
STEP_NAMES = ("--t-micro", "--t-meta", "--t-dense", "--t-body", "--t-title", "--t-page")

_STEP_DECL = re.compile(r"(--t-[a-z]+)\s*:\s*([0-9]+)px\s*;")
_FONT_SIZE = re.compile(r"font-size\s*:\s*([^;}]+)")
#: ``font:`` shorthand carries a size too, and the viewer's and annotator's
#: ``body`` rules are the two places either app uses it for a size. ``font:
#: inherit`` (every styled ``<button>``) is filtered on the CAPTURED value
#: rather than by a lookahead here: ``\s*`` backtracks to zero and a lookahead
#: placed after it then reads the space, not the word.
_FONT_SHORTHAND = re.compile(r"[;{]\s*font\s*:\s*([^;}]+)")


def _stylesheets() -> dict[str, str]:
    found: dict[str, str] = {}
    for pattern in APP_CSS_GLOBS:
        for path in sorted(REPO_ROOT.glob(pattern)):
            if "vendor" in path.parts:
                continue
            found[path.relative_to(REPO_ROOT).as_posix()] = path.read_text(encoding="utf-8")
    return found


@pytest.fixture(scope="module")
def stylesheets() -> dict[str, str]:
    return _stylesheets()


def _steps(css: str) -> dict[str, str]:
    return dict(_STEP_DECL.findall(css))


def test_the_scan_found_both_stylesheets_and_the_scale_in_each(stylesheets):
    """Anti-vacuity, first: a scan that silently finds nothing makes every
    comparison below pass against anything. Same guard
    ``test_js_python_vocabulary.py`` opens with."""
    assert SCALE_OWNER in stylesheets, f"{SCALE_OWNER} was not found by the glob"
    assert SCALE_COPY in stylesheets, f"{SCALE_COPY} was not found by the glob"
    assert len(stylesheets) >= 3, (
        "expected at least the three app stylesheets (viewer style + topology, "
        f"annotate style); the glob found {sorted(stylesheets)}"
    )
    for name in (SCALE_OWNER, SCALE_COPY):
        assert _steps(stylesheets[name]), (
            f"{name} declares no --t-* step at all -- with nothing extracted, "
            "every check in this module would pass against anything"
        )


def test_the_owner_declares_exactly_the_named_steps(stylesheets):
    steps = _steps(stylesheets[SCALE_OWNER])
    assert tuple(steps) == STEP_NAMES, (
        f"{SCALE_OWNER} must declare exactly {list(STEP_NAMES)} in that order; "
        f"it declares {list(steps)}. A step added to the stylesheet without "
        "being added here (and to docs/DESIGN_TYPE_AND_COLOUR.md) is the "
        "nine-sizes state this scale replaced, starting again."
    )


def test_every_step_is_a_distinct_size_and_the_ramp_rises(stylesheets):
    steps = _steps(stylesheets[SCALE_OWNER])
    sizes = [int(steps[name]) for name in STEP_NAMES]
    assert len(set(sizes)) == len(sizes), (
        f"two steps declare the same size ({dict(zip(STEP_NAMES, sizes))}) -- "
        "then one of them carries no decision and the other is doing its job"
    )
    assert sizes == sorted(sizes), (
        "the steps must rise in the order they are named, smallest first, so "
        f"the name says where on the ramp a size sits; got {dict(zip(STEP_NAMES, sizes))}"
    )
    assert min(sizes) >= 11, (
        "no step below 11px: 10px was the size the retired attention flags and "
        "check labels used, and a 10px ALL-CAPS 700-weight pill is the "
        "smaller-and-bolder treatment the house rules name as the wrong way to "
        f"say 'secondary'; got {dict(zip(STEP_NAMES, sizes))}"
    )


def test_the_annotator_copy_of_the_scale_matches_the_owner(stylesheets):
    """The coupling this module exists to be: the two apps share no
    stylesheet, so nothing but this test keeps their scales equal."""
    owner = _steps(stylesheets[SCALE_OWNER])
    copy = _steps(stylesheets[SCALE_COPY])
    assert copy == owner, (
        f"{SCALE_COPY}'s type scale has drifted from {SCALE_OWNER}'s.\n"
        f"  owner: {owner}\n  copy:  {copy}\n"
        "The two are written out separately on purpose (the two apps share no "
        "stylesheet); this test is what makes that safe. Change both, or move "
        "the scale somewhere both pages load."
    )


def test_no_stylesheet_declares_a_font_size_off_the_scale(stylesheets):
    """Every ``font-size`` in either app is a ``var(--t-*)``.

    Not "is one of the six numbers": a literal that happens to equal a step
    still splits the scale into two homes, and the next edit moves one of them.
    """
    offenders = []
    for name, css in sorted(stylesheets.items()):
        for match in _FONT_SIZE.finditer(css):
            value = match.group(1).strip()
            if value.startswith("var(--t-") or value == "inherit":
                continue
            line = css[: match.start()].count("\n") + 1
            offenders.append(f"{name}:{line}: font-size: {value}")
        for match in _FONT_SHORTHAND.finditer(css):
            value = match.group(1).strip()
            if value.startswith("var(--t-") or value == "inherit":
                continue
            line = css[: match.start()].count("\n") + 1
            offenders.append(f"{name}:{line}: font: {value}")
    assert offenders == [], (
        "these declarations name a size instead of a step on the scale:\n  "
        + "\n  ".join(offenders)
        + f"\nUse one of {list(STEP_NAMES)} (declared in {SCALE_OWNER}). If the "
        "size genuinely has no step, the scale needs one -- add it there, to "
        "STEP_NAMES, and to docs/DESIGN_TYPE_AND_COLOUR.md."
    )


def test_no_rule_sets_all_caps_above_the_metadata_step(stylesheets):
    """ALL-CAPS is for tiny labels (the house rule, Jeff's 2026-09-16 note).

    Shape-matched: only a rule that declares BOTH a ``font-size`` and
    ``text-transform: uppercase`` is visible here -- see this module's
    docstring. The regression it exists to catch is real and was live until
    2026-09-17: ``h3`` at 15px ALL-CAPS rendered the preview pane's element
    name as "HUB LOWER BEARING FLANGE (A DATUM) TO TOP BEARING FLANGE".
    """
    owner = _steps(stylesheets[SCALE_OWNER])
    allowed = {f"var({name})" for name in ("--t-micro", "--t-meta")}
    offenders = []
    for name, css in sorted(stylesheets.items()):
        for block in re.finditer(r"([^{}]*)\{([^{}]*)\}", css):
            selector, body = block.group(1).strip(), block.group(2)
            if "text-transform" not in body or "uppercase" not in body:
                continue
            size = _FONT_SIZE.search(body)
            if not size:
                continue
            value = size.group(1).strip()
            if value in allowed:
                continue
            line = css[: block.start(2)].count("\n") + 1
            selector = " ".join(selector.split())[-70:]
            offenders.append(f"{name}:{line}: {selector} -- uppercase at {value}")
    assert offenders == [], (
        "all-caps is for TINY labels only -- at most "
        f"var(--t-meta) ({owner['--t-meta']}px):\n  " + "\n  ".join(offenders)
        + "\nA sentence set in capitals is shouted, not labelled. Either drop "
        "the uppercase or make the rule a label."
    )

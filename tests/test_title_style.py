"""Every authored ``title`` against the SOP's "Titling an artifact" rule.

Added 2026-09-14 by handoff ``stack_title_style_pass``, which retitled all seven
stacks, all five topologies and all twenty studies. The rule is one sentence --
*a title is a short noun phrase naming the thing; what it sheds is demoted into
``description``* -- and it exists because the viewer's nav rail renders titles
and nothing else, so a title that carries its own genre, history, endpoints and
output unit turns the rail into the wall of text Jeff read on 2026-09-14.

**The rule is not restated here.** It lives in ``docs/SOP_TOLERANCE_STACK.md``,
"Titling an artifact"; ``docs/DAG_TOPOLOGY.md`` and ``docs/prompts/REVIEW_AGENT.md``
point at that section rather than repeating it, and
``test_the_sop_still_carries_the_title_rule`` below fails if it is deleted --
the guard and the prose are paired, per the standing doc-scan rule that a guard
whose documentation vanished is a rule nobody can look up.

What IS here is the machine-checkable subset: four shapes that had actually been
authored, each named with the instance that motivated it. A shape this scan does
not match is not thereby allowed -- prose cannot be parsed, and the review
checklist is where the rest is caught.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SOP = REPO_ROOT / "docs" / "SOP_TOLERANCE_STACK.md"
TITLE_RULE_HEADING = "### Titling an artifact"

#: A title is scanned, not read. Each entry is (pattern, what it was, the
#: instance that motivated banning it) -- the third column is why this is a
#: rule and not a preference, so a future author can tell whether their case is
#: the same one.
BANNED_SHAPES = (
    (re.compile(r"\bas a topology\b", re.I),
     "a genre statement",
     "'Pitch link to pitch plate -- the grip-length joint as a topology'; "
     "every joint here is also a topology, so saying so distinguishes nothing"),
    (re.compile(r"\((?=[^()]*\b(?:deg|degrees?|mm|millimet(?:re|er)s?|"
                r"in|inch(?:es)?)\b)[^()]*\)", re.I),
     "a unit in parentheses",
     "'... at the full-sweep-average sensitivity (degrees)'; units belong on "
     "the values, and a study's output unit is already on its result"),
    (re.compile(r"\bbuilt from scratch\b|\bno source workbook\b|"
                r"\bused to be\b|\bno longer\b|\bnot anymore\b", re.I),
     "history or negation",
     "'... grip length (built from scratch, no source workbook)'; what the "
     "artifact is not is description material, never a name"),
    (re.compile(r" -- |: "),
     "a bolted-on clause",
     "'Thread region T: bolt overall length against the grip -- a provenance "
     "cross-check, not a design quantity'; a noun phrase needs no dash"),
)

#: Long enough for a real noun phrase with one distinguishing qualifier (the
#: longest authored title is 'Blade OML angular position, full-sweep-average
#: sensitivity'), short enough that the nav rail does not wrap.
MAX_TITLE_CHARS = 72


def authored_titles():
    """(repo-relative path, title) for every artifact the nav rail lists."""
    paths = sorted(REPO_ROOT.glob("docs/tolerance_stacks/stack_*.json"))
    paths += sorted(REPO_ROOT.glob("docs/topologies/topology_*.json"))
    paths += sorted(REPO_ROOT.glob("docs/topologies/study_*.json"))
    out = []
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        out.append((path.relative_to(REPO_ROOT).as_posix(), data["title"]))
    # A scan that silently finds nothing is a guard that passes against
    # anything -- the same assertion every doc-scan guard in this suite makes.
    assert len(out) > 25, f"the title scan found only {len(out)} artifacts"
    return out


@pytest.mark.parametrize("rel,title", authored_titles(),
                         ids=[rel for rel, _ in authored_titles()])
def test_a_title_is_a_short_noun_phrase(rel, title):
    for pattern, what, why in BANNED_SHAPES:
        hit = pattern.search(title)
        assert hit is None, (
            f"{rel}: the title carries {what} ({hit.group(0)!r}).\n"
            f"  title: {title!r}\n"
            f"  why this is banned: {why}\n"
            f"  the rule: docs/SOP_TOLERANCE_STACK.md, 'Titling an artifact'. "
            f"Move the qualification into this file's `description`; it is "
            f"demoted, not deleted."
        )
    assert len(title) <= MAX_TITLE_CHARS, (
        f"{rel}: the title is {len(title)} characters, over {MAX_TITLE_CHARS}.\n"
        f"  title: {title!r}\n"
        f"  the rule: docs/SOP_TOLERANCE_STACK.md, 'Titling an artifact'."
    )


def test_the_sop_still_carries_the_title_rule():
    """The guard above and the prose an author reads are one pair.

    A doc-scan guard cannot fail on a *deleted* section, only on a wrong one --
    so the deletion is what this asserts. Without it, the rule could vanish from
    the SOP while these patterns went on rejecting titles with no place left to
    look up why.
    """
    body = SOP.read_text(encoding="utf-8")
    assert TITLE_RULE_HEADING in body, (
        f"{SOP.name} no longer has a {TITLE_RULE_HEADING!r} section, but "
        f"tests/test_title_style.py still enforces it and "
        f"docs/prompts/REVIEW_AGENT.md and docs/DAG_TOPOLOGY.md both point at it."
    )
    section = body.split(TITLE_RULE_HEADING, 1)[1].split("\n## ", 1)[0]
    assert "`description`" in section, (
        "the title rule must still name `description` as where a shed "
        "qualification goes -- demoted, not deleted, is the whole rule."
    )

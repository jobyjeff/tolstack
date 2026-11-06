"""Every element and edge ``name`` against the mechanical half of the naming rule.

Added 2026-11-05 by handoff ``stack_wording_drops_filler_and_the_hover_says_the_
same_thing``. Jeff read a grid whose cell said ``datum A to its top face, the
feather direction st...`` (clipped) while the hover said a different, similar
string. The rule that replaced both lives once, in
``docs/SOP_TOLERANCE_STACK.md``, "Titling an artifact": a ``name`` is the span in
the part's own words, ``<from> to <to>`` or one word, with no articles, no part
name where a column carries it, and nothing after a comma.

**Only the mechanical half is checked here** -- the part a regex can read: no
article, no comma, no dash clause, no parenthesis. "No part name" and "the
distinguishing feature word" are judgments; the reviewer's checklist is where
those are caught. A shape this scan does not match is not thereby allowed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOP = REPO_ROOT / "docs" / "SOP_TOLERANCE_STACK.md"
NAME_RULE_MARKER = "An element's `name` is the span, in the part's own words"

#: What a name may not carry: (pattern, what it is). Case-sensitive on purpose:
#: ``datum A`` is a datum letter, not an article.
BANNED_IN_A_NAME = (
    (re.compile(r"\b(?:the|its|an?)\b"), "an article or `its`"),
    (re.compile(r","), "a comma (what follows one is the `note`)"),
    (re.compile(r" -- |—|;|:"), "a bolted-on clause"),
    (re.compile(r"[()]"), "a parenthesis (a value is the `dimension`, an id is the `hardware_ref`)"),
)


def authored_names():
    """(repo-relative path, id, name) for every stack element and topology edge."""
    out = []
    for path in sorted(REPO_ROOT.glob("docs/tolerance_stacks/stack_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        out += [(path, e["id"], e["name"]) for e in data["elements"]]
    topology = REPO_ROOT / "docs" / "topologies" / "topology_vpa_pitch_linkage.json"
    data = json.loads(topology.read_text(encoding="utf-8"))
    out += [(topology, e["id"], e["name"]) for e in data["edges"]]
    # A scan that finds nothing is a guard that passes against anything.
    assert len(out) > 100, f"the name scan found only {len(out)} names"
    return [(p.relative_to(REPO_ROOT).as_posix(), i, n) for p, i, n in out]


def test_no_element_or_edge_name_carries_filler():
    found = []
    for rel, ident, name in authored_names():
        for pattern, what in BANNED_IN_A_NAME:
            hit = pattern.search(name)
            if hit:
                found.append(f"  {rel} :: {ident}: {what} ({hit.group(0)!r}) in {name!r}")
    assert not found, (
        "names that break the rule in docs/SOP_TOLERANCE_STACK.md, 'Titling an "
        "artifact' (the span in the part's own words; no articles, no comma, "
        "nothing after it -- that is the `note`):\n" + "\n".join(found)
    )


def test_the_sop_still_carries_the_name_rule():
    """The guard above and the prose an author reads are one pair."""
    assert NAME_RULE_MARKER in SOP.read_text(encoding="utf-8"), (
        f"{SOP.name} no longer states the element-name rule "
        f"({NAME_RULE_MARKER!r}) that tests/test_element_names_follow_the_rule.py "
        f"enforces."
    )

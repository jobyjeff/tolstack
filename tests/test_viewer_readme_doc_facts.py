"""``apps/viewer/README.md``'s one checkable per-study fact, declared and
re-derived from the live topology projection.

What this module was
--------------------

Two scans over the README's prose, both **prohibitions**:

1. *"the mutation-witness tier section states no witness count"* -- a
   quantifier anchored onto "of the declared witness" or onto `` `[real]` ``,
   forbidden outright, because that count had been wrong twice (12 -> 27
   declared, 6 -> 7 ``[real]`` across two days) and moves again every time a
   handoff enrols a guard; and
2. *"the Studies section does not reassert the per-study claim"* -- the
   **pairing** of a row-drop phrase with a coverage phrase, forbidden because
   the paragraph it came from asserted that two of ``pitch_link_to_pitch_plate``'s
   studies dropped rows while the third's chain "covered nearly everything",
   and that does not reproduce on either the pre-change nav-click behaviour or
   the pre-change deep-link behaviour
   (``ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md``).

Both read English for a shape and forbade it, which is the pattern
``REPORT_20260921_bug_pareto.md`` measured as C/C2 and the 2026-09-23 refactor
decision retired. They are gone.

What replaced each, and what did not
------------------------------------

Scan 2 had a **true** fact underneath it -- the one the paragraph got backwards
-- and that is now declared in the README and re-derived here:
``pitch_link_thread_region_t`` names the study with the *fewest* chain edges of
the three, never the one whose chain covered nearly everything. Declared, it is
checked on every run of the ``[real]`` tier instead of being a sentence somebody
must remember not to write again.

Scan 1 has **no replacement, and that is a coverage loss worth stating plainly.**
Its subject was a number the README deliberately does not state -- Jeff's
instruction was to say it without a digit and point at the runner's own printed
output -- so there is no value to declare, and a declaration-reading registry
has nothing to hold. A future author who writes a stale witness count into that
section will not be caught by anything. The honest options were "declare the
count", which puts a number back in a section that chose not to carry one and
makes every future enrolment edit this README, or "lose the prohibition"; the
second was taken. Recorded in
``docs/sessions/lessons/LESSONS_20260923_claims_registry_guards_read_declarations_not_prose.md``.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_README = REPO_ROOT / "apps" / "viewer" / "README.md"
TOPOLOGIES_PROJECTION_CANDIDATES = (
    REPO_ROOT / "data" / "projections" / "viewer" / "topologies.json",
    Path("C:/workspace/tolstack/data/projections/viewer/topologies.json"),
)

#: The topology whose per-study chain sizes the README got backwards, and the
#: study it named as the largest when it is the smallest. Named here so the
#: presence check below cannot go vacuous on a README that declares *some*
#: ``smallest_chain`` claim about something else entirely.
SUBJECT_TOPOLOGY = "pitch_link_to_pitch_plate"


def test_the_readme_declares_the_per_study_fact_it_once_got_backwards():
    """Presence: the declaration is still in the README.

    The agreement half -- is ``pitch_link_thread_region_t`` really the smallest
    chain? -- is the ``smallest_chain`` metric's deriver, asserted for every
    declaration in the tree by
    ``tests/test_claims_registry.py::test_every_declared_claim_agrees_with_its_source``.
    This is the half that cannot live there: a README that simply drops the
    declaration passes that guard by giving it nothing to check, which is the
    deletion this presence check exists to see.
    """
    from tests.claims_registry import declarations_in_file

    declared = [c for c in declarations_in_file(VIEWER_README,
                                                "apps/viewer/README.md")
                if c.metric == "smallest_chain"
                and c.fields["topology"] == SUBJECT_TOPOLOGY]
    assert len(declared) == 1, (
        f"apps/viewer/README.md carries {len(declared)} `smallest_chain` "
        f"declarations about {SUBJECT_TOPOLOGY!r}, expected exactly one. The "
        f"paragraph that used to reconstruct which studies dropped what had "
        f"this fact backwards; the declaration is what keeps it re-derived "
        f"rather than remembered."
    )


def _topologies_projection_path() -> Path | None:
    for candidate in TOPOLOGIES_PROJECTION_CANDIDATES:
        if candidate.is_file():
            return candidate
    return None


@pytest.mark.skipif(
    _topologies_projection_path() is None,
    reason="no data/projections/viewer/topologies.json (gitignored, main "
           "checkout only); this pairing needs the live projection",
)
def test_thread_region_t_is_the_smallest_chain_not_the_largest():
    """[real]: the fact the README's dropped "inconsistency" reconstruction got
    backwards, re-derived here as well as through the registry.

    Two readings of the same projection, deliberately: this one is written in
    the terms the issue was filed in (all three chain lengths, named), so a
    failure here says *which* study grew and by how much rather than only that
    a declared value disagreed.
    """
    projection = json.loads(
        _topologies_projection_path().read_text(encoding="utf-8")
    )
    topology = next(
        t for t in projection["topologies"] if t["id"] == SUBJECT_TOPOLOGY
    )
    chain_lengths = {
        study["id"]: len(study["selection"]) for study in topology["studies"]
    }
    assert chain_lengths, (
        f"{SUBJECT_TOPOLOGY} has no studies -- the topology changed shape")
    smallest = min(chain_lengths, key=chain_lengths.get)
    assert smallest == "pitch_link_thread_region_t", (
        f"expected pitch_link_thread_region_t to have the smallest chain; "
        f"chain lengths are {chain_lengths}"
    )

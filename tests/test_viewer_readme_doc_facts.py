"""Two ``apps/viewer/README.md`` passages, guarded against restating a count
that has already moved.

**The mutation-witness tier's own count.** The paragraph used to say "three
of the declared witnesses are `[real]` checks" -- true when written, wrong
twice since (measured 12 -> 27 declared, 6 -> 7 `[real]` across two days), and
about to move again the moment a parallel handoff appends to
``scripts/mutation_witnesses.json``. ``scripts/mutation_witnesses.json``'s own
``about`` block already made this retreat once ("all eighteen" -> "a full run
of every suite"); this module pins the same retreat here so a future author
cannot quietly put the digit back. The trap this repo already recorded
(``apps/viewer/tests.js`` ~9578, the README's hover-card divergence count) is
pinning a digit without pinning the noun it is a count OF -- a bare
digit/number-word scan would flag both "the other two do" (the other two test
tiers) and "five different review sessions" a few sentences up just as readily
as a real regression, so the scan below anchors the quantifier directly onto
the phrase it would be counting.

**The Studies section's "inconsistency" claim.** The paragraph asserted that
two of ``pitch_link_to_pitch_plate``'s studies dropped rows while the third's
chain "covered nearly everything" -- filed as
``ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_change_does_not_reproduce.md``
because it does not reproduce on either the pre-change nav-click behaviour or
the pre-change deep-link behaviour: in both, all three studies behaved
alike (chain mode dropped rows uniformly and dimmed nothing; topology mode
dropped nothing and dimmed uniformly), and ``pitch_link_thread_region_t`` is
the *smallest* of the three chains -- 2 of 10 edges in the live topology
today (this module's own re-derivation, ``tests/test_viewer_readme_doc_facts.
py::test_thread_region_t_is_the_smallest_chain_not_the_largest``), 2 of 8 when
the issue measured the pre-change tree a day earlier -- never the one that
"covered nearly everything". The paragraph was rewritten to keep Jeff's
verbatim quote and the decision (one layout, varying emphasis) and drop the
per-study reconstruction; this module guards against that reconstruction
coming back.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_README = REPO_ROOT / "apps" / "viewer" / "README.md"
TOPOLOGIES_PROJECTION_CANDIDATES = (
    REPO_ROOT / "data" / "projections" / "viewer" / "topologies.json",
    Path("C:/workspace/tolstack/data/projections/viewer/topologies.json"),
)

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}
_QUANT = r"(?:\d+|" + "|".join(NUMBER_WORDS) + r"|dozen)"
#: The quantifier anchored directly onto the noun it would be counting --
#: not "a digit anywhere in the section", which is exactly the trap this
#: module's docstring names ("five different review sessions" sits two
#: sentences away from the witness-count sentence and must not trip this).
_WITNESS_COUNT_CLAIM = re.compile(
    rf"\b{_QUANT}\b\s+of the declared witness", re.IGNORECASE
)
_REAL_COUNT_CLAIM = re.compile(
    rf"\b{_QUANT}\b\s+(?:of the (?:declared witnesses )?)?\W{{0,3}}\[real\]",
    re.IGNORECASE,
)


def _section(markdown: str, heading: str) -> str:
    lines = markdown.splitlines()
    level = len(heading) - len(heading.lstrip("#"))
    start = None
    for i, line in enumerate(lines):
        if line.strip() == heading:
            start = i + 1
            break
    if start is None:
        raise LookupError(f"apps/viewer/README.md: no {heading!r} heading found")
    end = start
    while end < len(lines):
        stripped = lines[end].strip()
        if stripped.startswith("#"):
            this_level = len(stripped) - len(stripped.lstrip("#"))
            if this_level <= level:
                break
        end += 1
    section = "\n".join(lines[start:end]).strip()
    if not section:
        raise ValueError(f"apps/viewer/README.md: {heading!r} section is empty")
    return section


def quantified_witness_claims(text: str) -> list[str]:
    """A quantifier anchored directly onto "of the declared witness[es]" or
    onto `` `[real]` `` -- the shape that has been wrong twice, not "any digit
    anywhere in this section" (a bare digit-or-number-word scan would also
    flag "the other two do" -- referring to the other two test tiers -- and
    "five different review sessions", neither of which is a witness count)."""
    return (
        [m.group(0) for m in _WITNESS_COUNT_CLAIM.finditer(text)]
        + [m.group(0) for m in _REAL_COUNT_CLAIM.finditer(text)]
    )


#: The two-sided claim item 6 removed: a per-study row-drop count paired with
#: a coverage claim, both naming pitch_link_to_pitch_plate.
_ROW_DROP = re.compile(r"dropped rows", re.IGNORECASE)
_COVERAGE = re.compile(r"covered nearly everything", re.IGNORECASE)


def per_study_inconsistency_claim(text: str) -> list[str]:
    """Both halves of the removed two-sided claim, together.

    Either phrase alone is not the defect -- the rewritten section still
    says every study "dropped ... rows" under the old behaviour, uniformly,
    which is true and stays. What must not come back is the PAIRING: a
    row-drop claim standing opposite a coverage claim, which is what made
    the three studies read as behaving differently from one another.
    """
    found = []
    if _ROW_DROP.search(text):
        found.append("dropped rows")
    if _COVERAGE.search(text):
        found.append("covered nearly everything")
    return found if len(found) == 2 else []


# --------------------------------------------------------------------------- #
# 1. extraction, asserted non-empty                                          #
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def readme_text() -> str:
    return VIEWER_README.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def mutation_tier_section(readme_text) -> str:
    return _section(readme_text, "### The mutation-witness tier")


@pytest.fixture(scope="module")
def studies_section(readme_text) -> str:
    return _section(readme_text, "### Studies")


def test_the_sections_are_not_vacuous(mutation_tier_section, studies_section):
    assert "declared" in mutation_tier_section
    assert "pitch_link" in studies_section or "chain" in studies_section


# --------------------------------------------------------------------------- #
# 2. the pairings                                                             #
# --------------------------------------------------------------------------- #

def test_the_mutation_tier_section_states_no_witness_count(mutation_tier_section):
    problems = quantified_witness_claims(mutation_tier_section)
    assert problems == [], (
        "apps/viewer/README.md's mutation-witness tier section counts the "
        f"declared witnesses or the `[real]` checks again: {problems}. That "
        "count has been wrong twice already and a parallel handoff appends "
        "to scripts/mutation_witnesses.json, so state it without a number -- "
        "'some of the declared witnesses are `[real]` checks' -- and point at "
        "the runner's own printed output for the exact figure."
    )


def test_the_studies_section_does_not_reassert_the_per_study_claim(studies_section):
    problems = per_study_inconsistency_claim(studies_section)
    assert problems == [], (
        "apps/viewer/README.md's Studies section reasserts a per-study "
        f"row-drop/coverage claim: {problems}. "
        "ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_"
        "change_does_not_reproduce.md found this does not reproduce on either "
        "the old chain-mode or topology-mode behaviour, and "
        "pitch_link_thread_region_t is the smallest of the three chains, not "
        "the one that 'covered nearly everything'. Keep Jeff's verbatim quote "
        "and the one-layout decision; do not restate which studies dropped "
        "what."
    )


# --------------------------------------------------------------------------- #
# 3. the re-derivation the studies-section fix rests on -- [real] tier       #
# --------------------------------------------------------------------------- #

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
    """[real]: the fact the README's dropped "inconsistency" reconstruction
    got backwards -- ``pitch_link_thread_region_t`` names the study with the
    fewest chain edges of the three, never the one whose chain "covered
    nearly everything"."""
    projection = json.loads(
        _topologies_projection_path().read_text(encoding="utf-8")
    )
    topology = next(
        t for t in projection["topologies"] if t["id"] == "pitch_link_to_pitch_plate"
    )
    chain_lengths = {
        study["id"]: len(study["selection"]) for study in topology["studies"]
    }
    assert chain_lengths, "pitch_link_to_pitch_plate has no studies -- the topology changed shape"
    smallest = min(chain_lengths, key=chain_lengths.get)
    assert smallest == "pitch_link_thread_region_t", (
        f"expected pitch_link_thread_region_t to have the smallest chain; "
        f"chain lengths are {chain_lengths}"
    )


# --------------------------------------------------------------------------- #
# 4. negative controls -- the scans, shown catching what they exist to catch #
# --------------------------------------------------------------------------- #

def test_the_witness_count_scan_can_fail():
    assert quantified_witness_claims(
        "It takes `--repo` for the same reason the other two do: three of "
        "the declared witnesses are `[real]` checks."
    ) != []
    assert quantified_witness_claims(
        "It takes `--repo` for the same reason the other two do: seven "
        "`[real]` checks are declared."
    ) != []
    # The trap this test exists to avoid: a quantifier with no witness noun
    # anchored onto it must NOT trip the scan -- "the other two" (tiers) and
    # "five different review sessions" are both real sentences in this
    # section today, and neither is a witness count.
    assert quantified_witness_claims(
        "It takes `--repo` for the same reason the other two do: some of "
        "the declared witnesses redden `[real]` checks."
    ) == []
    assert quantified_witness_claims(
        "the answer turned out to be no in five guards filed by five "
        "different review sessions between 2026-09-11 and 2026-09-15."
    ) == []
    # The corrected shape.
    assert quantified_witness_claims(
        "some of the declared witnesses are `[real]` checks."
    ) == []


def test_the_per_study_claim_scan_can_fail():
    assert per_study_inconsistency_claim(
        "two of `pitch_link_to_pitch_plate`'s studies dropped rows while the "
        "third's chain covered nearly everything."
    ) == ["dropped rows", "covered nearly everything"]
    # Either phrase alone -- including the rewritten section's own uniform
    # claim -- must NOT trip the scan; only the pairing is the defect.
    assert per_study_inconsistency_claim(
        "every study dropped its non-chain rows and none of them dimmed "
        "anything, so there was nothing on screen to notice was missing."
    ) == []
    assert per_study_inconsistency_claim(
        "the third's chain covered nearly everything on its own."
    ) == []
    assert per_study_inconsistency_claim(
        "One layout, varying emphasis, is the fix."
    ) == []

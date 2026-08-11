"""The SOP's own worked examples and rules, asserted instead of read.

``docs/SOP_TOLERANCE_STACK.md`` is where an author learns the shapes. When the code
moves and the SOP does not, the SOP teaches the wrong shape to the next author with
nothing failing. That has now happened **three times**:

===  ==============================  ==========================================
 #   vocabulary                      how it drifted
===  ==============================  ==========================================
 1   ``StackElement.role``           the SOP's list omitted ``nut_geometry``,
                                     which the seeded take-2 used three times
 2   ``SourceRef.kind``              ``spec`` was mandated in prose and missing
                                     from the whitelist; ``kind`` then broke the
                                     suite
 3   ``hardware_entry.library_ref``  the SOP said the ref "stays null … a test
                                     asserts it is null" for six days after
                                     ``spec_library_v0`` filled one and
                                     generalised the test to the **pairing**
===  ==============================  ==========================================

Sighting 1 was mechanised by
``test_element_role_comes_from_the_documented_vocabulary`` -- but that test pins
the vocabulary in *a third copy* of it rather than reading the SOP, so the SOP can
still drift away from the pair. This module reads the SOP.

Two checks, and they catch different failures, which is the point worth carrying
forward (``sop_library_ref_pairing``, 2026-08-11):

1. **The examples.** Every ``hardware_entry`` example in the SOP's Step 4 is
   parsed and run through ``hardware_entry_problems`` -- the same function that
   checks the real entries -- and then compared field by field against the real
   entry it is abridged from. An example is a fixture, so treat it as one.
2. **The rule.** A scan for prose still asserting the *superseded* rule (the ref
   is null by fiat). This is what would actually have caught sighting 3: the
   SOP's example was internally valid and every value the data used was
   documented, so no vocabulary or example check fires on it. Only the sentence
   was wrong.

Check 1 would have caught neither sighting 3 nor sightings 1-2; check 2 catches
only what someone has written a phrase for. That gap is reported in
``docs/sessions/lessons/LESSONS_20260811_sop_library_ref_pairing.md`` rather than
papered over: prose cannot be parsed, and the durable fix is a definition-of-done
line that updates the SOP in the handoff that changes the invariant.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pytest

from tests.test_tolerance_stack import STACKS_DIR, hardware_entry_problems

REPO_ROOT = Path(__file__).resolve().parent.parent
SOP_PATH = REPO_ROOT / "docs" / "SOP_TOLERANCE_STACK.md"

#: This module: its phrase list below *is* the superseded prose, so scanning it
#: would report itself. Named and narrow, like ``test_provenance._SELF`` -- an
#: exclusion by directory would be a place to hide a claim.
_SELF = "tests/test_sop_vocabulary.py"

#: What someone believed on a date. Rewriting a review report or a filed issue to
#: match today's rules destroys the evidence the correction rests on, so they are
#: out of scope -- the same scoping the traced-ratio doc test and
#: ``test_provenance`` use. ``docs/reference/`` is an insert-only import.
_HISTORICAL = ("docs/sessions/", "docs/issues/", "docs/reference/",
               "apps/viewer/vendor/")
_SCANNED_SUFFIXES = {".md", ".py", ".json"}


# --------------------------------------------------------------------------- #
# 1. the SOP's worked examples, as fixtures                                   #
# --------------------------------------------------------------------------- #

def sop_json_blocks(heading_prefix: str, text: str | None = None) -> list[dict]:
    """Parsed ```json blocks inside the first ``## `` section matching a prefix.

    Takes ``text`` so the same extraction can be replayed against a blob out of
    git history (see the sighting-3 replay below) rather than only the worktree.
    """
    lines = (text if text is not None else SOP_PATH.read_text(encoding="utf-8")).splitlines()
    out: list[dict] = []
    inside, fenced = False, None
    for line in lines:
        if line.startswith("## "):
            if inside:
                break
            inside = line[3:].strip().startswith(heading_prefix)
            continue
        if not inside:
            continue
        if fenced is None:
            if line.strip() == "```json":
                fenced = []
            continue
        if line.strip() == "```":
            out.append(json.loads("\n".join(fenced)))
            fenced = None
            continue
        fenced.append(line)
    return out


def test_the_sop_step_4_examples_obey_the_invariants_they_teach():
    """The SOP's `hardware_entry` examples, checked like data.

    Both halves of the pairing must be *shown*, because the example is what gets
    copied: one part with no library subject (`inline` / null ref) and one the
    library holds (`library` / filled ref, `values_source` **retained** -- the
    field most likely to be got wrong, since a promotion demotes the inline
    numbers to a cross-check rather than deleting them).

    The comparison against the real entries is field-restricted on purpose: the
    examples abridge `note`, `nomenclature`, `used_by` and `gaps` prose, and
    demanding byte-equality there would make the SOP unable to abridge anything.
    What is compared is everything that carries a rule.
    """
    examples = sop_json_blocks("Step 4")
    entries = {
        e["id"]: e for e in
        json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))["entries"]
    }

    problems: list[str] = []
    for example in examples:
        eid = example.get("id", "<no id>")
        problems += [f"SOP Step 4 example {p}" for p in hardware_entry_problems(example)]
        real = entries.get(eid)
        if real is None:
            problems.append(
                f"SOP Step 4 example {eid} is not an entry in hardware_entries.json -- "
                f"the examples are abridged real entries so the two cannot disagree"
            )
            continue
        for field in ("values_status", "library_ref", "standard", "dash", "class"):
            if field in example and example[field] != real.get(field):
                problems.append(
                    f"{eid}: SOP says {field}={example[field]!r}, the entry says "
                    f"{real.get(field)!r}"
                )
        src, real_src = example.get("values_source"), real.get("values_source")
        if (src is None) != (real_src is None):
            problems.append(f"{eid}: SOP and the entry disagree on whether values_source is null")
        elif src is not None:
            for key in ("kind", "document", "sheet", "cell", "confidence"):
                if key in src and src[key] != real_src.get(key):
                    problems.append(
                        f"{eid}: SOP says values_source.{key}={src[key]!r}, the entry "
                        f"says {real_src.get(key)!r}"
                    )
        for key, value in example.get("dimensions_in", {}).items():
            if real.get("dimensions_in", {}).get(key) != value:
                problems.append(
                    f"{eid}: SOP says dimensions_in.{key}={value!r}, the entry says "
                    f"{real.get('dimensions_in', {}).get(key)!r}"
                )
    assert problems == [], (
        "docs/SOP_TOLERANCE_STACK.md's Step 4 examples disagree with the rules or "
        "with the entries they are abridged from:\n" + "\n".join(f"  {p}" for p in problems)
    )

    # Anti-vacuity, and the deliverable itself: both halves of the pairing are
    # shown, and the promoted one keeps its values_source. Without this the test
    # passes on a Step 4 that only ever shows a null ref -- which is the state
    # this handoff was filed to fix.
    shown = {e["id"]: e["library_ref"] for e in examples}
    assert shown == {
        "NAS1149V0332": None,
        "NAS6403U11D": "spec_library:NAS6403U11D",
    }, f"Step 4 must show both halves of the pairing; it shows {shown}"
    promoted = next(e for e in examples if e["library_ref"])
    assert promoted["values_status"] == "library"
    assert promoted["values_source"], (
        "the promoted example must KEEP its values_source -- an example that drops it "
        "teaches the opposite of the rule"
    )
    assert promoted["dimensions_in"], (
        "the promoted example must keep its inline dimensions -- they are the "
        "cross-check, not deleted values"
    )


# --------------------------------------------------------------------------- #
# 2. the rule: prose still asserting that the ref is null by fiat             #
# --------------------------------------------------------------------------- #

#: Phrasings that assert the **superseded** rule. Not a parse of English: these
#: are the forms the five drifted sites actually used, plus the two ways it is
#: most likely to be written again. The same shape as the traced-ratio doc test --
#: a literal for the wrong number, and a blockquote escape so a dated correction
#: may quote it.
_SUPERSEDED_PROSE = (
    "stays null",
    "stay null",
    "always null",
    "has a null library_ref",
    "empty library_ref",
    "until a fastener library",
    "asserts it is null",
)
#: The reference is what the phrase must be *near*: the same claim about
#: ``materials.json`` is still TRUE (there is no materials library), so proximity
#: to this token, not the phrase alone, is the check.
_SUBJECT = "library_ref"
#: How far a phrase may sit from ``library_ref`` and still be about it. Wide
#: enough to survive markdown line wrapping, narrow enough that a giant
#: PROVENANCE table cell mentioning both `library_ref` and "``element_id`` /
#: ``run_id`` stay null" is not a hit. Both cases are real; 120 separates them.
_WINDOW = 120
_NEGATED_RE = re.compile(r"(not|no longer|never|nor|n't|instead of|rather than)\W*$", re.I)


@dataclass(frozen=True)
class Claim:
    path: str
    line: int           # 1-based, the start of the block the claim sits in
    phrase: str
    denied: bool        # "`library_ref` is no longer always null" is not a claim
    excerpt: str


def _blocks(lines: list[str]) -> list[tuple[int, int]]:
    """Maximal runs of consecutive non-blank lines, as 1-based inclusive spans."""
    spans, start = [], None
    for n, line in enumerate(lines, 1):
        if line.strip():
            start = start or n
        elif start:
            spans.append((start, n - 1))
            start = None
    if start:
        spans.append((start, len(lines)))
    return spans


def claims_in(rel: str, text: str) -> list[Claim]:
    """Every superseded-nullness claim in one file's text.

    Pure, so the scan that guards the working tree can be replayed against a blob
    out of history -- which is how the sighting it was written for is *replayed*
    rather than mimicked.

    Blockquoted lines are dropped before matching, not whole blocks: a dated
    correction quoting the old wording sits inside the very bullet that replaced
    it, with no blank line between them.
    """
    out: list[Claim] = []
    lines = text.splitlines()
    for start, end in _blocks(lines):
        block = [
            line for line in lines[start - 1:end]
            if not line.lstrip().startswith(">")
        ]
        flat = re.sub(r"\s+", " ", re.sub(r"[`*]", "", " ".join(block))).lower()
        for m in re.finditer(re.escape(_SUBJECT), flat):
            window = flat[max(0, m.start() - _WINDOW):m.end() + _WINDOW]
            for phrase in _SUPERSEDED_PROSE:
                i = window.find(phrase)
                if i < 0:
                    continue
                out.append(Claim(
                    path=rel, line=start, phrase=phrase,
                    denied=bool(_NEGATED_RE.search(window[max(0, i - 30):i])),
                    excerpt=window[:180],
                ))
    return out


def _git(*args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(REPO_ROOT), *args],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0:
        raise AssertionError(f"git {' '.join(args)} failed: {proc.stderr.strip()}")
    return proc.stdout


def claim_inventory() -> list[Claim]:
    """Every such claim in a live, tracked file.

    The file list comes from ``git ls-files``, not from a list in here: sighting 3
    of the *other* recurring class in this repo was a phrase that had escaped into
    a stack note, a worksheet headline and two test comments -- exactly the files a
    hand-kept list would not have contained.
    """
    out: list[Claim] = []
    for rel in _git("ls-files").splitlines():
        rel = rel.strip().replace("\\", "/")
        if not rel or rel == _SELF or rel.startswith(_HISTORICAL):
            continue
        if Path(rel).suffix.lower() not in _SCANNED_SUFFIXES:
            continue
        path = REPO_ROOT / rel
        if not path.exists():           # gitignored-and-absent in a worktree
            continue
        out += claims_in(rel, path.read_text(encoding="utf-8", errors="replace"))
    return out


def test_no_live_doc_still_asserts_the_superseded_nullness_rule():
    """Sighting 3, mechanised at the level it actually failed: the sentence.

    ``hardware_entry.library_ref`` is null on most entries and that is fine -- the
    rule is the **pairing**, and prose that promotes "usually null" to "always
    null" is what sent an author to break the pairing test. The identical claim
    about ``materials.json`` is still true (no materials library exists), so the
    check is proximity to the token ``library_ref``, not the phrase alone.

    A *denied* form ("`library_ref` is **no longer** always null") is a correction,
    not a claim, and is only reported.
    """
    inventory = claim_inventory()
    asserted = [c for c in inventory if not c.denied]
    assert asserted == [], (
        "these live files still assert that `library_ref` is null by fiat, which has "
        "been false since 2026-08-05:\n"
        + "\n".join(f"  {c.path}:{c.line}  <{c.phrase}>  {c.excerpt}" for c in asserted)
        + "\n\nThe invariant is the pairing -- a filled ref <=> `values_status == "
          "\"library\"`. State that instead, and if you are correcting an old wording "
          "in place, put the quotation in a blockquote (`>`), which is this repo's "
          "rule for a claim a review has already read."
    )


#: ``master`` before this branch: the tip of the tree that carried the drift for
#: six days. A commit, so it does not move -- the same convention
#: ``test_provenance``'s ``_SIGHTINGS`` uses.
_SIGHTING_THREE = ("abfaf5a", "docs/SOP_TOLERANCE_STACK.md")


def test_the_scan_catches_the_reconstructed_sighting_three():
    """Red against the real drift, not a synthetic one.

    A check for a three-time recurrence demonstrated only on a mock has not earned
    its place in the suite. This replays the actual blob: at ``abfaf5a`` the SOP
    said the ref stays null in five places, and the scan must name it. If this
    passes while the test above also passes, the scan has stopped scanning.
    """
    rev, rel = _SIGHTING_THREE
    proc = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "cat-file", "blob", f"{rev}:{rel}"],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0:
        pytest.skip(f"{rev}:{rel} is not in this checkout's history")
    caught = [c for c in claims_in(rel, proc.stdout) if not c.denied]
    assert caught, f"the scan finds nothing wrong with {rel} at {rev} -- it should"
    assert {c.phrase for c in caught} >= {"stays null", "empty library_ref"}, (
        f"expected the two headline phrasings; got {sorted({c.phrase for c in caught})}"
    )

    # And the example block at that revision fails the invariant comparison for
    # the reason the issue named: it shows a null ref and nothing shows a filled
    # one, so an author copying it cannot get the promoted case right.
    old = sop_json_blocks("Step 4", proc.stdout)
    assert [e["library_ref"] for e in old] == [None], (
        "at abfaf5a Step 4 had exactly one example and its library_ref was null"
    )

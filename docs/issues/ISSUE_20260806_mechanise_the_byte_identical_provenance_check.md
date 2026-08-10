---
type: chore
priority: high
status: triaged
handoff: docs/sessions/HANDOFF_20260810_provenance_byte_identical_test.md
area: provenance / tests
reporter: agent
---

# Five sightings, five reviewer fixes, zero author catches: make a test assert PROVENANCE's "byte-identical" rows against `git diff`

Filed by `review/traced_labels_and_ratio` (2026-08-06). The review checklist's
own escalation trigger for this bug has fired: it said *"on a fifth sighting,
stop amending and mechanise it"*, and this is the fifth.

## The record

`PROVENANCE.md` declares imported files byte-identical to their drawing-checker
originals. Every sighting is the same shape — a handoff changed such a file for a
perfectly good reason and did not amend the row, leaving the repo's provenance
record making a false claim, which is this repo's self-declared worst class of
defect.

| # | handoff | rows falsified | caught by |
|---|---|---|---|
| 1 | `pitch_link_stack` (08-04) | `stack.py`, `test_tolerance_stack.py`, `hardware_entries.json`, worksheets README | review |
| 2 | `spec_library_v0` (08-05) | `tolerance_stack/__init__.py` — a *package* row nobody watched | review |
| 3 | `hub_bearing_thermal_stack` (08-05) | the phrase had escaped PROVENANCE entirely into a stack note, a worksheet headline and two test comments | review |
| 4 | `citation_export_provenance` (08-06) | both seeded stack JSONs; three Amended rows stale | review |
| 5 | `traced_labels_and_ratio` (08-06) | the same two stack JSONs, both seeded worksheets, `debug_report_tolerance_stacks.py`, the `docs/reference/` section | review |

**Zero of the five were caught by the author.** Sightings 4 and 5 were parallel
handoffs on the same day, and each review independently wrote "fourth sighting"
in the checklist without knowing about the other — so the checklist itself now
demonstrates that a human-executed check does not compose across concurrent work.

Two of them are worse than a stale note. Sighting 4 was a handoff **whose entire
subject was provenance**; sighting 5 was a handoff **whose entire purpose was to
correct a false provenance claim**. Caring about provenance demonstrably does not
catch this. Only running the diff does, and a reviewer running it five times in a
row is a test that has not been written yet.

## What to build

A test in `tests/` that:

1. Parses `PROVENANCE.md`'s tables for every row whose Amended cell asserts
   byte-identity (today: the literal `no — byte-identical`, and mind the em dash
   and the parenthesised variants like *"no — byte-identical (every citation
   is…)"*).
2. Diffs each such source path against the merge-base — `git diff
   $(git merge-base HEAD master)..HEAD --name-only`, or against the recorded
   import commit `0743640` for an absolute check.
3. Fails naming any path that appears in both sets.

Points to get right, each learned from a sighting above:

- **A purely additive change still falsifies the row** (sighting 4). Do not
  exempt "no value changed".
- **Don't stop at the three SOP-mandated files.** The rows that go false are
  whichever ones had never moved before, so the test must be derived from the
  document rather than from a hand-kept list of watched files.
- **The claim also lives outside PROVENANCE** (sighting 3): a grep for
  "byte-identical" across `docs/`, worksheets and test comments should at minimum
  be reported, even if only PROVENANCE rows are asserted. Consider failing on any
  occurrence of the phrase that does not carry a verification pointer.
- **`docs/reference/` verbatim-ness is the same claim in prose form** and is not
  in a table row. Either extend the parse to that section or assert it separately.
- Make the failure message say *which row* and *what to write*, because the fix is
  always "append an Amended clause in this commit", and the point is for the
  author to do it before a reviewer has to.

## Also worth deciding

Whether `docs/reference/` edits are permitted at all. `review/traced_labels_and_ratio`
let an additive, dated correction blockquote stand in
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md` and recorded it in
PROVENANCE, but `ARCHITECTURE.md` and the review overlay both say the directory is
verbatim imports. That rule needs to say either "no edits" or "additive dated
corrections only, original text intact" before a test can enforce it. See
`docs/sessions/reviews/REVIEW_20260806_traced_labels_and_ratio.md`, finding S1.

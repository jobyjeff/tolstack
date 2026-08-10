---
priority: high
depends_on: []
---

# HANDOFF 2026-08-10 — provenance_byte_identical_test: five sightings, five reviewer catches, zero author catches — mechanise PROVENANCE's "byte-identical" rows against `git diff`

Source: `docs/issues/ISSUE_20260806_mechanise_the_byte_identical_provenance_check.md`
(`chore`/high, filed by `review/traced_labels_and_ratio`). Triaged 2026-08-10.
Baseline: `master`; all five handoffs named below are merged and completed. Scope:
`tests/` (the new test), `PROVENANCE.md` if the parse forces a format decision,
`ARCHITECTURE.md` / `docs/prompts/REVIEW_AGENT.md` for the `docs/reference/` rule.
Do **NOT** re-cite or relabel any stack element — the staged
`fastener_citations_and_confidence` owns that, and it `depends_on` this handoff.

## Why this is `high` despite being a test

The review checklist's own escalation trigger has fired: it said *"on a fifth
sighting, stop amending and mechanise it"*, and this is the fifth. `PROVENANCE.md`
declares imported files byte-identical to their drawing-checker originals; every
sighting is the same shape — a handoff changed such a file for a perfectly good
reason and did not amend the row, leaving the repo's provenance record making a
**false claim**, which is this repo's self-declared worst class of defect.

| # | handoff | rows falsified | caught by |
|---|---|---|---|
| 1 | `pitch_link_stack` (08-04) | `stack.py`, `test_tolerance_stack.py`, `hardware_entries.json`, worksheets README | review |
| 2 | `spec_library_v0` (08-05) | `tolerance_stack/__init__.py` — a *package* row nobody watched | review |
| 3 | `hub_bearing_thermal_stack` (08-05) | the phrase had escaped PROVENANCE entirely into a stack note, a worksheet headline and two test comments | review |
| 4 | `citation_export_provenance` (08-06) | both seeded stack JSONs; three Amended rows stale | review |
| 5 | `traced_labels_and_ratio` (08-06) | the same two stack JSONs, both seeded worksheets, `debug_report_tolerance_stacks.py`, the `docs/reference/` section | review |

**Zero of the five were caught by the author.** Sightings 4 and 5 were parallel
handoffs on the same day, and each review independently wrote "fourth sighting" in
the checklist without knowing about the other — so the checklist itself now
demonstrates that **a human-executed check does not compose across concurrent
work.** That is the argument for a test rather than a sixth amendment.

Two of them are worse than a stale note: sighting 4 was a handoff **whose entire
subject was provenance**, and sighting 5 was a handoff **whose entire purpose was to
correct a false provenance claim**. Caring about provenance demonstrably does not
catch this. Only running the diff does, and a reviewer running it five times in a row
is a test that has not been written yet.

## Deliverables

1. **The test.** In `tests/`, something that:
   1. Parses `PROVENANCE.md`'s tables for every row whose Amended cell asserts
      byte-identity — today the literal `no — byte-identical`, **and mind the em dash
      and the parenthesised variants** like *"no — byte-identical (every citation
      is…)"*.
   2. Diffs each such source path against the merge-base
      (`git diff $(git merge-base HEAD master)..HEAD --name-only`), or against the
      recorded import commit `0743640` for an absolute check. Do both if cheap: the
      merge-base form catches the author in the act, the `0743640` form catches drift
      that merged without being caught.
   3. Fails naming any path in both sets.

   Points to get right, **each learned from a sighting above** — treat these as
   requirements, not suggestions:
   - **A purely additive change still falsifies the row** (sighting 4). Do not exempt
     "no value changed".
   - **Do not stop at the three SOP-mandated files.** The rows that go false are
     whichever ones had never moved before, so the test must be **derived from the
     document** rather than from a hand-kept list of watched files. A hardcoded list
     reproduces the bug.
   - **The claim also lives outside PROVENANCE** (sighting 3): grep for
     "byte-identical" across `docs/`, worksheets and test comments and at minimum
     **report** every occurrence. Consider failing on any occurrence that does not
     carry a verification pointer.
   - **`docs/reference/` verbatim-ness is the same claim in prose form** and is not in
     a table row. Either extend the parse to that section or assert it separately —
     but see deliverable 2, which must be settled first.
   - **The failure message must say which row and what to write**, because the fix is
     always "append an Amended clause in this commit". The whole point is for the
     author to do it before a reviewer has to, so the message is the deliverable as
     much as the assertion is.

2. **Settle whether `docs/reference/` edits are permitted at all** — the test cannot
   enforce a rule that does not exist. Current state is contradictory:
   `ARCHITECTURE.md` and the review overlay both say the directory is verbatim
   imports, but `review/traced_labels_and_ratio` let an additive, dated correction
   blockquote stand in `docs/reference/LESSONS_20260729_tolerance_stack_slice1.md` and
   recorded it in PROVENANCE (see
   `docs/sessions/reviews/REVIEW_20260806_traced_labels_and_ratio.md`, finding S1).

   Pick one and write it into `ARCHITECTURE.md` and
   `docs/prompts/REVIEW_AGENT.md`:
   - **"No edits."** Then the existing blockquote is a violation to revert, and say so.
   - **"Additive dated corrections only, original text intact."** Then the test's
     assertion for this directory is *not* byte-identity but "the original text is a
     contiguous subsequence" — a different and slightly harder check. Recommended, on
     the grounds that the correction that prompted it was genuinely useful and
     reverting a true correction to satisfy a rule is the wrong trade — but argue it
     yourself; you are the one who has to implement whichever you choose.

3. **Prove the test would have caught the five sightings.** For at least sightings 4
   and 5 (the two with the clearest recorded file lists), reconstruct the falsifying
   diff and show the new test fails on it. A test for a five-time recurrence that is
   only demonstrated against a synthetic case has not earned its `high`.

## Definition of done

- The test is green on `master` as it stands, and demonstrably red against the
  reconstructed sightings from deliverable 3.
- The `docs/reference/` rule is stated in exactly one place and referenced from the
  other, with the existing blockquote either blessed or reverted per your decision.
- The "byte-identical" grep from deliverable 1 is reported: every occurrence in the
  repo, with whether it is asserted or merely stated.
- Full suite green. Repo gotcha: `venv-win` is gitignored and does not exist in a
  worktree — run `& C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`
  against your worktree's code.
- Lesson (`docs/sessions/lessons/LESSONS_20260810_provenance_byte_identical_test.md`):
  the `docs/reference/` decision and its argument; whether the PROVENANCE table format
  needed constraining to be parseable (if you had to normalise em dashes or cell
  wording, say so — the next author writing a row needs to know the format is now
  load-bearing); and whether the corresponding **review checklist item should now be
  deleted** rather than left as a sixth manual check. A machine-enforced rule and a
  human-executed one covering the same ground is how a checklist grows past the point
  anyone reads it.

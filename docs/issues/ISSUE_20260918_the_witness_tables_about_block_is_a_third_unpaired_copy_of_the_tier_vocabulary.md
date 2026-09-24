---
type: chore
priority: med
status: resolved
area: scripts/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
---

# `mutation_witnesses.json`'s `about` block spells every tier word, then says the words live "in exactly two places"

`scripts/mutation_witnesses.json`'s `about` block carries a bulleted tier list —
one entry per tier word (`fast`, `annotate`, `browser`, and since 2026-09-18
`python`), each with a paragraph of prose. Immediately under that list it says:

> The tier words themselves are written in exactly two places -- `TIER_HARNESS` in
> run_mutation_witness_tests.mjs and `TIERS`/`CHECK_SOURCE` in
> tests/test_mutation_witnesses.py -- and paired against each other on
> every pytest run.

The bulleted list above it is the **third** place, and nothing pairs it to the
other two. `tests/test_mutation_witnesses.py` pairs `TIERS` against the runner's
`TIER_HARNESS` keys (`test_the_runner_and_this_module_hold_the_same_tier_vocabulary`)
and now also against `suites: true`
(`test_the_two_sides_agree_on_which_tiers_take_a_suite`), but no test reads the
`about` block at all.

Ask the standing question — *if the source changes tomorrow, what breaks
loudly?* A fifth tier added to `TIERS` and `TIER_HARNESS`, or a tier word
renamed in both, leaves the `about` list describing a vocabulary that no longer
exists, and every pairing stays green. That is this repo's most-repeated defect
class (`docs/prompts/REVIEW_AGENT.md`, "Documented vocabularies drifting from
the seeded data"), sitting inside the very file whose job is to keep the tier
vocabulary honest.

## Why it is worth the test rather than a prose fix

Rewording the sentence to "three places" fixes today and nothing else — the
list still rots silently. The fix shape the repo already uses is a pairing test:
read the `about` block's tier-list keys (the lines matching a leading
`  <word>  ` at the list's indent) and assert the set equals `TIERS`. Roughly
the same reader `runner_tier_harness()` already is, against a different file.

Two things to get right when writing it:

- The block is a JSON **array of lines**, so the reader has to join before it
  scans — same seam problem `joined_source()` solves for check names.
- Tier words also appear inside the prose of each bullet (`A separate word
  rather than a second meaning for "fast"`), so anchor on the list's column, not
  on "does this word appear anywhere in the block".

## Provenance

Pre-existing: the sentence read "exactly two places" when the list held three
words, and `mutation_witness_enrollment_gaps` (2026-09-18) added a fourth bullet
under the same sentence without noticing. Found in review of that handoff
(`docs/sessions/reviews/REVIEW_20260918_mutation_witness_enrollment_gaps.md`),
which APPROVEd — this is not a defect in that work, it is the shape that work
made one word larger.


---

## Resolved 2026-09-23 — the block moved, and the list is paired now

`mutation_witness_derived_enrollment_and_gating`. The `about` block is gone with
the table it was in: the prose now lives at `scripts/mutation_witnesses/README.md`,
beside the one-file-per-guard specs that replaced the rows.

The fix is the one this issue asked for rather than the prose one it warned
against. `tests/test_mutation_witnesses.py::test_the_spec_readme_lists_the_tier_vocabulary_and_nothing_else`
reads the tier bullets back out of that README (anchored on the list's own
column and its backticks, per this issue's second bullet) and asserts the set
equals `TIERS`. A fifth tier added to the code and not to the page an author
enrols from is now red on the next `pytest -q`, and so is a tier renamed in the
code alone.

The count-of-places sentence went with the block. The README states where the
words are written and says the pairing exists, without asserting a number.

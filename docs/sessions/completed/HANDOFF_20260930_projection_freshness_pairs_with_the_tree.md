---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-30 — projection_freshness_pairs_with_the_tree: three inputs that change what a rebuild would write and report "fresh"

Source: `docs/issues/ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only.md`
(`med`, `bug`, `area: tests/projection-freshness`). Baseline: tolstack trunk at
the 2026-09-30 triage sweep — nothing to merge this pass. Scope:
`apps/viewer/run_tests.cjs`'s `projectionFreshness` and its input set. Do NOT
touch `scripts/guard_enumeration.mjs` or `DECLARED_GUARDS` — a sibling handoff
staged this sweep owns those (`guard_census_pins_the_set_not_the_count`); the
two share no files and run in parallel.

## The check bites; its claim is wider than its measurement

`fixture_pairing_reads_a_fresh_projection` (2026-09-24) gave the `[real]` tier a
pairing check: `projectionFreshness` reads each projection's provenance stamp
and runs `git diff --name-only <head_sha> -- <inputs>` against the tree under
test; empty diff means usable. Three arms were witnessed independently at
review (an uncommitted edit to a stamped input, a stamped commit not in the
tree, a projection with no stamp) and it caught the defect class it was written
for. **Keep all of that.**

But the comment in `run_tests.cjs`, the lesson, and the resolution on
`ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_projection_is_rebuilt`
all claim the one question *"are the inputs it was built from still what is on
disk here?"* subsumes *"a stale projection, a newer one, a divergent branch and
an uncommitted edit."* `git diff <sha> -- <paths>` answers something narrower:
*do the **tracked** files at `<sha>` still have the same content in the work
tree?* Three inputs that change what a rebuild would write are invisible, and in
each the check reports **fresh** while the tier runs its ~93 `[real]`
comparisons against a projection that does not describe this tree.

1. **An untracked file added to a projected input directory.** Measured at
   review: dropping `docs/tolerance_stacks/ZZZ_probe.json` into the review
   worktree left the banner at *projection paired with this tree*.
2. **A stamp that says `dirty: true`** — the field is read past rather than
   acted on.
3. **The input set omits the builders' sibling imports** — a change to a module
   the builder imports changes the output and is not in the diff's path list.

## What a fix has to establish, and the two constraints on it

All three are one shape: **the pairing is with `<sha>`'s tracked content, not
with the tree**, and the gap between those is where a false green lives.
Widening is cheap for 1 and 2 (one more git call; one field read) and needs a
*derivation* for 3 — probably the builder's own **import closure** rather than a
second hand-written list, since a hand list is the drift this repo keeps paying
for.

- **Direction matters more than coverage.** "Widen it on evidence" is right: an
  alarm that is always on is the failure `projection_provenance.py` already
  wrote down. Arms 1 and 2 are both quiet on a clean tree, so neither costs
  that. Arm 3 is where an over-wide input set would start crying wolf — weigh it
  accordingly, and declining arm 3 with a recorded reason is an acceptable
  outcome.
- **The input set is coupled to the mutation shadow, and this will bite you.**
  `projectionFreshness` runs with `--work-tree=<shadow>` under
  `scripts/run_mutation_witness_tests.mjs`, and the shadow holds only
  `SHADOWED`. **Every path the input set names must be in that list**, or a file
  present at `<sha>` and absent from the shadow reads as a *deletion* — the
  freshness check goes red on the **clean** run and every `fast`-tier witness
  reports `TIER_ALREADY_RED`. Widening the input set means checking `SHADOWED`
  in the same change.

## Sequencing — read this before you start

`ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`
asks **where the one freshness implementation should live**; these findings are
about **what that implementation must measure**. The issue says plainly the two
*want doing together*. Check that issue's state when you start: if it is still
open and unstaged, say so in your lesson and keep your change shaped so it can
move — do not hard-wire the logic into `apps/viewer/run_tests.cjs` in a way that
makes extracting it later expensive.

## Why opus

Arm 3 needs an import-closure derivation rather than a list, and the whole
change is fenced by a false-alarm constraint on one side and the mutation
shadow's `SHADOWED` coupling on the other — where being wrong turns the *clean*
run red and makes every fast-tier witness report `TIER_ALREADY_RED`. That is a
failure mode the tests cannot warn you about, because it *is* the tests.

## Deliverables

1. **Close arms 1 and 2** — untracked files in a projected input directory
   count as drift, and a `dirty: true` stamp is acted on rather than read past.
2. **Decide arm 3 and implement or decline in writing.** If you implement, derive
   the input set from the builder's own import closure, not a second hand list.
3. **Verify the `SHADOWED` coupling explicitly** for every path your input set
   names, and add a check that fails loudly if a named input is outside
   `SHADOWED` — that is the trap, and it should not be re-discovered by hand.
4. **Re-state the claim to match the measurement.** Fix the comment in
   `run_tests.cjs`, and say in the lesson what the check now does and does not
   subsume. The original defect here was a true check with an overreaching
   description; leaving a new overreach behind would repeat it.

## Definition of done

- Arms 1 and 2 are closed, each witnessed by a test that goes red on the drift
  and green on a clean tree.
- Arm 3 is implemented (derived, not hand-listed) or declined with a reason.
- A named input outside `SHADOWED` fails loudly rather than silently reddening
  the clean run.
- The in-code claim matches what is measured.
- Green on a clean tree: `node apps/viewer/run_tests.cjs --repo .`,
  `node scripts/run_mutation_witness_tests.mjs`, and the full
  `venv-win/Scripts/python.exe -m pytest -q` — the mutation run is the one that
  proves you did not break the shadow.
- Lesson (`docs/sessions/lessons/LESSONS_20260930_projection_freshness_pairs_with_the_tree.md`):
  what you did about arm 3 and the false-alarm tradeoff; whether the
  `SHADOWED` coupling cost you a red clean run on the way (say so — it is the
  most useful thing the next author can read); and whether you kept the logic
  extractable for the where-should-it-live question.

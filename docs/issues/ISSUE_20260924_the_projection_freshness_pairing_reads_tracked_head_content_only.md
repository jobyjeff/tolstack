---
type: bug
priority: med
status: open
area: tests/projection-freshness
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260924_fixture_pairing_reads_a_fresh_projection.md
---

# Three ways `projectionFreshness` answers "built from this tree" with a false YES

`fixture_pairing_reads_a_fresh_projection` (2026-09-24) gave the `[real]` tier a
pairing check: `apps/viewer/run_tests.cjs`'s `projectionFreshness` reads each
projection's provenance stamp and runs `git diff --name-only <head_sha> --
<inputs>` against the tree under test. Empty diff means usable. It bites — three
arms witnessed independently in review (an uncommitted edit to a stamped input,
a stamped commit not in the tree, a projection with no stamp), and it caught the
measured defect class it was written for.

The check's stated claim is stronger than what it measures. The comment in
`run_tests.cjs`, the lesson and the resolution on
`ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_projection_is_rebuilt`
all say the one question *"are the inputs it was built from still what is on
disk here?"* subsumes **"a stale projection, a newer one, a divergent branch and
an uncommitted edit."** `git diff <sha> -- <paths>` answers a narrower question:
*do the **tracked** files at `<sha>` still have the same content in the work
tree?* Three inputs that change what a rebuild would write are invisible to it,
and in all three the check reports **fresh** and the tier runs its ~93 `[real]`
comparisons against a projection that does not describe this tree.

## 1. An untracked file added to a projected input directory

Measured in review: dropping `docs/tolerance_stacks/ZZZ_probe.json` into the
review worktree and re-running left the banner at `projection paired with this
tree: results.json @ 43d7052cb540, …` and the total at `516/516 passed`.
`git diff` does not list untracked files. The builder globs the directory
(`scripts/build_viewer_projection.py:687`, `stacks_dir.glob("stack_*.json")`),
so an authored-but-uncommitted `stack_*.json` is an input the projection was
built without and the check says nothing.

`git status --porcelain --untracked-files=all -- <inputs>` (or an
`ls-files --others --exclude-standard` pass beside the diff) answers both halves
in one command.

## 2. A stamp that says `dirty: true`

`projection_provenance.stamp()` records `dirty` precisely because "`head_sha`
does not identify the code that ran" — and `projectionFreshness` never reads it.
A projection built from a dirty tree, read later from a clean tree at the same
sha, diffs empty and reports fresh, while its contents came from edits that are
in no commit. The stamp already carries the one fact that settles it; the reader
added on 2026-09-24 reads every other field of it.

## 3. The input set omits the builders' sibling imports

`inputsOf()` is `[<the stamp's source dir>, <the stamp's `built_by` script>,
"tolerance_stack"]`, and the comment calls `tolerance_stack` "the one input that
is NOT derivable from a stamp". It is not the only one.
`scripts/build_topology_projection.py` imports `build_viewer_projection`,
`build_viewer_crops` and `projection_provenance` (lines 75–96), so an edit to
`scripts/build_viewer_projection.py` marks `results.json` stale — its own
`built_by` — and leaves `topologies.json`, which that edit also changes, reading
fresh.

## What a fix has to establish

All three are the same shape: **the pairing is with `<sha>`'s tracked content,
not with the tree**, and the gap between those two is where a false green lives.
Widening is cheap for 1 and 2 (one more git call; one field read) and needs a
derivation for 3 — probably the builder's own import closure rather than a
second hand-written list, since a hand list is the drift this repo keeps paying
for.

Two constraints on whoever takes it:

- **Direction matters more than coverage.** The lesson's "widen it on evidence"
  is right: an alarm that is always on is the failure
  `projection_provenance.py` already wrote down. 1 and 2 are both quiet on a
  clean tree, so neither costs that.
- **The input set is coupled to the mutation shadow.** `projectionFreshness`
  runs with `--work-tree=<shadow>` under
  `scripts/run_mutation_witness_tests.mjs`, and the shadow holds only
  `SHADOWED`. Every path the input set names must be in that list or a file
  present at `<sha>` and absent from the shadow reads as a deletion, the
  freshness check is red on the *clean* run, and every `fast`-tier witness
  reports `TIER_ALREADY_RED`. Widening the input set means checking `SHADOWED`
  in the same diff.

Related: `ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`
asks where the one freshness implementation should live. These findings are
about what that implementation must measure; the two want doing together.

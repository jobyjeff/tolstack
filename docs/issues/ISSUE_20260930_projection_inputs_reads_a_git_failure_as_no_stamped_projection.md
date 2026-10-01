---
type: bug
priority: low
status: deferred
area: tests/projection-freshness
class: reason_free_failure_path
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_projection_freshness_pairs_with_the_tree.md
defer_until: 2026-10-31
---

# `projectionInputs` returns an empty set when git cannot be asked, and the preflight reads that as "no stamped projection"

Found in review of `projection_freshness_pairs_with_the_tree` (2026-09-30),
round 2. Left unfixed because the fix is a behaviour change and the condition is
not reachable on any path this repo actually runs — filed so it does not stop
existing when that handoff completes.

`scripts/projection_freshness.cjs::projectionInputs` opens with:

```
const gitArgs = gitContext(treeRoot);
if (gitArgs === null) return [];
```

`gitContext` returns `null` for exactly one reason — `git rev-parse
--absolute-git-dir` failed, i.e. the tree under test is not a git tree — and the
empty array it returns back is **indistinguishable from "no projection under
`dataRoot` carries a stamp"**, which is the ordinary, expected, exit-0 answer
from a worktree.

Its sibling gets the same condition right. `projectionFreshness` calls the same
helper and, on `null`, returns `fresh: false` with a `why` that names the tree
and says a comparison against a projection of unknown provenance is not a check.
Measured, against a tmp directory that is not a repo:

```
$ node scripts/projection_freshness.cjs --repo C:/workspace/tolstack --tree /tmp/notarepo
git could not be asked which tree ...\notarepo is, so the projection under
C:\workspace\tolstack could not be paired with it. ...          # exit 1
$ node scripts/projection_freshness.cjs --repo C:/workspace/tolstack --tree /tmp/notarepo --inputs
                                                                 # exit 0, zero bytes
```

## Why it matters where it matters

The consumer is `reportShadowGaps` in
`scripts/run_mutation_witness_tests.mjs`, which is the deliverable-3 preflight
(`--check-shadow-covers-projection-inputs`). On an empty input set it prints:

> note: no stamped projection under `<DATA_REPO>` (looked under
> data/projections/viewer/), so the input set the freshness check will name is
> empty and SHADOWED's coverage of it could not be checked. Pass --repo
> `<main checkout>`.

...and returns 0. That sentence is true for the intended case and false for this
one, and the remedy it offers — pass `--repo` — is about the **data** root, while
the thing that failed is the **tree** root. So the one failure this guard exists
to catch early would be reported as a green with a misleading instruction.

## Why it is `low`

`REPO` in the runner is the checkout the script itself lives in, and `--tree`
defaults to this file's own checkout, so reaching `gitContext(...) === null`
means running the check from a tree that is not under git at all. Nothing in
this repo does that: git is a hard requirement of every tier that calls it, and
the mutation shadow is inside the repo by construction. This is the
reason-free-failure-path class (`dispatch/docs/reports/REPORT_20260921_bug_pareto.md`,
the widest-spread class in the workspace) caught before it has cost anybody
anything, not an observed failure.

## Shape of a fix

Give `projectionInputs` the same two-outcome return its sibling has, rather than
letting "cannot know" and "nothing to know" share a value: either return
`{inputs, why}` (with `why` non-null only when git could not be asked), or throw
and let the two callers decide. `reportShadowGaps` should then print the tree it
could not read and return non-zero, because a coverage check that could not be
performed is not a coverage check that passed — which is the same argument
`tests/test_viewer_js_suite.py` already makes about a skipped tier, and the same
one the freshness module's own header makes about an unstamped projection.

Related: `ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`
asks where the one freshness implementation should live. If that move happens,
this is a seam to settle in the same pass rather than to port twice.

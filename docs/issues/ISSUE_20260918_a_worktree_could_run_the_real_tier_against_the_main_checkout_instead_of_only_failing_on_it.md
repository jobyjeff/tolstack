---
type: feature
priority: med
status: open
area: tests/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_real_tier_red_and_the_skipping_tier.md
---

# A worktree could RUN the `[real]` tier against the main checkout instead of only failing on it — and that, not the failure, is what would have caught 2026-09-18

`real_tier_red_and_the_skipping_tier` made `tests/test_viewer_js_suite.py` fail
when the viewer's JS runner reports a skipped tier, which is what its handoff
asked for: a tier that cannot run is not a tier that passed, and the batch merge
that put two red `[real]` assertions on trunk did it by reading
`1203 passed, 1 skipped` as green.

That closes the *mis-reading*. It does not close the *gap*. A worktree's
`pytest -q` is now red for an environment reason, and 86 `[real]` checks still
do not run there — including the two that were wrong. A batch-merge candidate
worktree would now go red rather than green, which blocks the bad merge, but it
blocks every other merge identically and tells a merger nothing about the code.

## The alternative that was considered and not taken

The runner already has the seam: `node apps/viewer/run_tests.cjs --repo
<main checkout>` points the node-fs tier at the checkout that owns `data/`, and
agents type it by hand routinely (it is in two prior issues' repro steps). The
wrapper can find that path without hardcoding it — a worktree's
`git rev-parse --path-format=absolute --git-common-dir` resolves into the main
checkout's git dir, and its parent is the checkout. That function is already in
`tests/test_viewer_js_suite.py`; it is used only to write the remedy into the
failure message.

Wired up, a worktree would run all 455 checks against the live projections, and
the 2026-09-18 candidate worktree would have gone red **on the two real
assertions** rather than on a missing directory.

## Why it is a strategy question and not a one-line change

Reaching through the seam means a branch's JS is checked against a projection
built from a **different tree** — which is exactly the standing condition that
produced both this red and
`ISSUE_20260916_a_real_check_still_pins_the_zero_width_washer_the_rotor_citation_fix_removed`.
The trade is real in both directions:

- **For**: the `[real]` tier is the only tier that reads Jeff's actual stacks,
  and it currently runs nowhere except the main checkout, by hand.
- **Against**: every handoff worktree would inherit a red whenever the shared
  projection lags or leads its branch — a red about somebody else's tree, on
  every branch at once, which is the failure mode this repo's own runner comment
  warns about when it calls `--repo` an "escape hatch" rather than a default.

A middle position exists (run it, and report a projection whose provenance
`head_sha` is not an ancestor of the branch as a distinct, named state rather
than as a test failure) but it needs deciding, not guessing —
`scripts/projection_provenance.py` already computes exactly that comparison for
the builders' `--allow-older-tree` gate.

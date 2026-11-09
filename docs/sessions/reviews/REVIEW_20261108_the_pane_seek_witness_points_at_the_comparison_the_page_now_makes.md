---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_pane_seek_witness_points_at_the_comparison_the_page_now_makes.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-11-08: the_pane_seek_witness_points_at_the_comparison_the_page_now_makes

Branch `handoff/the_pane_seek_witness_points_at_the_comparison_the_page_now_makes`
(`dd2b24a7`), one commit, not contained in `integration` before review.

## What the work does

Re-points the mutation spec's `find` at `Math.abs(held - index) <= 1e-6` in
`heldPoseIs` (matches once), adds a round-2 checklist line to
`docs/prompts/REVIEW_AGENT.md` (re-run `tests/test_mutation_witnesses.py` after
every rework), files a dispatch issue for the prompt-side gap, resolves the
issue, writes the lesson. No app behaviour changed. Scope respected.

## Verification

- Pre-merge subset: `pytest -q tests/test_mutation_witnesses.py` on the merged
  tree: 44 passed (the anchor test is green).
- Post-merge (after merging `integration` in), full `pytest -q` in this worktree:
  `1 failed, 1867 passed, 1 skipped, 2 deselected` in 395.87 s. The one failure is
  `test_viewer_js_suite_is_green`, red in a worktree by design (no projection).
  Not run in the main checkout, which sits on master without this branch.
- **The `--only` witness run did not reproduce the tactical's WITNESSED here.**
  `run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <guard>`
  twice reported `NOT WITNESSED (tier red before the mutation)`: the host suite
  "annotate rail holds still..." had six unrelated `[real]` rail sub-checks red
  with no mutation (the rail-suggestion family fixed by the sibling handoff, which
  I had not yet merged). So I did the runner's job by hand with
  `run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "<suite>"`:
  clean = those six fail and the seek check passes; with `<= 1e9` applied the
  seek check `[real] and a seek in the pane lands the page's angle on that frame`
  fails in addition. The mutation is witnessed by content. Mutation reverted
  (`git status` clean). The runner will report WITNESSED once the host suite is
  green, which is the sibling handoff's fix landing.

## Findings

- None blocking. The lesson's "most likely a budget-capped entry" is labelled
  inference; fine. The class fix is placed correctly (repo checklist here, dispatch
  prompt gap filed there).

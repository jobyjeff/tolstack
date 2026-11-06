---
verdict: APPROVE
---

# Review — stack_wording_drops_filler_and_the_hover_says_the_same_thing

**Verdict: APPROVE** (one inline fix, one tier not run here — both stated below).

## What I checked
- Names in the topology and the linear stacks rewritten to the rule; the guard
  `tests/test_element_names_follow_the_rule.py` (articles, comma, dash clause,
  parenthesis) passes, and the SOP "Titling an artifact" carries the rule with a
  paired marker test. Two mutation specs enrolled.
- `VA.elementDisplayLabel` removed; the cell prints `record.title` and its hover
  title is the same string, so there is no second wording path.
- `pytest -q` in this worktree: 1729 passed, 1 skipped, 1 failed — the one
  failure is `test_viewer_js_suite_is_green`, the documented worktree-only
  failure (no `data/projections/`).

## Fixed inline (no behaviour change)
The branch committed `docs/SOP_TOLERANCE_STACK.md` with CRLF endings, which
rewrote all 1407 lines (diff vs integration 2790 lines, 26 real). Restored LF in
`c8d17af8`; the diff vs integration is now 25 insertions / 1 deletion.

## Not verified here — for the batch merge
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` ran 515/516 with the
`[real]` tier SKIPPED: the main checkout's projection was built from another tree
and the tier refuses it. I did not rebuild shared projections from a review
worktree. Names are fixture values in `apps/viewer/tests.js` (re-pinned by the
author), so the batch merge must rebuild projections (`scripts/rebuild_projections.ps1`)
and then run the viewer, annotate, browser and witness tiers in the main checkout
before trusting green. The mutation-witness `--changed-since` run was not
confirmed by me. The handoff's screenshot of the stop sub-stack was not
independently checked.

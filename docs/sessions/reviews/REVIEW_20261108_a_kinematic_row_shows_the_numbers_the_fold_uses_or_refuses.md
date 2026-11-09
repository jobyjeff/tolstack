---
type: review
handoff: docs/sessions/completed/HANDOFF_20261108_a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
---

# Review — a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses

**Verdict: APPROVE** (merged to `integration`; no inline fixes, no conflicts).

## What was checked
- Deliverables 1-5 against the diff: `row_display` builds one record from the
  term the fold consumed (band, sensitivity, contribution read off `row.term`),
  `refused` rows blank sensitivity/contribution and mark the sub-stack, foot and
  verdict `incomplete` with a count; cited nominal wins over the skeleton's, with
  the offset on hover and no gate; borrowed band names its lender on the ELEMENT
  hover. Fold untouched (bands still about 0.0).
- Value-level pins exist: 105.99/105.96/106.02, 61.40/61.35/61.45 with 61.4504
  (+0.0504, band's edge) in the hover, plate row's lender; refusal case from a
  study copy with a geometry key removed.
- Issue `ISSUE_20261105_a_borrowed_band_term...` carries a resolution.
- Scope respected (no transport/DAG/colour/chain-row edits).

## Test evidence (review worktree, merged tree)
- `tests/test_kinematic.py`: 92 passed. Full `pytest -q`: 1745 passed, 1 skipped,
  1 failed = `test_viewer_js_suite` (expected red in a worktree: no projections).
- `node apps/viewer/run_tests.cjs`: 546/546, node-fs tier skipped (no projection).
- `--changed-since integration` witnesses: every touched guard reports "tier was
  red before the mutation" because the worktree lacks `data/projections/`;
  that is the environment, not a decay. **Not verified here.**

## For the batch merge (not done by this review)
In the main checkout, rebuild projections first, then run the viewer, annotate,
browser and `--changed-since master` witness runs. Check that the study page has
no blank value cell beside a contribution, and the three new `fast__` witnesses
plus the browser witnesses touching term rows are `WITNESSED`.

## Notes
- A gap row now counts as refused, so a study with a declared gap reads
  `incomplete` on the grid by this change; intended by the handoff, but
  noticeable on other studies.
- Side finding carried by the handoff (sweep tan_link 61.4504 vs cited 61.40 ±0.05)
  is a hover warning only, as specified.

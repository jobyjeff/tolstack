# REVIEW 2026-10-29 — the_contributor_table_lives_in_the_results_pane_and_groups_are_checkboxes

**Verdict: APPROVE.**

## What was checked
- Consolidation: `VA.renderKinematic` and `#kinematicview` are gone; the contributor table renders inside `VA.renderKinematicResults`, under the stop readout. Unused/Groups call `repaintDag`, which repaints toolbar+pane only (not `#detail`). The lesson names what the wholesale paint was also doing.
- Groups: `VA.GROUP_KINDS` (bodies / chain / kinematic) is a constant, paired by a test against the `kind`s `VA.studyGroups` emits; persisted per topology in `localStorage` under try/catch, default all on; toolbar reads "Groups (n of m)".
- Tests: viewer unit 511/511; browser tier 37/37 (with the main checkout's `node_modules` junctioned in, removed after; two crop/typography checks skip without a built projection); `pytest -q` 1685 passed, the one red being the worktree-only `test_viewer_js_suite` (no projection), by design.

## Merge conflict (mine)
`scripts/guard_enumeration.mjs` pins. Integration side: fast 626 (rail-row +1), browser 773 (+15). Handoff side: fast 625 (one swapped), browser 760 (+2). Resolution: fast 626 (swap is net 0), browser 775 / enrollable 742 (758 base + 15 + 2); name-set hashes taken from the census test's own measurement.

## Not proven here
- Witness run `--changed-since integration`: 19/32 witnessed; 13 `NOT WITNESSED — the tier was red before the mutation`. Cause is environmental: the main checkout's projection was built from `ef84059a`, not this tree, so the fast tier is red on its `[real]` pairing before any mutation. This includes the new spec for "each group kind is its own checkbox". Rebuild projections and rerun at the batch merge.
- DoD asked for a 1600×1000 screenshot of the results pane; none is in the branch. Not blocking (evidence, not behaviour); filed as an issue.

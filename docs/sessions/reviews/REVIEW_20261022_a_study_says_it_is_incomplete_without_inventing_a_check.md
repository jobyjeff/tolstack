---
verdict: APPROVE
---

# Review — a_study_says_it_is_incomplete_without_inventing_a_check

**APPROVE.** All five deliverables present: derived `StudyResult.completeness()`
(gap / assumed / untraced / no source_ref, selection order, two ids named),
`Study.from_dict` refuses a hand-written `completeness`, DAG_TOPOLOGY.md paragraph,
viewer badge (study header fold + nav rail via `studyAttention`), meta refresh dropped.
No term band/kind/source_ref edited (sibling fence respected); the travel-study test
asserts the derivation, not a fixed value, so it folds over the sibling.

## Verification
- Tactical recorded a full worktree run (1546 passed / 1 skipped / 1 failed, the documented worktree-only red); consistent with the diff, tiers named as unrun. Benefit of the doubt given.
- Pre-merge subset: `tests/test_study_completeness.py` + `tests/test_topology.py` 163 passed; `node apps/viewer/run_tests.cjs` 449/449 (node-fs tier skipped, no projection in worktree); `--only` witness run for a new guard exercised.
- Post-merge full suite in review worktree: 1 failed, 1546 passed, 1 skipped in 6m39s; the one failure is `test_viewer_js_suite_is_green` (documented worktree-only red, no `data/projections`). Unexercised here: node-fs `[real]` tier, annotate/browser tiers, full mutation registry — batch-merge work in the main checkout.
- Integration had not moved; merge was clean. No inline fixes.

## Notes (non-blocking)
- Hover text is generated in JS (no edge ids, per the viewer's reader-facing bans) rather than printing Python's `reason`; the handoff said "reason and open terms" — judged consistent with the ban, terms are listed by name as links.
- Kinematic studies fenced out; issue already filed (`ISSUE_20261022_a_kinematic_study_has_no_derived_completeness.md`).
- Guard-pin hash in `scripts/guard_enumeration.mjs` will conflict with the sibling if it adds guards (recompute).

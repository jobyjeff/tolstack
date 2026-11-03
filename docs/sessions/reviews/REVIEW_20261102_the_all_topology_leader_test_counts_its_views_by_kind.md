---
type: review
handoff: docs/sessions/active/HANDOFF_20261102_the_all_topology_leader_test_counts_its_views_by_kind.md
reviewer: agent
date: 2026-11-02
verdict: APPROVE
blockers: 0
---
# Review — the_all_topology_leader_test_counts_its_views_by_kind (2026-11-02)

**Verdict: APPROVE.** Two commits on `handoff/...`, scope `apps/viewer/tests.js` plus issue/lesson docs, as the handoff fenced. `topology.js`, leader code and the browser runner untouched.

- Views are counted by kind; each kind is asserted non-empty (`kinematic > 0` replaces `kinStudies.length > 0`).
- `expected` is derived from the projections' study lists, not from the filling loop. A null lit set or a drifted topology id now breaks the equality.
- Merged the branch (it was not already contained in integration). `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 629/629, printing `1 whole + 44 chain + 2 kinematic views, 12 combinations = 564 configurations`.
- **Mutation re-run by the reviewer:** `VA.kinematicLitSet` made to `return null` gave 620/629 and `FAIL [real] no two leaders cross ...`. I reverted it and the tree is clean.
- The lesson's note is correct: the handoff's "× 2" formula overcounts the whole walk, and the implementation (1 + 2×studies) is right.
- Worktree default tier red on `test_viewer_js_suite_is_green` is the documented worktree-only red. The same suite was green against the main checkout's projections.

Findings: none blocking. Nit: `views_by_kind` is snake_case in otherwise camelCase JS; not worth a round.

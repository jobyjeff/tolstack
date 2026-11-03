---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-02 — the_all_topology_leader_test_counts_its_views_by_kind: the leader-crossing test proves a kinematic view was drawn

Source: `docs/issues/ISSUE_20261030_the_all_topology_leader_test_does_not_prove_a_kinematic_view_was_drawn.md`
(med, class `guard_cannot_fail`). Routed by the 2026-11-02 triage sweep. Baseline: tolstack master
`03880aca`. Scope: `apps/viewer/tests.js` only, plus `docs/issues/`. Do NOT touch
`apps/viewer/topology.js` or the leader code, and do NOT touch `scripts/run_viewer_browser_tests.mjs`,
which `the_browser_tier_is_green_on_trunk_again` owns.

## The defect

The `[real] no two leaders cross on any committed topology, at every density, length mode and leader
style, and the bands still tile the pane` test in `apps/viewer/tests.js` has two assertions that
cannot fail for the reason they name:

- `ok(kinStudies.length > 0, ...)` checks that the kinematic projection *has* studies. It does not
  check that any study became a view. A view is added only `if (VA.kinematicLitSet(study, topoProj))`
  and only when `study.topology` matches, so a null lit set or a drifted topology id drops the
  kinematic page silently.
- `eq(configurations, expected)` compares two counters that the same loops fill.

Measured: the lesson reported 540 configurations, and today's projection derives **564**
(1 topology × 47 views × 12 combinations). The gap of 24 is exactly one kinematic study's two views.

## Deliverables

1. **Count views by kind** (whole / chain / kinematic) as they are pushed, and assert that each kind
   is non-empty: `kinematicViews > 0`, not `kinStudies.length > 0`.
2. **Derive `expected` independently of the loop that fills `configurations`**, from the projection's
   own counts: topologies × (1 + lit chain studies + matching kinematic studies) × 2 (dimmed and
   hidden) × the density/mode/style combinations.
3. **Mutation proof.** Make `kinematicLitSet` return null and show the test goes red. Then revert,
   and record both runs in the lesson. This is the coverage-set size-assertion convention
   (`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`, consumed).

## Definition of done

- `node apps/viewer/run_tests.cjs` is green and reports the by-kind counts.
- The mutation in item 3 turns the test red, and the lesson quotes that run.
- The default tier is green.
- Lesson (`docs/sessions/lessons/LESSONS_20261102_the_all_topology_leader_test_counts_its_views_by_kind.md`).

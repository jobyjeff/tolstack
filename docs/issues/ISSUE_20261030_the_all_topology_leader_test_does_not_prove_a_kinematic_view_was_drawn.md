---
type: bug
priority: med
status: open
area: viewer/topology tests
reporter: agent
class: guard_cannot_fail
found_by: docs/sessions/HANDOFF_20261030_descending_leaders_take_a_path_that_cannot_cross.md
---

# The all-topology leader test does not prove a kinematic view was drawn

`apps/viewer/tests.js`, `[real] no two leaders cross on any committed topology,
at every density, length mode and leader style, and the bands still tile the
pane`. The handoff asked for this test's coverage to assert its own size. Two
of its assertions do not check what they say they check:

- `ok(kinStudies.length > 0, "the kinematic page's studies are in the coverage
  set")` checks that the kinematic projection *has* studies. It does not check
  that any of them became a view. A kinematic view is added only
  `if (VA.kinematicLitSet(study, topoProj))`, and only when `study.topology`
  matches. So if `kinematicLitSet` returns null, or a topology id drifts, the
  kinematic page silently drops out and the test stays green.
- `eq(configurations, expected)` compares two counters filled by the same
  loops. It can only fail if something throws partway through.

**The measured symptom.** The lesson reports 540 configurations. Run against
today's projection (built 2026-10-30 17:33), the same derivation gives **564**:
1 topology × 47 shown views (whole walk, 22 lit chain studies and 1 kinematic
study, each lit view drawn dimmed and hidden) × 12 density/mode/style
combinations. The gap of 24 is exactly one kinematic study's two views.
So when the author measured, the kinematic view was probably not in the set,
and nothing in the test would have said so. The review re-derived the count
with a scratch script that copies the test's loop (it is not committed).

**Fix shape.** Count the views by kind (whole / chain / kinematic) as they are
pushed, and assert that each kind is non-empty: `kinematicViews > 0`, not
`kinStudies.length > 0`. Optionally pin the expected count, derived from the
projection's own study lists rather than from the loop. Add a mutation spec for
the new assertion: make `VA.kinematicLitSet` return null, and the test must go
red.

---
type: bug
priority: low
status: deferred
area: tests/mutation-witnesses
class: decayed_witness
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
defer_until: 2026-12-05
resolution: triage 2026-11-05: low deferred by default (30d; class row has no program, so a date)
---

# The nav-kinematic-row witness reddens the page-shape check, not its own

`scripts/mutation_witnesses/browser__the-nav-s-kinematic-row-brings-the-page-back-after-a-top__3f89b311.json`
mutates `nodes.pane.style.display = showDag ? "" : "none";` in
`apps/viewer/topology_app.js` to `showTopology`, which hides the DAG pane on
a kinematic page. Run with `--only` on `handoff/the_kinematic_grid_is_a_stack_of_sub_stacks`
(2026-11-04, scratch root built from that branch), the result is **NOT
WITNESSED (another check reddened, but not the declared one)**:

- what reddens is the kinematic suite's page-shape check ("the kinematic page
  draws the model and its stack in the main column …");
- "the nav's kinematic row brings the page back after a topology" stays
  green, although it asserts `#topopane` is visible.

The gate selected the entry because that branch inserted a line next to the
mutation's anchor. The branch did not change the pane's display logic or the
nav check, so this may have decayed earlier. It was not run against
integration's own tree to tell.

Next step: `node scripts/run_mutation_witness_tests.mjs --only
browser__the-nav-s-kinematic-row-brings-the-page-back-after-a-top__3f89b311
--verbose` in the main checkout, then either re-anchor the mutation on
something only the nav check reads, or find what keeps `#topopane` visible
with the mutation applied.

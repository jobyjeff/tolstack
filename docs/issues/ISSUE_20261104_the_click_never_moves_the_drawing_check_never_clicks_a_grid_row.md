---
type: bug
priority: med
status: deferred
area: tests/browser tier
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
class: guard_cannot_fail
defer_until: 2026-11-19
resolution: triage 2026-11-05: med beyond BUDGET=3 (3 staged: the seam/rail settled-state class, the annotator declared face, the one-band cylinder fit), deferred 14d; class row has no landed program, so a date; a test-only finding with no dated wrong outcome, unstageable under the 10-27 guard rule
---

# The "a click never moves the drawing sideways" check never clicks a grid row

`scripts/run_viewer_browser_tests.mjs`, suite "the DAG zoom, Fit and the grid
header", sub-check `[real] a click on a node, an edge, a sub-stack's label or a
grid row never moves the drawing sideways -- its scroll and the space before it
stay exactly as they were, parked or not` (added by
`the_dag_holds_still_and_the_filter_bar_stays_put`, `afbdb3e7`).

The check's claim names four targets, but its "a grid row" arm
(`#topopane tr.tvrow td`) has never clicked anything. The suite's viewport is
1400×900 and the grid starts at y = 927, below the window, so
`visiblePointOn` returns null for every row and the loop skips it. Measured
2026-11-04 on `integration` 0816cccf (log line `clicked 6: a node, an edge, a
sub-stack's label, a node (parked), an edge (parked), a sub-stack's label
(parked)`) and on the review merge of
`the_kinematic_grid_is_a_stack_of_sub_stacks` (`clicked 5`, no grid row).

The pass condition is `>= 3` clicks per pass, so a pass that clicks only DAG
marks satisfies it. The grid-row half of the claim is checked by nothing.

**Fix shape:** scroll the page so one grid row is inside the window before the
grid-row click (or measure at a viewport tall enough to hold one), and require
each named target to have been clicked at least once, instead of a count of 3
across targets. Then witness it with a mutation that moves the drawing only on a
grid-row click.

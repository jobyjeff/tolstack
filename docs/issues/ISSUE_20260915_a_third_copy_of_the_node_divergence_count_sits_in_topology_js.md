---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# `apps/viewer/topology.js`'s `nodeSideIds` preamble still says "10 of the 46 live nodes", unpaired, under a wording that reads as the string count

`viewer_value_guard_rows_and_replays` (2026-09-15) fixed the "10 of the 46 live
nodes" sentence in the two places its handoff enumerated — `apps/viewer/README.md`'s
hover-card bullet and `apps/viewer/views/topology.js`'s `renderNodeDetail`
comment — and paired all four digits (17, 46, 10, 7) to
`data/projections/viewer/topologies.json` from `apps/viewer/tests.js`'s
`[real] every live dot answers the SAME on hover and on click`. Verified in
review: mutate any of the four and that test reddens with the right message.

A **third** site was not in the enumeration and still carries the old number:

```js
// apps/viewer/topology.js:2224-2226, the VA.nodeSideIds preamble
//   ... which is exactly what they used to do (handoff
//   surfaces_that_state_something_false: the pane printed the node's authored
//   `parts` here and 10 of the 46 live nodes disagreed with their own card).
```

Two problems, the same two the other two sites had:

1. **The noun.** "Disagreed with their own card" is a claim about what the two
   surfaces *printed*, which is the string comparison — **17** of 46, not 10.
   10 is the count that differ as a **set**; the other 7 name the same two
   parts in the opposite order. (Re-derived in review from the live
   projection: 5 topologies, 46 nodes, 17 string-diverged, 10 set-diverged,
   0 declaring a part no incident edge carries.) Either quote 17, or keep 10
   and say "named a different **set** of sides".
2. **Nothing pairs it.** Both digits are hand-restated live-projection counts.
   Add the site to the existing pairing rather than writing a second one: the
   `[real]` node test already holds `divergedFromDeclared`, `divergedAsSet` and
   `nodes`, and already reads `views/topology.js` through `VIEWER_SRC.readText`
   — a third regex and two `eq`s.

`apps/viewer/topology.js` was named do-not-touch by that handoff (it belonged to
`respine_tween_fidelity_round2`, which has since landed), which is why this was
filed rather than fixed. Fourth sighting of the unguarded-count class on this
pair of files in two weeks (`REVIEW_20260914_viewer_dag_hover_cards` S,
`REVIEW_20260914_viewer_dag_spine_layout` S2,
`ISSUE_20260915_the_viewer_readmes_rail_allocation_measurement_is_stale_and_unguarded`,
and `ISSUE_20260915_the_viewer_readmes_10_of_46_node_divergence_count_is_unguarded_and_counts_the_wrong_thing`).

## How you would notice it is still broken

```
grep -rn "of the 46" apps/viewer/
```

Two live sites should say 17 and be paired; today the third says 10 and nothing
reads it.

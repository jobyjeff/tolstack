---
type: bug
priority: med
status: resolved
area: viewer/dag-layout
reporter: agent
audience: strategy
class: dag_layout_policy
found_by: docs/sessions/HANDOFF_20261110_the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model.md
resolution: deferred 2026-11-10 (triage) -- med beyond BUDGET=3; viewer selection/layout files are the strategy thread's F1b/F1c sequence (dispatch/docs/strategy/HANDOFF_20261109_strategy.md) | woke 2026-11-25 -- date trigger passed; re-triage | fixed by the_hub_is_one_part_in_the_grid_and_the_dag (review 21306b68: the hub is one run on the real projection, gatheredOrder); the crossing guard it named retired with Classic
---

# v2's whole walk draws the hub twice, and its block guard holds only by edge order

Since the gas-spring mount seats on the tangential link mount (2026-11-10),
v2's base has a loop inside one body: the locating boss reaches the
tangential link mount by its pilot, its base face and its fasteners. Two
things follow on the page, on the whole walk, at rest. The handoff fenced
all viewer code, so neither is fixed here.

**1. The hub draws as two brackets.** `VA.gatherParts` lays the hub's
first run as rows 0-2 (boss, blade bore). The hub's two dimensions to the
tangential link mount (`hub_spindle_to_tan_link_mount_face`,
`hub_boss_to_tan_link_mount_fasteners`) land after the piston cover, as
closures. The grid shows a second "214373-002 propeller hub" bracket under
the cover, and the DAG a small second hub block. Before the change the hub
was one block, rows 0-8. All 24 orders of the hub's four edges give the
same gathered runs, so authoring order cannot fix it. Shots:
`docs/sessions/lessons/shots/the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model/d2_v2_dag_base_body.png`
and `g1_v2_grid.png`.

**2. The guard "drawn as blocks … crossing itself no more than the
builder's walk does"** (`apps/viewer/tests.js`, `[real]`) is not something
`VA.gatherParts` guarantees. It keeps its re-laid walk even when that
crosses more. With the hub's edges in their pre-change order (blade bore
first), v2 drew 32 crossings as blocks against 31 on the builder's walk, and
the tier was red. Moving the blade-bore edge after the hub's three
tangential-link-mount edges gives 27 against 36, which is what is committed.
In a sample of 60 shuffled orders of the base's nodes and edges, 46
passed and 14 failed.
So the guard is green on v2 because of an authoring choice, and the next
model edit can turn it red with no change to the viewer.

Options:

1. In `VA.gatherParts`, keep the builder's walk as a candidate, scored the
   same way, and draw whichever crosses less (the same fix the U10H
   sibling, `ISSUE_20261106_the_u10h_grip_budget_crosses_itself_more_as_blocks_than_on_the_rails.md`,
   proposes for bands).
2. Gather a part's later edge rows into its first run when both ends are
   already drawn. That is item 1's other half, and it would keep the hub as
   one block.
3. Weaken the guard to the totals the README pairs, and say so.

Recommendation: 1 then 2. Item 1 makes the guard true by construction.
Item 2 is the one a reader sees.

## Addendum 2026-11-15 (review of `the_hub_is_one_part_in_the_grid_and_the_dag`)

Item 1 is fixed. `VA.gatherParts` now gathers a part's other edges with it
(option 2 above), and v2's hub is one bracket and one block. The splitting
commit is `9b716956`, confirmed by rebuilding v2 at each data commit. Item 2
is still open. The `[real]` "no more crossings than the builder's walk" guard
is green after the fix (v2 24 as blocks), but `gatherParts` still does not
guarantee it, so option 1 stands. The status stays as triage set it.

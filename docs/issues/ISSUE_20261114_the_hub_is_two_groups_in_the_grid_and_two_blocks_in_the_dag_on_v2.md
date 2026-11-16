---
type: bug
priority: high
status: triaged
area: viewer/grid-and-dag
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md
class: part_reached_twice_drawn_twice
handoff: docs/sessions/HANDOFF_20261115_the_hub_is_one_part_in_the_grid_and_the_dag.md
resolution: triaged 2026-11-15 -- staged (high, opus); the chain's one viewer slot; the strategy session's map handoff should depend on it
---

# The hub is two groups in the grid and two blocks in the DAG on the end-stop model (v2)

Jeff, 2026-11-09: "214372-002 (hub) has two separate groups within the same
rigid body, one with a single line and one with three lines". Jeff, 2026-11-12
(on trunk as served then): "part groupings in the grid view look correct now".

On the merged `integration` tree (`273177f2`, projections rebuilt from it into
a scratch root, 3840×2160, no study selected) the hub `214373-002` is still
split, in both surfaces:

- **Grid**, body `ground`: one bracket with "locating boss to blade 1 root
  bearing bore" (+ the "across a clearance" row), then the mount, gas-spring
  mount and piston cover, then a **second** `214373-002 propeller hub` bracket
  with the two "locating boss to tangential link mount …" rows.
  Shot: `docs/sessions/lessons/shots/the_merged_page_20261112/01_grid_landing_v2.png`.
- **DAG**: a `214373-002` block at the top of the ground field and a second,
  truncated `214373…` block at its foot. Hovering the hub in the tree lights
  both. Shot: `…/02b_hover_hub_dag.png`.

`ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_blocks` covers a
kinematic page's band order and says the whole walk gathers each part into one
run (`VA.gatherParts`); this is the whole walk with no study, so it is not that
case.

Not established: whether trunk (what 8000 serves) draws the hub once. Jeff's
11-12 sentence suggests it did and the 11-12 chain split it (`a_part_may_contain_parts`
changed the walk's part grouping; `the_page_is_a_fixed_layout…` rebuilt the
grid region). First step: render v2 on `master` and on `integration` against
the same topology projection and compare the hub's runs.

Owner: the 11-12 chain as merged (no single handoff named it).

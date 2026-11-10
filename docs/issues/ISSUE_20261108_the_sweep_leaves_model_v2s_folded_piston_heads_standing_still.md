---
type: bug
priority: code-red
status: resolved
area: annotate/sweep-posing
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
handoff: docs/sessions/HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md
resolution: handoff completed 2026-11-09 -- closed automatically by dispatch when handoff `a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list` moved to completed/; not independently verified.
---

# The sweep leaves model v2's folded piston heads standing still

Model v2 now folds the two piston heads into the `pitch_plate` body and the
piston cover into `base`, and declares no rider bodies (Jeff, 2026-11-08: *"the
piston head components are rigidly attached to the piston, so they are part of
the same rigid body"*). The 3D pane poses a part in sweep mode only if:

- the run's own subject lists it (linkage's part lists, which name neither head
  nor the cover), or
- it is a part of a body whose `rides_with` names that subject
  (`apps/annotate/app.js`, the `riders` map in the sweep anchoring, ~line 1778), or
- it is recorded inside a matched occurrence (`AA.sweepCarriedOccurrences`).

The heads are none of these any more, so they are drawn at their assembly
position and do not move while the piston and plate do. Measured on this
branch's projection with the P2 run (`node tests/debug_model_v2_shots.mjs
--phase after`, 2026-11-08): the sweep's anchor rows list the hub, both mounts,
the plate, the piston, the blade root, the pitch arm, the pitch link and its
bearing, the tangential link, and carried hardware. No row for
`piston_head_lower_214699_002`, `piston_head_upper_214698_002` or
`piston_cover_214958_002`. Before the fold, the two heads were `rides` rows on
`pitch_plate`. The cover is on the ground body, so standing still is right for
it. The heads are the visible regression.

**Fix, in `apps/annotate/` (fenced out of the handoff that found it):** in the
`riders` map, also count each topology body's parts that the run's subject of
the same name does not list. A folded part rides its own body's subject, the way
a `rides_with` body's parts ride the host's. The existing skips stay as they
are: a link subject, a part with no mesh, and a part already carried inside a
claim. Check v1 when you make the change. v1's `base` and `pitch_plate` also
carry hardware that linkage does not list (`tests/test_topology.py`,
`BODY_PARTS_LINKAGE_DOES_NOT_LIST`), so a v1 bolt that is not carried today
would start riding. Either that is right, and the `[real]` check
`both piston heads ride the pitch plate…` (`apps/annotate/run_browser_check.mjs`)
gets updated for it, or the rule is limited to parts v1 does not have.

The natural owner is
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`. It
owns `apps/annotate/`, it depends on the handoff that found this, and its
definition of done already looks at "plate, piston, both heads, cover" at rest
and mid-sweep.

---
type: bug
priority: med
status: open
area: viewer/seam-leaders
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
---

# Two of the end-stop model's joint nodes have no leader in the sweep

On `vpa_end_stop_v2` with the P2 run loaded and no study open, the run's
`geometry.features` name 9 nodes (re-counted from
`data/inbox/linkage-sweeps/vpa-pitch-p2-20261105-204957.json`). Two of them get
no leader across the seam:

- `hub_blade1_root_bearing_bore`. It posts `null`, and the browser tier logs
  `no anchor: hub_blade1_root_bearing_bore` (main-checkout projections,
  2026-11-09).
- `hub_spindle_bore_axis`, with integration's projections. The datum rename
  left the hub-side binding keyed to v1's edge id. The lesson for
  `the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
  records this under "Corrected after the revert".

The handoff's DoD asked for every skeleton joint node to have a leader. Its
deliverable 3 (anchor such a node at the sweep skeleton's joint point) was
tried and reverted, for a measured reason: an axis joint's `point_a/b` is a
reference point on the axis, and the blade hinge's is the assembly origin. A
`[real]` check rejects a node drawn there. Both nodes currently fall back to
their hub section centre, which lies outside the sweep camera's frame.

What would close it, smallest first:

1. Bindings for the two hub bores under v2's ids. Jeff's Accept would then
   place both, the same way the plate-side spindle node is placed.
2. A located point for an axis joint. Project the reference point onto the
   bound bore's axis, or take the axis point nearest the mating part. This is
   a solver/geometry question, so it would also need a fitted nominal.

Do not reinstate the raw skeleton point. The reverted attempt shows why.

## Addendum 2026-11-09 (the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection)

This issue is still open, and it is back at `status: open` with no
`handoff:`. That handoff named it as related, but it did not fix it, and its
Complete would otherwise have resolved it.

The `model drawn alone and led` check now prints the full `skipped` breakdown
(main-checkout projections rebuilt from `3d04f5cd`). Both nodes named above
are `noAnchor` there, `hub_spindle_bore_axis` included, so the hub-side
binding is still missing under v2's ids on master's projections too.

Neither node is a joint node the scene places at the solver's point. That
check therefore never asserted them, and it does not now. Its red was a
different pair: the pitch link's two sphere centres, whose DAG dots sat below
the window (`offDag`). It now asks for every joint node on screen to be led,
and scrolls to each one that is off screen. The two closures listed above
still stand, and the raw skeleton point was not reinstated.

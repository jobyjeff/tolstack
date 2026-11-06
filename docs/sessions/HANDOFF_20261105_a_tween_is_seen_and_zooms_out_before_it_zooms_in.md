---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-05 — a_tween_is_seen_and_zooms_out_before_it_zooms_in: the DAG's 260 ms tween renders as three frames; make it render as a tween, and fit-then-focus

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05): "Animations are still very
jarring, the entire thing happens in like 3 frames currently. Slow it down, consider having the
dag zoom out to fit the whole thing in screen first, and then zoom in to the new focus region."
Plus `docs/issues/ISSUE_20261103_opening_the_3d_pane_and_other_landings_still_snap_the_dag.md`
(routed here). Baseline: master after the 11-03 batch (`the_dag_holds_still_and_the_filter_bar_stays_put`
landed: landing measured before the tween, `VA.RESPINE = { duration: 260 }` in
`apps/viewer/topology.js:1582`, `VA.animateTopoPane` in `apps/viewer/views/topology.js:674`,
`landingHooks` in `apps/viewer/topology_app.js:2215`). Scope: the tween/respine code paths and
`scripts/filmstrip.mjs`; do NOT touch the grid (`grid()` and row builders, owned by
`the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`), the palette/body fields
(`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`) or the annotator.

## Deliverables

1. **Root-cause the three frames.** The 11-03 lesson left open that "the respine still rebuilds
   the pane every frame". Measure first: instrument a filter change and a study switch on the
   kinematic study (`scripts/filmstrip.mjs` plus a frame counter), report frames rendered per
   tween and the per-frame cost split (layout vs. DOM rebuild vs. paint). If the rebuild is the
   cost, the tween interpolates positions on existing nodes and only the end state rebuilds.
   Target: at least 30 rendered frames per tween on the dev box with the 3D pane closed, and the
   number recorded in the lesson. A longer duration alone is not the fix (Jeff's "slow it down" is
   about perceived motion; a 3-frame 800 ms tween is still three jumps).
2. **Fit, then focus.** A landing whose target is outside the current viewport (or whose scale
   change exceeds a threshold you measure) runs two phases: zoom out until both the start and the
   target lit set fit, then zoom to the target's band. One phase when the target is already in
   view. Reduced-motion still jumps straight to the end state. Duration is a named constant
   next to `VA.RESPINE`, chosen by eye on the filmstrip and stated in the lesson.
3. **Every landing goes through the same path**, including opening the 3D pane and the other
   landings the routed issue lists as still snapping. Name each landing site and show its
   filmstrip.

## Definition of done

- Filmstrips (`scripts/filmstrip.mjs`, N frames composited) for: a filter change, a study switch,
  opening the 3D pane, and a grid-row click, each attached to the lesson; none shows a jump
  larger than the per-frame step.
- The frame count per tween is measured before and after and recorded.
- Viewer browser tier green; the two landing checks that pin the rest position keep their
  values.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md`):
  the root cause with its measurement, the chosen durations and the fit-then-focus threshold.

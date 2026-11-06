---
priority: high
depends_on: [a_tween_is_seen_and_zooms_out_before_it_zooms_in]
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_grid_and_the_dag_move_with_the_mechanism: the kinematic grid, the DAG and the plot cursor animate with the linkage, and a pose can be set by slider or by typed blade angle

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05): "Animate the grid view with
the moving mechanism (numbers change in the table as the linkage cycles), you can also drag the
slider or enter a discrete blade angle and then see the tolerance stack at that pose. Also make
the dag itself animate when the lengths are set to 'tolerance width' (maybe this needs a new view
style where the length is 'contribution' = tolerance X sensitivity?) Also add an animated cursor
on the top right (blade pitch from nominal vs actuator travel) that moves with the linkage."
Baseline: master after the 11-03 batch. `each_stop_is_its_own_stack` landed `fold_at_stop`,
`rss_check_at_stop`, `range_between_stops` and per-stop Jacobians (−7°: J −1.728; +72°: J −1.249);
the kinematic model is `VA.kinematicStack` (`apps/viewer/views/kinematic.js:700`); the 3D pane
already plays the sweep's poses (`sweep artifact carries poses for animation`, linkage 10-01);
`VA.EDGE_LENGTH_MODES` (`apps/viewer/topology.js:1133`) has uniform / tolerance / absolute. Scope:
`views/kinematic.js`, the kinematic plot, the pose control, a new length mode, and the DAG's
per-frame length update. Do NOT touch the grid's row builders, columns or dividers (owned by
`the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`), the palette/body fields
(`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`), or the annotator.

## Deliverables

1. **The pose is a first-class input.** One pose control on the kinematic study: a slider over
   the sweep's travel, a numeric field for blade angle (deg from nominal, the sweep's own
   variable), play/pause that cycles the sweep. The 3D pane's existing animation, the grid, the
   DAG and the plot all read the same pose. Where the 3D pane already owns a play control,
   unify, do not duplicate.
2. **The grid's numbers follow the pose.** At each pose the sensitivity column is J at that
   pose (the sweep's Jacobian, interpolated between sweep points as the sweep artifact allows),
   the contribution column is sensitivity × band, and the sub-stack sums and totals update.
   The stop rows (feather, low) are evaluated at their own stop pose regardless of the live pose;
   say so on the row (they are the stops). Values must agree with `fold_at_stop` at the two stop
   poses to the printed precision; a test pins this.
3. **The DAG moves.** In `tolerance` length mode an edge's drawn length is band width, which does
   not vary with pose; add a `contribution` mode (|sensitivity| × band, Jeff's words) so the DAG
   breathes as the linkage cycles. Suggested, investigate: contribution mode is the default for a
   kinematic study. Edge lengths update per frame without the pane rebuild the tween handoff
   removed.
4. **The plot cursor.** On the kinematic plot (top right: blade pitch from nominal vs actuator
   travel) a cursor marks the live pose and moves with it; the two stop bars stay where they are.
5. **Pose state is URL-visible** like the other view state (so a filmstrip or a lesson can cite a
   pose), and the filmstrip tool can drive the pose.

## Definition of done

- On the live kinematic study: dragging the slider changes sensitivity and contribution values
  in the grid, the DAG edge lengths in contribution mode, and the plot cursor, all in step; a
  typed angle lands the same state; play cycles the sweep smoothly (frame count per the tween
  handoff's measurement).
- Test: values at the two stop poses equal the per-stop fold's values; the contribution mode's
  lengths equal |J| × band for three named edges.
- Filmstrip of one play cycle attached to the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_grid_and_the_dag_move_with_the_mechanism.md`):
  how J is interpolated between sweep points, what the stop rows show at a non-stop pose, and
  whether contribution mode became the kinematic default.

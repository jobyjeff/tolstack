---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md
---

# Design: the planar and clearance glyphs read alike, and body names sit on the rails

Two judgement-call findings from the review of the DAG's body containers and
joint glyphs (`docs/sessions/reviews/REVIEW_20261027_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md`).
Neither blocks anything.

1. **`planar` and `clearance` are the same picture at 12 px.** In
   `apps/viewer/interface_glyphs.js` both are two horizontal strokes 10 units
   long: `planar` at y = ±2, `clearance` at y = ±3.5. A reader can't tell
   them apart at `VA.INTERFACE_GLYPH_PX` unless both are side by side. Nothing
   on a committed topology is `planar` yet
   (`ISSUE_20261027_a_flat_seat_is_a_node_so_the_planar_glyph_has_no_edge_to_wear_it.md`),
   so the clash shows up only once one is. A clearance could draw as two
   bars with end ticks or an open gap (the dimension-line idiom), and planar
   could keep the capacitor bars Jeff asked for.
2. **A body's name label is drawn over rails and node dots.** In
   `docs/sessions/shots_20261026_dag_containers/03_kinematic_substack_closed_1600x1000.png`,
   "tangential link" runs across a lit dot and "hydraulic brake" across two
   rails. In `05_…` "blade and pitch arm" sits behind a dot. The label is the
   container's one identifying text, and it loses to whatever crosses its
   corner. Options: give the label a backing pill in the container's own tint,
   or move it into the gutter left of the field's first column.

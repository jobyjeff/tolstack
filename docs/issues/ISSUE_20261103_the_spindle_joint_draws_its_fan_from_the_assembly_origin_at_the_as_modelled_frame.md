---
type: feature
priority: med
status: triaged
area: annotate/model-layer
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20261103_coaxial_ends_share_one_3d_node.md
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
resolution: triage 2026-11-05: folded into the layout brief as an addendum (Q7/Q8) rather than a new brief
---

# At the as-modelled frame the spindle joint draws its fan of lines from the assembly origin, and it reads as the old star

Since 2026-11-03 (`coaxial_ends_share_one_3d_node`) concentric ends are one
3D node, and no unplaced node is drawn. The red star of unplaced nodes at the
origin is gone. But on P2 the one live joint, the spindle
(`hub_spindle_bore_axis` + `pitch_plate_spindle_bore_axis`), is placed at the
mean of the solver's two slide ends. At the as-modelled frame (72°, zero
travel) that mean is **(0, 0, 0)**: the spindle axis at the hub datum. Its
eight world lines then run from the origin out to the hub's and the plate's
section ladders.

That is a true joint, not an unplaced node. To a reader it still looks almost
the same as the defect the handoff removed. Compare:

- `docs/sessions/shots_20261103_coaxial_ends/before/5_as_modelled.png`: the
  red star, 15 unplaced nodes fanned from the origin.
- `docs/sessions/shots_20261103_coaxial_ends/after/5_as_modelled.png`: no red,
  and the joint's own eight lines from the same point.

At sweep point #0 (−7°) the joint sits 32.23 mm up the axis
(`after/1_sweep_frame_1.png`), and the fan reads as a joint.

The handoff's DoD says "no star at the origin". The review
(`REVIEW_20261103_coaxial_ends_share_one_3d_node.md`, should-fix 3) asked for
the call to have an owner.

Options (a display rule, so the call is Jeff's by eye):

- (a) Leave it. The point is right, and the lines are the radii they draw.
- (b) Draw a joint dot at the point on its axis nearest its members' section
  anchors (the hub's ladder upright sits on its +X side). The joint stays on
  its axis, and its lines get short. This adds one rule to
  `AA.modelJointWorldPoints`, and a `[real]` pin moves with it.
- (c) Draw the radii from a joint to its own members' section rungs dimmer
  than the rest. This leaves the point alone and changes the picture's weight.

Recommendation: (b). It keeps the joint on the axis the solver states. It
also removes the one picture that looks like the defect.

---
type: chore
priority: med
status: resolved
area: linkage/feature-joins
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
handoff: linkage/docs/sessions/HANDOFF_20261105_plate_slide_names_the_bushings_and_the_piston_body.md
resolution: triage 2026-11-05: below the brief bar (item 1 is a linkage re-point with an obvious decomposition; item 2's recommendation is carried to the tolstack follow-up that handoff files) -- handoff completed 2026-11-05 -- closed automatically by dispatch when handoff `plate_slide_names_the_bushings_and_the_piston_body` moved to completed/; not independently verified.
---

# linkage's `plate_slide` still joins the hub and the plate, so the rail lists the slide on the wrong parts

Since 2026-11-03 the pitch plate's slide is authored as
`pitch_plate_slide_bushings_to_piston_body`. It runs from
`gas_spring_mount_bushing_bore` (213668-002, the two GR04WB328AT11 Slydrings)
to `gas_spring_piston_body_od` (214700-002). The source is Jeff's forge note
20261103T165357_43vf96.

The kinematic rail reads its joint rows from the sweep artifact's
`geometry.features[]`. linkage writes those from
`C:/workspace/linkage/linkage/vpa.py` `JOINT_FEATURES`, where `plate_slide`
still names:

- `hub_spindle_bore_axis` for `point_a`, `axis_a`, `u_a` and `w_a`;
- `pitch_plate_spindle_bore_axis` for `point_b`, `u_b` and `w_b`.

So on `vpa-pitch-p2-20261016-235852` the rail labels the slide's two ends
"hub spindle bore axis" and "pitch plate pilot boss axis". A Pick on either
end goes through `hub_to_pitch_plate_spindle_coaxiality`, not through the new
edge. The handoff's DoD screenshot shows the slide's two ends on 213668-002
and 214700-002. It cannot be taken until linkage republishes the sweep.

**What needs deciding:**

1. **Re-point `plate_slide` in linkage.** Its a-side features would name
   `gas_spring_mount_bushing_bore`, and its b-side features
   `gas_spring_piston_body_od`. Both nodes are on the right bodies (`base`,
   `pitch_plate`). After that:
   - republish a sweep;
   - in `tests/test_topology.py`'s `SWEPT_JOINT_EDGES`, map `plate_slide` to
     the new edge instead of `hub_to_pitch_plate_spindle_coaxiality`.
2. **Decide whether `hub_to_pitch_plate_spindle_coaxiality` stays a
   `cylindrical_slide`.** In Jeff's mechanism the hub and the plate never
   touch:
   - the plate pilots into the piston body;
   - the piston body rides the mount's bushings;
   - the mount sits on the hub.

   The 2026-11-03 handoff kept the edge ("that one is real"). Its plate end
   is a boss, and the contact engine's best pair across it has a 31 mm
   clearance. Recommendation: keep the edge as an axis comparison, and drop
   its `cylindrical_slide` once (1) lands, so that only one edge claims to be
   the slide.
3. **`actuator` also joins the hub and plate nodes.** It is a driver, not a
   contact, and nothing here suggests changing it.

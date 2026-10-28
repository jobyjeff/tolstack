---
type: chore
priority: low
status: deferred
area: design
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_the_model_is_drawn_in_the_scene.md
class: unreviewed_design_debt
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# Design: the model layer draws a star at the assembly origin and runs the blade's lines ~1.4 m outboard

Seen in the branch's own screenshots
(`docs/sessions/shots_20261026_model_in_the_scene/1_sweep_frame_1.png`,
`3_bind_mode.png`, `4_selected_tan_link_mount_bore.png`). Both follow the
handoff's rules as written, so this is a display question, not a defect.

1. **The star.** On P2, seven nodes have no anchor geometry because their parts
   have no installed mesh (`piston_cover_*`, `vpa_end_stop_feature`,
   `piston_end_stop_face`, `piston_rod_end_bore`, `ring_gear_hub_seat`,
   `brake_hub_mount`). Source (c) puts each one at its body's frame origin, and
   every body's frame is the assembly frame. So all seven share one red dot in
   the middle of the hub, and every edge that touches one of them is a line
   from there. In shot 1 that fan of lines is the busiest thing in the picture,
   and it runs through the ring centre, which is exactly what Jeff's +X bias
   was meant to avoid. The anchors message already sends these nodes as
   `null`, so the shell draws no leader to them. The 3D lines still go there.
2. **The blade.** The blade's +X-most cut region is the blade itself, so its
   three nodes anchor mid-span at x ≈ 1388 mm (the lesson says so and
   deliberately leaves it as is). In bind mode (shot 3) their lines run off
   the right edge of the frame from the hub.

Options. My recommendation is (a) for item 1, plus a per-topology or per-part
cap for item 2.

- (a) Leave out, or draw only as a short stub, any edge with an `origin` end.
  The dot stays in the warn colour where the reader can find it, but no line
  is drawn to it.
- (b) Bound a part's section search to a window around the body's joint
  points (for the blade, the root end).
- (c) Let the topology author override a part's anchor region the same way
  `anchor_bias` is authored.

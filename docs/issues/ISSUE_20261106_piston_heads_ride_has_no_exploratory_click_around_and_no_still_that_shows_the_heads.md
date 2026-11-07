---
type: chore
priority: low
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md
defer_until: 2026-12-06
class: decayed_witness
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# The piston-heads handoff shipped without its exploratory click-around, and no still shows a head

The handoff changes what the annotator poses in the kinematic 3D model, so the repo's standing rule
(CLAUDE.md, "A handoff that changes what the viewer draws, or how it moves…") asks for a click-around
on the real projection. Round 2 did not do one (the browser slot was queued behind other agents);
its two stop shots (`docs/sessions/lessons/shots/<slug>/2_feather_stop.png`, `3_low_stop.png`) show
the piston column moving, but the scene is transparent and neither head is legible in a still. What
pins the ride is a numeric `[real]` check (each head's drawn translation equals the piston's at both
stops: z -23.334 / 41.132 mm), which I re-ran and which passes.

To close: on the real kinematic study, isolate each head and the piston, step the sweep, click the
bodies/parts rows, and keep a still with a head isolated at the feather stop (lower head on the end
stop) in the shots folder. Also unverified by eye: the cover (no mesh, see
`ISSUE_20261105_the_piston_cover_214958_002_has_no_installed_mesh_so_it_cannot_be_drawn_in_3d.md`).

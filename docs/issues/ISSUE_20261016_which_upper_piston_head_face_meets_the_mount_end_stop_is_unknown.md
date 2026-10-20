---
type: bug
priority: med
status: resolved
area: topologies/end-stop-travel
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
---

# The travel's value depends on a face nothing in the repo identifies

The upper piston head is stepped: +Z planes at 240.669, 243.216, 245.375 and
249.169 (part frame, meshes `asm217755_214698_002`). The study takes the topmost
(face 149) as the stop contact, giving 58.487 mm nominal; the other three give
62.281, 64.440 and 66.987 (WORKSHEET_gas_spring_end_stop_travel.md, section 6).
The mount's mesh (`machined_213668`) is a single-part export with no placement,
so contact cannot be read off the geometry, and the cover has no mesh.

Closing it: Jeff naming the face, or the 214698-002 drawing's stop callout, or a
placement for the mount in the 217755 assembly. Then the node
`piston_head_upper_top_face` and edge `piston_head_upper_thickness` move
together. Beside this, the ATP derives 65.03 mm against a <=65 mm row
(S4ATS-2439); that is Jeff's comparison to make and nothing here claims which
number is right.

## Resolved 2026-10-20 (handoff the_travel_chain_cites_its_three_drawings)

Jeff named the face: the step at part-frame Z 243.216 (face 110, assembly Z 219.882).
Evidence: `docs/sessions/shots_20261020_strategy_stop_face/` (the face highlighted on
the head, and his CAD section at 72 deg pitch measuring 64.465 mm to the cover's
internal shoulder). The citation is a CAD measurement and a named face, not a drawing
callout: 214698-002 A does not dimension the step's height, so the edge keeps its mesh
fit (6.556) under a placeholder band, and the gap is its own issue. Node
`piston_head_upper_top_face` is now `piston_head_upper_step_face`; the stop surfaces'
owners were reconciled (the heads rest on the mount, the cover's shoulder is the far
stop). Worksheet sections 2 and 6.

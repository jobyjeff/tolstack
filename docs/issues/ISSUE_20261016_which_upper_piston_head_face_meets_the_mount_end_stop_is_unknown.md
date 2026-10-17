---
type: bug
priority: med
status: open
area: topologies/end-stop-travel
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
needs: jeff
ask: Say which face of the upper piston head 214698-002 touches the gas-spring mount's end stop
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

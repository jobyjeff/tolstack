---
type: bug
priority: low
status: open
area: apps/viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md
---

# A map feature whose interfaces go to two sides has one pin, and one route crosses its own box

`apps/viewer/map.js` gives each feature one pin, on the side facing its FIRST
interface's counterpart. Model v2's `pitch_plate_tan_link_attach_bore` (since
2026-11-18) meets the tangential link on the plate's left and the tangential
link's flanged bushing on its right: its pin is on the left, and the route to
the bushing runs back across the plate's own box, with its `pin_in_bore`
symbol inside it (shot: `docs/sessions/lessons/shots/the_pitch_plate_is_an_assembly_with_its_bushings/02_pitch_plate_district.png`).
The map's notes do not report it: a route through a box it ENDS on is exempt.

A second, smaller sighting in the same shot: a child box under its parent
(the pitch link's flanged bushing under the plate assembly) joined to the
parent by an interface gets that connector's symbol drawn over the child's box,
since the route is a few units long.

Fix shapes: a pin per side a feature's interfaces face (one feature, two pins,
the hover lighting both), or let the "routed through" check include the end
boxes beyond the pin's own stub. The authored edge order was used to keep the
tangential link joint on the plate's left; that is a workaround, not a fix.

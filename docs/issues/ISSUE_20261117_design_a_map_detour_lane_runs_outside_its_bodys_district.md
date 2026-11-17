---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md
---

# Design: a map detour lane runs outside its body's district

Handoff `the_blade_and_piston_joints_are_authored_as_what_the_parts_show` added
`detour` to `apps/viewer/map.js`. It routes a joint between two parts of one
column, with a part between them, along the column's outer side. On model v2
the upper piston head's fastener pattern takes the outer lane. That lane, with
its ring-of-dots symbol, runs just **outside** the pitch plate district's dashed
border. The pilot's inner lane stays inside it.

A connector between two parts of one body reads as leaving the body, though
neither end does. The tactical lesson calls this cosmetic and filed nothing.

See shot `01_map_3840_side_by_side.png` (the lane at the right of the pitch
plate district) and `05_bundle_piston_upper_head.png`, both under
`docs/sessions/lessons/shots/the_blade_and_piston_joints_are_authored_as_what_the_parts_show/`.

What would fix it: grow the district by the lanes its own detours take, or
reserve the lanes inside the district's padding. The map's layout file is not
the place; the district is derived.

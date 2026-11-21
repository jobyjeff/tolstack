---
type: bug
priority: low
status: deferred
defer_until: 2026-12-21
resolution: deferred 2026-11-21 (triage) -- low, the default knob; map_routing has no program
area: apps/viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_a_map_pin_faces_each_partner_and_no_two_routes_share_a_run.md
class: map_routing
---

# A lit map pin label can land on its part's number or on a connector's symbol

A pin's label shows only on hover and when lit (`labelAt` in
`apps/viewer/views/map.js`). The layout keeps a part's name clear of its pins'
dots, but not of their labels. Since 2026-11-19 a feature has a pin per
partner, so some parts gained pins on new sides. Two overlaps are visible on
model v2 when lit:

- **The pitch plate assembly's new right-hand pin** (`pitch_plate_tan_link_attach_bore`,
  toward the tangential link's flanged bushing). Its label, "tangential link
  bore", is drawn inside the box and lands on "215177-001" in the box's
  bottom-right corner. Shot: `docs/sessions/lessons/shots/a_map_pin_faces_each_partner_and_no_two_routes_share_a_run/after_3840_hover_2_tan_link_flanged_bushing_bore.png`.
- **The pitch link's flanged bushing (a child under the plate).** Its top
  pin's label, "bore", sits in the 64-unit gap above the child, on the press-fit
  symbol of the drop to the plate. Shot: `.../after_3840_hover_1_pitch_link_flanged_bushing_bore.png`.

Fix shapes:
- `placeName` keeps clear of each pin's label rectangle as well as its dot.
- A child's top-pin label sits beside its pin, not above it.

Related, and not the same sighting: F1 of `ISSUE_20261117_small_findings_of_the_portrait_map_and_joints_walk.md`. That one covers lit labels of one bundle drawn over each other and over jumpers; these are labels over a part's number and over a symbol.

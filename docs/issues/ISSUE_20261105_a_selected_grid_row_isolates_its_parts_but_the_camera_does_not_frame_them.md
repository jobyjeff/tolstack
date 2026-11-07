---
type: feature
priority: low
status: deferred
area: apps/viewer + apps/annotate (kinematic page highlight, 3D pane camera)
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
defer_until: 2026-12-06
class: three_d_visibility_policy
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# A selected grid row isolates its parts, but the camera does not frame them

Handoff `everything_in_3d_is_transparent_until_an_action_needs_a_face`
deliverable 3 asks that selecting a grid row make its parts solid, dim the
rest, **and frame the camera on the solid set**. The first two are built: the
pane's `highlight <topology> <edge>` in sweep mode is an action
(`app.js` `setHighlightAction`). The framing is not, on purpose: the kinematic
page sends that same `highlight` for a grid row **hovered** and for one
**selected** (`topology_app.js` `schedulePaneHover`, reused by
`followSelection`), and a camera that moves on hover moves the scene out from
under a reader running the pointer down the grid.

Options: (a) the page sends a distinct word on selection (e.g. a fourth
`frame` word on `highlight`, or `camera frame` after it) and the pane frames
only then — recommended, small, and the pane already has `camera frame`;
(b) the pane frames on any highlight that stays put for N ms — a timing rule
nobody can see; (c) leave it: the rail's own selection and the armed pick
already frame.

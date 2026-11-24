---
type: bug
priority: low
status: open
area: viewer/menus
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
---

# A menu over a large face covers part of it

The scene's right-click menu opens just below-right of the pointer
(`VA.placeMenu`, `apps/viewer/views/nav.js`) and lights the right-clicked face
while it is open. It knows only the point, so on a large face -- the
tangential link mount's shoulder ring at 3840 wide, shot
`docs/sessions/lessons/shots/right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays/after_3840_menu_scene.png`
-- the lit face runs on under the menu for its width. The point clicked and
the face's near edge stay in view.

Fix shape: the pane adds the face's screen-space box to `annotate:context`
(it has the face's vertices and the camera), and `VA.placeMenu` prefers the
side of the pointer the box leaves free, falling back to today's rule.

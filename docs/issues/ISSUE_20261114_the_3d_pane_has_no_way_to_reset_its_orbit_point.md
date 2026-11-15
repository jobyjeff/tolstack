---
type: bug
priority: med
status: open
area: annotate/camera
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md
---

# The 3D pane has no way to reset its orbit point, and a middle-click is read as a face click

Jeff, 2026-11-09: "The 3d navigation got stuck in a weird mode where the right
click drag (pan) became extremely insensitive … Mouse wheel also just became
extremely insensitive … probably need a way to reset the orbit rotation point
similar to Catia's middle-mouse click."

On the merged `integration` tree (3840×2160, v2, 3D-only view):

- Six wheel notches from the rest view put the camera inside the gas-spring
  piston (`docs/sessions/lessons/shots/the_merged_page_20261112/25_nav_after_wheel_in.png`).
- A middle-click there did not move the orbit point. The pane read it as a face
  click and showed "Pick an element on the left to bind this face to"
  (`…/27_nav_after_middle_click.png`).
- No control or key on the pane resets the view; only a page reload did.

Owner: none of the 11-12 chain; first raised 11-09 and not yet handed off.

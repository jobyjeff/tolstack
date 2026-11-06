---
type: bug
priority: low
status: open
area: viewer/dag-landing
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
class: layout_motion
---

# Opening the 3D pane still jumps the drawing by the page layout (~410 px), then glides

`filmstrip --scenario pane-open`: the lit band is at x=655 before the click and x=1066 in
the first frame after it (the nav column grows and the scene column appears in one layout
step), then glides to 887 over the tween. Only the pad/scroll residue is tweened; the layout
step is the browser's. Fixing it means animating the columns' own widths or starting the glide
from the pre-layout screen position (pad/scroll can't go negative to cancel 410 px) — a layout
decision. Also: the glide gets no waypoint (same rows, same span), and the 30-frame target
could not be proven on a contended box (see the lesson).

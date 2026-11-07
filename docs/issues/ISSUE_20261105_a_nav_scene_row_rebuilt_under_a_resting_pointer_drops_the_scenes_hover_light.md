---
type: bug
priority: low
status: deferred
area: viewer nav scene tree / annotator hover
reporter: agent
class: hover_lost_on_rebuild
found_by: docs/sessions/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# A nav scene row rebuilt under a resting pointer drops the scene's hover light until the pointer moves

On the kinematic study page with the 3D pane open and the sweep paused, rest the
pointer on a body row in the nav's scene tree (`#sweep-tree/body=<name>`). The
body lights in the scene (`__lastHover.target` is that body). Then, **with the
pointer not moving**, the light can go out and stay out: `__lastHover` read
`null` for the whole of a 5 s wait while the pointer was still on the row.

Measured 2026-11-05 in `3D pane follows the selection`, sub-check
`[real] ...and leaving it takes the light down`: its precondition (`held`) was
false in 1 of 4 `--only` runs beside a default `pytest -q` run, and 0 of 11 after
the check started stepping the pointer a pixel while the light was out. The
step brings it back every time. So the row under the pointer is being replaced
(the suite's own comment: "a rail rebuild just after the hover clears it for a
moment and the row under the pointer sends `enter` again"), and the new row
hears `enter` only on the next pointer move. Under load that move is late or
never, because the pointer is resting.

The check now holds the light with a resting pointer (see the handoff's lesson).
This issue is the product half, and it is not measured beyond the above. A
reader resting on a body row could see the body's light blink off and stay off
until they nudge the mouse. Worth knowing:

- which repaint replaces the row (the `annotate:tree` message → the nav's
  re-render is the suspect), and whether it needs to replace a row whose content
  did not change;
- whether the page should re-post the hover for the row under the pointer after
  a rebuild (it knows which key was hovered), rather than wait for the browser's
  next boundary event.

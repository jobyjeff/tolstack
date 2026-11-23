---
type: bug
priority: med
status: resolved
area: viewer nav scene tree / annotator hover
reporter: agent
class: hover_lost_on_rebuild
found_by: docs/sessions/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
handoff: docs/sessions/HANDOFF_20261121_a_body_row_in_the_nav_takes_a_resting_hover_every_time.md
resolution: handoff completed 2026-11-23 -- closed automatically by dispatch when handoff `a_body_row_in_the_nav_takes_a_resting_hover_every_time` moved to completed/; not independently verified.
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

## Sighting 2026-11-20 -- review of a_link_is_a_machined_part_and_two_bearings_each_two_races

Whole browser tier on the merged tree (`f7b119dd`, scratch root, 2416 s): 48/49
suites, the one red `[real] resting on a body row in the nav lights that body in
the scene` (kinematic study, body `base`). The DIAG showed the light standing in
every sample (own partOverlays 2, about 5, nothing opaque, none faint) beside two
`locator.hover` 2000 ms timeouts. The same suite `--only` on the same tree:
31/31. The diff under review does not touch v1 or the hover path.

## Sighting 2026-11-21 -- triage batch merge (`dispatch/docs/sessions/lessons/LESSONS_20261121_triage_sweep.md`)

Whole browser tier, main checkout, merged trunk `53271c6c`, projections rebuilt
first (`node scripts/run_viewer_browser_tests.mjs`, 2458 s): **48/49**, the one
red `[real] resting on a body row in the nav lights that body in the scene` in
`3D pane follows the selection`, 30/31. The DIAG again had the light standing in
every sample (own 1, about 5, nothing opaque, none faint) beside **three**
`locator.hover` 2000 ms timeouts, pointer last under `SPAN.navtree__label`.
Unlike 11-20, the `--only "3D pane follows"` re-run straight after was **also
30/31** (127 s), so it reproduced twice in a row on this tree. Raised from
deferred low to open med and routed to
`HANDOFF_20261121_a_body_row_in_the_nav_takes_a_resting_hover_every_time`.

## Measured 2026-11-22 -- the row is not rebuilt; the check hovered before the pane settled

`HANDOFF_20261121_a_body_row_in_the_nav_takes_a_resting_hover_every_time`. A
MutationObserver on `#navtree` across the check's whole 20 s window recorded
**no** removal of the body row (two failing runs), so nothing replaced it under
the pointer. What the runs showed instead: the pane was still opening the model
(a command posted behind it was answered 14.9 s later) and that work held the
main thread the page shares with its same-origin pane -- the `light` waited in
the pane's queue, and `locator.hover` stalled at "performing hover action". The
check now waits for the pane's queue to drain first (the map suite's barrier)
and asserts the same light; green after. The product half is the queue and the
thread, already filed as
`ISSUE_20261119_a_hover_waits_behind_the_pane_opening_its_model_before_the_scene_lights_it.md`
(sighting appended there). The 2026-11-05 observation (light out with a
resting pointer, back on a one-pixel move) was not reproduced and is not
explained by a rebuild of this row.

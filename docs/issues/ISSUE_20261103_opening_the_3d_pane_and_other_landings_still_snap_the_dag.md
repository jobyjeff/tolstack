---
type: bug
priority: low
status: resolved
area: viewer/dag-landing
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261103_the_dag_holds_still_and_the_filter_bar_stays_put.md
class: layout_motion
handoff: docs/sessions/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
resolution: strategy 2026-11-05: routed into HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in (Jeff's note 20261105T164140_sm8hkc) -- handoff completed 2026-11-06 -- closed automatically by dispatch when handoff `a_tween_is_seen_and_zooms_out_before_it_zooms_in` moved to completed/; not independently verified.
---

# Three landings still move the DAG in one step, and the pinned filter bar is two rows tall in a narrow column

`the_dag_holds_still_and_the_filter_bar_stays_put` made a **study change** one
continuous frame: the pad before the drawing, the sideways scroll and the page
scroll are measured on the target layout before the transition starts and
interpolated with it (`landingHooks`, `measureLanding` in
`apps/viewer/topology_app.js`; the `landing` option of `VA.animateTopoPane`).
Three other places move the same frame and were not part of that handoff:

| site | what happens | why it was left |
| --- | --- | --- |
| The 3D pane opening (`launchAnnotate` → `dropBandPad()`) | the pad is dropped and the pane narrows the page in the same paint: the drawing steps left by the pad. | A width change is not a study change: there is no tween to carry the pad, so smoothing it is a second animation (the pane's own width). Needs a call on whether the pane's opening should animate at all. |
| The 3D pane closing (the flyout's `close` handler: `dropBandPad(); fitDagTo(true, true)`) | the band is re-centred for the restored width, in one step. | Same. |
| A landing that has to scale the drawing down (`fitDagTo(true, true)` lowers `state.dagZoom` when the band does not fit) | during a transition the zoom takes its new value on the **first** frame (`ctx.zoom = state.dagZoom` after the measurement) instead of easing; before this handoff it took it on the last. Still one step, now at the other end. | Zoom is drawn into the rails SVG (`topoRezoom`), so tweening it means tweening the DAG's own scale inside `railsSvg`. |

Also: on a 1600 px window the view-filter bar wraps to two rows (about 90 px
measured, `--filter-h`), and it is pinned now. Together with the page bar that is
~140 px of a 1000 px window that never scrolls. `VA.DAG_ZOOM.min` went from 0.15
to 0.12 so the tallest walk still fits under it. Whether the filters should
collapse to one row (an overflow menu, or the labels shortened) is a layout
decision.

Recommendation: leave the pane open/close as a step (it is a layout change the
reader asked for and the drawing is re-centred for the new width), and take the
filter-bar height to a strategy session with the pane widths.

Measure with `node scripts/filmstrip.mjs` (a scenario module with a `trigger`
that opens the pane; the clock is stepped, so the frames are fixed apart).

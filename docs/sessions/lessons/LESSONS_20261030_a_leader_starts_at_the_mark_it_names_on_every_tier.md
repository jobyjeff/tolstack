# Lessons 2026-10-30 — a_leader_starts_at_the_mark_it_names_on_every_tier

## What was actually wrong (measured on P2, both screenshot edges)

There was no single stale cache. There were three defects. One was a stale
copy, and the other two were rules that disagreed.

| Jeff saw | Mechanism | Code path |
|---|---|---|
| 3 leaders from the hovered row into the DAG, 1 leg to 3D from "a different node" (screenshot 2, `gas_spring_mount_flange_to_end_stop`) | A DAG↔grid leader led hover for the edge whose row **starts at its seam** (`beforeEdge`). The 3D overlay lit the edge's **ends**. The 3 grid leaders were `hub_spindle_bore_axis`, `gas_spring_mount_hub_face` and `piston_cover_mount_flange_seat`, the nodes whose seam is above that row. The one 3D leg was `endstop_feather_contact`, the end that has an anchor. | `views/topology.js` railsSvg 2b, `leads: [..., hotKey("edge", leader.beforeEdge)]` |
| Upper joint has no 3D leg (screenshot 1, `pitch_plate_flange_to_link_hole`, the red "?") | `piston_rod_end_bore` anchors at `origin`: no mesh installed for `vpa_piston`, so the scene exports `null`. That is an honest absence, already filed as `ISSUE_20261027_design_the_model_layer_draws_a_star_at_the_assembly_origin_and_runs_the_blade_lines_1400mm_outboard.md` (on HEAD, integration and master). Separately, any visible dot level with the **pinned** header lost its leg: the clip used the header's whole box, but the header is transparent over the rails. | `topology_app.js` drawSeamLeaders `dotClip.top = head.getBoundingClientRect().bottom` |
| "Originating from the wrong points … self resolved" | The page's `seamAnchors` survived a pane close and a scene document reload. It drew to the old points until the scene happened to post again. The scene de-duplicates identical posts, so after a reopen it might never post. | `topology_app.js` `seamAnchors` was only ever assigned, never dropped |

The handoff guessed "a stale cache after respine / band re-layout / resize".
That part was sound. The overlay was already redrawn from fresh rects and the
current `lastTopoRender.seam` on every paint, scroll and resize, and the new
re-lay check confirms it.

## Events that now redraw the leaders, and what drops the anchor copy

- Redraw (`scheduleSeamDraw`) happens on: an anchors message, every pane paint
  (respine frames, re-lay, and now a **zoom**, which repaints), any scroll
  (captured), the ResizeObserver on the pane, the flyout and the document,
  window resize, and hover changes (`onHot`).
- The copy is dropped (`forgetSeamAnchors`) on: flyout close, and the
  iframe's `load` (a new document).
- The page asks the scene to post again (new `model anchors` verb, which clears
  `postedText` and posts now) on: flyout reopen, and `annotate:state`.

## Deliverable 0 — the DAG zooms alone

- `.tv__zoom` is no longer transformed. The DAG is drawn in two
  `g.tv__dag` layers of the rails SVG (under and over the leaders), scaled
  about the DAG block's top-left (`y0 = positions.offset`). The grid and the
  header stay at 1, and **the grid does not move** on a zoom.
- `VA.leaderGeometry(..., {zoom: {k, y0}})` runs each leader in SVG pixels,
  from the scaled dot to the unscaled seam. Every x on the DAG side scales,
  the jog zone's included, and `width` is where the table starts at that
  zoom. `VA.seamDots` takes the same zoom, so the page overlay no longer
  reads a scale off the SVG rect.
- The first cut kept the jog zone at full width. On the kinematic page at
  1600×1000 that made the rails SVG as wide as the pane, and the grid sat
  wholly under the sticky rails, with a 4px sliver under the divider. Only the
  grid side of the picture may stay unscaled.
- A zoom change repaints (`VA.applyTopoZoom` calls `root.topoRezoom(k)`).
  The old per-wheel transform is gone, and so is the `--tv-shift` sticky
  workaround: nothing above the rails is scaled.
- Fit fits the DAG's lit part only (`span.at(k)`, `dagWidth`, `zoneWidth`).
  The wheel and Fit got the minimum edits this needed: re-reading the box after
  the repaint, `pad * to`, and no sideways rescale. The fence named them, but
  their arithmetic assumed the shared transform that deliverable 0 removes.
- One zoom-suite claim could not survive the decision and was replaced:
  "at the Fit zoom every grid column is inside the frame". An unscaled grid
  cannot be fitted. It is now "Fit leaves the grid at its own scale".

## Gotchas

- At 1600×1000 the topology pane is narrow. After any `scrollIntoView` the
  grid sits scrolled sideways **under** the sticky rails, so a row's centre is
  a leader path and `locator.hover()` silently hovers nothing. The trace
  checks point at the row's visible part (right of the rails, inside the pane).
- In that sideways state the header's table genuinely covers the DAG. The
  pinned-header check resets `scrollLeft` first.
- The DOM shim's `querySelectorAll` takes only `tag`, `.class` or `tag.class`,
  with no descendant combinators.
- The fixture scene has no geometry, so it never posts anchors, and
  `model anchors` gets no reply there. The reopen check passes by drawing
  nothing stale, which the old code failed.
- Crossing (brief item 1): an edge's two grid leaders never crossed in any
  measured case. They land at their own boundary seams in walk order. The
  trace check now asserts that, so no routing change was needed.

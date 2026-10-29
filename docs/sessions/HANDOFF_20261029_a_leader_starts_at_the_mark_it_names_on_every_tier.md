---
priority: high
depends_on: [the_annotator_has_no_front_door]
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — a_leader_starts_at_the_mark_it_names_on_every_tier: the grid→DAG→3D leaders are one continuous trace from the right anchors, re-measured after every layout change

Source: Jeff's forge note `20261029T120929_5ysvll` / `20261029T135845_jdy8k2`
(two screenshots, paths in `the_dag_zoom_leaves_the_grid_and_the_page_alone`),
consumed by the 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`); also item 1 of the
consumed `docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md`
(leaders crossing). Baseline: `master` with the datum handoff landed (it
rewrites `kinematic.js`, which draws nothing you need but shares the pane).
Scope: the leader-drawing code in `apps/viewer/topology_app.js` and the
scene's anchor export in `apps/annotate/` (`__lastAnchors`, the seam
messages), `apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs`
(`testSeamLeaders`). Do NOT touch zoom/Fit/toolbar/grid layout
(`the_dag_zoom_leaves_the_grid_and_the_page_alone`) or the hover/preview
mechanism (`a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark`).

Jeff's words:

> The leader lines that point to both joints when you select an element is
> neat, but sometimes buggy. In this screenshot, you can see that the lines
> from gridview to dag aren't continuous with the lines to the 3d. Actually
> with this one the upper line from 2d to 3d dag is missing entirely, I think
> I saw other ones where they were originating from the wrong points, though
> they seem to have self resolved (might have been a browser cache issue
> again) … Second screenshot: This one has screwy leader lines, there are
> three of them coming out of the grid row to 2d dag, and a single one coming
> out of a completely different node to the 3d view.

## What the two screenshots show (read them before coding)

- Screenshot 1 (`paste-20261029T120915.png`): the selected grid row
  ("piston flange (A datum) to pitch link hole position") sends two leaders
  into the DAG; the DAG→3D leg for the upper joint is absent; the lower
  DAG→3D leg lands on a 3D anchor that is not the lit joint. Jeff drew a red
  "?" at the upper joint's DAG node.
- Screenshot 2 (`paste-20261029T131206.png`): the hovered grid row
  ("cover flange to end-stop surface") has **three** leaders into the DAG and
  one DAG→3D leader leaving from a node that is not either end of the edge.

Likely mechanism (verify, do not assume): leaders are drawn from cached
anchors — the DAG's node positions and the scene's exported anchors — and the
cache is stale after a respine / band re-layout / scene column resize, so
the leader starts where the mark *was*. The 2026-10-28 browser-settle issue
(`ISSUE_20261028_the_p2_seam_leader_check_races_the_scenes_anchor_messages_under_load`)
is the test-side symptom of the same race.

## Decisions (made)

- **One trace, three tiers, one record.** A selected or hovered element's
  leaders run grid row → its DAG mark(s) (the two end nodes of an edge, the
  node of a node) → the 3D anchor(s) of exactly those marks. Never more
  leaders than marks, never a leader from a mark the element does not name.
- **Anchors are measured at draw time**, from the DAG's current layout and the
  scene's latest anchor message, and re-drawn on every event that moves a
  mark: respine end, band re-layout, zoom, pane/scene resize, scene camera
  change. A leader whose 3D anchor is not yet reported is drawn to the DAG
  only and completed when the anchor arrives — never drawn to a stale point.
- **Crossing leaders** (brief item 1): leaders from one grid row to two DAG
  marks are routed so they do not cross each other (order the exits by the
  marks' y); leaders crossing *rails* is accepted.

## Deliverables

1. The anchor source rewritten as above; the stale cache gone or invalidated
   on the events listed.
2. Browser checks: for each of the two screenshot cases (edge
   `pitch_plate…hole_position`, edge `cover_flange_to_end_stop_surface`),
   leader count equals mark count, each leader's start is within 2 px of its
   mark's current centre, each DAG→3D leader ends at that mark's exported
   anchor — measured **after** a settled-state wait (the staged
   `viewer_browser_checks_wait_on_settled_state` pattern), not a fixed pause.
3. The seam-leader check in `testSeamLeaders` reads the same anchors the
   product draws from (one source), so the test cannot pass while the page
   draws wrong.

## Definition of done

- Both screenshot cases reproduce green in the browser tier at 1600×1000 and
  1920×1080; a respine during selection leaves the leaders attached (a check
  that selects, triggers the band re-layout, and re-measures).
- `node scripts/run_viewer_browser_tests.mjs`, `node apps/viewer/run_tests.cjs`,
  `node apps/annotate/run_tests.cjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses
  `--changed-since integration` clean.
- Lesson: the actual stale-anchor mechanism found (named code path), and the
  list of events that now trigger a redraw.

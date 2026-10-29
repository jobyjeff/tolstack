---
priority: med
depends_on: [the_dag_zoom_leaves_the_grid_and_the_page_alone]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_rearrange_animates_and_centres_the_active_study: a study change tweens the DAG and lands with the active band centred in the canvas

Source: Jeff's forge note `20261029T121242_jlanwy` / `20261029T135845_jdy8k2`,
consumed by the 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`). Baseline: `master`
with `the_dag_zoom_leaves_the_grid_and_the_page_alone` landed (Fit and zoom
scope are its; this handoff reuses them). Scope: `apps/viewer/views/topology.js`
(the respine / band re-layout transition), `apps/viewer/topology_app.js`
(arrival), `apps/viewer/tests.js`, the browser tier. Do NOT touch leaders,
`#detail`, `kinematic.js`, the toolbar's group/unlit controls.

Jeff's words:

> Add smooth animations when the dag rearranges, and automatically center the
> active study in the window/canvas. Currently it's very jarring because the
> entire canvas just disappears and gets redrawn with a different one, and
> you're left staring at a random dimmed/inactive part of the graph.

Context the agent needs: the compact-band layout
(`the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below`,
landed 2026-10-29) re-orders rows per study and already has a tween for the
respine (its lesson: "the existing tween"); its arrival Fit was deliberately
**not** auto-zoom on arrival ("fitting against a mid-animation frame is
wrong", 10-28 lesson). Jeff now asks for exactly that landing, done right.

## Decisions (made)

- **Every node and edge that survives a study change moves, it does not
  blink.** Rows that are in both layouts tween from old to new position
  (~300 ms, ease-out; one duration constant); rows that leave fade out, rows
  that arrive fade in. Nothing is cleared-and-redrawn.
- **The camera lands on the active band.** When the tween completes, the
  viewport is translated (and, only if the band does not fit at the current
  zoom, scaled down to the Fit level) so the active band is centred in the
  DAG box, vertically and horizontally. Measured against a *settled* layout,
  never a mid-tween frame. A user zoom afterwards is respected until the next
  study change.
- **Reduced motion is honoured** (`prefers-reduced-motion`): positions jump,
  the camera still centres.

## Deliverables

1. The tween over the band re-layout and the deferred centring.
2. Browser checks: after selecting a study, the band's bbox centre is within
   4 px of the DAG box's centre once `requestAnimationFrame` settles; no
   element is removed and re-added with the same id during a transition
   (count mutations); reduced-motion path centres without tweening.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs`, `node apps/viewer/run_tests.cjs`,
  `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green;
  witnesses `--changed-since integration` clean.
- A short screen recording or three-frame sequence in the lesson's shots
  folder for the kinematic → `pitch_link_cotter_hole_clearance` → kinematic
  study switch.
- Lesson: the duration chosen and how centring interacts with the sideways
  scroll the 10-28 arrival Fit kept.

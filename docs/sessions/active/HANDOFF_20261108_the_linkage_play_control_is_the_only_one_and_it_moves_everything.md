---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-08 — the_linkage_play_control_is_the_only_one_and_it_moves_everything: the 3D pane's play, step and scrub drive the one pose, and the grid, the DAG and the chart follow it

Source: Jeff's forge note `20261108T001814_kpoev0` (2026-11-08), verbatim:
*"Animated plot and grid view: Actually it wasn't completely dropped, but the
play controls were implemented completely separately from the linkage animation
that already exists. When you use the linkage play controls, only the linkage
moves, but when you use the newly added ones in the right side preview pane,
both linkage and the plot/gridview animate. Please consolidate into the original
controls."* Baseline: trunk `master` at 2026-11-08, after
`the_grid_and_the_dag_move_with_the_mechanism` (2026-11-05, completed) and with
`the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id`
possibly still `active/` — merge `integration` before you measure. Scope:
`apps/viewer/topology_app.js`, `apps/viewer/views/kinematic.js`,
`apps/annotate/app.js` (the transport only), their tests; do NOT touch the
grid's row rendering or value columns (`views/topology.js` element records —
sibling `a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses`), the DAG
layout, or colours.

## What is there today (measured 2026-11-08)

- **Two transports.** The page's: `apps/viewer/views/kinematic.js:1695-1753`
  (`stackStopPicker`, `.kmpose__play`, the slider and the typed blade-angle
  field), driven by `topology_app.js:3656-3696` (`startPlay` / `livePose`). The
  3D pane's — the original linkage animation: `apps/annotate/app.js:2191-2216`
  (◀ ▶ ▶|, `an__sweep-range`), run by `cmdPlay` / `tickSweep`
  (`app.js:1970-2065`).
- **The link is one-way.** The page posts `pause` and then `seek` into the pane
  (`syncPanePose`, `topology_app.js:3667`). The pane never reports its pose back,
  so playing from the pane moves only the 3D model while the grid, the DAG edge
  lengths and the chart cursor sit still — exactly what Jeff saw.
- The 11-05 handoff said *"Where the 3D pane already owns a play control,
  unify, do not duplicate"* (`HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md:31-32`)
  and fenced the annotator out of scope in the same breath; the reviewer listed
  the result under "Accepted calls" and it was filed as
  `docs/issues/ISSUE_20261106_the_3d_panes_own_play_and_scrub_do_not_move_the_pages_pose.md`,
  deferred to 11-20. **This handoff takes that issue.**

## Deliverables

1. **One pose, owned once.** The sweep pose (frame index / blade angle) has one
   owner, and both the pane's transport and anything on the page read and write
   that one state. Suggested direction (not binding): the pane keeps the
   transport it has always had and emits a `pose` message on every tick, seek
   and step — the mirror of the `seek` it already accepts — and the page's
   `livePose` subscribes to it. Whichever side owns the clock, there is exactly
   one `setInterval`/`requestAnimationFrame` loop advancing the pose.
2. **The original control is the control.** Jeff's words are "consolidate into
   the original controls": the pane's ◀ ▶ ▶| and scrub are the transport. The
   page's duplicate `.kmpose__play` strip goes. What may stay on the page is a
   **read-out** of the current pose (frame, travel mm, blade angle, as the
   pane's own header already prints) and the typed blade-angle entry *only if*
   it calls the same seek the scrub does — a second way to set the one state,
   never a second state. Say in the lesson which you kept and why.
3. **Everything follows.** With the pane playing: the 3D linkage, the grid's
   per-row sensitivity/contribution numbers, the DAG's edge lengths in
   contribution mode, and the chart's cursor advance together, frame for frame;
   pause stops all four on the same frame; a scrub lands all four on the same
   frame. The "pause does not pause" bounce from the 11-05 review must not
   recur — the one loop makes it structurally impossible, which is the point.
4. **The stale-run fence.** The pane and the page must read the **same** sweep
   artifact id; if the republished-sweep handoff has landed, that is
   `vpa-pitch-p2-20261105-204957`. A pose index from one artifact applied to
   another is a silent wrong frame — assert the id on both ends and refuse (in
   the console and as one muted line on the page) when they differ.

## Definition of done

- In the main checkout, served from drawing-checker's mount
  (`http://127.0.0.1:8000/tolstack/viewer/topology.html`, the kinematic study
  open with the 3D pane): press play **in the pane**; a 28-frame filmstrip
  (`tests/debug_*` runner of your choice, the `play_cycle.png` pattern from the
  11-05 lesson) shows linkage, grid numbers, DAG lengths and chart cursor all
  changing on the same frames; pause holds all four; a scrub to frame N shows
  frame N in all four. Record the frame indices read from each surface in a
  table in the lesson — identical columns, or it is not done.
- The page carries no second transport (`grep kmpose__play apps/` is empty, or
  the lesson explains the read-out that remains).
- `ISSUE_20261106_the_3d_panes_own_play_and_scrub_do_not_move_the_pages_pose`
  closed with a `resolution:` naming this handoff.
- Fast tier, `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`
  and the browser tier green in the main checkout, projections rebuilt first;
  `--changed-since integration` witnesses pass.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_the_linkage_play_control_is_the_only_one_and_it_moves_everything.md`):
  the pose-ownership diagram in five lines (who owns, who emits, who listens),
  the frame-index table, the filmstrip, and one still of the page at a mid-sweep
  frame with the pane beside it.

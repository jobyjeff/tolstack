---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-03 — the_dag_holds_still_and_the_filter_bar_stays_put: no snap before or after the re-arrange, no jump on click, nothing clipped at the top, the view filters pinned, cross-tier leaders dimmed — and a filmstrip proves each

Source: Jeff's forge note `20261102T143335_4pcrwl` → `20261103T165357_43vf96`
(2026-11-02/03), live on `http://127.0.0.1:8000/tolstack/viewer/`:

- *"2d dag animation is broken: Dag snaps to be left aligned, plays the
  animation, and then snaps back to the center of the screen."*
- *"Clicking nodes/elements in the 2d dag causes unpredictable behavior, the
  entire dag jumps horizontally left/right."*
- *"with the DAG scrolled all the way up, the top of the dag looks clipped"*
  (his 6th screenshot,
  `C:\workspace\forge\data\inbox\atomic-notes\attachments\20261103T165357_43vf96\paste-20261103T154014.png`:
  the first node row sits under the filter bar).
- *"The header at the top with the view filters should be pinned so that it
  doesn't go off screen when you scroll."* (the bar reading Rows: Comfortable ·
  Rows: labelled · Lengths: uniform · Fit · Leaders: angled · Unused: dimmed ·
  Groups).
- *"Might help to make the leaders (which connect 2d/3d dags, and 2d/grid)
  different color or slightly dimmed."*
- *"Need better browser tests to debug animations (does Claude have video?
  should we use a multimodal model with video encoding as part of this
  check?)"* — and *"agents need to do some browser/screenshot work to click
  around and experiment with the dag."*

Baseline: `master` with `the_rearrange_animates_and_centres_the_active_study`
(10-29, incl. its review re-run: the "never blinks" guard and `RESPINE_SHOTS`),
`a_leader_starts_at_the_mark_it_names_on_every_tier` (10-30, DAG-only zoom,
`scheduleSeamDraw`), `the_grid_header_rides_its_rows_on_merged_trunk` (10-29)
landed. Scope: `apps/viewer/topology_app.js` (landing: `state.bandPad`
~2140–2230 and ~2648, `landingPending`, `fitDagTo`, `keepSideways`; seam
leaders: `drawSeamLeaders`, `dotClip`), `apps/viewer/views/topology.js`
(`ctx.bandPad` ~457, the toolbar), `apps/viewer/topology.css` (sticky rules
~114–120, ~396–418), `scripts/` for the filmstrip tool, `CLAUDE.md` for the
rule, `apps/viewer/tests.js`, the browser checks. Do NOT touch the results
table or chart (`views/kinematic.js`), the pane (`apps/annotate/`), or the
leader *path* geometry (`VA.leaderGeometry`, settled 10-30).

## What is known about each, so you measure before you fix

- **The snap.** The 10-29 landing computes `bandPad` (margin-top/left on
  `.tv__zoomsizer`) and applies it on *the first paint that is not mid-tween*
  (`landingPending`). The tween itself runs in the un-padded frame, so the
  drawing jumps left (pad dropped at `serialisation() !== paintedSerialisation`,
  ~2648), animates, then jumps to centre when the pad lands. Fix shape
  (suggestion): compute the landing pad from the *target* layout before the
  tween starts and interpolate the pad with the tween, so the frame the
  reader sees is continuous; or hold the previous pad through the tween and
  tween the delta. Either way the "never blinks" guard's per-frame sampler is
  the harness: assert the lit band's bounding box moves monotonically between
  its start and end centres, never outside both.
- **The click jump.** A selection change re-runs the landing
  (`keepSideways`/centring on `scrollLeft`), so a click that changes the lit
  set re-centres horizontally even when the reader did not move. Rule: a
  click inside the pane never changes the horizontal frame; only a study
  change (nav row) may, and then by the animated landing.
- **The clipped top.** `dotClip.top` uses the pinned header's box and the
  landing's `margin-top` can be smaller than the toolbar + header height at
  scroll 0; the first node row sits under them. The DAG's first row must be
  fully visible at `scrollTop = 0` at every zoom.
- **The filter bar.** It scrolls away with the page; the grid header is
  sticky at `top: 47px` under the page bar. Make the view-filter bar sticky
  under the page bar too (one stacking order: page bar, filter bar, grid
  header), and re-derive the sticky offsets from one place so the 47px does
  not become two numbers.
- **Cross-tier leaders.** DAG↔grid (in-SVG, `views/topology.js` railsSvg) and
  DAG↔3D (page overlay, `drawSeamLeaders`) leaders are drawn in the edge ink.
  Dim both to a single token (`--leader-ink`, ~40–50% of the edge ink's
  luminance against the background, keeping ≥3:1 contrast) and keep the
  hovered/selected element's leaders at full ink — the hover emphasis that
  already exists. One token, both tiers.

## Deliverables

1. The re-arrange is continuous: no frame of the transition shows the band
   outside the segment between its start and end positions; the pad is part
   of the tween. Guard added to the "never blinks" suite.
2. A click on a node, edge, group or row inside the pane never moves the
   drawing horizontally (vertical scroll-into-view of the clicked element is
   allowed and smooth). Guard measures `scrollLeft` and the sizer's
   `marginLeft` before and after a click on the kinematic page.
3. At `scrollTop = 0` the first DAG row is fully visible under the pinned
   bars at zoom 1, Fit and the wheel's max; nothing is clipped. Guard.
4. The view-filter bar is pinned under the page bar; the grid header stays
   pinned under it; the stacking order and offsets come from one declaration.
   Guard: both bars' `getBoundingClientRect().top` after a long scroll.
5. Cross-tier leaders are dimmed through one token, hovered ones full ink.
   Guard: computed stroke on a resting vs hovered leader in both tiers.
6. **`scripts/filmstrip.mjs`**: given a browser-check name (or a scenario
   function) and a frame count, drives the viewer with Playwright, captures N
   screenshots at fixed intervals across a transition and composites them
   into one PNG (a row of frames with timestamps, 1600 px wide), written to a
   named folder. Generalises the `RESPINE_SHOTS` capture from 10-29. The
   lesson's evidence for deliverables 1–2 is two filmstrips (before/after).
   Takes the browser slot itself like every runner (`scripts/browser_runner.mjs`).
7. **The rule, in `CLAUDE.md`** (the "Visual hierarchy"/browser-tier section,
   one short paragraph): a handoff that changes what the viewer draws or how
   it moves ends with an **exploratory click-around** on the real projection
   — click every kind of thing it touched, scroll, zoom, hover — with
   screenshots or a filmstrip in the lesson's shots folder, *before* the DoD
   checks. Reviewers read the shots. Claude reads images, not video; the
   filmstrip is the video.

## Definition of done

- `http://127.0.0.1:8000/tolstack/viewer/`: switch Blade pitch at the end
  stops → `pitch_link_cotter_hole_clearance` → back; the filmstrip shows a
  continuous move. Click three nodes and a group on the kinematic page; the
  drawing does not shift sideways. Scroll to top: first row clear of the bars.
  Scroll down: filter bar and grid header pinned. Leaders dim at rest, full on
  hover. Shots and two filmstrips in
  `docs/sessions/lessons/shots/the_dag_holds_still_and_the_filter_bar_stays_put/`.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`,
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  green with the five guards witnessed; `venv-win/Scripts/python.exe -m pytest -q`
  green; `node scripts/filmstrip.mjs --help` documents itself.
- Issues: resolve `ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md`
  only if the fix stopped the per-frame rebuild; otherwise leave it and say
  so. Route and resolve `ISSUE_20261030_a_wheel_zoom_repaints_the_whole_topology_pane_on_every_wheel_event.md`
  only if deliverable 3's work touched it.
- Lesson (`docs/sessions/lessons/LESSONS_20261103_the_dag_holds_still_and_the_filter_bar_stays_put.md`):
  the measured cause of each of the five symptoms (one table), the before/after
  filmstrips, what the click-around found that the DoD did not ask about.

---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-28 — a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing: "Pick" on a joint blanked the canvas and only a page refresh brought it back

Source: Jeff's 2026-10-28 review of the hosted viewer (the scene pane embedded
beside the model), confirmed by a read-only trace of `apps/annotate/app.js`
the same day. Baseline: `master` after the 2026-10-28 batch merge
(`a_named_finding_skip_does_not_redden_the_default_tier` landed). Scope:
`apps/annotate/app.js` — `cmdGoto` (~:703–757), `leaveSweep` (~:1142–1170),
`renderRailFilter` (~:3359–3367), the embedded rail mirror (`railRoots`
~:4256–4261) — plus `apps/annotate/run_tests.cjs` and the browser spec in
`scripts/run_viewer_browser_tests.mjs` (~:6745–6758). Do NOT touch the
transport/boot code (~:4480–4830), `renderSweepBar`, `apps/annotate/style.css`
or anything under `apps/viewer/` — a sibling handoff staged today
(`the_scene_pane_is_one_flyout_that_reads_over_http`) owns those and depends
on this one.

## What Jeff did and what happened

In sweep mode he pressed **Pick** on the joint row "hub spindle bore axis to
pitch plate / gas-spring bushing". The canvas went black, most of the
structure tree disappeared, a line said the element names no part, and
nothing on the pane got him back; he refreshed the page and then had to click
around to recover the view.

## Why (traced)

- The row's `.tree-row__repick` runs `railExec(["goto", topology.id,
  via.edgeId])` (~:2344–2352; contributor rows the same at ~:2399–2406).
- `cmdGoto` first calls `leaveSweep()`, which exits sweep mode and **unloads
  every part the sweep had opened** (`for (const sha of sweep.openedBySweep)
  state.scene.unloadPart(sha)`) and removes `#sweep-tree`.
- The two edges Jeff named are **gap edges with `part: null`**
  (`hub_to_pitch_plate_spindle_coaxiality`,
  `gas_spring_bushing_coaxiality`). `resolve()` skips a null part, so
  `parts` and `missingParts` are both empty, `shas` is empty, the isolate
  step is skipped ("never on an empty list", ~:750–754) and nothing is
  reloaded. Blank canvas.
- `renderRailFilter` shows "This element names no part, so there is nothing
  to show in 3D." The panel filter keeps one edge, and embedded mode mirrors
  only `#rail-filter`, `#element-list`, `#parts-panel` — so the tree shrinks
  to that one edge.
- No way back: the sweep controls live in the sweep bar, which is gone in
  bind mode; `#topology-select` / `#study-select` are hidden in embedded
  mode and not mirrored; the shell re-drives the pane only when its params
  key changes (`followSelection`, `apps/viewer/topology_app.js` ~:1216–1230),
  so re-clicking the same study does nothing; the mirrored "Show all" lifts
  the filter but reloads no parts and does not restore sweep mode.

## Deliverables

1. **A pick that cannot show anything changes nothing.** Before leaving
   sweep or unloading a part, `cmdGoto` resolves the target: if the edge
   names no part, or names parts none of which has an installed mesh, the
   command **returns without changing mode or scene**, and the message lands
   on the row that was clicked (not only in the rail filter line): "This
   joint is between two axes and names no part to pick on — bind the
   features on either side instead", with the two end-node rows linked. Same
   for the "no installed 3D part for …" case, naming the part.
2. **Every mode change in the pane is reversible from the pane.** When a
   goto legitimately leaves sweep mode (a feature with a part), the pane
   shows a one-line return control at the top of the rail — "← back to the
   sweep" — that restores sweep mode, reloads `openedBySweep` and clears the
   filter; it is mirrored in embedded mode. The mirrored "Show all" also
   reloads the parts it had unloaded.
3. **The shell can re-drive the same selection.** `followSelection` accepts
   a forced re-drive (clicking the already-selected study row re-sends the
   params) so the host page is always a way back.

## Definition of done

- `apps/annotate/run_tests.cjs`: value-level cases for (a) goto on a gap
  edge with `part: null` leaves `state.mode`, the loaded part set and the
  filter unchanged and records the row message; (b) goto on a part with no
  mesh likewise; (c) the return control restores sweep mode with the same
  `openedBySweep` set.
- Browser spec (`scripts/run_viewer_browser_tests.mjs`): on the real
  kinematic page, press Pick on the hub-spindle coaxiality row → the canvas
  still shows parts (count of loaded meshes unchanged), the row carries the
  message, the tree keeps its rows; press Pick on a bound-able feature → the
  return control appears and restores the sweep. Update the existing
  ~:6745–6758 spec rather than adding a contradictory one.
- `node apps/annotate/run_tests.cjs`, `node apps/viewer/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `node
  scripts/run_mutation_witness_tests.mjs --changed-since master` — in the
  main checkout, projections rebuilt first.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing.md`):
  which other rail gestures can still strand the embedded pane (list them;
  do not fix them here).

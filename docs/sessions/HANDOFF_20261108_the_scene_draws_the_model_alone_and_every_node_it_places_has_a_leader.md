---
priority: code-red
depends_on: [the_end_stop_model_names_its_datums_right_and_folds_its_riders]
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader: on model v2 the 3D pane draws the model's parts and nothing else, and every node the scene can place gets a dim leader from its DAG dot, with or without a study

Source: Jeff's live walk of the merged M1 page, strategy session 2026-11-08
evening, with the strategy session's own measurements (below). Demo tomorrow
afternoon (2026-11-09). Baseline: `integration` after
`the_end_stop_model_names_its_datums_right_and_folds_its_riders` merges —
merge `integration` before you measure; it should by then also carry
`the_bindings_projection_folds_the_events_jeff_accepted` (the bindings
projection the page reads is the 2026-11-05 one, proposals only, and could
not be rebuilt until that handoff; after it merges rebuild
`build_feature_identity_projection.py` by hand — `rebuild_projections.ps1`
does not run it, per the M1 lesson). Scope: `apps/annotate/`,
`apps/viewer/topology_app.js` **seam functions only** (`drawSeamLeaders`,
`seamAnchors`, the `annotate:anchors` listener), `apps/viewer/topology.js`
`VA.seamDots` / `VA.seamLeaderGeometry` / `VA.seamLeaderStates`, the
`.seam*` rules in `apps/viewer/topology.css` (~892–904) and nothing else in
that file, `docs/ANNOTATION_SURFACE.md`, tests. Do NOT touch
`apps/viewer/views/topology.js`, the toolbar/View/density code, the rails
renderer or the grid (sibling
`the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows` owns
them and runs beside you), the topology files or the builders.

## What the merged page does today (measured 2026-11-08 19:30 PST)

- **Strays.** With v2 open and the 3D pane up, the pane's IN THIS MODEL tree
  lists the hub and **"Other parts (48)"**, and the scene draws them: Jeff
  sees *"a couple of extra blades, one superimposed on the same one that is
  animated, the other is on the opposite side of the hub, also looks like all
  5 pitch links still in there."* The M1 lesson's draw counts (1 each for the
  model's parts) are true and beside the point — the context parts are what
  he sees. In sweep mode the pane says "20 of 20 parts placed" and the context
  is still drawn.
- **Leaders DAG → 3D: none.** `.seam__leader` count is **0** on v2 in every
  state tried: pane open at rest, a grid row selected, the P2 sweep loaded
  and playing (`KIN 3D COUNTS {"seamLeaders":0,"ends":0}`). Jeff: *"The
  leaders going from 2d to 3d dag are completely missing … I said to make
  leaders dimmer, not delete them entirely."* Two causes, both to confirm:
  (a) `VA.seamDots` returns nothing without a lit set (`if (!lit …) return
  out`), and v2 is studyless so nothing lights — the 10-27 rule "only the lit
  set gets one" was written for v1's 40-part graph; (b) anchors come from the
  pane's `annotate:anchors` message, which the pane posts for nodes it has
  placed from bindings, and the bindings projection on the page is stale
  (above) — yet the sweep skeleton already draws every joint node as a white
  dot, so positions for those ten nodes exist without any binding.

## Deliverables

1. **A model with declared occurrences is drawn alone.** On a topology whose
   parts carry `occurrence` (v2), the scene draws the model's parts, each at
   its declared occurrence, and no context: "Other parts" is unticked and
   folded by default (still listed, so Jeff can add context by hand), in and
   out of sweep mode. v1 keeps the every-occurrence rule and its context.
   DoD by eye: one blade, one pitch arm, one pitch link, one tangential link,
   hub, both mounts, plate, piston, both heads, cover — fifteen parts, nothing
   else, at rest and mid-sweep. `ANNOTATION_SURFACE.md` "Where a part is
   drawn" gets the sentence.
2. **No study means everything the scene places is lit, for leaders.** With no
   study open, the seam's lit set is every node the scene has an anchor for;
   with a study, the study's lit set as today. Jeff's 10-26 worry ("if every
   single element in the model were connected it would probably be way too
   busy") was about v1's ~100 nodes; v2 has ~25 and he asked for these
   leaders by name today. Leaders are drawn in `--leader-ink` (dim), hot and
   selected as today.
3. **A node the skeleton places is an anchor.** The pane posts an anchor for
   every node it draws a position for — a fitted binding **or** the sweep
   skeleton's joint point for that node id (`geometry.features[]` names ten
   v2 nodes by id) — so a leader does not depend on a binding existing. A node
   with neither stays unanchored and unled, and the lesson lists which.
4. **Diagnose, then fix the cause you measured.** Before changing anything,
   reproduce the zero (`.seam__leader` count with the pane open on v2 and the
   sweep loaded) and record in the lesson which of (a)/(b) was true, by
   evidence (`VA.lastSeamDraw.skipped` says `noAnchor` vs nothing drawn at
   all). Then fix. Do not add a third mechanism.
5. **Click around before you call it done** (CLAUDE.md, 2026-11-03): open v2,
   open the pane, play the sweep, scrub, select rows, hover nodes, switch to
   v1 and back; look at the shots; write down what you saw that this handoff
   did not ask about. The pane header's "folder needed" badge and the "747
   likely faces … on one axis, 0.000 mm apart ×3" lines that show on a
   selected row are seen; **note them, do not fix them here**.

## Definition of done

- Projections rebuilt in the main checkout (`scripts/rebuild_projections.ps1`
  **plus** `build_feature_identity_projection.py`), the merged `integration`
  tree served at `http://127.0.0.1:8000/tolstack/viewer/topology.html?topology=vpa_end_stop_v2`.
  Screenshots, **looked at by you**: the pane on v2 at rest (fifteen parts,
  no strays, framed on the mechanism), mid-sweep, and at the +72° stop; the
  page with the pane open showing the leaders from the DAG dots to the scene
  (count in the lesson; every skeleton joint node has one); a row selected
  with its leader in the accent; v1 with the pane open, as before.
- A browser check: on v2 with the pane open and the P2 sweep loaded,
  `.seam__leader` count ≥ the number of skeleton joint nodes the scene drew;
  and the scene's drawn-part count on v2 at rest equals v2's part count.
  Both enrolled with witness specs.
- Fast tier, `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs` green in the main checkout;
  `--changed-since integration` witnesses pass.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md`):
  the shots with one line each; the (a)/(b) diagnosis with evidence; which
  nodes are anchored by binding, which by the skeleton, which by neither;
  what the click-around found.

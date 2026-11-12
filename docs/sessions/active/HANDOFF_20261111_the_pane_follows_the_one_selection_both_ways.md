---
priority: med
depends_on: [the_topology_real_loop_runs_on_one_origin]   # both edit scripts/run_viewer_browser_tests.mjs's topology suites (that one moves the per-study [real] loop between origins; this one adds selection checks to them), so it lands first and this session runs on the shorter tier
model: opus
hitl: false
---

# HANDOFF 2026-11-11 — the_pane_follows_the_one_selection_both_ways: F1b's residue -- the pane can let go, a click lights instead of re-driving, Escape lets go, and the pane keeps one selection of its own

Source: the 2026-11-11 triage sweep
(`dispatch/docs/sessions/lessons/LESSONS_20261111_triage_sweep.md`). This is
**F1b's own fix-up, not a new refinement**: every item is a defect the F1b
handoff (`docs/sessions/completed/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md`)
or its review (`docs/sessions/reviews/REVIEW_20261112_one_selection_one_hover_and_leaders_off.md`)
measured in its own merged work and filed rather than fixed. F1b's stated
goal was "no second copy of what is selected on either side that can
disagree"; its lesson (`LESSONS_20261110_one_selection_one_hover_and_leaders_off.md`,
"What the pane still keeps of its own, honestly") names the copies that remain.
Issues cleared here:
`ISSUE_20261112_the_page_re_asserts_its_end_row_into_the_pane_so_a_pane_side_deselect_is_swallowed.md` (med),
`ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md` (med; the 2026-11-11 re-filing of it is closed into it),
`ISSUE_20261112_escape_does_not_let_go_of_the_selection_while_any_mirrored_control_reads_pressed.md`,
`ISSUE_20261111_the_pane_keeps_two_selections_of_its_own_beside_the_pages_one.md`,
`ISSUE_20261111_the_panes_hidden_rail_still_wears_a_pick_button_on_contributor_rows.md`.

Baseline: `master` with F1b merged (`1ecada27` or later) and
`the_topology_real_loop_runs_on_one_origin` merged. Scope:
`apps/viewer/topology_app.js`, `apps/viewer/viewer.js` (`VA.annotateParamsFor`
only), `apps/viewer/views/nav.js` (`VA.sceneRowsPressed` only),
`apps/annotate/app.js`, their fast-tier tests, the browser suites in
`scripts/run_viewer_browser_tests.mjs` that read these behaviours, and their
witness specs. Do NOT touch: the left column's layout or the page's fixed
layout (that is F1c, the next step on the strategy thread's tolstack chain,
not yet staged), `VA.renderSceneTree`/`sceneLegend` (deferred
`ISSUE_20261111_renderscenetree_...`), the empty body of a feature the newest
sweep does not carry (deferred `ISSUE_20261111_a_feature_the_newest_sweep_...`),
or any projection input (`docs/topologies/`, `docs/tolerance_stacks/`, the
builders). **This handoff changes no projection input**, so the
worktree-rebuild gap (`ISSUE_20261110_rebuild_projections_cannot_run_from_a_worktree_...`)
does not bite it: shots are taken against the main checkout's existing
projection on a viewer served from your worktree.

## Deliverables

1. **The page posts its end-row `activate` once per selected node until the
   pane answers.** `syncSceneInspect` (`apps/viewer/topology_app.js:2180`)
   runs inside `applyFocus`, i.e. on every hover change and after every paint,
   and posts a rail `activate` whenever the last tree the page received shows
   no selected end row. `sceneInspectPosted` is set at `:2193` and never read
   in that branch. Measured 2026-11-12 (review probe, end-stop v2 with the P2
   sweep, the hub's `spindle bore axis`): a feature row click then a pointer
   sweep over twelve DAG marks posted `activate` **twice**; the pane's row
   click is a toggle, so the second deselected and a third re-selected --
   three rail rebuilds for one click. Dedupe it: a pending flag cleared on the
   next `annotate:tree`, or gate the branch on `sceneInspectPosted !==
   feature.node` the way the folded-joint branch below it (`:2202`) already
   does.
2. **A pane-side deselect lets go of the page's selection.** Same probe: an
   `inspect clear` in the pane (a second click on the bead or the bound face
   in sweep mode) was answered by one `activate` and re-selected within the
   debounce -- the pane can set the one selection but never clear it.
   `followScenePick` (`:2591`) reads "no selected row where the page's
   selected feature had one" as nothing. **The call, made here:** under one
   selection, that is the pane letting go -- call `unfreeze()` on the page
   (the one way to let go, per F1b's writer table), and do not re-assert.
   Distinguish it from "the tree has not caught up yet" (item 1's pending
   flag is exactly that distinction). Rejected alternative: the page's
   selection always wins and the pane's deselect is ignored -- that keeps a
   second, pane-side answer the page overrides, which is the copy F1b set out
   to remove. A wrong call here costs one review round.
3. **An edge selected on a topology page with a sweep loaded lights the
   edge in the sweep; it does not re-drive the pane into bind mode.**
   `VA.annotateParamsFor` (`apps/viewer/viewer.js:274`, via
   `followSelection`) maps a topology-page edge selection to `goto <topology>
   <edge>`, and the pane's `cmdGoto` leaves sweep mode first: the pose
   resets, the sweep bar goes, every leader across the seam goes
   (`.seam__leader` 21 -> 0; shot
   `docs/sessions/lessons/shots/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader/6_v2_row_selected.png`,
   and F1b's `f3_grid_row_selected_3840.png`). A kinematic page already keeps
   the sweep and posts `highlight <topology> <edge>`. **The call, made
   here:** wherever the pane reports a loaded run (`paneRun`) on the page's
   own topology -- whichever way it was loaded: the pane's run picker,
   `sweep latest`, or the Studies row -- a selected edge posts `highlight`,
   as the kinematic page does; with no run loaded, behaviour is unchanged.
   Entering bind mode stays the row's own 3D control or the Preview's
   "attach to 3D", never a plain click. A node click is unchanged (it posts
   `model select`, no goto). Rejected alternatives (from the 11-08 issue):
   a studyless model page launching the pane in sweep mode on its newest run
   (changes what a page opens to -- F1c's territory), and bind mode turning
   the model layer on so leaders survive the jump (they would point at
   as-modelled positions).
4. **Escape asks the pane whether a pick is armed, not whether anything is
   pressed.** The page's Escape (`topology_app.js:456`) and the arm-off post
   (`:1971`) both test `VA.sceneRowsPressed(sceneTree.rows)`
   (`apps/viewer/views/nav.js:838`), which is true for any pressed control --
   a part row's **Isolate** (pressed whenever the sweep has isolated parts,
   which it does on load) and the type chips (pressed by default). Measured
   2026-11-12: sweep loaded, nothing armed, a feature selected; Escape posted
   `arm off` and the selection stayed. Have the pane say it on the tree
   message (`armed: true`, or the armed row's state line,
   `AA.ARMED_PICK_WORDS`) and test that; `sceneRowsPressed` then either goes
   or narrows to the one control that means "Escape cancels me". Say which in
   the lesson.
5. **The pane keeps one selection of its own, not two.** The pane holds
   `state.sweep.inspect` (the rail's selected end row; written by a bead/face
   click in sweep mode, a mirrored `activate`, `inspect feature`/`inspect
   clear` -- `cmdInspect`, `apps/annotate/app.js:3965`;
   `isSelectedFeature`, `:3502`) and `state.model.selected` (the model
   layer's selected dot; `model select node|body|clear`, an anchor click --
   `cmdModel`, `:4601`). The page drives both (`syncSceneInspect`,
   `syncSceneModel` at `topology_app.js:2489`) and reads both back. Make them
   one pane-side selection that the sweep rail and the model layer both read,
   and have the page post one verb for it. **Suggested shape, investigate
   before committing:** `{node, end?}` -- a node, plus which end when the
   rail's row is an end -- since a model-layer dot is a node and a rail row
   is a node's end; an edge selection (item 3) is a highlight, not a pane
   selection. If the unification turns out to need a message-protocol change
   the fast tiers cannot pin, stop at items 1-4 and 6, and write the
   measured reason in the lesson; the issue then stays open with that
   evidence rather than half-done.
6. **The contributor row's Pick button goes.** F1b kept one pick action (the
   last row of each end's list, `endPickAction`, `app.js:3332`) and removed
   the hover Pick/Re-pick everywhere except a **contributor** row
   (`tree-row__repick`, around `app.js:3752`), which no human sees: the pane's
   own rail is unseen while embedded, the bare annotator URL redirects, and a
   contributor row never appears under a feature in the nav. Retire it, with
   the two browser checks that read it
   (`scripts/run_viewer_browser_tests.mjs:10366` `[real] re-pick on a bound
   feature leaves sweep mode...` and `:10569` `[real] every contributor row
   carries the Pick control a feature row does`) and their witness specs --
   or, if `:10366` guards a behaviour that survives through `endPickAction`,
   re-anchor it there. List each retired and re-anchored spec.

Every item's fact reaches: the four surfaces (tree, 3D, DAG, grid) on a
topology page **and** a kinematic page; a page with the pane closed (no tree
ever arrives -- items 1, 2 and 4 must do nothing there); and a page with the
pane open but no run loaded (item 3 unchanged).

## Definition of done

- On the end-stop model v2, viewer served from your worktree against the main
  checkout's projection, pane open with the P2 sweep loaded from the Studies
  row: (a) a feature row clicked, pointer swept over a dozen DAG marks --
  exactly one `activate` posted (count it from the page's posted messages);
  (b) a second click on the bead in the pane lets go on all four surfaces;
  (c) a grid row (`tan_link_mount_height`) clicked -- the sweep stays, the
  edge is highlighted, leaders stay drawn when on; (d) Escape with nothing
  armed lets go of the selection; with a pick armed it cancels the pick
  only. Shots of (b) and (c) at 3840x2160, before and after. **Look at every
  shot yourself with vision before writing the lesson**, and once more after
  your branch is rebased on `integration`, and say so in one line.
- The same (a)-(d) on the kinematic page, one line each, no shots needed.
- Tests: new fast-tier coverage for the dedupe, the deselect-unfreeze, the
  `highlight`-not-`goto` mapping and the armed test; browser checks for (a)-(d)
  in the suites that already drive the pane (`3D pane follows the selection`,
  `annotate sweep rail`, the topology suites). This session runs, per
  `CLAUDE.md`'s tactical-session row: the default pytest tier once; the two
  fast node tiers; the browser runner `--only` per suite added or changed; the
  witness runner `--only` per spec added, re-anchored or retired. **Not** the
  whole browser tier or the `--changed-since` gate (the review's). The 3D pane
  suite flakes under the witness runner
  (`ISSUE_20261109_the_3d_pane_follows_the_selection_suite_fails_a_different_set_of_sub_checks_each_run.md`):
  a first-attempt red there is retried once before it is read as real.
- Lesson (`docs/sessions/lessons/LESSONS_20261111_the_pane_follows_the_one_selection_both_ways.md`):
  F1b's writer table, updated -- every writer of selection that remains on
  the page and in the pane, and why; whether item 5 landed or why it
  stopped; which of `sceneRowsPressed`'s callers remain; witness specs added,
  re-anchored, retired; suite seconds per tier.

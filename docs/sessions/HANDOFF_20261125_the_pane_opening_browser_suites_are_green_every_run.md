---
priority: med
depends_on: []
model: opus   # ambiguous root-causing: four suites go red or green on the same tree depending on the run, and the diagnosis is the work
hitl: false
---

# HANDOFF 2026-11-25 — the_pane_opening_browser_suites_are_green_every_run: the suites that open the 3D pane from the kinematic page pass on every run, and say why when they do not

Source: triage sweep 2026-11-25. Five open issues, one failure shape: a browser
suite that opens the embedded 3D pane (the annotator) from
`topology.html?kinematic=…` or waits on its first messages is red on some runs
and green on others, on the same tree:

- `docs/issues/ISSUE_20261124_the_scene_pane_over_http_suite_is_red_on_integration.md` (med)
- `docs/issues/ISSUE_20261123_the_scene_suite_gets_no_anchors_message_once_v2_takes_ten_values.md` (med)
- `docs/issues/ISSUE_20261109_the_3d_pane_follows_the_selection_suite_fails_a_different_set_of_sub_checks_each_run.md` (med)
- `docs/issues/ISSUE_20261109_the_nav_stays_beside_the_open_pane_witness_has_decayed_on_trunk.md` (med)
- `docs/issues/ISSUE_20261123_the_map_suite_stopped_on_a_nav_feature_row_click_once_and_passed_on_rerun.md` (low)

Baseline: trunk (`master`) as of 2026-11-25, which includes
`right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`
and `the_walk_binds_through_the_form_on_the_merged_page`.

Scope: `scripts/run_viewer_browser_tests.mjs` (the five suites named below and
their shared helpers), the pane's boot and message path where a cause is found
there (`apps/annotate/app.js` — `postModelAnchors`, the embed boot;
`apps/viewer/topology_app.js` — the pane handle and its arming),
`scripts/mutation_witnesses/` for the specs of these suites. Do NOT touch: the
`testContextMenus` suite, `installRealAnnotatorReads` and
`apps/annotate/run_browser_check.mjs` (the sibling handoff
`the_real_browser_checks_hold_their_premise_by_construction` owns them, and
waits on this one); the feature form, the row menus' write paths and
`apps/annotate/binding_state.js` (handoff
`a_write_from_the_form_or_the_menu_never_vanishes_without_a_word`).

## Deliverables

1. **Instrument before fixing.** Every `until(…)` wait in the suites below that
   lapses prints what it waited for and what it saw at the moment it lapsed:
   the pane iframe's presence and `contentWindow`, whether the pane handle was
   armed, the pane's mode, `__lastInspect`, `__lastAnchors`, the head line, and
   the pane console's last lines. Today a lapse prints only the check's name,
   so no run so far has caught the cause (ISSUE_20261109_the_3d_pane_follows…:
   "log the wait that lapsed … Do not just raise the timeouts").
2. **"the scene pane reads over HTTP" goes green every run.** Measured
   2026-11-24: two `--only` runs on integration `48042976` and on the handoff
   branch ABORTED after 7 sub-checks, 5 failed, starting at "[real] the handle
   opens the pane and hides itself while it is open…" (the handle click on
   `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops` under
   `startDrawingCheckerMountServer`), then `ERROR: Cannot read properties of
   null (reading 'width')` from a `boundingBox()` of an absent element. The
   review's whole tier on `03799c96` (`--repo
   C:/workspace/tolstack/data/scratch/rc1124`) ran it **10/10**. So run it
   `--only` several times first; find why the handle sometimes does not arm or
   the pane does not boot, and fix that cause. A `boundingBox()` that can
   return null is checked and reported by name, not dereferenced.
3. **"annotate model in the scene (anchors, lines, the sweep, the anchors
   message)" gets its anchors message on v2.** Measured 2026-11-23: on
   integration `5be884d5` and on `bd7b2395` it stopped after 9 checks with
   `TypeError: Cannot read properties of undefined (reading 'nodes') at inPane
   (scripts/run_viewer_browser_tests.mjs:6624)` — `w.__lastAnchors` never set,
   so `postModelAnchors` (`apps/annotate/app.js`) never passed its guards
   (`model.built`, `state.scene.modelScreenPoints()`). Green 22/22 on
   `76447229` and on the main checkout at the time; the red arrived with
   `73ef0aee` (v2's ten valued edges). Lead: an anchor, line or lit-set step
   throws or returns null for a valued v2 edge. Re-measure on trunk first —
   it may be green now; if it is, say so and still replace the bare
   `inPane(...).nodes` read with one that names what was missing.
4. **"3D pane follows the selection" fails the same set on every run, i.e.
   none.** On 2026-11-09 three runs of one tree failed three different sets
   (the chain-study sub-checks; one `[real]` nav click; an abort after "the
   seam's handle opens the pane, booted on the study's run"). On 2026-11-24 the
   witness runner's shadow tree saw the same first symptom once (abort on
   `contentWindow` of null), then 30/30. Deliverable 2's cause is the likely
   cause here too; confirm with deliverable 1's output.
5. **The witness spec
   `scripts/mutation_witnesses/browser__real-the-nav-stays-beside-the-open-pane-it-is-what-drive__25decf2b.json`
   reddens its own check again, or is retired with a reason.** It hides
   `#navtree` while the pane is open; its check is `page.locator("#navtree").isVisible()`.
   It was NOT WITNESSED on 2026-11-09 both on a branch and on trunk `3d04f5cd`:
   the nav-driven steps before the check fail first. Measure the nav's
   visibility right after the pane opens, before any step drives the pane
   through the nav, so the mutation reddens the named check.
6. **"the map (the counts…)" nav feature-row click.** At `1d1d0d09` it ran 0/1
   after 12 checks in 50.8 s, on a Playwright click of
   `data-nav-id="hub@hub_spindle_bore_axis"` that reached "performing click
   action"; the rerun was 32/32. Likely the tree rebuilt under the click while
   the pane was opening (see
   `docs/issues/ISSUE_20261123_a_tree_rebuild_between_a_press_and_its_release_drops_the_click.md`,
   owned by the sibling handoff — do not fix the app side here). The suite
   clicks only once the tree is quiet, the way "the tree holds still" already
   waits, and a lapse names the row it could not click.

Do not raise a timeout as a fix. If a wait genuinely needs longer under load,
say so with the measured boot time in the lesson.

## Definition of done

- Each of the four suites above passes **five consecutive `--only` runs** on
  the main checkout's projections (`node scripts/run_viewer_browser_tests.mjs
  --repo C:/workspace/tolstack --only "<suite>"`), and the scene-pane-over-HTTP
  suite also passes from a `git archive` export of the branch with a
  `node_modules` junction (the integration shape). Record every run's result
  and time in the lesson.
- The whole browser tier is green once on the branch.
- `node scripts/run_mutation_witness_tests.mjs` witnesses the
  nav-stays spec, or the spec is deleted and the census pins follow.
- Each covered issue is set `status: resolved` with the commit that fixed it.
- Lesson (`docs/sessions/lessons/LESSONS_20261125_the_pane_opening_browser_suites_are_green_every_run.md`):
  the cause found (or causes, one per suite), the lapse output that showed it,
  and whether a slow boot under load or a lost message was the reading.

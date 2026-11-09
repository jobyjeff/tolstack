# LESSONS 2026-11-09 — the_integration_walk_reads_the_merged_page_against_jeffs_sentences

This was a walk, not a gate. No code or tests changed. Shots are in
`docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/`.
They are reproducible with `node tests/debug_integration_walk_20261108.mjs --phase walk|pane3d|demo|demo8000|models`
(a hand-run probe; pytest never collects it).

## What was served

- **Tree:** `integration` at `4abddff3`, with all three `depends_on` handoffs in
  `completed/`. The worktree branch was already at that tip, so the merge was a
  no-op.
- **Projections:** rebuilt from this tree into the main checkout's `data/`. I ran
  each builder from the worktree with `--data-root C:/workspace/tolstack/data`, in
  `rebuild_projections.ps1`'s order, then `build_feature_identity_projection.py`.
  `scripts/rebuild_projections.ps1` was not usable for this: it runs the *main
  checkout's* scripts (master's), not the merged tree's.
- **Data source strip:** `topologies ← handoff/the_integration_walk_reads_the_merged_page_against_jeffs_sentences @ 4abddff37c64`,
  and the same for crops. Built 2026-11-09T17:17:45Z.
- **The page shot was not the one on 8000.** drawing-checker's mount at
  `127.0.0.1:8000/tolstack/viewer/` serves the main checkout's `apps/`, which is
  master `5d6edb5c`. Its `topology.js` is byte-identical to master's. So "the merged
  page" exists only where somebody serves integration's tree. The probe does that,
  the way `debug_nested_bodies_shots.mjs` does: this tree's `apps/`, plus the main
  checkout's `data/`, on a private port.
- **8000 is the demo risk.** I ran the five demo clicks on 8000 as well
  (`demo_8000_*.png`). Master's page shows the zebra bands, the bleached grey and
  teal containers, Colour by None, and **0 leaders** while the sweep plays. That is
  Jeff's 11-08 walk all over again. Filed:
  `ISSUE_20261109_the_demo_port_8000_serves_master_so_none_of_the_11_08_fixes_show.md`
  (`needs: jeff`). Batch-merge before the demo.
- **8000 now mixes trees.** Because of the rebuild above, 8000 is currently master's
  code over projections built from integration. That is a consequence of the
  handoff's step 1, and the next batch merge resolves it.

## Table 1 — Jeff's fifteen sentences

The widths are 1600 and 2560; each shot exists as `_1600` and `_2560`. The numbers
come from the probe's own `getComputedStyle` and DOM counts, printed beside each shot.

| # | sentence | shot | now false? | what the shot shows |
| --- | --- | --- | --- | --- |
| S1 | extra blades, all 5 pitch links | `s01_pane_at_rest`, `s01_mid_sweep`, `s01_scene_framed_mid_sweep` | yes | The scene draws one occurrence each of the blade (216332), the pitch arm and the pitch link, at rest, with the sweep loaded and mid-sweep. The framed shot shows one blade. |
| S2 | 2D→3D leaders missing | `s02_sweep_loaded` | partly | 18 leaders with the sweep loaded (17 at 1920). 2 hub nodes have no anchor and 5 are off the DAG's visible area. There are **0** before a sweep is loaded and 0 after a row click. All three are already filed (below). |
| S3 | zebra stripes between leaders | `s03_between_leaders` | yes | `.rail__band` count is 0. The leader strip is plain background. |
| S4 | colours bleached | `s04_default`, `s04_colourblind` | yes | Saturated body inks: blue, green, orange, violet, cyan. The colour-blind palette swaps to amber, sky and green, also saturated. |
| S5 | compact just zooms uniformly | `s05_comfortable`, `s05_compact` | yes | Row height 26 → 18. Column pitch is 20 → 20 and dot radius 7 → 7, at both widths. Only the rows get shorter. |
| S6 | hiding parts hides only some | `s06_parts_off`, `s06_bodies_off`, `s06_both_off` | yes | Parts off: part fields, blocks, part names and part braces are all 0. Bodies off: body fields, names and braces are all 0. Both off: everything is 0. DAG and grid agree. |
| S7 | grid brackets unlabelled, parts unbracketed | `s07_grid_gutter` | yes | 5 body labels in the gutter and 36 part brace segments (18 part labels). The part number prints twice per row, which is already filed. |
| S8 | only one layer of brackets | `s08_tan_link_dag_and_grid`, `s08_s14_pitch_link_dag_and_grid` | yes | The tan link and the pitch link are each a body container holding a part container, in the DAG and as grid braces. |
| S9 | line weights very thin | `s09_line_weights` | partly | Containers went 1 → 1.5 / 1.25px. Rails are still 2px and both kinds of leader are still 1.5px, the thinnest marks on the page. **Filed.** |
| S10 | base order; piston cover in its own body | `s04_default`, `s10_s13_nav_bodies_in_sweep` | partly | 2D: the base body holds hub, tan-link mount, gas-spring mount and piston cover, in that order. 3D pane Bodies list: `base · 3 parts`, with **no piston cover**. **Filed.** |
| S11 | hub says "spindle" | `s11_hub_rows` | yes | No "spindle" anywhere in the pane's text or titles. The hub rows read "locating-boss axis to …". |
| S12 | tan-link mount one line | `s12_tan_link_mount_rows` | yes | Seat (base face → attachment bore), radial (pilot → attachment bore), clocking (fastener pattern → attachment bore), and the pilot clearance from the hub boss. |
| S13 | piston heads outside the body; sequence | `s13_piston_heads`, `s10_s13_nav_bodies_in_sweep` | partly | 2D: plate, piston, lower head, upper head, all inside the pitch-plate body. 3D Bodies list: `pitch plate · 2 parts`, with **no heads**. **Filed** together with S10. |
| S14 | pitch link as a rigid body | `s08_s14_pitch_link_dag_and_grid` | yes | A "pitch link" body container with "Pitch link 213862-002" inside it, in the DAG and the grid. |
| S15 | leaders dimmer, not deleted | `s15_row_selected`, `s15_pane_node_selected` | yes | All 25 grid leaders are drawn at rest in `rgb(51,56,68)`, against rails of `rgb(89,96,111)` / `rgb(123,132,148)`. On selection the others dim to 0.28 and the lit one goes to the accent at 3px. Seam leaders behave the same way (accent at 2px). |

Already filed, so I filed nothing new for S2 or S7:
`ISSUE_20261109_two_of_the_end_stop_models_joint_nodes_have_no_leader_in_the_sweep.md`,
`ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_against_integration_built_projections.md`,
`ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`,
`ISSUE_20261108_the_grid_prints_a_parts_number_twice_and_its_label_gutter_costs_152px.md`.
The pane's at-rest close-up (S1 shot) is
`ISSUE_20261109_design_the_end_stop_model_at_rest_frames_a_close_up_in_a_tall_pane.md`.

## Table 2 — the demo walkthrough (1920×1200, the merged tree)

| click | shot | what the audience sees | projector problem |
| --- | --- | --- | --- |
| 1 open v2 | `demo_1_open_v2.png` | Five coloured bodies with their parts nested, and the grid beside them. No banner beyond the folded Data source. | The console logs one 404 on load. **Filed** (`…logs_a_404_for_a_topologies_projection…`). |
| 2 Colour by Body | `demo_2_colour_by_body.png` | No change: Body is already the default. | none |
| 3 open the 3D pane | `demo_3_pane_open.png` | The pane opens in binding mode on a translucent close-up of the hub. | An amber "folder needed" chip (**filed**). The grid is pushed off to a strip of body names (**filed**). The close-up is already filed. |
| 4 play the sweep | `demo_4_sweep_playing.png` | The linkage moves. 17 leaders from the DAG into the scene, with the readout values on the bar. | The chip is still there and the grid is still unreadable. The heads standing still is already filed as code-red. The Bodies list contradicts the DAG (**filed**, S10/S13). |
| 5 select the tan-link length row | `demo_5_tan_link_length_selected.png` | The pane drops out of the sweep into binding, and every leader goes (0). The Preview shows the row. | Leaving the sweep is already filed. The Preview prints raw backticks around `closes` and negation prose (**filed**). |

How the demo was driven: clicks 3 and 4 used the probe's command-layer verbs
(`sweep latest`, `play`), as the earlier shot scripts do, rather than the pane's
run picker. Click 5's row click was a Playwright click, which scrolls the pane's
horizontal scroller to the row. That scrolling is why the DAG is out of frame in
`demo_5`, and a person clicking a row that is already visible would not see it.

## Switching to v1 and back

`m1_v2_1600.png` → `m2_v1_1600.png` → `m3_back_to_v2_1600.png`.

v1 is the 11-08 shot
(`…model_v2_is_the_end_stop…/3_v1_dag_1600_after.png`) with the intended changes
only:
- no stale-data banner (the projections are fresh);
- no zebra bands;
- body and part containers in body inks, with part labels;
- the same walk layout.

Back on v2, the counts are identical to a fresh load (5 body fields, 3 part fields,
9 blocks, 23 brace labels). The overprinted chain-study names in v1 are already
filed (`ISSUE_20261108_v1_chain_study_names_overprint_each_other_on_the_dag.md`).

## Gotchas for the next walk

- The 8000 mount is master. Serve the tree you mean to judge.
- `scrollIntoView` on a grid row also scrolls the pane's horizontal scroller and
  pushes the DAG out of the shot. The probe scrolls the window only.
- The pane is too narrow for `camera reset` to frame a readable mechanism at 1600
  (`s01_scene_framed_*`). For S1, the drawn-occurrence counts were the evidence and
  the shot only confirmed them.
- tolstack's venv has no pytest-xdist, so the canonical `-n 16 --dist loadfile`
  spelling exits 4. I used CLAUDE.md's bare `pytest -q`.

## Suite record

I recorded the suite and fixed nothing, as the handoff asked. The tree is
`integration` `4abddff3` plus this branch's docs and its debug probe.

- **Default tier.** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`,
  run in the **worktree**, took 418 s (inside budget, recorded with
  `dispatch suite-time`). Result: **1 failed, 1890 passed, 1 skipped, 2 deselected**.
  The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.
  It is the deliberate worktree red: its node-fs `[real]` tier has no projection
  under this worktree's `data/`.
- **That tier against the main checkout's data.**
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (23 s): **671/671
  passed**, including the `[real]` checks. The data was the projections rebuilt
  from this tree.
- **Not run:**
  - the browser TRUTH tier (`scripts/run_viewer_browser_tests.mjs`);
  - `apps/annotate/run_tests.cjs`;
  - the mutation-witness `--changed-since` run.

  This branch changes no code and adds no guard or spec, so no witness can select
  it. The browser tier is the merge's job. Its open red on integration is already
  filed
  (`ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_against_integration_built_projections.md`).

**Fifteen sentences: 11 now false, 4 partly (S2, S9, S10, S13), 0 still wholly
true. 7 issues filed: 2 for the sentences (S9; S10 and S13 together) and 5 for
the demo path (folder chip, grid at 1920, preview copy, console 404, port 8000
serving master).**

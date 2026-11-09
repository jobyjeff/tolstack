---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# Review — the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader

Branch `handoff/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
(6 commits, `1c36bb5b`..`8ac7ed5a`) was cut from the current `integration`
tip, so `git merge` into `review/<slug>` was a **fast-forward**. The pre- and
post-merge trees are the same tree. Containment check before merging: not
already in `integration`. First review of this slug (no prior report on the
branch).

## What the work does, checked against the handoff

| deliverable | verdict | evidence |
|---|---|---|
| 1. A model with declared occurrences is drawn alone | **met** at rest and in sweep, by measurement. Pinned at rest only (S1). | `AA.modelAloneShas`/`AA.modelAloneHides` (`apps/annotate/sweep.js`) applied at the scope, the context list, `cmdSweep`, `anchorSweepBodies`, `applySweepFrame` and `subjectOccurrences` in `app.js`. I ran the browser tier: `at rest: 15 meshes drawn for 15 parts`, and with P2 loaded `15 meshes drawn`. v1 declares no occurrence, so `alone` is `null` and every v1 path is the old expression (read site by site). `ANNOTATION_SURFACE.md` "Where a part is drawn" has the sentence. |
| 2. No study: everything placed is lit, for leaders | **met** | `VA.seamDots`: with `lit` null, ids = every drawn node mark plus folded nodes. With a study, the filtered lit set as before. Fast test rewritten (`tests.js`, "…with no study every drawn node does"). Browser: `P2 with no study: 20 leaders`. |
| 3. A node the skeleton places is an anchor | **deviated, with a measurement**, and the deviation is pinned | Extending the `joint` source to every feature end was reverted, because an axis joint's `point_a/b` is a reference point on the axis and the hinge's is the assembly origin. The existing `[real] no unplaced node is drawn … none at the assembly origin` check went red on it, so putting the handoff's literal version back is red. Two of the run's 9 feature nodes stay unled (S2). I re-counted the 9 from the run file; the handoff said ten. |
| 4. Diagnose (a)/(b) first | **met** | The lesson's table: `lastSeamDraw.skipped` all empty with 22 anchors in hand, so cause (a). The fix is in the one function cause (a) names. No third mechanism. |
| 5. Click around | **met** | Nine shots, each looked at by me for 1, 3, 5 and 7. Found: the grid-row re-drive (filed `audience: strategy`), half-ticked body checkboxes (fixed), tight framing (noted; filed by me as design, below). |

**Fences.** Scope said `topology.js` `VA.seamDots` only. The diff there touches
only `VA.seamDots` and its comment, nothing in `views/topology.js`,
`topology_app.js` or `topology.css`, and nothing in the topology files or the
builders. `scripts/guard_enumeration.mjs` changes pins only (the "handoff fence
the DoD forces" entry).

**DoD items not literally met, each argued in the lesson and accepted here:**

- *Projections rebuilt in the main checkout.* Not done, deliberately. The main
  checkout is on `master`, whose v2 (23 nodes) predates `integration`'s (25), so
  a rebuild there would publish the older model. The batch merge's rebuild is
  the right one. This is correct, not a shortcut.
- *A row selected with its leader in the accent.* A grid-row click re-drives
  the pane with `goto`, which leaves the sweep. That code sits outside the
  fence. Shown with a DAG node instead (shot 5), and filed as
  `ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`.
  For the demo, Jeff should **select from the DAG, not the grid**, on v2.
- *`.seam__leader` ≥ every skeleton joint node.* The check counts the
  solver-point (`joint`) nodes, 4 of 4 led. With the skeleton-point anchor
  reverted, that is the honest version (S2).

## Tolerance-stack mandatory checks

No stack, topology or `tolerance_stack/` file is in the diff (`git diff
--name-only integration...HEAD -- docs/tolerance_stacks docs/topologies
tolerance_stack` is empty), so checks 1–6 have nothing to apply to.
Check 7, computed by me with `tests/debug_report_tolerance_stacks.py
--ratio`: **5 traced / 12 inferred / 9 untraced, out of 26 element
instances** (the three seeded stacks), unchanged.

## Tests

| when | what | result |
|---|---|---|
| tactical record | full pytest (worktree), viewer/annotate JS, full browser tier, witnesses | Recorded with commands and counts. `1 failed, 1890 passed` (the documented worktree `test_viewer_js_suite`), 549/549, 304/304, browser 42/44 (two reds baselined or filed), witnesses 14/16 + 2 to the sweep. Consistent with the diff (the new suite is counted in 44). Benefit of the doubt given. |
| pre-merge risky subset (`apps/annotate/`, `apps/viewer/`, guard/witness, prose rows) | `pytest -q tests/test_mutation_witnesses.py tests/test_js_vocabulary_is_generated.py tests/test_js_python_vocabulary.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_claims_registry.py tests/test_architecture_inventory.py` | **410 passed** |
| | `node apps/annotate/run_tests.cjs` | **304/304** |
| | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 549/550. The 1 FAIL is `[real] the projection this tier reads was built from this tree` (main's projections are from master; expected from any branch), plus the node-fs tier skip line. |
| | browser `--only "the model drawn alone and led"` (node_modules junction, `--repo` main) | **2/2** |
| | browser `--only "leaders across the seam"` | **26/26** |
| | browser `--only "annotate model in the scene"` (the shell→scene message entry) | First run **17/22**, run while the pytest subset loaded the box. Alone: **22/22**. `git archive integration`: **22/22**. The red carried `bound 4` anchors that only the real `bindings.json` can supply, so it is a stub-install race in the harness, not this diff. Filed (see Issues). |
| post-merge full suite (review worktree; same tree, FF) | `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` | **1 failed, 1890 passed, 1 skipped, 2 deselected**, 6m42s. The one failure is `test_viewer_js_suite_is_green` (no `[real]` projection in a worktree; by design). No contention header lines in this repo's output. Recorded as `inside budget`. |
| post-merge witnesses | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | **16/18 reached, 14/16 witnessed, 2 left to the sweep (budget), 32m44s** (33m04s wall). The 2 not witnessed are both mutations of `fast__the-leaders-across-the-seam-start-at-each-lit-node-s-dot__b0efbc6a`, marked "the tier was red before the mutation". The shadow's fast tier is red on `[real] the projection this tier reads was built from this tree`, because main's projections are master-built, which hits any branch off today's `integration` (already a filed class). **Witnessed by hand:** `node apps/viewer/run_tests.cjs` (no `[real]`), clean 549/549. Mutation #1 (dot's right side) gives 548/549, and mutation #2 (`if (!lit || !geometry)`) gives 548/549, each failing exactly "…with no study every drawn node does". File restored afterwards. Not a drop attributable to the merge (fast-forward). |
| post-merge prose subset (after my overlay/issue edits) | `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py` | **222 passed** |

Left unexercised in the worktree: the viewer `[real]` fast tier against this
tree's projections. No projection was rebuilt from this tree; the `[real]`
checks read master-built ones. Data pollution: the main checkout's `git status`
is clean, and no file under `data/` outside `data/scratch/` is newer than the
start of my runs.

## Findings

### Blockers

None.

### Should-fix (unfixed, each filed)

- **S1 — the in-sweep half of deliverable 1 is measured but not asserted.**
  `testModelDrawnAloneAndLed` computes `sweepDrawn` and only logs it. The one
  witness cuts the shared `aloneShas()`, so the sweep-only sites
  (`hideOutsideModel` ×2, the `anchorSweepBodies` skip, `applySweepFrame`'s
  `outside`, `contextBaseShas`' sweep arm) could all go with every tier green.
  This is the "deviation/half-claim pinned by nothing" class. →
  `ISSUE_20261109_the_end_stop_models_in_sweep_drawn_part_count_is_logged_not_asserted.md`.
- **S2 — two of v2's nine run-feature nodes have no leader in the sweep.**
  `hub_blade1_root_bearing_bore` (posts `null` on main's projections) and,
  on integration's, `hub_spindle_bore_axis`. The lesson lists both. →
  `ISSUE_20261109_two_of_the_end_stop_models_joint_nodes_have_no_leader_in_the_sweep.md`.

### Nits

- **Fixed inline (docs only):** a leaked `</content>`/`</invoke>` tool-call
  fragment sat **mid-lesson** (between two bullets of "Tests worth knowing
  about") and at the end of
  `ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`.
  Both were removed. Second sighting of the overlay's harness-artifact entry,
  refined there.
- `VA.seamDots` treats "study open but `status: error`" the same as no study.
  `VA.studyLitSet` returns `null` for it, so such a study would now light every
  node for leaders, where before it lit none. That fits the existing comment
  ("leaves the walk at full emphasis exactly as no selection does"), and no
  committed study is `error` today. Noted, not filed.
- `applySweepFrame` keeps a ticked "Other parts" mesh visible by reading
  `isVisible(sha)` back. Toggling the bodies layer off and on loses that tick
  until the reader re-ticks. Minor; noted.
- `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`
  carries `audience: tactical`. The contract names only `audience: strategy`.
  It is harmless (one prior use on master), but it is not a routing word.
- Design (filed `low`): v2 at rest in the 1700×1500 shot frames a close-up of
  one large part, with no linkage in view →
  `ISSUE_20261109_design_the_end_stop_model_at_rest_frames_a_close_up_in_a_tall_pane.md`.

### Lesson audit

- I re-counted "9 distinct nodes, not the handoff's ten" from the run file:
  correct (and `pitch_link_length`/`tan_link_length` are the two edges).
- Anchored-by table: 4 + 2 + 18 + 1 = 25, the pre-revert count. The
  "Corrected after the revert" paragraph updates it in place rather than
  re-tabulating, which is honest but makes 18 stale by one. Left as written,
  since the correction sits next to it.
- "Leaders … 20 with master's projections (the browser tier's count)": my run
  logged 20. Correct.

## Issues filed by this review

- `ISSUE_20261109_the_end_stop_models_in_sweep_drawn_part_count_is_logged_not_asserted.md` (S1)
- `ISSUE_20261109_two_of_the_end_stop_models_joint_nodes_have_no_leader_in_the_sweep.md` (S2)
- `ISSUE_20261109_the_annotate_model_suites_fake_bindings_reader_loses_a_race_to_the_real_bindings_projection.md` (the 17/22 above)
- `ISSUE_20261109_design_the_end_stop_model_at_rest_frames_a_close_up_in_a_tall_pane.md`

## Overlay

Two new entries in `docs/prompts/REVIEW_AGENT.md`: "A browser check that
measures the second half of its claim and only logs it" and the stub-install
race in "annotate model in the scene". The harness-artifact entry was refined
with a second sighting.

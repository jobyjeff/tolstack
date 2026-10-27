---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review: the DAG draws bodies as containers and joints as symbols

Branch `handoff/the_dag_draws_bodies_as_containers_and_joints_as_symbols`
(tip `b587f6d8`, 17 commits), merged into `review/…` as `2c3ff956`. This is
the first run of this handoff: `docs/sessions/active/` holds this handoff and
the review branch had no earlier commits. The lesson arrives as `A`. The one
`R` is a witness spec that follows its renamed guard (below).

## What was verified

- **Deliverable 1, `INTERFACE_KINDS`.** It is a module constant in
  `tolerance_stack/topology.py`, refused on a structural edge, and optional
  on a gap edge. It is generated into `vocab.gen.js` (registry row in
  `scripts/js_vocabulary.py`) and paired with the prose in `DAG_TOPOLOGY.md`
  (`_DOC_VOCABULARIES`). `LINKAGE_JOINT_INTERFACES` in `kinematic.py` matches
  the handoff's mapping exactly and is keyed in `LINKAGE_JOINT_TYPES` order
  (tested). The agreement test reads each joint's type off the sweep's own
  residual rows. All 13 gap edges of `vpa_pitch_linkage` carry a value (I
  re-listed them), as do four edges on the other topologies. The topology
  diff adds only `interface` lines and `note` sentences, and changes no value.
- **Deliverable 2, the form rule.** The SOP section, the `Form` dataclass and
  `check_form` agree. An element is structural, nominal 0, at ±zone/2, and
  names no node. A modifier names one end of its edge and may not be wider
  than the size band. v0 does not fold it, and a test shows the fold is the
  same with and without the callout. The `±zone/2` reading of Jeff's
  "± the form band" is disclosed in the lesson. It is the GD&T-correct one: a
  flatness zone is a full width.
- **Deliverable 3, containers.** The walk is body-major, and `body_spans`
  gives one block per body for all 13 bodies (pinned in both Python and
  `[real]` JS). **Crossing numbers re-derived:** I ran integration's own
  builder over the committed topologies. It gives `vpa_pitch_linkage` 18
  columns and 5 / 115 / 2 = 122 crossings, and the four topologies without
  bodies give exactly the counts `test_a_topology_with_no_bodies_walks_exactly_as_before`
  pins. After the change it is 16 / 43 / 50 = 109 on 11 columns (pinned).
  The lesson states plainly that leader crossings rose from 2 to 50, and the
  open crossing issue now carries that.
- **Deliverables 4 and 5.** The sub-stack's open state is one map shared by
  the DAG and the group row. Its folded interval is display only. A dashed
  field *around each bar* replaced "one bar inside one body", because the
  chain crosses four bodies. That deviation is filed with options
  (`ISSUE_20261027_the_travel_sub_stack_crosses_four_bodies…`, audience
  strategy). The glyph file's keys are enumerated against `INTERFACE_KINDS`
  by `test_the_joint_glyph_file_draws_exactly_the_interface_words` and are
  also checked at load by `VOCAB.table`.
- **Out of scope stayed out.** `apps/annotate/` is untouched. The kinematic
  table change is limited to the group row sharing open state, which
  deliverable 4 requires.
- **The deep-link README was not touched.** The `apps/viewer/README.md` edits
  are the walk's re-measured figures and claims.

## The tolstack mandatory checks

This handoff is a topology and viewer change, not a stack.

1. **Every tolerance traces to a source.** No element value, band or
   `source_ref` was added or changed. An `interface` is a word, and nothing
   folds it. Pass: nothing new to trace.
2. **Signs.** `fold()` is untouched, and no term list changed. Pass.
3. **LMC/MMC.** Not applicable: no element carries new `lmc`/`mmc`.
4. **RSS.** Unchanged; the sub-stack label shows the worst-case interval
   only, as display. Pass.
5. **Nominal inside min/max.** No new values. `check_form` enforces it for
   form elements by construction. Pass.
6. **Quantised constraints.** No hardware added. Not applicable.
7. **Traced ratio**, computed by me with
   `tests/debug_report_tolerance_stacks.py --ratio`: 5 traced / 12 inferred /
   9 untraced out of 26 instances across the three seeded stacks. Across all
   stacks it is 30 / 16 / 15 of 61. Unchanged, since no stack file is in the
   diff.

## Tests

- **The tactical record**: the full suite in the bridged worktree, 1610
  passed / 1 failed / 1 skipped in 344 s. The failure is the documented
  fast-tier SKIP that the suite counts as red
  (`ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness.md`).
  The record also covers the fast tier, the browser tier and the witnesses.
  It is consistent with the diff, so I gave it the benefit of the doubt.
- **The merge**: one conflict, in `scripts/guard_enumeration.mjs`'s
  `DECLARED_GUARDS.fast` pin. Integration had moved it 570 → 572
  (`ea8815ec7bc9`) and the handoff had moved it 570 → 579
  (`efff02814f15`). I resolved it to the merged tree's recomputed census,
  **581 / `a1a26831aa84`** (572 + 9), and kept integration's browser pin
  623 / 590 / `13ca33e01eca`. I checked that `census()` reports no moved pin
  and no orphan, and that no conflict markers remain.
- **Risky subset** on the merged tree, before landing: `pytest -q
  tests/test_topology.py tests/test_topology_projection.py
  tests/test_tolerance_stack.py tests/test_viewer_projection.py
  tests/test_js_vocabulary_is_generated.py tests/test_js_python_vocabulary.py
  tests/test_architecture_inventory.py tests/test_claims_registry.py
  tests/test_mutation_witnesses.py tests/test_kinematic.py
  tests/test_app_type_scale.py tests/test_provenance.py
  tests/test_thermal_exception_list.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py`: **682 passed**.
- **Arming**: `dispatch bridge-test-inputs` into the review worktree. The main
  checkout's projections were copied into the worktree's own `data/`, and
  `scripts/rebuild_projections.ps1` was run there. Every provenance stamp is
  `review/… @ 2c3ff9565c27, dirty=False`, and 1 of 1 kinematic study built.
  `node_modules` is a junction. The shared `data/projections/` was not
  touched.
- **Viewer fast tier**, `node apps/viewer/run_tests.cjs`: **580/580**, plus
  the one named SKIP (the per-document qualifier, as above).
- **Browser tier**, `node scripts/run_viewer_browser_tests.mjs --repo <review
  worktree>`: **29/31 suites**. Every topology, respine, height-budget,
  deep-link, stub-origin and kinematic suite is green. The two reds are both
  outside this diff:
  - `annotate rail and scene`, 20/22: the two gap-badge popups, already
    filed on integration
    (`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`).
  - `annotate rail filter + face deselect`, 33/34: "a real click on the face
    tints it", the deferred flake
    (`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`).
    Re-run alone with `--only "annotate rail filter"`: **34/34**.
- **Mutation witnesses**, `node scripts/run_mutation_witness_tests.mjs --repo
  <review worktree> --changed-since integration`: **31/31 witnessed, exit
  0**. That includes the ten new specs and the two re-anchored ones. The
  census holds at 581 / 225 / 623.
- **Full suite, after the merge**, in the review worktree (`venv-win/Scripts/python.exe
  -m pytest -q -p no:cacheprovider -rs`, single process; the venv has no
  xdist): **1 failed, 1610 passed, 1 skipped, 2 deselected in 1961 s**. The
  one failure is the same documented SKIP-as-red. This repo's suite prints no
  `concurrent pytest processes` or `full-suite lock` header, so there are no
  contention lines to quote. The run overlapped the witness run and the
  browser rerun, both of which hold Chrome. `dispatch suite-time` says
  **OVER BUDGET by 22m41s** (the uncontended re-run is under "Re-run" below).
- **Not exercised in the worktree:** `node apps/annotate/run_tests.cjs`
  (`apps/annotate/` is untouched), and the main checkout's own tiers (the
  main checkout is on master).
- **Production data.** The main checkout's `git status` is clean, and no
  file under `data/inbox` or `data/meshes` is newer than the review start.

## Findings

No blockers.

### Should-fix (filed, not fixed)

- **`.gitignore`'s `venv-win/` misses the bridge's symlink**, which is how
  `7c10349d` committed it. The branch tip no longer carries it (`git ls-tree
  HEAD venv-win` is empty). Outside the handoff's scope:
  `ISSUE_20261027_gitignore_venv_win_slash_pattern_misses_the_bridge_symlink.md`.

### Design (filed, never blocking)

- The `planar` and `clearance` glyphs are two horizontal bars each and read
  alike at 12 px. Body name labels are drawn over rails and dots in the
  screenshots (`03_…`, `05_…`):
  `ISSUE_20261027_design_the_planar_and_clearance_glyphs_read_alike_and_body_names_sit_on_the_rails.md`
  (low).

### Nits

- The renamed guard's spec (`fast__real-every-live-walk…__b8984c2c.json`)
  rewrote its `note` to say the guard was declared by this handoff. It was
  declared by `the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`.
  The appended parenthetical does say it was renamed. Its counts (32 rows, 7
  columns) are still pinned in the test body, so dropping them from the name
  weakened nothing.
- `Form.source_ref` is optional, and nothing counts a form zone in any
  confidence tally. That is harmless today, because no committed edge carries
  a form and the viewer does not print the zone. The first authored form
  should be held to the same citation rule as a dimension.

## Lesson audit

The arithmetic re-derives: 5 + 115 + 2 = 122 and 16 + 43 + 50 = 109. The
before counts match integration's code. There are 13 bodies and 13 gap
edges, and four `interface` lines on the other topologies. I did not
re-measure the "14 of 37 legs" and "37 rail allocations over 11" figures.
The causal claims I could check do hold. The `tv__body` collision is real:
`renderTopoPane`'s wrapper uses that class. The `venv-win` commit and its
removal are both on the branch.

## Overlay

Added two **Recurring bugs** entries: a new CSS class whose name the views
already use for structure (the DOM shim cannot see it), and a bridged
worktree's `venv-win` link arriving on `git add -A`.

## Re-run 2026-10-27: the full suite, uncontended

I re-ran the same command with `--durations=15` and nothing else on the
browser slot: **1 failed, 1610 passed, 1 skipped, 2 deselected in 375 s**.
The failure is the same documented SKIP-as-red. `dispatch suite-time` says
**inside budget**, and that row is recorded beside the 1961 s one. The
1961 s run overlapped this review's own witness run and browser rerun, so its
overage measured my contention and not the suite. I did not file a
`suite_over_budget` issue. The slowest test is
`test_feature_geometry.py::test_real_both_readers_classify_every_installed_face_the_same`
at 99 s; the next is the witness census setup at 30 s.

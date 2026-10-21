---
type: review
handoff: docs/sessions/active/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
reviewer: agent
date: 2026-10-20
verdict: APPROVE
blockers: 0
---

# Review: the_viewer_shows_a_kinematic_study

**Verdict: APPROVE.** 0 blockers. One should-fix is filed rather than fixed. One
title nit, which an earlier review left unfiled, is now live and filed. One
design issue is filed. Nothing was fixed inline.

The work is on `handoff/the_viewer_shows_a_kinematic_study` (5 commits, `e4d7738`
through `269e976`). It was not already contained in `integration`: the
`merge-base --is-ancestor` check came back negative. The handoff is the only
file in `docs/sessions/active/`, and its lesson arrives as an `A` (new file),
so no earlier run's record was overwritten.

## What was verified

- **Deliverable 1, the projection is served where the viewer reads.** I read
  drawing-checker's mount claim against the lesson. The builder now writes
  `data/projections/viewer/kinematic/kinematic_studies.json`. Every adapter
  (`fsa`, `http`, `memory`, `node_fs`) gains `readKinematic` through
  `VA.CONFIG.kinematicProjection`. `tests/test_kinematic.py::test_the_projection_lands_inside_the_directory_the_viewer_is_served_from`
  pairs the builder constant, the config line and the freshness input. The
  builder is on `rebuild_projections.ps1`, last, with its stamp printed.
  Absence is handled: no section and no error, which the browser `[real]`
  check covers.
- **Deliverable 2, the nav section.** Studies are grouped under the topology's
  title, and the model row appears only when a topology has runs and no study.
  The model row's new-tab target is `VA.annotateLink({sweep})`, and
  `VA.annotateExecCommands` mirrors it as `["sweep", run]`. Both tests were
  extended. Runs are ordered by `ts`, never by id, and a collision test plants
  an id-order/ts-order disagreement (`test_models_list_each_topologys_runs_newest_first_by_timestamp`).
- **Deliverable 3, the page.**
  - I read `views/kinematic.js` in full. Every number is a projection field,
    printed at the projection's own `display_decimals`, which is decided in
    Python. Nothing is summed in JS.
  - The vocabularies (`ROW_KINDS`, `ZONE_KINDS`, `FEATURE_SOURCES`,
    `STUDY_STATUSES`) come through `scripts/js_vocabulary.py`, and
    `generate_js_vocabulary.py --check` is up to date on the merged tree.
  - The chart's y axis is deviation from nominal, symmetric, and the limit
    hairlines are always in range.
  - Gap rows carry the `chip--gap` "no band on file". Zero-sensitivity rows
    are muted.
  - Each row's `href` is `?topology=…&edge=…`. The 3D control is gated on
    `partHasMesh`, a deliberate and documented substitute for "a binding
    exists", because the viewer has no binding facts.
  - The handoff pointed at `checkCard` for the verdict chip, but `checkCard`
    renders a check's configuration card, not a verdict. The author used
    `VA.studyCheckRow`, the model behind the chain studies' verdict rows,
    which is the right reading of the intent.
- **Screenshot of the merged tree** against the real projection, at 1600 and
  1100 px. The chips read `PASS · margin +0.256 deg / +0.258 deg · limit
  ±0.500 deg · BUDGET`. The −7° table ranks 0.156 / 0.047 / 0.024 / 0.017 and
  then the two gap rows, which matches the handoff's numbers. The hover tip
  reads driver, blade pitch, ± worst case and ± RSS, each with its unit.
- **Lesson audit.**
  - The guard counts re-derive. The census moved fast 522→541 and browser
    523→534 against 18 fast and 10 browser specs: two fast data guards and the
    browser skip arm are unenrolled, as the lesson says. One renamed guard
    accounts for the fast column's 18 = 19 + 1 − 2.
  - The 442/442 worktree-only fast tier and the 541/541 armed fast tier both
    reproduce.
  - The run-id discrepancy the lesson reports is real. The study JSON names
    `vpa-pitch-p2-20261015-013931`, and `models[]`' newest run is
    `…20261016-235852`. It is filed as
    `ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`.

## Merge, and the conflicts it produced

`integration` had moved since the branch was cut, so `git merge
handoff/the_viewer_shows_a_kinematic_study` produced two conflicts:

- **`scripts/rebuild_projections.ps1`.**
  - Integration's side: the part-names builder as step 3, crops moved to 4.
  - Handoff's side: the kinematic builder as step 4.
  - Resolution: kept integration's steps and numbered the kinematic step 5.
    It is still last, as the handoff wants and as
    `test_the_kinematic_projection_is_built_on_this_rail_and_last` pins.
  - The synopsis reads "every viewer projection and the part names".
- **`scripts/guard_enumeration.mjs`.** Both sides moved the census pins:
  integration's annotate (189→195), and the handoff's fast and browser.
  `--unenrolled` on the merged tree re-derived the values: fast 541 (the
  handoff's), annotate 195 (integration's), browser 534/503 (the handoff's).
  All three digests now match.

A marker grep came back clean before the merge commit (`aaf1840`).

## Tests

- **Tactical record:** full suite `1 failed, 1502 passed, 1 skipped`, with the
  failure the documented worktree red. Plus the fast tier 541/541, the browser
  tier 26/26 after the fix, and the witness tier 208/208, all against a scratch
  data root built from the branch. Consistent with the diff, so the benefit of
  the doubt holds.
- **Risky subset (merged tree, review worktree).** `test_kinematic`,
  `test_rebuild_projections_script`, `test_viewer_deep_link_contract`,
  `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`,
  `test_viewer_readme_doc_facts`, `test_architecture_inventory`,
  `test_mutation_witnesses`, `test_projection_freshness`,
  `test_projection_provenance`, `test_rebuild_terminal_state_pairing`,
  `test_app_type_scale`, `test_claims_registry`, `test_tolerance_stack`,
  `test_provenance`, `test_thermal_exception_list`: **393 passed**.
- **`[real]` tiers against the merged tree.** Every projection was rebuilt
  from the review worktree (`aaf1840`) into a scratch data root,
  `C:\workspace\tolstack\data\scratch\review_kinematic\`, which is gitignored
  and is not the shared projections. The rebuild covered topology, results,
  part names, crops and kinematic. The freshness line paired all four viewer
  files with `aaf1840e535e`.
  - `node apps/viewer/run_tests.cjs --repo <scratch>`: **541/541**, no tier
    skipped.
  - `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **26/26**,
    including the kinematic suite at 10/10 with its `[real]` arm executed.
- **Post-merge full suite (review worktree):** `1 failed, 1508 passed, 1
  skipped` in 285s.
  - The failure is the documented worktree-only
    `tests/test_viewer_js_suite.py`. The tier it gates ran separately above at
    541/541.
  - The skip is the pre-existing `test_fit_bound_features.py:422`.
  - This repo's conftest prints no `concurrent pytest processes at start` or
    `full-suite lock` lines. The mutation-witness tier was running at the same
    time.
  - After the overlay edit, the docs-prose subset (`test_tolerance_stack`,
    `test_provenance`, `test_thermal_exception_list`, `test_claims_registry`)
    re-ran: 226 passed.
- **Main-checkout `data/` unchanged** across all of the above. `find -newer`
  against a pre-run marker, excluding the scratch root, returned nothing.
- **Mutation-witness tier (post-merge, merged tree):**
  `node scripts/run_mutation_witness_tests.mjs --repo <scratch>` reported
  **214/214 declared mutations witnessed** and exited 0. The tactical run's
  208 plus integration's six new annotate specs make 214. The census agrees
  with the pins.

## Findings

### Should-fix (filed, not fixed)

1. **The page shows a PASS against a limit whose citation it never shows.**
   - Where: `apps/viewer/views/kinematic.js`, `verdictStrip` and `provenance`.
   - The problem: the limit's `source_ref` (S461-607) and the stop's
     `context_ref` (S461-241) are in the projection and not reachable from the
     page. The S461-607 adoption note, a blade-to-blade limit borrowed as the
     nearest criterion, is this study's caveat next to its numbers.
   - The handoff's provenance list did not ask for it, so this is not held
     against the deliverable.
   - Filed: `ISSUE_20261020_the_kinematic_page_shows_a_pass_against_a_limit_whose_citation_it_never_shows.md`.

### Nits (filed)

2. **The study title's `, kinematic` suffix is now rendered.** It was N1 of
   `REVIEW_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md`, unfiled
   then because nothing rendered it. It now shows on the nav row under a
   "Kinematic studies" heading and on the page `h2`. The study JSON was fenced
   out of this handoff.
   Filed: `ISSUE_20261020_the_blade_pitch_kinematic_study_title_carries_a_genre_suffix_the_viewer_now_renders.md`.
3. **Design: two layout faults.** At 1100 px the `3D ↗` link wraps onto two
   lines. The hover tip covers the mid-plot `limit ±0.500 deg` label.
   Filed: `ISSUE_20261020_design_the_kinematic_page_3d_link_wraps_and_the_hover_tip_covers_the_limit_label.md`.

The author's own decisions are reasoned in the lesson and accepted:

- stacked tables rather than tabs;
- "Kinematic model" rather than the handoff's "Pitch linkage — kinematic
  model";
- the preview pane stands down on this page;
- the mesh gate in place of a binding gate.

## Overlay updated

`docs/prompts/REVIEW_AGENT.md` gains three entries:

- A recurring-bugs entry: a verdict surface must make the limit's citation
  reachable.
- A recurring-bugs entry: a prior review's unfiled title nit goes live once a
  renderer lands.
- A risky-subset trap: how to arm the `[real]` tiers against the merged tree
  through a scratch data root. Inputs must be copied, not junctioned, because
  the edit guard refuses a junction onto `data/inbox`.

## For the next reviewer / operator

- `C:\workspace\tolstack\data\scratch\review_kinematic\` is this review's
  scratch root. It is about 380 MB of copies and holds a `venv-win` junction.
  Delete it with `cmd /c rmdir` on the junction first. It is not anyone's data.
  The author's `data\scratch\kinematic_viewer\` is the same kind of scratch.
- The main checkout's shared `data/projections/viewer/` has no `kinematic/`
  yet. Until someone runs `scripts/rebuild_projections.ps1` after the batch
  merge, the live viewer shows no Kinematic studies section, which is the
  designed absent state.

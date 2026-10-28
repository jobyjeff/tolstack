---
type: review
handoff: docs/sessions/active/HANDOFF_20261027_a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review 2026-10-27 — a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds

Branch `handoff/a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds`
(4 commits, `2749b0e1`..`9019de38`), merged into
`review/a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds` as
`aa57158a`. It was not already contained in `integration` when the review
started. The merge had no conflicts, and `integration` had not moved past the
review branch's base.

## What was verified

- **The decision.** The subject of a worksheet is now the selected study, as
  the handoff decided. `build_topology_projection.py::study_stack` resolves
  this at projection time. It takes the single stack file that the study's
  `dimension_ref` edges name, then finds the `provenance.grip_stack_joints`
  row whose `re_expresses` is that file. The worksheet comes from
  `build_viewer_projection.worksheet_for`, which is imported rather than
  copied. A study that names no stack, names two stacks, or names one with no
  kept joint block resolves to `None`. On the page,
  `VA.worksheetSubject(topology, study)` and `VA.jointSubject` each read that
  one field. The page-level fallback the handoff rejected (`results` plus
  covered stacks) is deleted, and no caller still uses the old signature
  (grepped).
- **The projection, built from the merged tree.** Each `pitch_link_*` study
  resolves `pitch_link_to_pitch_plate` (DETAIL B) and its sheet. Each
  `rotor_fastener_grip_u*h` study resolves `rotor_fastener_length` (SECTION
  T-T) and its sheet. `vpa_output_shank_out` resolves
  `vpa_output_to_pitch_plate` (DETAIL X) and its sheet.
  `tan_link_take2_worst_case_protrusion` resolves its stack with
  `worksheet_file: null`. Every `pitch_system_*` study and the travel study
  resolve `null`. So all three sheets and all four joint blocks are reachable.
- **The sheetless stack.** The tan-link study shows its joint block and no
  worksheet toggle. That is the standing absent-feature rule (an absent
  feature shows nothing), and it is how I read the handoff's "say so on the
  page the way the absent-feature rule says".
- **Disclosure.** The joint block stays a collapsed `<details>`. The
  screenshots show it opened because `tests/debug_study_worksheets.mjs` opens
  it on purpose.
- **Guards.** Each new guard has a spec: 6 fast, 7 browser and 1 python. I
  read the python spec and the tan-link browser spec. Each mutates the line
  its guard certifies. The old SKIP row and the zero-reached assertions that
  cited the issue are gone. The issue is now `status: resolved`.
- **Lesson.** I re-derived its claims against the projection: the source of
  the mapping, the null cases, and the census of 6 fast and 7 browser specs.
  They hold. The census pins themselves are test-checked
  (`DECLARED_GUARDS`).
- **Projection freshness.** The topology builder now also reads
  `docs/tolerance_stacks/WORKSHEET_*.md`. The topology stamp names only
  `docs/topologies`. But the viewer projection's stamp names
  `docs/tolerance_stacks`, and the tier checks every projection, so an edit to
  a sheet still reports the tier stale. The builder already read stack files
  through `dimension_ref` before this change. No new gap.

## Tests

The tactical record covers `pytest -q` in its worktree (1587 passed, 1
skipped, 1 failed: the documented worktree red `test_viewer_js_suite`), plus
the node, annotate and browser runs and a witness run, all against a
projection built from its own tree. That record is consistent with the diff,
so it gets the benefit of the doubt.

I built all five projections from the **merged** tree into a private scratch
root, `C:\workspace\tolstack\data\scratch\review_study_worksheets`. Its
`inbox`, `meshes`, `venv-win` and `node_modules` are junctions, `docs` is a
junction to this review worktree, and the non-viewer projections are copies.
The shared `data/projections/` was not touched.

Pre-merge risky subset, all in this worktree:

- `pytest -q` over `test_topology_projection`, `test_topology`,
  `test_viewer_projection`, `test_js_python_vocabulary`,
  `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`,
  `test_mutation_witnesses`, `test_projection_provenance`,
  `test_architecture_inventory`, `test_claims_registry` and
  `test_tolerance_stack`: **544 passed**.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **591/591**, with every
  projection paired at `aa57158a`. The one `[real]` SKIP is already filed
  (`ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness.md`).
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only "topology file://"`:
  2/2 suites (212/212 and 40/40 sub-checks).
- The same runner with `--only "no nav click"`: 16/16 sub-checks.

Post-merge:

- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>
  --changed-since integration`: **21/21 witnessed, 21/21 reached, 0 left to
  the sweep**, in 15m06s.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`,
  run in this review worktree: **1 failed, 1587 passed, 1 skipped**, in 324 s.
  - Recorded with `dispatch suite-time` as `inside budget`.
  - The one failure is the documented worktree-only red,
    `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`. It fails
    because there is no projection in the worktree. Its tier is the 591/591
    `--repo` run above, so it is the only thing left unexercised in-tree.
  - This conftest printed no contention header lines.
- The shared `data/projections/viewer/` keeps its pre-session mtimes, and the
  main checkout's `git status` was clean afterwards, so the run did not
  pollute the shared data.
- Not run: the full browser TRUTH tier. Only its two affected suites ran,
  matching the tactical agent's scope.

## Findings

### Fixed inline

- **nit**, `apps/viewer/README.md` ~2220. The rewritten paragraph kept a
  fragment of the old one: "…study by study. counts them off the projection).
  The button hides…". I deleted the stray fragment. No behaviour changed.

### Not blocking

- None.

Overlay: I added one Recurring-bugs entry, "A rewritten README paragraph keeps
the tail of the old one", because `test_viewer_readme_doc_facts` reads
declared facts and cannot see a broken sentence.

## Landing: conflict resolution

`integration` moved during the review. It took in
`the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed`
(`243830b0` and `3111364d`). Merging it into the review branch conflicted in
one place, `scripts/guard_enumeration.mjs`'s `DECLARED_GUARDS.browser` pin:

- The pin started at 660/627.
- This handoff's side set it to 664/631 (+4).
- `integration`'s side set it to 665/632 (+5, the nav handoff's new browser
  checks).

The two sides added different guards, so the resolution is the union,
**669/636**. The names digest is `57e00eb68a7c`, recomputed with
`enumerateGuards` and `guardNameDigest` over the merged tree; it is not
either side's digest. No conflict markers remain (grepped).

Re-run on the re-merged tree (`f48d6694`):

- `pytest -q tests/test_mutation_witnesses.py tests/test_topology_projection.py
  tests/test_viewer_readme_doc_facts.py tests/test_js_python_vocabulary.py`:
  117 passed. This includes the census pin.
- The viewer node tier through `--repo`: 591/591, still paired.
- Browser `--only "topology file://"`: 2/2 suites passed.
- Browser `--only "no nav click"`: 16/16 checks passed.

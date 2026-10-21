---
type: review
handoff: docs/sessions/active/HANDOFF_20261020_the_sweep_rail_shows_the_mechanism.md
reviewer: agent
date: 2026-10-21
verdict: APPROVE
blockers: 0
---

# Review — the_sweep_rail_shows_the_mechanism

First review of this handoff. `review/the_sweep_rail_shows_the_mechanism` had
no prior commits, and `docs/sessions/reviews/` had no report for this slug.
The handoff branch (5 commits, `079e151..59868ec`) was cut from `integration`
at `9a29acd`. `integration` had not moved, so the merge is a fast-forward and
the merged tree is byte-for-byte the tactical tree.

## What I verified

**Against the handoff's deliverables**

1. **Mode-aware rail.** In sweep mode, one class (`an--sweep`) on `#workspace`
   hides `#auto-setup`, the study label and select, `#rail-filter` and
   `#element-list`. The topology select stays and is disabled.
   `setRailSweepPosture` is the only place either change happens, and
   `leaveSweep` undoes it (so `goto`/`trace` undo it too).
2. **Mechanism tree.** `AA.sweepMechanismTree` reads `bodies[]`, `links[]`,
   `points[0].joints`, `mechanism.row_labels` and `geometry.features[]`. I
   re-read P2 (`vpa-pitch-p2-20261016-235852`) myself: 3 bodies (base is
   ground, 3 parts; pitch_plate and blade each have 2), and 5 joints. pitch_link
   has 7 feature entries, which reduce to 3 unique refs: the upper and lower
   sphere centres plus `pitch_link_length`. Part rows go through the existing
   `buildPartRow`, so there is still one implementation of a part row.
3. **Joint types.** Python owns the table (`LINKAGE_JOINT_ROW_NAMES`). It is
   generated into JS, and `tests/test_kinematic.py` compares it whole against
   `linkage/joints.py`. I compared the eight `TYPE`/`ROW_NAMES` pairs in the
   sibling by hand and they match. The lesson says the handoff's linkage-lesson
   path does not exist, and it is right: there is no `*1016*` lesson in
   `C:\workspace\linkage\docs\sessions\lessons\`.
4. **Contributors.** The verb is extended in all four carriers:
   `VA.annotateLink`, `VA.annotateExecCommands`, `AA.planEntryCommands` and
   `cmdSweep`. `apps/viewer/tests.js` pins both viewer carriers over the same
   params. The stop is picked by measure value, and the rail repaints only when
   the stop changes, not on every frame. Touching the viewer goes against the
   scope line, but deliverable 3 needs it, and the lesson says so.
5. **Inspect only.** `inspect` tints faces and scales a bead, and writes
   nothing. Re-pick runs `goto`, which calls `leaveSweep()` first. `inspect` is
   a selection, not a change of mode or subject, so it rightly has no
   `announced()` (overlay entry, 2026-10-20).
6. **Truncation rule.** Every tree row and head has a `title` with its full
   text, and the TRUTH tier checks this at `RAIL_WIDTH_MIN` with a
   non-vacuity term (`clipped > 0`).

**The bind-mode snapshot was really taken before the work.** I ran the
branch's `testAnnotateSweepRail` (the runner and fixture copied into the
pre-merge worktree, which was `integration` at `9a29acd`) with `--only
"annotate sweep rail"`. The two mock checks passed, including "bind mode's rail
is node for node the rail before …", and the `[real]` checks failed
(`sweepEmphasis is not a function`). So the fixture matches the pre-work DOM.
It was not captured from the branch, and the `[real]` checks fail without the
work. Temporary files removed before merging.

**Lesson audit.** I re-derived these counts and all of them hold:

- annotate `197 → 205`, browser declared `547 → 561`, enrollable `516 → 529`
  (`scripts/guard_enumeration.mjs`);
- 21 new specs (8 annotate + 13 browser);
- 18 specs repointed in `079e151`, plus one `find` updated afterwards
  (`fast__annotateparamsfor…`);
- 5 joints and 3 bodies on P2, and a 6-row study at −7° and +72°.

The table mapping types to rows to words matches the code.

## Tests

The tactical record lists a full suite in its worktree (`1 failed, 1513
passed, 1 skipped`, 5:08) and every node tier armed through a scratch root.
That is consistent with the diff, so the cadence's benefit of the doubt holds.

**Pre-merge subset:** the pre-work replay above. Because the merge is a
fast-forward, everything below ran on the exact tree that lands.

**Post-merge, in the review worktree** (`node_modules` junctioned in; `[real]`
tiers through `--repo C:/workspace/tolstack/data/scratch/sweep_rail`, the
tactical agent's scratch root built from this tree):

- `venv-win/Scripts/python.exe -m pytest -q`: **1 failed, 1513 passed, 1
  skipped in 303.91s**. The failure is the documented worktree-only
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, and the skip
  is the uninstalled re-extraction. This repo's conftest prints no
  contention/lock header lines.
- `node apps/annotate/run_tests.cjs`: **205/205**, no SKIP lines.
- `node apps/annotate/run_browser_check.mjs`: **67/67**.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **544/544**. The first run
  went 539/544, with five `[real] … worksheet` checks red, because the tactical
  agent had removed the scratch root's `docs` junction. I copied `docs/` in and
  it went green. That was the scratch root, not the diff, and the overlay now
  says so.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, full:
  **27/28**. The new `annotate sweep rail …` suite is **13/13**. The red was
  `[annotate rail filter + face deselect]` / "a real click on the face tints
  it", which is the known edge-on flake
  (`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`).
  It went 34/34 on three `--only "annotate rail filter"` reruns.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>`, full
  registry (with a `venv-win` junction re-added to the scratch root): **254/258**
  on the full pass. The four misses all read "the tier was red before the
  mutation, so nothing was proved": `…88af3e18`, `…9d91be08`, `…4d422e96` and
  `…42579b37`, all viewer card/preview-pane suites this diff does not touch.
  A red clean run under the full pass's load is not a decayed witness. Each one
  rerun alone with `--only <hash>` came back **1/1 witnessed**, so the
  registry is **258/258**, including all 21 new specs. Enrollment: fast
  74/544, annotate 60/205, browser 89/529 enrollable (561 declared), the same
  as the lesson.
- Prose subset after my overlay edit (`test_tolerance_stack`,
  `test_provenance`, `test_thermal_exception_list`, `test_claims_registry`):
  **226 passed**.
- Nothing written under the main checkout's `data/` outside `data/scratch/`,
  and its `git status` is clean.

## Findings

### Should-fix (not fixed; filed)

1. **The rail shows a study's contributors on a run the study did not fold.**
   `cmdSweep` (`apps/annotate/app.js`, the `if (studyId)` block) looks the
   study up by id and never compares `study.sweep.run_id` with the run it
   loads. The TRUTH tier's own boot pairs run 10-16 with a study that folds
   10-15, so the "six rows at −7°" it checks are another run's numbers, and
   nothing on screen says so. The viewer always sends a consistent pair, so
   only deep links and later callers are exposed. The fix needs a test, so
   it is outside the inline boundary →
   `docs/issues/ISSUE_20261021_the_sweep_rail_lists_a_kinematic_studys_contributors_on_a_run_the_study_did_not_fold.md`.
   Added to the overlay as a new recurring-bug class.

### Design (filed, non-blocking)

2. Re-pick is `visibility: hidden` until hover, so it never takes focus and
   `:focus-within` can never show it. Contributor rows are clickable `<li>`s
   with no `tabindex` or key handler. Neither has a keyboard path →
   `docs/issues/ISSUE_20261021_design_the_sweep_rails_repick_and_contributor_rows_cannot_be_reached_by_keyboard.md`
   (`priority: low`, a judgement-call aesthetic/a11y item rather than a named
   prohibition).

### Nits (no issue)

- The handoff asked that selecting a joint highlight its beads using "the
  existing `sweep-tip` hover shape". The work scales and tints the joint's one
  bead instead. It reads well and is stated in `ANNOTATION_SURFACE.md`, so I am
  noting it, not filing it.
- The DoD's "expanding `pitch_link` lists its two sphere-centre features"
  undercounts: the row also lists `pitch_link_length`, which is correct, since
  it is one of that joint's feature joins. The tier checks the two spheres and
  does not pin the total.

Nothing fixed inline.

## Note for the next reviewer

The fenced successors the lesson names are filed:
`ISSUE_20261020_the_sweep_rail_cannot_show_a_bodys_internal_dimension_chains.md`
(strategy) and `…_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`
(already on integration). When that study moves to 10-16, finding 1 stops
showing on P2 but stays open as a class.

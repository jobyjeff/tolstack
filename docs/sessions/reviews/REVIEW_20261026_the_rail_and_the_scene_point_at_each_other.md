---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_rail_and_the_scene_point_at_each_other.md
reviewer: agent
date: 2026-10-26
verdict: APPROVE
blockers: 0
---

# Review — the_rail_and_the_scene_point_at_each_other

**Verdict: APPROVE**, 0 blockers. Deliverables 1–6 are built and witnessed.
Deliverable 7 (sweep mode with no folder grant) is not built, for a reason I
accept (below). Deliverable 8 (a suggestion) is not built and is filed. Two
non-blocking findings are filed as issues.

The branch was not already merged (`merge-base --is-ancestor` said no). It was
merged into `review/…` with no conflicts. Branch status letters: the lesson
arrives as `A`, so it is this run's own file. No stack data changed, so
mandatory checks 1–7 (provenance, signs, LMC/MMC, RSS, nominal, castellation,
traced ratio) **do not apply**: the diff touches no stack, topology, hardware
or spec value. `fold()` is untouched.

## What I verified

- **Code read**: `scene.js` (the `shown` / `hiddenKeys` split, keys carried
  index-for-index through `placementsFor` → `setRestPlacements` /
  `setPartMatrix` → `_drawAt` / `_setRepeats`, hover overlays as children of
  the occurrence nodes, `pick` returning `key`), `sweep.js` (the pure helpers),
  `commands.js` (the `hover` / `inspect part` grammar; `INSPECT_TARGETS`
  appended, so old indices hold), and `app.js` (the composition). Every new
  `commands.register` verb (`hover`, `show-body`, `hide-body`) leaves the mode
  and the subject alone, so not wrapping them in `announced()` is right. The
  checkbox and chip state lives in the scene and the pref store, not on the
  DOM the rail rebuilds. `renderSweepRail` runs per stop crossing, not per
  frame, so clearing the hover there costs nothing while the sweep plays.
- **Deliverable 7**: the addendum on
  `ISSUE_20260910_annotate_has_no_http_read_transport.md` (status `triaged` →
  `BRIEF_20260911_served_surface_capability_gaps.md`) records the served
  origin answering 404 for the sweep run itself. Sweep mode cannot open without
  that file. Publishing it needs a drawing-checker mount, which is outside this
  handoff's scope fence. The work has an owner, so I am not filing a new issue.
  The DoD line "sweep mode opens with no folder prompt" is therefore **not
  met**, and this report says so.
- **Lesson audit**: 28 new specs = 7 annotate + 21 browser, plus 2 re-pointed,
  for the 30 the runner lists ✓. Pins: annotate 213+7=220 ✓; browser declared
  583+22=605 and enrollable 550+22=572. That is 21 specs plus the suite's skip
  line, which `--unenrolled` lists. It follows the precedent set by
  `[real] the sweep rail on P2 (skipped …)` ✓. The hover-cost "2–10%" matches
  its own table ✓. The "215735-001 does not appear" claim holds: the attach
  radius edge's `part` is 215177-001, and 215735 is named only in notes.
- **Tactical full-suite record**: `1 failed, 1573 passed, 1 skipped`, single
  process, in the worktree. The one failure is the documented worktree-only
  `test_viewer_js_suite.py`. The diff touches no `apps/viewer/` file, so the
  record is consistent and I give it the benefit of the doubt.

## Pre-merge risky subset (named, per the overlay's mapping)

Rows: `apps/annotate/`, a CSS rule, a guard/witness, and prose in a tracked
doc.

- `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py`
  → **359 passed**.
- `node apps/annotate/run_tests.cjs` → **220/220** (no SKIP lines).
- `node apps/annotate/run_browser_check.mjs` → **67/67**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate"`
  → **9/9 suites**. The new suite passed 22/22, and the bind snapshot suite
  passed 15/15. The suite printed 37.9 / 36.3 drawn fps (unhovered / base
  hovered).
- Mutation witnesses, a sample of 13 of the 30 the branch added or changed
  (all 7 annotate; 6 browser, including the per-body hide, the pick, a popup
  and one re-pointed anchor): **13/13 WITNESSED** (each run as
  `--only <id> --repo C:/workspace/tolstack`). The other 17 rest on the
  tactical record (30/30).

## Findings

### Should-fix (filed, not fixed: each changes behaviour or layout)

1. **The parts panel's checkbox cannot show an occurrence that a body checkbox
   hid, and it reads ticked while that occurrence is hidden.** The row's `×5`
   tooltip promises "shows or hides all of them".
   `apps/annotate/app.js` `buildPartRow` reads `isVisible` (`shown` only).
   Filed as `ISSUE_20261026_the_parts_panel_checkbox_cannot_show_an_occurrence_a_body_checkbox_hid.md`.

### Design (filed, non-blocking)

2. **The link joints' new checkbox wraps onto a line of its own.** It is
   visible in the branch's own `2_blade_hidden.png`. The cause is a right
   float appended after an inline-block that fills its line. Filed as
   `ISSUE_20261026_design_the_sweep_rails_joint_checkbox_wraps_onto_its_own_line.md`.

### Nits (recorded only)

- The attach-radius alert names 215177-001, the pitch-plate *installation*.
  The 215735-A detail drawing carries the plate's hole callouts. The handoff
  allowed either drawing, and the alert reads from the edge's own `part`, so I
  am not filing this.
- In sweep mode, a click away from the as-modelled pose now leaves the picked
  face tinted in the pick colour while the gate line says nothing was picked
  for binding. This is the handoff's own design ("selection is not the write
  boundary"). It is worth watching for confusion.

## Inline fixes

None.

## Overlay

Added two Recurring-bugs entries: a second state fact whose old readers still
read only half of it, and reading the branch's own screenshots for layout.

## Post-merge

`git merge integration` reported "Already up to date". Then I ran the full
suite in the review worktree on the merged tree (with my overlay edits and
issues):
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
→ **1 failed, 1572 passed, 1 skipped in 385 s**. It was single process
(`venv-win` has no xdist). Its time was recorded with `suite-time record`:
inside budget. This repo's conftest prints no contention header lines.

- The one failure is the documented worktree-only
  `tests/test_viewer_js_suite.py`. I armed that tier through the seam:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` →
  451/452 passed, with 1 tier skipped. That skip is the tier's own browser
  half, which this diff does not touch.
- The tactical record reads 1573 passed and mine reads 1572. I did not chase
  the difference of one, and it is not a failure.
- The main checkout's `git status` is clean after the run, so `data/` was not
  polluted.
- What this run did not exercise: the full mutation registry and the full
  browser TRUTH tier. Both belong to the batch merge.

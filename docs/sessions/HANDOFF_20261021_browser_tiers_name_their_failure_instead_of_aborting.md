---
priority: med
depends_on: [the_kinematic_study_checks_its_run_its_units_and_shows_its_limit]  # that handoff re-points testAnnotateSweepRail's boot URL in the same runner file; land it first so the two diffs to run_viewer_browser_tests.mjs do not cross
model: sonnet
---

# HANDOFF 2026-10-21 — browser_tiers_name_their_failure_instead_of_aborting: every unmet precondition in the browser tiers becomes a named FAIL, not a suite-killing ERROR

Source: the 2026-10-21 triage sweep. This takes one shape of
`guard_cannot_fail` that five issues describe: **a browser check whose
precondition fails throws, so the suite aborts with an unnamed `ERROR` and
drops every later sub-check.** The mutation tier reads that as a MISS, not a
red. Issues:

- `docs/issues/ISSUE_20260930_the_hover_blocks_browser_checks_dereference_the_very_things_their_own_pushes_guard.md`
- `docs/issues/ISSUE_20260923_the_results_table_browser_check_aborts_its_suite_instead_of_naming_the_defect_it_exists_for.md`
- `docs/issues/ISSUE_20260918_the_browser_tiers_export_locators_are_unscoped_so_a_second_export_on_the_page_breaks_them.md`
- `docs/issues/ISSUE_20260916_the_annotate_flyout_settle_wait_is_named_in_one_half_and_discarded_in_the_other.md`
- `docs/issues/ISSUE_20261020_the_annotate_real_browser_pass_times_out_waiting_for_sweep_bodies_to_resolve.md`

Each one names its exact lines and a fix in the block's own idiom. Read them
all before you start.

Baseline: tolstack `master` after
`the_kinematic_study_checks_its_run_its_units_and_shows_its_limit` has merged.

Scope: `scripts/run_viewer_browser_tests.mjs`, `apps/annotate/run_browser_check.mjs`,
`apps/viewer/fixtures.js` (the demo joint's `assembly_export_ref`, per the
export-locator issue), and any mutation-witness spec your edits move. Do NOT
touch `scripts/run_mutation_witness_tests.mjs`, `scripts/guard_enumeration.mjs`
or `tests/test_mutation_witnesses.py`, which belong to the staged
`mutation_tier_gates_on_every_pin_and_survives_a_board_move`. Do NOT touch
application code under `apps/viewer/` or `apps/annotate/` apart from that one
fixture.

Where you run: the browser tiers need `node_modules/playwright-core`, which
exists only at `C:\workspace\tolstack\node_modules`. Run them from the main
checkout, or junction `node_modules` into your worktree (a review did this on
2026-10-20). The `[real]` sweep checks read
`C:\workspace\tolstack\data\inbox\linkage-sweeps\`, read-only.

## Deliverables

1. **The hover block guards its own subjects.** In `testTheTopologyPage`'s
   hover block, guard the four unguarded dereferences the first issue lists
   (`railPoint(0)`, the study-row badge `closest`, `hitFor(id)`, `rows[0]`).
   Each one should return a shape its existing `push` can read as a failure.
2. **The results-table check names its defect.** In step 3b, handle
   `rows[i]` undefined, `column(label) < 0` and a missing
   `hub_bearing_thermal_fit_m1` with a `wrong.push(...)` and a return, the
   idiom used eight lines above. Re-run the issue's own plant
   (`checks.slice(0, -1)` in `resultsSection`) and show a named FAIL with
   the later six sub-checks still running.
3. **The export locators are scoped, and the fixture gains its export.**
   Scope the three `.el-export--established` locators to their pane
   (`#detail ...`), the way the untraced-row checks are scoped to
   `#stackview`. Then add `assembly_export_ref` to `apps/viewer/fixtures.js`'s
   demo joint, and delete the note there that says why it was absent.
4. **The settle wait counts in both halves.** In `testAnnotateFlyout`, the
   `file://` half's `await paneSettled();` becomes a `push` with the same
   name as the mounted half's, or a sibling name, and execution stops cleanly
   when it is false.
5. **The annotate `--real` pass says why it timed out, then gets fixed if it
   can be.** In `apps/annotate/run_browser_check.mjs`'s `realPass`, the
   600 s `__sweep.bodies.length > 0` wait must print the banner and the page
   errors when it times out, as the earlier `__sweep.frame` wait's `catch`
   already does. Then run
   `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261016-235852`
   and diagnose from what it prints. If bodies never resolve, find out why.
   That may be an application defect: file it as an issue, do not fix it
   here. If the pass is just slower than its timeout, say so with the
   measured time. Either way, nothing after that wait has run since
   2026-10-20, so report what the rest of the pass does once it is reached.
6. **If it recurs: the hover-intent corridor check.** At the 2026-10-21 batch
   merge, `node scripts/run_viewer_browser_tests.mjs` in the main checkout
   failed one sub-check under both `topology file://` and `topology http`:
   `a trigger crossed while the pointer is heading for the open card does
   not steal it` (234/235 each, 26/28 suites). Other suites were loading the
   machine at the time. The block's own comment records the same check
   being flaky under load in 2026-09 (`approachFrom`, around line 1840).
   Run the browser tier three times, at least once alongside the mutation
   tier. If the check fails in any run, make the approach deterministic under
   load and say how. If it is green every time, record the three results in
   the lesson and leave it alone.

## Definition of done

- Each plant named in items 1–4 produces a named `FAIL` line and the rest of
  its suite still runs. Quote the output for each in the lesson.
- `node scripts/run_viewer_browser_tests.mjs`, `node apps/annotate/run_browser_check.mjs`
  (both modes) and the full `node scripts/run_mutation_witness_tests.mjs` are
  green in the main checkout, and so is
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`.
- Lesson (`docs/sessions/lessons/LESSONS_20261021_browser_tiers_name_their_failure_instead_of_aborting.md`):
  each plant and what it printed, the `--real` diagnosis with its measured
  time, and item 6's three results.

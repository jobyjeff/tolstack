---
type: chore
priority: med
status: deferred
area: tests
reporter: agent
class: suite_over_budget
found_by: dispatch/docs/sessions/lessons/LESSONS_20261022_triage_sweep.md
resolution: triage 2026-10-22 (second sweep): med beyond this sweep's BUDGET=3 for tolstack (3 staged); deferred 14 days (the class has no program) | woke 2026-11-05 -- date trigger passed; re-triage | resolved 2026-11-05 (triage): the 11-05 batch-merge candidate ran the default tier in 503 s (1724 passed), recorded inside the 10-min budget; reopen on the next over-budget record | deferred 2026-11-06 (triage) -- med beyond tolstack's budget of 3 (two highs and one class-scoped handoff staged); 14 days
defer_until: 2026-11-20
---

# The default pytest tier runs 12 minutes against a 10-minute budget

Measured at the 2026-10-22 second-sweep batch merge, on the merge candidate
(trunk after merge `ceac363`). Recorded with `suite-time record`: **729 s, OVER
BUDGET by 2m09s**. Result: 3 failed (load-only browser-runner cases, routed
to `the_kill_witness_fix_is_ported_from_drawing_checker`), 1559 passed, 1
skipped. drawing-checker's candidate was loading the workstation during part of
the run.

```
C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q --durations=15 -p no:cacheprovider
```

Top of `--durations=15` (as reported):

| s | test |
|---:|---|
| 201 | `tests/test_mutation_witness_shadow_concurrency.py::test_two_concurrent_runs…` |
| 153 | `tests/test_feature_geometry.py::test_real_both_readers_classify…` |
| 39 / 28 / 22 | `tests/test_browser_runner.py` throw / exit / signal cases |
| 34 | `tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots…` |
| 31 | `tests/test_mutation_witnesses.py` (setup) |
| 26 | `tests/test_annotate_js_suite.py` |
| 20 | `tests/test_topology_projection.py::test_installing_a_mesh…` |

The two shadow-concurrency tests (235 s together) are the obvious first
candidates for a merge-only tier.

## Measurement 2026-10-23 (an_export_lists_every_run_that_consumed_it)

941 s (15m41s) serial, `venv-win/Scripts/python.exe -m pytest -q` in a worktree (no xdist in the venv; the box was loaded). Top of `--durations`: test_browser_runner[throw-True] 231 s, test_mutation_witness_shadow_concurrency two-concurrent-runs 118 s, test_browser_runner[exit-False] 111 s, test_feature_geometry real-readers 107 s, test_annotate_js_suite 57 s, test_mutation_witnesses setup 39 s, test_browser_runner[signal-True] 37 s, shadow_concurrency two-roots 28 s.

## Measurement 2026-10-27 (the_model_is_drawn_in_the_scene, review)

968 s (16m08s) serial, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` in the review worktree, post-merge: `1 failed, 1592 passed, 1 skipped, 2 deselected` (the failure is the documented worktree-only `test_viewer_js_suite`). Over by 6m08s. The same command on the same tree took 366 s in the tactical's run that morning, so most of the spread is box load (a mutation-witness run had just released the browser slot). Neither run had xdist (still absent from the venv), so neither is at the `-n 16` the budget is defined against. `--durations` was not captured.

## Measurement 2026-10-28 (triage batch merge)

615 s (10m15s), `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` in the batch-merge candidate worktree (`28c6f783`, inputs bridged, projections rebuilt in the candidate): `1 failed, 1590 passed, 1 skipped, 2 deselected`. `suite-time record`: OVER BUDGET by 0m15s. Run without `--durations`; the pareto above still stands. The one failure is not a worktree artifact. See `ISSUE_20261028_the_default_tier_is_red_on_every_fresh_projection_because_a_named_real_skip_trips_the_skip_guard.md`.

## Measurement 2026-10-28 (review, the_scene_pane_is_one_flyout_that_reads_over_http)

669 s (11m09s), serial, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`, in the review worktree after the merge: `1 failed, 1593 passed, 1 skipped, 2 deselected`. The one failure is the worktree-only `test_viewer_js_suite`; its tier passed 598/598 through `--repo`. `suite-time record`: OVER BUDGET by 1m09s. The run overlapped a `--changed-since` mutation-witness run that held the browser slot, so the `browser_slot` tests queued behind it. The tactical's run of the same branch alone took 307 s. Still no xdist in the venv, and `--durations` was not captured.

## Measurement 2026-10-29 (triage batch merge)

616 s (10m16s) wall, 614.97 s pytest, serial, `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q --durations=15 -p no:cacheprovider` in the batch-merge candidate worktree (`8a2ae880`, inputs bridged, projections rebuilt in the candidate): `1 failed, 1654 passed, 1 skipped, 2 deselected`. `suite-time record`: OVER BUDGET by 0m16s. The failure is `ISSUE_20261029_a_data_conditional_pair_of_real_guards_reads_as_declared_but_not_run.md`, not a timing matter. Top of `--durations`: test_browser_runner[signal-False] setup 128 s (browser-slot queue) + call 24 s, test_feature_geometry real-readers 83 s, test_annotate_js_suite 51 s, shadow_concurrency corrupt-lock 45 s, test_mutation_witnesses setup 41 s, shadow_concurrency stale-lock 41 s, test_browser_runner[exit-False] 12 s, closing-the-concatenation-seam 11 s, test_viewer_js_suite 11 s, test_browser_runner[throw-True] 9 s, passing-over-the-skip-arm 8 s, topology column order 8 s.

## Measurement 2026-10-29 (the_wheel_the_column_and_fit_behave)

`venv-win/Scripts/python.exe -m pytest -q` (no -n; the pytest.ini here rejects it) took 19m10s in a worktree while a witness run shared the box; an earlier uncontended run took 8m37s and a later one 5m17s. Contention, not growth.

## Measurement 2026-10-29 (tactical, a_face_is_picked_the_way_cad_picks_it)

602 s (10m02s) pytest, serial, `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` in the handoff worktree: `2 failed, 1682 passed, 1 skipped, 2 deselected`. `suite-time record`: OVER BUDGET by 0m02s. The failures are the worktree-only `test_viewer_js_suite` (its `[real]` tier has no projection here) and `test_browser_runner[throw-True]`, which passed on a rerun (`ISSUE_20261022_the_browser_runner_kill_witness_reddens_under_load_here_as_it_did_in_drawing_checker.md`). `-n 16 --dist loadfile` is not available (no xdist in the venv); `--durations` was not captured.

## Measurement 2026-10-29 (review, viewer_browser_checks_wait_on_settled_state)

900 s, but concurrent with an 8 min witness run and the browser slot (tactical measured 473 s alone). Contended, not a regression.

## Measurement 2026-10-29 (review, a_face_is_picked_the_way_cad_picks_it)

334 s pytest, serial, `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider --durations=15` in the review worktree on the merged tree: `1 failed, 1685 passed, 1 skipped, 2 deselected` (the worktree-only `test_viewer_js_suite` skip). `suite-time record`: inside budget.

## Addendum 2026-11-02 (the_all_topology_leader_test_counts_its_views_by_kind)

Measured 601 s (budget 600 s, over by 1 s) for plain `pytest -q` in a worktree, single-process: this venv has no xdist, so `-n 16 --dist loadfile` is rejected as an unrecognised argument.

## Addendum 2026-11-03 (coaxial_ends_share_one_3d_node)

Measured 1192 s against a 600 s budget, so 9m52s over. Command: plain
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, run in a
worktree, single-process (still no xdist). Result: `1 failed, 1687 passed,
1 skipped, 2 deselected`, and the one failure is the worktree-only
`test_viewer_js_suite`. The box was not idle: this session's own browser runs
had just finished, and other agents were live. So treat the doubling over
11-02 as contention until a quiet re-measure says otherwise. I took no
`--durations` this run.

## Addendum 2026-11-03 (review of the_slide_joint_is_the_mounts_bushings_against_the_piston_body)

Measured 1289 s (budget 600 s, over by 11m29s) for
`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
in the review worktree on the merged tree, single-process (no xdist). Result:
`2 failed, 1699 passed, 1 skipped, 2 deselected`. Both reds are checkout-dependent:
`test_viewer_js_suite` and the contact-suggestions `[real]` pairing. The tactical
run of the same tree, a few hours earlier, took 6 m 14 s. That suggests contention
on the box rather than suite growth: about 14 python processes were live
when it finished. Run without `--durations`, so this addendum has no pareto.

## 2026-11-03 measurement (the_dag_holds_still_and_the_filter_bar_stays_put)

`venv-win/Scripts/python.exe -m pytest -q` in a worktree, single process (this
venv has no xdist, so `-n 16` was unrecognised): 1477 s, 1685 passed, 3 failed,
1 skipped, 2 deselected -- over budget by 14m37s. The 3 reds were this branch's
own (inventory rows, two re-anchored specs; fixed after) plus
`test_viewer_js_suite` red in a worktree by design.

## Addendum 2026-11-04 (review of the_dag_holds_still_and_the_filter_bar_stays_put)

Measured 761 s (budget 600 s, over by 2m41s) for
`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider --durations=10`
in the review worktree on the merged tree, single-process (no xdist), sharing the
box with other reviews' browser runs. Result: `2 failed, 1699 passed, 1 skipped,
2 deselected` (the two checkout-dependent reds). Slowest call 10.6 s, so no
single test is the pareto; the time is the count.

## Addendum 2026-11-03 (a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there)

Measured 784 s (budget 600 s, over by 3m04s), serial, `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs -p no:cacheprovider` in the handoff worktree, while two other agents held the browser slot and ran their own tiers on the box: `2 failed, 1686 passed, 1 skipped, 2 deselected` (the worktree-only `test_viewer_js_suite` red, and one witness anchor since re-anchored). No `--durations` was taken on this run. This handoff added no Python test.

## Addendum 2026-11-03 (review of a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there)

Measured 3963 s (budget 600 s, over by 56m03s), serial (no xdist), with
`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -rf`
in the review worktree on the merged tree. Result: `2 failed, 1699 passed, 1 skipped, 2 deselected`.
Both reds depend on the checkout: `test_viewer_js_suite`, and the contact-suggestions
`[real]` pairing. This run shared the box with this review's own browser tier
and its mutation-witness gate, both of them under the browser slot, so most
of the hour is contention and not suite growth. The suite prints no
contention header lines. No `--durations` was taken.

## Addendum 2026-11-05 (stack_wording_drops_filler_and_the_hover_says_the_same_thing)

Default tier, worktree, plain `pytest -q` (the venv has no xdist, so `-n 16` is not available there): 737 s (12m17s), 1728 passed, 2 failed (provenance row, fixed; viewer JS suite red by design in a worktree), over budget by 2m17s.

## Reopened 2026-11-05 (the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what)

One record over budget: **4033 s (67 min)** against 10 min, `OVER BUDGET by
57m13s`. Command:
`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`,
run single-process in the worktree (`-n 16 --dist loadfile` is refused here:
no xdist). Result: 1721 passed, 7 failed, 1 skipped.

This is almost certainly queueing, not test cost. The output sat at 23 dots
for most of the hour while four agents' browser runs, mine among them, held
the machine's one browser slot. The pytest tests that start Chrome ask for
the `browser_slot` fixture and wait their turn, and the wall clock counts the
wait. The same morning's batch-merge candidate measured 503 s. I did not pass
`--durations=15`, so I have no per-test pareto for this run. The class matches
`ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`
(the witness gate): a recorded wall time that includes the slot queue cannot
tell a slow suite from a busy machine.


Same branch, re-run 2026-11-06 with the browser slot free: 407 s,
`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
in the handoff worktree: `1 failed, 1727 passed, 1 skipped, 2 deselected`.
`suite-time record`: inside budget. The failure is the worktree-only
`test_viewer_js_suite` (its tier passed 637/637 through `--repo`). So the 4033 s
above was the slot queue, not the suite.

## Addendum 2026-11-06 (triage sweep batch merge, `found_by: dispatch/docs/sessions/lessons/LESSONS_20261106_triage_sweep.md`)

Merge candidate at `405bad81` (integration tip, fast-forward of master
`66159c33`), run in the throwaway worktree `C:\workspace\tolstack-batchmerge`
with bridged inputs and a freshly rebuilt candidate projection:

- **Measured:** 638 s (10m38s) against the 10-min default budget,
  `suite-time record`: `OVER BUDGET by 0m38s`. pytest's own figure: 636.95 s.
- **Command:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q --durations=15`
  (cwd = candidate worktree; single process, venv has no xdist).
- **Result:** 1738 passed, 1 skipped, 2 deselected. The one skip is
  `tests/test_fit_bound_features.py:424` (the 2026-10-01 pitch-link bearing
  re-extraction is not installed), a data-state skip.
- **Contention:** for its first ~60 s the viewer and annotate node tiers
  (`node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`) ran
  beside it in the same worktree. No browser runner of this sweep was
  running, but other agents' sessions may have been. Compared with 11-05's
  503 s for 1724 tests, the suite gained 14 tests and about 135 s.
- **Top 15 (`--durations=15`):**

  | s | phase | test |
  | ---: | --- | --- |
  | 119.96 | call | tests/test_feature_geometry.py::test_real_both_readers_classify_every_installed_face_the_same |
  | 75.08 | call | tests/test_mutation_witness_shadow_concurrency.py::test_a_stale_lock_pid_dead_is_cleared_with_a_message |
  | 71.13 | setup | tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist |
  | 61.92 | call | tests/test_mutation_witness_shadow_concurrency.py::test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale |
  | 33.08 | call | tests/test_annotate_js_suite.py::test_annotate_js_suite_is_green |
  | 28.76 | call | tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green |
  | 21.67 | call | tests/test_mutation_witnesses.py::test_closing_the_concatenation_seam_is_load_bearing |
  | 16.31 | call | tests/test_mutation_witnesses.py::test_passing_over_the_skip_arm_is_load_bearing |
  | 10.32 | call | tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-False] |
  | 10.17 | call | tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[exit-False] |
  | 7.51 | call | tests/test_topology_projection.py::test_the_column_order_never_makes_a_topology_cross_itself_more |
  | 7.39 | setup | tests/test_topology_projection.py::test_the_l1_topology_is_a_ring_and_draws_as_two_rails |
  | 7.12 | call | tests/test_topology_projection.py::test_a_topology_with_no_bodies_walks_exactly_as_before |
  | 6.99 | call | tests/test_topology_projection.py::test_the_rotor_fasteners_close_links_are_not_a_column_order_problem |
  | 6.06 | call | tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[throw-True] |

  The top four tests (feature-geometry real-mesh classification and the two
  mutation-witness lock-recovery tests) take about 328 s, roughly half the
  tier.

Two later issues in the same class are still open and measure the same tier:
`ISSUE_20261105_the_default_test_tier_ran_18_minutes_on_a_worktree.md` and
`ISSUE_20261105_the_default_tier_ran_12_minutes_beside_the_browser_tier.md`.
Triage should fold them into this one, per the one-issue-per-repo-per-tier rule.

## Addendum 2026-11-08 (review of model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models)
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs` (serial), review worktree with candidate inputs bridged and projections rebuilt from the merge sha: **2161 s (36m01s)**, 1869 passed, 1 skipped, recorded `OVER BUDGET by 26m01s`. **Contended, so this is not a clean measurement:** `run_mutation_witness_tests.mjs --changed-since integration` (29m44s, browser entries under the slot) ran beside it the whole time. The same tree ran 553 s alone on the tactical branch (its lesson's rework record). No `--durations` taken; evidence for "contention, not suite growth".

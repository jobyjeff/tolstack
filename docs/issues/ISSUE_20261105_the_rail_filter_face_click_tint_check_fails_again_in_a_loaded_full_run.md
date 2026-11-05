---
type: bug
priority: low
status: open
area: tests/browser (annotate rail filter suite)
reporter: agent
class: timing_assertion_under_load
found_by: dispatch/docs/sessions/lessons/LESSONS_20261105_triage_sweep.md
---

# The rail filter's "a real click on the face tints it" check fails again in a loaded full run, after the 10-29 deadline raise

At the 2026-11-05 triage batch merge, on the merge candidate (integration
`b58f8ed2`, which already contained master `94d50e3a`, so the merge was a
fast-forward), with `node_modules` bridged into the candidate for this one run:

```
node scripts/run_viewer_browser_tests.mjs          # cwd = the candidate worktree
[annotate rail filter + face deselect] 33/34 sub-checks passed: FAIL
    FAIL sub-check: a real click on the face tints it
40/41 browser checks passed                        # 1357 s wall
```

The default pytest tier (`pytest -q`, single process, ~8 min) was running on the
same box for the first ~8 minutes of that run. Other repos' batch-merge suites
were probably running too. Re-run alone with
`node scripts/run_viewer_browser_tests.mjs --only "annotate rail filter"` on the
same tree right afterwards, the suite went **34/34** in 19 s.

## Why this is filed rather than written off

This is the same sub-check `ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md`
named. `HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state` resolved
that issue by raising the existing tint poll's deadline from 2 s to 15 s
(`LESSONS_20261029_viewer_browser_checks_wait_on_settled_state.md`, table row
"rail filter"). It failed again under load with the 15 s ceiling, so the
ceiling did not remove the race. The check is
`scripts/run_viewer_browser_tests.mjs` around line 9689. It is a conjunction:
`await tinted()` AND `__scene.highlightedFace() !== null`. The red run did not
record which one was false.

## To do

- Log both conjuncts (and how long `tinted()` polled) on failure before choosing
  a fix, as the 11-02 review note on
  `ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md`
  asks for its sibling.
- If the click fires before the mesh's pick target settles, it misses and no
  amount of polling afterwards can turn it into a tint. If so, the fix is to
  wait for a settled scene *before* the click, not a longer ceiling after it.

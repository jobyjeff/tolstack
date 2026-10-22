---
type: bug
priority: med
status: resolved
area: apps/annotate/run_browser_check.mjs
reporter: agent
found_by: docs/sessions/HANDOFF_20261021_browser_runners_take_the_slot_and_free_the_box.md
resolution: verified 2026-10-22 triage: `node apps/annotate/run_browser_check.mjs` (no flags) on the batch-merge candidate d209fc6 reached `--- [real] the rail on vpa-pitch-p2-20261016-235852, cold`, passed every sub-check in it and ran through to the end, 67/67 passed, exit 0. The `.an__rail .el-head` read no longer times out
---

# The annotate check's `railRealPass` times out on `.an__rail .el-head`

`node apps/annotate/run_browser_check.mjs` (the mock pass, no flags) passes
every mock check, reaches `--- [real] the rail on vpa-pitch-p2-20261016-235852,
cold`, and dies about 30 s later:

```
locator.innerText: Timeout 30000ms exceeded.
  - waiting for locator('.an__rail .el-head')
    at railRealPass (apps/annotate/run_browser_check.mjs, the `headText` read
    after `sweep off`)
```

It is an uncaught throw, so the run exits 1 with no summary line and nothing
after `railRealPass` runs (`contextViewPass`, `reducedMotionTimingPass`, and
`realPass` under `--real`).

Reproduced six times on 2026-10-21 in this worktree. The first run was on the
unmodified tree, before handoff `browser_runners_take_the_slot_and_free_the_box`
changed anything (no CPU cap, no slot), so it is not that handoff's doing. The
others ran under the new 4-core CPU cap and failed the same way at the same
line. The pass came in 2026-10-20 (`the_annotator_rail_resizes_and_names_what_it_lists`),
whose lesson reports it green, so something since then moved the element-list
head, or the studyless topology no longer renders its list after `sweep off`.

Not the `realPass` bodies wait
(`ISSUE_20261020_the_annotate_real_browser_pass_times_out_waiting_for_sweep_bodies_to_resolve.md`,
handed to `browser_tiers_name_their_failure_instead_of_aborting`). This one
fires earlier and with no flag. The same handoff's "a failed precondition is a
named FAIL" shape applies: the read should be a `check(...)` that names the
missing head, not an uncaught throw.

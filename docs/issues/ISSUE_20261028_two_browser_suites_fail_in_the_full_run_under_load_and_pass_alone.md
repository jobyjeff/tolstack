---
type: bug
priority: low
status: deferred
area: tests
reporter: agent
class: timing_assertion_under_load
defer_until: class:timing_assertion_under_load
resolution: triage 2026-10-28 -- low, deferred by default onto the class program (forge browser_runner_close_paths_survive_a_loaded_box); same shape as the forge/wiki/atp-post load reds
found_by: dispatch/docs/sessions/lessons/LESSONS_20261028_triage_sweep.md
---

# Two browser suites failed in the full run under load and passed when re-run alone

At the 2026-10-28 triage batch merge, in the main checkout at `28c6f783` right
after `scripts/rebuild_projections.ps1` (other repos' batch-merge suites were
running on the box at the same time):

```
node scripts/run_viewer_browser_tests.mjs        # 284 s
31/33 browser checks passed
[annotate rail filter + face deselect] 33/34 sub-checks passed: FAIL
    FAIL sub-check: a real click on the face tints it
[crop lightbox (launch, zoom, pan on the live crops)] ABORTED after 2 sub-checks, 1 of them already FAILED
    FAIL sub-check: the launcher takes keyboard focus and becomes visible when it does — ...
[crop lightbox (...)] ERROR: page.waitForSelector: Timeout 10000ms exceeded.
  - waiting for locator('#crop-lightbox[open]') to be visible
```

Re-run immediately, same tree, one suite at a time:

```
node scripts/run_viewer_browser_tests.mjs --only "annotate rail filter"   -> 34/34 PASS
node scripts/run_viewer_browser_tests.mjs --only "crop lightbox"          -> 20/20 PASS
```

So both are load- or order-sensitive rather than regressions: neither the
merge's diff nor the projections changed between the runs. A merge-tier check
that fails nondeterministically costs a rerun at every gate and trains readers
to discount reds. Find what each check waits on (a fixed timeout, a first-paint
race, focus stolen by an earlier suite in the same page) and make it wait on
the condition instead of the clock; if it is order-dependent, the `--only` pass
alone does not prove it.

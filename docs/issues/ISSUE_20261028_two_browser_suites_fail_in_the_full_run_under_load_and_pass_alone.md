---
type: bug
priority: low
status: triaged
area: tests
reporter: agent
class: timing_assertion_under_load
defer_until: class:timing_assertion_under_load
resolution: triage 2026-10-28 -- low, deferred by default onto the class program (forge browser_runner_close_paths_survive_a_loaded_box); same shape as the forge/wiki/atp-post load reds -- woke 2026-10-28 -- browser_runner_close_paths_survive_a_loaded_box completed; re-triage
found_by: dispatch/docs/sessions/lessons/LESSONS_20261028_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
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

## Addendum 2026-10-28 (an_interface_suggests_the_faces_that_touch)

Seen again on that branch's full run (32/35, 348 s, against a scratch data root
built from the branch), with a **third** suite in the same shape:

```
[3D pane follows the selection (sweep, bind, reload, hover)] 31/32: FAIL
    FAIL sub-check: [real] ...and leaving it takes the light down
[annotate rail filter + face deselect] 33/34: FAIL
    FAIL sub-check: a real click on the face tints it
[crop lightbox (launch, zoom, pan on the live crops)] ABORTED after 2 sub-checks
```

Each of the three passed alone straight afterwards (32/32, 34/34, 20/20),
against the same scratch root. That branch does run new code on the annotator's
selection path (`suggest` now also colours touching faces), so the third suite
is put down to load on the strength of it passing alone, not of a code reading.

## Addendum 2026-10-28 (review of an_interface_suggests_the_faces_that_touch)

Same pair again on the review's full run of the merged tree (33/35, 351 s,
`--repo` the tactical's scratch root): `3D pane follows the selection`
("…leaving it takes the light down") and `crop lightbox` (launcher focus).
Each passed alone with `--only` immediately after (1/1, 1/1).

## Addendum 2026-10-29 (review of the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances)

On the merged tree at `939977a0` (after `an_interface_suggests_the_faces_that_touch`
landed), with projections rebuilt from that tree into a scratch root, the full
run failed `annotate rail filter + face deselect` 33/34 on "a real click on the
face tints it" (341 s). **It also failed alone:** two back-to-back
`--only "annotate rail filter"` runs gave 34/34, then 33/34 on the same check.
A failure with only one suite running is weak evidence for the load theory.
It points instead at a race on the annotator's selection path, which
`suggest` now also colours. On the earlier merged tree at `ad93af9e`, before
that landing, the same suite passed 34/34 in the full run.

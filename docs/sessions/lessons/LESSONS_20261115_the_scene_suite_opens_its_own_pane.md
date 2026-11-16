# Lessons — the_scene_suite_opens_its_own_pane (2026-11-15)

## Cause

The storage hypothesis in the issue was **not** it, and the original red did **not reproduce**: on this tree
`--only "annotate model in the scene …"` was 22/22 before any change.

What the whole tier showed once the swallowing `.catch` was replaced by a throw: the
`#pane-handle` click *lands* (the pane opens) and then Playwright waits for "scheduled navigations
to finish" while the page boots the scene. That wait outlasted the 5000 ms click timeout, the
timeout was swallowed by `.catch(() => {})`, and on a loaded box the code after it ran before the
iframe existed (`querySelector("#annotate-flyout iframe")` null, nine `[real]` reds). Fix: click with
`noWaitAfter: true` and a 15 s timeout, then wait for `#annotate-flyout[open]` and the iframe.
Not proven to be the 2026-11-12 failure's exact trigger (it did not reproduce), but it is the one
swallowed timeout the tier produced.

## What changed

`openPaneByHandle(page)` in `scripts/run_viewer_browser_tests.mjs`: idempotent (clicks only while the pane
is closed), throws if the pane or iframe never appears. Used by the three suites that swallowed the click
with nothing asserting it: `annotate model in the scene`, `3D pane follows the selection` (the 1920 block),
`leaders across the seam`.

Left alone, each asserts the pane is open on the very next push so a failure is already named:
`3D pane` served-beside check (~7886), `…the handle opens the pane…` (~11781 area, served as
drawing-checker serves it). The unswallowed clicks (`mock=1`, the two bare `.click()` sites) already throw.

## Records

- `--only "annotate model in the scene …"`: 22/22 (before and after).
- Whole tier, first run with a 5 s `click` (42m24s, 40/44): the three helper sites failed from the
  timeout above; fixed. The re-run of the whole tier was **not** repeated (42 min); the three affected
  suites were re-run with `--only`: model-in-scene 22/22, leaders-across-the-seam 25/25, 3D-pane-follows
  31/31. The review's post-merge tier run is the whole-tier confirmation.
- `the model drawn alone and led` is 21/23 on this branch **and on the unchanged HEAD script**
  (two hover-lighting checks); already filed on integration as
  `ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_…`. The first
  whole-tier run's `leaves it takes the light down` failure in `3D pane follows` was a one-off:
  31/31 alone.
- Witness `--only "[real] a camera move posts the anchors again"` (an entry in the model suite): witnessed.
- Default pytest (worktree): 1 failed, 1986 passed, 1 skipped, 2 deselected, 473 s (inside the 10 min budget).
  The one failure is the documented worktree-only `test_viewer_js_suite` (no `data/projections`).
- The `--changed-since master` gate was not run (review's).

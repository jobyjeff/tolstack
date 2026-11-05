# Lessons 2026-11-02 — the_browser_tier_is_green_on_trunk_again

Both reds were the check, not the product. Neither fix touches `apps/`.

## Annotator notice: a stale check, caused by `c21a06bb`

- **Evidence.** In `c21a06bb`'s parent, the owner-not-in-set form's catch
  was `setBanner("Record failed: " + err.message, "error")`. On a hosted page
  `err.message` is `AA.READ_ONLY_WRITE`, so `#notice-text` contained it and
  the check passed. `c21a06bb` replaced that catch with
  `setWriteFailure("Record", err)`. The banner now reads
  `AA.bindFailureWords(err, "Record")`, which is `Record failed · binding is
  not available here`, and the storage sentence moved to `#notice-text`'s
  `title` (hover). That was deliberate: the commit's lesson lists `Record
  failed` among the surfaces it reached, and `run_tests.cjs` pins the words.
  The read-only path never lost its notice.
- **Fix.** The check now asserts the banner text equals
  `AA.bindFailureWords(new Error(AA.READ_ONLY_WRITE), "Record")` **and** the
  hover equals `AA.READ_ONLY_WRITE`, both read from the app. It checks more
  than before, not less. I didn't run a code bisect in a browser, because
  reading the diff settles which side was wrong (one changed line, quoted
  above).

## Respine: a race in the check, not a regression

- **Evidence.** I wrapped `VA.animateTopoPane` and `VA.renderTopoPane` in
  the page and traced one study click on the product graph. The transition
  starts, and frames are drawn with `tweening: true` and a ghost in the pane.
  But each frame took **0.1–1.2 s** (106 walk rows), and Playwright's
  `click()` resolved about 1.4 s after the transition began. `catchFrame`
  only started sampling after `click()` returned, so whether it saw a frame
  in flight depended on how loaded the box was: 30/35 on one run, 43/44 on
  the next, with no code change in between. The suite already widens the
  duration to 1200 ms (`RESPINE_SUITE_DURATION_MS`), and that didn't help.
  Widening the window only moves where the race is.
- **Fix (the `timing_assertion_under_load` lever).** `catchFrame(selector)`
  now clicks **inside** `page.evaluate` and checks after every animation
  frame. A study or walk click reaches `respine()` through
  `navigate()`'s worksheet promise, so frame 1 is drawn in a task. The
  loop's rAF callback was registered before the step's, so it runs first in
  the next frame and always sees frame 1, however long a frame takes. The
  3 s deadline became 15 s, and it's only a ceiling on a wait for an event.
  The suite's own interruption check already used this shape
  (`caughtMidFlight`).
- **Semantics.** The caught frame is now usually frame 1 (t ≈ 0). That frame
  already passed before whenever the old sampler happened to land on it. The
  width check pairs at the frame's own `t`, and "carries the scroll onto the
  FIRST frame" is a better witness when it's literally frame 1.
- **The DoD's "35/35".** That count is from a run where the first check
  failed, and that check gates nine dependents. With it passing, the suite is
  **44/44**.

## Gotchas

- A worktree can run the browser tier if you junction the main checkout's
  `node_modules` in (`New-Item -ItemType Junction`) and pass
  `--repo C:/workspace/tolstack`. Git doesn't track the junction.
- Python `'\\n'` inside a bash `<<'EOF'` heredoc that writes JS source turns
  into a real newline in the JS string. Use a different separator in scratch
  instrumentation.
- The repo's pytest has no xdist (`-n` isn't recognised). Run it serially:
  about 6 min here.

## Verification (all from this worktree; main checkout's data and node_modules)

- `--only "annotate hosted posture"`: 15/15 alone, and 15/15 in the full run.
  `--only "topology file:// respine"`: 44/44 alone, and 44/44 in the full run.
- Full browser tier (`node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack`, 1294 s): **39/40**. The one red is
  `3D pane follows the selection` (31/32, the unbound-row hover check). Run
  alone it went 28/32 on four *other* sub-checks. That suite isn't in this
  handoff's scope: the nav-gesture four are already filed
  (`ISSUE_20261029_four_3d_pane_nav_gesture_checks_…`, addendum added) and
  the hover flake is filed as
  `ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md`.
- `pytest -q`: 1687 passed, 1 skipped (the bearing re-extraction isn't
  installed), 1 failed (`test_viewer_js_suite`, the documented worktree red).
  373 s. `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`:
  629/629. `node apps/annotate/run_tests.cjs`: 269/269.
- `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo
  C:/workspace/tolstack`: 2/2 witnessed, exit 0, 59 s.
- Projections weren't rebuilt. The tier didn't refuse them, and this diff
  changes no projection input.

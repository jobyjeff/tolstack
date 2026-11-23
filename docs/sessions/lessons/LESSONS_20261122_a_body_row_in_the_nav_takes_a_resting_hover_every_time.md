# LESSONS 2026-11-22 — a_body_row_in_the_nav_takes_a_resting_hover_every_time

## The mechanism, and the measurement that settled it

The check was wrong, not the nav. **The body row is never rebuilt under the
pointer.** The check hovered while the pane was still opening the model.

Two failing `--only "3D pane follows"` runs, with temporary probes in the check
(all of them removed afterwards):

- **A MutationObserver on `#navtree`** for the whole 20 s window saw **zero**
  removals of the body row. That rules out the issue's suspect (an
  `annotate:tree` re-render). `renderSceneSlot` only repaints feature slots,
  and none exists at that point.
- **The Playwright call log, untruncated:** `locator.hover` got through
  "element is visible and stable … done scrolling" and stalled at
  **"performing hover action"**. That means the input event was dispatched and
  the renderer never acknowledged it. The check's old DIAG cut errors at 120
  characters, which removed exactly that line.
- **Timestamps:** a `until(lit, …, 1500)` returned after **15 s**, and the
  first 5 s hover timed out before the loop even started. So the page's main
  thread was starved.
- **A CPU profile (CDP `Profiler`) over the window:** `_loadPart` 2.8 s,
  `classifyFaces`/`AA.classifyPartFaces` 2.7 s, three.js `render` 2.6 s,
  `setLightLayers`→`AA.faceSubGeometry` 1.3 s. Long tasks of 0.3–3.1 s ran back
  to back for 20 s+. The pane is a **same-origin iframe, so it shares the
  page's renderer main thread**: its opening work starves the page's input
  and polls too, not just its own queue.
- **The barrier:** after `__sweep.bodies` was already true (0.5 s), a
  `scene-view` posted through the pane's `annotate:exec` queue was answered
  **14.9 s** later. With that wait in front of the hover, the light was on
  ~250 ms after the hover, 31/31.

The fix is the map suite's existing barrier (2026-11-18,
`the_map_pin_hover_lights_its_bound_face_in_the_scene`): post a command behind
everything the page has posted and wait for its `annotate:result`. The light
assertion is unchanged. The leave-and-re-enter loop stays as it was, because
the rail can still rebuild once the pane has settled.

The product half was **already filed**:
`ISSUE_20261119_a_hover_waits_behind_the_pane_opening_its_model_before_the_scene_lights_it.md`
(deferred to 2026-12-05). I appended a sighting with the new fact: the lag
reaches the page's own input, not only the scene's light. So option 2 in that
issue shortens the queue but, if the context parts still load on the shared
thread, it does not remove the lag. The routed issue (`ISSUE_20261105_…`) got
an addendum: the row is not rebuilt, and the 11-05 "light out under a resting
pointer" was not reproduced.

## Surprises

- `__sweep.bodies` is **not** "the pane is settled". It is true 0.5 s in, and
  then the queue stays ~15 s deep. Wait on the queue round-trip.
- Why a whole-tier run reds this while `--only` sometimes passes: the queue
  depth and the thread starvation scale with box load. That is the same shape
  the 11-19 issue's table shows (5.5 s quiet, 34 s busy).
- The very first `--only` of the session aborted at `div.kmverdict` (30 s)
  because the projections were stale. `scripts/rebuild_projections.ps1` took
  over 10 minutes on this box (the PowerShell tool's timeout moved it to the
  background, and it finished fine).
- An after-fix run that overlapped my own fast node tiers went red on the next
  check, `...and leaving it takes the light down`, which had no DIAG. I gave
  it one: what the page and the pane held, and the tail of the leave hover's
  error. What it asserts is unchanged.

## Gotchas for the next agent

- A bash heredoc that pipes Python into `python -` hung (the Windows `python`
  stub). Write the edit script with the Write tool and run it with the venv
  interpreter, as the memory already says.
- Keep the **tail** of a Playwright error, not the head: the stage where it
  stalled is the last line of the call log.

## Test record

All runs were from the worktree against the main checkout's data, with
projections rebuilt first from `c3928f9a` (`scripts/rebuild_projections.ps1`,
in the main checkout).

- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "3D pane follows"`:
  - first batch of five after the fix: 30/31, then 31/31 ×4. Run 1's red was
    `...and leaving it takes the light down`, which had no DIAG then, and the
    run overlapped my fast node tiers.
  - after adding that DIAG: **31/31 five in a row**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 623/623.
  `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: 333/333.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` (worktree,
  single process; `-n` is not installed): 2585 passed, 2 failed, 1 skipped,
  602 s. The two reds are not this diff's:
  - `test_viewer_js_suite`: the documented worktree red.
  - `test_export_runs_match_the_run_log`: a 6th drawing-checker run, already
    filed as `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_…`,
    with its fix completed on integration after this branch was cut.
  - Over budget by 2 s, appended to `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only browser__real-resting-on-a-body-row-in-the-nav-lights-that-body-i__07c48b28 --only browser__real-and-leaving-it-takes-the-light-down__3c44a05c`:
  2/2 witnessed, 6m59s.

## Blocked actions

- The DoD's "`--only "3D pane follows"` once beside a default `pytest -q`" was
  not run. The command started the browser run detached (`( node … --only "3D
  pane follows" > "$TMP/beside.txt" 2>&1 & )`) and pytest in the foreground.
  It was refused by the auto-mode classifier: `[Destructive or Unwanted
  Actions]`. I did not re-shape it. The review's post-merge whole browser
  tier, or an operator-approved concurrent run, covers it.

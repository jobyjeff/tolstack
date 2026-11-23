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

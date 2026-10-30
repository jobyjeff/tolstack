# Lessons — the_rearrange_animates_and_centres_the_active_study

- **Most of the animation already existed.** `VA.animateTopoPane` (per-frame
  render from an interpolated store + fading ghost) was built by
  `viewer_study_respine_animation`. What was missing was the *landing*: arrival
  Fit top-aligned the band. This handoff centres it instead.
- **Duration:** `VA.RESPINE.duration` 260 -> 300 ms (the one constant). The
  easing stays ease-in-out cubic (`VA.respineEase`, pinned by fast-tier tests);
  the handoff said ease-out, which I did not change.
- **Landing = `fitDagTo(true, true)`.** Scale only goes *down* to Fit and only
  if the band doesn't fit at the reader's zoom. Vertical and horizontal centring
  use the lit bars' bounding box. Page/hscroll clamp what they cannot reach, so
  the remainder is taken up by `margin-top/left` on `.tv__zoomsizer`, kept in
  `state.bandPad` and drawn by `renderTopoPane` (`ctx.bandPad`) so a repaint
  does not lose it. Dropped on the next study change, when the pane/window size
  differs from what it was computed for, and when the annotate flyout
  opens (dots would be pushed out of the narrower pane -> leaders skipped);
  re-landed on flyout close.
- **Interaction with the 10-28 sideways scroll:** `keepSideways` is still true
  for the landing; centring adds a sideways scroll only when the drawing is
  wider than the pane, otherwise margin-left.
- **Bug found:** the landing used to hang on `respineHandle.onSettled`, but a
  second paint of the same serialisation cancels the tween, so the frame was
  silently lost (visible in the mock page). Now a `landingPending` flag runs on
  the first paint that is not mid-tween.
- **Not met:** "no element removed and re-added" — the renderer rebuilds every
  frame (29/29 ids churned). Reported, issue filed
  (`ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md`). No
  screen recording / shots folder was produced (headless-only session).
- Worktree: `node_modules` was junctioned from the main checkout to run the
  browser tier (gitignored). The two `shadow_concurrency` pytest failures and
  `test_viewer_js_suite` are worktree artefacts (no projections / stale `tmp`
  shadow dirs), not this change.

## Addenda
- **Sideways scroll:** a reader parked sideways (`scrollLeft > 0`) keeps it;
  the landing then centres vertically only (the real tier's "settles where the
  reader was" check pins the 10-28 contract). From the left edge it also
  centres horizontally.
- **Witness changes:** retired the `at compact density, Fit frames the whole
  band` spec — centring now keeps the band in view at scale 1, so its `to = 1`
  mutation reddens the arrival guard (already witnessed by its own spec) and
  not the declared Fit-button check; that Fit-button guard is now unwitnessed.
  `each study is framed once the re-arrange settles` now mutates the
  `landingPending` flag. Two specs added for the new guards; census pin
  re-written (735/702).
- **Test record:** worktree, `node apps/viewer/run_tests.cjs` 507/507 (node-fs
  tier skipped: no projections in a worktree); browser tier 35/35 (real tier
  armed via `--repo` main data for witnesses); pytest -q: 1683 passed, 1 failed
  (`test_viewer_js_suite`, the documented worktree-only red) before the final
  spec rename; witness tests re-run after: 44 passed. `--changed-since
  integration` witnesses: all witnessed after the repairs above (re-run
  individually). The full pytest took 26 min under browser-slot contention.
- No three-frame shots were produced.

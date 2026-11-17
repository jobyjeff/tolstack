---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-16 — the_window_resize_reclamp_holds_on_a_cold_run: the resize re-clamp works on a cold page, and its check passes in any order

Source: `docs/issues/ISSUE_20261116_the_window_resize_check_is_red_alone_and_green_in_the_whole_browser_tier.md`
(high), staged by the second 2026-11-16 triage sweep. Baseline: tolstack master
`5584fbfe`. Scope: the resize path in `apps/viewer/topology_app.js` (the
debounced `resize` listener, `refitPane`, `roomBesideFlyout`) and the suite
`testWindowResizeReclamps` in `scripts/run_viewer_browser_tests.mjs`. Do NOT
touch the map's drawing (`VA.mapLayout`) or other suites, unless deliverable 2
proves one of them leaks state into this one.

## Deliverables

1. **Find out why the fix does nothing on a cold run, and fix the product.**
   `node scripts/run_viewer_browser_tests.mjs --only "a window resize re-clamps"`
   in the main checkout prints `region 1841 (3D 1829) at 5120 -> 0 (3D 1829)
   after the shrink`. Those are the pre-fix numbers, so on that run the 3D view
   is never re-clamped. Instrument the listener and say in the lesson which of
   these it is: the listener never fires, it fires while `nodes.flyout.open` is
   false, it fires but `refitPane()` clamps to the same width (what
   `roomBesideFlyout()` and `graphNeed()` returned), or something else. Fix it
   in the product so a reader's resize re-clamps on a cold page too.
2. **Order independence (the class, not the instance).** Find out why the whole
   tier passed, for example state that an earlier suite leaves in the shared
   browser or storage. If a suite leaks state into a later one, make this suite
   start from a known state, and name in the lesson any other suite that
   depends on order the same way. Do not fix those others here.
3. **Re-witness.** `browser__real-shrinking-the-window-to-1920-re-clamps-the-pane-the__fa30ff82`
   must come back `WITNESSED` with the witness runner's `--only`.

## Definition of done

- `--only "a window resize re-clamps"` 3/3 green **three times in a row**, and
  the suite green inside a whole-tier run.
- `node scripts/run_mutation_witness_tests.mjs --only browser__real-shrinking-the-window-to-1920-re-clamps-the-pane-the__fa30ff82` WITNESSED.
- tolstack default tier green (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20261116_the_window_resize_reclamp_holds_on_a_cold_run.md`):
  the root cause, with the measured numbers before and after.

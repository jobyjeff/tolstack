# Lessons — the_window_resize_reclamp_holds_on_a_cold_run

## Root cause: "something else" — the clamp was right, and late

None of the handoff's first three guesses. Instrumented in the page (a
`resize` listener, a wrapper timing every 150 ms timer, a MutationObserver on
`#annotate-flyout`'s `style`, a `longtask` PerformanceObserver; times in ms
from just before the shrink), a red cold run:

| event | ms |
| --- | ---: |
| long task (2988 ms) starts | 42 |
| `resize` event delivered (innerWidth 1920) | 3602 |
| the debounce's timer fires (736 ms late) | 4338 |
| `refitPane()` writes `473px` | 4832 |

> **Correction, 2026-11-17 (review).** Two readings of this table. The timer
> fired 736 ms **after the event** (4338 − 3602). That is **586 ms late**
> against its 150 ms due time. And the 4832 row is when the `style`
> MutationObserver **recorded** the write. Its callback is a microtask and runs
> only after the whole timer callback returns, including `render()`. So
> `refitPane()` wrote `473px` somewhere between 4338 and 4832, not at 4832.
> Neither reading changes the root cause.

The listener **fires**, the flyout **is open**, and `refitPane()` clamps to
the **right** width (473, a fresh load's). But the ~3 s of 3D-scene work left
over from `open()` (the annotator's first part load and render, same main
thread as the shell) delays the resize event, and the clamp then sat behind a
150 ms debounce on top of it. The suite's `settle(1200)` is wall-clock time,
so its read ran **between** the resize (layout at 1920, flyout still 1829 →
region 0) and the timer. Another red run had the long task (2948 ms) start
77 ms *after* the resize, before the 150 ms timer, and the timer fired 4319 ms
late. Same race, other side.

Pre-fix cold failure rate this session: 2 of 6 runs alone (`--only`). Every red
printed `1841 (3D 1829) -> 0 (3D 1829)`.

## The fix (product)

`apps/viewer/topology_app.js`, the `resize` listener: `applyPaneWidth()` and
`refitPane()` now run **in the event**; only `render()` stays debounced. Resize
steps run before the next paint, so no frame is painted with the region 0
wide, and the scene's `ResizeObserver` sees the final width, so it draws once
at 473 instead of at 1829 and then again. After the fix the probe shows
`flyout.style 473px` at the same millisecond as `resize`. The long task still
happens, but it is no longer in front of the clamp.

## The suite reads on the page's clock

`testWindowResizeReclamps` replaced `settle(1200)` with two
`requestAnimationFrame`s in the page, which run after the resize steps of the
same frame, followed by the read. This reads the first layout the page could
paint, however loaded the box is. It also pins *in-the-event* rather than just
*eventually*: the pre-fix code under the new read was red in 1 of 2 runs (green
only when a stall let the 150 ms timer win). The witness spec's `find` moved
with the line (its indent changed); same mutation, same `expect_red`.

After: `1841 (3D 1829) -> 485 (3D 473)`, fresh load `485 (3D 473)`. Results
are in the hand-back report.

## Order independence (deliverable 2): no leaked state

The runner's `browser.newPage` makes a **new context per page**, so
localStorage, sessionStorage and HTTP cache start empty for every suite, and
this suite seeds its own `dagDrawing`. No storage leaks into it. What a whole
tier shares between suites is the **browser process**, and its GPU process in
particular (compiled WebGL programs). After the map suite, which opens the same
scene, the pre-fix timer fired at 522 ms and the big task (3494 ms) came after
it. Warm, the race goes the clamp's way more often. It was never a state
dependency, so there is no "known state" to reset, and I found no other suite
that depends on order through storage. Any suite that reads a layout after a
fixed wall-clock settle while the 3D pane loads has the same exposure. That class is
already filed on integration as
`docs/issues/ISSUE_20260918_three_browser_tier_resizes_measure_through_the_apps_own_debounce.md`
(`class: wall_clock_dependence`, deferred), so nothing new is filed. Its fix
shape is the two-frame read used here. Note that only the clamp left the
debounce; `render()` is still behind it.

## Gotchas

- `run_viewer_browser_tests.mjs` has no `--help`: an unknown flag runs the
  **whole tier**. It took the slot until stopped.
- `--only` is a substring match and only the first `--only` counts. `"the map ("`
  selects both the map suite and this one, in tier order, which is a handy
  order-dependence probe.
- `Emulation.setCPUThrottlingRate` is a poor reproduction here: it also delays
  Playwright's own `evaluate`, which then reads after the clamp.
- The tolstack venv has no `pytest-xdist`, so `-n 16 --dist loadfile` is an
  argparse error. Run `-q` bare.

## Shots

`shots/the_window_resize_reclamp_holds_on_a_cold_run/first_frame_after_shrink_1920.png`
is the first frame after the shrink, read two animation frames after the
resize: 3D 473, map whole inside its 485 px region. The scene's canvas is not
yet re-drawn there.

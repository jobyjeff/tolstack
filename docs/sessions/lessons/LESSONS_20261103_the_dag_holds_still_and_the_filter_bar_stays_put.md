# LESSONS 2026-11-03 — the_dag_holds_still_and_the_filter_bar_stays_put

Evidence: `docs/sessions/lessons/shots/the_dag_holds_still_and_the_filter_bar_stays_put/`
(`before_respine.png`, `after_respine.png`, `after_respine_back.png` — 12 frames, 25–30 ms of
page time apart, plus the `.json` probe beside each; `look_top.png`, `look_scrolled.png` —
the click-around at scroll 0 and scrolled).

## The measured cause of each symptom

| symptom | measured cause | fix |
| --- | --- | --- |
| Snap left, animate, snap back | The 10-29 landing's pad (`.tv__zoomsizer` margin, 219 px on the real stops study) was dropped on the first transition frame and put back by `fitDagTo` after it settled: `marginLeft` 219 → 0 → 202 in `before_respine.json`. The page scroll did the same (140 → 146 → 2258 in one frame). | The landing is measured on the target laid out at rest *before* the tween (`landing.target()` in `VA.animateTopoPane`), and pad, sideways scroll and page scroll are interpolated with it (`landingHooks`). `after_respine.json`: pad 219 → 202 monotone, scroll 140 → 2258 over the frames. |
| Click jumps the DAG sideways | **Not reproduced for node, edge, sub-stack label or grid-row clicks** — rest, parked sideways, 3D pane open, chain page: `scrollLeft` and pad unchanged. (The one sideways move I saw was Playwright's own scroll-into-view on a forced row click, a harness artefact.) The click that *does* move it is a study title in the DAG (`data-study-open`), which opens that study: a respine + landing, i.e. the snap above. | The snap fix makes that click continuous. A guard now clicks all four other kinds, parked and not, and fails on any change to `scrollLeft` or pad. |
| Top clipped | The first group's field starts 2 px above its first row and its title above that; the drawing began at y = 0, so ~10 px was cut by the SVG's edge (not by the bar). | `VA.DAG_FIT.topInset` (24 px, sized for the widest zoom) via `fit.inset` in `rowPositions`: both blocks shift together, leaders unchanged. |
| Filter bar scrolls away | `.tv__toolbar` was not sticky; the grid header pinned to the page bar. `47px` was written in 8 places. | `--bar-h`/`--filter-h` declared once in `style.css`, written from the measured bars (`VA.syncStickyOffsets`); toolbar sticky; `VA.stickyOffsets().top` is the one edge the header pin and Fit use. |
| Leaders too bright | Lit leaders used `--rail-odd` (the edge ink) on both tiers. | `--leader-ink` on both. |

## Decisions not in the handoff

- **`--leader-ink` is ~60 % of the edge ink's luminance, not 40–50 %.** The two requirements conflict:
  half luminance reads 2.8:1 against the page, under the 3:1 floor. I took the floor as binding;
  the guard asserts 3:1.
- **`DAG_ZOOM.min` 0.15 → 0.12.** The pinned filter bar wraps to two rows at 1600 px (~90 px) and
  with the page bar leaves ~140 px unscrolling; the tallest walk no longer fit at 0.15.
  The fast test that derives the floor now allows 150 px of pinned chrome.
- A virtual page clock (`scripts/virtual_clock.mjs`) makes every transition check deterministic:
  screenshots take ~1 s here, longer than the 260 ms tween, so the filmstrip and the new
  continuity guard step `Date.now`/`performance.now`/rAF by hand. Playwright's own click waits on
  animation frames, so while the clock is frozen drive the page with dispatched events and
  `waitForFunction(..., {polling: ms})`.

## What the click-around found that the DoD did not ask about

- The ghost of the outgoing layout kept the old scroll while the live pane moved, which put the
  existing "ghost shows the same horizontal window" check red (no mutation applied — it was
  my change). Fixed in `placed()`.
- A probe that counted `.rail__bar--on` in `#topopane` counted the ghost's bars too and made a
  continuous move look like a jump. Probes exclude `.tv__ghost`.
- The mutation tier's anchors: three older specs anchored on text I changed (`47px`, the topbar
  read, the animator's render `try`); re-pointed, and all three re-witnessed (the never-blinks
  one after the ghost fix, 6m37s). The six new specs are witnessed too.

## Not done / state

- `ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md` stays open: the pane is still
  rebuilt every frame (the landing adds one extra render). The wheel-zoom repaint issue stays:
  nothing here touched it.
- Filed: `ISSUE_20261103_opening_the_3d_pane_and_other_landings_still_snap_the_dag.md` (pane
  open/close, a zoom-down at landing, the two-row filter bar).
- Pre-existing reds, identical on master: `3D pane follows the selection` — the nav type-chip
  check and the unbound-contributor hover check (already filed on integration).
- Default tier wall time 1477 s single-process (no xdist in this venv): over budget; measurement
  appended to the open `suite_over_budget` issue.

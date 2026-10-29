# Lessons — the_dag_is_zoomable_and_a_length_mode_draws_to_scale (2026-10-28)

What the next agent cannot derive from the code. The README's "A scaled mode
takes the height it needs" and "Zoom, Fit and the grid header" sections say what
the page does; this says what was measured and decided on the way.

## Decisions the handoff did not make

**The window is not a budget, and the fit is gone rather than dormant.**
`VA.fitEdgeLength`, `VA.dagHeightBudget`, `paneBudget` and the `collapsed` rule
in `rowPositions` are deleted; `fit` is now `{ plan }`. A caller that still
passes `budget` is ignored (a test pins it, and pins that the functions are
gone). Many older tests pass `{ budget: 0, plan }` and were left alone — the key
is inert, not wrong. `EDGE_LENGTH_SCALE.maxRows` stays **6**: on the real model
that is 8 distinct bar lengths in each scaled mode, and raising it only makes
the walk taller (12 rows → ~7700px under tolerance width) without making more
bars legible.

**The minimum legible bar length is the existing floor: one row, 26px at
comfortable density (16px compact).** A bar clamped up to it wears the break
mark and says "not to scale"; so does a bar with nothing to scale by. On the real
model 31 of the 95 edges have no dimension at all, so they are floored in every
scaled mode — that is the data, not the mode.

**Walk height per mode on the real model** (`vpa_pitch_linkage`, 169 rows, 74
nodes, 95 edges, comfortable density, computed from the projection's own
ratios): uniform 4394px; tolerance width ≈ 5510px (57 of 95 bars on the floor,
31 of them valueless); feature size ≈ 4796px (86 on the floor — most nominals
are 0, the variation-only edges). Compact density scales all three by 16/26.
These are for orientation only; the real-model test asserts the *relations*
(uniform = floor, scaled > floor, ≥ 3 distinct lengths), not the figures.

**Zoom bounds `{ min: 0.15, max: 2, step: 1.15 }`.** `min` is chosen so the
tallest mode's walk fits a 900px pane (0.15 × 5510 ≈ 826); a real-model test
re-derives that, so a taller walk fails the test instead of becoming
unreachable. `max` 2 is where the 26px rows are 52px. `step` is one wheel notch
(deltaY 100); the factor is proportional to the delta so a trackpad is smooth.
Fit never goes past 1 — it is "show me all of it", not "magnify it".

**The wheel only zooms over the drawing; Ctrl/Cmd+wheel zooms from anywhere over
the pane.** The document is the scroller on every page but the kinematic one, so
a pane that swallowed every wheel would trap the reader on a 4000px page. A drag
on the drawing's *empty* space pans (SVG background, bands, body fields — never
a bar, dot or leader); it scrolls the page, or the bounded pane on the
kinematic page, and the pane's sideways scroll.

## Things that were surprising

**`position: sticky` cannot pin the header, whatever it is moved into.** The
handoff asked for the head to be "sticky to the grid's own scroll container".
Measured: any descendant of `.tv__hscroll` has that box as its nearest
scrollport, and it never scrolls vertically (`overflow-x: auto` computes
`overflow-y: auto`, but `height: max-content`). Making it scroll vertically
would undo the full-page-scroll decision `testHeightBudget` pins. So the head is
an absolutely positioned child of `.tv__zoom` sitting just above the first grid
row, and `VA.pinTopoHead` writes its `top` from the scroll events (synchronously,
in the capture listener, so it does not trail by a frame). It uses `top`, not a
transform, because the respine test reads a settled head's `style.transform` as
an unfinished transition.

**A scale on an ancestor breaks `position: sticky` by (k − 1) × the scroll.**
Measured: at k = 1.0245 with 300px of sideways scroll the rails were 7.35px off
the pane's edge — Chrome applies the sticky offset in the box's own pixels. At a
scale other than 1 the rails and the jog grip therefore ride a `--tv-shift`
variable (`VA.syncTopoScroll`, `.tv__zoom--scaled` in the stylesheet); at 1 the
original sticky is untouched. Cost: at k ≠ 1 they follow the scroll *event*, so
the rails can trail a compositor-scrolled grid by a frame. Do not "simplify"
this back to sticky without re-measuring at k ≠ 1 (the browser suite does).

**`CORRESPONDENCE_IN_PAGE` read path points as screen pixels.** It added
`getPointAtLength().y` to the SVG's top; under a zoom those are in the SVG's own
pixels and have to be scaled by the painted box. Fixed (it now reads
`rect.width / width attribute`); any new harness measuring a rail point from
`getPointAtLength`/`getBBox` needs the same.

**A second `VA.bootTopology()` stacks a second copy of every document/pane
listener** (the page's own comment on the mousemove listener says so; every
real-data probe does it). The wheel zoomed two steps and the drag panned twice as
far until `wireZoom` was made idempotent per pane element (`zoomWiredOn`,
`zoomKeyWired`). Any listener this page adds in `boot()` needs the same guard.

**Moving the header moved the grips.** The jog and column grips live in the
header, so a test that took `.tvgrip--jog`'s `boundingBox()` at the top of the
page now has to scroll it into view first (`scrollIntoView` in `dragBy`), and the
divider drag in the same suite has to aim from the top of the page.

## For the rearrange handoff (`the_active_study_is_a_compact_band…`)

**Anchor space for leaders.** Everything the rails SVG draws is in the SVG's own
pixels, and `.tv__zoom`'s `transform: scale(k)` is the only thing that maps them
to the screen. Two consumers cross that boundary and both read the painted scale
rather than the app state:

* the seam leaders (`drawSeamLeaders`) take `k = rect.width / drawn.width` and
  draw `r.left + d[0] * k`, `bendX: r.left + bend * k`;
* the harness measures `rect.width / svg width attribute`.

The DAG↔grid leaders are inside the SVG and scale with it for free. A
rearrange that tweens positions must keep drawing in SVG pixels and let the
transform scale them; one that reads a rect and writes it back as an SVG
coordinate needs `/ k`. `VA.lastTopoRender.span` is `{top, bottom}` in
`.tv__zoom`'s own (unscaled) pixels — it already includes the body's top padding
(`max(0, headHeight − gridOffset)`, which pushes rails and grid down together so
the header always has room above the first row). If the rearrange changes where
the grid starts, `data-natural-top` / `data-block-bottom` on `.tv__head` are the
two numbers the pin reads.

`state.dagZoom` is per page and is *not* reset by a topology or study switch;
Fit is one click (key `0`). The rearrange may want to Fit on its own transition.

## Verified, and what was not

* fast tier, main-checkout projections: `node apps/viewer/run_tests.cjs --repo
  C:\workspace	olstack` -- 598/598.
* browser tier: `node scripts/run_viewer_browser_tests.mjs --repo
  C:\workspace	olstack` -- 34/34 suites, 5m10s, on a quiet machine.
* `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo
  C:\workspace	olstack` -- 51 witnessed, 26m16s. One NOT WITNESSED (my own
  header-above-the-first-row browser spec: the pin rewrites `style.top` from the
  same number, so mutating the one style write was invisible); re-pointed at
  `headTop` and re-run: WITNESSED. The lit-span fast spec had the same kind of
  first miss (its test widened the span with the grid block); the test was
  tightened. Two existing specs were re-pointed (`dots[id]`, `dotClip`).
* pytest -q in the worktree: 1590 passed, 1 skipped, 1 failed -- the failure is
  `test_viewer_js_suite_is_green`, red by design in a worktree (no `data/`).
* **The crop-lightbox suite failed in two full browser runs and passed alone and
  in the final full run.** The two failing runs overlapped with other heavy jobs
  (witness shadow trees, pytest); the passing full run was alone. Treat it as
  load-sensitive (focus is stolen when the detail pane re-renders late), not as
  caused by this change -- but I could not run an untouched-tree full run to
  prove it (a `git archive` copy cannot find the real-data index).

## Not done / follow-ups

* The grips now sit with the header above the first grid row, not at the top of
  the pane; a reader scrolled up in the DAG has to scroll to them. That is the
  handoff's own design (the header rides with the grid), noted here because it
  moves where the drag affordances are found.

---
handoff: respine_tween_fidelity
date: 2026-09-15
---

# Lessons — respine_tween_fidelity

## The two questions the handoff asked the lesson for, answered first

**Which of the three x diagnoses was true?** All three describe the same code
and only one of them is the defect.

- *"x is absent from the keyed position store"* — **literally true.** A slot is
  `{top, height, y, floored, id, kind}`; the store's top level is
  `{mode, height, dagHeight, gridHeight, offset, gridOffset, byRow, nodes,
  edges}`. There is no x anywhere in it and `VA.tweenPositions` adds none.
- *"present but not interpolated"* — false.
- *"interpolated against a wrong origin"* — **true, and this is the defect.**
  The substitute for the missing x was one whole-block CSS translate,
  `(1 − e) × (fromWidth − toWidth)`, right-anchored on the outgoing frame's
  **grid seam**. Two things are wrong with that origin, and they are separable:

  1. a pane width is rails **plus the jog zone**, and the zone's width is a
     function of the **leader count**, which the two serialisations disagree
     about independently of their column counts. On the real `pitch_system` the
     rails travel 180px (9 columns × a 20px gutter) and the widths differ by
     234px — so every mark was over-shifted by 54px and even the *surviving*
     spine was drawn left of where it had just been;
  2. more fundamentally, **no anchor can work.** The pane's left edge is fixed
     at 0, each frame is right-justified against its own grid, and the two
     grids are hundreds of pixels apart — so anchoring the *wider* incoming
     block on the narrower outgoing one's right edge necessarily puts its left
     part outside the pane. The issue reported nine branch rails clipped;
     measured, it was **all 45 marks**, the leftmost at x = −219.

  The issue's own list of ways out is worth re-reading with (2) in hand: it
  ruled out "clamp the shift to ≥ 0" (the spine snaps 234px) and "left-pad
  `.tv__hscroll` during the transition" (untried). Both are dead for the same
  reason. Padding plus an equal negative translate **is the identity** — the
  content lands where the clamp would have put it — so the padding idea is the
  clamp idea wearing a hat. There is no third position for a block slide.

**Did the two bugs share one cause?** **No, and it is measured rather than
argued.** The original `topology.js` with *only* item 2's fix applied (both
`from`-only carry-over loops deleted, nothing else) still produces
`shift = −234` at e = 0 with 45 of 45 marks off-pane and the leftmost rail at
−219 — bit for bit what it produced before. `VA.respineShift` read
`leaderGeo.width`, which is a pure function of `(layout.columns,
plan.leaders.length, metrics)` and never of the store's key set. Two fixes, two
causes.

## What replaced it: interpolate the drawn LAYOUT, not the finished picture

`VA.respineX(layout, plan, metrics, from, e, zoneScale)` →
`{ columnShift, width }`.

The insight the first design missed is that the two serialisations **do** have
something to pair their rails on, just not an element key: **depth from the
spine.** Both are right-justified (`viewer_dag_spine_layout` mirrored the
allocation), so the mainline is the last column of either and a fork sits the
same number of columns in from it on both sides. So the thing to interpolate is
the **column count**, and a drawn column index is
`max(0, column − columnShift)`:

- a **surviving** column lands exactly where the outgoing frame drew it at
  e = 0 and exactly where a fresh render draws it at e = 1;
- a column the respine **adds** has no outgoing x at all, and the `max(0, …)`
  clamp is the answer — it collapses onto the leftmost rail and **unfolds out of
  the spine** rather than arriving from a place it never was.

The second half is the **pane width**, interpolated as a width because the jog
zone's own width does not follow from the columns. The SVG is drawn at it, and
because `.tv__body` is a flex row with `.tv__rails { flex: none }` the grid
table beside it and the header padded to sit over it follow with **no transform
anywhere**. Deleting the translate was the last step, not the first.

Three things fall out that are worth knowing before touching this again:

- **the zone stretches, and `scale` was already the mechanism for that.**
  `leaderGeometry` spread its lanes across `naturalZone × zoneScale`; it now
  spreads them across `(width − zoneLeft)`, which *equals* `naturalZone ×
  clampJogZoneScale(pref)` at rest, exactly, so there is no branch and a
  settled frame is the reader's own preference. The reported `zoneScale` field
  stays the preference, not the stretch.
- **`zoneMetrics()` exists because two callers needed the same sum.**
  `leaderGeometry` reports the pane width and `respineX` interpolates it; a
  second copy of `zoneLeft + naturalZone × scale` is precisely the drift
  `CLAUDE.md` calls this repo's most-repeated defect. Resist computing the
  width in the view to break the ordering problem — pass the previous frame's
  `{columns, width}` in and let the geometry own the arithmetic.
- **`VA.lastTopoRender.columns` is the count the frame was DRAWN with, and it
  is fractional mid-flight.** That is what makes a respine interrupting a
  respine continue from the picture on screen. It was the only mutation of
  eleven that survived the first sweep (see below) — nothing exercised a
  double click.

## Two traps in the geometry that are not obvious from reading it

- **An outermost `<svg>` clips to its own viewport.** The CSS UA stylesheet
  gives it `overflow: hidden`, so content at an internal x past the `width`
  attribute simply is not drawn. The intermediate design I discarded — hold the
  added columns at their settled x and keep the block translate — put internal
  x up to 355 in a 316px SVG and would have lost two rails to that, silently.
  Any respine design has to keep every drawn x inside `[0, width]` *and* the
  drawn block inside the pane; the two constraints together are what force the
  width to be interpolated.
- **The added columns are the LEFTMOST drawn ones**, not the highest-numbered.
  `VA.spineRight` mirrors `c → columns − 1 − c`, so depth from the spine is the
  *original* column index and the drawn index runs the other way. Getting this
  backwards produces a plausible-looking animation that unfolds from the wrong
  side.

## Mutation testing: eleven one-line reverts, every one observed failing

Written from the two deliverables *and* from the new conditionals in the diff,
which is the `viewer_study_respine_animation` review's own transferable rule
(`docs/prompts/REVIEW_AGENT.md`, "The deliverable is mutation-tested and the
guard the author added on their OWN initiative is not").

Ten died in the fast tier immediately: the `max(0, …)` clamp, the column
interpolation, the width interpolation, the rails' read of the tween, the
leaders' node-end read of it, the zone stretch, the view's `respineX` call,
both carry-over loops put back one at a time, and the whole-block translate
restored. **One survived** — `lastTopoRender.columns` recording
`layout.columns` instead of the drawn count — and it bought the interrupt-
continuity test that now covers it. The generalisable bit is the same one the
review found: the survivor was the line that serves a *second* reader
(the animator reading its own record back), and a test list written from the
deliverables does not enumerate second readers.

The browser tier earns its place here separately. With the pre-fix behaviour
restored (`xTween = null` plus the translate) it reports
`deselect leftmost drawn box: -158.3px` — a real `getBoundingClientRect`
against the pane's own box, which is the only form of "inside the pane" that
is not a re-reading of the store the render used.

**One flake, self-inflicted, worth not repeating.** The in-flight width witness
was first written as "strictly between the two serialisations' widths", and it
failed one run in four: the probe keeps the **first** frame it catches, and it
caught one at `t = 0.00017`, where the interpolated width *is* the outgoing
serialisation's to the pixel. "Strictly between" is the wrong shape for any
in-flight assertion for exactly this reason — the endpoints are reachable and
one of them is the continuity claim. Pair the measurement against the frame's
own reported `t` instead (`lerpWidth(to, from, t)`, against two **settled**
measurements): it is flake-free, it is stronger, and it still fails at every
`t` including 0 on a build that does not tween the width — which is how it was
re-checked.

## Left undone

- `BRIEF_20260915_respine_scope_and_grid_motion`'s **item 1 has not been
  decided** (the brief has no outcome section and no handoff is staged against
  it), so the respine's code survives and this work stands. It is also
  orthogonal to the decision: if a respine ever becomes a re-columning, both
  serialisations have the same column count and the same leader set,
  `respineX` returns `{columnShift: 0, width: toWidth}`, and the horizontal
  tween becomes a no-op rather than something to unpick.
- `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_has_no_fade.md`
  — latent, unobservable on any committed document (all 21 study chains are
  one column with no links), and it becomes real under exactly the
  re-columning above.
- `ISSUE_20260915_the_respine_is_unwitnessed_with_the_pane_scrolled_sideways.md`
  — the pane's *content width* now changes during a transition where it used to
  be constant, so a clamped `scrollLeft` is a new thing to check and nothing
  checks it.

## Verified

- `node apps/viewer/run_tests.cjs`: 296/296 (worktree, mock tier only).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 357/357.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  18/18 suites; the respine suite 33/33 sub-checks (was 30/30). Run three
  times consecutively after the flake below was fixed, all green.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  869 passed, 1 skipped.
- Diagnosis and both directions of every frame measured off the real
  `pitch_system` projection, read by absolute path from the main checkout;
  nothing was rebuilt.
- `node_modules` was junctioned from the main checkout for `playwright-core`
  (the `viewer_leader_grid_legibility` trick, recorded again in
  `viewer_study_respine_animation`'s lesson) and **removed before finishing**.

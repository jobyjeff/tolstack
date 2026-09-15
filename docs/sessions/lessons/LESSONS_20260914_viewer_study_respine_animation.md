---
handoff: viewer_study_respine_animation
date: 2026-09-14
---

# Lessons — viewer_study_respine_animation

## The measured animation cost the handoff asked for

Real `pitch_system`, real projection, a 1600 × 1000 window, Chrome 152, served
over HTTP. Frame cost is the time the animator's own rAF callback spends —
`VA.tweenPositions` plus a whole `renderTopoPane` — measured by wrapping
`requestAnimationFrame` in the page.

| direction | frames | mean | max | budget |
|---|---|---|---|---|
| select a study (45 slots → 21) | 15 | 1.83ms | 2.10ms | 16.7ms |
| deselect (21 → 45) | 15 | 2.82ms | 4.30ms | 16.7ms |

15 frames over a 260ms transition is 60fps with no dropped frames, and the
worst frame uses **a quarter** of its budget. Re-rendering the entire pane per
frame — the whole SVG plus a row per edge — turned out to be cheap enough that
none of the obvious optimisations (patching attributes in place, hoisting the
grid out of the loop, `will-change`) is worth its complexity. The deselect
direction is the expensive one for the obvious reason: it draws the 45-slot
walk, and it also re-appends the ghost subtree every frame.

`VA.RESPINE.duration` is 260ms. Anything under ~180 read as a flicker rather
than a movement on this DAG; anything over ~350 and a reader who clicked a
study is visibly waiting for the answer.

## What the store interpolation could not express: x, and only x

This is the other thing the handoff asked the lesson for, and the answer is
sharp. `VA.tweenPositions` handles y completely — every slot, every node, every
edge, the four block scalars — and cannot touch x at all:

**a mark's x is `VA.railX(row.column)`, and a rail is not a keyed row.** Rails,
fan-out curves and loop closures are indexed by *column*, not by element, so
there is nothing to pair them on across two serialisations (the walk has ten
columns, every chain has one). Interpolating the marks' x while their rails
stayed on the target's columns draws dots floating beside the lines they sit
on — which is worse than not animating x at all.

So the horizontal change is absorbed as **one whole-block CSS translate**
(`VA.respineShift`), right-anchored on the outgoing frame's grid seam: the
first frame puts the incoming grid's left edge exactly where the outgoing one
had it, and the slide settles at zero. That works because both serialisations
are already right-justified against the jog zone (`viewer_dag_spine_layout`),
so anchoring on the right means the *spine itself barely moves* — which is
what "the chain lands on the spine" should look like.

Its one visible cost is the grow direction:
`ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides.md`.
The real fix is not in the animator at all — it is
`ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_whole_walk.md`,
because two serialisations with the same column count need no slide.

## The handoff carried two readings of deliverable 1, and they are not compatible

Worth knowing before the next person reads the same words. Deliverable 1 says
*"the rest of the graph re-lays around it to the left"*, which describes
re-columning the **whole walk** around the selected chain. Deliverable 2 says
*"a node absent from one side (study re-lay drops non-chain rows in chain
view)"*, which describes the **chain layout**, where the rest of the graph is
not on screen to re-lay. Only the second is buildable under the same handoff's
own fences ("do not build a second layout path", "do NOT touch
`scripts/build_*` or projection schemas"), and it is the one that ships. The
other reading is filed with the four things a strategy session would have to
decide, including the one that has no obvious answer: what "root the walk at
this chain" means when no depth-first walk of the graph has that chain as its
mainline.

**The generalisable bit:** when two deliverables of one handoff disagree, the
one that names a mechanism ("the existing *Showing: study chain* re-lay",
"drops non-chain rows") is the one the author had in mind; the one that paints
a picture is the ambition behind it. Build the mechanism, file the picture.

## Three design decisions that are not in the handoff

1. **Selecting a study now changes `layoutMode`.** That is what "re-spine"
   means here — the chain layout became the default for a study that sums, and
   the toolbar's toggle (still there, still labelled) puts the marked walk
   back. It moves a landed affordance: `tvrow--on` / `tvrow--off` marking is
   no longer what a study click lands on, and the browser tier's
   "selecting a study marks its chain and dims the rest" had to move behind
   the toggle. Two other suites had to click the toggle back too
   (`testHeightBudget`, both blocks): every contract in that function is about
   the height the *whole* serialisation demands of the page, and a 21-slot
   chain fits a viewport its 45-slot walk does not — which is the case being
   tested.

2. **The outgoing frame is kept, not re-drawn.** The rows a chain drops exist
   only in the *other* serialisation, so the target layout the frames are
   drawn from has nothing to draw them from, and drawing them from the
   outgoing layout is the second layout path the handoff forbids. So
   `ghostOf()` re-parents the already-rendered `.tv__hscroll` into an inert
   overlay and the animator fades it. Not `cloneNode` — the DOM shim the fast
   tier runs in has none, and a clone would duplicate every click handler in
   the pane for the length of the transition.

3. **The grid cross-fades; the DAG does not.** First cut had the ghost at full
   opacity with the live frame solid on top, which is right for the DAG (its
   surviving marks start exactly where they were and separate from there, so
   the ghost reads as a motion trail) and **garbled text** for the grid, whose
   two tables have different rows in a different order and cannot be lined up.
   A screenshot at e = 0 is what showed it. Filed as
   `ISSUE_20260915_the_grid_cross_fades_through_a_respine_instead_of_moving_its_rows.md`.
   The ghost's own column header is suppressed for the same reason inverted:
   it is the *same* header in both serialisations, so a fading copy is pure
   double image with nothing to say.

## Gotchas that cost time, or would have

- **An animation frame runs outside every try/catch this page has.** Every
  other path into a render goes through `topology_app.js`'s one seam (the
  2026-09-09 silently-empty-pane incident is why it exists); a frame running
  off a rAF callback does not, so a throw in one is an unhandled error with the
  pane frozen mid-transition — exactly the incident, again. `animateTopoPane`
  takes an `onError` and the shell passes `renderCrash`. There is a check for
  it in both tiers, and the browser one has to seed the throw on the **second**
  render (the first frame is synchronous and would be caught anyway).

- **A paint that is not the transition's own frame must cancel it.** A frame
  renders from the `ctx` captured at the animation's start, so a density or
  length-mode change landing mid-flight is silently undone by the next frame.
  `paint()` cancels unconditionally, before it decides anything.

  Testing that is where it got subtle: **two Playwright clicks in a row do not
  interrupt anything**, because a study click reaches `respine()` through
  `loadWorksheet().then(…)` — the toolbar's paint lands *before* the transition
  starts, and then there is nothing to interrupt and the mutation survives
  green. The check has to make both clicks inside one `page.evaluate`, holding
  the second until `lastTopoRender.tweening` is actually true, and it asserts
  that it caught a frame so it can never go vacuous again. Also: **density is
  the wrong preference to test it with** — `VA.applyRowDensity` mutates
  `VA.RAIL_METRICS.rowHeight` *in place*, so a stale frame still reads the new
  row height and the defect is invisible. The length mode rides on the `ctx`
  and shows it.

- **Clicking the nav row of the topology already open would animate a no-op**,
  laying a fading ghost of the page over the identical page — and it broke four
  existing `[real]` checks, because mid-flight the pane holds *two* sets of
  `tr.tvrow` and the counts double. `respine()` now compares
  `(mode, topologyId, studyId, layoutMode)` against what the last paint drew
  and only arms when one of them changed. Two `[real]` loops in the browser
  tier also had to start waiting for `!tweening` instead of a fixed 50ms: any
  count taken mid-transition is a count of two serialisations.

- **A mutation sweep backgrounded with `&` inside the Bash tool detaches and
  keeps running.** The tool returned "started" and exited; the python kept
  cycling mutations into `apps/viewer/topology_app.js` for the next half hour,
  which showed up as a browser tier that had been 18/18 going 16/18 with no
  source change I had made, and as a `git status` entry I had already reverted
  once. Use the tool's own `run_in_background`, and if a suite goes red with no
  explanation, check `git diff` before believing it. `Get-CimInstance
  Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine
  -like '*mutate*' }` is how to find the culprit.

- **`floored` had to settle to the target's flag, not stay OR-ed.** A bar
  floored on either side wears the not-to-scale mark for the whole flight
  (mid-transition nothing is a measured proportion, so the honest mark is the
  one that never under-claims) — but at `e = 1` the target's flag is the only
  one left, or `tweenPositions(from, to, 1)` would not equal the target store
  and the browser tier's break-mark count would disagree with it. `e >= 1` is
  an explicit arm in `flooredDuring`.

- **No shared edge of the demo fixture floors on one side only** — the two that
  floor (`arm_pin_to_tip`, `tip_to_strut_end`) are exactly the two the chain
  drops — so the rule above is unobservable on it and its first test was
  vacuous (the mutation survived). It is tested on two hand-built stores
  instead, with the fixture's own configuration asserted beside it so the
  reason is on the record.

- **`line.rail__bar` carries no `data-id`.** Only the hit twin
  (`rail__barhit`) is `wire()`d, so a test looking up a bar by element id has
  to query the twin. Same for the visible leader path vs `rail__leaderhit`.

## Mutation testing: 21 one-line reverts, every one observed failing

The `viewer_dag_spine_layout` review's transferable rule — *when a deliverable
is a call site rather than a computation, test the call site* — was applied up
front rather than after a REQUEST CHANGES. Every wiring line was reverted one
at a time in the live tree and the suite re-run.

**13 in the pure/view layer, against the fast tier:** the tween call in
`renderTopoPane`, the block slide, the grid cross-fade, re-appending the ghost,
hiding the ghost's header, the per-element fade, the settled frame being a
*plain* render, the reduced-motion branch, the cancel guard, `id`/`kind` on the
store's slots, both arms of `flooredDuring`, and the enter/exit alpha.

**8 in the app shell, against the browser tier** (`topology_app.js` is not
loaded by `run_tests.cjs` at all, so the fast tier is structurally blind to
it): the study click choosing the chain layout, the study click animating,
deselecting animating, the toggle animating, `paint()` handing the captured
store to the animator, the no-op guard, the error sink, and cancelling a
running transition.

**Three survived the first pass** and each one taught something: the
per-element fade (no test rendered the *deselect* direction, where things
arrive), `flooredDuring` (the vacuous fixture above), and the interrupt cancel
(the two-clicks-do-not-interrupt trap above). `A3`/`A4` — deselecting and the
toggle animating — survived until the browser tier grew a reusable in-flight
probe: a settled-state check passes just as well on a repaint, so *each*
control that is supposed to animate needs its own frame caught.

## One fence worth keeping

`VA.lastTopoRender` now records **every** paint, tween frames included, and
carries `width` (the SVG's own width, which is the grid's left edge) and
`tweening`. The `viewer_dag_spine_layout` review's warning still stands —
anything reading it is asking the view-model, not the page. In this handoff it
is read for exactly two things: the animator's `from` store, and the browser
tier's *wait predicate*. Every assertion in the new browser suite is measured
off the DOM. Keep it that way.

## Verified

- `node apps/viewer/run_tests.cjs`: 287/287 (worktree, mock tier only).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 346/346.
  Both of `viewer_dag_spine_layout`'s reported reds are gone — the branches
  that owned that shared-`data/` drift have since landed.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  18/18 suites. The new respine suite is 30/30 sub-checks; the topology page is
  149/149 and the height budget 20/20, both after their study-select blocks
  were reworked for the new default.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  869 passed, 1 skipped.
- By eye, on the real `pitch_system` in Chrome: the transition frozen at
  e = 0, 0.25, 0.5, 0.75 and 1 in both directions (pin `VA.respineEase` to a
  constant and no-op `requestAnimationFrame` — much easier than freezing the
  clock, which a promise in the click path defeats).
- `node_modules` was junctioned from the main checkout for `playwright-core`
  (the `viewer_leader_grid_legibility` lesson's trick) and **removed before
  finishing**.

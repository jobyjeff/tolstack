---
type: chore
priority: low
status: triaged
area: viewer/respine
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260915_viewer_respine_whole_walk.md
strategy: docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md
---

# `VA.tweenAlpha`'s per-element fade can no longer be reached by any click — keep it, or retire it?

`viewer_respine_whole_walk` (2026-09-15) made the DAG always the topology's own
walk. Both sides of every respine are therefore the same serialisation, so
`VA.rowPositions` produces the **same key set** on both sides,
`VA.tweenPositions`' `leaving`/`out.alpha` maps come out empty at every `e`,
and `VA.tweenAlpha` returns `1` for everything the view asks it about.

Measured on all five committed topologies × 21 studies: node keys, edge keys
and every node's `y` are identical between the deselected walk and each study's
emphasized frame. Only `gridOffset` and the pane width differ.

## What that leaves

- `VA.tweenPositions`' entering/leaving arms and `out.alpha` — pure, unit
  tested, not reached by the app.
- `renderTopoPane`'s `fade()` and its two call sites (rail marks, grid rows) —
  reached every frame, always a no-op.
- The render-level test "an element the transition ADDS fades in at its own
  settled position", which this session re-based onto a **synthetic** outgoing
  store (the study's own `study.layout`, which the page no longer draws) and
  labelled as such.

This session kept all three, on the same reasoning the round-2 lesson gives for
the shared-column link fade: the functions are pure, the guarantee is about any
two serialisations rather than about whatever the corpus holds, `study.layout`
is still built and still in the projection, and the cost is two lines in the
view.

## Why it is a strategy question and not a cleanup

The honest alternatives are not equivalent:

- **Keep** (today). Two lines of no-op in the hot path, a synthetic test whose
  subject a reader cannot reach, and one more thing to keep true. The
  `LESSONS_20260915_surfaces_that_state_something_false` rule is arguably
  strained by a mechanism whose comment describes a transition that cannot
  happen — this session reworded the comments to say so explicitly, which is a
  patch on the symptom.
- **Retire.** Delete `alpha` from the store, `VA.tweenAlpha`, `fade()` and the
  synthetic test. Smaller and truer to what the page does — and it is the
  thing that would have to be rebuilt, correctly, the day a layout change
  makes a respine add or drop a DAG element again. `BRIEF_20260914_dag_layout_
  geometry_tradeoffs` item 2 (column repacking) is exactly such a change and is
  still open.

So the answer depends on a decision that has not been made yet, which is why
this routes to strategy rather than to a tactical delete. Sequence it after the
geometry brief.

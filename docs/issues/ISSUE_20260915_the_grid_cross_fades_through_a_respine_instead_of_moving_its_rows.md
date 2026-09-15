---
type: feature
priority: low
status: triaged
area: viewer/topology
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260915_respine_scope_and_grid_motion.md
---

# The grid cross-fades through a respine; its rows do not move

## What ships

`viewer_study_respine_animation` moves the **DAG** — every dot, bar, rail mark
and leader travels from its old slot to its new one, interpolated out of the
keyed position store. The **grid beside it does not**: the incoming table is
drawn in the target order at opacity `e` while the outgoing one fades from `1`
over it, so a reader sees one table resolve into another rather than rows
sliding into place.

That was a deliberate call and it is in `apps/viewer/README.md`. Two reasons:

- **the grid's rows are not positioned from the store at all.** The table's
  pitch is fixed at `rowHeight` and only the *block's* `gridOffset` tweens —
  which is the landed contract the leaders' grid-side seams are computed from
  (`viewer_dag_spine_layout`: "the block moves, the pitch does not");
- **the two tables cannot be lined up.** A chain's grid rows are a different
  subset of the edges in a different order and a different count; drawn solid
  over each other at `e = 0` they read as garbled text (measured — it was the
  first cut, and the screenshot is why this is a cross-fade).

## What a better version would need

A FLIP-style per-row transition: measure each surviving `<tr>`'s box before and
after, then `transform: translateY()` each one from its old position to zero
while the leaving rows fade in place. The obstacles are real and worth writing
down before someone starts:

- a `<tr>` cannot be taken out of flow (`position: absolute` on a table row
  drops it out of the table's box generation), so **leaving** rows cannot be
  held in place while the survivors close the gap — they would have to be
  transformed too, and the table's own height would have to be animated
  separately;
- the grid is a **real `<table>` on purpose** (a rectangular selection must
  paste into Excel as columns — `views/topology.js`'s own comment), so
  "just use a div grid" is not available;
- whatever moves has to keep the **leader seam contract** true at every
  settled frame: a leader's grid end is `gridOffset + boundary × rowHeight`,
  and the browser tier's `CORRESPONDENCE_IN_PAGE` measures it against the real
  row box. A transform does not move a `getBoundingClientRect()`… except it
  does, which is the whole difficulty: mid-transform the row box is not where
  the seam arithmetic says it is. The current design sidesteps that by never
  moving a row.

Nothing is broken. This is the next increment in fidelity, and it has no owner
once `viewer_study_respine_animation` completes.

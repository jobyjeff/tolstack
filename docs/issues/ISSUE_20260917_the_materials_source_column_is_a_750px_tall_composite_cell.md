---
type: bug
priority: med
status: resolved
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
found_by: docs/sessions/HANDOFF_20260916_design_pass_typography.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `reader_facing_surfaces_second_pass` moved to completed/; not independently verified.
---

# One materials row is 750px tall, because its source column is the composite cell the elements table already retired

## What was measured

`hub_bearing_thermal_fit_m1`, live data, at 1600x1000 with the preview pane at
its 560px default. The first `tr.mat-row` (`AL_7050_T7451`) renders **750px
tall**, and every one of its six cells reports that height because one of them
sets it:

```
row                     750px
td                      750px   AL_7050_T7451
td                      750px   7050-T7451 AMS4050 · plate / billet, max billet thi…
td.num                  750px   23.04
td.num                  750px   — not stated / applied over 20 … 72, 20 … -20 °C
td                      750px   hub_bore_lower, hub_bore_upper
td.el-row__source       750px   UNTRACED workbook designation: traced 260209_Hub Bear…
```

No single descendant is over 300px tall, so the height is the **sum** of the
source cell's stacked children. `views/stack.js`'s `materialSourcingCell` puts
chips, the where-line, the designation source, the values line, the library ref,
a CINDAS request note and the crop trigger in one 260px-wide column, one under
the next.

`design_pass_typography` (2026-09-17) took the two bites CSS had. Tightening the
citation note's preview clamp (4.6em -> 2.8em) brought the same row from
**750px to 653px** at this viewport, and the row is no longer rendered entirely
in 700-weight white. Both leave the shape untouched: 653px is still about seven
times a data row in the elements table beside it (measured there: 88-112px), and
the stack's three materials still occupy roughly two screens.

See the before/after pair,
`docs/sessions/lessons/LESSONS_20260916_design_pass_typography_9_stack_materials_table_before.png`
and `..._after.png` — shot at 2200px so the source column is in frame at all,
which is the other thing this surface hides: at an ordinary window width the
column driving the height sits outside the table's own box.

## Why this is the elements table's own retired defect, still live here

`apps/viewer/style.css` records what the elements table did about exactly this,
in the comment above `.el-row`:

> Grid-like rows: a fixed, compact source column instead of the multi-line
> composite cell this replaced (chips + where + callout + note + export block +
> crop trigger, up to 340px wide and tall enough to make the table read like a
> list). Full detail — callout, note, export block, crop — moved to the right
> pane (views/detail.js); the row keeps just enough to decide whether to click
> it.

The materials table never took that treatment. It is the same cell, in the same
stylesheet, with the same consequence: the table reads as a list of blocks
rather than as a table, and the columns beside the tall cell are acres of empty
space with one number stranded at the top.

## Why it was not fixed in the typography pass

It is a **restructure**, not a styling change. The fix is the one the elements
table already made — a compact source cell, with the detail moved to the
preview pane — and that means:

* deciding what the compact materials cell keeps (the elements table kept
  chips + a one-line where, ellipsised);
* teaching `views/detail.js` a material pane, which it has no branch for today —
  the pane renders elements and topology edges, not materials, so there is
  nowhere for the moved detail to land;
* a row-click selection for `tr.mat-row`, which is not selectable now.

That is a session's work with test-tier consequences (the browser tier clicks
rows and asserts what the pane shows), and the pass it was found in was
explicitly styling-only.

## Where the pieces are

* `apps/viewer/views/stack.js` — `materialSourcingCell`, and `sourcingCell`
  beside it as the model to copy
* `apps/viewer/views/detail.js` — where a material pane would go
* `apps/viewer/style.css` — `.el-row__source`, `.mat-row__values`,
  `.mat-row__libref`, `.mat-row__desig`, `.mat-row__request`
* `tests/debug_typography_pass.mjs` — re-shoots the pair above
  (`--phase before|after`, shot 9)

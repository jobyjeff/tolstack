---
priority: med
depends_on: []
---

# HANDOFF 2026-08-25 — stack_viewer_layout_v2: grid-like rows, source detail → right pane, report below the stack

Source: Jeff's 2026-08-25 atomic note `20260825T153610_xyrwgw` ("tolstack
frontend" items 1–2; item 3 — folding the viewer into the drawing-checker
site — is deliberately NOT here, it's a strategy-track integration; don't
build toward it). Baseline: trunk `master`. Scope: `apps/viewer/` only
(index.html, views/, tests.js); do NOT touch `docs/tolerance_stacks/`
authored content or the projection builders — parallel handoffs
(`fastener_stack_shadow`, `endstop_graft_workorder`) write stacks
concurrently.

## Current shape (from the 2026-08-25 survey)

Three panes: left `#stacklist` nav, centre `#stackview`, right `#worksheet`
aside (520px sticky, toggleable) rendering `WORKSHEET_*.md` live via
`views/worksheet.js`. Element rows are built by `elementRow`
(`views/stack.js:155`); the "source" column is a multi-line composite cell
(`sourcingCell`, `stack.js:188–243`: chips, where-line, callout, clamped
note, export block, crop trigger) capped at `max-width: 340px` — it forces
tall rows, which is exactly Jeff's complaint: the table reads like a list,
columns/rows are hard to trace.

## Deliverables (Jeff's requirements, restated)

1. **The worksheet ("agent's report") moves out of the right pane** to a
   separate element BELOW the main tolerance-stack table (collapsed or
   compact by default is fine — Jeff wants it out of the side, not gone).
2. **The stack table becomes grid-like**: one compact row per element,
   consistent row heights, traceable columns. The source column shrinks to a
   compact indicator (suggestion: confidence chip + kind chip + a
   short where-ref, one line) —
3. **— and full source detail moves to the right pane** (where the worksheet
   used to live): selecting an element shows its full sourcing there —
   callout as printed, citation note un-clamped, export-provenance block,
   AND the crop thumbnail (`crops.json` / `crops/*.png` already exist —
   render the image inline, not just the current click-to-open trigger),
   plus **a link back to the drawing-checker page for that drawing**
   (suggestion: `http://localhost:8420`-style base configurable in
   `config.js` next to the existing dirs config — check how the hosted app
   builds container/run URLs and use the container-page form; if there's no
   clean URL to build for a given `source_ref.document`, say so in the
   lesson rather than inventing one).
4. **Selection model**: clicking an element row selects it (visible
   highlight) and populates the right pane; keyboard up/down is a nice-to-
   have, skip if it drags.
5. Viewer stays computes-nothing, classic-scripts, `file://`-runnable — the
   FSA/static transport must keep working (crop images + worksheet reads via
   the storage adapters as today).

## Definition of done

- Rendering the existing projection
  (`C:\workspace\tolstack\data\projections\viewer\results.json`, absolute
  main-checkout path) shows: compact grid rows, right-pane source detail with
  visible crop thumbnail for an element that has one (the pitch-link stack
  has crops), worksheet section below the table.
- `apps/viewer/tests.js` updated: value-level asserts on the new row
  structure, right-pane population on selection, and worksheet placement;
  `run_tests.cjs` green; python suite untouched/green.
- Lesson: the drawing-checker back-link decision (URL form chosen or why
  none), and any layout decision Jeff should veto at review.

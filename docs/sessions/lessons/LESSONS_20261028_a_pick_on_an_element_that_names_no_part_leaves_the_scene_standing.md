# Lessons — a pick that names no part leaves the scene standing (2026-10-28)

## What changed
- `AA.planGotoRefusal` / `AA.planSweepReturn` (commands.js): the pure decisions. `cmdGoto` asks the first
  **before** leaving sweep (sweep mode only; bind mode keeps its filter line). Refusal = row note
  (`state.rowNotes`, `.tree-row__note`) + links to the two end nodes; mode, parts, filter untouched.
- `leaveSweepForBind` (goto and trace) keeps `state.sweepReturn`; `#sweep-return` is the "← back to the sweep"
  line, built as an `.an__filter` so the embedded mirror carries it. "Show all" reloads the sweep's parts.
- Viewer: a clicked study row (chain or kinematic) re-drives the pane even when params are unchanged.

## Verification gap
`app.js` cannot boot in the unit sandbox, so deliverable (a)-(c) at *state* level (mode / loaded set /
filter) is covered only by the browser spec I wrote, which **could not run in a worktree**
(no `playwright-core`, no projections). Unit cases pin the planners. Run the browser tier in the main checkout.
Also unrun: the two new browser specs' mutation witnesses (browser entries).
The `GAP_EDGE` id in the new browser check is the handoff's; confirm the row exists on that page.

## Other rail gestures that can still strand the embedded pane (not fixed here)
1. **Node-feature Pick rows on a gap edge.** A node feature resolves to the same gap edge, so Pick on either
   end row is refused too, and the "bind the features on either side" links lead to rows that refuse
   identically. Possible dead end — needs a design call (which edge/part a node feature binds through).
2. `cmdGoto` onto another topology with auto-topology off: leaves sweep, then `keptTopologyNote` returns —
   scene restored, nothing selected (return control is offered, but the click did nothing).
3. `sweep off` / the viewer's own exit while in bind mode never sets `sweepReturn`: no way back by design.
4. Parts-panel isolate/ghost and "Show all" in bind mode after a goto leave isolation on; Show all lifts the
   filter and reloads parts but does not lift an isolate.
5. Hidden `#topology-select` / `#study-select` in embedded mode: only the shell's study rows re-drive; an
   edge row on the kinematic page highlights (hover) and never re-drives.

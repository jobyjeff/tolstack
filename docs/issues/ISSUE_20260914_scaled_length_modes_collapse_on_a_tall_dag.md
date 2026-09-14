---
type: feature
priority: med
status: open
area: viewer/edge-length-scaling
audience: strategy
reporter: agent
---

# Fitting the DAG to the window makes the scaled length modes say nothing on `pitch_system`

Measured while building `viewer_dag_spine_layout` (2026-09-14), and it is the
direct consequence of that handoff's deliverable 2 rather than a defect in it —
but it leaves a shipped feature blank on the one topology it was shipped for,
which is Jeff's call and nobody else's.

## The arithmetic

`pitch_system` serialises to 45 layout rows. At comfortable density every node
row is 26px and no edge may be drawn shorter than one row (the floor keeps
whole-edge hover clickable), so **the shortest this DAG can ever be drawn is
1170px** — past any ordinary window once the page's chrome is taken off.

The viewport fit therefore hands `tolerance width` a budget it cannot meet,
gives up the proportion (never the floor), and every bar comes out one row
tall wearing its break mark. Honest — the page says outright that nothing on
it is to scale — but `tolerance width` and `uniform` now render identically
there, and the tolerance bands the mode exists to show (0.03 … 0.2) are
invisible. Before the fit the same view was 3325px tall, which is what Jeff
called "impossible to make sense of", so this is not a regression so much as
the other end of the same trade.

**Compact density is the escape hatch that already exists**: at 16px rows the
floor minimum is 720px against the same 782px budget, so the whole DAG fits in
one window and `tolerance width` lands exactly on the budget with 13 of its 24
edges drawn in true proportion (11 still on the floor). The proportions come
back. Nothing on the page says so.

## Options, none of them obviously right

- **Say nothing and let the reader find compact.** Cheapest; also the one thing
  Jeff's web-UI rules argue against (a feature that silently does nothing).
- **Auto-pick the density from the fit** — comfortable where it fits, compact
  where it does not. One control doing two jobs, and it would move a
  deliberate preference behind the user's back.
- **Let the floor scale below one row when the alternative is a collapsed
  scale**, with the hover/click target kept clickable some other way (a wider
  invisible hit line is already how the bars work). This is the only option
  that makes a 24-edge DAG show real proportions in one window, and it retires
  a landed contract ("nothing renders shorter than one row height") to do it.
- **Offer the fit as a choice** rather than always-on: "fit to window" beside
  the length mode, off meaning today's 6-row cap and a page that scrolls.

## Where the numbers live

`VA.EDGE_LENGTH_SCALE` / `VA.DAG_FIT` / `VA.fitEdgeLength` in
`apps/viewer/topology.js`; the browser tier pins the collapse as the expected
shape (`[real] pitch_system overflows honestly …` in `testHeightBudget`, and
the tolerance-width bar check in the topology suite), so whichever way this
goes, those two are where it lands.

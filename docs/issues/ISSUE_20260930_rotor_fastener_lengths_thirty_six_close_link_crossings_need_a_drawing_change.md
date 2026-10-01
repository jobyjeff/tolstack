---
type: feature
priority: med
status: deferred
area: viewer/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md
class: layout_measurement_awaits_human_decision
defer_until: 2026-10-15
---

# `rotor_fastener_length`'s 36 close-link crossings are not a column-order problem, and nothing left in the layout can move them

`scripts/build_topology_projection.py`'s `order_columns` (2026-09-30) renumbers a
topology's non-trunk columns to minimise `layout_crossings`. On four of the five
committed topologies it reaches zero or near-zero. On `rotor_fastener_length` it
changes nothing, and that is a proof rather than a shortfall: the topology has
nine non-trunk columns, which is inside `EXACT_ORDER_MAX_COLUMNS`, so the search
is exhaustive, and **36 is the minimum over all 9! orders**. It is pinned as
such by `tests/test_topology_projection.py::test_the_rotor_fasteners_close_links_
are_not_a_column_order_problem`.

## Why no order helps

The topology is a ten-wide fan out of one hub. Every rail starts at row 0 and
each is exactly one row longer than the last, so the layout is *already*
shortest-leg-first and every permutation is a relabelling of the same picture.
All 36 crossings are **close** links: each leg's loop-closing edge is drawn from
its own row back up to the hub, horizontally across every rail that is alive in
between. A rail is alive in between for the same reason the fan is a fan.

Measured on the committed document (both before and after the ordering pass):

| term | count |
|---|---|
| branch | 0 |
| close | **36** |
| leader | 0 |

## The lever that is left

How a close link is **drawn**, not where the columns are. Candidates, none of
them costed here — this is `audience: strategy` because picking one is a design
decision about the DAG page's visual language, not a fix:

* route a close curve **outside** the fan rather than straight across it (down
  the outer margin and back in), which trades 36 crossings for a longer line;
* draw it as an explicit **jog** with a gap/bridge where it passes a rail, the
  schematic convention for exactly this;
* **do not draw it at all** past some fan width, and mark both endpoints
  instead — the loop closure is already carried in the projection
  (`rows[].closes_row`), so the dashed curve is one of several possible
  renderings of a fact the page already has;
* leave it, and say so: 36 crossings on one of five committed topologies may
  simply be the honest cost of drawing a ten-way fan that closes.

Whichever is chosen, the number is already measurable
(`build_topology_projection.layout_crossings`), so the change can be pinned the
same way the column order now is.

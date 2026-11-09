---
type: bug
priority: med
status: open
area: topology/walk-order
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
---

# The `authored` walk order only breaks ties, so re-ordering a body's `parts` does not always re-order the page

The handoff asked that "the authored JSON is the layout authority, so Jeff can
re-order by editing it". `walk_order: "authored"`
(`scripts/build_topology_projection.py::serialize_topology`) does not fully do that. It
breaks the ties the depth-first walk leaves open, but it does not override the
depth-first walk. `docs/DAG_TOPOLOGY.md` ("Bodies on the DAG") says both "it only
breaks ties" and "so the author re-orders the page by re-ordering `bodies[]` and
`parts`". The second claim is true for v2's current order and false in general.

**Measured in review, 2026-11-08.** In `topology_vpa_end_stop_v2.json`, swap
`base.parts[1]` and `[2]` (gas-spring mount before tan-link mount) and the two
piston heads in `pitch_plate.parts`. The walk then draws base as hub →
gas-spring mount → **cover** → tan-link mount, against the authored hub →
gas-spring mount → tan-link mount → cover. The walk goes from the gas-spring
mount into the cover (the cover's seat is on that mount) before it comes back to
the hub's next edge. `tests/test_topology_projection.py::test_model_v2_reads_in_its_authored_body_and_part_order`
goes red on that edit, which is correct, but it means the author's edit did
not produce the authored order.

So today's v2 page is right because its authored order happens to fit a
depth-first walk. The next re-order Jeff makes by hand may not.

**Options (strategy's call):**

- (a) Make `authored` part-major inside a body. Draw each part's rows in
  `parts` order and defer every edge that leads to a later part until that
  part's turn. The cost is more deferred rails inside a body.
- (b) Keep the tie-break and correct the doc sentence. Have the builder warn
  when the drawn part order differs from `parts`, so an edit that does not take
  effect is visible.

Recommendation: (b) before the demo, because it is small and honest. Then (a)
if Jeff re-orders by hand and expects the page to follow.

---
type: chore
priority: low
status: triaged
area: viewer/guards
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# `gaps[].kind` is a new enumerated projection field with no TOPO_VALUE_GUARDS row

`viewer_study_verdicts_and_gaps` (2026-09-15) added a per-topology `gaps` list
to `data/projections/viewer/topologies.json`. Its `kind` is an enumerated
field — `scripts/build_topology_projection.TOPOLOGY_GAP_KINDS`, four values —
and the page branches on all four (`VA.GAP_KINDS`, `apps/viewer/topology.js`,
with a loud fallback for a value it has never heard of).

Every other enumerated field of that projection has a row in
`apps/viewer/tests.js`'s `TOPO_VALUE_GUARDS`, which sweeps the **live**
projection and fails when a value on disk has no branch on the page. `kind` has
no such row.

**What does cover it today**, so this is a `low` rather than a gap in the net:

* `tests/test_topology_projection.py`'s `JS_PAIRINGS` pairs
  `VA.GAP_KINDS`'s keys against `TOPOLOGY_GAP_KINDS` word for word — which is
  the *earlier* signal, because it fires the moment Python's tuple changes,
  before any data moves.
* A `[real]` test in `apps/viewer/tests.js` ("every live gap row is one this
  page has words for, and every kind the builder writes is used somewhere")
  walks every live gap row and asserts the page has words for its kind, plus
  an anti-vacuity check that all four kinds have live rows.

So the hole is narrow: a guard row would put `kind` in the same sweep as its
siblings, reported the same way, rather than in a test of its own.

**Why it was not simply added:** the guard tiers were explicitly out of scope
for this handoff — they are owned by `mutation_witness_tier_repair` and
`viewer_value_guard_rows_and_replays`, and a second session editing
`TOPO_VALUE_GUARDS` in the same week is how two handoffs collide in one array.
Whichever of those lands last is the natural place to add the row.

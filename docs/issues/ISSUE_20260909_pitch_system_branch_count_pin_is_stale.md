---
type: bug
priority: med
status: closed
area: apps/viewer/tests.js
reporter: agent
resolution: duplicate of ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md, filed a day earlier with the same finding plus two independent by-hand derivations (docs/DAG_TOPOLOGY.md's L2 section, REVIEW_20260906_mechanical_stroke_stack.md) already confirming 5 is correct -- see that issue, now triaged with the same handoff this one pointed to
---

# `pitch_system`'s hardcoded "4 forks" test expectation is stale — the real projection has 5

`apps/viewer/tests.js:2838` (`[real] the pitch system's four forks are marked`)
asserts `livePitch.branch_nodes.length === 4` against the live
`data/projections/viewer/topologies.json`, built fresh via
`scripts/rebuild_projections.ps1` (branch=master, dirty=False,
behind_trunk=0 — an authoritative, non-stale build). The real count is now
**5**, so the test fails:

```
FAIL  [real] the pitch system's four forks are marked
      expected 4 branch points, got 5
```

Confirmed this is **not caused by triage's 2026-09-09 batch-merge
(integration -> master)**: `docs/topologies/topology_pitch_system.json`'s
content is structurally identical between master and integration at the
point of merge (the only diff is added `provenance` metadata — a
`worksheet`/`worksheet_note` pair — no node/edge changes), so the same
projection, and the same branch-point count, would build from master alone.
The hardcoded `4` is exactly the anti-pattern tolstack's own `CLAUDE.md`
names: "a quantity written in prose that no test reads from the tree is a
defect, regardless of whether it happens to be right today." This one now
demonstrably disagrees with the tree. Best guess at when it went stale:
the `provenance.retrace_update_20260906` note on that same file describes
handoff `endstop_location_stack` re-citing six edges on 2026-09-06 — around
when the count likely moved from 4 to 5, if it was ever actually 4 for the
current graph shape rather than an even-older snapshot's fork count.

Needs someone who knows the mechanism to decide: is 5 branch points correct
for the current `pitch_system` graph (in which case just update the pinned
number and the test's own name/prose, `four` -> `five`), or does the extra
branch point indicate an unintended structural edit and the graph itself
needs a fix? Routed to
`docs/sessions/HANDOFF_20260909_tolstack_viewer_js_suite_drift.md` rather
than decided here.

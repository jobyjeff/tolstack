---
type: bug
priority: med
status: open
area: viewer / projections
reporter: agent
audience: strategy
---

# Two active handoffs that each add a projection field turn each other's `[real]` tier red

Hit on 2026-09-14 by `annotate_affordances_flyout_and_mesh_gating` and
`stack_title_style_pass`, running concurrently in their own worktrees.

This is **not** `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_
projection` reopening. That one was *silent* clobber, and the provenance gate
(`scripts/projection_provenance.py`, handoff `viewer_projection_provenance`)
fixed it: the overwrite is now refused, loudly, with both trees named. The gate
did its job here — it refused, the message was clear, and no work was lost. What
is left over is the half the gate cannot reach.

## What happens

`apps/viewer/tests.js`'s `[real]` tier pairs the **hand-written fixtures in a
worktree** against the **shared projection in the main checkout**. Both sides
move, and only one of them is per-worktree:

1. `stack_title_style_pass` adds `description` to the stack projection, updates
   `apps/viewer/fixtures.js` on its branch, rebuilds `results.json`/`crops.json`
   into `C:\workspace\tolstack\data\`, and goes green.
2. `annotate_affordances_flyout_and_mesh_gating` adds `mesh` to the topology
   projection, updates `apps/viewer/topology_fixtures.js` on *its* branch,
   rebuilds `topologies.json` into the same directory, and goes green — except
   for `description`, which its branch has never heard of and its fixtures
   therefore do not carry.
3. Each agent now sees a `[real]` failure naming a field it did not add, in a
   file it must not edit (the other handoff owns that fixture change), and
   `C:\workspace\tolstack`'s own clean `master` checkout fails on **both**.

Measured, both directions, 2026-09-14:

```
worktree annotate_…  --repo C:\workspace\tolstack  293/294  (fails: stacks[].description)
main checkout master --repo C:\workspace\tolstack  281/283  (fails: description AND mesh)
```

## Why it is worth a design look rather than a rule

- **"Green" in the `[real]` tier is now a function of who rebuilt last**, which
  is the property a test is supposed to not have. Neither agent can make it true
  without breaking the other's, and rebuilding is the remedy the gate's own
  refusal message recommends — so the two agents ping-pong the shared file.
- **A reviewer cannot tell whose field is whose** without reading the projection's
  provenance stamp by hand, which is exactly the forensics the stamp was added to
  make unnecessary.
- The obvious workarounds each cost something real: a per-worktree `data/` breaks
  "resolve a repo-relative `data/` path at the main checkout" (the rule every
  handoff is seeded with); serialising projection-shape handoffs costs
  parallelism; teaching the shape guard to ignore unknown keys deletes the guard
  (`ISSUE_20260811_viewer_fixtures_lag_the_live_projection_shape` is the bug it
  exists to catch).

One candidate worth costing out: let the `[real]` shape guard read the
projection's own provenance stamp and, when the projection was built from a tree
this one does not contain, **report the drift as a named cross-tree condition
rather than a failure** — the same distinction the builder's gate already draws,
applied to the test that consumes the artifact.

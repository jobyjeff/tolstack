# BRIEF 2026-09-14 — the `[real]` tier couples per-worktree fixtures to one shared projection, so parallel handoffs redden each other

> Routed here by the triage sweep of 2026-09-14/15 from
> `docs/issues/ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`
> (`type: bug`, `priority: med`, `audience: strategy`). This is an architecture
> question about how the `[real]` tier is wired, and it bites the orchestrator's
> ability to run tolstack handoffs in parallel — so it is worth a design look
> rather than a rule telling agents to take turns.

## What happens

`apps/viewer/tests.js`'s `[real]` tier pairs the **hand-written fixtures in a
worktree** against the **shared projection in the main checkout**. Both sides
move, and only one of them is per-worktree. Hit on 2026-09-14 by
`annotate_affordances_flyout_and_mesh_gating` and `stack_title_style_pass`
running concurrently:

1. `stack_title_style_pass` adds `description` to the stack projection, updates
   `apps/viewer/fixtures.js` on its branch, rebuilds `results.json`/`crops.json`
   into `C:\workspace\tolstack\data\`, and goes green.
2. `annotate_affordances_flyout_and_mesh_gating` adds `mesh` to the topology
   projection, updates `apps/viewer/topology_fixtures.js` on *its* branch,
   rebuilds `topologies.json` into the same directory, and goes green — except
   for `description`, which its branch has never heard of and its fixtures
   therefore do not carry.
3. Each agent now sees a `[real]` failure **naming a field it did not add, in a
   file it must not edit** (the other handoff owns that fixture change), and the
   clean `master` checkout fails on **both**.

Measured, both directions, 2026-09-14:

```
worktree annotate_…  --repo C:\workspace\tolstack  293/294  (fails: stacks[].description)
main checkout master --repo C:\workspace\tolstack  281/283  (fails: description AND mesh)
```

## What this is not

**Not** `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`
reopening. That one was *silent* clobber, and the provenance gate
(`scripts/projection_provenance.py`) fixed it: the overwrite is now refused,
loudly, with both trees named. **The gate did its job here** — it refused, the
message was clear, and no work was lost. What is left is the half the gate cannot
reach: the gate governs *writing* the shared projection, and this is about
*reading* it from a tree that does not know all its fields.

Also not the same as
`ISSUE_20260914_the_shared_viewer_projections_are_from_two_different_trees`,
which this sweep resolved by rebuilding all three from one tree after the batch
merge. That was a stale-artifact problem with a mechanical fix. This is
structural: it recurs every time two handoffs each add a projection field, and
the rebuild does not prevent it.

## The core problem to solve

**"Green" in the `[real]` tier is now a function of who rebuilt last**, which
makes it a poor gate: an agent cannot distinguish "my change is wrong" from
"a sibling branch's field is in the shared file". Worse, the honest reading of a
red `[real]` tier becomes "probably someone else", which is exactly how a real
failure gets waved through.

Directions worth weighing (the issue does not pick one):

- **Make the `[real]` tier tolerant of unknown fields** — assert that every field
  the *reading tree* knows is present and well-formed, and ignore extras. Cheap,
  and it gives up the "no live value the page cannot render" property in the
  additive direction only. Worth checking whether that property is what
  `TOPO_VALUE_GUARDS` actually needs.
- **Give each worktree its own projection build** so the `[real]` tier reads a
  projection from its own tree. Removes the coupling entirely; costs a rebuild per
  worktree and loses the "tested against the real shared artifact" guarantee that
  is the tier's whole point.
- **Version the projection schema** and have the tier assert against the schema
  version its fixtures were written for, skipping loudly when the shared file is
  newer.
- **Sequence at the orchestrator instead** — treat "adds a projection field" as a
  mutex and never run two such handoffs concurrently. No code change; cost is
  throughput and it needs the orchestrator to know which handoffs those are,
  which today only the handoff text says.

## Why it matters beyond tolstack

Dispatch's whole model is parallel handoffs in separate worktrees. tolstack is
the repo where a shared, gitignored, rebuilt-in-place artifact is load-bearing
for tests — so it found this first, but any repo that grows the same shape will
find it too. Whoever decides this should say whether the answer is a tolstack
answer or a convention (`forge/CONVENTIONS.md`) other repos should inherit before
they build the same coupling. Compare
`forge/docs/strategy/BRIEF_20260914_cross_repo_jsonl_append_lock.md`, filed the
same day, which is the same "one repo fixed it, the mechanism is workspace-wide"
question about a different shared artifact.

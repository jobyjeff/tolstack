---
type: bug
priority: med
status: triaged
area: viewer / projections
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md
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

## Third instance, same day, measured in review (2026-09-14)

It is not two handoffs, it is however many are live. During the review of
`annotate_affordances_flyout_and_mesh_gating` a **third** active handoff,
`spec_crop_region_registry`, rebuilt `crops.json` into the same shared directory
mid-review (`provenance.branch = handoff/spec_crop_region_registry`,
`built_at 2026-09-14T23:58:47+00:00`, `dirty: true`), and the `[real]` tier went
from 293/294 to 291/294 between two runs of an unchanged tree:

```
[real] the fixture's crop shapes still match the builder's
   crops.json now writes region_label, region_match
[real] no live value is one the viewer has no branch for
   crop entry located_by = "declared_region" has no branch in VA.cropProvenanceLine
[real] every fixture shape still matches the builder's
   stacks[].description  (stack_title_style_pass, as above)
```

So the three live projections were simultaneously stamped by three different
trees (`results.json` = `handoff/stack_title_style_pass`, `crops.json` =
`handoff/spec_crop_region_registry`, `topologies.json` = this review's branch),
and no agent's `[real]` tier can be green. Note the extra wrinkle the two-handoff
write-up did not have: the `located_by` failure is the **value-guard** tier, not
the shape tier, so the drift now also lands in the guard whose whole purpose is
to catch a producer the page has not been taught about — indistinguishable, from
inside one worktree, from a real untaught value.

---

> **Fourth instance, 2026-09-16, and it costs the whole mutation-witness tier**
> (review of `viewer_respine_whole_walk`). Exactly the shape above —
> `handoff/viewer_reference_crops_in_context` @ `d16db3b` rebuilt the shared
> `crops.json` at `06:45:16`, one minute after this review's own rebuild of
> `results.json` / `topologies.json` from the merged tree, and the same three
> failures came back (`the fixture's crop shapes still match the builder's`,
> `no live value is one the viewer has no branch for` with
> `located_by = "balloon_view"`, and `no rendered surface ... prints an
> internal id` naming `crops.json`). Confirmed external: a `git archive` of
> `integration` itself runs **392/395** with the identical three, so nothing
> on any review branch can be green while that worktree is live.
>
> **The new part is the amplification.** `scripts/run_mutation_witness_tests.mjs`
> requires a green clean run before it will apply a mutation, so a red `[real]`
> tier does not cost three checks — it costs **every fast-tier entry in the
> registry**: the run reported `11/26 declared mutations witnessed`, with nine
> entries `SKIPPED: the tier is already red with NO mutation applied` and the
> rest listed as `NOT WITNESSED`. That is a wall of apparent broken guards
> produced entirely by a sibling session's write, and it is the state in which
> a *real* un-witnessed guard stops being noticeable — the same argument
> `ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_it_
> declares.md` makes about one permanent miss, at fifteen times the size.
>
> Two workarounds measured here, both cheap, neither a fix:
> a scratch `--repo` root holding the two projections the merged tree built
> plus the *matching* `crops.json` and junctions to the real `crops/`,
> `meshes/`, `inbox/` and `docs/` runs **399/400** (the one residual is the old
> crops index naming two PNGs the sibling's rebuild deleted); and the three
> witnesses this review declared are all **mock**-tier checks, so mutating them
> by hand and running `run_tests.cjs` with **no** `--repo` verified all three
> RED on their own declared check at `320 -> 317/320`. The second is the
> general escape: a fast-tier entry whose check does not read `data/` does not
> need a green `[real]` tier to be witnessed, and the runner's all-or-nothing
> gate does not know that.

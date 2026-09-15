---
type: chore
priority: med
status: resolved
area: viewer/tests
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `projection_field_guard_rows` moved to completed/; not independently verified.
---

# Two of the three new `[real]` mesh tests redden when the mesh set grows

Filed from the review of `annotate_affordances_flyout_and_mesh_gating`
(2026-09-14). The handoff's own framing is that the rule — *offer a 3D
affordance exactly where a mesh resolves* — has to hold at **any** mesh count
without a test edit, because a sibling rotorkit handoff
(`assembly_step_part_extraction`) is growing the mesh set. One of its three new
`[real]` tests is written that way. Two are not.

## What breaks

`apps/viewer/tests.js`, the `--- 3D affordances against the REAL mesh set ---`
block:

- `[real] across every live topology, a part's 3D affordance is offered exactly
  where a mesh resolves` — count-free, with non-vacuity witnesses on both
  sides. This one is correct and needs no change.
- `[real] an untraced pitch_system edge whose part HAS a mesh offers a working
  annotate-this link` — names `gas_spring_mount_position` /
  `gas_spring_mount_213668_002` and asserts the alias target is
  `machined_213668`.
- `[real] an untraced edge whose part has NO mesh offers nothing at all` —
  asserts `eq(VA.partHasMesh(livePitch, "hub"), false)` and that the pane
  renders no annotate link.

**Measured in review**, against a scratch repo root holding a copy of the live
projection with `hub`'s `mesh` block flipped to
`{"installed": true, "part_id": "hub"}` and nothing else changed:

```
node apps/viewer/run_tests.cjs --repo <scratch>
FAIL  [real] an untraced edge whose part has NO mesh offers nothing at all -- ...
```

The per-part pairing stayed green. So installing a `hub` mesh — a correct,
expected, in-progress change in another repo — turns a guard red for a reason
that has nothing to do with the behaviour it certifies. That is the shape
`docs/prompts/REVIEW_AGENT.md` logs as "a demonstration that fails for an
unrelated reason is how a guard gets deleted": the natural repair under time
pressure is to delete or weaken the test.

## The fix shape

Pick the edges **by behaviour**, not by name: over `realTopologies`, find any
`needsAnnotation` edge whose part resolves (assert the pane offers the link)
and any whose part does not (assert it offers nothing), with the same
both-sides-non-empty witnesses the pairing test already carries. The alias
assertion worth keeping is "some live part's `mesh.part_id` differs from its own
id", which is the fact the alias table exists for and survives any mesh count;
`tests/test_part_mesh_aliases.py` and `apps/annotate/run_tests.cjs`'s `[real]`
tier already pin the shipped table itself.

The review narrowed the block's own comment and the handoff lesson's
"needs no test edit" sentence to say which test is which; the tests themselves
were left alone (a logic change to a guard is the author's, not the reviewer's).

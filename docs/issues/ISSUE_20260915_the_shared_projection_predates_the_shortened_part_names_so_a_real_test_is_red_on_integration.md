---
type: bug
priority: med
status: open
area: viewer / projections
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# `[real] the pitch system's grouping is the leader rule at work…` is red on `integration`: the shared projection predates the shortened part names

Found in review of `viewer_value_guard_rows_and_replays`, as the state of
`integration` **before** that branch merged — reproduced against `integration`
alone by `git archive integration apps | tar -x -C <scratch>` and running the
scratch copy's runner:

```
node <scratch>/apps/viewer/run_tests.cjs --repo C:\workspace\tolstack
FAIL  [real] the pitch system's grouping is the leader rule at work: internal
      interfaces are omitted, boundaries are drawn, and a part revisited on a
      later branch gets a merged row per visit
      not equal: "propeller hub -- the ground every load path returns to" !== "propeller hub"
385/386 passed
```

## Why

`viewer_component_names_and_reference_copy` (2026-09-15) shortened the part
names in the topology documents — `docs/topologies/topology_pitch_system.json`
now says `"name": "propeller hub"` where `master` still says
`"name": "propeller hub -- the ground every load path returns to"` — and its
`[real]` tier asserts the short form through `VA.componentLabel`, which is
`part.name || part.id` off the **projection**.

`data/projections/viewer/topologies.json` has not been rebuilt since:

```
topologies  branch=review/viewer_respine_whole_walk  head_sha=a1db07e1  built_at 2026-09-16T06:10:24Z
results     branch=review/viewer_respine_whole_walk  head_sha=a1db07e1  built_at 2026-09-16T06:10:18Z
crops       branch=master                            head_sha=ed394ec5  built_at 2026-09-15T18:55:10Z
```

Neither of those trees contains the document edit, so the projection still
carries the long names and the assertion cannot pass. Same shape as
`ISSUE_20260914_the_shared_viewer_projections_are_from_two_different_trees.md`
(resolved by a rebuild), one document change later.

## What to do

Not a rebuild from a review worktree: this branch does not contain
`a1db07e1`, so `scripts/build_topology_projection.py` would refuse with exit 3
and `--allow-older-tree` would drop whatever in-flight fields
`review/viewer_respine_whole_walk` is presently reading. After the next batch
merge, from the **main checkout**:

```
scripts\rebuild_projections.ps1
```

## How you would notice it is still broken

`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` from any
worktree: one `[real]` red naming a long part name against a short one. Until
then, every reviewer on this repo will see it and have to re-derive that it is
not theirs.

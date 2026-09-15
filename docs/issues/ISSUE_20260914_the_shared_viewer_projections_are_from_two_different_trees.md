---
type: chore
priority: med
status: resolved
area: viewer / projections
reporter: agent
resolution: resolved inline by the 2026-09-14/15 triage sweep -- the batch merge landed integration into master, then scripts/rebuild_projections.ps1 rebuilt all three from the main checkout in one pass (exit 0). Verified by the stamps the issue itself named as the check: topologies.json, results.json and crops.json all now read branch=master head_sha=243749ab46024224f8e1e57e2965b08e679295f2 dirty=false behind_trunk=0, built_at 2026-09-15T06:53:26/27/28Z. One tree.
---

# `data/projections/viewer/` currently holds `crops.json` from one tree and `results.json`/`topologies.json` from another

Left behind deliberately by handoff `spec_crop_region_registry` (2026-09-14).
Its definition of done is the live crops showing declared regions, so it
rebuilt `crops.json` into the main checkout — and the ancestry gate refused,
correctly: `crops.json` had been built minutes earlier by
`handoff/stack_title_style_pass`, a worktree that branch does not contain. The
rebuild went ahead with `--allow-older-tree`, which is the sanctioned loud
override.

`results.json` and `topologies.json` were **not** rebuilt, on purpose: doing so
would have dropped the other live worktree's in-flight fields (`stacks[]
.description`, `topologies[].parts[].mesh`) out from under a session that is
presumably still reading them. So the three shared projections are from two
trees.

## What to do

After the open handoff branches merge, from the **main checkout**:

```
scripts\rebuild_projections.ps1
```

That rebuilds topologies, results and crops from one tree in sequence and
prints the three provenance stamps side by side, which is the check that this
is fixed.

## How you would notice it is still broken

Read the three `provenance.branch` / `head_sha` stamps in
`data/projections/viewer/{crops,results,topologies}.json`. At the time of the
review merge they were three *different* branches
(`handoff/spec_crop_region_registry`, `handoff/stack_title_style_pass`,
`review/annotate_affordances_flyout_and_mesh_gating`), which is the fact.

**Do not use the JS suite as the detector** (corrected 2026-09-14 in review):
from a tree that does not contain the sibling branches,
`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` fails the two
fixture-shape guards (`[real] every fixture shape still matches the builder's`
and its topology twin) with fields the reading branch has never heard of -- but
from a tree that *does* contain them (this review branch, cut from
`integration`) the same command is 299/299 green while the projections are
still from three trees. The suite reports whether the reading tree knows the
fields, not whether the projections share a tree; only the stamps answer that.

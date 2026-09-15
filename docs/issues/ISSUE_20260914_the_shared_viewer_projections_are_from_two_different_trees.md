---
type: chore
priority: med
status: open
area: viewer / projections
reporter: agent
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

From any tree, `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`
fails the two fixture-shape guards (`[real] every fixture shape still matches
the builder's` and its topology twin) with fields the reading branch has never
heard of. That is the symptom of a mixed-tree projection set, not of a defect
in the branch running the suite — which is itself worth knowing, because it
reads exactly like one.

---
type: bug
priority: med
status: open
area: annotate/face-classification
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md
---

# Meshes installed into the shared `data/meshes/` took the annotate tier's classification floor red, mid-session, on an unrelated branch

```
FAIL  [real] every installed mesh classifies, and the rate over the whole store
      stays above the floor
      Error: only 35.3% of faces classified, under the 45% floor -- a threshold
      in AA.FACE_CLASSIFY has been tightened past what the mesh store looks like
```

`node apps/annotate/run_tests.cjs`, 2026-09-30.

## The attribution, which is the point of filing it here

This was seen from `handoff/columns_ordered_to_minimise_crossings`, which
touches no mesh, no classifier and no threshold. The same tree ran the same
tier **151/151 green earlier the same session**. What changed in between is not
in any git tree:

```
$ ls -la --time-style=+%Y-%m-%d_%H:%M C:\workspace\tolstack\data\meshes\
drwxr-xr-x 2026-09-30_20:25  1a01fb1d...
drwxr-xr-x 2026-09-30_20:25  323ed493...
drwxr-xr-x 2026-09-30_20:25  3f76ce1e...
drwxr-xr-x 2026-09-30_20:27  1ed2bfd5...
drwxr-xr-x 2026-09-30_20:28  1ff0bced...
   ...and more, all between 20:25 and 20:28
```

`data/meshes/` is gitignored and **shared by every live worktree**. A
`vpa_pitch_linkage_topology_and_feature_fits` worktree was live at the time and
its subject is exactly new geometry. So the most likely reading is: those
meshes are that handoff's, they are real work, and the floor is a **whole-store
rate** — adding geometry that classifies worse than the existing store drags
the average under the floor without anything being wrong with the classifier.

The failure message says *"a threshold in `AA.FACE_CLASSIFY` has been tightened
past what the mesh store looks like"*, which is the one explanation that is
**not** what happened. That sentence should name both directions.

## What to decide

1. **Is 35.3% correct for the new store?** If the new meshes genuinely classify
   worse, the floor is doing its job and the question is whether the classifier
   or the floor moves — a call for whoever owns the new geometry.
2. **A whole-store average is a floor that any addition can breach.** A
   per-mesh floor, or a floor on the *previously installed* set plus a reported
   rate for new arrivals, would let one bad mesh be visible without reddening
   a tier for every unrelated branch.
3. **The message's one-sided diagnosis.** It blames a tightened threshold; the
   observed cause was a widened store. Both belong in it.

Related, and the same class one level up:
`ISSUE_20260930_projection_freshness_cannot_see_a_builders_gitignored_inputs.md`
— a tier reading gitignored shared state that no freshness question can see.
Here the consequence is a red landing on a branch that cannot have caused it.

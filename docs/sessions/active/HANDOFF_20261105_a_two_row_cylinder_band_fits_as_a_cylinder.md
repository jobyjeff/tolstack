---
priority: med
depends_on: [the_annotator_reads_a_nodes_declared_face]
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — a_two_row_cylinder_band_fits_as_a_cylinder: a narrow one-band cylinder face fits `cylindrical`, so the plate's Ø41.04 pilot boss can be proposed

Source: `docs/issues/ISSUE_20261103_a_two_row_cylinder_band_fits_other_so_the_plate_pilot_boss_cannot_be_proposed.md`,
routed by the 2026-11-05 triage sweep. Baseline: master at or after `1dce46ad`. Scope:
`tolerance_stack/feature_geometry.py` (`fit_face`, `FIT_TOLERANCES`) and its tests. Projection rebuilds go
into the main checkout's `data/` by absolute path. Do NOT touch `apps/annotate/`. This `depends_on`
`the_annotator_reads_a_nodes_declared_face` only so that both land before Jeff's next annotator pass and
the second one's screenshot shows both fixes. The two share no files.

## The case (Jeff, 2026-11-03, plus measurement)

The pitch plate's tabs carry a broken Ø41.04 boss that pilots into the piston body's Ø41.072 ID datum.
In `asm217755_215177_001` (37e9f606…) the boss is faces **487** and **521**. At the plate's occurrence,
every vertex of each face sits at r 20.520 ±0.025 from the assembly Z axis: z 102.97–105.67, 31 vertices,
29 triangles, area 67.17. That is a cylinder. `feature_geometry.fit_face` returns `other` for both, with
`why: "one band of quads, which lies on a sphere whatever shape it is"`. That is the **sphere** guard's
row-count rule. Because the node declares a cylindrical face, `scripts/propose_bindings.py` refuses any
proposal on 487/521 as `wrong_shape`. Separately, Jeff's open task asks him to *reject* the proposer's
current pick, face 439 (the small r 16.5 boss), so the right face is the one the fitter cannot see.

## Deliverables

1. **Root-cause the misclassification.** The single-band rule is right to refuse a *sphere* (one band of
   quads fits any sphere). Decide whether it should also block the *cylinder* fit, which it does today.
   A one-band face whose vertices all share one radius about one axis, within the cylinder tolerance,
   is a measurable cylinder. Suggested direction (investigate, report feasibility): let the cylinder fit
   run on a one-band face and keep the sphere refusal. Choose the evidence threshold (radius spread,
   axis fit residual, minimum arc) from measured faces, never by tuning to 487/521 alone.
2. **No regression across the corpus.** Re-fit every face in the meshes `data/meshes` covers, before and
   after. Report every face whose class changes, with r-spread and arc, and justify each change.
3. Rebuild the feature-identity projections. Show that `propose_bindings.py` now proposes 487/521 for the
   plate's pilot-boss node, and that face 439 is no longer the top proposal.

## Definition of done

- `fit_face` on 487 and 521 returns `cylindrical`, at r ≈ 20.52 about the assembly Z axis.
- The corpus before/after table from item 2 is in the lesson, and every class change is justified.
- New value-level tests: a one-band cylinder fits `cylindrical`, and a one-band sphere is still refused.
  The default tier is green, and so are the `[real]` feature-geometry tests.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_a_two_row_cylinder_band_fits_as_a_cylinder.md`): the
  threshold you chose and the faces it was measured on.

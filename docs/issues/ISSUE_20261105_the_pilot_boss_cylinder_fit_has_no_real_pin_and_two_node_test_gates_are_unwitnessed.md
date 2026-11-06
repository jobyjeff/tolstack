---
type: chore
priority: med
status: open
area: feature_geometry/fit
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_a_two_row_cylinder_band_fits_as_a_cylinder.md
---

# The pilot boss's cylinder fit has no `[real]` pin, and two of the node test's gates are unwitnessed

Review of `a_two_row_cylinder_band_fits_as_a_cylinder` (APPROVE, 2026-11-05).
`fit_face` now calls the plate's Ø41.04 pilot-boss faces 487/521 `cylindrical`
by their nodes (`tolerance_stack/feature_geometry.py::_cylinder_by_nodes`,
`apps/annotate/face_geometry.js::cylinderByNodes`). Two things that change
are not pinned:

1. **Nothing reads 487/521 from the installed mesh.** The handoff's first DoD
   line is a claim about those two real faces, and it is held only by a
   synthetic `staggered_band` built to resemble them. Moving
   `cylinder_node_ulps` from 3 to 0.05 would turn the real boss back to
   `other` (it measures 0.09 units) and leave every tier green.
   `test_real_both_readers_classify_every_installed_face_the_same` only says
   that the two readers agree, not what they answer. Fix: one `[real]` test
   that reads `asm217755_215177_001` by `part_id` (use the `mesh_dir_for`
   helper in `tests/test_feature_geometry.py`) and asserts that 487 and 521 are
   `cylindrical` at r 20.520 ±1e-3 with |axis·Z| > 1 − 1e-9. The reviewer
   measured r 20.5199994 and an axis 1.1e-7 off Z on both.
2. **Two gates of the node test survive deletion in every synthetic tier.**
   The reviewer applied each one-line mutation to the Python reader alone:
   - removing the facet-axis radial pre-gate (`facet_cylinder["max_residual"] >
     cylinder_radial_fraction * radius`). The docstring calls this the gate
     that keeps "the facet-normal test the only one this ever overrides";
   - removing the `cylinder_min_arc_deg` check on the refined fit.

   Both left `tests/test_feature_geometry.py` green apart from its `[real]`
   test. The `[real]` two-reader pairing would catch a change made to one
   reader only. It cannot catch the same change made to both, and nothing
   enrolls either gate as a witness. Fix: a narrow-arc fixture under 10° whose
   nodes are exact (it must stay `other`), and either a fixture for the
   pre-gate or a stated equivalence. The lesson says every admitted face
   passes the pre-gate, so on the corpus it may only be a cost gate. If so,
   say that in the docstring rather than calling it a scope fence.

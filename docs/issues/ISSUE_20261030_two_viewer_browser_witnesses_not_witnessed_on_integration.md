---
type: bug
priority: low
status: open
area: mutation-witness
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261029_a_point_exports_its_xyz_against_angle.md
---

# Two viewer browser witnesses are NOT WITNESSED on `integration` itself

Found while reviewing `a_point_exports_its_xyz_against_angle`. Reproduced on a
clean detached checkout of `integration` (so not caused by that handoff), via
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <guard>`:

- `browser__real-the-pane-itself-shows-no-banner-and-no-connect-butt__5c29720f`
  — the tier stays green with the mutation applied.
- `browser__real-toggling-unused-leaves-the-results-pane-s-dom-ident__05996459`
  — a different check reddens ("the kinematic page draws the model in the main
  column…"), not the declared one.

Both are decayed witnesses; the scheduled sweep should repair or retire them.

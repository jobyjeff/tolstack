---
type: bug
priority: low
status: open
area: mutation-witness
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261029_a_point_exports_its_xyz_against_angle.md
class: decayed_witness
defer_until: docs/sessions/HANDOFF_20261030_display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection.md
resolution: triage 2026-10-30: low; deferred onto the display_name fixture handoff, the shared cause of this sweep's 'tier red before the mutation' witnesses -- woke 2026-10-30 -- display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection completed; re-triage
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

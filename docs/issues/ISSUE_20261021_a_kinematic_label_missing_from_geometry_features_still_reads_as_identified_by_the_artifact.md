---
type: bug
priority: low
status: deferred
area: tolerance_stack/kinematic
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
class: partial_match_reported_as_full
defer_until: 2026-11-21
resolution: deferred 2026-10-22 triage: low, the default knob
---

# A kinematic label missing from `geometry.features[]` still reads as "identified by the sweep itself"

`tolerance_stack/kinematic.py::_reconcile_feature` loops over a contributor's
labels and `continue`s past any label the artifact's `geometry.features[]` has
no entry for. When the run carries a features list at all, it then returns
`"artifact"` -- so a contributor none of whose labels the artifact lists is
reported as `feature_source: "artifact"`, and the viewer's row title says
"feature identified by the sweep itself" for a join only the study's author made.

Not live today: the 1016 P2 run lists every one of the 61 labels, and
`tests/test_kinematic.py::test_real_every_authored_feature_join_reconciles_against_the_runs_own_features`
asserts every contributor label has an entry. A later run that lists only some
labels (a partial republish, a new joint type) would hit it silently.

**What would close it:** return `"authored"` unless *every* label of the
contributor had an entry that agreed (or count the confirmed labels), with a
fixture test that drops one label from `geometry.features[]`.

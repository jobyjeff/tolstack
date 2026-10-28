---
type: chore
priority: low
status: resolved
area: docs/topologies/kinematic study
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261026_a_contributor_may_be_a_study.md
handoff: docs/sessions/HANDOFF_20261027_the_checks_and_claims_the_folds_left_naming_what_they_removed.md
class: fold_left_stale_reference
---

# The blade-pitch study's two checks still list "the gap rows" it has none of

Both checks in `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
carry an `excluded_terms` row reading "tan_link_length and
pitch_plate_tan_link_attach_radius -- contributors with a sensitivity and no cited
band (the gap rows)". Since 2026-10-26 the tangential link cites its drawing and the
projection builds with zero gap rows (`tests/test_kinematic.py`, `REAL`, pins
`gap_count == 0`), so the row says a contributor is missing a band that it has.

It is surfaced on the page under **Not in these numbers**, so a reader is told two
bands are absent that are present. Remove the row from both checks (it is outside
`a_contributor_may_be_a_study`, which only removed the two rows about the end-stop
location). Pair it with a check that an `excluded_terms` row never names a
contributor whose projected row is a `term`.

## Resolved 2026-10-27 (handoff the_checks_and_claims_the_folds_left_naming_what_they_removed)

The row is gone from both checks. `tests/test_kinematic.py` pins that an
`excluded_terms` row that calls a contributor a gap never names one whose
projected row is a `term` (`test_real_no_excluded_row_calls_a_banded_contributor_a_gap`).

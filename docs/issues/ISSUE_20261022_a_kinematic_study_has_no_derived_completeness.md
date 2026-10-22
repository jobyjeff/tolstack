---
type: feature
priority: low
status: open
area: kinematic study / viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261022_a_study_says_it_is_incomplete_without_inventing_a_check.md
---

# A kinematic study has no derived completeness, so its nav row and page never say "incomplete"

`joby.tolerance_stack/study/v0` studies now carry a derived `completeness`
(`StudyResult.completeness()`, projected at `result.completeness`) and the
viewer badges it on the study header and the nav rail. A **kinematic** study
(`tolerance_stack/kinematic.py`, `apps/viewer/views/kinematic.js`) is a
different schema with its own `no_checks_reason` and contributor list, and was
fenced out of that handoff: it reads sensitivities from a sweep, its terms are
not edges with a `source_ref`, and what "open" means for a contributor
(an unbanded or assumed one) is a design call, not a copy of the edge rule.

Sites that render nothing today: the kinematic page header and the kinematic
section of the nav rail (`VA.kinematicNav`, `navStatus` there carries only a
verdict). Options and a recommendation belong to a strategy session; the
cheapest honest shape is the same `{complete, reason, open_terms}` derived in
`kinematic.py` over contributors whose band is assumed/untraced.

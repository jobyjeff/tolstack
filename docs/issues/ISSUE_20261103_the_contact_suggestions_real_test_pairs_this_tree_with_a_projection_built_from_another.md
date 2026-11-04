---
type: bug
priority: med
status: open
area: tests/contact-suggestions
reporter: agent
class: checkout_dependent_red
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
---

# The contact-suggestions `[real]` test pairs this tree's topology with a projection built from another tree

`tests/test_contact_suggestions.py::test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge`
reads the topology from the tree under test (`LINKAGE`) and the projection
from `LIVE_CANDIDATES`: the worktree's `data/` first, and the main checkout's
`C:/workspace/tolstack/data/projections/feature-identity/contact_suggestions.json`
otherwise. Then it asserts the projection's edge list equals the tree's gap
edges.

Nothing checks that the projection was built from this tree. So any change
that adds, removes or renames a gap edge turns this test red in every
worktree, and on `integration`, until the operator's batch merge rebuilds the
shared projection. The red says nothing about the branch under test.

Measured in the review of `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`
(2026-11-03). The handoff renamed `gas_spring_bushing_coaxiality` to
`pitch_plate_slide_bushings_to_piston_body`. The live projection was built
2026-11-03T00:15 from master `03880aca`. The result was `At index 3 diff:
'gas_spring_bushing_coaxiality' != 'pitch_plate_slide_bushings_to_piston_body'`,
both on the tactical branch and in this review's merged tree. Every handoff
cut from `integration` after this merge will see the same red until the
batch merge.

The viewer's `[real]` tier already handles this case. It refuses a projection
whose inputs have moved on (`projection_provenance`, the "the projection this
tier reads was built from this tree" check), so the failure is loud and
names the cause.

**Fix shape:** read the projection's `provenance` (`head_sha` / input stamp)
and skip, or fail with a message naming the stale projection, when it was not
built from this tree's topology. Use the same gate `scripts/projection_provenance.py`
gives the other `[real]` readers. Do not loosen the pairing itself.

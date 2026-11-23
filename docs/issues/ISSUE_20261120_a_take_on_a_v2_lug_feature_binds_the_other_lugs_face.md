---
type: bug
priority: high
status: resolved
handoff: docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md
area: annotate/contact-suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
resolution: handoff completed 2026-11-22 -- closed automatically by dispatch when handoff `a_take_on_a_lug_feature_binds_that_lugs_own_face` moved to completed/; not independently verified.
---

# A Take on a v2 lug feature binds the other lug's face

Filed by the review of the 11-19 walk. The walk found this and wrote it up only
as an addendum to
`ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`,
which is `deferred` (until 2026-11-29), `type: feature`, `audience: strategy`.
No triage sweep reads a deferred issue before its trigger, so a wrong write
would have waited there. This issue is the open, routable half. The addendum
keeps the evidence.

## What happens

On `vpa_end_stop_v2` (integration `8082bad0`), the two plate lugs are separate
parts that share one mesh each and declare no occurrence. The contact engine
gives both lugs the same top candidate. On
`215735-001 › pitch link straight bushing bore`, the suggestion "2 faces ·
round · r 4.2600 … fits the mating pin · Take" bound faces **1370/1371** in a
scratch copy of Jeff's log (event 0101). Earlier walks measured those faces as
the **tangential** link's Ø8.520 bore; the pitch link's is 1380/1381. The page
gave no sign that the face is on the other lug.

The walk's page sends Jeff to re-pick exactly these features
(`docs/sessions/lessons/REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`,
"Bindings that need a re-pick"), so the next ordinary click writes a wrong,
append-only event to his real log.

## Fix shape

Either the lug's suggestions are taken at its own occurrence (declare the
lugs' occurrences, or have the engine resolve a shared-mesh part by the
interface's partner), or a suggestion whose occurrence cannot be resolved is
not offered as a Take. A test plants two parts on one mesh at two occurrences
and asserts each lug is offered its own faces.

---
type: chore
priority: med
status: resolved
class: reading_surface_copy
defer_until: 2026-12-05
resolution: fixed 2026-11-22 by handoff the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds -- an empty gap list shows nothing (deferred 2026-11-21 by triage before that)
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
---

# Design: the gap panel says "Nothing is recorded as missing" on a model with no values

Filed by the review of the 11-19 walk, which wrote this only as an addendum to
the deferred
`ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`.

Under the grid on `vpa_end_stop_v2`, the always-visible line reads "Nothing is
recorded as missing for this assembly." That breaks two rules. It is a
negation on the surface, which the prose budget rules out. And it is false:
none of v2's 104 edges carries a value, and the same grid shows 75
drawing-status chips. Shot:
`docs/sessions/lessons/shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/11_grid_bodies_off.png`
(bottom line). Source: `apps/viewer/views/topology.js` `gapsPanel`, the
`!groups.length` branch.

Fix shape: show nothing when the list is empty. Whether valueless structural
edges belong in the list is still the deferred issue's question.

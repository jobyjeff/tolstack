---
type: feature
priority: low
status: deferred
area: topology/v2 pitch plate
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md
class: stack_term_double_count
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# Two v2 plate edges carry one diametral position zone, each as its own band

Since 2026-11-23 (handoff `v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets`)
`pitch_plate_link_flanged_bushing_radius` and `pitch_plate_link_flanged_bushing_height`
in `docs/topologies/topology_vpa_end_stop_v2.json` both cite the same frame,
215735-A sheet 2, SECTION A-A, zone B9: `5X Ø 7.950 +0.015/0.000` with
`⌖ Ø0.2 A B C over Ø0.1 A`. Each carries it as ±0.1. The two edges' own notes
say so ("This edge and the radius edge are two directions of one zone"), and
the lesson puts it to Jeff (item 4).

Why it matters: a Ø0.2 cylinder allows 0.1 in any one radial direction, not
0.1 in each of two directions at once. A chain or study that takes both edges
as independent terms widens the zone to a square of half-side 0.1, a corner
0.141 from true position. v2's blade-pitch study reads only the height today,
so no number is wrong now. The first study or lasso that takes both edges
would be.

The same thing holds for one callout on two edges at the tangential link:
`tan_link_length` (sphere centres) and `tan_link_race_bores` (bore to bore)
both carry 213863-004-A's 61.40 ⌖ Ø0.1 B. The study pairs them with
`borrowed_from` so only one term enters. That is already an addendum on
`ISSUE_20261123_the_v2_blade_pitch_study_leaves_out_edges_that_need_a_ruling_before_they_carry_values.md`.

Options:
1. One edge carries the zone, and the other names it and has no value of its own.
2. Both keep the value, and the study loader refuses a fold that holds two
   terms citing one frame unless they are declared as one disk.
3. Leave it as it is and record the rule in `docs/DAG_TOPOLOGY.md`.

Reviewer's recommendation: option 2. It keeps each edge's citation where the
viewer shows it, and it turns the double read into a refusal at load time
instead of a silent overcount.

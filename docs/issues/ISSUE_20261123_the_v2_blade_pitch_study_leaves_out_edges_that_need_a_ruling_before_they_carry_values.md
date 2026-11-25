---
type: feature
priority: low
status: deferred
area: kinematic
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds.md
class: stack_term_double_count
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# The v2 blade-pitch study leaves out edges that need a ruling before they carry values

`kinematic_study_vpa_end_stop_v2_blade_pitch_at_the_stops.json` has a `route_of` row
(no value, sensitivity shown) for each v2 edge between a contributor's edge and the ball
centre its sweep columns move. Some v2 edges near those routes were left out. Each needs a
decision before its drawing or datasheet is cited, because the obvious move would double
count or fold the wrong direction. The lesson
(`docs/sessions/lessons/LESSONS_20261122_the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds.md`)
has the full table.

1. **The link bodies' bore to bore** (`pitch_link_race_bores`, `tan_link_race_bores`).
   The length contributors borrow v1's band, which is the link body's bore-to-bore
   callout. When 213861-002 / 213863-004-A is cited on v2, that band belongs on the
   `*_race_bores` edge. The `*_length` contributor then becomes the sum of it and the four
   outer-race rows. Recommendation: move the contributor's band to the race-bores edge as
   a `route_of` row and leave `*_length` with no band of its own. Never band both.
2. **The straight bushing's route at each lug** (`*_straight_bushing_transition_fit`,
   `*_straight_bushing_wall`, `*_bolt_in_straight_bushing`,
   `pitch_plate_*_bushing_bores_position`, `*_straight_bushing_bore_to_end`). The race sits
   between two supports of one bolt. How they share its position at the race is a
   two-support question (a tilt the sweep has no column for). The rows follow the
   flanged bushing's route only.
3. **Along the pitch link's bolt** (`pitch_plate_link_flanged_bushing_bore_to_seat`,
   `pitch_link_flanged_bushing_flange_thickness`, `pitch_link_upper_inner_race_face_to_ball`,
   the bolt shank segments). These move `pitch_link.point_a[0]` (the bolt is radial). The
   study folds only `point_a[2]`, as v1 does. Its in-plane component is v1's named
   excluded term. When that component is folded, these become rows on it.
4. **v2 has no radial edge from a plate-end inner race's bore to its ball.** Only
   `*_upper_inner_race_face_to_ball` (along the bolt) exists, while the arm and mount ends
   have `*_lower_inner_race_bore_to_ball`. So "the race bore to its ball" has no row at
   either plate lug. Recommendation: author `pitch_link_upper_inner_race_bore_to_ball` and
   `tan_link_upper_inner_race_bore_to_ball` as their lower twins are, then add them as
   rows.
5. **v1's stop chains on v2's grid.** Two leaves of the feather stop chain
   (`piston_body_shoulder_to_top`, `piston_body_flange_to_top`) are not v2 edges. They
   enter the fold but have no grid row on v2, so the sub-stack header's term count (5)
   exceeds its visible rows (3). This closes when v2's own stop stacks are authored.

## Addendum 2026-11-23 (handoff v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets)

- **Item 1, tangential link:** `tan_link_race_bores` now carries 213863-004-A's
  61.40 ±0.05. The study's `tan_link_length` keeps its inline band, now paired
  to `tan_link_race_bores` instead of to v2's `tan_link_length` (same callout,
  same half-width), so nothing counts twice. v2's `tan_link_length` edge still
  carries the same citation at the sphere centres (copied from v1); the
  recommendation above (band only the race-bores edge) is still open.
- **Item 3, and its tangential twin:** both `*_flanged_bushing_bore_to_seat`
  edges now carry 215735-A's ⊥ 0.05 G / ⊥ 0.05 F on the lug ear, a
  *squareness* (±0.025, inferred), which is what the edges' own notes said they
  were. The study's row `pitch_plate_tan_link_flanged_bushing_bore_to_seat`
  reads them as a place *along the bolt*, which a squareness is not, so it stays
  a gap (reworded). The sheet places the ear along the bolt by its ⌖ 0.2 A B C,
  from the plate's datums: a v2 edge from those datums to the seat would be the
  one that row can fold.

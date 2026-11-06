---
type: feature
priority: low
status: open
area: annotate/sweep-rail
reporter: agent
audience: strategy
class: armed_pick_reach
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
---

# A contributor row's Pick still leaves sweep mode for bind mode

Re-filed from `ISSUE_20261029_an_edge_feature_and_a_contributor_pick_still_leave_sweep_mode_for_bind_mode.md`,
which that handoff resolves for edge features only.

Edge features: since 2026-11-05 a joint does not list an edge feature whose
two ends are already its own end rows (`AA.sweepJointRowFeatures`). On P2 that
covers both edge rows that existed (`pitch_link_length`, `tan_link_length`), so
no edge-feature Pick is left on the live rail. An edge feature whose ends are
*not* both joint rows would still jump to bind mode. No live run has one.

What remains: every **contributor** row (the kinematic study's group) still
carries a Pick that runs `goto` and leaves the sweep for the bind form. The
10-29 options still apply. Option 2 ("expand the row into its two ends, each
with an armed Pick") is the one this handoff applied to the joints.

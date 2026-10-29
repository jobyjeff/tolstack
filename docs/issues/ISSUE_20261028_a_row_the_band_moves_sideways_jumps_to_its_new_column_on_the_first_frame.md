---
type: feature
priority: low
status: deferred
area: viewer/topology
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md
class: unreviewed_design_debt
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# A row the band moves sideways jumps to its new column on the first frame

The study re-arrange (`VA.bandLayout`) changes rows' COLUMNS as well as their
order. The respine tween keys only `y` by element (`VA.tweenPositions`); `x`
is a function of the layout's column index and is interpolated only as a column
COUNT (`VA.respineX`), which is the same (11) on both sides on the live model. So
a row that changes column is drawn at its new column from the first frame and
then slides vertically: the movement reads, but sideways it is a jump.

Keying x per element needs rails to follow their rows mid-flight (a target rail's
rows came from several source columns), so it is a design question rather than a
fix: either tween each mark's drawn column and draw rails as polylines through
their marks during the transition, or accept the jump. Measured worst case: the
kinematic study, whose band is 5 columns wide out of rows spread over 8 in the walk.

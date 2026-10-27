---
type: feature
priority: low
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_rail_and_the_scene_point_at_each_other.md
---

# The sweep rail's contributors could show the coefficient at the current frame, not only at the nearest stop

Deliverable 8 of `the_rail_and_the_scene_point_at_each_other` ("build if
cheap"), not built there: that handoff's other seven items took the session.
It is cheap, and this is the measured feasibility.

**The data is already in the run.** `sensitivity.by_measure.<measure>` is a
`[parameter][point]` matrix (60 × 80 on P2, `vpa-pitch-p2-20261016-235852`),
rows named by `sensitivity.parameters`. A contributor row's coefficient is the
2-norm of the entries for its own `parameters` (the study row's
`parameters` list, e.g. `["pitch_link.length"]` or the three components of
`pitch_link.point_b`). Checked against the study projection: at point 0,
`pitch_link.length` reads 1.5740955…, exactly the `-7°` stop row's
`coefficient`. Across the sweep it moves — 1.574 at point 0, 1.146 at point 40,
1.542 at point 79 — and `tan_link.length` goes 0.311 → 0.260 → 0.487, so the
current-frame value says something the stop's does not.

**Shape of a fix.** `AA.readSweepArtifact` keeps `sensitivity` (it drops it
today); one pure helper, `coefficientAt(artifact, measure, parameters, index)`;
the contributor row shows it muted beside the stop's magnitude, updated by
`applySweepFrame` on the row's text node only (no rail rebuild per frame —
the rail is rebuilt today only when the frame crosses a stop). The stop's own
value moves to the group header, as the handoff suggested. Units: the
coefficient is `<study units> per <parameter unit>`, and the study row carries
neither parameter units nor a band at the frame, so the per-frame number is a
coefficient, never a magnitude — say so in the column, not in prose.

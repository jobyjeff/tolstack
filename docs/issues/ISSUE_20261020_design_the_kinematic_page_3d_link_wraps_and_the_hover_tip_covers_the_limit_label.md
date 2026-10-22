---
type: chore
priority: low
status: resolved
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
handoff: docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
resolution: handoff completed 2026-10-22 -- closed automatically by dispatch when handoff `the_kinematic_study_checks_its_run_its_units_and_shows_its_limit` moved to completed/; not independently verified.
---

# Design: on the kinematic page the 3D link wraps and the hover tip covers the limit label

Two small layout faults on `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`,
both seen in a review screenshot of the merged tree (`apps/viewer/views/kinematic.js`,
`apps/viewer/topology.css`):

1. **At a 1100 px viewport, every contributor row's `3D ↗` link wraps onto two
   lines** (`td.kmrow__3d`). That doubles each row's height, and the column has
   room for the link on one line. At 1600 px it fits. `white-space: nowrap` on
   the cell, or a fixed column width, would do it.
2. **The hover tooltip covers the `limit ±0.500 deg` label.** The tip is
   anchored at the top of the plot, and the limit label sits at mid-plot just
   above the upper hairline, so any hover near the centre of the sweep hides
   it. Either anchor the tip below the limit line, or move the label to an end
   of the line that the stop labels do not use.

Judgement-call aesthetics, so not blocking.

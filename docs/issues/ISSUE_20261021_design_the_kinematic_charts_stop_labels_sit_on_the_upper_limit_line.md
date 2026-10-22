---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
---

# Design: on the kinematic chart the stop labels sit on the upper limit line

`topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`: the two
stop labels ("+72 deg stop (high pitch)", "-7 deg stop (low pitch)") are drawn at
`p.top + 12` (`apps/viewer/views/kinematic.js`, `chartFigure`), and on the live
study the upper limit line is at about `p.top + 14` (the axis reaches 1.15x the
0.5 deg limit), so the dashed line runs through both labels. Visible in
`docs/sessions/shots_20261021_kinematic_study_checks_its_run/kinematic_page_1600px_hover_midplot.png`.

Seen while fixing the hover-tip/limit-label overlap
(`ISSUE_20261020_design_the_kinematic_page_3d_link_wraps_and_the_hover_tip_covers_the_limit_label.md`),
which moved the limit's own label to the bottom-left corner. Options: give the
axis more headroom above the limit, or set the stop labels just below the upper
limit line. Judgement-call aesthetics, not blocking.

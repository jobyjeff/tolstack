---
type: chore
priority: low
status: deferred
area: viewer/kinematic chart
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
class: unreviewed_design_debt
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# The kinematic chart scales its text below the type scale when the right-hand pane is dragged narrow

Since 2026-10-28 the chart is drawn in the right-hand pane at a 520px viewBox
(`VA.KINEMATIC_CHART`) and scales with the pane. Measured at 1600×1000 and
1920×1080: the pane's default 560px gives the SVG 527px, so its text is at the
token sizes. The pane's divider allows down to `VA.TOPO_PANE_WIDTH.min`, 320px:
below ~552px the SVG shrinks, and at 320 its `--t-micro` ticks render at about
6px.

Options:

1. Raise `VA.TOPO_PANE_WIDTH.min` to ~420 (the handoff's floor): 0.75 scale,
   ticks at ~8px. One line, but it also narrows what a chain study's pane can
   be dragged to.
2. Draw the chart at the pane's measured width (re-render on the divider's
   drag), so the text never scales. More code; the chart model already takes
   its size from one frozen object.
3. Leave it: a reader who drags the pane that narrow sees a smaller chart.

Recommendation: 2 if the chart stays in the pane long-term, otherwise 1.

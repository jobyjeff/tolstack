---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_each_stop_is_its_own_stack.md
class: design_polish
defer_until: 2026-12-05
resolution: triage 2026-11-05: low deferred by default (30d; class row has no program, so a date)
---

# Design: the kinematic chart's stop error bars sit on the plot frame

Both stops are the sweep's first and last points, so `VA.kinematicStopBars`
draws each error bar exactly on the plot's left and right edges
(`docs/sessions/lessons/shots_20261103_each_stop_is_its_own_stack/after_stop_bars.png`).
The +72° bar shares its x with the y-axis line and the −7° bar with the right
frame and the envelope's end, so the bar — the chart's headline mark since
2026-11-03 — reads as part of the frame rather than as data, and its caps are
half outside the plot. In the same shot the verdict rows wrap their stop label
("+72 deg stop / (feather)") onto two lines at the panel's rest width.

A judgement call, not a named-rule violation: pad the x domain a few percent
past the sweep's ends (no polygon need extend there — the envelope still stops
at the last point), or inset the bars. Non-blocking (review of
`each_stop_is_its_own_stack`, 2026-11-03).

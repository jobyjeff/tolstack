---
type: feature
priority: low
status: open
area: viewer/kinematic chart
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
---

# A stop's travel band is a few pixels wide on the whole sweep's axis

The kinematic chart now draws each stop's travel band on x (±0.82 mm worst case,
±0.56 RSS) and the envelope carried across it on the stop's slope: a
parallelogram whose corner is the stop's folded worst case, 1.707° at −7°,
and an RSS ellipse. On the live study the x axis spans the whole sweep, about
66 mm, so in a 560px pane the worst-case band is ~11px wide and the RSS one ~8px.
The shape is drawn to scale and outlined, but its slope (the point of drawing
it: Jeff, 2026-10-28, "it will look more like a volume/manifold") is hard to read
at that width.

Options for a strategy session:

1. A per-stop inset: a small second plot zoomed to stop ± a few band widths,
   where the parallelogram and ellipse are visible as shapes.
2. A broken x axis: the two stops' neighbourhoods at a larger scale, the middle
   of the sweep compressed.
3. Leave it: the band is to scale, labelled with its interval, and the chips
   and readouts carry the numbers.

Recommendation: 1. It keeps the main plot honest to scale and adds the shape
where the reader asked to see it.

---
type: chore
priority: low
status: deferred
area: apps/viewer map layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261121_the_viewer_node_suite_runs_inside_its_default_tier_timeout.md
class: unclaimed_perf_headroom
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# v1's computed map spends its whole layout budget on every page load

`VA.mapLayout` on `vpa_pitch_linkage` (no authored layout file) costs ~0.6 s
in node (6 ms before `6f093680`): its routes cannot be drawn clean, so it
spends the repair loop (12 re-layouts) and the corner search (`viaCorners`,
2000 candidates per connector) every time. Since 2026-11-22 a repaint reuses
the result, but each page load still pays it once, and the browser tier's
topology suites still run slower than before `6f093680` (http 176 s against
143 s, measured on a loaded box).

Options, for a strategy session: give v1 an authored layout file (the map
then has a clean drawing and the search ends early); or make the corner
search cheaper without changing its answer (e.g. checking `boxesCrossed`
before the per-connector `sharedRun` scan, or a spatial index of drawn
segments); or have the builder compute the layout once into the projection.
Recommendation: an authored layout for v1, which also fixes the drawing.

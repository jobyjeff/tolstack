---
type: chore
priority: low
status: deferred
area: viewer/dag
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
defer_until: 2026-12-06
class: reading_surface_copy
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# A gap reads as a gap only from about the fitted zoom up

`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste` gave gap
edges a dimmer ink (`--edge-gap-ink`) and a long dash (`--edge-gap-dash`,
10 6). The handoff wanted a gap to read as a gap at zoom 0.12 and at zoom 1.

- **At zoom 1** it does: the long dashes read as a broken line, not as
  hashes.
- **At the 0.12 floor** it does not. The dash scales with the drawing, so it
  is about 1 px long. The gap is then a fainter line, and only its ink tells
  it apart from a solid edge.

Shots are in `docs/sessions/lessons/shots/the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste/`:
`4_gap_floor.png`, `4_gap_fitted.png` and `4_gap_zoom1.png`.

Option: draw the dash in screen pixels. That means
`vector-effect: non-scaling-stroke` on `.rail__bar--gap`, or a dash array
divided by the zoom and written inline by `railsSvg`. Either would keep the
dash readable at every zoom. The catch is that a non-scaling stroke also
fixes the bar's width in screen pixels, which changes how lit and unlit read
at small zoom.

This needs a design call on whether marks should keep their screen size
while zooming. It should not be a one-off for gaps.

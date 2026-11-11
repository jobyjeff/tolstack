---
type: bug
priority: med
status: deferred
area: annotate/sweep-bar
reporter: agent
found_by: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
defer_until: 2026-11-24
class: layout_at_minimum_width
resolution: deferred 2026-11-10 (triage) -- med beyond BUDGET=3; viewer selection/layout files are the strategy thread's F1b/F1c sequence (dispatch/docs/strategy/HANDOFF_20261109_strategy.md)
---

# At the scene's 400px floor the sweep bar's head row clips "Export points" and the loop select

Since `the_demo_path_reads_cleanly_on_a_projector`, the scene opens at its 400px
floor at 1920 wide, so the grid keeps PART to ELEMENT beside it. At that width
the sweep bar's first two rows run off the pane's right edge. "Export points"
shows as "Export" and the loop select as "out an". Both are cut by the frame
with no hover and no wrap
(`docs/sessions/lessons/shots/the_demo_path_reads_cleanly_on_a_projector/after/demo_4_sweep_playing.png`).

The readouts grid under them was fixed in the same handoff: each value had
dropped onto its own line, and the two-column floor now holds at 400.

Fix shape: let the run-picker row and the transport row wrap
(`flex-wrap: wrap` on their containers in `apps/annotate/style.css`), or fold
Help and Export into one quiet menu. Check it at 400px and at 560px.

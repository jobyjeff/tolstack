---
type: bug
priority: high
status: resolved
area: annotate/pane
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
handoff: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
resolution: handoff completed 2026-11-09 -- closed automatically by dispatch when handoff `the_demo_path_reads_cleanly_on_a_projector` moved to completed/; not independently verified.
---

# The 3D pane wears an amber "folder needed" chip through the whole demo

On the served page, with the 3D pane open on `vpa_end_stop_v2`, the pane's title
row carries an amber `folder needed` chip in every state: binding, sweep loaded,
playing, and a row selected (`docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/demo_3_pane_open.png` to `demo_5_*.png`, and
`s01_*` at both widths). The chip comes from `apps/annotate/storage/adapter.js`
(`folderNeeded` / `unread`).

A demo that only watches the sweep never needs the folder. An amber warning on
screen for the whole meeting reads as something broken. The binding controls would
need it, but only once the viewer picks a face. Show nothing until a write is
attempted, or show the chip only in bind mode.

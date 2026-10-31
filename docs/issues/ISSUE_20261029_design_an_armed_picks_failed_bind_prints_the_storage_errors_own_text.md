---
type: chore
priority: med
status: resolved
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
class: raw_diagnostic_in_reader_copy
handoff: docs/sessions/HANDOFF_20261030_an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed.md
resolution: handoff completed 2026-10-30 -- closed automatically by dispatch when handoff `an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed` moved to completed/; not independently verified.
---

# Design: an armed pick's failed bind prints the storage error's own text

`armedClick` (`apps/annotate/app.js`) puts `"Bind failed: " + err.message` on
the armed row's state line. The message comes straight from the storage
adapter, for example "feature-identity event <filename> already exists --
append-only, refusing to overwrite", or a browser `AbortError` when the folder
grant is declined. That puts a raw diagnostic, including an internal filename,
in user-facing copy. The handoff asked for "the reader-facing reason"
(decision 6).

Fix: map the adapter's failure classes (no grant or declined, read-only
transport, name collision) to fixed plain words. Keep the raw text in the
console, or behind the row's hover.

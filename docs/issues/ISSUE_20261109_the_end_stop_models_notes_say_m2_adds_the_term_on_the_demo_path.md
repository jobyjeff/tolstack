---
type: bug
priority: med
status: resolved
area: topology/notes
reporter: agent
found_by: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
handoff: docs/sessions/HANDOFF_20261110_the_end_stop_models_notes_say_where_the_value_comes_from.md
resolution: handoff completed 2026-11-10 -- closed automatically by dispatch when handoff `the_end_stop_models_notes_say_where_the_value_comes_from` moved to completed/; not independently verified.
---

# The end-stop model's edge notes say "M2 adds the term" in the Preview on the demo path

Selecting the tan-link length row on `vpa_end_stop_v2` (the demo's fifth click)
puts this note in the Preview, verbatim from the topology document:

> No value recorded; M2 adds the term. What would close it: 212956-005 and
> 213863-004's drawings.

"M2" is an internal milestone name and "adds the term" is the archetype's own
vocabulary; neither means anything to a reader of the page. 22 notes in
`docs/topologies/topology_vpa_end_stop_v2.json` carry the phrase
(`git grep -c "M2 adds the term" -- docs/topologies/`), and one also opens with
history ("New in v2 (2026-11-08): ...").

The handoff that found it rewrote every viewer-authored string in that shape and
left these alone on purpose. They are authored data, and changing them changes
a projection input. The `[real]` tiers then refuse the shared projection until
somebody rebuilds it from that tree, and the rebuild moves the page port 8000
serves for every other session.

Suggested rewrite, one shape for all 22: `Value to come from <drawing>'s drawing.`
(for example `Value to come from 212956-005 and 213863-004's drawings.`). Drop the
"New in v2 (date)" lead. Land it in a handoff that rebuilds the projections as
part of its own definition of done.

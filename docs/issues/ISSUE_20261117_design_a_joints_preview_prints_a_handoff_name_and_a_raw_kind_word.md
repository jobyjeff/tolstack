---
type: chore
priority: med
status: open
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261117_the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page.md
---

# Design: a joint's Preview prints a handoff's name, its rename history and a raw kind word

Split out of `ISSUE_20261117_small_findings_of_the_portrait_map_and_joints_walk.md`
(F2) by the review of that walk, because it breaks two **named** rules
(prose budget: no history on the surface; prohibitions: no internal name in
user-facing copy), which files at `med`, not `low`.

Seen on `integration` `b9475a88`, shot
`docs/sessions/lessons/shots/the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page/k6_rotary_joint_selected_3840.png`
(Preview, lower right). Click the hub ↔ blade rotary joint on the map:

- the first chip reads `mating_surface` (the node kind's stored spelling, monospace);
- the always-visible note reads "Was named "hub blade-1 root bearing bore" until
  2026-11-10 … Since 2026-11-17 (handoff a_joint_says_what_kind_it_is) it states
  `interface: revolute` …" — history, a handoff slug and a field spelling;
- v2's newer joints open "New in v2 (2026-11-17, handoff
  the_blade_and_piston_joints_are_authored_as_what_the_parts_show) …".

Related, older and narrower: `ISSUE_20261110_topology_notes_still_say_what_would_close_it_and_open_with_history.md`
(deferred, low) covers the "New in v2 (<date>)" openings. The two joint
handoffs of 11-17 added notes of the same shape, now with handoff slugs, so
the surface got worse after that issue was deferred.

Two fixes, either sufficient for the surface: the Preview folds a node's
`note` behind one collapsed line (the prose budget's rule for provenance),
and renders `kind` through a label vocabulary; or the notes are rewritten
to say what the feature is, with the history moved to git.

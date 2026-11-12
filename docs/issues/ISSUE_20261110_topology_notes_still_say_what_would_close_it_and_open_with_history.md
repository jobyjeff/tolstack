---
type: chore
priority: low
status: deferred
area: topologies/notes
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261110_the_end_stop_models_notes_say_where_the_value_comes_from.md
class: stale_doc_after_refactor
defer_until: 2026-12-11
resolution: triage 2026-11-11 -- low, deferred by default; class has no program; 30-day date
---

# Remaining topology notes still use the "What would close it" shape

After the 22 "M2 adds the term" notes were rewritten, `git grep -c "What would close it" -- docs/topologies/`
still finds 8 notes in `topology_vpa_end_stop_v2.json` and 18 in
`topology_vpa_pitch_linkage.json`. Some also open with "New in v2 (<date>)" history
(e.g. `hub_boss_in_tan_link_mount_pilot`). Same Preview surface, same prose-budget
rule. Not in the handoff's scope (22 named). `tests/test_topology.py` now accepts
either wording on v2 edges; tighten it to `Value to come` when these are rewritten.

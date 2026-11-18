---
type: chore
priority: low
status: triaged
area: topologies/notes
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261110_the_end_stop_models_notes_say_where_the_value_comes_from.md
class: stale_doc_after_refactor
resolution: triage 2026-11-11 -- low, deferred by default; class has no program; 30-day date
handoff: docs/sessions/HANDOFF_20261117_a_joints_preview_says_what_the_joint_is.md
---

# Remaining topology notes still use the "What would close it" shape

After the 22 "M2 adds the term" notes were rewritten, `git grep -c "What would close it" -- docs/topologies/`
still finds 8 notes in `topology_vpa_end_stop_v2.json` and 18 in
`topology_vpa_pitch_linkage.json`. Some also open with "New in v2 (<date>)" history
(e.g. `hub_boss_in_tan_link_mount_pilot`). Same Preview surface, same prose-budget
rule. Not in the handoff's scope (22 named). `tests/test_topology.py` now accepts
either wording on v2 edges; tighten it to `Value to come` when these are rewritten.

## 2026-11-17 triage sweep

Woken early: folded into `docs/sessions/HANDOFF_20261117_a_joints_preview_says_what_the_joint_is.md`, which rewrites the notes this issue names (the 11-17 joint notes made the surface worse). Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.

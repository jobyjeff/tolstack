---
type: chore
priority: med
status: deferred
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
class: internal_id_as_display_name
defer_until: 2026-11-12
resolution: deferred 2026-10-15 (triage) -- med beyond BUDGET=3; needs a producer-side display name (linkage) or a tolstack vocabulary, call it in the handoff -- woke 2026-10-29 -- date trigger passed; re-triage -- triage 2026-10-29: med beyond the budget (3 staged), deferred again 14 days to 2026-11-12
---

# Design: the sweep run picker names a run by its mechanism id with the underscores swapped for spaces

The handoff asked for the run's **mechanism name** to be "readable there in
words, so 'which run am I watching' is answerable from the page". The picker
added by `parts_sit_where_the_assembly_puts_them` labels each run with
`AA.measureLabel(mechanism.name)` and the publication time. On the real runs
that renders as **"vpa pitch chunk0 p1 · 2026-10-15 01:39"** (see
`docs/sessions/lessons/assets/shots_20261014_parts_in_place/sweep_real_dark_72deg.png`).
That is linkage's internal id `vpa_pitch_chunk0_p1` with the underscores
swapped for spaces. "chunk0" and "p1" mean nothing to a reader who has never
opened the linkage repo. This is the named prohibition "an internal id or slug
standing in as the human-readable title".

The words for the run (P1 = the motion-sheet geometry, S = the 3DX sheet's
plate point, P2 = with the gas-spring piston) live with the producer. So the fix
probably needs either a display name in the artifact (an ask of linkage) or a
tolstack-side vocabulary keyed by mechanism. That choice is why this is filed
rather than fixed. Non-blocking, per the design-check rule.

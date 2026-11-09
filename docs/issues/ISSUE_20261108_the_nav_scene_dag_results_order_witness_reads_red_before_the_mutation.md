---
type: bug
priority: low
status: deferred
area: mutation-witnesses
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261108_the_linkage_play_control_is_the_only_one_and_it_moves_everything.md
class: decayed_witness
resolution: triage 2026-11-08: low, default 30-day defer
---

# `browser__real-the-kinematic-page-reads-nav-scene-dag-results-left__fb0d661d` reads "tier red before the mutation"

Run with `--repo <scratch root built from the tree>` from a detached `integration`
tree **and** from the merged tree: both print `NOT WITNESSED (the tier was red before
the mutation …)` after ~6 min, so the handoff under review did not cause it. Its
suite (`3D pane follows the selection`) passes 32/32 when run alone. Suspect the
witness runner's baseline run of that suite under the scratch root (or contention),
not the guard. Spec is untouched since `e8728b4b`. Re-check in the main checkout at
the next sweep; repair or re-point the spec if it still reads red.

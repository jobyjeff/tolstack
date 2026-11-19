---
type: bug
priority: med
status: open
area: tests/browser (opposite pattern)
class: real_check_bound_to_live_log_state
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_a_bound_pattern_offers_the_whole_pattern_on_the_other_part.md
---

# The opposite-pattern browser suite stops running as soon as Jeff binds the tan link mount's side

`testOppositePattern` in `scripts/run_viewer_browser_tests.mjs` (2026-11-18)
runs its four `[real]` checks only while the served log has the gas-spring
mount's side of `gas_spring_mount_fastener_clocking` bound **and the tan link
mount's side not bound** (`mine` must be absent). If either is false, it
pushes one `[real] … (skipped: …)` check whose condition is the literal
`true`, and the suite reads green.

The tan link mount's side is the next binding Jeff is likely to make. This
feature's whole job is to make that binding one click. Once he takes the
row, the suite's line, head-offer, hover and Take checks stop running, and
their four mutation witnesses go `NOT WITNESSED` at the next sweep. Nothing
says the guard went vacuous: the suite still passes.

Fix shape: run the suite against a copy of the log with that side's
standing events dropped. The handoff's own DoD probe already does this
(`tests/debug_opposite_pattern_20261118.mjs`, scratch data root). Another
option is to have the mock reads serve a log filtered to "mount side bound,
tan side not". Either way the precondition stops depending on what Jeff has
done today. Keep the skip only for absent meshes or an absent model.

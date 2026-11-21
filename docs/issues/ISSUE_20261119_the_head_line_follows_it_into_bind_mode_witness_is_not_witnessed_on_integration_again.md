---
type: bug
priority: med
status: deferred
defer_until: 2026-12-05
resolution: deferred 2026-11-21 (triage) -- med beyond tolstack's budget of 3; a decayed witness with no product exposure, the scheduled witness sweep's class
area: tests/mutation-witness (3D pane follows the selection)
class: decayed_witness
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
---

# The "head line follows it into bind mode" witness no longer reddens, on integration as well

`scripts/mutation_witnesses/browser__real-and-the-head-line-follows-it-into-bind-mode-named-b__0260157c.json`
unregisters `announced(...)` from `goto` (`commands.register("goto", cmdGoto)`).
Its suite, "3D pane follows the selection (sweep, bind, reload, hover)",
stays green with that change applied.

Measured 2026-11-19 by the review of
`a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits`:

- The review merge tree (`b61ac17f`): `--changed-since integration --budget-min 10`
  selected it, and it was NOT WITNESSED (3m44s).
- A `git archive integration` export (`38a21e61`), before that handoff:
  `--only` on this spec was also NOT WITNESSED (3m34s). So the handoff did
  not cause it.

It was one of the 36 in
`ISSUE_20261026_a_full_witness_run_on_integration_left_36_mutations_unwitnessed.md`.
That issue is `resolved`, so either the repair did not hold or something
else now posts the state reply that the head line reads after a `goto`. The
likely sender is the pane's embed tree or its identity post: both now carry
the mode, and either would make `announced` redundant for this check.

Fix: find what the head line reads after a `goto`. If another post now
carries the mode, then `goto`'s announcement is not the contract any more.
Retire the spec and say why, or move it to the check that still depends on
that announcement. Otherwise, repair the check.

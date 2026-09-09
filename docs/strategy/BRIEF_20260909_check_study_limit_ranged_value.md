# STRATEGY BRIEF 2026-09-09 — check_study_limit_ranged_value: let a study's own check fold in a second, independently-ranged term

> **Routing note.** `docs/issues/ISSUE_20260908_check_study_limit_cannot_carry_a_ranged_value.md`
> is `type: feature`, `priority: low`, `audience: strategy` — a schema
> extension with real design tradeoffs, not a mechanical patch.

## The gap, as filed

`tolerance_stack.topology.check_study`'s `limit` parameter builds a synthetic
`Dimension` with `min == max == nominal == limit["value"]` — a **scalar**, by
design, for checking a study's total against a fixed external requirement
(e.g. a Polarion-sourced number). The "no `limit`" branch is fully ranged but
reads a `Study`'s own fixed `selection` — one chain, one total — so it can't
vary per `check_id` either.

Handoff `linear_stack_conversions` (2026-09-08) hit this converting
`rotor_fastener_length` to a topology: one path (`sourced_clamped_stack`) is
checked against **nine** different fastener options
(`grip_budget__u2h` … `grip_budget__u10h`), each subtracting a different
`fastener_grip_uXh` element that carries its own real ±0.010 in tolerance
band. Neither existing shape can reproduce all nine checks exactly (matching
the referenced stack's own published nominal/worst-case/RSS fields, no
`pytest.approx`) without either losing each fastener's band (via `limit`) or
extending the schema to let a `checks` entry name a *per-check* additional
ranged term to fold in alongside the study's own fixed chain.

The handoff worked around it with nine separate `Study` documents (one per
fastener option), each correct today — `docs/topologies/topology_rotor_fastener_length.json`
and `docs/DAG_TOPOLOGY.md`'s new section record this as the current, working
shape. This brief is only about whether a future schema pass wants to
collapse them into fewer documents.

## Why this wasn't decided inline

`linear_stack_conversions` explicitly excluded `tolerance_stack/` (the schema
module) from scope. Extending `check_study`/`Study` to accept a per-check
ranged term is a real design decision with open questions the filing issue
already names:

- Does a check-level term participate in the branch/cycle guards the way a
  study's own chain elements do?
- Does it get its own `transform` (unit conversion, sign) the way a chain
  element does?
- Does this replace `limit`'s scalar shape, or sit alongside it as a third
  mode (`limit` / no-`limit` / per-check term)?

## What's not in question

The nine-study workaround is correct and shipped — this brief is not asking
whether `rotor_fastener_length` needs fixing (it doesn't), only whether a
schema extension is worth building so a future topology with the same
per-check-varies-one-element shape doesn't need nine documents to express it.

## Decompose into

Whatever the strategy session decides — likely one handoff to
`tolerance_stack/topology.py` (the schema/engine change) plus a follow-on to
migrate `rotor_fastener_length` to the new shape if the decision is to
collapse it, or explicitly deciding not to migrate existing working
documents and only offering the new shape going forward.

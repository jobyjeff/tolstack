---
type: feature
priority: low
status: open
area: schema / tolerance_stack.topology
reporter: agent
audience: strategy
---

# `check_study`'s `limit` collapses to a zero-width point -- no way to fold two independently-ranged quantities in one study

Found converting `rotor_fastener_length` to a topology (handoff
`linear_stack_conversions`, 2026-09-08). The stack's own single path
(`sourced_clamped_stack`) is checked against **nine** different fastener
options (`grip_budget__u2h` through `grip_budget__u10h`), each subtracting a
*different* `fastener_grip_uXh` element that carries its own real +/-.010 in
tolerance band.

`tolerance_stack.topology.check_study`'s `limit` shape --
`{"value": ..., "units": ..., "source_ref": {...}}` -- builds a synthetic
`Dimension` with `min == max == nominal == limit["value"]` (see its
docstring and implementation): a **scalar**, by design, for the case it was
built for (a fixed external requirement pulled from Polarion). It cannot
carry a second element's own `min`/`max` band. The "no `limit`" branch is
fully ranged but reads a `Study`'s own fixed `selection` -- one chain, one
total -- so it cannot vary per `check_id` either.

Net effect: the only way to reproduce all nine `grip_budget__uXh` checks
**exactly** (matching the referenced stack's own published nominal/worst-case/
RSS fields, no `pytest.approx`) was nine separate `Study` documents, one per
fastener option, each selecting its own `fastener_grip_uXh` edge. The handoff
that seeded this conversion described the target shape as "one study, nine
authored checks" -- not achievable without either losing each fastener's band
(via `limit`) or extending `check_study`/`Study` to let a `checks` entry name
a *per-check* additional term (a ranged one) to fold in alongside the
study's own fixed chain. That extension is a real design decision (does a
check-level term participate in the branch/cycle guards? does it get its own
`transform`?) and `linear_stack_conversions`'s handoff explicitly excluded
`tolerance_stack/` from scope, so it is filed here rather than built.

See `docs/topologies/topology_rotor_fastener_length.json`'s own `provenance`
and `notes`, and `docs/DAG_TOPOLOGY.md`'s new
`topology_rotor_fastener_length.json` section, for where this is recorded
today (nine studies, working correctly) -- this issue is only about whether a
future schema pass wants to collapse them into fewer documents.

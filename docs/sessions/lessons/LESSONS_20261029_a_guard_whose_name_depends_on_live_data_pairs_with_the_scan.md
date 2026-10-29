# Lessons — a guard whose name depends on live data (2026-10-29)

**Shape chosen: one fixed guard name for both live states.** The `[real]`
per-document-qualifier guard in `apps/viewer/tests.js` is now a single
`await test("[real] each live part sourced to both ... (vacuous while no live
part is mixed)")` whose body loops `mixedParts`; empty set = nothing to assert,
a future mixed part re-arms it with no edit. Why not a scanner annotation for
"exactly one of these ran": it adds a second mechanism to `pairExecuted` that
would itself need a witness, and a name picked at run time is the defect — the
scan declares names statically, so the cheapest cure is a static name. The empty
state is visible by name in the runner output (`PASS  [real] each live part ...
(vacuous while no live part is mixed)`). Neither guard was weakened:
`pairExecuted` is untouched and still flags any declared name no branch runs;
`test_viewer_js_suite_is_green` still fails on SKIP.

Class sweep: this was the only `if/else await test(` pair choosing a name from
live data in `apps/viewer/tests.js` that I found.

Pin: `fast` 622 -> 621 (`names: fd7b363db255`). No new spec: the name's
fixture guard spec (`fast__a-part-sourced-...__6ca658ff`) is unchanged and
WITNESSED on today's data (`--changed-since integration`, 1/1, 29 s). The new
live guard is vacuous today, so it is deliberately not given its own spec.

## Proof
- Worktree, no projection: `test_viewer_js_suite_is_green` still red (SKIP);
  full `pytest -q`: 1 failed (that one), 1654 passed, 1 skipped, 2 deselected,
  289 s (default tier, serial: xdist absent in the shared venv).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (main checkout's
  projection, paired @ 8a2ae880): 621/621, no SKIP; the declared `fast` set and
  the PASS names are identical (621 = 621, none either way) — that is exactly
  `pairExecuted`'s complete-run condition.
- NOT done: a literal `rebuild_projections.ps1` + `pytest -q` in the main
  checkout. It sits on `master` and my commits are on the handoff branch;
  moving the main checkout is not mine. The reviewer should run the default tier
  with a fresh projection, as the handoff asks.

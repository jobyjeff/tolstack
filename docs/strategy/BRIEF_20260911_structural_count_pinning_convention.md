# BRIEF 2026-09-11 — should hardcoded structural counts in JS tests derive from a single stated source?

Filed by triage 2026-09-11 from
`docs/issues/ISSUE_20260909_hardcoded_structural_counts_in_js_tests_should_derive_not_pin.md`
(feature, low, `audience: strategy`).

The evidence case: `apps/viewer/tests.js`'s `branch_nodes.length === 4` was
wrong (live count 5) since on or before 2026-09-06, survived at least three
review cycles under "one pre-existing unrelated failure" cover, and two
independent by-hand derivations (`docs/DAG_TOPOLOGY.md`'s L2 section and
`REVIEW_20260906_mechanical_stroke_stack.md`) already agreed on 5 before
anyone fixed the assertion. The repo's existing anti-pattern — "a quantity
written in prose that no test reads from the tree is a defect" (CLAUDE.md) —
is enforced for prose via the ARCHITECTURE.md module-inventory test, but
nothing extends it to structural counts inside JS tests, which on this
evidence go stale *quieter* (one more line in a running "pre-existing
failure" tally vs a named test with a specific message).

The open design question (deliberately not designed in the issue): where is
the one place a structural count is stated, such that the JS test derives
rather than duplicates it — a count read out of `docs/DAG_TOPOLOGY.md` at
test time, a shared constant the docs test also pins, or something else
mirroring the repo's "one named constant plus a pairing test" vocabulary
shape. Also worth deciding: does the convention apply to all `=== N`
structural literals in `apps/viewer/tests.js` / `apps/annotate/tests.js`, or
only to counts that a doc also states?

Small scope, low urgency; the payoff is convention, not a fix — the original
wrong assertion is already fixed (`tolstack_viewer_js_suite_drift`,
2026-09-09).

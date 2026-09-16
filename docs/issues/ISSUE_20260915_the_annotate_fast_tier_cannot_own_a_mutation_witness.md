---
type: chore
priority: med
status: triaged
area: scripts/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
handoff: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# A guard in `apps/annotate/run_tests.cjs` cannot be declared in `mutation_witnesses.json` at all

The mutation-witness tier knows **two** tiers, and its `"fast"` one is the
viewer's, not a generic one:

- `scripts/run_mutation_witness_tests.mjs`, `tierCommand()` — `tier: "fast"`
  spawns `apps/viewer/run_tests.cjs` and nothing else.
- `tests/test_mutation_witnesses.py`, `CHECK_SOURCE` — a fast entry's
  `expect_red` is searched for in `apps/viewer/tests.js` and nothing else.

So a guard living in `apps/annotate/run_tests.cjs` has no way to be declared:
the runner would run the wrong suite and the pytest pairing would report the
entry's `expect_red` as rotted.

## What is uncovered right now

`annotate_hosted_page_posture` (2026-09-15) added two fast-tier guards to the
annotate runner, both standing on Jeff's never-render-a-terminal-command rule:

- `the no-projection banner is plain words, with nothing to paste`
- `this app holds no terminal command for a banner to render`

Neither can get a witness entry, so nothing standing checks that they would
notice the defect coming back. That handoff's *browser*-tier guard did get one
(`hosted-annotate-withholds-the-bind-workspace`, witnessed 2026-09-15) —
browser entries name a `suite`, and the annotate hosted-posture suite is in
the viewer runner's own `SUITES` registry, so that half already worked.

## Fix shape

Add a third tier word rather than overloading `"fast"` — the two runners are
separate harnesses with separate check-name sources, and `"fast"` already
means the viewer's. Roughly:

- `TIERS` gains the word; `CHECK_SOURCE` gains its row
  (`apps/annotate/run_tests.cjs` is both the harness *and* where the names
  live, unlike the viewer's split).
- `tierCommand()` gains the branch; the annotate runner takes `--repo` already
  (its `[real]` checks read the main checkout), so nothing else changes.
- `FAST_FAIL` in the mutation runner parses `FAIL  <name>`; the annotate
  runner prints the same shape, so the failure-name regex may be reusable
  as-is — check before assuming.

Cheap, and it is the difference between two guards that are checked and two
that are merely written.

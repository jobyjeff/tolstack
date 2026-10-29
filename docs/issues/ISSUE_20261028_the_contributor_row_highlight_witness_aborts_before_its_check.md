---
type: bug
priority: med
status: deferred
area: tests/mutation-witnesses (browser, 3D pane suite)
class: decayed_witness
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# The contributor-row highlight witness aborts its suite before reaching its check

`scripts/mutation_witnesses/browser__real-clicking-a-contributor-row-with-the-pane-open-keeps__d42adbc7.json`
reports **NOT WITNESSED**: the tier goes red, but not on the declared check,
and the "actually failed" list is empty.

This handoff's `--changed-since master` run selected it only because the run
edited the same harness, `testThreeDPane` (a selector rename). The handoff
did not touch the spec's mutation, which is the anchor in
`apps/viewer/viewer.js`'s `annotateParamsFor`.

## What happens under the mutation

I applied the mutation by hand and ran
`--only "3D pane follows the selection"`:

- **Two earlier checks fail first:**
  - `[real] clicking a contributor row in the nav selects it in the scene, and the row shows it selected`
  - `[real] a contributor row is reached by the keyboard, and Enter selects it`
- **Then the suite aborts** with
  `page.evaluate: TypeError: Cannot read properties of null (reading 'tree')`,
  before the declared check runs.

## Why

Those two checks arrived in `94742688` (2026-10-27,
`the_shell_seats_the_scene_beside_the_model`), after this spec was declared
in `22e0c6ca` (2026-10-26).

Under the mutation, selecting an edge posts a goto, which leaves sweep mode,
so the scene tree goes null. The newer checks dereference that tree
unguarded, which aborts the suite. The guard itself is probably still sound;
the suite just never reaches it.

## Fix shape

- Make the newer checks' `tree` reads null-safe (fail as named checks, not
  throw), so the declared check is reached.
- Or re-point `expect_red` at the first check that now reddens, and say so in
  the spec's note.

---
type: bug
priority: high
status: resolved
area: viewer / tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# `[real] a study fed by a zero-width row warns…` is red on `integration`: it still names the washer `5ce16f3` gave a band to

`apps/viewer/tests.js`'s `[real] a study fed by a zero-width row warns that its
spread is a lower bound, and names the rows that make it one` asserts that the
rotor-fastener study's warning names **two** rows:

```js
has(warn[0].textContent, "MS21299C3");
has(warn[0].textContent, "NAS1149V0332H");
```

`5ce16f3` (*fix(rotor): the NAS1149V0332H washer folds the band its two
siblings already fold*, 2026-09-16, on `integration`) deliberately made that
false. Its own message says so in as many words:

> The stack has one zero-width element now, not two -- `washer_ms21299c3`
> stays, honestly, because MS21299 is absent from the pile and has no workbook
> row either.

That commit restated the change "everywhere it is restated" — the nine
guidance strings, the worksheet, `test_tolerance_stack.py`,
`test_viewer_projection.py` — and missed this one `[real]` check in the
viewer's fast tier.

## Why it was green until 2026-09-16 afternoon

`data/projections/viewer/topologies.json` is gitignored and shared by every
worktree, and it was still the pre-`5ce16f3` build. Another session rebuilt it
at 2026-09-16T20:50Z (provenance stamps `branch=handoff/python_value_and_schema_pins`,
`head_sha=c08d705d`), the projection caught up with the tree, and the stale pin
became visible. Same shape as
`ISSUE_20260915_the_shared_projection_predates_the_shortened_part_names_so_a_real_test_is_red_on_integration.md`,
running the other way: there the projection lagged the code, here a test lagged
the projection.

## Repro

```
node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack
FAIL  [real] a study fed by a zero-width row warns that its spread is a lower bound, and names the rows that make it one
      missing: "NAS1149V0332H" not in "1 dimension in this chain has no tolerance recorded, so the worst-case spread above is a LOWER bound, not the real one: washer thickness, MS21299C3 (.063 in)."
406/407 passed
```

Measured against the **unmodified base commit** `82d3a95` of
`handoff/viewer_unwitnessed_surface_guards` (`git show 82d3a95:apps/viewer/tests.js`
copied over the worktree's), so it is not the finding session's doing. The live
distribution today is `rotor_fastener_length` **1** zero-width edge of 12, every
other topology 0.

## Fixed on the finding session's branch, not yet on `integration`

Fixed in `handoff/viewer_unwitnessed_surface_guards` rather than left for
triage, because it is not cosmetic: a red fast tier makes
`node scripts/run_mutation_witness_tests.mjs` report **every** `fast`-tier
entry as NOT WITNESSED ("the tier was red before the mutation, so nothing was
proved") -- 18 of the 37 declared mutations on 2026-09-16, including four the
finding handoff's own definition of done requires to be WITNESSED. One stale
pin therefore disables the whole fast half of the mutation tier.

The repair does not re-spell the surviving row. It derives the named rows from
the study's own chain -- every zero-width edge's `name` must appear in the
warning, and the count must match -- which is the form
`[real] a row whose number has no plus/minus behind it says so in the grid too`
uses, and which survived this projection rebuild unchanged. A fixture
precondition goes with it, so the day the chain holds no zero-width row the
check says so instead of passing vacuously.

`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` is 411/411 after
it. **Leave this issue open until that branch reaches `integration`**; close it
then.

## Resolved 2026-09-16 (`review/viewer_unwitnessed_surface_guards`)

Doing what the line above asks, since nothing else would: `found_by:` gets no
dispatch auto-resolution, so this would have stayed `open` describing a defect
that no longer exists. The reviewer reproduced the red independently before
merging — `git show 82d3a95:apps/viewer/tests.js` over a `git archive` copy of
the branch, `--repo C:/workspace/tolstack`, **406/407 with this one check
failing** — and the merged tree is 411/411 with
`node scripts/run_mutation_witness_tests.mjs` at **37/37**, all 18 `fast`-tier
entries witnessed. The projection moved again under the review
(`review/python_value_and_schema_pins`, `2026-09-16T21:59:03Z`) and the
repaired check held, which is the point of deriving the rows rather than
naming them.

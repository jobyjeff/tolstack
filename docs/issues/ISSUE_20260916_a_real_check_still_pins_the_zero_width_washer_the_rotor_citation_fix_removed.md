---
type: bug
priority: high
status: open
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

## What the fix probably is, and the one judgement in it

Delete the `NAS1149V0332H` line. The surrounding assertions (`warn.length === 1`,
`"no tolerance recorded"`, `"LOWER bound"`, `"MS21299C3"`) all still hold and
still bite.

The judgement worth a moment: the check's name promises it "names the rows that
make it one", plural. With one zero-width row left in the corpus, a count-for-count
form — one named row per zero-width edge in the chain, derived from the
projection rather than spelled out — would keep that promise and would not go
stale the next time a band is found. The same handoff's
`[real] a row whose number has no plus/minus behind it says so in the grid too`
(added 2026-09-16) is written that way and survived this projection rebuild
unchanged.

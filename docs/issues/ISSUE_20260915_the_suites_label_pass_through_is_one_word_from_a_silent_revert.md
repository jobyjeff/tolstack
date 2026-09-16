---
type: chore
priority: med
status: triaged
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# The single-sourced `SUITES` label is one word from a silent revert: nothing pairs what a suite RETURNS against the key it was handed

`mutation_witness_tier_repair` (2026-09-15) single-sourced the browser tier's
suite labels, which was the right fix and is exactly what its handoff asked
for: `scripts/run_viewer_browser_tests.mjs`'s `SUITES` rows are now
`[label, (label) => fn(..., label)]`, the four in-body `const label = "..."`
copies are gone, and `testRespine` no longer derives `${label} respine` from an
argument spelling a different string. There is one copy of each label in the
file.

**What replaced nineteen hand copies is now one argument, and nothing observes
it.** Measured in review, on the merged tree:

```
# scripts/run_viewer_browser_tests.mjs, the run loop:
-   for (const [label, runSuiteFn] of chosen) results.push(await runSuiteFn(label));
+   for (const [label, runSuiteFn] of chosen) results.push(await runSuiteFn());

node scripts/run_viewer_browser_tests.mjs --only "index redirect"
[undefined] 2/2 sub-checks passed: PASS
[undefined] 2/2 sub-checks passed: PASS
2/2 browser checks passed (--only "index redirect")     # exit 0

venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py
10 passed in 0.07s
```

Every tier stays green. What breaks is everything the printed label is *for*:
the comment above `SUITES` says the key is the label it prints "so a filter can
be copied straight off a failing line", and the mutation tier's `suite` fields
are whole copies of those keys. `--only` filters on the registry key rather
than the printed line, so even the mutation tier keeps working — the damage is
silent by construction.

The pytest pairing added by the same handoff cannot see this: it compares
`mutation_witnesses.json`'s `suite` values against the **keys read out of the
source**, which is a different question from *does the suite print the key it
was handed*.

## Fix shape

The runtime check the originating issue proposed
(`ISSUE_20260915_the_suites_registry_restates_every_label_it_dispatches_on.md`),
which that handoff's lesson dismissed as comparing a string to itself — it
isn't, once the copies are gone; it pairs the *returned* label against the key:

```js
for (const [label, runSuiteFn] of chosen) {
  const result = await runSuiteFn(label);
  if (result.label !== label) {
    console.log(`    FAIL sub-check: suite ${JSON.stringify(label)} reported ` +
      `itself as ${JSON.stringify(result.label)} -- the registry key is the ` +
      `label a suite prints, and --only filters are copied off that line`);
    result.ok = false;
  }
  results.push(result);
}
```

Every suite already returns `{ label, ok }`, including the skip paths, so this
lands green today and fires on the one-word revert above — and on any future
suite that prints a label of its own instead of the one it is handed. Worth a
`mutation_witnesses.json` entry of its own once it exists (`find` the loop line,
`replace` it with the argument dropped), which is what would make it a standing
witness rather than a check nobody has watched fail.

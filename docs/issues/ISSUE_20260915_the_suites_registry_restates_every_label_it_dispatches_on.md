---
type: chore
priority: low
status: triaged
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
handoff: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
---

# The `SUITES` registry hand-restates every label it dispatches on, and nothing pairs the copy to the original

`scripts/run_viewer_browser_tests.mjs` now drives its suites off a table so
`--only` can filter them, and the table's key is the suite's **printed** label —
its own comment says so, and says why: *"which is what `--only` matches on, so a
filter can be copied straight off a failing line."*

Every one of those keys is a hand copy:

```js
["suite file://", () => runSuite(browser, ..., "suite file://")],       // twice, same line
["rebuild affordance (stub sibling mount)", () => testRebuildAffordance(browser)],
```

For the suites that take their label as an argument the string is written twice on
one line; for the three that own it internally (`testRebuildAffordance`,
`testAnnotateFlyout`, `testAnnotateHostedPosture` each open with
`const label = "..."`) the key is a copy of a string in a different function,
hundreds of lines away. Nothing asserts the two agree.

Reword a label and the key goes stale silently. What breaks is the comment's own
promise — `--only "<label off the failing line>"` matches no suite and the run
reports "matches no suite", while the *old* key still works and is what
`scripts/mutation_witnesses.json`'s `suite` fields hold. All nineteen agree
today; nothing keeps them agreeing tomorrow.

This is the repo's standing "a restated value with nothing pairing it to its
source" shape (`CLAUDE.md`, and `docs/prompts/REVIEW_AGENT.md`'s several entries
on stale restated counts), applied to a string rather than a number.

## The fix, verified against all nineteen suites

Every suite function already returns `{ label, ok }`, and `testRespine` returns
`{ label: \`${label} respine\` }` — which is exactly the key the table spells
out. So the pairing is two lines at the call site:

```js
for (const [key, runSuiteFn] of chosen) {
  const result = await runSuiteFn();
  if (result.label !== key) {
    console.log(`SUITES key ${JSON.stringify(key)} no longer matches the label ` +
      `that suite prints (${JSON.stringify(result.label)}) — --only and ` +
      `mutation_witnesses.json's \`suite\` fields both filter on the key.`);
    process.exitCode = 1;
  }
  results.push(result);
}
```

Checked 2026-09-15 on a full green run: all nineteen printed labels equal their
keys, so this lands green and only ever fires on real drift. It does not remove
the duplication — a reader still sees the string twice — but it makes the second
copy load-bearing instead of decorative, which is the part that matters.

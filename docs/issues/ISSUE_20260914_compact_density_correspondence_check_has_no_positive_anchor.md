---
type: bug
priority: low
status: resolved
area: tests/browser-tier
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `guard_mutation_witness_tier` moved to completed/; not independently verified.
---

# Browser tier: "leaders stay on their dots and seams at compact density" passes at comfortable density too

Found in the review of `viewer_browser_tier_wait_predicates` (2026-09-14) while
re-deriving that handoff's deliverable-3 sweep by behaviour rather than reading
its list.

In `scripts/run_viewer_browser_tests.mjs`, inside `testHeightBudget`:

```js
await page.locator("#density-toggle").click();
await page.waitForTimeout(50);
push("leaders stay on their dots and seams at compact density",
  (await correspondence()).drift.length === 0);
await page.locator("#density-toggle").click();
```

`correspondence()` (`CORRESPONDENCE_IN_PAGE`, same file) measures leader
endpoints against row boxes **from the live DOM**, so it re-derives whatever
row height is actually on screen. It therefore holds at *comfortable* density
exactly as it holds at compact. Nothing in the sub-check observes that the
click changed anything: no row-height read, no `#density-toggle` label check,
no `VA.ROW_DENSITIES` value.

Consequence: if `#density-toggle` silently stopped working — a renamed id, a
handler that no longer calls `rewind()`, a density value the toolbar stops
emitting — this sub-check stays green, and its name says the opposite. Same
family as the sleeps the handoff swept, but it is not either of the two shapes
that handoff was scoped to (it is a `waitForTimeout`, not a weak
`waitForSelector`/`waitFor` predicate), so it was correctly out of scope for
the fix and is filed rather than patched in review.

The handoff's lesson
(`docs/sessions/lessons/LESSONS_20260911_viewer_browser_tier_wait_predicates.md`,
deliverable-3 finding 4) claimed all nine sleeps carry a positive anchor "so
none can pass vacuously"; that sentence was narrowed to eight in review, with a
dated correction blockquote pointing here.

## Suggested fix

Give the assertion a positive anchor on the density having actually changed,
measured the same way the rest of the block measures: read a `tr.tvrow` box
height before and after the click and require it to shrink (16px vs 26px per
`VA.ROW_DENSITIES`), or wait on the toolbar's own compact-density marker, then
assert correspondence. The `waitForTimeout(50)` can go at the same time — the
height read is the effect to wait for.

Worth checking the same question for the other `correspondence()` call sites
that follow a state change (the `#edge-length-toggle` ones do carry a positive
anchor — a regex on the toggle's own label — so they are sound; listed here
only so the next pass does not re-derive it).

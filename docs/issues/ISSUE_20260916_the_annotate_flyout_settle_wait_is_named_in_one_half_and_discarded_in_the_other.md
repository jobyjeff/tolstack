---
type: bug
priority: low
status: open
area: scripts/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md
---

# `testAnnotateFlyout`'s `paneSettled()` is pushed as a named check in the mounted half and its result is thrown away in the `file://` half

`js_guards_and_suite_isolation` (2026-09-16) fixed the red-alone/green-in-a-full-run
suite by waiting out the respine ghost, and it made the wait a *reportable* one
on purpose. Its own comment says why, at
`scripts/run_viewer_browser_tests.mjs:3489`:

> Swallowed and reported rather than thrown, the same choice the embedded
> annotator's banner wait below makes and for the same reason: a timeout thrown
> from here takes the suite down as an ERROR, which carries no check name, so
> the mutation-witness tier reads it as a MISS instead of the red it is …
> **A pane that never settles has to fail with a name on it.**

`paneSettled()` returns `true`/`false` rather than throwing, and the **mounted**
half honours that — `scripts/run_viewer_browser_tests.mjs:3513`:

```js
push("the study's respine transition settles before any of its rows " +
  "are addressed -- no ghost of the walk still holds a second copy of them",
  await paneSettled());
```

The **`file://`** half calls the same helper and discards the answer —
`scripts/run_viewer_browser_tests.mjs:3634`:

```js
await page.locator(navRow("study", "demo_base_to_tip")).click();
await paneSettled();            // <- return value dropped
await page.waitForTimeout(300);
…
await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name").click();
```

So in that half a pane that never settles produces **exactly the outcome the
comment says must not happen**: `paneSettled()` swallows its own 10 s timeout,
returns `false` to nobody, execution continues, and the `tr.tvrow[data-id=…]`
click three lines later takes the suite down as an unnamed `ERROR` — which
`scripts/mutation_witnesses.json`'s "ONE THING AN ENTRY CANNOT DECLARE" is about,
and which the mutation runner reads as a MISS rather than a red. It is the same
locator, in the same suite, over the same pane that motivated the whole fix.

## Why `low`, and why it is not nothing

It costs nothing today, and the mutation witness proposed for this guard
(`annotate-flyout-waits-out-the-respine`, in
`ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md`) is not
weakened by it: `var settling = false` reddens the *mounted* half first, which
is named, and the run aborts there. Confirmed in review — the planted mutation
prints

```
FAIL sub-check: the study's respine transition settles before any of its rows are addressed -- no ghost of the walk still holds a second copy of them
```

before the suite errors out. The asymmetry only bites if the mounted half is
ever reordered, removed, or made to pass while the `file://` half hangs — i.e.
it is a guard that is silent in one of the two cases it was written for, which
is this repo's most-filed defect class and is worth closing while it is a
one-line fix rather than after.

## Fix shape

Push it with a name, as the half above does:

```js
push("the file:// study's respine transition settles too -- the 300 ms beat " +
  "below is for the annotate-mount probe, not for the ghost",
  await paneSettled());
```

That moves `annotate flyout` from 19 to 20 sub-checks, so whoever lands it
restates the count in the DoD/lesson of their own session and re-runs
`node scripts/run_viewer_browser_tests.mjs` (20/20) and
`--only "annotate flyout"`. Not fixed in review: it adds a sub-check, which
changes what the tier reports, and that is past the reviewer's inline-fix
boundary.

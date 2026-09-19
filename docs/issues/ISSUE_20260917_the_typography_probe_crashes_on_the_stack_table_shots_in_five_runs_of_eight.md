---
type: bug
priority: low
status: resolved
area: viewer/tests
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
found_by: docs/sessions/reviews/REVIEW_20260917_design_pass_typography.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `visual_rules_nothing_checks` moved to completed/; not independently verified.
---

# `tests/debug_typography_pass.mjs` aborts at the stack-table shots in five runs of eight, so its own documented re-take command reaches 5 of 13 surfaces

Found 2026-09-17 reviewing `design_pass_typography`, by paste-running the
command that handoff's lesson gives for re-taking its screenshots:

```
node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack
```

It aborts with an uncaught exception inside `tableAround` (the probe's helper
that brings a stack-table row into view and returns the enclosing `<table>`'s
viewport box):

```
locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
Call log:
  - attempting scroll into view action
    - waiting for element to be stable
    - element is not stable
  - retrying scroll into view action
```

`tableAround` is called twice, once per stack table. **Either call can be the
one that throws** — 8 runs in review: 3 clean, 5 aborted (3 on the `tr.el-row`
call, 2 on the `tr.mat-row` call). An abort at the first call loses surfaces
8–13: both stack tables, the worksheet dialog and all three annotator shots.
There is no partial-failure path — the throw is uncaught, so the probe exits
non-zero after printing the census for the five surfaces it reached.

## Two obvious causes, both eliminated

Instrumented `tableAround` to print the DOM's state immediately before the
failing call (5 lines of `page.evaluate`). In **every** run, including the ones
that then threw:

```
DIAG #stackview tr.el-row  {"matches":8,"ghosts":0,"hscrolls":1,"stackviews":1,"tweening":false}
DIAG #stackview tr.mat-row {"matches":3,"ghosts":0,"hscrolls":1,"stackviews":1,"tweening":false}
IMGS {"total":0,"complete":0}
```

* **Not the cross-fade race.** `VA.animateTopoPane`'s `div.tv__ghost` is the
  documented cause of a detached row after a nav click
  (`js_guards_and_suite_isolation`, 2026-09-16 — twelve call sites in
  `run_viewer_browser_tests.mjs` wait `!ViewerApp.lastTopoRender.tweening`
  for it). There is no ghost, one `.tv__hscroll`, one `#stackview`, and
  `tweening` is already `false`. Adding the tweening wait anyway changed the
  odds and did not fix it: 3 clean of 4, then an abort at the same line.
* **Not late-loading images restretching the row.** `#stackview` contains zero
  `<img>` at that moment (the materials rows' crop triggers are buttons, not
  thumbnails).

So the row is present and settled when the call starts, and Playwright's
actionability check still gives up on it. The remaining suspect is the
`scrollIntoViewIfNeeded` stability check itself against a `<tr>` inside
`.stackview`'s `overflow-x: auto` scrollport, where the scroll it performs moves
the box it is waiting to see hold still — but that was not isolated.

## A candidate fix, replayed — and why it is not applied here

Replacing the locator *action* with the `page.evaluate` the function already
ends in is stable: 4 runs, 0 aborts, all 13 surfaces.

```js
async function tableAround(page, rowSelector) {
  await page.waitForSelector(rowSelector);
  return page.evaluate((sel) => {
    const tr = document.querySelector(sel);
    tr.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = tr.closest("table").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, rowSelector);
}
```

**It changes two committed screenshots**, which is why the review filed this
rather than fixing it: `scrollIntoView({block: "nearest"})` does not land on the
same scroll offset `scrollIntoViewIfNeeded` does, so shots 9
(`stack_materials_table`) and 13 (`worksheet_dialog`) come out different while
the other eleven stay byte-identical. Deciding what those two shots should frame
is the probe author's call, not a reviewer's. Whoever takes this should re-take
both phases and re-commit the pair, and can lean on the strong property this
probe already has: with the current helper, the 26 committed shots are
**byte-identical** across machines (verified in review — both phases re-taken
from the two trees, 26 of 26 matched), so a diff of one byte in a re-take is a
real difference and not noise.

## Why it matters at all, for a hand-run probe

`design_pass_typography` is a CSS-only pass, so this probe's before/after pairs
and its per-surface type census **are** the evidence for the whole handoff —
nothing in any tier reads a stylesheet for a value
(`ISSUE_20260917_the_typography_passs_visual_rules_are_unwitnessed_in_every_tier`).
A probe that reaches 5 of 13 surfaces five times out of eight is the one
instrument the next agent has for checking that work, failing more often than
not.

---
type: bug
priority: low
status: open
area: scripts/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The results-table browser check aborts its suite instead of naming the defect it exists for

`scripts/run_viewer_browser_tests.mjs`'s new step 3b
(`stack_page_check_card_balance_sheet`, 2026-09-22) reads the live projection
inside `page.evaluate` and compares each of a check's five printed numbers to
it:

```js
const readAt = (row, label) =>
  row.querySelectorAll("td")[column(label)].textContent.trim();
…
stack.checks.forEach((check, i) => { … readAt(rows[i], pair[0]) … });
```

`rows` comes from the DOM and `stack.checks` from `results.json`, so the
moment the page renders **fewer rows than the projection has checks** —
precisely the regression the surrounding `columns.rows === 16` assertion
exists for — `rows[i]` is `undefined` and the evaluate throws. There are two
more of the same shape in the same block: `column(label)` returns `-1` for a
renamed header (`querySelectorAll("td")[-1]` is `undefined`), and
`proj.stacks.filter(...)[0]` is `undefined` if `hub_bearing_thermal_fit_m1`
ever leaves the projection.

Measured, by planting `checks.slice(0, -1)` in `resultsSection`:

```
[typography pass's visual rules (live stack view)] ABORTED after 5 sub-checks, 0 of them already FAILED
[typography pass's visual rules (live stack view)] ERROR: page.evaluate: TypeError:
    Cannot read properties of undefined (reading 'querySelectorAll')
```

The suite does go red, so this is a **reporting** defect and not a coverage
hole — but the declared check never prints, and the **six** sub-checks after
it in the same suite are never reached. That is the exact shape
`docs/prompts/REVIEW_AGENT.md` records costing three sessions one day's work
from one unnamed `ERROR` line, and it is the reason
`scripts/mutation_witnesses.json` cannot attribute an aborted suite: an
`ERROR` is a MISS to the mutation tier, not a red.

Not a coverage hole because the fast tier catches the same mutation by name,
loudly — 496/513 with `[real] a stack's checks are bounded by their row
count…` among the reds.

Fix is the block's own idiom, used eight lines above the crop-overlay check:
compute inside the `evaluate` defensively and return a reason instead of
throwing — e.g. bail out of the value loop with
`if (!rows[i] || column(pair[0]) < 0) { wrong.push(...); return; }` — so the
`push(...)` beneath it reports a named FAIL and the rest of the suite runs.

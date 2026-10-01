---
type: bug
priority: med
status: open
area: tiers/browser
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
---

# The new hover block in the browser runner dereferences the very things its own `push`es guard, so the failure it checks for aborts the suite instead of naming itself

`nav_tooltip_once_and_rail_hover_emphasis` (2026-09-30) added ~264 lines to
`scripts/run_viewer_browser_tests.mjs` inside `testTheTopologyPage`. Four of the
new reads are unguarded dereferences of values the block has already told the
reader can be absent:

```js
const firstPoint = await railPoint(0);          // railPoint RETURNS NULL
await page.mouse.move(firstPoint.x, firstPoint.y);
```

`railPoint(i)` returns `null` by design — the loop immediately above it collects
`unreachable` exactly for that case and pushes

> `[real] every rail on pitch_system has a mid-rail point a real pointer can reach`

on `unreachable.length === 0`. So the block knows rail 0 can have no reachable
point, reports it correctly, and then throws on it one screen later.

The same shape, same block:

* `const badge = document.querySelector("#navtree .navtree__row--study .navstatus"); const row = badge.closest(".navtree__row");` — inside `page.evaluate`, no study row with a mark means a `TypeError` instead of a red sub-check.
* `fire(hitFor(id), "mouseenter")` in the `sharedHover` evaluate — an edge row whose bar hit path is missing is exactly the DAG↔grid asymmetry the block exists to catch, and it takes the evaluate down instead of landing in `wrong`.
* `state(rows[0])` for the `after` reading, with no rows.

## Why this costs more than a thrown error usually does

`testTheTopologyPage` is one ~1400-line `try`. Any throw inside it jumps to a
`catch` that prints a single `[topology file://] ERROR: …` line and **discards
every sub-check name collected so far** — the class this repo has already paid
three duplicate filings for
(`ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_it_declares.md`
and siblings), and which `ISSUE_20260922_…` re-filed for a `push()` label that
dereferenced its own guard's subject. The topology suite is also the one the
mutation tier dispatches alone for 20-odd entries, where an abort reports as a
MISS rather than a red.

So the failure mode is: the reachability defect the block was written to detect
arrives as an unattributed ERROR, at the wrong name, and takes ~30 later
sub-checks with it.

## Fix

Guard each one and let the existing push carry the verdict — e.g.

```js
const firstPoint = await railPoint(0);
push("[real] rail 0 has a reachable point to measure the paint at", !!firstPoint);
if (firstPoint) { … }
```

and a `!row` / `!hit` / `rows.length` early return inside each `page.evaluate`
that returns a shape the outer `push` can read as a failure.

Not fixed in review: it is a behaviour change to a test harness (what the suite
reports on an unmet precondition), which the reviewer's inline-fix boundary puts
on the author's side, and the related entry
`ISSUE_20260918_a_skipped_browser_suite_returns_ok_true_and_is_counted_in_the_runners_green_total.md`
means "report a precondition as a skip" is not obviously the right spelling here
either.

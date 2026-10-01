---
type: bug
priority: low
status: deferred
area: viewer/topology
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
class: guard_cannot_fail
defer_until: dispatch/docs/strategy/BRIEF_20260930_porting_a_proven_lever_across_repos.md
---

# `hotHover`'s leave-race guard is inert in Chrome, and the comment that justifies it states the event order backwards

`nav_tooltip_once_and_rail_hover_emphasis` (2026-09-30) added `hotHover`
(`apps/viewer/views/topology.js`), whose leave arms are conditional:

```js
chain(node, "onmouseleave", function () { if (hot.on === key) setHot(hot, null); });
chain(node, "onblur",       function () { if (hot.on === key) setHot(hot, null); });
```

justified by the comment directly above it:

> *moving the pointer from a bar onto the rail under it fires the new element's
> `mouseenter` and the old one's `mouseleave`, and a clear that did not check
> would race the set.*

## Measured, both halves

**The order is the other way round.** Two sibling `<div>`s, Chrome 154 via
playwright-core, one `page.mouse.move` into each:

```
["mouseenter a", "mouseleave a", "mouseenter b"]
```

`mouseleave` on the element being left fires **before** `mouseenter` on the
element being entered — which is what the UI Events spec requires, and it holds
for a teleporting `page.mouse.move` as well as for a travelled one. The same
holds for `blur` before `focus`. So on the page's own targets (every
`hotHover` target is an SVG sibling or a `<tr>`; none is an ancestor of
another) the unguarded clear could not race the set.

**Nothing witnesses the guard.** Removing both conditions — `function () {
setHot(hot, null); }` on each arm — measured on the merged review tree against a
freshly built projection:

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo <scratch>` | **522/522 passed** |
| `node scripts/run_viewer_browser_tests.mjs --only topology` | **4/4 suites, `[topology]` 228/228 both modes** |

So it is a line that can be deleted with no tier noticing, under a sentence
giving a mechanism that does not occur — which together read as coverage and
as an argument, and are neither.

## What to decide, not what to do

Two honest outcomes, and the second may well be right:

* **Keep the guard and fix the sentence.** It is belt-and-braces against an
  engine or an input path that does fire enter-before-leave (a synthetic
  `dispatchEvent` pair in a future probe is the obvious one), it costs nothing,
  and the comment should say that rather than claiming an ordering. If it is
  kept as load-bearing it owes a witness — the cheap one is a fast-tier check
  that fires `mouseenter(B)` before `mouseleave(A)` by hand and asserts B's
  state survives, which is also the only ordering under which the guard bites.
* **Drop it**, and say in the comment that leave precedes enter so the clear
  does not need a check.

Left to the author because it is a behaviour question about a predicate the
mutation list does not name, which is the reviewer's file-don't-fix side of the
line.

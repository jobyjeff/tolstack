---
type: bug
priority: med
status: triaged
area: viewer/a11y
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
class: unreviewed_design_debt
strategy: docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md
---

# The alert mark is a focusable generic with no role, and nothing announces the card it opens

`VA.alertBadge` (`apps/viewer/views/dom.js`) builds every alert mark on this
app — the nav rail's rows, the elements table's source cell, the materials
table's. On the arm that wires a card it is:

```
<span class="navstatus navstatus--warn cardtrig" tabindex="0" aria-label="…">
  <svg …>
</span>
```

A `<span tabindex="0">`: focusable, named, and **roleless**. A screen reader
announces the name and nothing about what the thing is or what it does, and
nothing announces that a card opened on focus.

## Why this is being filed now, and what it is NOT

`docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md` parks "the
mark's accessible name" as an open question. Handoff
`nav_tooltip_once_and_rail_hover_emphasis` (2026-09-30) was told to measure
where that stands after it removed the mark's native `title`, and the
measurement corrects the premise:

* **The name is fine and was never at risk.** `aria-label` is set
  unconditionally and outranks a `title` anyway; on the live rail it reads e.g.
  `"pass — every build clears it unverified incomplete"`. Removing the `title`
  took nothing with it, and the fast tier pins that it is still there.
* **What is actually missing is the role**, and the announcement of the card.

So this is not the naming question the brief states; it is the one underneath
it, and the brief's own framing would have let a fix land that changed nothing.

## Repro

1. `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
   boots the page, or open `apps/viewer/topology.html` and point at a study row
   with an amber or red mark.
2. Tab to the mark (it is a tab stop). A card opens on focus.
3. Nothing in the accessibility tree says the element is a button, a
   disclosure, or anything else; nothing says a card appeared.

## Why `audience: strategy`

The fix is not obviously one line. `role="button"` claims a click contract the
mark half has (it opens the card on click too, and on the nav rail it
`stopPropagation`s away the row's own selection); `role="img"` says what it IS
and drops the interaction; a `<button>` element brings a focus ring and default
styling into a rail the 2026-09-22 pass spent a handoff quietening. The card
itself is placed in a fixed overlay and is not in the focus order at all, which
is the second half of the question and the one
`BRIEF_20260914_hover_card_occlusion_and_a11y.md` is really about.

It reaches three surfaces at once — one builder, three tables/rails — so it is
worth deciding once.

---
type: bug
priority: med
status: resolved
area: viewer/browser-tier
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `guard_mutation_witness_tier` moved to completed/; not independently verified.
---

# The card-layout guard can no longer see a `position: absolute` popover — the room cap subsumed its witness

Found and measured while landing
`viewer_popover_clamp_and_rebuild_terminal_state` (2026-09-14). Not a
regression in the app: the app is now *more* correct, and that is exactly what
took the guard's teeth out.

## What the guard was for

`hover_card_layout_guard_can_fail` (2026-09-11) existed because the card-layout
block in `scripts/run_viewer_browser_tests.mjs` passed with
`viewer_hover_cards_and_deep_links`' defect fully reverted. Its fix was
`CARD_LAYOUT_VIEWPORT` (1600x700): at 1000px tall the mock document is taller
than the open card, so an in-flow popover lengthened nothing measurable; at
700px the card reached ~280px past the document's own bottom, and an
`position: absolute` popover there lengthens the document and reflows the panes
— which is what these three sub-checks measure:

- `an open card leaves the document's own height untouched`
- `an open card moves the DAG pane by nothing at all`
- `leaders still land on their dots and seams with a card open`

## Why they can no longer fail

`position()` now caps an oversized card to the room beside its trigger rather
than letting it overrun (`apps/viewer/topology_app.js`), so **an open card is
always wholly inside the window**. The document is at least as tall as the
window, so a card inside the window is also inside the document — in flow or
not. At `scrollY === 0` (where this block measures, and the mock document at
700px has nothing to scroll) document and viewport coordinates coincide, so
`position: fixed` and `position: absolute` place the card identically and
neither lengthens anything.

Measured, this session: flip `.croppop`'s `position: fixed` back to
`absolute` in `apps/viewer/style.css`, change nothing else, and the suite
reports

```
[topology file://] 122/122 sub-checks passed: PASS
[topology http]    122/122 sub-checks passed: PASS
```

That is the same vacuous green `hover_card_layout_guard_can_fail` was filed
about, arrived at from the other direction.

## What is still guarded, and what is not

Still falsifiable, and demonstrated red-then-green this session: the card fits
inside the window, its overrun is reachable in its own scrollport, and it sits
clear of its trigger. Those are the contracts the cap owns.

Not falsifiable any more: that hover chrome is out of flow. Fixing it needs a
configuration where document and viewport coordinates *differ* — a document
taller than the window, scrolled, with a card opened while scrolled — which
the mock fixture at `CARD_LAYOUT_VIEWPORT` does not give (`docHeight === 700 ===
innerHeight`). Whoever picks this up should also decide whether the contract is
worth a configuration of its own at all now that the cap makes the failure it
describes unreachable through `position()`; if the answer is no, the honest move
is to retire the three sub-checks and say why, not to leave them green and
meaningless.

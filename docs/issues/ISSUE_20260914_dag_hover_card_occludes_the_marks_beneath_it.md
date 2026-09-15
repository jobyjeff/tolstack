---
type: bug
priority: med
status: open
area: viewer/topology
reporter: agent
audience: strategy
---

# A hover card opened from inside the DAG sits over the marks a reader clicks next

Found while landing `viewer_dag_hover_cards` (2026-09-14), which put the edge
card on `.rail__barhit` and a node card on `.rail__dot`. The cards themselves
are correct and the layout contract holds (the popover is `position: fixed`;
the browser tier measures the pane box and the document height unchanged with
a DAG-side card open). This is about **occlusion**, not layout.

## What happens

1. Hover a dot near the top of the DAG. Its node card opens, anchored just
   below the dot — a ~300–530px box over the diagram.
2. The card **persists**. Nothing closes on pointer-leave: that is a landed,
   reasoned decision (`apps/viewer/views/stack.js`, `cropTrigger`'s comment —
   the pointer has to leave the trigger to reach the links inside the card,
   and closing on leave produced a leave/enter storm in 2026-08). A card closes
   on its ✕, on Escape, on an outside click, or by being replaced by the next
   card.
3. A click **inside** the popover is deliberately preserved (that is how the
   reference links work, `topology_app.js`'s document click handler). So the
   rail marks now underneath the card are unreachable by pointer — click them
   and you click the card — until the reader dismisses it.

Grid-side triggers have had the same policy since 2026-09-10 and it did not
bite, because their cards land over the grid's right-hand edge. A DAG-side
card lands over the DAG.

Second, smaller face of the same thing: **a re-render re-opens the card under a
stationary pointer.** Clicking a mark selects it, which re-renders the pane; the
fresh `<circle>`/`<line>` landing under the unmoved pointer fires `mouseenter`
again and the card comes straight back. Measured 2026-09-14: hiding the card in
the mark's own click handler is therefore a visible no-op, which is why this
handoff did not ship that as a fix.

## Repro

`apps/viewer/topology.html?mock=1`, hover `circle.rail__dot[data-id="base_datum"]`,
then try to click `path.rail__leaderhit[data-leader-id="base_post_seat"]` below
it. Playwright reports the card's own chip intercepting pointer events; a human
sees the same thing. The browser tier works around it with a `dismissCard()`
helper (pointer off the trigger first, *then* Escape — an Escape sent while the
pointer still sits on the mark can be undone by the very next paint).

## Why this is a design call, not a fix

Every obvious repair trades against something already decided:

- **Dismiss on pointer-leave** reverses the 2026-08 decision above.
- **Place a DAG-side card to the side of the diagram** means `position()` grows
  a notion of which surface the trigger belongs to; `position()` is also the
  subject of `viewer_popover_clamp_and_rebuild_terminal_state` (bottom-edge
  clamp), so the two want deciding together.
- **Dismiss when the pointer reaches the DAG background** is a new rule for one
  surface, and this app's cards are deliberately one mechanism everywhere.

Someone should pick, and the pick belongs with whoever owns the hover-card
mechanism as a whole rather than with the next tactical edit to a view.

---
type: bug
priority: low
status: triaged
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260911_viewer_popover_clamp_and_rebuild_terminal_state.md
---

# A hover card taller than the room below its trigger hangs off the window bottom, and its own scrollbar cannot reach it

Measured while strengthening the card-layout guard
(`hover_card_layout_guard_can_fail`, 2026-09-11), on the shipped `position:
fixed` popover — so this is not the layout-disturbance defect that handoff was
about, and the fix for it is not a revert of anything.

`position()` (`apps/viewer/topology_app.js`) places the popover below its
trigger, or above it when it genuinely fits above, and clamps only the TOP
edge (`Math.max(8, …)`). Nothing clamps the bottom. When a card fits neither
below nor above — a short window — it renders below anyway and its bottom
edge lands past the viewport:

    topology.html?mock=1 at 1600x700, hover the `base_thickness` crop trigger
    -> edge card is 528px tall, placed at top: 361.5px  ->  bottom at 889px,
       ~190px below a 700px window.

`max-height: calc(100vh - 24px); overflow-y: auto` does not save it: the cap
keeps the card from being *taller* than the window, but the card here is
already shorter than the cap (528 < 676), so nothing scrolls and the offscreen
strip — on the edge card, the citation line and the crop-key claim — is simply
unreachable. A `position: fixed` element cannot be scrolled into view.

Fix shape (one function, no CSS): clamp the placement so the card's bottom
stays on screen — e.g. `top = min(desiredTop, innerHeight - height - 8)` with
the existing `Math.max(8, …)` floor still winning for a card taller than the
window, which then genuinely needs its `overflow-y` scrollbar. The one trap
the existing comment already names: a card nudged back up must not land ON its
trigger, or the resulting `mouseleave` closes it the instant it opens — so a
clamp that would overlap the trigger should keep the above/below decision it
has and accept the cap instead.

Guard to add with the fix: the browser tier's card block already measures at a
700px-tall viewport (`CARD_LAYOUT_VIEWPORT` in
`scripts/run_viewer_browser_tests.mjs`), which is exactly the configuration
that shows this — one more assertion there, that the open card's bottom is
inside the viewport, is the whole test.

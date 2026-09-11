---
type: bug
priority: med
status: resolved
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260911_hover_card_layout_guard_can_fail.md
resolution: handoff completed 2026-09-11 -- closed automatically by dispatch when handoff `hover_card_layout_guard_can_fail` moved to completed/; not independently verified.
---

# The hover-card layout guard passes on the exact popover state it was written to catch

`viewer_hover_cards_and_deep_links` shipped two browser-tier assertions in
`scripts/run_viewer_browser_tests.mjs` (`testTheTopologyPage`): "an open card
moves the DAG pane by nothing at all" (the `#topopane` bounding box compared
to the pixel with the edge card open) and "leaders still land on their dots
and seams with a card open". Its lesson says the measurement "failed against
the original `position: absolute` popover — a tall card opened near the fold
lengthens the DOCUMENT, and the scrollbar it summons reflows every pane",
which is why `#croppop` went `position: fixed`.

**Measured in review (2026-09-11): that failure does not reproduce with the
shipped measurement.** Reverting the full original state in a scratch copy —
`.croppop` back to `position: absolute`, `position()` back to
`window.scrollX/Y`-offset coordinates, and the new
`max-height: calc(100vh - 24px)` removed — leaves the browser tier at
**16/16, all 116 topology sub-checks green in both modes**, including both new
assertions. The guard measures the card on `base_thickness` in the mock
topology at the default viewport, where the card never crosses the fold, so
the document never lengthens and there is nothing for the zero-pixel
comparison to see. The defect class the guard certifies against is only
reachable when the popover's bottom would exceed the current document height —
a configuration the test never creates.

The shipped code is correct — a `position: fixed` element is out of flow and
structurally cannot change document geometry — so this is a defect in the
tripwire, not the page: a future handoff that flips `.croppop` back to
`absolute` (or re-parents the card into the layout) ships green through every
tier.

Fix shape: make the measurement run in a configuration where the defect can
occur — e.g. take the measurement at a short viewport (the height-budget test
already uses ~700 px) or on a trigger scrolled near the fold, and/or assert
`document.documentElement.scrollHeight` is unchanged with the card open in
that configuration. Then replay the reverted-popover state above and confirm
the assertion actually goes red before trusting it (it is one CSS word plus
one function to revert; this issue's second paragraph is the recipe).

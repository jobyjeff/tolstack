---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-11 — hover_card_layout_guard_can_fail: make the popover layout guard measure a configuration where the defect can occur

Source: `docs/issues/ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`
(measured in review 2026-09-11). Baseline: trunk after the 2026-09-11 batch
merge (master e9386a8). Scope: `scripts/run_viewer_browser_tests.mjs`
(`testTheTopologyPage`) and, if needed, the browser-tier plumbing around it;
do NOT change `apps/viewer/` shipped CSS/JS — the `position: fixed` popover
is correct; this handoff fixes the tripwire, not the page.

## Deliverables

1. **Make the guard capable of failing.** The two assertions shipped by
   `viewer_hover_cards_and_deep_links` ("an open card moves the DAG pane by
   nothing at all"; "leaders still land on their dots and seams with a card
   open") pass even with the full original defect reverted in a scratch copy
   (`.croppop` back to `position: absolute`, `position()` back to
   `window.scrollX/Y` offsets, `max-height: calc(100vh - 24px)` removed):
   16/16 browser tier, all 116 topology sub-checks green in both modes,
   measured 2026-09-11. Cause: the measurement opens the card on
   `base_thickness` in the mock topology at the default viewport, where the
   card never crosses the fold, so the document never lengthens. Fix shape
   from the issue (verify, then pick what actually works): take the
   measurement at a short viewport (the height-budget test already uses
   ~700 px) and/or on a trigger scrolled near the fold, and/or assert
   `document.documentElement.scrollHeight` is unchanged with the card open
   in that configuration.
2. **Prove it.** Replay the reverted-popover state (one CSS word plus one
   function — the issue's second paragraph is the recipe) and confirm the
   strengthened assertion actually goes red before trusting it. Then restore
   the shipped code and confirm green.

## Definition of done

- Browser tier green on the real code; demonstrably red under the reverted
  popover replay (record the failing assertion text in the lesson).
- No shipped-page changes in the diff (tests/runner only).
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_hover_card_layout_guard_can_fail.md`):
  which configuration finally made the defect observable, and the replay
  evidence — the next reviewer must be able to re-run it.

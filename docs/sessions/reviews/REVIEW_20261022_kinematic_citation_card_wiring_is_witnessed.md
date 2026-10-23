---
verdict: APPROVE
---

# Review — kinematic_citation_card_wiring_is_witnessed

Verdict: **APPROVE**. Merged handoff branch (was not already contained in integration).

- Deliverable 1: hover sub-check on `span.kmverdict__limit` asserts the citation card, S461-607 and the adoption phrase; mutation spec deletes `onCardShow: showCard,` -> WITNESSED.
- Deliverable 2: `hoverRailBar` returns true/reason; all three callers push a named FAIL and skip only card-dependent checks; two specs for the `rail__barhit` rename (both sites) -> WITNESSED.
- Browser pin 579 -> 581, census updated; pytest green (1560 passed, 1 skipped; only the worktree-only viewer JS suite test deselected). Browser tier 29/29 with node_modules junctioned, `--repo` main checkout.
- Scope respected (no edits to kinematic.js / topology_app.js).
- Note: lesson's unwitnessed-plumbing list is candidates, not verified; acceptable per handoff. `--full` mutation run left to batch merge.
